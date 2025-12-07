import { IsString, IsNotEmpty, IsOptional, IsUUID, MaxLength, MinLength } from 'class-validator';

export class GoogleAuthDto {
  @IsString()
  @IsNotEmpty()
  @MinLength(100, { message: 'Invalid Google credential' })
  @MaxLength(3000, { message: 'Google credential too long' })
  credential: string; // Google ID token from Sign-In

  @IsString()
  @IsOptional()
  @IsUUID(4, { message: 'deviceId must be a valid UUID v4' })
  @MaxLength(36)
  deviceId?: string; // Optional: link to existing device
}

export interface GoogleUserInfo {
  sub: string; // Google user ID
  email: string;
  email_verified: boolean;
  name: string;
  picture?: string;
  given_name?: string;
  family_name?: string;
}
