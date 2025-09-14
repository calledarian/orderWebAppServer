// src/telegram/services/callback-handler.service.ts
import { Injectable } from '@nestjs/common';
import { Bot, InlineKeyboard } from 'grammy';
import { OrderStatus } from '../enums/order-status.enum';
import { OrderStateService } from './order-state.service';
import { BlockedUsersService } from './blocked-users.service';
import { OrderDto } from '../interfaces/order.interface';

@Injectable()
export class CallbackHandlerService {
    constructor(
        private readonly orderStateService: OrderStateService,
        private readonly blockedUsersService: BlockedUsersService,
    ) { }

    public registerHandlers(bot: Bot, mainChatId: number, workersChatId: number) {
        bot.callbackQuery(new RegExp(`^${OrderStatus.Confirm}:.+`), (ctx) => this.handleConfirm(ctx, workersChatId));
        bot.callbackQuery(new RegExp(`^${OrderStatus.Decline}:.+`), (ctx) => this.handleDecline(ctx));
        bot.callbackQuery(new RegExp(`^${OrderStatus.Prepare}:.+`), (ctx) => this.handlePrepare(ctx, mainChatId));
        bot.callbackQuery(new RegExp(`^${OrderStatus.Deliver}:.+`), (ctx) => this.handleDeliver(ctx, mainChatId));
        bot.callbackQuery(new RegExp(`^${OrderStatus.Complete}:.+`), (ctx) => this.handleComplete(ctx, mainChatId));
    }

    private async handleConfirm(ctx: any, workersChatId: number) {
        const orderId = ctx.callbackQuery.data!.split(':')[1];
        const orders = this.orderStateService.activateOrder(orderId);
        if (!orders) {
            return ctx.answerCallbackQuery({ text: 'Order not found', show_alert: true });
        }

        await ctx.answerCallbackQuery({ text: 'Order confirmed!' });

        const first = orders[0];
        const itemsText = this.formatOrderItems(orders);

        const workerMessage = `✅ <b>New order confirmed!</b>
━━━━━━━━━━━━━━━
🏬 <b>Branch:</b> ${first.branchName}
🏠 <b>Delivery Address:</b> ${first.address}
👤 <b>Customer:</b> ${first.name}
📞 <b>Contact Phone:</b> ${first.phone}

🍽️ <b>Items to prepare:</b>
${itemsText}

📝 <b>Customer Note:</b> ${first.note || 'None'}
━━━━━━━━━━━━━━━`;

        const keyboard = new InlineKeyboard().text("👨‍🍳 I'm preparing", `${OrderStatus.Prepare}:${orderId}`);

        await ctx.api.sendMessage(workersChatId, workerMessage, {
            parse_mode: "HTML",
            reply_markup: keyboard,
        });
    }

    private async handleDecline(ctx: any) {
        await ctx.answerCallbackQuery({ text: 'Order declined!' });
        const orderId = ctx.callbackQuery.data!.split(':')[1];
        const orders = this.orderStateService.getPendingOrder(orderId);
        if (!orders) return;
        const first = orders[0];
        this.blockedUsersService.handleDecline(first.telegramId);
        this.orderStateService.completeOrder(orderId);
    }

    private async handlePrepare(ctx: any, mainChatId: number) {
        const orderId = ctx.callbackQuery.data!.split(':')[1];
        const orders = this.orderStateService.getActiveOrder(orderId);
        if (!orders) return ctx.answerCallbackQuery({ text: 'Order not found', show_alert: true });

        await ctx.answerCallbackQuery({ text: "Marked as preparing" });
        const workerName = ctx.from?.first_name || "Worker";
        await ctx.api.sendMessage(mainChatId, `👨‍🍳 Order ${orderId} is being prepared by ${workerName}`);

        await ctx.editMessageReplyMarkup({
            reply_markup: new InlineKeyboard().text("🛵 I'm delivering", `${OrderStatus.Deliver}:${orderId}`)
        });
    }

    private async handleDeliver(ctx: any, mainChatId: number) {
        const orderId = ctx.callbackQuery.data!.split(':')[1];
        const orders = this.orderStateService.getActiveOrder(orderId);
        if (!orders) return ctx.answerCallbackQuery({ text: 'Order not found', show_alert: true });

        await ctx.answerCallbackQuery({ text: "Marked as delivering" });
        const workerName = ctx.from?.first_name || "Worker";
        await ctx.api.sendMessage(mainChatId, `🛵 Order ${orderId} is now out for delivery by ${workerName}`);

        await ctx.editMessageReplyMarkup({
            reply_markup: new InlineKeyboard().text("✅ Complete", `${OrderStatus.Complete}:${orderId}`)
        });
    }

    private async handleComplete(ctx: any, mainChatId: number) {
        const orderId = ctx.callbackQuery.data!.split(':')[1];
        const orders = this.orderStateService.getActiveOrder(orderId);
        if (!orders) return ctx.answerCallbackQuery({ text: 'Order not found', show_alert: true });

        await ctx.answerCallbackQuery({ text: "Order completed" });
        const workerName = ctx.from?.first_name || "Worker";
        await ctx.api.sendMessage(mainChatId, `✅ Order ${orderId} has been completed by ${workerName}`);

        await ctx.editMessageReplyMarkup();
        this.orderStateService.completeOrder(orderId);
    }

    private formatOrderItems(orders: OrderDto[]): string {
        return orders
            .map(item => `• ${item.menuItem} x${item.quantity} = ${item.price * item.quantity}$`)
            .join('\n');
    }
}