-- Migration: Create orders table for payment tracking
-- Purpose: Track orders from creation through payment to license issuance
-- Author: Claude Code
-- Date: 2026-01-20

-- Create orders table
CREATE TABLE IF NOT EXISTS orders (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_id TEXT UNIQUE NOT NULL,           -- Format: PLANNER202601180393
  customer_name TEXT NOT NULL,
  customer_email TEXT NOT NULL,
  customer_phone TEXT,
  student_count INTEGER NOT NULL CHECK (student_count > 0),
  duration_days INTEGER NOT NULL CHECK (duration_days > 0),
  total_amount INTEGER NOT NULL CHECK (total_amount > 0),
  payment_status TEXT DEFAULT '입금대기' CHECK (payment_status IN ('입금대기', '매칭완료', '라이선스발급완료')),
  license_key TEXT,                        -- Populated after license issuance
  deposit_time TIMESTAMPTZ,                -- PayAction deposit detection time
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_orders_order_id ON orders(order_id);
CREATE INDEX IF NOT EXISTS idx_orders_email ON orders(customer_email);
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(payment_status);
CREATE INDEX IF NOT EXISTS idx_orders_created_at ON orders(created_at DESC);

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_orders_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for updated_at
CREATE TRIGGER trigger_orders_updated_at
  BEFORE UPDATE ON orders
  FOR EACH ROW
  EXECUTE FUNCTION update_orders_updated_at();

-- Enable Row Level Security
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Admin can manage all orders
CREATE POLICY "Admin can manage orders"
  ON orders
  FOR ALL
  USING (
    auth.jwt() ->> 'role' = 'admin'
  );

-- RLS Policy: Customers can view their own orders
CREATE POLICY "Customers can view their orders"
  ON orders
  FOR SELECT
  USING (
    customer_email = auth.jwt() ->> 'email'
  );

-- Grant permissions
GRANT SELECT, INSERT, UPDATE ON orders TO authenticated;
GRANT ALL ON orders TO service_role;

-- Add comment on table
COMMENT ON TABLE orders IS 'Tracks orders from creation through payment to license issuance';
COMMENT ON COLUMN orders.order_id IS 'Unique order identifier format: PLANNER{YYYYMMDDHHNN}';
COMMENT ON COLUMN orders.payment_status IS 'Payment flow: 입금대기 → 매칭완료 → 라이선스발급완료';
COMMENT ON COLUMN orders.license_key IS 'Generated license key after payment confirmation';
COMMENT ON COLUMN orders.deposit_time IS 'Timestamp when PayAction detected the deposit';
