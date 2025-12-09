import { API_URL } from '../config/api';

export interface RatingStats {
  averageRating: number;
  totalRatings: number;
  ratingDistribution: Record<number, number>;
  topTags: Array<{ tag: string; count: number }>;
  favoriteCount: number;
}

export interface SubmitRatingData {
  sessionId: string;
  toUserId: string;
  rating: number;
  comment?: string;
  tags?: string[];
  isFavorite?: boolean;
  callDuration?: number;
}

export interface RatingItem {
  id: string;
  rating: number;
  comment?: string;
  tags?: string[];
  isFavorite?: boolean;
  createdAt: string;
}

/**
 * Submit a call rating
 */
export async function submitRating(
  accessToken: string,
  data: SubmitRatingData,
): Promise<{ success: boolean; error?: string }> {
  const response = await fetch(`${API_URL}/ratings`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify(data),
  });

  const result = await response.json();

  if (!response.ok || !result.success) {
    throw new Error(result.error || 'Failed to submit rating');
  }

  return result;
}

/**
 * Get user's rating statistics
 */
export async function getMyRatingStats(accessToken: string): Promise<RatingStats> {
  const response = await fetch(`${API_URL}/ratings/me/stats`, {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  if (!response.ok) {
    throw new Error('Failed to get rating stats');
  }

  const result = await response.json();
  return result.data;
}

/**
 * Get ratings received by user
 */
export async function getReceivedRatings(
  accessToken: string,
  limit: number = 10,
): Promise<RatingItem[]> {
  const response = await fetch(`${API_URL}/ratings/me/received?limit=${limit}`, {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  if (!response.ok) {
    throw new Error('Failed to get received ratings');
  }

  const result = await response.json();
  return result.data;
}

/**
 * Get user's favorites list
 */
export async function getFavorites(accessToken: string): Promise<string[]> {
  const response = await fetch(`${API_URL}/ratings/me/favorites`, {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  if (!response.ok) {
    throw new Error('Failed to get favorites');
  }

  const result = await response.json();
  return result.data;
}

/**
 * Remove a user from favorites
 */
export async function removeFavorite(
  accessToken: string,
  userId: string,
): Promise<void> {
  const response = await fetch(`${API_URL}/ratings/me/favorites/${userId}`, {
    method: 'DELETE',
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  if (!response.ok) {
    throw new Error('Failed to remove favorite');
  }
}
