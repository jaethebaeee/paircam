import { vi } from 'vitest';

type EventHandler = (...args: unknown[]) => void;

export class MockSocket {
  connected = false;
  id = 'mock-socket-id';

  private eventHandlers: Map<string, EventHandler[]> = new Map();
  private ioEventHandlers: Map<string, EventHandler[]> = new Map();

  // Mock io manager for reconnection events
  io = {
    on: (event: string, handler: EventHandler) => {
      if (!this.ioEventHandlers.has(event)) {
        this.ioEventHandlers.set(event, []);
      }
      this.ioEventHandlers.get(event)!.push(handler);
    },
    off: (event: string, handler?: EventHandler) => {
      if (handler) {
        const handlers = this.ioEventHandlers.get(event) || [];
        const index = handlers.indexOf(handler);
        if (index > -1) handlers.splice(index, 1);
      } else {
        this.ioEventHandlers.delete(event);
      }
    },
  };

  emit = vi.fn((event: string, ..._data: unknown[]) => {
    // Mock emit behavior
    return this;
  });

  on(event: string, handler: EventHandler) {
    if (!this.eventHandlers.has(event)) {
      this.eventHandlers.set(event, []);
    }
    this.eventHandlers.get(event)!.push(handler);
    return this;
  }

  off(event: string, handler?: EventHandler) {
    if (handler) {
      const handlers = this.eventHandlers.get(event) || [];
      const index = handlers.indexOf(handler);
      if (index > -1) handlers.splice(index, 1);
    } else {
      this.eventHandlers.delete(event);
    }
    return this;
  }

  close() {
    this.connected = false;
    this._triggerEvent('disconnect', 'io client disconnect');
  }

  connect() {
    this.connected = true;
    this._triggerEvent('connect');
    return this;
  }

  // Helper to trigger events for testing
  _triggerEvent(event: string, ...args: unknown[]) {
    const handlers = this.eventHandlers.get(event) || [];
    handlers.forEach((handler) => handler(...args));
  }

  // Helper to trigger io events for testing
  _triggerIoEvent(event: string, ...args: unknown[]) {
    const handlers = this.ioEventHandlers.get(event) || [];
    handlers.forEach((handler) => handler(...args));
  }

  // Helper to simulate connection
  _simulateConnect() {
    this.connected = true;
    this._triggerEvent('connect');
  }

  // Helper to simulate disconnect
  _simulateDisconnect(reason = 'transport close') {
    this.connected = false;
    this._triggerEvent('disconnect', reason);
  }

  // Helper to simulate connection error
  _simulateConnectionError(error: Error) {
    this._triggerEvent('connect_error', error);
  }

  // Helper to simulate matched event
  _simulateMatched(data: { peerId: string; sessionId: string; timestamp: number }) {
    this._triggerEvent('matched', data);
  }

  // Helper to simulate queue events
  _simulateQueueJoined(data: { position: number; timestamp: number }) {
    this._triggerEvent('queue-joined', data);
  }

  // Helper to simulate offer/answer/candidate
  _simulateOffer(data: { sessionId: string; offer: RTCSessionDescriptionInit; from: string }) {
    this._triggerEvent('offer', data);
  }

  _simulateAnswer(data: { sessionId: string; answer: RTCSessionDescriptionInit; from: string }) {
    this._triggerEvent('answer', data);
  }

  _simulateCandidate(data: { sessionId: string; candidate: RTCIceCandidateInit; from: string }) {
    this._triggerEvent('candidate', data);
  }

  // Helper to simulate message
  _simulateMessage(data: { sessionId: string; message: string; from: string; timestamp: number }) {
    this._triggerEvent('message', data);
  }

  // Helper to simulate peer disconnected
  _simulatePeerDisconnected(data: { sessionId: string }) {
    this._triggerEvent('peer-disconnected', data);
  }
}

// Factory function to create mock socket
export function createMockSocket(): MockSocket {
  return new MockSocket();
}

// Mock socket.io-client module
export const mockIo = vi.fn(() => {
  const socket = createMockSocket();
  // Auto-connect after a short delay to simulate real behavior
  setTimeout(() => socket._simulateConnect(), 0);
  return socket;
});

// Export for module mocking
export default { io: mockIo };
