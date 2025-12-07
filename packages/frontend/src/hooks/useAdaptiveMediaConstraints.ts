import { useMemo } from 'react';
import { NetworkQuality } from './useNetworkQuality';

export interface AdaptiveMediaConfig {
  audio: MediaStreamConstraints['audio'];
  video: MediaStreamConstraints['video'];
  recommendAudioOnly: boolean;
  recommendDisabled: boolean;
}

/**
 * Returns adaptive media constraints based on network quality
 * Progressively degrades video quality on slower connections
 */
export function useAdaptiveMediaConstraints(
  networkQuality: NetworkQuality,
  userPreferences?: { video?: boolean; audio?: boolean }
): AdaptiveMediaConfig {
  return useMemo(() => {
    const { video: videoEnabled = true, audio: audioEnabled = true } = userPreferences || {};

    // Base audio constraints (always optimized)
    const audio: MediaStreamConstraints['audio'] = audioEnabled ? {
      echoCancellation: true,
      noiseSuppression: true,
      autoGainControl: true,
      sampleRate: 48000,
      channelCount: 1, // Mono saves bandwidth
    } : false;

    // Network quality determines video constraints
    let video: MediaStreamConstraints['video'] = false;
    let recommendAudioOnly = false;
    let recommendDisabled = false;

    if (!videoEnabled) {
      video = false;
      recommendAudioOnly = true;
    } else {
      switch (networkQuality) {
        case 'excellent':
          // HD video
          video = {
            width: { ideal: 1280, max: 1920 },
            height: { ideal: 720, max: 1080 },
            frameRate: { ideal: 30, max: 30 },
            facingMode: 'user',
          };
          break;

        case 'good':
          // Standard video
          video = {
            width: { ideal: 640, max: 1280 },
            height: { ideal: 480, max: 720 },
            frameRate: { ideal: 24, max: 30 },
            facingMode: 'user',
          };
          break;

        case 'fair':
          // Low quality video
          video = {
            width: { ideal: 320, max: 640 },
            height: { ideal: 240, max: 480 },
            frameRate: { ideal: 15, max: 24 },
            facingMode: 'user',
          };
          recommendAudioOnly = true;
          break;

        case 'poor':
          // Very low quality - recommend audio only
          video = {
            width: { ideal: 160, max: 320 },
            height: { ideal: 120, max: 240 },
            frameRate: { ideal: 10, max: 15 },
            facingMode: 'user',
          };
          recommendAudioOnly = true;
          break;

        case 'offline':
          video = false;
          recommendAudioOnly = false;
          recommendDisabled = true;
          break;
      }
    }

    return {
      audio,
      video,
      recommendAudioOnly,
      recommendDisabled,
    };
  }, [networkQuality, userPreferences]);
}

