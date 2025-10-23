import { IsString, IsNotEmpty, IsOptional, IsIn } from 'class-validator';

export class SubmitReportDto {
  @IsString()
  @IsNotEmpty()
  reportedPeerId: string;

  @IsString()
  @IsNotEmpty()
  sessionId: string;

  @IsString()
  @IsNotEmpty()
  @IsIn(['harassment', 'inappropriate_content', 'spam', 'nudity', 'violence', 'other'])
  reason: string;

  @IsString()
  @IsOptional()
  comment?: string;
}
