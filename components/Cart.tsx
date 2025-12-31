
import React, { useState, useMemo } from 'react';
import { CartItem, Product, Order, OrderType } from '../types';
import { MENU_ITEMS } from '../constants';
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
  const [orderType, setOrderType] = useState<OrderType>('table');
  const [address, setAddress] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<'Dinheiro' | 'Pix' | 'Cartão'>('Pix');
  const [isSuccess, setIsSuccess] = useState(false);
  
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
    if (orderType === 'table' && !tableNumber) return alert('Selecione uma mesa.');
    if (orderType === 'delivery' && !address.trim()) return alert('Informe o endereço de entrega.');

    const tableId = orderType === 'table' ? parseInt(tableNumber) : 99; // 99 para pedidos fora de mesa

    const newOrder: Order = {
      id: Math.random().toString(36).substr(2, 6).toUpperCase(),
      customerName,
      items: [...items],
      total,
      paymentMethod,
      timestamp: new Date(),
      tableId,
      orderType,
      address: orderType === 'delivery' ? address : undefined,
      status: 'pending'
    };

    onPlaceOrder(newOrder);
    setIsSuccess(true);
    setCustomerName('');
    setTableNumber('');
    setAddress('');
  };

  const closeAndReset = () => {
    setIsSuccess(false);
    onClose();
  };

  if (isSuccess) {
    return (
      <div className={`fixed inset-0 z-[100] flex items-center justify-center p-6 ${isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}>
        <div className="absolute inset-0 bg-black/80 backdrop-blur-md" onClick={closeAndReset} />
        <div className="relative bg-white w-full max-w-sm rounded-[3rem] p-10 text-center shadow-2xl">
          <div className="w-20 h-20 bg-green-100 text-green-500 rounded-full flex items-center justify-center mx-auto mb-6">
            <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h2 className="text-3xl font-black text-gray-900 mb-2">Pedido Enviado!</h2>
          <p className="text-gray-500 font-bold mb-8 italic">D.Moreira agradece a preferência.</p>
          <button onClick={closeAndReset} className="w-full bg-black text-white py-4 rounded-2xl font-black uppercase tracking-widest shadow-xl active:scale-95 transition-all">OK</button>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className={`fixed inset-0 bg-black/70 backdrop-blur-md z-[50] transition-opacity duration-300 ${isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}`} onClick={onClose}/>
      <div className={`fixed right-0 top-0 h-full w-full max-w-md bg-white z-[60] shadow-2xl transition-transform duration-500 ease-out transform ${isOpen ? 'translate-x-0' : 'translate-x-full'} flex flex-col`}>
        <div className="p-6 bg-white border-b flex justify-between items-center sticky top-0 z-10">
          <h2 className="text-2xl font-black text-gray-900 leading-none italic">Minha Sacola</h2>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full transition-colors"><CloseIcon size={28} /></button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-8 no-scrollbar">
          {items.length > 0 && (
            <div className="bg-gray-50 p-6 rounded-[2.5rem] border border-gray-100 space-y-4">
              <h3 className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-2">Dados do Pedido</h3>
              
              <div className="space-y-4">
                <input type="text" value={customerName} onChange={(e) => setCustomerName(e.target.value)} placeholder="Seu Nome" className="w-full bg-white border border-gray-200 rounded-2xl px-5 py-3.5 text-sm font-bold focus:ring-2 focus:ring-yellow-400 outline-none"/>
                
                <div className="grid grid-cols-2 gap-3">
                  <select value={orderType} onChange={(e) => setOrderType(e.target.value as OrderType)} className="w-full bg-white border border-gray-200 rounded-2xl px-4 py-3.5 text-xs font-black uppercase tracking-tighter outline-none">
                    <option value="table">No Local (Mesa)</option>
                    <option value="takeaway">Para Viagem</option>
                    <option value="delivery">Entrega</option>
                  </select>
                  
                  {orderType === 'table' ? (
                    <select value={tableNumber} onChange={(e) => setTableNumber(e.target.value)} className="w-full bg-white border border-gray-200 rounded-2xl px-4 py-3.5 text-xs font-black uppercase outline-none">
                      <option value="">Qual Mesa?</option>
                      {Array.from({length: 12}, (_, i) => i + 1).map(n => <option key={n} value={n}>Mesa {n}</option>)}
                    </select>
                  ) : (
                    <select value={paymentMethod} onChange={(e) => setPaymentMethod(e.target.value as any)} className="w-full bg-white border border-gray-200 rounded-2xl px-4 py-3.5 text-xs font-black uppercase outline-none">
                      <option value="Pix">Pix</option>
                      <option value="Dinheiro">Dinheiro</option>
                      <option value="Cartão">Cartão</option>
                    </select>
                  )}
                </div>

                {orderType === 'delivery' && (
                  <input type="text" value={address} onChange={(e) => setAddress(e.target.value)} placeholder="Endereço Completo para Entrega" className="w-full bg-white border border-gray-200 rounded-2xl px-5 py-3.5 text-sm font-bold outline-none"/>
                )}

                {orderType === 'table' && (
                  <div className="pt-2">
                    <label className="block text-[9px] font-black text-gray-400 mb-1 uppercase tracking-widest px-1">Forma de Pagamento</label>
                    <select value={paymentMethod} onChange={(e) => setPaymentMethod(e.target.value as any)} className="w-full bg-white border border-gray-200 rounded-2xl px-4 py-3.5 text-xs font-black uppercase outline-none">
                      <option value="Pix">Pix</option>
                      <option value="Dinheiro">Dinheiro</option>
                      <option value="Cartão">Cartão</option>
                    </select>
                  </div>
                )}
              </div>
            </div>
          )}

          {items.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center opacity-30 py-20">
              <div className="bg-gray-100 p-8 rounded-full mb-4 italic font-black text-4xl">D.M</div>
              <p className="text-sm font-black text-gray-400 uppercase tracking-widest">Sua sacola está vazia</p>
            </div>
          ) : (
            <div className="space-y-4">
              <h3 className="text-[10px] font-black uppercase tracking-widest text-gray-400">Itens Selecionados</h3>
              {items.map(item => (
                <div key={item.id} className="bg-white p-4 rounded-3xl border border-gray-100 flex gap-4 transition-all hover:border-yellow-200">
                  <img src={item.image} className="w-16 h-16 object-cover rounded-2xl shadow-sm" alt={item.name} />
                  <div className="flex-1">
                    <div className="flex justify-between items-start">
                      <h4 className="font-extrabold text-gray-900 text-sm leading-tight">{item.name}</h4>
                      <button onClick={() => onRemove(item.id)} className="text-gray-300 hover:text-red-500 transition-colors"><TrashIcon size={16}/></button>
                    </div>
                    <div className="flex items-center justify-between mt-3">
                      <p className="text-black font-black text-xs italic">R$ {(item.price * item.quantity).toFixed(2)}</p>
                      <div className="flex items-center bg-gray-50 rounded-xl p-1 border border-gray-100">
                        <button onClick={() => onUpdateQuantity(item.id, -1)} className="w-7 h-7 bg-white rounded-lg shadow-sm text-xs font-black">-</button>
                        <span className="w-8 text-center text-xs font-black">{item.quantity}</span>
                        <button onClick={() => onUpdateQuantity(item.id, 1)} className="w-7 h-7 bg-white rounded-lg shadow-sm text-xs font-black">+</button>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
              
              {suggestions.length > 0 && (
                <div className="bg-yellow-400/10 p-6 rounded-[2.5rem] mt-8">
                  <h3 className="text-[10px] font-black uppercase tracking-widest text-yellow-800 mb-4 italic">Complete seu Pedido ⛽</h3>
                  <div className="flex gap-4 overflow-x-auto no-scrollbar pb-2">
                    {suggestions.map(item => (
                      <button key={item.id} onClick={() => onAdd(item)} className="bg-white p-3 rounded-[1.5rem] shadow-sm border border-yellow-200/50 shrink-0 w-32 active:scale-95 transition-transform">
                        <img src={item.image} className="w-full h-16 object-cover rounded-xl mb-2" />
                        <p className="text-[9px] font-bold truncate mb-1 text-gray-900">{item.name}</p>
                        <p className="text-[9px] text-yellow-700 font-black">R$ {item.price.toFixed(2)}</p>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {items.length > 0 && (
          <div className="p-8 bg-white border-t sticky bottom-0 shadow-[0_-15px_40px_rgba(0,0,0,0.08)]">
            <div className="flex justify-between items-end mb-5">
              <span className="text-gray-400 font-black uppercase text-[10px] tracking-widest">Total Geral</span>
              <span className="font-black text-3xl text-gray-900 italic">R$ {total.toFixed(2).replace('.', ',')}</span>
            </div>
            <button 
              onClick={handleCheckout} 
              className="w-full bg-black text-yellow-400 font-black py-5 rounded-[2.5rem] shadow-2xl active:scale-95 transition-all text-xs uppercase tracking-[0.2em] border-b-4 border-yellow-400"
            >
              Finalizar Pedido
            </button>
          </div>
        )}
      </div>
    </>
  );
};

export default Cart;
