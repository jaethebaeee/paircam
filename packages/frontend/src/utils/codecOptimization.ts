/**
 * WebRTC Codec Optimization Utilities
 *
 * Manages codec preferences, bitrate control, and encoding parameters
 * for optimal video quality and performance across different network conditions.
 */

import { NetworkQuality } from '../hooks/useNetworkQuality';

export interface BitrateConfig {
  maxBitrate: number; // bits per second
  maxFramerate: number;
  targetBitrate?: number;
}

export interface CodecPreferences {
  video: RTCRtpCodec[];
  audio: RTCRtpCodec[];
}

/**
 * Get bitrate configuration based on network quality
 * These values optimize for video chat quality vs. bandwidth consumption
 */
export function getBitrateConfig(quality: NetworkQuality): BitrateConfig {
  switch (quality) {
    case 'excellent':
      return {
        maxBitrate: 2500000, // 2.5 Mbps
        targetBitrate: 2000000, // 2 Mbps target
        maxFramerate: 30,
      };
    case 'good':
      return {
        maxBitrate: 1500000, // 1.5 Mbps
        targetBitrate: 1200000, // 1.2 Mbps target
        maxFramerate: 24,
      };
    case 'fair':
      return {
        maxBitrate: 800000, // 800 Kbps
        targetBitrate: 600000, // 600 Kbps target
        maxFramerate: 15,
      };
    case 'poor':
      return {
        maxBitrate: 400000, // 400 Kbps
        targetBitrate: 300000, // 300 Kbps target
        maxFramerate: 10,
      };
    case 'offline':
      return {
        maxBitrate: 0,
        maxFramerate: 0,
      };
  }
}

/**
 * Set codec preferences for a transceiver
 * Prefers H.264 on mobile/tablets, VP8/VP9 on desktop for better performance
 */
export function setCodecPreferences(
  transceiver: RTCRtpTransceiver,
  isVideo: boolean,
  preferredCodec?: string
): void {
  try {
    const capabilities = isVideo
      ? RTCRtpSender.getCapabilities('video')?.codecs || []
      : RTCRtpReceiver.getCapabilities('audio')?.codecs || [];

    if (capabilities.length === 0) return;

    let preferredCodecs: RTCRtpCodec[] = [];

    if (isVideo) {
      // Determine best codec based on device
      const isMobile = /iPhone|iPad|Android/i.test(navigator.userAgent);

      if (preferredCodec === 'H264' || isMobile) {
        // H.264 is more efficient on mobile devices
        preferredCodecs = capabilities.filter(
          c => c.mimeType.toLowerCase().includes('h264')
        );
        // Fallback to VP8 if H.264 not available
        if (preferredCodecs.length === 0) {
          preferredCodecs = capabilities.filter(
            c => c.mimeType.toLowerCase().includes('vp8')
          );
        }
      } else {
        // VP8/VP9 generally better quality on desktop
        // VP9 preferred over VP8 for better compression
        preferredCodecs = capabilities.filter(
          c => c.mimeType.toLowerCase().includes('vp9')
        );
        // Fallback to VP8
        if (preferredCodecs.length === 0) {
          preferredCodecs = capabilities.filter(
            c => c.mimeType.toLowerCase().includes('vp8')
          );
        }
        // Fallback to H.264 if VP codecs not available
        if (preferredCodecs.length === 0) {
          preferredCodecs = capabilities.filter(
            c => c.mimeType.toLowerCase().includes('h264')
          );
        }
      }

      // Add remaining codecs
      preferredCodecs.push(
        ...capabilities.filter(c => !preferredCodecs.includes(c))
      );
    } else {
      // For audio, Opus is preferred (lower bandwidth, better quality)
      preferredCodecs = capabilities.filter(
        c => c.mimeType.toLowerCase().includes('opus')
      );
      // Fallback to other audio codecs
      preferredCodecs.push(
        ...capabilities.filter(c => !preferredCodecs.includes(c))
      );
    }

    // Apply codec preferences
    if (preferredCodecs.length > 0) {
      transceiver.setCodecPreferences(preferredCodecs);
    }
  } catch (err) {
    console.warn('[Codec] Failed to set codec preferences:', err);
  }
}

/**
 * Apply bitrate limits to all video senders
 * Called after connection is established
 */
