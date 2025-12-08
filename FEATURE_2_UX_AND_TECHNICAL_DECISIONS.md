# 🎮 Feature #2: UX, User Flow & Technical Decisions

## Part 1: WHERE & HOW TO SHOW GAMES

### **Entry Point 1: Idle Conversation Detection** (PRIMARY) ⭐

**Trigger:** 30 seconds of no messages in current call

```
SCENARIO:
User A: "Hey what's up?"
User B: "Not much, hbu?"
[30 seconds of silence...]
→ "Break the ice?" banner appears at bottom
```

**Why this works:**
- Non-intrusive (doesn't pop up for engaged conversations)
- Natural timing (when conversation is actually slowing)
- User can dismiss easily
- Matches Monkey's approach

**Implementation:**
```typescript
// frontend/src/hooks/useIdleGameSuggestion.ts
const [lastMessageTime, setLastMessageTime] = useState(Date.now());

useEffect(() => {
  const interval = setInterval(() => {
    const timeSinceLastMessage = Date.now() - lastMessageTime;

    if (timeSinceLastMessage > 30000 && !gameInProgress) {
      setSuggestGame(true); // Show suggestion
    }
  }, 5000); // Check every 5 seconds
}, [lastMessageTime]);

// Reset timer when message is sent
const handleMessageSent = (message) => {
  socket.emit('send-message', { message });
  setLastMessageTime(Date.now());
  setSuggestGame(false); // Hide suggestion if shown
};
```

---

### **Entry Point 2: Explicit Button** (SECONDARY)

**Location:** In chat panel, next to send button

```
[Message Input Field] [Send 💬] [🎮 Play Game]
```

**Why include it:**
- Users might want to play even if conversation is flowing
- Gives control to user
- No gatekeeping based on time

**Implementation:**
```jsx
<div className="chat-actions">
  <input placeholder="Type message..." />
  <button onClick={sendMessage}>💬 Send</button>
  <button onClick={inviteToGame}>🎮 Play</button>
</div>
```

---

### **Entry Point 3: After Match Completes** (TERTIARY)

**When:** First match ends, before next match starts

```
"Great match! 👋"
[Send Gift 🎁] [Play Again? 🎮] [Find New Match →]
```

**Why:**
- Users might want to continue relationship
- Soft CTA without being pushy
- Captures momentum

---

## Part 2: COMPLETE USER FLOW

### **Flow 1: Idle Detection → Game Start**

```
┌─────────────────────────────────────┐
│  VIDEO CALL IN PROGRESS             │
│  User A & User B connected          │
└─────────────────────────────────────┘
              ↓
    [30s of no messages]
              ↓
┌─────────────────────────────────────┐
│ "Breaking silence? 🎮 Play a game"  │
│ [🎲 Tic-Tac-Toe +50] [🎯 Trivia +75]│
│ [💬 Truth-Dare +60]  [✕ Dismiss]    │
└─────────────────────────────────────┘
              ↓
    User A clicks: 🎲 Tic-Tac-Toe
              ↓
┌─────────────────────────────────────┐
│ User B receives:                    │
│ "User A wants to play Tic-Tac-Toe!" │
│ [✓ Accept] [✗ Decline]              │
│ (Auto-decline in 15s)               │
└─────────────────────────────────────┘
              ↓
    User B clicks: ✓ Accept
              ↓
┌─────────────────────────────────────┐
│ GAME BOARD OVERLAY                  │
│ ☐ ☒ ☐                              │
│ ☐ ☐ ☐                              │
│ ☐ ☐ ☐                              │
│                                     │
│ You: 0 | User A: 0 (Your turn)     │
└─────────────────────────────────────┘
              ↓
    [User plays tic-tac-toe]
              ↓
┌─────────────────────────────────────┐
│ ☒ ☒ ☒  ← User A WINS!              │
│ ☐ ☒ ☐                              │
│ ☐ ☐ ☐                              │
│                                     │
│ 🏆 +50 COINS EARNED!                │
│ [Play Again?] [Back to Chat]        │
└─────────────────────────────────────┘
              ↓
    User A clicks: Back to Chat
              ↓
┌─────────────────────────────────────┐
│ GAME COMPLETED - GIFT SUGGESTION    │
│                                     │
│ Send a gift to celebrate? 🎁        │
│ [Rose 🌹] [Heart ❤️] [Ring 💍]     │
│ [Skip]                              │
└─────────────────────────────────────┘
```

---

### **Flow 2: Explicit Game Button**

```
User clicks 🎮 Play button anytime
    ↓
Game menu: [Tic-Tac-Toe] [Trivia] [Truth-Dare] [Cancel]
    ↓
Send invite to peer
    ↓
Peer accepts/declines
    ↓
Play or return to chat
```

---

### **Flow 3: Multiple Games in One Session**

```
Game 1: Tic-Tac-Toe → User A wins +50
    ↓ (15 min later, idle again)
Game 2: Trivia → User A wins +75
    ↓ (5 min later, user clicks game button)
Game 3: Truth-Dare → User B completes +60
    ↓
End call
```

**Session Stats:**
- 3 games played
- 185 coins earned
- 80 min call duration
- 2 gifts sent

---

## Part 3: RANDOMIZATION STRATEGY

### **Game Selection Algorithm**

```typescript
async selectGameForSuggestion(
  user1Id: string,
  user2Id: string,
  sessionDurationMinutes: number,
  lastGamePlayed?: string
): Promise<GameType>
```

### **Randomization Rules (in priority order)**

#### **1. Prevent Repetition** (Highest Priority)
```typescript
// Don't play same game 2x in a row
if (lastGamePlayed === 'tic-tac-toe') {
  availableGames = ['trivia', 'truth-dare', '20-questions'];
} else {
  availableGames = ['tic-tac-toe', 'trivia', 'truth-dare', '20-questions'];
}
```

**Why:** Game fatigue - players want variety

---

#### **2. Session Duration Matching**
```typescript
// Quick games for quick sessions
if (sessionDurationMinutes < 1) {
  // Less than 1 minute remaining
  suggestedGames = ['tic-tac-toe', 'truth-dare']; // Fast
} else if (sessionDurationMinutes < 3) {
  // 1-3 minutes
  suggestedGames = ['tic-tac-toe', 'trivia', 'truth-dare'];
} else {
  // 3+ minutes
  suggestedGames = ['tic-tac-toe', 'trivia', 'truth-dare', '20-questions'];
}
```

**Why:** Match time constraints

---

#### **3. Weighted Probability**
```typescript
// Favor games user hasn't played (70% weight)
const weights = {
  'tic-tac-toe': user1PlayHistory.includes('tic-tac-toe') ? 30 : 70,
  'trivia': user1PlayHistory.includes('trivia') ? 30 : 70,
  'truth-dare': user1PlayHistory.includes('truth-dare') ? 30 : 70,
};

// Pick random based on weights
function pickRandom(games, weights) {
  const totalWeight = Object.values(weights).reduce((a, b) => a + b);
  let random = Math.random() * totalWeight;

  for (const game of games) {
    random -= weights[game];
    if (random <= 0) return game;
  }
}
```

**Why:** New games feel fresh

---

#### **4. Skill-Based Difficulty**
```typescript
// Get user's win rate
const userWinRate = userStats.wins / userStats.totalGames;

if (userWinRate > 0.65) {
  // Good player: harder trivia questions
  triviaQuestions = HARD_QUESTIONS;
} else if (userWinRate < 0.35) {
  // Struggling player: easier questions
  triviaQuestions = EASY_QUESTIONS;
} else {
  triviaQuestions = MEDIUM_QUESTIONS;
}
```

**Why:** Balanced challenge keeps users engaged

---

#### **5. Time of Day Preference**
```typescript
const hour = new Date().getHours();

if (hour >= 6 && hour < 12) {
  // Morning: brain is sharp, favor trivia
  weights.trivia = 80;
  weights['tic-tac-toe'] = 40;
} else if (hour >= 12 && hour < 17) {
  // Afternoon: energy dip, favor quick games
  weights['tic-tac-toe'] = 80;
  weights.trivia = 40;
} else {
  // Evening: favor thoughtful games
  weights['truth-dare'] = 80;
  weights['20-questions'] = 80;
}
```

**Why:** Align with user energy levels

---

#### **6. Peer History**
```typescript
// Track what peer declined
if (peer.declinedGames.includes('trivia')) {
  // Peer doesn't like trivia, reduce weight
  weights.trivia *= 0.3; // 70% reduction
}
```

**Why:** Learn user preferences

---

### **Example Randomization in Action**

```
User A & B matched
├─ Session duration: 8 minutes remaining
├─ User A last game: tic-tac-toe (30 min ago)
├─ User A win rate: 58% (medium)
├─ Current time: 6:45 PM (evening)
├─ Peer (B) declined trivia last time
│
├─ Available: ['trivia', 'truth-dare', '20-questions']
│  (tic-tac-toe excluded - just played)
│
├─ Weights:
│  ├─ trivia: 70 - 21 (peer declined) = 49 (low)
│  ├─ truth-dare: 70 + 10 (evening) = 80 (high)
│  └─ 20-questions: 70 + 10 (evening) = 80 (high)
│
└─ Random pick: truth-dare ✓
```

---

## Part 4: WHICH APIs TO UTILIZE

### **Tier 1: Already Integrated (Use These!)**

#### **1. Stripe** ✅ MUST USE
**For:** Coin purchases

```typescript
// Coin purchase options:
const COIN_BUNDLES = [
  { coins: 100, priceId: 'price_..._100', usd: 0.99 },
  { coins: 500, priceId: 'price_..._500', usd: 4.99 },
  { coins: 1000, priceId: 'price_..._1000', usd: 9.99 },
  { coins: 2500, priceId: 'price_..._2500', usd: 19.99, bonus: '✨ +250 bonus' },
];

// Backend webhook: charge.succeeded
// Add gems to wallet.gemsBalance
```

**Why:** Already have billing infrastructure
**Cost:** 2.9% + $0.30 per transaction

---

#### **2. Firebase Cloud Messaging** ✅ SHOULD USE
**For:** Push notifications

```typescript
// Scenarios:
1. Game invite
   "Sarah wants to play Tic-Tac-Toe! 🎲"

2. Mission completed
   "Daily Mission Complete! +100 coins 🎉"

3. Friend won leaderboard
   "Your friend Alex ranked #5 weekly! 🏆"

4. Streak milestone
   "5-day streak! 🔥 Claim +200 bonus coins"
```

**Why:** Free (already using Firebase), high engagement ROI
**Cost:** FREE (included in Firebase)
**Implementation:**
```typescript
// games.gateway.ts
const messaging = admin.messaging();

await messaging.send({
  notification: {
    title: 'Game Invite',
    body: `${opponentName} wants to play ${gameType}!`
  },
  data: {
    gameId: game.id,
    action: 'game_invite'
  },
  token: userFCMToken // stored in user profile
});
```

---

#### **3. Socket.io** ✅ ALREADY USING
**For:** Real-time game state sync

We're already using this! No additional setup needed.

---

#### **4. Redis** ✅ ALREADY USING
**For:** Leaderboard caching, game state caching

We're already using this! Use for:
- Leaderboard rankings (cache for 1 hour)
- Active game state (cache for session duration)
- User session data (coins, streaks)

---

#### **5. Amplitude** ✅ OPTIONAL BUT GOOD
**For:** Analytics & user behavior tracking

```typescript
// Events to track:
amplitude.track({
  userId,
  eventType: 'game_suggested',
  eventProperties: {
    gameType: 'tic-tac-toe',
    trigger: 'idle_detection', // or 'explicit_button'
    sessionDuration: 180,
    timeSinceLastMessage: 30
  }
});

amplitude.track({
  userId,
  eventType: 'game_declined',
  eventProperties: {
    gameType,
    reason: 'timeout', // or 'explicit_decline'
  }
});

amplitude.track({
  userId,
  eventType: 'game_won',
  eventProperties: {
    gameType,
    coinsEarned: 50,
    duration: 120,
    opponent: opponentId,
  }
});
```

**Why:** Understand what games convert, what times work best, drop-off points
**Cost:** FREE (up to 50K MTU)

---

### **Tier 2: Could Add (Optional Enhancement)**

#### **6. Hume AI** - Emotion Detection (Experimental)
**For:** Novelty feature - "AI reads your emotions during games"

```typescript
// During game:
// Detect user's facial emotions
// If angry → offer easier game
// If bored → suggest more challenging game
// Show "AI Matchmaker" feature in marketing

const emotionResult = await hume.detect(videoFrame);
// Returns: happy, sad, angry, surprised, neutral, etc.

if (emotionResult.angry > 0.7) {
  // Switch to easier game
  gameService.adjustDifficulty('easy');
}
```

**Cost:** $3-900/month (depends on usage)
**ROI:** Medium - cool feature but doesn't drive revenue
**Recommendation:** Skip for now, add in Phase 2

---

#### **7. Cloudinary** - Image CDN (Enhancement)
**For:** Serve gift images from CDN instead of storing locally

```typescript
// Current: avatarUrl stored as JSON in DB
// Better: Use Cloudinary for images

const gift = {
  name: 'Rose',
  imageUrl: 'https://res.cloudinary.com/paircam/image/upload/v1/gifts/rose.png'
};

// Benefits:
// - Faster delivery globally
// - Image optimization (WebP, auto-resize)
// - Storage doesn't count toward DB

// But: We can use ANY CDN or just store URLs to S3
```

**Cost:** FREE (up to 25K images)
**ROI:** Low - not critical path
**Recommendation:** Skip, use Vercel CDN or S3

---

#### **8. LaunchDarkly** - Feature Flags (Optional)
**For:** A/B test game features

```typescript
const flags = await launchDarkly.getFlags(userId);

if (flags.showNewGamesUI) {
  // Show new UI for 50% of users
  return <GameNewUI />;
} else {
  return <GameOldUI />;
}

// Track which users convert better
// Gradually roll out to 100%
```

**Cost:** $4-24/month
**ROI:** Medium - helps optimize features
**Recommendation:** Nice to have, implement in Phase 3

---

### **Tier 3: DO NOT USE (Why)**

#### ❌ **Twilio Video**
**Why not:** Already using WebRTC directly. Twilio adds cost + latency
**Cost:** $0.01/minute

#### ❌ **PubNub** (Real-time)
**Why not:** Socket.io + Redis already handles this
**Cost:** $200+/month

#### ❌ **Auth0**
**Why not:** Have JWT already. Auth0 overkill for consumer app
**Cost:** $35+/month

#### ❌ **SendGrid** (Email)
**Why not:** Games don't need email marketing (yet)
**Cost:** $10+/month

#### ❌ **Stripe Atlas**
**Why not:** Not forming a company
**Cost:** $500

---

## Part 5: TECHNICAL ARCHITECTURE DIAGRAM

```
┌─────────────────────────────────────────────────────────────┐
│                      FRONTEND (React)                        │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│  ┌─────────────────┐      ┌──────────────────┐              │
│  │ GameSuggestion  │      │  useIdleDetection│              │
│  │ Component       │◄─────│  (30s no message)│              │
│  └────────┬────────┘      └──────────────────┘              │
│           │                                                   │
│  ┌────────▼────────┐      ┌──────────────────┐              │
│  │ Game Selection  │◄─────│  useRandomization│              │
│  │ (tic-tac-toe,   │      │  (avoid repeat,  │              │
│  │  trivia, etc.)  │      │   session time)  │              │
│  └────────┬────────┘      └──────────────────┘              │
│           │                                                   │
│           └────────┬───────────────────────────┐             │
│                    │                           │             │
│         ┌──────────▼─────────┐    ┌───────────▼──────┐      │
│         │  Socket.io Events  │    │  REST API Calls  │      │
│         │  (real-time moves) │    │  (Stripe, data)  │      │
│         └──────────┬─────────┘    └───────────┬──────┘      │
│                    │                          │             │
└────────────────────┼──────────────────────────┼─────────────┘
                     │                          │
┌────────────────────┼──────────────────────────┼─────────────┐
│                    │      BACKEND (NestJS)    │             │
├────────────────────┼──────────────────────────┼─────────────┤
│                    │                          │             │
│   ┌────────────────▼──────────────┐           │             │
│   │    GamesGateway (Socket.io)   │           │             │
│   │  ┌──────────────────────────┐ │           │             │
│   │  │ Handle game moves        │ │           │             │
│   │  │ Broadcast state          │ │           │             │
│   │  │ Send coins/rewards       │ │           │             │
│   │  └──────────────────────────┘ │           │             │
│   └──────────┬─────────────────────┘           │             │
│              │                                 │             │
│   ┌──────────▼──────────────────────────────────▼───┐       │
│   │           Services Layer (Business Logic)       │       │
│   ├──────────────────────────────────────────────────┤       │
│   │ GameService       │ WalletService  │ GiftService│       │
│   │ MissionService    │ LeaderboardSvc │            │       │
│   └──────────┬────────┬────────────────┬────────────┘       │
│              │        │                │                    │
│   ┌──────────▼───┐  ┌─▼─────────┐  ┌──▼──────────┐         │
│   │  PostgreSQL  │  │   Redis   │  │  Firebase   │         │
│   │  DB Persist  │  │  Caching  │  │  Cloud      │         │
│   │              │  │ (game     │  │  Messaging  │         │
│   │ - GameSession│  │  state,   │  │  (push)     │         │
│   │ - UserWallet │  │ leaderbd) │  │             │         │
│   │ - Missions   │  │           │  │             │         │
│   │ - Gifts      │  │           │  │             │         │
│   └──────────────┘  └───────────┘  └─────────────┘         │
│                            ▲                                 │
│         ┌──────────────────┴─────────────────┐              │
│         │                                    │              │
│   ┌─────▼────────┐                   ┌──────▼───────┐      │
│   │   Amplitude  │                   │    Stripe    │      │
│   │  (Analytics) │                   │  (Payments)  │      │
│   └──────────────┘                   └──────────────┘      │
│                                                              │
└──────────────────────────────────────────────────────────────┘
```

---

## Part 6: IMPLEMENTATION PRIORITY

### **MVP (Must Have)**
- ✅ Idle detection (30s)
- ✅ Game suggestion banner
- ✅ Tic-tac-toe logic
- ✅ Coin rewards
- ✅ Wallet display
- ✅ Socket.io game sync

### **Phase 1 (Should Have)**
- ✅ Trivia questions
- ✅ Daily missions
- ✅ Leaderboard
- ✅ Gift sending
- Firebase Cloud Messaging (push notifications)
- Amplitude tracking

### **Phase 2 (Nice to Have)**
- Skill-based difficulty
- More game types (20-questions, advanced)
- Time-of-day preferences
- Peer history learning
- Hume AI emotions

---

## FINAL RECOMMENDATION

**APIs to implement NOW:**
1. ✅ Stripe (coin purchases) - Already integrated
2. ✅ Firebase Cloud Messaging (push) - Easy add
3. ✅ Amplitude (analytics) - Good ROI
4. ✅ Socket.io (real-time) - Already using
5. ✅ Redis (caching) - Already using

**APIs to skip:**
- ❌ Hume AI (too experimental)
- ❌ Cloudinary (nice-to-have CDN)
- ❌ LaunchDarkly (implement later if needed)
- ❌ Other payment processors (Stripe is enough)

**Randomization approach:**
- Start simple: avoid last game, session duration
- Add complexity later: skill-based, time-of-day, peer history

**Show games where:**
- Primary: Idle detection (30s)
- Secondary: Explicit button
- Tertiary: Match complete screen

This gives **maximum engagement with minimum complexity**. Does this match your vision?
