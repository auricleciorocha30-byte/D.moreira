
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
  const [takeawaySubtype, setTakeawaySubtype] = useState<'counter' | 'table'>('counter');
  const [address, setAddress] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<'Dinheiro' | 'Pix' | 'Cartão'>('Pix');
  const [isSuccess, setIsSuccess] = useState(false);
  
  const total = items.reduce((acc, item) => acc + item.price * item.quantity, 0);

  const suggestions = useMemo(() => {
    const itemIdsInCart = new Set(items.map(i => i.id));
    return MENU_ITEMS
      .filter(item => !itemIdsInCart.has(item.id))
      .slice(0, 3);
  }, [items, isOpen]);

  const handleCheckout = () => {
    if (items.length === 0) return;
    if (!customerName.trim()) return alert('Informe seu nome.');
    
    let targetTableId = 0;
    let finalOrderType = orderType;

    if (orderType === 'table') {
      if (!tableNumber) return alert('Selecione uma mesa.');
      targetTableId = parseInt(tableNumber);
    } else if (orderType === 'delivery') {
      if (!address.trim()) return alert('Informe o endereço.');
      targetTableId = 900; // Mesa Virtual de Entregas
    } else if (orderType === 'takeaway') {
      if (takeawaySubtype === 'table') {
        if (!tableNumber) return alert('Informe a mesa que você está.');
        targetTableId = parseInt(tableNumber);
      } else {
        targetTableId = 901; // Mesa Virtual de Retirada/Balcão
        finalOrderType = 'counter';
      }
    }

    const newOrder: Order = {
      id: Math.random().toString(36).substr(2, 6).toUpperCase(),
      customerName,
      items: [...items],
      total,
      paymentMethod,
      timestamp: new Date().toISOString(),
      tableId: targetTableId,
      orderType: finalOrderType,
      address: orderType === 'delivery' ? address : undefined,
      status: 'pending'
    };

    onPlaceOrder(newOrder);
    setIsSuccess(true);
    setCustomerName('');
    setTableNumber('');
    setAddress('');
  };

  if (isSuccess) {
    return (
      <div className={`fixed inset-0 z-[100] flex items-center justify-center p-6 ${isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}>
        <div className="absolute inset-0 bg-black/80 backdrop-blur-md" onClick={() => { setIsSuccess(false); onClose(); }} />
        <div className="relative bg-white w-full max-w-sm rounded-[3rem] p-10 text-center shadow-2xl">
          <div className="w-20 h-20 bg-green-100 text-green-500 rounded-full flex items-center justify-center mx-auto mb-6">
            <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>
          </div>
          <h2 className="text-3xl font-black text-gray-900 mb-2">Pedido Enviado!</h2>
          <p className="text-gray-500 font-bold mb-8 italic">Obrigado pela preferência.</p>
          <button onClick={() => { setIsSuccess(false); onClose(); }} className="w-full bg-black text-white py-4 rounded-2xl font-black uppercase tracking-widest shadow-xl">OK</button>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className={`fixed inset-0 bg-black/70 backdrop-blur-md z-[50] transition-opacity duration-300 ${isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}`} onClick={onClose}/>
      <div className={`fixed right-0 top-0 h-full w-full max-w-md bg-white z-[60] shadow-2xl transition-transform duration-500 ease-out transform ${isOpen ? 'translate-x-0' : 'translate-x-full'} flex flex-col`}>
        <div className="p-6 border-b flex justify-between items-center bg-white sticky top-0">
          <h2 className="text-2xl font-black text-gray-900 italic">Meu Pedido</h2>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full"><CloseIcon size={28} /></button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-8 no-scrollbar">
          {items.length > 0 && (
            <div className="bg-gray-50 p-6 rounded-[2.5rem] border border-gray-100 space-y-4">
              <input type="text" value={customerName} onChange={(e) => setCustomerName(e.target.value)} placeholder="Seu Nome" className="w-full bg-white border rounded-2xl px-5 py-4 text-sm font-bold outline-none focus:ring-2 focus:ring-yellow-400"/>
              
              <div className="space-y-4">
                <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 px-1">Como deseja?</label>
                <div className="grid grid-cols-1 gap-2">
                  <button onClick={() => setOrderType('table')} className={`py-3 rounded-xl text-xs font-black uppercase border-2 transition-all ${orderType === 'table' ? 'bg-black text-white border-black' : 'bg-white border-gray-200 text-gray-400'}`}>Consumir na Mesa</button>
                  <button onClick={() => setOrderType('takeaway')} className={`py-3 rounded-xl text-xs font-black uppercase border-2 transition-all ${orderType === 'takeaway' ? 'bg-black text-white border-black' : 'bg-white border-gray-200 text-gray-400'}`}>Para Viagem</button>
                  <button onClick={() => setOrderType('delivery')} className={`py-3 rounded-xl text-xs font-black uppercase border-2 transition-all ${orderType === 'delivery' ? 'bg-black text-white border-black' : 'bg-white border-gray-200 text-gray-400'}`}>Entrega</button>
                </div>

                {orderType === 'takeaway' && (
                  <div className="bg-yellow-400/10 p-4 rounded-2xl border border-yellow-200 animate-fade-in">
                    <p className="text-[9px] font-black uppercase mb-3 text-yellow-800">Onde você vai aguardar?</p>
                    <div className="flex gap-2">
                      <button onClick={() => setTakeawaySubtype('counter')} className={`flex-1 py-2 rounded-lg text-[10px] font-black uppercase ${takeawaySubtype === 'counter' ? 'bg-yellow-400 text-black' : 'bg-white text-gray-400'}`}>No Balcão</button>
                      <button onClick={() => setTakeawaySubtype('table')} className={`flex-1 py-2 rounded-lg text-[10px] font-black uppercase ${takeawaySubtype === 'table' ? 'bg-yellow-400 text-black' : 'bg-white text-gray-400'}`}>Na Mesa</button>
                    </div>
                  </div>
                )}

                {(orderType === 'table' || (orderType === 'takeaway' && takeawaySubtype === 'table')) && (
                  <select value={tableNumber} onChange={(e) => setTableNumber(e.target.value)} className="w-full bg-white border border-gray-200 rounded-2xl px-4 py-4 text-xs font-black uppercase outline-none">
                    <option value="">Selecione sua Mesa</option>
                    {Array.from({length: 12}, (_, i) => i + 1).map(n => <option key={n} value={n}>Mesa {n}</option>)}
                  </select>
                )}

                {orderType === 'delivery' && (
                  <input type="text" value={address} onChange={(e) => setAddress(e.target.value)} placeholder="Endereço de Entrega" className="w-full bg-white border rounded-2xl px-5 py-4 text-sm font-bold outline-none"/>
                )}

                <select value={paymentMethod} onChange={(e) => setPaymentMethod(e.target.value as any)} className="w-full bg-white border border-gray-200 rounded-2xl px-4 py-4 text-xs font-black uppercase outline-none">
                  <option value="Pix">Pagar com Pix</option>
                  <option value="Dinheiro">Pagar em Dinheiro</option>
                  <option value="Cartão">Pagar com Cartão</option>
                </select>
              </div>
            </div>
          )}

          <div className="space-y-4">
            {items.map(item => (
              <div key={item.id} className="bg-white p-4 rounded-3xl border border-gray-100 flex gap-4">
                <img src={item.image} className="w-16 h-16 object-cover rounded-2xl" />
                <div className="flex-1">
                  <div className="flex justify-between items-start">
                    <h4 className="font-extrabold text-gray-900 text-sm">{item.name}</h4>
                    <button onClick={() => onRemove(item.id)} className="text-gray-300 hover:text-red-500"><TrashIcon size={16}/></button>
                  </div>
                  <div className="flex items-center justify-between mt-3">
                    <p className="font-black text-xs italic">R$ {(item.price * item.quantity).toFixed(2)}</p>
                    <div className="flex items-center bg-gray-50 rounded-xl p-1">
                      <button onClick={() => onUpdateQuantity(item.id, -1)} className="w-7 h-7 bg-white rounded-lg shadow-sm font-black">-</button>
                      <span className="w-8 text-center text-xs font-black">{item.quantity}</span>
                      <button onClick={() => onUpdateQuantity(item.id, 1)} className="w-7 h-7 bg-white rounded-lg shadow-sm font-black">+</button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {items.length > 0 && (
          <div className="p-8 bg-white border-t sticky bottom-0">
            <div className="flex justify-between items-end mb-5">
              <span className="text-gray-400 font-black uppercase text-[10px]">Total</span>
              <span className="font-black text-3xl italic">R$ {total.toFixed(2).replace('.', ',')}</span>
            </div>
            <button onClick={handleCheckout} className="w-full bg-black text-yellow-400 font-black py-5 rounded-[2.5rem] shadow-2xl uppercase text-xs tracking-widest border-b-4 border-yellow-400 active:scale-95 transition-all">Finalizar Pedido</button>
          </div>
        )}
      </div>
    </>
  );
};

export default Cart;
