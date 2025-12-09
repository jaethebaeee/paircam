import {
  Injectable,
  BadRequestException,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { FriendRequest, FriendRequestStatus, Friendship, BlockedUser } from './entities';
import { SendFriendRequestDto, FriendRequestResponse } from './dto';
import { LoggerService } from '../services/logger.service';

@Injectable()
export class FriendsService {
  constructor(
    @InjectRepository(FriendRequest)
    private friendRequestRepo: Repository<FriendRequest>,
    @InjectRepository(Friendship)
    private friendshipRepo: Repository<Friendship>,
    @InjectRepository(BlockedUser)
    private blockedUserRepo: Repository<BlockedUser>,
    private logger: LoggerService,
  ) {}

  /**
   * Send a friend request to another user
   */
  async sendFriendRequest(
    requesterId: string,
    dto: SendFriendRequestDto,
  ): Promise<FriendRequest> {
    const { recipientId, message, sessionId } = dto;

    // Can't send friend request to yourself
    if (requesterId === recipientId) {
      throw new BadRequestException('Cannot send friend request to yourself');
    }

    // Check if blocked
    const isBlocked = await this.isBlocked(recipientId, requesterId);
    if (isBlocked) {
      throw new BadRequestException('Cannot send friend request to this user');
    }

    // Check if already friends
    const alreadyFriends = await this.areFriends(requesterId, recipientId);
    if (alreadyFriends) {
      throw new ConflictException('Already friends with this user');
    }

    // Check for existing pending request (either direction)
    const existingRequest = await this.friendRequestRepo.findOne({
      where: [
        { requesterId, recipientId, status: FriendRequestStatus.PENDING },
        { requesterId: recipientId, recipientId: requesterId, status: FriendRequestStatus.PENDING },
      ],
    });

    if (existingRequest) {
      // If they sent us a request, auto-accept
      if (existingRequest.requesterId === recipientId) {
        return this.respondToRequest(requesterId, existingRequest.id, FriendRequestResponse.ACCEPT);
      }
      throw new ConflictException('Friend request already pending');
    }

    // Create new friend request
    const friendRequest = this.friendRequestRepo.create({
      requesterId,
      recipientId,
      message,
      sessionId,
      status: FriendRequestStatus.PENDING,
    });

    await this.friendRequestRepo.save(friendRequest);
    this.logger.log(`Friend request sent: ${requesterId} -> ${recipientId}`);

    return friendRequest;
  }

  /**
   * Respond to a friend request (accept or reject)
   */
  async respondToRequest(
    userId: string,
    requestId: string,
    response: FriendRequestResponse,
  ): Promise<FriendRequest> {
    const request = await this.friendRequestRepo.findOne({
      where: { id: requestId, recipientId: userId, status: FriendRequestStatus.PENDING },
    });

    if (!request) {
      throw new NotFoundException('Friend request not found');
    }

    request.respondedAt = new Date();

    if (response === FriendRequestResponse.ACCEPT) {
      request.status = FriendRequestStatus.ACCEPTED;
      await this.friendRequestRepo.save(request);

      // Create bidirectional friendship
      await this.createFriendship(request.requesterId, request.recipientId);
      this.logger.log(`Friend request accepted: ${request.requesterId} <-> ${request.recipientId}`);
    } else {
      request.status = FriendRequestStatus.REJECTED;
      await this.friendRequestRepo.save(request);
      this.logger.log(`Friend request rejected: ${request.requesterId} -> ${request.recipientId}`);
    }

    return request;
  }

  /**
   * Cancel a sent friend request
   */
  async cancelRequest(userId: string, requestId: string): Promise<void> {
    const request = await this.friendRequestRepo.findOne({
      where: { id: requestId, requesterId: userId, status: FriendRequestStatus.PENDING },
    });

    if (!request) {
      throw new NotFoundException('Friend request not found');
    }

    await this.friendRequestRepo.remove(request);
    this.logger.log(`Friend request cancelled: ${userId}`);
  }

  /**
   * Get pending friend requests received by user
   */
  async getPendingRequests(userId: string): Promise<FriendRequest[]> {
    return this.friendRequestRepo.find({
      where: { recipientId: userId, status: FriendRequestStatus.PENDING },
      relations: ['requester'],
      order: { createdAt: 'DESC' },
    });
  }

  /**
   * Get sent friend requests by user
   */
  async getSentRequests(userId: string): Promise<FriendRequest[]> {
    return this.friendRequestRepo.find({
      where: { requesterId: userId, status: FriendRequestStatus.PENDING },
      relations: ['recipient'],
      order: { createdAt: 'DESC' },
    });
  }

  /**
   * Get user's friends list
   */
  async getFriendsList(userId: string): Promise<Friendship[]> {
    return this.friendshipRepo.find({
      where: { userId },
      relations: ['friend'],
      order: { lastInteractionAt: 'DESC' },
    });
  }

  /**
   * Remove a friend
   */
  async removeFriend(userId: string, friendId: string): Promise<void> {
    // Remove both directions of friendship
    await this.friendshipRepo.delete({ userId, friendId });
    await this.friendshipRepo.delete({ userId: friendId, friendId: userId });
    this.logger.log(`Friendship removed: ${userId} <-> ${friendId}`);
  }

  /**
   * Block a user
   */
  async blockUser(userId: string, blockedUserId: string, reason?: string): Promise<BlockedUser> {
    if (userId === blockedUserId) {
      throw new BadRequestException('Cannot block yourself');
    }

    // Check if already blocked (using blocking module's field names)
    const existing = await this.blockedUserRepo.findOne({
      where: { blockerId: userId, blockedId: blockedUserId },
    });

    if (existing) {
      throw new ConflictException('User already blocked');
    }

    // Remove any existing friendship
    await this.removeFriend(userId, blockedUserId);

    // Cancel any pending requests
    await this.friendRequestRepo.update(
      { requesterId: userId, recipientId: blockedUserId, status: FriendRequestStatus.PENDING },
      { status: FriendRequestStatus.BLOCKED },
    );
    await this.friendRequestRepo.update(
      { requesterId: blockedUserId, recipientId: userId, status: FriendRequestStatus.PENDING },
      { status: FriendRequestStatus.BLOCKED },
    );

    // Create block record (using blocking module's field names)
    const block = this.blockedUserRepo.create({
      blockerId: userId,
      blockedId: blockedUserId,
      reason,
    });

    await this.blockedUserRepo.save(block);
    this.logger.log(`User blocked: ${userId} blocked ${blockedUserId}`);

    return block;
  }

  /**
   * Unblock a user
   */
  async unblockUser(userId: string, blockedUserId: string): Promise<void> {
    const result = await this.blockedUserRepo.delete({ blockerId: userId, blockedId: blockedUserId });

    if (result.affected === 0) {
      throw new NotFoundException('Block record not found');
    }

    this.logger.log(`User unblocked: ${userId} unblocked ${blockedUserId}`);
  }

  /**
   * Get blocked users list
   */
  async getBlockedUsers(userId: string): Promise<BlockedUser[]> {
    return this.blockedUserRepo.find({
      where: { blockerId: userId },
      relations: ['blocked'],
      order: { createdAt: 'DESC' },
    });
  }

  /**
   * Check if user is blocked by another user
   */
  async isBlocked(userId: string, byUserId: string): Promise<boolean> {
    const block = await this.blockedUserRepo.findOne({
      where: { blockerId: byUserId, blockedId: userId },
    });
    return !!block;
  }

  /**
   * Check if two users are friends
   */
  async areFriends(userId1: string, userId2: string): Promise<boolean> {
    const friendship = await this.friendshipRepo.findOne({
      where: { userId: userId1, friendId: userId2 },
    });
    return !!friendship;
  }

  /**
   * Get friendship status between two users
   */
  async getFriendshipStatus(
    userId: string,
    otherUserId: string,
  ): Promise<{
    status: 'none' | 'friends' | 'pending_sent' | 'pending_received' | 'blocked';
    requestId?: string;
  }> {
    // Check if blocked
    const blocked = await this.isBlocked(userId, otherUserId);
    if (blocked) {
      return { status: 'blocked' };
    }

    // Check if friends
    const friends = await this.areFriends(userId, otherUserId);
    if (friends) {
      return { status: 'friends' };
    }

    // Check for pending request (sent by current user)
    const sentRequest = await this.friendRequestRepo.findOne({
      where: { requesterId: userId, recipientId: otherUserId, status: FriendRequestStatus.PENDING },
    });
    if (sentRequest) {
      return { status: 'pending_sent', requestId: sentRequest.id };
    }

    // Check for pending request (received by current user)
    const receivedRequest = await this.friendRequestRepo.findOne({
      where: { requesterId: otherUserId, recipientId: userId, status: FriendRequestStatus.PENDING },
    });
    if (receivedRequest) {
      return { status: 'pending_received', requestId: receivedRequest.id };
    }

    return { status: 'none' };
  }

  /**
   * Update last interaction time between friends
   */
  async updateLastInteraction(userId: string, friendId: string): Promise<void> {
    await this.friendshipRepo.update(
      { userId, friendId },
      { lastInteractionAt: new Date() },
    );
    await this.friendshipRepo.update(
      { userId: friendId, friendId: userId },
      { lastInteractionAt: new Date() },
    );
  }

  /**
   * Get count of pending friend requests
   */
  async getPendingRequestsCount(userId: string): Promise<number> {
    return this.friendRequestRepo.count({
      where: { recipientId: userId, status: FriendRequestStatus.PENDING },
    });
  }

  /**
   * Create bidirectional friendship
   */
  private async createFriendship(userId1: string, userId2: string): Promise<void> {
    const now = new Date();

    // Create friendship in both directions
    const friendship1 = this.friendshipRepo.create({
      userId: userId1,
      friendId: userId2,
      lastInteractionAt: now,
    });

    const friendship2 = this.friendshipRepo.create({
      userId: userId2,
      friendId: userId1,
      lastInteractionAt: now,
    });

    await this.friendshipRepo.save([friendship1, friendship2]);
  }
}
