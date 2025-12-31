
export interface Product {
  id: string;
  name: string;
  description: string;
  price: number;
  category: CategoryType;
  image: string;
  savings?: string;
}

export type CategoryType = 'Cafeteria' | 'Bebidas' | 'Lanches' | 'Conveniência' | 'Combos';

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

export interface Order {
  id: string;
  customerName: string;
  items: CartItem[];
  total: number;
  paymentMethod: string;
  timestamp: Date | string;
  tableId: number;
  isUpdated?: boolean;
}

export interface Table {
  id: number;
  status: TableStatus;
  currentOrder: Order | null;
}

export type PrintWidth = '58mm' | '80mm';

export interface PrintConfig {
  width: PrintWidth;
}
