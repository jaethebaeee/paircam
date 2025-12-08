import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
  Unique,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';

@Entity('conversations')
@Unique(['participantOneId', 'participantTwoId'])
@Index(['participantOneId'])
@Index(['participantTwoId'])
@Index(['lastMessageAt'])
export class Conversation {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  // Always store the lower UUID first to ensure uniqueness
  @Column({ name: 'participant_one_id' })
  participantOneId: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'participant_one_id' })
  participantOne: User;

  @Column({ name: 'participant_two_id' })
  participantTwoId: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'participant_two_id' })
  participantTwo: User;

  @Column({ type: 'text', nullable: true, name: 'last_message_preview' })
  lastMessagePreview?: string;

  @Column({ type: 'timestamp', nullable: true, name: 'last_message_at' })
  lastMessageAt?: Date;

  @Column({ name: 'last_message_sender_id', nullable: true })
  lastMessageSenderId?: string;

  // Unread counts for each participant
  @Column({ default: 0, name: 'unread_count_one' })
  unreadCountOne: number;

  @Column({ default: 0, name: 'unread_count_two' })
  unreadCountTwo: number;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  // Helper to get unread count for a specific user
  getUnreadCountForUser(userId: string): number {
    if (userId === this.participantOneId) {
      return this.unreadCountOne;
    } else if (userId === this.participantTwoId) {
      return this.unreadCountTwo;
    }
    return 0;
  }

  // Helper to get the other participant
  getOtherParticipantId(userId: string): string {
    return userId === this.participantOneId
      ? this.participantTwoId
      : this.participantOneId;
  }
}
