
export interface Product {
  id: string;
  name: string;
  description: string;
  price: number;
  category: string;
  image: string;
  savings?: string;
  isAvailable: boolean;
}

export interface Category {
  id: string;
  name: string;
}

export type CategoryType = string;

export interface CartItem extends Product {
  quantity: number;
}

export interface StoreInfo {
  name: string;
  slogan: string;
  hours: string;
  whatsapp: string;
}

export type TableStatus = 'free' | 'occupied';
export type OrderStatus = 'pending' | 'preparing' | 'ready' | 'delivered';
export type OrderType = 'table' | 'takeaway' | 'delivery' | 'counter';

export interface Order {
  id: string;
  customerName: string;
  customerPhone?: string;
  items: CartItem[];
  total: number;
  paymentMethod: string;
  timestamp: Date | string;
  tableId: number;
  isUpdated?: boolean;
  status: OrderStatus;
  orderType: OrderType;
  address?: string;
}

export interface Table {
  id: number;
  status: TableStatus;
  currentOrder: Order | null;
}
