import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { GameSession } from './game-session.entity';
import { User } from '../../users/entities/user.entity';

@Entity('game_moves')
export class GameMove {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'game_session_id' })
  gameSessionId: string;

  @ManyToOne(() => GameSession, game => game.moves, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'game_session_id' })
  gameSession: GameSession;

  @Column({ name: 'player_id' })
  playerId: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'player_id' })
  player: User;

  @Column({ type: 'jsonb' })
  move: any; // Move-specific data (position, answer, etc.)

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
