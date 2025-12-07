import { IsString, IsNotEmpty, IsUUID, MaxLength } from 'class-validator';

export class GenerateTokenDto {
  @IsString()
  @IsNotEmpty()
  @IsUUID(4, { message: 'deviceId must be a valid UUID v4' })
  @MaxLength(36)
  deviceId: string;
}
