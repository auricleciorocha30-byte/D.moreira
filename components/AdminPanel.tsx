
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

  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [loyalty, setLoyalty] = useState<LoyaltyConfig>({ isActive: false, spendingGoal: 100, scopeType: 'all', scopeValue: '' });
  const [loyaltyUsers, setLoyaltyUsers] = useState<LoyaltyUser[]>([]);
  const [couponScopeType, setCouponScopeType] = useState<'all' | 'category' | 'product'>('all');

  useEffect(() => {
    fetchMarketingData();
  }, []);

  const fetchMarketingData = async () => {
    const { data: cData } = await supabase.from('coupons').select('*');
    if (cData) {
      setCoupons(cData.map(c => ({
        id: c.id,
        code: c.code,
        percentage: c.percentage,
        isActive: c.is_active,
        scopeType: c.scope_type,
        scopeValue: c.scope_value
      })));
    }
    
    const { data: lConfig } = await supabase.from('loyalty_config').select('*').maybeSingle();
    if (lConfig) {
      setLoyalty({
        isActive: lConfig.is_active,
        spendingGoal: lConfig.spending_goal,
        scopeType: lConfig.scope_type,
        scopeValue: lConfig.scope_value
      });
    }

    const { data: lUsers } = await supabase.from('loyalty_users').select('*').order('accumulated', { ascending: false });
    if (lUsers) setLoyaltyUsers(lUsers);
  };

  const handleTestSound = () => {
    const audio = new Audio('https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3');
    audio.play().then(() => alert('Som configurado!')).catch(e => alert('Erro: ' + e.message));
  };

  const physicalTables = useMemo(() => (tables || []).filter(t => t.id >= 1 && t.id <= 12).sort((a,b) => a.id - b.id), [tables]);
  const activeDeliveries = useMemo(() => (tables || []).filter(t => t.id >= 900 && t.id <= 949 && t.status === 'occupied' && t.currentOrder?.orderType === 'delivery').sort((a,b) => a.id - b.id), [tables]);
  const activeCounters = useMemo(() => (tables || []).filter(t => t.id >= 950 && t.id <= 999 && t.status === 'occupied' && (t.currentOrder?.orderType === 'counter' || t.currentOrder?.orderType === 'takeaway')).sort((a,b) => a.id - b.id), [tables]);
  const selectedTable = useMemo(() => (tables || []).find(t => t.id === selectedTableId) || null, [tables, selectedTableId]);

  useEffect(() => {
    if (selectedTable?.currentOrder) {
      setEditCustomerName(selectedTable.currentOrder.customerName || '');
      setEditCustomerPhone(selectedTable.currentOrder.customerPhone || '');
      setEditAddress(selectedTable.currentOrder.address || '');
    }
  }, [selectedTableId, selectedTable]);

  // Fix: Added filteredMenu to support search in the products tab
  const filteredMenu = useMemo(() => {
    return menuItems.filter(item => 
      item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.category.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [menuItems, searchTerm]);

  // Fix: Implemented handlePrint to generate a printable version of the order
  const handlePrint = (order: Order) => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    const itemsHtml = order.items.map(item => `
      <div style="display: flex; justify-content: space-between; margin-bottom: 5px; font-family: monospace;">
        <span>${item.quantity}x ${item.name}</span>
        <span>R$ ${(item.price * item.quantity).toFixed(2)}</span>
      </div>
    `).join('');

    printWindow.document.write(`
      <html>
        <head>
          <title>Impressão de Pedido - ${order.id}</title>
          <style>
            body { font-family: monospace; padding: 20px; width: 300px; }
            .header { text-align: center; border-bottom: 1px dashed #000; padding-bottom: 10px; margin-bottom: 10px; }
            .total { border-top: 1px dashed #000; margin-top: 10px; padding-top: 10px; font-weight: bold; }
          </style>
        </head>
        <body>
          <div class="header">
            <h2>${STORE_INFO.name}</h2>
            <p>${STORE_INFO.slogan}</p>
            <p>Pedido: #${order.id}</p>
            <p>Mesa/Ref: ${order.tableId}</p>
            <p>${new Date(order.timestamp).toLocaleString()}</p>
          </div>
          <div class="items">
            ${itemsHtml}
          </div>
          <div class="total">
            <div style="display: flex; justify-content: space-between;">
              <span>Subtotal:</span>
              <span>R$ ${order.total.toFixed(2)}</span>
            </div>
            ${order.discount ? `
            <div style="display: flex; justify-content: space-between; color: red;">
              <span>Desconto:</span>
              <span>- R$ ${order.discount.toFixed(2)}</span>
            </div>` : ''}
            <div style="display: flex; justify-content: space-between; font-size: 1.2em; margin-top: 5px;">
              <span>TOTAL:</span>
              <span>R$ ${order.finalTotal.toFixed(2)}</span>
            </div>
          </div>
          <div style="margin-top: 20px; text-align: center; font-size: 0.8em;">
            <p>Obrigado pela preferência!</p>
          </div>
          <script>
            window.onload = () => {
              window.print();
              window.onafterprint = () => window.close();
            };
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

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
  };

  const handleUpdateCustomerData = async () => {
    if (!selectedTable || !selectedTable.currentOrder) return;
    setIsSaving(true);
    try {
      const updatedOrder = { ...selectedTable.currentOrder, customerName: editCustomerName, customerPhone: editCustomerPhone, address: editAddress };
      await supabase.from('tables').upsert({ id: selectedTable.id, status: 'occupied', current_order: updatedOrder });
      onRefreshData();
    } catch (err: any) { alert('Erro: ' + err.message); } finally { setIsSaving(false); }
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

  const handleToggleCoupon = async (id: string, current: boolean) => {
    await supabase.from('coupons').update({ is_active: !current }).eq('id', id);
    fetchMarketingData();
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
    else { e.target.reset(); fetchMarketingData(); }
  };

  const handleUpdateLoyalty = async (updates: Partial<LoyaltyConfig>) => {
    const dbUpdates: any = {};
    if (updates.isActive !== undefined) dbUpdates.is_active = updates.isActive;
    if (updates.spendingGoal !== undefined) dbUpdates.spending_goal = updates.spendingGoal;
    if (updates.scopeType !== undefined) dbUpdates.scope_type = updates.scopeType;
    if (updates.scopeValue !== undefined) dbUpdates.scope_value = updates.scopeValue;
    await supabase.from('loyalty_config').upsert({ id: 1, ...dbUpdates });
    fetchMarketingData();
  };

  const productsInPromotion = useMemo(() => {
    const activeC = coupons.filter(c => c.isActive);
    return menuItems.filter(p => activeC.some(c => 
      c.scopeType === 'all' || 
      (c.scopeType === 'category' && c.scopeValue === p.category) ||
      (c.scopeType === 'product' && c.scopeValue === p.id)
    )).map(p => {
      const c = activeC.find(c => c.scopeType === 'all' || (c.scopeType === 'category' && c.scopeValue === p.category) || (c.scopeType === 'product' && c.scopeValue === p.id));
      return { ...p, promoCode: c?.code };
    });
  }, [menuItems, coupons]);

  return (
    <div className="w-full">
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
        {activeTab === 'marketing' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 animate-in fade-in duration-500">
            <div className="bg-white p-8 rounded-[3rem] shadow-xl border border-gray-100 flex flex-col">
              <h3 className="text-xl font-black italic uppercase mb-6 flex items-center gap-2">🎫 Cupons de Desconto</h3>
              <form onSubmit={handleAddCoupon} className="grid grid-cols-2 gap-3 mb-8 bg-gray-50 p-6 rounded-[2rem]">
                <input name="code" placeholder="CÓDIGO" className="bg-white border p-3 rounded-xl font-bold text-xs uppercase" required />
                <input name="percentage" type="number" placeholder="% OFF" className="bg-white border p-3 rounded-xl font-bold text-xs" required />
                <select name="scopeType" value={couponScopeType} onChange={e => setCouponScopeType(e.target.value as any)} className="bg-white border p-3 rounded-xl font-bold text-[10px] uppercase">
                  <option value="all">Toda a Loja</option>
                  <option value="category">Por Categoria</option>
                  <option value="product">Por Produto</option>
                </select>
                {couponScopeType !== 'all' && (
                  <select name="scopeValue" className="bg-white border p-3 rounded-xl font-bold text-[10px] uppercase" required>
                    <option value="">Selecione...</option>
                    {couponScopeType === 'category' ? categories.map(c => <option key={c.id} value={c.name}>{c.name}</option>) : menuItems.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                  </select>
                )}
                <button type="submit" className="col-span-2 bg-black text-yellow-400 py-4 rounded-xl font-black text-[10px] uppercase">Criar Cupom</button>
              </form>
              <div className="space-y-4">
                <p className="text-[10px] font-black uppercase text-gray-400 ml-1">Cupons Criados</p>
                <div className="space-y-3 max-h-[300px] overflow-y-auto no-scrollbar">
                  {coupons.map(c => (
                    <div key={c.id} className="flex justify-between items-center p-4 bg-gray-50 rounded-2xl border hover:border-yellow-400 transition-all">
                      <div className="flex-1">
                        <div className="flex items-center gap-2"><span className="font-black text-sm">{c.code}</span><span className="bg-yellow-400 text-black px-2 py-0.5 rounded text-[10px] font-black">{c.percentage}%</span></div>
                        <p className="text-[8px] text-gray-400 font-bold uppercase mt-1">Alvo: {c.scopeType} {c.scopeValue}</p>
                      </div>
                      <button onClick={() => handleToggleCoupon(c.id, c.isActive)} className={`px-4 py-2 rounded-xl text-[8px] font-black uppercase transition-all shadow-sm ${c.isActive ? 'bg-green-500 text-white shadow-green-200' : 'bg-gray-300 text-gray-600'}`}>
                        {c.isActive ? 'Ativado' : 'Desativado'}
                      </button>
                    </div>
                  ))}
                </div>
              </div>
              <div className="mt-8 border-t pt-6">
                 <h4 className="text-[10px] font-black uppercase text-gray-400 mb-4 ml-1">Itens em Promoção</h4>
                 <div className="flex flex-wrap gap-2">
                    {productsInPromotion.map(p => (
                      <div key={p.id} className="bg-green-50 text-green-700 px-3 py-2 rounded-xl border border-green-100 flex items-center gap-2">
                        <span className="text-[9px] font-black uppercase italic">{p.name}</span>
                        <span className="bg-green-600 text-white text-[7px] px-1.5 py-0.5 rounded font-black">{p.promoCode}</span>
                      </div>
                    ))}
                 </div>
              </div>
            </div>

            <div className="bg-white p-8 rounded-[3rem] shadow-xl border border-gray-100 flex flex-col">
              <div className="flex justify-between items-center mb-6"><h3 className="text-xl font-black italic uppercase flex items-center gap-2">💎 Fidelidade</h3><button onClick={() => handleUpdateLoyalty({ isActive: !loyalty.isActive })} className={`px-6 py-3 rounded-2xl font-black text-[10px] uppercase transition-all ${loyalty.isActive ? 'bg-green-500 text-white' : 'bg-gray-200 text-gray-400'}`}>{loyalty.isActive ? 'Ativo' : 'Inativo'}</button></div>
              <div className="space-y-4 mb-8 bg-yellow-50 p-6 rounded-[2rem] border-2 border-yellow-100">
                <input type="number" value={loyalty.spendingGoal} onChange={e => handleUpdateLoyalty({ spendingGoal: Number(e.target.value) })} className="w-full bg-white border-2 border-yellow-200 p-4 rounded-xl font-black text-sm" placeholder="Meta R$" />
                <select value={loyalty.scopeType} onChange={e => handleUpdateLoyalty({ scopeType: e.target.value as any })} className="w-full bg-white border-2 border-yellow-200 p-4 rounded-xl font-black text-[10px] uppercase"><option value="all">Toda a Loja</option><option value="category">Categoria</option><option value="product">Produto</option></select>
              </div>
              <div className="max-h-[300px] overflow-y-auto space-y-2 no-scrollbar">
                {loyaltyUsers.map((user, i) => (
                  <div key={user.phone} className="flex justify-between items-center p-4 bg-gray-50 rounded-2xl border border-transparent hover:border-yellow-200 transition-all">
                    <div className="flex items-center gap-3"><span className="w-6 h-6 bg-black text-yellow-400 rounded-full flex items-center justify-center text-[10px] font-black">{i+1}</span><div><p className="font-black text-xs uppercase">{user.name}</p><p className="text-[9px] text-gray-400">{user.phone}</p></div></div>
                    <p className="text-[10px] font-black text-yellow-700 italic">R$ {user.accumulated.toFixed(2)}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'tables' && (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-5">
            {physicalTables.map(t => {
              const statusKey = t.currentOrder?.status || 'fallback';
              const statusCfg = STATUS_CONFIG[statusKey] || STATUS_CONFIG.fallback;
              return (
                <button key={t.id} onClick={() => { setSelectedTableId(t.id); }} className={`h-52 p-6 rounded-[2.5rem] border-2 transition-all flex flex-col items-center justify-center gap-2 relative overflow-hidden ${t.status === 'free' ? 'bg-white border-gray-100 hover:border-yellow-400' : 'bg-yellow-400 border-black shadow-xl ring-4 ring-yellow-400/20'}`}>
                  {t.currentOrder?.status === 'pending' && <div className="absolute top-0 right-0 bg-red-600 text-white text-[9px] font-black uppercase px-4 py-2 rounded-bl-2xl shadow-lg animate-pulse">NOVO</div>}
                  <span className="text-5xl font-black italic text-black">{t.id}</span>
                  <span className={`text-[8px] font-black uppercase px-2 py-1 rounded-full ${t.status === 'free' ? 'bg-gray-100 text-gray-400' : 'bg-black text-white'}`}>{t.status === 'free' ? 'Livre' : 'Ocupada'}</span>
                  {t.status === 'occupied' && (
                    <div className="flex flex-col items-center gap-1 mt-1">
                      <span className="text-[11px] font-black text-black bg-white/40 px-2 py-0.5 rounded-md italic">R$ {Number(t.currentOrder?.finalTotal || 0).toFixed(2)}</span>
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
            <div className="flex justify-between items-center px-2">
              <h3 className="text-xl font-black italic uppercase tracking-widest text-gray-800">🚚 Entregas Ativas</h3>
              <button onClick={() => handleCreateManualOrder('delivery')} className="bg-black text-yellow-400 px-6 py-3 rounded-2xl font-black text-[10px] uppercase shadow-lg">+ Entrega</button>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {activeDeliveries.map(t => (
                <button key={t.id} onClick={() => setSelectedTableId(t.id)} className="bg-white border-2 border-yellow-400 p-6 rounded-[2.5rem] shadow-xl text-left">
                  <div className="flex justify-between mb-4"><span className="text-2xl">🚚</span><span className="text-[9px] font-black uppercase px-2 py-1 bg-yellow-100 rounded-full">#{t.id}</span></div>
                  <h4 className="font-black text-sm uppercase truncate mb-1">{t.currentOrder?.customerName}</h4>
                  <p className="text-[9px] text-gray-400 font-bold truncate">{t.currentOrder?.address}</p>
                </button>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'menu' && (
          <div className="bg-white p-8 rounded-[3rem] shadow-xl border border-gray-50">
            <div className="flex justify-between items-center mb-8">
              <h3 className="text-2xl font-black italic uppercase">Produtos</h3>
              <div className="flex items-center gap-4">
                <input 
                  type="text" 
                  value={searchTerm} 
                  onChange={(e) => setSearchTerm(e.target.value)} 
                  placeholder="Pesquisar..." 
                  className="bg-gray-50 border-2 border-transparent focus:border-yellow-400 rounded-xl px-4 py-2 text-xs font-bold outline-none transition-all"
                />
                <button onClick={() => { setEditingProduct({ name: '', price: '', category: categories[0]?.name, image: '', isAvailable: true }); setIsProductModalOpen(true); }} className="bg-black text-yellow-400 px-8 py-4 rounded-2xl font-black text-xs uppercase shadow-xl">+ Novo</button>
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-6">
              {filteredMenu.map(item => (
                <div key={item.id} className="bg-gray-50 p-5 rounded-[2.5rem] border relative">
                  <img src={item.image} className="w-full aspect-square object-cover rounded-[2rem] mb-4" />
                  <h4 className="font-black text-xs uppercase truncate">{item.name}</h4>
                  <div className="flex justify-between items-center mt-2"><span className="text-yellow-700 font-black italic text-xs">R$ {item.price.toFixed(2)}</span><button onClick={() => onDeleteProduct(item.id)} className="p-2 text-red-500 hover:bg-red-50 rounded-lg"><TrashIcon/></button></div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {selectedTable && (
        <div className="fixed inset-0 z-[300] flex items-center justify-center p-0 md:p-4 animate-in fade-in duration-200">
          <div className="absolute inset-0 bg-black/90 backdrop-blur-sm" onClick={() => setSelectedTableId(null)} />
          <div className="relative bg-white w-full max-w-5xl h-full md:h-[85vh] md:rounded-[3.5rem] flex flex-col overflow-hidden shadow-2xl border-t-8 border-yellow-400">
            <div className="p-6 md:p-10 border-b flex justify-between items-center bg-white">
              <div>
                <h3 className="text-2xl font-black uppercase italic">{selectedTable.id >= 900 ? 'Entrega/Balcão' : `Mesa ${selectedTable.id}`}</h3>
                <p className="text-[10px] font-bold text-gray-400">{selectedTable.currentOrder?.customerName}</p>
              </div>
              <div className="flex gap-2">
                <button onClick={() => handlePrint(selectedTable.currentOrder!)} className="p-3 bg-gray-100 rounded-full"><PrinterIcon/></button>
                <button onClick={() => setSelectedTableId(null)} className="p-3 bg-gray-100 rounded-full"><CloseIcon/></button>
              </div>
            </div>
            <div className="flex-1 flex flex-col md:flex-row overflow-hidden">
               <div className="flex-1 p-6 overflow-y-auto">
                  <div className="space-y-3 mb-8">
                    {selectedTable.currentOrder?.items.map((item, i) => (
                      <div key={i} className="flex justify-between bg-gray-50 p-4 rounded-2xl"><span className="font-black text-xs uppercase">{item.quantity}x {item.name}</span><span className="font-black text-xs">R$ {(item.price*item.quantity).toFixed(2)}</span></div>
                    ))}
                  </div>
                  <div className="border-t pt-6 sticky bottom-0 bg-white">
                    <div className="flex justify-between items-end mb-6"><span className="text-[10px] font-black uppercase text-gray-400">Total</span><span className="text-3xl font-black italic">R$ {selectedTable.currentOrder?.finalTotal.toFixed(2)}</span></div>
                    <button onClick={() => { onUpdateTable(selectedTable.id, 'free'); setSelectedTableId(null); }} className="w-full bg-green-600 text-white py-4 rounded-xl font-black uppercase text-[10px]">Concluir Pedido</button>
                  </div>
               </div>
               <div className="w-full md:w-80 bg-gray-50 border-l p-6 overflow-y-auto max-h-[40vh] md:max-h-full">
                  <h4 className="text-[10px] font-black uppercase mb-4">Mudar Status</h4>
                  <div className="grid grid-cols-3 gap-1 mb-6">
                    {['preparing', 'ready', 'delivered'].map(s => (
                      <button key={s} onClick={() => handleUpdateOrderStatus(s as any)} className={`py-3 rounded-lg text-[8px] font-black uppercase border-2 ${selectedTable.currentOrder?.status === s ? 'bg-black text-white border-black' : 'bg-white text-gray-400'}`}>{s}</button>
                    ))}
                  </div>
                  <h4 className="text-[10px] font-black uppercase mb-4">Adicionar Itens</h4>
                  <div className="space-y-2">
                    {menuItems.filter(p => p.isAvailable).map(p => (
                      <button key={p.id} onClick={() => onAddToOrder(selectedTable.id, p)} className="w-full bg-white p-3 rounded-xl border flex justify-between items-center text-[10px] font-black uppercase"><span>{p.name}</span><span className="text-yellow-600">+ ADD</span></button>
                    ))}
                  </div>
               </div>
            </div>
          </div>
        </div>
      )}

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
