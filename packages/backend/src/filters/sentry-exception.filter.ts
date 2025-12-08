import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { Request, Response } from 'express';
import * as Sentry from '@sentry/node';

/**
 * Global exception filter that captures exceptions and sends them to Sentry.
 * This filter catches all unhandled exceptions, logs them to Sentry,
 * and returns a standardized error response.
 */
@Catch()
export class SentryExceptionFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    // Determine HTTP status code
    const status =
      exception instanceof HttpException
        ? exception.getStatus()
        : HttpStatus.INTERNAL_SERVER_ERROR;

    // Extract error message
    const message =
      exception instanceof HttpException
        ? exception.message
        : exception instanceof Error
          ? exception.message
          : 'Internal server error';

    // Only send to Sentry if it's a server error (5xx) or an unexpected error
    // Don't spam Sentry with 4xx client errors like 404, 401, etc.
    const shouldReportToSentry =
      status >= 500 || !(exception instanceof HttpException);

    if (shouldReportToSentry) {
      // Add request context to Sentry
      Sentry.withScope((scope) => {
        // Add request data
        scope.setTag('url', request.url);
        scope.setTag('method', request.method);
        scope.setTag('status_code', status.toString());

        // Add user info if available (from JWT)
        const user = (request as Request & { user?: { id: string; deviceId?: string } }).user;
        if (user) {
          scope.setUser({
            id: user.id,
            ...(user.deviceId && { deviceId: user.deviceId }),
          });
        }

        // Add request headers (sanitized)
        scope.setContext('request', {
          url: request.url,
          method: request.method,
          headers: {
            'user-agent': request.headers['user-agent'],
            'content-type': request.headers['content-type'],
            'x-request-id': request.headers['x-request-id'],
          },
          query: request.query,
          // Don't include body to avoid logging sensitive data
        });

        // Add extra context
        scope.setExtra('timestamp', new Date().toISOString());

        // Capture the exception
        if (exception instanceof Error) {
          Sentry.captureException(exception);
        } else {
          Sentry.captureMessage(String(exception), 'error');
        }
      });
    }

    // Determine response body
    const errorResponse = {
      statusCode: status,
      message,
      timestamp: new Date().toISOString(),
      path: request.url,
      ...(process.env.NODE_ENV !== 'production' &&
        exception instanceof Error && {
          stack: exception.stack,
        }),
    };

    response.status(status).json(errorResponse);
  }
}
