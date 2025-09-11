import { Controller, Post, Body } from '@nestjs/common';
import { AuthService } from './auth.service';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('telegram')
  async telegramLogin(@Body() body: any) {
    const user = this.authService.validateTelegramLogin(body);
    if (!user) return { success: false, message: 'Invalid Telegram login' };

    // TODO: create JWT or session here
    return { success: true, user };
  }
}
