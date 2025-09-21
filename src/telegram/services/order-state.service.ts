import { Injectable } from "@nestjs/common";
import { OrderDto } from "../interfaces/order.interface";

// src/telegram/services/order-state.service.ts
export enum OrderStatusInternal {
    Pending = 'pending',
    Active = 'active',
    Declined = 'declined',
    Completed = 'completed',
}

@Injectable()
export class OrderStateService {
    private orders: Record<string, { data: OrderDto[]; status: OrderStatusInternal }> = {};

    storePendingOrder(orderId: string, orders: OrderDto[]) {
        this.orders[orderId] = { data: orders, status: OrderStatusInternal.Pending };
    }

    getOrder(orderId: string) {
        return this.orders[orderId];
    }

    activateOrder(orderId: string) {
        const order = this.orders[orderId];
        if (order && order.status === OrderStatusInternal.Pending) {
            order.status = OrderStatusInternal.Active;
            return order.data;
        }
        return undefined;
    }

    declineOrder(orderId: string) {
        const order = this.orders[orderId];
        if (order && order.status === OrderStatusInternal.Pending) {
            order.status = OrderStatusInternal.Declined;
            return order.data;
        }
        return undefined;
    }

    completeOrder(orderId: string) {
        const order = this.orders[orderId];
        if (order) {
            order.status = OrderStatusInternal.Completed;
        }
    }
}
