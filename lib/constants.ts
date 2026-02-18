export const APP_NAME = "ArmogridSolar";
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
  IVORYPAY: 4,
  IVORYPAY_ONRAMP: 5,
} as const;

// Payment Status
export const PAYMENT_STATUS = {
  PENDING: "pending",
  SUCCESS: "success",
  FAILED: "failed",
} as const;

// Minimum recharge amount (in Naira)
export const MIN_RECHARGE_AMOUNT = 500;

// Maximum recharge amount (in Naira)
export const MAX_RECHARGE_AMOUNT = 5000000;

// Paystack Fee Configuration (Nigeria - NGN)
// Local transactions: 1.5% + ₦100 (capped at ₦2,000)
// ₦100 fee is waived for transactions under ₦2,500
// International: 3.9% + ₦100 (Mastercard/Visa/Verve) or 4.5% (Amex)
export const PAYSTACK_FEE = {
  LOCAL_PERCENTAGE: 0.015, // 1.5%
  LOCAL_FLAT: 100, // ₦100 (waived if amount < ₦2,500)
  LOCAL_CAP: 2000, // ₦2,000 cap
  LOCAL_FLAT_THRESHOLD: 2500, // ₦100 fee waived below this amount
  INTERNATIONAL_PERCENTAGE: 0.039, // 3.9% (Mastercard/Visa/Verve)
  INTERNATIONAL_FLAT: 100, // ₦100
  INTERNATIONAL_AMEX_PERCENTAGE: 0.045, // 4.5% (American Express)
} as const;

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
