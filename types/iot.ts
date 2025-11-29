/**
 * IoT Platform API Types
 */

export interface LoginRequest {
  username: string;
  password: string; // MD5 hashed
  type: 0 | 1; // 0 = Admin, 1 = User
}

export interface LoginResponse {
  // New API format
  success?: string; // "1" for success, "0" for failure
  errorCode?: string;
  errorMsg?: string;
  data?: string; // Token string directly
  // Legacy format (keeping for compatibility)
  code?: number;
  msg?: string;
}

export interface MeterInfo {
  meterId: string;
  roomNo?: string;
  projectId?: string;
  balance?: number;
  status?: string;
  voltage?: number;
  current?: number;
  power?: number;
  energy?: number;
  // Add more fields as discovered from API
}

export interface GetMeterInfoRequest {
  roomNo: string;
}

export interface GetMeterInfoResponse {
  // New API format
  success?: string; // "1" for success
  errorCode?: string;
  errorMsg?: string;
  // Legacy format
  code?: number;
  msg?: string;
  data?: MeterInfo | any;
}

export interface UserMeter {
  meterId: string;
  roomNo: string;
  projectId?: string;
  projectName?: string;
  balance?: number;
  status?: string;
}

export interface GetUserMeterListResponse {
  code: number;
  msg: string;
  data: UserMeter[];
}

export interface MeterControlRequest {
  meterId: string;
  type: 0 | 1 | 2; // 0 = Off, 1 = On, 2 = Prepaid
}

export interface MeterControlResponse {
  code: number;
  msg: string;
  data?: any;
}

export interface SalePowerRequest {
  meterId: string;
  saleMoney: number; // in kobo
  buyType: 0 | 1 | 3; // 0 = cash, 1 = card, 3 = paystack
  saleId: string; // unique transaction ID
}

export interface SalePowerResponse {
  // New API format
  success?: string; // "1" for success
  errorCode?: string;
  errorMsg?: string;
  // Legacy format
  code?: number;
  msg?: string;
  data?: {
    saleId: string;
    meterId: string;
    amount: number;
    balance?: number;
  } | any;
}

export interface SaleRecord {
  saleId: string;
  meterId: string;
  saleMoney: number;
  buyType: number;
  saleTime: string;
  status?: string;
}

export interface GetUserSaleListRequest {
  startTime: string; // YYYY-MM-DD
  endTime: string; // YYYY-MM-DD
}

export interface GetUserSaleListResponse {
  code: number;
  msg: string;
  data: SaleRecord[];
}

export interface EnergyData {
  date: string;
  energy: number;
  cost?: number;
}

export interface GetMeterEnergyRequest {
  meterId: string;
  startDate: string; // YYYY-MM-DD
  endDate: string; // YYYY-MM-DD
}

export interface GetMeterEnergyResponse {
  code: number;
  msg: string;
  data: EnergyData[];
}

export interface ProjectInfo {
  projectId: string;
  projectName: string;
  address?: string;
  meterCount?: number;
}

export interface GetProjectListRequest {
  keyword?: string;
  pageSize: number;
  pageIndex: number;
}

export interface GetProjectListResponse {
  code: number;
  msg: string;
  data: {
    list: ProjectInfo[];
    total: number;
  };
}

export interface RoomInfo {
  roomNo: string;
  meterId?: string;
  status?: string;
}

export interface GetProjectRoomInfoRequest {
  projectId: string;
}

export interface GetProjectRoomInfoResponse {
  code: number;
  msg: string;
  data: RoomInfo[];
}

export interface GetSaleInfoByMeterIdRequest {
  meterId: string;
  startTime: string; // YYYY-MM-DD
  endTime: string; // YYYY-MM-DD
}

export interface GetSaleInfoByMeterIdResponse {
  code: number;
  msg: string;
  data: SaleRecord[];
}
