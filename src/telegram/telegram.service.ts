import { Injectable } from '@nestjs/common';
import { Bot, InlineKeyboard } from 'grammy';
import { OrderDto } from './telegram.controller';
import * as fs from 'fs';
import * as path from 'path';
@Injectable()
export class TelegramService {
  private bot: Bot;
  private chatId: number;
  private workersChatId: number;
  private pendingOrders: Record<string, OrderDto[]> = {};

  private blockedUsers: Record<number, boolean> = {};
  private declineCount: Record<number, number> = {};

  private storagePath = path.join(__dirname, '..', 'data', 'blockedUsers.json');

  constructor() {
    const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
    const GROUP_CHAT_ID = process.env.GROUP_CHAT_ID;
    const WORKERS_GROUP_CHAT_ID = process.env.WORKERS_GROUP_CHAT_ID;

    if (!BOT_TOKEN) throw new Error('BOT_TOKEN missing!');
    if (!GROUP_CHAT_ID) throw new Error('GROUP_CHAT_ID missing!');
    if (!WORKERS_GROUP_CHAT_ID) throw new Error('WORKERS_GROUP_CHAT_ID missing!');

    // Load existing blocked users / counts from JSON
    this.loadBlockedUsers();

    this.bot = new Bot(BOT_TOKEN);
    this.chatId = Number(GROUP_CHAT_ID);
    this.workersChatId = Number(WORKERS_GROUP_CHAT_ID);

    this.registerCallbackHandlers();
    this.bot.command("start", async (ctx) => {
      await ctx.reply("Welcome! Click below to place your order:", {
        reply_markup: {
          inline_keyboard: [
            [
              {
                text: "Open Web App",
                web_app: { url: "https://c9a50a6c9600.ngrok-free.app/" },
              },
            ],
          ],
        },
      });
    });

    this.bot.start({ onStart: (info) => console.log('Telegram bot started as', info.username) });
  }

  private loadBlockedUsers() {
    try {
      if (fs.existsSync(this.storagePath)) {
        const data = fs.readFileSync(this.storagePath, 'utf-8');
        const json = JSON.parse(data);
        this.blockedUsers = json.blockedUsers || {};
        this.declineCount = json.declineCount || {};
      }
    } catch (err) {
      console.error('Failed to load blocked users JSON:', err);
      this.blockedUsers = {};
      this.declineCount = {};
    }
  }

  private saveBlockedUsers() {
    try {
      const data = {
        blockedUsers: this.blockedUsers,
        declineCount: this.declineCount,
      };
      fs.writeFileSync(this.storagePath, JSON.stringify(data, null, 2), 'utf-8');
    } catch (err) {
      console.error('Failed to save blocked users JSON:', err);
    }
  }

  isBlocked(userId: number) {
    return !!this.blockedUsers[userId];
  }

  handleDecline(userId: number) {
    this.declineCount[userId] = (this.declineCount[userId] || 0) + 1;

    if (this.declineCount[userId] >= 3) {
      this.blockedUsers[userId] = true;
    }

    // Save changes to JSON
    this.saveBlockedUsers();
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
      await ctx.answerCallbackQuery({ text: 'Order declined!' });
      const orderId = ctx.callbackQuery.data!.split(':')[1];
      const orders = this.pendingOrders[orderId];
      if (!orders) return;
      // Track declines per Telegram user
      const first = orders[0];
      this.handleDecline(first.telegramId);

      delete this.pendingOrders[orderId];
    });

  }

  // Helper to store pending orders
  storePendingOrder(orderId: string, orders: OrderDto[]) {
    this.pendingOrders[orderId] = orders;
  }
}
