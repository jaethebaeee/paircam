/**
 * Analytics wrapper for Amplitude
 * Provides a no-op implementation when @amplitude/analytics-node is not installed
 */

interface TrackParams {
  userId: string;
  eventType: string;
  eventProperties?: Record<string, unknown>;
}

// Try to load amplitude, fall back to no-op if not available
let amplitudeInstance: { track: (params: TrackParams) => void } | null = null;

try {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const amplitude = require('@amplitude/analytics-node');
  amplitudeInstance = amplitude;
} catch {
  // Amplitude not installed, use no-op
  amplitudeInstance = null;
}

export const analytics = {
  track: (params: TrackParams): void => {
    if (amplitudeInstance) {
      amplitudeInstance.track(params);
    }
    // No-op when amplitude is not available
  },
};
