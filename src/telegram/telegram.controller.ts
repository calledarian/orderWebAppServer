import { Controller, Post, Body } from '@nestjs/common';
import { TelegramService } from './telegram.service';

export class CreateOrderDto {
  menuCategory: string;
  menuItem: string;
  quantity: number;

  name: string;
  phone: string;
  address: string;
  note?: string;

  branchId: number;
  qrImage?: string; // URL or base64 string
}

@Controller('telegram')
export class TelegramController {
  constructor(private readonly telegramService: TelegramService) {}

  // @Post('webhook')
  // async handleWebhook(@Body() order: CreateOrderDto) {
  //   // Forward order to the service
  //   await this.telegramService.sendOrderNotification(order);
  //   return { success: true, message: 'Order received' };
  // }
  @Post('webhook')
  handleWebhook(@Body() update: any) {
    console.log(update.message.chat.id); // <-- this is your group ID
  }
}