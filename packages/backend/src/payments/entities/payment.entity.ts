import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { User } from '../../users/entities/user.entity';
import { Subscription } from '../../subscriptions/entities/subscription.entity';

@Entity('payments')
export class Payment {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'user_id' })
  userId: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user: User;

  @Column({ nullable: true, name: 'subscription_id' })
  subscriptionId?: string;

  @ManyToOne(() => Subscription, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'subscription_id' })
  subscription?: Subscription;

  @Column({ unique: true, nullable: true, name: 'stripe_payment_intent_id' })
  stripePaymentIntentId?: string;

  @Column({ nullable: true, name: 'stripe_invoice_id' })
  stripeInvoiceId?: string;

  @Column({ type: 'int' })
  amount: number; // in cents

  @Column({ length: 3, default: 'usd' })
  currency: string;

  @Column({ length: 50 })
  status: string; // 'succeeded', 'failed', 'pending', 'refunded', 'canceled'

  @Column({ nullable: true, length: 50, name: 'payment_method' })
  paymentMethod?: string; // 'card', 'apple_pay', 'google_pay'

  @Column({ nullable: true, name: 'failure_reason' })
  failureReason?: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}

