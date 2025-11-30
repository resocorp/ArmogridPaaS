# Power Button Update - Momentary Switch Style

## Overview
Updated power control from two separate buttons (Turn ON/OFF) to a single momentary switch button with visual state indication.

---

## Visual Design

### Button States

#### **Power ON (Connected)**
- **Color**: Green gradient (`from-green-400 to-green-600`)
- **Shadow**: Green glow (`shadow-green-500/50`)
- **Icon**: Power symbol (white)
- **Action**: Click to turn OFF (sends type: 0)

#### **Power OFF (Disconnected)**
- **Color**: Gray gradient (`from-gray-400 to-gray-600`)
- **Shadow**: Gray glow (`shadow-gray-500/50`)
- **Icon**: Power symbol (white)
- **Action**: Click to turn ON (sends type: 2)

#### **Loading State**
- **Animation**: White spinning loader
- **Button**: Disabled during operation

#### **Disabled State**
- **Opacity**: 50% opacity
- **Cursor**: Not-allowed cursor
- **When**: Network is offline

---

## Button Specifications

### Meter Card (Dashboard)
- **Size**: `w-14 h-14` (56px × 56px)
- **Border Radius**: `rounded-2xl` (16px)
- **Icon Size**: `w-7 h-7` (28px × 28px)
- **Shadow**: `shadow-lg` with color-matched glow

### Meter List Item
- **Size**: `w-12 h-12` (48px × 48px)
- **Border Radius**: `rounded-xl` (12px)
- **Icon Size**: `w-6 h-6` (24px × 24px)
- **Shadow**: `shadow-md` with color-matched glow

### Meters Page
- **Size**: `w-14 h-14` (56px × 56px)
- **Border Radius**: `rounded-2xl` (16px)
- **Icon Size**: `w-7 h-7` (28px × 28px)
- **Shadow**: `shadow-lg` with color-matched glow

---

## Interactions

### Hover Effect
```css
hover:scale-105
```
- Button scales up by 5% on hover
- Smooth transition (300ms)

### Active/Click Effect
```css
active:scale-95
```
- Button scales down by 5% when clicked
- Creates press-down effect

### Transition
```css
transition-all duration-300
```
- Smooth color and scale transitions
- 300ms duration

---

## Control Logic (Preserved)

### Click Behavior
```typescript
// When power is ON (connected)
isPowerConnected ? 0 : 2

// ON state → Click sends type: 0 (Turn OFF)
// OFF state → Click sends type: 2 (Restore Prepaid/Turn ON)
```

### Network Check
```typescript
disabled={!isNetworkConnected || isControlling}
```
- Button disabled if meter is offline
- Button disabled during control operation

### API Call
```typescript
const controlType = isPowerConnected ? 0 : 2;
await fetch(`/api/meters/${meterId}/control`, {
  method: 'POST',
  body: JSON.stringify({ type: controlType })
});
```

---

## Files Updated

1. **`/components/meter-card.tsx`**
   - Replaced two-button layout with single power button
   - Card view on dashboard

2. **`/components/meter-list-item.tsx`**
   - Replaced button with single power button
   - List view on dashboard

3. **`/app/dashboard/meters/page.tsx`**
   - Replaced two-button grid with single power button
   - Dedicated meters page

---

## Code Structure

### Button Template
```tsx
<button
  onClick={handleTogglePower}
  disabled={!isNetworkConnected || isControlling}
  className={cn(
    "relative w-14 h-14 rounded-2xl transition-all duration-300 shadow-lg",
    "disabled:opacity-50 disabled:cursor-not-allowed",
    "hover:scale-105 active:scale-95",
    isPowerConnected
      ? "bg-gradient-to-br from-green-400 to-green-600 shadow-green-500/50"
      : "bg-gradient-to-br from-gray-400 to-gray-600 shadow-gray-500/50"
  )}
>
  {isControlling ? (
    <div className="absolute inset-0 flex items-center justify-center">
      <div className="w-6 h-6 border-3 border-white border-t-transparent rounded-full animate-spin" />
    </div>
  ) : (
    <div className="absolute inset-0 flex items-center justify-center">
      <Power className="w-7 h-7 text-white" strokeWidth={2.5} />
    </div>
  )}
</button>
```

---

## User Experience

### Visual Feedback
1. **Color**: Instant visual indication of power state
   - Green = ON
   - Gray = OFF

2. **Hover**: Button grows slightly on hover
   - Indicates it's interactive
   - Smooth animation

3. **Click**: Button shrinks on click
   - Tactile button press feel
   - Momentary switch behavior

4. **Loading**: Spinner replaces icon
   - Clear indication of ongoing operation
   - Button stays disabled

5. **Disabled**: Faded appearance
   - 50% opacity when offline
   - Not-allowed cursor

### State Flow
```
User sees meter
   ↓
Checks power state (Green=ON, Gray=OFF)
   ↓
Clicks power button
   ↓
Button shows loading spinner
   ↓
API call to control meter
   ↓
Toast notification (success/error)
   ↓
Meter data refreshes (1 second delay)
   ↓
Button updates to new state color
```

---

## Advantages Over Previous Design

### Before (Two Buttons)
- ❌ More space required
- ❌ User must read labels
- ❌ Two UI elements to process
- ✅ Very explicit actions

### After (Single Button)
- ✅ Less space required
- ✅ Visual state at a glance
- ✅ Single focus point
- ✅ Modern, clean design
- ✅ Matches standard power buttons
- ✅ Color-coded for quick recognition

---

## Accessibility

- **Color**: Not the only indicator (icon always present)
- **Size**: Large enough for touch targets (48px minimum)
- **Disabled State**: Clear visual indication
- **Loading State**: Animated feedback

---

## Testing Checklist

- [ ] Button shows green when power is connected
- [ ] Button shows gray when power is disconnected
- [ ] Hover effect scales button up
- [ ] Click effect scales button down
- [ ] Loading spinner appears during control
- [ ] Button disabled when network is offline
- [ ] Button disabled during control operation
- [ ] Toast notifications appear on success/error
- [ ] Meter data updates after control
- [ ] Color updates to reflect new state

---

## Browser Compatibility

- ✅ Modern browsers (Chrome, Firefox, Safari, Edge)
- ✅ CSS gradients supported
- ✅ CSS transforms (scale) supported
- ✅ Smooth transitions work
- ✅ Touch devices (mobile/tablet)

---

## Responsive Design

- **Desktop**: Full hover and active effects
- **Tablet**: Touch-friendly size (48px+)
- **Mobile**: Works with touch events
- **All Devices**: Visual state always clear
