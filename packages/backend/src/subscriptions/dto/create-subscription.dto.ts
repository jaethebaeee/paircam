import { IsString, IsNotEmpty, IsDateString, IsBoolean, IsOptional } from 'class-validator';

export class CreateSubscriptionDto {
  @IsString()
  @IsNotEmpty()
  userId: string;

  @IsString()
  @IsNotEmpty()
  stripeCustomerId: string;

  @IsString()
  @IsNotEmpty()
  stripeSubscriptionId: string;

  @IsString()
  @IsNotEmpty()
  stripePriceId: string;

  @IsString()
  @IsNotEmpty()
  status: string;

  @IsString()
  @IsNotEmpty()
  plan: string;

  @IsDateString()
  currentPeriodStart: Date;

  @IsDateString()
  currentPeriodEnd: Date;

  @IsOptional()
  @IsDateString()
  trialEnd?: Date;

  @IsOptional()
  @IsBoolean()
  cancelAtPeriodEnd?: boolean;
}

