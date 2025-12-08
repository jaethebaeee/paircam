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
import { MessagesService } from './messages.service';
import { LoggerService } from '../services/logger.service';

@WebSocketGateway({
  cors: {
    origin: process.env.CORS_ORIGINS?.split(',') || ['http://localhost:5173'],
    credentials: true,
  },
  namespace: '/messages',
})
export class MessagesGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  // Map client socket ID to user ID
  private clientToUser = new Map<string, string>();
  // Map user ID to client socket ID
  private userToClient = new Map<string, string>();

  constructor(
    private messagesService: MessagesService,
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

      // Join user-specific room for targeted messages
      client.join(`user:${userId}`);

      this.logger.log(`Messages client connected: ${client.id} (user: ${userId})`);

      // Send unread message count on connect
      const unreadCount = await this.messagesService.getTotalUnreadCount(userId);
      client.emit('unread-count', { count: unreadCount });
    } catch (error) {
      this.logger.error('Messages connection auth failed:', error.message);
      client.disconnect();
    }
  }

  handleDisconnect(client: Socket) {
    const userId = this.clientToUser.get(client.id);
    if (userId) {
      this.userToClient.delete(userId);
    }
    this.clientToUser.delete(client.id);
    this.logger.log(`Messages client disconnected: ${client.id}`);
  }

  /**
   * Send a message via WebSocket
   * Client emits: 'message-send'
   */
  @SubscribeMessage('message-send')
  async handleSendMessage(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { recipientId: string; content: string },
  ) {
    try {
      const userId = this.clientToUser.get(client.id);
      if (!userId) throw new BadRequestException('Not authenticated');

      const { message, conversation } = await this.messagesService.sendMessage(userId, {
        recipientId: data.recipientId,
        content: data.content,
      });

      const messagePayload = {
        id: message.id,
        conversationId: message.conversationId,
        senderId: message.senderId,
        recipientId: message.recipientId,
        content: message.content,
        status: message.status,
        createdAt: message.createdAt,
      };

      // Send to recipient in real-time
      this.server.to(`user:${data.recipientId}`).emit('message-received', messagePayload);

      // Update recipient's unread count
      const recipientUnreadCount = await this.messagesService.getTotalUnreadCount(data.recipientId);
      this.server.to(`user:${data.recipientId}`).emit('unread-count', { count: recipientUnreadCount });

      // Confirm to sender
      return {
        success: true,
        message: messagePayload,
      };
    } catch (error) {
      this.logger.error('Message send error:', error.message);
      client.emit('error', { message: error.message });
      return { success: false, error: error.message };
    }
  }

  /**
   * Join a conversation room for typing indicators
   * Client emits: 'conversation-join'
   */
  @SubscribeMessage('conversation-join')
  async handleJoinConversation(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { conversationId: string },
  ) {
    try {
      const userId = this.clientToUser.get(client.id);
      if (!userId) throw new BadRequestException('Not authenticated');

      // Verify user is part of conversation
      const conversation = await this.messagesService.getConversationById(data.conversationId);
      if (!conversation) {
        throw new BadRequestException('Conversation not found');
      }

      if (conversation.participantOneId !== userId && conversation.participantTwoId !== userId) {
        throw new BadRequestException('Not a participant');
      }

      client.join(`conversation:${data.conversationId}`);
      this.logger.log(`User ${userId} joined conversation ${data.conversationId}`);

      return { success: true };
    } catch (error) {
      this.logger.error('Conversation join error:', error.message);
      return { success: false, error: error.message };
    }
  }

  /**
   * Leave a conversation room
   * Client emits: 'conversation-leave'
   */
  @SubscribeMessage('conversation-leave')
  async handleLeaveConversation(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { conversationId: string },
  ) {
    client.leave(`conversation:${data.conversationId}`);
    return { success: true };
  }

  /**
   * Send typing indicator
   * Client emits: 'typing-start'
   */
  @SubscribeMessage('typing-start')
  async handleTypingStart(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { conversationId: string },
  ) {
    const userId = this.clientToUser.get(client.id);
    if (!userId) return;

    // Broadcast to conversation room except sender
    client.to(`conversation:${data.conversationId}`).emit('user-typing', {
      conversationId: data.conversationId,
      userId,
      isTyping: true,
    });
  }

  /**
   * Stop typing indicator
   * Client emits: 'typing-stop'
   */
  @SubscribeMessage('typing-stop')
  async handleTypingStop(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { conversationId: string },
  ) {
    const userId = this.clientToUser.get(client.id);
    if (!userId) return;

    client.to(`conversation:${data.conversationId}`).emit('user-typing', {
      conversationId: data.conversationId,
      userId,
      isTyping: false,
    });
  }

  /**
   * Mark messages as read
   * Client emits: 'messages-read'
   */
  @SubscribeMessage('messages-read')
  async handleMessagesRead(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { conversationId: string },
  ) {
    try {
      const userId = this.clientToUser.get(client.id);
      if (!userId) throw new BadRequestException('Not authenticated');

      await this.messagesService.markAsRead(userId, data.conversationId);

      // Get conversation to notify the other user
      const conversation = await this.messagesService.getConversationById(data.conversationId);
      if (conversation) {
        const otherUserId = conversation.getOtherParticipantId(userId);
        this.server.to(`user:${otherUserId}`).emit('messages-read-receipt', {
          conversationId: data.conversationId,
          readByUserId: userId,
          readAt: new Date(),
        });
      }

      // Update sender's unread count
      const unreadCount = await this.messagesService.getTotalUnreadCount(userId);
      client.emit('unread-count', { count: unreadCount });

      return { success: true };
    } catch (error) {
      this.logger.error('Messages read error:', error.message);
      return { success: false, error: error.message };
    }
  }

  /**
   * Get unread count
   * Client emits: 'get-unread-count'
   */
  @SubscribeMessage('get-unread-count')
  async handleGetUnreadCount(@ConnectedSocket() client: Socket) {
    try {
      const userId = this.clientToUser.get(client.id);
      if (!userId) throw new BadRequestException('Not authenticated');

      const count = await this.messagesService.getTotalUnreadCount(userId);
      return { success: true, count };
    } catch (error) {
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
