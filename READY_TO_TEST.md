# ✅ Your App is READY TO TEST!

## 🎉 All Services Running

- ✅ **Redis**: Running on port 6379
- ✅ **Backend**: Running on port 3333
- ✅ **Frontend**: Running on port 5173

---

## 🧪 HOW TO TEST RIGHT NOW

### Step 1: Open Two Browser Windows

**Option A: Two Different Browsers (Easiest!)**
```
Browser 1 (Chrome):
→ Open: http://localhost:5173

Browser 2 (Firefox):
→ Open: http://localhost:5173
```

**Option B: Incognito Mode**
```
Window 1 (Normal Chrome):
→ Open: http://localhost:5173

Window 2 (Chrome Incognito - Cmd+Shift+N):
→ Open: http://localhost:5173
```

---

### Step 2: In BOTH Windows

1. **Enter your name**
   - Window 1: Type "Alice"
   - Window 2: Type "Bob"

2. **Enter your age**
   - Both: Type "25" (or any age 18+)

3. **Check the box**
   - ☑️ "I'm 18 years or older"

4. **Click "Start Video Chat"**
   - Allow camera permissions when prompted
   - Allow microphone permissions when prompted

---

### Step 3: Watch the Magic! ✨

**What Should Happen:**
- 🔄 "Finding someone..." appears
- ⚡ Match found in 2-3 seconds!
- 📹 Video streams appear
- 🎥 You see yourself in both windows!
- 🎤 Audio connects

---

## 🎮 TEST ALL FEATURES

### 1. Camera Toggle 📹
**In either window:**
- Click the camera icon
- ✅ Your video turns off
- ✅ Button turns red and pulses
- ✅ "Camera Off" message appears
- ✅ Tooltip shows "Turn on camera"
- Click again to turn back on

### 2. Microphone Toggle 🎤
**In either window:**
- Click the microphone icon
- ✅ Audio mutes
- ✅ Button turns red and pulses
- ✅ "Muted" badge appears
- ✅ Tooltip shows "Unmute"
- Click again to unmute

### 3. Chat Messages 💬
**In Window 1 (Alice):**
- Click the chat icon
- Type "Hello Bob!"
- Press Enter or click Send

**In Window 2 (Bob):**
- ✅ Message appears instantly
- ✅ Shows "Alice: Hello Bob!"

**In Window 2 (Bob):**
- Reply: "Hi Alice!"
- ✅ Alice sees it immediately

### 4. Skip Button ⏭️
**In either window:**
- Click the pink/purple skip button (rotating arrow)
- ✅ Icon rotates 180°
- ✅ Current call ends
- ✅ Chat clears
- ✅ Both users rejoin queue
- ✅ New match found (if someone is waiting)

### 5. End Call Button ☎️
**In either window:**
- Click the red phone icon
- ✅ Call ends
- ✅ Returns to landing page
- ✅ Can start a new call

---

## 📊 MONITORING COMMANDS

### Check Backend Health
```bash
curl http://localhost:3333/health
```

**Expected:**
```json
{
  "status": "ok",
  "timestamp": "2025-10-23T...",
  "uptime": 123.45,
  "memory": {...},
  "version": "1.0.0"
}
```

### Check Redis Queue
```bash
redis-cli llen matchmaking:queue
```

**Expected:**
- `0` = No one waiting
- `1` = One person waiting
- `2` = Two people waiting (should match immediately)

### Check Active Sessions
```bash
redis-cli keys "session:*"
```

**Expected:**
- Shows active video sessions

### View Backend Logs
```bash
tail -f /tmp/backend.log
```

### View Frontend Logs
```bash
tail -f /tmp/frontend.log
```

### Check Metrics
```bash
curl http://localhost:3333/metrics | grep video_chat
```

---

## 🐛 TROUBLESHOOTING

### Issue: "WebSocket connection failed"
**Check:**
```bash
curl http://localhost:3333/health
```

**Fix:**
- Backend might have crashed
- Restart: `cd /tmp/omegle-clone/packages/backend && npm run dev`

### Issue: "Camera not working"
**Solutions:**
1. Check browser permissions (camera icon in address bar)
2. Close other apps using camera (Zoom, FaceTime, etc.)
3. Try a different browser
4. Check browser console for errors (F12)

### Issue: "Users don't match"
**Check:**
```bash
redis-cli llen matchmaking:queue
```

**Fix:**
- Make sure BOTH users clicked "Start Video Chat"
- Check backend logs: `tail -f /tmp/backend.log`
- Look for "User joined queue" messages

### Issue: "No audio"
**Solutions:**
1. Check microphone permissions
2. Unmute if muted (red mic button)
3. Check system audio settings
4. Try different browser

