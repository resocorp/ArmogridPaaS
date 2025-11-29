# Paystack Webhook Setup Guide

## 🎯 Overview

After a successful payment, Paystack needs to notify your application to credit the meter. This is done through webhooks.

## 📋 Current Status

✅ **Webhook handler is implemented** at `/api/webhook/paystack`
✅ **Signature verification is enabled** for security
✅ **Automatic meter crediting** via IoT API
✅ **Transaction logging** in database

## 🚀 Setup Instructions

### Option 1: Production Deployment (Recommended)

1. **Deploy your application** to a public server (Vercel, AWS, etc.)

2. **Get your webhook URL:**
   ```
   https://your-domain.com/api/webhook/paystack
   ```

3. **Configure Paystack webhook:**
   - Go to [Paystack Dashboard](https://dashboard.paystack.com)
   - Navigate to **Settings** → **Webhooks**
   - Click **Add Webhook URL**
   - Enter your webhook URL: `https://your-domain.com/api/webhook/paystack`
   - Save the configuration

4. **Test the webhook:**
   - Make a test payment
   - Check the terminal/logs for webhook processing
   - Verify meter is credited

### Option 2: Local Development (Using ngrok)

For testing webhooks locally, you need to expose your local server to the internet:

1. **Install ngrok:**
   ```bash
   # Download from https://ngrok.com/download
   # Or use npm
   npm install -g ngrok
   ```

2. **Start your development server:**
   ```bash
   npm run dev
   ```

3. **Start ngrok tunnel:**
   ```bash
   ngrok http 3000
   ```

4. **Copy the ngrok URL:**
   ```
   Forwarding: https://xxxx-xx-xx-xx-xx.ngrok-free.app -> http://localhost:3000
   ```

5. **Configure Paystack webhook:**
   - Use the ngrok URL: `https://xxxx-xx-xx-xx-xx.ngrok-free.app/api/webhook/paystack`
   - ⚠️ **Note:** ngrok URLs change each time you restart, so you'll need to update Paystack

6. **Test the payment flow:**
   - Make a payment
   - Watch the terminal for webhook logs
   - Verify meter crediting

## 🔍 Monitoring Webhooks

### Check Terminal Logs

After a successful payment, you should see:

```
[Webhook] ===== Received Paystack webhook =====
[Webhook] Event type: charge.success
[Webhook] Reference: AG_1764419300794_5URJXSX
[Webhook] Processing charge.success for meterId: 28
[Webhook] Payment successful, crediting meter...
[Auth] Getting admin token...
[Auth] Successfully obtained admin token (new format)
[Webhook] Calling salePower API...
[IoT Client] Selling power to meter 28, amount: 100000, buyType: 3
[IoT Client] Response data: {"success":"1","errorCode":"","errorMsg":"","data":null}
[Webhook] Meter credited successfully, updating database...
[Webhook] Successfully credited meter 28 with ₦1000
[Webhook] ===== Webhook processing completed =====
```

### Check Database

Query the `webhook_logs` table in Supabase:

```sql
SELECT * FROM webhook_logs 
ORDER BY created_at DESC 
LIMIT 10;
```

Check the `transactions` table:

```sql
SELECT * FROM transactions 
WHERE paystack_status = 'success' 
ORDER BY created_at DESC 
LIMIT 10;
```

## 🐛 Troubleshooting

### Issue: Webhook not receiving events

**Possible causes:**
1. Webhook URL not configured in Paystack
2. URL is not publicly accessible
3. Firewall blocking incoming requests

**Solution:**
- Verify webhook URL in Paystack dashboard
- Test URL accessibility: `curl https://your-domain.com/api/webhook/paystack`
- Check server firewall rules

### Issue: Webhook signature verification fails

**Logs show:**
```
[Webhook] Invalid signature
```

**Solution:**
- Ensure `PAYSTACK_SECRET_KEY` in `.env.local` matches your Paystack account
- Verify the secret key is for the correct environment (test/live)

### Issue: Meter not credited after payment

**Logs show:**
```
[Webhook] SalePower failed: <error message>
```

**Possible causes:**
1. Admin token expired or invalid
2. Meter ID doesn't exist
3. IoT API is down

**Solution:**
- Check admin credentials in `.env.local`
- Verify meter ID exists in IoT platform
- Test IoT API directly with Postman

### Issue: Payment successful but webhook not triggered

**This happens when:**
- Webhook URL is not configured in Paystack
- Payment was made before webhook was set up

**Solution:**
1. Configure webhook URL in Paystack
2. For existing payments, you can manually trigger crediting:
   - Go to Supabase `transactions` table
   - Find the transaction with `paystack_status = 'success'` but no `sale_id`
   - Note the `paystack_reference`
   - Manually call the webhook endpoint (for testing only)

## 🔐 Security Notes

1. **Webhook signature verification** is enabled by default
   - All webhook requests are verified using HMAC SHA512
   - Invalid signatures are rejected with 401 status

2. **Environment variables** must be secured
   - Never commit `.env.local` to version control
   - Use environment-specific secrets in production

3. **Idempotency** is implemented
   - Duplicate webhook events are ignored
   - Transactions are only credited once

## 📊 Webhook Event Flow

```
1. User completes payment on Paystack
   ↓
2. Paystack sends webhook to your server
   ↓
3. Webhook handler verifies signature
   ↓
4. Handler checks if event is 'charge.success'
   ↓
5. Handler retrieves transaction from database
   ↓
6. Handler gets admin token from IoT platform
   ↓
7. Handler calls SalePower API to credit meter
   ↓
8. Handler updates transaction status in database
   ↓
9. User's meter is credited ✅
```

## 🧪 Testing Checklist

- [ ] Webhook URL is publicly accessible
- [ ] Webhook URL is configured in Paystack dashboard
- [ ] `PAYSTACK_SECRET_KEY` is correct in `.env.local`
- [ ] Admin credentials are valid
- [ ] Test payment completes successfully
- [ ] Webhook logs show successful processing
- [ ] Meter balance increases after payment
- [ ] Transaction status updates to 'success'
- [ ] `sale_id` is populated in transactions table

## 📞 Need Help?

If you're still having issues:

1. **Check the logs** - Most issues are visible in the terminal output
2. **Review webhook_logs table** - See what Paystack is sending
3. **Test with Postman** - Verify IoT API is working
4. **Check Paystack dashboard** - See webhook delivery status

---

**🎉 Once webhooks are configured, your payment flow will be fully automated!**
