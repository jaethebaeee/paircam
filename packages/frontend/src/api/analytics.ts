import { API_URL } from '../config/api';

export interface PeriodStats {
  calls: number;
  minutes: number;
  avgDuration: number;
  skipRate: number;
}

export interface UserAnalytics {
  totalCalls: number;
  totalMinutes: number;
  averageCallLength: number;
  averageConnectionTime: number;
  skipRate: number;
  topLanguages: Array<{ language: string; count: number }>;
  topRegions: Array<{ region: string; count: number }>;
  averageCompatibilityScore: number;
  stats7Days: PeriodStats;
  stats30Days: PeriodStats;
}

export interface CallHistoryItem {
  id: string;
  sessionId: string;
  duration: number;
  connectionTime: number;
  region: string;
  language: string;
  queueType: string;
  wasSkipped: boolean;
  compatibilityScore: number;
  commonInterests: string[];
  isTextOnly: boolean;
  createdAt: string;
}

/**
 * Get user statistics
 */
export async function getUserStats(
  accessToken: string,
): Promise<UserAnalytics> {
  const response = await fetch(`${API_URL}/users/me/stats`, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
    },
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: 'Failed to get stats' }));
    throw new Error(error.message || 'Failed to get stats');
  }

  const result = await response.json();
  return result.data;
}

/**
 * Get call history
 */
export async function getCallHistory(
  accessToken: string,
  limit: number = 50,
  offset: number = 0,
): Promise<CallHistoryItem[]> {
  const response = await fetch(
    `${API_URL}/users/me/call-history?limit=${limit}&offset=${offset}`,
    {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
      },
    },
  );

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: 'Failed to get call history' }));
    throw new Error(error.message || 'Failed to get call history');
  }

  const result = await response.json();
  return result.data;
}
