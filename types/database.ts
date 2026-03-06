/**
 * Supabase Database Types
 */

export interface Transaction {
  id: string;
  meter_id: string;
  amount_kobo: number;
  amount_naira?: number;
  paystack_reference: string;
  paystack_status: "pending" | "success" | "failed";
  sale_id: string | null;
  buy_type: number;
  customer_email: string | null;
  customer_phone: string | null;
  user_id: string | null;
  created_at: string;
  updated_at: string;
  metadata: Record<string, any> | null;
}

export interface WebhookLog {
  id: string;
  event_type: string;
  reference: string | null;
  payload: Record<string, any>;
  processed: boolean;
  error: string | null;
  created_at: string;
}

export interface MeterCache {
  meter_id: string;
  user_id: string | null;
  room_no: string | null;
  project_id: string | null;
  balance: number | null;
  status: string | null;
  last_synced: string;
  data: Record<string, any> | null;
}

export interface UserSession {
  id: string;
  user_id: string;
  username: string;
  token: string;
  user_type: number;
  expires_at: string | null;
  created_at: string;
}

export interface MeterCredential {
  id: string;
  room_no: string;
  project_id: string;
  project_name: string | null;
  username: string;
  password_hash: string; // MD5 hashed
  iot_token: string | null;
  token_expires_at: string | null;
  last_sync_at: string | null;
  meter_data: Record<string, any> | null; // Cached meter details
  created_at: string;
  updated_at: string;
}

export interface PowerReading {
  id: string;
  recorded_at: string;
  total_power: number;
  active_meters: number;
  readings_by_project: Record<string, { projectName: string; power: number; meterCount: number }> | null;
  readings_by_meter: Array<{ meterId: string; roomNo: string; power: number; projectName: string }> | null;
  created_at: string;
}

export interface AdminSetting {
  id: string;
  key: string;
  value: string;
  description: string | null;
  created_at: string;
  updated_at: string;
}

export interface CustomerRegistration {
  id: string;
  name: string;
  email: string;
  phone: string;
  room_number: string;
  location_id: string;
  location_name: string | null;
  amount_paid: number;
  paystack_reference: string | null;
  payment_status: 'pending' | 'success' | 'failed';
  admin_notified: boolean;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface SmsLog {
  id: string;
  phone_number: string;
  message: string;
  notification_type: string;
  status: 'pending' | 'sent' | 'failed';
  error: string | null;
  response: string | null;
  created_at: string;
}

export interface NotificationTemplate {
  id: string;
  name: string;
  type: 'sms' | 'whatsapp' | 'email';
  notification_type: string;
  template: string;
  enabled: boolean;
  description: string | null;
  created_at: string;
  updated_at: string;
}

export interface CustomerNotificationPreference {
  id: string;
  customer_id: string | null;
  phone_number: string | null;
  sms_enabled: boolean;
  whatsapp_enabled: boolean;
  email_enabled: boolean;
  low_credit_threshold: number;
  created_at: string;
  updated_at: string;
}

export interface SolarPanelConfig {
  type?: 'mono-si' | 'poly-si' | 'tf-as' | 'cdte';
  area?: number;
  tilt?: number;
  azimuth?: number;
  peak_power?: number;
}

export interface SolarProjectLocation {
  id: string;
  project_id: string;
  project_name: string | null;
  lat: number;
  lon: number;
  timezone: string;
  owm_location_id: string | null;
  owm_panel_ids: string[];
  panel_config: SolarPanelConfig;
  enabled: boolean;
  created_at: string;
  updated_at: string;
}

export interface SolarForecast {
  id: string;
  project_id: string;
  forecast_date: string;
  clear_sky_ghi: number;
  clear_sky_dni: number;
  clear_sky_dhi: number;
  cloudy_sky_ghi: number;
  cloudy_sky_dni: number;
  cloudy_sky_dhi: number;
  solar_ratio: number;
  panel_energy_clear_sky: number;
  panel_energy_cloudy_sky: number;
  sunrise: string | null;
  sunset: string | null;
  weather_summary: string | null;
  weather_icon: string | null;
  cloud_cover_pct: number;
  temp_min: number | null;
  temp_max: number | null;
  rain_mm: number;
  wind_speed: number | null;
  humidity: number | null;
  advisory_level: 'normal' | 'low' | 'very_low' | 'critical';
  advisory_sent: boolean;
  advisory_sent_at: string | null;
  hourly_data: Record<string, any>[] | null;
  created_at: string;
  updated_at: string;
}

export type Database = {
  public: {
    Tables: {
      transactions: {
        Row: Transaction;
        Insert: Omit<Transaction, "id" | "created_at" | "updated_at" | "amount_naira">;
        Update: Partial<Omit<Transaction, "id" | "created_at" | "amount_naira">>;
        Relationships: [];
      };
      webhook_logs: {
        Row: WebhookLog;
        Insert: Omit<WebhookLog, "id" | "created_at">;
        Update: Partial<Omit<WebhookLog, "id" | "created_at">>;
        Relationships: [];
      };
      meter_cache: {
        Row: MeterCache;
        Insert: Omit<MeterCache, "last_synced">;
        Update: Partial<Omit<MeterCache, "meter_id">>;
        Relationships: [];
      };
      user_sessions: {
        Row: UserSession;
        Insert: Omit<UserSession, "id" | "created_at">;
        Update: Partial<Omit<UserSession, "id" | "created_at">>;
        Relationships: [];
      };
      meter_credentials: {
        Row: MeterCredential;
        Insert: Omit<MeterCredential, "id" | "created_at" | "updated_at">;
        Update: Partial<Omit<MeterCredential, "id" | "created_at">>;
        Relationships: [];
      };
      power_readings: {
        Row: PowerReading;
        Insert: Omit<PowerReading, "id" | "created_at">;
        Update: Partial<Omit<PowerReading, "id" | "created_at">>;
        Relationships: [];
      };
      admin_settings: {
        Row: AdminSetting;
        Insert: Omit<AdminSetting, "id" | "created_at" | "updated_at">;
        Update: Partial<Omit<AdminSetting, "id" | "created_at">>;
        Relationships: [];
      };
      customer_registrations: {
        Row: CustomerRegistration;
        Insert: Omit<CustomerRegistration, "id" | "created_at" | "updated_at">;
        Update: Partial<Omit<CustomerRegistration, "id" | "created_at">>;
        Relationships: [];
      };
      solar_project_locations: {
        Row: SolarProjectLocation;
        Insert: Omit<SolarProjectLocation, "id" | "created_at" | "updated_at">;
        Update: Partial<Omit<SolarProjectLocation, "id" | "created_at">>;
        Relationships: [];
      };
      solar_forecasts: {
        Row: SolarForecast;
        Insert: Omit<SolarForecast, "id" | "created_at" | "updated_at">;
        Update: Partial<Omit<SolarForecast, "id" | "created_at">>;
        Relationships: [];
      };
    };
    Views: {};
    Functions: {};
    Enums: {};
    CompositeTypes: {};
  };
};
