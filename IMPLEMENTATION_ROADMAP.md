# 🚀 Implementation Roadmap - Premium Gender Filter

## Quick Start Guide

### Prerequisites
```bash
# Install Stripe CLI for webhook testing
brew install stripe/stripe-cli/stripe

# Sign up for services
1. Stripe: https://stripe.com (for payments)
2. Supabase: https://supabase.com (for PostgreSQL database)
```

---

## Phase 1: Database Setup (Day 1-2)

### Step 1.1: Set up Supabase

1. Go to https://supabase.com
2. Create new project: "paircam-production"
3. Copy connection string
4. Run SQL in Supabase SQL Editor:

```sql
-- Users table
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  device_id VARCHAR(255) UNIQUE NOT NULL,
  email VARCHAR(255) UNIQUE,
  gender VARCHAR(20) CHECK (gender IN ('male', 'female', 'other', 'prefer_not_to_say')),
  age INTEGER CHECK (age >= 18 AND age <= 120),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Subscriptions table
CREATE TABLE subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  stripe_customer_id VARCHAR(255) UNIQUE,
  stripe_subscription_id VARCHAR(255) UNIQUE,
  status VARCHAR(50) CHECK (status IN ('active', 'canceled', 'past_due', 'trialing', 'incomplete')),
  plan VARCHAR(50) CHECK (plan IN ('weekly', 'monthly')),
  current_period_start TIMESTAMP,
  current_period_end TIMESTAMP,
  cancel_at_period_end BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Payments table
CREATE TABLE payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  stripe_payment_intent_id VARCHAR(255) UNIQUE,
  amount INTEGER NOT NULL, -- in cents
  currency VARCHAR(3) DEFAULT 'usd',
  status VARCHAR(50) CHECK (status IN ('succeeded', 'failed', 'pending', 'refunded')),
  created_at TIMESTAMP DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX idx_users_device_id ON users(device_id);
CREATE INDEX idx_subscriptions_user_id ON subscriptions(user_id);
CREATE INDEX idx_subscriptions_status ON subscriptions(status);
CREATE INDEX idx_subscriptions_stripe_customer ON subscriptions(stripe_customer_id);
CREATE INDEX idx_payments_user_id ON payments(user_id);

-- View for active premium users
CREATE VIEW premium_users AS
SELECT u.id, u.device_id, u.email, u.gender
FROM users u
JOIN subscriptions s ON u.id = s.user_id
WHERE s.status = 'active' 
  AND s.current_period_end > NOW();
```

### Step 1.2: Install Dependencies

```bash
cd packages/backend
npm install @nestjs/typeorm typeorm pg stripe
npm install -D @types/stripe

cd ../frontend
npm install @stripe/stripe-js @stripe/react-stripe-js
```

### Step 1.3: Update Backend .env

```bash
# Add to packages/backend/.env
DATABASE_URL=postgresql://postgres:[YOUR-PASSWORD]@db.[PROJECT-REF].supabase.co:5432/postgres
STRIPE_SECRET_KEY=sk_test_... # Get from Stripe dashboard
STRIPE_WEBHOOK_SECRET=whsec_... # Get after setting up webhook
STRIPE_PRICE_ID_WEEKLY=price_... # Create in Stripe dashboard
STRIPE_PRICE_ID_MONTHLY=price_... # Create in Stripe dashboard
FRONTEND_URL=https://app.paircam.live
```

---

## Phase 2: Backend - User Module (Day 2-3)

### File: `packages/backend/src/users/entities/user.entity.ts`

```typescript
import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, UpdateDateColumn, OneToMany } from 'typeorm';
import { Subscription } from '../../subscriptions/entities/subscription.entity';

@Entity('users')
export class User {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true, name: 'device_id' })
  deviceId: string;

  @Column({ unique: true, nullable: true })
  email?: string;

  @Column({ nullable: true })
  gender?: string;

  @Column({ nullable: true })
  age?: number;

  @OneToMany(() => Subscription, subscription => subscription.user)
  subscriptions: Subscription[];

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
```

### File: `packages/backend/src/users/dto/update-profile.dto.ts`

```typescript
import { IsEmail, IsOptional, IsString, IsInt, Min, Max, IsIn } from 'class-validator';

export class UpdateProfileDto {
  @IsOptional()
  @IsEmail()
  email?: string;

  @IsOptional()
  @IsString()
  @IsIn(['male', 'female', 'other', 'prefer_not_to_say'])
  gender?: string;

  @IsOptional()
  @IsInt()
  @Min(18)
  @Max(120)
  age?: number;
}
```

### File: `packages/backend/src/users/users.service.ts`

