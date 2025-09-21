import { Injectable } from '@nestjs/common';
import { Bot, InlineKeyboard } from 'grammy';
import { CallbackHandlerService } from './services/callback-handler.service';
import { BlockedUsersService } from './services/blocked-users.service';
import { OrderStateService } from './services/order-state.service';
import { OrderDto } from './interfaces/order.interface';

@Injectable()
export class TelegramService {
  private bot: Bot;
  private readonly chatId: number;
  private readonly workersChatId: number;

  constructor(
    private readonly callbackHandlerService: CallbackHandlerService,
    private readonly blockedUsersService: BlockedUsersService,
    private readonly orderStateService: OrderStateService,
  ) {
    const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;

    const GROUP_CHAT_ID = process.env.GROUP_CHAT_ID;
    const WORKERS_GROUP_CHAT_ID = process.env.WORKERS_GROUP_CHAT_ID;

    const FRONTEND_URL = process.env.FRONTEND_URL;

    const WELCOME_MESSAGE = process.env.WELCOME_MESSAGE || "Welcome! Use the button below to place an order.";
    const WELCOME_BUTTON = process.env.WELCOME_BUTTON || "Place Order Now!";

    if (!BOT_TOKEN) throw new Error('BOT_TOKEN missing!');
    if (!GROUP_CHAT_ID) throw new Error('GROUP_CHAT_ID missing!');
    if (!WORKERS_GROUP_CHAT_ID) throw new Error('WORKERS_GROUP_CHAT_ID missing!');
    if (!FRONTEND_URL) throw new Error("FRONTEND_URL is not defined");

    this.bot = new Bot(BOT_TOKEN);
    this.chatId = Number(GROUP_CHAT_ID);
    this.workersChatId = Number(WORKERS_GROUP_CHAT_ID);

    this.callbackHandlerService.registerHandlers(this.bot, this.chatId, this.workersChatId);

    this.bot.command("start", async (ctx) => {
      await ctx.reply(WELCOME_MESSAGE, {
        reply_markup: {
          inline_keyboard: [
            [
              {
                text: WELCOME_BUTTON,
                web_app: { url: FRONTEND_URL },
              },
            ],
          ],
        },
      });
    });

    this.bot.catch((err) => {
      console.error('Bot error caught:', err.error);
    });

    this.bot.start({ onStart: (info) => console.log('Telegram bot started as', info.username) });
  }

  isBlocked(userId: number): boolean {
    return this.blockedUsersService.isBlocked(userId);
  }

  storePendingOrder(orderId: string, orders: OrderDto[]) {
    this.orderStateService.storePendingOrder(orderId, orders);
  }

  async sendMessage(message: string, keyboard?: InlineKeyboard) {
    await this.bot.api.sendMessage(this.chatId, message, { parse_mode: 'HTML', reply_markup: keyboard });
  }

  async sendPhoto(photoUrl: string, caption: string, keyboard?: InlineKeyboard) {
    await this.bot.api.sendPhoto(this.chatId, photoUrl, { caption, parse_mode: 'HTML', reply_markup: keyboard });
  }
}