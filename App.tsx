
import React, { useState, useMemo, useEffect, useCallback, useRef } from 'react';
import Header from './components/Header';
import MenuItem from './components/MenuItem';
import Cart from './components/Cart';
import AdminPanel from './components/AdminPanel';
import { MENU_ITEMS as STATIC_MENU, INITIAL_TABLES } from './constants';
import { Product, CartItem, Table, Order, Category, Coupon } from './types';
import { supabase } from './lib/supabase';
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
  const [activeCoupons, setActiveCoupons] = useState<Coupon[]>([]);
  const [dbStatus, setDbStatus] = useState<'loading' | 'ok' | 'error_tables_missing'>('loading');

  const notificationSound = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    notificationSound.current = new Audio('https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3');
    notificationSound.current.load();
  }, []);

  const playNotification = useCallback(() => {
    if (audioEnabled && notificationSound.current) {
      notificationSound.current.currentTime = 0;
      notificationSound.current.play().catch(e => console.warn("Interação necessária para áudio:", e));
    }
  }, [audioEnabled]);

  const fetchData = useCallback(async () => {
    try {
      const { data: catData } = await supabase.from('categories').select('*').order('name');
      if (catData && catData.length > 0) setCategories(catData);
      else setCategories(DEFAULT_CATEGORIES);

      const { data: couponsData } = await supabase.from('coupons').select('*').eq('isActive', true);
      if (couponsData) setActiveCoupons(couponsData);

      const { data: prodData } = await supabase.from('products').select('*').order('name');
      if (prodData && prodData.length > 0) {
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

      const { data: tData } = await supabase.from('tables').select('*').order('id');
      if (tData && tData.length > 0) {
        // Combinamos as mesas do banco com a estrutura inicial para garantir que IDs como 1, 2, 3... sempre existam visualmente
        setTables(prev => {
          return prev.map(p => {
            const dbT = tData.find(dt => dt.id === p.id);
            if (dbT) return { id: dbT.id, status: dbT.status, currentOrder: dbT.current_order };
            return p;
          });
        });
      }
    } catch (err) {
      console.error("Fetch error:", err);
    }
  }, []);

  // Monitor de Novos Pedidos (Som e Alerta)
  useEffect(() => {
    if (!isAdmin || !isLoggedIn) return;

    // Monitoramos qualquer mudança na tabela tables para disparar o som e atualizar a UI
    const channel = supabase.channel('order_monitor')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'tables' }, payload => {
        const newTable = payload.new as any;
        const oldTable = payload.old as any;
        
        // Se mudou de livre para ocupado OU se é um novo registro já ocupado
        if (newTable.status === 'occupied' && (!oldTable || oldTable.status === 'free')) {
          playNotification();
          setNewOrderAlert({ 
            id: newTable.id, 
            type: newTable.id >= 950 ? 'counter' : newTable.id >= 900 ? 'delivery' : 'table' 
          });
          setTimeout(() => setNewOrderAlert(null), 10000);
        }
        fetchData(); // Atualiza a lista sempre que houver mudança
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [isAdmin, isLoggedIn, playNotification, fetchData]);

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

    // Sincronização geral em tempo real
    const channel = supabase.channel('realtime_sync')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'products' }, fetchData)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'categories' }, fetchData)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'coupons' }, fetchData)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'tables' }, fetchData) // ADICIONADO: Sincronia de mesas
      .subscribe();

    return () => { 
      subscription.unsubscribe(); 
      supabase.removeChannel(channel); 
    };
  }, [fetchData]);

  const handlePlaceOrder = async (input: any) => {
    let targetTableId = input.tableId;
    
    if (targetTableId === -900 || targetTableId === -950) {
      const rangeStart = targetTableId === -900 ? 900 : 950;
      const rangeEnd = targetTableId === -900 ? 949 : 999;
      const freeSlot = tables.find(t => t.id >= rangeStart && t.id <= rangeEnd && t.status === 'free');
      if (freeSlot) targetTableId = freeSlot.id;
      else targetTableId = (Math.max(...tables.filter(t => t.id >= rangeStart && t.id <= rangeEnd).map(t => t.id), rangeStart - 1) + 1);
    }

    const { data: current } = await supabase.from('tables').select('current_order, status').eq('id', targetTableId).maybeSingle();
    const newItems: CartItem[] = input.items ? input.items : [{ ...input, quantity: 1 }];
    let finalOrder: Order;
    
    if (current?.status === 'occupied' && current.current_order) {
      const existingItems = Array.isArray(current.current_order.items) ? [...current.current_order.items] : [];
      newItems.forEach((newItem) => {
        const index = existingItems.findIndex(item => item.id === newItem.id);
        if (index > -1) existingItems[index].quantity += newItem.quantity;
        else existingItems.push(newItem);
      });
      const total = existingItems.reduce((acc, item) => acc + (Number(item.price) * item.quantity), 0);
      const discount = current.current_order.discount || 0;
      finalOrder = { ...current.current_order, items: existingItems, total: total, finalTotal: total - discount, isUpdated: true };
    } else {
      const total = newItems.reduce((acc, item) => acc + (Number(item.price) * item.quantity), 0);
      const discount = input.discount || 0;
      const finalTotal = total - discount;
      finalOrder = { 
        id: input.id && input.items ? input.id : Math.random().toString(36).substr(2, 6).toUpperCase(),
        customerName: input.customerName || 'Cliente',
        customerPhone: input.customerPhone || '',
        items: newItems,
        total: total,
        discount: discount,
        finalTotal: finalTotal,
        paymentMethod: input.paymentMethod || 'Pendente',
        timestamp: new Date().toISOString(),
        tableId: targetTableId,
        orderType: input.orderType || (targetTableId >= 950 ? 'counter' : targetTableId >= 900 ? 'delivery' : 'table'),
        status: 'pending',
        isUpdated: true,
        address: input.address,
        couponCode: input.couponCode
      };
    }

    await supabase.from('tables').upsert({ id: targetTableId, status: 'occupied', current_order: finalOrder });
    if (input.items) { setCartItems([]); setIsCartOpen(false); }
    fetchData();
  };

  const handleLogout = async () => {
    setIsLoggedIn(false); setIsAdmin(false); await supabase.auth.signOut();
  };

  const categoryNames = useMemo(() => ['Todos', ...categories.map(c => c.name)], [categories]);
  const filteredItems = useMemo(() => menuItems.filter(i => selectedCategory === 'Todos' || i.category === selectedCategory), [menuItems, selectedCategory]);

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col font-sans antialiased relative">
      <Header />
      {!isLoggedIn && (
        <button onClick={() => setShowLogin(true)} className="absolute top-4 right-4 z-50 text-[10px] font-black text-black/30 hover:text-black bg-white/10 px-3 py-1.5 rounded-full uppercase tracking-widest transition-colors backdrop-blur-sm border border-black/5">Admin</button>
      )}

      <main className="w-full max-w-6xl mx-auto px-4 sm:px-6 -mt-8 relative z-20 flex-1 pb-40">
        {isAdmin && isLoggedIn ? (
          <div className="relative">
            {newOrderAlert && (
              <div className="fixed top-24 left-1/2 -translate-x-1/2 z-[300] w-full max-w-md px-6 animate-in slide-in-from-top duration-700">
                <div className="bg-black text-white p-6 rounded-[2.5rem] shadow-2xl border-4 border-yellow-400 flex items-center gap-5">
                  <div className="bg-yellow-400 text-black w-12 h-12 rounded-2xl flex items-center justify-center font-black text-xl animate-bounce">!</div>
                  <div className="flex-1"><h4 className="font-black text-[9px] uppercase text-yellow-400 mb-1">Novo Pedido</h4><p className="text-lg font-black italic">#{newOrderAlert.id}</p></div>
                  <button onClick={() => setNewOrderAlert(null)} className="p-2 bg-white/10 rounded-full"><CloseIcon size={18}/></button>
                </div>
              </div>
            )}
            <AdminPanel tables={tables} menuItems={menuItems} categories={categories} audioEnabled={audioEnabled} onToggleAudio={() => setAudioEnabled(!audioEnabled)} onUpdateTable={async (id, status, ord) => { await supabase.from('tables').upsert({ id, status, current_order: ord || null }); fetchData(); }} onAddToOrder={(tableId, product) => handlePlaceOrder({ ...product, tableId })} onRefreshData={fetchData} onLogout={handleLogout} onSaveProduct={async (p) => {
              const productData = { name: p.name, price: p.price, category: p.category, description: p.description, image: p.image, is_available: p.isAvailable };
              if (p.id) await supabase.from('products').update(productData).eq('id', p.id);
              else await supabase.from('products').insert([{ id: 'p_' + Date.now(), ...productData }]);
              fetchData();
            }} onDeleteProduct={async (id) => { await supabase.from('products').delete().eq('id', id); fetchData(); }} dbStatus={dbStatus} />
          </div>
        ) : (
          <>
            <div className="flex overflow-x-auto gap-2.5 pb-8 no-scrollbar mask-fade scroll-smooth">
              {categoryNames.map(cat => (
                <button key={cat} onClick={() => setSelectedCategory(cat)} className={`whitespace-nowrap px-6 py-3.5 rounded-2xl font-black text-[10px] uppercase tracking-wider transition-all shadow-sm ${selectedCategory === cat ? 'bg-black text-white' : 'bg-white text-gray-600 border border-gray-100 hover:border-black'}`}>{cat}</button>
              ))}
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 animate-in fade-in duration-700">
              {filteredItems.map(item => (
                <MenuItem 
                  key={item.id} 
                  product={item} 
                  activeCoupons={activeCoupons}
                  onAdd={(p) => setCartItems(prev => {
                    const ex = prev.find(i => i.id === p.id);
                    if (ex) return prev.map(i => i.id === p.id ? {...i, quantity: i.quantity + 1} : i);
                    return [...prev, { ...p, quantity: 1 }];
                  })} 
                />
              ))}
            </div>
          </>
        )}
      </main>

      {!isAdmin && cartItems.length > 0 && (
        <div className="fixed bottom-8 left-0 right-0 flex justify-center px-6 z-40 animate-in slide-in-from-bottom duration-500">
          <button onClick={() => setIsCartOpen(true)} className="w-full max-w-md bg-black text-white rounded-[2.5rem] p-5 flex items-center justify-between shadow-2xl ring-4 ring-yellow-400/30 active:scale-95 transition-all">
            <div className="flex items-center gap-4">
              <div className="bg-yellow-400 text-black w-9 h-9 flex items-center justify-center rounded-2xl text-xs font-black">{cartItems.reduce((a,b)=>a+b.quantity,0)}</div>
              <span className="font-black text-xs uppercase tracking-widest">Ver Pedido</span>
            </div>
            <span className="font-black text-yellow-400 text-xl italic">R$ {cartItems.reduce((a,b)=>a+(b.price*b.quantity),0).toFixed(2).replace('.', ',')}</span>
          </button>
        </div>
      )}

      {showLogin && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-6 bg-black/90 backdrop-blur-md">
          <div className="bg-white p-12 rounded-[3.5rem] w-full max-w-sm text-center shadow-2xl">
            <h2 className="text-3xl font-black mb-8 italic uppercase tracking-tighter">Acesso Admin</h2>
            <form onSubmit={async (e) => {
              e.preventDefault(); setIsLoadingLogin(true);
              const { error } = await supabase.auth.signInWithPassword({ email: loginEmail, password: loginPass });
              if (error) alert('Falha: ' + error.message);
              else setShowLogin(false);
              setIsLoadingLogin(false);
            }} className="space-y-4">
              <input type="email" placeholder="E-MAIL" value={loginEmail} onChange={e => setLoginEmail(e.target.value)} className="w-full bg-gray-50 border-2 border-transparent focus:border-yellow-400 rounded-2xl px-6 py-4 text-[10px] font-black outline-none transition-all" required />
              <input type="password" placeholder="SENHA" value={loginPass} onChange={e => setLoginPass(e.target.value)} className="w-full bg-gray-50 border-2 border-transparent focus:border-yellow-400 rounded-2xl px-6 py-4 text-[10px] font-black outline-none transition-all" required />
              <button type="submit" disabled={isLoadingLogin} className="w-full bg-yellow-400 text-black font-black py-5 rounded-2xl uppercase text-[10px] tracking-widest shadow-xl hover:brightness-110 active:scale-95 transition-all">{isLoadingLogin ? 'Entrando...' : 'Acessar'}</button>
              <button type="button" onClick={() => setShowLogin(false)} className="text-[10px] font-black text-gray-400 uppercase mt-6 hover:text-gray-600">Cancelar</button>
            </form>
          </div>
        </div>
      )}

      {!isAdmin && <Cart isOpen={isCartOpen} onClose={() => setIsCartOpen(false)} items={cartItems} onUpdateQuantity={(id, d) => setCartItems(p => p.map(i => i.id === id ? {...i, quantity: Math.max(1, i.quantity + d)} : i))} onRemove={id => setCartItems(p => p.filter(i => i.id !== id))} onAdd={() => {}} onPlaceOrder={handlePlaceOrder}/>}
    </div>
  );
};

export default App;
