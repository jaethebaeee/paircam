import { Controller, Post, Delete, Get, Body, UseGuards, Request, HttpCode, HttpStatus } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { BlockingService, BlockedUserInfo } from './blocking.service';
import { BlockUserDto, UnblockUserDto } from './dto';

@Controller('blocks')
@UseGuards(JwtAuthGuard)
export class BlockingController {
  constructor(private readonly blockingService: BlockingService) {}

  /**
   * Block a user
   * POST /blocks
   */
  @Post()
  @HttpCode(HttpStatus.CREATED)
  async blockUser(
    @Request() req: { user: { deviceId: string } },
    @Body() dto: BlockUserDto,
  ): Promise<{ success: boolean; message: string }> {
    await this.blockingService.blockUser(
      req.user.deviceId,
      dto.blockedUserId,
      dto.reason,
      dto.sessionId,
    );

    return {
      success: true,
      message: 'User blocked successfully. You will no longer be matched with this user.',
    };
  }

  /**
   * Unblock a user
   * DELETE /blocks
   */
  @Delete()
  @HttpCode(HttpStatus.OK)
  async unblockUser(
    @Request() req: { user: { deviceId: string } },
    @Body() dto: UnblockUserDto,
  ): Promise<{ success: boolean; message: string }> {
    await this.blockingService.unblockUser(req.user.deviceId, dto.blockedUserId);

    return {
      success: true,
      message: 'User unblocked successfully.',
    };
  }

  /**
   * Get list of blocked users
   * GET /blocks
   */
  @Get()
  async getBlockedUsers(
    @Request() req: { user: { deviceId: string } },
  ): Promise<{ blocked: BlockedUserInfo[]; count: number }> {
    const blocked = await this.blockingService.getBlockedUsers(req.user.deviceId);

    return {
      blocked,
      count: blocked.length,
    };
  }

  /**
   * Get blocked count
   * GET /blocks/count
   */
  @Get('count')
  async getBlockedCount(
    @Request() req: { user: { deviceId: string } },
  ): Promise<{ count: number }> {
    const count = await this.blockingService.getBlockedCount(req.user.deviceId);

    return { count };
  }
}
