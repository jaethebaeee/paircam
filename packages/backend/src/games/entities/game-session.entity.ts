import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  OneToMany,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';
import { GameMove } from './game-move.entity';

@Entity('game_sessions')
export class GameSession {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'session_id' })
  sessionId: string; // Video call session ID

  @Column({ length: 50 })
  type: 'tic-tac-toe' | 'trivia' | 'truth-dare' | '20-questions';

  @Column({ name: 'player1_id' })
  player1Id: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'player1_id' })
  player1: User;

  @Column({ name: 'player2_id' })
  player2Id: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'player2_id' })
  player2: User;

  @Column({ type: 'jsonb', nullable: true })
  state: any; // Game-specific state (board, questions, etc.)

  @Column({ nullable: true, name: 'winner_id' })
  winnerId?: string;

  @ManyToOne(() => User, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'winner_id' })
  winner?: User;

  @Column({ default: 'in-progress', length: 50 })
  status: 'in-progress' | 'completed' | 'abandoned' | 'declined';

  @Column({ default: 0, name: 'player1_score' })
  player1Score: number;

  @Column({ default: 0, name: 'player2_score' })
  player2Score: number;

  @Column({ nullable: true, name: 'ended_at', type: 'timestamp' })
  endedAt?: Date;

  @OneToMany(() => GameMove, move => move.gameSession, { cascade: true })
  moves: GameMove[];

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
