import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  OneToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';

/**
 * UserReputation Entity
 *
 * Persists user reputation data to PostgreSQL for long-term tracking.
 * Replaces the Redis-only reputation system that expires after 90 days.
 */
@Entity('user_reputation')
@Index(['rating']) // For leaderboard queries
@Index(['skipRate']) // For matching optimization
@Index(['updatedAt']) // For activity tracking
export class UserReputation {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'user_id', unique: true })
  userId: string;

  @OneToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user: User;

  // Core reputation metrics (0-100)
  @Column({ type: 'decimal', precision: 5, scale: 2, default: 50.0 })
  rating: number;

  // Behavior metrics
  @Column({ type: 'int', default: 0, name: 'total_calls' })
  totalCalls: number;

  @Column({ type: 'int', default: 0, name: 'completed_calls' })
  completedCalls: number; // Calls > 60 seconds

  @Column({ type: 'int', default: 0, name: 'skipped_calls' })
  skippedCalls: number;

  @Column({ type: 'decimal', precision: 5, scale: 2, default: 0.0, name: 'skip_rate' })
  skipRate: number; // Percentage

  @Column({ type: 'int', default: 0, name: 'total_call_duration' })
  totalCallDuration: number; // Total seconds of all calls

  @Column({ type: 'decimal', precision: 8, scale: 2, default: 0.0, name: 'avg_call_duration' })
  avgCallDuration: number; // Average seconds per call

  // Reports and moderation
  @Column({ type: 'int', default: 0, name: 'reports_received' })
  reportsReceived: number;

  @Column({ type: 'int', default: 0, name: 'reports_submitted' })
  reportsSubmitted: number;

  @Column({ type: 'int', default: 0, name: 'warnings_count' })
  warningsCount: number;

  @Column({ type: 'int', default: 0, name: 'bans_count' })
  bansCount: number;

  // Positive indicators
  @Column({ type: 'int', default: 0, name: 'friend_requests_received' })
  friendRequestsReceived: number;

  @Column({ type: 'int', default: 0, name: 'friend_requests_accepted' })
  friendRequestsAccepted: number;

  // Connection quality
  @Column({ type: 'int', default: 0, name: 'connection_failures' })
  connectionFailures: number;

  @Column({ type: 'decimal', precision: 5, scale: 2, default: 0.0, name: 'connection_success_rate' })
  connectionSuccessRate: number;

  // Timestamps
  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  @Column({ type: 'timestamp', nullable: true, name: 'last_call_at' })
  lastCallAt: Date;
}
