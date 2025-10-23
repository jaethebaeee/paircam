# 🔍 Pre-Deployment Testing & Safety Checklist

## 🐛 Critical Bugs to Test

### 1. WebRTC Connection Issues
**Test:**
```bash
# Open two browsers and test:
- Both users in same network
- Users behind different NAT types
- Users with firewalls enabled
- Mobile browsers (iOS Safari, Chrome)
```

**Potential Bugs:**
- ❌ ICE candidates not exchanging properly
- ❌ TURN server not accessible
- ❌ Offer/Answer timing issues
- ❌ No fallback for failed P2P connections

**How to Test:**
```
1. Open browser console (F12)
2. Check for WebRTC errors
3. Look for "Failed to set remote description"
4. Monitor ICE connection state
```

---

### 2. Race Conditions
**Potential Issues:**
- ❌ User clicks "Skip" multiple times rapidly
- ❌ User closes browser during matching
- ❌ Two users match at exact same time
- ❌ Session cleanup doesn't complete before rejoin

**Test Scenarios:**
```javascript
// Test 1: Rapid skip clicking
for (let i = 0; i < 10; i++) {
  clickSkipButton();
}

// Test 2: Close tab during match
1. Click "Start Video Chat"
2. Close tab immediately
3. Check Redis for orphaned sessions

// Test 3: Network interruption
1. Start call
2. Disable WiFi for 5 seconds
3. Re-enable WiFi
4. Verify reconnection works
```

---

### 3. Memory Leaks
**Check for:**
- ❌ Video streams not stopping when call ends
- ❌ WebSocket connections not closing
- ❌ Event listeners not removed
- ❌ Redis sessions not cleaned up

**Test:**
```javascript
// In browser console
1. Start/end 10 calls in a row
2. Run: performance.memory (Chrome)
3. Check if memory keeps growing

// Backend
redis-cli keys "*" | wc -l  // Should not grow indefinitely
```

---

### 4. Permission Handling
**Test Cases:**
- ❌ User denies camera permission
- ❌ User denies microphone permission
- ❌ User has no camera/mic
- ❌ Camera/mic in use by another app
- ❌ User revokes permission mid-call

**Test Each:**
```
1. Deny camera only → Should show error
2. Deny mic only → Should show error
3. Grant then revoke → Should handle gracefully
4. Close other apps → Should work after
```

---

### 5. Session State Issues
**Potential Bugs:**
- ❌ User stuck in "Finding..." state
- ❌ Session ID mismatch
- ❌ Peer sees "Connected" but you don't
- ❌ Chat messages to wrong person

**Test:**
```
1. User A matches User B
2. User B's browser crashes
3. User A should see "Disconnected"
4. User A can skip to next person

Check Redis:
redis-cli get session:<session-id>
# Should show correct peers
```

---

### 6. Rate Limiting Edge Cases
**Test:**
- ❌ What happens at exactly 10 calls/minute?
- ❌ Does rate limit reset properly?
- ❌ Can user bypass by refreshing?
- ❌ Does it work across multiple tabs?

**Test:**
```javascript
// Make exactly 10 calls in 1 minute
for (let i = 0; i < 10; i++) {
  startCall();
  endCall();
}
// 11th call should be blocked

// Wait 1 minute
// Should work again
```

---

### 7. Authentication Edge Cases
**Test:**
- ❌ Token expires during call
- ❌ Invalid token format
- ❌ Token refresh fails
- ❌ Multiple tabs with different tokens

**Test:**
```
1. Start call
2. Wait for token to expire (5 minutes)
3. Try to skip → Should refresh token
4. Should continue working
```

---

### 8. Chat System Bugs
**Potential Issues:**
- ❌ Messages sent to wrong peer
- ❌ Messages after call ends
- ❌ XSS through chat messages
- ❌ Very long messages crash UI

**Test:**
```javascript
// XSS test
sendMessage("<script>alert('xss')</script>");
sendMessage("<img src=x onerror=alert('xss')>");

// Long message test
sendMessage("A".repeat(10000));

// Unicode/emoji test
sendMessage("👋🎉🔥💯");

// Special characters
sendMessage("' OR '1'='1");
```

---

### 9. Browser Compatibility
**Test in:**
- ✅ Chrome (latest)
- ✅ Firefox (latest)
- ✅ Safari (latest)
- ✅ Edge (latest)
- ✅ Mobile Chrome (iOS/Android)
- ✅ Mobile Safari (iOS)

**Known Issues:**
- Safari requires HTTPS for camera
- Firefox WebRTC slightly different API
- Mobile browsers have different constraints

---

### 10. Network Failures
**Test:**
- ❌ Redis goes down
- ❌ Backend crashes
- ❌ User's internet drops
- ❌ High latency (500ms+)
- ❌ Packet loss

**Simulate:**
```bash
# Kill Redis
sudo systemctl stop redis

# Kill backend
kill <backend-pid>

# Simulate network issues
sudo tc qdisc add dev eth0 root netem delay 500ms
sudo tc qdisc add dev eth0 root netem loss 10%
```

---

## 🔒 Security Checks

