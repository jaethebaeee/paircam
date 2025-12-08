import {
  Controller,
  Get,
  Post,
  Delete,
  Body,
  Param,
  UseGuards,
  Req,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { FriendsService } from './friends.service';
import { SendFriendRequestDto, RespondFriendRequestDto, BlockUserDto } from './dto';

// Type for authenticated request with JWT payload
type AuthRequest = { user: { sub: string } };

@Controller('friends')
@UseGuards(JwtAuthGuard)
export class FriendsController {
  constructor(private readonly friendsService: FriendsService) {}

  /**
   * Send a friend request
   * POST /friends/request
   */
  @Post('request')
  async sendFriendRequest(
    @Req() req: AuthRequest,
    @Body() dto: SendFriendRequestDto,
  ) {
    const request = await this.friendsService.sendFriendRequest(req.user.sub, dto);
    return {
      success: true,
      requestId: request.id,
      status: request.status,
    };
  }

  /**
   * Get pending friend requests received
   * GET /friends/requests/pending
   */
  @Get('requests/pending')
  async getPendingRequests(@Req() req: AuthRequest) {
    const requests = await this.friendsService.getPendingRequests(req.user.sub);
    return {
      success: true,
      count: requests.length,
      requests: requests.map((r) => ({
        id: r.id,
        fromUser: {
          id: r.requester.id,
          username: r.requester.username,
          avatarUrl: r.requester.avatarUrl,
        },
        message: r.message,
        createdAt: r.createdAt,
      })),
    };
  }

  /**
   * Get sent friend requests
   * GET /friends/requests/sent
   */
  @Get('requests/sent')
  async getSentRequests(@Req() req: AuthRequest) {
    const requests = await this.friendsService.getSentRequests(req.user.sub);
    return {
      success: true,
      count: requests.length,
      requests: requests.map((r) => ({
        id: r.id,
        toUser: {
          id: r.recipient.id,
          username: r.recipient.username,
          avatarUrl: r.recipient.avatarUrl,
        },
        message: r.message,
        createdAt: r.createdAt,
      })),
    };
  }

  /**
   * Get pending requests count (for badge/notification)
   * GET /friends/requests/count
   */
  @Get('requests/count')
  async getPendingRequestsCount(@Req() req: AuthRequest) {
    const count = await this.friendsService.getPendingRequestsCount(req.user.sub);
    return { success: true, count };
  }

  /**
   * Respond to a friend request (accept/reject)
   * POST /friends/requests/:id/respond
   */
  @Post('requests/:id/respond')
  async respondToRequest(
    @Req() req: AuthRequest,
    @Param('id') requestId: string,
    @Body() dto: RespondFriendRequestDto,
  ) {
    const request = await this.friendsService.respondToRequest(
      req.user.sub,
      requestId,
      dto.response,
    );
    return {
      success: true,
      requestId: request.id,
      status: request.status,
    };
  }

  /**
   * Cancel a sent friend request
   * DELETE /friends/requests/:id
   */
  @Delete('requests/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async cancelRequest(
    @Req() req: AuthRequest,
    @Param('id') requestId: string,
  ) {
    await this.friendsService.cancelRequest(req.user.sub, requestId);
  }

  /**
   * Get friends list
   * GET /friends/list
   */
  @Get('list')
  async getFriendsList(@Req() req: AuthRequest) {
    const friendships = await this.friendsService.getFriendsList(req.user.sub);
    return {
      success: true,
      count: friendships.length,
      friends: friendships.map((f) => ({
        friendshipId: f.id,
        user: {
          id: f.friend.id,
          username: f.friend.username,
          avatarUrl: f.friend.avatarUrl,
          lastActive: f.friend.lastActive,
        },
        connectedAt: f.connectedAt,
        lastInteractionAt: f.lastInteractionAt,
      })),
    };
  }

  /**
   * Remove a friend
   * DELETE /friends/:friendId
   */
  @Delete(':friendId')
  @HttpCode(HttpStatus.NO_CONTENT)
  async removeFriend(
    @Req() req: AuthRequest,
    @Param('friendId') friendId: string,
  ) {
    await this.friendsService.removeFriend(req.user.sub, friendId);
  }

  /**
   * Get friendship status with another user
   * GET /friends/status/:userId
   */
  @Get('status/:userId')
  async getFriendshipStatus(
    @Req() req: AuthRequest,
    @Param('userId') userId: string,
  ) {
    const status = await this.friendsService.getFriendshipStatus(req.user.sub, userId);
    return { success: true, ...status };
  }

  /**
   * Block a user
   * POST /friends/block
   */
  @Post('block')
  async blockUser(
    @Req() req: AuthRequest,
    @Body() dto: BlockUserDto,
  ) {
    const block = await this.friendsService.blockUser(req.user.sub, dto.userId, dto.reason);
    return {
      success: true,
      blockId: block.id,
    };
  }

  /**
   * Unblock a user
   * DELETE /friends/block/:userId
   */
  @Delete('block/:userId')
  @HttpCode(HttpStatus.NO_CONTENT)
  async unblockUser(
    @Req() req: AuthRequest,
    @Param('userId') userId: string,
  ) {
    await this.friendsService.unblockUser(req.user.sub, userId);
  }

  /**
   * Get blocked users list
   * GET /friends/blocked
   */
  @Get('blocked')
  async getBlockedUsers(@Req() req: AuthRequest) {
    const blocked = await this.friendsService.getBlockedUsers(req.user.sub);
    return {
      success: true,
      count: blocked.length,
      blockedUsers: blocked.map((b) => ({
        blockId: b.id,
        user: {
          id: b.blockedUser.id,
          username: b.blockedUser.username,
          avatarUrl: b.blockedUser.avatarUrl,
        },
        reason: b.reason,
        createdAt: b.createdAt,
      })),
    };
  }
}
