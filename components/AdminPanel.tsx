
import React, { useState, useMemo } from 'react';
import { Table, Order, Product, Category, CartItem } from '../types';
import { CloseIcon, TrashIcon, VolumeIcon } from './Icons';
import { supabase } from '../lib/supabase';

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
  const [activeTab, setActiveTab] = useState<'tables' | 'delivery' | 'menu' | 'categories'>('tables');
  const [selectedTableId, setSelectedTableId] = useState<number | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  
  const [editingProduct, setEditingProduct] = useState<any | null>(null);
  const [isProductModalOpen, setIsProductModalOpen] = useState(false);
  
  const [newCategoryName, setNewCategoryName] = useState('');

  const physicalTables = tables.filter(t => t.id <= 12).sort((a,b) => a.id - b.id);
  const deliveryTables = tables.filter(t => t.id >= 900).sort((a,b) => a.id - b.id);

  const selectedTable = useMemo(() => tables.find(t => t.id === selectedTableId) || null, [tables, selectedTableId]);

  const handleAddCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    const name = newCategoryName.trim();
    if (!name || isSaving) return;
    
    setIsSaving(true);
    try {
      const { error } = await supabase.from('categories').insert([{ name }]);
      if (error) {
        if (error.code === '42P01') {
          alert('TABELA NÃO SINCRONIZADA: Rode o comando "NOTIFY pgrst, reload schema" no Supabase e espere 1 minuto.');
        } else {
          alert('Erro: ' + error.message);
        }
      } else {
        setNewCategoryName('');
        onRefreshData();
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsSaving(false);
    }
  };

  const filteredMenu = useMemo(() => 
    menuItems.filter(p => 
      (p.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
       p.category.toLowerCase().includes(searchTerm.toLowerCase())) && 
      p.isAvailable
    ),
    [menuItems, searchTerm]
  );

  return (
    <div className="w-full">
      {/* Top Banner D.Moreira */}
      <div className="bg-black p-8 rounded-[3rem] shadow-2xl mb-12 border-b-8 border-yellow-400 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-yellow-400/10 rounded-full -mr-32 -mt-32 blur-3xl"></div>
        <div className="relative z-10 flex flex-col md:flex-row justify-between items-center gap-8">
          <div className="flex flex-col items-center md:items-start">
            <div className="flex items-center gap-3 mb-2">
              <h2 className="text-4xl font-black italic tracking-tighter text-yellow-400">D.MOREIRA</h2>
              <span className="bg-yellow-400 text-black text-[9px] font-black uppercase px-2 py-0.5 rounded italic">Admin</span>
            </div>
            <p className="text-gray-400 font-bold text-[10px] uppercase tracking-[0.3em]">Painel de Controle Central</p>
          </div>
          
          <div className="flex flex-wrap justify-center gap-3">
            <button onClick={() => setActiveTab('tables')} className={`px-6 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === 'tables' ? 'bg-yellow-400 text-black shadow-lg shadow-yellow-400/20' : 'text-gray-400 hover:text-white bg-white/5'}`}>Mesas</button>
            <button onClick={() => setActiveTab('delivery')} className={`px-6 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === 'delivery' ? 'bg-yellow-400 text-black shadow-lg shadow-yellow-400/20' : 'text-gray-400 hover:text-white bg-white/5'}`}>Entregas</button>
            <button onClick={() => setActiveTab('menu')} className={`px-6 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === 'menu' ? 'bg-yellow-400 text-black shadow-lg shadow-yellow-400/20' : 'text-gray-400 hover:text-white bg-white/5'}`}>Produtos</button>
            <button onClick={() => setActiveTab('categories')} className={`px-6 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === 'categories' ? 'bg-yellow-400 text-black shadow-lg shadow-yellow-400/20' : 'text-gray-400 hover:text-white bg-white/5'}`}>Categorias</button>
            <button onClick={onToggleAudio} className={`p-3 rounded-2xl ${audioEnabled ? 'bg-yellow-400/20 text-yellow-400' : 'text-gray-600'}`}><VolumeIcon muted={!audioEnabled}/></button>
            <button onClick={onLogout} className="text-red-500 font-black text-[10px] uppercase ml-4 p-3 hover:bg-red-500/10 rounded-2xl transition-all">Sair</button>
          </div>
        </div>
      </div>

      {dbStatus === 'error_tables_missing' && (
        <div className="bg-red-600/10 border-2 border-red-600 p-6 rounded-3xl mb-10 text-center animate-pulse">
          <p className="text-red-600 font-black uppercase text-xs tracking-widest">
            ⚠️ ERRO DE SINCRONIZAÇÃO: Execute o SQL e aperte F5.
          </p>
        </div>
      )}

      {/* Conteúdo por Aba */}
      <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
        {(activeTab === 'tables' || activeTab === 'delivery') && (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-6">
            {(activeTab === 'tables' ? physicalTables : deliveryTables).map(t => (
              <button 
                key={t.id} 
                onClick={() => setSelectedTableId(t.id)}
                className={`group h-52 p-6 rounded-[3rem] border-4 transition-all flex flex-col items-center justify-center gap-2 relative overflow-hidden ${t.status === 'free' ? 'bg-white border-gray-100 hover:border-yellow-400 hover:shadow-2xl' : 'bg-yellow-400 border-black shadow-xl ring-8 ring-yellow-400/20'}`}
              >
                {t.status === 'occupied' && t.currentOrder?.isUpdated && (
                  <div className="absolute top-4 right-4 w-4 h-4 bg-red-600 rounded-full animate-ping ring-4 ring-white"></div>
                )}
                <span className="text-5xl font-black italic text-black mb-1 leading-none">{t.id >= 900 ? (t.id === 900 ? '🚚' : '🛍️') : t.id}</span>
                <span className={`text-[9px] font-black uppercase px-3 py-1.5 rounded-full ${t.status === 'free' ? 'bg-gray-100 text-gray-400' : 'bg-black text-white'}`}>
                  {t.id >= 900 ? (t.id === 900 ? 'Entrega' : 'Balcão') : (t.status === 'free' ? 'Livre' : 'Ocupada')}
                </span>
                {t.status === 'occupied' && (
                  <span className="text-[12px] font-black mt-2 text-black bg-white/30 px-3 py-1 rounded-lg">R$ {t.currentOrder?.total.toFixed(2)}</span>
                )}
                
                {/* Overlay Lançar Rápido */}
                <div className="absolute inset-0 bg-black opacity-0 group-hover:opacity-10 transition-opacity"></div>
                <div className="absolute bottom-2 translate-y-10 group-hover:translate-y-0 opacity-0 group-hover:opacity-100 transition-all">
                   <span className="bg-black text-yellow-400 px-4 py-1.5 rounded-full text-[8px] font-black uppercase">Abrir Mesa</span>
                </div>
              </button>
            ))}
          </div>
        )}

        {activeTab === 'categories' && (
          <div className="bg-white p-10 rounded-[4rem] shadow-xl max-w-2xl mx-auto border border-gray-100">
            <h3 className="text-3xl font-black italic mb-8">Categorias</h3>
            <form onSubmit={handleAddCategory} className="flex gap-3 mb-12">
              <input type="text" value={newCategoryName} onChange={e => setNewCategoryName(e.target.value)} placeholder="Nova Categoria..." className="flex-1 bg-gray-50 border-2 rounded-2xl px-6 py-5 text-sm font-bold outline-none focus:border-yellow-400 transition-all" />
              <button type="submit" disabled={isSaving} className="bg-black text-yellow-400 px-10 py-5 rounded-2xl font-black text-xs uppercase shadow-xl hover:scale-105 active:scale-95 transition-all">
                {isSaving ? '...' : 'Criar'}
              </button>
            </form>
            <div className="space-y-3">
              {categories.map(cat => (
                <div key={cat.id} className="flex justify-between items-center bg-gray-50 p-6 rounded-3xl border-2 border-transparent hover:border-yellow-400 transition-all">
                  <span className="font-black text-gray-800 uppercase tracking-widest text-xs italic">{cat.name}</span>
                  <button onClick={() => { if(confirm('Excluir?')) supabase.from('categories').delete().eq('id', cat.id).then(() => onRefreshData()); }} className="p-3 bg-red-50 text-red-500 rounded-xl hover:bg-red-500 hover:text-white transition-all"><TrashIcon/></button>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'menu' && (
          <div className="bg-white p-10 rounded-[4rem] shadow-xl border border-gray-100">
            <div className="flex justify-between items-center mb-12">
              <h3 className="text-3xl font-black italic">Cardápio</h3>
              <button onClick={() => { setEditingProduct({ name: '', price: '', category: categories[0]?.name || 'Diversos', image: '', isAvailable: true }); setIsProductModalOpen(true); }} className="bg-black text-yellow-400 px-10 py-5 rounded-3xl font-black text-xs uppercase shadow-2xl hover:scale-105 transition-all">+ Novo Produto</button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
              {menuItems.map(item => (
                <div key={item.id} className={`bg-gray-50 p-6 rounded-[3rem] border-2 transition-all hover:border-yellow-400 ${!item.isAvailable ? 'opacity-50 grayscale' : 'hover:shadow-xl'}`}>
                  <img src={item.image} className="w-full aspect-square object-cover rounded-[2rem] mb-6 shadow-md" />
                  <h4 className="font-black text-lg text-black mb-1">{item.name}</h4>
                  <div className="flex justify-between items-center mb-6">
                    <span className="text-yellow-700 font-black text-md italic">R$ {item.price.toFixed(2)}</span>
                    <span className="text-[9px] font-black uppercase text-gray-400 tracking-widest">{item.category}</span>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <button onClick={() => { setEditingProduct({...item, price: item.price.toString()}); setIsProductModalOpen(true); }} className="bg-white py-4 rounded-2xl font-black text-[10px] uppercase border-2 text-black hover:bg-black hover:text-white transition-all">Editar</button>
                    <button onClick={() => { if(confirm('Excluir?')) onDeleteProduct(item.id); }} className="p-4 bg-red-50 text-red-500 rounded-2xl hover:bg-red-500 hover:text-white transition-all"><TrashIcon/></button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Modal de Mesa - COM LANÇAMENTO DIRETO À DIREITA */}
      {selectedTable && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/95 backdrop-blur-xl" onClick={() => setSelectedTableId(null)} />
          <div className="relative bg-white w-full max-w-6xl h-[85vh] rounded-[4rem] flex flex-col md:flex-row overflow-hidden shadow-2xl animate-in slide-in-from-bottom duration-500 border-t-8 border-yellow-400">
            
            {/* Esquerda: Pedidos Atuais */}
            <div className="flex-1 p-10 md:p-14 overflow-y-auto border-b md:border-b-0 md:border-r border-gray-100">
               <div className="flex justify-between items-start mb-10">
                 <div>
                   <h3 className="text-6xl font-black italic text-black tracking-tighter">Mesa {selectedTable.id >= 900 ? (selectedTable.id === 900 ? 'Entrega' : 'Balcão') : selectedTable.id}</h3>
                   <span className={`inline-block mt-4 px-4 py-1 rounded-full text-[10px] font-black uppercase tracking-widest ${selectedTable.status === 'free' ? 'bg-gray-100 text-gray-400' : 'bg-yellow-400 text-black'}`}>
                      {selectedTable.status === 'free' ? 'Mesa Disponível' : 'Atendimento em Curso'}
                   </span>
                 </div>
                 <button onClick={() => setSelectedTableId(null)} className="p-5 bg-gray-100 rounded-full hover:bg-gray-200 transition-colors"><CloseIcon size={28} /></button>
               </div>
               
               <div className="space-y-4 mb-14">
                 {selectedTable.currentOrder?.items.map((item, idx) => (
                   <div key={idx} className="flex justify-between items-center bg-gray-50 p-6 rounded-3xl border border-gray-100">
                     <div className="flex flex-col">
                       <span className="font-black text-sm text-black uppercase tracking-tight">{item.quantity}x {item.name}</span>
                       <span className="text-[9px] font-bold text-gray-400 uppercase tracking-widest italic">{item.category}</span>
                     </div>
                     <span className="font-black text-sm text-yellow-700 italic">R$ {(item.price * item.quantity).toFixed(2)}</span>
                   </div>
                 )) || (
                   <div className="text-center py-28 border-4 border-dashed border-gray-50 rounded-[4rem]">
                      <p className="text-gray-300 font-black uppercase text-[10px] tracking-[0.3em] italic">Aguardando Lançamentos</p>
                   </div>
                 )}
               </div>

               {selectedTable.status === 'occupied' && (
                 <div className="border-t-4 border-black pt-12">
                    <div className="flex justify-between items-end mb-12">
                      <div className="flex flex-col gap-2">
                        <span className="text-gray-400 font-black text-[10px] uppercase tracking-widest">Total Acumulado</span>
                        <div className="flex gap-2">
                          <span className="bg-black text-yellow-400 px-3 py-1 rounded-lg text-[9px] font-black uppercase">Conta Aberta</span>
                        </div>
                      </div>
                      <span className="text-7xl font-black italic text-black tracking-tighter">R$ {selectedTable.currentOrder?.total.toFixed(2)}</span>
                    </div>
                    <div className="grid grid-cols-2 gap-6">
                      <button onClick={() => setSelectedTableId(null)} className="bg-gray-100 text-black py-8 rounded-3xl font-black uppercase text-xs tracking-widest hover:bg-gray-200 transition-all">Sair e Manter</button>
                      <button onClick={() => { if(confirm('Fechar conta e liberar mesa?')) onUpdateTable(selectedTable.id, 'free'); setSelectedTableId(null); }} className="bg-green-600 text-white py-8 rounded-3xl font-black uppercase text-xs tracking-widest shadow-2xl shadow-green-600/20 hover:scale-[1.02] active:scale-95 transition-all">Finalizar Atendimento</button>
                    </div>
                 </div>
               )}
            </div>

            {/* Direita: PAINEL DE LANÇAMENTO ULTRA RÁPIDO */}
            <div className="w-full md:w-[28rem] bg-gray-50 p-10 flex flex-col">
               <div className="mb-10">
                 <h4 className="text-[10px] font-black uppercase tracking-[0.4em] text-black mb-6 bg-yellow-400 px-6 py-2 rounded-full w-fit">Lançamento Rápido</h4>
                 <div className="relative">
                   <input 
                    type="text" 
                    placeholder="Buscar produto ou categoria..." 
                    value={searchTerm} 
                    onChange={e => setSearchTerm(e.target.value)} 
                    className="w-full bg-white border-4 border-transparent focus:border-black rounded-3xl px-8 py-6 text-xs font-bold outline-none transition-all shadow-xl" 
                   />
                   {searchTerm && (
                     <button onClick={() => setSearchTerm('')} className="absolute right-6 top-1/2 -translate-y-1/2 text-gray-300 font-black hover:text-black">Limpar</button>
                   )}
                 </div>
               </div>

               <div className="flex-1 overflow-y-auto space-y-3 no-scrollbar pb-10">
                  {filteredMenu.length > 0 ? filteredMenu.map(p => (
                    <button 
                      key={p.id} 
                      onClick={() => onAddToOrder(selectedTable.id, p)} 
                      className="w-full text-left bg-white p-6 rounded-3xl border-2 border-transparent hover:border-black hover:shadow-2xl transition-all group active:scale-95 flex items-center justify-between"
                    >
                       <div className="flex flex-col">
                          <span className="font-black text-[11px] uppercase text-black line-clamp-1 group-hover:italic transition-all">{p.name}</span>
                          <span className="text-[10px] font-bold text-yellow-700 italic">R$ {p.price.toFixed(2)}</span>
                       </div>
                       <div className="bg-yellow-400 text-black font-black text-[9px] px-5 py-2.5 rounded-2xl group-hover:scale-110 transition-all shadow-md">
                         + ADD
                       </div>
                    </button>
                  )) : (
                    <div className="text-center py-20 bg-white rounded-[3rem] border-2 border-dashed border-gray-200">
                       <p className="text-gray-300 font-black text-[10px] uppercase italic">Item não encontrado</p>
                    </div>
                  )}
               </div>
               
               <div className="pt-8 border-t border-gray-200 text-center">
                 <p className="text-[9px] text-gray-400 font-black uppercase tracking-widest leading-relaxed">
                   Clique nos itens para adicionar <br/> instantaneamente à mesa.
                 </p>
               </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal Produto */}
      {isProductModalOpen && (
        <div className="fixed inset-0 z-[300] flex items-center justify-center p-6 bg-black/95 backdrop-blur-md">
          <div className="bg-white w-full max-w-lg rounded-[4rem] p-12 relative shadow-2xl border-t-8 border-yellow-400">
             <button onClick={() => setIsProductModalOpen(false)} className="absolute top-10 right-10 p-3 bg-gray-100 rounded-full hover:bg-gray-200 transition-colors"><CloseIcon size={24}/></button>
             <h3 className="text-4xl font-black italic mb-10">Salvar Item</h3>
             <form onSubmit={(e) => {
               e.preventDefault();
               onSaveProduct({ ...editingProduct, price: parseFloat(editingProduct.price) });
               setIsProductModalOpen(false);
             }} className="space-y-6">
                <input type="text" value={editingProduct?.name || ''} onChange={e => setEditingProduct({...editingProduct!, name: e.target.value})} placeholder="Nome" className="w-full bg-gray-50 border-2 rounded-2xl px-6 py-5 text-sm font-bold outline-none focus:border-yellow-400" required />
                <div className="grid grid-cols-2 gap-4">
                  <input type="number" step="0.01" value={editingProduct?.price || ''} onChange={e => setEditingProduct({...editingProduct!, price: e.target.value})} placeholder="R$ 0,00" className="w-full bg-gray-50 border-2 rounded-2xl px-6 py-5 text-sm font-bold outline-none focus:border-yellow-400" required />
                  <select value={editingProduct?.category} onChange={e => setEditingProduct({...editingProduct!, category: e.target.value})} className="w-full bg-gray-50 border-2 rounded-2xl px-6 py-5 text-sm font-bold outline-none focus:border-yellow-400">
                    {categories.map(cat => <option key={cat.id} value={cat.name}>{cat.name}</option>)}
                    {categories.length === 0 && <option value="Diversos">Diversos</option>}
                  </select>
                </div>
                <input type="text" value={editingProduct?.image || ''} onChange={e => setEditingProduct({...editingProduct!, image: e.target.value})} placeholder="URL Imagem" className="w-full bg-gray-50 border-2 rounded-2xl px-6 py-5 text-sm font-bold outline-none focus:border-yellow-400" />
                <button type="submit" className="w-full bg-black text-yellow-400 py-7 rounded-[2.5rem] font-black text-sm uppercase tracking-widest shadow-2xl hover:scale-105 active:scale-95 transition-all mt-6">Confirmar Produto</button>
             </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminPanel;
