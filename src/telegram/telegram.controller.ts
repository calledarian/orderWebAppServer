import { Controller, Post, Body } from '@nestjs/common';
import { TelegramService } from './telegram.service';
import { InlineKeyboard } from 'grammy';
import { v4 as uuidv4 } from 'uuid';

export interface OrderDto {
  menuCategory: string;
  menuItem: string;
  quantity: number;
  total: number;
  price: number;

  name: string;
  phone: string;
  address: string;
  note?: string;

  branchId: number;
  qrImage?: string; // URL or base64

  telegramId: number;
}

@Controller('order')
export class TelegramController {
  constructor(private readonly telegramService: TelegramService) { }

  @Post()
  async receiveOrders(@Body() body: any) {
    const orders: OrderDto[] = Array.isArray(body) ? body : [body];

    // Group orders by customer + branch + address + note
    const groupedOrders: Record<string, OrderDto[]> = {};

    for (const order of orders) {
      const key = `${order.name}|${order.phone}|${order.address}|${order.branchId}|${order.note || ''}`;
      if (!groupedOrders[key]) groupedOrders[key] = [];
      groupedOrders[key].push(order);
      if (this.telegramService.isBlocked(order.telegramId)) {
        return { success: false, message: `User ${order.telegramId} is blocked from placing orders.` };
      }
    }

    // Process each group
    for (const groupKey in groupedOrders) {
      const group = groupedOrders[groupKey];
      const first = group[0];

      const orderId = uuidv4(); // Unique short ID for callback_data
      this.telegramService.storePendingOrder(orderId, group);

      const totalAmount = group.reduce((sum, item) => sum + item.price * item.quantity, 0);

      const itemsText = group
        .map(item => `• <b>${item.menuItem}</b> x${item.quantity} = <b>${item.price * item.quantity}$</b>`)
        .join('\n');

      const textMessage = `📦 <b>New Order Received</b>
━━━━━━━━━━━━━━━
💰 <b>Total:</b> <b>${totalAmount}$</b>

👤 <b>Name:</b> <b>${first.name}</b>
📞 <b>Phone:</b> <b>${first.phone}</b>
🏠 <b>Address:</b> <b>${first.address}</b>
🏬 <b>Branch ID:</b> <b>${first.branchId}</b>
📝 <b>Note:</b> <b>${first.note || 'None'}</b>

🍽️ <b>Items:</b>
${itemsText}
━━━━━━━━━━━━━━━`;

      // Send order info to main group
      await this.telegramService.sendMessage(textMessage);

      // Send QR image with inline buttons if available
      if (first.qrImage) {
        const caption = `<b>Proof of payment of ${first.name}</b>`;
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
