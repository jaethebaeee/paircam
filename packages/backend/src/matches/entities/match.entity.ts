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
 * Match Entity
 *
 * Persists match history to PostgreSQL for long-term analytics and moderation.
 * Complements the Redis-based real-time session tracking.
 */
@Entity('matches')
@Index(['createdAt']) // For time-range queries
@Index(['user1Id', 'user2Id']) // For user match history
@Index(['region']) // For regional analytics
@Index(['queueType']) // For queue type analytics
@Index(['wasSkipped']) // For skip rate analysis
export class Match {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'session_id', unique: true })
  sessionId: string;

  // User 1 (the one who joined queue first)
  @Column({ name: 'user1_id' })
  user1Id: string;

  @ManyToOne(() => User, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'user1_id' })
  user1: User;

  // User 2 (matched partner)
  @Column({ name: 'user2_id' })
  user2Id: string;

  @ManyToOne(() => User, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'user2_id' })
  user2: User;

  // Match quality metrics
  @Column({ type: 'int', default: 0, name: 'compatibility_score' })
  compatibilityScore: number; // 0-100

  @Column({ type: 'simple-array', nullable: true, name: 'common_interests' })
  commonInterests: string[];

  // Session metadata
  @Column({ length: 50, default: 'global' })
  region: string;

  @Column({ length: 10, default: 'en' })
  language: string;

  @Column({ length: 20, default: 'casual', name: 'queue_type' })
  queueType: string; // casual, serious, language, gaming

  // Timing metrics
  @Column({ type: 'int', default: 0, name: 'user1_wait_time' })
  user1WaitTime: number; // milliseconds

  @Column({ type: 'int', default: 0, name: 'user2_wait_time' })
  user2WaitTime: number; // milliseconds

  @Column({ type: 'int', nullable: true, name: 'connection_time' })
  connectionTime: number; // milliseconds to establish WebRTC

  @Column({ type: 'int', default: 0, name: 'call_duration' })
  callDuration: number; // seconds

  // Outcome
  @Column({ default: false, name: 'was_skipped' })
  wasSkipped: boolean;

  @Column({ nullable: true, length: 50, name: 'ended_by' })
  endedBy: string; // userId of who ended the call

  @Column({ nullable: true, length: 50, name: 'end_reason' })
  endReason: string; // skip, natural, disconnect, error

  // Connection quality
  @Column({
    type: 'varchar',
    length: 20,
    nullable: true,
    name: 'connection_type',
  })
  connectionType: string; // direct, relay

  @Column({ default: false, name: 'connection_failed' })
  connectionFailed: boolean;

  // Quality score (calculated post-call)
  @Column({ type: 'int', default: 0, name: 'quality_score' })
  qualityScore: number; // 0-100

  // Timestamps
  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @Column({ type: 'timestamp', nullable: true, name: 'connected_at' })
  connectedAt: Date;

  @Column({ type: 'timestamp', nullable: true, name: 'ended_at' })
  endedAt: Date;
}
