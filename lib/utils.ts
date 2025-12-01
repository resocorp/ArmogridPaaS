import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Format amount in kobo to Naira
 */
export function formatNaira(kobo: number): string {
  const naira = kobo / 100;
  return new Intl.NumberFormat('en-NG', {
    style: 'currency',
    currency: 'NGN',
  }).format(naira);
}

/**
 * Convert Naira to kobo
 */
export function nairaToKobo(naira: number): number {
  return Math.round(naira * 100);
}

/**
 * Format date to readable string
 */
export function formatDate(date: Date | string): string {
  return new Intl.DateTimeFormat('en-NG', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(date));
}

/**
 * Generate unique sale ID (timestamp-based)
 */
export function generateSaleId(): string {
  return Date.now().toString();
}

/**
 * Validate meter ID format
 */
export function isValidMeterId(meterId: string): boolean {
  return /^\d+$/.test(meterId) && meterId.length > 0;
}

/**
 * Format energy consumption
 */
export function formatEnergy(kwh: number): string {
  return `${kwh.toFixed(2)} kWh`;
}

/**
 * Calculate percentage
 */
export function calculatePercentage(value: number, total: number): number {
  if (total === 0) return 0;
  return Math.round((value / total) * 100);
}

/**
 * Common Chinese to English error message translations from IoT API
 */
const ERROR_TRANSLATIONS: Record<string, string> = {
  // Login errors
  '用户名或密码错误': 'Invalid username or password',
  '密码错误': 'Invalid password',
  '用户不存在': 'User does not exist',
  '账号已被禁用': 'Account has been disabled',
  '账号已锁定': 'Account has been locked',
  '登录失败': 'Login failed',
  '验证码错误': 'Invalid verification code',
  '验证码已过期': 'Verification code has expired',
  // General errors
  '操作失败': 'Operation failed',
  '请求失败': 'Request failed',
  '服务器错误': 'Server error',
  '网络错误': 'Network error',
  '参数错误': 'Invalid parameters',
  '权限不足': 'Insufficient permissions',
  '未授权': 'Unauthorized',
  '会话已过期': 'Session has expired',
  '令牌无效': 'Invalid token',
  '令牌已过期': 'Token has expired',
  // Meter errors
  '电表不存在': 'Meter does not exist',
  '电表离线': 'Meter is offline',
  '余额不足': 'Insufficient balance',
  '充值失败': 'Recharge failed',
  '控制失败': 'Control operation failed',
};

/**
 * Translate Chinese error messages to English
 * Falls back to a generic message if no translation found
 */
export function translateErrorMessage(message: string): string {
  if (!message) return 'An error occurred';
  
  // Check for exact match
  if (ERROR_TRANSLATIONS[message]) {
    return ERROR_TRANSLATIONS[message];
  }
  
  // Check for partial match (Chinese error might be part of a longer message)
  for (const [chinese, english] of Object.entries(ERROR_TRANSLATIONS)) {
    if (message.includes(chinese)) {
      return english;
    }
  }
  
  // Check if message contains Chinese characters
  const containsChinese = /[\u4e00-\u9fa5]/.test(message);
  if (containsChinese) {
    return 'An error occurred. Please try again.';
  }
  
  // Return original message if it's already in English
  return message;
}
