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

  const categories: (CategoryType | 'Todos')[] = ['Todos', 'Combos', 'Cafeteria', 'Lanches', 'Bebidas', 'Conveniência'];

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
  const cartTotal = cartItems.reduce((acc, i) => acc + (i.price * i.quantity), 0);

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col font-sans antialiased">
      <Header />

      <main className="w-full max-w-6xl mx-auto px-4 sm:px-6 -mt-8 relative z-20 flex-1 pb-40">
        {/* Category Selector */}
        <div className="flex overflow-x-auto gap-3 pb-8 no-scrollbar mask-fade scroll-smooth">
          {categories.map(cat => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`whitespace-nowrap px-7 py-3.5 rounded-2xl font-black text-xs uppercase tracking-widest transition-all shadow-lg active:scale-95 ${
                selectedCategory === cat 
                ? 'bg-black text-white' 
                : 'bg-white text-gray-700 hover:bg-gray-100 border border-gray-100'
              }`}
            >
              {cat}
              {cat === 'Combos' && <span className="ml-1">🔥</span>}
            </button>
          ))}
        </div>

        {/* Menu Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {filteredItems.map(item => (
            <MenuItem 
              key={item.id} 
              product={item} 
              onAdd={addToCart} 
            />
          ))}
        </div>

        {filteredItems.length === 0 && (
          <div className="text-center py-20 bg-white rounded-[2.5rem] shadow-sm border border-gray-100">
             <div className="text-4xl mb-4">🔍</div>
             <p className="text-gray-400 font-bold uppercase tracking-widest text-xs">Nenhum item encontrado</p>
          </div>
        )}
      </main>

      {/* Floating Cart UI */}
      {cartCount > 0 && (
        <div className="fixed bottom-8 left-0 right-0 flex justify-center px-6 z-40 pointer-events-none">
          <button 
            onClick={() => setIsCartOpen(true)}
            className="pointer-events-auto w-full max-w-md bg-black text-white rounded-[2rem] p-5 flex items-center justify-between shadow-[0_20px_50px_rgba(0,0,0,0.3)] hover:scale-[1.02] transition-all active:scale-95 ring-4 ring-yellow-400/30"
          >
            <div className="flex items-center gap-4">
              <div className="bg-yellow-400 text-black w-8 h-8 flex items-center justify-center rounded-xl text-sm font-black shadow-inner">
                {cartCount}
              </div>
              <span className="font-black text-sm uppercase tracking-[0.2em]">Ver Sacola</span>
            </div>
            <div className="flex items-center gap-3">
               <span className="font-black text-yellow-400 text-xl">
                R$ {cartTotal.toFixed(2).replace('.', ',')}
               </span>
               <CartIcon className="w-6 h-6 text-yellow-400" size={24} />
            </div>
          </button>
        </div>
      )}

      <Cart 
        isOpen={isCartOpen}
        onClose={() => setIsCartOpen(false)}
        items={cartItems}
        onUpdateQuantity={updateQuantity}
        onRemove={removeFromCart}
      />
    </div>
  );
};

export default App;