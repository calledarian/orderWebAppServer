import { Module } from '@nestjs/common';
import { TelegramController } from './telegram.controller';
import { TelegramService } from './telegram.service';
import { BlockedUsersService } from './services/blocked-users.service';
import { OrderStateService } from './services/order-state.service';
import { CallbackHandlerService } from './services/callback-handler.service';

@Module({
  controllers: [TelegramController],
  providers: [
    TelegramService,
    BlockedUsersService,
    OrderStateService,
    CallbackHandlerService,
  ],
  exports: [TelegramService],
})
export class TelegramModule { }