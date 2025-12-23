
import { Product, StoreInfo } from './types';

export const STORE_INFO: StoreInfo = {
  name: 'D.Moreira',
  slogan: 'Parada Obrigatória ⛽',
  hours: 'Aberto de 6h às 22h | Todos os dias',
  whatsapp: '558591076984'
};

export const MENU_ITEMS: Product[] = [
  // Combos (Destaque)
  {
    id: 'cb1',
    name: 'Combo Café Completo',
    description: '1 Café Expresso + 1 Pão de Queijo + 1 Suco de Laranja (pequeno).',
    price: 16.90,
    category: 'Combos',
    image: 'https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?w=400&h=300&fit=crop',
    savings: 'Economize R$ 3,10'
  },
  {
    id: 'cb4',
    name: 'Combo Misto + Nescau',
    description: '1 Misto Quente crocante na chapa + 1 Nescau (quente ou gelado). O clássico da estrada!',
    price: 14.90,
    category: 'Combos',
    image: 'https://images.unsplash.com/photo-1550507992-eb63cef3a27a?w=400&h=300&fit=crop',
    savings: 'Preço Especial'
  },
  {
    id: 'cb2',
    name: 'Combo Lanche Rápido',
    description: '1 Coxinha + 1 Coca-Cola 350ml.',
    price: 11.90,
    category: 'Combos',
    image: 'https://images.unsplash.com/photo-1619096279114-42655bf016d1?w=400&h=300&fit=crop',
    savings: 'Economize R$ 1,60'
  },
  {
    id: 'cb3',
    name: 'Combo Burger & Fritas',
    description: '1 Hambúrguer + 1 Batata Pringles 40g + 1 Refri.',
    price: 32.90,
    category: 'Combos',
    image: 'https://images.unsplash.com/photo-1594212699903-ec8a3eca50f5?w=400&h=300&fit=crop',
    savings: 'Combo Especial'
  },
  // Cafeteria
  {
    id: 'c1',
    name: 'Café Expresso',
    description: 'Aquele café forte para despertar. Grãos selecionados.',
    price: 5.50,
    category: 'Cafeteria',
    image: 'https://images.unsplash.com/photo-1510972527921-ce03766a1cf1?w=400&h=300&fit=crop'
  },
  {
    id: 'c2',
    name: 'Cappuccino Italiano',
    description: 'Café, leite vaporizado e uma pitada de cacau.',
    price: 8.90,
    category: 'Cafeteria',
    image: 'https://images.unsplash.com/photo-1572442388796-11668a67e53d?w=400&h=300&fit=crop'
  },
  {
    id: 'c3',
    name: 'Pão de Queijo Mineiro',
    description: 'Sempre quentinho, o par perfeito para o café.',
    price: 4.50,
    category: 'Cafeteria',
    image: 'https://images.unsplash.com/photo-1598143153003-f089602e973e?w=400&h=300&fit=crop'
  },
  // Bebidas
  {
    id: 'b1',
    name: 'Coca-Cola 350ml',
    description: 'Geladinha para refrescar sua viagem.',
    price: 6.00,
    category: 'Bebidas',
    image: 'https://images.unsplash.com/photo-1622483767028-3f66f32aef97?w=400&h=300&fit=crop'
  },
  {
    id: 'b2',
    name: 'Suco Natural de Laranja',
    description: 'Feito na hora, refrescante e nutritivo.',
    price: 9.00,
    category: 'Bebidas',
    image: 'https://images.unsplash.com/photo-1613478223719-2ab802602423?w=400&h=300&fit=crop'
  },
  // Lanches
  {
    id: 'l1',
    name: 'Misto Quente Especial',
    description: 'Pão de forma, presunto e queijo derretido na chapa.',
    price: 12.50,
    category: 'Lanches',
    image: 'https://images.unsplash.com/photo-1528735602780-2552fd46c7af?w=400&h=300&fit=crop'
  },
  {
    id: 'l2',
    name: 'Hambúrguer de Conveniência',
    description: 'Carne suculenta, queijo, alface e molho especial.',
    price: 18.90,
    category: 'Lanches',
    image: 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=400&h=300&fit=crop'
  },
  {
    id: 'l3',
    name: 'Coxinha de Frango com Catupiry',
    description: 'Salgado frito na hora, massa crocante e recheio cremoso.',
    price: 7.50,
    category: 'Lanches',
    image: 'https://images.unsplash.com/photo-1626074353765-517a681e40be?w=400&h=300&fit=crop'
  },
  // Conveniência
  {
    id: 'co1',
    name: 'Batata Pringles',
    description: 'Salgadinho clássico para comer no carro.',
    price: 15.00,
    category: 'Conveniência',
    image: 'https://images.unsplash.com/photo-1566478489139-4d6402432924?w=400&h=300&fit=crop'
  }
];
