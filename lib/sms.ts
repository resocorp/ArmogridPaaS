import { supabaseAdmin } from './supabase';

// SMS notification types
export type SmsNotificationType = 
  | 'welcome'
  | 'low_credit'
  | 'account_credited'
  | 'meter_offline'
  | 'meter_online'
  | 'payment_success'
  | 'payment_failed'
  | 'custom';

export interface SmsConfig {
  serverUrl: string;
  username: string;
  password: string;
  goipProvider: string;
  goipLine: string;
  enabled: boolean;
}

export interface SmsLogEntry {
  id?: string;
  phone_number: string;
  message: string;
  notification_type: SmsNotificationType;
  status: 'pending' | 'sent' | 'failed';
  error?: string;
  response?: string;
  created_at?: string;
}

// Session cache for GoIP authentication
let sessionCookie: string | null = null;
let sessionExpiry: number = 0;
const SESSION_DURATION = 30 * 60 * 1000; // 30 minutes

/**
 * Get SMS configuration from admin settings
 */
export async function getSmsConfig(): Promise<SmsConfig> {
  const { data } = await supabaseAdmin
    .from('admin_settings')
    .select('key, value')
    .in('key', [
      'sms_server_url',
      'sms_username',
      'sms_password',
      'sms_goip_provider',
      'sms_goip_line',
      'sms_enabled',
    ]);

  const settings: Record<string, string> = {};
  data?.forEach((s: any) => {
    settings[s.key] = s.value;
  });

  return {
    serverUrl: settings.sms_server_url || '',
    username: settings.sms_username || '',
    password: settings.sms_password || '',
    goipProvider: settings.sms_goip_provider || '',
    goipLine: settings.sms_goip_line || '',
    enabled: settings.sms_enabled === 'true',
  };
}

/**
 * Login to GoIP server and get session cookie
 */
async function goipLogin(config: SmsConfig): Promise<string | null> {
  // Check if we have a valid cached session
  if (sessionCookie && Date.now() < sessionExpiry) {
    console.log('[SMS] Using cached session');
    return sessionCookie;
  }

  try {
    // Extract base URL (without /index.php part)
    const baseUrl = config.serverUrl.replace(/\/index\.php.*$/, '');
    const loginUrl = `${baseUrl}/dologin.php`;
    
    console.log(`[SMS] Logging in to GoIP server: ${loginUrl}`);
    
    const formData = new URLSearchParams();
    formData.append('username', config.username);
    formData.append('password', config.password);
    formData.append('lan', '3'); // English language
    
    const response = await fetch(loginUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: formData.toString(),
      redirect: 'manual', // Don't follow redirects, we need the cookies
    });

    // Get cookies from response
    const setCookie = response.headers.get('set-cookie');
    console.log(`[SMS] Login response status: ${response.status}`);
    console.log(`[SMS] Set-Cookie header: ${setCookie}`);
    
    if (setCookie) {
      // Extract PHPSESSID or similar session cookie
      const cookieMatch = setCookie.match(/PHPSESSID=([^;]+)/i) || 
                          setCookie.match(/([^=]+=[^;]+)/);
      if (cookieMatch) {
        sessionCookie = cookieMatch[0];
        sessionExpiry = Date.now() + SESSION_DURATION;
        console.log(`[SMS] ✅ Login successful, session: ${sessionCookie}`);
        return sessionCookie;
      }
    }

    // If no cookie in header, check if login was successful by response
    const responseText = await response.text();
    console.log(`[SMS] Login response body (first 200 chars): ${responseText.substring(0, 200)}`);
    
    // Check if we got redirected to admin panel (success) or back to login (fail)
    if (responseText.includes('SMS') && !responseText.includes('Administrator Logon')) {
      console.log('[SMS] Login appears successful based on response');
      return 'session-assumed';
    }

    console.log('[SMS] ❌ Login failed - no session cookie received');
    return null;
  } catch (error) {
    console.error('[SMS] ❌ Login error:', error);
    return null;
  }
}

/**
 * Format phone number for SMS (Nigerian format)
 */
