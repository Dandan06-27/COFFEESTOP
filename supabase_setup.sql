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
-- This enables realtime notifications when orders change
ALTER TABLE orders REPLICA IDENTITY FULL;

-- ──────────────────────────────────────────
-- 3. ROW LEVEL SECURITY (Optional - disable for testing)
-- ──────────────────────────────────────────
-- Uncomment these lines if you want to enable security
-- ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
-- 
-- CREATE POLICY "Enable read access for all users" ON orders
--   FOR SELECT USING (true);
-- 
-- CREATE POLICY "Enable insert for authenticated users" ON orders
--   FOR INSERT WITH CHECK (true);
-- 
-- CREATE POLICY "Enable update for authenticated users" ON orders
--   FOR UPDATE USING (true);

-- ──────────────────────────────────────────
-- 4. SAMPLE QUERIES FOR REFERENCE
-- ──────────────────────────────────────────

-- Get all pending orders
-- SELECT * FROM orders WHERE status = 'pending' ORDER BY created_at DESC;

-- Get order by order number
-- SELECT * FROM orders WHERE order_num = '#101';

-- Update order status
-- UPDATE orders SET status = 'done', completed_at = NOW() WHERE id = 1;

-- Get orders from today
-- SELECT * FROM orders WHERE DATE(created_at) = CURRENT_DATE ORDER BY created_at DESC;

-- Get total revenue
-- SELECT SUM(total) as revenue FROM orders WHERE status = 'done';

-- Get pending count
-- SELECT COUNT(*) as pending_count FROM orders WHERE status = 'pending';