### Issue: "Black video screen"
**Solutions:**
1. Check camera permissions
2. Turn camera on (click camera button)
3. Check if another app is using camera
4. Restart browser

---

## 🎯 TESTING CHECKLIST

### Basic Flow
- [ ] Landing page loads
- [ ] Name input works
- [ ] Age validation (must be 18+)
- [ ] "Start Video Chat" button works
- [ ] Camera permission requested
- [ ] Mic permission requested
- [ ] "Finding someone..." appears
- [ ] Match found within 5 seconds
- [ ] Video streams appear
- [ ] Audio works

### Video Controls
- [ ] Camera toggle works (on/off)
- [ ] Camera icon changes
- [ ] "Camera Off" overlay appears
- [ ] Mic toggle works (mute/unmute)
- [ ] Mic icon changes
- [ ] "Muted" badge appears
- [ ] All tooltips show on hover
- [ ] Buttons scale on hover
- [ ] Buttons press on click

### Chat
- [ ] Chat button opens panel
- [ ] Can type messages
- [ ] Send button works
- [ ] Enter key sends message
- [ ] Messages show sender name
- [ ] Other user receives messages
- [ ] Messages appear in real-time

### Skip/Next
- [ ] Skip button works
- [ ] Icon rotates on hover
- [ ] Current call ends
- [ ] Chat clears
- [ ] Rejoins queue
- [ ] New match found

### End Call
- [ ] End call button works
- [ ] Returns to landing page
- [ ] Can start new call

---

## 🌐 TESTING WITH A FRIEND

### Same WiFi Network

**1. Find your IP:**
```bash
ifconfig | grep "inet " | grep -v 127.0.0.1
```

Example: `192.168.1.100`

**2. Share with friend:**
```
Send them: http://192.168.1.100:5173
```

**Note:** You'll need to update the backend URL in the frontend config first!

---

## 🚀 STOP SERVICES

### Stop All Services
```bash
# Stop backend
kill $(cat /tmp/backend.pid)

# Stop frontend
kill $(cat /tmp/frontend.pid)

# Stop Redis (if you started it)
redis-cli shutdown
```

### Or Kill by Port
```bash
# Kill backend (port 3333)
lsof -ti:3333 | xargs kill

# Kill frontend (port 5173)
lsof -ti:5173 | xargs kill
```

---

## 📝 WHAT TO LOOK FOR

### ✅ Success Indicators
- Video appears within 3-5 seconds
- Audio is clear
- Chat messages deliver instantly
- All buttons respond immediately
- No console errors
- Smooth animations
- Tooltips appear on hover
- Skip finds new match quickly

### ❌ Red Flags
- Long matching times (>10 seconds)
- Black video screens
- No audio
- Chat messages delayed
- Buttons don't respond
- Console errors
- Laggy UI
- WebSocket disconnections

---

## 🎥 RECORD YOUR TEST

**Recommended:**
1. Start screen recording
2. Show both browser windows side-by-side
3. Demonstrate all features:
   - Matching
   - Video/audio
   - Chat
   - Camera toggle
   - Mic toggle
   - Skip
   - End call

**Mac:** Cmd+Shift+5  
**Windows:** Win+G  
**Linux:** SimpleScreenRecorder  

---

## 🎉 YOU'RE READY!

**Everything is running. Just open these URLs in TWO browsers:**

```
🌐 Browser 1: http://localhost:5173
🌐 Browser 2: http://localhost:5173 (incognito)
```

**Then follow the steps above!**

---

## 💡 PRO TIPS

1. **Use two different browsers** for best results (Chrome + Firefox)
2. **Allow permissions immediately** when prompted
3. **Test in a quiet environment** to hear audio clearly
4. **Check browser console** (F12) if something doesn't work
5. **Monitor backend logs** to see what's happening server-side
6. **Try the skip button multiple times** to test queue system
7. **Test with camera off** to see how it handles it
8. **Test with mic muted** to verify mute functionality
9. **Send multiple chat messages** to test real-time communication
10. **Refresh and reconnect** to test robustness

---

## 🚀 NEXT STEPS AFTER TESTING

Once you've confirmed everything works:

1. **Fix any bugs** you discover
2. **Optimize performance** if needed
3. **Deploy to production** (see DEPLOYMENT_GUIDE.md)
4. **Buy domain** and set up DNS
5. **Configure SSL** (Let's Encrypt)
6. **Set up monitoring** (Prometheus + Grafana)
7. **Launch!** 🎉

---

**Happy Testing!** 🎮

If you encounter any issues, check the logs:
- Backend: `/tmp/backend.log`
- Frontend: `/tmp/frontend.log`
- Redis: `redis-cli monitor`

