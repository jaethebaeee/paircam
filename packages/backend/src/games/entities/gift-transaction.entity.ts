import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';
import { GiftCatalog } from './gift-catalog.entity';

@Entity('gift_transactions')
export class GiftTransaction {
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

  @Column({ nullable: true, name: 'session_id' })
  sessionId?: string; // Which call session was this sent in

  @Column({ name: 'gift_id' })
  giftId: string;

  @ManyToOne(() => GiftCatalog, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'gift_id' })
  gift: GiftCatalog;

  @Column({ name: 'cost_coins' })
  costCoins: number;

  @CreateDateColumn({ name: 'sent_at' })
  sentAt: Date;
}
