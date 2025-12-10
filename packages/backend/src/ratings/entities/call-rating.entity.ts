import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, ManyToOne, JoinColumn, Index } from 'typeorm';
import { User } from '../../users/entities/user.entity';

@Entity('call_ratings')
@Index(['fromUserId', 'createdAt'])
@Index(['toUserId', 'createdAt'])
export class CallRating {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'from_user_id' })
  fromUserId: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'from_user_id' })
  fromUser: User;

  @Column({ name: 'to_user_id' })
  toUserId: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'to_user_id' })
  toUser: User;

  @Column({ name: 'session_id' })
  sessionId: string;

  @Column({ type: 'int' })
  rating: number; // 1-5 stars

  @Column({ nullable: true, length: 200 })
  comment: string;

  @Column({ type: 'simple-array', nullable: true })
  tags: string[]; // ['friendly', 'funny', 'interesting', etc.]

  @Column({ name: 'is_favorite', default: false })
  isFavorite: boolean;

  @Column({ name: 'call_duration', default: 0 })
  callDuration: number; // seconds

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
