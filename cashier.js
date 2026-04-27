/* ═══════════════════════════════════════════
   COFFEESTOP — CASHIER TERMINAL JAVASCRIPT
   cashier.js
   Depends on: app.js (menu data)
═══════════════════════════════════════════ */


/* ══════════════════════════════
   STATE
══════════════════════════════ */
let orders          = [];          // all orders in the queue
let activeOrderId   = null;        // currently selected order
let payMethod       = 'Cash';
let tendered        = '';          // numpad input string
let discountRate    = 0;
let queueFilter     = 'all';
let orderCounter    = 100 + Math.floor(Math.random() * 50);


/* ══════════════════════════════
   CLOCK
══════════════════════════════ */
function updateClock() {
  document.getElementById('clock').textContent =
    new Date().toLocaleTimeString('en-PH', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
}
setInterval(updateClock, 1000);
updateClock();


/* ══════════════════════════════
   ORDERS FROM DATABASE
   All orders come from Supabase database
══════════════════════════════ */



/* ══════════════════════════════
   ORDER FACTORY
══════════════════════════════ */
function createOrder(items, type = 'Dine In') {
  orderCounter++;
  // Ensure items have emoji field for display (use placeholder if missing)
  const processedItems = items.map(i => ({
    ...i,
    emoji: i.emoji || '🛍',  // Fallback to shopping bag emoji if not provided
    key: i.id + (i.variant ? '_' + i.variant : '')
  }));
  
  return {
    id:        orderCounter,
    num:       '#' + String(orderCounter).padStart(3, '0'),
    items:     processedItems,
    type,
    status:    'pending',       // pending | processing | done
    createdAt: new Date(),
    discount:  0,
    payMethod: 'Cash',
  };
}


/* ══════════════════════════════
   QUEUE RENDERING
══════════════════════════════ */
function renderQueue() {
  const list = document.getElementById('queue-list');

  const filtered = queueFilter === 'all'
    ? orders
    : orders.filter(o => o.status === queueFilter);

  if (filtered.length === 0) {
    list.innerHTML = `
      <div class="empty-queue">
        <div class="eq-icon">🧾</div>
        <div class="eq-text">No orders yet</div>
        <div class="eq-sub">Orders from the kiosk will appear here</div>
      </div>`;
    return;
  }

  list.innerHTML = '';
  // Show newest first
  [...filtered].reverse().forEach(order => {
    const card = document.createElement('div');
    card.className = `queue-card status-${order.status}${order.id === activeOrderId ? ' selected' : ''}`;
    card.onclick = () => selectOrder(order.id);

    const total    = order.items.reduce((s, i) => s + i.price * i.qty, 0);
    const itemText = order.items.map(i => `${i.qty}× ${i.name}`).join(', ');
    const elapsed  = getElapsed(order.createdAt);

    card.innerHTML = `
      <div class="qc-top">
        <div class="qc-num">${order.num}</div>
        <div class="qc-badge ${order.status}">${order.status}</div>
      </div>
      <div class="qc-type">${order.type}</div>
      <div class="qc-items">${itemText}</div>
      <div class="qc-footer">
        <div class="qc-total">₱${total}</div>
        <div class="qc-time">${elapsed}</div>
      </div>
    `;
    list.appendChild(card);
  });
}

function getElapsed(date) {
  const secs = Math.floor((Date.now() - date.getTime()) / 1000);
  if (secs < 60)  return secs + 's ago';
  if (secs < 3600) return Math.floor(secs / 60) + 'm ago';
  return Math.floor(secs / 3600) + 'h ago';
}

// Refresh elapsed times every 30s
setInterval(() => { if (orders.length) renderQueue(); }, 30000);

function filterQueue(btn, filter) {
  queueFilter = filter;
  document.querySelectorAll('.ftab').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  renderQueue();
}

function updateQueueCount() {
  const pending = orders.filter(o => o.status === 'pending').length;
  document.getElementById('queue-count').textContent = pending;
}


/* ══════════════════════════════
   SELECT ORDER
══════════════════════════════ */
function selectOrder(id) {
  activeOrderId = id;
  discountRate  = 0;
  tendered      = '';
  payMethod     = 'Cash';

  const order = orders.find(o => o.id === id);
  if (!order) return;

  // Advance to processing if pending
  if (order.status === 'pending') {
    order.status = 'processing';
    // Save status change to database (if available)
    if (typeof updateOrderStatus === 'function') {
      updateOrderStatus(order.num, 'processing').catch(err => {
        console.warn('Failed to update order status:', err);
      });
    }
    renderQueue();
    updateQueueCount();
  }

  renderPOS(order);
  renderPaymentPanel(order);
  renderQueue(); // re-render to update selected highlight
}


/* ══════════════════════════════
   RENDER POS CENTER PANEL
══════════════════════════════ */
function renderPOS(order) {
  const meta  = document.getElementById('pos-order-meta');
  const items = document.getElementById('pos-items');
  const bar   = document.getElementById('add-item-bar');

  // Header meta
  const stepStatus = ['pending', 'processing', 'done'];
  const curStep    = stepStatus.indexOf(order.status);

  meta.innerHTML = `
    <div class="pos-order-title">
      <div class="pos-order-num">${order.num}</div>
      <div class="pos-order-info">${order.type} · ${order.items.reduce((s,i)=>s+i.qty,0)} item(s)</div>
    </div>
    <div class="status-stepper">
      <div class="ss-step">
        <div class="ss-dot ${curStep >= 0 ? (curStep > 0 ? 'done' : 'active') : ''}">1</div>
        <div class="ss-label">Pending</div>
      </div>
      <div class="ss-line ${curStep > 0 ? 'done' : ''}"></div>
      <div class="ss-step">
        <div class="ss-dot ${curStep >= 1 ? (curStep > 1 ? 'done' : 'active') : ''}">2</div>
        <div class="ss-label">Process</div>
      </div>
      <div class="ss-line ${curStep > 1 ? 'done' : ''}"></div>
      <div class="ss-step">
        <div class="ss-dot ${curStep >= 2 ? 'done' : ''}">✓</div>
        <div class="ss-label">Done</div>
      </div>
    </div>
  `;

  // Items
  if (order.items.length === 0) {
    items.innerHTML = `
      <div class="pos-empty">
        <div class="pos-empty-icon">🛒</div>
        <div class="pos-empty-text">No items — add some below</div>
      </div>`;
  } else {
    items.innerHTML = '';
    order.items.forEach(item => {
      const row = document.createElement('div');
      row.className = 'pos-item-row';
      row.innerHTML = `
        <div>
          <div class="pir-name">${item.emoji} ${item.name}</div>
          <div class="pir-variant">${item.variant || 'Regular'}</div>
        </div>
        <div class="pir-controls">
          <button class="pir-qty-btn minus" onclick="posChangeQty('${item.key}', -1)">−</button>
          <span class="pir-qty">${item.qty}</span>
          <button class="pir-qty-btn" onclick="posChangeQty('${item.key}', 1)">+</button>
        </div>
        <div class="pir-price">₱${item.price * item.qty}</div>
        <button class="pir-del" onclick="posDeleteItem('${item.key}')" title="Remove">✕</button>
      `;
      items.appendChild(row);
    });
  }

  // Show add-item bar
  bar.style.display = '';
  populateQuickAdd();
}


/* ══════════════════════════════
   POS ITEM EDITING
══════════════════════════════ */
function posChangeQty(key, delta) {
  const order = orders.find(o => o.id === activeOrderId);
  if (!order) return;
  const idx = order.items.findIndex(i => i.key === key);
  if (idx === -1) return;
  order.items[idx].qty += delta;
  if (order.items[idx].qty <= 0) order.items.splice(idx, 1);
  renderPOS(order);
  renderPaymentPanel(order);
}

function posDeleteItem(key) {
  const order = orders.find(o => o.id === activeOrderId);
  if (!order) return;
  order.items = order.items.filter(i => i.key !== key);
  renderPOS(order);
  renderPaymentPanel(order);
}


/* ══════════════════════════════
   QUICK ADD ITEM (cashier can add items)
══════════════════════════════ */
function populateQuickAdd() {
  const catSel = document.getElementById('quick-cat');
  if (catSel.options.length > 1) return; // already populated
  menu.forEach(cat => {
    const opt = document.createElement('option');
    opt.value = cat.id;
    opt.textContent = cat.label;
    catSel.appendChild(opt);
  });
}

function quickCatChange() {
  const catId   = document.getElementById('quick-cat').value;
  const itemSel = document.getElementById('quick-item');
  itemSel.innerHTML = '<option value="">— Item —</option>';
  if (!catId) return;
  const cat = menu.find(c => c.id === catId);
  if (!cat) return;
  cat.items.forEach(item => {
    const opt = document.createElement('option');
    opt.value = JSON.stringify(item);
    opt.textContent = item.name;
    itemSel.appendChild(opt);
  });
}

function quickAddItem() {
  const order = orders.find(o => o.id === activeOrderId);
  if (!order) { showToast('Select or create an order first', 'error'); return; }

  const itemJson = document.getElementById('quick-item').value;
  const variant  = document.getElementById('quick-variant').value;
  if (!itemJson) { showToast('Select an item', 'error'); return; }

  const itemData = JSON.parse(itemJson);
  const price    = itemData.price || (variant === 'Hot' ? itemData.hot : itemData.iced) || itemData.hot || itemData.iced || 0;
  const key      = itemData.id + (variant ? '_' + variant : '');

  const existing = order.items.find(i => i.key === key);
  if (existing) {
    existing.qty++;
  } else {
    order.items.push({
      id: itemData.id, name: itemData.name, emoji: itemData.emoji,
      variant, price, qty: 1, key
    });
  }

  // Reset dropdowns
  document.getElementById('quick-item').innerHTML    = '<option value="">— Item —</option>';
  document.getElementById('quick-variant').value     = '';
  document.getElementById('quick-cat').value         = '';

  renderPOS(order);
  renderPaymentPanel(order);
  showToast(`${itemData.emoji} ${itemData.name} added`, 'success');
}


/* ══════════════════════════════
   WALK-IN ORDER
══════════════════════════════ */
function createWalkIn() {
  const order = createOrder([], 'Dine In');
  order.status = 'processing';
  orders.push(order);
  
  // Save to database (if available)
  if (window.saveOrderToDatabase && typeof window.saveOrderToDatabase === 'function') {
    window.saveOrderToDatabase(order).then(dbOrder => {
      if (!dbOrder) {
        console.error('Failed to save walk-in order to database');
        showToast('Warning: Order may not be saved to database', 'error');
      }
    }).catch(err => {
      console.warn('Could not save walk-in order to database:', err);
      showToast('Warning: Order may not be saved to database', 'warn');
    });
  } else {
    console.warn('Database function not available, order will not be saved');
  }
  
  renderQueue();
  updateQueueCount();
  selectOrder(order.id);
  showToast('Walk-in order created', 'success');
}


/* ══════════════════════════════
   PAYMENT PANEL
══════════════════════════════ */
function renderPaymentPanel(order) {
  const summaryEl  = document.getElementById('pay-summary');
  const methodSec  = document.getElementById('pay-method-section');

  if (!order || order.items.length === 0) {
    summaryEl.innerHTML = '<div class="pay-empty">Select an order to process payment</div>';
    methodSec.style.display = 'none';
    return;
  }

  // Summary
  summaryEl.innerHTML = order.items.map(i =>
    `<div class="ps-row"><strong>${i.emoji} ${i.name}${i.variant ? ' (' + i.variant + ')' : ''} ×${i.qty}</strong><span>₱${i.price * i.qty}</span></div>`
  ).join('');

  methodSec.style.display = '';

  // Reset discount UI
  document.querySelectorAll('.disc-btn').forEach((b, i) => {
    b.classList.toggle('active', i === 0);
  });
  discountRate = 0;

  // Reset payment method UI
  document.querySelectorAll('.pm-btn').forEach(b => {
    b.classList.toggle('active', b.textContent.includes('Cash'));
  });
  payMethod = 'Cash';
  document.getElementById('cash-section').style.display    = '';
  document.getElementById('digital-section').style.display = 'none';

  // Recalc totals
  updateTotals(order);
  buildCashPresets(order);

  // Reset numpad
  tendered = '';
  document.getElementById('tendered-display').textContent = '₱0';
  document.getElementById('change-row').style.display     = 'none';
  document.getElementById('confirm-btn').disabled         = false;
}

function updateTotals(order) {
  if (!order) return;
  const subtotal    = order.items.reduce((s, i) => s + i.price * i.qty, 0);
  const discountAmt = Math.round(subtotal * discountRate);
  const total       = subtotal - discountAmt;

  document.getElementById('pt-subtotal').textContent = '₱' + subtotal.toFixed(2);
  document.getElementById('pt-total').textContent    = '₱' + total.toFixed(2);

  const discRow = document.getElementById('pt-disc-row');
  if (discountRate > 0) {
    discRow.style.display = '';
    document.getElementById('pt-disc-label').textContent = `Discount (${discountRate * 100}%)`;
    document.getElementById('pt-disc-amt').textContent   = '-₱' + discountAmt.toFixed(2);
  } else {
    discRow.style.display = 'none';
  }

  // Recalc change if tendered already entered
  if (tendered) recalcChange(total);
}

function buildCashPresets(order) {
  const subtotal = order.items.reduce((s, i) => s + i.price * i.qty, 0);
  const total    = Math.round(subtotal * (1 - discountRate));

  const presets  = [total, roundUp(total, 50), roundUp(total, 100), roundUp(total, 200), roundUp(total, 500), 1000]
    .filter((v, i, a) => a.indexOf(v) === i)
    .slice(0, 6);

  const container = document.getElementById('cash-presets');
  container.innerHTML = '';
  presets.forEach(amt => {
    const btn = document.createElement('button');
    btn.className = 'cp-btn';
    btn.textContent = '₱' + amt;
    btn.onclick = () => {
      tendered = String(amt);
      document.getElementById('tendered-display').textContent = '₱' + amt;
      recalcChange(total);
    };
    container.appendChild(btn);
  });
}

function roundUp(val, to) {
  return Math.ceil(val / to) * to;
}


/* ══════════════════════════════
   PAYMENT METHOD
══════════════════════════════ */
function setPayMethod(btn, method) {
  payMethod = method;
  document.querySelectorAll('.pm-btn').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');

  const isCash = method === 'Cash';
  document.getElementById('cash-section').style.display    = isCash ? '' : 'none';
  document.getElementById('digital-section').style.display = isCash ? 'none' : '';

  if (!isCash) {
    document.getElementById('change-row').style.display = 'none';
  }
}


/* ══════════════════════════════
   NUMPAD
══════════════════════════════ */
function numpadPress(key) {
  const order = orders.find(o => o.id === activeOrderId);
  if (!order) return;

  const subtotal = order.items.reduce((s, i) => s + i.price * i.qty, 0);
  const total    = Math.round(subtotal * (1 - discountRate));

  if (key === 'C') {
    tendered = '';
  } else if (key === '⌫') {
    tendered = tendered.slice(0, -1);
  } else {
    if (tendered.length >= 6) return;
    tendered += key;
  }

  const amt = parseInt(tendered || '0', 10);
  document.getElementById('tendered-display').textContent = '₱' + (amt || 0);

  if (amt > 0) {
    recalcChange(total);
  } else {
    document.getElementById('change-row').style.display = 'none';
  }
}

function recalcChange(total) {
  const amt    = parseInt(tendered || '0', 10);
  const change = amt - total;
  const row    = document.getElementById('change-row');

  if (amt >= total) {
    row.style.display = '';
    document.getElementById('change-val').textContent = '₱' + change;
    row.style.background = change === 0
      ? 'rgba(91,155,213,0.12)'
      : 'var(--green-dim)';
  } else {
    row.style.display = 'none';
  }
}


/* ══════════════════════════════
   DISCOUNT
══════════════════════════════ */
function setDiscount(btn, rate) {
  discountRate = rate;
  document.querySelectorAll('.disc-btn').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');

  const order = orders.find(o => o.id === activeOrderId);
  updateTotals(order);
  if (order) buildCashPresets(order);
}


/* ══════════════════════════════
   CONFIRM PAYMENT
══════════════════════════════ */
function confirmPayment() {
  const order = orders.find(o => o.id === activeOrderId);
  if (!order || order.items.length === 0) {
    showToast('No items in order', 'error');
    return;
  }

  const subtotal    = order.items.reduce((s, i) => s + i.price * i.qty, 0);
  const discountAmt = Math.round(subtotal * discountRate);
  const total       = subtotal - discountAmt;

  if (payMethod === 'Cash') {
    const amt = parseInt(tendered || '0', 10);
    if (amt < total) {
      showToast('Amount tendered is less than total', 'error');
      return;
    }
  } else {
    const ref = document.getElementById('ref-input').value.trim();
    if (!ref) {
      showToast('Please enter a reference number', 'error');
      return;
    }
  }

  // Mark order as done
  order.status    = 'done';
  order.discount  = discountRate;
  order.payMethod = payMethod;

  // Save payment details to database (if available)
  const amountTendered = parseInt(tendered || '0', 10);
  const changeAmount = amountTendered - total;
  
  if (typeof updateOrderPayment === 'function' && typeof updateOrderStatus === 'function') {
    updateOrderPayment(
      order.num,
      payMethod,
      amountTendered,
      changeAmount,
      discountRate
    ).then(success => {
      if (success) {
        // Also update status to done
        updateOrderStatus(order.num, 'done').catch(err => {
          console.warn('Failed to mark order as done:', err);
        });
      }
    }).catch(err => {
      console.warn('Failed to save payment:', err);
    });
  }

  renderQueue();
  updateQueueCount();
  showReceipt(order, total, discountAmt);
}


/* ══════════════════════════════
   RECEIPT
══════════════════════════════ */
function showReceipt(order, total, discountAmt) {
  const subtotal    = order.items.reduce((s, i) => s + i.price * i.qty, 0);
  const tenderedAmt = parseInt(tendered || '0', 10);
  const change      = payMethod === 'Cash' ? tenderedAmt - total : 0;
  const now         = new Date();

  document.getElementById('r-order-num').textContent = order.num;
  document.getElementById('r-type').textContent      = order.type;
  document.getElementById('r-date').textContent      = now.toLocaleString('en-PH', {
    month: 'short', day: 'numeric', year: 'numeric',
    hour: '2-digit', minute: '2-digit'
  });

  // Items
  document.getElementById('r-items').innerHTML =
    order.items.map(i => `
      <div class="ri-row">
        <span class="ri-name">${i.emoji} ${i.name}${i.variant ? ' (' + i.variant + ')' : ''}</span>
        <span class="ri-qty">×${i.qty}</span>
        <span class="ri-amt">₱${i.price * i.qty}</span>
      </div>
    `).join('');

  // Totals
  let totalsHtml = `<div class="rt-row"><span>Subtotal</span><span>₱${subtotal.toFixed(2)}</span></div>`;
  if (discountAmt > 0) {
    totalsHtml += `<div class="rt-row"><span>Discount (${order.discount * 100}%)</span><span>-₱${discountAmt.toFixed(2)}</span></div>`;
  }
  totalsHtml += `<div class="rt-row total"><span>TOTAL</span><span>₱${total.toFixed(2)}</span></div>`;
  totalsHtml += `<div class="rt-row"><span>Payment (${order.payMethod})</span><span>${payMethod === 'Cash' ? '₱' + tenderedAmt : '—'}</span></div>`;
  if (payMethod === 'Cash') {
    totalsHtml += `<div class="rt-row"><span>Change</span><span>₱${change.toFixed(2)}</span></div>`;
  }
  document.getElementById('r-totals').innerHTML = totalsHtml;

  document.getElementById('receipt-modal').classList.add('open');
}

function closeReceipt() {
  document.getElementById('receipt-modal').classList.remove('open');
  activeOrderId = null;

  // Reset POS panel
  document.getElementById('pos-order-meta').innerHTML = `
    <div class="pos-placeholder-icon">🛒</div>
    <div class="pos-placeholder-text">Select an order from the queue</div>
    <div class="pos-placeholder-sub">or create a walk-in order below</div>
  `;
  document.getElementById('pos-items').innerHTML = '';
  document.getElementById('add-item-bar').style.display = 'none';

  // Reset payment panel
  document.getElementById('pay-summary').innerHTML         = '<div class="pay-empty">Select an order to process payment</div>';
  document.getElementById('pay-method-section').style.display = 'none';

  renderQueue();
  showToast('✓ Payment confirmed!', 'success');
}

function printReceipt() {
  window.print();
}


/* ══════════════════════════════
   TOAST NOTIFICATIONS
══════════════════════════════ */
let toastTimer = null;

function showToast(msg, type = '') {
  const el = document.getElementById('toast');
  el.textContent = msg;
  el.className   = 'toast show ' + type;
  if (toastTimer) clearTimeout(toastTimer);
  toastTimer = setTimeout(() => { el.className = 'toast'; }, 2800);
}


/* ══════════════════════════════
   INIT
══════════════════════════════ */
// Initialize the system
// Wait for database functions to be loaded
async function waitForDatabaseFunctions(timeout = 10000) {
  const startTime = Date.now();
  while (typeof window.loadOrdersFromDatabase !== 'function') {
    if (Date.now() - startTime > timeout) {
      console.warn('⚠️ Database functions timeout - proceeding without database');
      console.warn('Check console for initialization errors');
      return false;
    }
    await new Promise(resolve => setTimeout(resolve, 100));
  }
  console.log('✓ Database functions are ready');
  return true;
}

async function initSystem() {
  try {
    // Wait for database functions to load
    const dbAvailable = await waitForDatabaseFunctions();
    
    if (dbAvailable) {
      // Load existing orders from database
      const dbOrders = await window.loadOrdersFromDatabase();
      orders = dbOrders;
      
      // Set order counter based on existing orders
      if (dbOrders.length > 0) {
        const maxNum = Math.max(...dbOrders.map(o => parseInt(o.num.replace('#', ''))));
        orderCounter = maxNum;
      }
      console.log('✓ Cashier system initialized with ' + dbOrders.length + ' orders');
    } else {
      console.warn('Database not available - orders will not be persisted');
      orders = [];
    }
  } catch (err) {
    console.error('Error initializing system:', err);
    orders = [];
  }
  
  renderQueue();
  updateQueueCount();
  
  // Subscribe to realtime database updates
  initRealtimeSubscription();
}



// Subscribe to realtime database changes
function initRealtimeSubscription() {
  try {
    if (typeof subscribeToOrderUpdates !== 'function') {
      console.warn('Real-time subscription not available (Supabase may not be loaded)');
      return null;
    }
    
    const subscription = subscribeToOrderUpdates((payload) => {
      console.log('Realtime update:', payload);
      
      if (payload.eventType === 'UPDATE') {
        // Update order status in our local array
        const orderToUpdate = orders.find(o => o.num === ('#' + String(payload.new.id).padStart(3, '0')));
        if (orderToUpdate) {
          orderToUpdate.status = payload.new.status;
          renderQueue();
          updateQueueCount();
        }
      } else if (payload.eventType === 'DELETE') {
        // Remove deleted order
        orders = orders.filter(o => o.num !== ('#' + String(payload.old.id).padStart(3, '0')));
        renderQueue();
        updateQueueCount();
      }
    });
    
    return subscription;
  } catch(err) {
    console.warn('Real-time subscription error:', err);
    return null;
  }
}

// Start the system when page loads
document.addEventListener('DOMContentLoaded', initSystem);


/* ══════════════════════════════
   SESSION: LOAD CASHIER NAME
══════════════════════════════ */
(function initSession() {
  const raw = sessionStorage.getItem('coffeestop_cashier_session');
  if (!raw) return;
  try {
    const session = JSON.parse(raw);
    const el = document.getElementById('cashier-name-display');
    if (el) el.textContent = '👤 ' + session.displayName;
  } catch(e) {}
})();


/* ══════════════════════════════
   LOGOUT
══════════════════════════════ */
function logoutCashier() {
  if (!confirm('Log out of the cashier terminal?')) return;
  sessionStorage.removeItem('coffeestop_cashier_session');
  window.location.href = 'login.html';
}