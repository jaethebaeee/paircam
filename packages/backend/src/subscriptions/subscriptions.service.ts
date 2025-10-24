import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Subscription } from './entities/subscription.entity';
import { CreateSubscriptionDto } from './dto/create-subscription.dto';
import { UpdateSubscriptionDto } from './dto/update-subscription.dto';
import { LoggerService } from '../services/logger.service';

@Injectable()
export class SubscriptionsService {
  constructor(
    @InjectRepository(Subscription)
    private subscriptionsRepository: Repository<Subscription>,
    private readonly logger: LoggerService,
  ) {}

  async create(createSubscriptionDto: CreateSubscriptionDto): Promise<Subscription> {
    const subscription = this.subscriptionsRepository.create(createSubscriptionDto);
    await this.subscriptionsRepository.save(subscription);
    
    this.logger.log('Subscription created', {
      userId: subscription.userId,
      plan: subscription.plan,
      status: subscription.status,
    });
    
    return subscription;
  }

  async findByUserId(userId: string): Promise<Subscription[]> {
    return this.subscriptionsRepository.find({
      where: { userId },
      order: { createdAt: 'DESC' },
    });
  }

  async findActiveByUserId(userId: string): Promise<Subscription | null> {
    return this.subscriptionsRepository.findOne({
      where: { 
        userId,
        status: 'active',
      },
      order: { currentPeriodEnd: 'DESC' },
    });
  }

  async findByStripeSubscriptionId(stripeSubscriptionId: string): Promise<Subscription | null> {
    return this.subscriptionsRepository.findOne({
      where: { stripeSubscriptionId },
    });
  }

  async findByStripeCustomerId(stripeCustomerId: string): Promise<Subscription[]> {
    return this.subscriptionsRepository.find({
      where: { stripeCustomerId },
      order: { createdAt: 'DESC' },
    });
  }

  async updateByStripeId(
    stripeSubscriptionId: string,
    updateSubscriptionDto: UpdateSubscriptionDto,
  ): Promise<Subscription> {
    const subscription = await this.findByStripeSubscriptionId(stripeSubscriptionId);
    
    if (!subscription) {
      throw new NotFoundException(`Subscription not found: ${stripeSubscriptionId}`);
    }

    Object.assign(subscription, updateSubscriptionDto);
    await this.subscriptionsRepository.save(subscription);
    
    this.logger.log('Subscription updated', {
      subscriptionId: subscription.id,
      status: subscription.status,
      cancelAtPeriodEnd: subscription.cancelAtPeriodEnd,
    });
    
    return subscription;
  }

  async cancel(userId: string): Promise<Subscription> {
    const subscription = await this.findActiveByUserId(userId);
    
    if (!subscription) {
      throw new NotFoundException('No active subscription found');
    }

    subscription.cancelAtPeriodEnd = true;
    subscription.canceledAt = new Date();
    await this.subscriptionsRepository.save(subscription);
    
    this.logger.log('Subscription cancelled', {
      userId,
      subscriptionId: subscription.id,
    });
    
    return subscription;
  }

  async isUserPremium(userId: string): Promise<boolean> {
    const subscription = await this.subscriptionsRepository.findOne({
      where: { 
        userId,
        status: 'active',
      },
    });

    if (!subscription) {
      return false;
    }

    // Check if subscription is still valid
    return new Date(subscription.currentPeriodEnd) > new Date();
  }
}

