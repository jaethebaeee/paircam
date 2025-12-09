import { IsString, IsOptional, IsIn, IsArray, IsNumber, IsObject, MaxLength, MinLength, Matches } from 'class-validator';
import { Transform } from 'class-transformer';

/**
 * Sanitize string to prevent XSS attacks
 * Removes HTML tags and script content
 */
function sanitizeString(value: string): string {
  if (typeof value !== 'string') return value;
  return value
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/<[^>]*>/g, '')
    .replace(/javascript:/gi, '')
    .replace(/on\w+\s*=/gi, '')
    .trim();
}

export class JoinQueueDto {
  @IsOptional()
  @IsString()
  @MaxLength(50)
  region?: string;

  @IsOptional()
  @IsString()
  @MaxLength(10)
  language?: string;

  @IsOptional()
  @IsString()
  @IsIn(['male', 'female', 'other', 'prefer_not_to_say'])
  gender?: string;

  @IsOptional()
  @IsString()
  @IsIn(['any', 'male', 'female'])
  genderPreference?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  @MaxLength(30, { each: true })
  interests?: string[];

  @IsOptional()
  @IsString()
  @IsIn(['casual', 'serious', 'language', 'gaming'])
  queueType?: 'casual' | 'serious' | 'language' | 'gaming';

  @IsOptional()
  @IsString()
  @MaxLength(10)
  nativeLanguage?: string;

  @IsOptional()
  @IsString()
  @MaxLength(10)
  learningLanguage?: string;

  @IsOptional()
  @IsObject()
  preferences?: Record<string, unknown>;
}

export class WebRTCSignalDto {
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  sessionId: string;

  @IsString()
  @IsIn(['offer', 'answer', 'candidate'])
  type: 'offer' | 'answer' | 'candidate';

  @IsObject()
  data: unknown;
}

export class ChatMessageDto {
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  sessionId: string;

  @IsString()
  @MinLength(1)
  @MaxLength(2000)
  @Transform(({ value }) => sanitizeString(value))
  message: string;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  @Transform(({ value }) => sanitizeString(value))
  sender?: string;

  @IsNumber()
  timestamp: number;
}

export class ReactionDto {
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  sessionId: string;

  @IsString()
  @MaxLength(10)
  @Matches(/^[\u{1F300}-\u{1F9FF}]|[\u{2600}-\u{26FF}]|[\u{2700}-\u{27BF}]|[\u{1F600}-\u{1F64F}]$/u, {
    message: 'emoji must be a valid emoji character',
  })
  emoji: string;

  @IsNumber()
  timestamp: number;
}

export class EndCallDto {
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  sessionId: string;

  @IsOptional()
  wasSkipped?: boolean;
}

export class ConnectionStatusDto {
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  sessionId: string;

  @IsString()
  @IsIn(['connected', 'failed'])
  status: 'connected' | 'failed';

  @IsOptional()
  @IsNumber()
  connectionTime?: number;
}
