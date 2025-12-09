import { Injectable } from '@nestjs/common';
import { LoggerService } from '../services/logger.service';
import { RedisService } from '../redis/redis.service';

export interface ScreeningResult {
  isSafe: boolean;
  flagged: boolean;
  reason?: string;
  severity: 'low' | 'medium' | 'high';
  categories: string[];
}

export interface UserModerationStatus {
  warningCount: number;
  flagCount: number;
  lastFlaggedAt: number | null;
  status: 'good' | 'warned' | 'restricted' | 'banned';
}

@Injectable()
export class ContentScreeningService {
  // Pattern-based screening (can be enhanced with ML later)
  private readonly profanityPatterns: RegExp[] = [
    // Basic profanity patterns (redacted for safety)
    /\b(f+u+c+k+|s+h+i+t+|a+s+s+h+o+l+e+|b+i+t+c+h+|d+a+m+n+)\b/gi,
  ];

  private readonly harassmentPatterns: RegExp[] = [
    /\b(kill\s+(yourself|urself|you|your))\b/gi,
    /\b(kys|go\s+die)\b/gi,
    /\b(hate\s+(you|u))\b/gi,
    /\b(worthless|pathetic|loser)\b/gi,
  ];

  private readonly spamPatterns: RegExp[] = [
    /(.)\1{5,}/gi, // Repeated characters (aaaaaa)
    /(https?:\/\/[^\s]+){3,}/gi, // Multiple URLs
    /(\b\d{10,}\b)/gi, // Phone numbers
    /\b[\w.+-]+@[\w-]+\.[\w.-]+\b/gi, // Email addresses
  ];

  private readonly personalInfoPatterns: RegExp[] = [
    /\b(my\s+(phone|number|email|address|instagram|snapchat|whatsapp|telegram))\s*(is|:)?\s*[\w@.]+\b/gi,
    /\b(add\s+me\s+on|follow\s+me\s+on|dm\s+me)\b/gi,
    /\b(@[\w]{3,})\b/gi, // Social media handles
  ];

  constructor(
    private readonly logger: LoggerService,
    private readonly redisService: RedisService,
  ) {}

  /**
   * Screen text message for violations
   */
  async screenTextMessage(
    sessionId: string,
    userId: string,
    message: string,
  ): Promise<ScreeningResult> {
    const result: ScreeningResult = {
      isSafe: true,
      flagged: false,
      severity: 'low',
      categories: [],
    };

    // Skip empty messages
    if (!message || message.trim().length === 0) {
      return result;
    }

    const normalizedMessage = message.toLowerCase().trim();

    // Check for harassment (high severity)
    for (const pattern of this.harassmentPatterns) {
      if (pattern.test(normalizedMessage)) {
        result.isSafe = false;
        result.flagged = true;
        result.severity = 'high';
        result.categories.push('harassment');
        result.reason = 'Harassment or threatening language detected';
        break;
      }
    }

    // Check for profanity (medium severity)
    if (!result.flagged) {
      for (const pattern of this.profanityPatterns) {
        if (pattern.test(normalizedMessage)) {
          result.flagged = true;
          result.severity = 'medium';
          result.categories.push('profanity');
          result.reason = 'Profanity detected';
          // Still allow message but flag it
          break;
        }
      }
    }

    // Check for spam patterns (medium severity)
    for (const pattern of this.spamPatterns) {
      if (pattern.test(normalizedMessage)) {
        result.flagged = true;
        if (result.severity !== 'high') {
          result.severity = 'medium';
        }
        result.categories.push('spam');
        if (!result.reason) {
          result.reason = 'Spam-like content detected';
        }
        break;
      }
    }

    // Check for personal information sharing (low severity, just flag)
    for (const pattern of this.personalInfoPatterns) {
      if (pattern.test(normalizedMessage)) {
        result.flagged = true;
        result.categories.push('personal_info');
        if (!result.reason) {
          result.reason = 'Personal information sharing detected';
          result.severity = 'low';
        }
        break;
      }
    }

    // Log flagged content for review
    if (result.flagged) {
      await this.logFlaggedContent(sessionId, userId, message, result);
    }

    return result;
  }

  /**
   * Log flagged content for review
   */
  private async logFlaggedContent(
    sessionId: string,
    userId: string,
    message: string,
    result: ScreeningResult,
  ): Promise<void> {
    const logEntry = {
      sessionId,
      userId,
      message: message.substring(0, 200), // Truncate for storage
      categories: result.categories,
      severity: result.severity,
      timestamp: Date.now(),
    };

    // Store in Redis with 7-day expiration
    const key = `moderation:flags:${userId}:${Date.now()}`;
    await this.redisService.getClient().setEx(
      key,
      7 * 24 * 3600, // 7 days
      JSON.stringify(logEntry),
    );

    // Increment user's flag count
    await this.redisService.getClient().incr(`moderation:user:${userId}:flagCount`);
    await this.redisService.getClient().setEx(
      `moderation:user:${userId}:lastFlagged`,
      7 * 24 * 3600,
      Date.now().toString(),
    );

    this.logger.warn('Content flagged', {
      userId,
      sessionId,
      categories: result.categories,
      severity: result.severity,
    });
  }

