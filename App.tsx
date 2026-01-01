
import React, { useState, useMemo, useEffect, useCallback } from 'react';
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

  const [selectedCategory, setSelectedCategory] = useState<CategoryType | 'Todos'>('Todos');
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [isCartOpen, setIsCartOpen] = useState(false);
  
  const [tables, setTables] = useState<Table[]>(INITIAL_TABLES);
  const [menuItems, setMenuItems] = useState<Product[]>([]);
  const [dbStatus, setDbStatus] = useState<'loading' | 'ok' | 'error_tables_missing'>('loading');

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
        setMenuItems(productsData.map(p => ({
          id: p.id,
          name: p.name,
          description: p.description || '',
          price: Number(p.price),
          category: p.category,
          image: p.image || 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=400&h=300&fit=crop',
          savings: p.savings || '',
          isAvailable: p.is_available ?? true 
        })));
      } else {
        setMenuItems(STATIC_MENU);
      }

      const { data: tablesData } = await supabase.from('tables').select('*').order('id', { ascending: true });
      if (tablesData) {
        setTables(prev => {
          const merged = [...INITIAL_TABLES];
          tablesData.forEach(dbTable => {
            const idx = merged.findIndex(t => t.id === dbTable.id);
            if (idx > -1) merged[idx] = { id: dbTable.id, status: dbTable.status, currentOrder: dbTable.current_order };
            else merged.push({ id: dbTable.id, status: dbTable.status, currentOrder: dbTable.current_order });
          });
          return merged;
        });
      }
    } catch (err) {
      console.error(err);
    }
  }, []);

  useEffect(() => {
    fetchData();
    const channel = supabase.channel('conv-realtime')
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
      const { data: tableData } = await supabase.from('tables').select('current_order, status').eq('id', order.tableId).single();
      let finalOrder = order;
      if (tableData?.status === 'occupied' && tableData.current_order) {
        const existing = tableData.current_order;
        const mergedItems = [...existing.items];
        order.items.forEach(newItem => {
          const found = mergedItems.findIndex(i => i.id === newItem.id);
          if (found > -1) mergedItems[found].quantity += newItem.quantity;
          else mergedItems.push(newItem);
        });
        finalOrder = { ...existing, items: mergedItems, total: mergedItems.reduce((acc, i) => acc + (i.price * i.quantity), 0), timestamp: new Date().toISOString() };
      }
      await supabase.from('tables').upsert({ id: order.tableId, status: 'occupied', current_order: finalOrder });
      setCartItems([]);
    } catch (err) { alert('Erro ao processar pedido.'); }
  };

  const handleSaveProduct = async (product: Partial<Product>) => {
    // UI Otimista
    setMenuItems(prev => {
      if (!product.id) return prev;
      return prev.map(i => i.id === product.id ? { ...i, ...product } as Product : i);
    });

    const payload = {
      name: product.name,
      description: product.description,
      price: product.price,
      category: product.category,
      image: product.image,
      is_available: product.isAvailable
    };

    try {
      if (!product.id) {
        const newId = 'prod_' + Date.now();
        await supabase.from('products').insert([{ ...payload, id: newId }]);
      } else {
        await supabase.from('products').update(payload).eq('id', product.id);
      }
      fetchData(); // Sincroniza tudo
    } catch (err) { alert('Erro ao salvar produto.'); fetchData(); }
  };

  const categories: (CategoryType | 'Todos')[] = ['Todos', 'Combos', 'Cafeteria', 'Lanches', 'Bebidas', 'Conveniência'];
  const filteredItems = menuItems.filter(item => selectedCategory === 'Todos' || item.category === selectedCategory);

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col font-sans antialiased relative">
      <Header />
      <button onClick={() => setShowLogin(true)} className="absolute top-4 right-4 z-50 text-[10px] font-black text-black/30 hover:text-black uppercase tracking-widest transition-colors">Admin</button>
      
      <main className="w-full max-w-6xl mx-auto px-4 sm:px-6 -mt-8 relative z-20 flex-1 pb-40">
        {isAdmin && isLoggedIn ? (
          <AdminPanel 
            tables={tables} 
            menuItems={menuItems}
            onUpdateTable={async (id, status, ord) => { await supabase.from('tables').upsert({ id, status, current_order: ord }); fetchData(); }}
            onAddToOrder={handlePlaceOrder as any}
            onRefreshData={fetchData} 
            salesHistory={[]} 
            onLogout={() => { setIsLoggedIn(false); setIsAdmin(false); }}
            onSaveProduct={handleSaveProduct}
            dbStatus={dbStatus}
          />
        ) : (
          <>
            <div className="flex overflow-x-auto gap-3 pb-8 no-scrollbar mask-fade scroll-smooth">
              {categories.map(cat => (
                <button key={cat} onClick={() => setSelectedCategory(cat)} className={`whitespace-nowrap px-7 py-3.5 rounded-2xl font-black text-xs uppercase tracking-widest transition-all shadow-lg ${selectedCategory === cat ? 'bg-black text-white' : 'bg-white text-gray-700 hover:bg-gray-100 border'}`}>{cat}</button>
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
          <button onClick={() => window.open(`https://wa.me/${STORE_INFO.whatsapp}`, '_blank')} className="pointer-events-auto bg-green-500 text-white rounded-full px-6 py-3 flex items-center gap-3 shadow-2xl hover:bg-green-600 ring-4 ring-white"><span className="font-black text-xs uppercase tracking-widest">WhatsApp Suporte</span></button>
          {cartItems.length > 0 && (
            <button onClick={() => setIsCartOpen(true)} className="pointer-events-auto w-full max-w-md bg-black text-white rounded-[2rem] p-5 flex items-center justify-between shadow-2xl active:scale-95 ring-4 ring-yellow-400/30">
              <div className="flex items-center gap-4">
                <div className="bg-yellow-400 text-black w-8 h-8 flex items-center justify-center rounded-xl text-sm font-black">{cartItems.reduce((a,b)=>a+b.quantity,0)}</div>
                <span className="font-black text-sm uppercase tracking-widest">Ver Pedido</span>
              </div>
              <span className="font-black text-yellow-400 text-xl">R$ {cartItems.reduce((a,b)=>a+(b.price*b.quantity),0).toFixed(2).replace('.', ',')}</span>
            </button>
          )}
        </div>
      )}

      {showLogin && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-6 bg-black/90 backdrop-blur-md">
          <div className="bg-white p-10 rounded-[3rem] w-full max-w-sm shadow-2xl text-center">
            <h2 className="text-3xl font-black mb-6 italic">Admin D.Moreira</h2>
            <form onSubmit={e => {
              e.preventDefault();
              setIsLoadingLogin(true);
              // Para fins de teste, se você ainda não tem auth no Supabase, deixei simplificado
              // Se tiver auth, use supabase.auth.signInWithPassword
              if (loginPass === 'admin123') { setIsLoggedIn(true); setIsAdmin(true); setShowLogin(false); }
              else alert('Senha incorreta (padrão: admin123)');
              setIsLoadingLogin(false);
            }} className="space-y-4">
              <input type="password" required placeholder="Senha de Acesso" value={loginPass} onChange={e => setLoginPass(e.target.value)} className="w-full bg-gray-50 border rounded-2xl px-6 py-4 text-sm font-bold outline-none"/>
              <button type="submit" disabled={isLoadingLogin} className="w-full bg-yellow-400 text-black font-black py-4 rounded-2xl shadow-xl uppercase text-xs tracking-widest">Entrar</button>
              <button type="button" onClick={() => setShowLogin(false)} className="text-[10px] font-black text-gray-400 uppercase mt-4">Voltar</button>
            </form>
          </div>
        </div>
      )}
      
      {!isAdmin && <Cart isOpen={isCartOpen} onClose={() => setIsCartOpen(false)} items={cartItems} onUpdateQuantity={(id, d) => setCartItems(p => p.map(i => i.id === id ? {...i, quantity: Math.max(1, i.quantity + d)} : i))} onRemove={id => setCartItems(p => p.filter(i => i.id !== id))} onAdd={addToCart} onPlaceOrder={handlePlaceOrder}/>}
    </div>
  );
};

export default App;
