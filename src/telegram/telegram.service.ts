import { Injectable } from '@nestjs/common';
import { Bot, InlineKeyboard } from 'grammy';

@Injectable()
export class TelegramService {
  private bot: Bot;
  private chatId: number;


  constructor() {
    const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
    const GROUP_CHAT_ID = process.env.GROUP_CHAT_ID;

    if (!BOT_TOKEN) throw new Error('BOT_TOKEN missing!');
    if (!GROUP_CHAT_ID) throw new Error('GROUP_CHAT_ID missing!');

    this.bot = new Bot(BOT_TOKEN);
    this.chatId = Number(GROUP_CHAT_ID);

    // start the bot in background
    this.bot.start({
      onStart: (info) => console.log('Telegram bot started as', info.username),
    });
  }

  // Send text message
  async sendMessage(message: string) {
    await this.bot.api.sendMessage(this.chatId, message, { parse_mode: 'HTML' });
  }

  async sendPhoto(photoUrl: string, caption: string, keyboard?: InlineKeyboard) {
    await this.bot.api.sendPhoto(
      process.env.GROUP_CHAT_ID!,
      photoUrl,
      {
        caption,
        parse_mode: 'HTML',
        reply_markup: keyboard,
      }
    );
  }


  async handleCallbackQuery(callbackQuery: any) {
    const data = callbackQuery.data; // e.g., "confirm:1:Coffee"

    if (data.startsWith('confirm')) {
      // TODO: Do your "send to another group" action here
    } else if (data.startsWith('decline')) {
      // nothing
    }
    this.bot.callbackQuery(/confirm_.+/, async (ctx) => {
      await ctx.answerCallbackQuery({ text: 'Order confirmed!' });
    });

    this.bot.callbackQuery(/decline_.+/, async (ctx) => {
      await ctx.answerCallbackQuery({ text: 'Order declined!' });
    });
  }

}
