
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
    // Buscar Cupons
    const { data: cData } = await supabase.from('coupons').select('*');
    if (cData) setCoupons(cData.map(c => ({ 
      id: c.id, code: c.code, percentage: c.percentage, isActive: c.is_active, 
      scopeType: c.scope_type, scopeValue: c.scope_value 
    })));
    
    // Buscar Config de Fidelidade
    const { data: lConfig } = await supabase.from('loyalty_config').select('*').maybeSingle();
    if (lConfig) setLoyalty({ 
      isActive: lConfig.isActive, 
      spendingGoal: lConfig.spendingGoal, 
      scopeType: lConfig.scopeType, 
      scopeValue: lConfig.scopeValue || '' 
    });

    // Buscar Ranking de Clientes
    const { data: lUsers } = await supabase.from('loyalty_users').select('*').order('accumulated', { ascending: false });
    if (lUsers) setLoyaltyUsers(lUsers);
  };

  const handleUpdateLoyalty = async (updates: Partial<LoyaltyConfig>) => {
    const next = { ...loyalty, ...updates };
    setLoyalty(next);
    // Usando camelCase conforme mapeado no esquema loyalty_config
    const { error } = await supabase.from('loyalty_config').upsert({ id: 1, ...next });
    if (error) alert('Erro ao salvar fidelidade: ' + error.message);
    fetchMarketing();
  };

  const handleAddCoupon = async (e: any) => {
    e.preventDefault();
    const formData = new FormData(e.target);
    const newCoupon = {
      id: 'cpn_' + Date.now(),
      code: formData.get('code')?.toString().toUpperCase(),
      percentage: Number(formData.get('percentage')),
      is_active: true,
      scope_type: formData.get('scopeType'),
      scope_value: formData.get('scopeValue') || '',
    };
    const { error } = await supabase.from('coupons').insert([newCoupon]);
    if (error) alert('Erro: ' + error.message);
    else { e.target.reset(); fetchMarketing(); }
  };

  const handleToggleCoupon = async (id: string, current: boolean) => {
    await supabase.from('coupons').update({ is_active: !current }).eq('id', id);
    fetchMarketing();
  };

  const handlePrint = (order: Order) => {
    const w = window.open('', '_blank');
    if (!w) return;
    const items = order.items.map(i => `<div style="display:flex;justify-content:space-between;margin-bottom:4px;font-size:12px;"><span>${i.quantity}x ${i.name}</span><span>R$ ${(i.price*i.quantity).toFixed(2)}</span></div>`).join('');
    w.document.write(`<html><body style="font-family:monospace;width:280px;padding:10px;"><h2 style="text-align:center;margin-bottom:5px;">${STORE_INFO.name}</h2><p style="text-align:center;font-size:10px;">Pedido #${order.id} - Mesa ${order.tableId}</p><hr/>${items}<hr/><div style="display:flex;justify-content:space-between;font-weight:bold;"><span>TOTAL:</span><span>R$ ${order.finalTotal.toFixed(2)}</span></div><p style="text-align:center;font-size:9px;margin-top:20px;">Obrigado pela preferência!</p><script>window.onload=()=>{window.print();window.close();};</script></body></html>`);
    w.document.close();
  };

  const physicalTables = tables.filter(t => t.id <= 12).sort((a,b) => a.id - b.id);
  const activeDeliveries = tables.filter(t => t.id >= 900 && t.id <= 999 && t.status === 'occupied');
  const selectedTable = tables.find(t => t.id === selectedTableId) || null;
  const filteredMenu = menuItems.filter(i => i.name.toLowerCase().includes(searchTerm.toLowerCase()) || i.category.toLowerCase().includes(searchTerm.toLowerCase()));

  return (
    <div className="w-full">
      {/* Header Admin */}
      <div className="bg-black p-6 rounded-[2.5rem] shadow-2xl mb-8 border-b-4 border-yellow-400 flex flex-col md:flex-row justify-between items-center gap-6">
        <div>
          <h2 className="text-2xl font-black italic text-yellow-400 uppercase tracking-tighter">D.MOREIRA ADMIN</h2>
          <div className="flex items-center gap-2">
            <span className={`w-2 h-2 rounded-full ${dbStatus === 'ok' ? 'bg-green-500' : 'bg-red-500 animate-pulse'}`}></span>
            <p className="text-[8px] text-gray-500 uppercase font-black tracking-widest">{dbStatus === 'ok' ? 'Online' : 'Conectando...'}</p>
          </div>
        </div>
        <nav className="flex bg-gray-900 p-1.5 rounded-2xl gap-1 overflow-x-auto no-scrollbar max-w-full">
          {(['tables', 'delivery', 'menu', 'marketing'] as const).map(tab => (
            <button key={tab} onClick={() => setActiveTab(tab)} className={`px-5 py-3 rounded-xl text-[9px] font-black uppercase transition-all whitespace-nowrap ${activeTab === tab ? 'bg-yellow-400 text-black' : 'text-gray-500 hover:text-white'}`}>
              {tab === 'tables' ? 'Mesas' : tab === 'delivery' ? 'Pedidos' : tab === 'menu' ? 'Produtos' : 'Marketing'}
            </button>
          ))}
        </nav>
        <div className="flex gap-4">
          <button onClick={onToggleAudio} className={`p-4 rounded-full transition-all ${audioEnabled ? 'bg-yellow-400 text-black shadow-lg' : 'bg-gray-800 text-gray-600'}`}>
            <VolumeIcon muted={!audioEnabled} size={20}/>
          </button>
          <button onClick={onLogout} className="bg-red-600 text-white font-black text-[10px] uppercase px-6 py-4 rounded-2xl shadow-xl hover:brightness-110 active:scale-95 transition-all">Sair</button>
        </div>
      </div>

      <div className="animate-in fade-in duration-500">
        {/* ABA MESAS */}
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

        {/* ABA PEDIDOS (ENTREGA/BALCÃO) */}
        {activeTab === 'delivery' && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {activeDeliveries.length > 0 ? activeDeliveries.map(t => (
              <button key={t.id} onClick={() => setSelectedTableId(t.id)} className="bg-white border-2 border-yellow-400 p-6 rounded-[2.5rem] shadow-xl text-left hover:brightness-105 transition-all">
                <div className="flex justify-between items-start mb-4">
                  <span className="text-2xl">{t.id >= 950 ? '🏪' : '🚚'}</span>
                  <span className="bg-yellow-100 text-[9px] font-black px-2 py-1 rounded-full uppercase">#{t.id}</span>
                </div>
                <h4 className="font-black text-sm uppercase truncate">{t.currentOrder?.customerName}</h4>
                <p className="text-[9px] text-gray-400 font-bold truncate mb-3">{t.currentOrder?.address || 'Retirada no Balcão'}</p>
                <div className={`${STATUS_CFG[t.currentOrder?.status || 'pending'].bg} ${STATUS_CFG[t.currentOrder?.status || 'pending'].color} text-[8px] font-black px-3 py-1.5 rounded-full inline-block uppercase tracking-wider`}>
                  {STATUS_CFG[t.currentOrder?.status || 'pending'].label}
                </div>
              </button>
            )) : (
              <div className="col-span-full py-20 text-center bg-white rounded-[3rem] border border-dashed border-gray-300">
                <p className="text-gray-400 font-black text-xs uppercase tracking-widest">Nenhum pedido ativo no momento.</p>
              </div>
            )}
          </div>
        )}

        {/* ABA PRODUTOS */}
        {activeTab === 'menu' && (
          <div className="bg-white p-8 rounded-[3rem] shadow-xl border border-gray-50">
            <div className="flex flex-col md:flex-row justify-between items-center mb-10 gap-6">
              <h3 className="text-2xl font-black italic uppercase">Gestão de Estoque</h3>
              <div className="flex w-full md:w-auto gap-4">
                <input type="text" value={searchTerm} onChange={e => setSearchTerm(e.target.value)} placeholder="PESQUISAR..." className="flex-1 md:w-64 bg-gray-50 border-2 border-transparent focus:border-yellow-400 rounded-2xl px-6 py-4 text-xs font-black outline-none transition-all" />
                <button onClick={() => { setEditingProduct({ name: '', price: '', category: categories[0]?.name, image: '', isAvailable: true }); setIsProductModalOpen(true); }} className="bg-black text-yellow-400 px-8 py-4 rounded-2xl font-black text-[10px] uppercase shadow-xl hover:scale-105 transition-all">+ Novo</button>
              </div>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-5 gap-6">
              {filteredMenu.map(item => (
                <div key={item.id} className={`bg-gray-50 p-4 rounded-[2.5rem] border transition-all ${!item.isAvailable ? 'opacity-50 grayscale' : 'hover:border-yellow-400'}`}>
                  <img src={item.image} className="w-full aspect-square object-cover rounded-3xl mb-4 shadow-sm" />
                  <h4 className="font-black text-[10px] uppercase truncate">{item.name}</h4>
                  <p className="text-[8px] text-gray-400 font-bold uppercase mb-2">{item.category}</p>
                  <div className="flex justify-between items-center">
                    <span className="text-yellow-700 font-black italic text-xs">R$ {item.price.toFixed(2)}</span>
                    <div className="flex gap-1">
                      <button onClick={() => { setEditingProduct(item); setIsProductModalOpen(true); }} className="p-2 bg-white text-blue-500 rounded-xl shadow-sm hover:bg-blue-50"><PrinterIcon size={14}/></button>
                      <button onClick={() => onDeleteProduct(item.id)} className="p-2 bg-white text-red-500 rounded-xl shadow-sm hover:bg-red-50"><TrashIcon size={14}/></button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ABA MARKETING */}
        {activeTab === 'marketing' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Fidelidade */}
            <div className="bg-white p-8 rounded-[3rem] shadow-xl border border-gray-100 flex flex-col">
              <div className="flex justify-between items-center mb-8">
                <h3 className="text-xl font-black italic uppercase">💎 Fidelidade</h3>
                <button onClick={() => handleUpdateLoyalty({ isActive: !loyalty.isActive })} className={`px-6 py-3 rounded-2xl font-black text-[10px] uppercase transition-all shadow-sm ${loyalty.isActive ? 'bg-green-600 text-white' : 'bg-gray-200 text-gray-400'}`}>
                  {loyalty.isActive ? 'Ativado' : 'Inativo'}
                </button>
              </div>
              
              <div className="bg-yellow-50 p-6 rounded-[2.5rem] border-2 border-yellow-100 mb-8 space-y-6">
                 <div className="grid grid-cols-2 gap-6">
                    <div className="space-y-1">
                      <p className="text-[8px] font-black uppercase text-yellow-800 ml-1">Meta R$</p>
                      <input type="number" value={loyalty.spendingGoal} onChange={e => handleUpdateLoyalty({ spendingGoal: Number(e.target.value) })} className="w-full bg-white p-4 rounded-xl border-2 border-yellow-200 font-black text-sm outline-none focus:border-yellow-400" />
                    </div>
                    <div className="space-y-1">
                      <p className="text-[8px] font-black uppercase text-yellow-800 ml-1">Escopo</p>
                      <select value={loyalty.scopeType} onChange={e => handleUpdateLoyalty({ scopeType: e.target.value as any, scopeValue: '' })} className="w-full bg-white p-4 rounded-xl border-2 border-yellow-200 font-black text-[10px] uppercase outline-none focus:border-yellow-400">
                        <option value="all">Loja Toda</option>
                        <option value="category">Por Categoria</option>
                        <option value="product">Por Produto</option>
                      </select>
                    </div>
                 </div>
                 {loyalty.scopeType !== 'all' && (
                   <div className="space-y-1 animate-in slide-in-from-top-2">
                     <p className="text-[8px] font-black uppercase text-yellow-800 ml-1">Selecionar Alvo</p>
                     <select value={loyalty.scopeValue} onChange={e => handleUpdateLoyalty({ scopeValue: e.target.value })} className="w-full bg-white p-4 rounded-xl border-2 border-yellow-200 font-black text-[10px] uppercase outline-none">
                       <option value="">Escolher...</option>
                       {loyalty.scopeType === 'category' 
                         ? categories.map(c => <option key={c.id} value={c.name}>{c.name}</option>) 
                         : menuItems.map(p => <option key={p.id} value={p.id}>{p.name}</option>)
                       }
                     </select>
                   </div>
                 )}
              </div>

              <div className="flex-1 space-y-3 overflow-y-auto no-scrollbar max-h-80">
                <p className="text-[10px] font-black uppercase text-gray-400 mb-4 tracking-widest">Ranking Clientes</p>
                {loyaltyUsers.map((u, i) => (
                  <div key={u.phone} className="flex justify-between items-center p-5 bg-gray-50 rounded-2xl border-l-8 border-yellow-400 shadow-sm">
                    <div className="flex items-center gap-4">
                      <span className="w-6 h-6 bg-black text-yellow-400 rounded-full flex items-center justify-center text-[10px] font-black">{i+1}</span>
                      <div><p className="font-black text-xs uppercase">{u.name}</p><p className="text-[9px] text-gray-400 font-bold">{u.phone}</p></div>
                    </div>
                    <span className="text-yellow-700 font-black italic text-xs">R$ {u.accumulated.toFixed(2)}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Cupons */}
            <div className="bg-white p-8 rounded-[3rem] shadow-xl border border-gray-100 flex flex-col">
              <h3 className="text-xl font-black italic uppercase mb-8">🎫 Cupons de Desconto</h3>
              <form onSubmit={handleAddCoupon} className="grid grid-cols-2 gap-4 mb-8 bg-gray-50 p-6 rounded-[2.5rem] border border-gray-200">
                <input name="code" placeholder="CÓDIGO" className="bg-white border-2 border-transparent focus:border-yellow-400 p-4 rounded-xl font-black text-xs uppercase outline-none" required />
                <input name="percentage" type="number" placeholder="% OFF" className="bg-white border-2 border-transparent focus:border-yellow-400 p-4 rounded-xl font-black text-xs outline-none" required />
                <select name="scopeType" className="bg-white border-2 border-transparent focus:border-yellow-400 p-4 rounded-xl font-black text-[10px] uppercase outline-none">
                  <option value="all">Loja Toda</option>
                  <option value="category">Por Categoria</option>
                  <option value="product">Por Produto</option>
                </select>
                <button type="submit" className="bg-black text-yellow-400 rounded-xl font-black text-[10px] uppercase hover:brightness-125">Criar Cupom</button>
              </form>

              <div className="flex-1 space-y-3 overflow-y-auto no-scrollbar max-h-80">
                {coupons.map(c => (
                  <div key={c.id} className="flex justify-between items-center p-5 bg-gray-50 rounded-2xl border border-gray-100">
                    <div>
                      <div className="flex items-center gap-2"><span className="font-black text-sm">{c.code}</span><span className="bg-yellow-400 text-black px-2 py-0.5 rounded text-[10px] font-black">{c.percentage}%</span></div>
                      <p className="text-[8px] text-gray-400 font-bold uppercase mt-1">Alvo: {c.scopeType} {c.scopeValue}</p>
                    </div>
                    <button onClick={() => handleToggleCoupon(c.id, c.isActive)} className={`px-4 py-2 rounded-xl text-[9px] font-black uppercase transition-all ${c.isActive ? 'bg-green-500 text-white shadow-lg shadow-green-100' : 'bg-gray-300 text-gray-500'}`}>
                      {c.isActive ? 'Ativo' : 'Desativado'}
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* MODAL DETALHES DO PEDIDO */}
      {selectedTable && (
        <div className="fixed inset-0 z-[400] flex items-center justify-center p-4 sm:p-8 animate-in fade-in duration-300">
          <div className="absolute inset-0 bg-black/95 backdrop-blur-md" onClick={() => setSelectedTableId(null)} />
          <div className="relative bg-white w-full max-w-5xl h-full sm:h-[85vh] rounded-[3.5rem] flex flex-col overflow-hidden shadow-2xl border-t-8 border-yellow-400">
            <div className="p-8 border-b flex justify-between items-center bg-white sticky top-0 z-10">
              <div>
                <h3 className="text-3xl font-black uppercase italic tracking-tighter leading-none">
                  {selectedTable.id >= 950 ? 'Retirada Balcão' : selectedTable.id >= 900 ? 'Entrega Delivery' : `Mesa ${selectedTable.id}`}
                </h3>
                <p className="text-[11px] font-black text-gray-400 mt-2 uppercase tracking-widest">
                  Cliente: <span className="text-black">{selectedTable.currentOrder?.customerName}</span> • <span className="text-yellow-600">{selectedTable.currentOrder?.paymentMethod}</span>
                </p>
              </div>
              <div className="flex gap-3">
                <button onClick={() => handlePrint(selectedTable.currentOrder!)} className="p-4 bg-gray-100 rounded-full hover:bg-yellow-400 hover:text-black transition-all shadow-sm"><PrinterIcon size={24}/></button>
                <button onClick={() => setSelectedTableId(null)} className="p-4 bg-gray-100 rounded-full hover:bg-red-50 hover:text-red-500 transition-all shadow-sm"><CloseIcon size={24}/></button>
              </div>
            </div>

            <div className="flex-1 flex flex-col md:flex-row overflow-hidden">
               {/* LADO ESQUERDO: ITENS E RESUMO */}
               <div className="flex-1 p-8 overflow-y-auto no-scrollbar space-y-6">
                  <div className="space-y-4">
                    {selectedTable.currentOrder?.items.map((item, i) => (
                      <div key={i} className="flex gap-6 bg-gray-50 p-6 rounded-3xl border border-gray-100 shadow-sm items-center">
                        <img src={item.image} className="w-20 h-20 rounded-2xl object-cover shadow-sm" />
                        <div className="flex-1">
                          <h4 className="font-black text-sm uppercase leading-tight">{item.name}</h4>
                          <p className="text-[10px] text-gray-400 font-bold uppercase mt-1">{item.category}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-xs font-black text-gray-400 uppercase">{item.quantity}x R$ {item.price.toFixed(2)}</p>
                          <p className="text-lg font-black italic text-black">R$ {(item.price*item.quantity).toFixed(2)}</p>
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="pt-10 border-t-2 border-dashed mt-10">
                    <div className="flex justify-between items-end mb-8">
                      <div className="flex flex-col">
                        <span className="text-[10px] font-black uppercase text-gray-400 tracking-[0.2em] mb-1">Total Final à Receber</span>
                        <span className="text-5xl font-black italic tracking-tighter text-black">R$ {selectedTable.currentOrder?.finalTotal.toFixed(2).replace('.', ',')}</span>
                      </div>
                      {selectedTable.currentOrder?.discount && selectedTable.currentOrder.discount > 0 && (
                        <div className="bg-green-100 text-green-700 px-4 py-2 rounded-2xl text-[10px] font-black uppercase shadow-sm">Desconto: R$ {selectedTable.currentOrder.discount.toFixed(2)}</div>
                      )}
                    </div>
                    
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <button 
                        onClick={() => { onUpdateTable(selectedTable.id, 'free'); setSelectedTableId(null); }} 
                        className="bg-green-600 text-white py-6 rounded-[2rem] font-black uppercase text-xs shadow-2xl shadow-green-200 hover:brightness-110 active:scale-95 transition-all"
                      >
                        Concluir e Liberar 🏁
                      </button>
                      <button 
                        onClick={() => { onUpdateTable(selectedTable.id, 'occupied', { ...selectedTable.currentOrder!, status: 'preparing' }); }} 
                        className={`py-6 rounded-[2rem] font-black uppercase text-xs transition-all border-4 ${selectedTable.currentOrder?.status === 'preparing' ? 'bg-black text-white border-black' : 'bg-white text-black border-black hover:bg-gray-50'}`}
                      >
                        Começar Preparo 🍳
                      </button>
                    </div>
                  </div>
               </div>

               {/* LADO DIREITO: ACOES RAPIDAS / ADD ITENS */}
               <div className="w-full md:w-96 bg-gray-50 border-l p-8 overflow-y-auto no-scrollbar space-y-8">
                  <div>
                    <h4 className="text-[10px] font-black uppercase tracking-[0.3em] text-gray-400 mb-6">Status da Produção</h4>
                    <div className="grid grid-cols-2 gap-3">
                      {(['pending', 'preparing', 'ready', 'delivered'] as OrderStatus[]).map(s => (
                        <button 
                          key={s} 
                          onClick={() => onUpdateTable(selectedTable.id, 'occupied', { ...selectedTable.currentOrder!, status: s })}
                          className={`py-4 rounded-2xl text-[9px] font-black uppercase border-2 transition-all ${selectedTable.currentOrder?.status === s ? 'bg-black text-white border-black shadow-lg' : 'bg-white text-gray-400 border-gray-100'}`}
                        >
                          {STATUS_CFG[s].label}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <h4 className="text-[10px] font-black uppercase tracking-[0.3em] text-gray-400 mb-6">Adicionar Item à Comanda</h4>
                    <div className="space-y-2">
                      {menuItems.filter(p => p.isAvailable).map(p => (
                        <button key={p.id} onClick={() => onAddToOrder(selectedTable.id, p)} className="w-full bg-white p-5 rounded-[1.5rem] border border-gray-200 flex justify-between items-center text-[10px] font-black uppercase hover:border-yellow-400 hover:shadow-md transition-all group">
                          <div className="flex flex-col text-left">
                            <span>{p.name}</span>
                            <span className="text-gray-400 font-bold">R$ {p.price.toFixed(2)}</span>
                          </div>
                          <span className="text-yellow-600 text-2xl group-hover:scale-125 transition-transform">+</span>
                        </button>
                      ))}
                    </div>
                  </div>
               </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL PRODUTO (NOVO/EDITAR) */}
      {isProductModalOpen && (
        <div className="fixed inset-0 z-[500] flex items-center justify-center p-6 bg-black/98 backdrop-blur-2xl">
          <div className="bg-white w-full max-w-2xl rounded-[4rem] p-12 relative shadow-2xl animate-in zoom-in duration-300">
             <button onClick={() => setIsProductModalOpen(false)} className="absolute top-12 right-12 p-5 bg-gray-100 rounded-full hover:bg-red-50 transition-all"><CloseIcon size={24}/></button>
             <h3 className="text-4xl font-black italic mb-12 uppercase tracking-tighter">Produto</h3>
             <form onSubmit={(e) => { 
               e.preventDefault(); 
               onSaveProduct({ ...editingProduct, price: parseFloat(editingProduct.price) }); 
               setIsProductModalOpen(false); 
             }} className="space-y-8">
                <div className="space-y-2">
                  <p className="text-[10px] font-black uppercase text-gray-400 ml-2">Nome do Item</p>
                  <input type="text" value={editingProduct?.name || ''} onChange={e => setEditingProduct({...editingProduct!, name: e.target.value})} placeholder="X-TUDO MONSTRO" className="w-full bg-gray-50 border-2 border-transparent focus:border-yellow-400 rounded-3xl px-8 py-5 text-sm font-black outline-none transition-all uppercase" required />
                </div>
                <div className="grid grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <p className="text-[10px] font-black uppercase text-gray-400 ml-2">Preço de Venda</p>
                      <input type="number" step="0.01" value={editingProduct?.price || ''} onChange={e => setEditingProduct({...editingProduct!, price: e.target.value})} placeholder="0.00" className="w-full bg-gray-50 border-2 border-transparent focus:border-yellow-400 rounded-3xl px-8 py-5 text-sm font-black outline-none transition-all" required />
                    </div>
                    <div className="space-y-2">
                      <p className="text-[10px] font-black uppercase text-gray-400 ml-2">Categoria</p>
                      <select value={editingProduct?.category} onChange={e => setEditingProduct({...editingProduct!, category: e.target.value})} className="w-full bg-gray-50 border-2 border-transparent focus:border-yellow-400 rounded-3xl px-8 py-5 text-sm font-black outline-none transition-all uppercase">
                        {categories.map(cat => <option key={cat.id} value={cat.name}>{cat.name}</option>)}
                      </select>
                    </div>
                </div>
                <div className="space-y-2">
                  <p className="text-[10px] font-black uppercase text-gray-400 ml-2">URL da Imagem</p>
                  <input type="text" value={editingProduct?.image || ''} onChange={e => setEditingProduct({...editingProduct!, image: e.target.value})} placeholder="https://..." className="w-full bg-gray-50 border-2 border-transparent focus:border-yellow-400 rounded-3xl px-8 py-5 text-xs font-bold outline-none transition-all" />
                </div>
                <div className="flex items-center gap-4 bg-gray-50 p-6 rounded-3xl">
                   <input type="checkbox" checked={editingProduct?.isAvailable} onChange={e => setEditingProduct({...editingProduct!, isAvailable: e.target.checked})} className="w-6 h-6 rounded-lg accent-yellow-400" id="available" />
                   <label htmlFor="available" className="font-black text-xs uppercase cursor-pointer">Produto Disponível no Cardápio</label>
                </div>
                <button type="submit" className="w-full bg-black text-yellow-400 py-7 rounded-[2.5rem] font-black text-sm uppercase shadow-2xl shadow-yellow-400/10 hover:brightness-125 transition-all">Salvar Alterações</button>
             </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminPanel;
