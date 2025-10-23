import { Controller, Post, UseGuards, Req } from '@nestjs/common';
import { TurnService, TurnCredentials } from './turn.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('turn')
export class TurnController {
  constructor(private readonly turnService: TurnService) {}

  @UseGuards(JwtAuthGuard)
  @Post('credentials')
  async getCredentials(@Req() req: { user: { deviceId: string } }): Promise<TurnCredentials> {
    const deviceId = req.user.deviceId;
    return this.turnService.generateCredentials(deviceId);
  }
}
