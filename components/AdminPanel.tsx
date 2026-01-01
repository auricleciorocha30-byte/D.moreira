
import React, { useState, useMemo, useEffect } from 'react';
import { Table, Order, Product, CategoryType, OrderStatus } from '../types';
import { CloseIcon, TrashIcon, VolumeIcon } from './Icons';

interface AdminPanelProps {
  tables: Table[];
  menuItems: Product[];
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

const AdminPanel: React.FC<AdminPanelProps> = ({ tables, menuItems, audioEnabled, onToggleAudio, onUpdateTable, onAddToOrder, onRefreshData, salesHistory, onLogout, onSaveProduct, onDeleteProduct, dbStatus }) => {
  const [activeTab, setActiveTab] = useState<'tables' | 'delivery' | 'takeaway' | 'menu'>('tables');
  const [selectedTableId, setSelectedTableId] = useState<number | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  
  const [editingProduct, setEditingProduct] = useState<Partial<Product> | null>(null);
  const [isProductModalOpen, setIsProductModalOpen] = useState(false);

  const physicalTables = tables.filter(t => t.id <= 12).sort((a,b) => a.id - b.id);
  const deliveryTable = tables.find(t => t.id === 900);
  const counterTable = tables.find(t => t.id === 901);

  // Verificadores de novos pedidos para as abas
  const hasNewTables = physicalTables.some(t => t.status === 'occupied' && t.currentOrder?.isUpdated);
  const hasNewDelivery = deliveryTable?.status === 'occupied' && deliveryTable.currentOrder?.isUpdated;
  const hasNewTakeaway = counterTable?.status === 'occupied' && counterTable.currentOrder?.isUpdated;

  const selectedTable = useMemo(() => 
    tables.find(t => t.id === selectedTableId) || null
  , [tables, selectedTableId]);

  const filteredItemsToAdd = useMemo(() => 
    menuItems.filter(item => item.name.toLowerCase().includes(searchTerm.toLowerCase()))
  , [menuItems, searchTerm]);

  const openEditModal = (product: Product) => {
    setEditingProduct({ ...product });
    setIsProductModalOpen(true);
  };

  const openAddModal = () => {
    setEditingProduct({
      name: '',
      price: 0,
      category: 'Lanches',
      description: '',
      image: '',
      isAvailable: true
    });
    setIsProductModalOpen(true);
  };

  const getStatusLabel = (status: OrderStatus) => {
    switch (status) {
      case 'pending': return { text: 'Pendente', color: 'bg-red-500' };
      case 'preparing': return { text: 'Preparo', color: 'bg-orange-500' };
      case 'ready': return { text: 'Pronto', color: 'bg-blue-500' };
      case 'delivered': return { text: 'Entregue', color: 'bg-green-500' };
      default: return { text: 'Pendente', color: 'bg-red-500' };
    }
  };

  const handleOpenTable = (id: number) => {
    const table = tables.find(t => t.id === id);
    // Ao abrir a mesa, se ela tiver o alerta "isUpdated", limpamos ele no banco
    if (table?.currentOrder?.isUpdated) {
      onUpdateTable(id, 'occupied', { ...table.currentOrder, isUpdated: false });
    }
    setSelectedTableId(id);
  };

  const handlePrint = (order: Order, type: 'kitchen' | 'customer') => {
    const printWindow = window.open('', '_blank', 'width=800,height=800');
    if (!printWindow) return;

    const dateStr = new Date().toLocaleTimeString('pt-BR');
    const tableLabel = order.tableId === 900 ? 'ENTREGA' : order.tableId === 901 ? 'BALCÃO' : `MESA ${order.tableId}`;

    let content = `<html><body style="font-family:monospace;width:72mm;padding:5mm;font-size:12px;">`;
    if (type === 'kitchen') {
      content += `
          <h2 style="text-align:center;margin:0;">COZINHA</h2>
          <div style="text-align:center;font-size:24px;font-weight:bold;margin:10px 0;">${tableLabel}</div>
          <div style="text-align:center;margin-bottom:10px;">REF: ${order.customerName}</div>
          <hr/>
          ${order.items.map(i => `<div style="font-size:18px;margin-bottom:5px;"><b>${i.quantity}x</b> ${i.name.toUpperCase()}</div>`).join('')}
          <hr/>
      `;
    } else {
      content += `
          <h2 style="text-align:center;margin:0;">D.MOREIRA</h2>
          <p style="text-align:center;margin:5px 0;">Parada Obrigatória ⛽</p>
          <hr/>
          <p><b>REF:</b> ${tableLabel}</p>
          <p><b>CLIENTE:</b> ${order.customerName}</p>
          <p><b>HORA:</b> ${dateStr}</p>
          <hr/>
          <table style="width:100%;border-collapse:collapse;">
            ${order.items.map(i => `<tr><td>${i.quantity}x ${i.name}</td><td style="text-align:right;">R$ ${(i.price*i.quantity).toFixed(2)}</td></tr>`).join('')}
          </table>
          <hr/><div style="text-align:right;font-size:18px;"><b>TOTAL: R$ ${order.total.toFixed(2)}</b></div><p>PAGTO: ${order.paymentMethod}</p>
          ${order.address ? `<p><b>ENDEREÇO:</b> ${order.address}</p><hr/>` : ''}
      `;
    }
    content += `<script>window.print();window.close();</script></body></html>`;
    printWindow.document.write(content);
    printWindow.document.close();
  };

  const TableCard: React.FC<{ table: Table }> = ({ table }) => {
    const isOccupied = table.status === 'occupied' && table.currentOrder;
    const statusInfo = isOccupied ? getStatusLabel(table.currentOrder!.status) : null;
    return (
      <button 
        onClick={() => handleOpenTable(table.id)} 
        className={`p-6 rounded-[2.5rem] border-4 transition-all flex flex-col items-center justify-center gap-2 relative h-44 overflow-hidden ${!isOccupied ? 'bg-white border-gray-100 hover:border-yellow-400' : 'bg-yellow-400 border-black shadow-xl scale-105'}`}
      >
        {statusInfo && isOccupied && <div className={`absolute top-4 left-4 ${statusInfo.color} text-white text-[8px] font-black px-2 py-0.5 rounded-full uppercase`}>{statusInfo.text}</div>}
        
        {isOccupied && table.currentOrder?.isUpdated && (
          <div className="absolute top-4 right-4 bg-red-600 text-white text-[8px] font-black px-3 py-1 rounded-full uppercase animate-pulse shadow-lg ring-2 ring-white z-10 flex items-center gap-1">
            <span className="w-1.5 h-1.5 bg-white rounded-full"></span>
            NOVO
          </div>
        )}

        <span className="text-4xl font-black italic">{table.id > 800 ? (table.id === 900 ? '🚚' : '🛍️') : table.id}</span>
        <span className={`text-[9px] font-black uppercase px-3 py-1 rounded-full ${!isOccupied ? 'bg-gray-100 text-gray-400' : 'bg-black text-white'}`}>
          {table.id > 800 ? (!isOccupied ? 'Sem Pedidos' : (table.id === 900 ? 'Entrega Ativa' : 'Balcão Ativo')) : (!isOccupied ? 'Livre' : 'Ocupada')}
        </span>
        
        {isOccupied && (
          <div className="w-full text-center mt-1">
            <span className="text-[10px] font-black block truncate px-2">{table.currentOrder!.customerName}</span>
            {table.id === 900 && table.currentOrder?.address && (
              <span className="text-[8px] font-bold text-black/60 block truncate px-2 mt-0.5 uppercase tracking-tighter">
                {table.currentOrder.address}
              </span>
            )}
          </div>
        )}
      </button>
    );
  };

  const handleProductSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingProduct?.name || editingProduct.price === undefined || !editingProduct?.category) {
      return alert('Preencha os campos obrigatórios (Nome, Preço e Categoria).');
    }
    onSaveProduct(editingProduct);
    setIsProductModalOpen(false);
    setEditingProduct(null);
  };

  return (
    <div className="w-full">
      <div className="bg-white p-6 rounded-[3rem] shadow-sm border border-gray-100 mb-10">
        <div className="flex flex-col md:flex-row justify-between items-center gap-6">
          <div className="flex items-center gap-4">
            <h2 className="text-3xl font-black italic tracking-tighter">Admin D.Moreira</h2>
            <button 
              onClick={onToggleAudio}
              className={`p-3 rounded-full transition-all flex items-center gap-2 ${audioEnabled ? 'bg-yellow-400 text-black shadow-md' : 'bg-gray-100 text-gray-400'}`}
              title={audioEnabled ? "Alertas Ativos" : "Alertas Mudos"}
            >
              <VolumeIcon muted={!audioEnabled} />
              <span className="text-[8px] font-black uppercase tracking-widest">{audioEnabled ? 'Ativo' : 'Ativar'}</span>
            </button>
          </div>
          <div className="flex gap-2 sm:gap-4 overflow-x-auto no-scrollbar w-full md:w-auto p-1">
            <button onClick={() => setActiveTab('tables')} className={`relative whitespace-nowrap px-6 py-3 rounded-2xl text-[11px] font-black uppercase tracking-widest transition-all ${activeTab === 'tables' ? 'bg-yellow-400 text-black shadow-lg scale-105' : 'text-gray-400 hover:bg-gray-50'}`}>
              Mesas {hasNewTables && <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-600 rounded-full border-[3px] border-white animate-pulse shadow-sm"></span>}
            </button>
            <button onClick={() => setActiveTab('delivery')} className={`relative whitespace-nowrap px-6 py-3 rounded-2xl text-[11px] font-black uppercase tracking-widest transition-all ${activeTab === 'delivery' ? 'bg-yellow-400 text-black shadow-lg scale-105' : 'text-gray-400 hover:bg-gray-50'}`}>
              Entregas {hasNewDelivery && <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-600 rounded-full border-[3px] border-white animate-pulse shadow-sm"></span>}
            </button>
            <button onClick={() => setActiveTab('takeaway')} className={`relative whitespace-nowrap px-6 py-3 rounded-2xl text-[11px] font-black uppercase tracking-widest transition-all ${activeTab === 'takeaway' ? 'bg-yellow-400 text-black shadow-lg scale-105' : 'text-gray-400 hover:bg-gray-50'}`}>
              Retiradas {hasNewTakeaway && <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-600 rounded-full border-[3px] border-white animate-pulse shadow-sm"></span>}
            </button>
            <button onClick={() => setActiveTab('menu')} className={`whitespace-nowrap px-6 py-3 rounded-2xl text-[11px] font-black uppercase tracking-widest transition-all ${activeTab === 'menu' ? 'bg-yellow-400 text-black shadow-lg' : 'text-gray-400 hover:bg-gray-50'}`}>Cardápio</button>
            <button onClick={onLogout} className="whitespace-nowrap text-red-500 font-black text-[11px] uppercase ml-4 px-4">Sair</button>
          </div>
        </div>
      </div>

      {(activeTab === 'tables' || activeTab === 'delivery' || activeTab === 'takeaway') && (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-6 animate-fade-in">
          {activeTab === 'tables' && physicalTables.map(t => <TableCard key={t.id} table={t} />)}
          {activeTab === 'delivery' && deliveryTable && <TableCard table={deliveryTable} />}
          {activeTab === 'takeaway' && counterTable && <TableCard table={counterTable} />}
        </div>
      )}

      {activeTab === 'menu' && (
        <div className="bg-white p-8 rounded-[3.5rem] shadow-sm border border-gray-100">
          <div className="flex flex-col sm:flex-row justify-between items-center mb-10 gap-4">
            <h3 className="text-3xl font-black italic tracking-tighter">Gestão do Cardápio</h3>
            <button onClick={openAddModal} className="w-full sm:w-auto bg-black text-yellow-400 px-8 py-4 rounded-2xl font-black text-xs uppercase shadow-xl transition-transform active:scale-95 hover:brightness-110">+ Adicionar Produto</button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {menuItems.map(item => (
              <div key={item.id} className={`group bg-gray-50 p-5 rounded-[2.5rem] border transition-all ${!item.isAvailable ? 'opacity-60 grayscale bg-gray-200' : 'hover:border-yellow-400'}`}>
                <div className="relative overflow-hidden rounded-2xl mb-4 aspect-square">
                  <img src={item.image} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" />
                  {!item.isAvailable && <div className="absolute inset-0 bg-black/60 flex items-center justify-center font-black text-white uppercase text-[10px] tracking-widest">Fora de Estoque</div>}
                </div>
                <h4 className="font-black text-sm truncate mb-1">{item.name}</h4>
                <p className="text-yellow-700 font-black text-xs mb-4">R$ {item.price.toFixed(2).replace('.', ',')}</p>
                <div className="flex gap-2">
                  <button onClick={() => openEditModal(item)} className="flex-1 bg-white py-3 rounded-xl font-black text-[10px] uppercase border shadow-sm hover:bg-gray-100">Editar</button>
                  <button onClick={() => { if(confirm(`Excluir ${item.name} permanentemente?`)) onDeleteProduct(item.id); }} className="p-3 bg-red-50 text-red-500 rounded-xl hover:bg-red-500 hover:text-white transition-all"><TrashIcon size={16}/></button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {isProductModalOpen && (
        <div className="fixed inset-0 z-[300] flex items-center justify-center p-6 bg-black/90 backdrop-blur-md">
          <div className="bg-white w-full max-w-lg rounded-[3.5rem] p-10 shadow-2xl relative overflow-hidden">
             <button onClick={() => setIsProductModalOpen(false)} className="absolute top-6 right-6 p-2 bg-gray-100 rounded-full hover:bg-gray-200"><CloseIcon size={20}/></button>
             <h3 className="text-3xl font-black italic mb-8">{editingProduct?.id ? 'Editar Produto' : 'Novo Produto'}</h3>
             <form onSubmit={handleProductSubmit} className="space-y-4">
                <div>
                   <label className="text-[9px] font-black uppercase tracking-widest text-gray-400 ml-2 mb-1 block">Nome do Produto *</label>
                   <input type="text" placeholder="Ex: X-Salada Especial" value={editingProduct?.name || ''} onChange={e => setEditingProduct({...editingProduct!, name: e.target.value})} className="w-full bg-gray-50 border rounded-2xl px-6 py-4 text-sm font-bold outline-none focus:border-yellow-400" required />
                </div>
                <div className="grid grid-cols-2 gap-4">
                   <div>
                      <label className="text-[9px] font-black uppercase tracking-widest text-gray-400 ml-2 mb-1 block">Preço (R$) *</label>
                      <input type="number" step="0.01" placeholder="0.00" value={editingProduct?.price !== undefined ? editingProduct.price : ''} onChange={e => setEditingProduct({...editingProduct!, price: parseFloat(e.target.value) || 0})} className="w-full bg-gray-50 border rounded-2xl px-6 py-4 text-sm font-bold outline-none focus:border-yellow-400" required />
                   </div>
                   <div>
                      <label className="text-[9px] font-black uppercase tracking-widest text-gray-400 ml-2 mb-1 block">Categoria *</label>
                      <select value={editingProduct?.category} onChange={e => setEditingProduct({...editingProduct!, category: e.target.value as CategoryType})} className="w-full bg-gray-50 border rounded-2xl px-6 py-4 text-sm font-bold outline-none focus:border-yellow-400">
                         <option value="Lanches">Lanches</option><option value="Cafeteria">Cafeteria</option><option value="Bebidas">Bebidas</option><option value="Combos">Combos</option><option value="Conveniência">Conveniência</option>
                      </select>
                   </div>
                </div>
                <div>
                   <label className="text-[9px] font-black uppercase tracking-widest text-gray-400 ml-2 mb-1 block">URL da Imagem</label>
                   <input type="text" placeholder="https://..." value={editingProduct?.image || ''} onChange={e => setEditingProduct({...editingProduct!, image: e.target.value})} className="w-full bg-gray-50 border rounded-2xl px-6 py-4 text-sm font-bold outline-none focus:border-yellow-400" />
                </div>
                <div>
                   <label className="text-[9px] font-black uppercase tracking-widest text-gray-400 ml-2 mb-1 block">Descrição</label>
                   <textarea placeholder="Detalhes do produto..." value={editingProduct?.description || ''} onChange={e => setEditingProduct({...editingProduct!, description: e.target.value})} className="w-full bg-gray-50 border rounded-2xl px-6 py-4 text-sm font-bold outline-none focus:border-yellow-400 h-24" />
                </div>
                
                <div className="flex items-center justify-between bg-gray-50 p-4 rounded-2xl border">
                   <span className="font-black text-[10px] uppercase tracking-widest text-gray-500">Item em Estoque (Ativo)</span>
                   <button 
                    type="button" 
                    onClick={() => setEditingProduct({...editingProduct!, isAvailable: !editingProduct?.isAvailable})} 
                    className={`w-14 h-8 rounded-full transition-all flex items-center px-1 shadow-inner ${editingProduct?.isAvailable ? 'bg-green-500 justify-end' : 'bg-gray-300 justify-start'}`}
                   >
                      <div className="w-6 h-6 bg-white rounded-full shadow-lg"></div>
                   </button>
                </div>

                <div className="flex gap-4 pt-4">
                  <button type="button" onClick={() => setIsProductModalOpen(false)} className="flex-1 bg-gray-100 py-5 rounded-2xl font-black text-xs uppercase hover:bg-gray-200 transition-colors">Cancelar</button>
                  <button type="submit" className="flex-1 bg-black text-yellow-400 py-5 rounded-2xl font-black text-xs uppercase shadow-xl hover:brightness-110 active:scale-95 transition-all">Salvar Produto</button>
                </div>
             </form>
          </div>
        </div>
      )}

      {selectedTable && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/90 backdrop-blur-md" onClick={() => setSelectedTableId(null)} />
          <div className="relative bg-white w-full max-w-6xl rounded-[4rem] p-8 md:p-12 shadow-2xl flex flex-col md:flex-row gap-8 max-h-[92vh] border-[12px] border-yellow-400 overflow-hidden">
            <button onClick={() => setSelectedTableId(null)} className="absolute top-6 right-6 p-3 bg-gray-100 rounded-full hover:bg-gray-200 z-10"><CloseIcon size={24} /></button>
            <div className="flex-[1.2] flex flex-col min-w-0">
              <div className="flex items-center gap-4 mb-4">
                <h3 className="text-5xl font-black italic tracking-tighter">{selectedTable.id === 900 ? '🚚 Entregas' : selectedTable.id === 901 ? '🛍️ Balcão' : 'Mesa ' + selectedTable.id}</h3>
              </div>

              {selectedTable.currentOrder?.address && (
                <div className="bg-red-50 border-2 border-red-100 p-6 rounded-[2rem] mb-6 shadow-sm">
                  <p className="text-[10px] font-black uppercase text-red-600 tracking-widest mb-1">Endereço de Entrega</p>
                  <p className="text-lg font-bold text-gray-900 leading-tight">{selectedTable.currentOrder.address}</p>
                </div>
              )}

              <div className="flex-1 overflow-y-auto no-scrollbar space-y-4 mb-6 pr-2">
                {selectedTable.status === 'occupied' && selectedTable.currentOrder ? (
                  <>
                    <div className="flex gap-2 flex-wrap mb-6">
                      {(['pending', 'preparing', 'ready', 'delivered'] as OrderStatus[]).map(st => (
                        <button key={st} onClick={() => onUpdateTable(selectedTable.id, 'occupied', { ...selectedTable.currentOrder!, status: st })} className={`px-4 py-3 rounded-xl text-[10px] font-black uppercase border-2 transition-all flex-1 min-w-[100px] ${selectedTable.currentOrder?.status === st ? 'bg-black text-yellow-400 border-black shadow-lg scale-105' : 'bg-gray-50 text-gray-400 border-gray-100 hover:border-yellow-400'}`}>{getStatusLabel(st).text}</button>
                      ))}
                    </div>
                    {selectedTable.currentOrder.items.map((item, idx) => (
                      <div key={idx} className="flex justify-between items-center bg-gray-50 p-5 rounded-2xl border border-gray-100 group">
                        <div className="flex items-center gap-3"><span className="bg-black text-white w-7 h-7 rounded-full flex items-center justify-center text-[11px] font-black">{item.quantity}</span><span className="font-black text-sm">{item.name}</span></div>
                        <span className="font-black text-sm text-yellow-700">R$ {(item.price * item.quantity).toFixed(2).replace('.', ',')}</span>
                      </div>
                    ))}
                  </>
                ) : (
                  <div className="flex flex-col items-center justify-center py-20 bg-gray-50 rounded-3xl border-2 border-dashed border-gray-200 text-center"><p className="text-gray-400 font-black uppercase text-[10px] tracking-widest">Sem comanda ativa.<br/>Adicione itens ao lado.</p></div>
                )}
              </div>
              {selectedTable.status === 'occupied' && selectedTable.currentOrder && (
                <div className="pt-6 border-t space-y-4">
                  <div className="flex justify-between items-end"><span className="text-gray-400 font-black uppercase text-[10px]">Total Acumulado</span><span className="text-4xl font-black italic">R$ {selectedTable.currentOrder.total.toFixed(2).replace('.', ',')}</span></div>
                  <div className="grid grid-cols-3 gap-3">
                    <button onClick={() => handlePrint(selectedTable.currentOrder!, 'kitchen')} className="bg-black text-white py-5 rounded-2xl font-black uppercase text-[10px] hover:brightness-110 border shadow-sm">COZINHA</button>
                    <button onClick={() => handlePrint(selectedTable.currentOrder!, 'customer')} className="bg-gray-100 py-5 rounded-2xl font-black uppercase text-[10px] hover:bg-gray-200 border shadow-sm">CLIENTE</button>
                    <button onClick={() => { if(confirm('Finalizar conta e liberar mesa?')) onUpdateTable(selectedTable.id, 'free'); setSelectedTableId(null); }} className="bg-green-600 text-white py-5 rounded-2xl font-black uppercase text-[10px] shadow-xl hover:bg-green-700 transition-all">FECHAR</button>
                  </div>
                </div>
              )}
            </div>
            <div className="flex-1 bg-gray-50 rounded-[3rem] p-8 flex flex-col min-w-0 border border-gray-100">
              <h4 className="text-xl font-black italic mb-4">Lançamento Rápido</h4>
              <input type="text" placeholder="Buscar no cardápio..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="w-full bg-white border border-gray-200 rounded-2xl px-5 py-4 text-sm font-bold mb-6 outline-none focus:ring-4 focus:ring-yellow-400/20" />
              <div className="flex-1 overflow-y-auto no-scrollbar space-y-3">
                {filteredItemsToAdd.map(item => (
                  <button 
                    key={item.id} 
                    disabled={!item.isAvailable}
                    onClick={() => { if (selectedTable.status === 'free' || !selectedTable.currentOrder) { onUpdateTable(selectedTable.id, 'occupied', { id: 'NEW-'+Date.now(), customerName: 'Atendimento Local', items: [{...item, quantity: 1}], total: item.price, paymentMethod: 'Pix', timestamp: new Date().toISOString(), tableId: selectedTable.id, orderType: selectedTable.id > 800 ? (selectedTable.id === 900 ? 'delivery' : 'counter') : 'table', status: 'pending' }); } else { onAddToOrder(selectedTable.id, item); } }} 
                    className={`w-full flex items-center gap-4 bg-white p-4 rounded-2xl border hover:border-yellow-400 transition-all text-left ${!item.isAvailable ? 'opacity-40 grayscale pointer-events-none' : 'shadow-sm active:scale-95'}`}
                  >
                    <img src={item.image} className="w-12 h-12 rounded-xl object-cover" />
                    <div className="flex-1 min-w-0"><p className="font-black text-xs truncate">{item.name}</p><p className="text-yellow-600 font-black text-[10px]">R$ {item.price.toFixed(2)}</p></div>
                    <div className="bg-yellow-400 p-2 rounded-lg text-black"><svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M12 4v16m8-8H4" /></svg></div>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminPanel;
