-- Create table to store historical power readings
CREATE TABLE IF NOT EXISTS power_readings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  recorded_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  total_power DECIMAL(10, 4) NOT NULL, -- Total power across all meters in kW
  active_meters INTEGER NOT NULL DEFAULT 0,
  readings_by_project JSONB, -- { projectId: { projectName, power, meterCount } }
  readings_by_meter JSONB, -- [{ meterId, roomNo, power, projectName }]
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create index for efficient time-based queries
CREATE INDEX idx_power_readings_recorded_at ON power_readings(recorded_at DESC);

-- Enable RLS
ALTER TABLE power_readings ENABLE ROW LEVEL SECURITY;

-- Allow service role full access
CREATE POLICY "Service role has full access to power_readings"
  ON power_readings
  FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');
