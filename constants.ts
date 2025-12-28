
import { Product, StoreInfo, Table } from './types';

export const STORE_INFO: StoreInfo = {
  name: 'D.Moreira',
  slogan: 'Parada Obrigatória ⛽',
  hours: 'Aberto de 6h às 22h | Todos os dias',
  whatsapp: '558591076984'
};

export const INITIAL_TABLES: Table[] = Array.from({ length: 12 }, (_, i) => ({
  id: i + 1,
  status: 'free',
  currentOrder: null
}));

export const MENU_ITEMS: Product[] = [
  {
    id: 'cb1',
    name: 'Combo Café Completo',
    description: '1 Café Expresso + 1 Pão de Queijo + 1 Suco de Laranja.',
    price: 16.90,
    category: 'Combos',
    image: 'https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?w=400&h=300&fit=crop',
    savings: 'Economize R$ 3,10'
  },
  {
    id: 'c1',
    name: 'Café Expresso',
    description: 'Aquele café forte para despertar.',
    price: 5.50,
    category: 'Cafeteria',
    image: 'https://images.unsplash.com/photo-1510972527921-ce03766a1cf1?w=400&h=300&fit=crop'
  },
  {
    id: 'b1',
    name: 'Coca-Cola 350ml',
    description: 'Geladinha para refrescar.',
    price: 6.00,
    category: 'Bebidas',
    image: 'https://images.unsplash.com/photo-1622483767028-3f66f32aef97?w=400&h=300&fit=crop'
  },
  {
    id: 'l1',
    name: 'Misto Quente Especial',
    description: 'Presunto e queijo derretido na chapa.',
    price: 12.50,
    category: 'Lanches',
    image: 'https://images.unsplash.com/photo-1528735602780-2552fd46c7af?w=400&h=300&fit=crop'
  }
];
