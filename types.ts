
export interface Product {
  id: string;
  name: string;
  description: string;
  price: number;
  category: CategoryType;
  image: string;
  savings?: string; // Ex: "Economize R$ 2,00"
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
