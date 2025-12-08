import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';

/**
 * ReputationEvent Entity
 *
 * Tracks all events that affect a user's reputation score.
 * Provides audit trail for moderation and dispute resolution.
 */
@Entity('reputation_events')
@Index(['userId', 'createdAt']) // For user's reputation history
@Index(['eventType']) // For analytics by event type
@Index(['createdAt']) // For time-based queries
export class ReputationEvent {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'user_id' })
  userId: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user: User;

  @Column({ length: 50, name: 'event_type' })
  eventType:
    | 'call_completed' // Call lasted > 60 seconds
    | 'call_skipped' // User skipped quickly
    | 'report_received' // Someone reported this user
    | 'report_submitted' // User submitted a report
    | 'warning_issued' // Moderator warning
    | 'ban_issued' // Temporary or permanent ban
    | 'ban_lifted' // Ban expired or removed
    | 'friend_request' // Received friend request
    | 'connection_failed' // WebRTC connection failed
    | 'long_call_bonus' // Call > 5 minutes
    | 'rating_decay' // Periodic decay for inactive users
    | 'manual_adjustment'; // Admin adjustment

  // Rating change
  @Column({ type: 'decimal', precision: 5, scale: 2, name: 'previous_rating' })
  previousRating: number;

  @Column({ type: 'decimal', precision: 5, scale: 2, name: 'new_rating' })
  newRating: number;

  @Column({ type: 'decimal', precision: 5, scale: 2, name: 'rating_change' })
  ratingChange: number;

  // Context
  @Column({ nullable: true, name: 'session_id' })
  sessionId: string; // Related session if applicable

  @Column({ nullable: true, name: 'related_user_id' })
  relatedUserId: string; // Other user involved if applicable

  @Column({ nullable: true, length: 500 })
  reason: string; // Human-readable reason

  @Column({ type: 'jsonb', nullable: true })
  metadata: Record<string, unknown>; // Additional context

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