```typescript
import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from './entities/user.entity';
import { UpdateProfileDto } from './dto/update-profile.dto';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private usersRepository: Repository<User>,
  ) {}

  async findOrCreate(deviceId: string): Promise<User> {
    let user = await this.usersRepository.findOne({ where: { deviceId } });
    
    if (!user) {
      user = this.usersRepository.create({ deviceId });
      await this.usersRepository.save(user);
    }
    
    return user;
  }

  async findByDeviceId(deviceId: string): Promise<User | null> {
    return this.usersRepository.findOne({ 
      where: { deviceId },
      relations: ['subscriptions'],
    });
  }

  async updateProfile(deviceId: string, updateProfileDto: UpdateProfileDto): Promise<User> {
    const user = await this.findByDeviceId(deviceId);
    if (!user) {
      throw new NotFoundException('User not found');
    }

    Object.assign(user, updateProfileDto);
    return this.usersRepository.save(user);
  }

  async isPremium(userId: string): Promise<boolean> {
    const user = await this.usersRepository.findOne({
      where: { id: userId },
      relations: ['subscriptions'],
    });

    if (!user || !user.subscriptions) {
      return false;
    }

    return user.subscriptions.some(
      sub => sub.status === 'active' && new Date(sub.currentPeriodEnd) > new Date()
    );
  }
}
```

### File: `packages/backend/src/users/users.controller.ts`

```typescript
import { Controller, Get, Put, Body, UseGuards, Req } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { UsersService } from './users.service';
import { UpdateProfileDto } from './dto/update-profile.dto';

@Controller('users')
@UseGuards(JwtAuthGuard)
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get('me')
  async getProfile(@Req() req: { user: { deviceId: string } }) {
    return this.usersService.findByDeviceId(req.user.deviceId);
  }

  @Put('me')
  async updateProfile(
    @Req() req: { user: { deviceId: string } },
    @Body() updateProfileDto: UpdateProfileDto,
  ) {
    return this.usersService.updateProfile(req.user.deviceId, updateProfileDto);
  }
}
```

### File: `packages/backend/src/users/users.module.ts`

```typescript
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UsersController } from './users.controller';
import { UsersService } from './users.service';
import { User } from './entities/user.entity';

@Module({
  imports: [TypeOrmModule.forFeature([User])],
  controllers: [UsersController],
  providers: [UsersService],
  exports: [UsersService],
})
export class UsersModule {}
```

---

## Phase 3: Backend - Payment Module (Day 4-6)

### File: `packages/backend/src/payments/payments.service.ts`

```typescript
import { Injectable } from '@nestjs/common';
import Stripe from 'stripe';
import { env } from '../env';
import { UsersService } from '../users/users.service';
import { SubscriptionsService } from '../subscriptions/subscriptions.service';

@Injectable()
export class PaymentsService {
  private stripe: Stripe;

  constructor(
    private usersService: UsersService,
    private subscriptionsService: SubscriptionsService,
  ) {
    this.stripe = new Stripe(env.STRIPE_SECRET_KEY, {
      apiVersion: '2024-10-28.acacia',
    });
  }

  async createCheckoutSession(deviceId: string, plan: 'weekly' | 'monthly') {
    const user = await this.usersService.findByDeviceId(deviceId);
    if (!user) {
      throw new Error('User not found');
    }

    const priceId = plan === 'weekly' 
      ? env.STRIPE_PRICE_ID_WEEKLY 
      : env.STRIPE_PRICE_ID_MONTHLY;

    const session = await this.stripe.checkout.sessions.create({
      customer_email: user.email,
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      mode: 'subscription',
      success_url: `${env.FRONTEND_URL}/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${env.FRONTEND_URL}/premium`,
      metadata: {
        userId: user.id,
        deviceId: user.deviceId,
        plan,
      },
    });

    return {
      sessionId: session.id,
      url: session.url,
    };
  }

  async handleWebhook(signature: string, payload: Buffer) {
    const event = this.stripe.webhooks.constructEvent(
      payload,
      signature,
      env.STRIPE_WEBHOOK_SECRET,
    );

    switch (event.type) {
      case 'checkout.session.completed':
        await this.handleCheckoutCompleted(event.data.object as Stripe.Checkout.Session);
        break;
      
      case 'customer.subscription.updated':
        await this.handleSubscriptionUpdated(event.data.object as Stripe.Subscription);
        break;
      
      case 'customer.subscription.deleted':
        await this.handleSubscriptionDeleted(event.data.object as Stripe.Subscription);
        break;
      
      case 'invoice.payment_succeeded':
        await this.handlePaymentSucceeded(event.data.object as Stripe.Invoice);
        break;
      
      case 'invoice.payment_failed':
        await this.handlePaymentFailed(event.data.object as Stripe.Invoice);
        break;
    }

    return { received: true };
  }

  private async handleCheckoutCompleted(session: Stripe.Checkout.Session) {
    const userId = session.metadata?.userId;
    const plan = session.metadata?.plan as 'weekly' | 'monthly';

    if (!userId || !session.subscription) return;

    const subscription = await this.stripe.subscriptions.retrieve(
      session.subscription as string,
    );

    await this.subscriptionsService.create({
      userId,
      stripeCustomerId: subscription.customer as string,
      stripeSubscriptionId: subscription.id,
      status: subscription.status,
      plan,
      currentPeriodStart: new Date(subscription.current_period_start * 1000),
      currentPeriodEnd: new Date(subscription.current_period_end * 1000),
    });
  }

  private async handleSubscriptionUpdated(subscription: Stripe.Subscription) {
    await this.subscriptionsService.updateByStripeId(subscription.id, {
      status: subscription.status,
      currentPeriodStart: new Date(subscription.current_period_start * 1000),
      currentPeriodEnd: new Date(subscription.current_period_end * 1000),
      cancelAtPeriodEnd: subscription.cancel_at_period_end,
    });
  }

  private async handleSubscriptionDeleted(subscription: Stripe.Subscription) {
    await this.subscriptionsService.updateByStripeId(subscription.id, {
      status: 'canceled',
    });
  }

  private async handlePaymentSucceeded(invoice: Stripe.Invoice) {
    // Log successful payment
    console.log('Payment succeeded:', invoice.id);
  }

  private async handlePaymentFailed(invoice: Stripe.Invoice) {
    // Handle failed payment (send email, update status, etc.)
    console.error('Payment failed:', invoice.id);
  }

  async cancelSubscription(deviceId: string) {
    const user = await this.usersService.findByDeviceId(deviceId);
    if (!user) {
      throw new Error('User not found');
    }

    const subscription = await this.subscriptionsService.findActiveByUserId(user.id);
    if (!subscription) {
      throw new Error('No active subscription found');
    }

    await this.stripe.subscriptions.update(subscription.stripeSubscriptionId, {
      cancel_at_period_end: true,
    });

    await this.subscriptionsService.updateByStripeId(subscription.stripeSubscriptionId, {
      cancelAtPeriodEnd: true,
    });

    return { success: true, message: 'Subscription will cancel at period end' };
  }
}
```

