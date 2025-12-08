import { IsString, IsOptional, MaxLength, IsUUID } from 'class-validator';

export class SendFriendRequestDto {
  @IsUUID()
  recipientId: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  message?: string;

  @IsOptional()
  @IsString()
  sessionId?: string; // Video call session where they met
}
