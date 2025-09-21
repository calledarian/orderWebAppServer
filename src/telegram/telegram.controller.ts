import { Controller, Post, Body } from '@nestjs/common';
import { TelegramService } from './telegram.service';
import { InlineKeyboard } from 'grammy';
import { v4 as uuidv4 } from 'uuid';
import { OrderDto } from './interfaces/order.interface';

@Controller('order')
export class TelegramController {
  constructor(private readonly telegramService: TelegramService) { }

  @Post()
async receiveOrders(@Body() body: any) {
  const orders: OrderDto[] = Array.isArray(body) ? body : [body];
  const groupedOrders: Record<string, OrderDto[]> = {};
  const blockedOrders: string[] = [];
  const failedOrders: string[] = [];

  // group orders and check for blocked users
  for (const order of orders) {
    const key = `${order.name}|${order.phone}|${order.address}|${order.branchName}|${order.note || ''}`;
    groupedOrders[key] ??= [];
    groupedOrders[key].push(order);

    if (this.telegramService.isBlocked(order.telegramId)) {
      console.warn(`🚫 Blocked user tried to order: ${order.telegramId}`);
      blockedOrders.push(order.telegramId);
    }
  }

  // process groups one by one (20/day is fine)
  for (const [groupKey, group] of Object.entries(groupedOrders)) {
    const first = group[0];
    const orderId = uuidv4();
    const totalAmount = group.reduce((sum, item) => sum + item.price * item.quantity, 0);

    try {
      this.telegramService.storePendingOrder(orderId, group);

      const itemsText = group
        .map(item => `• <b>${item.menuItem}</b> x${item.quantity} = <b>${item.price * item.quantity}$</b>`)
        .join('\n');

      const textMessage = `📦 <b>New Order Received</b>
━━━━━━━━━━━━━━━
💰 <b>Total:</b> <b>${totalAmount}$</b>

👤 <b>Name:</b> <b>${first.name}</b>
📞 <b>Phone:</b> <b>${first.phone}</b>
🏠 <b>Address:</b> <b>${first.address}</b>
🏬 <b>Branch:</b> <b>${first.branchName}</b>
📝 <b>Note:</b> <b>${first.note || 'None'}</b>

🍽️ <b>Items:</b>
${itemsText}
━━━━━━━━━━━━━━━`;

      await this.telegramService.sendMessage(textMessage);

      if (first.qrImage) {
        const caption = `<b>Proof of payment of ${first.name}</b>`;
        const keyboard = new InlineKeyboard()
          .text('✅ Confirm', `confirm:${orderId}`)
          .text('❌ Decline', `decline:${orderId}`);
        await this.telegramService.sendPhoto(first.qrImage, caption, keyboard);
      }
    } catch (err) {
      console.error(`❌ Failed to process order ${orderId}:`, err);
      failedOrders.push(orderId);
    }
  }

  return {
    success: failedOrders.length === 0,
    sent: Object.keys(groupedOrders).length - failedOrders.length,
    failed: failedOrders,
    blocked: blockedOrders,
  };
}