### 1. Input Validation
**Check:**
```javascript
// Name input
- ❌ Empty name
- ❌ Very long name (1000+ chars)
- ❌ XSS in name: <script>alert('xss')</script>
- ❌ SQL injection: ' OR '1'='1
- ❌ Special characters: \n\t\r

// Age input
- ❌ Negative age
- ❌ Age < 18
- ❌ Age > 150
- ❌ Non-numeric input
- ❌ Decimal numbers
```

**Test Script:**
```javascript
const maliciousInputs = [
  "<script>alert('xss')</script>",
  "' OR '1'='1",
  "../../../etc/passwd",
  "${process.env}",
  "javascript:alert('xss')",
  "<img src=x onerror=alert('xss')>",
  "'; DROP TABLE users;--",
];

maliciousInputs.forEach(input => {
  testInput(input);
  console.log('Testing:', input);
});
```

---

### 2. JWT Token Security
**Check:**
```bash
# Decode token and verify
echo "<token>" | base64 -d

# Check for:
- ❌ Sensitive data in payload
- ❌ No expiration
- ❌ Weak secret
- ❌ Algorithm confusion attack

# Test
curl -H "Authorization: Bearer fake-token" \
  http://localhost:3333/turn/credentials
# Should return 401
```

---

### 3. WebSocket Security
**Test:**
```javascript
// Try to connect without token
const socket = io('http://localhost:3333/signaling');
// Should be rejected

// Try to send messages for other users
socket.emit('send-message', {
  sessionId: 'other-session',
  message: 'hacked!'
});
// Should be rejected
```

---

### 4. CORS Configuration
**Test:**
```bash
# Try from different origin
curl -H "Origin: http://evil.com" \
  -H "Access-Control-Request-Method: POST" \
  -X OPTIONS http://localhost:3333/auth/token

# Should reject evil.com
```

---

### 5. Rate Limiting
**Test:**
```bash
# Spam requests
for i in {1..100}; do
  curl http://localhost:3333/auth/token \
    -X POST -d '{"deviceId":"test"}' &
done

# Should block after 10 requests/minute
```

---

### 6. Session Hijacking
**Test:**
```javascript
// Try to use someone else's session ID
socket.emit('send-message', {
  sessionId: '<stolen-session-id>',
  message: 'hijacked!'
});
// Should validate deviceId matches session
```

---

### 7. DoS Prevention
**Check:**
```javascript
// Large payload attack
sendMessage("A".repeat(1000000)); // 1MB message

// Connection spam
for (let i = 0; i < 1000; i++) {
  new WebSocket('ws://localhost:3333');
}

// Should have limits
```

---

## 🧪 Functional Tests

### Test Script:
```javascript
// test-suite.js
const tests = [
  {
    name: "User can enter name and age",
    test: async () => {
      await page.type('input[name="name"]', 'Alice');
      await page.type('input[name="age"]', '25');
      await page.click('input[type="checkbox"]');
      await page.click('button:contains("Start")');
    }
  },
  {
    name: "Safety modal appears",
    test: async () => {
      const modal = await page.waitForSelector('.safety-modal');
      expect(modal).toBeTruthy();
    }
  },
  {
    name: "Permission modal appears after safety",
    test: async () => {
      await page.click('button:contains("I Accept")');
      const permModal = await page.waitForSelector('.permission-modal');
      expect(permModal).toBeTruthy();
    }
  },
  {
    name: "Two users can match",
    test: async () => {
      // Open two browsers
      const browser1 = await puppeteer.launch();
      const browser2 = await puppeteer.launch();
      
      // Both start video chat
      await startChat(browser1, 'Alice', 25);
      await startChat(browser2, 'Bob', 30);
      
      // Wait for match
      await browser1.waitForSelector('.matched-badge');
      await browser2.waitForSelector('.matched-badge');
    }
  },
  {
    name: "Chat messages work",
    test: async () => {
      await page.click('.chat-button');
      await page.type('.chat-input', 'Hello!');
      await page.press('.chat-input', 'Enter');
      
      // Check message appears
      const msg = await page.$eval('.message', el => el.textContent);
      expect(msg).toContain('Hello!');
    }
  },
  {
    name: "Skip button works",
    test: async () => {
      await page.click('.skip-button');
      await page.waitForSelector('.finding-match');
      // Should start looking for new match
    }
  },
  {
    name: "Camera toggle works",
    test: async () => {
      const videoTrack = await getVideoTrack();
      expect(videoTrack.enabled).toBe(true);
      
      await page.click('.camera-toggle');
      expect(videoTrack.enabled).toBe(false);
    }
  },
  {
    name: "Microphone toggle works",
    test: async () => {
      const audioTrack = await getAudioTrack();
      expect(audioTrack.enabled).toBe(true);
      
      await page.click('.mic-toggle');
      expect(audioTrack.enabled).toBe(false);
    }
  },
];

// Run all tests
tests.forEach(test => runTest(test));
```

---

## 📊 Performance Tests

### 1. Load Testing
```bash
# Install artillery
npm install -g artillery

# Create load test
artillery quick --count 100 --num 10 \
  http://localhost:3333/health

# Simulate 100 users connecting
```

