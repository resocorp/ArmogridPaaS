-- SMS Logs Table
CREATE TABLE IF NOT EXISTS sms_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  phone_number VARCHAR(20) NOT NULL,
  message TEXT NOT NULL,
  notification_type VARCHAR(50) NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'pending',
  error TEXT,
  response TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for querying SMS logs
CREATE INDEX IF NOT EXISTS idx_sms_logs_created_at ON sms_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_sms_logs_phone ON sms_logs(phone_number);
CREATE INDEX IF NOT EXISTS idx_sms_logs_status ON sms_logs(status);
CREATE INDEX IF NOT EXISTS idx_sms_logs_type ON sms_logs(notification_type);

-- Notification Templates Table
CREATE TABLE IF NOT EXISTS notification_templates (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name VARCHAR(100) NOT NULL UNIQUE,
  type VARCHAR(50) NOT NULL, -- 'sms', 'whatsapp', 'email'
  notification_type VARCHAR(50) NOT NULL, -- 'welcome', 'low_credit', etc.
  template TEXT NOT NULL,
  enabled BOOLEAN DEFAULT true,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for notification templates
CREATE INDEX IF NOT EXISTS idx_notification_templates_type ON notification_templates(type);
CREATE INDEX IF NOT EXISTS idx_notification_templates_notification_type ON notification_templates(notification_type);

-- Customer Notification Preferences Table
CREATE TABLE IF NOT EXISTS customer_notification_preferences (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  customer_id VARCHAR(100), -- Can be meter_id or room_no
  phone_number VARCHAR(20),
  sms_enabled BOOLEAN DEFAULT true,
  whatsapp_enabled BOOLEAN DEFAULT true,
  email_enabled BOOLEAN DEFAULT true,
  low_credit_threshold NUMERIC(10,2) DEFAULT 500,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for customer preferences
CREATE INDEX IF NOT EXISTS idx_customer_notification_prefs_customer ON customer_notification_preferences(customer_id);

-- Insert default SMS settings into admin_settings if they don't exist
INSERT INTO admin_settings (key, value, description) 
VALUES 
  ('sms_enabled', 'false', 'Enable SMS notifications globally'),
  ('sms_server_url', 'http://159.65.59.78/goip/en/index.php', 'GoIP SMS Server URL'),
  ('sms_username', 'armogrid', 'GoIP SMS Server Username'),
  ('sms_password', 'armogrid', 'GoIP SMS Server Password'),
  ('sms_goip_provider', 'phsweb', 'GoIP Provider Name'),
  ('sms_goip_line', 'goip-10102', 'GoIP Line/Channel to use'),
  ('admin_phone', '', 'Primary admin phone for alerts'),
  ('admin_phone_2', '', 'Secondary admin phone for alerts'),
  ('admin_phone_3', '', 'Tertiary admin phone for alerts'),
  ('low_credit_threshold', '500', 'Balance threshold for low credit alerts (Naira)'),
  ('sms_welcome_enabled', 'true', 'Send welcome SMS to new customers'),
  ('sms_payment_enabled', 'true', 'Send SMS on successful payment'),
  ('sms_low_credit_enabled', 'true', 'Send low credit warning SMS'),
  ('sms_meter_offline_enabled', 'true', 'Send meter offline alerts to admin')
ON CONFLICT (key) DO NOTHING;

-- Insert default notification templates
INSERT INTO notification_templates (name, type, notification_type, template, description)
VALUES
  ('welcome_sms', 'sms', 'welcome', 'Welcome to ArmogridSolar, {name}! Your account has been registered successfully. Room: {roomNumber}, Location: {locationName}. Thank you for choosing us!', 'Welcome SMS for new customers'),
  ('low_credit_sms', 'sms', 'low_credit', 'Dear {name}, your meter balance is low (₦{balance}). Please recharge soon to avoid power disconnection. Room: {roomNumber}. Recharge at armogrid.com', 'Low credit warning SMS'),
  ('payment_success_sms', 'sms', 'payment_success', 'Payment Successful! ₦{amount} received for meter {meterId}. New balance: ₦{balance}. Ref: {reference}. ArmogridSolar', 'Payment confirmation SMS'),
  ('account_credited_sms', 'sms', 'account_credited', 'ArmogridSolar: Your account has been credited with ₦{amount}. New balance: ₦{balance}. Reference: {reference}. Thank you!', 'Account credited SMS'),
  ('meter_offline_sms', 'sms', 'meter_offline', '⚠️ METER OFFLINE: {meterId} in {projectName} (Room: {roomNumber}) is offline. Please check.', 'Meter offline admin alert')
ON CONFLICT (name) DO NOTHING;
