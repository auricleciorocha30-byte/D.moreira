
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
  onLogout: () => void;
  onSaveProduct: (product: Partial<Product>) => void;
  onDeleteProduct: (id: string) => void;
  dbStatus: 'loading' | 'ok' | 'error_tables_missing';
}

const AdminPanel: React.FC<AdminPanelProps> = ({ 
  tables, menuItems, categories, audioEnabled, onToggleAudio, 
  onUpdateTable, onRefreshData, onLogout, onSaveProduct, onDeleteProduct, dbStatus 
}) => {
  const [activeTab, setActiveTab] = useState<'tables' | 'delivery' | 'menu' | 'categories'>('tables');
  const [selectedTableId, setSelectedTableId] = useState<number | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  
  const [editingProduct, setEditingProduct] = useState<any | null>(null);
  const [isProductModalOpen, setIsProductModalOpen] = useState(false);
  
  const [newCategoryName, setNewCategoryName] = useState('');
  const [renamingCategoryId, setRenamingCategoryId] = useState<string | null>(null);
  const [renamingName, setRenamingName] = useState('');

  const physicalTables = tables.filter(t => t.id <= 12).sort((a,b) => a.id - b.id);
  const deliveryTables = tables.filter(t => t.id >= 900).sort((a,b) => a.id - b.id);

  const selectedTable = useMemo(() => tables.find(t => t.id === selectedTableId) || null, [tables, selectedTableId]);

  // Gestão de Categorias com Tratamento de Erro de Cache
  const handleAddCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    const name = newCategoryName.trim();
    if (!name || isSaving) return;
    
    setIsSaving(true);
    try {
      // Forçamos a inserção na tabela pública
      const { error } = await supabase
        .from('categories')
        .insert([{ name: name }]);

      if (error) {
        console.error("Erro Supabase:", error);
        // Se o erro for 42P01 (Tabela não existe) ou erro de cache
        if (error.code === '42P01' || error.message.includes('schema cache')) {
          alert('⚠️ ERRO DE SINCRONIZAÇÃO:\nA tabela foi criada mas o sistema ainda não a detectou.\n\nPOR FAVOR: Aperte F5 ou recarregue esta página agora.');
        } else {
          alert('Erro ao salvar categoria: ' + error.message);
        }
      } else {
        setNewCategoryName('');
        onRefreshData();
      }
    } catch (err) {
      alert('Falha crítica de conexão. Recarregue a página.');
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
            <h2 className="text-3xl font-black italic tracking-tighter text-black">Painel D.Moreira</h2>
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

      {/* Alerta de Tabelas Faltando */}
      {dbStatus === 'error_tables_missing' && (
        <div className="bg-red-600 text-white p-6 rounded-[2.5rem] mb-10 text-center font-black uppercase text-xs tracking-widest italic animate-pulse">
          ⚠️ Tabelas não encontradas no Supabase! Execute o SQL Master e RECARREGUE A PÁGINA (F5).
        </div>
      )}

      {/* Categorias */}
      {activeTab === 'categories' && (
        <div className="bg-white p-8 rounded-[3.5rem] shadow-sm border border-gray-100 max-w-2xl mx-auto animate-fade-in">
          <div className="flex justify-between items-center mb-8">
            <h3 className="text-3xl font-black italic text-black">Categorias</h3>
            <button onClick={() => window.location.reload()} className="bg-gray-100 p-3 rounded-full hover:bg-yellow-400 transition-colors" title="Recarregar Dados">
              <svg width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
            </button>
          </div>
          
          <form onSubmit={handleAddCategory} className="flex gap-3 mb-10">
            <input 
              type="text" 
              value={newCategoryName} 
              onChange={e => setNewCategoryName(e.target.value)} 
              placeholder="Ex: Bebidas, Lanches..." 
              className="flex-1 bg-gray-50 border rounded-2xl px-6 py-4 text-sm font-bold outline-none focus:border-yellow-400 text-black" 
            />
            <button 
              type="submit" 
              disabled={isSaving} 
              className="bg-black text-yellow-400 px-8 py-4 rounded-2xl font-black text-xs uppercase shadow-xl hover:scale-105 active:scale-95 transition-all"
            >
              {isSaving ? '...' : 'Adicionar'}
            </button>
          </form>

          <div className="space-y-3">
            {categories.map(cat => (
              <div key={cat.id} className="flex justify-between items-center bg-gray-50 p-5 rounded-2xl border hover:border-yellow-400 transition-all">
                {renamingCategoryId === cat.id ? (
                  <div className="flex-1 flex gap-2">
                    <input autoFocus type="text" value={renamingName} onChange={e => setRenamingName(e.target.value)} className="flex-1 border rounded-xl px-4 py-2 text-sm font-bold text-black" />
                    <button onClick={() => handleRenameCategory(cat.id)} className="bg-green-500 text-white px-4 py-2 rounded-xl text-[10px] font-black uppercase">OK</button>
                    <button onClick={() => setRenamingCategoryId(null)} className="text-gray-400 text-[10px] font-black">X</button>
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
            {categories.length === 0 && <p className="text-center py-10 text-gray-400 font-black italic">Nenhuma categoria cadastrada ainda.</p>}
          </div>
        </div>
      )}

      {/* Cardápio */}
      {activeTab === 'menu' && (
        <div className="bg-white p-8 rounded-[3.5rem] shadow-sm border border-gray-100 animate-fade-in">
          <div className="flex justify-between items-center mb-10">
            <h3 className="text-3xl font-black italic text-black">Produtos</h3>
            <button onClick={openAddProduct} className="bg-black text-yellow-400 px-8 py-4 rounded-2xl font-black text-xs uppercase shadow-xl hover:brightness-110">+ Novo Produto</button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {menuItems.map(item => (
              <div key={item.id} className={`bg-gray-50 p-5 rounded-[2.5rem] border ${!item.isAvailable ? 'opacity-50 grayscale' : 'hover:border-yellow-400'} transition-all`}>
                <img src={item.image} className="w-full aspect-square object-cover rounded-2xl mb-4" />
                <h4 className="font-black text-sm truncate mb-1 text-black">{item.name}</h4>
                <p className="text-yellow-700 font-black text-xs mb-4">R$ {item.price.toFixed(2).replace('.', ',')}</p>
                <div className="flex gap-2">
                  <button onClick={() => { setEditingProduct({...item, price: item.price.toString()}); setIsProductModalOpen(true); }} className="flex-1 bg-white py-3 rounded-xl font-black text-[10px] uppercase border hover:bg-gray-100 text-black">Editar</button>
                  <button onClick={() => { if(confirm(`Excluir ${item.name}?`)) onDeleteProduct(item.id); }} className="p-3 bg-red-50 text-red-500 rounded-xl hover:bg-red-500 hover:text-white"><TrashIcon size={16}/></button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Mesas e Entregas */}
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

      {/* Modal de Pedido */}
      {selectedTable && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/90 backdrop-blur-md" onClick={() => setSelectedTableId(null)} />
          <div className="relative bg-white w-full max-w-2xl rounded-[4rem] p-10 shadow-2xl border-[10px] border-yellow-400 animate-in slide-in-from-bottom">
            <button onClick={() => setSelectedTableId(null)} className="absolute top-6 right-6 p-2 bg-gray-100 rounded-full"><CloseIcon size={20} /></button>
            <h3 className="text-4xl font-black italic mb-6 text-black">{selectedTable.id >= 900 ? (selectedTable.id === 900 ? 'Atendimento Entrega' : 'Atendimento Balcão') : 'Mesa ' + selectedTable.id}</h3>
            
            <div className="space-y-4 mb-8 max-h-[40vh] overflow-y-auto no-scrollbar pr-2">
              {selectedTable.currentOrder?.items.map((item, idx) => (
                <div key={idx} className="flex justify-between items-center bg-gray-50 p-4 rounded-2xl border border-gray-100">
                  <div className="flex flex-col">
                    <span className="font-black text-sm text-black">{item.quantity}x {item.name}</span>
                    <span className="text-[10px] font-bold text-gray-400 uppercase">{item.category}</span>
                  </div>
                  <span className="font-black text-sm text-yellow-700">R$ {(item.price * item.quantity).toFixed(2).replace('.', ',')}</span>
                </div>
              )) || <p className="text-gray-400 font-black uppercase text-center py-10 italic">Nenhum item lançado ainda.</p>}
            </div>

            {selectedTable.currentOrder && (
              <div className="border-t pt-6">
                <div className="flex justify-between items-end mb-6 text-black">
                  <div className="flex flex-col">
                    <span className="text-gray-400 font-black text-[9px] uppercase">Cliente: {selectedTable.currentOrder.customerName}</span>
                    <span className="text-gray-400 font-black text-[9px] uppercase">Pagamento: {selectedTable.currentOrder.paymentMethod}</span>
                  </div>
                  <span className="text-4xl font-black italic">R$ {selectedTable.currentOrder.total.toFixed(2).replace('.', ',')}</span>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <button onClick={() => setSelectedTableId(null)} className="bg-gray-100 text-black py-5 rounded-2xl font-black uppercase text-xs">Apenas Fechar</button>
                  <button onClick={() => { if(confirm('Encerrar comanda e liberar?')) onUpdateTable(selectedTable.id, 'free'); setSelectedTableId(null); }} className="bg-green-600 text-white py-5 rounded-2xl font-black uppercase text-xs shadow-lg">Finalizar e Liberar</button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Modal de Produto */}
      {isProductModalOpen && (
        <div className="fixed inset-0 z-[300] flex items-center justify-center p-6 bg-black/90 backdrop-blur-md">
          <div className="bg-white w-full max-w-lg rounded-[3.5rem] p-10 relative shadow-2xl">
             <button onClick={() => setIsProductModalOpen(false)} className="absolute top-6 right-6 p-2 bg-gray-100 rounded-full hover:bg-200 transition-colors"><CloseIcon size={20}/></button>
             <h3 className="text-3xl font-black italic mb-8 text-black">{editingProduct?.id ? 'Editar Item' : 'Novo Item'}</h3>
             <form onSubmit={handleProductSubmit} className="space-y-4">
                <input type="text" value={editingProduct?.name || ''} onChange={e => setEditingProduct({...editingProduct!, name: e.target.value})} placeholder="Nome do Produto" className="w-full bg-gray-50 border rounded-2xl px-6 py-4 text-sm font-bold outline-none text-black" required />
                <div className="grid grid-cols-2 gap-4">
                   <input type="number" step="0.01" value={editingProduct?.price || ''} onChange={e => setEditingProduct({...editingProduct!, price: e.target.value})} placeholder="Preço (R$)" className="w-full bg-gray-50 border rounded-2xl px-6 py-4 text-sm font-bold outline-none text-black" required />
                   <select value={editingProduct?.category} onChange={e => setEditingProduct({...editingProduct!, category: e.target.value})} className="w-full bg-gray-50 border rounded-2xl px-6 py-4 text-sm font-bold outline-none text-black">
                      {categories.map(cat => <option key={cat.id} value={cat.name}>{cat.name}</option>)}
                      {categories.length === 0 && <option value="Geral">Crie uma categoria primeiro</option>}
                   </select>
                </div>
                <input type="text" value={editingProduct?.image || ''} onChange={e => setEditingProduct({...editingProduct!, image: e.target.value})} placeholder="URL da Imagem" className="w-full bg-gray-50 border rounded-2xl px-6 py-4 text-sm font-bold outline-none text-black" />
                <button type="submit" className="w-full bg-black text-yellow-400 py-5 rounded-2xl font-black text-xs uppercase shadow-xl hover:scale-105 active:scale-95 transition-all">Salvar Produto</button>
             </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminPanel;
