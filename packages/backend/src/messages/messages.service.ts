import { Injectable, BadRequestException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, LessThan } from 'typeorm';
import { Message, MessageStatus } from './entities/message.entity';
import { Conversation } from './entities/conversation.entity';
import { FriendsService } from '../friends/friends.service';
import { LoggerService } from '../services/logger.service';
import { SendMessageDto } from './dto/send-message.dto';

@Injectable()
export class MessagesService {
  constructor(
    @InjectRepository(Message)
    private messageRepository: Repository<Message>,
    @InjectRepository(Conversation)
    private conversationRepository: Repository<Conversation>,
    private friendsService: FriendsService,
    private logger: LoggerService,
  ) {}

  /**
   * Send a message to a friend
   */
  async sendMessage(
    senderId: string,
    dto: SendMessageDto,
  ): Promise<{ message: Message; conversation: Conversation }> {
    const { recipientId, content } = dto;

    // Cannot message yourself
    if (senderId === recipientId) {
      throw new BadRequestException('Cannot send message to yourself');
    }

    // Check if users are friends
    const areFriends = await this.friendsService.areFriends(senderId, recipientId);
    if (!areFriends) {
      throw new ForbiddenException('You can only message friends');
    }

    // Check if blocked
    const isBlocked = await this.friendsService.isBlocked(senderId, recipientId);
    if (isBlocked) {
      throw new ForbiddenException('Cannot message this user');
    }

    // Get or create conversation
    const conversation = await this.getOrCreateConversation(senderId, recipientId);

    // Create message
    const message = this.messageRepository.create({
      conversationId: conversation.id,
      senderId,
      recipientId,
      content: content.trim(),
      status: MessageStatus.SENT,
    });

    await this.messageRepository.save(message);

    // Update conversation
    const preview = content.length > 100 ? content.substring(0, 100) + '...' : content;
    conversation.lastMessagePreview = preview;
    conversation.lastMessageAt = new Date();
    conversation.lastMessageSenderId = senderId;

    // Increment unread count for recipient
    if (recipientId === conversation.participantOneId) {
      conversation.unreadCountOne += 1;
    } else {
      conversation.unreadCountTwo += 1;
    }

    await this.conversationRepository.save(conversation);

    // Update last interaction in friendship
    await this.friendsService.updateLastInteraction(senderId, recipientId);

    this.logger.log(`Message sent from ${senderId} to ${recipientId}`);

    return { message, conversation };
  }

  /**
   * Get or create a conversation between two users
   */
  async getOrCreateConversation(userId1: string, userId2: string): Promise<Conversation> {
    // Always store lower UUID first to ensure uniqueness
    const [participantOneId, participantTwoId] = [userId1, userId2].sort();

    let conversation = await this.conversationRepository.findOne({
      where: { participantOneId, participantTwoId },
    });

    if (!conversation) {
      conversation = this.conversationRepository.create({
        participantOneId,
        participantTwoId,
      });
      await this.conversationRepository.save(conversation);
      this.logger.log(`Created new conversation between ${userId1} and ${userId2}`);
    }

    return conversation;
  }

  /**
   * Get all conversations for a user
   */
  async getConversations(userId: string): Promise<any[]> {
    const conversations = await this.conversationRepository
      .createQueryBuilder('conversation')
      .leftJoinAndSelect('conversation.participantOne', 'participantOne')
      .leftJoinAndSelect('conversation.participantTwo', 'participantTwo')
      .where('conversation.participantOneId = :userId', { userId })
      .orWhere('conversation.participantTwoId = :userId', { userId })
      .orderBy('conversation.lastMessageAt', 'DESC', 'NULLS LAST')
      .getMany();

    // Transform to include the other participant info
    return conversations.map(conv => {
      const isParticipantOne = conv.participantOneId === userId;
      const otherUser = isParticipantOne ? conv.participantTwo : conv.participantOne;
      const unreadCount = isParticipantOne ? conv.unreadCountOne : conv.unreadCountTwo;

      return {
        id: conv.id,
        otherUser: {
          id: otherUser.id,
          username: otherUser.username,
          avatarUrl: otherUser.avatarUrl,
        },
        lastMessagePreview: conv.lastMessagePreview,
        lastMessageAt: conv.lastMessageAt,
        lastMessageSenderId: conv.lastMessageSenderId,
        unreadCount,
        createdAt: conv.createdAt,
      };
    });
  }

