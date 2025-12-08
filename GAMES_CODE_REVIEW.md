# Games Backend Code Review - Comprehensive Error & Efficiency Check

## Critical Issues (Must Fix Before Deployment)

### 1. **Missing Entity Relations - GameSession**
**Severity: HIGH - Runtime Error**
- **File**: `games.controller.ts:94` & `games.gateway.ts`
- **Issue**: Trying to load 'winner' relation that doesn't exist in GameSession entity
- **Code**: `relations: ['player1', 'player2', 'winner']`
- **Problem**: The GameSession entity doesn't have a relation called 'winner'. It has `winnerId` (string), not a relation.
- **Fix**: Remove 'winner' from relations. Use winnerId string directly.

```typescript
// ❌ Wrong
relations: ['player1', 'player2', 'winner']

// ✅ Correct
relations: ['player1', 'player2']
```

---

### 2. **Missing `endedAt` Initialization**
**Severity: MEDIUM - Logic Bug**
- **File**: `game.service.ts:18-43` (startGame method)
- **Issue**: When a game starts, `endedAt` is not initialized. It's only set when game ends.
- **Problem**: Can cause issues with filtering incomplete games, null checks, or calculations
- **Fix**: Initialize `endedAt: null` when creating game

```typescript
const game = this.gameRepo.create({
  sessionId,
  type: gameType,
  player1Id: userId,
  player2Id: peerId,
  state: this.initializeGameState(gameType),
  status: 'in-progress',
  endedAt: null,  // ADD THIS
});
```

---

### 3. **Trivia Game Logic Flaw**
**Severity: MEDIUM - Logic Bug**
- **File**: `game.service.ts:62-71` (Turn validation in makeMove)
- **Issue**: Trivia game validates turns, but both players answer questions simultaneously, not in turns
- **Problem**: Players will get "Not your turn" errors for trivia games
- **Fix**: Skip turn validation for trivia games

```typescript
// Add game-type specific turn validation
if (game.type !== 'trivia') {
  // Check turn validation
  const isPlayer1 = game.player1Id === userId;
  const currentPlayer = game.state.currentPlayer;

  if (
    (isPlayer1 && currentPlayer !== 'p1') ||
    (!isPlayer1 && currentPlayer !== 'p2')
  ) {
    throw new BadRequestException('Not your turn');
  }
}
```

---

### 4. **Race Condition - Wallet Creation**
**Severity: HIGH - Data Integrity**
- **File**: `wallet.service.ts:15-32` (getOrCreateWallet)
- **Issue**: Concurrent calls to `getOrCreateWallet` can create duplicate wallets
- **Scenario**:
  - Thread A: calls `getOrCreateWallet(userId)` → wallet not found
  - Thread B: calls `getOrCreateWallet(userId)` → wallet not found
  - Both threads create wallet → duplicate wallets!
- **Fix**: Use database UNIQUE constraint (already exists) OR use upsert pattern

```typescript
async getOrCreateWallet(userId: string): Promise<UserWallet> {
  // Try to find first
  let wallet = await this.walletRepo.findOne({
    where: { userId },
  });

  if (!wallet) {
    // Use createQueryBuilder with onConflict for PostgreSQL
    const result = await this.walletRepo
      .createQueryBuilder()
      .insert()
      .into(UserWallet)
      .values({
        userId,
        coinsBalance: 0,
        gemsBalance: 0,
        totalCoinsEarned: 0,
        totalCoinsSpent: 0,
        currentStreak: 0,
      })
      .orIgnore()  // If userId already exists, ignore
      .execute();

    wallet = await this.walletRepo.findOne({ where: { userId } });
  }

  return wallet!;
}
```

---

### 5. **Player Validation Missing**
**Severity: MEDIUM - Security/Logic**
- **File**: `game.service.ts:48-71` (makeMove)
- **Issue**: Don't validate that userId is actually one of the two players
- **Problem**: Any user can try to make moves in any game
- **Fix**: Add player validation

```typescript
async makeMove(gameId: string, userId: string, moveData: any) {
  const game = await this.gameRepo.findOne({
    where: { id: gameId },
    relations: ['player1', 'player2'],
  });

  if (!game) {
    throw new NotFoundException(`Game ${gameId} not found`);
  }

  // ADD THIS: Validate user is a player in the game
  const isPlayer1 = game.player1Id === userId;
  const isPlayer2 = game.player2Id === userId;

  if (!isPlayer1 && !isPlayer2) {
    throw new BadRequestException('You are not a player in this game');
  }

  // ... rest of code
}
```

---

### 6. **Missing Move Data Validation**
**Severity: MEDIUM - Error Handling**
- **File**: `game.service.ts:174-186` (applyTicTacToeMove)
- **Issue**: Assumes `moveData.position` exists and is valid, no validation
- **Problem**: If client sends malformed data, will crash or behave unexpectedly
- **Fix**: Validate moveData structure

