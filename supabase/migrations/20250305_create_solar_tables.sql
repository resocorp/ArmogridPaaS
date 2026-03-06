-- Solar Project Locations Table
-- Maps IoT project locations to geographic coordinates and OpenWeatherMap panel config
CREATE TABLE IF NOT EXISTS solar_project_locations (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id VARCHAR(100) NOT NULL,
  project_name VARCHAR(255),
  lat DECIMAL(9,6) NOT NULL,
  lon DECIMAL(9,6) NOT NULL,
  timezone VARCHAR(10) DEFAULT '+01:00', -- Default WAT (West Africa Time)
  owm_location_id VARCHAR(255), -- OpenWeatherMap location ID for Panel Energy Prediction API
  owm_panel_ids JSONB DEFAULT '[]'::jsonb, -- Array of OpenWeatherMap panel IDs
  panel_config JSONB DEFAULT '{}'::jsonb, -- Panel configuration: { type, area, tilt, azimuth, peak_power }
  enabled BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(project_id)
);

-- Index for querying by project
CREATE INDEX IF NOT EXISTS idx_solar_project_locations_project ON solar_project_locations(project_id);
CREATE INDEX IF NOT EXISTS idx_solar_project_locations_enabled ON solar_project_locations(enabled);

-- Solar Forecasts Table
-- Stores daily solar irradiance forecasts and panel energy predictions
CREATE TABLE IF NOT EXISTS solar_forecasts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id VARCHAR(100) NOT NULL,
  forecast_date DATE NOT NULL,
  -- Solar irradiance data (daily totals in Wh/m2)
  clear_sky_ghi DECIMAL(10,2) DEFAULT 0, -- Clear sky Global Horizontal Irradiation
  clear_sky_dni DECIMAL(10,2) DEFAULT 0, -- Clear sky Direct Normal Irradiation
  clear_sky_dhi DECIMAL(10,2) DEFAULT 0, -- Clear sky Diffuse Horizontal Irradiation
  cloudy_sky_ghi DECIMAL(10,2) DEFAULT 0, -- Cloudy sky Global Horizontal Irradiation
  cloudy_sky_dni DECIMAL(10,2) DEFAULT 0, -- Cloudy sky Direct Normal Irradiation
  cloudy_sky_dhi DECIMAL(10,2) DEFAULT 0, -- Cloudy sky Diffuse Horizontal Irradiation
  -- Computed metrics
  solar_ratio DECIMAL(5,4) DEFAULT 0, -- cloudy_sky_ghi / clear_sky_ghi (0.0 to 1.0)
  -- Panel energy prediction (kWh)
  panel_energy_clear_sky DECIMAL(10,4) DEFAULT 0,
  panel_energy_cloudy_sky DECIMAL(10,4) DEFAULT 0,
  -- Sunrise/sunset
  sunrise VARCHAR(30),
  sunset VARCHAR(30),
  -- Weather data from One Call API 3.0
  weather_summary VARCHAR(255),
  weather_icon VARCHAR(10),
  cloud_cover_pct INTEGER DEFAULT 0, -- 0-100
  temp_min DECIMAL(5,2),
  temp_max DECIMAL(5,2),
  rain_mm DECIMAL(6,2) DEFAULT 0,
  wind_speed DECIMAL(6,2),
  humidity INTEGER,
  -- Advisory
  advisory_level VARCHAR(20) DEFAULT 'normal', -- 'normal', 'low', 'very_low', 'critical'
  advisory_sent BOOLEAN DEFAULT false,
  advisory_sent_at TIMESTAMPTZ,
  -- Hourly breakdown stored as JSONB for detailed charts
  hourly_data JSONB, -- Array of hourly irradiance data
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(project_id, forecast_date)
);

-- Indexes for solar forecasts
CREATE INDEX IF NOT EXISTS idx_solar_forecasts_project ON solar_forecasts(project_id);
CREATE INDEX IF NOT EXISTS idx_solar_forecasts_date ON solar_forecasts(forecast_date DESC);
CREATE INDEX IF NOT EXISTS idx_solar_forecasts_project_date ON solar_forecasts(project_id, forecast_date DESC);
CREATE INDEX IF NOT EXISTS idx_solar_forecasts_advisory ON solar_forecasts(advisory_level) WHERE advisory_level != 'normal';

-- Insert solar-related admin settings
INSERT INTO admin_settings (key, value, description)
VALUES
  ('openweathermap_api_key', '', 'OpenWeatherMap API key for Solar Irradiance and One Call API'),
  ('solar_advisory_enabled', 'true', 'Enable daily solar advisory SMS notifications'),
  ('solar_advisory_threshold', '0.40', 'Solar ratio threshold below which to send low solar advisory (0.0-1.0)'),
  ('solar_very_low_threshold', '0.25', 'Solar ratio threshold for very low solar advisory'),
  ('solar_critical_threshold', '0.15', 'Solar ratio threshold for critical solar advisory'),
  ('solar_advisory_time', '18:00', 'Time to run solar advisory check (HH:MM in WAT)'),
  ('solar_forecast_days', '7', 'Number of forecast days to fetch and display'),
  ('solar_panel_prediction_enabled', 'false', 'Enable Solar Panel Energy Prediction API integration'),
  ('sms_solar_advisory_enabled', 'true', 'Send solar advisory SMS to customers')
ON CONFLICT (key) DO NOTHING;

-- Insert solar advisory notification templates
INSERT INTO notification_templates (name, type, notification_type, template, description)
VALUES
  ('solar_advisory_low_sms', 'sms', 'solar_advisory_low', 'ArmogridSolar Advisory: Reduced solar generation expected tomorrow at {locationName}. Expected output: {solarPercent}% of normal. Please conserve power or recharge in advance.', 'Low solar advisory SMS'),
  ('solar_advisory_very_low_sms', 'sms', 'solar_advisory_very_low', 'ArmogridSolar Alert: Very low solar expected tomorrow at {locationName} ({solarPercent}% of normal). {weatherDesc}. We recommend recharging today to avoid disruption.', 'Very low solar advisory SMS'),
  ('solar_advisory_critical_sms', 'sms', 'solar_advisory_critical', 'ArmogridSolar URGENT: Minimal solar generation expected tomorrow at {locationName} ({solarPercent}% of normal). {weatherDesc}. Please recharge immediately to maintain power.', 'Critical solar advisory SMS'),
  ('solar_recharge_recommendation_sms', 'sms', 'solar_recharge_recommendation', 'ArmogridSolar: Based on the solar forecast, we recommend recharging at least NGN {recommendedAmount} to cover the next {days} days. Current balance: NGN {balance}. Recharge at armogridsolar.vercel.app', 'Smart recharge recommendation SMS')
ON CONFLICT (name) DO NOTHING;
