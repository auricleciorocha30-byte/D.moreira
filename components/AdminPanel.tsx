
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

  // FUNÇÃO DE IMPRESSÃO RESTAURADA E MELHORADA
  const handlePrint = (order: Order) => {
    const printWindow = window.open('', '_blank', 'width=300,height=600');
    if (!printWindow) {
      alert('Por favor, habilite os pop-ups para imprimir a comanda.');
      return;
    }

    const itemsHtml = order.items.map(item => `
      <div style="display: flex; justify-content: space-between; margin-bottom: 2px; font-family: 'Courier New', monospace;">
        <span>${item.quantity}x ${item.name.substring(0, 18)}</span>
        <span>${(item.price * item.quantity).toFixed(2)}</span>
      </div>
    `).join('');

    const date = new Date().toLocaleString('pt-BR');

    printWindow.document.write(`
      <html>
        <head>
          <style>
            body { font-family: 'Courier New', monospace; width: 58mm; font-size: 12px; margin: 0; padding: 10px; color: #000; }
            .center { text-align: center; }
            .line { border-bottom: 1px dashed #000; margin: 8px 0; }
            .bold { font-weight: bold; }
            .total { font-size: 16px; display: flex; justify-content: space-between; margin-top: 5px; }
            .header-title { font-size: 18px; margin-bottom: 2px; }
          </style>
        </head>
        <body>
          <div class="center bold header-title">${STORE_INFO.name.toUpperCase()}</div>
          <div class="center">${STORE_INFO.slogan}</div>
          <div class="line"></div>
          <div class="bold">PEDIDO: #${order.id}</div>
          <div>DATA: ${date}</div>
          <div class="bold">LOCAL: ${order.tableId >= 900 ? (order.tableId === 900 ? 'ENTREGA' : 'BALCÃO') : 'MESA ' + order.tableId}</div>
          <div class="bold">CLIENTE: ${order.customerName}</div>
          <div class="line"></div>
          <div class="bold">ITENS:</div>
          ${itemsHtml}
          <div class="line"></div>
          <div class="total bold">
            <span>TOTAL:</span>
            <span>R$ ${order.total.toFixed(2)}</span>
          </div>
          <div class="line"></div>
          <div class="center bold" style="font-size: 10px;">D.MOREIRA - PARADA OBRIGATÓRIA</div>
          <div class="center" style="font-size: 9px; margin-top: 5px;">Obrigado pela preferência!</div>
          <script>
            window.onload = function() { 
              window.print(); 
              setTimeout(function() { window.close(); }, 500);
            }
          </script>
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
      if (error) {
        if (error.message.includes('schema cache')) {
          alert('ERRO DE SINCRONIZAÇÃO: O Supabase ainda não reconheceu a tabela. Rode o comando "NOTIFY pgrst, reload schema" no SQL Editor do Supabase.');
        } else {
          throw error;
        }
      } else {
        setNewCategoryName('');
        onRefreshData();
      }
    } catch (err: any) {
      alert('Erro: ' + err.message);
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
      {/* Banner Principal Admin */}
      <div className="bg-black p-8 rounded-[3rem] shadow-2xl mb-12 border-b-8 border-yellow-400 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-yellow-400/5 rounded-full -mr-32 -mt-32 blur-3xl"></div>
        <div className="relative z-10 flex flex-col md:flex-row justify-between items-center gap-6">
          <div className="flex flex-col items-center md:items-start">
            <h2 className="text-4xl font-black italic tracking-tighter text-yellow-400">D.MOREIRA</h2>
            <p className="text-gray-500 font-bold text-[9px] uppercase tracking-[0.3em]">Sistema de Gestão Interna</p>
          </div>
          
          <nav className="flex flex-wrap justify-center gap-2">
            {(['tables', 'delivery', 'menu', 'categories'] as const).map(tab => (
              <button key={tab} onClick={() => setActiveTab(tab)} className={`px-6 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === tab ? 'bg-yellow-400 text-black shadow-lg shadow-yellow-400/20' : 'text-gray-500 hover:text-white bg-white/5'}`}>
                {tab === 'tables' ? 'Mesas' : tab === 'delivery' ? 'Pedidos' : tab === 'menu' ? 'Cardápio' : 'Categorias'}
              </button>
            ))}
            <button onClick={onToggleAudio} className={`p-3 rounded-2xl ${audioEnabled ? 'bg-yellow-400/20 text-yellow-400' : 'text-gray-700'}`}>
              <VolumeIcon muted={!audioEnabled}/>
            </button>
            <button onClick={onLogout} className="text-red-500 font-black text-[10px] uppercase ml-4 p-3 hover:bg-red-500/10 rounded-2xl transition-all">Sair</button>
          </nav>
        </div>
      </div>

      {/* Grid de Mesas */}
      {(activeTab === 'tables' || activeTab === 'delivery') && (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-6">
          {(activeTab === 'tables' ? physicalTables : deliveryTables).map(t => (
            <button 
              key={t.id} 
              onClick={() => setSelectedTableId(t.id)}
              className={`h-48 p-6 rounded-[2.5rem] border-4 transition-all flex flex-col items-center justify-center gap-2 relative ${t.status === 'free' ? 'bg-white border-gray-100 hover:border-yellow-400' : 'bg-yellow-400 border-black shadow-xl'}`}
            >
              <span className="text-5xl font-black italic text-black">{t.id >= 900 ? (t.id === 900 ? '🚚' : '🛍️') : t.id}</span>
              <span className={`text-[9px] font-black uppercase px-3 py-1 rounded-full ${t.status === 'free' ? 'bg-gray-100 text-gray-400' : 'bg-black text-white'}`}>
                {t.status === 'free' ? 'Livre' : 'Ocupada'}
              </span>
              {t.status === 'occupied' && (
                <span className="text-[12px] font-black mt-1 text-black bg-white/30 px-3 py-1 rounded-lg">R$ {t.currentOrder?.total.toFixed(2)}</span>
              )}
            </button>
          ))}
        </div>
      )}

      {/* Gestão de Categorias */}
      {activeTab === 'categories' && (
        <div className="bg-white p-10 rounded-[4rem] shadow-xl max-w-2xl mx-auto border border-gray-100">
          <h3 className="text-3xl font-black italic mb-8">Categorias</h3>
          <form onSubmit={handleAddCategory} className="flex gap-3 mb-12">
            <input type="text" value={newCategoryName} onChange={e => setNewCategoryName(e.target.value)} placeholder="Nova Categoria..." className="flex-1 bg-gray-50 border-2 rounded-2xl px-6 py-5 text-sm font-bold outline-none focus:border-yellow-400" />
            <button type="submit" disabled={isSaving} className="bg-black text-yellow-400 px-10 py-5 rounded-2xl font-black text-xs uppercase shadow-xl hover:scale-105 active:scale-95 transition-all">
              {isSaving ? '...' : 'Adicionar'}
            </button>
          </form>
          <div className="space-y-3">
            {categories.map(cat => (
              <div key={cat.id} className="flex justify-between items-center bg-gray-50 p-6 rounded-3xl border-2 border-transparent hover:border-yellow-400 transition-all">
                <span className="font-black text-gray-800 uppercase text-xs italic">{cat.name}</span>
                <button onClick={() => supabase.from('categories').delete().eq('id', cat.id).then(() => onRefreshData())} className="p-3 bg-red-50 text-red-500 rounded-xl hover:bg-red-500 hover:text-white transition-all"><TrashIcon/></button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Menu / Produtos */}
      {activeTab === 'menu' && (
        <div className="bg-white p-10 rounded-[4rem] shadow-xl border border-gray-100">
          <div className="flex justify-between items-center mb-12">
            <h3 className="text-3xl font-black italic">Cardápio</h3>
            <button onClick={() => { setEditingProduct({ name: '', price: '', category: categories[0]?.name || 'Diversos', image: '', isAvailable: true }); setIsProductModalOpen(true); }} className="bg-black text-yellow-400 px-10 py-5 rounded-3xl font-black text-xs uppercase shadow-2xl hover:scale-105 transition-all">+ Novo Produto</button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            {menuItems.map(item => (
              <div key={item.id} className="bg-gray-50 p-6 rounded-[3rem] border-2 transition-all hover:border-yellow-400">
                <img src={item.image} className="w-full aspect-square object-cover rounded-[2rem] mb-6 shadow-md" />
                <h4 className="font-black text-lg text-black mb-1">{item.name}</h4>
                <div className="flex justify-between items-center mb-6">
                  <span className="text-yellow-700 font-black text-md italic">R$ {item.price.toFixed(2)}</span>
                  <span className="text-[9px] font-black uppercase text-gray-400">{item.category}</span>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <button onClick={() => { setEditingProduct({...item, price: item.price.toString()}); setIsProductModalOpen(true); }} className="bg-white py-4 rounded-2xl font-black text-[10px] uppercase border-2 text-black hover:bg-black hover:text-white transition-all">Editar</button>
                  <button onClick={() => onDeleteProduct(item.id)} className="p-4 bg-red-50 text-red-500 rounded-2xl hover:bg-red-500 hover:text-white transition-all"><TrashIcon/></button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Modal da Mesa com Lançamento e Impressão */}
      {selectedTable && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/95 backdrop-blur-xl" onClick={() => setSelectedTableId(null)} />
          <div className="relative bg-white w-full max-w-6xl h-[85vh] rounded-[4rem] flex flex-col md:flex-row overflow-hidden shadow-2xl border-t-8 border-yellow-400 animate-in slide-in-from-bottom duration-500">
            
            {/* Esquerda: Pedido e Botão Impressão */}
            <div className="flex-1 p-10 md:p-14 overflow-y-auto border-b md:border-b-0 md:border-r border-gray-100">
               <div className="flex justify-between items-start mb-10">
                 <div>
                   <h3 className="text-6xl font-black italic tracking-tighter">Local {selectedTable.id >= 900 ? (selectedTable.id === 900 ? 'Entrega' : 'Balcão') : selectedTable.id}</h3>
                   <span className="text-[10px] font-black uppercase tracking-widest text-gray-400 block mt-2">Status: {selectedTable.status === 'free' ? 'Disponível' : 'Ocupada'}</span>
                 </div>
                 <div className="flex gap-3">
                    {selectedTable.status === 'occupied' && selectedTable.currentOrder && (
                      <button onClick={() => handlePrint(selectedTable.currentOrder!)} className="p-6 bg-black text-yellow-400 rounded-full hover:brightness-110 shadow-xl flex items-center gap-2 group transition-all">
                        <PrinterIcon size={32} />
                        <span className="font-black text-[11px] uppercase pr-2">Imprimir</span>
                      </button>
                    )}
                    <button onClick={() => setSelectedTableId(null)} className="p-6 bg-gray-100 rounded-full hover:bg-gray-200 transition-colors"><CloseIcon size={32} /></button>
                 </div>
               </div>
               
               <div className="space-y-4 mb-14">
                 {selectedTable.currentOrder?.items.map((item, idx) => (
                   <div key={idx} className="flex justify-between items-center bg-gray-50 p-6 rounded-3xl border border-gray-100">
                     <span className="font-black text-sm text-black uppercase">{item.quantity}x {item.name}</span>
                     <span className="font-black text-sm text-yellow-700 italic">R$ {(item.price * item.quantity).toFixed(2)}</span>
                   </div>
                 )) || <div className="text-center py-20 text-gray-300 font-black uppercase text-xs tracking-[0.2em]">Sem itens lançados</div>}
               </div>

               {selectedTable.status === 'occupied' && (
                 <div className="border-t-4 border-black pt-12">
                    <div className="flex justify-between items-end mb-12">
                      <span className="text-gray-400 font-black text-[10px] uppercase tracking-widest">Valor da Comanda</span>
                      <span className="text-7xl font-black italic text-black tracking-tighter">R$ {selectedTable.currentOrder?.total.toFixed(2)}</span>
                    </div>
                    <div className="grid grid-cols-2 gap-6">
                      <button onClick={() => setSelectedTableId(null)} className="bg-gray-100 text-black py-8 rounded-3xl font-black uppercase text-xs tracking-widest">Continuar Atendimento</button>
                      <button onClick={() => { if(confirm('Finalizar e Liberar Mesa?')) onUpdateTable(selectedTable.id, 'free'); setSelectedTableId(null); }} className="bg-green-600 text-white py-8 rounded-3xl font-black uppercase text-xs tracking-widest shadow-2xl shadow-green-600/20">Fechar Conta</button>
                    </div>
                 </div>
               )}
            </div>

            {/* Direita: Lançamento Ultra Rápido */}
            <div className="w-full md:w-[28rem] bg-gray-50 p-10 flex flex-col">
               <h4 className="text-[11px] font-black uppercase tracking-[0.3em] text-black mb-8 bg-yellow-400 px-6 py-2.5 rounded-full w-fit">Lançamento Rápido</h4>
               <div className="relative mb-8">
                 <input 
                  type="text" 
                  placeholder="Buscar produto..." 
                  value={searchTerm} 
                  onChange={e => setSearchTerm(e.target.value)} 
                  className="w-full bg-white border-4 border-transparent focus:border-black rounded-3xl px-8 py-6 text-xs font-bold outline-none shadow-xl transition-all" 
                 />
               </div>
               <div className="flex-1 overflow-y-auto space-y-3 no-scrollbar pb-10">
                  {filteredMenu.map(p => (
                    <button key={p.id} onClick={() => onAddToOrder(selectedTable.id, p)} className="w-full text-left bg-white p-6 rounded-3xl border-2 border-transparent hover:border-black hover:shadow-2xl transition-all group active:scale-95 flex items-center justify-between">
                       <div>
                          <p className="font-black text-[12px] uppercase text-black line-clamp-1">{p.name}</p>
                          <p className="text-[11px] font-bold text-yellow-700 italic">R$ {p.price.toFixed(2)}</p>
                       </div>
                       <div className="bg-yellow-400 text-black font-black text-[10px] px-5 py-2.5 rounded-2xl shadow-md">+ ADD</div>
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
                  <input type="number" step="0.01" value={editingProduct?.price || ''} onChange={e => setEditingProduct({...editingProduct!, price: e.target.value})} placeholder="Preço" className="w-full bg-gray-50 border-2 rounded-2xl px-6 py-5 text-sm font-bold outline-none focus:border-yellow-400" required />
                  <select value={editingProduct?.category} onChange={e => setEditingProduct({...editingProduct!, category: e.target.value})} className="w-full bg-gray-50 border-2 rounded-2xl px-6 py-5 text-sm font-bold outline-none focus:border-yellow-400">
                    {categories.map(cat => <option key={cat.id} value={cat.name}>{cat.name}</option>)}
                    {categories.length === 0 && <option value="Diversos">Diversos</option>}
                  </select>
                </div>
                <input type="text" value={editingProduct?.image || ''} onChange={e => setEditingProduct({...editingProduct!, image: e.target.value})} placeholder="URL da Imagem" className="w-full bg-gray-50 border-2 rounded-2xl px-6 py-5 text-sm font-bold outline-none focus:border-yellow-400" />
                <button type="submit" className="w-full bg-black text-yellow-400 py-7 rounded-[2.5rem] font-black text-sm uppercase tracking-widest shadow-2xl hover:scale-105 active:scale-95 transition-all mt-6">Confirmar Item</button>
             </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminPanel;
