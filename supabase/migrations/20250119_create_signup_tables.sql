-- Create admin_settings table for configurable values
CREATE TABLE IF NOT EXISTS admin_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key VARCHAR(100) UNIQUE NOT NULL,
  value TEXT NOT NULL,
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create customer_registrations table for sign-up data
CREATE TABLE IF NOT EXISTS customer_registrations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  email VARCHAR(255) NOT NULL,
  phone VARCHAR(50) NOT NULL,
  room_number VARCHAR(100) NOT NULL,
  location_id VARCHAR(100) NOT NULL,
  location_name VARCHAR(255),
  amount_paid INTEGER NOT NULL, -- in kobo
  paystack_reference VARCHAR(100),
  payment_status VARCHAR(20) DEFAULT 'pending', -- pending, success, failed
  admin_notified BOOLEAN DEFAULT FALSE,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create indexes
CREATE INDEX idx_customer_registrations_email ON customer_registrations(email);
CREATE INDEX idx_customer_registrations_phone ON customer_registrations(phone);
CREATE INDEX idx_customer_registrations_payment_status ON customer_registrations(payment_status);
CREATE INDEX idx_customer_registrations_created_at ON customer_registrations(created_at DESC);
CREATE INDEX idx_admin_settings_key ON admin_settings(key);

-- Enable RLS
ALTER TABLE admin_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE customer_registrations ENABLE ROW LEVEL SECURITY;

-- Allow service role full access to admin_settings
CREATE POLICY "Service role has full access to admin_settings"
  ON admin_settings
  FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

-- Allow service role full access to customer_registrations
CREATE POLICY "Service role has full access to customer_registrations"
  ON customer_registrations
  FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

-- Insert default settings
INSERT INTO admin_settings (key, value, description) VALUES
  ('signup_amount', '50000', 'Sign-up/installation fee in Naira'),
  ('admin_email', '', 'Admin email for notifications'),
  ('admin_whatsapp', '', 'Admin WhatsApp number for UltraMsg notifications'),
  ('ultramsg_instance_id', '', 'UltraMsg instance ID'),
  ('ultramsg_token', '', 'UltraMsg API token')
ON CONFLICT (key) DO NOTHING;
