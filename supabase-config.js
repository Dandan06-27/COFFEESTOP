/* ═══════════════════════════════════════════
   COFFEESTOP — SUPABASE CONFIGURATION
   supabase-config.js
═══════════════════════════════════════════ */

console.log('📦 supabase-config.js loading...');

// ──────────────────────────────────────────
// CONFIGURE THESE WITH YOUR SUPABASE DETAILS
// ──────────────────────────────────────────
const SUPABASE_URL = 'https://obkhnnkbocgjyjoulfhl.supabase.co';
const SUPABASE_KEY = 'sb_publishable_vUXcz2S3Blx4Bjn03MsUhQ_gOwSt1yZ';

// Expose to global scope
window.SUPABASE_URL = SUPABASE_URL;
window.SUPABASE_KEY = SUPABASE_KEY;

// Initialize Supabase client
let supabaseDb;

function initSupabaseClient() {
  if (window.supabaseClient && window.supabaseClient.from) {
    return window.supabaseClient;
  }
  
  if (window.supabase && window.supabase.createClient) {
    supabaseDb = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
    window.supabaseClient = supabaseDb;
    console.log('✓ Supabase client initialized successfully');
    return supabaseDb;
  }
  
  console.error('❌ Supabase library not loaded.');
  return null;
}

// Helper functions
function calculateSubtotal(items) {
  return items.reduce((sum, item) => sum + (item.price * item.qty), 0);
}

// DATABASE FUNCTIONS
async function saveOrderToDatabase(order) {
  try {
    if (!supabaseDb || !supabaseDb.from) {
      supabaseDb = initSupabaseClient();
      if (!supabaseDb || !supabaseDb.from) {
        console.error('❌ Supabase not available');
        return null;
      }
    }

    const subtotal = calculateSubtotal(order.items);
    const discountAmount = subtotal * ((order.discount || 0) / 100);
    const total = subtotal - discountAmount;

    console.log('📤 Saving order:', order.num);

    const { data, error } = await supabaseDb
      .from('orders')
      .insert([{
        order_num: order.num,
        order_type: order.type,
        status: order.status,
        items: order.items,
        subtotal: subtotal,
        discount_rate: order.discount || 0,
        discount_amount: discountAmount,
        total: total,
        payment_method: order.payMethod || 'Cash',
        created_at: order.createdAt.toISOString()
      }])
      .select();

    if (error) {
      console.error('❌ Error saving order:', error.message);
      return null;
    }
    
    console.log('✓ Order saved:', order.num);
    return data[0];
  } catch (err) {
    console.error('❌ Exception saving order:', err.message);
    return null;
  }
}

async function loadOrdersFromDatabase() {
  try {
    const { data, error } = await supabaseDb
      .from('orders')
      .select('*')
      .in('status', ['pending', 'processing'])
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error loading orders:', error);
      return [];
    }
    
    return data.map(record => ({
      id: record.id,
      num: record.order_num,
      items: record.items,
      type: record.order_type,
      status: record.status,
      createdAt: new Date(record.created_at),
      discount: record.discount_rate,
      payMethod: record.payment_method,
      dbId: record.id
    }));
  } catch (err) {
    console.error('Exception loading orders:', err);
    return [];
  }
}

async function loadOrdersByDate(date) {
  try {
    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(date);
    endOfDay.setHours(23, 59, 59, 999);

    const { data, error } = await supabaseDb
      .from('orders')
      .select('*')
      .gte('created_at', startOfDay.toISOString())
      .lte('created_at', endOfDay.toISOString())
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error loading orders by date:', error);
      return [];
    }
    
    return data.map(record => ({
      id: record.id,
      num: record.order_num,
      items: record.items,
      type: record.order_type,
      status: record.status,
      createdAt: new Date(record.created_at),
      discount: record.discount_rate,
      payMethod: record.payment_method,
      dbId: record.id
    }));
  } catch (err) {
    console.error('Exception loading orders by date:', err);
    return [];
  }
}

async function loadAllOrdersFromDatabase() {
  try {
    const { data, error } = await supabaseDb
      .from('orders')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error loading all orders:', error);
      return [];
    }
    
    return data.map(record => ({
      id: record.id,
      num: record.order_num,
      items: record.items,
      type: record.order_type,
      status: record.status,
      createdAt: new Date(record.created_at),
      discount: record.discount_rate,
      payMethod: record.payment_method,
      total: record.total,
      dbId: record.id
    }));
  } catch (err) {
    console.error('Exception loading all orders:', err);
    return [];
  }
}

async function updateOrderStatus(orderNum, newStatus) {
  try {
    const completedAt = newStatus === 'done' ? new Date().toISOString() : null;
    
    const { error } = await supabaseDb
      .from('orders')
      .update({
        status: newStatus,
        completed_at: completedAt,
        updated_at: new Date().toISOString()
      })
      .eq('order_num', orderNum);

    if (error) {
      console.error('Error updating order status:', error);
      return false;
    }
    console.log(`Order ${orderNum} updated to ${newStatus}`);
    return true;
  } catch (err) {
    console.error('Exception updating order status:', err);
    return false;
  }
}

