
import React, { useState, useMemo, useEffect, useCallback, useRef } from 'react';
import Header from './components/Header';
import MenuItem from './components/MenuItem';
import Cart from './components/Cart';
import AdminPanel from './components/AdminPanel';
import { MENU_ITEMS as STATIC_MENU, INITIAL_TABLES, STORE_INFO } from './constants';
import { CategoryType, Product, CartItem, Table, Order, Category } from './types';
import { supabase } from './lib/supabase';

const App: React.FC = () => {
  const [isAdmin, setIsAdmin] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPass, setLoginPass] = useState('');
  const [isLoadingLogin, setIsLoadingLogin] = useState(false);
  const [showLogin, setShowLogin] = useState(false);
  const [audioEnabled, setAudioEnabled] = useState(true);

  const [selectedCategory, setSelectedCategory] = useState<string>('Todos');
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [isCartOpen, setIsCartOpen] = useState(false);
  
  const [tables, setTables] = useState<Table[]>(INITIAL_TABLES);
  const [menuItems, setMenuItems] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
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
    if (notificationSound.current) {
      notificationSound.current.volume = 0;
      notificationSound.current.play().then(() => {
        if (notificationSound.current) notificationSound.current.volume = 0.5;
      }).catch(() => {});
    }
  };

  const fetchData = useCallback(async () => {
    try {
      // 1. Tentar buscar produtos
      const { data: productsData, error: pError } = await supabase.from('products').select('*').order('name');
      
      let currentProducts: Product[] = [];
      if (pError || !productsData || productsData.length === 0) {
        if (pError?.code === '42P01') setDbStatus('error_tables_missing');
        currentProducts = STATIC_MENU;
        setMenuItems(STATIC_MENU);
      } else {
        setDbStatus('ok');
        currentProducts = productsData.map(p => ({
          id: p.id,
          name: p.name,
          description: p.description || '',
          price: Number(p.price),
          category: p.category,
          image: p.image || 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=400&h=300&fit=crop',
          savings: p.savings || '',
          isAvailable: p.is_available ?? true 
        }));
        setMenuItems(currentProducts);
      }

      // 2. Tentar buscar categorias (fallback se falhar)
      const { data: catData, error: cError } = await supabase.from('categories').select('*').order('name');
      
      if (!cError && catData && catData.length > 0) {
        setCategories(catData);
      } else {
        // Fallback: Pega categorias únicas dos produtos carregados
        const uniqueCats = Array.from(new Set(currentProducts.map(p => p.category)));
        const fallbackCats = uniqueCats.map((name, index) => ({ 
          id: `fallback-${index}-${name.toLowerCase()}`, 
          name 
        }));
        setCategories(fallbackCats);
      }

      // 3. Buscar Mesas
      const { data: tablesData } = await supabase.from('tables').select('*').order('id', { ascending: true });
      if (tablesData) {
        setTables(prev => {
          const updated = [...INITIAL_TABLES];
          let foundNew = false;
          tablesData.forEach(dbT => {
            const idx = updated.findIndex(t => t.id === dbT.id);
            if (idx > -1) {
              const oldT = prev.find(pT => pT.id === dbT.id);
              const oldCnt = oldT?.currentOrder?.items.reduce((a, b) => a + b.quantity, 0) || 0;
              const newCnt = dbT.current_order?.items?.reduce((a: number, b: any) => a + b.quantity, 0) || 0;
              if (dbT.status === 'occupied' && (oldT?.status !== 'occupied' || newCnt > oldCnt)) foundNew = true;
              
              updated[idx] = { 
                id: dbT.id, 
                status: dbT.status, 
                currentOrder: dbT.status === 'occupied' && dbT.current_order ? {
                  ...dbT.current_order,
                  isUpdated: (dbT.status === 'occupied' && (oldT?.status !== 'occupied' || newCnt > oldCnt)) ? true : (oldT?.currentOrder?.isUpdated ?? false)
                } : null 
              };
            }
          });
          if (foundNew && isAdmin && audioEnabled) playNotification();
          return updated;
        });
      }
    } catch (err) {
      console.error("Erro geral de carregamento:", err);
      setMenuItems(STATIC_MENU);
      const uniqueCats = Array.from(new Set(STATIC_MENU.map(p => p.category)));
      setCategories(uniqueCats.map((n, i) => ({ id: `err-${i}`, name: n })));
    }
  }, [isAdmin, audioEnabled, playNotification]);

  useEffect(() => {
    const checkSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) { setIsLoggedIn(true); setIsAdmin(true); }
    };
    checkSession();
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setIsLoggedIn(!!session);
      setIsAdmin(!!session);
    });
    fetchData();
    const channel = supabase.channel('realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'products' }, fetchData)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'tables' }, fetchData)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'categories' }, fetchData)
      .subscribe();
    return () => { subscription.unsubscribe(); supabase.removeChannel(channel); };
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
      const { data: current } = await supabase.from('tables').select('current_order, status').eq('id', order.tableId).maybeSingle();
      let finalOrder = order;
      if (current?.status === 'occupied' && current.current_order) {
        const mergedItems = [...current.current_order.items];
        order.items.forEach(newItem => {
          const idx = mergedItems.findIndex(i => i.id === newItem.id);
          if (idx > -1) mergedItems[idx].quantity += newItem.quantity;
          else mergedItems.push(newItem);
        });
        finalOrder = { ...current.current_order, items: mergedItems, total: mergedItems.reduce((a, i) => a + (i.price * i.quantity), 0), status: current.current_order.status || 'pending' };
      }
      await supabase.from('tables').upsert({ id: order.tableId, status: 'occupied', current_order: finalOrder });
      setCartItems([]);
      fetchData();
    } catch (err: any) { alert(`Erro: ${err.message}`); }
  };

  const handleSaveProduct = async (product: Partial<Product>) => {
    const payload = { name: product.name, description: product.description, price: product.price, category: product.category, image: product.image, is_available: product.isAvailable ?? true };
    try {
      if (!product.id) await supabase.from('products').insert([{ ...payload, id: 'prod_' + Date.now() }]);
      else await supabase.from('products').update(payload).eq('id', product.id);
      fetchData();
    } catch (err: any) { alert('Erro: ' + err.message); }
  };

  const handleDeleteProduct = async (id: string) => {
    try { await supabase.from('products').delete().eq('id', id); fetchData(); }
    catch (err: any) { alert('Erro: ' + err.message); }
  };

  const categoryNames = useMemo(() => ['Todos', ...categories.map(c => c.name)], [categories]);
  const filteredItems = useMemo(() => menuItems.filter(i => selectedCategory === 'Todos' || i.category === selectedCategory), [menuItems, selectedCategory]);

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col font-sans antialiased relative">
      <Header />
      <button onClick={() => setShowLogin(true)} className="absolute top-4 right-4 z-50 text-[10px] font-black text-black/30 hover:text-black uppercase tracking-widest">Acesso Admin</button>
      <main className="w-full max-w-6xl mx-auto px-4 sm:px-6 -mt-8 relative z-20 flex-1 pb-40">
        {isAdmin && isLoggedIn ? (
          <AdminPanel tables={tables} menuItems={menuItems} audioEnabled={audioEnabled} onToggleAudio={toggleAudio} onUpdateTable={async (id, status, ord) => { await supabase.from('tables').upsert({ id, status, current_order: status === 'free' ? null : ord }); fetchData(); }} onAddToOrder={handlePlaceOrder as any} onRefreshData={fetchData} salesHistory={[]} onLogout={async () => { await supabase.auth.signOut(); setIsLoggedIn(false); setIsAdmin(false); }} onSaveProduct={handleSaveProduct} onDeleteProduct={handleDeleteProduct} dbStatus={dbStatus} categories={categories} />
        ) : (
          <>
            <div className="flex overflow-x-auto gap-3 pb-8 no-scrollbar mask-fade">
              {categoryNames.map(cat => (
                <button key={cat} onClick={() => setSelectedCategory(cat)} className={`whitespace-nowrap px-7 py-3.5 rounded-2xl font-black text-xs uppercase tracking-widest transition-all shadow-lg active:scale-95 ${selectedCategory === cat ? 'bg-black text-white' : 'bg-white text-gray-700 hover:bg-gray-100 border'}`}>{cat}</button>
              ))}
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {filteredItems.map(item => <MenuItem key={item.id} product={item} onAdd={addToCart} />)}
              {filteredItems.length === 0 && <div className="col-span-full py-20 text-center text-gray-400 font-black uppercase text-xs italic">Nenhum produto encontrado.</div>}
            </div>
          </>
        )}
      </main>
      {!isAdmin && cartItems.length > 0 && (
        <div className="fixed bottom-8 left-0 right-0 flex justify-center px-6 z-40 pointer-events-none">
          <button onClick={() => setIsCartOpen(true)} className="pointer-events-auto w-full max-w-md bg-black text-white rounded-[2rem] p-5 flex items-center justify-between shadow-2xl active:scale-95 ring-4 ring-yellow-400/30">
            <div className="flex items-center gap-4">
              <div className="bg-yellow-400 text-black w-8 h-8 flex items-center justify-center rounded-xl text-sm font-black">{cartItems.reduce((a,b)=>a+b.quantity,0)}</div>
              <span className="font-black text-sm uppercase tracking-widest">Ver Sacola</span>
            </div>
            <span className="font-black text-yellow-400 text-xl italic">R$ {cartItems.reduce((a,b)=>a+(b.price*b.quantity),0).toFixed(2).replace('.', ',')}</span>
          </button>
        </div>
      )}
      {showLogin && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-6 bg-black/90 backdrop-blur-md">
          <div className="bg-white p-10 rounded-[3rem] w-full max-w-sm shadow-2xl text-center">
            <h2 className="text-3xl font-black mb-6 italic tracking-tighter">Login Admin</h2>
            <form onSubmit={e => { e.preventDefault(); setIsLoadingLogin(true); supabase.auth.signInWithPassword({ email: loginEmail, password: loginPass }).then(({ error }) => { if (error) alert('Erro: ' + error.message); else setShowLogin(false); }).finally(() => setIsLoadingLogin(false)); }} className="space-y-4">
              <input type="email" required placeholder="E-mail" value={loginEmail} onChange={e => setLoginEmail(e.target.value)} className="w-full bg-gray-50 border rounded-2xl px-6 py-4 text-sm font-bold outline-none"/>
              <input type="password" required placeholder="Senha" value={loginPass} onChange={e => setLoginPass(e.target.value)} className="w-full bg-gray-50 border rounded-2xl px-6 py-4 text-sm font-bold outline-none"/>
              <button type="submit" disabled={isLoadingLogin} className="w-full bg-yellow-400 text-black font-black py-4 rounded-2xl shadow-xl uppercase text-xs tracking-widest">{isLoadingLogin ? 'Entrando...' : 'Entrar'}</button>
              <button type="button" onClick={() => setShowLogin(false)} className="text-[10px] font-black text-gray-400 uppercase mt-4">Fechar</button>
            </form>
          </div>
        </div>
      )}
      {!isAdmin && <Cart isOpen={isCartOpen} onClose={() => setIsCartOpen(false)} items={cartItems} onUpdateQuantity={(id, d) => setCartItems(p => p.map(i => i.id === id ? {...i, quantity: Math.max(1, i.quantity + d)} : i))} onRemove={id => setCartItems(p => p.filter(i => i.id !== id))} onAdd={addToCart} onPlaceOrder={handlePlaceOrder}/>}
    </div>
  );
};

export default App;
