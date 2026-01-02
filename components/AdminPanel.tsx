
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

  // Gestão de Categorias - Mais tolerante a erros
  const handleAddCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    const name = newCategoryName.trim();
    if (!name || isSaving) return;
    
    setIsSaving(true);
    try {
      const { error } = await supabase.from('categories').insert([{ name }]);
      if (error) {
        // Se o erro for de tabela inexistente, avisamos de forma mais produtiva
        if (error.code === '42P01') {
          alert('ERRO DE TABELA: Por favor, execute o SQL no Supabase novamente e aguarde 30 segundos. O sistema está usando categorias locais por enquanto.');
        } else {
          alert('Erro ao salvar categoria: ' + error.message);
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

  const handleDeleteCategory = async (id: string) => {
    if (!confirm(`Deseja excluir esta categoria?`)) return;
    await supabase.from('categories').delete().eq('id', id);
    onRefreshData();
  };

  const filteredMenu = useMemo(() => 
    menuItems.filter(p => 
      (p.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
       p.category.toLowerCase().includes(searchTerm.toLowerCase())) && 
      p.isAvailable
    ),
    [menuItems, searchTerm]
  );

  const handleManualAdd = (p: Product) => {
    if (!selectedTableId) return;
    onAddToOrder(selectedTableId, p);
  };

  const openAddProduct = () => {
    setEditingProduct({ 
      name: '', 
      price: '', 
      category: categories.length > 0 ? categories[0].name : 'Diversos', 
      description: '', 
      image: '', 
      isAvailable: true 
    });
    setIsProductModalOpen(true);
  };

  const handleProductSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const price = parseFloat(editingProduct.price);
    if (!editingProduct.name || isNaN(price)) return alert('Preencha os campos obrigatórios.');
    onSaveProduct({ ...editingProduct, price });
    setIsProductModalOpen(false);
  };

  return (
    <div className="w-full">
      {/* Top Bar */}
      <div className="bg-black p-6 rounded-[2.5rem] shadow-xl mb-10 border-b-4 border-yellow-400">
        <div className="flex flex-col md:flex-row justify-between items-center gap-6">
          <div className="flex items-center gap-4">
            <h2 className="text-3xl font-black italic tracking-tighter text-yellow-400">D.MOREIRA ADMIN</h2>
            <button onClick={onToggleAudio} className={`p-3 rounded-full transition-all ${audioEnabled ? 'bg-yellow-400 text-black' : 'bg-gray-800 text-gray-500'}`}>
              <VolumeIcon muted={!audioEnabled} />
            </button>
          </div>
          <nav className="flex gap-2 overflow-x-auto no-scrollbar w-full md:w-auto p-1 bg-gray-900 rounded-3xl p-1.5">
            {(['tables', 'delivery', 'menu', 'categories'] as const).map(tab => (
              <button key={tab} onClick={() => setActiveTab(tab)} className={`whitespace-nowrap px-6 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === tab ? 'bg-yellow-400 text-black shadow-lg' : 'text-gray-400 hover:text-white'}`}>
                {tab === 'tables' ? 'Mesas' : tab === 'delivery' ? 'Atendimentos' : tab === 'menu' ? 'Cardápio' : 'Categorias'}
              </button>
            ))}
            <button onClick={onLogout} className="whitespace-nowrap text-red-400 font-black text-[10px] uppercase ml-4 p-3 hover:bg-red-500/10 rounded-xl transition-colors">Sair</button>
          </nav>
        </div>
      </div>

      {/* Grid de Mesas */}
      {(activeTab === 'tables' || activeTab === 'delivery') && (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-6 animate-fade-in">
          {(activeTab === 'tables' ? physicalTables : deliveryTables).map(t => (
            <div key={t.id} className="relative group">
              <button 
                onClick={() => setSelectedTableId(t.id)} 
                className={`w-full p-8 rounded-[3rem] border-4 transition-all flex flex-col items-center justify-center gap-1 h-56 relative overflow-hidden ${t.status === 'free' ? 'bg-white border-gray-100 hover:border-yellow-400 shadow-sm' : 'bg-yellow-400 border-black shadow-xl scale-[1.02]'}`}
              >
                {t.status === 'occupied' && t.currentOrder?.isUpdated && (
                  <div className="absolute top-4 right-4 bg-red-600 w-4 h-4 rounded-full animate-ping ring-4 ring-white"></div>
                )}
                <span className="text-5xl font-black italic mb-2 text-black">{t.id >= 900 ? (t.id === 900 ? '🚚' : '🛍️') : t.id}</span>
                <span className={`text-[9px] font-black uppercase px-3 py-1.5 rounded-full ${t.status === 'free' ? 'bg-gray-100 text-gray-400' : 'bg-black text-white'}`}>
                  {t.id >= 900 ? (t.id === 900 ? 'Entrega' : 'Balcão') : (t.status === 'free' ? 'Disponível' : 'Em Uso')}
                </span>
                {t.status === 'occupied' && (
                  <span className="text-[12px] font-black mt-2 truncate w-full px-4 text-center text-black">R$ {t.currentOrder?.total.toFixed(2)}</span>
                )}
              </button>
              
              {/* Botão de Lançamento Direto (Aparece no Hover) */}
              <button 
                onClick={(e) => { e.stopPropagation(); setSelectedTableId(t.id); }}
                className="absolute -bottom-2 left-1/2 -translate-x-1/2 bg-black text-yellow-400 px-6 py-3 rounded-2xl font-black text-[10px] uppercase tracking-widest opacity-0 group-hover:opacity-100 transition-all shadow-2xl border-2 border-yellow-400 hover:scale-110 z-10"
              >
                + Lançar Pedido
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Categorias */}
      {activeTab === 'categories' && (
        <div className="bg-white p-10 rounded-[4rem] shadow-xl border border-gray-100 max-w-2xl mx-auto animate-fade-in">
          <h3 className="text-4xl font-black italic mb-8 text-black">Categorias</h3>
          <form onSubmit={handleAddCategory} className="flex gap-3 mb-12">
            <input type="text" value={newCategoryName} onChange={e => setNewCategoryName(e.target.value)} placeholder="Ex: Bebidas, Lanches..." className="flex-1 bg-gray-50 border-2 rounded-2xl px-6 py-5 text-sm font-bold outline-none text-black focus:border-yellow-400 transition-all" />
            <button type="submit" disabled={isSaving} className="bg-black text-yellow-400 px-10 py-5 rounded-2xl font-black text-xs uppercase shadow-xl hover:scale-105 active:scale-95 transition-all">
              {isSaving ? '...' : 'Adicionar'}
            </button>
          </form>
          <div className="space-y-3">
            {categories.map(cat => (
              <div key={cat.id} className="flex justify-between items-center bg-gray-50 p-6 rounded-3xl border-2 border-transparent hover:border-yellow-400 transition-all">
                <span className="font-black text-gray-800 uppercase tracking-widest text-xs">{cat.name}</span>
                <button onClick={() => handleDeleteCategory(cat.id)} className="p-3 bg-red-50 text-red-500 rounded-xl hover:bg-red-500 hover:text-white transition-colors"><TrashIcon size={20}/></button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Modal de Detalhes da Mesa e LANÇAMENTO DE PEDIDOS */}
      {selectedTable && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 sm:p-6">
          <div className="absolute inset-0 bg-black/95 backdrop-blur-xl" onClick={() => setSelectedTableId(null)} />
          <div className="relative bg-white w-full max-w-6xl rounded-[4rem] flex flex-col md:flex-row overflow-hidden shadow-2xl animate-in slide-in-from-bottom duration-500 border-t-8 border-yellow-400">
            
            {/* Esquerda: Pedidos já feitos */}
            <div className="flex-1 p-8 md:p-14 border-b md:border-b-0 md:border-r border-gray-100 overflow-y-auto max-h-[85vh]">
               <div className="flex justify-between items-start mb-10">
                 <div>
                   <h3 className="text-5xl font-black italic text-black leading-none">Mesa {selectedTable.id >= 900 ? (selectedTable.id === 900 ? 'Entrega' : 'Balcão') : selectedTable.id}</h3>
                   <p className="text-gray-400 font-bold uppercase text-[10px] mt-2 tracking-widest">{selectedTable.status === 'free' ? 'Mesa está vazia' : `Cliente: ${selectedTable.currentOrder?.customerName}`}</p>
                 </div>
                 <button onClick={() => setSelectedTableId(null)} className="p-4 bg-gray-100 rounded-full hover:bg-gray-200 transition-colors"><CloseIcon size={28} /></button>
               </div>
               
               <div className="space-y-4 mb-12">
                 {selectedTable.currentOrder?.items.map((item, idx) => (
                   <div key={idx} className="flex justify-between items-center bg-gray-50 p-6 rounded-3xl border border-gray-100 hover:shadow-md transition-shadow">
                     <div className="flex flex-col">
                       <span className="font-black text-sm text-black uppercase tracking-tight">{item.quantity}x {item.name}</span>
                       <span className="text-[9px] font-bold text-gray-400 uppercase tracking-widest">{item.category}</span>
                     </div>
                     <span className="font-black text-sm text-yellow-700 italic">R$ {(item.price * item.quantity).toFixed(2)}</span>
                   </div>
                 )) || (
                   <div className="text-center py-24 border-4 border-dashed border-gray-50 rounded-[3rem]">
                      <p className="text-gray-300 font-black uppercase text-xs tracking-widest italic">Nenhum item lançado ainda</p>
                   </div>
                 )}
               </div>

               {selectedTable.status === 'occupied' && (
                 <div className="border-t-4 border-black pt-10">
                    <div className="flex justify-between items-end mb-10">
                      <div className="flex flex-col gap-2">
                        <span className="bg-black text-yellow-400 px-3 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest w-fit">Pagamento: {selectedTable.currentOrder?.paymentMethod}</span>
                      </div>
                      <div className="text-right">
                        <span className="text-gray-400 font-black text-[10px] uppercase block mb-1">Total da Comanda</span>
                        <span className="text-6xl font-black italic text-black tracking-tighter">R$ {selectedTable.currentOrder?.total.toFixed(2)}</span>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <button onClick={() => setSelectedTableId(null)} className="bg-gray-100 text-black py-7 rounded-3xl font-black uppercase text-xs tracking-widest hover:bg-gray-200 transition-all">Sair e Salvar</button>
                      <button onClick={() => { if(confirm('Fechar a conta e liberar a mesa?')) onUpdateTable(selectedTable.id, 'free'); setSelectedTableId(null); }} className="bg-green-600 text-white py-7 rounded-3xl font-black uppercase text-xs tracking-widest shadow-xl hover:brightness-110 active:scale-95 transition-all">Finalizar Conta</button>
                    </div>
                 </div>
               )}
            </div>

            {/* Direita: LANÇAMENTO RÁPIDO - Onde adiciona os pedidos */}
            <div className="w-full md:w-[26rem] bg-gray-50 p-8 flex flex-col border-l border-gray-100">
               <div className="mb-8">
                 <h4 className="text-xs font-black uppercase tracking-widest text-black mb-5 bg-yellow-400 w-fit px-4 py-1.5 rounded-full shadow-sm">Lançar Itens na Mesa</h4>
                 <div className="relative">
                   <input 
                    type="text" 
                    placeholder="Buscar por nome ou categoria..." 
                    value={searchTerm} 
                    onChange={e => setSearchTerm(e.target.value)} 
                    className="w-full bg-white border-2 rounded-2xl px-6 py-5 text-xs font-bold outline-none focus:border-black transition-all shadow-inner" 
                   />
                   {searchTerm && (
                     <button onClick={() => setSearchTerm('')} className="absolute right-5 top-1/2 -translate-y-1/2 text-gray-300 font-black hover:text-black">Limpar</button>
                   )}
                 </div>
               </div>

               <div className="flex-1 overflow-y-auto space-y-3 no-scrollbar pb-8 pr-1">
                  {filteredMenu.length > 0 ? filteredMenu.map(p => (
                    <button 
                      key={p.id} 
                      onClick={() => handleManualAdd(p)} 
                      className="w-full text-left bg-white p-5 rounded-3xl border-2 border-transparent hover:border-black hover:shadow-xl transition-all group active:scale-95 flex items-center justify-between"
                    >
                       <div className="flex flex-col">
                          <span className="font-black text-[11px] uppercase text-black leading-tight mb-1">{p.name}</span>
                          <span className="text-[10px] font-bold text-yellow-700 italic">R$ {p.price.toFixed(2)}</span>
                       </div>
                       <div className="bg-yellow-400 text-black font-black text-[10px] px-4 py-2 rounded-2xl group-hover:scale-110 transition-transform shadow-sm">
                         + ADD
                       </div>
                    </button>
                  )) : (
                    <div className="text-center py-20 bg-white rounded-[3rem] border-2 border-dashed border-gray-200">
                       <p className="text-gray-300 font-black text-[10px] uppercase italic">Nada encontrado</p>
                    </div>
                  )}
               </div>
               
               <div className="pt-6 border-t border-gray-200 mt-auto">
                 <p className="text-[10px] text-gray-400 font-black uppercase text-center leading-relaxed">
                   Clique nos itens acima para <br/> adicionar agora na mesa.
                 </p>
               </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal Cardápio (Menu) */}
      {activeTab === 'menu' && (
        <div className="bg-white p-10 rounded-[4rem] shadow-xl border border-gray-100 animate-fade-in">
          <div className="flex justify-between items-center mb-12">
            <h3 className="text-4xl font-black italic text-black">Cardápio</h3>
            <button onClick={openAddProduct} className="bg-black text-yellow-400 px-10 py-5 rounded-2xl font-black text-xs uppercase shadow-2xl hover:brightness-110 hover:scale-105 transition-all">+ Novo Produto</button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            {menuItems.map(item => (
              <div key={item.id} className={`bg-gray-50 p-6 rounded-[3rem] border-2 transition-all group hover:border-yellow-400 ${!item.isAvailable ? 'opacity-50 grayscale' : 'hover:shadow-2xl'}`}>
                <div className="relative mb-6 overflow-hidden rounded-[2rem]">
                  <img src={item.image} className="w-full aspect-square object-cover group-hover:scale-110 transition-transform duration-700" />
                  <div className="absolute top-4 right-4 bg-black/80 backdrop-blur px-3 py-1 rounded-full">
                    <span className="text-yellow-400 font-black text-[10px] uppercase">{item.category}</span>
                  </div>
                </div>
                <h4 className="font-black text-lg truncate text-black mb-2">{item.name}</h4>
                <div className="flex justify-between items-center mb-6">
                  <span className="text-yellow-700 font-black text-md italic">R$ {item.price.toFixed(2)}</span>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <button onClick={() => { setEditingProduct({...item, price: item.price.toString()}); setIsProductModalOpen(true); }} className="bg-white py-4 rounded-2xl font-black text-[10px] uppercase border-2 text-black hover:bg-black hover:text-white hover:border-black transition-all">Editar</button>
                  <button onClick={() => { if(confirm(`Excluir ${item.name}?`)) onDeleteProduct(item.id); }} className="p-4 bg-red-50 text-red-500 rounded-2xl hover:bg-red-500 hover:text-white transition-all"><TrashIcon size={20}/></button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Modal Produto */}
      {isProductModalOpen && (
        <div className="fixed inset-0 z-[300] flex items-center justify-center p-6 bg-black/95 backdrop-blur-md">
          <div className="bg-white w-full max-w-lg rounded-[4rem] p-12 relative shadow-2xl border-t-8 border-yellow-400 animate-in zoom-in-95">
             <button onClick={() => setIsProductModalOpen(false)} className="absolute top-10 right-10 p-3 bg-gray-100 rounded-full hover:bg-gray-200 transition-colors"><CloseIcon size={24}/></button>
             <h3 className="text-4xl font-black italic mb-10 text-black">{editingProduct?.id ? 'Editar Item' : 'Novo Item'}</h3>
             <form onSubmit={handleProductSubmit} className="space-y-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 ml-5">Nome do Produto</label>
                  <input type="text" value={editingProduct?.name || ''} onChange={e => setEditingProduct({...editingProduct!, name: e.target.value})} placeholder="Nome" className="w-full bg-gray-50 border-2 rounded-2xl px-6 py-5 text-sm font-bold outline-none text-black focus:border-yellow-400" required />
                </div>
                <div className="grid grid-cols-2 gap-4">
                   <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 ml-5">Preço (R$)</label>
                    <input type="number" step="0.01" value={editingProduct?.price || ''} onChange={e => setEditingProduct({...editingProduct!, price: e.target.value})} placeholder="0,00" className="w-full bg-gray-50 border-2 rounded-2xl px-6 py-5 text-sm font-bold outline-none text-black focus:border-yellow-400" required />
                   </div>
                   <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 ml-5">Categoria</label>
                    <select value={editingProduct?.category} onChange={e => setEditingProduct({...editingProduct!, category: e.target.value})} className="w-full bg-gray-50 border-2 rounded-2xl px-6 py-5 text-sm font-bold outline-none text-black focus:border-yellow-400">
                        {categories.map(cat => <option key={cat.id} value={cat.name}>{cat.name}</option>)}
                        {categories.length === 0 && <option value="Combos">Combos</option>}
                    </select>
                   </div>
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 ml-5">URL da Imagem</label>
                  <input type="text" value={editingProduct?.image || ''} onChange={e => setEditingProduct({...editingProduct!, image: e.target.value})} placeholder="Link da imagem..." className="w-full bg-gray-50 border-2 rounded-2xl px-6 py-5 text-sm font-bold outline-none text-black focus:border-yellow-400" />
                </div>
                <button type="submit" className="w-full bg-black text-yellow-400 py-7 rounded-[2.5rem] font-black text-sm uppercase tracking-widest shadow-2xl hover:scale-[1.02] active:scale-95 transition-all mt-6">Salvar Item</button>
             </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminPanel;
