
import React, { useState, useMemo, useEffect, useCallback, useRef } from 'react';
import Header from './components/Header';
import MenuItem from './components/MenuItem';
import Cart from './components/Cart';
import AdminPanel from './components/AdminPanel';
import { MENU_ITEMS as STATIC_MENU, INITIAL_TABLES } from './constants';
import { Product, CartItem, Table, Order, Category, Coupon, StoreConfig } from './types';
import { supabase } from './lib/supabase';
import { CloseIcon } from './components/Icons';

const App: React.FC = () => {
  const [isAdmin, setIsAdmin] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [showLogin, setShowLogin] = useState(false);
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPass, setLoginPass] = useState('');
  const [isLoadingLogin, setIsLoadingLogin] = useState(false);
  
  const [selectedCategory, setSelectedCategory] = useState<string>('Todos');
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [isCartOpen, setIsCartOpen] = useState(false);
  
  const [tables, setTables] = useState<Table[]>(INITIAL_TABLES);
  const [menuItems, setMenuItems] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [activeCoupons, setActiveCoupons] = useState<Coupon[]>([]);
  const [audioEnabled, setAudioEnabled] = useState(true);
  const [audioUnlocked, setAudioUnlocked] = useState(false);
  const [dbStatus, setDbStatus] = useState<'loading' | 'ok' | 'error' | 'syncing'>('loading');
  const [activeAlert, setActiveAlert] = useState<{ id: number; type: string; msg: string; isUpdate?: boolean; timestamp: number } | null>(null);
  
  const [storeConfig, setStoreConfig] = useState<StoreConfig>({
    tablesEnabled: true,
    deliveryEnabled: true,
    counterEnabled: true
  });

  const notificationSound = useRef<HTMLAudioElement | null>(null);
  const lastNotifiedOrderId = useRef<string | null>(null);
  const lastNotifiedStatus = useRef<string | null>(null);

  useEffect(() => {
    notificationSound.current = new Audio('https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3');
    notificationSound.current.load();
  }, []);

  const handleUnlockAudio = useCallback(() => {
    if (!audioUnlocked && notificationSound.current) {
      notificationSound.current.play()
        .then(() => {
          notificationSound.current?.pause();
          if (notificationSound.current) notificationSound.current.currentTime = 0;
          setAudioUnlocked(true);
        })
        .catch(err => console.warn("Aguardando interação...", err));
    }
  }, [audioUnlocked]);

  const testSound = () => {
    if (notificationSound.current) {
      notificationSound.current.currentTime = 0;
      notificationSound.current.play().catch(e => alert("Clique na tela primeiro para autorizar o som!"));
    }
  };

  const fetchData = useCallback(async (isSilent = false) => {
    try {
      if (!isSilent) setDbStatus('loading');
      const [catRes, coupRes, prodRes, tableRes, configRes] = await Promise.all([
        supabase.from('categories').select('*').order('name'),
        supabase.from('coupons').select('*').eq('is_active', true),
        supabase.from('products').select('*').order('name'),
        supabase.from('tables').select('*').order('id'),
        supabase.from('store_config').select('*').maybeSingle()
      ]);

      if (configRes.data) {
        setStoreConfig({
          tablesEnabled: configRes.data.tables_enabled,
          deliveryEnabled: configRes.data.delivery_enabled,
          counterEnabled: configRes.data.counter_enabled
        });
      }

      if (catRes.data) setCategories(catRes.data);
      if (coupRes.data) setActiveCoupons(coupRes.data.map(c => ({ id: c.id, code: c.code, percentage: c.percentage, isActive: c.is_active, scopeType: c.scope_type, scopeValue: c.scope_value })));
      if (prodRes.data && prodRes.data.length > 0) setMenuItems(prodRes.data.map(p => ({ id: p.id, name: p.name, description: p.description || '', price: Number(p.price), category: p.category, image: p.image, isAvailable: p.is_available ?? true })));
      else setMenuItems(STATIC_MENU);
      
      if (tableRes.data) {
        setTables(prev => {
          const merged = [...INITIAL_TABLES];
          tableRes.data.forEach(dbT => {
            const idx = merged.findIndex(t => t.id === dbT.id);
            if (idx >= 0) merged[idx] = { id: dbT.id, status: dbT.status, currentOrder: dbT.current_order };
            else merged.push({ id: dbT.id, status: dbT.status, currentOrder: dbT.current_order });
          });
          return merged.sort((a,b) => a.id - b.id);
        });
      }
      setDbStatus('ok');
    } catch (err) { setDbStatus('error'); }
  }, []);

  useEffect(() => {
    const checkInitialSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) { setIsLoggedIn(true); setIsAdmin(true); }
      fetchData();
    };
    checkInitialSession();
  }, [fetchData]);

  useEffect(() => {
    const channel = supabase.channel('dmoreira_realtime_v9')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'tables' }, (payload) => {
        const newRec = payload.new as any;
        setTables(current => current.map(t => t.id === newRec.id ? { id: newRec.id, status: newRec.status, currentOrder: newRec.current_order } : t));

        if (newRec && newRec.status === 'occupied' && newRec.current_order) {
          const orderId = newRec.current_order.id;
          const status = newRec.current_order.status;
          const tableType = newRec.id >= 950 ? 'Balcão' : newRec.id >= 900 ? 'Entrega' : 'Mesa';

          if (orderId !== lastNotifiedOrderId.current) {
            lastNotifiedOrderId.current = orderId;
            lastNotifiedStatus.current = status;
            
            if (audioEnabled && notificationSound.current) {
              notificationSound.current.currentTime = 0;
              notificationSound.current.play().catch(() => {});
            }
            
            setActiveAlert({ id: newRec.id, type: tableType, msg: 'Novo Pedido!', timestamp: Date.now() });
            setTimeout(() => setActiveAlert(null), 10000);
          } 
          else if (status !== lastNotifiedStatus.current) {
            lastNotifiedStatus.current = status;
            const statusLabels: any = { pending: 'Pendente', preparing: 'Em Preparo', ready: 'Pronto p/ Entrega', delivered: 'Entregue' };
            setActiveAlert({ id: newRec.id, type: tableType, msg: `Status: ${statusLabels[status] || status}`, isUpdate: true, timestamp: Date.now() });
            setTimeout(() => setActiveAlert(null), 6000);
          }
        } else if (newRec && newRec.status === 'free') {
           if (lastNotifiedOrderId.current && tables.find(t => t.id === newRec.id)?.currentOrder?.id === lastNotifiedOrderId.current) {
             lastNotifiedOrderId.current = null;
             lastNotifiedStatus.current = null;
           }
        }
      })
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'store_config' }, (payload) => {
        const newCfg = payload.new as any;
        setStoreConfig({
          tablesEnabled: newCfg.tables_enabled,
          deliveryEnabled: newCfg.delivery_enabled,
          counterEnabled: newCfg.counter_enabled
        });
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [audioEnabled, tables]);

  const handlePlaceOrder = async (order: Order) => {
    let targetId = order.tableId;
    if (targetId === -900 || targetId === -950) {
      const range = targetId === -900 ? [900, 949] : [950, 999];
      const free = tables.find(t => t.id >= range[0] && t.id <= range[1] && t.status === 'free');
      targetId = free ? free.id : (Math.max(...tables.filter(t => t.id >= range[0] && t.id <= range[1]).map(t => t.id), range[0] - 1) + 1);
    }
    const { error } = await supabase.from('tables').upsert({ id: targetId, status: 'occupied', current_order: { ...order, tableId: targetId } });
    if (error) {
      alert("Erro ao enviar pedido.");
      return false;
    } else {
      setCartItems([]);
      return true;
    }
  };

  const isStoreClosed = !storeConfig.tablesEnabled && !storeConfig.deliveryEnabled && !storeConfig.counterEnabled;
  const categoryNames = useMemo(() => ['Todos', ...(categories || []).map(c => c.name)], [categories]);
  const filteredItems = useMemo(() => {
    if (isStoreClosed && !isAdmin) return [];
    return (menuItems || []).filter(i => selectedCategory === 'Todos' || i.category === selectedCategory);
  }, [menuItems, selectedCategory, isStoreClosed, isAdmin]);

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col font-sans relative" onClick={handleUnlockAudio}>
      <Header />
      {!isLoggedIn && <button onClick={() => setShowLogin(true)} className="absolute top-4 right-4 z-50 text-[10px] font-black text-black/30 bg-white/10 px-3 py-1.5 rounded-full uppercase tracking-widest backdrop-blur-sm border border-black/5">Painel</button>}

      {isAdmin && isLoggedIn && activeAlert && (
        <div key={activeAlert.timestamp} className="fixed top-6 left-1/2 -translate-x-1/2 z-[1000] w-full max-w-md px-6 animate-in slide-in-from-top duration-700">
          <div className={`${activeAlert.isUpdate ? 'bg-blue-600 border-blue-400' : 'bg-black border-yellow-400'} text-white p-5 rounded-[2.5rem] shadow-2xl border-4 flex items-center gap-5`}>
            <div className={`${activeAlert.isUpdate ? 'bg-white text-blue-600' : 'bg-yellow-400 text-black'} w-12 h-12 rounded-xl flex items-center justify-center font-black shrink-0 shadow-lg`}>
              {activeAlert.isUpdate ? '🔄' : '🔔'}
            </div>
            <div className="flex-1 font-black">
              <h4 className={`text-[10px] uppercase ${activeAlert.isUpdate ? 'text-blue-100' : 'text-yellow-400'} tracking-widest mb-0.5`}>{activeAlert.msg}</h4>
              <p className="text-lg italic uppercase tracking-tighter leading-none">{activeAlert.type} #{activeAlert.id}</p>
            </div>
            <button onClick={() => setActiveAlert(null)} className="p-2 bg-white/10 rounded-full hover:bg-white/20 transition-colors"><CloseIcon size={18}/></button>
          </div>
        </div>
      )}

      <main className="w-full max-w-6xl mx-auto px-4 sm:px-6 -mt-8 relative z-20 flex-1 pb-40">
        {isAdmin && isLoggedIn ? (
          <AdminPanel 
            tables={tables} menuItems={menuItems} categories={categories} audioEnabled={audioEnabled} onToggleAudio={() => setAudioEnabled(!audioEnabled)} onTestSound={testSound}
            onUpdateTable={async (id, status, ord) => { 
              if (status === 'free') await supabase.from('tables').update({ status: 'free', current_order: null }).eq('id', id);
              else await supabase.from('tables').upsert({ id, status, current_order: ord || null });
            }}
            onAddToOrder={(tableId, product, observation) => {
              const table = tables.find(t => t.id === tableId);
              let current = table?.currentOrder;
              const items = current ? [...(current.items || [])] : [];
              
              // Standard behavior: if observation is different, add as a new line item
              // If exactly the same, increment quantity
              const ex = items.findIndex(i => i.id === product.id && (i.observation || '') === (observation || ''));
              
              if (ex >= 0) {
                items[ex].quantity += 1;
              } else {
                items.push({ ...product, quantity: 1, observation });
              }
              
              const total = items.reduce((a, b) => a + (b.price * b.quantity), 0);
              handlePlaceOrder(current ? { ...current, items, total, finalTotal: total - (current.discount || 0) } : { id: Math.random().toString(36).substr(2, 6).toUpperCase(), customerName: tableId >= 950 ? 'Balcão' : tableId >= 900 ? 'Entrega' : `Mesa ${tableId}`, items, total, finalTotal: total, paymentMethod: 'Pendente', timestamp: new Date().toISOString(), tableId, status: 'pending', orderType: tableId >= 950 ? 'counter' : tableId >= 900 ? 'delivery' : 'table' });
            }}
            onRefreshData={() => fetchData()} onLogout={async () => { await supabase.auth.signOut(); setIsLoggedIn(false); setIsAdmin(false); }}
            onSaveProduct={async (p) => { const data = { name: p.name, price: p.price, category: p.category, description: p.description, image: p.image, is_available: p.isAvailable }; if (p.id) await supabase.from('products').update(data).eq('id', p.id); else await supabase.from('products').insert([{ id: 'p_' + Date.now(), ...data }]); fetchData(true); }}
            onDeleteProduct={async (id) => { await supabase.from('products').delete().eq('id', id); fetchData(true); }} dbStatus={dbStatus === 'loading' ? 'loading' : 'ok'}
            storeConfig={storeConfig}
            onUpdateStoreConfig={async (newCfg) => {
              setStoreConfig(newCfg);
              await supabase.from('store_config').upsert({ 
                id: 1, 
                tables_enabled: newCfg.tablesEnabled, 
                delivery_enabled: newCfg.deliveryEnabled, 
                counter_enabled: newCfg.counterEnabled 
              });
            }}
          />
        ) : (
          <>
            {isStoreClosed ? (
              <div className="bg-white rounded-[3.5rem] p-16 text-center shadow-2xl border-4 border-red-100 animate-in zoom-in duration-700 mt-20">
                <div className="w-24 h-24 bg-red-50 text-red-500 rounded-full flex items-center justify-center mx-auto mb-8 shadow-inner ring-4 ring-red-50">
                  <CloseIcon size={48} />
                </div>
                <h2 className="text-4xl font-black italic uppercase tracking-tighter mb-4">Loja Fechada</h2>
                <p className="text-gray-400 font-bold uppercase tracking-widest text-xs max-w-xs mx-auto">No momento não estamos aceitando pedidos online. Por favor, volte mais tarde!</p>
              </div>
            ) : (
              <>
                <div className="flex overflow-x-auto gap-2.5 pb-8 no-scrollbar mask-fade scroll-smooth pt-4">
                  {categoryNames.map(cat => (
                    <button key={cat} onClick={() => setSelectedCategory(cat)} className={`whitespace-nowrap px-6 py-3.5 rounded-2xl font-black text-[10px] uppercase tracking-wider transition-all shadow-sm ${selectedCategory === cat ? 'bg-black text-white' : 'bg-white text-gray-600 border border-gray-100 hover:border-black'}`}>{cat}</button>
                  ))}
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                  {filteredItems.map(item => <MenuItem key={item.id} product={item} activeCoupons={activeCoupons} onAdd={(p) => setCartItems(prev => { const ex = prev.find(i => i.id === p.id); if (ex) return prev.map(i => i.id === p.id ? {...i, quantity: i.quantity + 1} : i); return [...prev, { ...p, quantity: 1 }]; })} />)}
                </div>
              </>
            )}
          </>
        )}
      </main>

      {showLogin && (
        <div className="fixed inset-0 z-[2000] flex items-center justify-center p-6 bg-black/90 backdrop-blur-md">
          <div className="bg-white p-10 rounded-[3.5rem] w-full max-w-sm text-center animate-in zoom-in shadow-2xl">
            <h2 className="text-2xl font-black mb-8 italic uppercase tracking-tighter">Painel D.Moreira</h2>
            <form onSubmit={async (e) => {
              e.preventDefault(); setIsLoadingLogin(true);
              handleUnlockAudio();
              const { data, error } = await supabase.auth.signInWithPassword({ email: loginEmail, password: loginPass });
              if (!error && data.session) { setIsLoggedIn(true); setIsAdmin(true); setShowLogin(false); fetchData(); }
              else alert('Credenciais inválidas.');
              setIsLoadingLogin(false);
            }} className="space-y-4">
              <input type="email" placeholder="E-MAIL" value={loginEmail} onChange={e => setLoginEmail(e.target.value)} className="w-full bg-gray-50 border-2 rounded-2xl px-6 py-4 text-[10px] font-black uppercase outline-none focus:border-yellow-400 transition-all" required />
              <input type="password" placeholder="SENHA" value={loginPass} onChange={e => setLoginPass(e.target.value)} className="w-full bg-gray-50 border-2 rounded-2xl px-6 py-4 text-[10px] font-black uppercase outline-none focus:border-yellow-400 transition-all" required />
              <button type="submit" disabled={isLoadingLogin} className="w-full bg-yellow-400 text-black font-black py-5 rounded-2xl uppercase text-[10px] tracking-widest shadow-lg hover:brightness-110 active:scale-95 transition-all">
                {isLoadingLogin ? 'Acessando...' : 'Entrar'}
              </button>
              <button type="button" onClick={() => setShowLogin(false)} className="text-[10px] font-black text-gray-400 uppercase mt-2 hover:text-black transition-colors">Voltar para a Loja</button>
            </form>
          </div>
        </div>
      )}

      {!isAdmin && cartItems.length > 0 && (
        <div className="fixed bottom-8 left-0 right-0 flex justify-center px-6 z-40">
          <button onClick={() => { setIsCartOpen(true); handleUnlockAudio(); }} className="w-full max-w-md bg-black text-white rounded-[2.5rem] p-5 flex items-center justify-between shadow-2xl ring-4 ring-yellow-400/30 active:scale-95 transition-all">
            <div className="flex items-center gap-4">
              <div className="bg-yellow-400 text-black w-9 h-9 flex items-center justify-center rounded-2xl text-xs font-black">{cartItems.reduce((a,b)=>a+b.quantity,0)}</div>
              <span className="font-black text-xs uppercase tracking-widest">Ver Minha Sacola</span>
            </div>
            <span className="font-black text-yellow-400 text-xl italic">R$ {cartItems.reduce((a,b)=>a+(b.price*b.quantity),0).toFixed(2).replace('.', ',')}</span>
          </button>
        </div>
      )}
      {!isAdmin && <Cart isOpen={isCartOpen} onClose={() => setIsCartOpen(false)} items={cartItems} onUpdateQuantity={(id, d) => setCartItems(p => p.map(i => i.id === id ? {...i, quantity: Math.max(1, i.quantity + d)} : i))} onRemove={id => setCartItems(p => p.filter(i => i.id !== id))} onAdd={() => {}} onPlaceOrder={handlePlaceOrder} storeConfig={storeConfig} />}
    </div>
  );
};

export default App;
