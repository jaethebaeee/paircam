# PairCam Trivia Battle API Documentation

## Overview

The Trivia Battle game system provides real-time multiplayer trivia games integrated into PairCam's video chat platform. This document covers both WebSocket (real-time) and HTTP (admin analytics) APIs.

---

## WebSocket API

### Connection

```javascript
// Connect to /signaling namespace (shared with video signaling)
const socket = io('https://api.paircam.live/signaling', {
  auth: {
    token: 'your-jwt-token'
  }
});
```

### Events: Client → Server

#### **start-game**
Initialize a new trivia game between two connected users.

```javascript
socket.emit('start-game', {
  sessionId: 'current-session-uuid',
  difficulty: 'medium' // 'easy' | 'medium' | 'hard'
});
```

**Response:** `game-started` event

**Errors:**
- `BadRequestException`: Missing required fields
- `BadRequestException`: Daily game limit exceeded (shows remaining games)
- `BadRequestException`: Hard difficulty requires premium
- `NotFoundException`: Session not found

#### **submit-answer**
Submit answer to current trivia question.

```javascript
socket.emit('submit-answer', {
  gameSessionId: 'game-session-uuid',
  sessionId: 'current-session-uuid',
  questionNumber: 1,
  answer: 'user-selected-answer', // Must match one of the options
  timeSpent: 8 // Seconds spent on this question
});
```

**Response:** `score-update` → `new-question` (or `game-ended` if final question)

#### **abandon-game**
User manually quits game early.

```javascript
socket.emit('abandon-game', {
  gameSessionId: 'game-session-uuid',
  sessionId: 'current-session-uuid'
});
```

**Response:** `game-abandoned` event sent to peer

### Events: Server → Client

#### **game-started**
Game initialization with first question.

```javascript
socket.on('game-started', {
  gameSessionId: 'uuid',
  totalQuestions: 10,
  timePerQuestion: 15, // 15 for free, 20 for premium
  isPremium: false,
  scoreMultiplier: 1.0, // 1.0 for free, 1.25 for premium
  showAds: true // true for free, false for premium
});
```

#### **new-question**
Next trivia question (sent after game-started and each answer).

```javascript
socket.on('new-question', {
  questionNumber: 1,
  totalQuestions: 10,
  question: 'What is the capital of France?',
  options: ['Paris', 'London', 'Berlin', 'Madrid'], // Shuffled
  timeLimit: 15 // Seconds to answer
});
```

#### **score-update**
Live score update after answer submission.

```javascript
socket.on('score-update', {
  user1Score: 80, // With premium multiplier applied if applicable
  user2Score: 60
});
```

#### **game-ended**
Game completion with final scores and winner.

```javascript
socket.on('game-ended', {
  winnerId: 'user-id',
  user1Score: 140, // Final score with premium multiplier
  user2Score: 100
});
```

#### **error**
Error during game (rate limit, validation, etc).

```javascript
socket.on('error', {
  message: 'Daily game limit reached',
  requiresPremium: true,
  gamesPlayedToday: 10,
  dailyLimit: 10,
  remainingText: 'Upgrade to premium for unlimited games!'
});
```

---

## HTTP API (Admin Analytics)

All admin endpoints require `JwtAuthGuard` authentication.

### Endpoints

#### **GET /games/analytics**
Get overall game statistics and business metrics.

**Query Parameters:**
- `timeRange`: `'1h'` | `'24h'` | `'7d'` (default: `'24h'`)

**Response:**
```json
{
  "timeRange": "24h",
  "metrics": {
    "totalGames": 1250,
    "completedGames": 1100,
    "abandonedGames": 150,
    "averageGameDuration": 245,
    "averageScore": 78.5,
    "difficultyDistribution": {
      "easy": 500,
      "medium": 600,
      "hard": 150
    },
    "totalGamesDatabase": 5000,
    "completedGamesDatabase": 4500
  },
  "users": {
    "total": 2500,
    "premium": 375,
    "free": 2125,
    "conversionRate": 15.0
  },
  "timestamp": "2025-12-08T10:30:00Z"
}
```

---

#### **GET /games/leaderboard**
Get top players by wins or average score.

**Query Parameters:**
- `limit`: Number of results (default: 50, max: 100)
- `sortBy`: `'wins'` | `'score'` | `'gamesPlayed'` (default: `'wins'`)