```typescript
private applyTicTacToeMove(state: any, moveData: any, isPlayer1: boolean) {
  // Validate moveData
  if (!moveData || typeof moveData.position !== 'number') {
    throw new BadRequestException('Invalid move data: position must be a number');
  }

  const position = moveData.position;
  const player = isPlayer1 ? 'X' : 'O';

  // ... rest of code
}
```

---

## Efficiency Issues (Should Optimize Before Production)

### 7. **Trivia Shuffling Algorithm**
**Severity: LOW - Efficiency**
- **File**: `game.service.ts:320`
- **Issue**: `triviaBank.sort(() => Math.random() - 0.5)` is a poor shuffle
- **Problem**: Not properly randomized, biased algorithm
- **Fix**: Use Fisher-Yates shuffle or built-in crypto

```typescript
private generateTriviaQuestions(count: number): any[] {
  const triviaBank = [ /* ... */ ];

  // Fisher-Yates shuffle
  for (let i = triviaBank.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [triviaBank[i], triviaBank[j]] = [triviaBank[j], triviaBank[i]];
  }

  return triviaBank.slice(0, count);
}
```

---

### 8. **Multiple Database Calls Per Move**
**Severity: MEDIUM - Performance**
- **File**: `game.service.ts:48-128` (makeMove)
- **Issue**: Makes 3 database calls per move:
  1. Load game (line 49)
  2. Save move (line 91)
  3. Save game (line 118)
- **Problem**: High latency, especially with many concurrent games
- **Fix**: Use database transactions

```typescript
async makeMove(gameId: string, userId: string, moveData: any) {
  return await this.gameRepo.manager.transaction(async (em) => {
    const gameRepo = em.getRepository(GameSession);
    const moveRepo = em.getRepository(GameMove);

    const game = await gameRepo.findOne({
      where: { id: gameId },
      relations: ['player1', 'player2'],
    });

    // ... apply move logic ...

    // Save both in one transaction
    await moveRepo.save({ gameSessionId: gameId, playerId: userId, move: moveData });
    return await gameRepo.save(game);
  });
}
```

---

### 9. **Inefficient Leaderboard Query**
**Severity: MEDIUM - Performance**
- **File**: `leaderboard.service.ts:101-112`
- **Issue**: N+1 query problem - loads all users in leaderboard one by one
- **Code**: Loop that calls `usersService.findById()` for each leaderboard entry
- **Problem**: For top 100 leaderboard, makes 100+ database calls
- **Fix**: Load all users in one batch query

```typescript
// ❌ Current (N+1):
for (let i = 0; i < results.length; i++) {
  const user = await this.usersService.findById(row.userId);
  // ...
}

// ✅ Better - batch load:
const userIds = results.map(r => r.userId);
const users = await this.usersService.findByIds(userIds); // Need to implement this
const userMap = new Map(users.map(u => [u.id, u]));

for (let i = 0; i < results.length; i++) {
  const user = userMap.get(results[i].userId);
  // ...
}
```

---

### 10. **Inefficient Mission Progress Updates**
**Severity: LOW - Performance**
- **File**: `mission.service.ts:113-150` (updateProgress)
- **Issue**: Calls `rewardCoins()` and `updateStreak()` which each hit database
- **Problem**: Multiple DB calls for one mission completion
- **Fix**: Batch these updates or use transactions

---

### 11. **Redis Caching Loses Date Types**
**Severity: MEDIUM - Data Integrity**
- **File**: `game.service.ts:36-40, 121-125` (Redis cache)
- **Issue**: `JSON.stringify(game)` converts Date objects to ISO strings, loses type info
- **Problem**: Dates become strings when retrieved from cache, type mismatches
- **Fix**: Don't cache the entire game object, or use custom serializers

```typescript
// ❌ Current
await this.redisService.setex(
  `game:${gameId}`,
  3600,
  JSON.stringify(updatedGame),  // Dates become strings
);

// ✅ Better - cache only essential data
const gameCache = {
  id: updatedGame.id,
  type: updatedGame.type,
  status: updatedGame.status,
  state: updatedGame.state,
};
await this.redisService.setex(
  `game:${gameId}`,
  3600,
  JSON.stringify(gameCache),
);
```

---

## Logic & Design Issues

### 12. **No Game Abandonment Logic**
**Severity: MEDIUM - Data Quality**
- **File**: All game services
- **Issue**: Games can hang indefinitely if a player disconnects
- **Problem**: Stale games accumulate in database
- **Fix**: Add timeout/abandon logic

