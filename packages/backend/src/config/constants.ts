/**
 * Application Constants
 * Centralized configuration for magic numbers and default values
 */

// Time constants (in milliseconds unless specified)
export const TIME = {
  SECOND: 1000,
  MINUTE: 60 * 1000,
  HOUR: 60 * 60 * 1000,
  DAY: 24 * 60 * 60 * 1000,
} as const;

// Session configuration
export const SESSION = {
  TTL_SECONDS: 300, // 5 minutes
  OFFER_TTL_SECONDS: 30,
  ANSWER_TTL_SECONDS: 30,
  ICE_CANDIDATE_TTL_SECONDS: 60,
  START_TIME_TTL_SECONDS: 600, // 10 minutes
} as const;

// Rate limiting
export const RATE_LIMITS = {
  CALLS_PER_MINUTE: 10,
  TOKEN_REQUESTS_PER_MINUTE: 5,
  QUEUE_JOIN_PER_MINUTE: 10,
  GLOBAL_SHORT: { ttl: 1000, limit: 10 },
  GLOBAL_MEDIUM: { ttl: 10000, limit: 50 },
  GLOBAL_LONG: { ttl: 60000, limit: 200 },
} as const;

// Queue configuration
export const QUEUE = {
  UPDATE_INTERVAL_MS: 2000, // 2 seconds
  ESTIMATED_TIME_PER_PERSON_SECONDS: 3,
  MIN_ESTIMATED_WAIT_SECONDS: 5,
} as const;

// Reputation system
export const REPUTATION = {
  DEFAULT_RATING: 70,
  MIN_RATING: 0,
  MAX_RATING: 100,
  TTL_DAYS: 90,
  THRESHOLDS: {
    HIGH: 70,
    MEDIUM: 40,
    LOW: 30,
  },
  CALL_DURATION_BONUS: {
    LONG: { threshold: 120, points: 20 },    // 2+ minutes
    MEDIUM: { threshold: 60, points: 10 },   // 1+ minute
    SHORT: { threshold: 30, points: 5 },     // 30+ seconds
  },
  SKIP_RATE_PENALTY: {
    EXCELLENT: { threshold: 20, points: 30 }, // <20% skip rate
    GOOD: { threshold: 50, points: 15 },      // <50% skip rate
    POOR: { points: -10 },                    // >50% skip rate
  },
  REPORT_PENALTY_PER_REPORT: 10,
  REPORT_PENALTY_MAX: 50,
} as const;

// Matchmaking
export const MATCHMAKING = {
  BASE_URGENCY_MS: 60000, // 1 minute
  LARGE_QUEUE_THRESHOLD: 50,
  SMALL_QUEUE_THRESHOLD: 10,
  LARGE_QUEUE_URGENCY_MULTIPLIER: 1.5,
  SMALL_QUEUE_URGENCY_MULTIPLIER: 0.5,
  RECENT_MATCH_MEMORY_HOURS: 1,
} as const;

// Reports
export const REPORTS = {
  TTL_SECONDS: 86400, // 24 hours
  ABUSE_THRESHOLD_CALLS: 20, // calls per minute
  ABUSE_THRESHOLD_REPORTS: 3, // reports against device
} as const;

// Blocking
export const BLOCKING = {
  CACHE_TTL_SECONDS: 3600, // 1 hour
} as const;

// Client registration
export const CLIENT = {
  REGISTRATION_TTL_SECONDS: 600, // 10 minutes
} as const;

// Compatibility scoring weights
export const SCORING = {
  LOCATION_MATCH: 20,
  LOCATION_PARTIAL: 10,
  LANGUAGE_MATCH: 15,
  LANGUAGE_LEARNING_PERFECT: 20,
  LANGUAGE_LEARNING_GOOD: 15,
  LANGUAGE_LEARNING_OKAY: 10,
  REPUTATION_BOTH_HIGH: 25,
  REPUTATION_BOTH_MEDIUM: 18,
  REPUTATION_REHAB: 12,
  REPUTATION_BOTH_LOW: 8,
  INTEREST_POINTS_PER: 7,
  INTEREST_MAX: 20,
  WAIT_TIME_LONG: { threshold: 45000, points: 12 },
  WAIT_TIME_MEDIUM: { threshold: 30000, points: 8 },
  WAIT_TIME_SHORT: { threshold: 15000, points: 4 },
  PREMIUM_PRIORITY: 8,
  AGE_VERY_CLOSE: { threshold: 3, points: 10 },
  AGE_SIMILAR: { threshold: 7, points: 7 },
  AGE_MODERATE: { threshold: 12, points: 4 },
  AGE_LARGE: 1,
  TIMEZONE_SAME: 5,
  TIMEZONE_CLOSE: 4,
  TIMEZONE_MODERATE: 2,
  LATENCY_SAME_REGION: 5,
  LATENCY_ADJACENT: 3,
  LATENCY_FAR: 2,
  LATENCY_GLOBAL: 3,
} as const;
