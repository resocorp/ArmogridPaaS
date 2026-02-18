-- Migration: Add virtual accounts table for IvoryPay On-Ramp
-- Date: 2025-02-16

-- Create virtual_accounts table to store customer virtual bank accounts
CREATE TABLE IF NOT EXISTS virtual_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  meter_id TEXT NOT NULL,
  account_number TEXT NOT NULL,
  bank_name TEXT NOT NULL,
  bank_identifier TEXT,
  currency TEXT DEFAULT 'NGN',
  customer_reference TEXT NOT NULL UNIQUE,
  ivorypay_uuid TEXT,
  customer_email TEXT,
  customer_phone TEXT,
  customer_first_name TEXT,
  customer_last_name TEXT,
  status TEXT DEFAULT 'active',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for efficient lookups
CREATE INDEX IF NOT EXISTS idx_virtual_accounts_meter_id ON virtual_accounts(meter_id);
CREATE INDEX IF NOT EXISTS idx_virtual_accounts_account_number ON virtual_accounts(account_number);
CREATE INDEX IF NOT EXISTS idx_virtual_accounts_customer_reference ON virtual_accounts(customer_reference);
CREATE INDEX IF NOT EXISTS idx_virtual_accounts_status ON virtual_accounts(status);

-- Add comments
COMMENT ON TABLE virtual_accounts IS 'IvoryPay virtual bank accounts for on-ramp payments';
COMMENT ON COLUMN virtual_accounts.meter_id IS 'Associated meter ID';
COMMENT ON COLUMN virtual_accounts.account_number IS 'Virtual bank account number';
COMMENT ON COLUMN virtual_accounts.bank_name IS 'Bank name (e.g., GTBank)';
COMMENT ON COLUMN virtual_accounts.bank_identifier IS 'Bank code/identifier';
COMMENT ON COLUMN virtual_accounts.customer_reference IS 'Unique reference for IvoryPay customer';
COMMENT ON COLUMN virtual_accounts.ivorypay_uuid IS 'IvoryPay virtual account UUID';

-- Add virtual_account_id column to transactions for linking
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'transactions' AND column_name = 'virtual_account_id'
  ) THEN
    ALTER TABLE transactions ADD COLUMN virtual_account_id UUID REFERENCES virtual_accounts(id);
  END IF;
END $$;

-- Create index for virtual_account_id lookups
CREATE INDEX IF NOT EXISTS idx_transactions_virtual_account_id ON transactions(virtual_account_id);

-- Enable Row Level Security
ALTER TABLE virtual_accounts ENABLE ROW LEVEL SECURITY;

-- RLS Policies for virtual_accounts
CREATE POLICY IF NOT EXISTS "Allow service role full access to virtual_accounts"
  ON virtual_accounts
  FOR ALL
  USING (true)
  WITH CHECK (true);
