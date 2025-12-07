import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from './entities/user.entity';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { LoggerService } from '../services/logger.service';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private usersRepository: Repository<User>,
    private readonly logger: LoggerService,
  ) {}

  async findOrCreate(deviceId: string): Promise<User> {
    let user = await this.usersRepository.findOne({ where: { deviceId } });
    
    if (!user) {
      user = this.usersRepository.create({ deviceId });
      await this.usersRepository.save(user);
      this.logger.log('New user created', { deviceId, userId: user.id });
    }
    
    return user;
  }

  async findByDeviceId(deviceId: string): Promise<User | null> {
    return this.usersRepository.findOne({ 
      where: { deviceId },
      relations: ['subscriptions'],
    });
  }

  async findById(id: string): Promise<User | null> {
    return this.usersRepository.findOne({ 
      where: { id },
      relations: ['subscriptions'],
    });
  }

  async findByGoogleId(googleId: string): Promise<User | null> {
    return this.usersRepository.findOne({ 
      where: { googleId },
      relations: ['subscriptions'],
    });
  }

  async findByEmail(email: string): Promise<User | null> {
    return this.usersRepository.findOne({
      where: { email },
      relations: ['subscriptions'],
    });
  }

  async findOrCreateByGoogle(googleUserInfo: {
    googleId: string;
    email: string;
    name?: string;
    avatarUrl?: string;
  }, deviceId?: string): Promise<User> {
    // First, try to find by Google ID
    let user = await this.findByGoogleId(googleUserInfo.googleId);

    if (user) {
      // User exists with this Google account
      if (deviceId && user.deviceId !== deviceId) {
        this.logger.log('Google user logging in from different device', {
          userId: user.id,
          oldDeviceId: user.deviceId,
          newDeviceId: deviceId
        });
      }
      return user;
    }

    // Try to find by email
    user = await this.findByEmail(googleUserInfo.email);
    if (user) {
      // Link Google to existing email account
      user.googleId = googleUserInfo.googleId;
      if (googleUserInfo.avatarUrl && !user.avatarUrl) {
        user.avatarUrl = googleUserInfo.avatarUrl;
      }
      await this.usersRepository.save(user);
      this.logger.log('Linked Google account to existing user', { userId: user.id });
      return user;
    }

    // If deviceId provided, try to find by device and link Google
    if (deviceId) {
      user = await this.findByDeviceId(deviceId);
      if (user) {
        // Link Google to existing device-based account
        user.googleId = googleUserInfo.googleId;
        user.email = googleUserInfo.email;
        if (googleUserInfo.name && !user.username) {
          user.username = googleUserInfo.name;
        }
        if (googleUserInfo.avatarUrl) {
          user.avatarUrl = googleUserInfo.avatarUrl;
        }
        await this.usersRepository.save(user);
        this.logger.log('Linked Google account to device user', { userId: user.id, deviceId });
        return user;
      }
    }

    // Create new user with Google info
    const newDeviceId = deviceId || `google_${googleUserInfo.googleId}`;
    user = this.usersRepository.create({
      deviceId: newDeviceId,
      googleId: googleUserInfo.googleId,
      email: googleUserInfo.email,
      username: googleUserInfo.name,
      avatarUrl: googleUserInfo.avatarUrl,
      isProfileComplete: true,
    });
    await this.usersRepository.save(user);
    this.logger.log('Created new user via Google OAuth', { userId: user.id, googleId: googleUserInfo.googleId });

    return user;
  }

  async create(data: Partial<User>): Promise<User> {
    const user = this.usersRepository.create(data);
    await this.usersRepository.save(user);
    this.logger.log('User created', { userId: user.id });
    return user;
  }

  async updateProfile(deviceId: string, updateProfileDto: UpdateProfileDto): Promise<User> {
    const user = await this.findByDeviceId(deviceId);
    if (!user) {
      throw new NotFoundException('User not found');
    }

    Object.assign(user, updateProfileDto);
    
    // Check if profile is complete
    user.isProfileComplete = !!(
      user.email &&
      user.gender &&
      user.age &&
      user.username
    );

    await this.usersRepository.save(user);
    this.logger.log('User profile updated', { userId: user.id, deviceId });
    
    return user;
  }

  async updateLastActive(userId: string): Promise<void> {
    await this.usersRepository.update(userId, { lastActive: new Date() });
  }

  async incrementMatches(userId: string): Promise<void> {
    await this.usersRepository.increment({ id: userId }, 'totalMatches', 1);
  }

  async isPremium(userId: string): Promise<boolean> {
    const user = await this.usersRepository.findOne({
      where: { id: userId },
      relations: ['subscriptions'],
    });

    if (!user || !user.subscriptions || user.subscriptions.length === 0) {
      return false;
    }

    // Check if any subscription is active and not expired
    return user.subscriptions.some(
      sub => sub.status === 'active' && new Date(sub.currentPeriodEnd) > new Date()
    );
  }

  async getUserWithPremiumStatus(deviceId: string): Promise<{ user: User; isPremium: boolean } | null> {
    const user = await this.findByDeviceId(deviceId);
    if (!user) {
      return null;
    }

    const isPremium = await this.isPremium(user.id);
    return { user, isPremium };
  }
}

