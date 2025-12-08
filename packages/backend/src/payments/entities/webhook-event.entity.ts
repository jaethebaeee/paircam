import { Entity, Column, PrimaryColumn, CreateDateColumn, Index } from 'typeorm';

/**
 * Tracks processed Stripe webhook events for idempotency
 * Prevents duplicate processing if Stripe retries webhooks
 */
@Entity('webhook_events')
export class WebhookEvent {
  @PrimaryColumn({ name: 'stripe_event_id' })
  stripeEventId: string;

  @Column({ name: 'event_type', length: 100 })
  @Index()
  eventType: string;

  @Column({
    length: 20,
    default: 'pending'
  })
  status: 'pending' | 'processed' | 'failed';

  @Column({ type: 'text', nullable: true })
  payload: string;

  @Column({ type: 'text', nullable: true, name: 'error_message' })
  errorMessage?: string;

  @Column({ default: 0, name: 'retry_count' })
  retryCount: number;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @Column({ type: 'timestamp', nullable: true, name: 'processed_at' })
  processedAt?: Date;
}
