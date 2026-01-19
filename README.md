# ArmogridSolar - IoT Meter Management Platform

A modern Next.js application for managing IoT prepaid electricity meters with integrated Paystack payment processing.

## Features

- 🔌 **Quick Recharge**: Public landing page for instant meter top-ups
- 📊 **Analytics Dashboard**: Real-time energy consumption insights
- 🎛️ **Meter Control**: Remote meter management (On/Off/Prepaid mode)
- 💳 **Paystack Integration**: Secure payment processing with webhook verification
- 👨‍💼 **Admin Panel**: Comprehensive management interface
- 📱 **Responsive Design**: Mobile-first, modern UI

## Tech Stack

- **Framework**: Next.js 14 (App Router)
- **Language**: TypeScript
- **Styling**: TailwindCSS + shadcn/ui
- **Database**: Supabase
- **Payment**: Paystack
- **Charts**: Recharts
- **Icons**: Lucide React

## Getting Started

### Prerequisites

- Node.js 18+ 
- npm or yarn
- Supabase account
- Paystack account
- IoT platform credentials

### Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd armogrid-paas
```

2. Install dependencies:
```bash
npm install
```

3. Set up environment variables:
```bash
cp .env.local.example .env.local
```

Edit `.env.local` with your actual credentials.

4. Run the development server:
```bash
npm run dev
```

5. Open [http://localhost:3000](http://localhost:3000) in your browser.

## Environment Variables

See `.env.local.example` for required environment variables.

## Project Structure

```
armogrid-paas/
├── app/                    # Next.js app directory
│   ├── (public)/          # Public routes
│   ├── (auth)/            # Authentication routes
│   ├── (dashboard)/       # User dashboard routes
│   ├── (admin)/           # Admin panel routes
│   └── api/               # API routes
├── components/            # React components
│   └── ui/               # shadcn/ui components
├── lib/                  # Utility functions
│   ├── iot-client.ts    # IoT API wrapper
│   ├── paystack.ts      # Paystack utilities
│   └── supabase.ts      # Supabase client
└── types/               # TypeScript types

```

## API Endpoints

### Authentication
- `POST /api/auth/login` - User/Admin login
- `POST /api/auth/logout` - Logout
- `GET /api/auth/me` - Get current user

### Payment
- `POST /api/payment/initialize` - Initialize Paystack payment
- `GET /api/payment/verify/[ref]` - Verify payment
- `POST /api/webhook/paystack` - Paystack webhook handler

### Meters
- `GET /api/meters` - Get user meters
- `GET /api/meters/[id]` - Get meter details
- `POST /api/meters/[id]/control` - Control meter
- `GET /api/meters/[id]/energy` - Get energy data

## License

Proprietary - Armogrid

## Support

For support, contact support@armogrid.com