async function updateOrderPayment(orderNum, paymentMethod, amountTendered, change, discountRate) {
  try {
    const { data: orderData, error: fetchError } = await supabaseDb
      .from('orders')
      .select('subtotal')
      .eq('order_num', orderNum)
      .single();

    if (fetchError) {
      console.error('Error fetching order:', fetchError);
      return false;
    }

    const subtotal = orderData.subtotal;
    const discountAmount = subtotal * (discountRate / 100);
    const total = subtotal - discountAmount;

    const { error } = await supabaseDb
      .from('orders')
      .update({
        payment_method: paymentMethod,
        amount_tendered: amountTendered,
        change_amount: change,
        discount_rate: discountRate,
        discount_amount: discountAmount,
        total: total,
        updated_at: new Date().toISOString()
      })
      .eq('order_num', orderNum);

    if (error) {
      console.error('Error updating payment:', error);
      return false;
    }
    return true;
  } catch (err) {
    console.error('Exception updating payment:', err);
    return false;
  }
}

async function deleteOrderFromDatabase(orderNum) {
  try {
    const { error } = await supabaseDb
      .from('orders')
      .delete()
      .eq('order_num', orderNum);

    if (error) {
      console.error('Error deleting order:', error);
      return false;
    }
    return true;
  } catch (err) {
    console.error('Exception deleting order:', err);
    return false;
  }
}

async function updateOrderItems(orderNum, items) {
  try {
    const subtotal = calculateSubtotal(items);
    const { error } = await supabaseDb
      .from('orders')
      .update({
        items: items,
        subtotal: subtotal,
        updated_at: new Date().toISOString()
      })
      .eq('order_num', orderNum);

    if (error) {
      console.error('Error updating order items:', error);
      return false;
    }
    return true;
  } catch (err) {
    console.error('Exception updating order items:', err);
    return false;
  }
}

async function getRevenueStats(dateFrom = null, dateTo = null) {
  try {
    let query = supabaseDb
      .from('orders')
      .select('total, status')
      .eq('status', 'done');

    if (dateFrom) query = query.gte('created_at', dateFrom.toISOString());
    if (dateTo) query = query.lte('created_at', dateTo.toISOString());

    const { data, error } = await query;

    if (error) {
      console.error('Error getting revenue stats:', error);
      return { totalRevenue: 0, ordersCompleted: 0 };
    }

    const totalRevenue = data.reduce((sum, order) => sum + (order.total || 0), 0);
    return { totalRevenue: totalRevenue, ordersCompleted: data.length };
  } catch (err) {
    console.error('Exception getting revenue stats:', err);
    return { totalRevenue: 0, ordersCompleted: 0 };
  }
}

function subscribeToOrderUpdates(callback) {
  if (!supabaseDb || !supabaseDb.channel) {
    console.warn('⚠️ Supabase not ready for realtime');
    return null;
  }
  
  const subscription = supabaseDb
    .channel('orders')
    .on('postgres_changes', {
      event: '*',
      schema: 'public',
      table: 'orders'
    }, (payload) => {
      console.log('Order update:', payload);
      callback(payload);
    })
    .subscribe();

  return subscription;
}

// EXPOSE TO GLOBAL SCOPE
window.saveOrderToDatabase = saveOrderToDatabase;
window.loadOrdersFromDatabase = loadOrdersFromDatabase;
window.loadOrdersByDate = loadOrdersByDate;
window.loadAllOrdersFromDatabase = loadAllOrdersFromDatabase;
window.updateOrderStatus = updateOrderStatus;
window.updateOrderPayment = updateOrderPayment;
window.deleteOrderFromDatabase = deleteOrderFromDatabase;
window.updateOrderItems = updateOrderItems;
window.getRevenueStats = getRevenueStats;
window.subscribeToOrderUpdates = subscribeToOrderUpdates;

console.log('✓ Database functions exposed');

// INITIALIZE SUPABASE
if (!window.supabaseClient) {
  supabaseDb = initSupabaseClient();
  
  if (!supabaseDb) {
    let attempts = 0;
    const wait = setInterval(() => {
      attempts++;
      if (window.supabase && window.supabase.createClient) {
        clearInterval(wait);
        supabaseDb = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
        window.supabaseClient = supabaseDb;
        console.log('✓ Supabase initialized after waiting');
      } else if (attempts >= 50) {
        clearInterval(wait);
        console.error('❌ Supabase timeout');
      }
    }, 100);
  }
} else {
  supabaseDb = window.supabaseClient;
}

console.log('✓ supabase-config.js loaded');
