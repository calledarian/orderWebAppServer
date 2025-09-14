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

    branchName: string;
    qrImage?: string; // URL or base64

    telegramId: number;
}