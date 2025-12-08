import { IsString, IsEmail, IsOptional, IsIn } from 'class-validator';

export class LinkAccountDto {
  @IsString()
  @IsIn(['google', 'apple', 'discord'])
  provider: 'google' | 'apple' | 'discord';

  @IsString()
  providerId: string;

  @IsEmail()
  email: string;

  @IsString()
  @IsOptional()
  name?: string;

  @IsString()
  @IsOptional()
  avatarUrl?: string;
}
