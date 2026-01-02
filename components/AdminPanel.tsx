
import React, { useState, useMemo, useEffect } from 'react';
import { Table, Order, Product, Category, Coupon, LoyaltyConfig, LoyaltyUser, OrderStatus } from '../types';
import { CloseIcon, TrashIcon, VolumeIcon, PrinterIcon } from './Icons';
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
  tables, menuItems, categories, audioEnabled, onToggleAudio, 
  onUpdateTable, onRefreshData, onLogout, onSaveProduct, onDeleteProduct, dbStatus, onAddToOrder 
}) => {
  const [activeTab, setActiveTab] = useState<'tables' | 'delivery' | 'menu' | 'marketing'>('tables');
  const [selectedTableId, setSelectedTableId] = useState<number | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [editingProduct, setEditingProduct] = useState<any | null>(null);
  const [isProductModalOpen, setIsProductModalOpen] = useState(false);
  
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [loyalty, setLoyalty] = useState<LoyaltyConfig>({ isActive: false, spendingGoal: 100, scopeType: 'all', scopeValue: '' });
  const [loyaltyUsers, setLoyaltyUsers] = useState<LoyaltyUser[]>([]);

  useEffect(() => { fetchMarketing(); }, []);

  const fetchMarketing = async () => {
    const { data: cData } = await supabase.from('coupons').select('*');
    if (cData) setCoupons(cData.map(c => ({ 
      id: c.id, code: c.code, percentage: c.percentage, isActive: c.is_active, scopeType: c.scope_type, scopeValue: c.scope_value 
    })));
    
    const { data: lConfig } = await supabase.from('loyalty_config').select('*').maybeSingle();
    if (lConfig) setLoyalty({ 
      isActive: lConfig.is_active, 
      spendingGoal: lConfig.spending_goal, 
      scopeType: lConfig.scope_type, 
      scopeValue: lConfig.scope_value || '' 
    });

    const { data: lUsers } = await supabase.from('loyalty_users').select('*').order('accumulated', { ascending: false });
    if (lUsers) setLoyaltyUsers(lUsers);
  };

  const handleUpdateLoyalty = async (updates: Partial<LoyaltyConfig>) => {
    const next = { ...loyalty, ...updates };
    setLoyalty(next);
    const { error } = await supabase.from('loyalty_config').upsert({ 
      id: 1, 
      is_active: next.isActive,
      spending_goal: next.spendingGoal,
      scope_type: next.scopeType,
      scope_value: next.scopeValue
    });
    if (error) alert('Erro: ' + error.message);
    fetchMarketing();
  };

  const handlePrint = (order: Order) => {
    const w = window.open('', '_blank');
    if (!w) return;
    const items = order.items.map(i => `<div style="display:flex;justify-content:space-between;margin-bottom:4px;font-size:12px;"><span>${i.quantity}x ${i.name}</span><span>R$ ${(i.price*i.quantity).toFixed(2)}</span></div>`).join('');
    w.document.write(`<html><body style="font-family:monospace;width:280px;padding:10px;"><h2 style="text-align:center;">${STORE_INFO.name}</h2><p style="text-align:center;">Pedido #${order.id}</p><hr/>${items}<hr/><div style="display:flex;justify-content:space-between;font-weight:bold;"><span>TOTAL:</span><span>R$ ${order.finalTotal.toFixed(2)}</span></div><script>window.onload=()=>{window.print();window.close();};</script></body></html>`);
    w.document.close();
  };

  const physicalTables = tables.filter(t => t.id <= 12).sort((a,b) => a.id - b.id);
  const activeDeliveries = tables.filter(t => t.id >= 900 && t.id <= 999 && t.status === 'occupied');
  const selectedTable = tables.find(t => t.id === selectedTableId) || null;
  const filteredMenu = menuItems.filter(i => i.name.toLowerCase().includes(searchTerm.toLowerCase()));

  return (
    <div className="w-full">
      <div className="bg-black p-6 rounded-[2.5rem] shadow-2xl mb-8 border-b-4 border-yellow-400 flex flex-col md:flex-row justify-between items-center gap-6">
        <div>
          <h2 className="text-2xl font-black italic text-yellow-400 uppercase tracking-tighter">D.MOREIRA ADMIN</h2>
          <div className="flex items-center gap-2"><span className={`w-2 h-2 rounded-full ${dbStatus === 'ok' ? 'bg-green-500' : 'bg-red-500 animate-pulse'}`}></span><p className="text-[8px] text-gray-500 uppercase font-black">{dbStatus === 'ok' ? 'Online' : 'Sincronizando...'}</p></div>
        </div>
        <nav className="flex bg-gray-900 p-1.5 rounded-2xl gap-1">
          {(['tables', 'delivery', 'menu', 'marketing'] as const).map(tab => (
            <button key={tab} onClick={() => setActiveTab(tab)} className={`px-5 py-3 rounded-xl text-[9px] font-black uppercase transition-all ${activeTab === tab ? 'bg-yellow-400 text-black' : 'text-gray-500 hover:text-white'}`}>{tab === 'tables' ? 'Mesas' : tab === 'delivery' ? 'Pedidos' : tab === 'menu' ? 'Produtos' : 'Marketing'}</button>
          ))}
        </nav>
        <div className="flex gap-4">
          <button onClick={onToggleAudio} className={`p-4 rounded-full transition-all ${audioEnabled ? 'bg-yellow-400 text-black shadow-lg' : 'bg-gray-800 text-gray-600'}`}><VolumeIcon muted={!audioEnabled} size={20}/></button>
          <button onClick={onLogout} className="bg-red-600 text-white font-black text-[10px] uppercase px-6 py-4 rounded-2xl shadow-xl">Sair</button>
        </div>
      </div>

      <div className="animate-in fade-in duration-500">
        {activeTab === 'tables' && (
          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-5">
            {physicalTables.map(t => (
              <button key={t.id} onClick={() => setSelectedTableId(t.id)} className={`h-48 p-6 rounded-[2.5rem] border-2 transition-all flex flex-col items-center justify-center gap-2 relative ${t.status === 'free' ? 'bg-white border-gray-100 hover:border-yellow-400' : 'bg-yellow-400 border-black shadow-xl ring-4 ring-yellow-400/20'}`}>
                {t.currentOrder?.status === 'pending' && <span className="absolute top-0 right-0 bg-red-600 text-white text-[8px] font-black px-4 py-2 rounded-bl-2xl animate-pulse">NOVO</span>}
                <span className="text-5xl font-black italic text-black">{t.id}</span>
                <span className={`text-[8px] font-black uppercase px-2 py-0.5 rounded-full ${t.status === 'free' ? 'bg-gray-100 text-gray-400' : 'bg-black text-white'}`}>{t.status === 'free' ? 'Livre' : 'Ocupada'}</span>
                {t.currentOrder && <span className="text-[11px] font-black mt-2 italic bg-white/40 px-2 py-0.5 rounded">R$ {Number(t.currentOrder.finalTotal).toFixed(2)}</span>}
              </button>
            ))}
          </div>
        )}

        {activeTab === 'delivery' && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {activeDeliveries.length > 0 ? activeDeliveries.map(t => (
              <button key={t.id} onClick={() => setSelectedTableId(t.id)} className="bg-white border-2 border-yellow-400 p-6 rounded-[2.5rem] shadow-xl text-left hover:brightness-105 transition-all">
                <div className="flex justify-between items-start mb-4"><span className="text-2xl">{t.id >= 950 ? '🏪' : '🚚'}</span><span className="bg-yellow-100 text-[9px] font-black px-2 py-1 rounded-full uppercase">#{t.id}</span></div>
                <h4 className="font-black text-sm uppercase truncate">{t.currentOrder?.customerName}</h4>
                <p className="text-[9px] text-gray-400 font-bold truncate mb-3">{t.currentOrder?.address || 'Retirada'}</p>
                <div className={`${STATUS_CFG[t.currentOrder?.status || 'pending'].bg} ${STATUS_CFG[t.currentOrder?.status || 'pending'].color} text-[8px] font-black px-3 py-1.5 rounded-full inline-block uppercase`}>{STATUS_CFG[t.currentOrder?.status || 'pending'].label}</div>
              </button>
            )) : <div className="col-span-full py-20 text-center opacity-30 font-black uppercase text-xs">Sem pedidos ativos</div>}
          </div>
        )}

        {activeTab === 'menu' && (
          <div className="bg-white p-8 rounded-[3rem] shadow-xl border border-gray-50">
            <div className="flex justify-between items-center mb-10 gap-6">
              <h3 className="text-2xl font-black italic uppercase">Produtos</h3>
              <div className="flex gap-4">
                <input type="text" value={searchTerm} onChange={e => setSearchTerm(e.target.value)} placeholder="PESQUISAR..." className="bg-gray-50 border-2 rounded-2xl px-6 py-4 text-xs font-black outline-none" />
                <button onClick={() => { setEditingProduct({ name: '', price: '', category: categories[0]?.name, image: '', isAvailable: true }); setIsProductModalOpen(true); }} className="bg-black text-yellow-400 px-8 py-4 rounded-2xl font-black text-[10px] uppercase shadow-xl">+ Novo</button>
              </div>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-5 gap-6">
              {filteredMenu.map(item => (
                <div key={item.id} className="bg-gray-50 p-4 rounded-[2.5rem] border hover:border-yellow-400 transition-all">
                  <img src={item.image} className="w-full aspect-square object-cover rounded-3xl mb-4" />
                  <h4 className="font-black text-[10px] uppercase truncate">{item.name}</h4>
                  <div className="flex justify-between items-center mt-2">
                    <span className="text-yellow-700 font-black italic text-xs">R$ {item.price.toFixed(2)}</span>
                    <div className="flex gap-1"><button onClick={() => { setEditingProduct(item); setIsProductModalOpen(true); }} className="p-2 bg-white text-blue-500 rounded-xl shadow-sm"><PrinterIcon size={14}/></button><button onClick={() => onDeleteProduct(item.id)} className="p-2 bg-white text-red-500 rounded-xl shadow-sm"><TrashIcon size={14}/></button></div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'marketing' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <div className="bg-white p-8 rounded-[3rem] shadow-xl border border-gray-100 flex flex-col">
              <div className="flex justify-between items-center mb-8"><h3 className="text-xl font-black italic uppercase">💎 Fidelidade</h3><button onClick={() => handleUpdateLoyalty({ isActive: !loyalty.isActive })} className={`px-6 py-3 rounded-2xl font-black text-[10px] uppercase transition-all shadow-sm ${loyalty.isActive ? 'bg-green-600 text-white' : 'bg-gray-200 text-gray-400'}`}>{loyalty.isActive ? 'Ativado' : 'Inativo'}</button></div>
              <div className="bg-yellow-50 p-6 rounded-[2.5rem] border-2 border-yellow-100 mb-8 space-y-6">
                 <div className="grid grid-cols-2 gap-6">
                    <div className="space-y-1"><p className="text-[8px] font-black uppercase text-yellow-800 ml-1">Meta R$</p><input type="number" value={loyalty.spendingGoal} onChange={e => handleUpdateLoyalty({ spendingGoal: Number(e.target.value) })} className="w-full bg-white p-4 rounded-xl border-2 border-yellow-200 font-black text-sm outline-none" /></div>
                    <div className="space-y-1"><p className="text-[8px] font-black uppercase text-yellow-800 ml-1">Escopo</p><select value={loyalty.scopeType} onChange={e => handleUpdateLoyalty({ scopeType: e.target.value as any, scopeValue: '' })} className="w-full bg-white p-4 rounded-xl border-2 border-yellow-200 font-black text-[10px] uppercase outline-none"><option value="all">Loja Toda</option><option value="category">Por Categoria</option><option value="product">Por Produto</option></select></div>
                 </div>
              </div>
              <div className="flex-1 space-y-3 overflow-y-auto max-h-80">
                {loyaltyUsers.map((u, i) => (
                  <div key={u.phone} className="flex justify-between items-center p-5 bg-gray-50 rounded-2xl border-l-8 border-yellow-400 shadow-sm"><div className="flex items-center gap-4"><span className="w-6 h-6 bg-black text-yellow-400 rounded-full flex items-center justify-center text-[10px] font-black">{i+1}</span><div><p className="font-black text-xs uppercase">{u.name}</p><p className="text-[9px] text-gray-400 font-bold">{u.phone}</p></div></div><span className="text-yellow-700 font-black italic text-xs">R$ {u.accumulated.toFixed(2)}</span></div>
                ))}
              </div>
            </div>
            {/* Cupons */}
            <div className="bg-white p-8 rounded-[3rem] shadow-xl border border-gray-100 flex flex-col">
              <h3 className="text-xl font-black italic uppercase mb-8">🎫 Cupons</h3>
              <form onSubmit={async (e: any) => { 
                e.preventDefault(); 
                const f = new FormData(e.target); 
                await supabase.from('coupons').insert([{ 
                  id: 'c_'+Date.now(), 
                  code: f.get('code')?.toString().toUpperCase(), 
                  percentage: Number(f.get('percentage')), 
                  is_active: true, 
                  scope_type: 'all' 
                }]); 
                fetchMarketing(); 
                e.target.reset(); 
              }} className="grid grid-cols-2 gap-4 mb-8 bg-gray-50 p-6 rounded-[2.5rem]">
                <input name="code" placeholder="CÓDIGO" className="bg-white p-4 rounded-xl font-black text-xs uppercase outline-none" required />
                <input name="percentage" type="number" placeholder="% OFF" className="bg-white p-4 rounded-xl font-black text-xs outline-none" required />
                <button type="submit" className="col-span-2 bg-black text-yellow-400 py-4 rounded-xl font-black text-[10px] uppercase">Criar Cupom</button>
              </form>
              <div className="flex-1 space-y-3 overflow-y-auto max-h-80">
                {coupons.map(c => (
                  <div key={c.id} className="flex justify-between items-center p-5 bg-gray-50 rounded-2xl border border-gray-100">
                    <div><span className="font-black text-sm">{c.code}</span><span className="bg-yellow-400 text-black px-2 py-0.5 rounded text-[10px] font-black ml-2">{c.percentage}%</span></div>
                    <button onClick={async () => { await supabase.from('coupons').update({ is_active: !c.isActive }).eq('id', c.id); fetchMarketing(); }} className={`px-4 py-2 rounded-xl text-[9px] font-black uppercase ${c.isActive ? 'bg-green-500 text-white' : 'bg-gray-300 text-gray-500'}`}>
                      {c.isActive ? 'Ativo' : 'Off'}
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      {selectedTable && (
        <div className="fixed inset-0 z-[400] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/95 backdrop-blur-md" onClick={() => setSelectedTableId(null)} />
          <div className="relative bg-white w-full max-w-4xl h-[85vh] rounded-[3.5rem] flex flex-col overflow-hidden shadow-2xl border-t-8 border-yellow-400">
            <div className="p-8 border-b flex justify-between items-center bg-white sticky top-0 z-10">
              <div><h3 className="text-3xl font-black uppercase italic tracking-tighter leading-none">{selectedTable.id >= 900 ? 'Pedido Externo' : `Mesa ${selectedTable.id}`}</h3><p className="text-[11px] font-black text-gray-400 mt-2 uppercase tracking-widest">{selectedTable.currentOrder?.customerName} • {selectedTable.currentOrder?.paymentMethod}</p></div>
              <div className="flex gap-3"><button onClick={() => handlePrint(selectedTable.currentOrder!)} className="p-4 bg-gray-100 rounded-full hover:bg-yellow-400 transition-all shadow-sm"><PrinterIcon size={24}/></button><button onClick={() => setSelectedTableId(null)} className="p-4 bg-gray-100 rounded-full hover:bg-red-50 transition-all shadow-sm"><CloseIcon size={24}/></button></div>
            </div>
            <div className="flex-1 flex flex-col md:flex-row overflow-hidden">
               <div className="flex-1 p-8 overflow-y-auto space-y-4">
                  {selectedTable.currentOrder?.items.map((item, i) => (
                    <div key={i} className="flex gap-6 bg-gray-50 p-6 rounded-3xl border border-gray-100 items-center"><img src={item.image} className="w-16 h-16 rounded-2xl object-cover shadow-sm" /><div className="flex-1 font-black"><h4 className="text-sm uppercase leading-tight">{item.name}</h4><p className="text-[10px] text-gray-400 mt-1 uppercase">{item.category}</p></div><div className="text-right font-black"><p className="text-xs text-gray-400">{item.quantity}x R$ {item.price.toFixed(2)}</p><p className="text-lg italic">R$ {(item.price*item.quantity).toFixed(2)}</p></div></div>
                  ))}
                  <div className="pt-10 border-t-2 border-dashed mt-10">
                    <div className="flex justify-between items-end mb-8"><div className="flex flex-col font-black"><span className="text-[10px] uppercase text-gray-400 tracking-[0.2em] mb-1">Total Final</span><span className="text-5xl italic tracking-tighter">R$ {selectedTable.currentOrder?.finalTotal.toFixed(2).replace('.', ',')}</span></div></div>
                    <div className="grid grid-cols-2 gap-4">
                      <button onClick={() => { onUpdateTable(selectedTable.id, 'free'); setSelectedTableId(null); }} className="bg-green-600 text-white py-6 rounded-[2rem] font-black uppercase text-xs shadow-2xl hover:brightness-110 transition-all">Concluir 🏁</button>
                      <button onClick={() => onUpdateTable(selectedTable.id, 'occupied', { ...selectedTable.currentOrder!, status: 'preparing' })} className={`py-6 rounded-[2rem] font-black uppercase text-xs transition-all border-4 border-black ${selectedTable.currentOrder?.status === 'preparing' ? 'bg-black text-white' : 'bg-white text-black'}`}>Preparar 🍳</button>
                    </div>
                  </div>
               </div>
               <div className="w-full md:w-80 bg-gray-50 border-l p-8 overflow-y-auto space-y-6">
                  <h4 className="text-[10px] font-black uppercase tracking-[0.3em] text-gray-400 mb-6">Mudar Status</h4>
                  <div className="grid grid-cols-2 gap-3">
                    {(['pending', 'preparing', 'ready', 'delivered'] as OrderStatus[]).map(s => (
                      <button key={s} onClick={() => onUpdateTable(selectedTable.id, 'occupied', { ...selectedTable.currentOrder!, status: s })} className={`py-4 rounded-2xl text-[9px] font-black uppercase border-2 transition-all ${selectedTable.currentOrder?.status === s ? 'bg-black text-white border-black' : 'bg-white text-gray-400 border-gray-100'}`}>{STATUS_CFG[s].label}</button>
                    ))}
                  </div>
                  <h4 className="text-[10px] font-black uppercase tracking-[0.3em] text-gray-400 mb-6">Adicionar Item</h4>
                  <div className="space-y-2">
                    {menuItems.filter(p => p.isAvailable).map(p => (
                      <button key={p.id} onClick={() => onAddToOrder(selectedTable.id, p)} className="w-full bg-white p-4 rounded-2xl border border-gray-200 flex justify-between items-center text-[10px] font-black uppercase hover:border-yellow-400 transition-all"><span>{p.name}</span><span className="text-yellow-600 text-xl">+</span></button>
                    ))}
                  </div>
               </div>
            </div>
          </div>
        </div>
      )}

      {isProductModalOpen && (
        <div className="fixed inset-0 z-[500] flex items-center justify-center p-6 bg-black/98 backdrop-blur-2xl">
          <div className="bg-white w-full max-w-2xl rounded-[4rem] p-12 relative shadow-2xl animate-in zoom-in duration-300">
             <button onClick={() => setIsProductModalOpen(false)} className="absolute top-12 right-12 p-5 bg-gray-100 rounded-full"><CloseIcon size={24}/></button>
             <h3 className="text-4xl font-black italic mb-12 uppercase tracking-tighter">Produto</h3>
             <form onSubmit={(e) => { 
               e.preventDefault(); 
               onSaveProduct({ ...editingProduct, price: parseFloat(editingProduct.price) }); 
               setIsProductModalOpen(false); 
             }} className="space-y-8">
                <input type="text" value={editingProduct?.name || ''} onChange={e => setEditingProduct({...editingProduct!, name: e.target.value})} placeholder="NOME DO ITEM" className="w-full bg-gray-50 border-2 rounded-3xl px-8 py-5 text-sm font-black outline-none transition-all uppercase" required />
                <div className="grid grid-cols-2 gap-6">
                    <input type="number" step="0.01" value={editingProduct?.price || ''} onChange={e => setEditingProduct({...editingProduct!, price: e.target.value})} placeholder="PREÇO" className="w-full bg-gray-50 border-2 rounded-3xl px-8 py-5 text-sm font-black outline-none" required />
                    <select value={editingProduct?.category} onChange={e => setEditingProduct({...editingProduct!, category: e.target.value})} className="w-full bg-gray-50 border-2 rounded-3xl px-8 py-5 text-sm font-black outline-none uppercase">
                      {categories.map(cat => <option key={cat.id} value={cat.name}>{cat.name}</option>)}
                    </select>
                </div>
                <input type="text" value={editingProduct?.image || ''} onChange={e => setEditingProduct({...editingProduct!, image: e.target.value})} placeholder="URL DA IMAGEM" className="w-full bg-gray-50 border-2 rounded-3xl px-8 py-5 text-xs font-bold outline-none" />
                <div className="flex items-center gap-4 bg-gray-50 p-6 rounded-3xl">
                   <input type="checkbox" checked={editingProduct?.isAvailable} onChange={e => setEditingProduct({...editingProduct!, isAvailable: e.target.checked})} className="w-6 h-6 rounded-lg accent-yellow-400" id="available" />
                   <label htmlFor="available" className="font-black text-xs uppercase cursor-pointer">Disponível no Cardápio</label>
                </div>
                <button type="submit" className="w-full bg-black text-yellow-400 py-7 rounded-[2.5rem] font-black text-sm uppercase shadow-2xl hover:brightness-125 transition-all">Salvar Alterações</button>
             </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminPanel;
