# Latest Updates - User Portal Enhancements

## Overview
Enhanced user portal with username display, improved status indicators, and meter control functionality.

---

## 1. Username Display in Header

### Implementation
- **Location**: `/app/dashboard/layout.tsx`
- **Features**:
  - Username displayed in top-right header
  - Avatar circle with first letter of username
  - Responsive design (hidden on small screens)
  - Fetched from session via `/api/auth/me`

### Visual
```
[Avatar: C] conwu    [Logout]
```

---

## 2. Enhanced Meter Cards & List Items

### Status Indicators
Both card and list views now show:

#### **Power Status**
- 🟢 **Green Badge**: "Connected" (switchSta = 1)
- 🔴 **Red Badge**: "Disconnected" (switchSta = 0)
- Icon: Power/PowerOff
- Background highlight in muted color

#### **Network Status**
- 🟢 **Green Badge**: "Online" (unConnect = 0)
- 🔴 **Red Badge**: "Offline" (unConnect = 1)
- Icon: Wifi/WifiOff
- Shown in card header

### Power Control Toggle

#### **Toggle Button Behavior**
- **When Power is ON (Connected)**:
  - Button shows: "Turn OFF" (red/destructive variant)
  - Sends control type: `0` (Off)
  
- **When Power is OFF (Disconnected)**:
  - Button shows: "Turn ON" (green/default variant)
  - Sends control type: `2` (Restore Prepaid mode)

#### **Button States**
- **Enabled**: Network is online (unConnect = 0)
- **Disabled**: Network is offline (unConnect = 1)
- **Loading**: Shows spinner during control operation
- **Auto-refresh**: Meter data refreshes 1 second after control

#### **User Experience**
- User sees simple ON/OFF toggle
- Backend handles the complexity (type 0 vs type 2)
- Toast notifications for success/error
- Cannot control if meter is offline

---

## 3. Meter Control Implementation

### API Endpoint
- **Route**: `/api/meters/[id]/control`
- **Method**: POST
- **Authentication**: Uses admin token (from environment)
- **Body**: `{ type: 0 | 2 }`

### Control Types (User-Facing)
| User Action | API Type | Description |
|-------------|----------|-------------|
| Turn OFF | `0` | Disconnect power |
| Turn ON | `2` | Restore prepaid mode (power on) |

**Note**: Type `1` (Force On) is not exposed to users - only OFF and Prepaid mode.

### Admin Token Flow
1. User clicks toggle button
2. Frontend calls `/api/meters/[id]/control`
3. Backend calls `getAdminToken()` which:
   - Checks environment for `IOT_ADMIN_TOKEN`
   - If not found, logs in with `IOT_ADMIN_USERNAME` and `IOT_ADMIN_PASSWORD`
   - Returns token for meter control
4. Backend calls IoT API with admin token
5. Response sent back to user

### Security
- User token validates authentication
- Admin token used for actual meter control
- Admin credentials stored in `.env.local`:
  ```
  IOT_ADMIN_USERNAME=your_admin_username
  IOT_ADMIN_PASSWORD=your_admin_password
  ```

---

## 4. Updated Pages

### Dashboard (`/dashboard`)
- Username in header
- Meter cards with status badges
- Toggle controls in each card
- Drag-and-drop still works
- Card/List view toggle

### Meters Page (`/dashboard/meters`)
- Dedicated page for meter management
- Larger cards with more details
- Same status indicators as dashboard
- Toggle controls (OFF/ON only)
- Refresh button
- Grid layout (2-3 columns)

---

## 5. Component Updates

### MeterCard Component
**New Props**:
- `onMeterUpdate?: () => void` - Callback to refresh data

**New Features**:
- Power control toggle button
- Loading state during control
- Network status badge in header
- Warning message when offline

### MeterListItem Component
**New Props**:
- `onMeterUpdate?: () => void` - Callback to refresh data

