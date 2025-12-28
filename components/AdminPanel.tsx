
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

  const currentTableData = useMemo(() => 
    tables.find(t => t.id === selectedTable?.id), 
    [tables, selectedTable]
  );

  const occupiedCount = tables.filter(t => t.status === 'occupied').length;
  const lastOccupiedCountRef = useRef(occupiedCount);

  const playNotification = () => {
    if (!isSoundEnabled) return;
    const audio = new Audio('https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3');
    audio.play().catch(e => console.log("Áudio bloqueado pelo navegador."));
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
      day: '2-digit', month: '2-digit', year: '2-digit',
      hour: '2-digit', minute: '2-digit'
    }).replace(',', '');

    // Reduzimos de 54mm para 48mm para garantir margem de segurança física
    const paperWidth = printConfig.width === '58mm' ? '48mm' : '72mm';

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
              font-weight: bold;
              box-sizing: border-box;
            }
            body { 
              font-family: 'Courier New', Courier, monospace; 
              width: ${paperWidth}; 
              margin: 0; 
              padding: 1mm 1mm 5mm 1mm; 
              font-size: 13px; 
              line-height: 1.1; 
              background: #fff;
              overflow-x: hidden;
            }
            .center { text-align: center; }
            .line { border-bottom: 2px dashed #000; margin: 5px 0; width: 100%; }
            .flex { display: flex; justify-content: space-between; gap: 4px; }
            .bold-xl { font-size: 16px; font-weight: 900; }
            .item-container { margin-bottom: 4px; width: 100%; }
            .item-name { 
              font-size: 13px; 
              word-break: break-all; 
              text-transform: uppercase;
            }
            .footer { margin-top: 10px; font-size: 10px; }
          </style>
        </head>
        <body>
          <div class="center">
            <div class="bold-xl">D. MOREIRA</div>
            <div style="font-size: 9px;">CONVENIÊNCIA & LANCHES</div>
          </div>
          <div class="line"></div>
          <div class="flex"><span>PEDIDO:</span> <span>#${order.id}</span></div>
          <div class="flex"><span>MESA:</span> <span>${order.tableId}</span></div>
          <div class="flex"><span>DATA:</span> <span>${dateStr}</span></div>
          <div class="flex"><span>CLIENTE:</span> <span>${order.customerName.slice(0,15).toUpperCase()}</span></div>
          <div class="line"></div>
          <div class="center" style="margin: 3px 0; font-size: 14px;">RESUMO</div>
          ${order.items.map(i => `
            <div class="item-container">
              <div class="item-name">${i.quantity}x ${i.name}</div>
              <div class="flex" style="font-size: 11px; padding-left: 5px;">
                <span>Un: R$ ${i.price.toFixed(2)}</span>
                <span>Sub: R$ ${(i.price * i.quantity).toFixed(2)}</span>
              </div>
            </div>
          `).join('')}
          <div class="line"></div>
          <div class="flex" style="font-size: 16px; margin-top: 3px;">
            <span>TOTAL:</span> 
            <span>R$ ${order.total.toFixed(2)}</span>
          </div>
          <div class="flex"><span>PAGTO:</span> <span>${order.paymentMethod.toUpperCase()}</span></div>
          <div class="line"></div>
          <div class="footer center">
            <div style="font-size: 12px; margin-bottom: 2px;">*** SEM VALOR FISCAL ***</div>
            <div>Obrigado pela preferência!</div>
          </div>
          <script>window.onload=function(){window.print();setTimeout(function(){window.close();},600);};</script>
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

    const paperWidth = printConfig.width === '58mm' ? '48mm' : '72mm';

    const content = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>Relatório - D.Moreira</title>
          <style>
            @page { margin: 0; }
            * { color: #000 !important; font-weight: bold; }
            body { font-family: 'Courier New', Courier, monospace; width: ${paperWidth}; margin: 0; padding: 2mm; font-size: 13px; line-height: 1.2; background: #fff; }
            .center { text-align: center; }
            .line { border-bottom: 2px dashed #000; margin: 8px 0; }
            .flex { display: flex; justify-content: space-between; }
          </style>
        </head>
        <body>
          <div class="center" style="font-size: 15px;">D.MOREIRA - CAIXA</div>
          <div class="line"></div>
          <div class="flex"><span>Pedidos:</span> <span>${salesHistory.length}</span></div>
          <div class="line"></div>
          <div class="flex"><span>Pix:</span> <span>R$ ${pixTotal.toFixed(2)}</span></div>
          <div class="flex"><span>Dinheiro:</span> <span>R$ ${cashTotal.toFixed(2)}</span></div>
          <div class="flex"><span>Cartão:</span> <span>R$ ${cardTotal.toFixed(2)}</span></div>
          <div class="line"></div>
          <div class="flex" style="font-size: 15px;"><span>TOTAL:</span> <span>R$ ${totalSales.toFixed(2)}</span></div>
          <div class="line"></div>
          <div class="center" style="font-size: 10px;">Gerado: ${new Date().toLocaleString('pt-BR')}</div>
          <script>window.onload=function(){window.print();window.close();};</script>
        </body>
      </html>
    `;
    printWindow.document.write(content);
    printWindow.document.close();
  };

  return (
    <div className="p-4 md:p-8 max-w-6xl mx-auto">
      {/* HEADER DO PAINEL */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
        <div className="flex items-center gap-4">
          <div>
            <h2 className="text-3xl font-black text-gray-900 italic">Controle de Mesas</h2>
            <div className="flex items-center gap-3">
              <p className="text-gray-500 text-xs font-bold uppercase tracking-widest">Painel Administrativo D.Moreira</p>
              <div className="flex items-center gap-2">
                <span className="flex items-center gap-1 text-[9px] font-black text-green-500 uppercase bg-green-50 px-2 py-0.5 rounded-full border border-green-100 animate-pulse">
                  Auto-Sync
                </span>
                <button 
                  onClick={() => setIsSoundEnabled(!isSoundEnabled)}
                  className={`flex items-center gap-1 text-[9px] font-black uppercase px-2 py-0.5 rounded-full border transition-all ${isSoundEnabled ? 'bg-yellow-50 border-yellow-200 text-yellow-700' : 'bg-gray-100 border-gray-200 text-gray-400'}`}
                >
                  {isSoundEnabled ? '🔔 Som' : '🔕 Mudo'}
                </button>
              </div>
            </div>
          </div>
          <button 
            onClick={handleManualRefresh}
            className={`p-3 rounded-full bg-white shadow-md border border-gray-100 hover:bg-gray-50 transition-all ${isRefreshing ? 'animate-spin' : ''}`}
          >
            <svg width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/></svg>
          </button>
        </div>
        
        <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
          <button 
            onClick={() => setShowSalesReport(true)}
            className="bg-yellow-400 text-black px-4 py-3 rounded-xl font-black text-xs uppercase tracking-widest shadow-lg active:scale-95"
          >
            📊 Relatório
          </button>
          <select 
            className="bg-white border border-gray-200 text-xs font-black px-4 py-3 rounded-xl shadow-sm outline-none"
            value={printConfig.width}
            onChange={(e) => setPrintConfig({ width: e.target.value as any })}
          >
            <option value="58mm">Bobina 58mm</option>
            <option value="80mm">Bobina 80mm</option>
          </select>
          <button onClick={onLogout} className="bg-black text-white px-6 py-3 rounded-xl font-bold text-sm shadow-lg">Sair</button>
        </div>
      </div>

      {/* GRADE DE MESAS */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-6">
        {tables.map(table => (
          <button
            key={table.id}
            onClick={() => {
              setSelectedTable(table);
              setIsAddingItems(table.status === 'free');
              setAdminCategory('Todos');
            }}
            className={`p-6 rounded-[2rem] border-4 transition-all flex flex-col items-center justify-center gap-2 group relative ${
              table.status === 'free' 
                ? 'bg-white border-gray-100 hover:border-yellow-400' 
                : 'bg-yellow-400 border-black shadow-xl scale-105'
            }`}
          >
            <span className="text-[10px] font-black uppercase tracking-widest opacity-60">Mesa</span>
            <span className="text-4xl font-black">{table.id}</span>
            <span className={`text-[10px] font-black uppercase px-4 py-1.5 rounded-full ${
              table.status === 'free' ? 'bg-gray-100 text-gray-400' : 'bg-black text-white shadow-lg'
            }`}>
              {table.status === 'free' ? 'Livre' : 'Ocupada'}
            </span>
            {table.currentOrder && (
              <span className="text-[9px] font-bold text-black/70 truncate w-full text-center">{table.currentOrder.customerName}</span>
            )}
          </button>
        ))}
      </div>

      {/* MODAL DE DETALHES DA MESA */}
      {selectedTable && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/80 backdrop-blur-md" onClick={() => setSelectedTable(null)} />
          <div className="relative bg-white w-full max-w-2xl rounded-[3rem] p-6 md:p-8 shadow-2xl flex flex-col max-h-[90vh] overflow-hidden animate-pop-in border-8 border-yellow-400">
            
            <div className="flex justify-between items-center mb-6 shrink-0">
              <div>
                <h3 className="text-3xl font-black italic">Mesa {selectedTable.id}</h3>
                <p className="text-gray-400 text-xs font-bold uppercase tracking-widest">
                  {currentTableData?.status === 'occupied' ? 'Consumo em Aberto' : 'Novo Pedido'}
                </p>
              </div>
              <button onClick={() => setSelectedTable(null)} className="p-2 hover:bg-gray-100 rounded-full"><CloseIcon/></button>
            </div>

            <div className="flex-1 overflow-y-auto no-scrollbar mb-6">
              {/* SEÇÃO: LISTA DE PRODUTOS PARA ADICIONAR */}
              {isAddingItems ? (
                <div className="space-y-6">
                  <div className="flex items-center gap-3 sticky top-0 bg-white pb-4 z-20">
                    {currentTableData?.status === 'occupied' && (
                      <button onClick={() => setIsAddingItems(false)} className="bg-gray-100 p-2 rounded-xl font-bold text-[10px] uppercase">← Voltar</button>
                    )}
                    <div className="flex overflow-x-auto gap-2 no-scrollbar">
                      {categories.map(cat => (
                        <button
                          key={cat}
                          onClick={() => setAdminCategory(cat)}
                          className={`whitespace-nowrap px-4 py-2 rounded-xl font-black text-[10px] uppercase border transition-all ${
                            adminCategory === cat ? 'bg-black text-white' : 'bg-gray-50 text-gray-500 hover:bg-gray-100'
                          }`}
                        >
                          {cat}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {filteredAdminItems.map(product => (
                      <button 
                        key={product.id}
                        onClick={() => onAddToOrder(selectedTable.id, product)}
                        className="flex items-center gap-4 p-3 bg-gray-50 rounded-2xl hover:bg-yellow-50 border border-transparent hover:border-yellow-200 transition-all text-left"
                      >
                        <img src={product.image} className="w-14 h-14 object-cover rounded-xl shadow-sm" alt={product.name} />
                        <div className="flex-1">
                          <p className="text-xs font-black text-gray-900 leading-tight">{product.name}</p>
                          <p className="text-[11px] font-bold text-yellow-700">R$ {product.price.toFixed(2)}</p>
                        </div>
                        <div className="bg-black text-white p-2 rounded-xl shadow-lg">
                          <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M12 4v16m8-8H4"/></svg>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              ) : (
                /* SEÇÃO: RESUMO DA CONTA (SÓ PARA OCUPADAS) */
                <div className="space-y-4">
                  <div className="flex justify-between items-center bg-yellow-400 p-4 rounded-2xl border-2 border-black">
                    <div>
                      <span className="text-[10px] font-black uppercase text-black/60">Cliente na Mesa</span>
                      <p className="font-black text-lg">{currentTableData?.currentOrder?.customerName}</p>
                    </div>
                    <button 
                      onClick={() => setIsAddingItems(true)}
                      className="bg-black text-yellow-400 px-6 py-2 rounded-xl font-black text-xs uppercase tracking-widest shadow-xl hover:scale-105 transition-all"
                    >
                      + Adicionar Itens
                    </button>
                  </div>

                  <div className="space-y-2">
                    <h4 className="text-[10px] font-black uppercase text-gray-400 tracking-widest">Itens Consumidos</h4>
                    {currentTableData?.currentOrder?.items.map((item, idx) => (
                      <div key={idx} className="flex justify-between items-center bg-gray-50 p-4 rounded-2xl border border-gray-100">
                        <div className="flex flex-col">
                          <span className="text-sm font-black text-gray-900">{item.quantity}x {item.name}</span>
                          <span className="text-[10px] font-bold text-gray-400">Unit: R$ {item.price.toFixed(2)}</span>
                        </div>
                        <span className="font-black text-sm text-gray-900">R$ {(item.price * item.quantity).toFixed(2)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* FOOTER FIXO: CHECKOUT E TOTAIS */}
            <div className="pt-6 border-t border-gray-100 shrink-0">
              {currentTableData?.currentOrder ? (
                <>
                  <div className="flex justify-between items-end mb-6">
                    <div>
                      <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Total Acumulado</span>
                      <p className="text-4xl font-black text-black leading-none">R$ {currentTableData.currentOrder.total.toFixed(2)}</p>
                    </div>
                    <div className="text-right">
                      <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Pagamento</span>
                      <select 
                        className="block w-full bg-transparent font-black text-lg outline-none cursor-pointer border-b-4 border-yellow-400"
                        value={currentTableData.currentOrder.paymentMethod}
                        onChange={(e) => onUpdateTable(selectedTable.id, 'occupied', { ...currentTableData.currentOrder!, paymentMethod: e.target.value })}
                      >
                        <option value="Pix">Pix</option>
                        <option value="Dinheiro">Dinheiro</option>
                        <option value="Cartão">Cartão</option>
                      </select>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <button onClick={() => handlePrint(currentTableData.currentOrder!)} className="bg-gray-100 text-black py-4 rounded-2xl font-black uppercase text-xs flex items-center justify-center gap-2 border-2 border-gray-200">
                      <span>🖨️</span> Imprimir Cupom
                    </button>
                    <button onClick={() => { onUpdateTable(selectedTable.id, 'free'); setSelectedTable(null); }} className="bg-green-500 text-white py-4 rounded-2xl font-black uppercase text-xs shadow-xl hover:bg-green-600 transition-all border-2 border-black">
                      Finalizar e Liberar
                    </button>
                  </div>
                </>
              ) : (
                <div className="text-center py-4">
                  <p className="text-sm font-black text-gray-400 uppercase italic">Adicione o primeiro item para abrir a conta</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* MODAL DE RELATÓRIO */}
      {showSalesReport && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
          <div className="bg-white w-full max-w-lg rounded-[3rem] p-8 shadow-2xl relative border-8 border-yellow-400">
            <button onClick={() => setShowSalesReport(false)} className="absolute top-6 right-6 p-2"><CloseIcon/></button>
            <h3 className="text-2xl font-black mb-6 italic">Relatório do Dia</h3>
            <div className="space-y-4 mb-8">
              {['Pix', 'Dinheiro', 'Cartão'].map(method => (
                <div key={method} className="flex justify-between border-b border-gray-50 pb-2">
                  <span className="font-bold text-gray-500 uppercase text-xs">{method}</span>
                  <span className="font-black">R$ {salesHistory.filter(o => o.paymentMethod === method).reduce((acc, o) => acc + o.total, 0).toFixed(2)}</span>
                </div>
              ))}
              <div className="flex justify-between pt-4">
                <span className="text-xl font-black">TOTAL EM CAIXA</span>
                <span className="text-2xl font-black text-black">R$ {salesHistory.reduce((acc, o) => acc + o.total, 0).toFixed(2)}</span>
              </div>
            </div>
            <button onClick={() => { if(confirm("Zerar caixa?")) { localStorage.removeItem('dmoreira_sales'); window.location.reload(); } }} className="w-full bg-red-50 text-red-600 py-4 rounded-2xl font-black uppercase text-xs border-2 border-red-100">Zerar Tudo</button>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminPanel;
