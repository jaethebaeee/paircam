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

@Entity('friendships')
@Unique(['userId', 'friendId']) // Prevent duplicate friendships
@Index(['userId'])
@Index(['friendId'])
export class Friendship {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'user_id' })
  userId: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user: User;

  @Column({ name: 'friend_id' })
  friendId: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'friend_id' })
  friend: User;

  @CreateDateColumn({ name: 'connected_at' })
  connectedAt: Date;

  @Column({ type: 'timestamp', nullable: true, name: 'last_interaction_at' })
  lastInteractionAt?: Date;
}
