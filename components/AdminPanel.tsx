
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
  dbStatus: 'loading' | 'ok' | 'error_tables_missing';
}

const STATUS_CONFIG: Record<string, { label: string, color: string, bg: string }> = {
  'pending': { label: 'Pendente', color: 'text-orange-600', bg: 'bg-orange-100' },
  'preparing': { label: 'Preparando', color: 'text-blue-600', bg: 'bg-blue-100' },
  'ready': { label: 'Pronto', color: 'text-green-600', bg: 'bg-green-100' },
  'delivered': { label: 'Entregue', color: 'text-gray-600', bg: 'bg-gray-100' },
  'fallback': { label: 'Status...', color: 'text-gray-400', bg: 'bg-gray-50' }
};

const AdminPanel: React.FC<AdminPanelProps> = ({ 
  tables, menuItems, categories, audioEnabled, onToggleAudio, 
  onUpdateTable, onRefreshData, onLogout, onSaveProduct, onDeleteProduct, dbStatus, onAddToOrder 
}) => {
  const [activeTab, setActiveTab] = useState<'tables' | 'delivery' | 'menu' | 'categories' | 'marketing'>('tables');
  const [selectedTableId, setSelectedTableId] = useState<number | null>(null);
  const [modalTab, setModalTab] = useState<'items' | 'add'>('items');
  const [isSaving, setIsSaving] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [editingProduct, setEditingProduct] = useState<any | null>(null);
  const [isProductModalOpen, setIsProductModalOpen] = useState(false);
  
  const [newCategoryName, setNewCategoryName] = useState('');
  const [editingCategoryId, setEditingCategoryId] = useState<string | null>(null);
  const [editingCategoryName, setEditingCategoryName] = useState('');

  const [editCustomerName, setEditCustomerName] = useState('');
  const [editCustomerPhone, setEditCustomerPhone] = useState('');
  const [editAddress, setEditAddress] = useState('');

  // Marketing State
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [loyalty, setLoyalty] = useState<LoyaltyConfig>({ isActive: false, spendingGoal: 100, scopeType: 'all', scopeValue: '' });
  const [loyaltyUsers, setLoyaltyUsers] = useState<LoyaltyUser[]>([]);
  
  // Temporary Form States for Selectors
  const [couponScopeType, setCouponScopeType] = useState<'all' | 'category' | 'product'>('all');

  useEffect(() => {
    fetchMarketingData();
  }, []);

  const fetchMarketingData = async () => {
    const { data: cData } = await supabase.from('coupons').select('*');
    if (cData) setCoupons(cData);
    
    const { data: lConfig } = await supabase.from('loyalty_config').select('*').single();
    if (lConfig) setLoyalty(lConfig);

    const { data: lUsers } = await supabase.from('loyalty_users').select('*').order('accumulated', { ascending: false });
    if (lUsers) setLoyaltyUsers(lUsers);
  };

  const handleTestSound = () => {
    const audio = new Audio('https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3');
    audio.play().then(() => alert('Som configurado com sucesso! Clique em OK para ativar as notificações.')).catch(e => alert('Erro ao tocar: ' + e.message));
  };

  const physicalTables = useMemo(() => 
    (tables || []).filter(t => t.id >= 1 && t.id <= 12).sort((a,b) => a.id - b.id), 
    [tables]
  );
  
  const activeDeliveries = useMemo(() => 
    (tables || []).filter(t => 
      t.id >= 900 && t.id <= 949 && 
      t.status === 'occupied' && 
      t.currentOrder && 
      t.currentOrder.orderType === 'delivery'
    ).sort((a,b) => a.id - b.id), 
    [tables]
  );
  
  const activeCounters = useMemo(() => 
    (tables || []).filter(t => 
      t.id >= 950 && t.id <= 999 && 
      t.status === 'occupied' && 
      t.currentOrder && 
      (t.currentOrder.orderType === 'counter' || t.currentOrder.orderType === 'takeaway')
    ).sort((a,b) => a.id - b.id), 
    [tables]
  );

  const selectedTable = useMemo(() => 
    (tables || []).find(t => t.id === selectedTableId) || null, 
    [tables, selectedTableId]
  );

  useEffect(() => {
    if (selectedTable?.currentOrder) {
      setEditCustomerName(selectedTable.currentOrder.customerName || '');
      setEditCustomerPhone(selectedTable.currentOrder.customerPhone || '');
      setEditAddress(selectedTable.currentOrder.address || '');
    }
  }, [selectedTableId, selectedTable]);

  const handleCreateManualOrder = (type: 'delivery' | 'counter') => {
    const rangeStart = type === 'delivery' ? 900 : 950;
    const rangeEnd = type === 'delivery' ? 949 : 999;
    
    const freeSlot = (tables || []).find(t => t.id >= rangeStart && t.id <= rangeEnd && t.status === 'free');
    const newId = freeSlot ? freeSlot.id : (Math.max(...(tables || []).filter(t => t.id >= rangeStart && t.id <= rangeEnd).map(t => t.id), rangeStart - 1) + 1);
    
    const newOrder: Order = {
      id: Math.random().toString(36).substr(2, 6).toUpperCase(),
      customerName: type === 'delivery' ? 'Nova Entrega' : 'Novo Balcão',
      customerPhone: '',
      items: [],
      total: 0,
      finalTotal: 0,
      paymentMethod: 'Pendente',
      timestamp: new Date().toISOString(),
      tableId: newId,
      orderType: type === 'delivery' ? 'delivery' : 'counter',
      status: 'pending'
    };

    onUpdateTable(newId, 'occupied', newOrder);
    setSelectedTableId(newId);
    setModalTab('items');
  };

  const handleUpdateCustomerData = async () => {
    if (!selectedTable || !selectedTable.currentOrder) return;
    setIsSaving(true);
    try {
      const updatedOrder = { 
        ...selectedTable.currentOrder, 
        customerName: editCustomerName, 
        customerPhone: editCustomerPhone,
        address: editAddress 
      };
      await supabase.from('tables').upsert({ id: selectedTable.id, status: 'occupied', current_order: updatedOrder });
      onRefreshData();
    } catch (err: any) {
      alert('Erro ao salvar: ' + err.message);
    } finally {
      setIsSaving(false);
    }
  };

  const handleUpdateOrderStatus = async (status: OrderStatus) => {
    if (!selectedTable || !selectedTable.currentOrder) return;
    setIsSaving(true);
    try {
      const updatedOrder = { ...selectedTable.currentOrder, status };
      await supabase.from('tables').upsert({ id: selectedTable.id, status: 'occupied', current_order: updatedOrder });
      onRefreshData();
    } catch (err: any) { alert('Erro: ' + err.message); } finally { setIsSaving(false); }
  };

  const handleAddCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCategoryName.trim()) return;
    try {
      await supabase.from('categories').insert([{ name: newCategoryName.trim() }]);
      setNewCategoryName('');
      onRefreshData();
    } catch (err: any) { alert('Erro ao criar categoria: ' + err.message); }
  };

  const handleUpdateCategory = async (id: string) => {
    if (!editingCategoryName.trim()) return;
    try {
      await supabase.from('categories').update({ name: editingCategoryName.trim() }).eq('id', id);
      setEditingCategoryId(null);
      onRefreshData();
    } catch (err: any) { alert('Erro ao renomear: ' + err.message); }
  };

  const handleToggleCoupon = async (id: string, current: boolean) => {
    await supabase.from('coupons').update({ isActive: !current }).eq('id', id);
    fetchMarketingData();
  };

  const handleUpdateLoyalty = async (updates: Partial<LoyaltyConfig>) => {
    const newLoyalty = { ...loyalty, ...updates };
    setLoyalty(newLoyalty);
    await supabase.from('loyalty_config').upsert({ id: 1, ...newLoyalty });
  };

  const handleAddCoupon = async (e: any) => {
    e.preventDefault();
    const formData = new FormData(e.target);
    const newCoupon = {
      code: formData.get('code')?.toString().toUpperCase(),
      percentage: Number(formData.get('percentage')),
      isActive: true,
      scopeType: formData.get('scopeType'),
      scopeValue: formData.get('scopeValue') || '',
    };
    await supabase.from('coupons').insert([newCoupon]);
    e.target.reset();
    setCouponScopeType('all');
    fetchMarketingData();
  };

  const handlePrint = (order: Order) => {
    const printWindow = window.open('', '_blank', 'width=300,height=600');
    if (!printWindow) return alert('Habilite pop-ups.');
    const itemsList = Array.isArray(order?.items) ? order.items : [];
    const itemsHtml = itemsList.map(item => `
      <div style="display: flex; justify-content: space-between; font-family: monospace; font-size: 11px; margin-bottom: 2px;">
        <span>${item.quantity}x ${item.name.substring(0, 16)}</span>
        <span>R$ ${Number(item.price * item.quantity).toFixed(2)}</span>
      </div>
    `).join('');
    printWindow.document.write(`
      <html><body style="font-family: monospace; width: 58mm; padding: 5px; margin: 0;">
        <div style="text-align: center; font-weight: bold; font-size: 14px;">${STORE_INFO.name}</div>
        <hr/>
        <div style="font-size: 10px;">
          PEDIDO: #${order?.id || '---'}<br/>
          CLIENTE: ${order?.customerName || 'Consumidor'}<br/>
          ${order?.customerPhone ? `FONE: ${order.customerPhone}<br/>` : ''}
          ${order?.address ? `END: ${order.address}<br/>` : ''}
          TIPO: ${(order?.orderType || 'N/A').toUpperCase()}
        </div>
        <hr/>
        ${itemsHtml}
        <hr/>
        <div style="font-weight: bold; display: flex; justify-content: space-between;">
          <span>TOTAL:</span><span>R$ ${Number(order?.finalTotal || order?.total || 0).toFixed(2)}</span>
        </div>
        <script>window.onload = function() { window.print(); window.close(); }</script>
      </body></html>
    `);
    printWindow.document.close();
  };

  const filteredMenu = useMemo(() => 
    (menuItems || []).filter(p => 
      p.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
      p.category.toLowerCase().includes(searchTerm.toLowerCase())
    ),
    [menuItems, searchTerm]
  );

  return (
    <div className="w-full">
      {/* Header Admin */}
      <div className="bg-black p-5 md:p-8 rounded-[2.5rem] shadow-2xl mb-8 border-b-4 border-yellow-400">
        <div className="flex flex-col md:flex-row justify-between items-center gap-6">
          <div className="text-center md:text-left">
            <h2 className="text-2xl md:text-3xl font-black italic text-yellow-400 leading-none mb-1 uppercase tracking-tighter">D.MOREIRA ADMIN</h2>
            <div className="flex items-center justify-center md:justify-start gap-2">
              <span className={`w-2 h-2 rounded-full ${dbStatus === 'ok' ? 'bg-green-500' : 'bg-red-500 animate-pulse'}`}></span>
              <p className="text-gray-500 font-bold text-[8px] uppercase tracking-[0.3em]">{dbStatus === 'ok' ? 'Online' : 'Conectando...'}</p>
            </div>
          </div>
          <nav className="flex flex-wrap justify-center gap-1.5 p-1 bg-gray-900 rounded-2xl w-full md:w-auto">
            {(['tables', 'delivery', 'menu', 'categories', 'marketing'] as const).map(tab => (
              <button key={tab} onClick={() => setActiveTab(tab)} className={`px-5 py-3.5 rounded-xl text-[9px] font-black uppercase tracking-wider transition-all ${activeTab === tab ? 'bg-yellow-400 text-black shadow-lg' : 'text-gray-500 hover:text-white'}`}>
                {tab === 'marketing' ? 'Marketing' : tab === 'tables' ? 'Mesas' : tab === 'delivery' ? 'Entregas' : tab === 'menu' ? 'Produtos' : 'Categorias'}
              </button>
            ))}
          </nav>
          <div className="flex items-center gap-4">
            <button onClick={handleTestSound} className="bg-white/10 hover:bg-white/20 text-white px-4 py-2 rounded-xl text-[9px] font-black uppercase transition-all">Testar Som</button>
            <button onClick={onToggleAudio} className={`p-4 rounded-full transition-all ${audioEnabled ? 'bg-yellow-400 text-black shadow-lg' : 'bg-gray-800 text-gray-600'}`}>
              <VolumeIcon muted={!audioEnabled} size={24}/>
            </button>
            <button onClick={onLogout} className="bg-red-600 text-white font-black text-xs uppercase px-8 py-4 rounded-2xl shadow-xl hover:brightness-110 active:scale-95 transition-all">Sair</button>
          </div>
        </div>
      </div>

      <div className="transition-all duration-300">
        {activeTab === 'tables' && (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-5">
            {physicalTables.map(t => {
              const statusKey = t.currentOrder?.status || 'fallback';
              const statusCfg = STATUS_CONFIG[statusKey] || STATUS_CONFIG.fallback;
              return (
                <button key={t.id} onClick={() => { setSelectedTableId(t.id); setModalTab('items'); }} className={`h-52 p-6 rounded-[2.5rem] border-2 transition-all flex flex-col items-center justify-center gap-2 relative overflow-hidden ${t.status === 'free' ? 'bg-white border-gray-100 hover:border-yellow-400' : 'bg-yellow-400 border-black shadow-xl ring-4 ring-yellow-400/20'}`}>
                  {t.currentOrder?.status === 'pending' && <div className="absolute top-0 right-0 bg-red-600 text-white text-[9px] font-black uppercase px-4 py-2 rounded-bl-2xl shadow-lg animate-pulse">NOVO</div>}
                  <span className="text-5xl font-black italic text-black">{t.id}</span>
                  <span className={`text-[8px] font-black uppercase px-2 py-1 rounded-full ${t.status === 'free' ? 'bg-gray-100 text-gray-400' : 'bg-black text-white'}`}>{t.status === 'free' ? 'Livre' : 'Ocupada'}</span>
                  {t.status === 'occupied' && (
                    <div className="flex flex-col items-center gap-1 mt-1">
                      <span className="text-[11px] font-black text-black bg-white/40 px-2 py-0.5 rounded-md italic">R$ {Number(t.currentOrder?.finalTotal || t.currentOrder?.total || 0).toFixed(2)}</span>
                      <span className={`text-[7px] font-black uppercase px-2 py-0.5 rounded-full border border-black/10 ${statusCfg.bg} ${statusCfg.color}`}>{statusCfg.label}</span>
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        )}

        {activeTab === 'delivery' && (
          <div className="space-y-10">
            <div>
              <div className="flex justify-between items-center mb-6 px-2">
                <h3 className="text-xl font-black italic uppercase tracking-widest text-gray-800">🚚 Entregas</h3>
                <button onClick={() => handleCreateManualOrder('delivery')} className="bg-black text-yellow-400 px-6 py-3 rounded-2xl font-black text-[10px] uppercase shadow-lg">+ Nova Entrega</button>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {activeDeliveries.map(t => {
                  const statusKey = t.currentOrder?.status || 'pending';
                  const statusCfg = STATUS_CONFIG[statusKey] || STATUS_CONFIG.fallback;
                  return (
                    <button key={t.id} onClick={() => { setSelectedTableId(t.id); setModalTab('items'); }} className="bg-white border-2 border-yellow-400 p-6 rounded-[2.5rem] shadow-xl hover:shadow-2xl transition-all flex flex-col text-left group">
                      <div className="flex justify-between items-start mb-4">
                        <span className="text-3xl">🚚</span>
                        <span className={`text-[9px] font-black uppercase px-3 py-1.5 rounded-full ${statusCfg.bg} ${statusCfg.color}`}>{statusCfg.label}</span>
                      </div>
                      <h4 className="font-black text-sm uppercase truncate mb-1 text-gray-900">{t.currentOrder?.customerName || 'Cliente'}</h4>
                      <p className="text-[10px] text-yellow-600 font-bold mb-1">{t.currentOrder?.customerPhone || 'Sem telefone'}</p>
                      <p className="text-[10px] text-gray-400 font-bold mb-4 line-clamp-2 min-h-[30px] leading-tight">{t.currentOrder?.address || 'Sem endereço'}</p>
                      <div className="mt-auto pt-4 border-t border-gray-50 flex justify-between items-center">
                        <span className="font-black italic text-black">R$ {Number(t.currentOrder?.finalTotal || t.currentOrder?.total || 0).toFixed(2)}</span>
                        <span className="text-[8px] font-black text-gray-300 uppercase">#{t.id}</span>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            <div>
              <div className="flex justify-between items-center mb-6 px-2">
                <h3 className="text-xl font-black italic uppercase tracking-widest text-gray-800">🛍️ Balcão</h3>
                <button onClick={() => handleCreateManualOrder('counter')} className="bg-black text-yellow-400 px-6 py-3 rounded-2xl font-black text-[10px] uppercase shadow-lg">+ Novo Balcão</button>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {activeCounters.map(t => {
                  const statusKey = t.currentOrder?.status || 'pending';
                  const statusCfg = STATUS_CONFIG[statusKey] || STATUS_CONFIG.fallback;
                  return (
                    <button key={t.id} onClick={() => { setSelectedTableId(t.id); setModalTab('items'); }} className="bg-white border-2 border-black p-6 rounded-[2.5rem] shadow-xl hover:shadow-2xl transition-all flex flex-col text-left group">
                      <div className="flex justify-between items-start mb-4">
                        <span className="text-3xl">🛍️</span>
                        <span className={`text-[9px] font-black uppercase px-3 py-1.5 rounded-full ${statusCfg.bg} ${statusCfg.color}`}>{statusCfg.label}</span>
                      </div>
                      <h4 className="font-black text-sm uppercase truncate mb-1 text-gray-900">{t.currentOrder?.customerName || 'Cliente'}</h4>
                      <p className="text-[10px] text-gray-400 font-bold mb-4">Retirada no Local</p>
                      <div className="mt-auto pt-4 border-t border-gray-50 flex justify-between items-center">
                        <span className="font-black italic text-black">R$ {Number(t.currentOrder?.finalTotal || t.currentOrder?.total || 0).toFixed(2)}</span>
                        <span className="text-[8px] font-black text-gray-300 uppercase">#{t.id}</span>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'menu' && (
          <div className="bg-white p-8 rounded-[3rem] shadow-xl border border-gray-50">
            <div className="flex justify-between items-center mb-8">
              <h3 className="text-2xl font-black italic uppercase">Gestão de Produtos</h3>
              <div className="flex gap-4">
                <input type="text" placeholder="Buscar..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="bg-gray-50 border rounded-xl px-4 py-2 text-xs font-bold outline-none" />
                <button onClick={() => { setEditingProduct({ name: '', price: '', category: categories[0]?.name || 'Diversos', image: '', isAvailable: true }); setIsProductModalOpen(true); }} className="bg-black text-yellow-400 px-8 py-4 rounded-2xl font-black text-xs uppercase shadow-xl hover:scale-105 transition-all">+ Novo Produto</button>
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {(filteredMenu || []).map(item => (
                <div key={item.id} className={`bg-gray-50 p-5 rounded-[2.5rem] border transition-all hover:shadow-xl relative ${!item.isAvailable ? 'grayscale opacity-60' : ''}`}>
                  <img src={item.image} className="w-full aspect-square object-cover rounded-[2rem] mb-4 shadow-md" />
                  <h4 className="font-black text-sm text-black mb-1 truncate uppercase">{item.name}</h4>
                  <div className="flex justify-between items-center mb-4"><span className="text-yellow-700 font-black italic text-xs">R$ {Number(item.price || 0).toFixed(2)}</span><span className="text-gray-400 uppercase font-black text-[9px]">{item.category}</span></div>
                  <div className="flex gap-2">
                    <button onClick={() => { setEditingProduct({...item, price: (item.price || 0).toString()}); setIsProductModalOpen(true); }} className="flex-1 bg-white py-3 rounded-xl font-black text-[10px] uppercase border text-black hover:bg-black hover:text-white transition-all">Editar</button>
                    <button onClick={() => onDeleteProduct(item.id)} className="p-3 text-red-500 bg-red-50 rounded-xl hover:bg-red-500 hover:text-white transition-all"><TrashIcon/></button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'categories' && (
          <div className="bg-white p-10 rounded-[3rem] shadow-xl max-w-xl mx-auto border border-gray-50 animate-in slide-in-from-bottom duration-500">
            <h3 className="text-2xl font-black italic uppercase mb-6 tracking-tighter">Gestão de Categorias</h3>
            <form onSubmit={handleAddCategory} className="flex gap-2 mb-8">
              <input type="text" value={newCategoryName} onChange={e => setNewCategoryName(e.target.value)} placeholder="Criar nova categoria..." className="flex-1 bg-gray-50 border rounded-xl px-5 py-4 text-sm font-bold outline-none focus:ring-2 focus:ring-yellow-400" />
              <button type="submit" className="bg-black text-yellow-400 px-8 py-4 rounded-xl font-black text-xs uppercase shadow-lg hover:scale-105 transition-all">Criar</button>
            </form>
            <div className="space-y-3 overflow-y-auto max-h-[400px] no-scrollbar">
              {(categories || []).map(cat => (
                <div key={cat.id} className="flex justify-between items-center bg-gray-50 p-4 rounded-2xl border border-transparent hover:border-yellow-400 transition-all group">
                  {editingCategoryId === cat.id ? (
                    <div className="flex-1 flex gap-2">
                      <input 
                        autoFocus
                        type="text" 
                        value={editingCategoryName} 
                        onChange={e => setEditingCategoryName(e.target.value)}
                        className="flex-1 bg-white border-2 border-yellow-400 rounded-lg px-3 py-1 text-xs font-black uppercase outline-none"
                      />
                      <button onClick={() => handleUpdateCategory(cat.id)} className="bg-green-500 text-white px-3 py-1 rounded-lg text-[10px] font-black uppercase">Salvar</button>
                      <button onClick={() => setEditingCategoryId(null)} className="bg-gray-300 text-gray-600 px-3 py-1 rounded-lg text-[10px] font-black uppercase">X</button>
                    </div>
                  ) : (
                    <>
                      <span className="font-black text-gray-800 uppercase text-xs italic tracking-wide">{cat.name}</span>
                      <div className="flex gap-1">
                        <button 
                          onClick={() => { setEditingCategoryId(cat.id); setEditingCategoryName(cat.name); }}
                          className="p-2 text-blue-500 hover:scale-110 transition-transform opacity-0 group-hover:opacity-100"
                        >
                          <svg width="18" height="18" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg>
                        </button>
                        <button 
                          onClick={() => { if(confirm('Excluir categoria?')) supabase.from('categories').delete().eq('id', cat.id).then(() => onRefreshData()); }} 
                          className="p-2 text-red-400 hover:scale-110 transition-transform opacity-0 group-hover:opacity-100"
                        >
                          <TrashIcon size={18} />
                        </button>
                      </div>
                    </>
                  )}
                </div>
              ))}
              {categories.length === 0 && <p className="text-center text-gray-400 py-10 font-black uppercase text-[10px]">Nenhuma categoria cadastrada</p>}
            </div>
          </div>
        )}

        {activeTab === 'marketing' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 animate-in fade-in duration-500">
            {/* Gestão de Cupons */}
            <div className="bg-white p-8 rounded-[3rem] shadow-xl border border-gray-100">
              <h3 className="text-xl font-black italic uppercase mb-6 flex items-center gap-2">🎫 Cupons de Desconto</h3>
              <form onSubmit={handleAddCoupon} className="grid grid-cols-2 gap-3 mb-8 bg-gray-50 p-6 rounded-[2rem]">
                <input name="code" placeholder="CÓDIGO" className="bg-white border p-3 rounded-xl font-bold text-xs uppercase" required />
                <input name="percentage" type="number" placeholder="% OFF" className="bg-white border p-3 rounded-xl font-bold text-xs" required />
                <select name="scopeType" value={couponScopeType} onChange={e => setCouponScopeType(e.target.value as any)} className="bg-white border p-3 rounded-xl font-bold text-[10px] uppercase">
                  <option value="all">Toda a Loja</option>
                  <option value="category">Por Categoria</option>
                  <option value="product">Por Produto</option>
                </select>
                
                {couponScopeType === 'category' ? (
                  <select name="scopeValue" className="bg-white border p-3 rounded-xl font-bold text-[10px] uppercase">
                    <option value="">Selecione Categoria</option>
                    {categories.map(c => <option key={c.id} value={c.name}>{c.name}</option>)}
                  </select>
                ) : couponScopeType === 'product' ? (
                  <select name="scopeValue" className="bg-white border p-3 rounded-xl font-bold text-[10px] uppercase">
                    <option value="">Selecione Produto</option>
                    {menuItems.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                  </select>
                ) : (
                  <input name="scopeValue" placeholder="Escopo Geral" className="bg-white border p-3 rounded-xl font-bold text-xs opacity-50" disabled />
                )}
                
                <button type="submit" className="col-span-2 bg-black text-yellow-400 py-4 rounded-xl font-black text-[10px] uppercase">Criar Cupom</button>
              </form>
              <div className="space-y-3">
                {coupons.map(c => (
                  <div key={c.id} className="flex justify-between items-center p-4 bg-gray-50 rounded-2xl border">
                    <div>
                      <span className="font-black text-sm">{c.code}</span>
                      <span className="ml-2 bg-yellow-400 text-black px-2 py-0.5 rounded text-[10px] font-black">{c.percentage}%</span>
                      <p className="text-[8px] text-gray-400 font-bold uppercase mt-1">
                        Escopo: {c.scopeType} {c.scopeValue && `(${c.scopeValue})`}
                      </p>
                    </div>
                    <button onClick={() => handleToggleCoupon(c.id, c.isActive)} className={`px-4 py-2 rounded-xl text-[8px] font-black uppercase ${c.isActive ? 'bg-green-500 text-white' : 'bg-gray-300 text-gray-600'}`}>
                      {c.isActive ? 'Ativo' : 'Inativo'}
                    </button>
                  </div>
                ))}
              </div>
            </div>

            {/* Programa de Fidelidade */}
            <div className="bg-white p-8 rounded-[3rem] shadow-xl border border-gray-100">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-xl font-black italic uppercase flex items-center gap-2">💎 Fidelidade</h3>
                <button onClick={() => handleUpdateLoyalty({ isActive: !loyalty.isActive })} className={`px-6 py-3 rounded-2xl font-black text-[10px] uppercase transition-all ${loyalty.isActive ? 'bg-green-500 text-white' : 'bg-gray-200 text-gray-400'}`}>
                  {loyalty.isActive ? 'Ativo' : 'Inativo'}
                </button>
              </div>
              <div className="space-y-4 mb-8 bg-yellow-50 p-6 rounded-[2rem] border-2 border-yellow-100">
                <div className="space-y-1">
                  <p className="text-[8px] font-black uppercase text-yellow-800 ml-1">Meta de Gastos (R$)</p>
                  <input type="number" value={loyalty.spendingGoal} onChange={e => handleUpdateLoyalty({ spendingGoal: Number(e.target.value) })} className="w-full bg-white border-2 border-yellow-200 p-4 rounded-xl font-black text-sm" placeholder="Ex: 100.00" />
                </div>
                
                <div className="space-y-1">
                  <p className="text-[8px] font-black uppercase text-yellow-800 ml-1">Escopo da Pontuação</p>
                  <select value={loyalty.scopeType} onChange={e => handleUpdateLoyalty({ scopeType: e.target.value as any, scopeValue: '' })} className="w-full bg-white border-2 border-yellow-200 p-4 rounded-xl font-black text-[10px] uppercase">
                    <option value="all">Loja Toda</option>
                    <option value="category">Categoria</option>
                    <option value="product">Produto</option>
                  </select>
                </div>

                {loyalty.scopeType === 'category' ? (
                  <div className="space-y-1">
                    <p className="text-[8px] font-black uppercase text-yellow-800 ml-1">Selecione a Categoria</p>
                    <select value={loyalty.scopeValue} onChange={e => handleUpdateLoyalty({ scopeValue: e.target.value })} className="w-full bg-white border-2 border-yellow-200 p-4 rounded-xl font-black text-[10px] uppercase">
                      <option value="">Selecione...</option>
                      {categories.map(c => <option key={c.id} value={c.name}>{c.name}</option>)}
                    </select>
                  </div>
                ) : loyalty.scopeType === 'product' ? (
                  <div className="space-y-1">
                    <p className="text-[8px] font-black uppercase text-yellow-800 ml-1">Selecione o Produto</p>
                    <select value={loyalty.scopeValue} onChange={e => handleUpdateLoyalty({ scopeValue: e.target.value })} className="w-full bg-white border-2 border-yellow-200 p-4 rounded-xl font-black text-[10px] uppercase">
                      <option value="">Selecione...</option>
                      {menuItems.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                    </select>
                  </div>
                ) : null}
              </div>
              
              <div className="max-h-[300px] overflow-y-auto space-y-2 no-scrollbar">
                <p className="text-[10px] font-black uppercase text-gray-400 mb-2 ml-1">Top Clientes Acumuladores</p>
                {loyaltyUsers.map((user, i) => (
                  <div key={user.phone} className="flex justify-between items-center p-4 bg-gray-50 rounded-2xl border border-transparent hover:border-yellow-200 transition-all">
                    <div className="flex items-center gap-3">
                      <span className="w-6 h-6 bg-black text-yellow-400 rounded-full flex items-center justify-center text-[10px] font-black">{i+1}</span>
                      <div><p className="font-black text-xs uppercase text-gray-900">{user.name}</p><p className="text-[9px] text-gray-400 font-bold">{user.phone}</p></div>
                    </div>
                    <div className="text-right">
                      <p className="text-[10px] font-black text-yellow-700 italic">R$ {user.accumulated.toFixed(2)}</p>
                      {user.accumulated >= loyalty.spendingGoal && <span className="text-[7px] bg-green-500 text-white px-1.5 py-0.5 rounded font-black uppercase">Meta Batida</span>}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Modal de Pedido */}
      {selectedTable && (
        <div className="fixed inset-0 z-[300] flex items-center justify-center p-0 md:p-4 animate-in fade-in duration-200">
          <div className="absolute inset-0 bg-black/90 backdrop-blur-sm" onClick={() => setSelectedTableId(null)} />
          <div className="relative bg-white w-full max-w-5xl h-full md:h-[85vh] md:rounded-[3.5rem] flex flex-col overflow-hidden shadow-2xl border-t-8 border-yellow-400">
            <div className="p-6 md:p-10 border-b flex justify-between items-center bg-white sticky top-0 z-20">
              <div className="flex-1 mr-4">
                <h3 className="text-2xl md:text-4xl font-black italic uppercase leading-none mb-4 text-gray-900">
                  {selectedTable.id >= 950 ? '🛍️ Balcão' : selectedTable.id >= 900 ? '🚚 Entrega' : `Mesa ${selectedTable.id}`}
                </h3>
                <div className="flex flex-wrap items-center gap-2">
                  <input type="text" value={editCustomerName} onChange={e => setEditCustomerName(e.target.value)} placeholder="Nome" className="text-[10px] font-black uppercase text-gray-700 bg-gray-100 px-4 py-2.5 rounded-full border-none outline-none flex-1 min-w-[150px]" />
                  <input type="tel" value={editCustomerPhone} onChange={e => setEditCustomerPhone(e.target.value)} placeholder="Telefone" className="text-[10px] font-black uppercase text-gray-700 bg-gray-100 px-4 py-2.5 rounded-full border-none outline-none flex-1 min-w-[120px]" />
                  <button onClick={handleUpdateCustomerData} disabled={isSaving} className="text-[8px] font-black uppercase bg-black text-yellow-400 px-6 py-2.5 rounded-full shadow-lg">Salvar</button>
                </div>
              </div>
              <div className="flex gap-2">
                <button onClick={() => handlePrint(selectedTable.currentOrder!)} className="p-4 bg-black text-yellow-400 rounded-full shadow-xl"><PrinterIcon size={24} /></button>
                <button onClick={() => setSelectedTableId(null)} className="p-4 bg-gray-100 rounded-full"><CloseIcon size={24} /></button>
              </div>
            </div>

            <div className="flex-1 flex flex-col md:flex-row overflow-hidden">
              <div className="flex-1 p-6 md:p-10 overflow-y-auto flex flex-col">
                {selectedTable.id >= 900 && selectedTable.id <= 949 && (
                   <div className="bg-yellow-50 border-2 border-yellow-300 p-6 rounded-[2rem] mb-8">
                      <p className="text-[10px] font-black uppercase text-yellow-800 mb-3 tracking-widest">Endereço</p>
                      <textarea value={editAddress} onChange={e => setEditAddress(e.target.value)} placeholder="Endereço de Entrega..." className="w-full bg-white border-2 border-yellow-200 rounded-2xl p-4 text-xs font-black uppercase h-24 resize-none outline-none" />
                   </div>
                )}
                <div className="bg-gray-100 p-1.5 rounded-2xl mb-8 flex gap-1">
                  {(['preparing', 'ready', 'delivered'] as OrderStatus[]).map(s => (
                    <button key={s} disabled={isSaving} onClick={() => handleUpdateOrderStatus(s)} className={`flex-1 py-3.5 rounded-xl text-[9px] font-black uppercase tracking-wider transition-all ${selectedTable.currentOrder?.status === s ? 'bg-black text-yellow-400 shadow-xl' : 'text-gray-400'}`}>{STATUS_CONFIG[s].label}</button>
                  ))}
                </div>
                <div className="flex-1 space-y-3 mb-8">
                  {(selectedTable.currentOrder?.items || []).map((item, idx) => (
                    <div key={idx} className="flex justify-between items-center bg-gray-50 p-5 rounded-3xl border border-gray-100">
                      <span className="font-black text-xs text-gray-800 uppercase leading-none">{item.quantity}x {item.name}</span>
                      <span className="font-black text-xs text-yellow-700 italic">R$ {Number(item.price * item.quantity).toFixed(2)}</span>
                    </div>
                  ))}
                </div>
                <div className="border-t-2 pt-6">
                  <div className="flex justify-between items-end mb-6"><span className="text-gray-400 font-black text-[10px] uppercase">Total</span><span className="text-4xl font-black italic text-black leading-none">R$ {Number(selectedTable.currentOrder?.finalTotal || selectedTable.currentOrder?.total || 0).toFixed(2)}</span></div>
                  <button onClick={() => { if(confirm('Concluir e liberar vaga?')) onUpdateTable(selectedTable.id, 'free'); setSelectedTableId(null); }} className="w-full bg-green-600 text-white py-5 rounded-2xl font-black uppercase text-[10px] shadow-lg border-b-4 border-green-800">Finalizar & Liberar</button>
                </div>
              </div>
              <div className="w-full md:w-[24rem] bg-gray-50 p-6 md:p-10 flex flex-col border-t md:border-t-0 md:border-l">
                 <h4 className="text-[10px] font-black uppercase mb-6 bg-yellow-400 px-6 py-2.5 rounded-full w-fit">Adicionar Itens</h4>
                 <div className="flex-1 overflow-y-auto space-y-2 no-scrollbar">
                    {(menuItems || []).filter(p => p.isAvailable).map(p => (
                      <button key={p.id} onClick={() => onAddToOrder(selectedTable.id, p)} className="w-full bg-white p-4 rounded-2xl border-2 border-transparent hover:border-black flex justify-between items-center transition-all shadow-sm">
                        <div className="text-left"><p className="font-black text-[10px] uppercase truncate w-32 text-gray-900">{p.name}</p><p className="text-yellow-700 font-black text-[9px] italic mt-1">R$ {Number(p.price || 0).toFixed(2)}</p></div>
                        <span className="bg-yellow-400 text-black font-black text-[8px] px-3.5 py-2 rounded-xl">+ ADD</span>
                      </button>
                    ))}
                 </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal Produto */}
      {isProductModalOpen && (
        <div className="fixed inset-0 z-[400] flex items-center justify-center p-6 bg-black/95 backdrop-blur-xl animate-in fade-in duration-300">
          <div className="bg-white w-full max-w-xl rounded-[3.5rem] p-10 relative shadow-2xl animate-in zoom-in">
             <button onClick={() => setIsProductModalOpen(false)} className="absolute top-10 right-10 p-4 bg-gray-100 rounded-full"><CloseIcon size={24}/></button>
             <h3 className="text-3xl font-black italic mb-10 uppercase tracking-tighter">Dados do Produto</h3>
             <form onSubmit={(e) => { e.preventDefault(); onSaveProduct({ ...editingProduct, price: parseFloat(editingProduct.price) }); setIsProductModalOpen(false); }} className="space-y-6">
                <input type="text" value={editingProduct?.name || ''} onChange={e => setEditingProduct({...editingProduct!, name: e.target.value})} placeholder="Nome" className="w-full bg-gray-50 border-2 rounded-2xl px-6 py-4 text-sm font-bold outline-none focus:border-yellow-400" required />
                <div className="grid grid-cols-2 gap-4">
                    <input type="number" step="0.01" value={editingProduct?.price || ''} onChange={e => setEditingProduct({...editingProduct!, price: e.target.value})} placeholder="Preço" className="w-full bg-gray-50 border-2 rounded-2xl px-6 py-4 text-sm font-bold outline-none" required />
                    <select value={editingProduct?.category} onChange={e => setEditingProduct({...editingProduct!, category: e.target.value})} className="w-full bg-gray-50 border-2 rounded-2xl px-6 py-4 text-sm font-bold outline-none">
                      {categories.map(cat => <option key={cat.id} value={cat.name}>{cat.name}</option>)}
                    </select>
                </div>
                <input type="text" value={editingProduct?.image || ''} onChange={e => setEditingProduct({...editingProduct!, image: e.target.value})} placeholder="URL Imagem" className="w-full bg-gray-50 border-2 rounded-2xl px-6 py-4 text-sm font-bold outline-none" />
                <button type="submit" className="w-full bg-black text-yellow-400 py-6 rounded-3xl font-black text-xs uppercase shadow-2xl">Salvar Alterações</button>
             </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminPanel;
