// auth.service.ts
import { Injectable } from '@nestjs/common';
import * as crypto from 'crypto';

@Injectable()
export class AuthService {
  private botToken: string;

  constructor() {
    if (!process.env.TELEGRAM_BOT_TOKEN) {
      throw new Error('TELEGRAM_BOT_TOKEN is not defined in env');
    }
    this.botToken = process.env.TELEGRAM_BOT_TOKEN;
  }

  validateTelegramLogin(data: any) {
    const { hash, ...userData } = data;

    const dataCheckString = Object.keys(userData)
      .sort()
      .map((key) => `${key}=${userData[key]}`)
      .join('\n');

    // Now botToken is guaranteed to be a string
    const secretKey = crypto.createHash('sha256').update(this.botToken).digest();
    const hmac = crypto.createHmac('sha256', secretKey)
      .update(dataCheckString)
      .digest('hex');

    if (hmac !== hash) return null; // invalid login
    return userData; // valid login
  }
}
