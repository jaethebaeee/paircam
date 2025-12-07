import { MigrationInterface, QueryRunner } from 'typeorm';

export class InitialSchema1733608800000 implements MigrationInterface {
  name = 'InitialSchema1733608800000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Create users table
    await queryRunner.query(`
      CREATE TABLE "users" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "device_id" character varying NOT NULL,
        "email" character varying,
        "google_id" character varying,
        "apple_id" character varying,
        "username" character varying(50),
        "gender" character varying(20),
        "date_of_birth" date,
        "age" integer,
        "avatar_url" character varying,
        "bio" character varying(500),
        "interests" text,
        "country_code" character varying(2),
        "language_preference" character varying(10) DEFAULT 'en',
        "is_profile_complete" boolean NOT NULL DEFAULT false,
        "show_age" boolean NOT NULL DEFAULT true,
        "show_location" boolean NOT NULL DEFAULT false,
        "is_banned" boolean NOT NULL DEFAULT false,
        "ban_reason" character varying,
        "banned_until" TIMESTAMP,
        "warning_count" integer NOT NULL DEFAULT 0,
        "last_active" TIMESTAMP NOT NULL DEFAULT now(),
        "total_matches" integer NOT NULL DEFAULT 0,
        "total_reports_received" integer NOT NULL DEFAULT 0,
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "UQ_users_device_id" UNIQUE ("device_id"),
        CONSTRAINT "UQ_users_email" UNIQUE ("email"),
        CONSTRAINT "UQ_users_google_id" UNIQUE ("google_id"),
        CONSTRAINT "UQ_users_apple_id" UNIQUE ("apple_id"),
        CONSTRAINT "UQ_users_username" UNIQUE ("username"),
        CONSTRAINT "PK_users" PRIMARY KEY ("id")
      )
    `);

    // Create subscriptions table
    await queryRunner.query(`
      CREATE TABLE "subscriptions" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "user_id" uuid NOT NULL,
        "stripe_customer_id" character varying NOT NULL,
        "stripe_subscription_id" character varying NOT NULL,
        "stripe_price_id" character varying NOT NULL,
        "status" character varying(50) NOT NULL,
        "plan" character varying(50) NOT NULL,
        "current_period_start" TIMESTAMP NOT NULL,
        "current_period_end" TIMESTAMP NOT NULL,
        "trial_end" TIMESTAMP,
        "cancel_at_period_end" boolean NOT NULL DEFAULT false,
        "canceled_at" TIMESTAMP,
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "UQ_subscriptions_stripe_customer_id" UNIQUE ("stripe_customer_id"),
        CONSTRAINT "UQ_subscriptions_stripe_subscription_id" UNIQUE ("stripe_subscription_id"),
        CONSTRAINT "PK_subscriptions" PRIMARY KEY ("id")
      )
    `);

    // Create payments table
    await queryRunner.query(`
      CREATE TABLE "payments" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "user_id" uuid NOT NULL,
        "subscription_id" uuid,
        "stripe_payment_intent_id" character varying,
        "stripe_invoice_id" character varying,
        "amount" integer NOT NULL,
        "currency" character varying(3) NOT NULL DEFAULT 'usd',
        "status" character varying(50) NOT NULL,
        "payment_method" character varying(50),
        "failure_reason" character varying,
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "UQ_payments_stripe_payment_intent_id" UNIQUE ("stripe_payment_intent_id"),
        CONSTRAINT "PK_payments" PRIMARY KEY ("id")
      )
    `);

    // Add foreign key constraints
    await queryRunner.query(`
      ALTER TABLE "subscriptions"
      ADD CONSTRAINT "FK_subscriptions_user"
      FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION
    `);

    await queryRunner.query(`
      ALTER TABLE "payments"
      ADD CONSTRAINT "FK_payments_user"
      FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION
    `);

    await queryRunner.query(`
      ALTER TABLE "payments"
      ADD CONSTRAINT "FK_payments_subscription"
      FOREIGN KEY ("subscription_id") REFERENCES "subscriptions"("id") ON DELETE SET NULL ON UPDATE NO ACTION
    `);

    // Create indexes for common queries
    await queryRunner.query(`CREATE INDEX "IDX_users_device_id" ON "users" ("device_id")`);
    await queryRunner.query(`CREATE INDEX "IDX_users_email" ON "users" ("email")`);
    await queryRunner.query(`CREATE INDEX "IDX_users_google_id" ON "users" ("google_id")`);
    await queryRunner.query(`CREATE INDEX "IDX_subscriptions_user_id" ON "subscriptions" ("user_id")`);
    await queryRunner.query(`CREATE INDEX "IDX_subscriptions_status" ON "subscriptions" ("status")`);
    await queryRunner.query(`CREATE INDEX "IDX_payments_user_id" ON "payments" ("user_id")`);

    // Enable uuid-ossp extension if not exists
    await queryRunner.query(`CREATE EXTENSION IF NOT EXISTS "uuid-ossp"`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop indexes
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_payments_user_id"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_subscriptions_status"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_subscriptions_user_id"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_users_google_id"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_users_email"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_users_device_id"`);

    // Drop foreign keys
    await queryRunner.query(`ALTER TABLE "payments" DROP CONSTRAINT IF EXISTS "FK_payments_subscription"`);
    await queryRunner.query(`ALTER TABLE "payments" DROP CONSTRAINT IF EXISTS "FK_payments_user"`);
    await queryRunner.query(`ALTER TABLE "subscriptions" DROP CONSTRAINT IF EXISTS "FK_subscriptions_user"`);

    // Drop tables
    await queryRunner.query(`DROP TABLE IF EXISTS "payments"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "subscriptions"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "users"`);
  }
}
