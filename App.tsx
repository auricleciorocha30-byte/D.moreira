
import React, { useState, useMemo, useEffect, useCallback, useRef } from 'react';
import Header from './components/Header';
import MenuItem from './components/MenuItem';
import Cart from './components/Cart';
import AdminPanel from './components/AdminPanel';
import { MENU_ITEMS as STATIC_MENU, INITIAL_TABLES } from './constants';
import { Product, CartItem, Table, Order, Category } from './types';
import { supabase } from './lib/supabase';
// Added CloseIcon import to fix "Cannot find name 'CloseIcon'" error
import { CloseIcon } from './components/Icons';

const DEFAULT_CATEGORIES: Category[] = [
  { id: '1', name: 'Lanches' },
  { id: '2', name: 'Bebidas' },
  { id: '3', name: 'Combos' },
  { id: '4', name: 'Diversos' }
];

const App: React.FC = () => {
  const [isAdmin, setIsAdmin] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPass, setLoginPass] = useState('');
  const [isLoadingLogin, setIsLoadingLogin] = useState(false);
  const [showLogin, setShowLogin] = useState(false);
  const [audioEnabled, setAudioEnabled] = useState(true);
  
  const [newOrderAlert, setNewOrderAlert] = useState<{ id: number; type: 'table' | 'delivery' | 'counter' } | null>(null);

  const [selectedCategory, setSelectedCategory] = useState<string>('Todos');
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [isCartOpen, setIsCartOpen] = useState(false);
  
  const [tables, setTables] = useState<Table[]>(INITIAL_TABLES);
  const [menuItems, setMenuItems] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>(DEFAULT_CATEGORIES);
  const [dbStatus, setDbStatus] = useState<'loading' | 'ok' | 'error_tables_missing'>('loading');

  const notificationSound = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    notificationSound.current = new Audio('https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3');
    notificationSound.current.load();
  }, []);

  const playNotification = useCallback(() => {
    if (audioEnabled && notificationSound.current) {
      notificationSound.current.currentTime = 0;
      notificationSound.current.play().catch(e => console.error("Erro ao tocar áudio:", e));
    }
  }, [audioEnabled]);

  const fetchData = useCallback(async () => {
    try {
      const { data: catData, error: cError } = await supabase.from('categories').select('*').order('name');
      if (!cError && catData) {
        if (catData.length > 0) setCategories(catData);
        else setCategories(DEFAULT_CATEGORIES);
      }

      const { data: prodData, error: pError } = await supabase.from('products').select('*').order('name');
      if (!pError && prodData && prodData.length > 0) {
        setMenuItems(prodData.map(p => ({
          id: p.id,
          name: p.name,
          description: p.description || '',
          price: Number(p.price),
          category: p.category,
          image: p.image || 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=400&h=300&fit=crop',
          isAvailable: p.is_available ?? true
        })));
        setDbStatus('ok');
      } else {
        setMenuItems(STATIC_MENU);
      }

      const { data: tData, error: tError } = await supabase.from('tables').select('*').order('id');
      if (!tError && tData) {
        setTables(prev => {
          // Mapeamos os dados do banco para os slots que temos em memória
          const updated = prev.map(p => {
            const dbT = tData.find(dt => dt.id === p.id);
            if (dbT) return { id: dbT.id, status: dbT.status, currentOrder: dbT.current_order };
            return p;
          });

          // Notificação para qualquer mesa/delivery que ficou ocupada
          tData.forEach(dbT => {
            const prevT = prev.find(p => p.id === dbT.id);
            if (dbT.status === 'occupied' && (!prevT || prevT.status === 'free')) {
              if (isAdmin) {
                playNotification();
                setNewOrderAlert({ 
                  id: dbT.id, 
                  type: dbT.id >= 950 ? 'counter' : dbT.id >= 900 ? 'delivery' : 'table' 
                });
                setTimeout(() => setNewOrderAlert(null), 15000);
              }
            }
          });

          return updated;
        });
      }
    } catch (err) {
      console.error("Fetch error:", err);
    }
  }, [isAdmin, playNotification]);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setIsLoggedIn(!!session);
      setIsAdmin(!!session);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_e, session) => {
      setIsLoggedIn(!!session);
      setIsAdmin(!!session);
    });

    fetchData();

    const channel = supabase.channel('realtime_menu')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'products' }, fetchData)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'categories' }, fetchData)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'tables' }, fetchData)
      .subscribe();

    return () => { 
      subscription.unsubscribe(); 
      supabase.removeChannel(channel); 
    };
  }, [fetchData]);

  const handlePlaceOrder = async (order: any) => {
    let targetTableId = order.tableId;
    
    // Se for um novo pedido de entrega/balcão vindo do cliente sem mesa fixa
    if (targetTableId === 900 || targetTableId === 901) {
      // Procurar o primeiro slot livre no range correspondente
      const rangeStart = targetTableId === 900 ? 900 : 950;
      const rangeEnd = targetTableId === 900 ? 949 : 999;
      
      const freeSlot = tables.find(t => t.id >= rangeStart && t.id <= rangeEnd && t.status === 'free');
      if (freeSlot) {
        targetTableId = freeSlot.id;
      } else {
        // Se todos os slots padrão estiverem cheios, tentamos um novo ID (o banco aceita)
        const lastInType = [...tables].filter(t => t.id >= rangeStart && t.id <= rangeEnd).sort((a,b) => b.id - a.id)[0];
        targetTableId = (lastInType?.id || rangeStart) + 1;
      }
    }

    const { data: current } = await supabase.from('tables').select('current_order, status').eq('id', targetTableId).single();
    
    let finalOrder: Order;
    
    if (current?.status === 'occupied' && current.current_order) {
      const items = [...current.current_order.items];
      if (order.items) {
        order.items.forEach((ni: CartItem) => {
          const i = items.findIndex(ei => ei.id === ni.id);
          if (i > -1) items[i].quantity += ni.quantity;
          else items.push(ni);
        });
      }
      finalOrder = { 
        ...current.current_order, 
        items, 
        total: items.reduce((a, b) => a + (b.price * b.quantity), 0), 
        isUpdated: true 
      };
    } else {
      finalOrder = { ...order, tableId: targetTableId, isUpdated: true };
    }

    await supabase.from('tables').upsert({ id: targetTableId, status: 'occupied', current_order: finalOrder });
    setCartItems([]);
    setIsCartOpen(false);
    fetchData();
  };

  const handleLogout = async () => {
    setIsLoggedIn(false);
    setIsAdmin(false);
    await supabase.auth.signOut();
  };

  const categoryNames = useMemo(() => ['Todos', ...categories.map(c => c.name)], [categories]);
  const filteredItems = useMemo(() => menuItems.filter(i => selectedCategory === 'Todos' || i.category === selectedCategory), [menuItems, selectedCategory]);

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col font-sans antialiased relative">
      <Header />
      {!isLoggedIn && (
        <button onClick={() => setShowLogin(true)} className="absolute top-4 right-4 z-50 text-[10px] font-black text-black/30 hover:text-black bg-white/10 px-3 py-1.5 rounded-full uppercase tracking-widest transition-colors backdrop-blur-sm border border-black/5">Acesso Restrito</button>
      )}

      <main className="w-full max-w-6xl mx-auto px-4 sm:px-6 -mt-8 relative z-20 flex-1 pb-40">
        {isAdmin && isLoggedIn ? (
          <div className="relative">
            {newOrderAlert && (
              <div className="fixed top-24 left-1/2 -translate-x-1/2 z-[300] w-full max-w-md px-6 animate-in slide-in-from-top duration-700">
                <div className="bg-black text-white p-6 rounded-[2.5rem] shadow-2xl border-4 border-yellow-400 flex items-center gap-5 ring-8 ring-black/10">
                  <div className="bg-yellow-400 text-black w-14 h-14 rounded-2xl flex items-center justify-center font-black text-2xl animate-bounce">!</div>
                  <div className="flex-1">
                    <h4 className="font-black text-xs uppercase tracking-widest text-yellow-400 leading-none mb-1">Novo Pedido</h4>
                    <p className="text-lg font-black italic">
                      {newOrderAlert.type === 'table' ? `MESA ${newOrderAlert.id}` : newOrderAlert.type === 'delivery' ? 'ENTREGA' : 'BALCÃO'}
                    </p>
                  </div>
                  <button onClick={() => setNewOrderAlert(null)} className="p-3 bg-white/10 rounded-full hover:bg-white/20 transition-colors">
                    <CloseIcon size={20}/>
                  </button>
                </div>
              </div>
            )}
            
            <AdminPanel 
              tables={tables} 
              menuItems={menuItems} 
              categories={categories}
              audioEnabled={audioEnabled} 
              onToggleAudio={() => setAudioEnabled(!audioEnabled)} 
              onUpdateTable={async (id, status, ord) => { await supabase.from('tables').upsert({ id, status, current_order: ord || null }); fetchData(); }} 
              onAddToOrder={(tableId, product) => handlePlaceOrder({ ...product, tableId })}
              onRefreshData={fetchData} 
              onLogout={handleLogout} 
              onSaveProduct={async (p) => {
                const productData = { name: p.name, price: p.price, category: p.category, description: p.description, image: p.image, is_available: p.isAvailable };
                if (p.id) await supabase.from('products').update(productData).eq('id', p.id);
                else await supabase.from('products').insert([{ id: 'p_' + Date.now(), ...productData }]);
                fetchData();
              }} 
              onDeleteProduct={async (id) => { await supabase.from('products').delete().eq('id', id); fetchData(); }} 
              dbStatus={dbStatus} 
            />
          </div>
        ) : (
          <>
            <div className="flex overflow-x-auto gap-2.5 pb-8 no-scrollbar mask-fade scroll-smooth">
              {categoryNames.map(cat => (
                <button key={cat} onClick={() => setSelectedCategory(cat)} className={`whitespace-nowrap px-6 py-3.5 rounded-2xl font-black text-[10px] uppercase tracking-wider transition-all shadow-sm ${selectedCategory === cat ? 'bg-black text-white' : 'bg-white text-gray-600 border border-gray-100 hover:border-black'}`}>{cat}</button>
              ))}
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 animate-in fade-in duration-700">
              {filteredItems.map(item => <MenuItem key={item.id} product={item} onAdd={(p) => setCartItems(prev => {
                const ex = prev.find(i => i.id === p.id);
                if (ex) return prev.map(i => i.id === p.id ? {...i, quantity: i.quantity + 1} : i);
                return [...prev, { ...p, quantity: 1 }];
              })} />)}
            </div>
          </>
        )}
      </main>

      {!isAdmin && cartItems.length > 0 && (
        <div className="fixed bottom-8 left-0 right-0 flex justify-center px-6 z-40 animate-in slide-in-from-bottom duration-500">
          <button onClick={() => setIsCartOpen(true)} className="w-full max-w-md bg-black text-white rounded-[2.5rem] p-5 flex items-center justify-between shadow-2xl ring-4 ring-yellow-400/30 active:scale-95 transition-all">
            <div className="flex items-center gap-4">
              <div className="bg-yellow-400 text-black w-9 h-9 flex items-center justify-center rounded-2xl text-xs font-black">{cartItems.reduce((a,b)=>a+b.quantity,0)}</div>
              <span className="font-black text-xs uppercase tracking-widest">Minha Sacola</span>
            </div>
            <span className="font-black text-yellow-400 text-xl italic">R$ {cartItems.reduce((a,b)=>a+(b.price*b.quantity),0).toFixed(2).replace('.', ',')}</span>
          </button>
        </div>
      )}

      {showLogin && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-6 bg-black/90 backdrop-blur-md">
          <div className="bg-white p-12 rounded-[3.5rem] w-full max-sm text-center shadow-2xl">
            <h2 className="text-3xl font-black mb-8 italic">Restrito</h2>
            <form onSubmit={async (e) => {
              e.preventDefault();
              setIsLoadingLogin(true);
              const { error } = await supabase.auth.signInWithPassword({ email: loginEmail, password: loginPass });
              if (error) alert('Acesso Negado: ' + error.message);
              else setShowLogin(false);
              setIsLoadingLogin(false);
            }} className="space-y-4">
              <input type="email" placeholder="E-mail" value={loginEmail} onChange={e => setLoginEmail(e.target.value)} className="w-full bg-gray-50 border-2 rounded-2xl px-6 py-4 text-sm font-bold text-black outline-none focus:border-yellow-400 transition-all" required />
              <input type="password" placeholder="Senha" value={loginPass} onChange={e => setLoginPass(e.target.value)} className="w-full bg-gray-50 border-2 rounded-2xl px-6 py-4 text-sm font-bold text-black outline-none focus:border-yellow-400 transition-all" required />
              <button type="submit" disabled={isLoadingLogin} className="w-full bg-yellow-400 text-black font-black py-5 rounded-2xl uppercase text-xs tracking-widest shadow-xl hover:brightness-110 active:scale-95 transition-all">{isLoadingLogin ? 'Autenticando...' : 'Entrar'}</button>
              <button type="button" onClick={() => setShowLogin(false)} className="text-[10px] font-black text-gray-400 uppercase mt-6 hover:text-gray-600 transition-colors">Voltar</button>
            </form>
          </div>
        </div>
      )}

      {!isAdmin && <Cart isOpen={isCartOpen} onClose={() => setIsCartOpen(false)} items={cartItems} onUpdateQuantity={(id, d) => setCartItems(p => p.map(i => i.id === id ? {...i, quantity: Math.max(1, i.quantity + d)} : i))} onRemove={id => setCartItems(p => p.filter(i => i.id !== id))} onAdd={() => {}} onPlaceOrder={handlePlaceOrder}/>}
    </div>
  );
};

export default App;
