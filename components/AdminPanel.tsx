
import React, { useState } from 'react';
import { Table, Order, PrintConfig } from '../types';
import { TrashIcon, CloseIcon } from './Icons';

interface AdminPanelProps {
  tables: Table[];
  onUpdateTable: (tableId: number, status: 'free' | 'occupied', order?: Order | null) => void;
  onLogout: () => void;
}

const AdminPanel: React.FC<AdminPanelProps> = ({ tables, onUpdateTable, onLogout }) => {
  const [selectedTable, setSelectedTable] = useState<Table | null>(null);
  const [printConfig, setPrintConfig] = useState<PrintConfig>({ width: '58mm' });

  const handlePrint = (order: Order) => {
    const printWindow = window.open('', '_blank', 'width=400,height=600');
    if (!printWindow) return;

    const widthPx = printConfig.width === '58mm' ? '300px' : '400px';

    printWindow.document.write(`
      <html>
        <head>
          <style>
            body { font-family: 'Courier New', monospace; width: ${widthPx}; margin: 0 auto; padding: 20px; font-size: 14px; line-height: 1.2; }
            .center { text-align: center; }
            .line { border-bottom: 1px dashed #000; margin: 10px 0; }
            .flex { display: flex; justify-content: space-between; }
            .bold { font-weight: bold; }
          </style>
        </head>
        <body onload="window.print(); window.close();">
          <div class="center bold">D.MOREIRA - CONVENIÊNCIA</div>
          <div class="center">Parada Obrigatória ⛽</div>
          <div class="line"></div>
          <div>PEDIDO: ${order.id}</div>
          <div>MESA: ${order.tableId}</div>
          <div>DATA: ${new Date(order.timestamp).toLocaleString()}</div>
          <div class="line"></div>
          <div class="bold">ITENS:</div>
          ${order.items.map(i => `
            <div class="flex">
              <span>${i.quantity}x ${i.name}</span>
              <span>R$ ${(i.price * i.quantity).toFixed(2)}</span>
            </div>
          `).join('')}
          <div class="line"></div>
          <div class="flex bold">
            <span>TOTAL:</span>
            <span>R$ ${order.total.toFixed(2)}</span>
          </div>
          <div>PAGAMENTO: ${order.paymentMethod}</div>
          <div class="line"></div>
          <div class="center">Obrigado pela preferência!</div>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  return (
    <div className="p-4 md:p-8 max-w-6xl mx-auto">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h2 className="text-3xl font-black text-gray-900 italic">Dashboard Admin</h2>
          <p className="text-gray-500 text-xs font-bold uppercase tracking-widest">Controle de Mesas & Pedidos</p>
        </div>
        <div className="flex items-center gap-4">
          <select 
            className="bg-gray-100 text-xs font-black px-4 py-2 rounded-xl"
            value={printConfig.width}
            onChange={(e) => setPrintConfig({ width: e.target.value as any })}
          >
            <option value="58mm">Impressão 58mm</option>
            <option value="80mm">Impressão 80mm</option>
          </select>
          <button onClick={onLogout} className="bg-black text-white px-6 py-2 rounded-xl font-bold text-sm">Sair</button>
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-6">
        {tables.map(table => (
          <button
            key={table.id}
            onClick={() => table.currentOrder && setSelectedTable(table)}
            className={`p-6 rounded-[2rem] border-4 transition-all flex flex-col items-center justify-center gap-2 ${
              table.status === 'free' 
                ? 'bg-gray-50 border-gray-100 opacity-60' 
                : 'bg-yellow-400 border-black shadow-xl scale-105'
            }`}
          >
            <span className="text-xs font-black uppercase tracking-widest">Mesa</span>
            <span className="text-4xl font-black">{table.id}</span>
            <span className={`text-[10px] font-bold uppercase px-3 py-1 rounded-full ${
              table.status === 'free' ? 'bg-gray-200 text-gray-500' : 'bg-black text-white'
            }`}>
              {table.status === 'free' ? 'Livre' : 'Ocupada'}
            </span>
          </button>
        ))}
      </div>

      {/* Modal de Detalhes da Mesa */}
      {selectedTable && selectedTable.currentOrder && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-6">
          <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={() => setSelectedTable(null)} />
          <div className="relative bg-white w-full max-w-lg rounded-[3rem] p-8 shadow-2xl">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-2xl font-black">Pedido Mesa {selectedTable.id}</h3>
              <button onClick={() => setSelectedTable(null)}><CloseIcon size={24}/></button>
            </div>

            <div className="space-y-4 mb-8 max-h-[40vh] overflow-y-auto no-scrollbar">
              {selectedTable.currentOrder.items.map(item => (
                <div key={item.id} className="flex justify-between border-b border-gray-100 pb-2">
                  <span className="font-bold">{item.quantity}x {item.name}</span>
                  <span className="font-black text-gray-600">R$ {(item.price * item.quantity).toFixed(2)}</span>
                </div>
              ))}
            </div>

            <div className="flex justify-between items-end mb-8 bg-gray-50 p-6 rounded-3xl">
              <div>
                <p className="text-xs font-black text-gray-400 uppercase">Pagamento</p>
                <p className="text-lg font-black">{selectedTable.currentOrder.paymentMethod}</p>
              </div>
              <div className="text-right">
                <p className="text-xs font-black text-gray-400 uppercase">Total</p>
                <p className="text-3xl font-black">R$ {selectedTable.currentOrder.total.toFixed(2)}</p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <button 
                onClick={() => handlePrint(selectedTable.currentOrder!)}
                className="bg-black text-white py-4 rounded-2xl font-black uppercase tracking-widest text-xs"
              >
                Imprimir Conta
              </button>
              <button 
                onClick={() => {
                  onUpdateTable(selectedTable.id, 'free', null);
                  setSelectedTable(null);
                }}
                className="bg-green-500 text-white py-4 rounded-2xl font-black uppercase tracking-widest text-xs"
              >
                Liberar Mesa
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminPanel;
