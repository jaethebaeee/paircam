import { IsString, IsNotEmpty, IsOptional } from 'class-validator';

export class GoogleAuthDto {
  @IsString()
  @IsNotEmpty()
  credential: string; // Google ID token from Sign-In

  @IsString()
  @IsOptional()
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
