import { Injectable } from '@nestjs/common';
import { Bot, InlineKeyboard, Context } from 'grammy';

@Injectable()
export class TelegramService {
  private bot: Bot;
  private chatId: number;
  private workersChatId: number;

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

    // Register callback query handlers
    this.registerCallbackHandlers();

    // Start the bot
    this.bot.start({
      onStart: (info) => console.log('Telegram bot started as', info.username),
    });
  }

  // Send a message to the main group
  async sendMessage(message: string) {
    await this.bot.api.sendMessage(this.chatId, message, { parse_mode: 'HTML' });
  }

  // Send a message to the workers group
  async sendMessageToWorkers(message: string) {
    await this.bot.api.sendMessage(this.workersChatId, message, { parse_mode: 'HTML' });
  }

  // Send photo with optional keyboard
  async sendPhoto(photoUrl: string, caption: string, keyboard?: InlineKeyboard) {
    await this.bot.api.sendPhoto(this.chatId, photoUrl, {
      caption,
      parse_mode: 'HTML',
      reply_markup: keyboard,
    });
  }

  // Register callback query handlers
  private registerCallbackHandlers() {
    // Confirm handler
    this.bot.callbackQuery(/^confirm_.+$/, async (ctx) => {
      const data = ctx.callbackQuery.data; // e.g., "confirm:1:Coffee"
      await ctx.answerCallbackQuery({ text: 'Order confirmed!' });

      // Extract order info from callback data if needed
      // Example: "confirm:1:Coffee"
      const parts = data.split(':');
      const orderId = parts[1];
      const item = parts[2];

      // Send order info to workers group
      await this.sendMessageToWorkers(`New order confirmed!\nOrder #${orderId}: ${item}`);
    });

    // Decline handler
    this.bot.callbackQuery(/^decline_.+$/, async (ctx) => {
      const data = ctx.callbackQuery.data; // e.g., "decline:1:Coffee"
      await ctx.answerCallbackQuery({ text: 'Order declined!' });

      // Optionally notify main group
      const parts = data.split(':');
      const orderId = parts[1];
      const item = parts[2];

      await this.sendMessage(`Order #${orderId} (${item}) was declined.`);
    });
  }
}
