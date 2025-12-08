import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  MessageBody,
  ConnectedSocket,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { BadRequestException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { FriendsService } from './friends.service';
import { FriendRequestResponse } from './dto';
import { LoggerService } from '../services/logger.service';

@WebSocketGateway({
  cors: {
    origin: process.env.CORS_ORIGINS?.split(',') || ['http://localhost:5173'],
    credentials: true,
  },
  namespace: '/friends',
})
export class FriendsGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  // Map client socket ID to user ID
  private clientToUser = new Map<string, string>();
  // Map user ID to client socket ID (for sending notifications)
  private userToClient = new Map<string, string>();

  constructor(
    private friendsService: FriendsService,
    private jwtService: JwtService,
    private logger: LoggerService,
  ) {}

  async handleConnection(client: Socket) {
    try {
      const token = this.extractToken(client);
      if (!token) {
        client.disconnect();
        return;
      }

      const decoded = this.jwtService.verify(token, {
        secret: process.env.JWT_SECRET,
      });

      const userId = decoded.sub;
      this.clientToUser.set(client.id, userId);
      this.userToClient.set(userId, client.id);

      // Join user-specific room for targeted notifications
      client.join(`user:${userId}`);

      this.logger.log(`Friends client connected: ${client.id} (user: ${userId})`);

      // Send pending requests count on connect
      const pendingCount = await this.friendsService.getPendingRequestsCount(userId);
      client.emit('pending-requests-count', { count: pendingCount });
    } catch (error) {
      this.logger.error('Friends connection auth failed:', error.message);
      client.disconnect();
    }
  }

  handleDisconnect(client: Socket) {
    const userId = this.clientToUser.get(client.id);
    if (userId) {
      this.userToClient.delete(userId);
    }
    this.clientToUser.delete(client.id);
    this.logger.log(`Friends client disconnected: ${client.id}`);
  }

  /**
   * Send a friend request via WebSocket
   * Client emits: 'friend-request-send'
   */
  @SubscribeMessage('friend-request-send')
  async handleSendFriendRequest(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { recipientId: string; message?: string; sessionId?: string },
  ) {
    try {
      const userId = this.clientToUser.get(client.id);
      if (!userId) throw new BadRequestException('Not authenticated');

      const request = await this.friendsService.sendFriendRequest(userId, {
        recipientId: data.recipientId,
        message: data.message,
        sessionId: data.sessionId,
      });

      // Notify the recipient in real-time
      this.server.to(`user:${data.recipientId}`).emit('friend-request-received', {
        requestId: request.id,
        fromUserId: userId,
        message: data.message,
        createdAt: request.createdAt,
      });

      // Update recipient's pending count
      const pendingCount = await this.friendsService.getPendingRequestsCount(data.recipientId);
      this.server.to(`user:${data.recipientId}`).emit('pending-requests-count', {
        count: pendingCount,
      });

      return {
        success: true,
        requestId: request.id,
        status: request.status,
      };
    } catch (error) {
      this.logger.error('Friend request send error:', error.message);
      client.emit('error', { message: error.message });
      return { success: false, error: error.message };
    }
  }

  /**
   * Accept a friend request via WebSocket
   * Client emits: 'friend-request-accept'
   */
  @SubscribeMessage('friend-request-accept')
  async handleAcceptFriendRequest(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { requestId: string },
  ) {
    try {
      const userId = this.clientToUser.get(client.id);
      if (!userId) throw new BadRequestException('Not authenticated');

      const request = await this.friendsService.respondToRequest(
        userId,
        data.requestId,
        FriendRequestResponse.ACCEPT,
      );

      // Notify the original requester that their request was accepted
      this.server.to(`user:${request.requesterId}`).emit('friend-request-accepted', {
        requestId: request.id,
        acceptedByUserId: userId,
        acceptedAt: request.respondedAt,
      });

      // Update current user's pending count
      const pendingCount = await this.friendsService.getPendingRequestsCount(userId);
      client.emit('pending-requests-count', { count: pendingCount });

      return {
        success: true,
        requestId: request.id,
        status: request.status,
      };
    } catch (error) {
      this.logger.error('Friend request accept error:', error.message);
      client.emit('error', { message: error.message });
      return { success: false, error: error.message };
    }
  }

  /**
   * Reject a friend request via WebSocket
   * Client emits: 'friend-request-reject'
   */
  @SubscribeMessage('friend-request-reject')
  async handleRejectFriendRequest(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { requestId: string },
  ) {
    try {
      const userId = this.clientToUser.get(client.id);
      if (!userId) throw new BadRequestException('Not authenticated');

      const request = await this.friendsService.respondToRequest(
        userId,
        data.requestId,
        FriendRequestResponse.REJECT,
      );

      // Update current user's pending count
      const pendingCount = await this.friendsService.getPendingRequestsCount(userId);
      client.emit('pending-requests-count', { count: pendingCount });

      return {
        success: true,
        requestId: request.id,
        status: request.status,
      };
    } catch (error) {
      this.logger.error('Friend request reject error:', error.message);
      client.emit('error', { message: error.message });
      return { success: false, error: error.message };
    }
  }

  /**
   * Remove a friend via WebSocket
   * Client emits: 'friend-remove'
   */
  @SubscribeMessage('friend-remove')
  async handleRemoveFriend(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { friendId: string },
  ) {
    try {
      const userId = this.clientToUser.get(client.id);
      if (!userId) throw new BadRequestException('Not authenticated');

      await this.friendsService.removeFriend(userId, data.friendId);

      // Notify the removed friend
      this.server.to(`user:${data.friendId}`).emit('friend-removed', {
        removedByUserId: userId,
      });

      return { success: true };
    } catch (error) {
      this.logger.error('Friend remove error:', error.message);
      client.emit('error', { message: error.message });
      return { success: false, error: error.message };
    }
  }

  /**
   * Block a user via WebSocket
   * Client emits: 'user-block'
   */
  @SubscribeMessage('user-block')
  async handleBlockUser(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { userId: string; reason?: string },
  ) {
    try {
      const userId = this.clientToUser.get(client.id);
      if (!userId) throw new BadRequestException('Not authenticated');

      await this.friendsService.blockUser(userId, data.userId, data.reason);

      return { success: true };
    } catch (error) {
      this.logger.error('User block error:', error.message);
      client.emit('error', { message: error.message });
      return { success: false, error: error.message };
    }
  }

  /**
   * Get friendship status via WebSocket
   * Client emits: 'get-friendship-status'
   */
  @SubscribeMessage('get-friendship-status')
  async handleGetFriendshipStatus(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { userId: string },
  ) {
    try {
      const userId = this.clientToUser.get(client.id);
      if (!userId) throw new BadRequestException('Not authenticated');

      const status = await this.friendsService.getFriendshipStatus(userId, data.userId);

      return { success: true, ...status };
    } catch (error) {
      this.logger.error('Get friendship status error:', error.message);
      return { success: false, error: error.message };
    }
  }

  /**
   * Helper: Extract JWT from Socket handshake
   */
  private extractToken(client: Socket): string | null {
    const auth = client.handshake?.auth;
    const token = auth?.token || auth?.Authorization?.replace('Bearer ', '');
    return token || null;
  }
}
