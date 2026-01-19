# Troubleshooting Guide

## Recharge Error Debugging

### Changes Made

Comprehensive logging has been added to all recharge-related endpoints to help troubleshoot issues:

#### 1. **Authentication Module** (`lib/auth.ts`)
- Logs admin token retrieval process
- Shows whether token comes from environment, session, or fresh login
- Logs login attempts with username and response codes

#### 2. **IoT Client** (`lib/iot-client.ts`)
- Logs all API requests (method, URL, body)
- Logs all API responses (status, data)
- Specific logging for `getMeterInfoById` and `salePower` operations

#### 3. **Payment Initialization** (`app/api/payment/initialize/route.ts`)
- Logs request body with meterId, amount, email
- Logs each validation step
- Logs meter verification process with detailed response
- Logs database operations
- Logs Paystack initialization

#### 4. **Webhook Handler** (`app/api/webhook/paystack/route.ts`)
- Logs webhook receipt and signature verification
- Logs transaction lookup and processing
- Logs meter crediting via IoT platform
- Logs database updates

### Log Format

All logs are prefixed with their source:
- `[Auth]` - Authentication operations
- `[IoT Client]` - IoT platform API calls
- `[Payment Init]` - Payment initialization
- `[Webhook]` - Webhook processing

### How to View Logs

**Development Mode:**
```bash
npm run dev
```
Logs will appear in the terminal where the dev server is running.

**Production Mode:**
Check your hosting platform's logs (Vercel, AWS, etc.)

### Common Issues and Solutions

#### Issue 1: "Meter not found or unavailable"

**Possible Causes:**
1. Invalid meter ID format
2. Meter doesn't exist in IoT platform
3. Admin token authentication failed
4. IoT API is down or unreachable

**What to Check in Logs:**
```
[Payment Init] Verifying meter exists...
[Auth] Getting admin token...
[IoT Client] Getting meter info for meterId: XX
[IoT Client] POST https://iot.solarshare.africa/basic/prepayment/app/MeterInfo
[IoT Client] Response data: {...}
```

Look for:
- The admin token retrieval process
- The meter info API response code (should be 200 or 0)
- Any error messages in the response

#### Issue 2: Payment Successful but Meter Not Credited

**What to Check in Logs:**
```
[Webhook] Processing charge.success for meterId: XX
[Webhook] Calling salePower API...
[IoT Client] Selling power to meter XX, amount: XXXX
[IoT Client] Sale power response code: XXX
```

Look for:
- Whether webhook was received
- The salePower API response code (should be 200 or 0)
- Any error messages

#### Issue 3: Admin Token Issues

**What to Check:**
1. Environment variables are set correctly:
   - `IOT_ADMIN_USERNAME`
   - `IOT_ADMIN_PASSWORD`

2. Logs will show:
```
[Auth] No cached token found, logging in as admin...
[Auth] Logging in with username: XXXX
[Auth] Login response code: XXX
```

### Testing the Recharge Flow

1. **Start the development server:**
   ```bash
   npm run dev
   ```

2. **Attempt a recharge** through the UI or API

3. **Monitor the terminal** for log output

4. **Check the logs** for any errors or unexpected responses

### API Testing with Postman

Based on your Postman tests, the correct flow is:

1. **Get Admin Token:**
   ```
   POST https://iot.solarshare.africa/basic/prepayment/app/appUserLogin
   Headers:
     Content-Type: application/json
     token: <admin_token>
   Body:
   {
     "meterId": "28",
     "saleMoney": 100000,
     "buyType": 3,
     "saleId": "7302803203I"
   }
   ```

2. **Sale Power:**
   ```
   POST https://iot.solarshare.africa/basic/prepayment/app/SalePower
   Headers:
     Content-Type: application/json
     token: <admin_token>
   Body:
   {
     "meterId": "28",
     "saleMoney": 100000,
     "buyType": 3,
     "saleId": "7302803203I"
   }
   ```

### Key Points from Postman Tests

- The `saleMoney` should be in **kobo** (100000 = ₦1000)
- The `buyType` should be `3` for Paystack payments
- The admin token must be obtained first and included in the header
- The response will have `success: "1"` and `errorCode: ""` on success

### Next Steps

1. Run the application in development mode
2. Attempt a recharge
3. Review the console logs to identify the exact point of failure
4. Share the relevant log output for further assistance

### Environment Variables Checklist

Ensure these are set in your `.env.local`:

```env
# IoT Platform
IOT_BASE_URL=https://iot.solarshare.africa
IOT_ADMIN_USERNAME=admin
IOT_ADMIN_PASSWORD=MQptQ8JT_V:KeLr
# Set to 0 to bypass SSL verification (for expired certificates - TEMPORARY)
NODE_TLS_REJECT_UNAUTHORIZED=0

# Supabase
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key

# Paystack
NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY=your_public_key
PAYSTACK_SECRET_KEY=your_secret_key

# App
NEXT_PUBLIC_APP_URL=http://localhost:3000
NEXT_PUBLIC_APP_NAME=ArmogridSolar
```

### SSL Certificate Issues

If the IoT platform's SSL certificate is expired, you'll see errors like:
```
TypeError: fetch failed
```

**Workaround (Temporary):**
The code now automatically bypasses SSL verification for server-side requests. Additionally, you can set:
```env
NODE_TLS_REJECT_UNAUTHORIZED=0
```

⚠️ **Security Warning**: This should only be used temporarily until the SSL certificate is renewed. Do not use in production with real user data.