**New Features**:
- Power control toggle button
- Status badges inline
- Disabled state when offline

---

## 6. User Flow

### Controlling a Meter
1. User sees meter card/list item
2. Checks network status (must be "Online")
3. Checks power status (Connected/Disconnected)
4. Clicks toggle button:
   - If ON → "Turn OFF" button (red)
   - If OFF → "Turn ON" button (green)
5. Button shows loading spinner
6. Toast notification shows result
7. Meter data auto-refreshes after 1 second
8. Updated status displayed

### Error Handling
- **No Network**: Toast error "Cannot control meter - No network connection"
- **API Error**: Toast error with specific message
- **Session Expired**: Auto-logout and redirect to login
- **Button Disabled**: When offline or already controlling

---

## 7. Testing Checklist

### Username Display
- [ ] Username appears in header after login
- [ ] Avatar shows first letter
- [ ] Hidden on mobile screens
- [ ] Shows on tablet/desktop

### Status Indicators
- [ ] Green "Connected" badge when switchSta = 1
- [ ] Red "Disconnected" badge when switchSta = 0
- [ ] Green "Online" badge when unConnect = 0
- [ ] Red "Offline" badge when unConnect = 1
- [ ] Power icon changes based on status

### Meter Control
- [ ] Toggle button shows "Turn OFF" when power is ON
- [ ] Toggle button shows "Turn ON" when power is OFF
- [ ] Button disabled when network is offline
- [ ] Loading spinner shows during control
- [ ] Toast notification on success
- [ ] Toast error on failure
- [ ] Meter data refreshes after control
- [ ] Cannot control offline meters

### Dashboard
- [ ] All meters show status badges
- [ ] Toggle controls work in card view
- [ ] Toggle controls work in list view
- [ ] Drag-and-drop still works
- [ ] View mode toggle works

### Meters Page
- [ ] Shows all meters in grid
- [ ] Status badges visible
- [ ] Toggle controls work
- [ ] Refresh button works
- [ ] Loading states work

---

## 8. API Integration

### Control Request
```json
POST /api/meters/28/control
Content-Type: application/json

{
  "type": 0  // 0 = OFF, 2 = ON (Prepaid)
}
```

### Control Response (Success)
```json
{
  "success": true,
  "message": "Meter control command sent successfully",
  "data": { ... }
}
```

### Control Response (Error)
```json
{
  "error": "Failed to control meter"
}
```

---

## 9. Environment Variables Required

```env
# Admin credentials for meter control
IOT_ADMIN_USERNAME=your_admin_username
IOT_ADMIN_PASSWORD=your_admin_password

# Optional: Pre-fetched admin token (to avoid login on every request)
IOT_ADMIN_TOKEN=your_admin_token
```

---

## 10. Files Modified

```
app/
├── dashboard/
│   ├── layout.tsx              # Added username display
│   ├── page.tsx                # Added toggle controls to cards/list
│   └── meters/
│       └── page.tsx            # Enhanced with status badges and controls
components/
├── meter-card.tsx              # Added toggle control and status badges
└── meter-list-item.tsx         # Added toggle control and status badges
```

---

## 11. Key Features Summary

✅ **Username Display**: Shows logged-in user in header  
✅ **Status Badges**: Color-coded power and network status  
✅ **Toggle Controls**: Simple ON/OFF buttons for users  
✅ **Admin Token**: Automatic admin authentication for controls  
✅ **Network Aware**: Disables controls when meter is offline  
✅ **Auto-Refresh**: Updates meter data after control  
✅ **Error Handling**: Clear error messages and toast notifications  
✅ **Loading States**: Visual feedback during operations  
✅ **Responsive Design**: Works on all screen sizes  

---

## Next Steps

Potential future enhancements:
- Real-time meter status updates (WebSocket)
- Meter control history/logs
- Bulk meter control (control multiple meters)
- Scheduled power on/off
- Energy consumption charts
- Recharge functionality
- Transaction history per meter
