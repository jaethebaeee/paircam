// Validate and export API URLs
const getApiUrl = () => {
  const url = import.meta.env.VITE_API_URL || 'http://localhost:3333';

  // Warn in development if using default
  if (import.meta.env.DEV && url === 'http://localhost:3333') {
    console.warn('Using default API URL. Set VITE_API_URL in .env for production.');
  }

  // SECURITY: Enforce HTTPS in production
  if (import.meta.env.PROD && !url.startsWith('https://')) {
    console.error('SECURITY WARNING: API_URL must use HTTPS in production!');
    // Auto-upgrade to HTTPS in production
    return url.replace('http://', 'https://');
  }

  return url;
};

const getWsUrl = () => {
  const url = import.meta.env.VITE_WS_URL || 'ws://localhost:3333';

  // Warn in development if using default
  if (import.meta.env.DEV && url === 'ws://localhost:3333') {
    console.warn('Using default WebSocket URL. Set VITE_WS_URL in .env for production.');
  }

  // SECURITY: Enforce WSS in production
  if (import.meta.env.PROD && !url.startsWith('wss://')) {
    console.error('SECURITY WARNING: WS_URL must use WSS in production!');
    // Auto-upgrade to WSS in production
    return url.replace('ws://', 'wss://');
  }

  return url;
};

export const API_URL = getApiUrl();
export const WS_URL = getWsUrl();

export const STUN_SERVERS = [
  { urls: 'stun:stun.l.google.com:19302' },
  { urls: 'stun:stun1.l.google.com:19302' },
  { urls: 'stun:stun2.l.google.com:19302' },
];

// Optimized for mobile - starts at lower quality and adapts up
export const DEFAULT_MEDIA_CONSTRAINTS: MediaStreamConstraints = {
  audio: {
    echoCancellation: true,
    noiseSuppression: true,
    autoGainControl: true,
    sampleRate: 48000,
    channelCount: 1, // Mono for bandwidth efficiency
  },
  video: {
    width: { ideal: 640, max: 1280 },
    height: { ideal: 480, max: 720 },
    frameRate: { ideal: 24, max: 30 },
    facingMode: 'user',
  },
};

// Audio-only constraints (minimal bandwidth)
export const AUDIO_ONLY_CONSTRAINTS: MediaStreamConstraints = {
  audio: {
    echoCancellation: true,
    noiseSuppression: true,
    autoGainControl: true,
    sampleRate: 48000,
    channelCount: 1,
  },
  video: false,
};

// Low quality for poor connections
export const LOW_QUALITY_CONSTRAINTS: MediaStreamConstraints = {
  audio: {
    echoCancellation: true,
    noiseSuppression: true,
    autoGainControl: true,
    sampleRate: 24000,
    channelCount: 1,
  },
  video: {
    width: { ideal: 320, max: 480 },
    height: { ideal: 240, max: 360 },
    frameRate: { ideal: 15, max: 20 },
    facingMode: 'user',
  },
};
