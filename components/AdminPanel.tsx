
import React, { useState, useMemo } from 'react';
import { Table, Order, Product, Category } from '../types';
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
  salesHistory: Order[];
  onLogout: () => void;
  onSaveProduct: (product: Partial<Product>) => void;
  onDeleteProduct: (id: string) => void;
  dbStatus: 'loading' | 'ok' | 'error_tables_missing';
}

const AdminPanel: React.FC<AdminPanelProps> = ({ tables, menuItems, categories, audioEnabled, onToggleAudio, onUpdateTable, onAddToOrder, onRefreshData, onLogout, onSaveProduct, onDeleteProduct, dbStatus }) => {
  const [activeTab, setActiveTab] = useState<'tables' | 'delivery' | 'takeaway' | 'menu' | 'categories'>('tables');
  const [selectedTableId, setSelectedTableId] = useState<number | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  
  const [editingProduct, setEditingProduct] = useState<any | null>(null);
  const [isProductModalOpen, setIsProductModalOpen] = useState(false);
  
  const [newCategoryName, setNewCategoryName] = useState('');
  const [renamingCategoryId, setRenamingCategoryId] = useState<string | null>(null);
  const [renamingName, setRenamingName] = useState('');

  const physicalTables = tables.filter(t => t.id <= 12).sort((a,b) => a.id - b.id);
  const deliveryTable = tables.find(t => t.id === 900);
  const counterTable = tables.find(t => t.id === 901);

  const selectedTable = useMemo(() => tables.find(t => t.id === selectedTableId) || null, [tables, selectedTableId]);

  const openEditModal = (product: Product) => {
    setEditingProduct({ ...product, price: product.price.toString() });
    setIsProductModalOpen(true);
  };

  const openAddModal = () => {
    const initialCat = categories.length > 0 ? categories[0].name : (menuItems.length > 0 ? menuItems[0].category : 'Geral');
    setEditingProduct({ name: '', price: '', category: initialCat, description: '', image: '', isAvailable: true });
    setIsProductModalOpen(true);
  };

  const handleAddCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCategoryName.trim()) return;
    
    const { error } = await supabase.from('categories').insert([{ name: newCategoryName.trim() }]);
    
    if (error) {
       console.error("Erro Supabase:", error);
       if (error.message?.includes('schema cache') || error.code === '42P01') {
         alert('Tabela "categories" não encontrada ou Cache desatualizado.\n\nSe você já rodou o SQL, por favor ATUALIZE A PÁGINA (F5) do seu navegador agora.');
       } else {
         alert('Erro ao salvar categoria: ' + error.message);
       }
    } else { 
       setNewCategoryName(''); 
       onRefreshData(); 
    }
  };

  const handleRenameCategory = async (id: string) => {
    if (!renamingName.trim()) return;
    const { error } = await supabase.from('categories').update({ name: renamingName.trim() }).eq('id', id);
    if (error) alert('Erro: ' + error.message);
    else { setRenamingCategoryId(null); onRefreshData(); }
  };

  const handleDeleteCategory = async (id: string, name: string) => {
    if (!confirm(`Excluir categoria "${name}"?`)) return;
    const { error } = await supabase.from('categories').delete().eq('id', id);
    if (error) alert('Erro: ' + error.message);
    else onRefreshData();
  };

  const handleProductSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const priceNum = parseFloat(editingProduct.price);
    if (!editingProduct?.name || isNaN(priceNum) || !editingProduct?.category) {
      return alert('Preencha os campos obrigatórios (Nome, Preço e Categoria).');
    }
    onSaveProduct({ ...editingProduct, price: priceNum });
    setIsProductModalOpen(false);
  };

  const handleOpenTable = (id: number) => {
    const table = tables.find(t => t.id === id);
    if (table?.currentOrder?.isUpdated) onUpdateTable(id, 'occupied', { ...table.currentOrder, isUpdated: false });
    setSelectedTableId(id);
  };

  return (
    <div className="w-full">
      <div className="bg-white p-6 rounded-[3rem] shadow-sm border border-gray-100 mb-10">
        <div className="flex flex-col md:flex-row justify-between items-center gap-6">
          <div className="flex items-center gap-4">
            <h2 className="text-3xl font-black italic tracking-tighter text-black">Painel D.Moreira</h2>
            <button onClick={onToggleAudio} className={`p-3 rounded-full transition-all flex items-center gap-2 ${audioEnabled ? 'bg-yellow-400 text-black shadow-md' : 'bg-gray-100 text-gray-400'}`}>
              <VolumeIcon muted={!audioEnabled} /><span className="text-[8px] font-black uppercase tracking-widest">{audioEnabled ? 'Som Ativo' : 'Mudo'}</span>
            </button>
          </div>
          <div className="flex gap-2 sm:gap-4 overflow-x-auto no-scrollbar w-full md:w-auto p-1 items-center">
            {(['tables', 'delivery', 'takeaway', 'menu', 'categories'] as const).map(tab => (
              <button key={tab} onClick={() => setActiveTab(tab)} className={`whitespace-nowrap px-5 py-2.5 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === tab ? 'bg-yellow-400 text-black shadow-lg' : 'text-gray-400 hover:bg-gray-50'}`}>
                {tab === 'tables' ? 'Mesas' : tab === 'delivery' ? 'Entregas' : tab === 'takeaway' ? 'Balcão' : tab === 'menu' ? 'Produtos' : 'Categorias'}
              </button>
            ))}
            <button onClick={onLogout} className="whitespace-nowrap text-red-500 font-black text-[10px] uppercase ml-4 p-2 hover:bg-red-50 rounded-xl">Sair</button>
          </div>
        </div>
      </div>

      {dbStatus === 'error_tables_missing' && activeTab !== 'categories' && (
        <div className="bg-red-50 border-2 border-red-200 p-6 rounded-[2rem] mb-10 text-center">
          <p className="text-red-700 font-black uppercase text-[10px] tracking-widest italic">Atenção: Rode o SQL Editor e depois recarregue esta página.</p>
        </div>
      )}

      {activeTab === 'categories' && (
        <div className="bg-white p-8 rounded-[3.5rem] shadow-sm border border-gray-100 max-w-2xl mx-auto animate-fade-in">
          <h3 className="text-3xl font-black italic tracking-tighter mb-8 text-black">Categorias</h3>
          <form onSubmit={handleAddCategory} className="flex gap-3 mb-8">
            <input type="text" value={newCategoryName} onChange={(e) => setNewCategoryName(e.target.value)} placeholder="Ex: Bebidas, Lanches..." className="flex-1 bg-gray-50 border rounded-2xl px-6 py-4 text-sm font-bold outline-none focus:border-yellow-400 text-black" />
            <button type="submit" className="bg-black text-yellow-400 px-6 py-4 rounded-2xl font-black text-xs uppercase shadow-xl hover:brightness-110 active:scale-95">Adicionar</button>
          </form>
          <div className="space-y-3">
            {categories.map(cat => (
              <div key={cat.id} className="flex justify-between items-center bg-gray-50 p-5 rounded-2xl border hover:border-yellow-400 transition-all">
                {renamingCategoryId === cat.id ? (
                  <div className="flex-1 flex gap-2">
                    <input autoFocus type="text" value={renamingName} onChange={e => setRenamingName(e.target.value)} className="flex-1 border rounded-xl px-4 py-2 text-sm font-bold outline-none text-black" />
                    <button onClick={() => handleRenameCategory(cat.id)} className="bg-green-500 text-white px-4 py-2 rounded-xl font-black text-[10px] uppercase">Salvar</button>
                    <button onClick={() => setRenamingCategoryId(null)} className="text-gray-400 uppercase text-[10px] font-black px-2">X</button>
                  </div>
                ) : (
                  <>
                    <span className="font-black text-gray-800 uppercase tracking-widest text-xs">{cat.name}</span>
                    <div className="flex gap-2">
                      <button onClick={() => { setRenamingCategoryId(cat.id); setRenamingName(cat.name); }} className="p-2 text-gray-400 hover:text-black">
                        <svg width="18" height="18" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg>
                      </button>
                      <button onClick={() => handleDeleteCategory(cat.id, cat.name)} className="p-2 text-red-300 hover:text-red-500"><TrashIcon size={18}/></button>
                    </div>
                  </>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {activeTab === 'menu' && (
        <div className="bg-white p-8 rounded-[3.5rem] shadow-sm border border-gray-100 animate-fade-in">
          <div className="flex justify-between items-center mb-10">
            <h3 className="text-3xl font-black italic tracking-tighter text-black">Produtos</h3>
            <button onClick={openAddModal} className="bg-black text-yellow-400 px-8 py-4 rounded-2xl font-black text-xs uppercase shadow-xl hover:brightness-110">+ Novo Item</button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {menuItems.map(item => (
              <div key={item.id} className={`bg-gray-50 p-5 rounded-[2.5rem] border ${!item.isAvailable ? 'opacity-50 grayscale' : 'hover:border-yellow-400'} transition-all`}>
                <img src={item.image} className="w-full aspect-square object-cover rounded-2xl mb-4" />
                <h4 className="font-black text-sm truncate mb-1 text-black">{item.name}</h4>
                <p className="text-yellow-700 font-black text-xs mb-4">R$ {item.price.toFixed(2).replace('.', ',')}</p>
                <div className="flex gap-2">
                  <button onClick={() => openEditModal(item)} className="flex-1 bg-white py-3 rounded-xl font-black text-[10px] uppercase border hover:bg-gray-100 shadow-sm transition-all text-black">Editar</button>
                  <button onClick={() => { if(confirm(`Excluir ${item.name}?`)) onDeleteProduct(item.id); }} className="p-3 bg-red-50 text-red-500 rounded-xl hover:bg-red-500 hover:text-white transition-all"><TrashIcon size={16}/></button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {(activeTab === 'tables' || activeTab === 'delivery' || activeTab === 'takeaway') && (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-6 animate-fade-in">
          {activeTab === 'tables' && physicalTables.map(t => (
            <button key={t.id} onClick={() => handleOpenTable(t.id)} className={`p-6 rounded-[2.5rem] border-4 transition-all flex flex-col items-center justify-center gap-1 h-48 relative overflow-hidden ${t.status === 'free' ? 'bg-white border-gray-100 hover:border-yellow-400' : 'bg-yellow-400 border-black shadow-xl scale-105'}`}>
              {t.status === 'occupied' && t.currentOrder?.isUpdated && <div className="absolute top-3 right-3 bg-red-600 w-3 h-3 rounded-full animate-pulse ring-4 ring-white"></div>}
              <span className="text-4xl font-black italic mb-1 text-black">{t.id}</span>
              <span className={`text-[8px] font-black uppercase px-2.5 py-1 rounded-full ${t.status === 'free' ? 'bg-gray-100 text-gray-400' : 'bg-black text-white'}`}>{t.status === 'free' ? 'Livre' : 'Ocupada'}</span>
              {t.status === 'occupied' && <span className="text-[11px] font-black mt-1 truncate w-full px-2 text-center text-black">{t.currentOrder?.customerName}</span>}
            </button>
          ))}
          {activeTab === 'delivery' && deliveryTable && (
             <button onClick={() => handleOpenTable(900)} className={`p-6 rounded-[2.5rem] border-4 transition-all flex flex-col items-center justify-center gap-1 h-48 relative overflow-hidden ${deliveryTable.status === 'free' ? 'bg-white border-gray-100 hover:border-yellow-400' : 'bg-yellow-400 border-black shadow-xl scale-105'}`}>
                {deliveryTable.status === 'occupied' && deliveryTable.currentOrder?.isUpdated && <div className="absolute top-3 right-3 bg-red-600 w-3 h-3 rounded-full animate-pulse ring-4 ring-white"></div>}
                <span className="text-4xl font-black italic mb-1 text-black">🚚</span>
                <span className={`text-[8px] font-black uppercase px-2.5 py-1 rounded-full ${deliveryTable.status === 'free' ? 'bg-gray-100 text-gray-400' : 'bg-black text-white'}`}>Entrega</span>
                {deliveryTable.status === 'occupied' && <span className="text-[11px] font-black mt-1 truncate w-full px-2 text-center text-black">{deliveryTable.currentOrder?.customerName}</span>}
             </button>
          )}
          {activeTab === 'takeaway' && counterTable && (
             <button onClick={() => handleOpenTable(901)} className={`p-6 rounded-[2.5rem] border-4 transition-all flex flex-col items-center justify-center gap-1 h-48 relative overflow-hidden ${counterTable.status === 'free' ? 'bg-white border-gray-100 hover:border-yellow-400' : 'bg-yellow-400 border-black shadow-xl scale-105'}`}>
                {counterTable.status === 'occupied' && counterTable.currentOrder?.isUpdated && <div className="absolute top-3 right-3 bg-red-600 w-3 h-3 rounded-full animate-pulse ring-4 ring-white"></div>}
                <span className="text-4xl font-black italic mb-1 text-black">🛍️</span>
                <span className={`text-[8px] font-black uppercase px-2.5 py-1 rounded-full ${counterTable.status === 'free' ? 'bg-gray-100 text-gray-400' : 'bg-black text-white'}`}>Balcão</span>
                {counterTable.status === 'occupied' && <span className="text-[11px] font-black mt-1 truncate w-full px-2 text-center text-black">{counterTable.currentOrder?.customerName}</span>}
             </button>
          )}
        </div>
      )}

      {isProductModalOpen && (
        <div className="fixed inset-0 z-[300] flex items-center justify-center p-6 bg-black/90 backdrop-blur-md animate-fade-in">
          <div className="bg-white w-full max-w-lg rounded-[3.5rem] p-10 relative shadow-2xl">
             <button onClick={() => setIsProductModalOpen(false)} className="absolute top-6 right-6 p-2 bg-gray-100 rounded-full hover:bg-gray-200 transition-colors"><CloseIcon size={20}/></button>
             <h3 className="text-3xl font-black italic mb-8 text-black">{editingProduct?.id ? 'Editar Produto' : 'Novo Produto'}</h3>
             <form onSubmit={handleProductSubmit} className="space-y-4">
                <div>
                   <label className="text-[9px] font-black uppercase tracking-widest text-gray-400 ml-2 mb-1 block">Nome do Item *</label>
                   <input type="text" value={editingProduct?.name || ''} onChange={e => setEditingProduct({...editingProduct!, name: e.target.value})} className="w-full bg-gray-50 border rounded-2xl px-6 py-4 text-sm font-bold outline-none focus:ring-2 focus:ring-yellow-400 text-black" required />
                </div>
                <div className="grid grid-cols-2 gap-4">
                   <div>
                      <label className="text-[9px] font-black uppercase tracking-widest text-gray-400 ml-2 mb-1 block">Preço (R$) *</label>
                      <input type="number" step="0.01" placeholder="Ex: 15,00" value={editingProduct?.price || ''} onChange={e => setEditingProduct({...editingProduct!, price: e.target.value})} className="w-full bg-gray-50 border rounded-2xl px-6 py-4 text-sm font-bold outline-none focus:ring-2 focus:ring-yellow-400 text-black" required />
                   </div>
                   <div>
                      <label className="text-[9px] font-black uppercase tracking-widest text-gray-400 ml-2 mb-1 block">Categoria *</label>
                      <select value={editingProduct?.category} onChange={e => setEditingProduct({...editingProduct!, category: e.target.value})} className="w-full bg-gray-50 border rounded-2xl px-6 py-4 text-sm font-bold outline-none focus:ring-2 focus:ring-yellow-400 text-black">
                         {categories.map(cat => <option key={cat.id} value={cat.name}>{cat.name}</option>)}
                         {!categories.some(c => c.name === editingProduct?.category) && editingProduct?.category && <option value={editingProduct.category}>{editingProduct.category}</option>}
                      </select>
                   </div>
                </div>
                <div>
                   <label className="text-[9px] font-black uppercase tracking-widest text-gray-400 ml-2 mb-1 block">Imagem (URL)</label>
                   <input type="text" value={editingProduct?.image || ''} onChange={e => setEditingProduct({...editingProduct!, image: e.target.value})} className="w-full bg-gray-50 border rounded-2xl px-6 py-4 text-sm font-bold outline-none focus:ring-2 focus:ring-yellow-400 text-black" />
                </div>
                <div className="flex items-center justify-between bg-gray-50 p-4 rounded-2xl border">
                   <span className="font-black text-[10px] uppercase tracking-widest text-gray-500">Disponível</span>
                   <button type="button" onClick={() => setEditingProduct({...editingProduct!, isAvailable: !editingProduct?.isAvailable})} className={`w-14 h-8 rounded-full transition-all flex items-center px-1 ${editingProduct?.isAvailable ? 'bg-green-500 justify-end' : 'bg-gray-300 justify-start'}`}><div className="w-6 h-6 bg-white rounded-full shadow-md"></div></button>
                </div>
                <button type="submit" className="w-full bg-black text-yellow-400 py-5 rounded-2xl font-black text-xs uppercase shadow-xl hover:brightness-110 active:scale-95 transition-all">Salvar</button>
             </form>
          </div>
        </div>
      )}

      {selectedTable && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/90 backdrop-blur-md" onClick={() => setSelectedTableId(null)} />
          <div className="relative bg-white w-full max-w-3xl rounded-[4rem] p-12 shadow-2xl border-[12px] border-yellow-400 animate-in slide-in-from-bottom">
            <button onClick={() => setSelectedTableId(null)} className="absolute top-6 right-6 p-2 bg-gray-100 rounded-full"><CloseIcon size={20} /></button>
            <h3 className="text-4xl font-black italic mb-6 text-black">{selectedTable.id > 800 ? 'Atendimento' : 'Mesa ' + selectedTable.id}</h3>
            <div className="space-y-4 mb-8 max-h-[40vh] overflow-y-auto no-scrollbar pr-2 text-black">
              {selectedTable.currentOrder?.items.map((item, idx) => (
                <div key={idx} className="flex justify-between items-center bg-gray-50 p-4 rounded-2xl border border-gray-100">
                  <span className="font-black text-sm">{item.quantity}x {item.name}</span>
                  <span className="font-black text-sm text-yellow-700">R$ {(item.price * item.quantity).toFixed(2).replace('.', ',')}</span>
                </div>
              )) || <p className="text-gray-400 font-black uppercase text-center py-10 italic">Sem itens lançados</p>}
            </div>
            {selectedTable.currentOrder && (
              <div className="border-t pt-6 text-black">
                <div className="flex justify-between items-end mb-6">
                  <span className="text-gray-400 font-black text-[10px] uppercase">Total da Comanda</span>
                  <span className="text-4xl font-black italic text-black">R$ {selectedTable.currentOrder.total.toFixed(2).replace('.', ',')}</span>
                </div>
                <button onClick={() => { if(confirm('Fechar conta e liberar mesa?')) onUpdateTable(selectedTable.id, 'free'); setSelectedTableId(null); }} className="w-full bg-green-600 text-white py-5 rounded-2xl font-black uppercase shadow-xl hover:bg-green-700 transition-colors">Fechar Conta e Liberar</button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminPanel;
