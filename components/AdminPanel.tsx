
import React, { useState, useMemo, useEffect } from 'react';
import { Table, Order, Product, Category, Coupon, LoyaltyConfig, LoyaltyUser, OrderStatus, OrderType } from '../types';
import { CloseIcon, TrashIcon, VolumeIcon, PrinterIcon, EditIcon } from './Icons';
import { supabase } from '../lib/supabase';
import { STORE_INFO } from '../constants';

interface AdminPanelProps {
  tables: Table[];
  menuItems: Product[];
  categories: Category[];
  audioEnabled: boolean;
  onToggleAudio: () => void;
  onUpdateTable: (tableId: number, status: 'free' | 'occupied', order?: Order | null) => void;
  onAddToOrder: (tableId: number, product: Product) => void;
  onRefreshData: () => void;
  onLogout: () => void;
  onSaveProduct: (product: Partial<Product>) => void;
  onDeleteProduct: (id: string) => void;
  dbStatus: 'loading' | 'ok';
}

const STATUS_CFG: Record<string, any> = {
  'pending': { label: 'Pendente', color: 'text-orange-600', bg: 'bg-orange-100' },
  'preparing': { label: 'Preparando', color: 'text-blue-600', bg: 'bg-blue-100' },
  'ready': { label: 'Pronto', color: 'text-green-600', bg: 'bg-green-100' },
  'delivered': { label: 'Entregue', color: 'text-gray-400', bg: 'bg-gray-50' }
};

