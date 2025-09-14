// src/telegram/services/order-state.service.ts
import { Injectable } from '@nestjs/common';
import { OrderDto } from '../interfaces/order.interface';

@Injectable()
export class OrderStateService {
    private pendingOrders: Record<string, OrderDto[]> = {};
    private activeOrders: Record<string, OrderDto[]> = {};

    storePendingOrder(orderId: string, orders: OrderDto[]) {
        this.pendingOrders[orderId] = orders;
    }

    getPendingOrder(orderId: string): OrderDto[] | undefined {
        return this.pendingOrders[orderId];
    }

    activateOrder(orderId: string): OrderDto[] | undefined {
        const orders = this.pendingOrders[orderId];
        if (orders) {
            this.activeOrders[orderId] = orders;
            delete this.pendingOrders[orderId];
            return orders;
        }
        return undefined;
    }

    getActiveOrder(orderId: string): OrderDto[] | undefined {
        return this.activeOrders[orderId];
    }

    completeOrder(orderId: string) {
        delete this.activeOrders[orderId];
    }
}