import { Injectable } from '@nestjs/common';
import { createHmac } from 'crypto';
import { LoggerService } from '../services/logger.service';
import { env } from '../env';

export interface TurnCredentials {
  urls: string[];
  username: string;
  credential: string;
  ttl: number;
}

@Injectable()
export class TurnService {
  constructor(private readonly logger: LoggerService) {}

  generateCredentials(deviceId: string): TurnCredentials {
    // Managed provider: return static provider credentials
    if (env.TURN_PROVIDER === 'managed' && env.TURN_URLS && env.TURN_USERNAME && env.TURN_PASSWORD) {
      const urls = env.TURN_URLS.split(/[,;\s]+/).filter(Boolean);
      this.logger.debug('Using managed TURN provider credentials', { provider: 'managed', urlsCount: urls.length });
      return {
        urls,
        username: env.TURN_USERNAME,
        credential: env.TURN_PASSWORD,
        ttl: 3600,
      };
    }

    // Default: coturn shared-secret flow
    const ttl = 3600; // 1 hour
    const timestamp = Math.floor(Date.now() / 1000) + ttl;
    const username = `${timestamp}:${deviceId}`;
    const credential = createHmac('sha1', env.TURN_SHARED_SECRET).update(username).digest('base64');
    const urls = [`turn:${env.TURN_HOST}:${env.TURN_PORT}`, `turns:${env.TURN_HOST}:${env.TURN_TLS_PORT}`];
    this.logger.debug('Generated TURN credentials', { deviceId, username: username.substring(0, 20) + '...', ttl });
    return { urls, username, credential, ttl };
  }

  validateCredentials(username: string, credential: string): boolean {
    try {
      const expectedCredential = createHmac('sha1', env.TURN_SHARED_SECRET)
        .update(username)
        .digest('base64');
      
      return expectedCredential === credential;
    } catch (error) {
      this.logger.warn('Failed to validate TURN credentials', { error: error.message });
      return false;
    }
  }

  isCredentialsExpired(username: string): boolean {
    try {
      const timestamp = parseInt(username.split(':')[0], 10);
      const now = Math.floor(Date.now() / 1000);
      return timestamp < now;
    } catch (error) {
      this.logger.warn('Failed to parse TURN username timestamp', { error: error.message });
      return true;
    }
  }
}
