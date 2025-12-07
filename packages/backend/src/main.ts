import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { IoAdapter } from '@nestjs/platform-socket.io';
import helmet from 'helmet';
import express from 'express';
import { AppModule } from './app.module';
import { LoggerService } from './services/logger.service';
import { env } from './env';

async function bootstrap() {
  const logger = new LoggerService();
  const app = await NestFactory.create(AppModule, {
    logger,
    // Enable raw body for Stripe webhooks
    rawBody: true,
  });

  // CRITICAL: Raw body middleware for Stripe webhooks
  // Must be BEFORE other body parsers to capture raw body for signature verification
  app.use('/payments/webhook', express.raw({ type: 'application/json' }));

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
