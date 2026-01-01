
import { Product, StoreInfo, Table } from './types';

export const STORE_INFO: StoreInfo = {
  name: 'D.Moreira',
  slogan: 'Parada Obrigatória ⛽',
  hours: 'Aberto de 6h às 22h | Todos os dias',
  whatsapp: '558591076984'
};

// Mesas 1 a 12 (Físicas), 900 (Entregas), 901 (Retiradas/Balcão)
export const INITIAL_TABLES: Table[] = [
  ...Array.from({ length: 12 }, (_, i) => ({
    id: i + 1,
    status: 'free' as const,
    currentOrder: null
  })),
  { id: 900, status: 'free', currentOrder: null }, // Entrega
  { id: 901, status: 'free', currentOrder: null }  // Retirada/Balcão
];

export const MENU_ITEMS: Product[] = [
  {
    id: 'cb1',
    name: 'Combo Café Completo',
    description: '1 Café Expresso + 1 Pão de Queijo + 1 Suco de Laranja.',
    price: 16.90,
    category: 'Combos',
    image: 'https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?w=400&h=300&fit=crop',
    savings: 'Economize R$ 3,10',
    isAvailable: true
  },
  {
    id: 'c1',
    name: 'Café Expresso',
    description: 'Aquele café forte para despertar.',
    price: 5.50,
    category: 'Cafeteria',
    image: 'https://images.unsplash.com/photo-1510972527921-ce03766a1cf1?w=400&h=300&fit=crop',
    isAvailable: true
  }
];
