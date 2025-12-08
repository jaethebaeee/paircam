import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, UpdateDateColumn, OneToMany, Index } from 'typeorm';
import { Subscription } from '../../subscriptions/entities/subscription.entity';

@Entity('users')
@Index(['lastActive']) // For finding active users and cleanup queries
@Index(['isBanned', 'bannedUntil']) // For ban checks during connection
@Index(['createdAt']) // For analytics and user growth metrics
@Index(['countryCode', 'languagePreference']) // For regional matching optimization
@Index(['role']) // For admin/moderator queries
@Index(['totalReportsReceived']) // For moderation queue sorting
export class User {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true, name: 'device_id' })
  deviceId: string;

  @Column({ unique: true, nullable: true })
  email?: string;

  @Column({ unique: true, nullable: true, name: 'google_id' })
  googleId?: string;

  @Column({ unique: true, nullable: true, name: 'apple_id' })
  appleId?: string;

  @Column({ unique: true, nullable: true, length: 50 })
  username?: string;

  @Column({ nullable: true, length: 20 })
  gender?: string;

  @Column({ type: 'date', nullable: true, name: 'date_of_birth' })
  dateOfBirth?: Date;

  @Column({ nullable: true })
  age?: number;

  @Column({ nullable: true, name: 'avatar_url' })
  avatarUrl?: string;

  @Column({ nullable: true, length: 500 })
  bio?: string;

  @Column({ type: 'simple-array', nullable: true })
  interests?: string[];

  @Column({ nullable: true, length: 2, name: 'country_code' })
  countryCode?: string;

  @Column({ nullable: true, length: 10, name: 'language_preference', default: 'en' })
  languagePreference: string;

  @Column({ default: false, name: 'is_profile_complete' })
  isProfileComplete: boolean;

  @Column({ default: true, name: 'show_age' })
  showAge: boolean;

  @Column({ default: false, name: 'show_location' })
  showLocation: boolean;

  @Column({ default: false, name: 'is_banned' })
  isBanned: boolean;

  @Column({ nullable: true, name: 'ban_reason' })
  banReason?: string;

  @Column({ type: 'timestamp', nullable: true, name: 'banned_until' })
  bannedUntil?: Date;

  @Column({ default: 0, name: 'warning_count' })
  warningCount: number;

  @Column({ default: 'user', length: 20 })
  role: 'user' | 'moderator' | 'admin';

  @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP', name: 'last_active' })
  lastActive: Date;

  @Column({ default: 0, name: 'total_matches' })
  totalMatches: number;

  @Column({ default: 0, name: 'total_reports_received' })
  totalReportsReceived: number;

  @OneToMany(() => Subscription, subscription => subscription.user, { eager: false })
  subscriptions: Subscription[];

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}

