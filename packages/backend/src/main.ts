import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { IoAdapter } from '@nestjs/platform-socket.io';
import helmet from 'helmet';
import * as Sentry from '@sentry/node';
import { AppModule } from './app.module';
import { LoggerService } from './services/logger.service';
import { SentryExceptionFilter } from './filters/sentry-exception.filter';
import { env } from './env';

// ═══════════════════════════════════════════════════════════════════
// 🔍 SENTRY: Initialize error tracking before anything else
// ═══════════════════════════════════════════════════════════════════
if (env.SENTRY_DSN) {
  Sentry.init({
    dsn: env.SENTRY_DSN,
    environment: env.NODE_ENV,
    release: process.env.npm_package_version || '1.0.0',

    // Performance monitoring
    tracesSampleRate: env.SENTRY_TRACES_SAMPLE_RATE,

    // Filter out health checks and common noise
    beforeSend(event, hint) {
      // Don't send expected errors (4xx client errors)
      const error = hint.originalException;
      if (error instanceof Error && error.message?.includes('Cannot')) {
        // Filter out 404s for favicon, etc.
        return null;
      }
      return event;
    },

    // Sanitize sensitive data
    beforeSendTransaction(event) {
      // Remove sensitive headers
      if (event.request?.headers) {
        delete event.request.headers.authorization;
        delete event.request.headers.cookie;
      }
      return event;
    },

    // Integrations
    integrations: [
      // Capture console.error calls
      Sentry.captureConsoleIntegration({ levels: ['error', 'warn'] }),
    ],
  });

  console.log('✅ Sentry initialized for error tracking');
}

async function bootstrap() {
  const logger = new LoggerService();
  const app = await NestFactory.create(AppModule, {
    logger,
  });

  // Security middleware
  app.use(helmet());
  
  // CORS configuration
  app.enableCors({
    origin: env.CORS_ORIGINS.split(','),
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  });

  // Global validation pipe
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: { enableImplicitConversion: true },
    }),
  );

  // Global exception filter for Sentry error tracking
  if (env.SENTRY_DSN) {
    app.useGlobalFilters(new SentryExceptionFilter());
  }

  // WebSocket adapter
  app.useWebSocketAdapter(new IoAdapter(app));

  // Request logging middleware
  app.use((req: import('express').Request & { id?: string }, res: import('express').Response, next: import('express').NextFunction) => {
    const requestId = req.headers['x-request-id'] as string || `${Date.now()}-${Math.random()}`;
    res.setHeader('x-request-id', requestId);
    req.id = requestId;
    logger.debug(`${req.method} ${req.path}`, { requestId });
    next();
  });

  const port = env.PORT || 3333;
  await app.listen(port, '0.0.0.0', () => {
    logger.log(`🚀 Server running on port ${port}`);
    logger.log(`Environment: ${env.NODE_ENV}`);
    logger.log(`Log Level: ${env.LOG_LEVEL}`);
  });
}

bootstrap().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
