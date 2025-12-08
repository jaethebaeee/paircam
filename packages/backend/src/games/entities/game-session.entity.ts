import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';
import { GameConfig, GameUserResults } from '../types/game.types';

@Entity('game_sessions')
export class GameSession {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'session_id' })
  sessionId: string;

  @Column({ name: 'user1_id' })
  user1Id: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user1_id' })
  user1: User;

  @Column({ name: 'user2_id' })
  user2Id: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user2_id' })
  user2: User;

  @Column({ type: 'jsonb', name: 'game_config' })
  gameConfig: GameConfig;

  @Column({ type: 'jsonb', name: 'user1_results', nullable: true })
  user1Results?: GameUserResults;

  @Column({ type: 'jsonb', name: 'user2_results', nullable: true })
  user2Results?: GameUserResults;

  @Column({ type: 'uuid', nullable: true, name: 'winner_id' })
  winnerId?: string;

  @Column({ type: 'int', default: 0, name: 'duration_seconds' })
  durationSeconds: number;

  @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP', name: 'started_at' })
  startedAt: Date;

  @Column({ type: 'timestamp', nullable: true, name: 'completed_at' })
  completedAt?: Date;

  @Column({ type: 'uuid', nullable: true, name: 'abandoned_by' })
  abandonedBy?: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
