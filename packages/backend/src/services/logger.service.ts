import { Injectable, LoggerService as NestLoggerService } from '@nestjs/common';
import * as winston from 'winston';

@Injectable()
export class LoggerService implements NestLoggerService {
  private readonly logger: winston.Logger;

  constructor() {
    this.logger = winston.createLogger({
      level: process.env.LOG_LEVEL || 'info',
      format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.errors({ stack: true }),
        winston.format.json(),
      ),
      defaultMeta: { service: 'video-chat-backend' },
      transports: [
        new winston.transports.Console({
          format: winston.format.combine(
            winston.format.colorize(),
            winston.format.simple(),
          ),
        }),
      ],
    });
  }

  log(message: string, context?: string | object) {
    this.logger.info(message, context);
  }

  error(message: string, trace?: string, context?: string | object) {
    const meta = typeof context === 'object' ? { trace, ...context } : { trace, context };
    this.logger.error(message, meta);
  }

  warn(message: string, context?: string | object) {
    this.logger.warn(message, context);
  }

  debug(message: string, context?: string | object) {
    this.logger.debug(message, context);
  }

  verbose(message: string, context?: string | object) {
    this.logger.verbose(message, context);
  }
}