**Response:**
```json
{
  "sortBy": "wins",
  "limit": 50,
  "leaderboard": [
    {
      "userId": "user-uuid-1",
      "gamesPlayed": 156,
      "wins": 98,
      "losses": 58,
      "totalScore": 12840,
      "averageScore": 82.3,
      "winRate": 62.8
    },
    {
      "userId": "user-uuid-2",
      "gamesPlayed": 142,
      "wins": 87,
      "losses": 55,
      "totalScore": 11260,
      "averageScore": 79.3,
      "winRate": 61.3
    }
  ],
  "timestamp": "2025-12-08T10:30:00Z"
}
```

---

#### **GET /games/user/stats**
Get personal game statistics for authenticated user.

**Response:**
```json
{
  "user": {
    "id": "user-uuid",
    "deviceId": "device-fingerprint",
    "isPremium": true,
    "createdAt": "2025-12-01T00:00:00Z"
  },
  "gameStats": {
    "gamesPlayed": 45,
    "wins": 28,
    "losses": 17,
    "winRate": 62.2,
    "totalScore": 3580,
    "averageScore": 79.6,
    "totalCorrectAnswers": 356,
    "totalQuestions": 450,
    "accuracy": 79.1
  },
  "premiumStatus": {
    "isPremium": true,
    "gamesRemainingToday": 35,
    "dailyLimit": 50
  },
  "analyticsStats": {
    "gamesPlayed": 45,
    "wins": 28,
    "correctAnswers": 356,
    "incorrectAnswers": 94,
    "averageScore": 79.6,
    "averageResponseTime": 9.8
  },
  "timestamp": "2025-12-08T10:30:00Z"
}
```

---

#### **GET /games/difficulty-stats**
Get game statistics broken down by difficulty level.

**Response:**
```json
{
  "difficultyStats": {
    "easy": {
      "total": 2000,
      "completed": 1900,
      "avgDuration": 180,
      "avgScore": 88.5
    },
    "medium": {
      "total": 2400,
      "completed": 2200,
      "avgDuration": 240,
      "avgScore": 75.3
    },
    "hard": {
      "total": 600,
      "completed": 500,
      "avgDuration": 300,
      "avgScore": 62.8
    }
  },
  "timestamp": "2025-12-08T10:30:00Z"
}
```

---

#### **GET /games/premium-metrics**
Get premium subscription and engagement metrics.

**Response:**
```json
{
  "users": {
    "total": 2500,
    "premium": 375,
    "free": 2125,
    "conversionRate": 15.0
  },
  "games": {
    "total": 5000,
    "playedByPremium": 2100,
    "playedByFree": 2900,
    "premiumEngagementRatio": 42.0
  },
  "averageGamesPerUser": {
    "premium": 5.6,
    "free": 1.4
  },
  "timestamp": "2025-12-08T10:30:00Z"
}
```

---

#### **GET /games/feature-comparison**
Get feature comparison between free and premium tiers.

**Response:**
```json
{
  "features": [
    {
      "feature": "Daily Games",
      "free": "10 games",
      "premium": "50 games"
    },
    {
      "feature": "Time per Question",
      "free": "15 seconds",
      "premium": "20 seconds (+5s)"
    },
    {
      "feature": "Difficulty Levels",
      "free": "Easy, Medium",
      "premium": "Easy, Medium, Hard"
    },
    {
      "feature": "Score Boost",
      "free": "Standard",
      "premium": "+25% multiplier"
    },
    {
      "feature": "Bonus Points",
      "free": "None",
      "premium": "+5 per correct answer"
    },
    {
      "feature": "Ads",
      "free": "Yes",
      "premium": "No ads"
    }
  ],
  "timestamp": "2025-12-08T10:30:00Z"
}
```

---

## Game Scoring

### Base Scoring
- **10 points** per correct answer
- **10 questions** per game

### Premium Multipliers
- **Score Multiplier**: 1.25x base score
- **Bonus Points**: +5 per correct answer
- **Extra Time**: +5 seconds per question (20 total vs 15 for free)

### Example
**Free User (8/10 correct):**
```
baseScore = 8 × 10 = 80 points
finalScore = 80 × 1.0 = 80 points
```

**Premium User (8/10 correct):**
```
baseScore = 8 × 10 = 80 points
finalScore = (80 × 1.25) + (8 × 5) = 100 + 40 = 140 points
```

---

## Premium Features

