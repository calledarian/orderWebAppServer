import { Injectable } from '@nestjs/common';
import { Bot } from 'grammy';

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

  // Send photo
  async sendPhoto(photoUrl: string, caption?: string) {
    await this.bot.api.sendPhoto(this.chatId, photoUrl, { caption, parse_mode: 'HTML' });
  }

async handleCallbackQuery(callbackQuery: any) {
  const data = callbackQuery.data; // e.g., "confirm:1:Coffee"
  
  if (data.startsWith('confirm')) {
    // TODO: Do your "send to another group" action here
  } else if (data.startsWith('decline')) {
    // nothing
  }
}

}
