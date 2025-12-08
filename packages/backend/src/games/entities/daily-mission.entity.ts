import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';

@Entity('daily_missions')
export class DailyMission {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'user_id' })
  userId: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user: User;

  @Column({ length: 50, name: 'mission_type' })
  missionType: 'matches' | 'game_wins' | 'playtime' | 'gift_sent' | 'coins_earned';

  @Column()
  target: number; // Get 3 matches, win 5 games, etc.

  @Column({ default: 0 })
  progress: number;

  @Column({ name: 'coins_reward' })
  coinsReward: number;

  @Column({ nullable: true, type: 'timestamp', name: 'completed_at' })
  completedAt?: Date;

  @Column({ type: 'timestamp', name: 'expires_at' })
  expiresAt: Date;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
