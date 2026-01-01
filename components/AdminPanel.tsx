
import React, { useState, useMemo } from 'react';
import { Table, Order, Product, CategoryType, OrderStatus } from '../types';
import { CloseIcon, TrashIcon } from './Icons';
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
  const [activeTab, setActiveTab] = useState<'tables' | 'delivery' | 'takeaway' | 'menu'>('tables');
  const [selectedTableId, setSelectedTableId] = useState<number | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  
  const [editingProduct, setEditingProduct] = useState<Partial<Product> | null>(null);
  const [isProductModalOpen, setIsProductModalOpen] = useState(false);

  // Filtros de mesas
  const physicalTables = tables.filter(t => t.id <= 12);
  const deliveryTable = tables.find(t => t.id === 900);
  const counterTable = tables.find(t => t.id === 901);

  const categories: (CategoryType | 'Todos')[] = ['Todos', 'Combos', 'Cafeteria', 'Lanches', 'Bebidas', 'Conveniência'];

  const selectedTable = useMemo(() => 
    tables.find(t => t.id === selectedTableId) || null
  , [tables, selectedTableId]);

  const filteredItemsToAdd = useMemo(() => 
    menuItems.filter(item => item.name.toLowerCase().includes(searchTerm.toLowerCase()))
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

  const handlePrint = (order: Order) => {
    const printWindow = window.open('', '_blank', 'width=800,height=800');
    if (!printWindow) return;
    const content = `<html><body style="font-family:monospace;width:72mm;padding:5mm;">
      <h2 style="text-align:center;">D.MOREIRA</h2><hr/>
      <p><b>REF:</b> ${order.tableId === 900 ? 'ENTREGA' : order.tableId === 901 ? 'RETIRADA' : 'MESA ' + order.tableId}</p>
      <p><b>DATA:</b> ${new Date(order.timestamp).toLocaleString()}</p>
      <p><b>CLIENTE:</b> ${order.customerName}</p><hr/>
      ${order.items.map(i => `<div>${i.quantity}x ${i.name} - R$ ${(i.price*i.quantity).toFixed(2)}</div>`).join('')}<hr/>
      <h3 style="text-align:right;">TOTAL: R$ ${order.total.toFixed(2)}</h3>
      <p>PAGTO: ${order.paymentMethod}</p>
      <script>window.print();window.close();</script></body></html>`;
    printWindow.document.write(content);
    printWindow.document.close();
  };

  // Fix: Use React.FC to define TableCard so it accepts the 'key' prop correctly when rendered in a list.
  const TableCard: React.FC<{ table: Table }> = ({ table }) => {
    const statusInfo = table.currentOrder ? getStatusLabel(table.currentOrder.status) : null;
    return (
      <button onClick={() => setSelectedTableId(table.id)} className={`p-6 rounded-[2.5rem] border-4 transition-all flex flex-col items-center justify-center gap-2 relative h-44 ${table.status === 'free' ? 'bg-white border-gray-100 hover:border-yellow-400' : 'bg-yellow-400 border-black shadow-xl scale-105'}`}>
        {statusInfo && <div className={`absolute top-4 left-4 ${statusInfo.color} text-white text-[8px] font-black px-2 py-0.5 rounded-full uppercase`}>{statusInfo.text}</div>}
        <span className="text-4xl font-black italic">{table.id > 800 ? (table.id === 900 ? '🚚' : '🛍️') : table.id}</span>
        <span className={`text-[9px] font-black uppercase px-3 py-1 rounded-full ${table.status === 'free' ? 'bg-gray-100 text-gray-400' : 'bg-black text-white'}`}>{table.id > 800 ? (table.status === 'free' ? 'Sem Pedido' : 'Aberta') : (table.status === 'free' ? 'Livre' : 'Ocupada')}</span>
        {table.currentOrder && <span className="text-[10px] font-bold truncate w-full text-center px-2">{table.currentOrder.customerName}</span>}
      </button>
    );
  };

  return (
    <div className="w-full">
      <div className="bg-white p-6 rounded-[3rem] shadow-sm border border-gray-100 mb-10">
        <div className="flex flex-col md:flex-row justify-between items-center gap-6">
          <h2 className="text-3xl font-black italic tracking-tighter">D.Moreira Admin</h2>
          <div className="flex gap-4">
            <button onClick={() => setActiveTab('tables')} className={`px-5 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest ${activeTab === 'tables' ? 'bg-yellow-400 text-black' : 'text-gray-400 hover:bg-gray-50'}`}>Mesas</button>
            <button onClick={() => setActiveTab('delivery')} className={`px-5 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest ${activeTab === 'delivery' ? 'bg-yellow-400 text-black' : 'text-gray-400 hover:bg-gray-50'}`}>Entregas</button>
            <button onClick={() => setActiveTab('takeaway')} className={`px-5 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest ${activeTab === 'takeaway' ? 'bg-yellow-400 text-black' : 'text-gray-400 hover:bg-gray-50'}`}>Retiradas</button>
            <button onClick={() => setActiveTab('menu')} className={`px-5 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest ${activeTab === 'menu' ? 'bg-yellow-400 text-black' : 'text-gray-400 hover:bg-gray-50'}`}>Cardápio</button>
            <button onClick={onLogout} className="text-red-500 font-black text-[10px] uppercase ml-4">Sair</button>
          </div>
        </div>
      </div>

      {activeTab === 'tables' && (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-6">
          {physicalTables.map(t => <TableCard key={t.id} table={t} />)}
        </div>
      )}

      {activeTab === 'delivery' && (
        <div className="max-w-md mx-auto">
          {deliveryTable && <TableCard table={deliveryTable} />}
          <p className="text-center text-gray-400 text-[10px] font-bold uppercase mt-6 tracking-widest italic">Pedidos de entrega acumulados aqui</p>
        </div>
      )}

      {activeTab === 'takeaway' && (
        <div className="max-w-md mx-auto">
          {counterTable && <TableCard table={counterTable} />}
          <p className="text-center text-gray-400 text-[10px] font-bold uppercase mt-6 tracking-widest italic">Pedidos de balcão acumulados aqui</p>
        </div>
      )}

      {activeTab === 'menu' && (
        <div className="bg-white p-8 rounded-[3.5rem] shadow-sm border border-gray-100">
          <div className="flex justify-between items-center mb-10">
            <h3 className="text-3xl font-black italic tracking-tighter">Produtos</h3>
            <button onClick={() => { setEditingProduct({ category: 'Lanches', isAvailable: true }); setIsProductModalOpen(true); }} className="bg-black text-yellow-400 px-8 py-4 rounded-2xl font-black text-xs uppercase shadow-xl">+ Novo Item</button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {menuItems.map(item => (
              <div key={item.id} className="bg-gray-50 p-5 rounded-[2.5rem] border border-gray-100">
                <img src={item.image} className="w-full h-32 object-cover rounded-2xl mb-4" />
                <h4 className="font-black text-sm truncate">{item.name}</h4>
                <p className="text-yellow-700 font-black text-xs mb-4">R$ {item.price.toFixed(2)}</p>
                <div className="flex gap-2">
                  <button onClick={() => { setEditingProduct(item); setIsProductModalOpen(true); }} className="flex-1 bg-white py-3 rounded-xl font-black text-[10px] uppercase border">Editar</button>
                  <button onClick={() => onSaveProduct({ ...item, isAvailable: !item.isAvailable })} className={`px-4 py-3 rounded-xl font-black text-[10px] uppercase ${item.isAvailable ? 'bg-red-50 text-red-600' : 'bg-green-600 text-white'}`}>{item.isAvailable ? 'Esgotou' : 'Repor'}</button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {selectedTable && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/90 backdrop-blur-md" onClick={() => setSelectedTableId(null)} />
          <div className="relative bg-white w-full max-w-5xl rounded-[4rem] p-8 md:p-12 shadow-2xl flex flex-col md:flex-row gap-8 max-h-[92vh] border-[12px] border-yellow-400 overflow-hidden">
            <div className="flex-1 flex flex-col min-w-0">
              <h3 className="text-5xl font-black italic tracking-tighter mb-4">{selectedTable.id > 800 ? (selectedTable.id === 900 ? 'Entregas' : 'Balcão') : 'Mesa ' + selectedTable.id}</h3>
              <div className="flex-1 overflow-y-auto no-scrollbar space-y-4 mb-6">
                {selectedTable.currentOrder ? (
                  <>
                    <div className="flex gap-2 flex-wrap mb-4">
                      {(['pending', 'preparing', 'ready', 'delivered'] as OrderStatus[]).map(st => (
                        <button key={st} onClick={() => onUpdateTable(selectedTable.id, 'occupied', { ...selectedTable.currentOrder!, status: st })} className={`px-4 py-2 rounded-xl text-[8px] font-black uppercase border-2 ${selectedTable.currentOrder?.status === st ? 'bg-yellow-400 text-black border-yellow-400' : 'bg-black text-white/40 border-white/10'}`}>{getStatusLabel(st).text}</button>
                      ))}
                    </div>
                    {selectedTable.currentOrder.items.map((item, idx) => (
                      <div key={idx} className="flex justify-between items-center bg-gray-50 p-4 rounded-2xl">
                        <span className="font-black text-sm">{item.quantity}x {item.name}</span>
                        <span className="font-black text-sm text-yellow-700">R$ {(item.price * item.quantity).toFixed(2)}</span>
                      </div>
                    ))}
                  </>
                ) : <p className="text-center text-gray-400 font-bold uppercase py-10">Sem pedidos ativos</p>}
              </div>
              {selectedTable.currentOrder ? (
                <div className="pt-6 border-t space-y-4">
                  <div className="flex justify-between items-end"><span className="text-gray-400 font-black uppercase text-[10px]">Total</span><span className="text-3xl font-black italic">R$ {selectedTable.currentOrder.total.toFixed(2)}</span></div>
                  <div className="grid grid-cols-2 gap-4">
                    <button onClick={() => handlePrint(selectedTable.currentOrder!)} className="bg-gray-100 py-4 rounded-2xl font-black uppercase text-[10px]">Imprimir</button>
                    <button onClick={() => { if(confirm('Fechar conta?')) onUpdateTable(selectedTable.id, 'free'); setSelectedTableId(null); }} className="bg-green-500 text-white py-4 rounded-2xl font-black uppercase text-[10px]">Finalizar</button>
                  </div>
                </div>
              ) : <button onClick={() => onUpdateTable(selectedTable.id, 'occupied', { id: 'NEW', customerName: 'Conveniência', items: [], total: 0, paymentMethod: 'Pix', timestamp: new Date().toISOString(), tableId: selectedTable.id, orderType: 'table', status: 'pending' })} className="w-full bg-yellow-400 py-5 rounded-3xl font-black uppercase text-[10px]">Abrir Pedido</button>}
            </div>
            <div className="hidden md:flex flex-col w-80 bg-gray-50 rounded-[2.5rem] p-6 border">
              <input type="text" placeholder="Buscar no cardápio..." className="w-full bg-white border rounded-2xl px-4 py-3 text-xs font-bold mb-4 outline-none" value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
              <div className="flex-1 overflow-y-auto no-scrollbar space-y-3">
                {filteredItemsToAdd.map(item => (
                  <button key={item.id} onClick={() => selectedTable.currentOrder && onAddToOrder(selectedTable.id, item)} disabled={!selectedTable.currentOrder || !item.isAvailable} className={`w-full text-left bg-white p-3 rounded-2xl border flex gap-3 ${(!selectedTable.currentOrder || !item.isAvailable) && 'opacity-40 grayscale'}`}>
                    <img src={item.image} className="w-10 h-10 object-cover rounded-lg" />
                    <div className="flex-1 min-w-0"><p className="text-[10px] font-black truncate">{item.name}</p><p className="text-[10px] font-black text-yellow-700">R$ {item.price.toFixed(2)}</p></div>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {isProductModalOpen && editingProduct && (
        <div className="fixed inset-0 z-[300] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/90 backdrop-blur-md" onClick={() => setIsProductModalOpen(false)} />
          <div className="relative bg-white w-full max-w-lg rounded-[4rem] p-10 shadow-2xl border-[12px] border-yellow-400 overflow-y-auto max-h-[90vh]">
            <h3 className="text-3xl font-black mb-8 italic">Editar Produto</h3>
            <div className="space-y-4">
              <input type="text" className="w-full bg-gray-50 border rounded-2xl px-6 py-4 text-sm font-bold" placeholder="Nome" value={editingProduct.name || ''} onChange={e => setEditingProduct({...editingProduct, name: e.target.value})} />
              <input type="text" className="w-full bg-gray-50 border rounded-2xl px-6 py-4 text-sm font-bold" placeholder="URL da Imagem" value={editingProduct.image || ''} onChange={e => setEditingProduct({...editingProduct, image: e.target.value})} />
              <div className="grid grid-cols-2 gap-4">
                <input type="number" className="w-full bg-gray-50 border rounded-2xl px-6 py-4 text-sm font-bold" placeholder="Preço" value={editingProduct.price || ''} onChange={e => setEditingProduct({...editingProduct, price: parseFloat(e.target.value)})} />
                <select className="w-full bg-gray-50 border rounded-2xl px-6 py-4 text-sm font-bold" value={editingProduct.category} onChange={e => setEditingProduct({...editingProduct, category: e.target.value as any})}>
                  {categories.filter(c => c !== 'Todos').map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div className="flex items-center gap-3 bg-gray-50 p-4 rounded-2xl">
                <input type="checkbox" id="avail" className="w-6 h-6 accent-yellow-400" checked={editingProduct.isAvailable !== false} onChange={e => setEditingProduct({...editingProduct, isAvailable: e.target.checked})} />
                <label htmlFor="avail" className="text-xs font-black uppercase">Disponível</label>
              </div>
              <div className="flex gap-4 pt-6">
                <button onClick={() => setIsProductModalOpen(false)} className="flex-1 py-4 bg-gray-100 rounded-2xl font-black uppercase text-[10px]">Sair</button>
                <button onClick={() => { onSaveProduct(editingProduct); setIsProductModalOpen(false); }} className="flex-1 py-4 bg-black text-yellow-400 rounded-2xl font-black uppercase text-[10px]">Salvar</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminPanel;
