export interface Stats {
  totalProjects: number;
  totalMeters: number;
  monthlyRevenue: number;
  todayTransactions: number;
  todaySuccessful: number;
}

export interface Project {
  projectId: string;
  projectName: string;
  address?: string;
  meterCount?: number;
}

export interface Meter {
  meterId?: string;
  roomNo: string;
  roomId?: string;
  projectId: string;
  projectName?: string;
  balance?: string;
  totalMoney?: number;
  buyTimes?: number;
  switchSta?: string | number;
  unConnect?: number;
  controlMode?: string;
  readValue?: string;
  model?: string;
  power?: string;
  meterSN?: string;
  lastReadTime?: string;
  error?: string;
}

export interface Transaction {
  id: string;
  meter_id: string;
  amount_kobo: number;
  paystack_reference: string;
  paystack_status: 'pending' | 'success' | 'failed';
  created_at: string;
  customer_email?: string;
  metadata?: any;
}

export interface ActivityItem {
  id: string;
  type: 'transaction' | 'webhook';
  status: string;
  description: string;
  meterId?: string;
  amount?: number;
  reference?: string;
  timestamp: string;
  error?: string;
}

export interface Registration {
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
  created_at: string;
}

export interface AdminSettings {
  signup_amount: string;
  admin_email: string;
  admin_whatsapp: string;
  ultramsg_instance_id: string;
  ultramsg_token: string;
}

export type SortField = 'roomNo' | 'projectName' | 'meterId' | 'balance' | 'readValue';
export type SortDirection = 'asc' | 'desc';
