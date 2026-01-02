
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
  const [renamingCategoryId, setRenamingCategoryId] = useState<string | null>(null);
  const [renamingName, setRenamingName] = useState('');

  const physicalTables = tables.filter(t => t.id <= 12).sort((a,b) => a.id - b.id);
  const deliveryTables = tables.filter(t => t.id >= 900).sort((a,b) => a.id - b.id);

  const selectedTable = useMemo(() => tables.find(t => t.id === selectedTableId) || null, [tables, selectedTableId]);

  // Gestão de Categorias
  const handleAddCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    const name = newCategoryName.trim();
    if (!name || isSaving) return;
    
    setIsSaving(true);
    try {
      const { error } = await supabase.from('categories').insert([{ name }]);
      if (error) {
        if (error.code === '42P01' || error.message.includes('schema cache')) {
          alert('ERRO DE SINCRONIZAÇÃO: O banco de dados foi atualizado, mas seu navegador ainda não "viu" a mudança.\n\nAção necessária: Aperte F5 agora.');
        } else {
          alert('Erro ao salvar: ' + error.message);
        }
      } else {
        setNewCategoryName('');
        onRefreshData();
      }
    } catch (err) {
      alert('Falha na conexão. Recarregue a página.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteCategory = async (id: string, name: string) => {
    if (!confirm(`Deseja excluir a categoria "${name}"?`)) return;
    const { error } = await supabase.from('categories').delete().eq('id', id);
    if (error) alert('Erro: ' + error.message);
    else onRefreshData();
  };

  const handleRenameCategory = async (id: string) => {
    if (!renamingName.trim()) return;
    const { error } = await supabase.from('categories').update({ name: renamingName.trim() }).eq('id', id);
    if (error) alert('Erro: ' + error.message);
    else { setRenamingCategoryId(null); onRefreshData(); }
  };

  // Lançamento de Itens Manual
  const filteredMenu = useMemo(() => 
    menuItems.filter(p => p.name.toLowerCase().includes(searchTerm.toLowerCase()) && p.isAvailable),
    [menuItems, searchTerm]
  );

  const handleManualAdd = (p: Product) => {
    if (!selectedTableId) return;
    onAddToOrder(selectedTableId, p);
  };

  // Gestão de Produtos
  const openAddProduct = () => {
    setEditingProduct({ 
      name: '', 
      price: '', 
      category: categories.length > 0 ? categories[0].name : 'Geral', 
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
      {/* Header do Painel */}
      <div className="bg-white p-6 rounded-[3rem] shadow-sm border border-gray-100 mb-10">
        <div className="flex flex-col md:flex-row justify-between items-center gap-6">
          <div className="flex items-center gap-4">
            <h2 className="text-3xl font-black italic tracking-tighter text-black">D.Moreira Admin</h2>
            <button onClick={onToggleAudio} className={`p-3 rounded-full transition-all ${audioEnabled ? 'bg-yellow-400 text-black shadow-md' : 'bg-gray-100 text-gray-400'}`}>
              <VolumeIcon muted={!audioEnabled} />
            </button>
          </div>
          <nav className="flex gap-2 overflow-x-auto no-scrollbar w-full md:w-auto p-1">
            {(['tables', 'delivery', 'menu', 'categories'] as const).map(tab => (
              <button key={tab} onClick={() => setActiveTab(tab)} className={`whitespace-nowrap px-6 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === tab ? 'bg-black text-yellow-400 shadow-lg' : 'text-gray-400 hover:bg-gray-50'}`}>
                {tab === 'tables' ? 'Mesas' : tab === 'delivery' ? 'Atendimentos' : tab === 'menu' ? 'Cardápio' : 'Categorias'}
              </button>
            ))}
            <button onClick={onLogout} className="whitespace-nowrap text-red-500 font-black text-[10px] uppercase ml-4 p-3 hover:bg-red-50 rounded-xl">Sair</button>
          </nav>
        </div>
      </div>

      {dbStatus === 'error_tables_missing' && (
        <div className="bg-red-600 text-white p-6 rounded-[2.5rem] mb-10 text-center font-black uppercase text-xs tracking-widest italic animate-pulse">
          ⚠️ Tabelas não encontradas! Execute o SQL Master e aperte F5.
        </div>
      )}

      {activeTab === 'categories' && (
        <div className="bg-white p-8 rounded-[3.5rem] shadow-sm border border-gray-100 max-w-2xl mx-auto animate-fade-in">
          <h3 className="text-3xl font-black italic mb-8 text-black">Gerenciar Categorias</h3>
          <form onSubmit={handleAddCategory} className="flex gap-3 mb-10">
            <input type="text" value={newCategoryName} onChange={e => setNewCategoryName(e.target.value)} placeholder="Nova categoria..." className="flex-1 bg-gray-50 border rounded-2xl px-6 py-4 text-sm font-bold outline-none text-black" />
            <button type="submit" disabled={isSaving} className="bg-black text-yellow-400 px-8 py-4 rounded-2xl font-black text-xs uppercase shadow-xl hover:scale-105 active:scale-95 transition-all">
              {isSaving ? '...' : 'Salvar'}
            </button>
          </form>
          <div className="space-y-3">
            {categories.map(cat => (
              <div key={cat.id} className="flex justify-between items-center bg-gray-50 p-5 rounded-2xl border">
                <span className="font-black text-gray-800 uppercase tracking-widest text-xs">{cat.name}</span>
                <button onClick={() => handleDeleteCategory(cat.id, cat.name)} className="p-2 text-red-300 hover:text-red-500"><TrashIcon size={18}/></button>
              </div>
            ))}
          </div>
        </div>
      )}

      {activeTab === 'menu' && (
        <div className="bg-white p-8 rounded-[3.5rem] shadow-sm border border-gray-100 animate-fade-in">
          <div className="flex justify-between items-center mb-10">
            <h3 className="text-3xl font-black italic text-black">Produtos</h3>
            <button onClick={openAddProduct} className="bg-black text-yellow-400 px-8 py-4 rounded-2xl font-black text-xs uppercase shadow-xl">+ Novo Produto</button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {menuItems.map(item => (
              <div key={item.id} className={`bg-gray-50 p-5 rounded-[2.5rem] border ${!item.isAvailable ? 'opacity-50 grayscale' : ''}`}>
                <img src={item.image} className="w-full aspect-square object-cover rounded-2xl mb-4" />
                <h4 className="font-black text-sm truncate text-black">{item.name}</h4>
                <p className="text-yellow-700 font-black text-xs mb-4">R$ {item.price.toFixed(2)}</p>
                <div className="flex gap-2">
                  <button onClick={() => { setEditingProduct({...item, price: item.price.toString()}); setIsProductModalOpen(true); }} className="flex-1 bg-white py-3 rounded-xl font-black text-[10px] uppercase border text-black">Editar</button>
                  <button onClick={() => { if(confirm(`Excluir ${item.name}?`)) onDeleteProduct(item.id); }} className="p-3 bg-red-50 text-red-500 rounded-xl"><TrashIcon size={16}/></button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {(activeTab === 'tables' || activeTab === 'delivery') && (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-6 animate-fade-in">
          {(activeTab === 'tables' ? physicalTables : deliveryTables).map(t => (
            <button key={t.id} onClick={() => {
              if (t.currentOrder?.isUpdated) onUpdateTable(t.id, 'occupied', { ...t.currentOrder, isUpdated: false });
              setSelectedTableId(t.id);
            }} className={`p-6 rounded-[2.5rem] border-4 transition-all flex flex-col items-center justify-center gap-1 h-48 relative overflow-hidden ${t.status === 'free' ? 'bg-white border-gray-100' : 'bg-yellow-400 border-black shadow-xl scale-105'}`}>
              {t.status === 'occupied' && t.currentOrder?.isUpdated && <div className="absolute top-3 right-3 bg-red-600 w-3 h-3 rounded-full animate-pulse ring-4 ring-white"></div>}
              <span className="text-4xl font-black italic mb-1 text-black">{t.id >= 900 ? (t.id === 900 ? '🚚' : '🛍️') : t.id}</span>
              <span className={`text-[8px] font-black uppercase px-2.5 py-1 rounded-full ${t.status === 'free' ? 'bg-gray-100 text-gray-400' : 'bg-black text-white'}`}>{t.id >= 900 ? (t.id === 900 ? 'Entrega' : 'Balcão') : (t.status === 'free' ? 'Livre' : 'Ocupada')}</span>
              {t.status === 'occupied' && <span className="text-[11px] font-black mt-1 truncate w-full px-2 text-center text-black">{t.currentOrder?.customerName}</span>}
            </button>
          ))}
        </div>
      )}

      {/* Modal de Pedido - REESTRUTURADO PARA ADICIONAR ITENS */}
      {selectedTable && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/95 backdrop-blur-xl" onClick={() => setSelectedTableId(null)} />
          <div className="relative bg-white w-full max-w-4xl rounded-[4rem] flex flex-col md:flex-row overflow-hidden shadow-2xl animate-in slide-in-from-bottom">
            
            {/* Lado Esquerdo: Itens Lançados */}
            <div className="flex-1 p-10 border-b md:border-b-0 md:border-r border-gray-100">
               <h3 className="text-3xl font-black italic mb-8 text-black">Mesa {selectedTable.id >= 900 ? (selectedTable.id === 900 ? 'Entrega' : 'Balcão') : selectedTable.id}</h3>
               
               <div className="space-y-4 mb-8 max-h-[50vh] overflow-y-auto no-scrollbar pr-2">
                 {selectedTable.currentOrder?.items.map((item, idx) => (
                   <div key={idx} className="flex justify-between items-center bg-gray-50 p-4 rounded-2xl">
                     <div className="flex flex-col">
                       <span className="font-black text-sm text-black">{item.quantity}x {item.name}</span>
                       <span className="text-[10px] font-bold text-gray-400 uppercase">{item.category}</span>
                     </div>
                     <span className="font-black text-sm text-yellow-700">R$ {(item.price * item.quantity).toFixed(2)}</span>
                   </div>
                 )) || <p className="text-gray-400 font-black uppercase text-center py-20 italic">Vazia</p>}
               </div>

               {selectedTable.currentOrder && (
                 <div className="border-t pt-6">
                    <div className="flex justify-between items-end mb-6">
                      <span className="text-gray-400 font-black text-[9px] uppercase">Total</span>
                      <span className="text-4xl font-black italic text-black">R$ {selectedTable.currentOrder.total.toFixed(2)}</span>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <button onClick={() => setSelectedTableId(null)} className="bg-gray-100 text-black py-5 rounded-2xl font-black uppercase text-[10px]">Fechar</button>
                      <button onClick={() => { if(confirm('Liberar mesa?')) onUpdateTable(selectedTable.id, 'free'); setSelectedTableId(null); }} className="bg-green-600 text-white py-5 rounded-2xl font-black uppercase text-[10px]">Finalizar</button>
                    </div>
                 </div>
               )}
            </div>

            {/* Lado Direito: Lançar Itens */}
            <div className="w-full md:w-80 bg-gray-50 p-8 flex flex-col">
               <h4 className="text-xs font-black uppercase tracking-widest text-gray-400 mb-4">Lançar Produtos</h4>
               <input type="text" placeholder="Buscar..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="w-full bg-white border rounded-xl px-4 py-3 text-xs font-bold mb-4 outline-none focus:border-yellow-400" />
               <div className="flex-1 overflow-y-auto space-y-2 no-scrollbar">
                  {filteredMenu.map(p => (
                    <button key={p.id} onClick={() => handleManualAdd(p)} className="w-full text-left bg-white p-3 rounded-xl border hover:border-black transition-all group">
                       <div className="flex justify-between items-center">
                          <span className="font-black text-[10px] uppercase text-black line-clamp-1 flex-1">{p.name}</span>
                          <span className="bg-yellow-400 text-black font-black text-[9px] px-2 py-1 rounded-lg ml-2 group-active:scale-90 transition-transform">+ Add</span>
                       </div>
                    </button>
                  ))}
               </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal Produto */}
      {isProductModalOpen && (
        <div className="fixed inset-0 z-[300] flex items-center justify-center p-6 bg-black/90 backdrop-blur-md">
          <div className="bg-white w-full max-w-lg rounded-[3.5rem] p-10 relative shadow-2xl">
             <button onClick={() => setIsProductModalOpen(false)} className="absolute top-6 right-6 p-2 bg-gray-100 rounded-full"><CloseIcon size={20}/></button>
             <h3 className="text-3xl font-black italic mb-8 text-black">Editar Produto</h3>
             <form onSubmit={handleProductSubmit} className="space-y-4">
                <input type="text" value={editingProduct?.name || ''} onChange={e => setEditingProduct({...editingProduct!, name: e.target.value})} placeholder="Nome" className="w-full bg-gray-50 border rounded-2xl px-6 py-4 text-sm font-bold outline-none text-black" required />
                <div className="grid grid-cols-2 gap-4">
                   <input type="number" step="0.01" value={editingProduct?.price || ''} onChange={e => setEditingProduct({...editingProduct!, price: e.target.value})} placeholder="Preço" className="w-full bg-gray-50 border rounded-2xl px-6 py-4 text-sm font-bold outline-none text-black" required />
                   <select value={editingProduct?.category} onChange={e => setEditingProduct({...editingProduct!, category: e.target.value})} className="w-full bg-gray-50 border rounded-2xl px-6 py-4 text-sm font-bold outline-none text-black">
                      {categories.map(cat => <option key={cat.id} value={cat.name}>{cat.name}</option>)}
                   </select>
                </div>
                <input type="text" value={editingProduct?.image || ''} onChange={e => setEditingProduct({...editingProduct!, image: e.target.value})} placeholder="URL Imagem" className="w-full bg-gray-50 border rounded-2xl px-6 py-4 text-sm font-bold outline-none text-black" />
                <button type="submit" className="w-full bg-black text-yellow-400 py-5 rounded-2xl font-black text-xs uppercase">Salvar</button>
             </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminPanel;
