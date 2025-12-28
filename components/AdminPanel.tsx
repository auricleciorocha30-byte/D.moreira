
import React, { useState, useMemo, useEffect, useRef } from 'react';
import { Table, Order, PrintConfig, Product, CategoryType } from '../types';
import { MENU_ITEMS } from '../constants';
import { CloseIcon } from './Icons';

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
  const [printConfig, setPrintConfig] = useState<PrintConfig>({ width: '58mm' });
  const [isAddingItems, setIsAddingItems] = useState(false);
  const [showSalesReport, setShowSalesReport] = useState(false);
  const [adminCategory, setAdminCategory] = useState<CategoryType | 'Todos'>('Todos');
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isSoundEnabled, setIsSoundEnabled] = useState(true);

  const occupiedCount = tables.filter(t => t.status === 'occupied').length;
  const lastOccupiedCountRef = useRef(occupiedCount);

  const playNotification = () => {
    if (!isSoundEnabled) return;
    const audio = new Audio('https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3');
    audio.play().catch(e => console.log("Áudio aguardando interação do usuário."));
  };

  useEffect(() => {
    if (!selectedTable && !showSalesReport) {
      const interval = setInterval(() => {
        onRefreshData();
      }, 5000);
      return () => clearInterval(interval);
    }
  }, [selectedTable, showSalesReport, onRefreshData]);

  useEffect(() => {
    if (occupiedCount > lastOccupiedCountRef.current) {
      playNotification();
    }
    lastOccupiedCountRef.current = occupiedCount;
  }, [occupiedCount, isSoundEnabled]);

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
    const printWindow = window.open('', '_blank', 'width=600,height=800');
    if (!printWindow) return alert('Habilite pop-ups para imprimir.');

    const dateStr = new Date(order.timestamp).toLocaleString('pt-BR', {
      day: '2-digit', 
      month: '2-digit', 
      year: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    }).replace(',', '');

    const content = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>D.Moreira - Pedido ${order.id}</title>
          <style>
            @page { margin: 0; }
            * { 
              -webkit-print-color-adjust: exact !important; 
              print-color-adjust: exact !important; 
              color: #000 !important;
              box-sizing: border-box;
            }
            body { 
              font-family: 'Courier New', Courier, monospace; 
              width: ${printConfig.width === '58mm' ? '54mm' : '76mm'}; 
              margin: 0; 
              padding: 2mm; 
              font-size: 14px; 
              font-weight: bold;
              background: #fff;
              line-height: 1.2;
            }
            .center { text-align: center; }
            .line { border-bottom: 2px dashed #000; margin: 6px 0; width: 100%; }
            .flex { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 2px; }
            .bold-xl { font-weight: 900; font-size: 18px; }
            .header { margin-bottom: 10px; }
            .item-container { margin-bottom: 8px; }
            .item-header { font-size: 15px; font-weight: 900; margin-bottom: 2px; }
            .footer { margin-top: 15px; font-size: 12px; }
            h1, h2, h3 { margin: 0; padding: 0; }
          </style>
        </head>
        <body>
          <div class="center header">
            <h1 class="bold-xl">D. MOREIRA</h1>
            <div style="font-size: 11px;">CONVENIÊNCIA & LANCHES</div>
            <div style="font-size: 11px;">Parada Obrigatória ⛽</div>
          </div>
          
          <div class="line"></div>
          
          <div class="flex"><span>PEDIDO:</span> <span>#${order.id}</span></div>
          <div class="flex"><span>MESA:</span> <span>${order.tableId}</span></div>
          <div class="flex"><span>DATA:</span> <span>${dateStr}</span></div>
          <div class="flex"><span>CLIENTE:</span> <span>${order.customerName.toUpperCase()}</span></div>
          
          <div class="line"></div>
          
          <div class="center" style="font-size: 16px; margin: 8px 0;">DETALHES DO PEDIDO</div>
          
          ${order.items.map(i => `
            <div class="item-container">
              <div class="item-header">${i.quantity}x ${i.name.toUpperCase()}</div>
              <div class="flex" style="padding-left: 10px; font-size: 13px;">
                <span>Unil: R$ ${i.price.toFixed(2)}</span>
                <span>Sub: R$ ${(i.price * i.quantity).toFixed(2)}</span>
              </div>
            </div>
          `).join('')}
          
          <div class="line"></div>
          
          <div class="flex" style="font-size: 18px; margin-top: 5px;">
            <span>TOTAL:</span>
            <span>R$ ${order.total.toFixed(2)}</span>
          </div>
          
          <div class="flex" style="margin-top: 5px;">
            <span>PAGAMENTO:</span>
            <span>${order.paymentMethod.toUpperCase()}</span>
          </div>
          
          <div class="line"></div>
          
          <div class="footer center">
            <div style="font-size: 15px; letter-spacing: 1px;">*** SEM VALOR FISCAL ***</div>
            <div style="margin-top: 5px;">Obrigado pela preferência!</div>
            <div style="margin-top: 8px; font-size: 9px; opacity: 0.7;">Software D.Moreira v1.0</div>
          </div>

          <script>
            window.onload = function() { 
              window.print(); 
              setTimeout(function() { window.close(); }, 500);
            };
          </script>
        </body>
      </html>
    `;
    printWindow.document.write(content);
    printWindow.document.close();
  };

  const handlePrintReport = () => {
    const totalSales = salesHistory.reduce((acc, order) => acc + order.total, 0);
    const pixTotal = salesHistory.filter(o => o.paymentMethod === 'Pix').reduce((acc, o) => acc + o.total, 0);
    const cashTotal = salesHistory.filter(o => o.paymentMethod === 'Dinheiro').reduce((acc, o) => acc + o.total, 0);
    const cardTotal = salesHistory.filter(o => o.paymentMethod === 'Cartão').reduce((acc, o) => acc + o.total, 0);

    const printWindow = window.open('', '_blank', 'width=600,height=800');
    if (!printWindow) return;

    const content = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>Relatório de Vendas - D.Moreira</title>
          <style>
            @page { margin: 0; }
            * { color: #000 !important; }
            body { 
              font-family: 'Courier New', Courier, monospace; 
              width: ${printConfig.width === '58mm' ? '54mm' : '76mm'}; 
              margin: 0; padding: 5mm; font-size: 14px; font-weight: bold;
              line-height: 1.4;
            }
            .center { text-align: center; }
            .line { border-bottom: 2px dashed #000; margin: 10px 0; }
            .flex { display: flex; justify-content: space-between; }
          </style>
        </head>
        <body>
          <div class="center" style="font-size: 18px;">D.MOREIRA - RELATÓRIO</div>
          <div class="center">FECHAMENTO DE CAIXA</div>
          <div class="line"></div>
          <div class="flex"><span>Pedidos:</span> <span>${salesHistory.length}</span></div>
          <div class="line"></div>
          <div class="flex"><span>Pix:</span> <span>R$ ${pixTotal.toFixed(2)}</span></div>
          <div class="flex"><span>Dinheiro:</span> <span>R$ ${cashTotal.toFixed(2)}</span></div>
          <div class="flex"><span>Cartão:</span> <span>R$ ${cardTotal.toFixed(2)}</span></div>
          <div class="line"></div>
          <div class="flex" style="font-size: 16px;">
            <span>TOTAL:</span>
            <span>R$ ${totalSales.toFixed(2)}</span>
          </div>
          <div class="line"></div>
          <div class="center" style="font-size: 11px;">
            Gerado: ${new Date().toLocaleString('pt-BR')}<br>
            *** DOC. INTERNO ***
          </div>
          <script>window.onload = function() { window.print(); window.close(); };</script>
        </body>
      </html>
    `;
    printWindow.document.write(content);
    printWindow.document.close();
  };

  const currentTableData = tables.find(t => t.id === selectedTable?.id);

  return (
    <div className="p-4 md:p-8 max-w-6xl mx-auto">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
        <div className="flex items-center gap-4">
          <div>
            <h2 className="text-3xl font-black text-gray-900 italic">Controle de Mesas</h2>
            <div className="flex items-center gap-3">
              <p className="text-gray-500 text-xs font-bold uppercase tracking-widest">Painel Administrativo D.Moreira</p>
              {!selectedTable && !showSalesReport && (
                <div className="flex items-center gap-2">
                  <span className="flex items-center gap-1 text-[9px] font-black text-green-500 uppercase bg-green-50 px-2 py-0.5 rounded-full border border-green-100 animate-pulse">
                    <span className="w-1 h-1 bg-green-500 rounded-full"></span>
                    Auto-Sync
                  </span>
                  <button 
                    onClick={() => setIsSoundEnabled(!isSoundEnabled)}
                    className={`flex items-center gap-1 text-[9px] font-black uppercase px-2 py-0.5 rounded-full border transition-all ${isSoundEnabled ? 'bg-yellow-50 border-yellow-200 text-yellow-700' : 'bg-gray-100 border-gray-200 text-gray-400'}`}
                  >
                    {isSoundEnabled ? '🔔 Som Ligado' : '🔕 Silencioso'}
                  </button>
                </div>
              )}
            </div>
          </div>
          <button 
            onClick={handleManualRefresh}
            className={`p-3 rounded-full bg-white shadow-md border border-gray-100 hover:bg-gray-50 transition-all ${isRefreshing ? 'animate-spin' : ''}`}
            title="Sincronizar Pedidos Agora"
          >
            <svg width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/></svg>
          </button>
        </div>
        <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
          <button 
            onClick={() => setShowSalesReport(true)}
            className="bg-yellow-400 text-black px-4 py-3 rounded-xl font-black text-xs uppercase tracking-widest shadow-lg active:scale-95 transition-all flex items-center gap-2"
          >
            <span>📊</span> Relatório de Vendas
          </button>
          <select 
            className="bg-white border border-gray-200 text-xs font-black px-4 py-3 rounded-xl shadow-sm outline-none cursor-pointer"
            value={printConfig.width}
            onChange={(e) => setPrintConfig({ width: e.target.value as any })}
          >
            <option value="58mm">Impressora 58mm</option>
            <option value="80mm">Impressora 80mm</option>
          </select>
          <button onClick={onLogout} className="bg-black text-white px-6 py-3 rounded-xl font-bold text-sm shadow-lg active:scale-95 transition-all">Sair</button>
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-6">
        {tables.map(table => (
          <button
            key={table.id}
            onClick={() => {
              setSelectedTable(table);
              setIsAddingItems(table.status === 'free');
              setAdminCategory('Todos');
            }}
            className={`p-6 rounded-[2rem] border-4 transition-all flex flex-col items-center justify-center gap-2 group relative overflow-hidden ${
              table.status === 'free' 
                ? 'bg-white border-gray-100 hover:border-yellow-400 hover:shadow-xl' 
                : 'bg-yellow-400 border-black shadow-xl scale-105 active:scale-100'
            }`}
          >
            {table.status === 'occupied' && (
              <div className="absolute top-2 right-2 flex gap-1">
                <span className="w-2 h-2 bg-black rounded-full animate-pulse"></span>
              </div>
            )}
            <span className="text-[10px] font-black uppercase tracking-widest opacity-60">Mesa</span>
            <span className="text-4xl font-black">{table.id}</span>
            <span className={`text-[10px] font-black uppercase px-4 py-1.5 rounded-full ${
              table.status === 'free' ? 'bg-gray-100 text-gray-400' : 'bg-black text-white shadow-lg'
            }`}>
              {table.status === 'free' ? 'Livre' : 'Ocupada'}
            </span>
            {table.currentOrder && (
              <span className="text-[10px] font-bold mt-1 text-black/60 truncate w-full text-center px-2">
                {table.currentOrder.customerName}
              </span>
            )}
            {table.status === 'free' && (
              <span className="text-[9px] font-black text-yellow-600 uppercase mt-1 opacity-0 group-hover:opacity-100 transition-opacity">
                + Novo Pedido
              </span>
            )}
          </button>
        ))}
      </div>

      {showSalesReport && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-6 bg-black/80 backdrop-blur-md">
          <div className="bg-white w-full max-w-lg rounded-[3rem] p-8 shadow-2xl relative animate-pop-in">
            <button onClick={() => setShowSalesReport(false)} className="absolute top-6 right-6 p-2 hover:bg-gray-100 rounded-full"><CloseIcon/></button>
            <h3 className="text-2xl font-black mb-6">Relatório de Caixa</h3>
            <div className="space-y-4 mb-8">
              <div className="flex justify-between border-b border-gray-50 pb-2">
                <span className="font-bold text-gray-500">Pedidos Finalizados</span>
                <span className="font-black">{salesHistory.length}</span>
              </div>
              <div className="flex justify-between border-b border-gray-50 pb-2">
                <span className="font-bold text-gray-500">Vendas em Pix</span>
                <span className="font-black text-green-600">R$ {salesHistory.filter(o => o.paymentMethod === 'Pix').reduce((acc, o) => acc + o.total, 0).toFixed(2)}</span>
              </div>
              <div className="flex justify-between border-b border-gray-50 pb-2">
                <span className="font-bold text-gray-500">Vendas em Dinheiro</span>
                <span className="font-black text-green-600">R$ {salesHistory.filter(o => o.paymentMethod === 'Dinheiro').reduce((acc, o) => acc + o.total, 0).toFixed(2)}</span>
              </div>
              <div className="flex justify-between border-b border-gray-50 pb-2">
                <span className="font-bold text-gray-500">Vendas em Cartão</span>
                <span className="font-black text-green-600">R$ {salesHistory.filter(o => o.paymentMethod === 'Cartão').reduce((acc, o) => acc + o.total, 0).toFixed(2)}</span>
              </div>
              <div className="flex justify-between pt-4">
                <span className="text-xl font-black">FATURAMENTO TOTAL</span>
                <span className="text-xl font-black text-black">R$ {salesHistory.reduce((acc, o) => acc + o.total, 0).toFixed(2)}</span>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <button onClick={handlePrintReport} className="bg-black text-white py-4 rounded-2xl font-black uppercase text-xs shadow-xl active:scale-95">Imprimir Relatório</button>
              <button onClick={() => {
                if(confirm("Deseja zerar o relatório de vendas e o caixa?")) {
                  localStorage.removeItem('dmoreira_sales');
                  window.location.reload();
                }
              }} className="bg-red-50 text-red-600 py-4 rounded-2xl font-black uppercase text-xs border border-red-100 active:scale-95">Zerar Tudo</button>
            </div>
          </div>
        </div>
      )}

      {selectedTable && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-6">
          <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={() => setSelectedTable(null)} />
          <div className="relative bg-white w-full max-w-2xl rounded-[3rem] p-8 shadow-2xl flex flex-col max-h-[90vh] overflow-hidden animate-pop-in">
            <div className="flex justify-between items-center mb-6 shrink-0">
              <div>
                <h3 className="text-2xl font-black">Mesa {selectedTable.id}</h3>
                <p className="text-gray-400 text-xs font-bold uppercase tracking-widest">
                  {currentTableData?.currentOrder?.customerName || 'Adicionando Novo Pedido'}
                </p>
              </div>
              <button onClick={() => setSelectedTable(null)} className="p-2 hover:bg-gray-100 rounded-full transition-colors"><CloseIcon/></button>
            </div>

            <div className="flex-1 overflow-y-auto no-scrollbar mb-6 pr-2">
              {!isAddingItems && currentTableData?.currentOrder ? (
                <>
                  <div className="flex justify-between items-center mb-4">
                    <h4 className="text-xs font-black uppercase text-gray-400 tracking-widest">Resumo do Consumo</h4>
                    <button onClick={() => {
                      setIsAddingItems(true);
                      setAdminCategory('Todos');
                    }} className="text-[10px] font-black bg-yellow-400 px-4 py-1.5 rounded-full uppercase tracking-widest shadow-md hover:brightness-110 active:scale-95">+ Adicionar Itens</button>
                  </div>
                  <div className="space-y-2">
                    {currentTableData.currentOrder.items.map(item => (
                      <div key={item.id} className="flex justify-between items-center bg-gray-50 p-4 rounded-2xl border border-gray-100/50">
                        <div className="flex flex-col">
                          <span className="text-sm font-black text-gray-900">{item.quantity}x {item.name}</span>
                          <span className="text-[10px] font-bold text-gray-400">Unit: R$ {item.price.toFixed(2)}</span>
                        </div>
                        <span className="font-black text-sm text-gray-900">R$ {(item.price * item.quantity).toFixed(2)}</span>
                      </div>
                    ))}
                  </div>
                </>
              ) : (
                <>
                  <div className="flex flex-col gap-4 mb-4 sticky top-0 bg-white z-10 pb-4">
                    <div className="flex items-center gap-4">
                      {currentTableData?.status === 'occupied' && (
                        <button onClick={() => setIsAddingItems(false)} className="p-2 bg-gray-100 rounded-full hover:bg-gray-200 transition-colors">
                          <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M15 19l-7-7 7-7"/></svg>
                        </button>
                      )}
                      <h4 className="text-xs font-black uppercase text-gray-900 tracking-widest">Escolha os Produtos</h4>
                    </div>
                    
                    <div className="flex overflow-x-auto gap-2 no-scrollbar pb-1">
                      {categories.map(cat => (
                        <button
                          key={cat}
                          onClick={() => setAdminCategory(cat)}
                          className={`whitespace-nowrap px-4 py-2 rounded-xl font-black text-[9px] uppercase tracking-widest transition-all border ${
                            adminCategory === cat 
                              ? 'bg-black text-white border-black shadow-lg shadow-black/10' 
                              : 'bg-white text-gray-500 border-gray-100 hover:bg-gray-50'
                          }`}
                        >
                          {cat}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pb-4">
                    {filteredAdminItems.map(product => (
                      <button 
                        key={product.id}
                        onClick={() => onAddToOrder(selectedTable.id, product)}
                        className="flex items-center gap-3 p-3 bg-gray-50 rounded-2xl hover:bg-yellow-50 border border-transparent hover:border-yellow-200 transition-all text-left group"
                      >
                        <img src={product.image} className="w-14 h-14 object-cover rounded-xl shadow-sm border border-white" alt={product.name} />
                        <div className="flex-1">
                          <p className="text-[11px] font-black leading-tight text-gray-900">{product.name}</p>
                          <p className="text-[10px] font-bold text-yellow-700 mt-0.5">R$ {product.price.toFixed(2)}</p>
                          <p className="text-[8px] font-bold text-gray-400 uppercase tracking-tighter mt-1">{product.category}</p>
                        </div>
                        <div className="bg-black text-white p-2 rounded-xl group-active:scale-90 transition-transform shadow-md">
                          <svg width="14" height="14" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M12 4v16m8-8H4"/></svg>
                        </div>
                      </button>
                    ))}
                  </div>
                </>
              )}
            </div>

            {currentTableData?.currentOrder && (
              <div className="pt-6 border-t border-gray-100 shrink-0">
                <div className="flex justify-between items-end mb-6">
                  <div className="flex flex-col">
                    <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Subtotal Acumulado</span>
                    <span className="text-3xl font-black text-black leading-none">R$ {currentTableData.currentOrder.total.toFixed(2)}</span>
                  </div>
                  <div className="flex flex-col items-end">
                    <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Meio de Pagto</span>
                    <select 
                      className="bg-transparent font-black text-sm outline-none text-right cursor-pointer text-gray-900 border-b-2 border-transparent hover:border-yellow-400 transition-all py-1"
                      value={currentTableData.currentOrder.paymentMethod}
                      onChange={(e) => {
                         onUpdateTable(selectedTable.id, 'occupied', { ...currentTableData.currentOrder!, paymentMethod: e.target.value });
                      }}
                    >
                      <option value="Pix">📱 Pix</option>
                      <option value="Dinheiro">💵 Dinheiro</option>
                      <option value="Cartão">💳 Cartão</option>
                    </select>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <button onClick={() => handlePrint(currentTableData.currentOrder!)} className="bg-gray-100 text-black py-4 rounded-2xl font-black uppercase text-xs hover:bg-gray-200 transition-colors flex items-center justify-center gap-2">
                    <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z"/></svg>
                    <span>Imprimir Cupom</span>
                  </button>
                  <button onClick={() => { onUpdateTable(selectedTable.id, 'free'); setSelectedTable(null); }} className="bg-green-500 text-white py-4 rounded-2xl font-black uppercase text-xs shadow-lg shadow-green-200/50 hover:bg-green-600 transition-colors active:scale-95">Finalizar e Liberar</button>
                </div>
              </div>
            )}
            
            {currentTableData?.status === 'free' && isAddingItems && (
              <div className="pt-4 border-t border-gray-100 text-center shrink-0">
                <p className="text-[10px] font-bold text-gray-400 uppercase mb-4 tracking-widest">Os itens serão adicionados assim que você clicar em um produto acima</p>
                <button onClick={() => setSelectedTable(null)} className="text-[10px] font-black uppercase tracking-widest text-gray-500 hover:text-black">Cancelar Ação</button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminPanel;