### 2. Memory Monitoring
```bash
# Monitor backend memory
while true; do
  ps aux | grep node | awk '{print $6}'
  sleep 5
done

# Should stay stable, not grow indefinitely
```

### 3. WebSocket Connections
```bash
# Check max connections
for i in {1..1000}; do
  wscat -c ws://localhost:3333/signaling &
done

# Monitor:
netstat -an | grep 3333 | wc -l
```

---

## 🚨 Critical Edge Cases

### 1. User Opens Multiple Tabs
**Test:**
- Open 3 tabs in same browser
- Start video chat in all 3
- What happens?

**Expected:**
- Should use different device IDs
- Should not interfere with each other

---

### 2. User Refreshes During Call
**Test:**
- Start video call
- Refresh page (F5)
- What happens?

**Expected:**
- Old session cleaned up
- Can start new call
- Peer notified of disconnect

---

### 3. Backend Restarts During Call
**Test:**
- Start video call
- Restart backend: `pm2 restart backend`
- What happens?

**Expected:**
- Users see disconnection
- Can reconnect automatically
- No data loss

---

### 4. Redis Fills Up
**Test:**
```bash
# Fill Redis to max memory
redis-cli config set maxmemory 100mb

# Start many calls until full
# What happens?
```

**Expected:**
- Graceful error handling
- Oldest sessions evicted (LRU)
- Users notified

---

### 5. User Changes Permission Mid-Call
**Test:**
- Start video call
- Open browser settings
- Revoke camera permission
- What happens?

**Expected:**
- UI shows "Camera disabled"
- Call continues with audio only
- No crash

---

## ✅ Pre-Deployment Checklist

### Environment:
- [ ] All environment variables set
- [ ] `.env` files not in git
- [ ] Secrets properly secured
- [ ] HTTPS enabled
- [ ] SSL certificates valid

### Backend:
- [ ] Redis connection working
- [ ] TURN server accessible
- [ ] WebSocket working on HTTPS
- [ ] CORS configured correctly
- [ ] Rate limiting enabled
- [ ] Logging working
- [ ] Metrics endpoint accessible
- [ ] Health check endpoint working

### Frontend:
- [ ] API_URL points to production
- [ ] WS_URL uses wss:// (not ws://)
- [ ] No console.logs in production
- [ ] Error boundaries in place
- [ ] Loading states working
- [ ] Build optimization enabled
- [ ] Assets compressed

### Security:
- [ ] JWT secret is strong
- [ ] TURN server uses authentication
- [ ] No sensitive data in tokens
- [ ] Input validation everywhere
- [ ] XSS protection enabled
- [ ] CSRF tokens if needed
- [ ] Rate limiting working
- [ ] SQL injection tests passed

### Testing:
- [ ] All critical paths tested
- [ ] Browser compatibility verified
- [ ] Mobile testing done
- [ ] Network failure scenarios tested
- [ ] Load testing completed
- [ ] Memory leaks checked
- [ ] Security scan done

### Monitoring:
- [ ] Error tracking (Sentry)
- [ ] Analytics (Google Analytics)
- [ ] Metrics dashboard (Grafana)
- [ ] Alerts configured
- [ ] Logs centralized
- [ ] Uptime monitoring

### Legal:
- [ ] Terms of Service live
- [ ] Privacy Policy live
- [ ] Cookie consent (if EU users)
- [ ] Age verification (18+)
- [ ] GDPR compliance (if EU)
- [ ] COPPA compliance (if US)

---

## 🔧 Quick Test Commands

```bash
# Backend health
curl https://your-domain.com/health

# WebSocket test
wscat -c wss://your-domain.com/signaling

# Load test
artillery quick --count 50 --num 5 https://your-domain.com

# Security scan
npm audit
snyk test

# Memory leak test
node --inspect app.js
# Open chrome://inspect
# Take heap snapshots

# Redis monitoring
redis-cli monitor

# Check logs
tail -f /var/log/app/error.log
```

---

## 📝 Test Report Template

```markdown
# Test Report - [Date]

## Environment
- OS: macOS/Windows/Linux
- Browser: Chrome 120
- Network: WiFi/4G/5G

## Tests Performed
✅ Passed: 45
❌ Failed: 2
⚠️  Warning: 3

## Critical Bugs Found
1. **Memory leak in video stream**
   - Severity: High
   - Steps to reproduce: ...
   - Fix: ...

2. **Skip button rate limit not working**
   - Severity: Medium
   - Steps to reproduce: ...
   - Fix: ...

## Performance
- Average match time: 2.3s
- Memory usage: 150MB (stable)
- CPU usage: 15% average
- WebSocket latency: 50ms

## Recommendations
- [ ] Fix memory leak before deployment
- [ ] Add more error logging
- [ ] Increase rate limit slightly
```

---

## 🚀 Final Pre-Launch Command

```bash
# Run this before deployment
./pre-deployment-check.sh

# It should check:
# - All tests pass
# - No console errors
# - Build successful
# - Security scan clean
# - Performance acceptable
```

---

**Don't deploy until ALL critical tests pass!** 🛑

