import '@testing-library/jest-dom';
import { vi, beforeEach, afterEach } from 'vitest';

// Mock import.meta.env
vi.stubGlobal('import', {
  meta: {
    env: {
      VITE_API_URL: 'http://localhost:3333',
      PROD: false,
      DEV: true,
    },
  },
});

// Mock localStorage
const localStorageMock: Storage = {
  store: {} as Record<string, string>,
  getItem: ((key: string): string | null => localStorageMock.store[key] || null) as any,
  setItem: ((key: string, value: string): void => {
    (localStorageMock as any).store[key] = value;
  }) as any,
  removeItem: ((key: string): void => {
    delete (localStorageMock as any).store[key];
  }) as any,
  clear: ((): void => {
    (localStorageMock as any).store = {};
  }) as any,
  length: 0,
  key: (): string | null => null,
} as unknown as Storage;

Object.defineProperty(window, 'localStorage', {
  value: localStorageMock,
});

// Mock MediaStream
class MockMediaStream {
  private tracks: MockMediaStreamTrack[] = [];
  id = 'mock-stream-id';

  constructor(tracks?: MockMediaStreamTrack[]) {
    this.tracks = tracks || [];
  }

  getTracks() {
    return this.tracks;
  }

  getAudioTracks() {
    return this.tracks.filter((t) => t.kind === 'audio');
  }

  getVideoTracks() {
    return this.tracks.filter((t) => t.kind === 'video');
  }

  addTrack(track: MockMediaStreamTrack) {
    this.tracks.push(track);
  }

  removeTrack(track: MockMediaStreamTrack) {
    const index = this.tracks.indexOf(track);
    if (index > -1) {
      this.tracks.splice(index, 1);
    }
  }
}

class MockMediaStreamTrack {
  kind: 'audio' | 'video';
  enabled = true;
  id = 'mock-track-id';
  readyState: 'live' | 'ended' = 'live';

  constructor(kind: 'audio' | 'video') {
    this.kind = kind;
  }

  stop() {
    this.readyState = 'ended';
  }

  clone() {
    return new MockMediaStreamTrack(this.kind);
  }
}

// Mock RTCPeerConnection
class MockRTCPeerConnection {
  localDescription: RTCSessionDescription | null = null;
  remoteDescription: RTCSessionDescription | null = null;
  connectionState: RTCPeerConnectionState = 'new';
  iceConnectionState: RTCIceConnectionState = 'new';
  signalingState: RTCSignalingState = 'stable';

  private senders: { track: MockMediaStreamTrack | null }[] = [];
  private receivers: { track: MockMediaStreamTrack | null }[] = [];

  onicecandidate: ((event: { candidate: RTCIceCandidate | null }) => void) | null = null;
  onconnectionstatechange: (() => void) | null = null;
  ontrack: ((event: { streams: MediaStream[] }) => void) | null = null;
  oniceconnectionstatechange: (() => void) | null = null;

  constructor(_config?: RTCConfiguration) {
    // Config is accepted but not used in mock
  }

  async createOffer(_options?: RTCOfferOptions): Promise<RTCSessionDescriptionInit> {
    return {
      type: 'offer',
      sdp: 'mock-offer-sdp',
    };
  }

  async createAnswer(_options?: RTCAnswerOptions): Promise<RTCSessionDescriptionInit> {
    return {
      type: 'answer',
      sdp: 'mock-answer-sdp',
    };
  }

  async setLocalDescription(description: RTCSessionDescriptionInit): Promise<void> {
    this.localDescription = new RTCSessionDescription(description);
  }

  async setRemoteDescription(description: RTCSessionDescriptionInit): Promise<void> {
    this.remoteDescription = new RTCSessionDescription(description);
  }

  async addIceCandidate(_candidate: RTCIceCandidateInit): Promise<void> {
    // Mock implementation
  }

  addTrack(track: MediaStreamTrack, _stream?: MediaStream): RTCRtpSender {
    const sender = { track: track as unknown as MockMediaStreamTrack };
    this.senders.push(sender);
    return sender as unknown as RTCRtpSender;
  }

  getSenders() {
    return this.senders as unknown as RTCRtpSender[];
  }

  getReceivers() {
    return this.receivers as unknown as RTCRtpReceiver[];
  }

  async getStats(): Promise<RTCStatsReport> {
    const stats = new Map();
    stats.set('transport', {
      type: 'transport',
      dtlsState: 'connected',
      srtpCipher: 'AES_CM_128_HMAC_SHA1_80',
    });
    return stats as unknown as RTCStatsReport;
  }

  close() {
    this.connectionState = 'closed';
    this.signalingState = 'closed';
  }

  // Helper to simulate connection state changes
  _simulateConnectionStateChange(state: RTCPeerConnectionState) {
    this.connectionState = state;
    this.onconnectionstatechange?.();
  }

  // Helper to simulate ICE candidate
  _simulateIceCandidate(candidate: RTCIceCandidate | null) {
    this.onicecandidate?.({ candidate });
  }

  // Helper to simulate track
  _simulateTrack(stream: MediaStream) {
    this.ontrack?.({ streams: [stream] });
  }
}

// Mock RTCSessionDescription
class MockRTCSessionDescription {
  type: RTCSdpType;
  sdp: string;

  constructor(init: RTCSessionDescriptionInit) {
    this.type = init.type!;
    this.sdp = init.sdp || '';
  }
}

// Mock RTCIceCandidate
class MockRTCIceCandidate {
  candidate: string;
  sdpMid: string | null;
  sdpMLineIndex: number | null;

  constructor(init: RTCIceCandidateInit) {
    this.candidate = init.candidate || '';
    this.sdpMid = init.sdpMid || null;
    this.sdpMLineIndex = init.sdpMLineIndex ?? null;
  }
}

// Apply WebRTC mocks
vi.stubGlobal('RTCPeerConnection', MockRTCPeerConnection);
vi.stubGlobal('RTCSessionDescription', MockRTCSessionDescription);
vi.stubGlobal('RTCIceCandidate', MockRTCIceCandidate);
vi.stubGlobal('MediaStream', MockMediaStream);

// Mock navigator.mediaDevices
const mockGetUserMedia = vi.fn().mockImplementation(async (constraints: MediaStreamConstraints) => {
  const tracks: MockMediaStreamTrack[] = [];
  if (constraints.audio) {
    tracks.push(new MockMediaStreamTrack('audio'));
  }
  if (constraints.video) {
    tracks.push(new MockMediaStreamTrack('video'));
  }
  return new MockMediaStream(tracks);
});

Object.defineProperty(navigator, 'mediaDevices', {
  value: {
    getUserMedia: mockGetUserMedia,
    enumerateDevices: vi.fn().mockResolvedValue([]),
  },
  writable: true,
});

// Mock window.location
Object.defineProperty(window, 'location', {
  value: {
    protocol: 'https:',
    hostname: 'localhost',
    host: 'localhost:5173',
    pathname: '/',
    search: '',
    hash: '',
    replace: vi.fn(),
  },
  writable: true,
});

// Mock fetch
global.fetch = vi.fn();

// Reset mocks before each test
beforeEach(() => {
  vi.clearAllMocks();
  localStorageMock.clear();
  mockGetUserMedia.mockClear();
});

// Clean up after each test
afterEach(() => {
  vi.restoreAllMocks();
});

// Export mocks for use in tests
export {
  localStorageMock,
  mockGetUserMedia,
  MockMediaStream,
  MockMediaStreamTrack,
  MockRTCPeerConnection,
};
