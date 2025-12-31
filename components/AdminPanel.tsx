
import React, { useState, useMemo, useEffect, useRef } from 'react';
import { Table, Order, PrintConfig, Product, CategoryType, OrderStatus } from '../types';
import { MENU_ITEMS } from '../constants';
import { CloseIcon, TrashIcon } from './Icons';

interface AdminPanelProps {
  tables: Table[];
  onUpdateTable: (tableId: number, status: 'free' | 'occupied', order?: Order | null) => void;
  onAddToOrder: (tableId: number, product: Product) => void;
  onRefreshData: () => void;
  salesHistory: Order[];
  onLogout: () => void;
}

const AdminPanel: React.FC<AdminPanelProps> = ({ tables, onUpdateTable, onAddToOrder, onRefreshData, salesHistory, onLogout }) => {
  const [selectedTable, setSelectedTable] = useState<Table | null>(null);
  const [printConfig, setPrintConfig] = useState<PrintConfig>({ width: '80mm' });
  const [isAddingItems, setIsAddingItems] = useState(false);
  const [showSalesReport, setShowSalesReport] = useState(false);
  const [adminCategory, setAdminCategory] = useState<CategoryType | 'Todos'>('Todos');
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isSoundEnabled, setIsSoundEnabled] = useState(true);

  const currentTableData = useMemo(() => 
    tables.find(t => t.id === selectedTable?.id), 
    [tables, selectedTable]
  );

  const totalItemsInTables = useMemo(() => {
    return tables.reduce((acc, table) => {
      if (!table.currentOrder) return acc;
      return acc + table.currentOrder.items.reduce((sum, item) => sum + item.quantity, 0);
    }, 0);
  }, [tables]);

  const lastTotalItemsRef = useRef(totalItemsInTables);

  const playNotification = () => {
    if (!isSoundEnabled) return;
    const audio = new Audio('https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3');
    audio.play().catch(() => {});
  };

  useEffect(() => {
    if (totalItemsInTables > lastTotalItemsRef.current) {
      playNotification();
    }
    lastTotalItemsRef.current = totalItemsInTables;
  }, [totalItemsInTables, isSoundEnabled]);

  const handleStatusChange = (newStatus: OrderStatus) => {
    if (!currentTableData?.currentOrder) return;
    onUpdateTable(currentTableData.id, 'occupied', {
      ...currentTableData.currentOrder,
      status: newStatus
    });
  };

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

  const filteredAdminItems = useMemo(() => {
    if (adminCategory === 'Todos') return MENU_ITEMS;
    return MENU_ITEMS.filter(item => item.category === adminCategory);
  }, [adminCategory]);

  const handleManualRefresh = () => {
    setIsRefreshing(true);
    onRefreshData();
    setTimeout(() => setIsRefreshing(false), 600);
  };

  const handlePrint = (order: Order) => {
    const printWindow = window.open('', '_blank', 'width=800,height=800');
    if (!printWindow) return alert('Habilite pop-ups.');
    const dateStr = new Date(order.timestamp).toLocaleString('pt-BR');
    const paperWidth = printConfig.width === '58mm' ? '48mm' : '72mm';
    const content = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>D.Moreira - Pedido ${order.id}</title>
          <style>
            @page { margin: 0; }
            * { color: #000 !important; font-family: 'Courier New', monospace; font-weight: bold; }
            body { width: ${paperWidth}; margin: 0; padding: 4mm; font-size: 14px; line-height: 1.2; background: #fff; }
            .center { text-align: center; }
            .line { border-bottom: 2px dashed #000; margin: 8px 0; }
            .flex { display: flex; justify-content: space-between; }
            .header { font-size: 20px; font-weight: 900; margin-bottom: 5px; }
            .item-row { margin-bottom: 4px; }
          </style>
        </head>
        <body>
          <div class="center"><div class="header">D. MOREIRA</div><div>CONVENIÊNCIA</div></div>
          <div class="line"></div>
          <div class="flex"><span>TIPO:</span> <span>${order.orderType.toUpperCase()}</span></div>
          <div class="flex"><span>LOCAL:</span> <span>${order.tableId === 99 ? 'Balcão/Viagem' : 'MESA ' + order.tableId}</span></div>
          <div class="flex"><span>DATA:</span> <span>${dateStr}</span></div>
          <div class="flex"><span>CLIENTE:</span> <span>${order.customerName.toUpperCase()}</span></div>
          <div class="line"></div>
          ${order.items.map(i => `<div class="item-row"><div class="flex"><span>${i.quantity}x ${i.name}</span><span>R$ ${(i.price * i.quantity).toFixed(2)}</span></div></div>`).join('')}
          <div class="line"></div>
          <div class="flex" style="font-size: 18px;"><span>TOTAL:</span> <span>R$ ${order.total.toFixed(2)}</span></div>
          <div class="flex"><span>PAGTO:</span> <span>${order.paymentMethod.toUpperCase()}</span></div>
          ${order.address ? `<div class="line"></div><div>END: ${order.address}</div>` : ''}
          <div class="line"></div>
          <div class="center italic">*** OBRIGADO PELA VISITA ***</div>
          <script>window.onload=function(){window.print();window.close();};</script>
        </body>
      </html>
    `;
    printWindow.document.write(content);
    printWindow.document.close();
  };

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto" onClick={() => !isSoundEnabled && setIsSoundEnabled(true)}>
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-10 gap-6">
        <div>
          <h2 className="text-4xl font-black text-gray-900 italic tracking-tight">Painel Operacional</h2>
          <div className="flex items-center gap-3 mt-1">
            <span className="text-gray-400 text-xs font-black uppercase tracking-widest">D.Moreira Gestão</span>
            <button onClick={(e) => { e.stopPropagation(); setIsSoundEnabled(!isSoundEnabled); }} className={`px-3 py-1 rounded-full text-[9px] font-black uppercase border transition-all ${isSoundEnabled ? 'bg-yellow-100 border-yellow-400 text-yellow-800' : 'bg-gray-100 border-gray-300 text-gray-400'}`}>
              {isSoundEnabled ? '🔔 Alerta Sonoro' : '🔕 Mudo'}
            </button>
          </div>
        </div>
        
        <div className="flex flex-wrap items-center gap-4">
          <button onClick={handleManualRefresh} className={`bg-white p-3.5 rounded-2xl shadow-md border border-gray-100 hover:bg-gray-50 transition-colors ${isRefreshing ? 'animate-spin' : ''}`}>
            <svg width="22" height="22" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/></svg>
          </button>
          <button onClick={() => setShowSalesReport(true)} className="bg-yellow-400 text-black px-6 py-4 rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl active:scale-95 border-b-4 border-black transition-all">📊 Relatório Financeiro</button>
          <button onClick={onLogout} className="bg-black text-white px-6 py-4 rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl">Sair</button>
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-6">
        {tables.map(table => {
          const statusInfo = table.currentOrder ? getStatusLabel(table.currentOrder.status) : null;
          return (
            <button
              key={table.id}
              onClick={() => {
                setSelectedTable(table);
                setIsAddingItems(false);
                setAdminCategory('Todos');
              }}
              className={`p-6 rounded-[2.5rem] border-4 transition-all flex flex-col items-center justify-center gap-2 group relative h-48 ${
                table.status === 'free' ? 'bg-white border-gray-100 hover:border-yellow-400' : 'bg-yellow-400 border-black shadow-2xl scale-105 z-10'
              }`}
            >
              {table.currentOrder?.isUpdated && (
                <div className="absolute -top-3 -right-3 bg-red-600 text-white text-[9px] font-black px-3 py-1.5 rounded-full shadow-lg border-2 border-white animate-bounce z-20 uppercase">Novo Item!</div>
              )}
              {statusInfo && (
                <div className={`absolute top-4 left-4 ${statusInfo.color} text-white text-[8px] font-black px-3 py-1 rounded-full uppercase tracking-widest`}>
                  {statusInfo.text}
                </div>
              )}
              <span className="text-[10px] font-black uppercase tracking-widest opacity-40">Mesa</span>
              <span className="text-5xl font-black italic">{table.id}</span>
              <span className={`text-[9px] font-black uppercase px-4 py-1.5 rounded-full mt-2 ${table.status === 'free' ? 'bg-gray-100 text-gray-400' : 'bg-black text-white'}`}>
                {table.status === 'free' ? 'Disponível' : 'Ocupada'}
              </span>
              {table.currentOrder && (
                <span className="text-[10px] font-bold text-black/70 mt-1 truncate w-full text-center px-2">{table.currentOrder.customerName}</span>
              )}
            </button>
          );
        })}
      </div>

      {selectedTable && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/90 backdrop-blur-xl" onClick={() => setSelectedTable(null)} />
          <div className="relative bg-white w-full max-w-3xl rounded-[3.5rem] p-8 md:p-10 shadow-2xl flex flex-col max-h-[92vh] overflow-hidden animate-pop-in border-[12px] border-yellow-400">
            <div className="flex justify-between items-start mb-8 shrink-0">
              <div>
                <h3 className="text-4xl font-black italic">Atendimento Mesa {selectedTable.id}</h3>
                <div className="flex gap-2 mt-2">
                  <span className={`px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest ${currentTableData?.status === 'occupied' ? 'bg-black text-white' : 'bg-gray-100 text-gray-400'}`}>
                    {currentTableData?.status === 'occupied' ? 'Conta Ativa' : 'Mesa Livre'}
                  </span>
                  {currentTableData?.currentOrder && (
                    <span className="px-4 py-1.5 rounded-full bg-yellow-100 text-yellow-800 text-[10px] font-black uppercase tracking-widest">
                      {currentTableData.currentOrder.orderType === 'table' ? 'No Local' : currentTableData.currentOrder.orderType === 'delivery' ? 'Entrega' : 'Viagem'}
                    </span>
                  )}
                </div>
              </div>
              <button onClick={() => setSelectedTable(null)} className="p-3 hover:bg-gray-100 rounded-full transition-colors"><CloseIcon size={32}/></button>
            </div>

            <div className="flex-1 overflow-y-auto no-scrollbar mb-8 pr-2">
              {isAddingItems ? (
                <div className="space-y-6">
                  <div className="flex items-center gap-3 sticky top-0 bg-white pb-4 z-20">
                    <button onClick={() => setIsAddingItems(false)} className="bg-gray-100 p-2.5 rounded-xl font-black text-[10px] uppercase shadow-sm">← Voltar</button>
                    <div className="flex overflow-x-auto gap-2 no-scrollbar">
                      {categories.map(cat => (
                        <button key={cat} onClick={() => setAdminCategory(cat)} className={`whitespace-nowrap px-4 py-2 rounded-xl font-black text-[10px] uppercase border transition-all ${adminCategory === cat ? 'bg-black text-white border-black' : 'bg-gray-50 text-gray-500 border-gray-100 hover:bg-gray-100'}`}>{cat}</button>
                      ))}
                    </div>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {filteredAdminItems.map(product => (
                      <button 
                        key={product.id} 
                        onClick={() => onAddToOrder(selectedTable.id, product)} 
                        className="flex items-center gap-4 p-3 bg-gray-50 rounded-2xl hover:bg-yellow-50 border border-transparent hover:border-yellow-200 transition-all text-left shadow-sm group"
                      >
                        <img src={product.image} className="w-14 h-14 object-cover rounded-xl shadow-sm" />
                        <div className="flex-1">
                          <p className="text-xs font-black text-gray-900 leading-tight">{product.name}</p>
                          <p className="text-[11px] font-bold text-yellow-700">R$ {product.price.toFixed(2)}</p>
                        </div>
                        <div className="bg-black text-white p-2 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity">
                          <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M12 4v16m8-8H4"/></svg>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              ) : currentTableData?.currentOrder ? (
                <div className="space-y-8">
                  <div className="bg-black text-white p-6 rounded-[2.5rem] shadow-xl flex flex-col md:flex-row justify-between items-center gap-6">
                    <div>
                      <span className="text-[10px] font-black uppercase text-yellow-400 tracking-widest mb-1 block">Status do Preparo</span>
                      <div className="flex gap-2 mt-2 flex-wrap">
                        {(['pending', 'preparing', 'ready', 'delivered'] as OrderStatus[]).map((st) => (
                          <button
                            key={st}
                            onClick={() => handleStatusChange(st)}
                            className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-tighter transition-all border-2 ${
                              currentTableData.currentOrder?.status === st 
                              ? 'bg-yellow-400 text-black border-yellow-400 scale-105' 
                              : 'bg-transparent border-white/20 text-white/40 hover:border-white'
                            }`}
                          >
                            {getStatusLabel(st).text}
                          </button>
                        ))}
                      </div>
                    </div>
                    <div className="text-right">
                      <span className="text-[10px] font-black uppercase text-yellow-400 tracking-widest mb-1 block">Responsável</span>
                      <p className="text-xl font-black italic">{currentTableData.currentOrder.customerName}</p>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div className="flex justify-between items-center px-2">
                      <h4 className="text-[11px] font-black uppercase text-gray-400 tracking-[0.2em] italic">Comanda de Itens</h4>
                      <button onClick={() => setIsAddingItems(true)} className="text-[10px] font-black uppercase text-yellow-600 hover:text-yellow-700">+ Adicionar Itens</button>
                    </div>
                    {currentTableData.currentOrder.items.map((item, idx) => (
                      <div key={idx} className="flex justify-between items-center bg-gray-50 p-5 rounded-3xl border border-gray-100 hover:shadow-md transition-shadow">
                        <div className="flex items-center gap-4">
                          <div className="bg-black text-yellow-400 w-10 h-10 rounded-xl flex items-center justify-center font-black text-sm">{item.quantity}x</div>
                          <div>
                            <span className="text-base font-black text-gray-900 leading-tight">{item.name}</span>
                            <p className="text-[10px] font-bold text-gray-400 uppercase">Unit: R$ {item.price.toFixed(2)}</p>
                          </div>
                        </div>
                        <span className="font-black text-lg italic text-gray-900">R$ {(item.price * item.quantity).toFixed(2)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-20 text-center space-y-4">
                  <div className="bg-gray-50 p-10 rounded-full italic font-black text-6xl text-gray-200">D.M</div>
                  <p className="text-lg font-black text-gray-300 uppercase italic">Mesa pronta para novos clientes</p>
                </div>
              )}
            </div>

            <div className="pt-8 border-t-4 border-gray-100 shrink-0">
              {isAddingItems ? null : currentTableData?.currentOrder ? (
                <>
                  <div className="flex flex-col md:flex-row justify-between items-end mb-8 gap-4">
                    <div>
                      <span className="text-[11px] font-black text-gray-400 uppercase tracking-widest mb-1 block">Total Consumido</span>
                      <p className="text-5xl font-black text-black leading-none italic">R$ {currentTableData.currentOrder.total.toFixed(2)}</p>
                    </div>
                    <div className="w-full md:w-48">
                      <span className="text-[11px] font-black text-gray-400 uppercase tracking-widest mb-1 block">Método de Pagto</span>
                      <select 
                        className="w-full bg-gray-50 font-black text-lg px-4 py-3 rounded-2xl outline-none border-b-4 border-yellow-400"
                        value={currentTableData.currentOrder.paymentMethod}
                        onChange={(e) => onUpdateTable(selectedTable.id, 'occupied', { ...currentTableData.currentOrder!, paymentMethod: e.target.value })}
                      >
                        <option value="Pix">Pix</option>
                        <option value="Dinheiro">Dinheiro</option>
                        <option value="Cartão">Cartão</option>
                      </select>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-6">
                    <button 
                      onClick={() => handlePrint(currentTableData.currentOrder!)}
                      className="bg-gray-100 text-black py-5 rounded-[2rem] font-black uppercase text-xs tracking-widest flex items-center justify-center gap-3 border-4 border-gray-200 hover:bg-gray-200 transition-all"
                    >
                      🖨️ Imprimir Cupom (80mm)
                    </button>
                    <button 
                      onClick={() => {
                        if(confirm(`Confirmar fechamento da conta da Mesa ${selectedTable.id}?`)) {
                          onUpdateTable(selectedTable.id, 'free');
                          setSelectedTable(null);
                        }
                      }}
                      className="bg-green-500 text-white py-5 rounded-[2rem] font-black uppercase text-xs tracking-widest shadow-2xl hover:bg-green-600 transition-all border-b-4 border-green-800"
                    >
                      Liberar Mesa & Receber
                    </button>
                  </div>
                </>
              ) : (
                <button 
                  onClick={() => setIsAddingItems(true)} 
                  className="w-full bg-yellow-400 text-black py-5 rounded-[2.5rem] font-black uppercase text-xs tracking-widest shadow-xl border-b-4 border-black active:scale-95 transition-all"
                >
                  Abrir Nova Comanda
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {showSalesReport && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/95 backdrop-blur-2xl">
          <div className="bg-white w-full max-w-xl rounded-[4rem] p-12 shadow-2xl relative border-[12px] border-yellow-400">
            <button onClick={() => setShowSalesReport(false)} className="absolute top-8 right-8 p-2 hover:bg-gray-100 rounded-full"><CloseIcon/></button>
            <h3 className="text-3xl font-black mb-8 italic tracking-tighter">Relatório de Caixa Diário</h3>
            <div className="space-y-6 mb-10">
              {['Pix', 'Dinheiro', 'Cartão'].map(method => {
                const total = salesHistory.filter(o => o.paymentMethod === method).reduce((acc, o) => acc + o.total, 0);
                return (
                  <div key={method} className="flex justify-between items-center border-b-2 border-gray-50 pb-4">
                    <span className="font-black text-gray-400 uppercase text-xs tracking-widest">{method}</span>
                    <span className="font-black text-xl italic">R$ {total.toFixed(2)}</span>
                  </div>
                );
              })}
              <div className="flex justify-between pt-6 bg-yellow-50 p-6 rounded-3xl">
                <span className="text-sm font-black uppercase tracking-widest text-yellow-800">TOTAL EM CAIXA</span>
                <span className="text-3xl font-black text-black italic">R$ {salesHistory.reduce((acc, o) => acc + o.total, 0).toFixed(2)}</span>
              </div>
            </div>
            <button onClick={() => window.print()} className="w-full bg-black text-white py-5 rounded-[2rem] font-black text-xs uppercase tracking-widest">Imprimir Relatório</button>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminPanel;
