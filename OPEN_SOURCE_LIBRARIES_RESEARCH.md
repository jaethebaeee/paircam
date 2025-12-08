# Open Source Libraries Research for PairCam

> Research conducted: December 2024
> Project: PairCam - Random Video Chat Application
> Tech Stack: NestJS (Backend), React + Vite (Frontend), PostgreSQL, Redis, WebRTC

---

## Executive Summary

After analyzing the PairCam codebase, I've identified **10 high-impact open source libraries** that could significantly improve development velocity, code quality, testing coverage, and production reliability.

| Priority | Library | Category | Impact |
|----------|---------|----------|--------|
| 🔴 Critical | Playwright | E2E Testing | High |
| 🔴 Critical | Sentry | Error Tracking | High |
| 🔴 Critical | MSW | API Mocking | High |
| 🟡 High | TanStack Query | Data Fetching | High |
| 🟡 High | React Hook Form | Forms | Medium-High |
| 🟡 High | Zod | Validation | Medium |
| 🟢 Medium | faker-js | Test Data | Medium |
| 🟢 Medium | factory.ts | Test Fixtures | Medium |
| 🟢 Medium | TypeDoc | Documentation | Low-Medium |
| 🟢 Medium | Pino | Logging | Low |

---

## 1. Playwright - E2E Testing

**Category:** Testing
**GitHub Stars:** 68k+
**Weekly Downloads:** 10M+
**License:** Apache-2.0

### Why Playwright over Cypress?

Playwright has **overtaken Cypress** as the most downloaded E2E testing framework in 2024. Key advantages:

| Feature | Playwright | Cypress |
|---------|-----------|---------|
| Cross-browser | Chrome, Firefox, Safari, Edge | Chrome, Firefox, Edge only |
| Mobile emulation | Built-in | Requires plugins |
| Multi-tab/window | ✅ Native support | ❌ Not supported |
| Parallel execution | ✅ Free & built-in | 💰 Requires Cypress Cloud |
| Languages | JS, TS, Python, .NET, Java | JS, TS only |
| Architecture | Out-of-process (faster) | In-browser (slower) |

### Why It's Critical for PairCam

1. **WebRTC Testing**: Playwright can emulate camera/microphone permissions and test video calls
2. **Multi-tab Support**: Essential for testing the "connect to stranger" flow
3. **Mobile Emulation**: Test responsive design across devices
4. **Network Interception**: Mock signaling server responses

### Installation

```bash
# Backend
cd packages/backend
npm install -D @playwright/test

# Frontend
cd packages/frontend
npm install -D @playwright/test
npx playwright install
```

### Example Test for PairCam

```typescript
// e2e/video-chat.spec.ts
import { test, expect } from '@playwright/test';

test('user can start video chat and connect to stranger', async ({ browser }) => {
  // Create two browser contexts (simulating two users)
  const user1Context = await browser.newContext({
    permissions: ['camera', 'microphone'],
  });
  const user2Context = await browser.newContext({
    permissions: ['camera', 'microphone'],
  });

  const user1Page = await user1Context.newPage();
  const user2Page = await user2Context.newPage();

  // Both users navigate to the app
  await user1Page.goto('/');
  await user2Page.goto('/');

  // Both click "Start Chat"
  await user1Page.click('[data-testid="start-chat"]');
  await user2Page.click('[data-testid="start-chat"]');

  // Wait for connection
  await expect(user1Page.locator('[data-testid="remote-video"]')).toBeVisible({ timeout: 10000 });
  await expect(user2Page.locator('[data-testid="remote-video"]')).toBeVisible({ timeout: 10000 });
});
```

### Resources

