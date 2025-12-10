# User Experience Flows

## Overview
This document maps out all user journeys through the application, emphasizing transparency, control, and graceful degradation.

---

## 🎬 Core User Flows

### 1. Happy Path - Perfect Connection

```
Landing Page
    ↓ User enters name
    ↓ Selects preferences
    ↓ Clicks "Start Video Chat"
Grant Permissions (1-2 seconds)
    ↓ Camera preview shows
    ↓ Network quality: Excellent (4G)
Finding Match (1-3 seconds)
    ↓ "Searching for someone..." animation
Matched!
    ↓ WebRTC connection established
    ↓ Remote video appears
Chatting
    ↓ User has full control
    │ - Toggle video/audio
    │ - Open text chat
    │ - Skip to next person (2 sec cooldown)
    │ - Report inappropriate behavior
    │ - Switch to audio-only
    │ - Stop chatting
```

**User sees:**
- Clear "You're in control" label
- Network quality indicator: "Excellent (4G) - 5.2 Mbps"
- Safety badge: "Safe & Moderated • Your Safety Matters"

---

### 2. Permission Denied Flow

```
Landing Page → Start Chat → Permission Prompt
    ↓ User clicks "Block"
Permission Denied Modal
    │
    ├─ Shows browser-specific instructions
    │  - Chrome: "Click camera icon in address bar"
    │  - Safari: "Go to Safari → Settings → Websites"
    │  - Firefox: "Click permissions icon in address bar"
    │
    └─ User has 4 options:
       1. [Retry] - Try permissions again
       2. [Audio Only] - Continue with voice chat
       3. [Text Only] - Continue with text chat
       4. [Go Back] - Return to landing page
```

**Key Features:**
- Never blocks user completely
- Always offers alternatives
- Clear, actionable instructions
- Browser-specific guidance

---

### 3. Slow Network Flow

```
Start Video Chat
    ↓ Network detected: 3G (2.1 Mbps)
Auto-adjust to SD Quality (640x480 @ 24fps)
    ↓ Network quality indicator: "Good (3G)"
Chatting in SD
    ↓ Network degrades to 2G (0.5 Mbps)
Yellow Warning Appears:
    ┌──────────────────────────────────┐
    │ ⚠️ Slow Connection Detected      │
    │ Video quality reduced to improve │
    │ performance.                     │
    │ [Switch to Audio Only]           │
    └──────────────────────────────────┘
    ↓ User continues or clicks button
If network worsens:
    ┌──────────────────────────────────┐
    │ ⚠️ Very Slow Connection          │
    │ Consider switching to audio-only │
    │ mode for better experience.      │
    │ [Switch to Audio Only]           │
    └──────────────────────────────────┘
```

**Transparency:**
- Real-time network indicator always visible
- Clear warnings with actionable solutions
- One-click mode switching
- User maintains control

---

### 4. Audio-Only Mode Flow

```
User Clicks "Switch to Audio Only" Button
    ↓ Confirmation
Video Disabled
    ↓ Camera turns off
    ↓ Bandwidth usage drops to ~64 Kbps
Audio-Only Mode Active
    │ Visual indicator: "🔊 Audio-Only Mode"
    │ Avatar/placeholder instead of video
    │ Text chat available
    └─ Controls simplified:
       - 🎤 Mute/Unmute
       - 🔴 Stop
       - ➡️ Skip
       - 💬 Chat
       - 🚩 Report
```

**Benefits Communicated:**
- "Saves bandwidth"
- "Works better on slow connections"
- "Still fully functional"

---

### 5. Report & Safety Flow

```
User Sees Inappropriate Behavior
    ↓ Clicks orange Report button (🚩)
Report Modal Opens:
    ┌──────────────────────────────────┐
    │ Report User                       │
    ├──────────────────────────────────┤
    │ Reason:                          │
    │ ( ) Harassment                   │
    │ ( ) Inappropriate Content        │
    │ ( ) Spam                         │
    │ ( ) Other                        │
    │                                  │
    │ Optional Comment:                │
    │ [________________]               │
    │                                  │
    │ [Cancel]  [Submit Report]        │
    └──────────────────────────────────┘
    ↓ User submits
Report Sent
    ↓ "Report submitted. Thank you."
Automatically Skip to Next Person
```

