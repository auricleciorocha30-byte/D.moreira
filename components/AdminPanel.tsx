
import React, { useState, useMemo, useEffect } from 'react';
import { Table, Order, Product, CategoryType, OrderStatus } from '../types';
import { CloseIcon } from './Icons';
import { MENU_ITEMS as STATIC_MENU } from '../constants';

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
  const [activeTab, setActiveTab] = useState<'tables' | 'functions'>('tables');
  const [selectedTable, setSelectedTable] = useState<Table | null>(null);
  const [showSalesReport, setShowSalesReport] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  
  const [editingProduct, setEditingProduct] = useState<Partial<Product> | null>(null);
  const [isProductModalOpen, setIsProductModalOpen] = useState(false);

  const categories: (CategoryType | 'Todos')[] = ['Todos', 'Combos', 'Cafeteria', 'Lanches', 'Bebidas', 'Conveniência'];

  const getStatusLabel = (status: OrderStatus) => {
    switch (status) {
      case 'pending': return { text: 'Pendente', color: 'bg-red-500' };
      case 'preparing': return { text: 'Em Preparo', color: 'bg-orange-500' };
      case 'ready': return { text: 'Pronto!', color: 'bg-blue-500' };
      case 'delivered': return { text: 'Entregue', color: 'bg-green-500' };
      default: return { text: 'Pendente', color: 'bg-red-500' };
    }
  };

  const handleRepopulateMenu = async () => {
    if (confirm('Deseja recarregar os produtos padrão do sistema para o banco de dados?')) {
      for (const item of STATIC_MENU) {
        await onSaveProduct(item);
      }
      alert('Cardápio sincronizado!');
    }
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
      <div class="line"></div><div class="center">*** VOLTE SEMPRE ***</div>
      <script>window.onload=function(){window.print();window.close();};</script></body></html>
    `;
    printWindow.document.write(content);
    printWindow.document.close();
  };

  return (
    <div className="w-full animate-pop-in">
      {/* Navegação Superior */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-10 gap-6 bg-white p-6 rounded-[3rem] shadow-sm border border-gray-100">
        <div>
          <h2 className="text-3xl font-black italic tracking-tight">Painel Operacional</h2>
          <div className="flex gap-6 mt-4">
            <button onClick={() => setActiveTab('tables')} className={`text-[11px] font-black uppercase tracking-[0.2em] pb-1 border-b-4 transition-all ${activeTab === 'tables' ? 'border-yellow-400 text-black' : 'border-transparent text-gray-300 hover:text-gray-500'}`}>Mesas & Pedidos</button>
            <button onClick={() => setActiveTab('functions')} className={`text-[11px] font-black uppercase tracking-[0.2em] pb-1 border-b-4 transition-all ${activeTab === 'functions' ? 'border-yellow-400 text-black' : 'border-transparent text-gray-300 hover:text-gray-500'}`}>Funções & Cardápio</button>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <button onClick={() => { setIsRefreshing(true); onRefreshData(); setTimeout(() => setIsRefreshing(false), 600); }} className={`p-3 bg-gray-50 rounded-2xl ${isRefreshing ? 'animate-spin text-yellow-500' : 'text-gray-400'}`}><svg width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/></svg></button>
          <button onClick={() => setShowSalesReport(true)} className="bg-black text-white px-6 py-3 rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-xl">📊 Relatório</button>
          <button onClick={onLogout} className="bg-red-50 text-red-500 px-5 py-3 rounded-2xl font-black text-[10px] uppercase hover:bg-red-100 transition-colors">Sair</button>
        </div>
      </div>

      {activeTab === 'tables' ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-6">
          {tables.map(table => {
            const statusInfo = table.currentOrder ? getStatusLabel(table.currentOrder.status) : null;
            return (
              <button key={table.id} onClick={() => setSelectedTable(table)} className={`p-6 rounded-[2.5rem] border-4 transition-all flex flex-col items-center justify-center gap-2 group relative h-48 ${table.status === 'free' ? 'bg-white border-gray-100 hover:border-yellow-400' : 'bg-yellow-400 border-black shadow-2xl scale-105 z-10'}`}>
                {statusInfo && <div className={`absolute top-4 left-4 ${statusInfo.color} text-white text-[8px] font-black px-2 py-0.5 rounded-full uppercase`}>{statusInfo.text}</div>}
                <span className="text-4xl font-black italic">{table.id}</span>
                <span className={`text-[9px] font-black uppercase px-3 py-1 rounded-full ${table.status === 'free' ? 'bg-gray-100 text-gray-400' : 'bg-black text-white'}`}>{table.status === 'free' ? 'Livre' : 'Ocupada'}</span>
                {table.currentOrder && <span className="text-[10px] font-bold text-black/70 mt-1 truncate w-full text-center px-2">{table.currentOrder.customerName}</span>}
              </button>
            );
          })}
        </div>
      ) : (
        <div className="bg-white rounded-[3.5rem] p-8 md:p-12 shadow-sm border border-gray-100 animate-pop-in">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-10 gap-6">
            <div>
              <h3 className="text-3xl font-black italic tracking-tighter">Gestão de Itens</h3>
              <p className="text-gray-400 text-[10px] font-black uppercase tracking-[0.2em] mt-1">Configure disponibilidade e preços</p>
            </div>
            <div className="flex gap-3">
              <button onClick={handleRepopulateMenu} className="bg-gray-100 text-gray-600 px-6 py-5 rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-gray-200 transition-all">Sincronizar Cardápio</button>
              <button onClick={() => { setEditingProduct({ category: 'Lanches', isAvailable: true }); setIsProductModalOpen(true); }} className="bg-yellow-400 text-black px-8 py-5 rounded-2xl font-black text-xs uppercase tracking-[0.2em] shadow-2xl hover:scale-105 transition-all border-b-4 border-black">+ Adicionar Produto</button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {menuItems.length === 0 ? (
              <div className="col-span-full py-20 text-center opacity-30">
                <p className="text-2xl font-black italic">Sem produtos no banco de dados</p>
                <button onClick={handleRepopulateMenu} className="mt-4 text-blue-500 font-bold underline">Clique para recarregar padrão</button>
              </div>
            ) : menuItems.map(item => (
              <div key={item.id} className={`group p-5 rounded-[2.5rem] border-2 transition-all ${item.isAvailable ? 'bg-gray-50 border-gray-100' : 'bg-red-50/50 border-red-100 opacity-90'}`}>
                <div className="relative mb-4">
                  <img src={item.image} className={`w-full h-32 object-cover rounded-2xl shadow-sm ${!item.isAvailable && 'grayscale brightness-75'}`} />
                  {!item.isAvailable && (
                    <div className="absolute inset-0 flex items-center justify-center">
                      <span className="bg-red-600 text-white text-[9px] font-black px-3 py-1.5 rounded-full uppercase shadow-xl ring-2 ring-white">Esgotado</span>
                    </div>
                  )}
                </div>
                <div className="mb-4">
                  <h4 className="font-black text-sm text-gray-900 truncate leading-tight">{item.name}</h4>
                  <div className="flex justify-between items-center mt-1">
                    <p className="text-yellow-700 font-black text-xs">R$ {item.price.toFixed(2)}</p>
                    <span className="text-[8px] text-gray-400 font-bold uppercase">{item.category}</span>
                  </div>
                </div>
                <div className="flex gap-2">
                  <button onClick={() => { setEditingProduct(item); setIsProductModalOpen(true); }} className="flex-1 bg-white border border-gray-200 py-3 rounded-xl font-black text-[10px] uppercase hover:bg-gray-100 transition-colors">Editar</button>
                  <button onClick={() => onSaveProduct({ ...item, isAvailable: !item.isAvailable })} className={`px-4 py-3 rounded-xl font-black text-[10px] uppercase transition-all shadow-sm ${item.isAvailable ? 'bg-red-50 text-red-500 border border-red-100' : 'bg-green-500 text-white'}`}>
                    {item.isAvailable ? 'Marcar Falta' : 'Repor'}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Modal de Produto */}
      {isProductModalOpen && editingProduct && (
        <div className="fixed inset-0 z-[300] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/90 backdrop-blur-md" onClick={() => setIsProductModalOpen(false)} />
          <div className="relative bg-white w-full max-w-lg rounded-[4rem] p-10 shadow-2xl border-[12px] border-yellow-400 overflow-y-auto max-h-[95vh] no-scrollbar">
            <h3 className="text-3xl font-black mb-8 italic tracking-tighter">{editingProduct.id ? 'Atualizar Item' : 'Novo Item'}</h3>
            <div className="space-y-5">
              <div><label className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-2 mb-1 block">Nome do Produto</label><input type="text" className="w-full bg-gray-50 border border-gray-100 rounded-2xl px-6 py-4 text-sm font-bold outline-none" placeholder="Ex: Tapioca com Queijo" value={editingProduct.name || ''} onChange={e => setEditingProduct({...editingProduct, name: e.target.value})} /></div>
              <div className="grid grid-cols-2 gap-4">
                <div><label className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-2 mb-1 block">Preço (R$)</label><input type="number" step="0.01" className="w-full bg-gray-50 border border-gray-100 rounded-2xl px-6 py-4 text-sm font-bold outline-none" value={editingProduct.price || ''} onChange={e => setEditingProduct({...editingProduct, price: parseFloat(e.target.value)})} /></div>
                <div><label className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-2 mb-1 block">Categoria</label>
                  <select className="w-full bg-gray-50 border border-gray-100 rounded-2xl px-6 py-4 text-sm font-bold outline-none" value={editingProduct.category} onChange={e => setEditingProduct({...editingProduct, category: e.target.value as CategoryType})}>
                    {categories.filter(c => c !== 'Todos').map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
              </div>
              <div><label className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-2 mb-1 block">URL da Imagem</label><input type="text" className="w-full bg-gray-50 border border-gray-100 rounded-2xl px-6 py-4 text-sm font-bold outline-none" placeholder="https://..." value={editingProduct.image || ''} onChange={e => setEditingProduct({...editingProduct, image: e.target.value})} /></div>
              <div><label className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-2 mb-1 block">Descrição</label><textarea className="w-full bg-gray-50 border border-gray-100 rounded-2xl px-6 py-4 text-sm font-bold outline-none h-24" placeholder="Detalhes do item..." value={editingProduct.description || ''} onChange={e => setEditingProduct({...editingProduct, description: e.target.value})} /></div>
              <div className="flex items-center gap-4 p-5 bg-gray-50 rounded-3xl border border-gray-100">
                <input type="checkbox" id="avail_chk" className="w-6 h-6 accent-yellow-400 rounded-lg" checked={editingProduct.isAvailable} onChange={e => setEditingProduct({...editingProduct, isAvailable: e.target.checked})} />
                <label htmlFor="avail_chk" className="text-xs font-black uppercase tracking-widest cursor-pointer">Disponível no Cardápio</label>
              </div>
              <div className="grid grid-cols-2 gap-6 pt-6">
                <button onClick={() => setIsProductModalOpen(false)} className="py-5 bg-gray-100 rounded-3xl font-black uppercase text-xs tracking-widest">Cancelar</button>
                <button onClick={() => { onSaveProduct(editingProduct); setIsProductModalOpen(false); }} className="py-5 bg-black text-yellow-400 rounded-3xl font-black uppercase text-xs tracking-widest shadow-2xl active:scale-95 transition-all">Salvar Item</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Mesa */}
      {selectedTable && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/90 backdrop-blur-md" onClick={() => setSelectedTable(null)} />
          <div className="relative bg-white w-full max-w-3xl rounded-[4rem] p-10 shadow-2xl flex flex-col max-h-[92vh] border-[15px] border-yellow-400 animate-pop-in">
            <div className="flex justify-between items-start mb-8 shrink-0">
              <h3 className="text-5xl font-black italic tracking-tighter">Mesa {selectedTable.id}</h3>
              <button onClick={() => setSelectedTable(null)} className="p-3 hover:bg-gray-100 rounded-full"><CloseIcon size={32}/></button>
            </div>
            <div className="flex-1 overflow-y-auto no-scrollbar mb-8 pr-2">
              {tables.find(t => t.id === selectedTable.id)?.currentOrder ? (
                <div className="space-y-8">
                  <div className="bg-black text-white p-6 rounded-[2.5rem] flex gap-3 flex-wrap">
                    {(['pending', 'preparing', 'ready', 'delivered'] as OrderStatus[]).map(st => (
                      <button key={st} onClick={() => onUpdateTable(selectedTable.id, 'occupied', { ...tables.find(t => t.id === selectedTable.id)!.currentOrder!, status: st })} className={`flex-1 py-3 rounded-xl text-[9px] font-black uppercase border-2 transition-all ${tables.find(t => t.id === selectedTable.id)?.currentOrder?.status === st ? 'bg-yellow-400 text-black border-yellow-400 scale-105 shadow-lg' : 'border-white/20 text-white/30 hover:border-white'}`}>{getStatusLabel(st).text}</button>
                    ))}
                  </div>
                  {tables.find(t => t.id === selectedTable.id)?.currentOrder?.items.map((item, idx) => (
                    <div key={idx} className="flex justify-between items-center bg-gray-50 p-6 rounded-[2rem] border border-gray-100">
                      <span className="font-black text-lg">{item.quantity}x {item.name}</span>
                      <span className="font-black text-xl italic text-yellow-700">R$ {(item.price * item.quantity).toFixed(2)}</span>
                    </div>
                  ))}
                </div>
              ) : <div className="py-24 text-center opacity-20"><p className="text-4xl font-black italic uppercase">Mesa Livre</p></div>}
            </div>
            <div className="pt-8 border-t-4 border-gray-100 shrink-0">
              {tables.find(t => t.id === selectedTable.id)?.currentOrder ? (
                <div className="grid grid-cols-2 gap-6">
                  <button onClick={() => handlePrint(tables.find(t => t.id === selectedTable.id)!.currentOrder!)} className="bg-gray-100 py-6 rounded-[2.5rem] font-black uppercase text-xs tracking-widest border-2 border-gray-200 hover:bg-gray-200 transition-all">🖨️ Cupom</button>
                  <button onClick={() => { if(confirm(`Encerrar conta da Mesa ${selectedTable.id}?`)) { onUpdateTable(selectedTable.id, 'free'); setSelectedTable(null); } }} className="bg-green-500 text-white py-6 rounded-[2.5rem] font-black uppercase text-xs tracking-widest shadow-2xl border-b-8 border-green-700 active:translate-y-1 active:border-b-0 transition-all">Receber & Liberar</button>
                </div>
              ) : <button onClick={() => setSelectedTable(null)} className="w-full bg-yellow-400 py-6 rounded-[2.5rem] font-black uppercase text-xs tracking-widest shadow-xl">Aguardando Cliente</button>}
            </div>
          </div>
        </div>
      )}

      {/* Relatório de Caixa */}
      {showSalesReport && (
        <div className="fixed inset-0 z-[300] flex items-center justify-center p-4 bg-black/95">
          <div className="bg-white w-full max-w-xl rounded-[4rem] p-12 border-[12px] border-yellow-400 text-center relative animate-pop-in">
            <button onClick={() => setShowSalesReport(false)} className="absolute top-8 right-8 p-2 hover:bg-gray-100 rounded-full"><CloseIcon/></button>
            <h3 className="text-4xl font-black mb-10 italic tracking-tighter">Fechamento de Hoje</h3>
            <div className="space-y-6 text-left mb-10">
              {['Pix', 'Dinheiro', 'Cartão'].map(method => {
                const total = salesHistory.filter(o => o.paymentMethod === method).reduce((acc, o) => acc + o.total, 0);
                return (
                  <div key={method} className="flex justify-between items-end pb-4 border-b-2 border-gray-50">
                    <span className="font-black text-gray-400 uppercase text-[10px] tracking-widest">{method}</span>
                    <span className="font-black text-2xl italic">R$ {total.toFixed(2)}</span>
                  </div>
                );
              })}
              <div className="bg-yellow-50 p-8 rounded-[2.5rem] flex justify-between items-center mt-10">
                <span className="font-black text-yellow-800 uppercase text-xs">Total em Caixa</span>
                <span className="font-black text-4xl italic">R$ {salesHistory.reduce((acc, o) => acc + o.total, 0).toFixed(2)}</span>
              </div>
            </div>
            <button onClick={() => window.print()} className="w-full bg-black text-white py-6 rounded-[2.5rem] font-black uppercase text-xs tracking-widest shadow-2xl">Imprimir Relatório</button>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminPanel;
