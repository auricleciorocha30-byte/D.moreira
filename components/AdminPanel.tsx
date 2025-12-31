
import React, { useState, useMemo } from 'react';
import { Table, Order, Product, CategoryType, OrderStatus } from '../types';
import { CloseIcon, TrashIcon } from './Icons';
import { MENU_ITEMS as STATIC_MENU } from '../constants';
import { supabase } from '../lib/supabase';

interface AdminPanelProps {
  tables: Table[];
  menuItems: Product[];
  onUpdateTable: (tableId: number, status: 'free' | 'occupied', order?: Order | null) => void;
  onAddToOrder: (tableId: number, product: Product) => void;
  onRefreshData: () => void;
  salesHistory: Order[];
  onLogout: () => void;
  onSaveProduct: (product: Partial<Product>) => void;
  dbStatus: 'loading' | 'ok' | 'error_tables_missing';
}

const AdminPanel: React.FC<AdminPanelProps> = ({ tables, menuItems, onUpdateTable, onAddToOrder, onRefreshData, salesHistory, onLogout, onSaveProduct, dbStatus }) => {
  const [activeTab, setActiveTab] = useState<'tables' | 'functions' | 'setup'>('tables');
  const [selectedTableId, setSelectedTableId] = useState<number | null>(null);
  const [showSalesReport, setShowSalesReport] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  
  const [editingProduct, setEditingProduct] = useState<Partial<Product> | null>(null);
  const [isProductModalOpen, setIsProductModalOpen] = useState(false);

  const categories: (CategoryType | 'Todos')[] = ['Todos', 'Combos', 'Cafeteria', 'Lanches', 'Bebidas', 'Conveniência'];

  const selectedTable = useMemo(() => 
    tables.find(t => t.id === selectedTableId) || null
  , [tables, selectedTableId]);

  const filteredItemsToAdd = useMemo(() => 
    menuItems.filter(item => 
      (item.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
       item.category.toLowerCase().includes(searchTerm.toLowerCase()))
    )
  , [menuItems, searchTerm]);

  const getStatusLabel = (status: OrderStatus) => {
    switch (status) {
      case 'pending': return { text: 'Pendente', color: 'bg-red-500' };
      case 'preparing': return { text: 'Preparo', color: 'bg-orange-500' };
      case 'ready': return { text: 'Pronto', color: 'bg-blue-500' };
      case 'delivered': return { text: 'Entregue', color: 'bg-green-500' };
      default: return { text: 'Pendente', color: 'bg-red-500' };
    }
  };

  const handleToggleAvailability = (item: Product) => {
    // A função no App.tsx agora tem UI otimista
    onSaveProduct({ ...item, isAvailable: !item.isAvailable });
  };

  const handlePrint = (order: Order) => {
    const printWindow = window.open('', '_blank', 'width=800,height=800');
    if (!printWindow) return alert('Habilite pop-ups.');
    const content = `
      <!DOCTYPE html><html><head><title>D.Moreira - Pedido</title><style>
      body { font-family: 'Courier New', monospace; width: 72mm; padding: 4mm; font-size: 14px; font-weight: bold; }
      .center { text-align: center; } .line { border-bottom: 2px dashed #000; margin: 8px 0; }
      .flex { display: flex; justify-content: space-between; }
      </style></head><body>
      <div class="center">D. MOREIRA CONVENIÊNCIA</div><div class="line"></div>
      <div class="flex"><span>MESA:</span><span>${order.tableId}</span></div>
      <div class="flex"><span>DATA:</span><span>${new Date(order.timestamp).toLocaleString('pt-BR')}</span></div>
      <div class="flex"><span>CLIENTE:</span><span>${order.customerName.toUpperCase()}</span></div><div class="line"></div>
      ${order.items.map(i => `<div class="flex"><span>${i.quantity}x ${i.name}</span><span>R$ ${(i.price * i.quantity).toFixed(2)}</span></div>`).join('')}
      <div class="line"></div><div class="flex" style="font-size: 18px;"><span>TOTAL:</span><span>R$ ${order.total.toFixed(2)}</span></div>
      <div class="flex"><span>PAGTO:</span><span>${order.paymentMethod}</span></div>
      <div class="line"></div><div class="center italic">*** OBRIGADO ***</div>
      <script>window.onload=function(){window.print();window.close();};</script></body></html>
    `;
    printWindow.document.write(content);
    printWindow.document.close();
  };

  return (
    <div className="w-full animate-pop-in">
      {/* Cabeçalho do Painel */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-10 gap-6 bg-white p-6 rounded-[3rem] shadow-sm border border-gray-100">
        <div>
          <h2 className="text-3xl font-black italic tracking-tighter">D.Moreira Admin</h2>
          <div className="flex gap-6 mt-4">
            <button onClick={() => setActiveTab('tables')} className={`text-[11px] font-black uppercase tracking-[0.2em] pb-1 border-b-4 transition-all ${activeTab === 'tables' ? 'border-yellow-400 text-black' : 'border-transparent text-gray-300 hover:text-gray-500'}`}>Pedidos</button>
            <button onClick={() => setActiveTab('functions')} className={`text-[11px] font-black uppercase tracking-[0.2em] pb-1 border-b-4 transition-all ${activeTab === 'functions' ? 'border-yellow-400 text-black' : 'border-transparent text-gray-300 hover:text-gray-500'}`}>Cardápio & Estoque</button>
            <button onClick={() => setActiveTab('setup')} className={`text-[11px] font-black uppercase tracking-[0.2em] pb-1 border-b-4 transition-all ${activeTab === 'setup' ? 'border-red-400 text-black' : 'border-transparent text-gray-300 hover:text-gray-500'}`}>Setup</button>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <button onClick={() => setShowSalesReport(true)} className="bg-black text-white px-6 py-3 rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-xl">💰 Caixa</button>
          <button onClick={onLogout} className="bg-red-50 text-red-500 px-5 py-3 rounded-2xl font-black text-[10px] uppercase hover:bg-red-100 transition-colors">Sair</button>
        </div>
      </div>

      {activeTab === 'tables' && (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-6">
          {tables.map(table => {
            const statusInfo = table.currentOrder ? getStatusLabel(table.currentOrder.status) : null;
            return (
              <button key={table.id} onClick={() => setSelectedTableId(table.id)} className={`p-6 rounded-[2.5rem] border-4 transition-all flex flex-col items-center justify-center gap-2 group relative h-48 ${table.status === 'free' ? 'bg-white border-gray-100 hover:border-yellow-400' : 'bg-yellow-400 border-black shadow-2xl scale-105 z-10'}`}>
                {statusInfo && <div className={`absolute top-4 left-4 ${statusInfo.color} text-white text-[8px] font-black px-2 py-0.5 rounded-full uppercase`}>{statusInfo.text}</div>}
                <span className="text-4xl font-black italic">{table.id}</span>
                <span className={`text-[9px] font-black uppercase px-3 py-1 rounded-full ${table.status === 'free' ? 'bg-gray-100 text-gray-400' : 'bg-black text-white'}`}>{table.status === 'free' ? 'Livre' : 'Ocupada'}</span>
                {table.currentOrder && <span className="text-[10px] font-bold text-black/70 mt-1 truncate w-full text-center px-2">{table.currentOrder.customerName}</span>}
              </button>
            );
          })}
        </div>
      )}

      {activeTab === 'functions' && (
        <div className="bg-white rounded-[3.5rem] p-8 md:p-12 shadow-sm border border-gray-100">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-10 gap-6">
            <div><h3 className="text-3xl font-black italic tracking-tighter">Gerenciar Estoque</h3></div>
            <div className="flex gap-3">
              <button onClick={() => { setEditingProduct({ category: 'Lanches', isAvailable: true }); setIsProductModalOpen(true); }} className="bg-yellow-400 text-black px-8 py-5 rounded-2xl font-black text-xs uppercase tracking-[0.2em] shadow-2xl hover:scale-105 transition-all border-b-4 border-black">+ Novo Item</button>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {menuItems.map(item => (
              <div key={item.id} className={`group p-5 rounded-[2.5rem] border-2 transition-all ${item.isAvailable ? 'bg-gray-50 border-gray-100' : 'bg-red-50 border-red-200'}`}>
                <div className="relative mb-4">
                  <img src={item.image} className={`w-full h-32 object-cover rounded-2xl shadow-sm ${!item.isAvailable && 'grayscale brightness-75 opacity-50'}`} />
                  {!item.isAvailable && (
                    <div className="absolute inset-0 flex items-center justify-center">
                      <span className="bg-red-600 text-white text-[9px] font-black px-3 py-1.5 rounded-full uppercase shadow-xl ring-2 ring-white">Esgotado</span>
                    </div>
                  )}
                </div>
                <h4 className="font-black text-sm text-gray-900 truncate leading-tight">{item.name}</h4>
                <div className="flex justify-between items-center mb-4">
                  <p className="text-yellow-700 font-black text-xs">R$ {item.price.toFixed(2)}</p>
                  <span className={`text-[8px] font-black uppercase px-2 py-0.5 rounded ${item.isAvailable ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                    {item.isAvailable ? 'Em Estoque' : 'Em Falta'}
                  </span>
                </div>
                <div className="flex gap-2">
                  <button onClick={() => { setEditingProduct(item); setIsProductModalOpen(true); }} className="flex-1 bg-white border border-gray-200 py-3 rounded-xl font-black text-[10px] uppercase hover:bg-gray-100 transition-colors">Editar</button>
                  <button 
                    onClick={() => handleToggleAvailability(item)} 
                    className={`px-4 py-3 rounded-xl font-black text-[10px] uppercase transition-all shadow-sm ${item.isAvailable ? 'bg-red-50 text-red-600 border border-red-100' : 'bg-green-600 text-white'}`}
                  >
                    {item.isAvailable ? 'Esgotar' : 'Repor'}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {selectedTable && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/90 backdrop-blur-md" onClick={() => setSelectedTableId(null)} />
          <div className="relative bg-white w-full max-w-5xl rounded-[4rem] p-8 md:p-12 shadow-2xl flex flex-col md:flex-row gap-8 max-h-[92vh] border-[12px] border-yellow-400 animate-pop-in overflow-hidden">
            
            <div className="flex-1 flex flex-col min-w-0">
              <div className="flex justify-between items-start mb-6 shrink-0">
                <div>
                  <h3 className="text-5xl font-black italic tracking-tighter leading-none">Mesa {selectedTable.id}</h3>
                  {selectedTable.currentOrder && (
                    <p className="text-gray-400 text-xs font-bold uppercase mt-2">Cliente: {selectedTable.currentOrder.customerName}</p>
                  )}
                </div>
                <button onClick={() => setSelectedTableId(null)} className="p-3 hover:bg-gray-100 rounded-full md:hidden"><CloseIcon size={32}/></button>
              </div>

              <div className="flex-1 overflow-y-auto no-scrollbar mb-6">
                {selectedTable.currentOrder ? (
                  <div className="space-y-4">
                    <div className="bg-black text-white p-4 rounded-[1.5rem] flex gap-2 flex-wrap mb-6">
                      {(['pending', 'preparing', 'ready', 'delivered'] as OrderStatus[]).map(st => (
                        <button key={st} onClick={() => onUpdateTable(selectedTable.id, 'occupied', { ...selectedTable.currentOrder!, status: st })} className={`flex-1 py-2 rounded-xl text-[8px] font-black uppercase border-2 transition-all ${selectedTable.currentOrder?.status === st ? 'bg-yellow-400 text-black border-yellow-400' : 'border-white/10 text-white/40'}`}>{getStatusLabel(st).text}</button>
                      ))}
                    </div>
                    {selectedTable.currentOrder.items.map((item, idx) => (
                      <div key={idx} className="flex justify-between items-center bg-gray-50 p-4 rounded-[1.5rem] border border-gray-100">
                        <span className="font-black text-sm">{item.quantity}x {item.name}</span>
                        <span className="font-black text-sm italic text-yellow-700">R$ {(item.price * item.quantity).toFixed(2)}</span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="h-full flex flex-col items-center justify-center opacity-20 py-10">
                    <span className="text-6xl mb-4">🪑</span>
                    <p className="text-2xl font-black italic uppercase">Mesa Livre</p>
                  </div>
                )}
              </div>

              <div className="pt-6 border-t-2 border-gray-100 shrink-0">
                {selectedTable.currentOrder ? (
                  <div className="space-y-4">
                    <div className="flex justify-between items-end mb-2">
                      <span className="font-black text-gray-400 uppercase text-[10px]">Total Acumulado</span>
                      <span className="font-black text-3xl italic">R$ {selectedTable.currentOrder.total.toFixed(2)}</span>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <button onClick={() => handlePrint(selectedTable.currentOrder!)} className="bg-gray-100 py-4 rounded-3xl font-black uppercase text-[10px] tracking-widest">🖨️ Cupom</button>
                      <button onClick={() => { if(confirm('Fechar conta?')) onUpdateTable(selectedTable.id, 'free'); setSelectedTableId(null); }} className="bg-green-500 text-white py-4 rounded-3xl font-black uppercase text-[10px] tracking-widest shadow-lg">Finalizar</button>
                    </div>
                  </div>
                ) : (
                  <button onClick={() => onUpdateTable(selectedTable.id, 'occupied', { id: Math.random().toString(36).substr(2, 6).toUpperCase(), customerName: 'Local', items: [], total: 0, paymentMethod: 'Pix', timestamp: new Date(), tableId: selectedTable.id, orderType: 'table', status: 'pending' })} className="w-full bg-yellow-400 py-5 rounded-[2rem] font-black uppercase text-[10px] tracking-widest shadow-xl">Abrir Mesa</button>
                )}
              </div>
            </div>

            {/* BUSCA DE ITENS PARA ADICIONAR NA MESA */}
            <div className="hidden md:flex flex-col w-80 shrink-0 bg-gray-50 rounded-[2.5rem] p-6 border border-gray-200">
              <h4 className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-4 italic">Inserir no Pedido</h4>
              <input 
                type="text" 
                placeholder="Buscar item..." 
                className="w-full bg-white border border-gray-200 rounded-2xl px-4 py-3 text-xs font-bold mb-4 outline-none focus:ring-2 focus:ring-yellow-400"
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
              />
              <div className="flex-1 overflow-y-auto no-scrollbar space-y-3">
                {filteredItemsToAdd.map(item => (
                  <button 
                    key={item.id} 
                    onClick={() => item.isAvailable && selectedTable.currentOrder && onAddToOrder(selectedTable.id, item)}
                    disabled={!selectedTable.currentOrder || item.isAvailable === false}
                    className={`w-full text-left bg-white p-3 rounded-2xl border border-gray-100 flex gap-3 transition-all hover:border-yellow-400 hover:shadow-md active:scale-95 ${(!selectedTable.currentOrder || item.isAvailable === false) ? 'opacity-40 grayscale cursor-not-allowed' : ''}`}
                  >
                    <img src={item.image} className="w-10 h-10 object-cover rounded-lg shadow-sm" />
                    <div className="min-w-0 flex-1">
                      <p className="text-[10px] font-black truncate leading-tight text-gray-900">{item.name}</p>
                      <p className={`text-[10px] font-black ${item.isAvailable ? 'text-yellow-700' : 'text-red-600 font-bold'}`}>
                        {item.isAvailable ? `R$ ${item.price.toFixed(2)}` : 'ESGOTADO'}
                      </p>
                    </div>
                    {item.isAvailable && <div className="bg-yellow-400 text-black w-6 h-6 rounded-full flex items-center justify-center font-black text-xs shrink-0">+</div>}
                  </button>
                ))}
              </div>
            </div>

            <button onClick={() => setSelectedTableId(null)} className="absolute top-6 right-6 p-2 bg-gray-100 rounded-full hidden md:block"><CloseIcon size={24}/></button>
          </div>
        </div>
      )}

      {/* MODAL DE EDIÇÃO DE PRODUTO */}
      {isProductModalOpen && editingProduct && (
        <div className="fixed inset-0 z-[300] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/90 backdrop-blur-md" onClick={() => setIsProductModalOpen(false)} />
          <div className="relative bg-white w-full max-w-lg rounded-[4rem] p-10 shadow-2xl border-[12px] border-yellow-400 overflow-y-auto max-h-[95vh] no-scrollbar">
            <h3 className="text-3xl font-black mb-8 italic tracking-tighter">Produto</h3>
            <div className="space-y-5">
              <input type="text" className="w-full bg-gray-50 border border-gray-100 rounded-2xl px-6 py-4 text-sm font-bold outline-none" placeholder="Nome" value={editingProduct.name || ''} onChange={e => setEditingProduct({...editingProduct, name: e.target.value})} />
              <div className="grid grid-cols-2 gap-4">
                <input type="number" step="0.01" className="w-full bg-gray-50 border border-gray-100 rounded-2xl px-6 py-4 text-sm font-bold outline-none" placeholder="Preço" value={editingProduct.price || ''} onChange={e => setEditingProduct({...editingProduct, price: parseFloat(e.target.value)})} />
                <select className="w-full bg-gray-50 border border-gray-100 rounded-2xl px-6 py-4 text-sm font-bold outline-none" value={editingProduct.category} onChange={e => setEditingProduct({...editingProduct, category: e.target.value as CategoryType})}>
                  {categories.filter(c => c !== 'Todos').map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div className="flex items-center gap-4 p-5 bg-gray-50 rounded-3xl border border-gray-100">
                <input type="checkbox" id="avail_chk_edit" className="w-6 h-6 accent-yellow-400 rounded-lg" checked={editingProduct.isAvailable !== false} onChange={e => setEditingProduct({...editingProduct, isAvailable: e.target.checked})} />
                <label htmlFor="avail_chk_edit" className="text-xs font-black uppercase tracking-widest cursor-pointer">Disponível para venda</label>
              </div>
              <div className="flex gap-4 pt-6">
                <button onClick={() => setIsProductModalOpen(false)} className="flex-1 py-4 bg-gray-100 rounded-2xl font-black uppercase text-[10px] tracking-widest">Sair</button>
                <button onClick={() => { onSaveProduct(editingProduct); setIsProductModalOpen(false); }} className="flex-1 py-4 bg-black text-yellow-400 rounded-2xl font-black uppercase text-[10px] tracking-widest shadow-2xl">Salvar Dados</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminPanel;