**Safety Features:**
- Report button always visible (orange, prominent)
- Quick access from any screen
- User automatically moved away from reported person
- Confirmation message reassures user

---

### 6. Skip/Next Flow

```
User Wants New Match
    ↓ Clicks pink/purple "Next" button (➡️)
Current Session Ends
    ↓ Peer notified of disconnect
    ↓ Button disabled for 2 seconds
    ↓ Shows "Finding new match..." with spin animation
Finding Next Match (1-3 seconds)
    ↓ Search animation
New Match Found
    ↓ WebRTC reconnection
    ↓ New person appears
    ↓ Chat history cleared
Chatting with New Person
```

**Anti-Spam Protection:**
- 2-second cooldown prevents rapid clicking
- Visual feedback during cooldown
- Smooth transition between matches

---

### 7. Device Error Flow

```
Start Chat → Permission Granted → Hardware Error
    ↓ "Camera already in use by another app"
Error Modal:
    ┌──────────────────────────────────┐
    │ 📷 Device Already in Use         │
    ├──────────────────────────────────┤
    │ Your camera or microphone is     │
    │ currently being used by another  │
    │ application. Please close other  │
    │ apps and try again.              │
    │                                  │
    │ Common apps that use camera:     │
    │ • Zoom, Skype, Teams             │
    │ • Other browser tabs             │
    │ • Photo/video apps               │
    │                                  │
    │ [Retry]  [Audio Only]  [Go Back] │
    └──────────────────────────────────┘
```

**Helpful Guidance:**
- Explains the problem clearly
- Lists common culprits
- Offers alternatives
- Retry option after fixing

---

### 8. Offline/No Connection Flow

```
User Loses Internet Connection
    ↓ Network monitor detects offline state
Red Banner Appears:
    ┌──────────────────────────────────┐
    │ 🔴 OFFLINE                       │
    │ No Internet Connection           │
    │ 0 Mbps                          │
    └──────────────────────────────────┘
Error Message:
    ┌──────────────────────────────────┐
    │ ⚠️ No Internet Connection        │
    │ Please check your network        │
    │ connection and try again.        │
    └──────────────────────────────────┘
Session Automatically Paused
    ↓ Waiting for reconnection
Connection Restored
    ↓ Green banner: "✅ Back Online"
    ↓ Auto-resume or prompt to continue
```

**Graceful Handling:**
- Clear offline indicator
- Doesn't crash or hang
- Auto-resume when possible
- User informed at every step

---

## 🎯 Control & Transparency Principles

### 1. Always Show Current State
✅ Network quality indicator (top-left)
✅ Audio-only mode badge (if active)
✅ Connection status (connecting, connected, disconnected)
✅ Safety badge ("Safe & Moderated")

### 2. Label Every Action
✅ "You're in control" header
✅ Tooltips on all buttons
✅ Clear button labels
✅ "Stop • Skip • Report anytime" subheader

### 3. Provide Alternatives
✅ Video fails → Audio-only option
✅ Audio fails → Text-only option
✅ Slow network → Quality recommendations
✅ Never dead-end the user

### 4. Confirm Consequences
✅ Stop button is red and prominent
✅ Skip has cooldown to prevent accidents
✅ Report confirmation message
✅ Mode switches show what changes

---

## 📊 User Messaging Matrix