  /**
   * Get messages in a conversation
   */
  async getMessages(
    userId: string,
    conversationId: string,
    limit = 50,
    before?: string,
  ): Promise<Message[]> {
    const conversation = await this.conversationRepository.findOne({
      where: { id: conversationId },
    });

    if (!conversation) {
      throw new NotFoundException('Conversation not found');
    }

    // Check user is part of conversation
    if (conversation.participantOneId !== userId && conversation.participantTwoId !== userId) {
      throw new ForbiddenException('Not a participant of this conversation');
    }

    const query = this.messageRepository
      .createQueryBuilder('message')
      .leftJoinAndSelect('message.sender', 'sender')
      .where('message.conversationId = :conversationId', { conversationId })
      .andWhere('message.isDeleted = false')
      .orderBy('message.createdAt', 'DESC')
      .take(limit);

    if (before) {
      const beforeMessage = await this.messageRepository.findOne({ where: { id: before } });
      if (beforeMessage) {
        query.andWhere('message.createdAt < :createdAt', { createdAt: beforeMessage.createdAt });
      }
    }

    const messages = await query.getMany();
    return messages.reverse(); // Return in chronological order
  }

  /**
   * Mark messages as read
   */
  async markAsRead(userId: string, conversationId: string): Promise<void> {
    const conversation = await this.conversationRepository.findOne({
      where: { id: conversationId },
    });

    if (!conversation) {
      throw new NotFoundException('Conversation not found');
    }

    // Check user is part of conversation
    if (conversation.participantOneId !== userId && conversation.participantTwoId !== userId) {
      throw new ForbiddenException('Not a participant of this conversation');
    }

    // Mark all unread messages as read
    await this.messageRepository.update(
      {
        conversationId,
        recipientId: userId,
        status: MessageStatus.SENT,
      },
      {
        status: MessageStatus.READ,
        readAt: new Date(),
      },
    );

    // Reset unread count
    if (userId === conversation.participantOneId) {
      conversation.unreadCountOne = 0;
    } else {
      conversation.unreadCountTwo = 0;
    }
    await this.conversationRepository.save(conversation);
  }

  /**
   * Get total unread message count for a user
   * Optimized: Uses SQL aggregation instead of loading all conversations
   */
  async getTotalUnreadCount(userId: string): Promise<number> {
    const result = await this.conversationRepository
      .createQueryBuilder('conv')
      .select(
        `COALESCE(SUM(
          CASE
            WHEN conv.participantOneId = :userId THEN conv.unreadCountOne
            ELSE conv.unreadCountTwo
          END
        ), 0)`,
        'total',
      )
      .where('conv.participantOneId = :userId OR conv.participantTwoId = :userId', { userId })
      .getRawOne();

    return parseInt(result?.total || '0', 10);
  }

  /**
   * Delete a message (soft delete)
   */
  async deleteMessage(userId: string, messageId: string): Promise<void> {
    const message = await this.messageRepository.findOne({
      where: { id: messageId },
    });

    if (!message) {
      throw new NotFoundException('Message not found');
    }

    if (message.senderId !== userId) {
      throw new ForbiddenException('Cannot delete this message');
    }

    message.isDeleted = true;
    message.content = '[Message deleted]';
    await this.messageRepository.save(message);
  }

  /**
   * Get conversation by ID
   */
  async getConversationById(conversationId: string): Promise<Conversation | null> {
    return this.conversationRepository.findOne({
      where: { id: conversationId },
      relations: ['participantOne', 'participantTwo'],
    });
  }

  /**
   * Get conversation between two users
   */
  async getConversationBetweenUsers(userId1: string, userId2: string): Promise<Conversation | null> {
    const [participantOneId, participantTwoId] = [userId1, userId2].sort();
    return this.conversationRepository.findOne({
      where: { participantOneId, participantTwoId },
      relations: ['participantOne', 'participantTwo'],
    });
  }
}
