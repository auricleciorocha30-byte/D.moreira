
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
  discount?: number;
  finalTotal: number;
  paymentMethod: string;
  timestamp: Date | string;
  tableId: number;
  status: OrderStatus;
  orderType: OrderType;
  address?: string;
  couponCode?: string;
  // Fix: Added isUpdated to allow flagging modified orders as used in handlePlaceOrder in App.tsx
  isUpdated?: boolean;
}

export interface Table {
  id: number;
  status: TableStatus;
  currentOrder: Order | null;
}

// Novos Tipos para Marketing
export interface Coupon {
  id: string;
  code: string;
  percentage: number;
  isActive: boolean;
  scopeType: 'all' | 'category' | 'product';
  scopeValue: string; // ID do produto ou nome da categoria
}

export interface LoyaltyConfig {
  isActive: boolean;
  spendingGoal: number;
  scopeType: 'all' | 'category' | 'product';
  scopeValue: string;
}

export interface LoyaltyUser {
  phone: string;
  name: string;
  accumulated: number;
}
