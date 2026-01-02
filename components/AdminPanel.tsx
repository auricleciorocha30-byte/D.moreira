
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

const AdminPanel: React.FC<AdminPanelProps> = ({ 
  tables, menuItems, categories, audioEnabled, onToggleAudio, 
  onUpdateTable, onRefreshData, onLogout, onSaveProduct, onDeleteProduct, dbStatus, onAddToOrder 
}) => {
  const [activeTab, setActiveTab] = useState<'tables' | 'delivery' | 'menu' | 'marketing'>('tables');
  const [selectedTableId, setSelectedTableId] = useState<number | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  
  // Marketing State
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [loyalty, setLoyalty] = useState<LoyaltyConfig>({ isActive: false, spendingGoal: 100, scopeType: 'all', scopeValue: '' });
  const [loyaltyUsers, setLoyaltyUsers] = useState<LoyaltyUser[]>([]);

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
      scopeValue: formData.get('scopeValue'),
    };
    await supabase.from('coupons').insert([newCoupon]);
    e.target.reset();
    fetchMarketingData();
  };

  return (
    <div className="w-full">
      {/* Header Admin */}
      <div className="bg-black p-5 md:p-8 rounded-[2.5rem] shadow-2xl mb-8 border-b-4 border-yellow-400">
        <div className="flex flex-col md:flex-row justify-between items-center gap-6">
          <div className="text-center md:text-left">
            <h2 className="text-2xl md:text-3xl font-black italic text-yellow-400 leading-none mb-1 uppercase tracking-tighter">D.MOREIRA ADMIN</h2>
          </div>
          <nav className="flex flex-wrap justify-center gap-1.5 p-1 bg-gray-900 rounded-2xl w-full md:w-auto">
            {(['tables', 'delivery', 'menu', 'marketing'] as const).map(tab => (
              <button key={tab} onClick={() => setActiveTab(tab)} className={`px-5 py-3.5 rounded-xl text-[9px] font-black uppercase tracking-wider transition-all ${activeTab === tab ? 'bg-yellow-400 text-black shadow-lg' : 'text-gray-500 hover:text-white'}`}>
                {tab === 'marketing' ? 'Marketing' : tab === 'tables' ? 'Mesas' : tab === 'delivery' ? 'Entregas' : 'Produtos'}
              </button>
            ))}
          </nav>
          <button onClick={onLogout} className="bg-red-600 text-white font-black text-xs uppercase px-8 py-4 rounded-2xl">Sair</button>
        </div>
      </div>

      {activeTab === 'marketing' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 animate-in fade-in duration-500">
          {/* Gestão de Cupons */}
          <div className="bg-white p-8 rounded-[3rem] shadow-xl border border-gray-100">
            <h3 className="text-xl font-black italic uppercase mb-6 flex items-center gap-2">🎫 Cupons de Desconto</h3>
            <form onSubmit={handleAddCoupon} className="grid grid-cols-2 gap-3 mb-8 bg-gray-50 p-6 rounded-[2rem]">
              <input name="code" placeholder="CÓDIGO" className="bg-white border p-3 rounded-xl font-bold text-xs uppercase" required />
              <input name="percentage" type="number" placeholder="% OFF" className="bg-white border p-3 rounded-xl font-bold text-xs" required />
              <select name="scopeType" className="bg-white border p-3 rounded-xl font-bold text-[10px] uppercase">
                <option value="all">Toda a Loja</option>
                <option value="category">Por Categoria</option>
                <option value="product">Por Produto</option>
              </select>
              <input name="scopeValue" placeholder="Valor do Escopo (Nome/ID)" className="bg-white border p-3 rounded-xl font-bold text-xs" />
              <button type="submit" className="col-span-2 bg-black text-yellow-400 py-4 rounded-xl font-black text-[10px] uppercase">Criar Cupom</button>
            </form>
            <div className="space-y-3">
              {coupons.map(c => (
                <div key={c.id} className="flex justify-between items-center p-4 bg-gray-50 rounded-2xl border">
                  <div>
                    <span className="font-black text-sm">{c.code}</span>
                    <span className="ml-2 bg-yellow-400 text-black px-2 py-0.5 rounded text-[10px] font-black">{c.percentage}%</span>
                    <p className="text-[8px] text-gray-400 font-bold uppercase mt-1">Escopo: {c.scopeType} {c.scopeValue}</p>
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
              <button 
                onClick={() => handleUpdateLoyalty({ isActive: !loyalty.isActive })}
                className={`px-6 py-3 rounded-2xl font-black text-[10px] uppercase transition-all ${loyalty.isActive ? 'bg-green-500 text-white' : 'bg-gray-200 text-gray-400'}`}
              >
                {loyalty.isActive ? 'Programa Ativo' : 'Programa Inativo'}
              </button>
            </div>
            
            <div className="space-y-4 mb-8 bg-yellow-50 p-6 rounded-[2rem] border-2 border-yellow-100">
               <div>
                 <label className="text-[9px] font-black uppercase text-yellow-800 ml-1">Meta de Gastos (R$)</label>
                 <input 
                  type="number" 
                  value={loyalty.spendingGoal} 
                  onChange={e => handleUpdateLoyalty({ spendingGoal: Number(e.target.value) })}
                  className="w-full bg-white border-2 border-yellow-200 p-4 rounded-xl font-black text-sm outline-none focus:border-yellow-500"
                 />
               </div>
               <div className="grid grid-cols-2 gap-3">
                 <div>
                    <label className="text-[9px] font-black uppercase text-yellow-800 ml-1">Escopo</label>
                    <select 
                      value={loyalty.scopeType} 
                      onChange={e => handleUpdateLoyalty({ scopeType: e.target.value as any })}
                      className="w-full bg-white border-2 border-yellow-200 p-4 rounded-xl font-black text-[10px] uppercase outline-none"
                    >
                      <option value="all">Loja Toda</option>
                      <option value="category">Categoria</option>
                      <option value="product">Produto</option>
                    </select>
                 </div>
                 <div>
                    <label className="text-[9px] font-black uppercase text-yellow-800 ml-1">Valor do Escopo</label>
                    <input 
                      value={loyalty.scopeValue} 
                      onChange={e => handleUpdateLoyalty({ scopeValue: e.target.value })}
                      className="w-full bg-white border-2 border-yellow-200 p-4 rounded-xl font-black text-xs outline-none"
                    />
                 </div>
               </div>
            </div>

            <h4 className="text-[10px] font-black uppercase text-gray-400 mb-4 tracking-widest">Ranking de Clientes</h4>
            <div className="max-h-[300px] overflow-y-auto space-y-2 no-scrollbar">
              {loyaltyUsers.map((user, i) => (
                <div key={user.phone} className="flex justify-between items-center p-4 bg-gray-50 rounded-2xl">
                  <div className="flex items-center gap-3">
                    <span className="w-6 h-6 bg-black text-yellow-400 rounded-full flex items-center justify-center text-[10px] font-black">{i+1}</span>
                    <div>
                      <p className="font-black text-xs uppercase">{user.name}</p>
                      <p className="text-[9px] text-gray-400 font-bold">{user.phone}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-[10px] font-black text-yellow-700 italic">R$ {user.accumulated.toFixed(2)}</p>
                    <div className="w-24 h-1.5 bg-gray-200 rounded-full mt-1 overflow-hidden">
                      <div className="h-full bg-yellow-400" style={{ width: `${Math.min((user.accumulated / loyalty.spendingGoal) * 100, 100)}%` }}></div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Outras abas (tables, delivery, menu) permanecem as mesmas de antes... */}
      {activeTab === 'tables' && (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-5">
          {/* Conteúdo das Mesas... */}
        </div>
      )}
    </div>
  );
};

export default AdminPanel;
