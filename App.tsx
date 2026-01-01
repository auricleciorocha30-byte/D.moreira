
import React, { useState, useMemo, useEffect, useCallback, useRef } from 'react';
import Header from './components/Header';
import MenuItem from './components/MenuItem';
import Cart from './components/Cart';
import AdminPanel from './components/AdminPanel';
import { MENU_ITEMS as STATIC_MENU, INITIAL_TABLES, STORE_INFO } from './constants';
import { CategoryType, Product, CartItem, Table, Order } from './types';
import { supabase } from './lib/supabase';

const App: React.FC = () => {
  const [isAdmin, setIsAdmin] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPass, setLoginPass] = useState('');
  const [isLoadingLogin, setIsLoadingLogin] = useState(false);
  const [showLogin, setShowLogin] = useState(false);
  const [audioEnabled, setAudioEnabled] = useState(false);

  const [selectedCategory, setSelectedCategory] = useState<CategoryType | 'Todos'>('Todos');
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [isCartOpen, setIsCartOpen] = useState(false);
  
  const [tables, setTables] = useState<Table[]>(INITIAL_TABLES);
  const [menuItems, setMenuItems] = useState<Product[]>([]);
  const [dbStatus, setDbStatus] = useState<'loading' | 'ok' | 'error_tables_missing'>('loading');

  const notificationSound = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    notificationSound.current = new Audio('https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3');
    notificationSound.current.volume = 0.5;
  }, []);

  const playNotification = useCallback(() => {
    if (audioEnabled && notificationSound.current) {
      notificationSound.current.currentTime = 0;
      notificationSound.current.play().catch(e => console.error("Erro ao tocar som:", e));
    }
  }, [audioEnabled]);

  const toggleAudio = () => {
    setAudioEnabled(prev => !prev);
    // Toca um som curto e silencioso para "desbloquear" o áudio no navegador
    if (notificationSound.current) {
      notificationSound.current.volume = 0;
      notificationSound.current.play().then(() => {
        if (notificationSound.current) notificationSound.current.volume = 0.5;
      }).catch(() => {});
    }
  };

  useEffect(() => {
    const checkSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        setIsLoggedIn(true);
        setIsAdmin(true);
      }
    };
    checkSession();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session) {
        setIsLoggedIn(true);
        setIsAdmin(true);
      } else {
        setIsLoggedIn(false);
        setIsAdmin(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const fetchData = useCallback(async () => {
    try {
      const { data: productsData, error: pError } = await supabase.from('products').select('*').order('name');
      
      if (pError) {
        if (pError.code === '42P01') setDbStatus('error_tables_missing');
        setMenuItems(STATIC_MENU);
        return;
      }
      
      setDbStatus('ok');

      if (productsData && productsData.length > 0) {
        const mapped = productsData.map(p => ({
          id: p.id,
          name: p.name,
          description: p.description || '',
          price: Number(p.price),
          category: p.category,
          image: p.image || 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=400&h=300&fit=crop',
          savings: p.savings || '',
          isAvailable: p.is_available ?? true 
        }));
        setMenuItems(mapped);
      } else {
        setMenuItems(STATIC_MENU);
      }

      const { data: tablesData } = await supabase.from('tables').select('*').order('id', { ascending: true });
      if (tablesData) {
        setTables(prev => {
          const updated = [...INITIAL_TABLES];
          let foundNew = false;

          tablesData.forEach(dbT => {
            const idx = updated.findIndex(t => t.id === dbT.id);
            if (idx > -1) {
              const oldTable = prev.find(pT => pT.id === dbT.id);
              const oldItemsCount = oldTable?.currentOrder?.items.reduce((a, b) => a + b.quantity, 0) || 0;
              const newItemsCount = dbT.current_order?.items.reduce((a: number, b: any) => a + b.quantity, 0) || 0;

              // Novo pedido ou novos itens em mesa já ocupada
              if (dbT.status === 'occupied' && (oldTable?.status !== 'occupied' || newItemsCount > oldItemsCount)) {
                foundNew = true;
              }

              updated[idx] = { 
                id: dbT.id, 
                status: dbT.status, 
                currentOrder: dbT.status === 'occupied' && dbT.current_order ? {
                  ...dbT.current_order,
                  isUpdated: oldTable?.status === 'occupied' && newItemsCount > oldItemsCount
                } : null 
              };
            }
          });

          if (foundNew && isAdmin && audioEnabled) {
            playNotification();
          }

          return updated;
        });
      }
    } catch (err) {
      console.error("Erro ao sincronizar:", err);
    }
  }, [isAdmin, audioEnabled, playNotification]);

  useEffect(() => {
    fetchData();
    const channel = supabase.channel('dmoreira-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'products' }, fetchData)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'tables' }, fetchData)
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [fetchData]);

  const addToCart = (product: Product) => {
    if (!product.isAvailable) return;
    setCartItems(prev => {
      const existing = prev.find(item => item.id === product.id);
      if (existing) return prev.map(item => item.id === product.id ? { ...item, quantity: item.quantity + 1 } : item);
      return [...prev, { ...product, quantity: 1 }];
    });
  };

  const handlePlaceOrder = async (order: Order) => {
    try {
      const { data: current, error: fetchError } = await supabase
        .from('tables')
        .select('current_order, status')
        .eq('id', order.tableId)
        .maybeSingle();
      
      if (fetchError) throw fetchError;

      let finalOrder = order;
      if (current?.status === 'occupied' && current.current_order) {
        const existing = current.current_order;
        const mergedItems = [...existing.items];
        
        order.items.forEach(newItem => {
          const foundIdx = mergedItems.findIndex(i => i.id === newItem.id);
          if (foundIdx > -1) mergedItems[foundIdx].quantity += newItem.quantity;
          else mergedItems.push(newItem);
        });

        finalOrder = { 
          ...existing, 
          items: mergedItems, 
          total: mergedItems.reduce((acc, i) => acc + (i.price * i.quantity), 0), 
          timestamp: new Date().toISOString(),
          status: 'pending' 
        };
      }

      const { error: upsertError } = await supabase.from('tables').upsert({ 
        id: order.tableId, 
        status: 'occupied', 
        current_order: finalOrder
      });

      if (upsertError) throw upsertError;
      
      setCartItems([]);
      fetchData();
    } catch (err: any) { 
      alert(`Erro ao enviar pedido: ${err.message || 'Erro de conexão.'}`); 
    }
  };

  const handleSaveProduct = async (product: Partial<Product>) => {
    const payload = {
      name: product.name,
      description: product.description,
      price: product.price,
      category: product.category,
      image: product.image,
      is_available: product.isAvailable ?? true
    };

    try {
      if (!product.id) {
        const newId = 'prod_' + Date.now();
        await supabase.from('products').insert([{ ...payload, id: newId }]);
      } else {
        await supabase.from('products').update(payload).eq('id', product.id);
      }
      fetchData();
    } catch (err: any) { 
      alert('Erro ao salvar produto: ' + err.message); 
    }
  };

  const handleDeleteProduct = async (id: string) => {
    try {
      const { error } = await supabase.from('products').delete().eq('id', id);
      if (error) throw error;
      fetchData();
    } catch (err: any) {
      alert('Erro ao excluir produto: ' + err.message);
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setIsLoggedIn(false);
    setIsAdmin(false);
  };

  const categories: (CategoryType | 'Todos')[] = ['Todos', 'Combos', 'Cafeteria', 'Lanches', 'Bebidas', 'Conveniência'];
  const filteredItems = menuItems.filter(item => selectedCategory === 'Todos' || item.category === selectedCategory);

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col font-sans antialiased relative">
      <Header />
      <button onClick={() => setShowLogin(true)} className="absolute top-4 right-4 z-50 text-[10px] font-black text-black/30 hover:text-black uppercase tracking-widest transition-colors">Acesso Admin</button>
      
      <main className="w-full max-w-6xl mx-auto px-4 sm:px-6 -mt-8 relative z-20 flex-1 pb-40">
        {isAdmin && isLoggedIn ? (
          <AdminPanel 
            tables={tables} 
            menuItems={menuItems}
            audioEnabled={audioEnabled}
            onToggleAudio={toggleAudio}
            onUpdateTable={async (id, status, ord) => { 
              const orderToSave = status === 'free' ? null : (ord ? { ...ord, isUpdated: false } : null);
              const { error } = await supabase.from('tables').upsert({ id, status, current_order: orderToSave });
              if (error) alert("Erro ao atualizar mesa: " + error.message);
              fetchData();
            }}
            onAddToOrder={handlePlaceOrder as any}
            onRefreshData={fetchData} 
            salesHistory={[]} 
            onLogout={handleLogout}
            onSaveProduct={handleSaveProduct}
            onDeleteProduct={handleDeleteProduct}
            dbStatus={dbStatus}
          />
        ) : (
          <>
            <div className="flex overflow-x-auto gap-3 pb-8 no-scrollbar mask-fade scroll-smooth">
              {categories.map(cat => (
                <button key={cat} onClick={() => setSelectedCategory(cat)} className={`whitespace-nowrap px-7 py-3.5 rounded-2xl font-black text-xs uppercase tracking-widest transition-all shadow-lg active:scale-95 ${selectedCategory === cat ? 'bg-black text-white' : 'bg-white text-gray-700 hover:bg-gray-100 border'}`}>{cat}</button>
              ))}
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {filteredItems.map(item => <MenuItem key={item.id} product={item} onAdd={addToCart} />)}
            </div>
          </>
        )}
      </main>

      {!isAdmin && (
        <div className="fixed bottom-8 left-0 right-0 flex flex-col items-center gap-4 px-6 z-40 pointer-events-none">
          <button onClick={() => window.open(`https://wa.me/${STORE_INFO.whatsapp}`, '_blank')} className="pointer-events-auto bg-green-500 text-white rounded-full px-6 py-3 flex items-center gap-3 shadow-2xl hover:bg-green-600 active:scale-95 transition-all ring-4 ring-white"><span className="font-black text-xs uppercase tracking-widest">WhatsApp Suporte</span></button>
          {cartItems.length > 0 && (
            <button onClick={() => setIsCartOpen(true)} className="pointer-events-auto w-full max-w-md bg-black text-white rounded-[2rem] p-5 flex items-center justify-between shadow-2xl active:scale-95 ring-4 ring-yellow-400/30 transition-all">
              <div className="flex items-center gap-4">
                <div className="bg-yellow-400 text-black w-8 h-8 flex items-center justify-center rounded-xl text-sm font-black shadow-inner">{cartItems.reduce((a,b)=>a+b.quantity,0)}</div>
                <span className="font-black text-sm uppercase tracking-widest">Ver Sacola</span>
              </div>
              <span className="font-black text-yellow-400 text-xl italic">R$ {cartItems.reduce((a,b)=>a+(b.price*b.quantity),0).toFixed(2).replace('.', ',')}</span>
            </button>
          )}
        </div>
      )}

      {showLogin && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-6 bg-black/90 backdrop-blur-md">
          <div className="bg-white p-10 rounded-[3rem] w-full max-w-sm shadow-2xl text-center">
            <h2 className="text-3xl font-black mb-2 italic tracking-tighter">Painel Admin</h2>
            <p className="text-gray-400 text-[10px] font-black uppercase tracking-widest mb-8 italic">Acesso Restrito - D.Moreira</p>
            <form onSubmit={e => {
              e.preventDefault();
              setIsLoadingLogin(true);
              supabase.auth.signInWithPassword({ email: loginEmail, password: loginPass })
                .then(({ error }) => {
                  if (error) alert('Erro no Login: ' + error.message);
                  else { setShowLogin(false); setLoginPass(''); }
                })
                .finally(() => setIsLoadingLogin(false));
            }} className="space-y-4">
              <input type="email" required placeholder="E-mail" value={loginEmail} onChange={e => setLoginEmail(e.target.value)} className="w-full bg-gray-50 border border-gray-100 rounded-2xl px-6 py-4 text-sm font-bold outline-none focus:border-yellow-400 transition-all shadow-inner"/>
              <input type="password" required placeholder="Senha" value={loginPass} onChange={e => setLoginPass(e.target.value)} className="w-full bg-gray-50 border border-gray-100 rounded-2xl px-6 py-4 text-sm font-bold outline-none focus:border-yellow-400 transition-all shadow-inner"/>
              <button type="submit" disabled={isLoadingLogin} className="w-full bg-yellow-400 text-black font-black py-4 rounded-2xl shadow-xl uppercase text-xs tracking-widest hover:brightness-110 active:scale-95 transition-all">{isLoadingLogin ? 'Autenticando...' : 'Entrar Agora'}</button>
              <button type="button" onClick={() => setShowLogin(false)} className="text-[10px] font-black text-gray-400 uppercase mt-4 tracking-widest hover:text-black transition-colors">Voltar ao Cardápio</button>
            </form>
          </div>
        </div>
      )}
      
      {!isAdmin && <Cart isOpen={isCartOpen} onClose={() => setIsCartOpen(false)} items={cartItems} onUpdateQuantity={(id, d) => setCartItems(p => p.map(i => i.id === id ? {...i, quantity: Math.max(1, i.quantity + d)} : i))} onRemove={id => setCartItems(p => p.filter(i => i.id !== id))} onAdd={addToCart} onPlaceOrder={handlePlaceOrder}/>}
    </div>
  );
};

export default App;
