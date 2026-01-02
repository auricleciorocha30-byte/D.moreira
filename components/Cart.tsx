
import React, { useState, useMemo, useEffect } from 'react';
import { CartItem, Product, Order, OrderType, Coupon, LoyaltyConfig } from '../types';
import { MENU_ITEMS } from '../constants';
import { CloseIcon, TrashIcon } from './Icons';
import { supabase } from '../lib/supabase';

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
  const [customerPhone, setCustomerPhone] = useState('');
  const [couponCode, setCouponCode] = useState('');
  const [appliedCoupon, setAppliedCoupon] = useState<Coupon | null>(null);
  const [loyaltyConfig, setLoyaltyConfig] = useState<LoyaltyConfig | null>(null);
  
  const [tableNumber, setTableNumber] = useState('');
  const [orderType, setOrderType] = useState<OrderType>('table');
  const [takeawaySubtype, setTakeawaySubtype] = useState<'counter' | 'table'>('counter');
  const [address, setAddress] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<'Dinheiro' | 'Pix' | 'Cartão'>('Pix');
  const [isSuccess, setIsSuccess] = useState(false);

  useEffect(() => {
    if (isOpen) {
      supabase.from('loyalty_config').select('*').single().then(({ data }) => setLoyaltyConfig(data));
    }
  }, [isOpen]);

  const subtotal = items.reduce((acc, item) => acc + item.price * item.quantity, 0);
  
  const discount = useMemo(() => {
    if (!appliedCoupon) return 0;
    
    if (appliedCoupon.scopeType === 'all') {
      return (subtotal * appliedCoupon.percentage) / 100;
    }
    
    const eligibleTotal = items.reduce((acc, item) => {
      const isEligible = 
        (appliedCoupon.scopeType === 'category' && item.category === appliedCoupon.scopeValue) ||
        (appliedCoupon.scopeType === 'product' && item.id === appliedCoupon.scopeValue);
      return isEligible ? acc + (item.price * item.quantity) : acc;
    }, 0);
    
    return (eligibleTotal * appliedCoupon.percentage) / 100;
  }, [appliedCoupon, items, subtotal]);

  const finalTotal = subtotal - discount;

  const handleApplyCoupon = async () => {
    if (!couponCode) return;
    const { data } = await supabase.from('coupons').select('*').eq('code', couponCode.toUpperCase()).eq('isActive', true).single();
    if (data) {
      setAppliedCoupon(data);
    } else {
      alert('Cupom inválido ou expirado.');
      setAppliedCoupon(null);
    }
  };

  const handleCheckout = async () => {
    if (items.length === 0) return;
    if (!customerName.trim()) return alert('Informe seu nome.');
    
    // Se fidelidade está ativa para qualquer escopo, pedimos o telefone
    const isLoyaltyEnabled = loyaltyConfig?.isActive;
    if (isLoyaltyEnabled && !customerPhone.trim()) return alert('Informe seu número para acumular pontos de fidelidade!');

    let targetTableId = 0;
    let finalOrderType = orderType;

    if (orderType === 'table') {
      if (!tableNumber) return alert('Selecione uma mesa.');
      targetTableId = parseInt(tableNumber);
    } else if (orderType === 'delivery') {
      if (!address.trim()) return alert('Informe o endereço.');
      targetTableId = -900;
    } else if (orderType === 'takeaway') {
      if (takeawaySubtype === 'table') {
        if (!tableNumber) return alert('Informe a mesa.');
        targetTableId = parseInt(tableNumber);
      } else {
        targetTableId = -950;
        finalOrderType = 'counter';
      }
    }

    const newOrder: Order = {
      id: Math.random().toString(36).substr(2, 6).toUpperCase(),
      customerName,
      customerPhone,
      items: [...items],
      total: subtotal,
      discount,
      finalTotal,
      paymentMethod,
      timestamp: new Date().toISOString(),
      tableId: targetTableId,
      orderType: finalOrderType,
      address: orderType === 'delivery' ? address : undefined,
      status: 'pending',
      couponCode: appliedCoupon?.code
    };

    // Registrar acúmulo de fidelidade se elegível
    if (isLoyaltyEnabled && customerPhone) {
      const eligibleLoyaltyValue = items.reduce((acc, item) => {
        const isEligible = loyaltyConfig.scopeType === 'all' || 
          (loyaltyConfig.scopeType === 'category' && item.category === loyaltyConfig.scopeValue) ||
          (loyaltyConfig.scopeType === 'product' && item.id === loyaltyConfig.scopeValue);
        return isEligible ? acc + (item.price * item.quantity) : acc;
      }, 0);

      if (eligibleLoyaltyValue > 0) {
        const { data: user } = await supabase.from('loyalty_users').select('*').eq('phone', customerPhone).single();
        if (user) {
          await supabase.from('loyalty_users').update({ accumulated: user.accumulated + eligibleLoyaltyValue }).eq('phone', customerPhone);
        } else {
          await supabase.from('loyalty_users').insert([{ phone: customerPhone, name: customerName, accumulated: eligibleLoyaltyValue }]);
        }
      }
    }

    onPlaceOrder(newOrder);
    setIsSuccess(true);
    setAppliedCoupon(null);
    setCouponCode('');
  };

  if (isSuccess) {
    return (
      <div className="fixed inset-0 z-[100] flex items-center justify-center p-6">
        <div className="absolute inset-0 bg-black/80 backdrop-blur-md" onClick={() => { setIsSuccess(false); onClose(); }} />
        <div className="relative bg-white w-full max-w-sm rounded-[3rem] p-10 text-center shadow-2xl">
          <div className="w-20 h-20 bg-green-100 text-green-500 rounded-full flex items-center justify-center mx-auto mb-6">
            <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>
          </div>
          <h2 className="text-3xl font-black text-gray-900 mb-2">Pedido Enviado!</h2>
          <button onClick={() => { setIsSuccess(false); onClose(); }} className="w-full bg-black text-white py-4 rounded-2xl font-black uppercase shadow-xl mt-8">OK</button>
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

        <div className="flex-1 overflow-y-auto p-6 space-y-6 no-scrollbar">
          {items.length > 0 && (
            <div className="bg-gray-50 p-6 rounded-[2.5rem] border border-gray-100 space-y-4">
              <input type="text" value={customerName} onChange={(e) => setCustomerName(e.target.value)} placeholder="Seu Nome" className="w-full bg-white border rounded-2xl px-5 py-4 text-sm font-bold outline-none"/>
              
              {loyaltyConfig?.isActive && (
                <div className="bg-yellow-400/10 p-4 rounded-2xl border border-yellow-200">
                   <p className="text-[9px] font-black uppercase mb-2 text-yellow-800 tracking-widest">💎 Programa de Fidelidade Ativo</p>
                   <input 
                    type="tel" 
                    value={customerPhone} 
                    onChange={(e) => setCustomerPhone(e.target.value)} 
                    placeholder="Seu WhatsApp (Acumular Pontos)" 
                    className="w-full bg-white border rounded-xl px-4 py-3 text-xs font-bold outline-none"
                   />
                </div>
              )}

              <div className="space-y-4">
                <div className="grid grid-cols-1 gap-2">
                  <button onClick={() => setOrderType('table')} className={`py-3 rounded-xl text-xs font-black uppercase border-2 ${orderType === 'table' ? 'bg-black text-white' : 'bg-white text-gray-400'}`}>Mesa</button>
                  <button onClick={() => setOrderType('takeaway')} className={`py-3 rounded-xl text-xs font-black uppercase border-2 ${orderType === 'takeaway' ? 'bg-black text-white' : 'bg-white text-gray-400'}`}>Viagem</button>
                  <button onClick={() => setOrderType('delivery')} className={`py-3 rounded-xl text-xs font-black uppercase border-2 ${orderType === 'delivery' ? 'bg-black text-white' : 'bg-white text-gray-400'}`}>Entrega</button>
                </div>

                {orderType === 'delivery' && (
                  <input type="text" value={address} onChange={(e) => setAddress(e.target.value)} placeholder="Endereço Completo" className="w-full bg-white border rounded-2xl px-5 py-4 text-sm font-bold outline-none"/>
                )}
              </div>
            </div>
          )}

          {/* Cupom de Desconto */}
          {items.length > 0 && (
            <div className="bg-gray-50 p-5 rounded-[2rem] border border-dashed border-gray-300">
               <div className="flex gap-2">
                  <input 
                    type="text" 
                    value={couponCode} 
                    onChange={(e) => setCouponCode(e.target.value)} 
                    placeholder="TEM CUPOM?" 
                    className="flex-1 bg-white border rounded-xl px-4 py-3 text-xs font-black uppercase outline-none"
                  />
                  <button onClick={handleApplyCoupon} className="bg-black text-yellow-400 px-6 py-3 rounded-xl font-black text-[10px] uppercase">Aplicar</button>
               </div>
               {appliedCoupon && (
                 <div className="mt-3 flex justify-between items-center bg-green-50 px-3 py-2 rounded-lg border border-green-200">
                    <span className="text-[10px] font-black text-green-700 uppercase">Cupom {appliedCoupon.code} aplicado!</span>
                    <button onClick={() => setAppliedCoupon(null)} className="text-red-500 font-black text-xs">X</button>
                 </div>
               )}
            </div>
          )}

          <div className="space-y-4">
            {items.map(item => (
              <div key={item.id} className="bg-white p-4 rounded-3xl border border-gray-100 flex gap-4">
                <img src={item.image} className="w-16 h-16 object-cover rounded-2xl" />
                <div className="flex-1">
                  <h4 className="font-extrabold text-gray-900 text-sm">{item.name}</h4>
                  <div className="flex items-center justify-between mt-3">
                    <p className="font-black text-xs italic">R$ {item.price.toFixed(2)}</p>
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
            <div className="space-y-2 mb-5">
              <div className="flex justify-between text-gray-400 font-bold text-xs uppercase">
                <span>Subtotal</span><span>R$ {subtotal.toFixed(2)}</span>
              </div>
              {discount > 0 && (
                <div className="flex justify-between text-green-600 font-black text-xs uppercase">
                  <span>Desconto</span><span>- R$ {discount.toFixed(2)}</span>
                </div>
              )}
              <div className="flex justify-between items-end border-t pt-2">
                <span className="text-gray-400 font-black uppercase text-[10px]">Total</span>
                <span className="font-black text-3xl italic">R$ {finalTotal.toFixed(2).replace('.', ',')}</span>
              </div>
            </div>
            <button onClick={handleCheckout} className="w-full bg-black text-yellow-400 font-black py-5 rounded-[2.5rem] shadow-2xl uppercase text-xs tracking-widest border-b-4 border-yellow-400 active:scale-95 transition-all">Finalizar Pedido</button>
          </div>
        )}
      </div>
    </>
  );
};

export default Cart;