export function formatPhoneNumber(phone: string): string {
  // Remove spaces, dashes, and other characters
  let cleaned = phone.replace(/[\s\-\(\)]/g, '');
  
  // Handle Nigerian numbers
  if (cleaned.startsWith('0')) {
    cleaned = '+234' + cleaned.substring(1);
  } else if (cleaned.startsWith('234') && !cleaned.startsWith('+')) {
    cleaned = '+' + cleaned;
  } else if (!cleaned.startsWith('+')) {
    cleaned = '+234' + cleaned;
  }
  
  return cleaned;
}

/**
 * Log SMS attempt to database
 */
async function logSms(entry: SmsLogEntry): Promise<void> {
  try {
    await supabaseAdmin.from('sms_logs').insert({
      phone_number: entry.phone_number,
      message: entry.message,
      notification_type: entry.notification_type,
      status: entry.status,
      error: entry.error || null,
      response: entry.response || null,
    });
  } catch (error) {
    console.error('[SMS] Failed to log SMS:', error);
  }
}

/**
 * Send SMS via GoIP SMS Server with session-based authentication
 * Steps: 1) Login to get session 2) Send SMS using session
 */
export async function sendSms(
  phoneNumber: string,
  message: string,
  notificationType: SmsNotificationType = 'custom'
): Promise<{ success: boolean; error?: string; messageId?: string }> {
  try {
    const config = await getSmsConfig();

    if (!config.enabled) {
      console.log('[SMS] SMS notifications are disabled');
      return { success: false, error: 'SMS notifications disabled' };
    }

    if (!config.serverUrl || !config.username || !config.password) {
      console.log('[SMS] SMS not configured properly');
      return { success: false, error: 'SMS not configured' };
    }

    const formattedPhone = formatPhoneNumber(phoneNumber);
    
    // First, try the JSON API (GoIP v1.27+ documented method)
    console.log(`[SMS] Attempting JSON API send to ${formattedPhone}`);
    const jsonResult = await sendSmsViaJsonApi(config, formattedPhone, message);
    
    if (jsonResult.success) {
      await logSms({
        phone_number: formattedPhone,
        message,
        notification_type: notificationType,
        status: 'sent',
        response: jsonResult.response,
      });
      console.log(`[SMS] ✅ Message sent via JSON API to ${formattedPhone}`);
      return { success: true, messageId: jsonResult.response };
    }
    
    // If JSON API failed, try legacy HTTP API as fallback
    console.log(`[SMS] JSON API failed (${jsonResult.error}), trying legacy HTTP API`);
    const apiResult = await sendSmsViaHttpApi(config, formattedPhone, message);
    
    if (apiResult.success) {
      await logSms({
        phone_number: formattedPhone,
        message,
        notification_type: notificationType,
        status: 'sent',
        response: apiResult.response,
      });
      console.log(`[SMS] ✅ Message sent via HTTP API to ${formattedPhone}`);
      return { success: true, messageId: apiResult.response };
    }
    
    // Log final failure
    const sessionResult = jsonResult; // Use JSON API result for final error
    
    await logSms({
      phone_number: formattedPhone,
      message,
      notification_type: notificationType,
      status: sessionResult.success ? 'sent' : 'failed',
      response: sessionResult.response,
      error: sessionResult.success ? undefined : sessionResult.error,
    });

    if (sessionResult.success) {
      console.log(`[SMS] ✅ Message sent via session to ${formattedPhone}`);
      return { success: true, messageId: sessionResult.response };
    } else {
      console.log(`[SMS] ❌ Failed to send to ${formattedPhone}: ${sessionResult.error}`);
      return { success: false, error: sessionResult.error };
    }
  } catch (error: any) {
    console.error(`[SMS] ❌ Error sending SMS:`, error);
    
    await logSms({
      phone_number: phoneNumber,
      message,
      notification_type: notificationType,
      status: 'failed',
      error: error.message,
    });
    
    return { success: false, error: error.message };
  }
}

/**
 * Send SMS via GoIP HTTP API (direct URL with parameters)
 */
