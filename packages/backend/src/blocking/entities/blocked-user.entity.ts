import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, ManyToOne, JoinColumn, Index, Unique } from 'typeorm';
import { User } from '../../users/entities/user.entity';

@Entity('blocked_users')
@Unique(['blockerId', 'blockedId']) // Each user can only block another user once
@Index(['blockerId']) // Fast lookup for getting all users blocked by a user
@Index(['blockedId']) // Fast lookup for checking if user is blocked by anyone
export class BlockedUser {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'blocker_id' })
  blockerId: string;

  @Column({ name: 'blocked_id' })
  blockedId: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'blocker_id' })
  blocker: User;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'blocked_id' })
  blocked: User;

  @Column({ nullable: true, length: 500 })
  reason?: string;

  @Column({ nullable: true, name: 'session_id' })
  sessionId?: string; // The session where the block occurred

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
