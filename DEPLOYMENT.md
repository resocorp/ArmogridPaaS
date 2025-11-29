# ArmogridPaaS Deployment Guide

## 🚀 Quick Start

### 1. Install Dependencies
```bash
npm install
```

### 2. Environment Setup
Copy the example environment file and configure it:
```bash
cp .env.local.example .env.local
```

Update `.env.local` with your actual credentials:
- IoT platform admin credentials
- Supabase project URL and keys
- Paystack API keys

### 3. Database Setup
The database schema has been created in Supabase with these tables:
- `transactions` - Payment transaction records
- `webhook_logs` - Paystack webhook event logs  
- `meter_cache` - Cached meter information
- `user_sessions` - User authentication sessions

### 4. Run Development Server
```bash
npm run dev
```

Visit http://localhost:3000

## 📋 Features Implemented

### ✅ Phase 1-4 Complete (MVP Ready!)

**🏠 Landing Page**
- Modern responsive design with Armogrid branding
- Quick recharge form for any meter ID
- Paystack payment integration
- Success/failure payment pages

**🔐 Authentication System**
- User and admin login
- Session management with Supabase
- Protected routes and middleware
- Automatic token refresh handling

**💳 Payment Processing**
- Paystack inline payment integration
- Webhook verification and processing
- Automatic meter crediting via IoT API
- Transaction logging and status tracking

**📊 User Dashboard**
- Meter overview and statistics
- Real-time meter control (On/Off/Prepaid)
- Energy consumption analytics with charts
- Transaction history
- Responsive sidebar navigation

**👨‍💼 Admin Panel**
- Admin-only access control
- Basic dashboard with system overview
- Foundation for advanced admin features

## 🔧 API Endpoints

### Authentication
- `POST /api/auth/login` - User/Admin login
- `POST /api/auth/logout` - Logout
- `GET /api/auth/me` - Current user info

### Payment
- `POST /api/payment/initialize` - Start Paystack payment
- `GET /api/payment/verify/[ref]` - Verify payment status
- `POST /api/webhook/paystack` - Paystack webhook handler

### Meters
- `GET /api/meters` - User's meter list
- `GET /api/meters/[id]` - Meter details
- `POST /api/meters/[id]/control` - Control meter
- `GET /api/meters/[id]/energy` - Energy consumption data

### Transactions
- `GET /api/transactions` - Transaction history

## 🌐 Deployment Options

### Vercel (Recommended)
1. Push code to GitHub
2. Connect repository to Vercel
3. Set environment variables in Vercel dashboard
4. Deploy automatically

### Manual Server
1. Build the application: `npm run build`
2. Start production server: `npm start`
3. Configure reverse proxy (nginx/Apache)
4. Set up SSL certificate

## 🔒 Security Checklist

- [x] Environment variables secured
- [x] Webhook signature verification
- [x] Session-based authentication
- [x] Protected API routes
- [x] Input validation and sanitization
- [x] SQL injection prevention (Supabase)
- [x] XSS protection (React)

## 📱 Testing

### Test User Login
- Username: `uoziengbe@armogrid.com`
- Password: `uoziengbe@armogrid`
- Type: User (1)

### Test Admin Login  
- Username: `uoziengbe`
- Password: `uoziengbe@armogrid`
- Type: Admin (0)

### Test Recharge Flow
1. Visit homepage
2. Enter meter ID: `23` or `28`
3. Enter amount: `₦500`
4. Complete Paystack payment
5. Verify meter is credited

## 🐛 Troubleshooting

### Common Issues

**Payment not processing:**
- Check Paystack webhook URL is configured
- Verify webhook signature validation
- Check admin token is valid for IoT API

**Login failing:**
- Verify IoT platform credentials
- Check password is MD5 hashed correctly
- Ensure user exists on IoT platform

**Meter control not working:**
- Verify admin token has meter control permissions
- Check meter ID format (numbers only)
- Ensure IoT API is accessible

### Logs
- Check browser console for client errors
- Monitor server logs for API errors
- Review Supabase logs for database issues
- Check webhook_logs table for payment processing

## 🔄 Next Steps (Future Phases)

### Phase 5: Enhanced Analytics
- Advanced consumption forecasting
- Cost optimization recommendations
- Energy usage patterns analysis
- Export reports to PDF/Excel

### Phase 6: Advanced Admin Features
- Complete meter management interface
- User account management
- Bulk operations and imports
- System configuration panel

### Phase 7: Mobile App
- React Native mobile application
- Push notifications for low balance
- Offline meter reading capability
- QR code meter identification

### Phase 8: Enterprise Features
- Multi-tenant architecture
- White-label customization
- Advanced reporting and BI
- Integration with accounting systems

## 📞 Support

For technical support:
- Email: support@armogrid.com
- Documentation: Check README.md
- Issues: Create GitHub issue

---

**🎉 Congratulations! Your ArmogridPaaS MVP is ready for production use!**
