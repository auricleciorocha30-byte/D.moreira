
import React, { useState, useMemo, useEffect, useCallback } from 'react';
import Header from './components/Header';
import MenuItem from './components/MenuItem';
import Cart from './components/Cart';
import AdminPanel from './components/AdminPanel';
import { MENU_ITEMS, INITIAL_TABLES, STORE_INFO } from './constants';
import { CategoryType, Product, CartItem, Table, Order } from './types';

const App: React.FC = () => {
  const [isAdmin, setIsAdmin] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [loginPass, setLoginPass] = useState('');
  const [showLogin, setShowLogin] = useState(false);

  const [selectedCategory, setSelectedCategory] = useState<CategoryType | 'Todos'>('Todos');
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [isCartOpen, setIsCartOpen] = useState(false);
  
  const [tables, setTables] = useState<Table[]>(() => {
    const savedTables = localStorage.getItem('dmoreira_tables');
    if (savedTables) {
      try {
        return JSON.parse(savedTables);
      } catch (e) {
        return INITIAL_TABLES;
      }
    }
    return INITIAL_TABLES;
  });

  const [salesHistory, setSalesHistory] = useState<Order[]>(() => {
    const savedHistory = localStorage.getItem('dmoreira_sales');
    if (savedHistory) {
      try {
        return JSON.parse(savedHistory);
      } catch (e) {
        return [];
      }
    }
    return [];
  });

  // Sincronização automática entre abas do mesmo navegador
  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'dmoreira_tables' && e.newValue) {
        setTables(JSON.parse(e.newValue));
      }
      if (e.key === 'dmoreira_sales' && e.newValue) {
        setSalesHistory(JSON.parse(e.newValue));
      }
    };
    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

  useEffect(() => {
    localStorage.setItem('dmoreira_tables', JSON.stringify(tables));
  }, [tables]);

  useEffect(() => {
    localStorage.setItem('dmoreira_sales', JSON.stringify(salesHistory));
  }, [salesHistory]);

  const handleRefreshData = useCallback(() => {
    const savedTables = localStorage.getItem('dmoreira_tables');
    const savedSales = localStorage.getItem('dmoreira_sales');
    if (savedTables) setTables(JSON.parse(savedTables));
    if (savedSales) setSalesHistory(JSON.parse(savedSales));
  }, []);

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
    if (status === 'free') {
      const table = tables.find(t => t.id === tableId);
      if (table?.currentOrder) {
        setSalesHistory(prev => [...prev, table.currentOrder!]);
      }
    }
    setTables(prev => prev.map(t => 
      t.id === tableId ? { ...t, status, currentOrder: order } : t
    ));
  };

  const handleAddToOrder = (tableId: number, product: Product) => {
    setTables(prev => prev.map(t => {
      if (t.id === tableId) {
        let currentOrder = t.currentOrder;
        
        if (!currentOrder) {
          currentOrder = {
            id: Math.random().toString(36).substr(2, 6).toUpperCase(),
            customerName: `Mesa ${tableId}`,
            items: [],
            total: 0,
            paymentMethod: 'Pix',
            timestamp: new Date(),
            tableId: tableId
          };
        }

        const existingItems = [...currentOrder.items];
        const itemIdx = existingItems.findIndex(i => i.id === product.id);
        
        if (itemIdx > -1) {
          existingItems[itemIdx] = { 
            ...existingItems[itemIdx], 
            quantity: existingItems[itemIdx].quantity + 1 
          };
        } else {
          existingItems.push({ ...product, quantity: 1 });
        }

        const newTotal = existingItems.reduce((acc, item) => acc + (item.price * item.quantity), 0);
        
        return {
          ...t,
          status: 'occupied' as const,
          currentOrder: {
            ...currentOrder,
            items: existingItems,
            total: newTotal
          }
        };
      }
      return t;
    }));
  };

  const openWhatsAppSupport = () => {
    const msg = encodeURIComponent("Olá D.Moreira! Gostaria de um atendimento para meu pedido.");
    window.open(`https://wa.me/${STORE_INFO.whatsapp}?text=${msg}`, '_blank');
  };

  if (isAdmin && isLoggedIn) {
    return (
      <div className="min-h-screen bg-gray-50">
        <AdminPanel 
          tables={tables} 
          onUpdateTable={updateTable}
          onAddToOrder={handleAddToOrder}
          onRefreshData={handleRefreshData}
          salesHistory={salesHistory}
          onLogout={() => { setIsAdmin(false); setIsLoggedIn(false); }}
        />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col font-sans antialiased relative">
      <Header />

      <button 
        onClick={() => setShowLogin(true)}
        className="absolute top-4 right-4 z-50 text-[10px] font-black text-black/30 hover:text-black uppercase tracking-widest transition-colors"
      >
        Acesso Admin
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

      <div className="fixed bottom-8 left-0 right-0 flex flex-col items-center gap-4 px-6 z-40 pointer-events-none">
        <button 
          onClick={openWhatsAppSupport}
          className="pointer-events-auto bg-green-500 text-white rounded-full px-6 py-3 flex items-center gap-3 shadow-2xl hover:bg-green-600 transition-all active:scale-95 ring-4 ring-white"
        >
          <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
            <path d="M12.031 6.172c-3.181 0-5.767 2.586-5.768 5.766-.001 1.298.38 2.27 1.019 3.287l-.582 2.128 2.185-.573c.948.604 2.015.997 3.145 1.002h.002c3.181 0 5.767-2.586 5.768-5.766-.001-3.18-2.587-5.766-5.769-5.766zm4.186 8.222c-.173.487-.863.89-1.396.947-.462.05-1.066.075-1.727-.144-2.833-.939-4.667-3.805-4.808-3.991-.141-.188-1.032-1.37-1.032-2.615 0-1.245.658-1.854.893-2.108.235-.254.517-.318.689-.318.173 0 .346.003.496.01.159.006.371-.059.581.455.215.527.737 1.794.8 1.921.063.127.105.275.021.444-.084.169-.127.275-.254.423-.127.148-.266.331-.38.444-.127.127-.261.266-.112.52.148.254.658 1.082 1.412 1.754.97.865 1.789 1.133 2.043 1.26.254.127.402.106.551-.063.148-.169.635-.74.804-.994.169-.254.338-.212.571-.127s1.481.698 1.735.825c.254.127.423.19.487.296.063.106.063.614-.11 1.101z" />
          </svg>
          <span className="font-black text-xs uppercase tracking-widest">Suporte WhatsApp</span>
        </button>

        {cartItems.length > 0 && (
          <button 
            onClick={() => setIsCartOpen(true)} 
            className="pointer-events-auto w-full max-w-md bg-black text-white rounded-[2rem] p-5 flex items-center justify-between shadow-2xl active:scale-95 ring-4 ring-yellow-400/30 transition-all"
          >
            <div className="flex items-center gap-4">
              <div className="bg-yellow-400 text-black w-8 h-8 flex items-center justify-center rounded-xl text-sm font-black shadow-inner">
                {cartItems.reduce((a,b)=>a+b.quantity,0)}
              </div>
              <span className="font-black text-sm uppercase tracking-widest">Ver Pedido</span>
            </div>
            <span className="font-black text-yellow-400 text-xl">
              R$ {cartItems.reduce((a,b)=>a+(b.price*b.quantity),0).toFixed(2).replace('.', ',')}
            </span>
          </button>
        )}
      </div>

      {showLogin && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-6 bg-black/90 backdrop-blur-md">
          <div className="bg-white p-10 rounded-[3rem] w-full max-w-sm shadow-2xl text-center">
            <h2 className="text-3xl font-black mb-2">Painel Admin</h2>
            <p className="text-gray-400 text-xs font-bold uppercase mb-8">D.Moreira Conveniência</p>
            <form onSubmit={handleLogin} className="space-y-4">
              <div className="text-left">
                <label className="block text-[10px] font-black text-gray-400 mb-2 uppercase tracking-widest">Usuário</label>
                <input type="text" defaultValue="admin" disabled className="w-full bg-gray-50 border border-gray-100 rounded-2xl px-6 py-4 text-sm font-bold opacity-50 outline-none"/>
              </div>
              <div className="text-left">
                <label className="block text-[10px] font-black text-gray-400 mb-2 uppercase tracking-widest">Senha</label>
                <input 
                  type="password" 
                  autoFocus
                  value={loginPass} 
                  onChange={(e) => setLoginPass(e.target.value)} 
                  className="w-full bg-gray-50 border border-gray-200 rounded-2xl px-6 py-4 text-sm font-bold focus:ring-2 focus:ring-yellow-400 outline-none transition-all"
                />
              </div>
              <button type="submit" className="w-full bg-yellow-400 text-black font-black py-4 rounded-2xl shadow-xl mt-4 hover:brightness-110 active:scale-95 transition-all uppercase text-xs tracking-widest">Entrar no Sistema</button>
              <button type="button" onClick={() => setShowLogin(false)} className="w-full text-[10px] font-black text-gray-400 mt-4 uppercase tracking-widest">Voltar ao Cardápio</button>
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
