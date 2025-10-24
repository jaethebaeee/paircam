import { IsString, IsDateString, IsBoolean, IsOptional } from 'class-validator';

export class UpdateSubscriptionDto {
  @IsOptional()
  @IsString()
  status?: string;

  @IsOptional()
  @IsDateString()
  currentPeriodStart?: Date;

  @IsOptional()
  @IsDateString()
  currentPeriodEnd?: Date;

  @IsOptional()
  @IsBoolean()
  cancelAtPeriodEnd?: boolean;

  @IsOptional()
  @IsDateString()
  canceledAt?: Date;
}

