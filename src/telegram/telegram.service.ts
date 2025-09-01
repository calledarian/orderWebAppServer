import { Injectable } from '@nestjs/common';
import { Bot } from 'grammy';
import { CreateOrderDto } from './telegram.controller';

const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const TELEGRAM_CHAT_ID = process.env.TELEGRAM_CHAT_ID;

@Injectable()
export class TelegramService {
  private bot: Bot;

  constructor() {
    this.bot = new Bot(TELEGRAM_BOT_TOKEN || "sikim");
    // You don't need to start polling if using webhook
  }
  

  async sendOrderNotification(order: CreateOrderDto) {
    const {
      menuCategory,
      menuItem,
      quantity,
      name,
      phone,
      address,
      note,
      branchId,
      qrImage,
    } = order;

    const message = `
📦 *New Order Received*

*Menu Category:* ${menuCategory}
*Menu Item:* ${menuItem}
*Quantity:* ${quantity}

*Customer Info:*
Name: ${name}
Phone: ${phone}
Address: ${address}
Note: ${note || '-'}

*Branch ID:* ${branchId}
${qrImage ? 'QR Uploaded ✅' : 'No QR'}
`;

    // Send message to your Telegram chat
    await this.bot.api.sendMessage(TELEGRAM_BOT_TOKEN || "sikim", message, {
      parse_mode: 'Markdown',
    });

    // Optionally send the QR image
    if (qrImage) {
      await this.bot.api.sendPhoto(TELEGRAM_CHAT_ID || "sikim", qrImage);
    }
  }
}
