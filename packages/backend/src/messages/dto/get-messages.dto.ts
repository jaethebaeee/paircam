import { IsOptional, IsInt, Min, Max, IsString, IsUUID } from 'class-validator';
import { Type } from 'class-transformer';

export class GetMessagesQueryDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number = 50;

  @IsOptional()
  @IsString()
  before?: string;
}

export class GetConversationWithUserDto {
  @IsUUID()
  userId: string;
}
