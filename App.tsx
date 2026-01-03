
import React, { useState, useMemo, useEffect, useCallback, useRef } from 'react';
import Header from './components/Header';
import MenuItem from './components/MenuItem';
import Cart from './components/Cart';
import AdminPanel from './components/AdminPanel';
import { MENU_ITEMS as STATIC_MENU, INITIAL_TABLES } from './constants';
import { Product, CartItem, Table, Order, Category, Coupon } from './types';
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
  const [newOrderAlert, setNewOrderAlert] = useState<{ id: number; type: string } | null>(null);

  const notificationSound = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    // Som de notificação mais robusto e curto
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
          console.log("🔊 Áudio desbloqueado com sucesso!");
        })
        .catch(err => console.warn("Aguardando interação para áudio...", err));
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
      
      const [catRes, coupRes, prodRes, tableRes] = await Promise.all([
        supabase.from('categories').select('*').order('name'),
        supabase.from('coupons').select('*').eq('is_active', true),
        supabase.from('products').select('*').order('name'),
        supabase.from('tables').select('*').order('id')
      ]);

      if (catRes.data) setCategories(catRes.data);
      if (coupRes.data) {
        setActiveCoupons(coupRes.data.map(c => ({
          id: c.id, code: c.code, percentage: c.percentage, isActive: c.is_active,
          scopeType: c.scope_type, scopeValue: c.scope_value
        })));
      }

      if (prodRes.data && prodRes.data.length > 0) {
        setMenuItems(prodRes.data.map(p => ({
          id: p.id, name: p.name, description: p.description || '', price: Number(p.price),
          category: p.category, image: p.image, isAvailable: p.is_available ?? true
        })));
      } else {
        setMenuItems(STATIC_MENU);
      }

      if (tableRes.data) {
        setTables(prev => {
          const merged = [...INITIAL_TABLES];
          tableRes.data.forEach(dbT => {
            const idx = merged.findIndex(t => t.id === dbT.id);
            const tableObj = { id: dbT.id, status: dbT.status, currentOrder: dbT.current_order };
            if (idx >= 0) merged[idx] = tableObj;
            else merged.push(tableObj);
          });
          return merged.sort((a,b) => a.id - b.id);
        });
      }
      setDbStatus('ok');
    } catch (err) {
      console.error("Fetch error:", err);
      setDbStatus('error');
    }
  }, []);

  useEffect(() => {
    const checkInitialSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        setIsLoggedIn(true);
        setIsAdmin(true);
      }
      fetchData();
    };
    checkInitialSession();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (session) {
        setIsLoggedIn(true);
        setIsAdmin(true);
      } else if (event === 'SIGNED_OUT') {
        setIsLoggedIn(false);
        setIsAdmin(false);
      }
    });

    return () => subscription.unsubscribe();
  }, [fetchData]);

  // MOTOR REALTIME MASTER V5 - SOM E SINCRONIZAÇÃO
  useEffect(() => {
    const channel = supabase.channel('dmoreira_master_v5')
      .on('postgres_changes', 
        { event: '*', schema: 'public', table: 'tables' }, 
        (payload) => {
          const newRec = payload.new as any;
          const oldRec = payload.old as any;

          // Atualização de Estado
          setTables(current => {
            const exists = current.some(t => t.id === newRec.id);
            const updatedTable: Table = {
              id: newRec.id,
              status: newRec.status,
              currentOrder: newRec.current_order
            };

            if (exists) {
              return current.map(t => t.id === newRec.id ? updatedTable : t);
            } else {
              return [...current, updatedTable].sort((a, b) => a.id - b.id);
            }
          });

          // DISPARO DE SOM: Só toca se o status mudou de 'free' para 'occupied'
          if (newRec && newRec.status === 'occupied') {
            const wasFree = !oldRec || oldRec.status === 'free';
            if (wasFree) {
              console.log("🔔 NOVO PEDIDO DETECTADO!");
              if (audioEnabled && notificationSound.current) {
                notificationSound.current.currentTime = 0;
                notificationSound.current.play().catch(e => console.error("Falha ao tocar som. Precisa de clique.", e));
              }
              setNewOrderAlert({ 
                id: newRec.id, 
                type: newRec.id >= 950 ? 'Balcão' : newRec.id >= 900 ? 'Entrega' : 'Mesa' 
              });
              setTimeout(() => setNewOrderAlert(null), 15000);
            }
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [audioEnabled]);

  const handlePlaceOrder = async (order: Order) => {
    let targetId = order.tableId;
    if (targetId === -900 || targetId === -950) {
      const range = targetId === -900 ? [900, 949] : [950, 999];
      const free = tables.find(t => t.id >= range[0] && t.id <= range[1] && t.status === 'free');
      targetId = free ? free.id : (Math.max(...tables.filter(t => t.id >= range[0] && t.id <= range[1]).map(t => t.id), range[0] - 1) + 1);
    }
    
    const { error } = await supabase.from('tables').upsert({ 
      id: targetId, 
      status: 'occupied', 
      current_order: { ...order, tableId: targetId } 
    });
    
    if (error) {
      alert("Erro ao enviar pedido.");
    } else {
      setCartItems([]);
      setIsCartOpen(false);
    }
  };

  const categoryNames = useMemo(() => ['Todos', ...(categories || []).map(c => c.name)], [categories]);
  const filteredItems = useMemo(() => (menuItems || []).filter(i => selectedCategory === 'Todos' || i.category === selectedCategory), [menuItems, selectedCategory]);

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col font-sans relative" onClick={handleUnlockAudio}>
      <Header />
      
      {!isLoggedIn && (
        <button onClick={() => setShowLogin(true)} className="absolute top-4 right-4 z-50 text-[10px] font-black text-black/30 bg-white/10 px-3 py-1.5 rounded-full uppercase tracking-widest backdrop-blur-sm border border-black/5 hover:bg-white/20 transition-all">Painel</button>
      )}

      {isAdmin && isLoggedIn && newOrderAlert && (
        <div className="fixed top-6 left-1/2 -translate-x-1/2 z-[1000] w-full max-w-md px-6 animate-in slide-in-from-top duration-700">
          <div className="bg-black text-white p-6 rounded-[3rem] shadow-[0_30px_60px_-12px_rgba(0,0,0,0.5)] border-4 border-yellow-400 flex items-center gap-5 ring-8 ring-black/10">
            <div className="bg-yellow-400 text-black w-14 h-14 rounded-2xl flex items-center justify-center font-black animate-bounce shrink-0">
              <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" /></svg>
            </div>
            <div className="flex-1 font-black">
              <h4 className="text-[10px] uppercase text-yellow-400 tracking-[0.3em] mb-1">Novo Pedido!</h4>
              <p className="text-xl italic uppercase tracking-tighter leading-none">{newOrderAlert.type} #{newOrderAlert.id}</p>
            </div>
            <button onClick={() => setNewOrderAlert(null)} className="p-3 bg-white/10 hover:bg-white/20 rounded-full active:scale-90 transition-all"><CloseIcon size={20}/></button>
          </div>
        </div>
      )}

      <main className="w-full max-w-6xl mx-auto px-4 sm:px-6 -mt-8 relative z-20 flex-1 pb-40">
        {isAdmin && isLoggedIn ? (
          <AdminPanel 
            tables={tables} menuItems={menuItems} categories={categories}
            audioEnabled={audioEnabled} onToggleAudio={() => setAudioEnabled(!audioEnabled)}
            onTestSound={testSound}
            onUpdateTable={async (id, status, ord) => { 
              if (status === 'free') await supabase.from('tables').update({ status: 'free', current_order: null }).eq('id', id);
              else await supabase.from('tables').upsert({ id, status, current_order: ord || null });
            }}
            onAddToOrder={(tableId, product) => {
              const table = (tables || []).find(t => t.id === tableId);
              let current = table?.currentOrder;
              const items = current ? [...(current.items || [])] : [];
              const ex = items.findIndex(i => i.id === product.id);
              if (ex >= 0) items[ex].quantity += 1; else items.push({ ...product, quantity: 1 });
              const total = items.reduce((a, b) => a + (b.price * b.quantity), 0);
              const newOrd: Order = current ? { ...current, items, total, finalTotal: total - (current.discount || 0) } : {
                id: Math.random().toString(36).substr(2, 6).toUpperCase(),
                customerName: tableId >= 950 ? 'Balcão' : tableId >= 900 ? 'Entrega' : `Mesa ${tableId}`,
                items, total, finalTotal: total, paymentMethod: 'Pendente',
                timestamp: new Date().toISOString(), tableId, status: 'pending',
                orderType: tableId >= 950 ? 'counter' : tableId >= 900 ? 'delivery' : 'table'
              };
              handlePlaceOrder(newOrd);
            }}
            onRefreshData={() => fetchData()} 
            onLogout={async () => { await supabase.auth.signOut(); setIsLoggedIn(false); setIsAdmin(false); }}
            onSaveProduct={async (p) => { 
              const data = { name: p.name, price: p.price, category: p.category, description: p.description, image: p.image, is_available: p.isAvailable };
              if (p.id) await supabase.from('products').update(data).eq('id', p.id);
              else await supabase.from('products').insert([{ id: 'p_' + Date.now(), ...data }]);
              fetchData(true);
            }}
            onDeleteProduct={async (id) => { await supabase.from('products').delete().eq('id', id); fetchData(true); }}
            dbStatus={dbStatus === 'loading' ? 'loading' : 'ok'}
          />
        ) : (
          <>
            <div className="flex overflow-x-auto gap-2.5 pb-8 no-scrollbar mask-fade scroll-smooth pt-4">
              {categoryNames.map(cat => (
                <button key={cat} onClick={() => setSelectedCategory(cat)} className={`whitespace-nowrap px-6 py-3.5 rounded-2xl font-black text-[10px] uppercase tracking-wider transition-all shadow-sm ${selectedCategory === cat ? 'bg-black text-white' : 'bg-white text-gray-600 border border-gray-100 hover:border-black'}`}>{cat}</button>
              ))}
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 animate-in fade-in duration-700">
              {filteredItems.map(item => (
                <MenuItem key={item.id} product={item} activeCoupons={activeCoupons} onAdd={(p) => setCartItems(prev => {
                  const ex = prev.find(i => i.id === p.id);
                  if (ex) return prev.map(i => i.id === p.id ? {...i, quantity: i.quantity + 1} : i);
                  return [...prev, { ...p, quantity: 1 }];
                })} />
              ))}
            </div>
          </>
        )}
      </main>

      {showLogin && (
        <div className="fixed inset-0 z-[2000] flex items-center justify-center p-6 bg-black/90 backdrop-blur-md">
          <div className="bg-white p-10 rounded-[3.5rem] w-full max-sm text-center shadow-2xl animate-in zoom-in duration-300">
            <h2 className="text-2xl font-black mb-8 italic uppercase tracking-tighter">Painel D.Moreira</h2>
            <form onSubmit={async (e) => {
              e.preventDefault(); setIsLoadingLogin(true);
              handleUnlockAudio();
              const { data, error } = await supabase.auth.signInWithPassword({ email: loginEmail, password: loginPass });
              if (!error && data.session) { 
                setIsLoggedIn(true); setIsAdmin(true); setShowLogin(false);
                fetchData();
              }
              else alert('Credenciais inválidas.');
              setIsLoadingLogin(false);
            }} className="space-y-4">
              <input type="email" placeholder="E-MAIL DE ACESSO" value={loginEmail} onChange={e => setLoginEmail(e.target.value)} className="w-full bg-gray-50 border-2 rounded-2xl px-6 py-4 text-[10px] font-black outline-none focus:border-yellow-400 transition-all uppercase" required />
              <input type="password" placeholder="SENHA" value={loginPass} onChange={e => setLoginPass(e.target.value)} className="w-full bg-gray-50 border-2 rounded-2xl px-6 py-4 text-[10px] font-black outline-none focus:border-yellow-400 transition-all uppercase" required />
              <button type="submit" disabled={isLoadingLogin} className="w-full bg-yellow-400 text-black font-black py-5 rounded-2xl uppercase text-[10px] tracking-widest shadow-xl hover:brightness-110 active:scale-95 transition-all">
                {isLoadingLogin ? 'Autenticando...' : 'Acessar Painel'}
              </button>
              <button type="button" onClick={() => setShowLogin(false)} className="text-[10px] font-black text-gray-400 uppercase mt-4">Voltar</button>
            </form>
          </div>
        </div>
      )}

      {!isAdmin && cartItems.length > 0 && (
        <div className="fixed bottom-8 left-0 right-0 flex justify-center px-6 z-40 animate-in slide-in-from-bottom duration-500">
          <button onClick={() => { setIsCartOpen(true); handleUnlockAudio(); }} className="w-full max-w-md bg-black text-white rounded-[2.5rem] p-5 flex items-center justify-between shadow-2xl ring-4 ring-yellow-400/30 active:scale-95 transition-all">
            <div className="flex items-center gap-4">
              <div className="bg-yellow-400 text-black w-9 h-9 flex items-center justify-center rounded-2xl text-xs font-black">{cartItems.reduce((a,b)=>a+b.quantity,0)}</div>
              <span className="font-black text-xs uppercase tracking-widest">Ver Minha Sacola</span>
            </div>
            <span className="font-black text-yellow-400 text-xl italic">R$ {cartItems.reduce((a,b)=>a+(b.price*b.quantity),0).toFixed(2).replace('.', ',')}</span>
          </button>
        </div>
      )}

      {!isAdmin && <Cart isOpen={isCartOpen} onClose={() => setIsCartOpen(false)} items={cartItems} onUpdateQuantity={(id, d) => setCartItems(p => p.map(i => i.id === id ? {...i, quantity: Math.max(1, i.quantity + d)} : i))} onRemove={id => setCartItems(p => p.filter(i => i.id !== id))} onAdd={() => {}} onPlaceOrder={handlePlaceOrder}/>}
    </div>
  );
};

export default App;
