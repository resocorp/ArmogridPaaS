# Testing Guide - User Portal

## Quick Start

### 1. Install Dependencies
```bash
npm install
```

### 2. Start Development Server
```bash
npm run dev
```

### 3. Access the Application
Open [http://localhost:3000](http://localhost:3000)

## Testing the User Portal

### Login
1. Navigate to `/login`
2. Select **User** type (not Admin)
3. Enter credentials
4. Click **Sign In**
5. Should redirect to `/dashboard`

### Dashboard Features to Test

#### ✅ Meter List Display
- [ ] Meters load automatically after login
- [ ] Each meter shows:
  - Meter ID
  - Room Number
  - Balance (in Naira)
  - Power Status (Connected/Disconnected)
  - Network Status (Online/Offline)
  - Energy consumption (if available)

#### ✅ View Modes
- [ ] Default view is **Card** (kanban-style grid)
- [ ] Click **List** button to switch to list view
- [ ] Click **Cards** button to switch back
- [ ] View preference persists after page refresh

#### ✅ Drag and Drop
- [ ] In **Card View**: Drag cards to reorder
- [ ] In **List View**: Drag rows to reorder
- [ ] Order persists after page refresh
- [ ] Order persists after switching between views

#### ✅ Statistics
- [ ] **Total Meters**: Shows correct count
- [ ] **Total Balance**: Sum of all balances
- [ ] **Active Meters**: Count of connected meters (switchSta = 1)
- [ ] **Avg. Balance**: Correct average calculation

#### ✅ Status Indicators
- [ ] **Power Connected** (switchSta = 1): Green badge
- [ ] **Power Disconnected** (switchSta = 0): Red badge
- [ ] **Network Online** (unConnect = 0): Green "Online" badge
- [ ] **Network Offline** (unConnect = 1): Red "Offline" badge
- [ ] Warning message appears for offline meters

#### ✅ Session Management
- [ ] Token stored in session after login
- [ ] Token sent with API requests
- [ ] Auto-logout when token expires
- [ ] Toast notification: "Session expired. Please login again."
- [ ] Redirect to `/login` on token expiry

## API Response Testing

### Test with Mock Data
You can test the UI with the sample response you provided:

```json
{
  "success": "1",
  "errorCode": "",
  "errorMsg": "",
  "data": [
    {
      "meterId": "32",
      "roomNo": "RM002",
      "balance": "0.00",
      "togetherMoney": "0.00",
      "oweMoney": false,
      "controlMode": false,
      "switchSta": 0,
      "unConnect": 0,
      "together": false,
      "meterType": 0,
      "epi": "0"
    },
    {
      "meterId": "33",
      "roomNo": "RM001",
      "balance": "0.00",
      "togetherMoney": "0.00",
      "oweMoney": false,
      "controlMode": false,
      "switchSta": 0,
      "unConnect": 0,
      "together": false,
      "meterType": 0,
      "epi": "406.65"
    }
  ]
}
```

### Expected Behavior
- **Meter 32 (RM002)**:
  - Balance: ₦0.00
  - Power: Disconnected (red)
  - Network: Online (green)
  - Energy: 0 kWh (not shown)

- **Meter 33 (RM001)**:
  - Balance: ₦0.00
  - Power: Disconnected (red)
  - Network: Online (green)
  - Energy: 406.65 kWh (shown)

## Testing Token Expiry

### Manual Test
1. Login to dashboard
2. Wait for token to expire (based on SESSION_EXPIRY)
3. Try to refresh meter list
4. Should see "Session expired" toast
5. Should redirect to login page

### Simulated Test
Modify the API response to return:
```json
{
  "success": "0",
  "errorCode": "TOKEN_EXPIRED",
  "errorMsg": "Token expired"
}
```

## Responsive Design Testing

### Desktop (1920x1080)
- [ ] 3-column card grid
- [ ] Sidebar always visible
- [ ] All features accessible

### Tablet (768x1024)
- [ ] 2-column card grid
- [ ] Sidebar toggleable
- [ ] Touch-friendly drag and drop

### Mobile (375x667)
- [ ] 1-column card grid
- [ ] Hamburger menu for sidebar
- [ ] List view recommended for better UX

## Browser Compatibility
- [ ] Chrome/Edge (Chromium)
- [ ] Firefox
- [ ] Safari
- [ ] Mobile browsers

## Common Issues

### Issue: Meters not loading
**Solution**: Check browser console for errors. Verify:
- IoT API is accessible
- User has valid token
- Network connectivity

### Issue: Drag and drop not working
**Solution**: Ensure:
- `@dnd-kit` packages installed (`npm install`)
- JavaScript enabled
- Not on touch device with browser issues

### Issue: Auto-logout not working
**Solution**: Check:
- Session monitor hook is imported in layout
- API returns `tokenExpired: true` on 401
- Browser console for errors

### Issue: View mode not persisting
**Solution**: Check:
- localStorage is enabled in browser
- No browser privacy mode blocking localStorage
- Browser console for errors

## Performance Testing
- [ ] Page loads in < 2 seconds
- [ ] Meter list renders smoothly (even with 50+ meters)
- [ ] Drag and drop is smooth (60fps)
- [ ] No memory leaks on repeated navigation

## Accessibility Testing
- [ ] Keyboard navigation works
- [ ] Screen reader compatible
- [ ] Color contrast meets WCAG standards
- [ ] Focus indicators visible
