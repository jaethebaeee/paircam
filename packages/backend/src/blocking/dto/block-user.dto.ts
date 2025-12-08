import { IsString, IsNotEmpty, IsOptional, MaxLength } from 'class-validator';

export class BlockUserDto {
  @IsString()
  @IsNotEmpty()
  blockedUserId: string;

  @IsString()
  @IsOptional()
  @MaxLength(500)
  reason?: string;

  @IsString()
  @IsOptional()
  sessionId?: string;
}