### File: `packages/backend/src/payments/payments.controller.ts`

```typescript
import { Controller, Post, Body, Headers, RawBodyRequest, Req, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Public } from '../auth/public.decorator';
import { PaymentsService } from './payments.service';

@Controller('payments')
export class PaymentsController {
  constructor(private paymentsService: PaymentsService) {}

  @UseGuards(JwtAuthGuard)
  @Post('create-checkout')
  async createCheckout(
    @Req() req: { user: { deviceId: string } },
    @Body() body: { plan: 'weekly' | 'monthly' },
  ) {
    return this.paymentsService.createCheckoutSession(req.user.deviceId, body.plan);
  }

  @Public()
  @Post('webhook')
  async webhook(
    @Headers('stripe-signature') signature: string,
    @Req() req: RawBodyRequest<Request>,
  ) {
    return this.paymentsService.handleWebhook(signature, req.rawBody as Buffer);
  }

  @UseGuards(JwtAuthGuard)
  @Post('cancel-subscription')
  async cancelSubscription(@Req() req: { user: { deviceId: string } }) {
    return this.paymentsService.cancelSubscription(req.user.deviceId);
  }
}
```

---

## Phase 4: Frontend - Premium UI (Day 7-9)

### File: `packages/frontend/src/components/PremiumModal.tsx`

