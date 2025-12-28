
import React, { useState } from 'react';
import { Table, Order, PrintConfig, Product } from '../types';
import { MENU_ITEMS } from '../constants';
import { CloseIcon } from './Icons';

interface AdminPanelProps {
  tables: Table[];
  onUpdateTable: (tableId: number, status: 'free' | 'occupied', order?: Order | null) => void;
  onAddToOrder: (tableId: number, product: Product) => void;
  onLogout: () => void;
}

const AdminPanel: React.FC<AdminPanelProps> = ({ tables, onUpdateTable, onAddToOrder, onLogout }) => {
  const [selectedTable, setSelectedTable] = useState<Table | null>(null);
  const [printConfig, setPrintConfig] = useState<PrintConfig>({ width: '58mm' });
  const [isAddingItems, setIsAddingItems] = useState(false);

  const handlePrint = (order: Order) => {
    const widthPx = printConfig.width === '58mm' ? '300px' : '400px';
    const printWindow = window.open('', '_blank', 'width=600,height=800');
    
    if (!printWindow) {
      alert('Por favor, permita pop-ups para imprimir o pedido.');
      return;
    }

    const content = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>Imprimir Pedido - D.Moreira</title>
          <style>
            @page { margin: 0; }
            body { 
              font-family: 'Courier New', monospace; 
              width: ${printConfig.width === '58mm' ? '58mm' : '80mm'}; 
              margin: 0; 
              padding: 5mm; 
              font-size: 12px; 
              line-height: 1.2;
              color: #000;
            }
            .center { text-align: center; }
            .line { border-bottom: 1px dashed #000; margin: 5px 0; }
            .flex { display: flex; justify-content: space-between; }
            .bold { font-weight: bold; font-size: 14px; }
            .header { margin-bottom: 10px; }
            .footer { margin-top: 15px; font-size: 10px; }
          </style>
        </head>
        <body>
          <div class="header center">
            <div class="bold">D.MOREIRA</div>
            <div>CONVENIÊNCIA & LANCHES</div>
            <div>Parada Obrigatória ⛽</div>
          </div>
          <div class="line"></div>
          <div><b>PEDIDO:</b> ${order.id}</div>
          <div><b>MESA:</b> ${order.tableId}</div>
          <div><b>DATA:</b> ${new Date(order.timestamp).toLocaleString('pt-BR')}</div>
          <div><b>CLIENTE:</b> ${order.customerName}</div>
          <div class="line"></div>
          <div class="bold">ITENS:</div>
          ${order.items.map(i => `
            <div class="flex">
              <span>${i.quantity}x ${i.name.substring(0, 20)}</span>
              <span>R$ ${(i.price * i.quantity).toFixed(2)}</span>
            </div>
          `).join('')}
          <div class="line"></div>
          <div class="flex bold">
            <span>TOTAL:</span>
            <span>R$ ${order.total.toFixed(2)}</span>
          </div>
          <div><b>PAGAMENTO:</b> ${order.paymentMethod}</div>
          <div class="line"></div>
          <div class="footer center">
            *** DOCUMENTO SEM VALOR FISCAL ***<br>
            Obrigado pela preferência!
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

  const currentTableData = tables.find(t => t.id === selectedTable?.id);

  return (
    <div className="p-4 md:p-8 max-w-6xl mx-auto">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
        <div>
          <h2 className="text-3xl font-black text-gray-900 italic">Dashboard Admin</h2>
          <p className="text-gray-500 text-xs font-bold uppercase tracking-widest">Controle de Mesas & Pedidos</p>
        </div>
        <div className="flex items-center gap-3 w-full md:w-auto">
          <select 
            className="bg-white border border-gray-200 text-xs font-black px-4 py-3 rounded-xl shadow-sm focus:ring-2 focus:ring-yellow-400 outline-none flex-1 md:flex-none"
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
              setIsAddingItems(false);
            }}
            className={`p-6 rounded-[2rem] border-4 transition-all flex flex-col items-center justify-center gap-2 group ${
              table.status === 'free' 
                ? 'bg-gray-50 border-gray-100 opacity-60 hover:opacity-100 hover:border-gray-300' 
                : 'bg-yellow-400 border-black shadow-xl scale-105 active:scale-100'
            }`}
          >
            <span className="text-[10px] font-black uppercase tracking-widest opacity-60">Mesa</span>
            <span className="text-4xl font-black">{table.id}</span>
            <span className={`text-[10px] font-black uppercase px-4 py-1.5 rounded-full ${
              table.status === 'free' ? 'bg-gray-200 text-gray-500' : 'bg-black text-white'
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

      {selectedTable && currentTableData?.currentOrder && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-6">
          <div className="absolute inset-0 bg-black/80 backdrop-blur-sm animate-fade-in" onClick={() => setSelectedTable(null)} />
          <div className="relative bg-white w-full max-w-2xl rounded-[3rem] p-8 shadow-2xl animate-pop-in max-h-[90vh] overflow-hidden flex flex-col">
            <div className="flex justify-between items-center mb-6 shrink-0">
              <div>
                <h3 className="text-2xl font-black">Mesa {currentTableData.id}</h3>
                <p className="text-gray-400 text-xs font-bold uppercase tracking-widest">{currentTableData.currentOrder.customerName}</p>
              </div>
              <button onClick={() => setSelectedTable(null)} className="p-2 hover:bg-gray-100 rounded-full"><CloseIcon size={24}/></button>
            </div>

            <div className="flex-1 overflow-y-auto no-scrollbar pr-2 mb-6">
              {!isAddingItems ? (
                <>
                  <div className="flex justify-between items-center mb-4">
                    <h4 className="text-xs font-black uppercase tracking-widest text-gray-400">Itens Consumidos</h4>
                    <button 
                      onClick={() => setIsAddingItems(true)}
                      className="text-[10px] font-black bg-yellow-400 px-3 py-1 rounded-full uppercase hover:brightness-110"
                    >
                      + Adicionar Itens
                    </button>
                  </div>
                  <div className="space-y-3">
                    {currentTableData.currentOrder.items.map(item => (
                      <div key={item.id} className="flex justify-between items-center border-b border-gray-50 pb-2">
                        <div className="flex items-center gap-3">
                          <span className="bg-gray-100 w-6 h-6 flex items-center justify-center rounded-md text-[10px] font-black">{item.quantity}x</span>
                          <span className="font-bold text-sm text-gray-700">{item.name}</span>
                        </div>
                        <span className="font-black text-gray-900 text-sm">R$ {(item.price * item.quantity).toFixed(2)}</span>
                      </div>
                    ))}
                  </div>
                </>
              ) : (
                <>
                  <div className="flex items-center gap-4 mb-4">
                    <button onClick={() => setIsAddingItems(false)} className="text-gray-400 hover:text-black">
                      <svg width="24" height="24" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7"/></svg>
                    </button>
                    <h4 className="text-xs font-black uppercase tracking-widest text-gray-900">Escolha os produtos</h4>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {MENU_ITEMS.map(product => (
                      <button 
                        key={product.id}
                        onClick={() => onAddToOrder(currentTableData.id, product)}
                        className="flex items-center gap-3 p-3 bg-gray-50 rounded-2xl hover:bg-yellow-50 border border-transparent hover:border-yellow-200 transition-all text-left group"
                      >
                        <img src={product.image} className="w-12 h-12 object-cover rounded-xl" />
                        <div className="flex-1">
                          <p className="text-[11px] font-black text-gray-900 leading-tight">{product.name}</p>
                          <p className="text-[10px] font-bold text-yellow-700">R$ {product.price.toFixed(2)}</p>
                        </div>
                        <div className="bg-black text-white p-1 rounded-lg group-active:scale-90 transition-transform">
                          <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M12 4v16m8-8H4"/></svg>
                        </div>
                      </button>
                    ))}
                  </div>
                </>
              )}
            </div>

            <div className="shrink-0">
              <div className="grid grid-cols-2 gap-4 mb-6">
                <div className="bg-gray-50 p-4 rounded-2xl">
                  <p className="text-[10px] font-black text-gray-400 uppercase mb-1">Pagamento</p>
                  <p className="font-black text-gray-900">{currentTableData.currentOrder.paymentMethod}</p>
                </div>
                <div className="bg-black p-4 rounded-2xl">
                  <p className="text-[10px] font-black text-gray-400 uppercase mb-1">Total Atual</p>
                  <p className="font-black text-yellow-400 text-xl">R$ {currentTableData.currentOrder.total.toFixed(2)}</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <button 
                  onClick={() => handlePrint(currentTableData.currentOrder!)}
                  className="bg-gray-900 text-white py-4 rounded-2xl font-black uppercase tracking-widest text-xs shadow-lg hover:bg-black transition-colors"
                >
                  Imprimir Conta
                </button>
                <button 
                  onClick={() => {
                    onUpdateTable(currentTableData.id, 'free', null);
                    setSelectedTable(null);
                  }}
                  className="bg-green-500 text-white py-4 rounded-2xl font-black uppercase tracking-widest text-xs shadow-lg hover:bg-green-600 transition-colors"
                >
                  Fechar & Liberar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminPanel;
