-- Migration: Add IvoryPay payment gateway settings
-- Date: 2025-02-15

-- Insert default payment gateway settings
INSERT INTO admin_settings (key, value, updated_at) VALUES
  ('active_payment_gateway', 'paystack', NOW()),
  ('paystack_enabled', 'true', NOW()),
  ('ivorypay_enabled', 'false', NOW()),
  ('ivorypay_default_crypto', 'USDT', NOW()),
  ('ivorypay_auto_swap_to_usdt', 'true', NOW())
ON CONFLICT (key) DO NOTHING;

-- Make paystack_reference nullable to support IvoryPay transactions
ALTER TABLE transactions ALTER COLUMN paystack_reference DROP NOT NULL;

-- Make paystack_reference nullable in customer_registrations as well
ALTER TABLE customer_registrations ALTER COLUMN paystack_reference DROP NOT NULL;

-- Add ivorypay_reference column to transactions table if not exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'transactions' AND column_name = 'ivorypay_reference'
  ) THEN
    ALTER TABLE transactions ADD COLUMN ivorypay_reference TEXT;
  END IF;
END $$;

-- Add payment_gateway column to transactions table if not exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'transactions' AND column_name = 'payment_gateway'
  ) THEN
    ALTER TABLE transactions ADD COLUMN payment_gateway TEXT DEFAULT 'paystack';
  END IF;
END $$;

-- Add ivorypay_status column to transactions table if not exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'transactions' AND column_name = 'ivorypay_status'
  ) THEN
    ALTER TABLE transactions ADD COLUMN ivorypay_status TEXT;
  END IF;
END $$;

-- Add crypto_amount column to track crypto received
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'transactions' AND column_name = 'crypto_amount'
  ) THEN
    ALTER TABLE transactions ADD COLUMN crypto_amount DECIMAL(20, 8);
  END IF;
END $$;

-- Add crypto_currency column
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'transactions' AND column_name = 'crypto_currency'
  ) THEN
    ALTER TABLE transactions ADD COLUMN crypto_currency TEXT;
  END IF;
END $$;

-- Add similar columns to customer_registrations table for signup payments
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'customer_registrations' AND column_name = 'ivorypay_reference'
  ) THEN
    ALTER TABLE customer_registrations ADD COLUMN ivorypay_reference TEXT;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'customer_registrations' AND column_name = 'payment_gateway'
  ) THEN
    ALTER TABLE customer_registrations ADD COLUMN payment_gateway TEXT DEFAULT 'paystack';
  END IF;
END $$;

-- Create index for ivorypay_reference lookups
CREATE INDEX IF NOT EXISTS idx_transactions_ivorypay_reference ON transactions(ivorypay_reference);
CREATE INDEX IF NOT EXISTS idx_transactions_payment_gateway ON transactions(payment_gateway);
CREATE INDEX IF NOT EXISTS idx_customer_registrations_ivorypay_reference ON customer_registrations(ivorypay_reference);

-- Add comment
COMMENT ON COLUMN transactions.payment_gateway IS 'Payment gateway used: paystack or ivorypay';
COMMENT ON COLUMN transactions.ivorypay_reference IS 'IvoryPay transaction reference';
COMMENT ON COLUMN transactions.ivorypay_status IS 'IvoryPay transaction status';
COMMENT ON COLUMN transactions.crypto_amount IS 'Amount received in cryptocurrency';
COMMENT ON COLUMN transactions.crypto_currency IS 'Cryptocurrency type: USDT, USDC, or SOL';