### Daily Game Limits
- **Free**: 10 games per day
- **Premium**: 50 games per day
- Limits reset at midnight (user's timezone)

### Difficulty Restrictions
- **Free**: Easy & Medium only
- **Premium**: Easy, Medium & Hard

### Time Per Question
- **Free**: 15 seconds
- **Premium**: 20 seconds (+5 seconds bonus)

---

## Error Handling

### Game Limit Exceeded (Free)
```json
{
  "statusCode": 400,
  "message": "Daily game limit reached",
  "requiresPremium": true,
  "gamesPlayedToday": 10,
  "dailyLimit": 10,
  "remainingText": "Upgrade to premium for unlimited games! You've played 10 games today."
}
```

### Difficulty Not Available (Free)
```json
{
  "statusCode": 400,
  "message": "Hard difficulty requires premium subscription",
  "requiresPremium": true,
  "difficulty": "hard"
}
```

### Network/API Errors
```json
{
  "message": "Failed to load trivia questions. Please try again.",
  "error": "Could not fetch questions from trivia service"
}
```

---

## Analytics Tracking

### Events Tracked

**Game Events:**
- `game-created` - New game started
- `answer-submitted` - Answer submitted with correctness
- `game-completed` - Game finished with results
- `game-abandoned` - User quit early

**Metrics:**
- Total games played
- Games by difficulty
- Completion rate
- Skip rate
- Average duration
- Average score
- User accuracy
- Premium vs Free engagement

### Real-time Metrics
- Games played today (per user)
- Daily remaining games
- Win/loss ratio
- Average response time

---

## Integration Example (Frontend)

```typescript
// Initialize game
socket.emit('start-game', {
  sessionId: currentSessionId,
  difficulty: 'medium'
});

// Listen for game start
socket.on('game-started', (data) => {
  console.log(`Premium: ${data.isPremium}`);
  console.log(`Time per question: ${data.timePerQuestion}s`);
  console.log(`Score multiplier: ${data.scoreMultiplier}x`);
  console.log(`Show ads: ${data.showAds}`);
});

// Listen for questions
socket.on('new-question', (data) => {
  displayQuestion(data.question);
  displayOptions(data.options);
  startTimer(data.timeLimit);
});

// Submit answer
const handleAnswerSelect = (answer) => {
  socket.emit('submit-answer', {
    gameSessionId,
    sessionId,
    questionNumber,
    answer,
    timeSpent: 15 - remainingTime
  });
};

// Listen for scores
socket.on('score-update', (data) => {
  updateScores(data.user1Score, data.user2Score);
});

// Listen for game end
socket.on('game-ended', (data) => {
  celebrateWinner(data.winnerId);
  showFinalScores(data.user1Score, data.user2Score);
});

// Handle errors
socket.on('error', (error) => {
  if (error.requiresPremium) {
    showPremiumUpgradeModal(error.remainingText);
  } else {
    showErrorMessage(error.message);
  }
});
```

---

## Rate Limiting

- **Game Start**: Max 1 game start per 2 seconds (prevents spam)
- **Answer Submission**: Max 1 per 1 second per question
- **Daily Limits**:
  - Free: 10 games/day
  - Premium: 50 games/day

---

## Database Schema

### GameSession Table
```sql
CREATE TABLE game_sessions (
  id UUID PRIMARY KEY,
  session_id VARCHAR NOT NULL,
  user1_id UUID NOT NULL REFERENCES users(id),
  user2_id UUID NOT NULL REFERENCES users(id),
  game_config JSONB NOT NULL,
  user1_results JSONB,
  user2_results JSONB,
  winner_id UUID,
  duration_seconds INT DEFAULT 0,
  started_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  completed_at TIMESTAMP,
  abandoned_by UUID,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

  INDEX (session_id),
  INDEX (user1_id),
  INDEX (user2_id),
  INDEX (winner_id),
  INDEX (created_at)
);
```

---

## WebSocket Namespace

Both WebSocket signaling (video/audio) and games use the same `/signaling` namespace:
- **Video Signaling Events**: `join-queue`, `send-offer`, `send-message`, etc.
- **Game Events**: `start-game`, `submit-answer`, `game-started`, etc.

This allows efficient resource usage and simplified client connection management.

---

## Performance Considerations

- **Question Fetching**: Cached after first request, expires after 24 hours
- **Daily Game Counters**: Redis with 24-hour TTL
- **Game Sessions**: Redis with 1-hour TTL (auto-cleanup)
- **Leaderboard**: Computed on-demand from database
- **Analytics**: Real-time counters in Redis, archived to database daily

---

## Future Enhancements

- [ ] Leaderboard filtering by time period
- [ ] Player statistics comparison (head-to-head)
- [ ] Achievement/badge system
- [ ] Seasonal tournaments
- [ ] Category-specific trivia
- [ ] Custom trivia creation
- [ ] AI opponent mode
- [ ] Timed ranked mode
