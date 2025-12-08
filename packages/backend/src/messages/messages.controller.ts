import {
  Controller,
  Get,
  Post,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  Request,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { MessagesService } from './messages.service';
import { SendMessageDto } from './dto/send-message.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('messages')
@UseGuards(JwtAuthGuard)
export class MessagesController {
  constructor(private readonly messagesService: MessagesService) {}

  /**
   * Send a message to a friend
   * POST /messages
   */
  @Post()
  @HttpCode(HttpStatus.CREATED)
  async sendMessage(@Request() req, @Body() dto: SendMessageDto) {
    const { message, conversation } = await this.messagesService.sendMessage(
      req.user.userId,
      dto,
    );
    return {
      success: true,
      message: {
        id: message.id,
        content: message.content,
        senderId: message.senderId,
        recipientId: message.recipientId,
        conversationId: message.conversationId,
        status: message.status,
        createdAt: message.createdAt,
      },
      conversationId: conversation.id,
    };
  }

  /**
   * Get all conversations for the current user
   * GET /messages/conversations
   */
  @Get('conversations')
  async getConversations(@Request() req) {
    const conversations = await this.messagesService.getConversations(req.user.userId);
    return {
      success: true,
      count: conversations.length,
      conversations,
    };
  }

  /**
   * Get messages in a conversation
   * GET /messages/conversations/:conversationId
   */
  @Get('conversations/:conversationId')
  async getMessages(
    @Request() req,
    @Param('conversationId') conversationId: string,
    @Query('limit') limit?: string,
    @Query('before') before?: string,
  ) {
    const messages = await this.messagesService.getMessages(
      req.user.userId,
      conversationId,
      limit ? parseInt(limit, 10) : 50,
      before,
    );
    return {
      success: true,
      count: messages.length,
      messages: messages.map(msg => ({
        id: msg.id,
        content: msg.content,
        senderId: msg.senderId,
        sender: msg.sender
          ? {
              id: msg.sender.id,
              username: msg.sender.username,
              avatarUrl: msg.sender.avatarUrl,
            }
          : null,
        status: msg.status,
        createdAt: msg.createdAt,
        isDeleted: msg.isDeleted,
      })),
    };
  }

  /**
   * Mark messages in a conversation as read
   * POST /messages/conversations/:conversationId/read
   */
  @Post('conversations/:conversationId/read')
  @HttpCode(HttpStatus.OK)
  async markAsRead(
    @Request() req,
    @Param('conversationId') conversationId: string,
  ) {
    await this.messagesService.markAsRead(req.user.userId, conversationId);
    return {
      success: true,
      message: 'Messages marked as read',
    };
  }

  /**
   * Get total unread message count
   * GET /messages/unread-count
   */
  @Get('unread-count')
  async getUnreadCount(@Request() req) {
    const count = await this.messagesService.getTotalUnreadCount(req.user.userId);
    return {
      success: true,
      count,
    };
  }

  /**
   * Get or create conversation with a user
   * GET /messages/conversation-with/:userId
   */
  @Get('conversation-with/:userId')
  async getConversationWithUser(
    @Request() req,
    @Param('userId') otherUserId: string,
  ) {
    const conversation = await this.messagesService.getOrCreateConversation(
      req.user.userId,
      otherUserId,
    );
    return {
      success: true,
      conversationId: conversation.id,
    };
  }

  /**
   * Delete a message
   * DELETE /messages/:messageId
   */
  @Delete(':messageId')
  @HttpCode(HttpStatus.OK)
  async deleteMessage(@Request() req, @Param('messageId') messageId: string) {
    await this.messagesService.deleteMessage(req.user.userId, messageId);
    return {
      success: true,
      message: 'Message deleted',
    };
  }
}
