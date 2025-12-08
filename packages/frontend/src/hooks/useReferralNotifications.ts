import { useEffect, useCallback, useRef } from 'react';
import { toast } from 'sonner';
import { RealtimeChannel } from '@supabase/supabase-js';
import { getSupabase, isSupabaseConfigured } from '../lib/supabase';

interface ReferralNotification {
  referredUsername: string;
  coinsEarned: number;
  tier?: string;
  isMilestone?: boolean;
  milestoneBonus?: number;
}

interface UseReferralNotificationsProps {
  userId: string | null;
  enabled?: boolean;
  onNotification?: (notification: ReferralNotification) => void;
}

/**
 * Hook to subscribe to real-time referral notifications via Supabase
 *
 * When someone uses your referral code, you'll receive a notification
 */
export function useReferralNotifications({
  userId,
  enabled = true,
  onNotification,
}: UseReferralNotificationsProps) {
  const channelRef = useRef<RealtimeChannel | null>(null);

  const handleNotification = useCallback((notification: ReferralNotification) => {
    // Show toast notification
    if (notification.isMilestone && notification.milestoneBonus) {
      toast.success(`Milestone Reached! +${notification.milestoneBonus} bonus coins`, {
        description: `You've reached a new referral tier: ${notification.tier}!`,
        duration: 8000,
      });
    } else {
      toast.success(`New Referral! +${notification.coinsEarned} coins`, {
        description: `${notification.referredUsername || 'Someone'} joined using your code!`,
        duration: 5000,
      });
    }

    // Call custom handler if provided
    onNotification?.(notification);
  }, [onNotification]);

  useEffect(() => {
    // Don't subscribe if not enabled or no user ID
    if (!enabled || !userId) return;

    // Don't subscribe if Supabase is not configured
    if (!isSupabaseConfigured()) {
      console.log('Supabase not configured - referral notifications disabled');
      return;
    }

    const supabase = getSupabase();
    if (!supabase) return;

    // Subscribe to referral notifications channel
    const channel = supabase
      .channel(`referral-notifications:${userId}`)
      .on(
        'broadcast',
        { event: 'new_referral' },
        (payload) => {
          handleNotification(payload.payload as ReferralNotification);
        }
      )
      .on(
        'broadcast',
        { event: 'milestone_reached' },
        (payload) => {
          handleNotification({
            ...payload.payload as ReferralNotification,
            isMilestone: true,
          });
        }
      )
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          console.log('Subscribed to referral notifications');
        }
      });

    channelRef.current = channel;

    // Cleanup on unmount
    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
    };
  }, [userId, enabled, handleNotification]);

  // Return a method to manually trigger a test notification (for development)
  const sendTestNotification = useCallback(() => {
    handleNotification({
      referredUsername: 'TestUser',
      coinsEarned: 100,
      tier: 'Bronze',
    });
  }, [handleNotification]);

  return {
    sendTestNotification,
  };
}

/**
 * Broadcast a referral notification to a user (call from backend)
 * This is typically called from the backend after a successful referral
 */
export async function broadcastReferralNotification(
  targetUserId: string,
  notification: ReferralNotification
): Promise<boolean> {
  if (!isSupabaseConfigured()) return false;

  const supabase = getSupabase();
  if (!supabase) return false;

  try {
    const channel = supabase.channel(`referral-notifications:${targetUserId}`);

    await channel.send({
      type: 'broadcast',
      event: notification.isMilestone ? 'milestone_reached' : 'new_referral',
      payload: notification,
    });

    return true;
  } catch (error) {
    console.error('Failed to broadcast referral notification:', error);
    return false;
  }
}
