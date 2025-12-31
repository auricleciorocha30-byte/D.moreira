
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
  const [salesHistory, setSalesHistory] = useState<Order[]>([]);
  const [menuItems, setMenuItems] = useState<Product[]>([]);
  const [dbStatus, setDbStatus] = useState<'loading' | 'ok' | 'error_tables_missing'>('loading');

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
      // Buscar Produtos
      const { data: productsData, error: pError } = await supabase.from('products').select('*');
      
      if (pError) {
        if (pError.code === '42P01') { // PostgreSQL table not found code
          setDbStatus('error_tables_missing');
          setMenuItems(STATIC_MENU); // Fallback imediato para os estáticos
          return;
        }
        throw pError;
      }

      setDbStatus('ok');

      if (productsData && productsData.length > 0) {
        setMenuItems(productsData.map(p => ({
          id: p.id,
          name: p.name,
          description: p.description || '',
          price: Number(p.price),
          category: p.category,
          image: p.image || '',
          savings: p.savings || '',
          isAvailable: p.is_available ?? true
        })));
      } else {
        // Se a tabela existe mas está vazia, usa estáticos
        setMenuItems(STATIC_MENU);
      }

      // Buscar Mesas
      const { data: tablesData } = await supabase.from('tables').select('*').order('id', { ascending: true });
      if (tablesData && tablesData.length > 0) {
        setTables(tablesData.map(t => ({
          id: t.id,
          status: t.status,
          currentOrder: t.current_order
        })));
      }

      // Buscar Vendas
      const { data: salesData } = await supabase.from('sales').select('*').order('created_at', { ascending: false }).limit(50);
      if (salesData) {
        setSalesHistory(salesData.map(s => ({
          id: s.id,
          customerName: s.customer_name,
          items: s.items,
          total: Number(s.total),
          paymentMethod: s.payment_method,
          tableId: s.table_id,
          timestamp: s.created_at,
          status: 'delivered',
          orderType: 'table'
        })));
      }
    } catch (err: any) {
      console.error('Erro geral Supabase:', err);
      // Fallback para não deixar o cardápio vazio em erro de conexão
      if (menuItems.length === 0) setMenuItems(STATIC_MENU);
    }
  }, [menuItems.length]);

  useEffect(() => {
    fetchData();
    const channel = supabase.channel('realtime-updates')
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
      if (tableData && tableData.status === 'occupied' && tableData.current_order) {
        const existingOrder = tableData.current_order;
        const mergedItems = [...existingOrder.items];
        order.items.forEach(newItem => {
          const foundIdx = mergedItems.findIndex(i => i.id === newItem.id);
          if (foundIdx > -1) mergedItems[foundIdx].quantity += newItem.quantity;
          else mergedItems.push(newItem);
        });
        finalOrder = { 
          ...existingOrder, 
          items: mergedItems, 
          total: mergedItems.reduce((acc, item) => acc + (item.price * item.quantity), 0), 
          timestamp: new Date().toISOString(), 
          isUpdated: true 
        };
      }
      const { error } = await supabase.from('tables').update({ status: 'occupied', current_order: finalOrder }).eq('id', order.tableId);
      if (error) throw error;
      setCartItems([]);
    } catch (err: any) {
      alert('Erro ao enviar pedido: Verifique se as tabelas foram criadas no Supabase.');
    }
  };

  const updateTable = async (tableId: number, status: 'free' | 'occupied', order: Order | null = null) => {
    try {
      if (status === 'free') {
        const table = tables.find(t => t.id === tableId);
        if (table?.currentOrder) {
          await supabase.from('sales').insert([{ 
            customer_name: table.currentOrder.customerName, 
            items: table.currentOrder.items, 
            total: table.currentOrder.total, 
            payment_method: table.currentOrder.paymentMethod, 
            table_id: tableId 
          }]);
        }
        await supabase.from('tables').update({ status: 'free', current_order: null }).eq('id', tableId);
      } else {
        await supabase.from('tables').update({ status: 'occupied', current_order: order }).eq('id', tableId);
      }
    } catch (err) {
      console.error('Erro atualização mesa:', err);
    }
  };

  const handleSaveProduct = async (product: Partial<Product>) => {
    if (!product.name || !product.price || !product.category) {
      alert('Dados incompletos.');
      return;
    }

    const payload = {
      name: product.name,
      description: product.description || '',
      price: Number(product.price),
      category: product.category,
      image: product.image || '',
      savings: product.savings || '',
      is_available: product.isAvailable ?? true
    };

    try {
      if (!product.id) {
        const newId = 'prod_' + Math.random().toString(36).substr(2, 9);
        const { error } = await supabase.from('products').insert([{ ...payload, id: newId }]);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('products').update(payload).eq('id', product.id);
        if (error) throw error;
      }
      fetchData();
    } catch (err: any) {
      console.error('Erro save product:', err);
      alert('Erro: Verifique se a tabela "products" existe no Supabase.');
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
        {dbStatus === 'error_tables_missing' && isAdmin && isLoggedIn && (
          <div className="bg-red-500 text-white p-6 rounded-[2rem] mb-8 shadow-2xl flex flex-col md:flex-row items-center justify-between gap-4 border-4 border-white animate-bounce">
            <div>
              <p className="font-black text-lg uppercase tracking-tight">Tabelas não encontradas!</p>
              <p className="text-xs opacity-90 font-bold">Você precisa configurar o SQL Schema no seu painel Supabase.</p>
            </div>
            <button onClick={() => fetchData()} className="bg-white text-red-500 px-6 py-3 rounded-xl font-black text-[10px] uppercase shadow-lg hover:scale-105 transition-transform">Verificar Novamente</button>
          </div>
        )}

        {isAdmin && isLoggedIn ? (
          <AdminPanel 
            tables={tables} 
            menuItems={menuItems}
            onUpdateTable={updateTable} 
            onAddToOrder={(tableId, p) => handlePlaceOrder({ id: 'ADMIN', customerName: 'Admin', items: [{ ...p, quantity: 1 }], total: p.price, paymentMethod: 'Pix', timestamp: new Date(), tableId, orderType: 'table', status: 'pending' })} 
            onRefreshData={fetchData} 
            salesHistory={salesHistory} 
            onLogout={handleLogout}
            onSaveProduct={handleSaveProduct}
            dbStatus={dbStatus}
          />
        ) : (
          <>
            <div className="flex overflow-x-auto gap-3 pb-8 no-scrollbar mask-fade scroll-smooth">
              {categories.map(cat => (
                <button key={cat} onClick={() => setSelectedCategory(cat)} className={`whitespace-nowrap px-7 py-3.5 rounded-2xl font-black text-xs uppercase tracking-widest transition-all shadow-lg active:scale-95 ${selectedCategory === cat ? 'bg-black text-white' : 'bg-white text-gray-700 hover:bg-gray-100 border border-gray-100'}`}>{cat}</button>
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
          <button onClick={() => window.open(`https://wa.me/${STORE_INFO.whatsapp}`, '_blank')} className="pointer-events-auto bg-green-500 text-white rounded-full px-6 py-3 flex items-center gap-3 shadow-2xl hover:bg-green-600 transition-all active:scale-95 ring-4 ring-white"><span className="font-black text-xs uppercase tracking-widest">Suporte WhatsApp</span></button>
          {cartItems.length > 0 && (
            <button onClick={() => setIsCartOpen(true)} className="pointer-events-auto w-full max-md bg-black text-white rounded-[2rem] p-5 flex items-center justify-between shadow-2xl active:scale-95 ring-4 ring-yellow-400/30 transition-all">
              <div className="flex items-center gap-4">
                <div className="bg-yellow-400 text-black w-8 h-8 flex items-center justify-center rounded-xl text-sm font-black shadow-inner">{cartItems.reduce((a,b)=>a+b.quantity,0)}</div>
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
            <h2 className="text-3xl font-black mb-2 italic tracking-tighter">Acesso Admin</h2>
            <form onSubmit={e => {
              e.preventDefault();
              setIsLoadingLogin(true);
              supabase.auth.signInWithPassword({ email: loginEmail, password: loginPass })
                .then(({ error }) => {
                  if (error) alert('Falha: ' + error.message);
                  else { setShowLogin(false); setLoginPass(''); setLoginEmail(''); }
                })
                .finally(() => setIsLoadingLogin(false));
            }} className="space-y-4">
              <input type="email" required placeholder="E-mail" value={loginEmail} onChange={e => setLoginEmail(e.target.value)} className="w-full bg-gray-50 border rounded-2xl px-6 py-4 text-sm font-bold outline-none"/>
              <input type="password" required placeholder="Senha" value={loginPass} onChange={e => setLoginPass(e.target.value)} className="w-full bg-gray-50 border rounded-2xl px-6 py-4 text-sm font-bold outline-none"/>
              <button type="submit" disabled={isLoadingLogin} className="w-full bg-yellow-400 text-black font-black py-4 rounded-2xl shadow-xl uppercase text-xs tracking-widest">{isLoadingLogin ? 'Entrando...' : 'Entrar'}</button>
              <button type="button" onClick={() => setShowLogin(false)} className="text-[10px] font-black text-gray-400 uppercase tracking-widest mt-4">Voltar</button>
            </form>
          </div>
        </div>
      )}
      
      {!isAdmin && <Cart isOpen={isCartOpen} onClose={() => setIsCartOpen(false)} items={cartItems} onUpdateQuantity={(id, d) => setCartItems(p => p.map(i => i.id === id ? {...i, quantity: Math.max(1, i.quantity + d)} : i))} onRemove={id => setCartItems(p => p.filter(i => i.id !== id))} onAdd={addToCart} onPlaceOrder={handlePlaceOrder}/>}
    </div>
  );
};

export default App;
