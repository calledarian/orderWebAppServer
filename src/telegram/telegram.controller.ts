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

    for (const order of orders) {
      const key = `${order.name}|${order.phone}|${order.address}|${order.branchName}|${order.note || ''}`;
      if (!groupedOrders[key]) groupedOrders[key] = [];
      groupedOrders[key].push(order);
      if (this.telegramService.isBlocked(order.telegramId)) {
        return { success: false, message: `User ID: ${order.telegramId} is blocked from placing orders.` };
      }
    }

    for (const groupKey in groupedOrders) {
      const group = groupedOrders[groupKey];
      const first = group[0];
      const orderId = uuidv4().slice(0, 4).toUpperCase();
      this.telegramService.storePendingOrder(orderId, group);

      const totalAmount = group.reduce((sum, item) => sum + item.price * item.quantity, 0);
      const itemsText = group
        .map(item => `• <b>${item.menuItem}</b> x${item.quantity} = <b>${item.price * item.quantity}$</b>`)
        .join('\n');

      const textMessage = `📦 <b>New Order Received CODE:${orderId}</b>
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
        const caption = `
</b>Order CODE:${orderId}</b>
<b>Total Amount: ${totalAmount}$</b>`;
        const keyboard = new InlineKeyboard()
          .text('✅ Confirm', `confirm:${orderId}`)
          .text('❌ Decline', `decline:${orderId}`);

        try {
          await this.telegramService.sendPhoto(first.qrImage, caption, keyboard);
        } catch (err) {
          console.error('Failed to send photo:', err);
        }
      }
    }

    return { success: true, message: `${Object.keys(groupedOrders).length} order(s) sent to Telegram group` };
  }
}
