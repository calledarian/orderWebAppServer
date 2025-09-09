import { Injectable } from '@nestjs/common';
import { Bot, InlineKeyboard } from 'grammy';
import { OrderDto } from './telegram.controller';

@Injectable()
export class TelegramService {
  private bot: Bot;
  private chatId: number;
  private workersChatId: number;
  private pendingOrders: Record<string, OrderDto[]> = {};

  constructor() {
    const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
    const GROUP_CHAT_ID = process.env.GROUP_CHAT_ID;
    const WORKERS_GROUP_CHAT_ID = process.env.WORKERS_GROUP_CHAT_ID;

    if (!BOT_TOKEN) throw new Error('BOT_TOKEN missing!');
    if (!GROUP_CHAT_ID) throw new Error('GROUP_CHAT_ID missing!');
    if (!WORKERS_GROUP_CHAT_ID) throw new Error('WORKERS_GROUP_CHAT_ID missing!');

    this.bot = new Bot(BOT_TOKEN);
    this.chatId = Number(GROUP_CHAT_ID);
    this.workersChatId = Number(WORKERS_GROUP_CHAT_ID);

    this.registerCallbackHandlers();

    this.bot.start({ onStart: (info) => console.log('Telegram bot started as', info.username) });
  }

  async sendMessage(message: string) {
    await this.bot.api.sendMessage(this.chatId, message, { parse_mode: 'HTML' });
  }

  async sendMessageToWorkers(message: string) {
    await this.bot.api.sendMessage(this.workersChatId, message, { parse_mode: 'HTML' });
  }

  async sendPhoto(photoUrl: string, caption: string, keyboard?: InlineKeyboard) {
    await this.bot.api.sendPhoto(this.chatId, photoUrl, { caption, parse_mode: 'HTML', reply_markup: keyboard });
  }

  private registerCallbackHandlers() {
    this.bot.callbackQuery(/^confirm:.+$/, async (ctx) => {
      const orderId = ctx.callbackQuery.data!.split(':')[1];
      const orders = this.pendingOrders[orderId];
      if (!orders) return ctx.answerCallbackQuery({ text: 'Order not found', show_alert: true });

      // Notify user who clicked the button
      await ctx.answerCallbackQuery({ text: 'Order confirmed!' });

      const first = orders[0];
      const itemsText = orders
        .map(item => `• ${item.menuItem} x${item.quantity} = ${item.price * item.quantity}$`)
        .join('\n');

      // Send a detailed message to the workers
      const workerMessage = `✅ <b>New order confirmed!</b>
━━━━━━━━━━━━━━━
🏬 <b>Branch:</b> ${first.branchId}
🏠 <b>Delivery Address:</b> ${first.address}
👤 <b>Customer:</b> ${first.name}
📞 <b>Contact Phone:</b> ${first.phone}

🍽️ <b>Items to prepare:</b>
${itemsText}

📝 <b>Customer Note:</b> ${first.note || 'None'}
━━━━━━━━━━━━━━━`;

      await this.sendMessageToWorkers(workerMessage);

      // Remove from pending orders
      delete this.pendingOrders[orderId];
    });

    this.bot.callbackQuery(/^decline:.+$/, async (ctx) => {
      // Just notify the person who clicked the button
      await ctx.answerCallbackQuery({ text: 'Order declined!' });

      // Remove from pending orders so buttons are disabled
      const orderId = ctx.callbackQuery.data!.split(':')[1];
      delete this.pendingOrders[orderId];
    });

  }

  // Helper to store pending orders
  storePendingOrder(orderId: string, orders: OrderDto[]) {
    this.pendingOrders[orderId] = orders;
  }
}