- [Playwright Documentation](https://playwright.dev/)
- [GitHub Repository](https://github.com/microsoft/playwright)
- [Playwright vs Cypress Comparison](https://shipyard.build/blog/playwright-vs-cypress/)

---

## 2. Sentry - Error Tracking & Monitoring

**Category:** Observability
**GitHub Stars:** 39k+
**Weekly Downloads:** 5M+
**License:** BSL (Free tier available, self-hosted option)

### Why Sentry?

PairCam currently has **no error tracking** beyond Winston logging. Sentry provides:

1. **Real-time Error Alerts**: Know when production breaks immediately
2. **Stack Traces with Source Maps**: See exact line numbers in minified code
3. **Session Replay**: Watch user sessions that led to errors
4. **Performance Monitoring**: Track slow API calls and WebRTC connections
5. **Release Tracking**: Know which deployment introduced bugs

### Open Source Alternative: GlitchTip

If you prefer fully open-source, **GlitchTip** is Sentry-compatible:
- Uses same Sentry SDKs
- Self-hosted on minimal resources (1GB RAM)
- PostgreSQL + Redis (you already have these!)

### Installation

```bash
# Backend
cd packages/backend
npm install @sentry/node @sentry/profiling-node

# Frontend
cd packages/frontend
npm install @sentry/react
```

### Backend Integration (NestJS)

```typescript
// packages/backend/src/main.ts
import * as Sentry from '@sentry/node';

async function bootstrap() {
  Sentry.init({
    dsn: process.env.SENTRY_DSN,
    environment: process.env.NODE_ENV,
    tracesSampleRate: 1.0,
    profilesSampleRate: 1.0,
  });

  const app = await NestFactory.create(AppModule);

  // Add global exception filter
  app.useGlobalFilters(new SentryExceptionFilter());

  await app.listen(3000);
}
```

### Frontend Integration (React)

```typescript
// packages/frontend/src/main.tsx
import * as Sentry from '@sentry/react';

Sentry.init({
  dsn: process.env.VITE_SENTRY_DSN,
  integrations: [
    Sentry.browserTracingIntegration(),
    Sentry.replayIntegration({
      maskAllText: false,
      blockAllMedia: false,
    }),
  ],
  tracesSampleRate: 1.0,
  replaysSessionSampleRate: 0.1,
  replaysOnErrorSampleRate: 1.0,
});

// Wrap App with Sentry error boundary
const App = Sentry.withProfiler(AppComponent);
```

### Resources

- [Sentry Documentation](https://docs.sentry.io/)
- [GlitchTip (Open Source Alternative)](https://glitchtip.com/)
- [Sentry Alternatives Comparison](https://uptrace.dev/comparisons/sentry-alternatives)

---

## 3. MSW (Mock Service Worker) - API Mocking

**Category:** Testing
**GitHub Stars:** 16k+
**Weekly Downloads:** 4M+
**License:** MIT

### Why MSW?

MSW is the **industry standard** for API mocking. Unlike traditional mocking (stubbing fetch/axios), MSW intercepts requests at the **network level**:

1. **Framework Agnostic**: Works with fetch, axios, Socket.io
2. **Realistic Tests**: Your actual code runs, only the network is mocked
3. **Reusable Mocks**: Same handlers work in tests, Storybook, and development
4. **Type-Safe**: Full TypeScript support

### Why It's Critical for PairCam

1. **Socket.io Testing**: Mock WebSocket signaling events
2. **Stripe Integration**: Test payment flows without real transactions
3. **Isolated Tests**: No need for running backend during frontend tests
4. **Edge Cases**: Simulate network errors, timeouts, slow connections

### Installation

```bash
cd packages/frontend
npm install -D msw
npx msw init public/ --save
```

### Example Handlers for PairCam

```typescript
// packages/frontend/src/mocks/handlers.ts
import { http, HttpResponse, ws } from 'msw';

export const handlers = [
  // REST API handlers
  http.post('/api/auth/anonymous', () => {
    return HttpResponse.json({
      token: 'mock-jwt-token',
      userId: 'user-123',
    });
  }),

  http.get('/api/blocked-users', () => {
    return HttpResponse.json({
      blockedUsers: [],
    });
  }),

  http.post('/api/reports', async ({ request }) => {
    const body = await request.json();
    return HttpResponse.json({
      id: 'report-456',
      status: 'submitted',
    });
  }),

  // Mock Stripe
  http.post('/api/payments/create-checkout', () => {
    return HttpResponse.json({
      sessionId: 'cs_test_mock',
      url: 'https://checkout.stripe.com/mock',
    });
  }),
];

// WebSocket handlers for signaling
const signalingServer = ws.link('wss://*/socket.io/*');

export const socketHandlers = [
  signalingServer.addEventListener('connection', ({ client }) => {
    client.addEventListener('message', (event) => {
      const data = JSON.parse(event.data);

      if (data.type === 'join-queue') {
        // Simulate finding a match after 2 seconds
        setTimeout(() => {
          client.send(JSON.stringify({
            type: 'matched',
            peerId: 'peer-789',
          }));
        }, 2000);
      }
    });
  }),
];
```

### Test Setup

```typescript
// packages/frontend/src/setupTests.ts
import { setupServer } from 'msw/node';
import { handlers } from './mocks/handlers';

export const server = setupServer(...handlers);

beforeAll(() => server.listen());
afterEach(() => server.resetHandlers());
afterAll(() => server.close());
```

### Resources

- [MSW Documentation](https://mswjs.io/)
- [MSW GitHub](https://github.com/mswjs/msw)
- [MSW with Vitest Guide](https://stevekinney.com/courses/testing/testing-with-mock-service-worker)

---

## 4. TanStack Query (React Query) - Server State Management

**Category:** Data Fetching
**GitHub Stars:** 43k+
**Weekly Downloads:** 8M+
**License:** MIT

### Why TanStack Query?

PairCam currently uses raw Axios for API calls. TanStack Query provides:

1. **Automatic Caching**: Don't refetch data you already have
2. **Background Refetching**: Keep data fresh without user action
3. **Optimistic Updates**: Instant UI updates before server confirms
4. **Retry Logic**: Automatic retries with exponential backoff
5. **Devtools**: Visualize cache state during development

### How It Complements Zustand

You already use Zustand for **client state** (UI toggles, local preferences). TanStack Query handles **server state** (API data):

| Zustand | TanStack Query |
|---------|---------------|
| Modal open/closed | User profile data |
| Theme preference | Blocked users list |
| Local form state | Subscription status |
| WebRTC connection state | Payment history |

### Installation

```bash
cd packages/frontend
npm install @tanstack/react-query @tanstack/react-query-devtools
```

### Example Usage for PairCam

```typescript
// packages/frontend/src/hooks/useBlockedUsers.ts
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { blockingApi } from '../api/blocking';

export function useBlockedUsers() {
  return useQuery({
    queryKey: ['blocked-users'],
    queryFn: blockingApi.getBlockedUsers,
    staleTime: 5 * 60 * 1000, // Consider fresh for 5 minutes
  });
}

export function useBlockUser() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: blockingApi.blockUser,
    onSuccess: () => {
      // Invalidate and refetch blocked users list
      queryClient.invalidateQueries({ queryKey: ['blocked-users'] });
    },
    // Optimistic update
    onMutate: async (userId) => {
      await queryClient.cancelQueries({ queryKey: ['blocked-users'] });
      const previous = queryClient.getQueryData(['blocked-users']);
      queryClient.setQueryData(['blocked-users'], (old) => [...old, userId]);
      return { previous };
    },
    onError: (err, userId, context) => {
      queryClient.setQueryData(['blocked-users'], context.previous);
    },
  });
}
```

```typescript
// packages/frontend/src/hooks/useSubscription.ts
import { useQuery } from '@tanstack/react-query';

export function useSubscription() {
  return useQuery({
    queryKey: ['subscription'],
    queryFn: async () => {
      const res = await fetch('/api/subscriptions/status');
      return res.json();
    },
    staleTime: 60 * 1000, // Check every minute
    refetchInterval: 5 * 60 * 1000, // Auto-refresh every 5 minutes
  });
}

// Usage in component
function PremiumBadge() {
  const { data, isLoading } = useSubscription();

  if (isLoading) return <Skeleton />;
  if (!data?.isPremium) return null;

  return <Badge>Premium</Badge>;
}
```

### Provider Setup

```typescript
// packages/frontend/src/main.tsx
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 3,
      staleTime: 1000 * 60, // 1 minute
    },
  },
});

ReactDOM.createRoot(document.getElementById('root')!).render(
  <QueryClientProvider client={queryClient}>
    <App />
    <ReactQueryDevtools initialIsOpen={false} />
  </QueryClientProvider>
);
```

### Resources

- [TanStack Query Documentation](https://tanstack.com/query)
- [TanStack Query + Zustand Guide](https://www.robinwieruch.de/react-libraries/)
- [React Query vs Redux Comparison](https://tanstack.com/query/latest/docs/framework/react/comparison)

---

## 5. React Hook Form - Form Management

**Category:** Forms
**GitHub Stars:** 42k+
**Weekly Downloads:** 12M+
**License:** MIT

### Why React Hook Form?

PairCam has several forms (preferences, report modal, premium checkout) currently using manual state management. React Hook Form provides:

1. **Minimal Re-renders**: Uses uncontrolled components by default
2. **Easy Validation**: Integrates with Zod/Yup
3. **Small Bundle**: ~9KB minified
4. **TypeScript First**: Full type inference

### Installation

```bash
cd packages/frontend
npm install react-hook-form @hookform/resolvers zod
```

### Example: Report Modal Form

```typescript
// packages/frontend/src/components/ReportModal.tsx
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';

const reportSchema = z.object({
  reason: z.enum(['harassment', 'inappropriate', 'spam', 'other']),
  description: z.string().min(10, 'Please provide more details').max(500),
  includeScreenshot: z.boolean().default(false),
});

type ReportFormData = z.infer<typeof reportSchema>;

export function ReportModal({ peerId, onClose }: ReportModalProps) {
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ReportFormData>({
    resolver: zodResolver(reportSchema),
  });

  const onSubmit = async (data: ReportFormData) => {
    await submitReport({ ...data, reportedUserId: peerId });
    onClose();
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)}>
      <select {...register('reason')}>
        <option value="harassment">Harassment</option>
        <option value="inappropriate">Inappropriate Content</option>
        <option value="spam">Spam</option>
        <option value="other">Other</option>
      </select>
      {errors.reason && <span>{errors.reason.message}</span>}

      <textarea
        {...register('description')}
        placeholder="Describe the issue..."
      />
      {errors.description && <span>{errors.description.message}</span>}

      <label>
        <input type="checkbox" {...register('includeScreenshot')} />
        Include screenshot
      </label>

      <button type="submit" disabled={isSubmitting}>
        {isSubmitting ? 'Submitting...' : 'Submit Report'}
      </button>
    </form>
  );
}
```

### Example: Preferences Modal

```typescript
// packages/frontend/src/components/PreferencesModal.tsx
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';

const preferencesSchema = z.object({
  language: z.string(),
  region: z.string().optional(),
  gender: z.enum(['any', 'male', 'female']).default('any'),
  ageRange: z.object({
    min: z.number().min(18).max(100),
    max: z.number().min(18).max(100),
  }).refine(data => data.max >= data.min, {
    message: 'Max age must be greater than min age',
  }),
});

type PreferencesFormData = z.infer<typeof preferencesSchema>;

export function PreferencesModal({ onSave }: PreferencesModalProps) {
  const { register, handleSubmit, watch, formState: { errors } } = useForm<PreferencesFormData>({
    resolver: zodResolver(preferencesSchema),
    defaultValues: {
      language: 'en',
      gender: 'any',
      ageRange: { min: 18, max: 99 },
    },
  });

  return (
    <form onSubmit={handleSubmit(onSave)}>
      {/* Form fields */}
    </form>
  );
}
```

### Resources

- [React Hook Form Documentation](https://react-hook-form.com/)
- [React Hook Form + Zod Integration](https://react-hook-form.com/get-started#SchemaValidation)
- [Form Handling in 2025 Guide](https://makersden.io/blog/composable-form-handling-in-2025-react-hook-form-tanstack-form-and-beyond)

---

## 6. Zod - TypeScript Schema Validation

**Category:** Validation
**GitHub Stars:** 35k+
**Weekly Downloads:** 15M+
**License:** MIT

### Why Add Zod (You Already Have class-validator)?

| class-validator | Zod |
|-----------------|-----|
| ✅ Perfect for NestJS DTOs | ✅ Perfect for frontend validation |
| ✅ Decorator-based | ✅ Function-based, tree-shakeable |
| ✅ Works with ValidationPipe | ✅ Works with react-hook-form |
| ❌ No type inference | ✅ Automatic TypeScript type inference |

**Recommendation**: Keep `class-validator` for NestJS backend, add `Zod` for frontend validation and shared type definitions.

### Installation

```bash
cd packages/frontend
npm install zod
```

### Example: Shared Types Between Frontend/Backend

```typescript
// packages/shared/schemas/user.ts (create shared package)
import { z } from 'zod';

export const userPreferencesSchema = z.object({
  language: z.string().min(2).max(5),
  region: z.string().optional(),
  gender: z.enum(['any', 'male', 'female']),
  ageRange: z.object({
    min: z.number().int().min(18).max(100),
    max: z.number().int().min(18).max(100),
  }),
});

// Infer TypeScript type from schema
export type UserPreferences = z.infer<typeof userPreferencesSchema>;

// API response schemas
export const matchResponseSchema = z.object({
  peerId: z.string().uuid(),
  peerPreferences: userPreferencesSchema.partial(),
  iceServers: z.array(z.object({
    urls: z.array(z.string()),
    username: z.string().optional(),
    credential: z.string().optional(),
  })),
});

export type MatchResponse = z.infer<typeof matchResponseSchema>;
```

### Validate API Responses

```typescript
// packages/frontend/src/api/signaling.ts
import { matchResponseSchema, type MatchResponse } from '@paircam/shared';

export async function getMatch(): Promise<MatchResponse> {
  const response = await fetch('/api/match');
  const data = await response.json();

  // Validate response matches expected schema
  return matchResponseSchema.parse(data);
}
```

### Resources

- [Zod Documentation](https://zod.dev/)
- [Zod vs class-validator Comparison](https://dev.to/abdulghofurme/zod-vs-class-validator-class-transformer-3oam)
- [Validation Libraries Comparison](https://npm-compare.com/ajv,class-validator,joi,yup,zod)

---

## 7. Faker.js - Test Data Generation

**Category:** Testing
**GitHub Stars:** 13k+
**Weekly Downloads:** 7M+
**License:** MIT

### Why Faker.js?

Generate realistic test data for:
- User profiles
- Chat messages
- Session analytics
- Payment records

### Installation

```bash
npm install -D @faker-js/faker
```

### Example Usage

```typescript
// packages/backend/src/__tests__/factories/user.factory.ts
import { faker } from '@faker-js/faker';
import { User } from '../../users/user.entity';

export function createMockUser(overrides: Partial<User> = {}): User {
  return {
    id: faker.string.uuid(),
    deviceId: faker.string.alphanumeric(32),
    email: faker.internet.email(),
    gender: faker.helpers.arrayElement(['male', 'female', 'other']),
    age: faker.number.int({ min: 18, max: 65 }),
    language: faker.helpers.arrayElement(['en', 'es', 'fr', 'de', 'ja']),
    region: faker.location.countryCode(),
    isPremium: faker.datatype.boolean(),
    createdAt: faker.date.past(),
    ...overrides,
  };
}

export function createMockSession() {
  return {
    id: faker.string.uuid(),
    user1Id: faker.string.uuid(),
    user2Id: faker.string.uuid(),
    startedAt: faker.date.recent(),
    duration: faker.number.int({ min: 30, max: 3600 }),
    connectionType: faker.helpers.arrayElement(['p2p', 'turn']),
  };
}

export function createMockChatMessage() {
  return {
    id: faker.string.uuid(),
    senderId: faker.string.uuid(),
    content: faker.lorem.sentence(),
    timestamp: faker.date.recent(),
    type: faker.helpers.arrayElement(['text', 'emoji']),
  };
}
```

### Resources

- [Faker.js Documentation](https://fakerjs.dev/)
- [GitHub Repository](https://github.com/faker-js/faker)

---

## 8. Factory.ts - Type-Safe Test Fixtures

**Category:** Testing
**GitHub Stars:** 600+
**License:** MIT

### Why Factory.ts?

While Faker generates random data, Factory.ts provides:
- Type-safe factory definitions
- Traits for different scenarios
- Sequences for unique values
- Integration with any ORM

### Installation

```bash
npm install -D factory.ts
```

### Example Usage

```typescript
// packages/backend/src/__tests__/factories/index.ts
import { Factory } from 'factory.ts';
import { faker } from '@faker-js/faker';
import { User } from '../../users/user.entity';

export const userFactory = Factory.define<User>(() => ({
  id: faker.string.uuid(),
  deviceId: faker.string.alphanumeric(32),
  email: faker.internet.email(),
  gender: 'any',
  isPremium: false,
  createdAt: new Date(),
}));

// Usage in tests
const basicUser = userFactory.build();
const premiumUser = userFactory.build({ isPremium: true });
const multipleUsers = userFactory.buildMany(10);

// With sequence
const userWithSequence = Factory.define<User>(({ sequence }) => ({
  id: `user-${sequence}`,
  email: `user${sequence}@test.com`,
  // ...
}));
```

### Resources

- [Factory.ts GitHub](https://github.com/willryan/factory.ts)

---

## 9. TypeDoc - API Documentation Generator

**Category:** Documentation
**GitHub Stars:** 7k+
**License:** Apache-2.0

### Why TypeDoc?

Auto-generate API documentation from TypeScript code:
- Extracts JSDoc comments
- Generates searchable HTML docs
- Supports markdown
- Links between types

### Installation

```bash
npm install -D typedoc
```

### Configuration

```json
// typedoc.json
{
  "entryPoints": ["packages/backend/src", "packages/frontend/src"],
  "out": "docs",
  "exclude": ["**/__tests__/**", "**/*.spec.ts"],
  "theme": "default",
  "readme": "README.md"
}
```

### Resources

- [TypeDoc Documentation](https://typedoc.org/)

---

## 10. Pino - High-Performance Logging

**Category:** Observability
**GitHub Stars:** 14k+
**Weekly Downloads:** 15M+
**License:** MIT

### Why Consider Pino (You Already Have Winston)?

| Winston | Pino |
|---------|------|
| 6x slower | Fastest Node.js logger |
| ~50KB | ~10KB |
| More features | Minimalist, focused |
| Synchronous | Asynchronous by default |

For **high-throughput** WebRTC signaling, Pino's performance could matter.

### Benchmark

```
Winston: ~25,000 logs/second
Pino:    ~150,000 logs/second (6x faster)
```

### Installation

```bash
cd packages/backend
npm install pino pino-pretty
```

### Resources

- [Pino Documentation](https://getpino.io/)
- [Pino vs Winston Benchmark](https://github.com/pinojs/pino/blob/master/docs/benchmarks.md)

---

## Implementation Roadmap

### Phase 1: Critical (Week 1-2)

1. **Playwright E2E Testing**
   - Set up Playwright
   - Write tests for core video chat flow
   - Add CI integration

2. **Sentry Error Tracking**
   - Install SDKs (frontend + backend)
   - Configure source maps
   - Set up alerts

3. **MSW API Mocking**
   - Create mock handlers for all APIs
   - Integrate with Vitest
   - Add Socket.io mocks

### Phase 2: High Priority (Week 3-4)

4. **TanStack Query**
   - Replace axios calls with useQuery/useMutation
   - Add QueryClient provider
   - Implement optimistic updates

5. **React Hook Form + Zod**
   - Refactor PreferencesModal
   - Refactor ReportModal
   - Add validation schemas

### Phase 3: Quality of Life (Week 5+)

6. **Testing Infrastructure**
   - Add faker-js for test data
   - Create factory.ts fixtures
   - Improve test coverage

7. **Documentation**
   - Set up TypeDoc
   - Document public APIs

---

## Package.json Changes

### Frontend Dependencies to Add

```json
{
  "dependencies": {
    "@tanstack/react-query": "^5.0.0",
    "@tanstack/react-query-devtools": "^5.0.0",
    "react-hook-form": "^7.50.0",
    "@hookform/resolvers": "^3.3.0",
    "zod": "^3.22.0",
    "@sentry/react": "^7.100.0"
  },
  "devDependencies": {
    "@playwright/test": "^1.41.0",
    "msw": "^2.1.0",
    "@faker-js/faker": "^8.4.0"
  }
}
```

### Backend Dependencies to Add

```json
{
  "dependencies": {
    "@sentry/node": "^7.100.0",
    "@sentry/profiling-node": "^7.100.0"
  },
  "devDependencies": {
    "@faker-js/faker": "^8.4.0",
    "factory.ts": "^1.4.0"
  }
}
```

---

## Summary

These 10 libraries address the key gaps identified in the PairCam codebase:

| Gap | Solution |
|-----|----------|
| No E2E testing | Playwright |
| No error tracking | Sentry |
| No API mocking | MSW |
| Manual data fetching | TanStack Query |
| Manual form state | React Hook Form |
| No frontend validation | Zod |
| No test data generation | faker-js + factory.ts |
| No auto-generated docs | TypeDoc |

Implementing these libraries will significantly improve:
- **Reliability**: Catch errors before users do
- **Testing**: Comprehensive test coverage
- **Developer Experience**: Better tooling and debugging
- **Code Quality**: Type-safe validation and forms
- **Performance**: Optimized data fetching and caching

---

## Sources

- [React Libraries for 2025](https://www.robinwieruch.de/react-libraries/)
- [Playwright vs Cypress Comparison](https://shipyard.build/blog/playwright-vs-cypress/)
- [Sentry Alternatives](https://uptrace.dev/comparisons/sentry-alternatives)
- [MSW Documentation](https://mswjs.io/)
- [TanStack Query](https://tanstack.com/query)
- [React Hook Form](https://react-hook-form.com/)
- [Zod vs class-validator](https://dev.to/abdulghofurme/zod-vs-class-validator-class-transformer-3oam)
