import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { UsersService } from '../users/users.service';

/**
 * Guard that ensures the user has moderator or admin privileges.
 * Must be used AFTER JwtAuthGuard to ensure user is authenticated.
 */
@Injectable()
export class ModeratorGuard implements CanActivate {
  constructor(private readonly usersService: UsersService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const deviceId = request.user?.deviceId;

    if (!deviceId) {
      throw new ForbiddenException('Authentication required');
    }

    const user = await this.usersService.findByDeviceId(deviceId);

    if (!user) {
      throw new ForbiddenException('User not found');
    }

    if (user.role !== 'moderator' && user.role !== 'admin') {
      throw new ForbiddenException('Moderator privileges required');
    }

    // Attach full user to request for downstream use
    request.moderator = user;

    return true;
  }
}
