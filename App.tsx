
import React, { useState, useMemo } from 'react';
import Header from './components/Header';
import MenuItem from './components/MenuItem';
import Cart from './components/Cart';
import { MENU_ITEMS } from './constants';
import { CategoryType, Product, CartItem } from './types';
import { CartIcon } from './components/Icons';

const App: React.FC = () => {
  const [selectedCategory, setSelectedCategory] = useState<CategoryType | 'Todos'>('Todos');
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [isCartOpen, setIsCartOpen] = useState(false);

  // Lista de categorias incluindo Combos
  const categories: (CategoryType | 'Todos')[] = ['Todos', 'Combos', 'Cafeteria', 'Bebidas', 'Lanches', 'Conveniência'];

  const filteredItems = useMemo(() => {
    if (selectedCategory === 'Todos') return MENU_ITEMS;
    return MENU_ITEMS.filter(item => item.category === selectedCategory);
  }, [selectedCategory]);

  const addToCart = (product: Product) => {
    setCartItems(prev => {
      const existing = prev.find(item => item.id === product.id);
      if (existing) {
        return prev.map(item => item.id === product.id ? { ...item, quantity: item.quantity + 1 } : item);
      }
      return [...prev, { ...product, quantity: 1 }];
    });
    // Feedback visual opcional: abrir o carrinho ou mostrar toast? 
    // Por enquanto, apenas atualizamos o estado.
  };

  const updateQuantity = (id: string, delta: number) => {
    setCartItems(prev => prev.map(item => {
      if (item.id === id) {
        const newQuantity = Math.max(1, item.quantity + delta);
        return { ...item, quantity: newQuantity };
      }
      return item;
    }));
  };

  const removeFromCart = (id: string) => {
    setCartItems(prev => prev.filter(item => item.id !== id));
  };

  const cartCount = cartItems.reduce((acc, item) => acc + item.quantity, 0);

  return (
    <div className="min-h-screen pb-24 bg-gray-50">
      <Header />

      <main className="max-w-4xl mx-auto px-6 -mt-8 relative z-20">
        {/* Category Selector */}
        <div className="flex overflow-x-auto gap-3 pb-6 no-scrollbar mask-fade">
          {categories.map(cat => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`whitespace-nowrap px-6 py-3 rounded-2xl font-bold text-sm transition-all shadow-md ${
                selectedCategory === cat 
                ? 'bg-black text-white' 
                : 'bg-white text-gray-700 hover:bg-gray-100'
              }`}
            >
              {cat}
              {cat === 'Combos' && <span className="ml-2">🔥</span>}
            </button>
          ))}
        </div>

        {/* Menu Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredItems.map(item => (
            <MenuItem 
              key={item.id} 
              product={item} 
              onAdd={addToCart} 
            />
          ))}
        </div>

        {filteredItems.length === 0 && (
          <div className="text-center py-20 text-gray-400">
            Nenhum item encontrado nesta categoria.
          </div>
        )}
      </main>

      {/* Cart Floating Action Button */}
      {cartCount > 0 && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 w-full max-w-sm px-6 z-30">
          <button 
            onClick={() => setIsCartOpen(true)}
            className="w-full bg-black text-white rounded-2xl p-4 flex items-center justify-between shadow-2xl hover:scale-105 transition-transform active:scale-95 ring-4 ring-yellow-400 ring-opacity-20"
          >
            <div className="flex items-center gap-3">
              <div className="bg-yellow-400 text-black px-2.5 py-1 rounded-lg text-sm font-black">
                {cartCount}
              </div>
              <span className="font-bold">Revisar Pedido</span>
            </div>
            <CartIcon className="w-6 h-6 text-yellow-400" />
          </button>
        </div>
      )}

      {/* Cart Sidebar */}
      <Cart 
        isOpen={isCartOpen}
        onClose={() => setIsCartOpen(false)}
        items={cartItems}
        onUpdateQuantity={updateQuantity}
        onRemove={removeFromCart}
      />
      
      {/* Global CSS for no-scrollbar */}
      <style>{`
        .no-scrollbar::-webkit-scrollbar { display: none; }
        .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
        .mask-fade {
          mask-image: linear-gradient(to right, black 85%, transparent 100%);
        }
      `}</style>
    </div>
  );
};

export default App;