```typescript
// Add to GameSession entity:
@Column({ nullable: true, name: 'abandoned_at' })
abandonedAt?: Date;

// In gateway - on disconnect:
handleDisconnect(client: Socket) {
  const userId = this.clientToUser.get(client.id);
  // Find active games for this user and mark as abandoned
  // await this.gameService.abandonActiveGames(userId);
}
```

---

### 13. **No Input Validation on DTOs**
**Severity: MEDIUM - Security**
- **File**: `games.controller.ts`
- **Issue**: DTOs imported but not properly validated
- **Problem**: No class-validator decorators, no pipe validation
- **Fix**: Add validation to DTOs

```typescript
// games/dtos/start-game.dto.ts
import { IsString, IsEnum, IsUUID } from 'class-validator';

export class StartGameDto {
  @IsEnum(['tic-tac-toe', 'trivia', 'truth-dare', '20-questions'])
  gameType: string;

  @IsUUID()
  peerId: string;

  @IsString()
  sessionId: string;
}

// Then use in controller with @ValidationPipe()
```

---

### 14. **Incomplete Truth-or-Dare & 20-Questions Games**
**Severity: LOW - Feature Incomplete**
- **File**: `game.service.ts`
- **Issue**: Only tic-tac-toe and trivia have full logic, other games incomplete
- **Cases**: `truth-dare` and `20-questions` initialize state but have no move/win logic
- **Problem**: Games will never complete or validate moves
- **Fix**: Implement complete game logic for all game types

---

## Minor Issues

### 15. **Missing `createdAt` in GameSession**
**Severity: LOW - Data Quality**
- **Issue**: GameSession uses `createdAt` in sorting but might not be initialized
- **File**: Game entity definition needs `@CreateDateColumn()`

### 16. **Inconsistent Error Responses**
**Severity: LOW - API Consistency**
- **Issue**: Different error response formats in controller vs gateway
- **Fix**: Standardize error response format

### 17. **Hardcoded Trivia Questions**
**Severity: LOW - Maintenance**
- **Issue**: Trivia questions hardcoded in service
- **Better**: Move to database or external config

### 18. **Magic Numbers**
**Severity: LOW - Readability**
- **Issue**: Reward values (50, 75, 60, 80) hardcoded in multiple places
- **Fix**: Extract to constants

```typescript
const GAME_REWARDS = {
  'tic-tac-toe': 50,
  'trivia': 75,
  'truth-dare': 60,
  '20-questions': 80,
} as const;
```

---

## Summary Table

| # | Issue | Severity | Type | Fix Effort |
|---|-------|----------|------|-----------|
| 1 | Missing entity relations | HIGH | Bug | 15 min |
| 2 | Missing endedAt init | MEDIUM | Bug | 10 min |
| 3 | Trivia turn validation | MEDIUM | Logic | 15 min |
| 4 | Wallet race condition | HIGH | Concurrency | 30 min |
| 5 | Missing player validation | MEDIUM | Security | 10 min |
| 6 | No move data validation | MEDIUM | Validation | 15 min |
| 7 | Shuffle algorithm | LOW | Efficiency | 5 min |
| 8 | Multiple DB calls | MEDIUM | Performance | 30 min |
| 9 | Leaderboard N+1 | MEDIUM | Performance | 45 min |
| 10 | Mission update calls | LOW | Performance | 20 min |
| 11 | Redis cache dates | MEDIUM | Data | 20 min |
| 12 | No abandonment logic | MEDIUM | Feature | 45 min |
| 13 | No DTO validation | MEDIUM | Security | 20 min |
| 14 | Incomplete games | LOW | Feature | 60 min |
| 15 | Missing createdAt | LOW | Data | 5 min |
| 16 | Inconsistent errors | LOW | Polish | 15 min |
| 17 | Hardcoded questions | LOW | Maintenance | 30 min |
| 18 | Magic numbers | LOW | Code Quality | 10 min |

---

## Recommended Fix Priority

**Phase 1 (Critical - Fix before testing):**
- Issue #1: Missing relations (will crash)
- Issue #4: Wallet race condition (data corruption)
- Issue #5: Player validation (security)

**Phase 2 (High - Fix before production):**
- Issue #2: endedAt initialization
- Issue #3: Trivia turn validation
- Issue #6: Move data validation
- Issue #8: DB transaction (performance)

**Phase 3 (Medium - Fix before scale):**
- Issue #9: Leaderboard N+1
- Issue #11: Redis caching
- Issue #12: Game abandonment
- Issue #13: DTO validation

**Phase 4 (Nice to have):**
- Issues #7, 10, 14-18

---

## Testing Recommendations

After fixes, test:
1. ✅ Multiple concurrent games
2. ✅ Rapid moves/state changes
3. ✅ Player disconnection scenarios
4. ✅ Invalid move attempts
5. ✅ All game types (trivia, tic-tac-toe, etc.)
6. ✅ Leaderboard query performance
7. ✅ Wallet transactions

