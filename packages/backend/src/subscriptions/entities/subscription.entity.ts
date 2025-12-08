import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn, Index } from 'typeorm';
import { User } from '../../users/entities/user.entity';

@Entity('subscriptions')
@Index(['userId']) // For user's subscriptions lookup
@Index(['status']) // For active subscription queries
@Index(['status', 'currentPeriodEnd']) // For expiring subscriptions queries
@Index(['cancelAtPeriodEnd', 'currentPeriodEnd']) // For renewal processing
export class Subscription {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'user_id' })
  userId: string;

  @ManyToOne(() => User, user => user.subscriptions, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user: User;

  @Column({ unique: true, name: 'stripe_customer_id' })
  stripeCustomerId: string;

  @Column({ unique: true, name: 'stripe_subscription_id' })
  stripeSubscriptionId: string;

  @Column({ name: 'stripe_price_id' })
  stripePriceId: string;

  @Column({ length: 50 })
  status: string; // 'active', 'trialing', 'past_due', 'canceled', 'incomplete', 'incomplete_expired', 'unpaid'

  @Column({ length: 50 })
  plan: string; // 'weekly', 'monthly', 'yearly'

  @Column({ type: 'timestamp', name: 'current_period_start' })
  currentPeriodStart: Date;

  @Column({ type: 'timestamp', name: 'current_period_end' })
  currentPeriodEnd: Date;

  @Column({ type: 'timestamp', nullable: true, name: 'trial_end' })
  trialEnd?: Date;

  @Column({ default: false, name: 'cancel_at_period_end' })
  cancelAtPeriodEnd: boolean;

  @Column({ type: 'timestamp', nullable: true, name: 'canceled_at' })
  canceledAt?: Date;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}

