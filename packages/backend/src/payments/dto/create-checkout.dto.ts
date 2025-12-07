import { IsString, IsIn } from 'class-validator';

export class CreateCheckoutDto {
  @IsString()
  @IsIn(['weekly', 'monthly'])
  plan: 'weekly' | 'monthly';
}

