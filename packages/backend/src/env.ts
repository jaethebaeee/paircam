const RAW_JWT_EXPIRATION = (process.env.JWT_EXPIRATION as string | undefined) || '5m';

function parseJwtExpirationToSeconds(value: string): number {
  const match = value.match(/^(\d+)(ms|s|m|h|d)?$/i);
  if (!match) {
    const num = parseInt(value, 10);
    return Number.isFinite(num) ? num : 300;
  }
  const amount = parseInt(match[1], 10);
  const unit = (match[2] || 's').toLowerCase();
  switch (unit) {
    case 'ms':
      return Math.max(1, Math.floor(amount / 1000));
    case 's':
      return amount;
    case 'm':
      return amount * 60;
    case 'h':
      return amount * 3600;
    case 'd':
      return amount * 86400;
    default:
      return amount;
  }
}

export const env = {
  NODE_ENV: process.env.NODE_ENV || 'development',
  PORT: parseInt(process.env.PORT || '3333', 10),
  LOG_LEVEL: process.env.LOG_LEVEL || 'info',
  
  // JWT Configuration
  JWT_SECRET: process.env.JWT_SECRET || 'your-super-secret-jwt-key-change-in-production',
  JWT_EXPIRATION: RAW_JWT_EXPIRATION,
  JWT_EXPIRES_IN: parseJwtExpirationToSeconds(RAW_JWT_EXPIRATION),
  
  // Redis Configuration
  REDIS_URL: process.env.REDIS_URL || undefined,
  REDIS_HOST: process.env.REDIS_HOST || 'localhost',
  REDIS_PORT: parseInt(process.env.REDIS_PORT || '6379', 10),
  REDIS_PASSWORD: process.env.REDIS_PASSWORD || undefined,
  REDIS_DB: parseInt(process.env.REDIS_DB || '0', 10),
  
  // TURN Server Configuration
  TURN_PROVIDER: (process.env.TURN_PROVIDER as 'managed' | 'coturn' | undefined) || 'coturn',
  // Managed provider creds (e.g., Metered/Xirsys/Twilio)
  TURN_URLS: process.env.TURN_URLS || undefined, // comma/semicolon-separated list
  TURN_USERNAME: process.env.TURN_USERNAME || undefined,
  TURN_PASSWORD: process.env.TURN_PASSWORD || undefined,
  TURN_SHARED_SECRET: process.env.TURN_SHARED_SECRET || 'your-turn-shared-secret',
  TURN_REALM: process.env.TURN_REALM || 'paircam.live',
  TURN_HOST: process.env.TURN_HOST || 'localhost',
  TURN_PORT: parseInt(process.env.TURN_PORT || '3478', 10),
  TURN_TLS_PORT: parseInt(process.env.TURN_TLS_PORT || '5349', 10),
  
  // CORS Configuration
  CORS_ORIGINS: process.env.CORS_ORIGINS || 'http://localhost:5173,http://localhost:3000',
  
  // Database Configuration (Optional)
  DATABASE_URL: process.env.DATABASE_URL || undefined,
  
  // Rate Limiting
  RATE_LIMIT_WINDOW_MS: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '60000', 10), // 1 minute
  RATE_LIMIT_MAX_REQUESTS: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '100', 10),
  
  // Monitoring
  OTEL_ENABLED: process.env.OTEL_ENABLED === 'true',
  PROMETHEUS_PORT: parseInt(process.env.PROMETHEUS_PORT || '9090', 10),
  
  // Abuse Detection
  ABUSE_DETECTION_ENABLED: process.env.ABUSE_DETECTION_ENABLED !== 'false',
  MAX_CALLS_PER_MINUTE: parseInt(process.env.MAX_CALLS_PER_MINUTE || '10', 10),
  MAX_SKIPS_PER_SESSION: parseInt(process.env.MAX_SKIPS_PER_SESSION || '5', 10),
} as const;
