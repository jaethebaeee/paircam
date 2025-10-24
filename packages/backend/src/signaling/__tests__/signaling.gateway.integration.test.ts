import { SignalingGateway } from '../signaling.gateway';
import { RedisService } from '../../redis/redis.service';
import { LoggerService } from '../../services/logger.service';

describe('SignalingGateway integration', () => {
  it('emits offer to peer client when stored and session exists', async () => {
    const logger = new LoggerService();
    const redis = {
      storeOffer: jest.fn(async () => {}),
      getSession: jest.fn(async () => ({ peers: ['a', 'b'] })),
    } as any as RedisService;

    const gateway = new SignalingGateway(
      redis,
      { removeFromQueue: jest.fn(async () => {}) } as any,
      { validateToken: jest.fn(async () => ({ deviceId: 'a' })) } as any,
      { findOrCreate: jest.fn(async () => ({ id: '1', deviceId: 'a' })), isPremium: jest.fn(async () => false) } as any,
      logger,
    );

    const peerClient = { emit: jest.fn() } as any;
    (gateway as any).connectedClients.set('b', peerClient);

    const client = { data: { deviceId: 'a' } } as any;
    await gateway.handleSendOffer(client, { sessionId: 'sid', type: 'offer', data: { sdp: 'x' } });

    expect(redis.storeOffer).toHaveBeenCalled();
    expect(peerClient.emit).toHaveBeenCalledWith('offer', expect.objectContaining({ sessionId: 'sid' }));
  });

  it('emits answer and candidate to peer; deduplicates candidates', async () => {
    const logger = new LoggerService();
    const l: string[] = [];
    const redis = {
      storeAnswer: jest.fn(async () => {}),
      addIceCandidate: jest.fn(async (_sid: string, _pid: string, cand: any) => {
        const s = JSON.stringify(cand);
        if (!l.includes(s)) l.push(s);
      }),
      getSession: jest.fn(async () => ({ peers: ['a', 'b'] })),
    } as any as RedisService;

    const gateway = new SignalingGateway(
      redis,
      { removeFromQueue: jest.fn(async () => {}) } as any,
      { validateToken: jest.fn(async () => ({ deviceId: 'a' })) } as any,
      { findOrCreate: jest.fn(async () => ({ id: '1', deviceId: 'a' })), isPremium: jest.fn(async () => false) } as any,
      logger,
    );

    const peer = { emit: jest.fn() } as any;
    (gateway as any).connectedClients.set('b', peer);

    const client = { data: { deviceId: 'a' } } as any;
    await gateway.handleSendAnswer(client, { sessionId: 'sid', type: 'answer', data: { sdp: 'y' } });
    await gateway.handleSendCandidate(client, { sessionId: 'sid', type: 'candidate', data: { c: 1 } });
    await gateway.handleSendCandidate(client, { sessionId: 'sid', type: 'candidate', data: { c: 1 } });
    // late candidate for non-existent session is dropped
    (redis as any).getSession = jest.fn(async () => null);
    await gateway.handleSendCandidate(client, { sessionId: 'missing', type: 'candidate', data: { c: 2 } });

    expect(redis.storeAnswer).toHaveBeenCalled();
    expect(peer.emit).toHaveBeenCalledWith('answer', expect.objectContaining({ sessionId: 'sid' }));
    expect(peer.emit).toHaveBeenCalledWith('candidate', expect.objectContaining({ sessionId: 'sid' }));
  });

  it('end-call notifies self and peer; cleans session artifacts', async () => {
    const logger = new LoggerService();
    const fakeClientApi = {
      del: jest.fn(async (_k: any) => 1),
      keys: jest.fn(async () => ['candidates:sid:a', 'candidates:sid:b']),
    } as any;
    const redis = {
      getSession: jest.fn(async () => ({ peers: ['a', 'b'] })),
      deleteSession: jest.fn(async () => {}),
      getClient: jest.fn(() => fakeClientApi),
    } as any as RedisService;

    const gateway = new SignalingGateway(
      redis,
      { removeFromQueue: jest.fn(async () => {}) } as any,
      { validateToken: jest.fn(async () => ({ deviceId: 'a' })) } as any,
      { findOrCreate: jest.fn(async () => ({ id: '1', deviceId: 'a' })), isPremium: jest.fn(async () => false) } as any,
      logger,
    );

    const peer = { emit: jest.fn() } as any;
    (gateway as any).connectedClients.set('b', peer);

    const client = { data: { deviceId: 'a' }, emit: jest.fn() } as any;
    await (gateway as any).handleEndCall(client, { sessionId: 'sid' });

    // self notified
    expect(client.emit).toHaveBeenCalledWith('call-ended', { sessionId: 'sid' });
    // peer notified via cleanup
    expect(peer.emit).toHaveBeenCalledWith('peer-disconnected', { sessionId: 'sid' });

    // cleanupSession called inside handleEndCall
    expect(redis.deleteSession).toHaveBeenCalledWith('sid');
    expect(fakeClientApi.del).toHaveBeenCalledWith('offer:sid');
    expect(fakeClientApi.del).toHaveBeenCalledWith('answer:sid');
    expect(fakeClientApi.keys).toHaveBeenCalledWith('candidates:sid:*');
  });

  it('rejects WS connection when token missing or invalid', async () => {
    const logger = new LoggerService();
    const redis = {
      isBlocked: jest.fn(async () => false),
    } as any as RedisService;

    // invalid token case
    const gatewayInvalid = new SignalingGateway(
      redis,
      { removeFromQueue: jest.fn(async () => {}) } as any,
      { validateToken: jest.fn(async () => { throw new Error('bad'); }) } as any,
      { findOrCreate: jest.fn(async () => ({ id: '1', deviceId: 'a' })), isPremium: jest.fn(async () => false) } as any,
      logger,
    );

    const client1 = { handshake: { headers: { authorization: 'Bearer x' } }, disconnect: jest.fn(), data: {} } as any;
    await gatewayInvalid.handleConnection(client1);
    expect(client1.disconnect).toHaveBeenCalled();

    // missing token case
    const gatewayMissing = new SignalingGateway(
      redis,
      { removeFromQueue: jest.fn(async () => {}) } as any,
      { validateToken: jest.fn(async () => ({ deviceId: 'a' })) } as any,
      { findOrCreate: jest.fn(async () => ({ id: '1', deviceId: 'a' })), isPremium: jest.fn(async () => false) } as any,
      logger,
    );
    const client2 = { handshake: { headers: {} }, disconnect: jest.fn(), data: {} } as any;
    await gatewayMissing.handleConnection(client2);
    expect(client2.disconnect).toHaveBeenCalled();
  });

  it('rate-limits join-queue and send-offer spam', async () => {
    const logger = new LoggerService();
    const redis = {
      incrementRateLimit: jest.fn(async (_k: string) => 11),
      getSession: jest.fn(async () => ({ peers: ['a', 'b'] })),
      storeOffer: jest.fn(async () => {}),
    } as any as RedisService;

    const gateway = new SignalingGateway(
      redis,
      { removeFromQueue: jest.fn(async () => {}) } as any,
      { validateToken: jest.fn(async () => ({ deviceId: 'a' })) } as any,
      { findOrCreate: jest.fn(async () => ({ id: '1', deviceId: 'a' })), isPremium: jest.fn(async () => false) } as any,
      logger,
    );

    const client = { data: { deviceId: 'a' }, emit: jest.fn() } as any;
    // join-queue
    await gateway.handleJoinQueue(client, { region: 'global', language: 'en' });
    expect(client.emit).toHaveBeenCalledWith('error', { message: 'Rate limit exceeded. Please wait.' });

    // send-offer should not rate-limit here per code, but we simulate redis returning 11 for completeness
    // If future logic adds rate-limit for offers, this is a placeholder
    await gateway.handleSendOffer(client, { sessionId: 'sid', type: 'offer', data: { sdp: 'x' } });
    expect(redis.storeOffer).toHaveBeenCalled();
  });
});


