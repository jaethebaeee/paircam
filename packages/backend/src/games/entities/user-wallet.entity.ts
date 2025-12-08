import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  OneToOne,
  JoinColumn,
  ManyToOne,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';

@Entity('user_wallets')
export class UserWallet {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true, name: 'user_id' })
  userId: string;

  @OneToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user: User;

  @Column({ default: 0, name: 'coins_balance' })
  coinsBalance: number;

  @Column({ default: 0, name: 'gems_balance' })
  gemsBalance: number;

  @Column({ default: 0, name: 'total_coins_earned' })
  totalCoinsEarned: number;

  @Column({ default: 0, name: 'total_coins_spent' })
  totalCoinsSpent: number;

  @Column({ default: 0, name: 'current_streak' })
  currentStreak: number;

  @Column({ nullable: true, type: 'timestamp', name: 'last_mission_completion' })
  lastMissionCompletion?: Date;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
