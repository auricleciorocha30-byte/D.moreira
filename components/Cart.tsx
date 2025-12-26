import React, { useState, useMemo } from 'react';
import { CartItem, Product } from '../types';
import { STORE_INFO, MENU_ITEMS } from '../constants';
import { CloseIcon, TrashIcon } from './Icons';

interface CartProps {
  isOpen: boolean;
  onClose: () => void;
  items: CartItem[];
  onUpdateQuantity: (id: string, delta: number) => void;
  onRemove: (id: string) => void;
  onAdd: (product: Product) => void; // Adicionado para permitir adicionar das sugestões
}

const Cart: React.FC<CartProps> = ({ isOpen, onClose, items, onUpdateQuantity, onRemove, onAdd }) => {
  const [customerName, setCustomerName] = useState('');
  const [tableNumber, setTableNumber] = useState('');
  
  const total = items.reduce((acc, item) => acc + item.price * item.quantity, 0);

  // Lógica de Upsell: Sugerir 3 itens que NÃO estão no carrinho
  const suggestions = useMemo(() => {
    const itemIdsInCart = new Set(items.map(i => i.id));
    return MENU_ITEMS
      .filter(item => !itemIdsInCart.has(item.id))
      .sort(() => 0.5 - Math.random()) // Aleatoriza as sugestões
      .slice(0, 3);
  }, [items, isOpen]);

  const handleCheckout = () => {
    if (items.length === 0) return;
    if (!customerName.trim()) {
      alert('Por favor, informe seu nome para que possamos identificar seu pedido.');
      return;
    }

    let message = `*NOVO PEDIDO - D.MOREIRA*\n`;
    message += `------------------------------\n`;
    message += `👤 *Cliente:* ${customerName}\n`;
    message += `📍 *Mesa:* ${tableNumber || 'Consumo Local'}\n`;
    message += `------------------------------\n\n`;
    
    items.forEach(item => {
      message += `• ${item.quantity}x ${item.name} - R$ ${(item.price * item.quantity).toFixed(2).replace('.', ',')}\n`;
    });
    
    message += `\n💰 *Total: R$ ${total.toFixed(2).replace('.', ',')}*`;
    message += `\n\n_D.Moreira: Sua parada obrigatória ⛽_`;

    const encodedMessage = encodeURIComponent(message);
    window.open(`https://wa.me/${STORE_INFO.whatsapp}?text=${encodedMessage}`, '_blank');
  };

  return (
    <>
      {/* Overlay */}
      <div 
        className={`fixed inset-0 bg-black/70 backdrop-blur-md z-[50] transition-opacity duration-300 ${isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
        onClick={onClose}
      />
      
      {/* Sidebar */}
      <div className={`fixed right-0 top-0 h-full w-full max-w-md bg-white z-[60] shadow-2xl transition-transform duration-500 ease-out transform ${isOpen ? 'translate-x-0' : 'translate-x-full'} flex flex-col`}>
        <div className="p-6 bg-white border-b flex justify-between items-center sticky top-0 z-10">
          <div>
            <h2 className="text-2xl font-black text-gray-900 leading-none">Sua Sacola</h2>
            <p className="text-gray-500 text-xs mt-1 font-medium">{items.length} {items.length === 1 ? 'item selecionado' : 'itens selecionados'}</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full transition-colors">
            <CloseIcon className="w-7 h-7 text-gray-900" size={28} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-8 no-scrollbar">
          {items.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center opacity-60">
              <div className="bg-gray-100 p-8 rounded-full mb-6">
                <svg className="w-16 h-16 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
                </svg>
              </div>
              <p className="text-xl font-bold text-gray-900">Sacola vazia</p>
              <p className="text-gray-500 mt-2 max-w-[200px]">Adicione alguns de nossos lanches deliciosos!</p>
              <button onClick={onClose} className="mt-8 bg-yellow-400 text-black px-8 py-3 rounded-full font-black shadow-lg">Escolher Itens</button>
            </div>
          ) : (
            <>
              {/* Items List */}
              <div className="space-y-4">
                <h3 className="text-xs font-black text-black uppercase tracking-widest flex items-center gap-2">
                   <span className="w-1.5 h-4 bg-yellow-400 rounded-full"></span>
                   Seu Pedido
                </h3>
                {items.map(item => (
                  <div key={item.id} className="bg-white p-4 rounded-3xl border border-gray-100 flex gap-4 hover:border-yellow-200 transition-colors">
                    <img src={item.image} className="w-20 h-20 object-cover rounded-2xl shrink-0" alt={item.name} />
                    <div className="flex-1 flex flex-col justify-between py-1">
                      <div className="flex justify-between items-start">
                        <h4 className="font-extrabold text-gray-900 text-sm leading-tight pr-2">{item.name}</h4>
                        <button onClick={() => onRemove(item.id)} className="text-gray-300 hover:text-red-500 transition-colors">
                          <TrashIcon className="w-4 h-4" size={16} />
                        </button>
                      </div>
                      <div className="flex items-center justify-between mt-2">
                        <p className="text-black font-black text-sm">
                          R$ {(item.price * item.quantity).toFixed(2).replace('.', ',')}
                        </p>
                        <div className="flex items-center bg-gray-50 rounded-xl p-1 border border-gray-100">
                          <button 
                            onClick={() => onUpdateQuantity(item.id, -1)}
                            className="w-7 h-7 flex items-center justify-center bg-white rounded-lg shadow-sm text-gray-600 font-bold"
                          >
                            -
                          </button>
                          <span className="w-7 text-center font-black text-xs text-gray-900">{item.quantity}</span>
                          <button 
                            onClick={() => onUpdateQuantity(item.id, 1)}
                            className="w-7 h-7 flex items-center justify-center bg-white rounded-lg shadow-sm text-gray-600 font-bold"
                          >
                            +
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* UPSELL SECTION: Complete sua Parada */}
              {suggestions.length > 0 && (
                <div className="bg-yellow-50 -mx-6 px-6 py-8 space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-[11px] font-black text-yellow-800 uppercase tracking-[0.2em] flex items-center gap-2">
                       <span className="w-1.5 h-4 bg-yellow-400 rounded-full"></span>
                       Complete sua Parada ⛽
                    </h3>
                  </div>
                  <div className="flex overflow-x-auto gap-4 pb-2 no-scrollbar">
                    {suggestions.map(item => (
                      <div key={item.id} className="bg-white p-3 rounded-[1.5rem] shadow-sm border border-yellow-100 flex-shrink-0 w-44">
                        <img src={item.image} className="w-full h-24 object-cover rounded-xl mb-3" alt={item.name} />
                        <h4 className="font-bold text-gray-900 text-xs mb-1 truncate">{item.name}</h4>
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-yellow-700 font-black text-xs">R$ {item.price.toFixed(2).replace('.', ',')}</span>
                          <button 
                            onClick={() => onAdd(item)}
                            className="bg-black text-white p-2 rounded-lg hover:scale-105 transition-transform"
                          >
                            <svg width="14" height="14" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M12 4v16m8-8H4" />
                            </svg>
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Customer Info Form */}
              <div className="bg-gray-50 p-6 rounded-3xl border border-gray-100 space-y-5">
                <h3 className="text-xs font-black text-black uppercase tracking-widest flex items-center gap-2">
                   <span className="w-1.5 h-4 bg-yellow-400 rounded-full"></span>
                   Identificação
                </h3>
                <div className="space-y-4">
                  <div>
                    <label className="block text-[10px] font-black text-gray-400 mb-1 uppercase tracking-wider">Como te chamamos? *</label>
                    <input 
                      type="text" 
                      value={customerName}
                      onChange={(e) => setCustomerName(e.target.value)}
                      placeholder="Seu nome"
                      className="w-full bg-white border border-gray-200 rounded-2xl px-5 py-4 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-yellow-400 transition-all"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-black text-gray-400 mb-1 uppercase tracking-wider">Mesa / Local</label>
                    <input 
                      type="text" 
                      value={tableNumber}
                      onChange={(e) => setTableNumber(e.target.value)}
                      placeholder="Ex: Mesa 04"
                      className="w-full bg-white border border-gray-200 rounded-2xl px-5 py-4 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-yellow-400 transition-all"
                    />
                  </div>
                </div>
              </div>
            </>
          )}
        </div>

        {items.length > 0 && (
          <div className="p-6 bg-white border-t space-y-4 shadow-[0_-10px_40px_rgba(0,0,0,0.05)] sticky bottom-0">
            <div className="flex justify-between items-end pb-2">
              <span className="text-gray-400 font-black uppercase text-xs tracking-widest">Total</span>
              <span className="font-black text-3xl text-gray-900 leading-none">R$ {total.toFixed(2).replace('.', ',')}</span>
            </div>
            <button 
              onClick={handleCheckout}
              className="w-full bg-green-500 hover:bg-green-600 text-white font-black py-5 rounded-3xl flex items-center justify-center gap-3 transition-all active:scale-95 shadow-xl shadow-green-100 text-lg"
            >
              <span>Concluir via WhatsApp</span>
              <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12.031 6.172c-3.181 0-5.767 2.586-5.768 5.766-.001 1.298.38 2.27 1.019 3.287l-.582 2.128 2.185-.573c.948.604 2.015.997 3.145 1.002h.002c3.181 0 5.767-2.586 5.768-5.766-.001-3.18-2.587-5.766-5.769-5.766zm4.186 8.222c-.173.487-.863.89-1.396.947-.462.05-1.066.075-1.727-.144-2.833-.939-4.667-3.805-4.808-3.991-.141-.188-1.032-1.37-1.032-2.615 0-1.245.658-1.854.893-2.108.235-.254.517-.318.689-.318.173 0 .346.003.496.01.159.006.371-.059.581.455.215.527.737 1.794.8 1.921.063.127.105.275.021.444-.084.169-.127.275-.254.423-.127.148-.266.331-.38.444-.127.127-.261.266-.112.52.148.254.658 1.082 1.412 1.754.97.865 1.789 1.133 2.043 1.26.254.127.402.106.551-.063.148-.169.635-.74.804-.994.169-.254.338-.212.571-.127s1.481.698 1.735.825c.254.127.423.19.487.296.063.106.063.614-.11 1.101z" />
              </svg>
            </button>
          </div>
        )}
      </div>
    </>
  );
};

export default Cart;