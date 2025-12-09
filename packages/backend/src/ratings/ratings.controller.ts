import { Controller, Get, Post, Delete, Body, Param, Query, UseGuards, Req } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RatingsService, SubmitRatingDto } from './ratings.service';
import { UsersService } from '../users/users.service';

@Controller('ratings')
@UseGuards(JwtAuthGuard)
export class RatingsController {
  constructor(
    private readonly ratingsService: RatingsService,
    private readonly usersService: UsersService,
  ) {}

  @Post()
  async submitRating(
    @Req() req: { user: { deviceId: string } },
    @Body() body: SubmitRatingDto,
  ) {
    const user = await this.usersService.findByDeviceId(req.user.deviceId);
    if (!user) {
      return { error: 'User not found' };
    }

    try {
      const rating = await this.ratingsService.submitRating(user.id, body);
      return {
        success: true,
        data: {
          id: rating.id,
          rating: rating.rating,
          isFavorite: rating.isFavorite,
        },
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
      };
    }
  }

  @Get('me/stats')
  async getMyRatingStats(@Req() req: { user: { deviceId: string } }) {
    const user = await this.usersService.findByDeviceId(req.user.deviceId);
    if (!user) {
      return { error: 'User not found' };
    }

    const stats = await this.ratingsService.getUserRatingStats(user.id);
    return {
      success: true,
      data: stats,
    };
  }

  @Get('me/received')
  async getMyReceivedRatings(
    @Req() req: { user: { deviceId: string } },
    @Query('limit') limit?: string,
  ) {
    const user = await this.usersService.findByDeviceId(req.user.deviceId);
    if (!user) {
      return { error: 'User not found' };
    }

    const parsedLimit = Math.min(parseInt(limit || '10', 10), 50);
    const ratings = await this.ratingsService.getUserRatings(user.id, parsedLimit);

    return {
      success: true,
      data: ratings.map((r) => ({
        id: r.id,
        rating: r.rating,
        comment: r.comment,
        tags: r.tags,
        createdAt: r.createdAt,
      })),
    };
  }

  @Get('me/given')
  async getMyGivenRatings(
    @Req() req: { user: { deviceId: string } },
    @Query('limit') limit?: string,
  ) {
    const user = await this.usersService.findByDeviceId(req.user.deviceId);
    if (!user) {
      return { error: 'User not found' };
    }

    const parsedLimit = Math.min(parseInt(limit || '50', 10), 100);
    const ratings = await this.ratingsService.getRatingsGiven(user.id, parsedLimit);

    return {
      success: true,
      data: ratings.map((r) => ({
        id: r.id,
        toUserId: r.toUserId,
        rating: r.rating,
        comment: r.comment,
        tags: r.tags,
        isFavorite: r.isFavorite,
        createdAt: r.createdAt,
      })),
    };
  }

  @Get('me/favorites')
  async getMyFavorites(@Req() req: { user: { deviceId: string } }) {
    const user = await this.usersService.findByDeviceId(req.user.deviceId);
    if (!user) {
      return { error: 'User not found' };
    }

    const favorites = await this.ratingsService.getFavorites(user.id);
    return {
      success: true,
      data: favorites,
      count: favorites.length,
    };
  }

  @Delete('me/favorites/:userId')
  async removeFavorite(
    @Req() req: { user: { deviceId: string } },
    @Param('userId') favoriteUserId: string,
  ) {
    const user = await this.usersService.findByDeviceId(req.user.deviceId);
    if (!user) {
      return { error: 'User not found' };
    }

    await this.ratingsService.removeFromFavorites(user.id, favoriteUserId);
    return {
      success: true,
      message: 'User removed from favorites',
    };
  }

  @Get('user/:userId/stats')
  async getUserStats(@Param('userId') userId: string) {
    const stats = await this.ratingsService.getUserRatingStats(userId);
    return {
      success: true,
      data: {
        averageRating: stats.averageRating,
        totalRatings: stats.totalRatings,
        topTags: stats.topTags,
      },
    };
  }
}
