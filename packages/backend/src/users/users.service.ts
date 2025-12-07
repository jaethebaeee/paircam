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

