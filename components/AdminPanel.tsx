
import React, { useState, useMemo } from 'react';
import { Table, Order, PrintConfig, Product, CategoryType } from '../types';
import { MENU_ITEMS } from '../constants';
import { CloseIcon } from './Icons';

interface AdminPanelProps {
  tables: Table[];
  onUpdateTable: (tableId: number, status: 'free' | 'occupied', order?: Order | null) => void;
  onAddToOrder: (tableId: number, product: Product) => void;
  salesHistory: Order[];
  onLogout: () => void;
}

const AdminPanel: React.FC<AdminPanelProps> = ({ tables, onUpdateTable, onAddToOrder, salesHistory, onLogout }) => {
  const [selectedTable, setSelectedTable] = useState<Table | null>(null);
  const [printConfig, setPrintConfig] = useState<PrintConfig>({ width: '58mm' });
  const [isAddingItems, setIsAddingItems] = useState(false);
  const [showSalesReport, setShowSalesReport] = useState(false);
  const [adminCategory, setAdminCategory] = useState<CategoryType | 'Todos'>('Todos');

  const categories: (CategoryType | 'Todos')[] = ['Todos', 'Combos', 'Cafeteria', 'Lanches', 'Bebidas', 'Conveniência'];

  const filteredAdminItems = useMemo(() => {
    if (adminCategory === 'Todos') return MENU_ITEMS;
    return MENU_ITEMS.filter(item => item.category === adminCategory);
  }, [adminCategory]);

  const handlePrint = (order: Order) => {
    const printWindow = window.open('', '_blank', 'width=600,height=800');
    if (!printWindow) return alert('Habilite pop-ups para imprimir.');

    const content = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>D.Moreira - Pedido ${order.id}</title>
          <style>
            @page { margin: 0; }
            * { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
            body { 
              font-family: 'Courier New', Courier, monospace; 
              width: ${printConfig.width === '58mm' ? '54mm' : '76mm'}; 
              margin: 0; 
              padding: 4mm; 
              font-size: 13px; 
              color: #000; 
              background: #fff;
              line-height: 1.3;
            }
            .center { text-align: center; }
            .line { border-bottom: 2px solid #000; margin: 8px 0; }
            .flex { display: flex; justify-content: space-between; align-items: flex-start; }
            .bold { font-weight: 900; font-size: 15px; }
            .header { margin-bottom: 12px; }
            .item-row { margin-bottom: 4px; }
            .footer { margin-top: 20px; font-size: 11px; }
            h1, h2, h3 { margin: 0; padding: 0; }
          </style>
        </head>
        <body>
          <div class="center header">
            <h1 class="bold">D. MOREIRA</h1>
            <div style="font-size: 11px;">CONVENIÊNCIA & LANCHES</div>
            <div style="font-size: 11px;">Parada Obrigatória ⛽</div>
          </div>
          <div class="line"></div>
          <div class="flex"><b>PEDIDO:</b> <span>#${order.id}</span></div>
          <div class="flex"><b>MESA:</b> <span>${order.tableId}</span></div>
          <div class="flex"><b>DATA:</b> <span>${new Date(order.timestamp).toLocaleString('pt-BR', {hour: '2-digit', minute:'2-digit', day:'2-digit', month:'2-digit'})}</span></div>
          <div class="flex"><b>CLIENTE:</b> <span>${order.customerName.toUpperCase()}</span></div>
          <div class="line"></div>
          <div class="bold center" style="margin-bottom: 8px;">DETALHES DO PEDIDO</div>
          ${order.items.map(i => `
            <div class="item-row">
              <div class="flex">
                <span style="font-weight: bold;">${i.quantity}x ${i.name.toUpperCase()}</span>
              </div>
              <div class="flex" style="font-size: 11px; padding-left: 10px;">
                <span>V. Unit: R$ ${i.price.toFixed(2)}</span>
                <span>Sub: R$ ${(i.price * i.quantity).toFixed(2)}</span>
              </div>
            </div>
          `).join('')}
          <div class="line"></div>
          <div class="flex bold">
            <span>TOTAL:</span>
            <span>R$ ${order.total.toFixed(2)}</span>
          </div>
          <div class="flex" style="margin-top: 5px;">
            <b>PAGAMENTO:</b>
            <span>${order.paymentMethod.toUpperCase()}</span>
          </div>
          <div class="line"></div>
          <div class="footer center">
            <div class="bold">*** SEM VALOR FISCAL ***</div>
            <div>Obrigado pela preferência!</div>
            <div style="margin-top: 10px; font-size: 9px;">Software de Gestão D.Moreira</div>
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
            body { 
              font-family: 'Courier New', Courier, monospace; 
              width: ${printConfig.width === '58mm' ? '54mm' : '76mm'}; 
              margin: 0; padding: 5mm; font-size: 13px; color: #000; 
              line-height: 1.4;
            }
            .center { text-align: center; }
            .bold { font-weight: 900; font-size: 15px; }
            .line { border-bottom: 2px solid #000; margin: 10px 0; }
            .flex { display: flex; justify-content: space-between; }
          </style>
        </head>
        <body>
          <div class="center bold">D.MOREIRA - RELATÓRIO</div>
          <div class="center" style="font-size: 11px;">FECHAMENTO DE CAIXA</div>
          <div class="line"></div>
          <div class="flex"><span>Pedidos Finalizados:</span> <b>${salesHistory.length}</b></div>
          <div class="line"></div>
          <div class="flex"><span>Total em Pix:</span> <b>R$ ${pixTotal.toFixed(2)}</b></div>
          <div class="flex"><span>Total em Dinheiro:</span> <b>R$ ${cashTotal.toFixed(2)}</b></div>
          <div class="flex"><span>Total em Cartão:</span> <b>R$ ${cardTotal.toFixed(2)}</b></div>
          <div class="line"></div>
          <div class="flex bold">
            <span>FATURAMENTO TOTAL:</span>
            <span>R$ ${totalSales.toFixed(2)}</span>
          </div>
          <div class="line"></div>
          <div class="center" style="font-size: 11px;">
            Gerado em: ${new Date().toLocaleString('pt-BR')}<br>
            *** DOCUMENTO INTERNO ***
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
        <div>
          <h2 className="text-3xl font-black text-gray-900 italic">Controle de Mesas</h2>
          <p className="text-gray-500 text-xs font-bold uppercase tracking-widest">Painel Administrativo D.Moreira</p>
        </div>
        <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
          <button 
            onClick={() => setShowSalesReport(true)}
            className="bg-yellow-400 text-black px-4 py-3 rounded-xl font-black text-xs uppercase tracking-widest shadow-lg active:scale-95 transition-all"
          >
            📊 Relatório
          </button>
          <select 
            className="bg-white border border-gray-200 text-xs font-black px-4 py-3 rounded-xl shadow-sm outline-none"
            value={printConfig.width}
            onChange={(e) => setPrintConfig({ width: e.target.value as any })}
          >
            <option value="58mm">Papel 58mm</option>
            <option value="80mm">Papel 80mm</option>
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
            className={`p-6 rounded-[2rem] border-4 transition-all flex flex-col items-center justify-center gap-2 group ${
              table.status === 'free' 
                ? 'bg-white border-gray-100 hover:border-yellow-400' 
                : 'bg-yellow-400 border-black shadow-xl scale-105 active:scale-100'
            }`}
          >
            <span className="text-[10px] font-black uppercase tracking-widest opacity-60">Mesa</span>
            <span className="text-4xl font-black">{table.id}</span>
            <span className={`text-[10px] font-black uppercase px-4 py-1.5 rounded-full ${
              table.status === 'free' ? 'bg-gray-100 text-gray-400' : 'bg-black text-white'
            }`}>
              {table.status === 'free' ? 'Livre' : 'Ocupada'}
            </span>
            {table.currentOrder && (
              <span className="text-[10px] font-bold mt-1 text-black/60 truncate w-full text-center">
                {table.currentOrder.customerName}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Relatório Modal */}
      {showSalesReport && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-6 bg-black/80 backdrop-blur-md">
          <div className="bg-white w-full max-w-lg rounded-[3rem] p-8 shadow-2xl relative animate-pop-in">
            <button onClick={() => setShowSalesReport(false)} className="absolute top-6 right-6 p-2 hover:bg-gray-100 rounded-full"><CloseIcon/></button>
            <h3 className="text-2xl font-black mb-6">Relatório de Vendas</h3>
            <div className="space-y-4 mb-8">
              <div className="flex justify-between border-b pb-2">
                <span className="font-bold text-gray-500">Pedidos Finalizados</span>
                <span className="font-black">{salesHistory.length}</span>
              </div>
              <div className="flex justify-between border-b pb-2">
                <span className="font-bold text-gray-500">Total em Pix</span>
                <span className="font-black text-green-600">R$ {salesHistory.filter(o => o.paymentMethod === 'Pix').reduce((acc, o) => acc + o.total, 0).toFixed(2)}</span>
              </div>
              <div className="flex justify-between border-b pb-2">
                <span className="font-bold text-gray-500">Total em Dinheiro</span>
                <span className="font-black text-green-600">R$ {salesHistory.filter(o => o.paymentMethod === 'Dinheiro').reduce((acc, o) => acc + o.total, 0).toFixed(2)}</span>
              </div>
              <div className="flex justify-between border-b pb-2">
                <span className="font-bold text-gray-500">Total em Cartão</span>
                <span className="font-black text-green-600">R$ {salesHistory.filter(o => o.paymentMethod === 'Cartão').reduce((acc, o) => acc + o.total, 0).toFixed(2)}</span>
              </div>
              <div className="flex justify-between pt-4">
                <span className="text-xl font-black">FATURAMENTO TOTAL</span>
                <span className="text-xl font-black text-black">R$ {salesHistory.reduce((acc, o) => acc + o.total, 0).toFixed(2)}</span>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <button onClick={handlePrintReport} className="bg-black text-white py-4 rounded-2xl font-black uppercase text-xs">Imprimir Relatório</button>
              <button onClick={() => {
                if(confirm("Deseja zerar o relatório de vendas?")) {
                  localStorage.removeItem('dmoreira_sales');
                  window.location.reload();
                }
              }} className="bg-red-100 text-red-600 py-4 rounded-2xl font-black uppercase text-xs">Zerar Histórico</button>
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
                  {currentTableData?.currentOrder?.customerName || 'Mesa Livre'}
                </p>
              </div>
              <button onClick={() => setSelectedTable(null)} className="p-2 hover:bg-gray-100 rounded-full"><CloseIcon/></button>
            </div>

            <div className="flex-1 overflow-y-auto no-scrollbar mb-6 pr-2">
              {!isAddingItems && currentTableData?.currentOrder ? (
                <>
                  <div className="flex justify-between items-center mb-4">
                    <h4 className="text-xs font-black uppercase text-gray-400">Consumo Atual</h4>
                    <button onClick={() => {
                      setIsAddingItems(true);
                      setAdminCategory('Todos');
                    }} className="text-[10px] font-black bg-yellow-400 px-4 py-1.5 rounded-full uppercase tracking-widest">+ Adicionar Itens</button>
                  </div>
                  <div className="space-y-2">
                    {currentTableData.currentOrder.items.map(item => (
                      <div key={item.id} className="flex justify-between items-center bg-gray-50 p-3 rounded-2xl">
                        <span className="text-sm font-bold text-gray-700">{item.quantity}x {item.name}</span>
                        <span className="font-black text-sm">R$ {(item.price * item.quantity).toFixed(2)}</span>
                      </div>
                    ))}
                  </div>
                </>
              ) : (
                <>
                  <div className="flex flex-col gap-4 mb-4">
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
                              ? 'bg-black text-white border-black' 
                              : 'bg-white text-gray-500 border-gray-100 hover:bg-gray-50'
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
                        className="flex items-center gap-3 p-3 bg-gray-50 rounded-2xl hover:bg-yellow-50 border border-transparent hover:border-yellow-200 transition-all text-left group"
                      >
                        <img src={product.image} className="w-14 h-14 object-cover rounded-xl shadow-sm" alt={product.name} />
                        <div className="flex-1">
                          <p className="text-[11px] font-black leading-tight text-gray-900">{product.name}</p>
                          <p className="text-[10px] font-bold text-yellow-700 mt-0.5">R$ {product.price.toFixed(2)}</p>
                          <p className="text-[8px] font-bold text-gray-400 uppercase tracking-tighter mt-1">{product.category}</p>
                        </div>
                        <div className="bg-black text-white p-2 rounded-xl group-active:scale-90 transition-transform">
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
                    <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Total Acumulado</span>
                    <span className="text-3xl font-black text-black leading-none">R$ {currentTableData.currentOrder.total.toFixed(2)}</span>
                  </div>
                  <div className="flex flex-col items-end">
                    <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Forma de Pagto</span>
                    <select 
                      className="bg-transparent font-black text-sm outline-none text-right cursor-pointer hover:text-yellow-600 transition-colors"
                      value={currentTableData.currentOrder.paymentMethod}
                      onChange={(e) => {
                         onUpdateTable(selectedTable.id, 'occupied', { ...currentTableData.currentOrder!, paymentMethod: e.target.value });
                      }}
                    >
                      <option value="Pix">Pix</option>
                      <option value="Dinheiro">Dinheiro</option>
                      <option value="Cartão">Cartão</option>
                    </select>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <button onClick={() => handlePrint(currentTableData.currentOrder!)} className="bg-gray-100 text-black py-4 rounded-2xl font-black uppercase text-xs hover:bg-gray-200 transition-colors">Imprimir Cupom</button>
                  <button onClick={() => { onUpdateTable(selectedTable.id, 'free'); setSelectedTable(null); }} className="bg-green-500 text-white py-4 rounded-2xl font-black uppercase text-xs shadow-lg shadow-green-200 hover:bg-green-600 transition-colors">Finalizar Mesa</button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminPanel;
