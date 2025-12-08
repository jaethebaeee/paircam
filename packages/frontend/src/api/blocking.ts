import { API_URL } from '../config/api';

export interface BlockedUserInfo {
  id: string;
  blockedId: string;
  blockedUsername?: string;
  reason?: string;
  createdAt: string;
}

export interface BlockedUsersResponse {
  blocked: BlockedUserInfo[];
  count: number;
}

/**
 * Block a user
 */
export async function blockUser(
  accessToken: string,
  blockedUserId: string,
  reason?: string,
  sessionId?: string,
): Promise<{ success: boolean; message: string }> {
  const response = await fetch(`${API_URL}/blocks`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${accessToken}`,
    },
    body: JSON.stringify({
      blockedUserId,
      reason,
      sessionId,
    }),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: 'Failed to block user' }));
    throw new Error(error.message || 'Failed to block user');
  }

  return response.json();
}

/**
 * Unblock a user
 */
export async function unblockUser(
  accessToken: string,
  blockedUserId: string,
): Promise<{ success: boolean; message: string }> {
  const response = await fetch(`${API_URL}/blocks`, {
    method: 'DELETE',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${accessToken}`,
    },
    body: JSON.stringify({
      blockedUserId,
    }),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: 'Failed to unblock user' }));
    throw new Error(error.message || 'Failed to unblock user');
  }

  return response.json();
}

/**
 * Get list of blocked users
 */
export async function getBlockedUsers(
  accessToken: string,
): Promise<BlockedUsersResponse> {
  const response = await fetch(`${API_URL}/blocks`, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
    },
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: 'Failed to get blocked users' }));
    throw new Error(error.message || 'Failed to get blocked users');
  }

  return response.json();
}

/**
 * Get count of blocked users
 */
export async function getBlockedCount(
  accessToken: string,
): Promise<{ count: number }> {
  const response = await fetch(`${API_URL}/blocks/count`, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
    },
  });

  if (!response.ok) {
    return { count: 0 };
  }

  return response.json();
}
