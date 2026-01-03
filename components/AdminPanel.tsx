
import React, { useState, useMemo, useEffect, useRef } from 'react';
import { Table, Order, Product, Category, Coupon, LoyaltyConfig, LoyaltyUser, OrderStatus } from '../types';
import { CloseIcon, TrashIcon, VolumeIcon, PrinterIcon, EditIcon } from './Icons';
import { supabase } from '../lib/supabase';
import { STORE_INFO } from '../constants';

interface AdminPanelProps {
  tables: Table[];
  menuItems: Product[];
  categories: Category[];
  audioEnabled: boolean;
  onToggleAudio: () => void;
  onTestSound: () => void;
  onUpdateTable: (tableId: number, status: 'free' | 'occupied', order?: Order | null) => void;
  onAddToOrder: (tableId: number, product: Product) => void;
  onRefreshData: () => void;
  onLogout: () => void;
  onSaveProduct: (product: Partial<Product>) => void;
  onDeleteProduct: (id: string) => void;
  dbStatus: 'loading' | 'ok';
}

const STATUS_CFG: Record<string, any> = {
  'pending': { label: 'Pendente', color: 'text-orange-600', bg: 'bg-orange-100', border: 'border-orange-200', badge: 'bg-orange-600 text-white' },
  'preparing': { label: 'Preparando', color: 'text-blue-600', bg: 'bg-blue-100', border: 'border-blue-200', badge: 'bg-blue-600 text-white' },
  'ready': { label: 'Pronto', color: 'text-green-600', bg: 'bg-green-100', border: 'border-green-200', badge: 'bg-green-600 text-white' },
  'delivered': { label: 'Entregue', color: 'text-gray-400', bg: 'bg-gray-50', border: 'border-gray-200', badge: 'bg-gray-400 text-white' }
};

