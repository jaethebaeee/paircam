import { Controller, Post, Body, Headers, Req, UseGuards, RawBodyRequest } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Public } from '../auth/public.decorator';
import { PaymentsService } from './payments.service';
import { CreateCheckoutDto } from './dto/create-checkout.dto';

@Controller('payments')
export class PaymentsController {
  constructor(private readonly paymentsService: PaymentsService) {}

  @UseGuards(JwtAuthGuard)
  @Post('create-checkout')
  async createCheckout(
    @Req() req: { user: { deviceId: string } },
    @Body() createCheckoutDto: CreateCheckoutDto,
  ) {
    return this.paymentsService.createCheckoutSession(
      req.user.deviceId,
      createCheckoutDto.plan,
    );
  }

  @Public()
  @Post('webhook')
  async webhook(
    @Headers('stripe-signature') signature: string,
    @Req() req: RawBodyRequest<Request>,
  ) {
    const payload = req.rawBody as Buffer;
    return this.paymentsService.handleWebhook(signature, payload);
  }

  @UseGuards(JwtAuthGuard)
  @Post('cancel-subscription')
  async cancelSubscription(@Req() req: { user: { deviceId: string } }) {
    return this.paymentsService.cancelSubscription(req.user.deviceId);
  }
}

