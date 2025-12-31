
import React, { useState, useMemo, useEffect, useRef } from 'react';
import { Table, Order, PrintConfig, Product, CategoryType, OrderStatus } from '../types';
import { CloseIcon, TrashIcon } from './Icons';

interface AdminPanelProps {
  tables: Table[];
  menuItems: Product[];
  onUpdateTable: (tableId: number, status: 'free' | 'occupied', order?: Order | null) => void;
  onAddToOrder: (tableId: number, product: Product) => void;
  onRefreshData: () => void;
  salesHistory: Order[];
  onLogout: () => void;
  onSaveProduct: (product: Partial<Product>) => void;
}

const AdminPanel: React.FC<AdminPanelProps> = ({ tables, menuItems, onUpdateTable, onAddToOrder, onRefreshData, salesHistory, onLogout, onSaveProduct }) => {
  const [activeTab, setActiveTab] = useState<'tables' | 'menu'>('tables');
  const [selectedTable, setSelectedTable] = useState<Table | null>(null);
  const [isAddingItemsToTable, setIsAddingItemsToTable] = useState(false);
  const [adminCategory, setAdminCategory] = useState<CategoryType | 'Todos'>('Todos');
  const [showSalesReport, setShowSalesReport] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isSoundEnabled, setIsSoundEnabled] = useState(true);
  
  // States para Gestão de Cardápio
  const [editingProduct, setEditingProduct] = useState<Partial<Product> | null>(null);
  const [isProductModalOpen, setIsProductModalOpen] = useState(false);

  const currentTableData = useMemo(() => tables.find(t => t.id === selectedTable?.id), [tables, selectedTable]);

  const totalItemsInTables = useMemo(() => {
    return tables.reduce((acc, table) => {
      if (!table.currentOrder) return acc;
      return acc + table.currentOrder.items.reduce((sum, item) => sum + item.quantity, 0);
    }, 0);
  }, [tables]);

  const lastTotalItemsRef = useRef(totalItemsInTables);

  useEffect(() => {
    if (totalItemsInTables > lastTotalItemsRef.current && isSoundEnabled) {
      new Audio('https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3').play().catch(() => {});
    }
    lastTotalItemsRef.current = totalItemsInTables;
  }, [totalItemsInTables, isSoundEnabled]);

  const getStatusLabel = (status: OrderStatus) => {
    switch (status) {
      case 'pending': return { text: 'Pendente', color: 'bg-red-500' };
      case 'preparing': return { text: 'Em Preparo', color: 'bg-orange-500' };
      case 'ready': return { text: 'Pronto!', color: 'bg-blue-500' };
      case 'delivered': return { text: 'Entregue', color: 'bg-green-500' };
      default: return { text: 'Pendente', color: 'bg-red-500' };
    }
  };

  const categories: (CategoryType | 'Todos')[] = ['Todos', 'Combos', 'Cafeteria', 'Lanches', 'Bebidas', 'Conveniência'];

  const handlePrint = (order: Order) => {
    const printWindow = window.open('', '_blank', 'width=800,height=800');
    if (!printWindow) return alert('Habilite pop-ups.');
    const content = `
      <!DOCTYPE html><html><head><title>Cupom D.Moreira</title><style>
      body { font-family: 'Courier New', monospace; width: 72mm; margin: 0; padding: 4mm; font-size: 14px; font-weight: bold; }
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
    <div className="p-4 md:p-8 max-w-7xl mx-auto min-h-screen">
      {/* Header com Navegação */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-6 bg-white p-6 rounded-[2.5rem] shadow-sm border border-gray-100">
        <div>
          <h2 className="text-3xl font-black text-gray-900 italic tracking-tight">Painel Operacional</h2>
          <div className="flex gap-4 mt-3">
            <button onClick={() => setActiveTab('tables')} className={`text-[11px] font-black uppercase tracking-widest pb-1 border-b-4 transition-all ${activeTab === 'tables' ? 'border-yellow-400 text-black' : 'border-transparent text-gray-400 hover:text-gray-600'}`}>Mesas & Comandas</button>
            <button onClick={() => setActiveTab('menu')} className={`text-[11px] font-black uppercase tracking-widest pb-1 border-b-4 transition-all ${activeTab === 'menu' ? 'border-yellow-400 text-black' : 'border-transparent text-gray-400 hover:text-gray-600'}`}>Gestão de Cardápio</button>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <button onClick={() => { setIsRefreshing(true); onRefreshData(); setTimeout(() => setIsRefreshing(false), 500); }} className={`p-3 bg-gray-50 rounded-2xl ${isRefreshing ? 'animate-spin' : ''}`}><svg width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/></svg></button>
          <button onClick={() => setShowSalesReport(true)} className="bg-black text-white px-6 py-3 rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-lg">📊 Caixa</button>
          <button onClick={onLogout} className="bg-red-50 text-red-500 px-5 py-3 rounded-2xl font-black text-[10px] uppercase">Sair</button>
        </div>
      </div>

      {activeTab === 'tables' ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-6">
          {tables.map(table => {
            const statusInfo = table.currentOrder ? getStatusLabel(table.currentOrder.status) : null;
            return (
              <button key={table.id} onClick={() => { setSelectedTable(table); setIsAddingItemsToTable(false); }} className={`p-6 rounded-[2.5rem] border-4 transition-all flex flex-col items-center justify-center gap-2 group relative h-48 ${table.status === 'free' ? 'bg-white border-gray-100 hover:border-yellow-400' : 'bg-yellow-400 border-black shadow-xl scale-105'}`}>
                {table.currentOrder?.isUpdated && <div className="absolute -top-3 -right-3 bg-red-600 text-white text-[9px] font-black px-3 py-1.5 rounded-full shadow-lg border-2 border-white animate-bounce z-20">Novo!</div>}
                {statusInfo && <div className={`absolute top-4 left-4 ${statusInfo.color} text-white text-[8px] font-black px-2 py-0.5 rounded-full uppercase`}>{statusInfo.text}</div>}
                <span className="text-4xl font-black italic">{table.id}</span>
                <span className={`text-[9px] font-black uppercase px-3 py-1 rounded-full ${table.status === 'free' ? 'bg-gray-100 text-gray-400' : 'bg-black text-white'}`}>{table.status === 'free' ? 'Livre' : 'Ocupada'}</span>
                {table.currentOrder && <span className="text-[10px] font-bold text-black/70 mt-1 truncate w-full text-center px-2">{table.currentOrder.customerName}</span>}
              </button>
            );
          })}
        </div>
      ) : (
        <div className="bg-white rounded-[3rem] p-8 shadow-sm border border-gray-100 animate-pop-in">
          <div className="flex justify-between items-center mb-8">
            <div>
              <h3 className="text-2xl font-black italic">Gestão de Cardápio</h3>
              <p className="text-gray-400 text-[10px] font-black uppercase tracking-widest">Adicione produtos ou gerencie o estoque</p>
            </div>
            <button onClick={() => { setEditingProduct({ category: 'Lanches', isAvailable: true }); setIsProductModalOpen(true); }} className="bg-yellow-400 text-black px-8 py-4 rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl hover:scale-105 transition-all">+ Novo Produto</button>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {menuItems.map(item => (
              <div key={item.id} className={`flex items-center gap-4 p-4 rounded-3xl border transition-all ${item.isAvailable ? 'bg-gray-50 border-gray-100' : 'bg-red-50 border-red-100 opacity-80'}`}>
                <img src={item.image} className="w-16 h-16 object-cover rounded-2xl grayscale-[0.3]" />
                <div className="flex-1">
                  <h4 className="font-black text-sm text-gray-900 leading-tight">{item.name}</h4>
                  <p className="text-yellow-700 font-bold text-xs">R$ {item.price.toFixed(2)}</p>
                  <span className={`text-[8px] font-black uppercase px-2 py-0.5 rounded-md mt-1 inline-block ${item.isAvailable ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                    {item.isAvailable ? 'Disponível' : 'Em Falta'}
                  </span>
                </div>
                <div className="flex flex-col gap-2">
                  <button onClick={() => { setEditingProduct(item); setIsProductModalOpen(true); }} className="p-2 bg-white rounded-xl shadow-sm hover:bg-gray-100"><svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"/></svg></button>
                  <button onClick={() => onSaveProduct({ ...item, isAvailable: !item.isAvailable })} className={`p-2 rounded-xl shadow-sm ${item.isAvailable ? 'bg-white text-gray-400' : 'bg-red-500 text-white'}`} title="Marcar como Falta">
                    <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636"/></svg>
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Modal de Produto (Novo/Editar) */}
      {isProductModalOpen && editingProduct && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/80 backdrop-blur-md" onClick={() => setIsProductModalOpen(false)} />
          <div className="relative bg-white w-full max-w-lg rounded-[3.5rem] p-8 shadow-2xl border-8 border-yellow-400">
            <h3 className="text-2xl font-black mb-6 italic">{editingProduct.id ? 'Editar Produto' : 'Novo Produto'}</h3>
            <div className="space-y-4">
              <div><label className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-2">Nome</label><input type="text" className="w-full bg-gray-50 border border-gray-100 rounded-2xl px-5 py-3 text-sm font-bold" value={editingProduct.name || ''} onChange={e => setEditingProduct({...editingProduct, name: e.target.value})} /></div>
              <div className="grid grid-cols-2 gap-4">
                <div><label className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-2">Preço (R$)</label><input type="number" step="0.01" className="w-full bg-gray-50 border border-gray-100 rounded-2xl px-5 py-3 text-sm font-bold" value={editingProduct.price || ''} onChange={e => setEditingProduct({...editingProduct, price: parseFloat(e.target.value)})} /></div>
                <div><label className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-2">Categoria</label>
                  <select className="w-full bg-gray-50 border border-gray-100 rounded-2xl px-5 py-3 text-sm font-bold outline-none" value={editingProduct.category} onChange={e => setEditingProduct({...editingProduct, category: e.target.value as CategoryType})}>
                    {categories.filter(c => c !== 'Todos').map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
              </div>
              <div><label className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-2">URL da Imagem (Unsplash/Etc)</label><input type="text" className="w-full bg-gray-50 border border-gray-100 rounded-2xl px-5 py-3 text-sm font-bold" value={editingProduct.image || ''} onChange={e => setEditingProduct({...editingProduct, image: e.target.value})} /></div>
              <div><label className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-2">Descrição Curta</label><textarea className="w-full bg-gray-50 border border-gray-100 rounded-2xl px-5 py-3 text-sm font-bold h-20" value={editingProduct.description || ''} onChange={e => setEditingProduct({...editingProduct, description: e.target.value})} /></div>
              <div className="flex items-center gap-3 p-4 bg-gray-50 rounded-2xl">
                <input type="checkbox" id="avail" className="w-5 h-5 accent-yellow-400" checked={editingProduct.isAvailable} onChange={e => setEditingProduct({...editingProduct, isAvailable: e.target.checked})} />
                <label htmlFor="avail" className="text-xs font-black uppercase">Produto em Estoque (Disponível)</label>
              </div>
              <div className="grid grid-cols-2 gap-4 pt-4">
                <button onClick={() => setIsProductModalOpen(false)} className="py-4 bg-gray-100 rounded-2xl font-black uppercase text-xs">Cancelar</button>
                <button onClick={() => { onSaveProduct(editingProduct); setIsProductModalOpen(false); }} className="py-4 bg-black text-yellow-400 rounded-2xl font-black uppercase text-xs shadow-xl">Salvar Alterações</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modais de Mesa e Relatório (Mantidos das versões anteriores) */}
      {selectedTable && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/90 backdrop-blur-md" onClick={() => setSelectedTable(null)} />
          <div className="relative bg-white w-full max-w-3xl rounded-[3.5rem] p-8 md:p-10 shadow-2xl flex flex-col max-h-[92vh] overflow-hidden border-[12px] border-yellow-400">
            <div className="flex justify-between items-start mb-6 shrink-0">
              <div><h3 className="text-4xl font-black italic">Mesa {selectedTable.id}</h3></div>
              <button onClick={() => setSelectedTable(null)} className="p-3 hover:bg-gray-100 rounded-full"><CloseIcon size={32}/></button>
            </div>
            <div className="flex-1 overflow-y-auto no-scrollbar mb-6">
              {currentTableData?.currentOrder ? (
                <div className="space-y-6">
                  <div className="bg-black text-white p-6 rounded-[2.5rem] flex justify-between items-center">
                    <div className="flex gap-2">
                      {(['pending', 'preparing', 'ready', 'delivered'] as OrderStatus[]).map(st => (
                        <button key={st} onClick={() => onUpdateTable(selectedTable.id, 'occupied', { ...currentTableData.currentOrder!, status: st })} className={`px-4 py-2 rounded-xl text-[9px] font-black uppercase border-2 transition-all ${currentTableData.currentOrder?.status === st ? 'bg-yellow-400 text-black border-yellow-400' : 'border-white/20 text-white/40'}`}>{getStatusLabel(st).text}</button>
                      ))}
                    </div>
                  </div>
                  {currentTableData.currentOrder.items.map((item, idx) => (
                    <div key={idx} className="flex justify-between items-center bg-gray-50 p-5 rounded-3xl">
                      <span className="font-black text-sm">{item.quantity}x {item.name}</span>
                      <span className="font-black italic">R$ {(item.price * item.quantity).toFixed(2)}</span>
                    </div>
                  ))}
                </div>
              ) : <p className="text-center py-20 text-gray-300 font-black uppercase italic">Mesa Disponível</p>}
            </div>
            <div className="pt-8 border-t-4 border-gray-100">
              {currentTableData?.currentOrder ? (
                <div className="grid grid-cols-2 gap-6">
                  <button onClick={() => handlePrint(currentTableData.currentOrder!)} className="bg-gray-100 py-5 rounded-[2rem] font-black uppercase text-xs">Imprimir Cupom</button>
                  <button onClick={() => { if(confirm('Fechar conta?')) { onUpdateTable(selectedTable.id, 'free'); setSelectedTable(null); } }} className="bg-green-500 text-white py-5 rounded-[2rem] font-black uppercase text-xs shadow-xl">Liberar Mesa</button>
                </div>
              ) : <button onClick={() => setActiveTab('tables')} className="w-full bg-yellow-400 py-5 rounded-[2rem] font-black uppercase text-xs">Abrir Comanda via Menu</button>}
            </div>
          </div>
        </div>
      )}

      {showSalesReport && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/95">
          <div className="bg-white w-full max-w-xl rounded-[4rem] p-12 border-[12px] border-yellow-400">
            <h3 className="text-3xl font-black mb-8 italic">Resumo do Dia</h3>
            {['Pix', 'Dinheiro', 'Cartão'].map(method => (
              <div key={method} className="flex justify-between py-4 border-b">
                <span className="font-black text-gray-400 uppercase text-xs">{method}</span>
                <span className="font-black text-xl">R$ {salesHistory.filter(o => o.paymentMethod === method).reduce((acc, o) => acc + o.total, 0).toFixed(2)}</span>
              </div>
            ))}
            <button onClick={() => setShowSalesReport(false)} className="w-full mt-8 bg-black text-white py-5 rounded-[2rem] font-black uppercase text-xs">Fechar</button>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminPanel;