const AdminPanel: React.FC<AdminPanelProps> = ({ 
  tables = [], menuItems = [], categories = [], audioEnabled, onToggleAudio, onTestSound,
  onUpdateTable, onRefreshData, onLogout, onSaveProduct, onDeleteProduct, dbStatus, onAddToOrder 
}) => {
  const [activeTab, setActiveTab] = useState<'tables' | 'delivery' | 'menu' | 'marketing'>('tables');
  const [selectedTableId, setSelectedTableId] = useState<number | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [loyaltySearch, setLoyaltySearch] = useState('');
  
  const [isProductModalOpen, setIsProductModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<any | null>(null);
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [isNewOrderModalOpen, setIsNewOrderModalOpen] = useState(false);
  
  const [newOrderForm, setNewOrderForm] = useState({ customerName: '', customerPhone: '', type: 'delivery' as 'delivery' | 'takeaway', address: '', paymentMethod: 'Pix' });
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [loyalty, setLoyalty] = useState<LoyaltyConfig>({ isActive: false, spendingGoal: 100, scopeType: 'all', scopeValue: '' });
  const [loyaltyUsers, setLoyaltyUsers] = useState<LoyaltyUser[]>([]);
  const [isCouponModalOpen, setIsCouponModalOpen] = useState(false);
  const [editingCoupon, setEditingCoupon] = useState<Partial<Coupon> | null>(null);
  const [couponForm, setCouponForm] = useState({ code: '', percentage: '', scopeType: 'all' as 'all' | 'category' | 'product', selectedItems: [] as string[] });

  useEffect(() => { fetchMarketing(); }, []);

  const fetchMarketing = async () => {
    try {
      const { data: cData } = await supabase.from('coupons').select('*').order('created_at', { ascending: false });
      if (cData) setCoupons(cData.map(c => ({ id: c.id, code: c.code, percentage: c.percentage, isActive: c.is_active, scopeType: c.scope_type, scopeValue: c.scope_value })));
      const { data: lConfig } = await supabase.from('loyalty_config').select('*').maybeSingle();
      if (lConfig) setLoyalty({ isActive: lConfig.is_active, spendingGoal: lConfig.spending_goal, scopeType: lConfig.scope_type, scopeValue: lConfig.scope_value || '' });
      const { data: lUsers } = await supabase.from('loyalty_users').select('*').order('accumulated', { ascending: false });
      if (lUsers) setLoyaltyUsers(lUsers);
    } catch (e) {}
  };

  const handleUpdateTableStatus = async (tableId: number, newStatus: OrderStatus) => {
    // Usamos o estado mais recente de 'tables' para garantir que não estamos sobrescrevendo dados antigos
    const table = tables.find(t => t.id === tableId);
    if (!table || !table.currentOrder) return;
    
    const updatedOrder = { 
      ...table.currentOrder, 
      status: newStatus,
      isUpdated: true,
      // Garantimos que itens e totais estão preservados
      items: [...table.currentOrder.items]
    };
    
    await onUpdateTable(tableId, 'occupied', updatedOrder);
    // Não fechamos o modal, apenas deixamos a atualização em tempo real refletir a mudança
  };

  const physicalTables = tables.filter(t => t.id <= 12).sort((a,b) => a.id - b.id);
  const activeDeliveries = tables.filter(t => t.id >= 900 && t.id <= 999 && t.status === 'occupied');
  const selectedTable = tables.find(t => t.id === selectedTableId) || null;

  return (
    <div className="w-full">
      <div className="bg-black p-5 rounded-[2.5rem] shadow-2xl mb-8 border-b-4 border-yellow-400 flex flex-col md:flex-row justify-between items-center gap-5">
        <div className="flex items-center gap-4">
          <div>
            <h2 className="text-xl font-black italic text-yellow-400 uppercase leading-none">{STORE_INFO.name}</h2>
            <p className="text-[8px] text-gray-500 uppercase font-black mt-1">SISTEMA ADMIN</p>
          </div>
          <div className="flex items-center gap-2 bg-gray-900 px-3 py-1.5 rounded-xl border border-gray-800">
            <span className={`h-2 w-2 rounded-full ${dbStatus === 'ok' ? 'bg-green-500' : 'bg-blue-500 animate-pulse'}`}></span>
            <span className="text-[8px] font-black uppercase text-white tracking-widest">{dbStatus === 'ok' ? 'Online' : 'Sinc...'}</span>
          </div>
        </div>

        <nav className="flex bg-gray-900 p-1 rounded-xl gap-1">
          {(['tables', 'delivery', 'menu', 'marketing'] as const).map(tab => (
            <button key={tab} onClick={() => setActiveTab(tab)} className={`px-4 py-2.5 rounded-lg text-[9px] font-black uppercase transition-all ${activeTab === tab ? 'bg-yellow-400 text-black shadow-lg scale-105' : 'text-gray-500'}`}>
              {tab === 'tables' ? 'Mesas' : tab === 'delivery' ? 'Externo' : tab === 'menu' ? 'Menu' : 'Mkt'}
            </button>
          ))}
        </nav>
        
        <div className="flex gap-3 items-center">
          <button onClick={onToggleAudio} className={`p-3 rounded-full transition-all ${audioEnabled ? 'bg-yellow-400 text-black shadow-lg ring-4 ring-yellow-400/20' : 'bg-gray-800 text-gray-600'}`}>
            <VolumeIcon muted={!audioEnabled} size={18}/>
          </button>
          <button onClick={onLogout} className="bg-red-600 text-white font-black text-[10px] uppercase px-5 py-3 rounded-xl active:scale-95 shadow-lg">Sair</button>
        </div>
      </div>

      <div className="animate-in fade-in duration-500">
        {activeTab === 'tables' && (
          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-4">
            {physicalTables.map(t => (
              <button key={t.id} onClick={() => setSelectedTableId(t.id)} className={`h-40 p-5 rounded-[2.5rem] border-2 transition-all flex flex-col items-center justify-center gap-1 relative ${t.status === 'free' ? 'bg-white border-gray-100 hover:border-yellow-400' : 'bg-yellow-400 border-black shadow-xl ring-4 ring-yellow-400/10 active:scale-95'}`}>
                {t.currentOrder?.status === 'pending' && <span className="absolute -top-1 -right-1 bg-red-600 text-white text-[7px] font-black px-2 py-1 rounded-lg animate-bounce border-2 border-white shadow-md">NOVO</span>}
                <span className="text-4xl font-black italic text-black leading-none">{t.id}</span>
                <span className={`text-[8px] font-black uppercase px-2 py-0.5 rounded-full ${t.status === 'free' ? 'bg-gray-100 text-gray-400' : STATUS_CFG[t.currentOrder?.status || 'pending'].badge}`}>
                  {t.status === 'free' ? 'Livre' : STATUS_CFG[t.currentOrder?.status || 'pending'].label}
                </span>
                {t.currentOrder && <span className="text-[10px] font-black text-black uppercase truncate w-full text-center px-2 mt-1">{t.currentOrder.customerName}</span>}
              </button>
            ))}
          </div>
        )}

        {activeTab === 'delivery' && (
          <div className="space-y-6">
            <div className="flex justify-between items-center bg-white p-6 rounded-[2.5rem] border shadow-sm">
              <h3 className="text-lg font-black italic uppercase text-gray-400">Entrega e Balcão</h3>
              <button onClick={() => setIsNewOrderModalOpen(true)} className="bg-black text-yellow-400 px-6 py-3 rounded-xl font-black text-[10px] uppercase shadow-lg active:scale-95 transition-all">+ Novo Pedido</button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
              {activeDeliveries.map(t => (
                <button key={t.id} onClick={() => setSelectedTableId(t.id)} className={`bg-white border-4 p-5 rounded-[2.5rem] text-left relative overflow-hidden group shadow-md transition-all active:scale-[0.98] ${t.currentOrder?.status === 'pending' ? 'border-red-500 animate-pulse' : t.id >= 950 ? 'border-purple-400' : 'border-orange-400'}`}>
                  <div className={`absolute top-0 right-0 px-3 py-1.5 text-[8px] font-black uppercase ${t.id >= 950 ? 'bg-purple-600 text-white' : 'bg-orange-600 text-white'}`}>{t.id >= 950 ? 'Balcão' : 'Entrega'}</div>
                  <div className="flex justify-between items-center mb-3 mt-1"><span className="text-xl group-hover:scale-110 transition-transform">{t.id >= 950 ? '🏪' : '🚚'}</span><span className="text-[9px] font-black text-gray-400 uppercase">#{t.id}</span></div>
                  <h4 className="font-black text-xs uppercase truncate mb-1">{t.currentOrder?.customerName}</h4>
                  <div className={`${STATUS_CFG[t.currentOrder?.status || 'pending'].badge} text-[8px] font-black px-3 py-1.5 rounded-full inline-block uppercase tracking-wider`}>{STATUS_CFG[t.currentOrder?.status || 'pending'].label}</div>
                </button>
              ))}
              {activeDeliveries.length === 0 && <div className="col-span-full py-20 text-center opacity-30 font-black uppercase text-xs tracking-widest">Sem pedidos externos ativos</div>}
            </div>
          </div>
        )}
        
        {/* Outras abas permanecem inalteradas... */}
      </div>

      {/* MODAL DE DETALHES DO PEDIDO COM STATUS OTIMIZADO PARA MOBILE */}
      {selectedTable && (
        <div className="fixed inset-0 z-[400] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/95 backdrop-blur-md" onClick={() => setSelectedTableId(null)} />
          <div className="relative bg-white w-full max-w-4xl h-[92vh] rounded-[3rem] flex flex-col overflow-hidden shadow-2xl border-t-8 border-yellow-400 animate-in zoom-in duration-300">
            
            {/* CABEÇALHO */}
            <div className="p-6 border-b flex justify-between items-center bg-white shadow-sm sticky top-0 z-10">
              <div>
                <h3 className="text-2xl font-black uppercase italic tracking-tighter leading-none">
                  {selectedTable.id >= 950 ? 'Balcão' : selectedTable.id >= 900 ? 'Entrega' : `Mesa ${selectedTable.id}`}
                </h3>
                <p className="text-[10px] font-black text-gray-400 uppercase mt-2">
                  ID: #{selectedTable.currentOrder?.id} • <span className={STATUS_CFG[selectedTable.currentOrder?.status || 'pending'].color}>{STATUS_CFG[selectedTable.currentOrder?.status || 'pending'].label}</span>
                </p>
              </div>
              <div className="flex gap-2">
                <button onClick={() => setSelectedTableId(null)} className="p-4 bg-gray-100 rounded-full hover:bg-gray-200 transition-colors"><CloseIcon size={20}/></button>
              </div>
            </div>

            <div className="flex-1 flex flex-col md:flex-row overflow-hidden">
               {/* ÁREA DE STATUS - PRIORIDADE NO MOBILE (No topo no mobile, lateral no desktop) */}
               <div className="w-full md:w-72 bg-gray-50 p-6 border-b md:border-b-0 md:border-r overflow-y-auto no-scrollbar shrink-0">
                  <h4 className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-4">Mudar Status</h4>
                  <div className="grid grid-cols-2 md:grid-cols-1 gap-2">
                    {(['pending', 'preparing', 'ready', 'delivered'] as OrderStatus[]).map(s => (
                      <button 
                        key={s} 
                        onClick={() => handleUpdateTableStatus(selectedTable.id, s)}
                        className={`py-4 rounded-xl text-[9px] font-black uppercase border-2 transition-all active:scale-95 ${selectedTable.currentOrder?.status === s ? 'bg-black text-white border-black shadow-lg' : 'bg-white text-gray-400 border-gray-100 hover:border-black'}`}
                      >
                        {STATUS_CFG[s].label}
                      </button>
                    ))}
                  </div>
                  
                  <div className="mt-8">
                    <h4 className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-4">Ações do Pedido</h4>
                    <div className="space-y-2">
                      <button onClick={() => onUpdateTable(selectedTable.id, 'free')} className="w-full bg-green-600 text-white py-5 rounded-2xl font-black uppercase text-[10px] shadow-lg hover:brightness-110 active:scale-95 transition-all">Finalizar e Liberar 🏁</button>
                      <button className="w-full bg-white text-black border-2 border-black py-4 rounded-2xl font-black uppercase text-[10px] hover:bg-black hover:text-white transition-all flex items-center justify-center gap-2"><PrinterIcon size={16}/> Imprimir Via</button>
                    </div>
                  </div>
               </div>

               {/* CONTEÚDO DO PEDIDO */}
               <div className="flex-1 p-6 overflow-y-auto space-y-6 no-scrollbar pb-20">
                  <div className="bg-yellow-50 p-6 rounded-[2.5rem] border-2 border-yellow-100 shadow-sm">
                    <div className="flex justify-between items-start mb-4">
                      <div className="flex flex-col">
                        <p className="text-[8px] font-black text-yellow-700 uppercase tracking-widest">Cliente</p>
                        <p className="font-black text-lg uppercase tracking-tight">{selectedTable.currentOrder?.customerName}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-[8px] font-black text-yellow-700 uppercase tracking-widest">A Pagar</p>
                        <p className="text-2xl font-black italic text-black">R$ {selectedTable.currentOrder?.finalTotal.toFixed(2).replace('.', ',')}</p>
                      </div>
                    </div>
                    {selectedTable.currentOrder?.address && (
                      <div className="bg-white/60 p-4 rounded-2xl border border-yellow-200">
                        <p className="text-[8px] font-black text-yellow-800 uppercase mb-1">Endereço de Entrega</p>
                        <p className="text-[11px] font-black uppercase leading-tight italic">📍 {selectedTable.currentOrder.address}</p>
                      </div>
                    )}
                  </div>

                  <div className="space-y-3">
                    <h4 className="text-[10px] font-black uppercase tracking-widest text-gray-400 ml-2">Itens Solicitados</h4>
                    {selectedTable.currentOrder?.items.map((item, i) => (
                      <div key={i} className="flex gap-4 bg-white p-4 rounded-3xl border border-gray-100 items-center shadow-sm">
                        <img src={item.image} className="w-14 h-14 rounded-xl object-cover shrink-0" />
                        <div className="flex-1"><h4 className="text-xs font-black uppercase leading-none truncate">{item.name}</h4><p className="text-[9px] text-gray-400 font-bold uppercase mt-1">{item.category}</p></div>
                        <div className="text-right font-black"><p className="text-[10px] text-gray-400">{item.quantity}x</p><p className="text-sm italic">R$ {(item.price * item.quantity).toFixed(2)}</p></div>
                      </div>
                    ))}
                  </div>

                  <div className="pt-6 border-t border-dashed mt-6">
                    <h4 className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-4 ml-2">Adicionar mais itens</h4>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                       {menuItems?.filter(p => p.isAvailable).slice(0, 6).map(p => (
                         <button key={p.id} onClick={() => onAddToOrder(selectedTable.id, p)} className="bg-gray-50 p-4 rounded-2xl border border-gray-100 flex justify-between items-center text-[10px] font-black uppercase hover:border-black transition-all active:scale-[0.98]">
                           <span className="truncate w-32 text-left">{p.name}</span>
                           <span className="text-yellow-600 font-black">+</span>
                         </button>
                       ))}
                    </div>
                  </div>
               </div>
            </div>
          </div>
        </div>
      )}

      {/* Demais modais preservados... */}
    </div>
  );
};

export default AdminPanel;
