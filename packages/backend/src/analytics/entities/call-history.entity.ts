import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, ManyToOne, JoinColumn, Index } from 'typeorm';
import { User } from '../../users/entities/user.entity';

@Entity('call_history')
@Index(['userId', 'createdAt'])
export class CallHistory {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'user_id' })
  userId: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user: User;

  @Column({ name: 'peer_id', nullable: true })
  peerId: string;

  @Column({ name: 'session_id' })
  sessionId: string;

  @Column({ name: 'match_id', nullable: true })
  matchId: string;

  @Column({ default: 0 })
  duration: number; // seconds

  @Column({ name: 'connection_time', default: 0 })
  connectionTime: number; // milliseconds to establish connection

  @Column({ name: 'peer_reputation', nullable: true })
  peerReputation: number;

  @Column({ nullable: true })
  region: string;

  @Column({ nullable: true })
  language: string;

  @Column({ name: 'queue_type', nullable: true })
  queueType: string;

  @Column({ name: 'was_skipped', default: false })
  wasSkipped: boolean;

  @Column({ name: 'compatibility_score', nullable: true })
  compatibilityScore: number;

  @Column({ name: 'common_interests', type: 'simple-array', nullable: true })
  commonInterests: string[];

  @Column({ name: 'is_text_only', default: false })
  isTextOnly: boolean;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
