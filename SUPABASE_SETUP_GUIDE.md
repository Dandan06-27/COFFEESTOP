# CoffeeStop Queue Management - Supabase Setup Guide

## Prerequisites
- Supabase account (free tier is fine)
- Your Supabase Project URL and API Key

---

## Step 1: Create Supabase Database Tables

1. Go to your Supabase project dashboard
2. Click on **SQL Editor** in the left sidebar
3. Click **New Query**
4. Copy and paste the entire content from `supabase_setup.sql`
5. Click **Run** to execute

This will create:
- `orders` table with all necessary columns
- Indexes for better performance
- Realtime capabilities

---

## Step 2: Get Your Supabase Credentials

1. In Supabase dashboard, go to **Settings** > **API**
2. Copy your **Project URL** (looks like: `https://xxxxx.supabase.co`)
3. Copy your **Public Anon Key** (the one that starts with `eyJ...`)

---

## Step 3: Configure the Application

1. Open `supabase-config.js` in your project
2. Replace these lines:
   ```javascript
   const SUPABASE_URL = 'https://YOUR_PROJECT_ID.supabase.co';
   const SUPABASE_KEY = 'YOUR_PUBLIC_ANON_KEY';
   ```
   
   With your actual credentials:
   ```javascript
   const SUPABASE_URL = 'https://abcdef123456.supabase.co';
   const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...';
   ```

3. Save the file

---

## Step 4: Verify Setup

### Test in Cashier
1. Open `cashier.html` in your browser
2. Open the browser's Developer Console (F12)
3. You should see: `"Cashier system initialized with X orders"`
4. If there are errors, check the console for details

### Test Order Flow
1. Open `index.html` (kiosk) and place an order
2. The order should appear in the cashier queue immediately
3. Refresh the cashier page - order should still be there (persisted in database)

---

## Database Schema

### Orders Table Columns

| Column | Type | Description |
|--------|------|-------------|
| `id` | BIGSERIAL | Primary key |
| `order_num` | TEXT | Order number (e.g., "#101") |
| `order_type` | TEXT | "Dine In" or "Take Out" |
| `status` | TEXT | "pending", "processing", or "done" |
| `items` | JSONB | Array of order items with details |
| `subtotal` | DECIMAL | Order subtotal before discount |
| `discount_rate` | DECIMAL | Discount percentage (0-100) |
| `discount_amount` | DECIMAL | Discount in pesos |
| `total` | DECIMAL | Final total after discount |
| `payment_method` | TEXT | "Cash", "GCash", or "Card" |
| `amount_tendered` | DECIMAL | Amount customer paid |
| `change_amount` | DECIMAL | Change given back |
| `created_at` | TIMESTAMP | When order was created |
| `updated_at` | TIMESTAMP | Last update time |
| `completed_at` | TIMESTAMP | When order was marked done |

---

## Features Enabled

✅ **Order Persistence** - Orders survive page refreshes
✅ **Realtime Updates** - Live sync between kiosk and cashier
✅ **Payment Tracking** - Stores all payment details
✅ **Order History** - Full audit trail of all orders
✅ **Status Management** - Track order through pending → processing → done

---

## Troubleshooting

### Orders Not Saving
- Check Supabase credentials in `supabase-config.js`
- Check browser console for error messages
- Verify Supabase database is running

### Realtime Not Working
- This is non-critical - app will still work without it
- Check that your Supabase project has realtime enabled (Settings > Replication)

### Page Refresh Loses Orders
- Verify table was created successfully in Supabase
- Check that orders are actually being inserted (check Supabase > Tables > orders)

### Authentication Errors
- Make sure you're using the PUBLIC ANON key, not the SECRET key
- Never share your secret key!

---

## Query Examples

You can test these directly in Supabase SQL Editor:

```sql
-- Get all pending orders
SELECT * FROM orders WHERE status = 'pending' ORDER BY created_at DESC;

-- Get today's revenue
SELECT SUM(total) as revenue FROM orders WHERE DATE(created_at) = CURRENT_DATE;

-- Get average order value
SELECT AVG(total) as average FROM orders WHERE status = 'done';

-- Get orders by type
SELECT order_type, COUNT(*) as count FROM orders GROUP BY order_type;
```

---

## Next Steps

1. ✅ Create database tables
2. ✅ Add credentials to `supabase-config.js`
3. ✅ Test the system
4. (Optional) Set up Row Level Security (RLS) for production
5. (Optional) Add analytics dashboard
6. (Optional) Add order notifications

---

## Support

For issues:
1. Check browser console (F12) for error messages
2. Verify Supabase credentials
3. Check that tables were created in Supabase > Tables
4. Review the error messages - they usually indicate what's wrong
