// src/telegram/services/callback-handler.service.ts
import { Injectable } from '@nestjs/common';
import { Bot, InlineKeyboard } from 'grammy';
import { OrderStatus } from '../enums/order-status.enum';
import { OrderStateService, OrderStatusInternal } from './order-state.service';
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

    private async safeAnswerCallback(ctx: any, text?: string, showAlert = false) {
        if (!ctx.callbackQuery) return;
        try {
            await ctx.answerCallbackQuery({ text, show_alert: showAlert });
        } catch {
            console.warn('Callback query expired, skipping answer.');
        }
    }

    private async handleConfirm(ctx: any, workersChatId: number) {
        const orderId = ctx.callbackQuery.data!.split(':')[1];
        await this.safeAnswerCallback(ctx);

        const orders = this.orderStateService.activateOrder(orderId);
        if (!orders) {
            await this.safeAnswerCallback(ctx, 'This order has already been processed.', true);
            return;
        }

        // Remove inline keyboard immediately to prevent double clicks
        await ctx.editMessageReplyMarkup({ reply_markup: undefined });

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
        const orderId = ctx.callbackQuery.data!.split(':')[1];
        await this.safeAnswerCallback(ctx);

        const orders = this.orderStateService.declineOrder(orderId);
        if (!orders) {
            await this.safeAnswerCallback(ctx, 'This order has already been processed.', true);
            return;
        }

        // Remove inline keyboard
        await ctx.editMessageReplyMarkup({ reply_markup: undefined });

        const first = orders[0];
        this.blockedUsersService.handleDecline(first.telegramId);
        this.orderStateService.completeOrder(orderId);
    }

    private async handlePrepare(ctx: any, mainChatId: number) {
        const orderId = ctx.callbackQuery.data!.split(':')[1];
        const order = this.orderStateService.getOrder(orderId);
        if (!order || order.status !== OrderStatusInternal.Active) {
            return this.safeAnswerCallback(ctx, 'Order not found or not active', true);
        }

        await this.safeAnswerCallback(ctx, "Marked as preparing");
        const workerName = ctx.from?.first_name || "Worker";
        await ctx.api.sendMessage(mainChatId, `👨‍🍳 Order ${orderId} is being prepared by ${workerName}`);

        // Replace buttons with next stage
        await ctx.editMessageReplyMarkup({
            reply_markup: new InlineKeyboard().text("🛵 I'm delivering", `${OrderStatus.Deliver}:${orderId}`)
        });
    }

    private async handleDeliver(ctx: any, mainChatId: number) {
        const orderId = ctx.callbackQuery.data!.split(':')[1];
        const order = this.orderStateService.getOrder(orderId);
        if (!order || order.status !== OrderStatusInternal.Active) {
            return this.safeAnswerCallback(ctx, 'Order not found or not active', true);
        }

        await this.safeAnswerCallback(ctx, "Marked as delivering");
        const workerName = ctx.from?.first_name || "Worker";
        await ctx.api.sendMessage(mainChatId, `🛵 Order ${orderId} is now out for delivery by ${workerName}`);

        await ctx.editMessageReplyMarkup({
            reply_markup: new InlineKeyboard().text("✅ Complete", `${OrderStatus.Complete}:${orderId}`)
        });
    }

    private async handleComplete(ctx: any, mainChatId: number) {
        const orderId = ctx.callbackQuery.data!.split(':')[1];
        const order = this.orderStateService.getOrder(orderId);
        if (!order || order.status !== OrderStatusInternal.Active) {
            return this.safeAnswerCallback(ctx, 'Order not found or not active', true);
        }

        await this.safeAnswerCallback(ctx, "Order completed");
        const workerName = ctx.from?.first_name || "Worker";
        await ctx.api.sendMessage(mainChatId, `✅ Order ${orderId} has been completed by ${workerName}`);

        // Remove buttons
        await ctx.editMessageReplyMarkup({ reply_markup: undefined });
        this.orderStateService.completeOrder(orderId);
    }

    private formatOrderItems(orders: OrderDto[]): string {
        return orders
            .map(item => `• ${item.menuItem} x${item.quantity} = ${item.price * item.quantity}$`)
            .join('\n');
    }
}
