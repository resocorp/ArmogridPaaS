# User Portal Features

## Overview
Enhanced user portal with meter management, multiple view modes, and drag-and-drop functionality.

## Features Implemented

### 1. **getUserMeterList API Integration**
- **Endpoint**: `https://iot.solarshare.africa/basic/prepayment/app/getUserMeterList`
- **Authentication**: Uses session token stored in Supabase
- **Auto-logout**: Automatically logs out user when token expires
- **Location**: `/app/api/meters/route.ts`

### 2. **Enhanced Type Definitions**
Updated `UserMeter` interface to match the new API response:
```typescript
{
  meterId: string;
  roomNo: string;
  balance: string;
  togetherMoney: string;
  oweMoney: boolean;
  controlMode: boolean;
  switchSta: 0 | 1;        // 0 = Disconnected, 1 = Connected
  unConnect: 0 | 1;        // 0 = Online, 1 = Offline
  together: boolean;
  meterType: number;
  epi: string;             // Energy consumption
}
```

### 3. **Meter Display Components**

#### **MeterCard Component** (`/components/meter-card.tsx`)
Displays meter information in a card format with:
- **Meter ID** and **Room Number**
- **Balance** (formatted in Naira)
- **Power Status** with color indicators:
  - 🟢 Green badge: "Connected" (switchSta = 1)
  - 🔴 Red badge: "Disconnected" (switchSta = 0)
- **Network Status**:
  - 🟢 "Online" (unConnect = 0) - Recharge and control available
  - 🔴 "Offline" (unConnect = 1) - Actions unavailable
- **Energy Consumption** (epi field)
- **Warning message** when meter is offline

#### **MeterListItem Component** (`/components/meter-list-item.tsx`)
Displays meter information in a list row format with all the same information as cards but in a horizontal layout.

### 4. **Dashboard Enhancements** (`/app/dashboard/page.tsx`)

#### **View Modes**
- **Card View** (default): Kanban-style grid layout
- **List View**: Compact list layout
- Toggle buttons to switch between views
- View preference saved in localStorage

#### **Drag-and-Drop Reordering**
- Uses `@dnd-kit` library for smooth drag-and-drop
- Works in both card and list views
- Order is persisted in localStorage
- Reordering survives page refreshes

#### **Statistics Dashboard**
- **Total Meters**: Shows total count and online meters
- **Total Balance**: Sum of all meter balances
- **Active Meters**: Count of meters with power connected (switchSta = 1)
- **Average Balance**: Per-meter average

### 5. **Session Management**

#### **Token Storage**
- User token stored in Supabase `user_sessions` table
- Token included in all IoT API requests
- Session expires based on `SESSION_EXPIRY` constant

#### **Auto-Logout Mechanism**
- **Session Monitor Hook** (`/lib/hooks/use-session-monitor.ts`)
  - Intercepts all fetch requests
  - Detects `tokenExpired: true` in 401 responses
  - Automatically redirects to login page
  - Shows "Session expired" toast notification
- Integrated into dashboard layout for all dashboard pages

#### **API Token Expiry Handling**
- `/api/meters` endpoint checks for token expiry errors
- Returns `tokenExpired: true` flag on 401 responses
- Client-side code detects this and triggers auto-logout

### 6. **UI/UX Features**
- **Responsive Design**: Works on mobile, tablet, and desktop
- **Color Indicators**:
  - Green: Power connected, network online
  - Red: Power disconnected, network offline
  - Amber: Warning messages
- **Hover Effects**: Cards and list items have hover states
- **Loading States**: Skeleton screens while fetching data
- **Empty States**: Helpful messages when no meters found
- **Toast Notifications**: User feedback for actions and errors

## Dependencies Added
```json
{
  "@dnd-kit/core": "^6.1.0",
  "@dnd-kit/sortable": "^8.0.0",
  "@dnd-kit/utilities": "^3.2.2"
}
```

## Installation
```bash
npm install
```

## Usage

### Login Flow
1. User logs in via `/login`
2. Token obtained from IoT API
3. Token stored in Supabase session
4. User redirected to `/dashboard`

### Dashboard Flow
1. Dashboard loads and calls `/api/meters`
2. API fetches meter list using stored token
3. Meters displayed in card/list view
4. User can drag to reorder meters
5. If token expires, user auto-logged out

## File Structure
```
app/
├── api/
│   └── meters/
│       └── route.ts              # Updated with token expiry handling
├── dashboard/
│   ├── layout.tsx                # Added session monitoring
│   └── page.tsx                  # Enhanced with views & drag-drop
components/
├── ui/
│   └── badge.tsx                 # New badge component
├── meter-card.tsx                # New meter card component
└── meter-list-item.tsx           # New meter list component
lib/
└── hooks/
    └── use-session-monitor.ts    # New session monitoring hook
types/
└── iot.ts                        # Updated UserMeter interface
```

## API Response Handling

### Success Response
```json
{
  "success": "1",
  "errorCode": "",
  "errorMsg": "",
  "data": [...]
}
```

### Token Expired Response
```json
{
  "success": "0",
  "errorCode": "TOKEN_EXPIRED",
  "errorMsg": "Token expired or invalid"
}
```

## Future Enhancements
- Meter detail page with full information
- Recharge functionality
- Meter control (on/off)
- Energy consumption charts
- Transaction history per meter
- Real-time meter status updates
