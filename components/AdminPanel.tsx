
import React, { useState, useMemo } from 'react';
import { Table, Order, Product, Category, CartItem } from '../types';
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

  // FUNÇÃO DE IMPRESSÃO PROFISSIONAL
  const handlePrint = (order: Order) => {
    const printWindow = window.open('', '_blank', 'width=300,height=600');
    if (!printWindow) return alert('Bloqueador de pop-up impediu a impressão.');

    const itemsHtml = order.items.map(item => `
      <div style="display: flex; justify-content: space-between; margin-bottom: 2px;">
        <span>${item.quantity}x ${item.name.substring(0, 18)}</span>
        <span>${(item.price * item.quantity).toFixed(2)}</span>
      </div>
    `).join('');

    const date = new Date().toLocaleString('pt-BR');

    printWindow.document.write(`
      <html>
        <head>
          <style>
            body { font-family: 'Courier New', monospace; width: 58mm; font-size: 12px; margin: 0; padding: 5px; }
            .center { text-align: center; }
            .line { border-bottom: 1px dashed #000; margin: 5px 0; }
            .bold { font-weight: bold; }
            .total { font-size: 14px; display: flex; justify-content: space-between; margin-top: 5px; }
          </style>
        </head>
        <body>
          <div class="center bold">${STORE_INFO.name}</div>
          <div class="center">${STORE_INFO.slogan}</div>
          <div class="line"></div>
          <div>DATA: ${date}</div>
          <div class="bold">LOCAL: ${order.tableId >= 900 ? (order.tableId === 900 ? 'ENTREGA' : 'BALCÃO') : 'MESA ' + order.tableId}</div>
          <div class="line"></div>
          <div class="bold">ITENS:</div>
          ${itemsHtml}
          <div class="line"></div>
          <div class="total bold">
            <span>TOTAL:</span>
            <span>R$ ${order.total.toFixed(2)}</span>
          </div>
          <div class="line"></div>
          <div class="center">Obrigado! Parada Obrigatória.</div>
          <script>window.onload = function() { window.print(); window.close(); }</script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  const handleAddCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCategoryName.trim() || isSaving) return;
    setIsSaving(true);
    try {
      const { error } = await supabase.from('categories').insert([{ name: newCategoryName.trim() }]);
      if (error) throw error;
      setNewCategoryName('');
      onRefreshData();
    } catch (err: any) {
      alert('Erro ao sincronizar: ' + (err.message || 'Verifique o SQL no Supabase'));
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
      {/* Header Admin */}
      <div className="bg-black p-8 rounded-[3rem] shadow-2xl mb-12 border-b-8 border-yellow-400">
        <div className="flex flex-col md:flex-row justify-between items-center gap-6">
          <div className="flex items-center gap-4">
            <h2 className="text-4xl font-black italic text-yellow-400">D.MOREIRA</h2>
            <button onClick={onToggleAudio} className={`p-3 rounded-full transition-all ${audioEnabled ? 'bg-yellow-400 text-black' : 'bg-gray-800 text-gray-500'}`}>
              <VolumeIcon muted={!audioEnabled} />
            </button>
          </div>
          <nav className="flex gap-2 p-1 bg-gray-900 rounded-2xl">
            {(['tables', 'delivery', 'menu', 'categories'] as const).map(tab => (
              <button key={tab} onClick={() => setActiveTab(tab)} className={`px-5 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === tab ? 'bg-yellow-400 text-black' : 'text-gray-500 hover:text-white'}`}>
                {tab === 'tables' ? 'Mesas' : tab === 'delivery' ? 'Pedidos' : tab === 'menu' ? 'Cardápio' : 'Categorias'}
              </button>
            ))}
          </nav>
          <button onClick={onLogout} className="text-red-500 font-black text-[10px] uppercase p-3 hover:bg-red-500/10 rounded-xl">Sair</button>
        </div>
      </div>

      {/* Grid de Mesas / Entregas */}
      {(activeTab === 'tables' || activeTab === 'delivery') && (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-6">
          {(activeTab === 'tables' ? physicalTables : deliveryTables).map(t => (
            <button 
              key={t.id} 
              onClick={() => setSelectedTableId(t.id)}
              className={`h-48 p-6 rounded-[2.5rem] border-4 transition-all flex flex-col items-center justify-center gap-2 relative ${t.status === 'free' ? 'bg-white border-gray-100 hover:border-yellow-400 shadow-sm' : 'bg-yellow-400 border-black shadow-xl'}`}
            >
              <span className="text-4xl font-black italic text-black">{t.id >= 900 ? (t.id === 900 ? '🚚' : '🛍️') : t.id}</span>
              <span className={`text-[8px] font-black uppercase px-2 py-1 rounded-full ${t.status === 'free' ? 'bg-gray-100 text-gray-400' : 'bg-black text-white'}`}>
                {t.status === 'free' ? 'Disponível' : 'Ocupada'}
              </span>
              {t.status === 'occupied' && (
                <span className="text-[11px] font-black text-black">R$ {t.currentOrder?.total.toFixed(2)}</span>
              )}
            </button>
          ))}
        </div>
      )}

      {/* Categorias */}
      {activeTab === 'categories' && (
        <div className="bg-white p-10 rounded-[3rem] shadow-xl max-w-xl mx-auto border border-gray-100">
          <h3 className="text-2xl font-black mb-8 italic">Gestão de Categorias</h3>
          <form onSubmit={handleAddCategory} className="flex gap-2 mb-8">
            <input type="text" value={newCategoryName} onChange={e => setNewCategoryName(e.target.value)} placeholder="Ex: Bebidas" className="flex-1 bg-gray-50 border-2 rounded-xl px-4 py-3 text-sm font-bold outline-none focus:border-yellow-400" />
            <button type="submit" disabled={isSaving} className="bg-black text-yellow-400 px-6 py-3 rounded-xl font-black text-xs uppercase shadow-lg">
              {isSaving ? '...' : 'Adicionar'}
            </button>
          </form>
          <div className="space-y-2">
            {categories.map(cat => (
              <div key={cat.id} className="flex justify-between items-center bg-gray-50 p-4 rounded-xl border-2 border-transparent hover:border-yellow-400 transition-all">
                <span className="font-black text-gray-800 uppercase text-xs italic">{cat.name}</span>
                <button onClick={() => supabase.from('categories').delete().eq('id', cat.id).then(() => onRefreshData())} className="text-red-400 hover:text-red-600 p-2"><TrashIcon/></button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Menu / Produtos */}
      {activeTab === 'menu' && (
        <div className="bg-white p-10 rounded-[3rem] shadow-xl border border-gray-100">
          <div className="flex justify-between items-center mb-10">
            <h3 className="text-2xl font-black italic">Produtos</h3>
            <button onClick={() => { setEditingProduct({ name: '', price: '', category: categories[0]?.name || 'Diversos', image: '', isAvailable: true }); setIsProductModalOpen(true); }} className="bg-black text-yellow-400 px-8 py-4 rounded-2xl font-black text-xs uppercase">+ Novo</button>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {menuItems.map(item => (
              <div key={item.id} className="bg-gray-50 p-5 rounded-3xl border-2 hover:border-yellow-400 transition-all">
                <img src={item.image} className="w-full aspect-square object-cover rounded-2xl mb-4" />
                <h4 className="font-black text-sm truncate mb-1">{item.name}</h4>
                <div className="flex justify-between items-center mb-4">
                  <span className="text-yellow-700 font-black text-sm italic">R$ {item.price.toFixed(2)}</span>
                  <span className="text-[8px] font-black uppercase text-gray-400">{item.category}</span>
                </div>
                <div className="flex gap-2">
                  <button onClick={() => { setEditingProduct({...item, price: item.price.toString()}); setIsProductModalOpen(true); }} className="flex-1 bg-white py-2 rounded-xl font-black text-[9px] uppercase border text-black hover:bg-black hover:text-white transition-all">Editar</button>
                  <button onClick={() => onDeleteProduct(item.id)} className="p-2 text-red-500 bg-red-50 rounded-xl"><TrashIcon/></button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Modal da Mesa com Impressão e Lançamento */}
      {selectedTable && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/90 backdrop-blur-md" onClick={() => setSelectedTableId(null)} />
          <div className="relative bg-white w-full max-w-5xl h-[80vh] rounded-[3rem] flex flex-col md:flex-row overflow-hidden shadow-2xl border-t-8 border-yellow-400">
            
            {/* Lado Esquerdo: Itens Lançados */}
            <div className="flex-1 p-8 overflow-y-auto border-r border-gray-100">
               <div className="flex justify-between items-start mb-8">
                 <div>
                   <h3 className="text-4xl font-black italic leading-none">Local {selectedTable.id >= 900 ? (selectedTable.id === 900 ? 'Entrega' : 'Balcão') : selectedTable.id}</h3>
                   <span className="text-[10px] font-black uppercase tracking-widest text-gray-400 mt-2 block">Status: {selectedTable.status === 'free' ? 'Livre' : 'Ocupada'}</span>
                 </div>
                 <div className="flex gap-2">
                   {selectedTable.status === 'occupied' && selectedTable.currentOrder && (
                     <button onClick={() => handlePrint(selectedTable.currentOrder!)} className="bg-black text-yellow-400 p-4 rounded-full shadow-lg hover:scale-110 transition-all">
                       <PrinterIcon size={24} />
                     </button>
                   )}
                   <button onClick={() => setSelectedTableId(null)} className="p-4 bg-gray-100 rounded-full"><CloseIcon size={24} /></button>
                 </div>
               </div>

               <div className="space-y-3 mb-10">
                 {selectedTable.currentOrder?.items.map((item, idx) => (
                   <div key={idx} className="flex justify-between bg-gray-50 p-4 rounded-2xl border border-gray-100">
                     <span className="font-black text-xs uppercase">{item.quantity}x {item.name}</span>
                     <span className="font-black text-xs text-yellow-700">R$ {(item.price * item.quantity).toFixed(2)}</span>
                   </div>
                 )) || <div className="text-center py-20 text-gray-300 font-black uppercase text-xs">Mesa Vazia</div>}
               </div>

               {selectedTable.status === 'occupied' && (
                 <div className="border-t-2 pt-6">
                   <div className="flex justify-between items-end mb-6">
                     <span className="text-[10px] font-black uppercase text-gray-400">Total</span>
                     <span className="text-5xl font-black italic">R$ {selectedTable.currentOrder?.total.toFixed(2)}</span>
                   </div>
                   <div className="grid grid-cols-2 gap-4">
                     <button onClick={() => setSelectedTableId(null)} className="bg-gray-100 text-black py-5 rounded-2xl font-black uppercase text-[10px]">Fechar Janela</button>
                     <button onClick={() => { if(confirm('Fechar conta?')) onUpdateTable(selectedTable.id, 'free'); setSelectedTableId(null); }} className="bg-green-600 text-white py-5 rounded-2xl font-black uppercase text-[10px] shadow-lg">Finalizar</button>
                   </div>
                 </div>
               )}
            </div>

            {/* Lado Direito: Lançar Rápido */}
            <div className="w-full md:w-[22rem] bg-gray-50 p-8 flex flex-col">
               <h4 className="text-[10px] font-black uppercase tracking-widest mb-6 bg-yellow-400 px-4 py-2 rounded-full w-fit">Lançar Itens</h4>
               <input 
                type="text" 
                placeholder="Buscar..." 
                value={searchTerm} 
                onChange={e => setSearchTerm(e.target.value)} 
                className="w-full bg-white border-2 rounded-xl px-5 py-4 text-xs font-bold outline-none mb-6 shadow-sm" 
               />
               <div className="flex-1 overflow-y-auto space-y-2 no-scrollbar">
                  {filteredMenu.map(p => (
                    <button key={p.id} onClick={() => onAddToOrder(selectedTable.id, p)} className="w-full bg-white p-4 rounded-xl border hover:border-black flex justify-between items-center transition-all active:scale-95">
                      <div className="text-left">
                        <p className="font-black text-[10px] uppercase truncate w-32">{p.name}</p>
                        <p className="text-yellow-700 font-black text-[10px] italic">R$ {p.price.toFixed(2)}</p>
                      </div>
                      <span className="bg-yellow-400 text-black font-black text-[9px] px-3 py-1.5 rounded-lg">+ ADD</span>
                    </button>
                  ))}
               </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Produto */}
      {isProductModalOpen && (
        <div className="fixed inset-0 z-[300] flex items-center justify-center p-6 bg-black/95 backdrop-blur-md">
          <div className="bg-white w-full max-w-md rounded-[3rem] p-10 relative shadow-2xl">
             <button onClick={() => setIsProductModalOpen(false)} className="absolute top-6 right-6 p-2 bg-gray-100 rounded-full"><CloseIcon size={20}/></button>
             <h3 className="text-3xl font-black italic mb-8">Salvar Produto</h3>
             <form onSubmit={(e) => {
               e.preventDefault();
               onSaveProduct({ ...editingProduct, price: parseFloat(editingProduct.price) });
               setIsProductModalOpen(false);
             }} className="space-y-4">
                <input type="text" value={editingProduct?.name || ''} onChange={e => setEditingProduct({...editingProduct!, name: e.target.value})} placeholder="Nome" className="w-full bg-gray-50 border rounded-xl px-5 py-4 text-sm font-bold outline-none focus:border-yellow-400" required />
                <div className="grid grid-cols-2 gap-3">
                  <input type="number" step="0.01" value={editingProduct?.price || ''} onChange={e => setEditingProduct({...editingProduct!, price: e.target.value})} placeholder="Preço" className="w-full bg-gray-50 border rounded-xl px-5 py-4 text-sm font-bold outline-none focus:border-yellow-400" required />
                  <select value={editingProduct?.category} onChange={e => setEditingProduct({...editingProduct!, category: e.target.value})} className="w-full bg-gray-50 border rounded-xl px-5 py-4 text-sm font-bold outline-none">
                    {categories.map(cat => <option key={cat.id} value={cat.name}>{cat.name}</option>)}
                    {categories.length === 0 && <option value="Lanches">Lanches</option>}
                  </select>
                </div>
                <input type="text" value={editingProduct?.image || ''} onChange={e => setEditingProduct({...editingProduct!, image: e.target.value})} placeholder="Link da Imagem" className="w-full bg-gray-50 border rounded-xl px-5 py-4 text-sm font-bold outline-none" />
                <button type="submit" className="w-full bg-black text-yellow-400 py-5 rounded-2xl font-black text-xs uppercase shadow-xl mt-4">Confirmar</button>
             </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminPanel;