```typescript
import { useState } from 'react';
import { loadStripe } from '@stripe/stripe-js';

const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY);

interface PremiumModalProps {
  onClose: () => void;
}

export default function PremiumModal({ onClose }: PremiumModalProps) {
  const [selectedPlan, setSelectedPlan] = useState<'weekly' | 'monthly'>('monthly');
  const [loading, setLoading] = useState(false);

  const handleUpgrade = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('accessToken');
      const response = await fetch(`${import.meta.env.VITE_API_URL}/payments/create-checkout`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ plan: selectedPlan }),
      });

      const { url } = await response.json();
      window.location.href = url;
    } catch (error) {
      console.error('Checkout error:', error);
      alert('Failed to start checkout. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-3xl max-w-4xl w-full p-8 relative max-h-[90vh] overflow-y-auto">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-400 hover:text-gray-600"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>

        <div className="text-center mb-8">
          <div className="inline-block bg-gradient-to-r from-yellow-400 to-orange-500 text-white px-4 py-1 rounded-full text-sm font-bold mb-4">
            ⭐ PREMIUM
          </div>
          <h2 className="text-4xl font-bold bg-gradient-to-r from-pink-600 to-purple-600 bg-clip-text text-transparent mb-2">
            Upgrade to Premium
          </h2>
          <p className="text-gray-600 text-lg">
            Get exclusive features and better matches
          </p>
        </div>

        {/* Features Grid */}
        <div className="grid md:grid-cols-2 gap-4 mb-8">
          <div className="flex items-start gap-3 p-4 bg-gradient-to-br from-pink-50 to-purple-50 rounded-2xl">
            <div className="text-2xl">🎯</div>
            <div>
              <h3 className="font-bold text-gray-900">Gender Filter</h3>
              <p className="text-sm text-gray-600">Match with your preferred gender only</p>
            </div>
          </div>
          <div className="flex items-start gap-3 p-4 bg-gradient-to-br from-pink-50 to-purple-50 rounded-2xl">
            <div className="text-2xl">⚡</div>
            <div>
              <h3 className="font-bold text-gray-900">Priority Matching</h3>
              <p className="text-sm text-gray-600">Skip the queue and match faster</p>
            </div>
          </div>
          <div className="flex items-start gap-3 p-4 bg-gradient-to-br from-pink-50 to-purple-50 rounded-2xl">
            <div className="text-2xl">🚫</div>
            <div>
              <h3 className="font-bold text-gray-900">Ad-Free</h3>
              <p className="text-sm text-gray-600">Enjoy uninterrupted conversations</p>
            </div>
          </div>
          <div className="flex items-start gap-3 p-4 bg-gradient-to-br from-pink-50 to-purple-50 rounded-2xl">
            <div className="text-2xl">↩️</div>
            <div>
              <h3 className="font-bold text-gray-900">Rewind Skip</h3>
              <p className="text-sm text-gray-600">Undo your last skip once per session</p>
            </div>
          </div>
        </div>

        {/* Pricing Toggle */}
        <div className="flex justify-center gap-4 mb-6">
          <button
            onClick={() => setSelectedPlan('weekly')}
            className={`px-8 py-4 rounded-2xl font-semibold transition-all ${
              selectedPlan === 'weekly'
                ? 'bg-gradient-to-r from-pink-500 to-purple-600 text-white shadow-lg'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            <div className="text-2xl font-bold">$2.99</div>
            <div className="text-sm opacity-90">per week</div>
          </button>
          <button
            onClick={() => setSelectedPlan('monthly')}
            className={`px-8 py-4 rounded-2xl font-semibold transition-all relative ${
              selectedPlan === 'monthly'
                ? 'bg-gradient-to-r from-pink-500 to-purple-600 text-white shadow-lg'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            <div className="absolute -top-2 -right-2 bg-green-500 text-white text-xs px-2 py-1 rounded-full">
              Save 25%
            </div>
            <div className="text-2xl font-bold">$9.99</div>
            <div className="text-sm opacity-90">per month</div>
          </button>
        </div>

        {/* CTA Button */}
        <button
          onClick={handleUpgrade}
          disabled={loading}
          className="w-full py-4 bg-gradient-to-r from-pink-500 to-purple-600 hover:from-pink-600 hover:to-purple-700 text-white font-bold text-lg rounded-2xl shadow-lg disabled:opacity-50 disabled:cursor-not-allowed transition-all"
        >
          {loading ? 'Loading...' : 'Upgrade Now'}
        </button>

        <p className="text-center text-sm text-gray-500 mt-4">
          Cancel anytime. No hidden fees.
        </p>
      </div>
    </div>
  );
}
```

---

## Phase 5: Update Matchmaking (Day 10-11)

Update `packages/backend/src/signaling/matchmaking.service.ts` to include gender filtering logic (see PAYMENT_SYSTEM_DESIGN.md for full code).

---

## Testing Checklist

### Stripe Test Cards
```
Success: 4242 4242 4242 4242
Decline: 4000 0000 0000 0002
3D Secure: 4000 0025 0000 3155
```

### Test Flow
1. ✅ User signs up (free)
2. ✅ User sets gender in profile
3. ✅ User tries gender filter → sees "Premium Only" lock
4. ✅ User clicks "Upgrade to Premium"
5. ✅ Stripe checkout opens
6. ✅ User completes payment
7. ✅ Webhook updates subscription
8. ✅ User redirected back with premium access
9. ✅ Gender filter now works
10. ✅ User can cancel subscription

---

## Launch Checklist

- [ ] Switch Stripe to production keys
- [ ] Set up production database backups
- [ ] Configure webhook endpoint in Stripe dashboard
- [ ] Test with real payment
- [ ] Set up monitoring for failed payments
- [ ] Create cancellation flow
- [ ] Add email notifications (subscription start/end)
- [ ] Legal: Update Terms of Service with refund policy
- [ ] Analytics: Track conversion funnel

---

## Estimated Timeline

- **Week 1**: Database + User profiles
- **Week 2**: Payment integration + Testing
- **Week 3**: Premium features + Launch

**Total**: 3 weeks to launch 🚀

