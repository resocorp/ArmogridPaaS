export const APP_NAME = "ArmogridPaaS";
export const APP_DESCRIPTION = "IoT Meter Management Platform";

// IoT Platform Constants
export const IOT_BASE_URL = process.env.IOT_BASE_URL || "https://iot.solarshare.africa";

// User Types
export const USER_TYPE = {
  ADMIN: 0,
  USER: 1,
} as const;

// Meter Control Types
export const METER_CONTROL_TYPE = {
  OFF: 0,
  ON: 1,
  PREPAID: 2,
} as const;

// Buy Types for SalePower
export const BUY_TYPE = {
  CASH: 0,
  CARD: 1,
  PAYSTACK: 3,
} as const;

// Payment Status
export const PAYMENT_STATUS = {
  PENDING: "pending",
  SUCCESS: "success",
  FAILED: "failed",
} as const;

// Minimum recharge amount (in Naira)
export const MIN_RECHARGE_AMOUNT = 100;

// Maximum recharge amount (in Naira)
export const MAX_RECHARGE_AMOUNT = 1000000;

// Session cookie name
export const SESSION_COOKIE_NAME = "armogrid_session";

// Session expiry (7 days in milliseconds)
export const SESSION_EXPIRY = 7 * 24 * 60 * 60 * 1000;

// API Routes
export const API_ROUTES = {
  AUTH: {
    LOGIN: "/api/auth/login",
    LOGOUT: "/api/auth/logout",
    ME: "/api/auth/me",
  },
  PAYMENT: {
    INITIALIZE: "/api/payment/initialize",
    VERIFY: "/api/payment/verify",
  },
  METERS: {
    LIST: "/api/meters",
    DETAILS: (id: string) => `/api/meters/${id}`,
    CONTROL: (id: string) => `/api/meters/${id}/control`,
    ENERGY: (id: string) => `/api/meters/${id}/energy`,
  },
  TRANSACTIONS: "/api/transactions",
} as const;

// Public Routes (no auth required)
export const PUBLIC_ROUTES = [
  "/",
  "/login",
  "/payment/success",
  "/payment/failed",
];

// Admin-only Routes
export const ADMIN_ROUTES = [
  "/admin",
  "/admin/meters",
  "/admin/sales",
  "/admin/users",
];