const AdminPanel: React.FC<AdminPanelProps> = ({ 
  tables = [], menuItems = [], categories = [], audioEnabled, onToggleAudio, 
  onUpdateTable, onRefreshData, onLogout, onSaveProduct, onDeleteProduct, dbStatus, onAddToOrder 
}) => {
  const [activeTab, setActiveTab] = useState<'tables' | 'delivery' | 'menu' | 'marketing'>('tables');
  const [selectedTableId, setSelectedTableId] = useState<number | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  
  // Modais
  const [isProductModalOpen, setIsProductModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<any | null>(null);
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [isNewOrderModalOpen, setIsNewOrderModalOpen] = useState(false);
  
  // Novo Pedido Manual
  const [newOrderForm, setNewOrderForm] = useState({
    customerName: '', customerPhone: '', type: 'delivery' as 'delivery' | 'takeaway', address: '', paymentMethod: 'Pix'
  });
  
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [loyalty, setLoyalty] = useState<LoyaltyConfig>({ isActive: false, spendingGoal: 100, scopeType: 'all', scopeValue: '' });
  const [loyaltyUsers, setLoyaltyUsers] = useState<LoyaltyUser[]>([]);

  // Estado para novo cupom
  const [newCouponForm, setNewCouponForm] = useState({ code: '', percentage: '', scopeType: 'all' as 'all' | 'category' | 'product', scopeValue: '' });

  useEffect(() => { fetchMarketing(); }, []);

  const fetchMarketing = async () => {
    try {
      const { data: cData } = await supabase.from('coupons').select('*').order('created_at', { ascending: false });
      if (cData) setCoupons(cData.map(c => ({ id: c.id, code: c.code, percentage: c.percentage, isActive: c.is_active, scopeType: c.scope_type, scopeValue: c.scope_value })));
      const { data: lConfig } = await supabase.from('loyalty_config').select('*').maybeSingle();
      if (lConfig) setLoyalty({ isActive: lConfig.is_active, spendingGoal: lConfig.spending_goal, scopeType: lConfig.scope_type, scopeValue: lConfig.scope_value || '' });
      const { data: lUsers } = await supabase.from('loyalty_users').select('*').order('accumulated', { ascending: false });
      if (lUsers) setLoyaltyUsers(lUsers);
    } catch (e) { console.error("Marketing error", e); }
  };

  const handleUpdateLoyalty = async (updates: Partial<LoyaltyConfig>) => {
    const next = { ...loyalty, ...updates };
    setLoyalty(next);
    await supabase.from('loyalty_config').upsert({ id: 1, is_active: next.isActive, spending_goal: next.spendingGoal, scope_type: next.scopeType, scope_value: next.scopeValue });
    fetchMarketing();
  };

  const handleAddCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCategoryName.trim()) return;
    const { error } = await supabase.from('categories').insert([{ id: 'cat_' + Date.now(), name: newCategoryName.trim() }]);
    if (!error) { setNewCategoryName(''); setIsCategoryModalOpen(false); onRefreshData(); }
  };

  const handleDeleteCategory = async (id: string) => {
    if (!confirm('Excluir categoria?')) return;
    await supabase.from('categories').delete().eq('id', id);
    onRefreshData();
  };

  const handleCreateNewOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newOrderForm.customerName) return alert('Informe o nome');
    const range = newOrderForm.type === 'delivery' ? [900, 949] : [950, 999];
    const free = (tables || []).find(t => t.id >= range[0] && t.id <= range[1] && t.status === 'free');
    if (!free) return alert('Sem mesas disponíveis.');

    const newOrder: Order = {
      id: Math.random().toString(36).substr(2, 6).toUpperCase(), customerName: newOrderForm.customerName, customerPhone: newOrderForm.customerPhone || undefined,
      items: [], total: 0, finalTotal: 0, paymentMethod: newOrderForm.paymentMethod, timestamp: new Date().toISOString(), tableId: free.id,
      status: 'pending', orderType: newOrderForm.type === 'takeaway' ? 'counter' : 'delivery', address: newOrderForm.type === 'delivery' ? newOrderForm.address : undefined
    };

    await supabase.from('tables').upsert({ id: free.id, status: 'occupied', current_order: newOrder });
    setIsNewOrderModalOpen(false);
    setNewOrderForm({ customerName: '', customerPhone: '', type: 'delivery', address: '', paymentMethod: 'Pix' });
    onRefreshData();
    setSelectedTableId(free.id);
  };

  const handleCreateCoupon = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCouponForm.code || !newCouponForm.percentage) return;
    await supabase.from('coupons').insert([{ id: 'c_'+Date.now(), code: newCouponForm.code.toUpperCase(), percentage: Number(newCouponForm.percentage), is_active: true, scope_type: newCouponForm.scopeType, scope_value: newCouponForm.scopeValue }]); 
    setNewCouponForm({ code: '', percentage: '', scopeType: 'all', scopeValue: '' });
    fetchMarketing();
  };

  const handlePrint = (order: Order) => {
    if (!order) return;
    const w = window.open('', '_blank'); if (!w) return;
    const items = (order.items || []).map(i => `<div style="display:flex;justify-content:space-between;margin-bottom:4px;font-size:12px;"><span>${i.quantity}x ${i.name}</span><span>R$ ${(i.price*i.quantity).toFixed(2)}</span></div>`).join('');
    w.document.write(`<html><body style="font-family:monospace;width:280px;padding:10px;"><h2 style="text-align:center;">${STORE_INFO.name}</h2><p style="text-align:center;">Pedido #${order.id}</p><hr/>${items}<hr/><div style="display:flex;justify-content:space-between;font-weight:bold;"><span>TOTAL:</span><span>R$ ${(order.finalTotal || 0).toFixed(2)}</span></div><script>window.onload=()=>{window.print();window.close();};</script></body></html>`);
    w.document.close();
  };

  const physicalTables = (tables || []).filter(t => t.id <= 12).sort((a,b) => a.id - b.id);
  const activeDeliveries = (tables || []).filter(t => t.id >= 900 && t.id <= 999 && t.status === 'occupied');
  const selectedTable = (tables || []).find(t => t.id === selectedTableId) || null;
  const filteredMenu = (menuItems || []).filter(i => i.name.toLowerCase().includes(searchTerm.toLowerCase()));

  return (
    <div className="w-full">
      <div className="bg-black p-6 rounded-[2.5rem] shadow-2xl mb-8 border-b-4 border-yellow-400 flex flex-col md:flex-row justify-between items-center gap-6">
        <div className="flex items-center gap-6">
          <div>
            <h2 className="text-2xl font-black italic text-yellow-400 uppercase tracking-tighter leading-none">{STORE_INFO.name}</h2>
            <p className="text-[9px] text-gray-500 uppercase font-black tracking-widest mt-1">Painel Admin</p>
          </div>
          <div className="h-10 w-[1px] bg-gray-800 hidden md:block"></div>
          {/* AUTO SYNC INDICATOR */}
          <div className="flex items-center gap-3 bg-gray-900 px-4 py-2.5 rounded-2xl border border-gray-800">
            <div className="relative flex h-3 w-3">
              <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${dbStatus === 'ok' ? 'bg-green-400' : 'bg-yellow-400'}`}></span>
              <span className={`relative inline-flex rounded-full h-3 w-3 ${dbStatus === 'ok' ? 'bg-green-500' : 'bg-yellow-500'}`}></span>
            </div>
            <span className="text-[9px] font-black uppercase text-white tracking-widest">Auto Sync On</span>
          </div>
        </div>

        <nav className="flex bg-gray-900 p-1.5 rounded-2xl gap-1">
          {(['tables', 'delivery', 'menu', 'marketing'] as const).map(tab => (
            <button key={tab} onClick={() => setActiveTab(tab)} className={`px-5 py-3 rounded-xl text-[9px] font-black uppercase transition-all ${activeTab === tab ? 'bg-yellow-400 text-black shadow-lg scale-105' : 'text-gray-500 hover:text-white'}`}>
              {tab === 'tables' ? 'Mesas' : tab === 'delivery' ? 'Externo' : tab === 'menu' ? 'Menu' : 'Fidelidade'}
            </button>
          ))}
        </nav>
        
        <div className="flex gap-4">
          <button onClick={onToggleAudio} className={`p-4 rounded-full transition-all ${audioEnabled ? 'bg-yellow-400 text-black shadow-lg ring-4 ring-yellow-400/20' : 'bg-gray-800 text-gray-600'}`}>
            <VolumeIcon muted={!audioEnabled} size={20}/>
          </button>
          <button onClick={onLogout} className="bg-red-600 text-white font-black text-[10px] uppercase px-6 py-4 rounded-2xl shadow-xl active:scale-95 transition-all">Sair</button>
        </div>
      </div>

      <div className="animate-in fade-in duration-500">
        {activeTab === 'tables' && (
          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-5">
            {physicalTables.map(t => (
              <button key={t.id} onClick={() => setSelectedTableId(t.id)} className={`h-48 p-6 rounded-[2.5rem] border-2 transition-all flex flex-col items-center justify-center gap-2 relative ${t.status === 'free' ? 'bg-white border-gray-100 hover:border-yellow-400' : 'bg-yellow-400 border-black shadow-xl ring-4 ring-yellow-400/20 active:scale-95'}`}>
                {t.currentOrder?.status === 'pending' && <span className="absolute -top-2 -right-2 bg-red-600 text-white text-[8px] font-black px-4 py-2 rounded-2xl animate-bounce shadow-lg border-2 border-white">NOVO</span>}
                <span className="text-5xl font-black italic text-black">{t.id}</span>
                <span className={`text-[8px] font-black uppercase px-2 py-0.5 rounded-full ${t.status === 'free' ? 'bg-gray-100 text-gray-400' : 'bg-black text-white'}`}>{t.status === 'free' ? 'Livre' : 'Ocupada'}</span>
                {t.currentOrder && <span className="text-[11px] font-black mt-2 italic bg-white/40 px-2 py-0.5 rounded">R$ {(Number(t.currentOrder.finalTotal) || 0).toFixed(2)}</span>}
              </button>
            ))}
          </div>
        )}

        {activeTab === 'delivery' && (
          <div className="space-y-6">
            <div className="flex justify-between items-center bg-white p-6 rounded-[2.5rem] shadow-sm border border-gray-100">
              <h3 className="text-xl font-black italic uppercase text-gray-400">Entrega e Balcão</h3>
              <button onClick={() => setIsNewOrderModalOpen(true)} className="bg-black text-yellow-400 px-8 py-4 rounded-2xl font-black text-[10px] uppercase shadow-xl hover:brightness-110 active:scale-95 transition-all">+ Novo Pedido</button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {activeDeliveries.length > 0 ? activeDeliveries.map(t => (
                <button key={t.id} onClick={() => setSelectedTableId(t.id)} className={`bg-white border-2 p-6 rounded-[3rem] shadow-xl text-left hover:brightness-105 transition-all relative overflow-hidden group ${t.id >= 950 ? 'border-purple-400 ring-purple-50' : 'border-orange-400 ring-orange-50'}`}>
                  <div className={`absolute top-0 right-0 px-4 py-2 text-[8px] font-black uppercase ${t.id >= 950 ? 'bg-purple-600 text-white' : 'bg-orange-600 text-white'}`}>
                    {t.id >= 950 ? 'Balcão' : 'Entrega'}
                  </div>
                  <div className="flex justify-between items-start mb-4">
                    <span className="text-2xl group-hover:scale-125 transition-transform">{t.id >= 950 ? '🏪' : '🚚'}</span>
                    <span className="bg-gray-100 text-[9px] font-black px-2 py-1 rounded-full uppercase">#{t.id}</span>
                  </div>
                  <h4 className="font-black text-sm uppercase truncate leading-tight mb-1">{t.currentOrder?.customerName || 'Cliente'}</h4>
                  <div className="bg-gray-50 p-3 rounded-2xl mb-4 h-12 overflow-hidden border border-gray-100">
                    <p className="text-[9px] text-gray-600 font-bold leading-tight line-clamp-2 italic">
                      {t.id < 950 ? (t.currentOrder?.address || 'Sem endereço') : 'Aguardando retirada'}
                    </p>
                  </div>
                  <div className={`${STATUS_CFG[t.currentOrder?.status || 'pending'].bg} ${STATUS_CFG[t.currentOrder?.status || 'pending'].color} text-[8px] font-black px-3 py-1.5 rounded-full inline-block uppercase`}>
                    {STATUS_CFG[t.currentOrder?.status || 'pending'].label}
                  </div>
                </button>
              )) : <div className="col-span-full py-20 text-center opacity-30 font-black uppercase text-xs">Aguardando novos pedidos...</div>}
            </div>
          </div>
        )}

        {activeTab === 'menu' && (
          <div className="space-y-8">
            <div className="bg-white p-8 rounded-[3rem] shadow-xl border border-gray-50">
              <div className="flex flex-col md:flex-row justify-between items-center mb-10 gap-6">
                <h3 className="text-2xl font-black italic uppercase">Categorias</h3>
                <button onClick={() => setIsCategoryModalOpen(true)} className="bg-yellow-400 text-black px-8 py-4 rounded-2xl font-black text-[10px] uppercase shadow-lg hover:brightness-110 active:scale-95 transition-all">+ Nova Categoria</button>
              </div>
              <div className="flex flex-wrap gap-3">
                {categories?.map(cat => (
                  <div key={cat.id} className="bg-gray-50 px-6 py-4 rounded-2xl border flex items-center gap-4 group hover:border-black transition-colors">
                    <span className="font-black text-[10px] uppercase tracking-wider">{cat.name}</span>
                    <button onClick={() => handleDeleteCategory(cat.id)} className="text-red-400 hover:text-red-600 transition-colors opacity-0 group-hover:opacity-100">
                      <TrashIcon size={14}/>
                    </button>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-white p-8 rounded-[3rem] shadow-xl border border-gray-50">
              <div className="flex flex-col md:flex-row justify-between items-center mb-10 gap-6">
                <h3 className="text-2xl font-black italic uppercase">Produtos</h3>
                <div className="flex gap-4 w-full md:w-auto">
                  <input type="text" value={searchTerm} onChange={e => setSearchTerm(e.target.value)} placeholder="BUSCAR..." className="flex-1 md:w-64 bg-gray-50 border-2 rounded-2xl px-6 py-4 text-xs font-black outline-none focus:border-yellow-400 transition-all" />
                  <button onClick={() => { setEditingProduct({ name: '', price: '', category: (categories?.[0]?.name || ''), image: '', isAvailable: true }); setIsProductModalOpen(true); }} className="bg-black text-yellow-400 px-8 py-4 rounded-2xl font-black text-[10px] uppercase shadow-xl active:scale-95 transition-all">+ Novo Produto</button>
                </div>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-5 gap-6">
                {filteredMenu?.map(item => (
                  <div key={item.id} className="bg-gray-50 p-4 rounded-[2.5rem] border hover:border-yellow-400 transition-all group">
                    <div className="overflow-hidden rounded-3xl mb-4 aspect-square">
                      <img src={item.image} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" />
                    </div>
                    <h4 className="font-black text-[10px] uppercase truncate">{item.name}</h4>
                    <div className="flex justify-between items-center mt-2">
                      <span className="text-yellow-700 font-black italic text-xs">R$ {(item.price || 0).toFixed(2)}</span>
                      <div className="flex gap-1">
                        <button onClick={() => { setEditingProduct(item); setIsProductModalOpen(true); }} className="p-2 bg-white text-blue-500 rounded-xl shadow-sm hover:scale-110 transition-all"><EditIcon size={14}/></button>
                        <button onClick={() => onDeleteProduct(item.id)} className="p-2 bg-white text-red-500 rounded-xl shadow-sm hover:scale-110 transition-all"><TrashIcon size={14}/></button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'marketing' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <div className="bg-white p-8 rounded-[3rem] shadow-xl border border-gray-100 flex flex-col">
              <div className="flex justify-between items-center mb-8"><h3 className="text-xl font-black italic uppercase">💎 Fidelidade</h3><button onClick={() => handleUpdateLoyalty({ isActive: !loyalty.isActive })} className={`px-6 py-3 rounded-2xl font-black text-[10px] uppercase transition-all shadow-sm ${loyalty.isActive ? 'bg-green-600 text-white' : 'bg-gray-200 text-gray-400'}`}>{loyalty.isActive ? 'Ativo' : 'Pausado'}</button></div>
              <div className="bg-yellow-50 p-6 rounded-[2.5rem] border-2 border-yellow-100 mb-8 space-y-4">
                 <div className="grid grid-cols-1 gap-4">
                    <div className="space-y-1"><p className="text-[8px] font-black uppercase text-yellow-800 ml-1">Meta Acumulada R$</p><input type="number" value={loyalty.spendingGoal} onChange={e => handleUpdateLoyalty({ spendingGoal: Number(e.target.value) })} className="w-full bg-white p-4 rounded-xl border-2 border-yellow-200 font-black text-sm outline-none" /></div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-1"><p className="text-[8px] font-black uppercase text-yellow-800 ml-1">Filtro</p><select value={loyalty.scopeType} onChange={e => handleUpdateLoyalty({ scopeType: e.target.value as any, scopeValue: '' })} className="w-full bg-white p-4 rounded-xl border-2 border-yellow-200 font-black text-[10px] uppercase outline-none"><option value="all">Loja Toda</option><option value="category">Por Categoria</option><option value="product">Por Produto</option></select></div>
                      {loyalty.scopeType !== 'all' && (
                        <div className="space-y-1"><p className="text-[8px] font-black uppercase text-yellow-800 ml-1">Seleção</p>
                          <select value={loyalty.scopeValue} onChange={e => handleUpdateLoyalty({ scopeValue: e.target.value })} className="w-full bg-white p-4 rounded-xl border-2 border-yellow-200 font-black text-[10px] uppercase outline-none">
                            <option value="">Selecione...</option>
                            {loyalty.scopeType === 'category' ? categories?.map(c => <option key={c.id} value={c.name}>{c.name}</option>) : menuItems?.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                          </select>
                        </div>
                      )}
                    </div>
                 </div>
              </div>
              <div className="flex-1 space-y-3 overflow-y-auto max-h-80 no-scrollbar">
                {loyaltyUsers?.map((u, i) => (
                  <div key={u.phone} className="flex justify-between items-center p-5 bg-gray-50 rounded-2xl border-l-8 border-yellow-400 shadow-sm"><div className="flex items-center gap-4"><span className="w-6 h-6 bg-black text-yellow-400 rounded-full flex items-center justify-center text-[10px] font-black">{i+1}</span><div><p className="font-black text-xs uppercase">{u.name}</p><p className="text-[9px] text-gray-400 font-bold">{u.phone}</p></div></div><span className="text-yellow-700 font-black italic text-xs">R$ {(u.accumulated || 0).toFixed(2)}</span></div>
                ))}
              </div>
            </div>

            <div className="bg-white p-8 rounded-[3rem] shadow-xl border border-gray-100 flex flex-col">
              <h3 className="text-xl font-black italic uppercase mb-8">🎫 Cupons</h3>
              <form onSubmit={handleCreateCoupon} className="grid grid-cols-2 gap-4 mb-8 bg-gray-50 p-6 rounded-[2.5rem] border border-gray-100">
                <input value={newCouponForm.code} onChange={e => setNewCouponForm({...newCouponForm, code: e.target.value})} placeholder="CÓDIGO" className="bg-white p-4 rounded-xl font-black text-xs uppercase outline-none shadow-sm" required />
                <input value={newCouponForm.percentage} onChange={e => setNewCouponForm({...newCouponForm, percentage: e.target.value})} type="number" placeholder="% OFF" className="bg-white p-4 rounded-xl font-black text-xs outline-none shadow-sm" required />
                <div className="col-span-2"><button type="submit" className="w-full bg-black text-yellow-400 py-4 rounded-xl font-black text-[10px] uppercase shadow-lg hover:brightness-125 active:scale-95 transition-all">Criar Cupom</button></div>
              </form>
              <div className="flex-1 space-y-3 overflow-y-auto max-h-80 no-scrollbar">
                {coupons?.map(c => (
                  <div key={c.id} className="flex justify-between items-center p-5 bg-gray-50 rounded-2xl border border-gray-100 group">
                    <div>
                      <span className="font-black text-sm">{c.code}</span>
                      <span className="bg-yellow-400 text-black px-2 py-0.5 rounded text-[10px] font-black ml-2">{c.percentage}%</span>
                      <p className="text-[8px] font-black uppercase text-gray-400 mt-1">{c.scopeType === 'all' ? 'Toda Loja' : c.scopeValue}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <button onClick={async () => { await supabase.from('coupons').update({ is_active: !c.isActive }).eq('id', c.id); fetchMarketing(); }} className={`px-4 py-2 rounded-xl text-[9px] font-black uppercase ${c.isActive ? 'bg-green-500 text-white' : 'bg-gray-300 text-gray-500'}`}>{c.isActive ? 'On' : 'Off'}</button>
                      <button onClick={async () => { if(confirm('Excluir?')) { await supabase.from('coupons').delete().eq('id', c.id); fetchMarketing(); } }} className="p-2 bg-white text-red-400 rounded-xl shadow-sm opacity-0 group-hover:opacity-100 transition-opacity"><TrashIcon size={14}/></button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Modal Detalhes do Pedido */}
      {selectedTable && (
        <div className="fixed inset-0 z-[400] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/95 backdrop-blur-md" onClick={() => setSelectedTableId(null)} />
          <div className="relative bg-white w-full max-w-4xl h-[85vh] rounded-[3.5rem] flex flex-col overflow-hidden shadow-2xl border-t-8 border-yellow-400 animate-in zoom-in duration-300">
            <div className="p-8 border-b flex justify-between items-center bg-white">
              <div>
                <h3 className="text-3xl font-black uppercase italic tracking-tighter leading-none">
                  {selectedTable.id >= 950 ? 'Pedido Balcão' : selectedTable.id >= 900 ? 'Pedido Entrega' : `Mesa ${selectedTable.id}`}
                </h3>
                <p className="text-[11px] font-black text-gray-400 mt-2 uppercase tracking-widest">
                  Cliente: {selectedTable.currentOrder?.customerName || 'Manual'} • Pagamento: {selectedTable.currentOrder?.paymentMethod || 'Pendente'}
                </p>
              </div>
              <div className="flex gap-3">
                {selectedTable.currentOrder && <button onClick={() => handlePrint(selectedTable.currentOrder!)} className="p-4 bg-gray-100 rounded-full hover:bg-yellow-400 active:scale-90 transition-all"><PrinterIcon size={24}/></button>}
                <button onClick={() => setSelectedTableId(null)} className="p-4 bg-gray-100 rounded-full hover:bg-red-50 active:scale-90 transition-all"><CloseIcon size={24}/></button>
              </div>
            </div>
            <div className="flex-1 flex flex-col md:flex-row overflow-hidden">
               <div className="flex-1 p-8 overflow-y-auto space-y-4 no-scrollbar">
                  {selectedTable.currentOrder?.items?.map((item, i) => (
                    <div key={i} className="flex gap-6 bg-gray-50 p-6 rounded-3xl border border-gray-100 items-center">
                      <img src={item.image} className="w-16 h-16 rounded-2xl object-cover" />
                      <div className="flex-1 font-black"><h4 className="text-sm uppercase leading-tight">{item.name}</h4><p className="text-[10px] text-gray-400 uppercase mt-1">{item.category}</p></div>
                      <div className="text-right font-black"><p className="text-[10px] text-gray-400">{item.quantity}x</p><p className="text-lg italic">R$ {(item.price * item.quantity).toFixed(2)}</p></div>
                    </div>
                  ))}
                  {selectedTable.currentOrder && (
                    <div className="pt-10 border-t-2 border-dashed mt-10">
                      <div className="flex justify-between items-end mb-8">
                        <div className="flex flex-col font-black">
                          <span className="text-[10px] uppercase text-gray-400 tracking-[0.2em] mb-1">Total à Receber</span>
                          <span className="text-5xl italic tracking-tighter">R$ {(selectedTable.currentOrder?.finalTotal || 0).toFixed(2).replace('.', ',')}</span>
                        </div>
                        {selectedTable.currentOrder?.discount ? <div className="text-right font-black"><span className="text-green-600 italic">- R$ {selectedTable.currentOrder.discount.toFixed(2)} Desconto</span></div> : null}
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <button onClick={() => { onUpdateTable(selectedTable.id, 'free'); setSelectedTableId(null); }} className="bg-green-600 text-white py-6 rounded-[2rem] font-black uppercase text-xs shadow-2xl hover:brightness-110 active:scale-95 transition-all">Finalizar & Liberar 🏁</button>
                        <button onClick={() => onUpdateTable(selectedTable.id, 'occupied', { ...selectedTable.currentOrder!, status: 'preparing' })} className={`py-6 rounded-[2rem] font-black uppercase text-xs transition-all border-4 border-black active:scale-95 ${selectedTable.currentOrder?.status === 'preparing' ? 'bg-black text-white' : 'bg-white text-black'}`}>Mudar para Preparo 🍳</button>
                      </div>
                    </div>
                  )}
               </div>
               <div className="w-full md:w-80 bg-gray-50 border-l p-8 overflow-y-auto space-y-6 no-scrollbar">
                  <h4 className="text-[10px] font-black uppercase tracking-[0.3em] text-gray-400 mb-6">Status do Pedido</h4>
                  <div className="grid grid-cols-2 gap-3">
                    {(['pending', 'preparing', 'ready', 'delivered'] as OrderStatus[]).map(s => (
                      <button key={s} onClick={() => onUpdateTable(selectedTable.id, 'occupied', { ...selectedTable.currentOrder!, status: s })} className={`py-4 rounded-2xl text-[9px] font-black uppercase border-2 transition-all active:scale-95 ${selectedTable.currentOrder?.status === s ? 'bg-black text-white border-black' : 'bg-white text-gray-400 border-gray-100'}`}>{STATUS_CFG[s].label}</button>
                    ))}
                  </div>
                  <h4 className="text-[10px] font-black uppercase tracking-[0.3em] text-gray-400 mt-10 mb-6">Adicionar Mais Itens</h4>
                  <div className="space-y-2">
                    {menuItems?.filter(p => p.isAvailable).map(p => (
                      <button key={p.id} onClick={() => onAddToOrder(selectedTable.id, p)} className="w-full bg-white p-4 rounded-2xl border border-gray-200 flex justify-between items-center text-[10px] font-black uppercase hover:border-yellow-400 transition-all active:scale-95 shadow-sm">
                        <span>{p.name}</span><span className="text-yellow-600 text-xl">+</span>
                      </button>
                    ))}
                  </div>
               </div>
            </div>
          </div>
        </div>
      )}

      {/* Outros Modais Manter como estão... */}
      {isNewOrderModalOpen && (
        <div className="fixed inset-0 z-[500] flex items-center justify-center p-6 bg-black/95 backdrop-blur-md">
          <div className="bg-white w-full max-sm rounded-[3.5rem] p-10 relative shadow-2xl">
             <button onClick={() => setIsNewOrderModalOpen(false)} className="absolute top-8 right-8 p-4 bg-gray-100 rounded-full"><CloseIcon size={20}/></button>
             <h3 className="text-2xl font-black italic mb-8 uppercase tracking-tighter">Lançar Pedido</h3>
             <form onSubmit={handleCreateNewOrder} className="space-y-6">
                <input type="text" value={newOrderForm.customerName} onChange={e => setNewOrderForm({...newOrderForm, customerName: e.target.value})} placeholder="CLIENTE" className="w-full bg-gray-50 border-2 rounded-2xl px-6 py-4 text-xs font-black outline-none transition-all uppercase" required />
                <div className="grid grid-cols-2 gap-4">
                  <button type="button" onClick={() => setNewOrderForm({...newOrderForm, type: 'delivery'})} className={`py-4 rounded-2xl text-[9px] font-black uppercase border-2 transition-all ${newOrderForm.type === 'delivery' ? 'bg-black text-white border-black' : 'bg-white text-gray-400 border-gray-100'}`}>Entrega</button>
                  <button type="button" onClick={() => setNewOrderForm({...newOrderForm, type: 'takeaway'})} className={`py-4 rounded-2xl text-[9px] font-black uppercase border-2 transition-all ${newOrderForm.type === 'takeaway' ? 'bg-black text-white border-black' : 'bg-white text-gray-400 border-gray-100'}`}>Balcão</button>
                </div>
                {newOrderForm.type === 'delivery' && (
                  <textarea value={newOrderForm.address} onChange={e => setNewOrderForm({...newOrderForm, address: e.target.value})} placeholder="ENDEREÇO" className="w-full bg-gray-50 border-2 rounded-2xl px-6 py-4 text-xs font-black outline-none h-24 resize-none" required />
                )}
                <button type="submit" className="w-full bg-yellow-400 text-black py-6 rounded-2xl font-black text-sm uppercase shadow-xl hover:brightness-125 transition-all">Abrir Pedido</button>
             </form>
          </div>
        </div>
      )}

      {/* Modal de Categoria */}
      {isCategoryModalOpen && (
        <div className="fixed inset-0 z-[500] flex items-center justify-center p-6 bg-black/95 backdrop-blur-md">
          <div className="bg-white w-full max-w-md rounded-[3.5rem] p-10 relative shadow-2xl">
             <button onClick={() => setIsCategoryModalOpen(false)} className="absolute top-8 right-8 p-4 bg-gray-100 rounded-full"><CloseIcon size={20}/></button>
             <h3 className="text-2xl font-black italic mb-8 uppercase tracking-tighter">Nova Categoria</h3>
             <form onSubmit={handleAddCategory} className="space-y-6">
                <input type="text" value={newCategoryName} onChange={e => setNewCategoryName(e.target.value)} placeholder="NOME" className="w-full bg-gray-50 border-2 rounded-2xl px-6 py-5 text-sm font-black outline-none transition-all uppercase" required />
                <button type="submit" className="w-full bg-black text-yellow-400 py-6 rounded-2xl font-black text-sm uppercase shadow-xl">Criar</button>
             </form>
          </div>
        </div>
      )}

      {/* Modal de Produto */}
      {isProductModalOpen && (
        <div className="fixed inset-0 z-[500] flex items-center justify-center p-6 bg-black/98 backdrop-blur-2xl">
          <div className="bg-white w-full max-w-2xl rounded-[4rem] p-12 relative shadow-2xl">
             <button onClick={() => setIsProductModalOpen(false)} className="absolute top-12 right-12 p-5 bg-gray-100 rounded-full"><CloseIcon size={24}/></button>
             <h3 className="text-4xl font-black italic mb-12 uppercase tracking-tighter">{editingProduct?.id ? 'Editar' : 'Novo'} Item</h3>
             <form onSubmit={(e) => { e.preventDefault(); onSaveProduct({ ...editingProduct, price: parseFloat(editingProduct.price || 0) }); setIsProductModalOpen(false); }} className="space-y-8">
                <input type="text" value={editingProduct?.name || ''} onChange={e => setEditingProduct({...editingProduct!, name: e.target.value})} placeholder="NOME" className="w-full bg-gray-50 border-2 rounded-3xl px-8 py-5 text-sm font-black outline-none uppercase" required />
                <div className="grid grid-cols-2 gap-6">
                    <input type="number" step="0.01" value={editingProduct?.price || ''} onChange={e => setEditingProduct({...editingProduct!, price: e.target.value})} placeholder="PREÇO" className="w-full bg-gray-50 border-2 rounded-3xl px-8 py-5 text-sm font-black outline-none" required />
                    <select value={editingProduct?.category} onChange={e => setEditingProduct({...editingProduct!, category: e.target.value})} className="w-full bg-gray-50 border-2 rounded-3xl px-8 py-5 text-sm font-black outline-none uppercase">
                      <option value="">CATEGORIA</option>
                      {categories?.map(cat => <option key={cat.id} value={cat.name}>{cat.name}</option>)}
                    </select>
                </div>
                <input type="text" value={editingProduct?.image || ''} onChange={e => setEditingProduct({...editingProduct!, image: e.target.value})} placeholder="LINK DA IMAGEM" className="w-full bg-gray-50 border-2 rounded-3xl px-8 py-5 text-xs font-bold outline-none" />
                <div className="flex items-center gap-4 bg-gray-50 p-6 rounded-3xl">
                   <input type="checkbox" checked={editingProduct?.isAvailable ?? true} onChange={e => setEditingProduct({...editingProduct!, isAvailable: e.target.checked})} className="w-6 h-6 rounded-lg accent-yellow-400" id="available" />
                   <label htmlFor="available" className="font-black text-xs uppercase cursor-pointer">Disponível</label>
                </div>
                <button type="submit" className="w-full bg-black text-yellow-400 py-7 rounded-[2.5rem] font-black text-sm uppercase shadow-2xl active:scale-95 transition-all">Salvar</button>
             </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminPanel;
