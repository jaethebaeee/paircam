import { Module } from '@nestjs/common';
import { TurnService } from './turn.service';
import { TurnController } from './turn.controller';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [AuthModule],
  providers: [TurnService],
  controllers: [TurnController],
  exports: [TurnService],
})
export class TurnModule {}