| Situation | Message | Action Options | Color |
|-----------|---------|---------------|-------|
| Excellent connection | "Excellent (4G) - 5.2 Mbps" | None needed | Green |
| Good connection | "Good (3G) - 2.1 Mbps" | None needed | Blue |
| Fair connection | "Fair (2G) - Video quality reduced" | [Switch to Audio Only] | Yellow |
| Poor connection | "Poor - Consider audio-only mode" | [Switch to Audio Only] | Orange |
| Offline | "No Internet Connection" | [Try Again] | Red |
| Permission denied | "Camera access denied" | [Retry] [Audio] [Text] [Back] | Red |
| Device in use | "Device already in use" | [Retry] [Audio] [Back] | Orange |
| Match found | None (seamless) | All controls available | - |
| Searching | "Finding someone..." | [Stop] to cancel | - |
| Report submitted | "Report submitted. Thank you." | Auto-skip to next | Green |

---

## 🎨 Visual Indicators

### Connection Quality
```
Excellent: ████ (4 bars, green)
Good:      ███░ (3 bars, blue)
Fair:      ██░░ (2 bars, yellow)
Poor:      █░░░ (1 bar, orange)
Offline:   ✗ (cross, red)
```

### Button Colors
- **Red** (#ef4444): Stop, End, Danger
- **Orange** (#f97316): Report, Warning
- **Pink/Purple** (gradient): Next/Skip (primary action)
- **Blue** (#3b82f6): Audio-only mode
- **Gray** (#374151): Secondary actions (video, audio, chat)

### Audio-Only Indicator
```
┌─────────────────────────┐
│ 🔊 Audio-Only Mode      │
└─────────────────────────┘
Blue badge, always visible when active
```

---

## 🏆 Competitive Advantages

### Our Approach vs. Competitors

| Feature | Us | Omegle | Chatroulette |
|---------|-----|--------|--------------|
| **Network indicator** | ✅ Real-time | ❌ None | ❌ None |
| **Quality adaptation** | ✅ Automatic | ❌ Fixed | ❌ Fixed |
| **Permission errors** | ✅ Helpful guide | ❌ Generic error | ❌ Generic error |
| **Audio-only mode** | ✅ One click | ❌ Not available | ❌ Not available |
| **Control labels** | ✅ Clear | ❌ Icons only | ❌ Icons only |
| **Safety messaging** | ✅ Always visible | ❌ Hidden | ❌ Hidden |
| **Fallback options** | ✅ Multiple | ❌ None | ❌ None |
| **Mobile optimization** | ✅ Fully optimized | ⚠️ Basic | ⚠️ Basic |

---

## 💡 User Education Moments

### First-Time User
```
Landing Page Shows:
1. "How It Works" (3 steps)
2. "Your Safety Matters" (trust signals)
3. Clear value props
4. No hidden fees/signup
```

### During Use
```
Control Bar Shows:
- "You're in control" (empowerment)
- "Stop • Skip • Report anytime" (agency)
- "Safe & Moderated" (trust)
- Network indicator (transparency)
```

### Error States
```
Permission Modal Shows:
- Why we need permissions
- How to fix the issue
- Alternative options
- "We value your privacy"
```

---

## ✅ UX Quality Checklist

- [x] User always knows network quality
- [x] User always knows what each button does
- [x] User always has an alternative if something fails
- [x] User always sees safety messaging
- [x] User can stop/skip/report instantly
- [x] No dead ends or error states that trap users
- [x] Clear loading states (never ambiguous)
- [x] Responsive feedback on all actions
- [x] Consistent color coding across app
- [x] Mobile-friendly tap targets (44px minimum)

---

## 📱 Mobile-Specific UX

### Touch Targets
All buttons: Minimum 44x44px (iOS/Android standard)

### Gestures
- Tap: All interactions
- No swipe gestures (avoids conflicts)
- No pinch/zoom (fixed UI)

### Orientation
- Portrait: Primary layout
- Landscape: Adapts (video takes more space)

### Network Awareness
- Auto-detects mobile network type
- Shows data usage warnings on metered connections
- Offers lower quality on cellular vs WiFi

---

**Last Updated:** 2025-10-24
**Focus:** Transparency, Control, Quality
**Status:** ✅ User-Tested & Approved

