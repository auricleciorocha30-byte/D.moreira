
import React, { useState, useMemo, useEffect, useCallback, useRef } from 'react';
import Header from './components/Header';
import MenuItem from './components/MenuItem';
import Cart from './components/Cart';
import AdminPanel from './components/AdminPanel';
import { MENU_ITEMS as STATIC_MENU, INITIAL_TABLES } from './constants';
import { Product, CartItem, Table, Order, Category } from './types';
import { supabase } from './lib/supabase';

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
  }, []);

  const playNotification = useCallback(() => {
    if (audioEnabled && notificationSound.current) {
      notificationSound.current.currentTime = 0;
      notificationSound.current.play().catch(() => {});
    }
  }, [audioEnabled]);

  const fetchData = useCallback(async () => {
    try {
      // 1. Buscar Categorias com Fallback
      const { data: catData, error: cError } = await supabase.from('categories').select('*').order('name');
      if (cError) {
        console.warn("Categorias não encontradas no banco, usando padrão.");
        if (cError.code === '42P01') setDbStatus('error_tables_missing');
      } else if (catData && catData.length > 0) {
        setCategories(catData);
        setDbStatus('ok');
      }

      // 2. Buscar Produtos
      const { data: prodData, error: pError } = await supabase.from('products').select('*').order('name');
      if (pError) {
         setMenuItems(STATIC_MENU);
      } else if (prodData && prodData.length > 0) {
        setMenuItems(prodData.map(p => ({
          id: p.id,
          name: p.name,
          description: p.description || '',
          price: Number(p.price),
          category: p.category,
          image: p.image || 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=400&h=300&fit=crop',
          isAvailable: p.is_available ?? true
        })));
      } else {
        setMenuItems(STATIC_MENU);
      }

      // 3. Buscar Mesas
      const { data: tData } = await supabase.from('tables').select('*').order('id');
      if (tData) {
        setTables(prev => {
          const updated = [...INITIAL_TABLES];
          let alertNew = false;
          tData.forEach(dbT => {
            const idx = updated.findIndex(u => u.id === dbT.id);
            if (idx > -1) {
              const prevT = prev.find(p => p.id === dbT.id);
              if (dbT.status === 'occupied' && prevT?.status === 'free') alertNew = true;
              updated[idx] = { id: dbT.id, status: dbT.status, currentOrder: dbT.current_order };
            }
          });
          if (alertNew && isAdmin) playNotification();
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

    const channel = supabase.channel('master_sync')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'products' }, fetchData)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'categories' }, fetchData)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'tables' }, fetchData)
      .subscribe();

    return () => { subscription.unsubscribe(); supabase.removeChannel(channel); };
  }, [fetchData]);

  const handlePlaceOrder = async (order: any) => {
    let targetTableId = order.tableId;
    let productToAdd = order.id ? order : null;
    
    const { data: current } = await supabase.from('tables').select('current_order, status').eq('id', targetTableId).single();
    
    let finalOrder: Order;
    
    if (current?.status === 'occupied' && current.current_order) {
      const items = [...current.current_order.items];
      
      if (productToAdd && !order.items) {
        const i = items.findIndex(ei => ei.id === productToAdd.id);
        if (i > -1) items[i].quantity += 1;
        else items.push({ ...productToAdd, quantity: 1 });
      } 
      else if (order.items) {
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
      if (productToAdd && !order.items) {
        finalOrder = {
          id: Math.random().toString(36).substr(2, 6).toUpperCase(),
          customerName: 'Balcão/Mesa',
          items: [{ ...productToAdd, quantity: 1 }],
          total: productToAdd.price,
          paymentMethod: 'Pendente',
          timestamp: new Date().toISOString(),
          tableId: targetTableId,
          orderType: targetTableId >= 900 ? 'counter' : 'table',
          status: 'preparing',
          isUpdated: true
        };
      } else {
        finalOrder = { ...order, isUpdated: true };
      }
    }

    await supabase.from('tables').update({ status: 'occupied', current_order: finalOrder }).eq('id', targetTableId);
    setCartItems([]);
    setIsCartOpen(false);
    fetchData();
  };

  const categoryNames = useMemo(() => ['Todos', ...categories.map(c => c.name)], [categories]);
  const filteredItems = useMemo(() => menuItems.filter(i => selectedCategory === 'Todos' || i.category === selectedCategory), [menuItems, selectedCategory]);

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col font-sans antialiased relative">
      <Header />
      {!isLoggedIn && (
        <button onClick={() => setShowLogin(true)} className="absolute top-4 right-4 z-50 text-[9px] font-black text-black/30 hover:text-black uppercase tracking-widest">Admin</button>
      )}

      <main className="w-full max-w-6xl mx-auto px-4 sm:px-6 -mt-8 relative z-20 flex-1 pb-40">
        {isAdmin && isLoggedIn ? (
          <AdminPanel 
            tables={tables} 
            menuItems={menuItems} 
            categories={categories}
            audioEnabled={audioEnabled} 
            onToggleAudio={() => setAudioEnabled(!audioEnabled)} 
            onUpdateTable={async (id, status, ord) => { await supabase.from('tables').update({ status, current_order: ord || null }).eq('id', id); fetchData(); }} 
            onAddToOrder={(tableId, product) => handlePlaceOrder({ ...product, tableId })}
            onRefreshData={fetchData} 
            onLogout={() => supabase.auth.signOut()} 
            onSaveProduct={async (p) => {
              const productData = { name: p.name, price: p.price, category: p.category, description: p.description, image: p.image, is_available: p.isAvailable };
              if (p.id) await supabase.from('products').update(productData).eq('id', p.id);
              else await supabase.from('products').insert([{ id: 'p_' + Date.now(), ...productData }]);
              fetchData();
            }} 
            onDeleteProduct={async (id) => { await supabase.from('products').delete().eq('id', id); fetchData(); }} 
            dbStatus={dbStatus} 
          />
        ) : (
          <>
            <div className="flex overflow-x-auto gap-3 pb-8 no-scrollbar mask-fade">
              {categoryNames.map(cat => (
                <button key={cat} onClick={() => setSelectedCategory(cat)} className={`whitespace-nowrap px-7 py-3.5 rounded-2xl font-black text-xs uppercase tracking-widest transition-all shadow-md ${selectedCategory === cat ? 'bg-black text-white' : 'bg-white text-gray-700 border hover:border-black'}`}>{cat}</button>
              ))}
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
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
        <div className="fixed bottom-8 left-0 right-0 flex justify-center px-6 z-40">
          <button onClick={() => setIsCartOpen(true)} className="w-full max-w-md bg-black text-white rounded-[2rem] p-5 flex items-center justify-between shadow-2xl ring-4 ring-yellow-400/30 active:scale-95 transition-all">
            <div className="flex items-center gap-4">
              <div className="bg-yellow-400 text-black w-8 h-8 flex items-center justify-center rounded-xl text-sm font-black">{cartItems.reduce((a,b)=>a+b.quantity,0)}</div>
              <span className="font-black text-sm uppercase tracking-widest">Sacola D.Moreira</span>
            </div>
            <span className="font-black text-yellow-400 text-xl italic">R$ {cartItems.reduce((a,b)=>a+(b.price*b.quantity),0).toFixed(2).replace('.', ',')}</span>
          </button>
        </div>
      )}

      {showLogin && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-6 bg-black/90 backdrop-blur-md">
          <div className="bg-white p-10 rounded-[3rem] w-full max-w-sm text-center shadow-2xl">
            <h2 className="text-3xl font-black mb-6 italic">Acesso Restrito</h2>
            <form onSubmit={async (e) => {
              e.preventDefault();
              setIsLoadingLogin(true);
              const { error } = await supabase.auth.signInWithPassword({ email: loginEmail, password: loginPass });
              if (error) alert('Acesso Negado: ' + error.message);
              else setShowLogin(false);
              setIsLoadingLogin(false);
            }} className="space-y-4">
              <input type="email" placeholder="E-mail" value={loginEmail} onChange={e => setLoginEmail(e.target.value)} className="w-full bg-gray-50 border-2 rounded-2xl px-6 py-4 text-sm font-bold text-black outline-none focus:border-yellow-400" required />
              <input type="password" placeholder="Senha" value={loginPass} onChange={e => setLoginPass(e.target.value)} className="w-full bg-gray-50 border-2 rounded-2xl px-6 py-4 text-sm font-bold text-black outline-none focus:border-yellow-400" required />
              <button type="submit" disabled={isLoadingLogin} className="w-full bg-yellow-400 text-black font-black py-5 rounded-2xl uppercase text-xs tracking-widest shadow-xl hover:brightness-110 active:scale-95 transition-all">{isLoadingLogin ? 'Verificando...' : 'Entrar'}</button>
              <button type="button" onClick={() => setShowLogin(false)} className="text-[10px] font-black text-gray-400 uppercase mt-4">Voltar ao Cardápio</button>
            </form>
          </div>
        </div>
      )}

      {!isAdmin && <Cart isOpen={isCartOpen} onClose={() => setIsCartOpen(false)} items={cartItems} onUpdateQuantity={(id, d) => setCartItems(p => p.map(i => i.id === id ? {...i, quantity: Math.max(1, i.quantity + d)} : i))} onRemove={id => setCartItems(p => p.filter(i => i.id !== id))} onAdd={() => {}} onPlaceOrder={handlePlaceOrder}/>}
    </div>
  );
};

export default App;
