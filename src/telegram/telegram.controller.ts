import { Controller, Post, Body, Req } from '@nestjs/common';
import { TelegramService } from './telegram.service';

@Controller('telegram')
export class TelegramController {
  constructor(private readonly telegramService: TelegramService) {}

  @Post('webhook')
  async handleWebhook(@Body() update: any) {
    // Process the update via the service or directly
    // This is where you'd manually handle the incoming update and pass it to the bot instance
    // For a webhook setup, you wouldn't use bot.start()
    return { success: true };
  }
}