export async function applyBitrateLimit(
  peerConnection: RTCPeerConnection,
  bitrateConfig: BitrateConfig
): Promise<void> {
  try {
    const senders = peerConnection.getSenders();

    for (const sender of senders) {
      if (!sender.track || sender.track.kind !== 'video') continue;

      try {
        const params = sender.getParameters();

        // Initialize encodings if not present
        if (!params.encodings) {
          params.encodings = [{}];
        }

        // Apply bitrate limits to all encodings
        params.encodings.forEach((encoding) => {
          encoding.maxBitrate = bitrateConfig.maxBitrate;
          encoding.maxFramerate = bitrateConfig.maxFramerate;
        });

        await sender.setParameters(params);
        console.log('[Bitrate] Applied limits:', {
          maxBitrate: `${(bitrateConfig.maxBitrate / 1000000).toFixed(1)} Mbps`,
          maxFramerate: bitrateConfig.maxFramerate,
        });
      } catch (err) {
        console.warn('[Bitrate] Failed to set sender parameters:', err);
      }
    }
  } catch (err) {
    console.warn('[Bitrate] Failed to apply bitrate limits:', err);
  }
}

/**
 * Filter ICE candidates to improve connection speed
 * Prefers reflexive candidates (srflx) over peer reflexive (prflx)
 */
export function shouldAcceptIceCandidate(candidate: RTCIceCandidate): boolean {
  // Filter out mDNS candidates (they're slow to resolve)
  if (candidate.candidate.includes('.local')) {
    return false;
  }

  // Prefer srflx (server reflexive) over prflx (peer reflexive)
  // prflx candidates are often less useful for connectivity
  const isSrflx = candidate.candidate.includes('srflx');
  const isPrflx = candidate.candidate.includes('prflx');

  // Accept all srflx, but be selective with prflx
  if (isSrflx) {
    return true;
  }

  // Limit prflx candidates (keep only first one)
  // This is handled at a higher level in useWebRTC

  // Always accept host candidates (direct connection)
  const isHost = candidate.candidate.includes('host');
  if (isHost) {
    return true;
  }

  return !isPrflx; // Skip prflx by default
}

/**
 * Get video statistics from RTCPeerConnection
 */
export interface VideoStats {
  bytesReceived: number;
  bytesSent: number;
  bandwidth: number; // Mbps
  packetsLost: number;
  jitter: number; // seconds
  latency: number; // milliseconds
  frameRate: number;
  frameWidth: number;
  frameHeight: number;
  videoCodec?: string;
}

export async function getVideoStats(
  peerConnection: RTCPeerConnection
): Promise<VideoStats> {
  try {
    const stats = await peerConnection.getStats();
    let videoStats: VideoStats = {
      bytesReceived: 0,
      bytesSent: 0,
      bandwidth: 0,
      packetsLost: 0,
      jitter: 0,
      latency: 0,
      frameRate: 0,
      frameWidth: 0,
      frameHeight: 0,
    };

    stats.forEach((report) => {
      if (report.type === 'inbound-rtp' && report.kind === 'video') {
        videoStats.bytesReceived = report.bytesReceived;
        videoStats.packetsLost = report.packetsLost;
        videoStats.jitter = report.jitter;
        videoStats.frameRate = report.framesPerSecond || 0;
        videoStats.frameHeight = report.frameHeight || 0;
        videoStats.frameWidth = report.frameWidth || 0;
      }

      if (report.type === 'outbound-rtp' && report.kind === 'video') {
        videoStats.bytesSent = report.bytesSent;
      }

      // Get latency from candidate pair stats
      if (report.type === 'candidate-pair' && report.state === 'succeeded') {
        videoStats.latency = report.currentRoundTripTime * 1000; // Convert to ms
      }
    });

    // Calculate bandwidth (rough estimate)
    const totalBytes = videoStats.bytesSent + videoStats.bytesReceived;
    videoStats.bandwidth = totalBytes > 0 ? (totalBytes * 8) / 1000000 : 0;

    return videoStats;
  } catch (err) {
    console.warn('[Stats] Failed to get video stats:', err);
    return {
      bytesReceived: 0,
      bytesSent: 0,
      bandwidth: 0,
      packetsLost: 0,
      jitter: 0,
      latency: 0,
      frameRate: 0,
      frameWidth: 0,
      frameHeight: 0,
    };
  }
}
