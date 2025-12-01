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
    };
    Views: {};
    Functions: {};
    Enums: {};
    CompositeTypes: {};
  };
};
