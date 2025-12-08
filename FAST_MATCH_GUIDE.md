# Fast Match - Instant Random Video Pairing

## Overview

The **FastMatchService** is the fastest way to connect 2 random users for video chat. It skips all matching complexity (compatibility scoring, filtering, bucketing) and uses a simple FIFO queue for instant connections.

**Performance**: O(1) matching time, instant connection when 2nd user joins.

---

## Client Usage

### 1. Join Fast Match Queue

```javascript
socket.emit('join-fast-queue', {}, (response) => {
  console.log('Response:', response);
});
```

**Response Options:**

**Option A: Immediate Match (if someone was waiting)**
```javascript
// 'matched' event emitted immediately
socket.on('matched', (data) => {
  const { sessionId, peerId } = data;
  console.log('Matched with:', peerId);
  console.log('Session ID:', sessionId);
  // Start WebRTC connection now
});
```

**Option B: Waiting in Queue (if no one waiting)**
```javascript
socket.on('fast-queue-joined', (data) => {
  const { position, estimatedWaitTime } = data;
  console.log(`Position in queue: ${position}`);
  console.log(`Estimated wait time: ${estimatedWaitTime}s`);

  // Wait for 'matched' event
  socket.on('matched', (data) => {
    const { sessionId, peerId } = data;
    console.log('Matched!');
  });
});
```

---

## WebRTC Connection After Match

Once you get the `matched` event, proceed with normal WebRTC signaling:

```javascript
socket.on('matched', async (data) => {
  const { sessionId, peerId } = data;

  // Start local stream
  const stream = await navigator.mediaDevices.getUserMedia({
    audio: true,
    video: { width: 1280, height: 720 }
  });

  // Create and send offer
  const peerConnection = new RTCPeerConnection({
    iceServers: [
      { urls: 'stun:stun.l.google.com:19302' },
      // Include your TURN server config
    ]
  });

  // Add tracks from stream
  stream.getTracks().forEach(track => {
    peerConnection.addTrack(track, stream);
  });

  // Create offer
  const offer = await peerConnection.createOffer();
  await peerConnection.setLocalDescription(offer);

  // Send offer to peer via signaling
  socket.emit('send-offer', {
    sessionId,
    type: 'offer',
    data: offer
  });

  // Listen for answer
  socket.on('answer', async (data) => {
    await peerConnection.setRemoteDescription(
      new RTCSessionDescription(data.data)
    );
  });

  // Listen for ICE candidates
  socket.on('candidate', (data) => {
    const iceCandidate = new RTCIceCandidate(data.data);
    peerConnection.addIceCandidate(iceCandidate);
  });

  // Send ICE candidates
  peerConnection.onicecandidate = (event) => {
    if (event.candidate) {
      socket.emit('send-candidate', {
        sessionId,
        type: 'candidate',
        data: event.candidate
      });
    }
  };

  // Remote stream received
  peerConnection.ontrack = (event) => {
    const remoteVideo = document.getElementById('remote-video');
    if (remoteVideo) {
      remoteVideo.srcObject = event.streams[0];
    }
  };
});
```

---

## Leave Fast Queue

If user changes their mind before being matched:

```javascript
socket.emit('leave-fast-queue', {});

socket.on('fast-queue-left', (data) => {
  console.log('Left queue');
});
```

---

## Key Differences from Regular Matching

| Feature | Fast Match | Regular Match |
|---------|-----------|---------------|
| Matching Speed | Instant (O(1)) | ~5-30s (complex algorithm) |
| Quality | Random pairing | Compatibility scored |
| Filtering | None | Region, language, interests, gender, etc. |
| Reputation | Not considered | Prioritizes high reputation |
| Premium Benefits | None | Gender filtering, priority matching |
| Use Case | Casual instant chat | Quality-focused matching |

---

## Flow Diagram

```
User 1: emit('join-fast-queue')
         ↓
       [No one in queue]
         ↓
       [Added to queue, waiting]

User 2: emit('join-fast-queue')
         ↓
       [User 1 found in queue!]
         ↓
       [Session created in Redis]
         ↓
Both receive 'matched' event
         ↓
Both establish WebRTC connection
         ↓
Video chat starts!
```

---

## Example React Hook

```typescript
import { useEffect, useState } from 'react';
import { io, Socket } from 'socket.io-client';

export const useFastMatch = () => {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [matched, setMatched] = useState(false);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [peerId, setPeerId] = useState<string | null>(null);
  const [queuePosition, setQueuePosition] = useState<number | null>(null);
  const [estimatedWait, setEstimatedWait] = useState<number | null>(null);

  useEffect(() => {
    const newSocket = io('http://localhost:3333/signaling', {
      auth: { token: localStorage.getItem('authToken') }
    });

    newSocket.on('connect', () => {
      console.log('Connected');
    });

    newSocket.on('fast-queue-joined', (data) => {
      setQueuePosition(data.position);
      setEstimatedWait(data.estimatedWaitTime);
    });

    newSocket.on('matched', (data) => {
      setMatched(true);
      setSessionId(data.sessionId);
      setPeerId(data.peerId);
    });

    newSocket.on('fast-queue-left', () => {
      setQueuePosition(null);
      setEstimatedWait(null);
    });

    setSocket(newSocket);

    return () => newSocket.disconnect();
  }, []);

  const joinFastQueue = () => {
    socket?.emit('join-fast-queue');
  };

  const leaveFastQueue = () => {
    socket?.emit('leave-fast-queue');
  };

  return {
    socket,
    matched,
    sessionId,
    peerId,
    queuePosition,
    estimatedWait,
    joinFastQueue,
    leaveFastQueue
  };
};
```

---

## Performance Characteristics

- **Matching Speed**: < 100ms (just Redis LPOP + RPUSH)
- **Queue Size**: Unlimited (Redis list)
- **Session TTL**: 5 minutes (auto-cleanup)
- **Memory**: ~500 bytes per queued user
- **Scale**: Handles 10,000+ concurrent users easily

---

## See Also

- `packages/backend/src/signaling/fast-match.service.ts` - Implementation
- `packages/backend/src/signaling/signaling.gateway.ts` - WebSocket handlers
- `packages/backend/src/redis/redis.service.ts` - Redis operations
