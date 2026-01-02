
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

  // Gestão de Categorias - Melhorada para evitar o erro de cache
  const handleAddCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    const name = newCategoryName.trim();
    if (!name || isSaving) return;
    
    setIsSaving(true);
    try {
      const { error } = await supabase.from('categories').insert([{ name }]);
      if (error) {
        console.error("Erro Supabase:", error);
        // Se for erro de cache (42P01)
        if (error.code === '42P01' || error.message.includes('schema cache')) {
          alert('AGUARDE 10 SEGUNDOS E APERTE F5.\nO banco de dados está sincronizando a nova tabela.');
        } else if (error.code === '23505') {
          alert('Esta categoria já existe!');
        } else {
          alert('Erro: ' + error.message);
        }
      } else {
        setNewCategoryName('');
        onRefreshData();
      }
    } catch (err) {
      alert('Falha crítica. Tente recarregar a página.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteCategory = async (id: string) => {
    if (!confirm(`Deseja excluir esta categoria?`)) return;
    const { error } = await supabase.from('categories').delete().eq('id', id);
    if (error) alert('Erro ao excluir: ' + error.message);
    else onRefreshData();
  };

  // Filtro de produtos para o lançamento manual
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
      category: categories.length > 0 ? categories[0].name : 'Lanches', 
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
      {/* Header Admin */}
      <div className="bg-white p-6 rounded-[3rem] shadow-sm border border-gray-100 mb-10">
        <div className="flex flex-col md:flex-row justify-between items-center gap-6">
          <div className="flex items-center gap-4">
            <div className="bg-black p-3 rounded-2xl shadow-lg">
              <h2 className="text-2xl font-black italic tracking-tighter text-yellow-400">D.MOREIRA</h2>
            </div>
            <button onClick={onToggleAudio} className={`p-3 rounded-full transition-all ${audioEnabled ? 'bg-yellow-400 text-black shadow-md' : 'bg-gray-100 text-gray-400'}`}>
              <VolumeIcon muted={!audioEnabled} />
            </button>
          </div>
          <nav className="flex gap-2 overflow-x-auto no-scrollbar w-full md:w-auto p-1">
            {(['tables', 'delivery', 'menu', 'categories'] as const).map(tab => (
              <button key={tab} onClick={() => setActiveTab(tab)} className={`whitespace-nowrap px-6 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === tab ? 'bg-black text-yellow-400 shadow-lg' : 'text-gray-400 hover:bg-gray-50'}`}>
                {tab === 'tables' ? 'Mesas' : tab === 'delivery' ? 'Entregas' : tab === 'menu' ? 'Cardápio' : 'Categorias'}
              </button>
            ))}
            <button onClick={onLogout} className="whitespace-nowrap text-red-500 font-black text-[10px] uppercase ml-4 p-3 hover:bg-red-50 rounded-xl">Sair</button>
          </nav>
        </div>
      </div>

      {dbStatus === 'error_tables_missing' && (
        <div className="bg-red-600 text-white p-6 rounded-[2.5rem] mb-10 text-center font-black uppercase text-xs tracking-widest italic animate-pulse">
          ⚠️ ERRO NO BANCO DE DADOS: Execute o SQL Master e aperte F5.
        </div>
      )}

      {/* Aba Categorias */}
      {activeTab === 'categories' && (
        <div className="bg-white p-8 rounded-[3.5rem] shadow-sm border border-gray-100 max-w-2xl mx-auto animate-fade-in">
          <h3 className="text-3xl font-black italic mb-8 text-black">Categorias</h3>
          <form onSubmit={handleAddCategory} className="flex gap-3 mb-10">
            <input type="text" value={newCategoryName} onChange={e => setNewCategoryName(e.target.value)} placeholder="Ex: Bebidas, Combos..." className="flex-1 bg-gray-50 border rounded-2xl px-6 py-4 text-sm font-bold outline-none text-black focus:border-yellow-400" />
            <button type="submit" disabled={isSaving} className="bg-black text-yellow-400 px-8 py-4 rounded-2xl font-black text-xs uppercase shadow-xl hover:scale-105 active:scale-95 transition-all">
              {isSaving ? '...' : 'Salvar'}
            </button>
          </form>
          <div className="grid grid-cols-1 gap-3">
            {categories.map(cat => (
              <div key={cat.id} className="flex justify-between items-center bg-gray-50 p-5 rounded-2xl border hover:border-yellow-400 transition-colors">
                <span className="font-black text-gray-800 uppercase tracking-widest text-xs">{cat.name}</span>
                <button onClick={() => handleDeleteCategory(cat.id)} className="p-2 text-red-300 hover:text-red-500"><TrashIcon size={18}/></button>
              </div>
            ))}
            {categories.length === 0 && <p className="text-center py-10 text-gray-400 font-black italic">Nenhuma categoria cadastrada.</p>}
          </div>
        </div>
      )}

      {/* Aba Menu */}
      {activeTab === 'menu' && (
        <div className="bg-white p-8 rounded-[3.5rem] shadow-sm border border-gray-100 animate-fade-in">
          <div className="flex justify-between items-center mb-10">
            <h3 className="text-3xl font-black italic text-black">Gerenciar Menu</h3>
            <button onClick={openAddProduct} className="bg-black text-yellow-400 px-8 py-4 rounded-2xl font-black text-xs uppercase shadow-xl hover:brightness-110 transition-all">+ Novo Produto</button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {menuItems.map(item => (
              <div key={item.id} className={`bg-gray-50 p-5 rounded-[2.5rem] border hover:border-yellow-400 transition-all ${!item.isAvailable ? 'opacity-50 grayscale' : ''}`}>
                <img src={item.image} className="w-full aspect-square object-cover rounded-2xl mb-4 shadow-sm" />
                <h4 className="font-black text-sm truncate text-black mb-1">{item.name}</h4>
                <div className="flex justify-between items-center mb-4">
                  <span className="text-yellow-700 font-black text-xs italic">R$ {item.price.toFixed(2)}</span>
                  <span className="text-[8px] font-black uppercase text-gray-400">{item.category}</span>
                </div>
                <div className="flex gap-2">
                  <button onClick={() => { setEditingProduct({...item, price: item.price.toString()}); setIsProductModalOpen(true); }} className="flex-1 bg-white py-3 rounded-xl font-black text-[10px] uppercase border text-black hover:bg-gray-100">Editar</button>
                  <button onClick={() => { if(confirm(`Excluir ${item.name}?`)) onDeleteProduct(item.id); }} className="p-3 bg-red-50 text-red-500 rounded-xl hover:bg-red-500 hover:text-white transition-colors"><TrashIcon size={16}/></button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Aba Mesas / Entregas */}
      {(activeTab === 'tables' || activeTab === 'delivery') && (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-6 animate-fade-in">
          {(activeTab === 'tables' ? physicalTables : deliveryTables).map(t => (
            <button key={t.id} onClick={() => {
              if (t.currentOrder?.isUpdated) onUpdateTable(t.id, 'occupied', { ...t.currentOrder, isUpdated: false });
              setSelectedTableId(t.id);
            }} className={`p-6 rounded-[2.5rem] border-4 transition-all flex flex-col items-center justify-center gap-1 h-48 relative overflow-hidden ${t.status === 'free' ? 'bg-white border-gray-100 hover:border-yellow-400' : 'bg-yellow-400 border-black shadow-xl scale-105'}`}>
              {t.status === 'occupied' && t.currentOrder?.isUpdated && <div className="absolute top-3 right-3 bg-red-600 w-3 h-3 rounded-full animate-pulse ring-4 ring-white"></div>}
              <span className="text-4xl font-black italic mb-1 text-black">{t.id >= 900 ? (t.id === 900 ? '🚚' : '🛍️') : t.id}</span>
              <span className={`text-[8px] font-black uppercase px-2.5 py-1 rounded-full ${t.status === 'free' ? 'bg-gray-100 text-gray-400' : 'bg-black text-white'}`}>{t.id >= 900 ? (t.id === 900 ? 'Entrega' : 'Balcão') : (t.status === 'free' ? 'Livre' : 'Ocupada')}</span>
              {t.status === 'occupied' && <span className="text-[11px] font-black mt-1 truncate w-full px-2 text-center text-black">{t.currentOrder?.customerName}</span>}
            </button>
          ))}
        </div>
      )}

      {/* Modal de Pedido / Lançamento Manual - GARANTINDO QUE APAREÇA */}
      {selectedTable && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/95 backdrop-blur-xl" onClick={() => setSelectedTableId(null)} />
          <div className="relative bg-white w-full max-w-5xl rounded-[4rem] flex flex-col md:flex-row overflow-hidden shadow-2xl animate-in slide-in-from-bottom duration-300">
            
            {/* Lado Esquerdo: Comanda Atual */}
            <div className="flex-1 p-8 md:p-12 border-b md:border-b-0 md:border-r border-gray-100 overflow-y-auto max-h-[90vh]">
               <div className="flex justify-between items-start mb-8">
                 <h3 className="text-4xl font-black italic text-black">Mesa {selectedTable.id >= 900 ? (selectedTable.id === 900 ? 'Entrega' : 'Balcão') : selectedTable.id}</h3>
                 <button onClick={() => setSelectedTableId(null)} className="p-3 bg-gray-100 rounded-full hover:bg-gray-200 transition-colors"><CloseIcon size={24} /></button>
               </div>
               
               <div className="space-y-4 mb-10">
                 {selectedTable.currentOrder?.items.map((item, idx) => (
                   <div key={idx} className="flex justify-between items-center bg-gray-50 p-5 rounded-3xl border border-gray-100">
                     <div className="flex flex-col">
                       <span className="font-black text-sm text-black uppercase tracking-tight">{item.quantity}x {item.name}</span>
                       <span className="text-[9px] font-bold text-gray-400 uppercase tracking-widest">{item.category}</span>
                     </div>
                     <span className="font-black text-sm text-yellow-700 italic">R$ {(item.price * item.quantity).toFixed(2)}</span>
                   </div>
                 )) || (
                   <div className="text-center py-20 border-2 border-dashed border-gray-100 rounded-[3rem]">
                      <p className="text-gray-300 font-black uppercase text-xs tracking-widest italic">Aguardando pedidos...</p>
                   </div>
                 )}
               </div>

               {selectedTable.status === 'occupied' && (
                 <div className="border-t-4 border-black pt-8">
                    <div className="flex justify-between items-end mb-8">
                      <div className="flex flex-col gap-1">
                        <span className="text-gray-400 font-black text-[10px] uppercase tracking-widest">Cliente: {selectedTable.currentOrder?.customerName}</span>
                        <span className="text-gray-400 font-black text-[10px] uppercase tracking-widest">Pagamento: {selectedTable.currentOrder?.paymentMethod}</span>
                      </div>
                      <span className="text-5xl font-black italic text-black">R$ {selectedTable.currentOrder?.total.toFixed(2)}</span>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <button onClick={() => setSelectedTableId(null)} className="bg-gray-100 text-black py-6 rounded-3xl font-black uppercase text-xs tracking-widest hover:bg-gray-200 transition-all">Manter Aberta</button>
                      <button onClick={() => { if(confirm('Deseja realmente fechar e liberar a mesa?')) onUpdateTable(selectedTable.id, 'free'); setSelectedTableId(null); }} className="bg-green-600 text-white py-6 rounded-3xl font-black uppercase text-xs tracking-widest shadow-lg hover:brightness-110 active:scale-95 transition-all">Finalizar e Liberar</button>
                    </div>
                 </div>
               )}
            </div>

            {/* Lado Direito: Busca e Lançamento Rápido */}
            <div className="w-full md:w-[22rem] bg-gray-50 p-8 flex flex-col border-l border-gray-100">
               <div className="mb-6">
                 <h4 className="text-xs font-black uppercase tracking-widest text-black mb-4">Lançamento Rápido</h4>
                 <div className="relative">
                   <input 
                    type="text" 
                    placeholder="Buscar produto ou categoria..." 
                    value={searchTerm} 
                    onChange={e => setSearchTerm(e.target.value)} 
                    className="w-full bg-white border-2 rounded-2xl px-5 py-4 text-xs font-bold outline-none focus:border-yellow-400 transition-all shadow-sm" 
                   />
                   {searchTerm && (
                     <button onClick={() => setSearchTerm('')} className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 font-black">✕</button>
                   )}
                 </div>
               </div>

               <div className="flex-1 overflow-y-auto space-y-3 no-scrollbar pb-6">
                  {filteredMenu.length > 0 ? filteredMenu.map(p => (
                    <button 
                      key={p.id} 
                      onClick={() => handleManualAdd(p)} 
                      className="w-full text-left bg-white p-4 rounded-2xl border-2 border-transparent hover:border-black hover:shadow-md transition-all group active:scale-95"
                    >
                       <div className="flex justify-between items-center">
                          <div className="flex flex-col">
                            <span className="font-black text-[10px] uppercase text-black line-clamp-1">{p.name}</span>
                            <span className="text-[8px] font-bold text-yellow-700 italic">R$ {p.price.toFixed(2)}</span>
                          </div>
                          <span className="bg-yellow-400 text-black font-black text-[10px] px-3 py-1.5 rounded-xl group-hover:scale-110 transition-transform">+ ADD</span>
                       </div>
                    </button>
                  )) : (
                    <p className="text-center text-gray-400 font-black text-[10px] uppercase py-10">Nenhum item encontrado</p>
                  )}
               </div>
               
               <div className="pt-4 border-t border-gray-200">
                 <p className="text-[9px] text-gray-400 font-black uppercase text-center leading-tight">
                   Clique nos itens acima para <br/> lançar direto na mesa.
                 </p>
               </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal Novo/Editar Produto */}
      {isProductModalOpen && (
        <div className="fixed inset-0 z-[300] flex items-center justify-center p-6 bg-black/90 backdrop-blur-md">
          <div className="bg-white w-full max-w-lg rounded-[3.5rem] p-10 relative shadow-2xl animate-in zoom-in-95 duration-200">
             <button onClick={() => setIsProductModalOpen(false)} className="absolute top-8 right-8 p-2 bg-gray-100 rounded-full hover:bg-gray-200 transition-colors"><CloseIcon size={20}/></button>
             <h3 className="text-3xl font-black italic mb-8 text-black">{editingProduct?.id ? 'Editar Item' : 'Novo Item'}</h3>
             <form onSubmit={handleProductSubmit} className="space-y-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 ml-4">Nome do Produto</label>
                  <input type="text" value={editingProduct?.name || ''} onChange={e => setEditingProduct({...editingProduct!, name: e.target.value})} placeholder="Ex: X-Burger Bacon" className="w-full bg-gray-50 border-2 rounded-2xl px-6 py-4 text-sm font-bold outline-none text-black focus:border-yellow-400 transition-all" required />
                </div>
                <div className="grid grid-cols-2 gap-4">
                   <div className="space-y-1">
                    <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 ml-4">Preço (R$)</label>
                    <input type="number" step="0.01" value={editingProduct?.price || ''} onChange={e => setEditingProduct({...editingProduct!, price: e.target.value})} placeholder="0,00" className="w-full bg-gray-50 border-2 rounded-2xl px-6 py-4 text-sm font-bold outline-none text-black focus:border-yellow-400" required />
                   </div>
                   <div className="space-y-1">
                    <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 ml-4">Categoria</label>
                    <select value={editingProduct?.category} onChange={e => setEditingProduct({...editingProduct!, category: e.target.value})} className="w-full bg-gray-50 border-2 rounded-2xl px-6 py-4 text-sm font-bold outline-none text-black focus:border-yellow-400">
                        {categories.map(cat => <option key={cat.id} value={cat.name}>{cat.name}</option>)}
                        {categories.length === 0 && <option value="Lanches">Padrão: Lanches</option>}
                    </select>
                   </div>
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 ml-4">URL da Imagem</label>
                  <input type="text" value={editingProduct?.image || ''} onChange={e => setEditingProduct({...editingProduct!, image: e.target.value})} placeholder="https://link-da-imagem.jpg" className="w-full bg-gray-50 border-2 rounded-2xl px-6 py-4 text-sm font-bold outline-none text-black focus:border-yellow-400" />
                </div>
                <button type="submit" className="w-full bg-black text-yellow-400 py-6 rounded-3xl font-black text-xs uppercase tracking-widest shadow-xl hover:scale-105 active:scale-95 transition-all mt-4">Salvar Alterações</button>
             </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminPanel;
