import { IsString, IsNotEmpty } from 'class-validator';

export class UnblockUserDto {
  @IsString()
  @IsNotEmpty()
  blockedUserId: string;
}
