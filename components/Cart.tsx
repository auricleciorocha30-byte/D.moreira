
import React, { useState, useMemo } from 'react';
import { CartItem, Product, Order } from '../types';
import { STORE_INFO, MENU_ITEMS } from '../constants';
import { CloseIcon, TrashIcon } from './Icons';

interface CartProps {
  isOpen: boolean;
  onClose: () => void;
  items: CartItem[];
  onUpdateQuantity: (id: string, delta: number) => void;
  onRemove: (id: string) => void;
  onAdd: (product: Product) => void;
  onPlaceOrder: (order: Order) => void;
}

const Cart: React.FC<CartProps> = ({ isOpen, onClose, items, onUpdateQuantity, onRemove, onAdd, onPlaceOrder }) => {
  const [customerName, setCustomerName] = useState('');
  const [tableNumber, setTableNumber] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<'Dinheiro' | 'Pix' | 'Cartão'>('Pix');
  
  const total = items.reduce((acc, item) => acc + item.price * item.quantity, 0);

  const suggestions = useMemo(() => {
    const itemIdsInCart = new Set(items.map(i => i.id));
    return MENU_ITEMS
      .filter(item => !itemIdsInCart.has(item.id))
      .sort(() => 0.5 - Math.random())
      .slice(0, 3);
  }, [items, isOpen]);

  const handleCheckout = () => {
    if (items.length === 0) return;
    if (!customerName.trim()) return alert('Informe seu nome.');
    if (!tableNumber.trim()) return alert('Selecione uma mesa.');

    const tableId = parseInt(tableNumber);
    if (isNaN(tableId)) return alert('Número de mesa inválido.');

    const newOrder: Order = {
      id: Math.random().toString(36).substr(2, 9).toUpperCase(),
      customerName,
      items: [...items],
      total,
      paymentMethod,
      timestamp: new Date(),
      tableId
    };

    onPlaceOrder(newOrder);
    onClose();
    
    // Feedback de sucesso
    alert(`Pedido ${newOrder.id} enviado com sucesso! A mesa ${tableId} está agora ocupada.`);
    
    // WhatsApp Fallback
    let message = `*NOVO PEDIDO - D.MOREIRA*\n`;
    message += `ID: ${newOrder.id}\n`;
    message += `Mesa: ${tableId}\n`;
    message += `Pagamento: ${paymentMethod}\n`;
    message += `Total: R$ ${total.toFixed(2)}`;
    window.open(`https://wa.me/${STORE_INFO.whatsapp}?text=${encodeURIComponent(message)}`, '_blank');
  };

  return (
    <>
      <div className={`fixed inset-0 bg-black/70 backdrop-blur-md z-[50] transition-opacity duration-300 ${isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}`} onClick={onClose}/>
      <div className={`fixed right-0 top-0 h-full w-full max-w-md bg-white z-[60] shadow-2xl transition-transform duration-500 ease-out transform ${isOpen ? 'translate-x-0' : 'translate-x-full'} flex flex-col`}>
        <div className="p-6 bg-white border-b flex justify-between items-center sticky top-0 z-10">
          <div><h2 className="text-2xl font-black text-gray-900">Sua Sacola</h2></div>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full transition-colors">
            <CloseIcon className="w-7 h-7 text-gray-900" size={28} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-8 no-scrollbar">
          {items.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center">
              <p className="text-xl font-bold text-gray-900">Sacola vazia</p>
            </div>
          ) : (
            <>
              <div className="space-y-4">
                {items.map(item => (
                  <div key={item.id} className="bg-white p-4 rounded-3xl border border-gray-100 flex gap-4">
                    <img src={item.image} className="w-16 h-16 object-cover rounded-2xl" alt={item.name} />
                    <div className="flex-1">
                      <h4 className="font-extrabold text-gray-900 text-sm">{item.name}</h4>
                      <div className="flex items-center justify-between mt-2">
                        <p className="text-black font-black text-xs">R$ {(item.price * item.quantity).toFixed(2)}</p>
                        <div className="flex items-center bg-gray-50 rounded-lg p-1">
                          <button onClick={() => onUpdateQuantity(item.id, -1)} className="w-6 h-6 bg-white rounded shadow-sm text-xs font-bold">-</button>
                          <span className="w-6 text-center text-xs font-black">{item.quantity}</span>
                          <button onClick={() => onUpdateQuantity(item.id, 1)} className="w-6 h-6 bg-white rounded shadow-sm text-xs font-bold">+</button>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Sugestões Upsell */}
              {suggestions.length > 0 && (
                <div className="bg-yellow-50 -mx-6 px-6 py-6">
                  <h3 className="text-[10px] font-black uppercase tracking-widest mb-4">Complete sua Parada ⛽</h3>
                  <div className="flex gap-4 overflow-x-auto no-scrollbar">
                    {suggestions.map(item => (
                      <button key={item.id} onClick={() => onAdd(item)} className="bg-white p-2 rounded-2xl shadow-sm border border-yellow-100 shrink-0 w-32">
                        <img src={item.image} className="w-full h-16 object-cover rounded-xl mb-2" />
                        <p className="text-[10px] font-bold truncate">{item.name}</p>
                        <p className="text-[10px] text-yellow-700 font-black">R$ {item.price.toFixed(2)}</p>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Formulário de Finalização */}
              <div className="space-y-6">
                <div>
                  <label className="block text-[10px] font-black text-gray-400 mb-2 uppercase">Identificação</label>
                  <input type="text" value={customerName} onChange={(e) => setCustomerName(e.target.value)} placeholder="Seu nome" className="w-full bg-gray-50 border border-gray-200 rounded-2xl px-5 py-4 text-sm font-semibold"/>
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] font-black text-gray-400 mb-2 uppercase">Mesa</label>
                    <select value={tableNumber} onChange={(e) => setTableNumber(e.target.value)} className="w-full bg-gray-50 border border-gray-200 rounded-2xl px-5 py-4 text-sm font-semibold">
                      <option value="">Escolha</option>
                      {[1,2,3,4,5,6,7,8,9,10,11,12].map(n => <option key={n} value={n}>Mesa {n}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-[10px] font-black text-gray-400 mb-2 uppercase">Pagamento</label>
                    <select value={paymentMethod} onChange={(e) => setPaymentMethod(e.target.value as any)} className="w-full bg-gray-50 border border-gray-200 rounded-2xl px-5 py-4 text-sm font-semibold">
                      <option value="Pix">Pix</option>
                      <option value="Dinheiro">Dinheiro</option>
                      <option value="Cartão">Cartão</option>
                    </select>
                  </div>
                </div>
              </div>
            </>
          )}
        </div>

        {items.length > 0 && (
          <div className="p-6 bg-white border-t sticky bottom-0">
            <div className="flex justify-between items-end mb-4">
              <span className="text-gray-400 font-black uppercase text-[10px]">Total</span>
              <span className="font-black text-2xl text-gray-900">R$ {total.toFixed(2).replace('.', ',')}</span>
            </div>
            <button onClick={handleCheckout} className="w-full bg-green-500 text-white font-black py-5 rounded-[2rem] shadow-xl hover:bg-green-600 active:scale-95 transition-all">
              Finalizar Pedido
            </button>
          </div>
        )}
      </div>
    </>
  );
};

export default Cart;
