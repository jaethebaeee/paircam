import { IsNotEmpty, IsString, IsUUID, MaxLength, MinLength, Matches } from 'class-validator';
import { Transform } from 'class-transformer';

export class SendMessageDto {
  @IsUUID()
  @IsNotEmpty()
  recipientId: string;

  @IsString()
  @IsNotEmpty()
  @MinLength(1)
  @MaxLength(2000)
  @Matches(/\S/, { message: 'Message must contain non-whitespace characters' })
  @Transform(({ value }) => {
    // Sanitize: trim whitespace and remove potentially dangerous HTML
    if (typeof value === 'string') {
      return value
        .trim()
        .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
        .replace(/<[^>]*>/g, ''); // Strip HTML tags
    }
    return value;
  })
  content: string;
}
