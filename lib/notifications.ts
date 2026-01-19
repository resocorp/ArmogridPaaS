import { supabaseAdmin } from './supabase';

interface NotificationData {
  name: string;
  email: string;
  phone: string;
  roomNumber: string;
  locationName: string;
  amountPaid: number;
  reference: string;
}

/**
 * Get admin settings for notifications
 */
async function getNotificationSettings() {
  const { data } = await supabaseAdmin
    .from('admin_settings')
    .select('key, value')
    .in('key', ['admin_email', 'admin_whatsapp', 'ultramsg_instance_id', 'ultramsg_token']);

  const settings: Record<string, string> = {};
  data?.forEach((s: any) => {
    settings[s.key] = s.value;
  });

  return settings;
}

/**
 * Send email notification to admin about new registration
 */
export async function sendEmailNotification(data: NotificationData): Promise<boolean> {
  try {
    const settings = await getNotificationSettings();
    const adminEmail = settings.admin_email;

    if (!adminEmail) {
      console.log('[Notification] No admin email configured, skipping email notification');
      return false;
    }

    // For now, we'll use a simple fetch to a mail service
    // You can integrate with SendGrid, Resend, or any other email provider
    console.log('[Notification] Would send email to:', adminEmail);
    console.log('[Notification] Email content:', {
      subject: `New Customer Registration - ${data.name}`,
      body: `
        New customer registration received:
        
        Name: ${data.name}
        Email: ${data.email}
        Phone: ${data.phone}
        Room Number: ${data.roomNumber}
        Location: ${data.locationName}
        Amount Paid: ₦${data.amountPaid.toLocaleString()}
        Reference: ${data.reference}
      `,
    });

    // TODO: Implement actual email sending
    // Example with Resend:
    // const resend = new Resend(process.env.RESEND_API_KEY);
    // await resend.emails.send({
    //   from: 'ArmogridSolar <noreply@armogrid.com>',
    //   to: adminEmail,
    //   subject: `New Customer Registration - ${data.name}`,
    //   html: `...`,
    // });

    return true;
  } catch (error) {
    console.error('[Notification] Email notification error:', error);
    return false;
  }
}

/**
 * Send WhatsApp notification via UltraMsg to a specific number
 */
async function sendUltraMsgMessage(
  instanceId: string,
  token: string,
  toNumber: string,
  message: string
): Promise<boolean> {
  try {
    const url = `https://api.ultramsg.com/${instanceId}/messages/chat`;
    
    // UltraMsg requires application/x-www-form-urlencoded format
    const params = new URLSearchParams();
    params.append('token', token);
    params.append('to', toNumber);
    params.append('body', message);
    params.append('priority', '1');
    
    console.log(`[UltraMsg] Sending to ${toNumber}...`);
    console.log(`[UltraMsg] URL: ${url}`);
    
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: params.toString(),
    });

    const result = await response.json();
    console.log(`[UltraMsg] Response for ${toNumber}:`, JSON.stringify(result));

    // Check various success indicators
    if (result.sent === 'true' || result.sent === true || result.id) {
      console.log(`[UltraMsg] ✅ Message sent successfully to ${toNumber}`);
      return true;
    } else {
      console.log(`[UltraMsg] ❌ Failed to send to ${toNumber}:`, result.error || result);
      return false;
    }
  } catch (error) {
    console.error(`[UltraMsg] ❌ Error sending to ${toNumber}:`, error);
    return false;
  }
}

/**
 * Send WhatsApp notification via UltraMsg to admin
 */
export async function sendWhatsAppNotification(data: NotificationData): Promise<boolean> {
  try {
    const settings = await getNotificationSettings();
    const adminWhatsApp = settings.admin_whatsapp;
    const instanceId = settings.ultramsg_instance_id;
    const token = settings.ultramsg_token;

    if (!adminWhatsApp || !instanceId || !token) {
      console.log('[Notification] UltraMsg not configured, skipping WhatsApp notification');
      return false;
    }

    const adminMessage = `🆕 *New Customer Registration*

*Name:* ${data.name}
*Email:* ${data.email}
*Phone:* ${data.phone}
*Room Number:* ${data.roomNumber}
*Location:* ${data.locationName}
*Amount Paid:* ₦${data.amountPaid.toLocaleString()}
*Reference:* ${data.reference}

_Sent from ArmogridSolar_`;

    const adminSent = await sendUltraMsgMessage(instanceId, token, adminWhatsApp, adminMessage);
    console.log('[Notification] Admin WhatsApp notification:', adminSent ? 'sent' : 'failed');
    return adminSent;
  } catch (error) {
    console.error('[Notification] WhatsApp notification error:', error);
    return false;
  }
}

/**
 * Send WhatsApp confirmation to customer
 */
export async function sendCustomerWhatsAppNotification(data: NotificationData): Promise<boolean> {
  try {
    const settings = await getNotificationSettings();
    const instanceId = settings.ultramsg_instance_id;
    const token = settings.ultramsg_token;

    if (!instanceId || !token) {
      console.log('[Notification] UltraMsg not configured, skipping customer WhatsApp');
      return false;
    }

    // Format customer phone number (ensure it has country code)
    let customerPhone = data.phone.replace(/\s+/g, '').replace(/-/g, '');
    if (customerPhone.startsWith('0')) {
      customerPhone = '+234' + customerPhone.substring(1);
    } else if (!customerPhone.startsWith('+')) {
      customerPhone = '+234' + customerPhone;
    }

    const customerMessage = `✅ *Registration Successful!*

Hello ${data.name},

Thank you for registering with ArmogridSolar!

*Your Details:*
• Room: ${data.roomNumber}
• Location: ${data.locationName}
• Amount Paid: ₦${data.amountPaid.toLocaleString()}
• Reference: ${data.reference}

*What's Next?*
Our team will contact you within 24-48 hours to schedule your meter installation.

For questions, contact us:
📞 +2347035090096

_Thank you for choosing ArmogridSolar!_`;

    const customerSent = await sendUltraMsgMessage(instanceId, token, customerPhone, customerMessage);
    console.log('[Notification] Customer WhatsApp notification:', customerSent ? 'sent' : 'failed');
    return customerSent;
  } catch (error) {
    console.error('[Notification] Customer WhatsApp error:', error);
    return false;
  }
}

/**
 * Send all notifications for a new registration (to both admin and customer)
 */
export async function notifyAdminOfRegistration(data: NotificationData): Promise<{
  email: boolean;
  whatsapp: boolean;
  customerWhatsapp: boolean;
}> {
  const [emailSent, adminWhatsappSent, customerWhatsappSent] = await Promise.all([
    sendEmailNotification(data),
    sendWhatsAppNotification(data),
    sendCustomerWhatsAppNotification(data),
  ]);

  return {
    email: emailSent,
    whatsapp: adminWhatsappSent,
    customerWhatsapp: customerWhatsappSent,
  };
}
