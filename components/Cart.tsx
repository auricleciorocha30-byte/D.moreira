
import React, { useState } from 'react';
import { CartItem } from '../types';
import { STORE_INFO } from '../constants';
import { CloseIcon, TrashIcon } from './Icons';

interface CartProps {
  isOpen: boolean;
  onClose: () => void;
  items: CartItem[];
  onUpdateQuantity: (id: string, delta: number) => void;
  onRemove: (id: string) => void;
}

const Cart: React.FC<CartProps> = ({ isOpen, onClose, items, onUpdateQuantity, onRemove }) => {
  const [customerName, setCustomerName] = useState('');
  const [tableNumber, setTableNumber] = useState('');
  
  const total = items.reduce((acc, item) => acc + item.price * item.quantity, 0);

  const handleCheckout = () => {
    if (items.length === 0) return;
    if (!customerName.trim()) {
      alert('Por favor, informe seu nome para o pedido.');
      return;
    }

    let message = `*PEDIDO D.MOREIRA*\n`;
    message += `--------------------------\n`;
    message += `👤 *Cliente:* ${customerName}\n`;
    message += `📍 *Mesa:* ${tableNumber || 'Não informada'}\n`;
    message += `--------------------------\n\n`;
    
    items.forEach(item => {
      message += `• ${item.quantity}x ${item.name} - R$ ${(item.price * item.quantity).toFixed(2).replace('.', ',')}\n`;
    });
    
    message += `\n💰 *Total: R$ ${total.toFixed(2).replace('.', ',')}*`;
    message += `\n\n_D.Moreira é parada obrigatória ⛽_`;

    const encodedMessage = encodeURIComponent(message);
    window.open(`https://wa.me/${STORE_INFO.whatsapp}?text=${encodedMessage}`, '_blank');
  };

  return (
    <>
      {/* Overlay */}
      <div 
        className={`fixed inset-0 bg-black/60 backdrop-blur-sm z-40 transition-opacity duration-300 ${isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
        onClick={onClose}
      />
      
      {/* Sidebar */}
      <div className={`fixed right-0 top-0 h-full w-full max-w-md bg-gray-50 z-50 shadow-2xl transition-transform duration-300 ease-in-out transform ${isOpen ? 'translate-x-0' : 'translate-x-full'} flex flex-col`}>
        <div className="p-6 bg-white border-b flex justify-between items-center">
          <h2 className="text-xl font-bold flex items-center gap-2 text-gray-900">
            Seu Pedido
            <span className="bg-yellow-400 text-black text-xs font-black px-2 py-0.5 rounded-full">
              {items.length}
            </span>
          </h2>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full transition-colors">
            <CloseIcon className="w-6 h-6 text-gray-500" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {items.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center py-10">
              <div className="bg-gray-200 p-6 rounded-full mb-4">
                <svg className="w-12 h-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
                </svg>
              </div>
              <p className="text-gray-500 font-medium">Seu carrinho está vazio.</p>
              <button onClick={onClose} className="mt-4 text-yellow-600 font-bold hover:underline">Continuar comprando</button>
            </div>
          ) : (
            <>
              {/* Customer Info Fields */}
              <div className="bg-white p-5 rounded-2xl shadow-sm border border-yellow-200 mb-6 space-y-4">
                <h3 className="text-sm font-bold text-black uppercase tracking-wider mb-2">Dados do Pedido</h3>
                <div>
                  <label htmlFor="customerName" className="block text-xs font-bold text-gray-500 mb-1">SEU NOME *</label>
                  <input 
                    type="text" 
                    id="customerName"
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                    placeholder="Como podemos te chamar?"
                    className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-yellow-400 focus:border-transparent transition-all"
                  />
                </div>
                <div>
                  <label htmlFor="tableNumber" className="block text-xs font-bold text-gray-500 mb-1">MESA (OPCIONAL)</label>
                  <input 
                    type="text" 
                    id="tableNumber"
                    value={tableNumber}
                    onChange={(e) => setTableNumber(e.target.value)}
                    placeholder="Ex: 05"
                    className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-yellow-400 focus:border-transparent transition-all"
                  />
                </div>
              </div>

              <div className="space-y-4 pb-4">
                {items.map(item => (
                  <div key={item.id} className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100 flex gap-4">
                    <img src={item.image} className="w-20 h-20 object-cover rounded-xl" alt={item.name} />
                    <div className="flex-1">
                      <div className="flex justify-between items-start mb-1">
                        <h3 className="font-bold text-gray-900 leading-tight">{item.name}</h3>
                        <button onClick={() => onRemove(item.id)} className="text-gray-300 hover:text-red-500 transition-colors">
                          <TrashIcon />
                        </button>
                      </div>
                      <p className="text-yellow-600 font-bold text-sm mb-3">
                        R$ {item.price.toFixed(2).replace('.', ',')}
                      </p>
                      <div className="flex items-center gap-3">
                        <div className="flex items-center bg-gray-100 rounded-lg p-1">
                          <button 
                            onClick={() => onUpdateQuantity(item.id, -1)}
                            className="w-8 h-8 flex items-center justify-center bg-white rounded-md shadow-sm text-gray-600 active:scale-90"
                          >
                            -
                          </button>
                          <span className="w-8 text-center font-bold text-gray-900">{item.quantity}</span>
                          <button 
                            onClick={() => onUpdateQuantity(item.id, 1)}
                            className="w-8 h-8 flex items-center justify-center bg-white rounded-md shadow-sm text-gray-600 active:scale-90"
                          >
                            +
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>

        {items.length > 0 && (
          <div className="p-6 bg-white border-t space-y-4">
            <div className="flex justify-between items-center text-lg">
              <span className="text-gray-500">Subtotal</span>
              <span className="font-bold text-gray-900">R$ {total.toFixed(2).replace('.', ',')}</span>
            </div>
            <button 
              onClick={handleCheckout}
              className="w-full bg-green-500 hover:bg-green-600 text-white font-bold py-4 rounded-2xl flex items-center justify-center gap-3 transition-all active:scale-95 shadow-lg shadow-green-100"
            >
              <span>Enviar para o WhatsApp</span>
              <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12.031 6.172c-3.181 0-5.767 2.586-5.768 5.766-.001 1.298.38 2.27 1.019 3.287l-.582 2.128 2.185-.573c.948.604 2.015.997 3.145 1.002h.002c3.181 0 5.767-2.586 5.768-5.766-.001-3.18-2.587-5.766-5.769-5.766zm4.186 8.222c-.173.487-.863.89-1.396.947-.462.05-1.066.075-1.727-.144-2.833-.939-4.667-3.805-4.808-3.991-.141-.188-1.032-1.37-1.032-2.615 0-1.245.658-1.854.893-2.108.235-.254.517-.318.689-.318.173 0 .346.003.496.01.159.006.371-.059.581.455.215.527.737 1.794.8 1.921.063.127.105.275.021.444-.084.169-.127.275-.254.423-.127.148-.266.331-.38.444-.127.127-.261.266-.112.52.148.254.658 1.082 1.412 1.754.97.865 1.789 1.133 2.043 1.26.254.127.402.106.551-.063.148-.169.635-.74.804-.994.169-.254.338-.212.571-.127s1.481.698 1.735.825c.254.127.423.19.487.296.063.106.063.614-.11 1.101z" />
                <path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm0 22c-5.523 0-10-4.477-10-10S6.477 2 12 2s10 4.477 10 10-4.477 10-10 10z" />
              </svg>
            </button>
          </div>
        )}
      </div>
    </>
  );
};

export default Cart;
