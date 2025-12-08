import { IsString, IsOptional, MaxLength, IsUUID } from 'class-validator';

export class BlockUserDto {
  @IsUUID()
  userId: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  reason?: string;
}
