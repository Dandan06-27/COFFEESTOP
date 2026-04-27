# CoffeeStop Queuing System — Database Setup Guide

## Overview
Your queuing system now persists data to **Supabase** PostgreSQL database, so orders remain even after page refresh.

---

## Step 1: Set Up Supabase Project

### 1a. Create a Supabase Account
1. Go to [supabase.com](https://supabase.com)
2. Sign up with GitHub or email
3. Create a new project (choose free tier)
4. Note your **Project URL** and **Public Anon Key**

### 1b. Copy Your Credentials
From your Supabase dashboard:
1. Click "Settings" → "API"
2. Copy **Project URL** (looks like: `https://xxxx.supabase.co`)
3. Copy **Public Anon Key** (starts with `eyJ...`)

---

## Step 2: Update Configuration File

Open `supabase-config.js` and replace:

```javascript
const SUPABASE_URL = 'https://YOUR_PROJECT_ID.supabase.co';
const SUPABASE_KEY = 'YOUR_PUBLIC_ANON_KEY';
```

With your actual credentials from Step 1b.

---

## Step 3: Create the Database Tables

### In Supabase Dashboard:
1. Go to **SQL Editor**
2. Click **New Query**
3. Copy and paste this SQL code:

```sql
-- ═══════════════════════════════════════════
-- COFFEESTOP QUEUEING SYSTEM - SUPABASE SETUP
-- ═══════════════════════════════════════════

-- ──────────────────────────────────────────
-- 1. ORDERS TABLE
-- ──────────────────────────────────────────
CREATE TABLE IF NOT EXISTS orders (
  id BIGSERIAL PRIMARY KEY,
  order_num TEXT UNIQUE NOT NULL,           -- e.g., "#101", "#102"
  order_type TEXT NOT NULL,                 -- "Dine In" or "Take Out"
  status TEXT NOT NULL DEFAULT 'pending',   -- "pending", "processing", "done"
  items JSONB NOT NULL,                     -- Array of items with details
  subtotal DECIMAL(10, 2) NOT NULL,         -- Order subtotal
  discount_rate DECIMAL(5, 2) DEFAULT 0,    -- Discount percentage (0-100)
  discount_amount DECIMAL(10, 2) DEFAULT 0, -- Discount amount in pesos
  total DECIMAL(10, 2) NOT NULL,            -- Final total after discount
  payment_method TEXT,                      -- "Cash", "GCash", "Card"
  amount_tendered DECIMAL(10, 2),           -- Amount customer paid
  change_amount DECIMAL(10, 2),             -- Change to give back
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  completed_at TIMESTAMP WITH TIME ZONE     -- When order was marked done
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);
CREATE INDEX IF NOT EXISTS idx_orders_created_at ON orders(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_orders_order_num ON orders(order_num);

-- ──────────────────────────────────────────
-- 2. ENABLE REALTIME (for live updates)
-- ──────────────────────────────────────────
ALTER TABLE orders REPLICA IDENTITY FULL;
```

4. Click **Run** ▶️

---

## Step 4: Enable Realtime (Optional but Recommended)

In Supabase Dashboard:
1. Go to **Realtime** section
2. Find the `orders` table
3. Toggle **Realtime** ON

This enables live updates across multiple cashier terminals.

---

## Step 5: Test the Integration

1. Open your cashier terminal (`cashier.html`)
2. Create a new order or walk-in order
3. Mark it as done and complete payment
4. **Refresh the page** — your orders should still appear!

---

## How It Works

### When Orders Are Saved:
- ✅ **New orders from kiosk** → Automatically saved to database
- ✅ **Walk-in orders** → Saved when created
- ✅ **Order status changes** → Automatically synced (pending → processing → done)
- ✅ **Payment information** → Saved with discount, payment method, change, etc.

### When Orders Are Loaded:
- Page loads → All **pending** and **processing** orders are restored
- **Completed orders** are kept in database for historical records

---

## Available Functions in `supabase-config.js`

### Load Orders
```javascript
// Load pending/processing orders on startup
const orders = await loadOrdersFromDatabase();

// Load all orders (for reports)
const allOrders = await loadAllOrdersFromDatabase();

// Load orders by date
const todayOrders = await loadOrdersByDate(new Date());
```

### Save & Update Orders
```javascript
// Save new order
await saveOrderToDatabase(orderObject);

// Update order status
await updateOrderStatus('#101', 'done');

// Update payment details
await updateOrderPayment('#101', 'Cash', 500, 0, 10); // method, tendered, change, discount

// Update items
await updateOrderItems('#101', itemsArray);
```

### Get Statistics
```javascript
// Get revenue and completed orders
const stats = await getRevenueStats(fromDate, toDate);
// Returns: { totalRevenue: 1500.50, ordersCompleted: 12 }
```

### Realtime Subscriptions
```javascript
// Subscribe to live order updates
const subscription = subscribeToOrderUpdates((payload) => {
  console.log('Order changed:', payload);
});
```

---

## Troubleshooting

### ❌ "Cannot read property 'createClient' of undefined"
**Solution:** The Supabase script failed to load. Make sure your HTML has:
```html
<script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2"></script>
<script src="supabase-config.js"></script>
```

### ❌ "Error: Invalid API key"
**Solution:** Check your `SUPABASE_URL` and `SUPABASE_KEY` in `supabase-config.js`

### ❌ Orders disappear after page refresh
**Solution:** 
1. Check if the `orders` table was created successfully
2. Verify Supabase credentials are correct
3. Check browser console for errors (F12 → Console tab)

### ❌ "Table 'orders' does not exist"
**Solution:** Run the SQL code from Step 3 again in Supabase SQL Editor

---

## Database Schema

| Column | Type | Description |
|--------|------|-------------|
| id | BIGSERIAL | Unique order ID (auto-generated) |
| order_num | TEXT | Order number (e.g., "#101") |
| order_type | TEXT | "Dine In" or "Take Out" |
| status | TEXT | pending \| processing \| done |
| items | JSONB | JSON array of order items |
| subtotal | DECIMAL | Total before discount |
| discount_rate | DECIMAL | Discount percentage (0-100) |
| discount_amount | DECIMAL | Amount discounted in ₱ |
| total | DECIMAL | Final amount to pay |
| payment_method | TEXT | Cash, GCash, Card |
| amount_tendered | DECIMAL | Amount customer gave |
| change_amount | DECIMAL | Change to return |
| created_at | TIMESTAMP | When order was created |
| updated_at | TIMESTAMP | Last update time |
| completed_at | TIMESTAMP | When order was marked done |

---

## Next Steps

### Optional Enhancements:
- [ ] Set up Row-Level Security (RLS) for multi-user accounts
- [ ] Create a reports dashboard to view daily revenue
- [ ] Export orders to CSV for accounting
- [ ] Set up automated backups
- [ ] Add order history filter by date range

---

**Questions?** Check your browser console (F12) for detailed error messages!
