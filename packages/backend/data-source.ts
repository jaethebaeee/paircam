import { DataSource } from 'typeorm';
import { User } from './src/users/entities/user.entity';
import { Subscription } from './src/subscriptions/entities/subscription.entity';
import { Payment } from './src/payments/entities/payment.entity';

// Load environment variables
import * as dotenv from 'dotenv';
dotenv.config();

const dataSource = new DataSource({
  type: 'postgres',
  url: process.env.DATABASE_URL,
  entities: [User, Subscription, Payment],
  migrations: ['src/migrations/*.ts'],
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
});

export default dataSource;
