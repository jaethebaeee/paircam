/*
  Quick smoke: spins two Socket.IO clients, authenticates via /auth/token,
  joins queue, waits for matched, exchanges offer/answer/candidate, sends a message, ends call.
  Requires backend running at API_URL.
*/
import fetch from 'node-fetch';
import { io, Socket } from 'socket.io-client';

const API_URL = process.env.API_URL || 'http://localhost:3333';

async function getToken(deviceId: string): Promise<string> {
  const res = await fetch(`${API_URL}/auth/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ deviceId }),
  });
  if (!res.ok) throw new Error(`auth failed: ${res.status}`);
  const j = await res.json();
  return j.accessToken as string;
}

function connect(token: string): Socket {
  const s = io(`${API_URL}/signaling`, {
    path: '/socket.io',
    auth: { token: `Bearer ${token}` },
    transports: ['websocket'],
  });
  return s;
}

async function main() {
  const aToken = await getToken('smoke-a');
  const bToken = await getToken('smoke-b');

  const a = connect(aToken);
  const b = connect(bToken);

  const once = (sock: Socket, evt: string) => new Promise<any>((resolve) => sock.once(evt, resolve));

  a.on('connect', () => console.log('A connected'));
  b.on('connect', () => console.log('B connected'));

  // join queue
  a.emit('join-queue', { region: 'global', language: 'en' });
  b.emit('join-queue', { region: 'global', language: 'en' });

  // wait match events
  const aMatched = await once(a, 'matched');
  const bMatched = await once(b, 'matched');
  console.log('Matched', aMatched, bMatched);

  // simple signal: A sends offer → B replies answer
  a.emit('send-offer', { sessionId: aMatched.sessionId, type: 'offer', data: { sdp: 'fake-offer' } });
  const offer = await once(b, 'offer');
  b.emit('send-answer', { sessionId: offer.sessionId, type: 'answer', data: { sdp: 'fake-answer' } });
  await once(a, 'answer');

  // message
  a.emit('send-message', { sessionId: aMatched.sessionId, message: 'hello', timestamp: Date.now() });
  await once(b, 'message');

  // end call
  a.emit('end-call', { sessionId: aMatched.sessionId });
  await once(a, 'call-ended');
  console.log('Smoke OK');
  a.close();
  b.close();
}

main().catch((e) => {
  console.error('Smoke failed', e);
  process.exit(1);
});


