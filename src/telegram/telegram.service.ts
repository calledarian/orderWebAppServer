// src/telegram/telegram.service.ts
import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { Bot, Context, GrammyError, HttpError } from 'grammy';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class TelegramService implements OnModuleInit, OnModuleDestroy {
  private bot: Bot;

  constructor(private configService: ConfigService) {}

  async onModuleInit() {
    const botToken = this.configService.get<string>('TELEGRAM_BOT_TOKEN');
    if (!botToken) {
      throw new Error('TELEGRAM_BOT_TOKEN is not defined');
    }
    this.bot = new Bot(botToken);
    this.registerHandlers();
    
    // Use webhooks for production, or long polling for development
    // For development (long polling):
    await this.bot.start(); 
    
    // For production (webhook setup in a controller):
    // const webhookUrl = this.configService.get<string>('TELEGRAM_WEBHOOK_URL');
    // await this.bot.api.setWebhook(webhookUrl);
  }

  async onModuleDestroy() {
      // Gracefully stop the bot if using long polling
      if (this.bot) {
          await this.bot.stop();
      }
  }

  private registerHandlers() {
    this.bot.command('start', (ctx) => this.handleStart(ctx));
    this.bot.on('message', (ctx) => this.handleMessage(ctx));
    this.bot.catch((err) => this.handleError(err));
  }

  private async handleStart(ctx: Context) {
    await ctx.reply('Welcome to the NestJS bot! How can I help you?');
  }

  private async handleMessage(ctx: Context) {
    // Safely check if the message exists before accessing its properties
    if (ctx.message?.text) {
      await ctx.reply(`I received your message: ${ctx.message.text}`);
    }
  }

  private handleError(err: { error: unknown; ctx: Context }) {
    console.error(`Error while handling update ${err.ctx.update.update_id}:`);
    const e = err.error;
    if (e instanceof GrammyError) {
      console.error('Error in request:', e.description);
    } else if (e instanceof HttpError) {
      console.error('Could not contact Telegram:', e);
    } else {
      console.error('Unknown error:', e);
    }
  }
}