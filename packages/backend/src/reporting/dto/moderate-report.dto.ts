import { IsString, IsNotEmpty, IsIn } from 'class-validator';

export class ModerateReportDto {
  @IsString()
  @IsNotEmpty()
  reportId: string;

  @IsString()
  @IsNotEmpty()
  @IsIn(['accepted', 'rejected'])
  decision: 'accepted' | 'rejected';
}
