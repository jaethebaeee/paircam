import { Injectable, OnModuleInit, Logger } from '@nestjs/common';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { env } from '../env';

export interface ReferralNotification {
  referredUsername?: string;
  coinsEarned: number;
  tier?: string;
  isMilestone?: boolean;
  milestoneBonus?: number;
}

@Injectable()
export class SupabaseService implements OnModuleInit {
  private supabase: SupabaseClient | null = null;
  private readonly logger = new Logger(SupabaseService.name);

  onModuleInit() {
    this.initializeClient();
  }

  private initializeClient() {
    const supabaseUrl = env.SUPABASE_URL;
    const supabaseServiceKey = env.SUPABASE_SERVICE_KEY;

    if (!supabaseUrl || !supabaseServiceKey) {
      this.logger.warn('Supabase not configured - realtime notifications disabled');
      return;
    }

    try {
      this.supabase = createClient(supabaseUrl, supabaseServiceKey, {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      });
      this.logger.log('Supabase client initialized');
    } catch (error) {
      this.logger.error('Failed to initialize Supabase client:', error);
    }
  }

  /**
   * Check if Supabase is configured
   */
  isConfigured(): boolean {
    return this.supabase !== null;
  }

  /**
   * Get the Supabase client
   */
  getClient(): SupabaseClient | null {
    return this.supabase;
  }

  /**
   * Broadcast a referral notification to a user
   */
  async broadcastReferralNotification(
    targetUserId: string,
    notification: ReferralNotification,
  ): Promise<boolean> {
    if (!this.supabase) {
      this.logger.debug('Supabase not configured - skipping notification broadcast');
      return false;
    }

    try {
      const channel = this.supabase.channel(`referral-notifications:${targetUserId}`);

      const eventType = notification.isMilestone ? 'milestone_reached' : 'new_referral';

      await channel.send({
        type: 'broadcast',
        event: eventType,
        payload: notification,
      });

      this.logger.debug(`Broadcasted ${eventType} to user ${targetUserId}`);
      return true;
    } catch (error) {
      this.logger.error('Failed to broadcast referral notification:', error);
      return false;
    }
  }

  /**
   * Broadcast a new referral event
   */
  async notifyNewReferral(
    referrerId: string,
    referredUsername: string,
    coinsEarned: number,
  ): Promise<boolean> {
    return this.broadcastReferralNotification(referrerId, {
      referredUsername,
      coinsEarned,
    });
  }

  /**
   * Broadcast a milestone reached event
   */
  async notifyMilestoneReached(
    userId: string,
    tier: string,
    milestoneBonus: number,
  ): Promise<boolean> {
    return this.broadcastReferralNotification(userId, {
      coinsEarned: milestoneBonus,
      tier,
      isMilestone: true,
      milestoneBonus,
    });
  }
}
