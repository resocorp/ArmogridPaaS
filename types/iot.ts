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
  balance: string; // Balance as string from API
  togetherMoney: string;
  oweMoney: boolean;
  controlMode: boolean;
  switchSta: 0 | 1; // 0 = Power Disconnected, 1 = Power Connected
  unConnect: 0 | 1; // 0 = Connected to network, 1 = No network
  together: boolean;
  meterType: number;
  epi: string; // Energy consumption
  projectId?: string;
  projectName?: string;
}

// Extended meter info from getMeterInfo API with live data
export interface MeterDetailedInfo {
  meterId: string;
  roomNo: string;
  startMoney: number;
  totalMoney: number;
  buyTimes: number;
  alarmA: number;
  alarmB: number;
  priceSharp: number;
  pricePeak: number;
  priceFlat: number;
  priceValley: number;
  balance: string;
  togetherMoney: number;
  oweMoney: boolean;
  userStaus: number;
  controlMode: string;
  switchSta: string; // "0" or "1"
  unConnnect: number; // Note: API has typo with 3 n's
  createTime: string;
  model: string;
  epi: string; // Total energy consumed
  ct: number;
  // Voltage readings
  ua: string;
  ub: string;
  uc: string;
  // Current readings
  ia: string;
  ib: string;
  ic: string;
  // Power reading
  p: string; // Current power in kW
}

export interface GetUserMeterListResponse {
  // New API format
  success?: string; // "1" for success
  errorCode?: string;
  errorMsg?: string;
  // Legacy format
  code?: number;
  msg?: string;
  data: UserMeter[];
}

export interface MeterControlRequest {
  meterId: string;
  type: 0 | 1 | 2; // 0 = Off, 1 = On, 2 = Prepaid
}

export interface MeterControlResponse {
  // New API format
  success?: string; // "1" for success
  errorCode?: string;
  errorMsg?: string;
  // Legacy format
  code?: number;
  msg?: string;
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
  createTime: string; // "2025-11-30 08:06:23"
  roomNo: string; // "RM001"
  saleMoney: string; // "5000.00" - amount in Naira as string
  saleType: string; // "1"
  buyType: string; // "1" = Cash, "3" = Web Purchase
  buyTypeNames: {
    'en-US': string;
    'zh-CN': string;
  };
  remark: string; // Can be JSON string or plain text
  saleNo: string; // Transaction ID e.g. "1764489987810"
  success: number; // 1 = success, 0 = failed
  meterType: number;
}

export interface GetUserSaleListRequest {
  startTime: string; // YYYY-MM-DD
  endTime: string; // YYYY-MM-DD
}

export interface GetUserSaleListResponse {
  success: string; // "1" for success
  errorCode: string;
  errorMsg: string;
  data: SaleRecord[];
}

export interface EnergyDataRecord {
  createTime: string; // "2025-03-16 00:00:00"
  meterId: string;
  userName: string | null;
  roomNo: string | null;
  powerUse: string; // Daily energy consumption in kWh as string
  powerStart: string; // Start meter reading
  powerEnd: string; // End meter reading
  sn: string;
  ct: string;
}

export interface GetMeterEnergyRequest {
  meterId: string;
  startDate: string; // "YYYY-MM-DD HH:mm:ss" format
  endDate: string; // "YYYY-MM-DD HH:mm:ss" format
}

export interface GetMeterEnergyResponse {
  success: string; // "1" for success
  errorCode: string;
  errorMsg: string;
  data: EnergyDataRecord[];
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
