
import React, { useState, useMemo } from 'react';
import { Table, Order, Product, Category, CartItem, OrderStatus } from '../types';
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

const STATUS_CONFIG: Record<OrderStatus, { label: string, color: string, bg: string }> = {
  'pending': { label: 'Pendente', color: 'text-orange-600', bg: 'bg-orange-100' },
  'preparing': { label: 'Preparando', color: 'text-blue-600', bg: 'bg-blue-100' },
  'ready': { label: 'Pronto', color: 'text-green-600', bg: 'bg-green-100' },
  'delivered': { label: 'Entregue', color: 'text-gray-600', bg: 'bg-gray-100' }
};

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
  
  // Estados para Categorias
  const [newCategoryName, setNewCategoryName] = useState('');
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [isCategoryEditModalOpen, setIsCategoryEditModalOpen] = useState(false);
  
  const [syncError, setSyncError] = useState<string | null>(null);

  const physicalTables = tables.filter(t => t.id <= 12).sort((a,b) => a.id - b.id);
  const deliveryTables = tables.filter(t => t.id >= 900).sort((a,b) => a.id - b.id);
  const selectedTable = useMemo(() => tables.find(t => t.id === selectedTableId) || null, [tables, selectedTableId]);

  const handleUpdateOrderStatus = async (status: OrderStatus) => {
    if (!selectedTable || !selectedTable.currentOrder) return;
    
    const updatedOrder = { ...selectedTable.currentOrder, status };
    setIsSaving(true);
    try {
      const { error } = await supabase
        .from('tables')
        .update({ current_order: updatedOrder })
        .eq('id', selectedTable.id);
      
      if (error) throw error;
      onRefreshData();
    } catch (err: any) {
      alert('Erro ao atualizar status: ' + err.message);
    } finally {
      setIsSaving(false);
    }
  };

  const handlePrint = (order: Order) => {
    const printWindow = window.open('', '_blank', 'width=300,height=600');
    if (!printWindow) return alert('Habilite os pop-ups para imprimir.');

    const itemsHtml = order.items.map(item => `
      <div style="display: flex; justify-content: space-between; margin-bottom: 3px; font-family: 'Courier New', monospace; font-size: 12px;">
        <span>${item.quantity}x ${item.name.substring(0, 16)}</span>
        <span>R$ ${(item.price * item.quantity).toFixed(2)}</span>
      </div>
    `).join('');

    const date = new Date().toLocaleString('pt-BR');

    printWindow.document.write(`
      <html>
        <head>
          <style>
            body { font-family: 'Courier New', monospace; width: 58mm; margin: 0; padding: 5px; color: #000; }
            .center { text-align: center; }
            .line { border-bottom: 1px dashed #000; margin: 8px 0; }
            .bold { font-weight: bold; }
            .total { font-size: 15px; display: flex; justify-content: space-between; margin-top: 5px; }
            .title { font-size: 16px; font-weight: bold; }
          </style>
        </head>
        <body>
          <div class="center title">${STORE_INFO.name.toUpperCase()}</div>
          <div class="line"></div>
          <div class="bold">PEDIDO: #${order.id}</div>
          <div style="font-size: 10px;">DATA: ${date}</div>
          <div class="bold">LOCAL: ${order.tableId >= 900 ? (order.tableId === 900 ? 'ENTREGA' : 'BALCÃO') : 'MESA ' + order.tableId}</div>
          <div class="bold">CLIENTE: ${order.customerName}</div>
          <div class="line"></div>
          ${itemsHtml}
          <div class="line"></div>
          <div class="total bold">
            <span>TOTAL:</span>
            <span>R$ ${order.total.toFixed(2)}</span>
          </div>
          <div class="line"></div>
          <div class="center bold" style="font-size: 9px;">D.MOREIRA - PARADA OBRIGATÓRIA</div>
          <script>window.onload = function() { window.print(); window.close(); }</script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  const handleRestoreDefaults = async () => {
    if (!confirm('Deseja importar as categorias padrão (Lanches, Bebidas, Combos, Diversos) para o banco de dados?')) return;
    
    setIsSaving(true);
    const defaults = ['Lanches', 'Bebidas', 'Combos', 'Diversos'];
    try {
      const { error } = await supabase.from('categories').insert(defaults.map(name => ({ name })));
      if (error) {
        alert('Erro ao restaurar: ' + error.message);
      } else {
        onRefreshData();
      }
    } catch (err: any) {
      alert(err.message);
    } finally {
      setIsSaving(false);
    }
  };

  const handleAddCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    const name = newCategoryName.trim();
    if (!name || isSaving) return;
    
    setIsSaving(true);
    setSyncError(null);
    try {
      const { error } = await supabase.from('categories').insert([{ name }]);
      if (error) {
        if (error.message.includes('schema cache') || error.code === 'PGRST104' || error.message.includes('not found')) {
          setSyncError('ERRO DE CACHE: A tabela "categories" não foi reconhecida pelo Supabase.');
        } else {
          alert('Erro ao salvar categoria: ' + error.message);
        }
      } else {
        setNewCategoryName('');
        onRefreshData();
      }
    } catch (err: any) {
      console.error(err);
    } finally {
      setIsSaving(false);
    }
  };

  const handleUpdateCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingCategory || isSaving) return;
    
    setIsSaving(true);
    try {
      const { error } = await supabase
        .from('categories')
        .update({ name: editingCategory.name })
        .eq('id', editingCategory.id);
        
      if (error) throw error;
      
      setIsCategoryEditModalOpen(false);
      setEditingCategory(null);
      onRefreshData();
    } catch (err: any) {
      alert('Erro ao renomear: ' + err.message);
    } finally {
      setIsSaving(false);
    }
  };

  const filteredMenu = useMemo(() => 
    menuItems.filter(p => 
      p.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
      p.category.toLowerCase().includes(searchTerm.toLowerCase())
    ),
    [menuItems, searchTerm]
  );

  return (
    <div className="w-full">
      {/* Admin Header */}
      <div className="bg-black p-8 rounded-[2.5rem] shadow-2xl mb-10 border-b-4 border-yellow-400">
        <div className="flex flex-col md:flex-row justify-between items-center gap-6">
          <div className="text-center md:text-left">
            <h2 className="text-3xl font-black italic text-yellow-400 leading-none mb-1">D.MOREIRA ADMIN</h2>
            <div className="flex items-center gap-2">
              <span className={`w-2 h-2 rounded-full ${dbStatus === 'ok' ? 'bg-green-500' : 'bg-red-500 animate-pulse'}`}></span>
              <p className="text-gray-500 font-bold text-[8px] uppercase tracking-[0.3em]">
                {dbStatus === 'ok' ? 'Conectado ao Banco' : 'Erro de Sincronização'}
              </p>
            </div>
          </div>
          
          <nav className="flex flex-wrap justify-center gap-1.5 p-1 bg-gray-900 rounded-2xl">
            {(['tables', 'delivery', 'menu', 'categories'] as const).map(tab => (
              <button key={tab} onClick={() => setActiveTab(tab)} className={`px-4 py-2.5 rounded-xl text-[9px] font-black uppercase tracking-wider transition-all ${activeTab === tab ? 'bg-yellow-400 text-black shadow-lg' : 'text-gray-500 hover:text-white'}`}>
                {tab === 'tables' ? 'Mesas' : tab === 'delivery' ? 'Balcão/Delivery' : tab === 'menu' ? 'Cardápio' : 'Categorias'}
              </button>
            ))}
          </nav>
          
          <div className="flex items-center gap-3">
            <button onClick={onToggleAudio} className={`p-2.5 rounded-full ${audioEnabled ? 'bg-yellow-400 text-black' : 'bg-gray-800 text-gray-600'}`}>
              <VolumeIcon muted={!audioEnabled} size={18}/>
            </button>
            <button onClick={onLogout} className="text-red-500 font-black text-[9px] uppercase px-4 py-2 hover:bg-red-500/10 rounded-xl transition-all">Sair</button>
          </div>
        </div>
      </div>

      {/* Content Areas */}
      <div className="transition-all duration-500">
        {(activeTab === 'tables' || activeTab === 'delivery') && (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-5">
            {(activeTab === 'tables' ? physicalTables : deliveryTables).map(t => {
              const statusCfg = t.currentOrder ? STATUS_CONFIG[t.currentOrder.status || 'preparing'] : null;
              return (
                <button 
                  key={t.id} 
                  onClick={() => setSelectedTableId(t.id)}
                  className={`h-48 p-6 rounded-[2.5rem] border-2 transition-all flex flex-col items-center justify-center gap-2 relative ${t.status === 'free' ? 'bg-white border-gray-100 hover:border-yellow-400 shadow-sm' : 'bg-yellow-400 border-black shadow-xl ring-4 ring-yellow-400/20'}`}
                >
                  <span className="text-4xl font-black italic text-black">{t.id >= 900 ? (t.id === 900 ? '🚚' : '🛍️') : t.id}</span>
                  <span className={`text-[8px] font-black uppercase px-2 py-1 rounded-full ${t.status === 'free' ? 'bg-gray-100 text-gray-400' : 'bg-black text-white'}`}>
                    {t.status === 'free' ? 'Livre' : 'Ocupada'}
                  </span>
                  {t.status === 'occupied' && (
                    <div className="flex flex-col items-center gap-1 mt-1">
                      <span className="text-[11px] font-black text-black bg-white/40 px-2 py-0.5 rounded-md">R$ {t.currentOrder?.total.toFixed(2)}</span>
                      {statusCfg && (
                        <span className={`text-[7px] font-black uppercase px-2 py-0.5 rounded-full border border-black/10 ${statusCfg.bg} ${statusCfg.color}`}>
                          {statusCfg.label}
                        </span>
                      )}
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        )}

        {activeTab === 'categories' && (
          <div className="bg-white p-10 rounded-[3rem] shadow-xl max-w-xl mx-auto border border-gray-50">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-2xl font-black italic">Categorias do Menu</h3>
              <button 
                onClick={handleRestoreDefaults}
                className="text-[9px] font-black uppercase text-gray-400 hover:text-black transition-colors"
              >
                Restaurar Padrões
              </button>
            </div>
            
            {syncError && (
              <div className="bg-red-50 border-2 border-red-100 p-6 rounded-3xl mb-8 animate-in fade-in zoom-in duration-300">
                <p className="text-red-600 font-black text-[10px] uppercase mb-2">⚠️ Atenção</p>
                <p className="text-red-500 text-xs font-bold leading-relaxed mb-4">
                  {syncError}
                </p>
                <div className="bg-white p-4 rounded-2xl border border-red-100">
                   <p className="text-[9px] font-black text-gray-400 uppercase mb-2 tracking-widest">Execute no SQL Editor:</p>
                   <code className="block bg-gray-900 text-yellow-400 p-3 rounded-lg text-[10px] font-mono select-all">NOTIFY pgrst, 'reload schema';</code>
                </div>
              </div>
            )}

            <form onSubmit={handleAddCategory} className="flex gap-2 mb-8">
              <input 
                type="text" 
                value={newCategoryName} 
                onChange={e => setNewCategoryName(e.target.value)} 
                placeholder="Nova Categoria..." 
                className="flex-1 bg-gray-50 border rounded-xl px-5 py-3.5 text-sm font-bold outline-none focus:ring-2 focus:ring-yellow-400" 
              />
              <button type="submit" disabled={isSaving} className="bg-black text-yellow-400 px-8 py-3.5 rounded-xl font-black text-xs uppercase shadow-lg active:scale-95 transition-all">
                {isSaving ? '...' : 'Salvar'}
              </button>
            </form>
            <div className="space-y-2">
              {categories.map(cat => (
                <div key={cat.id} className="flex justify-between items-center bg-gray-50 p-4 rounded-2xl border border-transparent hover:border-yellow-400 transition-all">
                  <span className="font-black text-gray-800 uppercase text-xs italic tracking-wide">{cat.name}</span>
                  <div className="flex gap-2">
                    <button 
                      onClick={() => { setEditingCategory(cat); setIsCategoryEditModalOpen(true); }}
                      className="p-2 text-gray-400 hover:text-black transition-colors"
                    >
                      <svg width="18" height="18" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"/></svg>
                    </button>
                    <button onClick={() => { if(confirm('Excluir categoria e todos os produtos nela?')) supabase.from('categories').delete().eq('id', cat.id).then(() => onRefreshData()); }} className="p-2 text-red-400 hover:text-red-600 transition-colors"><TrashIcon/></button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'menu' && (
          <div className="bg-white p-8 rounded-[3rem] shadow-xl border border-gray-50">
            <div className="flex justify-between items-center mb-8">
              <h3 className="text-2xl font-black italic">Produtos</h3>
              <button onClick={() => { setEditingProduct({ name: '', price: '', category: categories[0]?.name || 'Diversos', image: '', isAvailable: true }); setIsProductModalOpen(true); }} className="bg-black text-yellow-400 px-6 py-3 rounded-xl font-black text-xs uppercase shadow-xl">+ Adicionar</button>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {menuItems.map(item => (
                <div key={item.id} className={`bg-gray-50 p-4 rounded-3xl border transition-all hover:shadow-lg relative ${!item.isAvailable ? 'grayscale opacity-60' : ''}`}>
                  {!item.isAvailable && (
                    <div className="absolute top-6 left-6 z-10 bg-red-600 text-white text-[8px] font-black uppercase px-2 py-1 rounded-md shadow-lg">Esgotado</div>
                  )}
                  <img src={item.image} className="w-full aspect-square object-cover rounded-2xl mb-4" />
                  <h4 className="font-black text-sm text-black mb-1 truncate">{item.name}</h4>
                  <div className="flex justify-between items-center mb-4">
                    <span className="text-yellow-700 font-black text-sm italic">R$ {item.price.toFixed(2)}</span>
                    <span className="text-[8px] font-black uppercase text-gray-400">{item.category}</span>
                  </div>
                  <div className="flex gap-2">
                    <button onClick={() => { setEditingProduct({...item, price: item.price.toString()}); setIsProductModalOpen(true); }} className="flex-1 bg-white py-2 rounded-xl font-black text-[9px] uppercase border text-black hover:bg-black hover:text-white transition-all">Editar</button>
                    <button onClick={() => onDeleteProduct(item.id)} className="p-2 text-red-500 bg-red-50 rounded-xl hover:bg-red-500 hover:text-white transition-all"><TrashIcon/></button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Modal de Pedido/Mesa */}
      {selectedTable && (
        <div className="fixed inset-0 z-[150] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/90 backdrop-blur-sm" onClick={() => setSelectedTableId(null)} />
          <div className="relative bg-white w-full max-w-5xl h-[85vh] rounded-[3rem] flex flex-col md:flex-row overflow-hidden shadow-2xl border-t-4 border-yellow-400 animate-in fade-in zoom-in duration-300">
            
            {/* Pedido Info */}
            <div className="flex-1 p-10 overflow-y-auto border-r border-gray-100 flex flex-col">
               <div className="flex justify-between items-start mb-8">
                 <div>
                   <h3 className="text-4xl font-black italic tracking-tighter">Local {selectedTable.id >= 900 ? (selectedTable.id === 900 ? 'Entrega' : 'Balcão') : selectedTable.id}</h3>
                   <div className="flex items-center gap-2 mt-1">
                     <span className="text-[9px] font-black uppercase text-gray-400">Cliente: {selectedTable.currentOrder?.customerName || 'N/A'}</span>
                     <span className="text-gray-300">|</span>
                     <span className="text-[9px] font-black uppercase text-gray-400">Status: {selectedTable.status === 'free' ? 'Livre' : 'Ocupada'}</span>
                   </div>
                 </div>
                 <div className="flex gap-2">
                   {selectedTable.status === 'occupied' && selectedTable.currentOrder && (
                     <button onClick={() => handlePrint(selectedTable.currentOrder!)} className="p-4 bg-black text-yellow-400 rounded-full hover:scale-110 transition-all shadow-xl">
                       <PrinterIcon size={24} />
                     </button>
                   )}
                   <button onClick={() => setSelectedTableId(null)} className="p-4 bg-gray-100 rounded-full hover:bg-gray-200 transition-colors"><CloseIcon size={24} /></button>
                 </div>
               </div>

               {/* Status Control Bar */}
               {selectedTable.status === 'occupied' && selectedTable.currentOrder && (
                 <div className="bg-gray-50 p-2 rounded-2xl mb-8 flex gap-1">
                   {(['preparing', 'ready', 'delivered'] as OrderStatus[]).map(s => {
                     const isActive = selectedTable.currentOrder?.status === s;
                     const cfg = STATUS_CONFIG[s];
                     return (
                       <button 
                        key={s} 
                        disabled={isSaving}
                        onClick={() => handleUpdateOrderStatus(s)}
                        className={`flex-1 py-3 rounded-xl text-[9px] font-black uppercase tracking-wider transition-all ${isActive ? 'bg-black text-yellow-400 shadow-lg' : 'text-gray-400 hover:bg-gray-200'}`}
                       >
                         {cfg.label}
                       </button>
                     );
                   })}
                 </div>
               )}

               <div className="flex-1 space-y-3 mb-8">
                 {selectedTable.currentOrder?.items.map((item, idx) => (
                   <div key={idx} className="flex justify-between items-center bg-gray-50 p-4 rounded-2xl border border-gray-100">
                     <span className="font-black text-xs text-gray-800 uppercase">{item.quantity}x {item.name}</span>
                     <span className="font-black text-xs text-yellow-700 italic">R$ {(item.price * item.quantity).toFixed(2)}</span>
                   </div>
                 )) || <div className="text-center py-20 text-gray-300 font-black uppercase text-[10px] tracking-widest">Sem itens lançados</div>}
               </div>

               {selectedTable.status === 'occupied' && (
                 <div className="border-t pt-8">
                    <div className="flex justify-between items-end mb-8">
                      <span className="text-gray-400 font-black text-[10px] uppercase">Subtotal</span>
                      <span className="text-5xl font-black italic text-black">R$ {selectedTable.currentOrder?.total.toFixed(2)}</span>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <button onClick={() => setSelectedTableId(null)} className="bg-gray-100 text-black py-5 rounded-2xl font-black uppercase text-[10px]">Continuar</button>
                      <button onClick={() => { if(confirm('Fechar conta e liberar mesa?')) onUpdateTable(selectedTable.id, 'free'); setSelectedTableId(null); }} className="bg-green-600 text-white py-5 rounded-2xl font-black uppercase text-[10px] shadow-lg">Finalizar e Limpar</button>
                    </div>
                 </div>
               )}
            </div>

            {/* Lançamento Rápido */}
            <div className="w-full md:w-[22rem] bg-gray-50 p-8 flex flex-col">
               <h4 className="text-[10px] font-black uppercase mb-6 bg-yellow-400 px-4 py-2 rounded-full w-fit">Lançar Itens</h4>
               <div className="relative mb-6">
                 <input 
                  type="text" 
                  placeholder="Buscar..." 
                  value={searchTerm} 
                  onChange={e => setSearchTerm(e.target.value)} 
                  className="w-full bg-white border rounded-xl px-5 py-3 text-xs font-bold outline-none shadow-sm focus:ring-2 focus:ring-black" 
                 />
               </div>
               <div className="flex-1 overflow-y-auto space-y-2 no-scrollbar pb-6">
                  {filteredMenu.filter(p => p.isAvailable).map(p => (
                    <button key={p.id} onClick={() => onAddToOrder(selectedTable.id, p)} className="w-full bg-white p-4 rounded-xl border border-transparent hover:border-black flex justify-between items-center transition-all active:scale-95 shadow-sm">
                      <div className="text-left">
                        <p className="font-black text-[10px] uppercase truncate w-32">{p.name}</p>
                        <p className="text-yellow-700 font-black text-[9px] italic">R$ {p.price.toFixed(2)}</p>
                      </div>
                      <span className="bg-yellow-400 text-black font-black text-[8px] px-2.5 py-1.5 rounded-lg">+ ADD</span>
                    </button>
                  ))}
               </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Produto */}
      {isProductModalOpen && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-6 bg-black/95 backdrop-blur-md">
          <div className="bg-white w-full max-w-lg rounded-[3rem] p-10 relative shadow-2xl animate-in zoom-in duration-300">
             <button onClick={() => setIsProductModalOpen(false)} className="absolute top-8 right-8 p-2 bg-gray-100 rounded-full hover:bg-gray-200 transition-colors"><CloseIcon size={20}/></button>
             <h3 className="text-3xl font-black italic mb-8">Salvar Produto</h3>
             <form onSubmit={(e) => {
               e.preventDefault();
               onSaveProduct({ ...editingProduct, price: parseFloat(editingProduct.price) });
               setIsProductModalOpen(false);
             }} className="space-y-4">
                <input type="text" value={editingProduct?.name || ''} onChange={e => setEditingProduct({...editingProduct!, name: e.target.value})} placeholder="Nome do Produto" className="w-full bg-gray-50 border rounded-xl px-5 py-4 text-sm font-bold outline-none focus:ring-2 focus:ring-yellow-400" required />
                <div className="grid grid-cols-2 gap-3">
                  <input type="number" step="0.01" value={editingProduct?.price || ''} onChange={e => setEditingProduct({...editingProduct!, price: e.target.value})} placeholder="Preço" className="w-full bg-gray-50 border rounded-xl px-5 py-4 text-sm font-bold outline-none focus:ring-2 focus:ring-yellow-400" required />
                  <select value={editingProduct?.category} onChange={e => setEditingProduct({...editingProduct!, category: e.target.value})} className="w-full bg-gray-50 border rounded-xl px-5 py-4 text-sm font-bold outline-none">
                    {categories.map(cat => <option key={cat.id} value={cat.name}>{cat.name}</option>)}
                    {categories.length === 0 && <option value="Diversos">Diversos</option>}
                  </select>
                </div>
                <input type="text" value={editingProduct?.image || ''} onChange={e => setEditingProduct({...editingProduct!, image: e.target.value})} placeholder="Link da Imagem" className="w-full bg-gray-50 border rounded-xl px-5 py-4 text-sm font-bold outline-none" />
                
                {/* Toggle Estoque */}
                <div className="flex items-center justify-between bg-gray-50 p-4 rounded-2xl border">
                   <span className="text-[10px] font-black uppercase text-gray-500">Disponível em Estoque?</span>
                   <button 
                    type="button"
                    onClick={() => setEditingProduct({...editingProduct!, isAvailable: !editingProduct.isAvailable})}
                    className={`w-14 h-8 rounded-full transition-all relative ${editingProduct?.isAvailable ? 'bg-green-500' : 'bg-gray-300'}`}
                   >
                     <div className={`absolute top-1 w-6 h-6 bg-white rounded-full shadow-md transition-all ${editingProduct?.isAvailable ? 'left-7' : 'left-1'}`} />
                   </button>
                </div>

                <button type="submit" className="w-full bg-black text-yellow-400 py-5 rounded-2xl font-black text-xs uppercase shadow-xl mt-4 active:scale-95 transition-all">Confirmar e Salvar</button>
             </form>
          </div>
        </div>
      )}

      {/* Modal de Renomear Categoria */}
      {isCategoryEditModalOpen && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-6 bg-black/95 backdrop-blur-md">
          <div className="bg-white w-full max-w-sm rounded-[3rem] p-10 relative shadow-2xl animate-in zoom-in duration-300">
             <button onClick={() => setIsCategoryEditModalOpen(false)} className="absolute top-8 right-8 p-2 bg-gray-100 rounded-full hover:bg-gray-200 transition-colors"><CloseIcon size={20}/></button>
             <h3 className="text-2xl font-black italic mb-8">Editar Categoria</h3>
             <form onSubmit={handleUpdateCategory} className="space-y-4">
                <input 
                  type="text" 
                  value={editingCategory?.name || ''} 
                  onChange={e => setEditingCategory(prev => prev ? {...prev, name: e.target.value} : null)} 
                  placeholder="Nome da Categoria" 
                  className="w-full bg-gray-50 border rounded-xl px-5 py-4 text-sm font-bold outline-none focus:ring-2 focus:ring-yellow-400" 
                  required 
                />
                <button type="submit" disabled={isSaving} className="w-full bg-black text-yellow-400 py-5 rounded-2xl font-black text-xs uppercase shadow-xl mt-4 active:scale-95 transition-all">
                  {isSaving ? 'Salvando...' : 'Atualizar Nome'}
                </button>
             </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminPanel;
