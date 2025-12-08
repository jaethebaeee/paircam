import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, ManyToOne, JoinColumn, Index } from 'typeorm';
import { User } from '../../users/entities/user.entity';

@Entity('match_feedback')
@Index(['userId', 'createdAt'])
@Index(['matchId'])
@Index(['rating'])
export class MatchFeedback {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  matchId: string;

  @Column()
  sessionId: string;

  @Column()
  userId: string;

  @ManyToOne(() => User, { eager: false, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user?: User;

  @Column()
  peerId: string;

  // 1-5 star rating
  @Column({ type: 'integer' })
  rating: number; // 1 = very poor, 5 = excellent

  // Feedback reasons
  @Column({ type: 'simple-array', nullable: true })
  reasons?: string[]; // ['rude', 'great_conversation', 'bad_connection', 'not_interested', 'interesting_person']

  // Optional comment
  @Column({ type: 'text', nullable: true, length: 500 })
  comment?: string;

  // Match metadata for analysis
  @Column({ nullable: true })
  callDuration?: number; // seconds

  @Column({ nullable: true })
  compatibilityScore?: number;

  @Column({ nullable: true })
  region?: string;

  @Column({ nullable: true })
  queueType?: string;

  @Column({ type: 'simple-array', nullable: true })
  commonInterests?: string[];

  // Connection quality self-assessment
  @Column({ type: 'varchar', nullable: true })
  connectionQuality?: 'poor' | 'fair' | 'good' | 'excellent';

  // Usefulness for algorithm training
  @Column({ default: false })
  usedForTraining: boolean;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
