import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
  Unique,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';

@Entity('blocked_users')
@Unique(['userId', 'blockedUserId'])
@Index(['userId'])
export class BlockedUser {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'user_id' })
  userId: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user: User;

  @Column({ name: 'blocked_user_id' })
  blockedUserId: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'blocked_user_id' })
  blockedUser: User;

  @Column({ nullable: true, length: 200 })
  reason?: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
