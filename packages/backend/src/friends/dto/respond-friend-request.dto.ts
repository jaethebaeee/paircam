import { IsEnum } from 'class-validator';

export enum FriendRequestResponse {
  ACCEPT = 'accept',
  REJECT = 'reject',
}

export class RespondFriendRequestDto {
  @IsEnum(FriendRequestResponse)
  response: FriendRequestResponse;
}