  /**
   * Get user's moderation status
   */
  async getUserModerationStatus(userId: string): Promise<UserModerationStatus> {
    const [flagCountStr, warningCountStr, lastFlaggedStr] = await Promise.all([
      this.redisService.getClient().get(`moderation:user:${userId}:flagCount`),
      this.redisService.getClient().get(`moderation:user:${userId}:warningCount`),
      this.redisService.getClient().get(`moderation:user:${userId}:lastFlagged`),
    ]);

    const flagCount = parseInt(flagCountStr || '0', 10);
    const warningCount = parseInt(warningCountStr || '0', 10);
    const lastFlaggedAt = lastFlaggedStr ? parseInt(lastFlaggedStr, 10) : null;

    // Determine status based on counts
    let status: UserModerationStatus['status'] = 'good';
    if (warningCount >= 3 || flagCount >= 10) {
      status = 'banned';
    } else if (warningCount >= 2 || flagCount >= 5) {
      status = 'restricted';
    } else if (warningCount >= 1 || flagCount >= 3) {
      status = 'warned';
    }

    return {
      warningCount,
      flagCount,
      lastFlaggedAt,
      status,
    };
  }

  /**
   * Issue a warning to a user
   */
  async issueWarning(
    userId: string,
    reason: string,
    sessionId?: string,
  ): Promise<{ warningCount: number; action: 'warning' | 'restriction' | 'ban' }> {
    // Increment warning count
    const warningCount = await this.redisService.getClient().incr(`moderation:user:${userId}:warningCount`);

    // Log the warning
    const warningLog = {
      userId,
      reason,
      sessionId,
      timestamp: Date.now(),
      warningNumber: warningCount,
    };

    await this.redisService.getClient().lPush(
      `moderation:user:${userId}:warnings`,
      JSON.stringify(warningLog),
    );

    // Determine action based on warning count
    let action: 'warning' | 'restriction' | 'ban' = 'warning';
    if (warningCount >= 3) {
      action = 'ban';
      await this.banUser(userId, 'Multiple warnings', '24h');
    } else if (warningCount >= 2) {
      action = 'restriction';
      await this.restrictUser(userId, 1); // 1 hour restriction
    }

    this.logger.warn('Warning issued to user', {
      userId,
      reason,
      warningCount,
      action,
    });

    return { warningCount, action };
  }

  /**
   * Restrict a user temporarily
   */
  async restrictUser(userId: string, hours: number): Promise<void> {
    const restrictedUntil = Date.now() + hours * 3600 * 1000;
    await this.redisService.getClient().setEx(
      `moderation:user:${userId}:restricted`,
      hours * 3600,
      restrictedUntil.toString(),
    );

    this.logger.warn('User restricted', { userId, hours });
  }

  /**
   * Ban a user
   */
  async banUser(userId: string, reason: string, duration: '24h' | '7d' | 'permanent'): Promise<void> {
    const durationSeconds = duration === 'permanent' ? -1 : duration === '7d' ? 7 * 24 * 3600 : 24 * 3600;

    if (durationSeconds > 0) {
      await this.redisService.getClient().setEx(
        `moderation:user:${userId}:banned`,
        durationSeconds,
        JSON.stringify({ reason, bannedAt: Date.now(), duration }),
      );
    } else {
      await this.redisService.getClient().set(
        `moderation:user:${userId}:banned`,
        JSON.stringify({ reason, bannedAt: Date.now(), duration: 'permanent' }),
      );
    }

    this.logger.warn('User banned', { userId, reason, duration });
  }

  /**
   * Check if user is banned or restricted
   */
  async isUserRestricted(userId: string): Promise<{ restricted: boolean; reason?: string; until?: number }> {
    // Check ban status
    const banData = await this.redisService.getClient().get(`moderation:user:${userId}:banned`);
    if (banData) {
      const ban = JSON.parse(banData);
      return {
        restricted: true,
        reason: ban.reason,
        until: ban.duration === 'permanent' ? undefined : ban.bannedAt + this.durationToMs(ban.duration),
      };
    }

    // Check restriction status
    const restrictedUntil = await this.redisService.getClient().get(`moderation:user:${userId}:restricted`);
    if (restrictedUntil && parseInt(restrictedUntil, 10) > Date.now()) {
      return {
        restricted: true,
        reason: 'Temporary restriction',
        until: parseInt(restrictedUntil, 10),
      };
    }

    return { restricted: false };
  }

  private durationToMs(duration: string): number {
    if (duration === '24h') return 24 * 3600 * 1000;
    if (duration === '7d') return 7 * 24 * 3600 * 1000;
    return 0;
  }
}
