import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  OneToMany,
} from 'typeorm';
import { GiftTransaction } from './gift-transaction.entity';

@Entity('gift_catalog')
export class GiftCatalog {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ length: 50 })
  name: string; // "Rose", "Ring", "Jet Ski"

  @Column({ name: 'cost_coins' })
  costCoins: number;

  @Column({ nullable: true, name: 'cost_gems' })
  costGems?: number; // Can be bought with premium currency

  @Column({ nullable: true, name: 'image_url' })
  imageUrl?: string;

  @Column({ length: 10, nullable: true })
  emoji?: string; // Emoji representation of the gift (e.g., '🌹', '💍')

  @Column({ length: 50, default: 'common' })
  rarity: 'common' | 'rare' | 'epic' | 'legendary';

  @Column({ default: true })
  active: boolean;

  @OneToMany(() => GiftTransaction, transaction => transaction.gift, { cascade: false })
  transactions: GiftTransaction[];

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