async function sendSmsViaHttpApi(
  config: SmsConfig,
  phone: string,
  message: string
): Promise<{ success: boolean; response?: string; error?: string }> {
  try {
    // Try common GoIP HTTP API formats
    const baseUrl = config.serverUrl.replace(/\/index\.php.*$/, '').replace(/\/$/, '');
    
    // Format 1: /send.html with query params
    const params = new URLSearchParams({
      u: config.username,
      p: config.password,
      l: config.goipLine,
      n: phone.replace('+', ''), // Some APIs don't like the +
      m: message,
    });
    
    const url1 = `${baseUrl}/send.html?${params.toString()}`;
    console.log(`[SMS] Trying API URL: ${url1}`);
    
    let response = await fetch(url1, { method: 'GET' });
    let responseText = await response.text();
    
    // Check for success
    if (response.ok && !responseText.includes('Administrator Logon') && 
        (responseText.toLowerCase().includes('sending') || 
         responseText.toLowerCase().includes('success') ||
         responseText.includes('Sending'))) {
      return { success: true, response: responseText };
    }
    
    // Format 2: /sms_send.php with POST
    const url2 = `${baseUrl}/sms_send.php`;
    console.log(`[SMS] Trying API URL: ${url2}`);
    
    const formData = new URLSearchParams();
    formData.append('u', config.username);
    formData.append('p', config.password);
    formData.append('l', config.goipLine);
    formData.append('n', phone.replace('+', ''));
    formData.append('m', message);
    
    response = await fetch(url2, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: formData.toString(),
    });
    responseText = await response.text();
    
    if (response.ok && !responseText.includes('Administrator Logon') &&
        (responseText.toLowerCase().includes('sending') || 
         responseText.toLowerCase().includes('success'))) {
      return { success: true, response: responseText };
    }
    
    // Format 3: API with authentication header
    const url3 = `${baseUrl}/api/send`;
    console.log(`[SMS] Trying API URL: ${url3}`);
    
    const authHeader = 'Basic ' + Buffer.from(`${config.username}:${config.password}`).toString('base64');
    
    response = await fetch(url3, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': authHeader,
      },
      body: JSON.stringify({
        line: config.goipLine,
        phone: phone,
        message: message,
      }),
    });
    responseText = await response.text();
    
    if (response.ok && !responseText.includes('Administrator Logon')) {
      try {
        const json = JSON.parse(responseText);
        if (json.success || json.status === 'ok' || json.sent) {
          return { success: true, response: responseText };
        }
      } catch {
        // Not JSON, check for text indicators
        if (responseText.toLowerCase().includes('success') || 
            responseText.toLowerCase().includes('sending')) {
          return { success: true, response: responseText };
        }
      }
    }
    
    return { success: false, error: 'HTTP API methods failed' };
  } catch (error: any) {
    console.error('[SMS] HTTP API error:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Send SMS via GoIP JSON API (v1.27+)
 * Endpoint: POST http://<IP>/goip/sendsms/
 * Uses JSON body with auth, provider, goip_line, number, content
 */
async function sendSmsViaJsonApi(
  config: SmsConfig,
  phone: string,
  message: string
): Promise<{ success: boolean; response?: string; error?: string }> {
  try {
    // Extract base URL (remove /en/index.php or similar paths)
    let baseUrl = config.serverUrl;
    // Remove paths like /en/index.php, /goip/en/index.php etc to get just http://IP
    baseUrl = baseUrl.replace(/\/goip\/.*$/, '').replace(/\/en\/.*$/, '').replace(/\/index\.php.*$/, '').replace(/\/$/, '');
    
    // GoIP JSON API endpoint - must end with /
    const sendUrl = `${baseUrl}/goip/sendsms/`;
    console.log(`[SMS] Sending via GoIP JSON API: ${sendUrl}`);
    
    // Clean phone number - remove + prefix
    const cleanPhone = phone.replace(/^\+/, '');
    
    // Build JSON request body per API docs
    const requestBody = {
      auth: {
        username: config.username,
        password: config.password,
      },
      provider: config.goipProvider, // e.g. "phsweb"
      goip_line: config.goipLine,    // e.g. "goip-10102"
      number: cleanPhone,
      content: message,
    };
    
    console.log(`[SMS] Request body:`, JSON.stringify({
      ...requestBody,
      auth: { username: config.username, password: '***' }
    }));
    
    const response = await fetch(sendUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody),
    });
    
    const responseText = await response.text();
    console.log(`[SMS] JSON API response: ${responseText}`);
    
    // Parse JSON response
    try {
      const result = JSON.parse(responseText);
      
      // Check for ACCEPT response
      if (result.result === 'ACCEPT' && result.taskID) {
        console.log(`[SMS] ✅ SMS accepted with taskID: ${result.taskID}`);
        return { success: true, response: `SMS accepted, taskID: ${result.taskID}` };
      }
      
      // Check for REJECT response
      if (result.result === 'REJECT') {
        const reason = result.reason || 'unknown';
        console.log(`[SMS] ❌ SMS rejected: ${reason}`);
        return { success: false, error: `SMS rejected: ${reason}` };
      }
      
      // Unknown response format
      return { success: false, error: `Unexpected response: ${responseText}` };
    } catch (parseError) {
      // Response is not JSON - might be HTML error page
      if (responseText.includes('401') || responseText.includes('Unauthorized')) {
        return { success: false, error: 'Authentication failed (401)' };
      }
      if (responseText.includes('404')) {
        return { success: false, error: 'API endpoint not found (404) - server may not support JSON API' };
      }
      return { success: false, error: `Invalid response: ${responseText.substring(0, 200)}` };
    }
  } catch (error: any) {
    console.error('[SMS] JSON API error:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Send SMS using alternative GET method (fallback)
 * Some GoIP servers use GET requests
 */
export async function sendSmsGet(
  phoneNumber: string,
  message: string,
  notificationType: SmsNotificationType = 'custom'
): Promise<{ success: boolean; error?: string }> {
  try {
    const config = await getSmsConfig();

    if (!config.enabled) {
      return { success: false, error: 'SMS notifications disabled' };
    }

    const formattedPhone = formatPhoneNumber(phoneNumber);
    
    // Build GET URL with query parameters
    const params = new URLSearchParams({
      u: config.username,
      p: config.password,
      l: config.goipLine,
      n: formattedPhone,
      m: message,
    });
    
    const apiUrl = `${config.serverUrl.replace(/\/$/, '')}/send.html?${params.toString()}`;
    
    console.log(`[SMS] GET request to send SMS to ${formattedPhone}`);
    
    const response = await fetch(apiUrl, { method: 'GET' });
    const responseText = await response.text();

    const isSuccess = 
      response.ok && 
      (responseText.toLowerCase().includes('sending') || 
       responseText.toLowerCase().includes('success'));

    await logSms({
      phone_number: formattedPhone,
      message,
      notification_type: notificationType,
      status: isSuccess ? 'sent' : 'failed',
      response: responseText,
      error: isSuccess ? undefined : responseText,
    });

    return { success: isSuccess, error: isSuccess ? undefined : responseText };
  } catch (error: any) {
    console.error(`[SMS] ❌ Error sending SMS (GET):`, error);
    return { success: false, error: error.message };
  }
}

// =============================================================================
// NOTIFICATION TEMPLATES
// =============================================================================

export interface CustomerNotificationData {
  name: string;
  phone: string;
  roomNumber?: string;
  locationName?: string;
  amount?: number;
  balance?: number;
  reference?: string;
  meterId?: string;
}

/**
 * Send welcome SMS to new customer
 */
export async function sendWelcomeSms(data: CustomerNotificationData): Promise<boolean> {
  const message = `Welcome to ArmogridSolar, ${data.name}! Your meter ID is ${data.meterId}. To recharge, visit https://armogridsolar.vercel.app/ and use Quick Recharge with your meter ID. Thank you for choosing us!`;
  
  const result = await sendSms(data.phone, message, 'welcome');
  return result.success;
}

/**
 * Send low credit warning SMS
 */
export async function sendLowCreditSms(data: CustomerNotificationData): Promise<boolean> {
  const balance = data.balance?.toLocaleString() || '0';
  const message = `Dear ${data.name}, your meter balance is low (₦${balance}). Please recharge soon to avoid power disconnection. Meter: ${data.meterId}. Recharge at armogridsolar.vercel.app`;
  
  const result = await sendSms(data.phone, message, 'low_credit');
  return result.success;
}

/**
 * Send account credited SMS
 */
export async function sendAccountCreditedSms(data: CustomerNotificationData): Promise<boolean> {
  const amount = data.amount?.toLocaleString() || '0';
  const balance = data.balance?.toLocaleString() || '0';
  const message = `ArmogridSolar: Your account has been credited with ₦${amount}. New balance: ₦${balance}. Reference: ${data.reference || 'N/A'}. Thank you!`;
  
  const result = await sendSms(data.phone, message, 'account_credited');
  return result.success;
}

/**
 * Send payment success SMS
 */
export async function sendPaymentSuccessSms(data: CustomerNotificationData): Promise<boolean> {
  const amount = data.amount?.toLocaleString() || '0';
  const message = `Payment Successful! ₦${amount} received for meter ${data.meterId || data.roomNumber || 'N/A'}. Ref: ${data.reference || 'N/A'}. ArmogridSolar`;
  
  const result = await sendSms(data.phone, message, 'payment_success');
  return result.success;
}

/**
 * Send payment failed SMS
 */
export async function sendPaymentFailedSms(data: CustomerNotificationData): Promise<boolean> {
  const amount = data.amount?.toLocaleString() || '0';
  const message = `Payment of ₦${amount} failed for meter ${data.meterId || data.roomNumber || 'N/A'}. Please try again. Ref: ${data.reference || 'N/A'}. ArmogridSolar`;
  
  const result = await sendSms(data.phone, message, 'payment_failed');
  return result.success;
}

// =============================================================================
// ADMIN NOTIFICATIONS
// =============================================================================

export interface AdminAlertData {
  meterId?: string;
  roomNumber?: string;
  projectName?: string;
  meterCount?: number;
  details?: string;
}

/**
 * Get admin phone numbers for alerts
 */
async function getAdminPhones(): Promise<string[]> {
  const { data } = await supabaseAdmin
    .from('admin_settings')
    .select('key, value')
    .in('key', ['admin_phone', 'admin_phone_2', 'admin_phone_3']);

  const phones: string[] = [];
  data?.forEach((s: any) => {
    if (s.value && s.value.trim()) {
      phones.push(s.value.trim());
    }
  });

  return phones;
}

/**
 * Send meter offline alert to admin
 */
export async function sendMeterOfflineAlert(data: AdminAlertData): Promise<boolean> {
  const adminPhones = await getAdminPhones();
  
  if (adminPhones.length === 0) {
    console.log('[SMS] No admin phones configured for alerts');
    return false;
  }

  const message = `⚠️ METER OFFLINE ALERT\nMeter: ${data.meterId || 'Unknown'}\nRoom: ${data.roomNumber || 'N/A'}\nProject: ${data.projectName || 'N/A'}\n${data.details || ''}`.trim();
  
  let allSent = true;
  for (const phone of adminPhones) {
    const result = await sendSms(phone, message, 'meter_offline');
    if (!result.success) allSent = false;
  }
  
  return allSent;
}

/**
 * Send meter online alert to admin
 */
export async function sendMeterOnlineAlert(data: AdminAlertData): Promise<boolean> {
  const adminPhones = await getAdminPhones();
  
  if (adminPhones.length === 0) {
    return false;
  }

  const message = `✅ METER ONLINE\nMeter: ${data.meterId || 'Unknown'}\nRoom: ${data.roomNumber || 'N/A'}\nProject: ${data.projectName || 'N/A'}\nMeter is back online.`;
  
  let allSent = true;
  for (const phone of adminPhones) {
    const result = await sendSms(phone, message, 'meter_online');
    if (!result.success) allSent = false;
  }
  
  return allSent;
}

/**
 * Send bulk offline alert (multiple meters)
 */
export async function sendBulkOfflineAlert(meterCount: number, projectName?: string): Promise<boolean> {
  const adminPhones = await getAdminPhones();
  
  if (adminPhones.length === 0) {
    return false;
  }

  const message = `⚠️ BULK OFFLINE ALERT\n${meterCount} meters are offline${projectName ? ` in ${projectName}` : ''}. Please check the admin dashboard for details.`;
  
  let allSent = true;
  for (const phone of adminPhones) {
    const result = await sendSms(phone, message, 'meter_offline');
    if (!result.success) allSent = false;
  }
  
  return allSent;
}

/**
 * Test SMS configuration by sending a test message
 */
export async function testSmsConfig(phoneNumber: string): Promise<{ success: boolean; error?: string; response?: string }> {
  try {
    const config = await getSmsConfig();
    
    if (!config.serverUrl || !config.username || !config.password) {
      return { success: false, error: 'SMS configuration is incomplete' };
    }

    const message = `ArmogridSolar SMS Test: Your SMS notification system is working correctly! Time: ${new Date().toLocaleString()}`;
    
    const result = await sendSms(phoneNumber, message, 'custom');
    
    return {
      success: result.success,
      error: result.error,
      response: result.messageId,
    };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}
