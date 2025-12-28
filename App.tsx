
import React, { useState, useMemo } from 'react';
import Header from './components/Header';
import MenuItem from './components/MenuItem';
import Cart from './components/Cart';
import AdminPanel from './components/AdminPanel';
import { MENU_ITEMS, INITIAL_TABLES } from './constants';
import { CategoryType, Product, CartItem, Table, Order } from './types';
import { CartIcon } from './components/Icons';

const App: React.FC = () => {
  const [isAdmin, setIsAdmin] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [loginPass, setLoginPass] = useState('');
  const [showLogin, setShowLogin] = useState(false);

  const [selectedCategory, setSelectedCategory] = useState<CategoryType | 'Todos'>('Todos');
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [isCartOpen, setIsCartOpen] = useState(false);
  
  // Gestão Global de Mesas
  const [tables, setTables] = useState<Table[]>(INITIAL_TABLES);

  const categories: (CategoryType | 'Todos')[] = ['Todos', 'Combos', 'Cafeteria', 'Lanches', 'Bebidas', 'Conveniência'];

  const filteredItems = useMemo(() => {
    if (selectedCategory === 'Todos') return MENU_ITEMS;
    return MENU_ITEMS.filter(item => item.category === selectedCategory);
  }, [selectedCategory]);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (loginPass === '123') {
      setIsLoggedIn(true);
      setIsAdmin(true);
      setShowLogin(false);
      setLoginPass('');
    } else {
      alert('Senha incorreta!');
    }
  };

  const addToCart = (product: Product) => {
    setCartItems(prev => {
      const existing = prev.find(item => item.id === product.id);
      if (existing) {
        return prev.map(item => item.id === product.id ? { ...item, quantity: item.quantity + 1 } : item);
      }
      return [...prev, { ...product, quantity: 1 }];
    });
  };

  const handlePlaceOrder = (order: Order) => {
    setTables(prev => prev.map(t => 
      t.id === order.tableId 
        ? { ...t, status: 'occupied', currentOrder: order } 
        : t
    ));
    setCartItems([]);
  };

  const updateTable = (tableId: number, status: 'free' | 'occupied', order: Order | null = null) => {
    setTables(prev => prev.map(t => 
      t.id === tableId ? { ...t, status, currentOrder: order } : t
    ));
  };

  if (isAdmin && isLoggedIn) {
    return (
      <div className="min-h-screen bg-gray-50">
        <AdminPanel 
          tables={tables} 
          onUpdateTable={updateTable}
          onLogout={() => { setIsAdmin(false); setIsLoggedIn(false); }}
        />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col font-sans antialiased relative">
      <Header />

      {/* Botão Admin Discreto no Canto */}
      <button 
        onClick={() => setShowLogin(true)}
        className="absolute top-4 right-4 z-50 text-[10px] font-black text-black/30 hover:text-black uppercase tracking-tighter"
      >
        Admin
      </button>

      <main className="w-full max-w-6xl mx-auto px-4 sm:px-6 -mt-8 relative z-20 flex-1 pb-40">
        <div className="flex overflow-x-auto gap-3 pb-8 no-scrollbar mask-fade scroll-smooth">
          {categories.map(cat => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`whitespace-nowrap px-7 py-3.5 rounded-2xl font-black text-xs uppercase tracking-widest transition-all shadow-lg active:scale-95 ${
                selectedCategory === cat ? 'bg-black text-white' : 'bg-white text-gray-700 hover:bg-gray-100 border border-gray-100'
              }`}
            >
              {cat}
              {cat === 'Combos' && <span className="ml-1">🔥</span>}
            </button>
          ))}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {filteredItems.map(item => (
            <MenuItem key={item.id} product={item} onAdd={addToCart} />
          ))}
        </div>
      </main>

      {/* Floating Cart Button */}
      {cartItems.length > 0 && (
        <div className="fixed bottom-8 left-0 right-0 flex justify-center px-6 z-40 pointer-events-none">
          <button onClick={() => setIsCartOpen(true)} className="pointer-events-auto w-full max-w-md bg-black text-white rounded-[2rem] p-5 flex items-center justify-between shadow-2xl active:scale-95 ring-4 ring-yellow-400/30">
            <div className="flex items-center gap-4">
              <div className="bg-yellow-400 text-black w-8 h-8 flex items-center justify-center rounded-xl text-sm font-black">{cartItems.reduce((a,b)=>a+b.quantity,0)}</div>
              <span className="font-black text-sm uppercase tracking-widest">Ver Pedido</span>
            </div>
            <span className="font-black text-yellow-400 text-xl">R$ {cartItems.reduce((a,b)=>a+(b.price*b.quantity),0).toFixed(2)}</span>
          </button>
        </div>
      )}

      {/* Login Modal */}
      {showLogin && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-6 bg-black/90 backdrop-blur-md">
          <div className="bg-white p-10 rounded-[3rem] w-full max-w-sm shadow-2xl text-center">
            <h2 className="text-3xl font-black mb-2">Painel Admin</h2>
            <p className="text-gray-400 text-xs font-bold uppercase mb-8">D.Moreira Conveniência</p>
            <form onSubmit={handleLogin} className="space-y-4">
              <div className="text-left">
                <label className="block text-[10px] font-black text-gray-400 mb-2 uppercase">Usuário</label>
                <input type="text" defaultValue="admin" disabled className="w-full bg-gray-50 border border-gray-100 rounded-2xl px-6 py-4 text-sm font-bold opacity-50"/>
              </div>
              <div className="text-left">
                <label className="block text-[10px] font-black text-gray-400 mb-2 uppercase">Senha</label>
                <input 
                  type="password" 
                  autoFocus
                  value={loginPass} 
                  onChange={(e) => setLoginPass(e.target.value)} 
                  className="w-full bg-gray-50 border border-gray-200 rounded-2xl px-6 py-4 text-sm font-bold focus:ring-2 focus:ring-yellow-400 outline-none"
                />
              </div>
              <button type="submit" className="w-full bg-yellow-400 text-black font-black py-4 rounded-2xl shadow-xl mt-4">Entrar</button>
              <button type="button" onClick={() => setShowLogin(false)} className="w-full text-xs font-bold text-gray-400 mt-2">Cancelar</button>
            </form>
          </div>
        </div>
      )}

      <Cart 
        isOpen={isCartOpen} onClose={() => setIsCartOpen(false)} 
        items={cartItems} onUpdateQuantity={(id, d) => setCartItems(p => p.map(i => i.id === id ? {...i, quantity: Math.max(1, i.quantity + d)} : i))}
        onRemove={(id) => setCartItems(p => p.filter(i => i.id !== id))}
        onAdd={addToCart}
        onPlaceOrder={handlePlaceOrder}
      />
    </div>
  );
};

export default App;
