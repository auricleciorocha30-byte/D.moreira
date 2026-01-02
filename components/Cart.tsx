
import React, { useState, useMemo, useEffect } from 'react';
import { CartItem, Product, Order, OrderType, Coupon, LoyaltyConfig } from '../types';
import { CloseIcon } from './Icons';
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
    
    const isLoyaltyEnabled = loyaltyConfig?.isActive;
    if (isLoyaltyEnabled && !customerPhone.trim()) return alert('Informe seu número para acumular pontos de fidelidade!');

    let targetTableId = 0;
    let finalOrderType = orderType;

    if (orderType === 'table') {
      if (!tableNumber) return alert('Selecione uma mesa.');
      targetTableId = parseInt(tableNumber);
    } else if (orderType === 'delivery') {
      if (!address.trim()) return alert('Informe o endereço de entrega.');
      targetTableId = -900;
    } else if (orderType === 'takeaway') {
      targetTableId = -950;
      finalOrderType = 'counter';
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

    // Registrar acúmulo de fidelidade
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
        <div className="relative bg-white w-full max-w-sm rounded-[3rem] p-10 text-center shadow-2xl border-t-8 border-green-500">
          <div className="w-20 h-20 bg-green-100 text-green-500 rounded-full flex items-center justify-center mx-auto mb-6">
            <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>
          </div>
          <h2 className="text-3xl font-black text-gray-900 mb-2 italic">D.MOREIRA</h2>
          <p className="text-gray-500 font-bold uppercase text-[10px] tracking-widest">Pedido Enviado com Sucesso!</p>
          <button onClick={() => { setIsSuccess(false); onClose(); }} className="w-full bg-black text-white py-5 rounded-2xl font-black uppercase shadow-xl mt-8 tracking-widest text-[10px]">Fechar</button>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className={`fixed inset-0 bg-black/70 backdrop-blur-md z-[50] transition-opacity duration-300 ${isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}`} onClick={onClose}/>
      <div className={`fixed right-0 top-0 h-full w-full max-w-md bg-white z-[60] shadow-2xl transition-transform duration-500 ease-out transform ${isOpen ? 'translate-x-0' : 'translate-x-full'} flex flex-col`}>
        <div className="p-6 border-b flex justify-between items-center bg-white sticky top-0">
          <h2 className="text-2xl font-black text-gray-900 italic uppercase tracking-tighter">Minha Sacola</h2>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full"><CloseIcon size={28} /></button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-6 no-scrollbar pb-32">
          {items.length > 0 ? (
            <>
              <div className="bg-gray-50 p-6 rounded-[2.5rem] border border-gray-100 space-y-4 shadow-sm">
                <input type="text" value={customerName} onChange={(e) => setCustomerName(e.target.value)} placeholder="SEU NOME" className="w-full bg-white border-2 border-transparent focus:border-yellow-400 rounded-2xl px-5 py-4 text-xs font-black uppercase outline-none transition-all"/>
                
                {loyaltyConfig?.isActive && (
                  <div className="bg-yellow-400/10 p-4 rounded-2xl border border-yellow-200">
                     <p className="text-[9px] font-black uppercase mb-2 text-yellow-800 tracking-widest flex items-center gap-1">💎 Fidelidade Ativa</p>
                     <input 
                      type="tel" 
                      value={customerPhone} 
                      onChange={(e) => setCustomerPhone(e.target.value)} 
                      placeholder="SEU WHATSAPP" 
                      className="w-full bg-white border-2 border-transparent focus:border-yellow-400 rounded-xl px-4 py-3 text-[10px] font-black outline-none"
                     />
                  </div>
                )}

                <div className="space-y-3">
                  <p className="text-[9px] font-black uppercase text-gray-400 ml-1 tracking-widest">Onde Você Está?</p>
                  <div className="grid grid-cols-3 gap-2">
                    {(['table', 'takeaway', 'delivery'] as OrderType[]).map(type => (
                      <button key={type} onClick={() => setOrderType(type)} className={`py-3.5 rounded-xl text-[9px] font-black uppercase border-2 transition-all ${orderType === type ? 'bg-black text-white border-black shadow-lg' : 'bg-white text-gray-400 border-gray-100'}`}>
                        {type === 'table' ? 'Mesa' : type === 'takeaway' ? 'Balcão' : 'Entrega'}
                      </button>
                    ))}
                  </div>

                  {orderType === 'table' && (
                    <div className="pt-2 animate-in fade-in slide-in-from-top-2">
                      <p className="text-[9px] font-black uppercase text-gray-400 mb-3 ml-1">Selecione sua Mesa</p>
                      <div className="grid grid-cols-6 gap-2">
                        {Array.from({ length: 12 }, (_, i) => (i + 1).toString()).map(num => (
                          <button key={num} onClick={() => setTableNumber(num)} className={`h-10 rounded-lg text-[10px] font-black transition-all ${tableNumber === num ? 'bg-yellow-400 text-black shadow-md scale-110' : 'bg-white text-gray-400 border border-gray-100'}`}>{num}</button>
                        ))}
                      </div>
                    </div>
                  )}

                  {orderType === 'delivery' && (
                    <textarea value={address} onChange={(e) => setAddress(e.target.value)} placeholder="ENDEREÇO COMPLETO PARA ENTREGA..." className="w-full bg-white border-2 border-transparent focus:border-yellow-400 rounded-2xl p-4 text-[10px] font-black uppercase h-24 resize-none outline-none animate-in fade-in" />
                  )}
                </div>
              </div>

              {/* Cupom de Desconto */}
              <div className="bg-white p-5 rounded-[2rem] border-2 border-dashed border-gray-200">
                 <div className="flex gap-2">
                    <input 
                      type="text" 
                      value={couponCode} 
                      onChange={(e) => setCouponCode(e.target.value)} 
                      placeholder="TEM CUPOM?" 
                      className="flex-1 bg-gray-50 border-2 border-transparent focus:border-black rounded-xl px-4 py-3 text-[10px] font-black uppercase outline-none"
                    />
                    <button onClick={handleApplyCoupon} className="bg-black text-yellow-400 px-6 py-3 rounded-xl font-black text-[10px] uppercase shadow-md">OK</button>
                 </div>
                 {appliedCoupon && (
                   <div className="mt-3 flex justify-between items-center bg-green-50 px-4 py-2.5 rounded-xl border border-green-200 animate-in zoom-in">
                      <span className="text-[9px] font-black text-green-700 uppercase tracking-widest">Promo {appliedCoupon.code} ATIVA!</span>
                      <button onClick={() => setAppliedCoupon(null)} className="text-red-500 font-black text-xs">✕</button>
                   </div>
                 )}
              </div>

              <div className="space-y-4">
                <p className="text-[9px] font-black uppercase text-gray-400 ml-1 tracking-widest">Itens no Pedido</p>
                {items.map(item => (
                  <div key={item.id} className="bg-white p-4 rounded-3xl border border-gray-100 flex gap-4 shadow-sm">
                    <img src={item.image} className="w-16 h-16 object-cover rounded-2xl shadow-inner" />
                    <div className="flex-1">
                      <h4 className="font-black text-gray-900 text-xs uppercase truncate w-40">{item.name}</h4>
                      <div className="flex items-center justify-between mt-3">
                        <p className="font-black text-[11px] text-yellow-700 italic">R$ {item.price.toFixed(2)}</p>
                        <div className="flex items-center bg-gray-100 rounded-xl p-1">
                          <button onClick={() => onUpdateQuantity(item.id, -1)} className="w-8 h-8 bg-white rounded-lg shadow-sm font-black text-xs hover:bg-gray-50 transition-colors">-</button>
                          <span className="w-8 text-center text-xs font-black">{item.quantity}</span>
                          <button onClick={() => onUpdateQuantity(item.id, 1)} className="w-8 h-8 bg-white rounded-lg shadow-sm font-black text-xs hover:bg-gray-50 transition-colors">+</button>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <div className="h-full flex flex-col items-center justify-center text-center p-10">
              <div className="bg-gray-100 w-24 h-24 rounded-full flex items-center justify-center mb-6">
                <svg className="w-12 h-12 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" /></svg>
              </div>
              <p className="text-gray-400 font-black uppercase text-[10px] tracking-widest">Sua sacola está vazia</p>
            </div>
          )}
        </div>

        {items.length > 0 && (
          <div className="p-8 bg-white border-t-4 border-yellow-400 sticky bottom-0 shadow-[0_-20px_40px_-15px_rgba(0,0,0,0.1)]">
            <div className="space-y-2 mb-6">
              <div className="flex justify-between text-gray-400 font-black text-[10px] uppercase tracking-widest">
                <span>Subtotal</span><span>R$ {subtotal.toFixed(2)}</span>
              </div>
              {discount > 0 && (
                <div className="flex justify-between text-green-600 font-black text-[10px] uppercase tracking-widest">
                  <span>Desconto Aplicado</span><span>- R$ {discount.toFixed(2)}</span>
                </div>
              )}
              <div className="flex justify-between items-end pt-2">
                <span className="text-gray-400 font-black uppercase text-[9px] tracking-[0.2em]">Total Final</span>
                <span className="font-black text-3xl italic text-black leading-none">R$ {finalTotal.toFixed(2).replace('.', ',')}</span>
              </div>
            </div>
            <button onClick={handleCheckout} className="w-full bg-black text-yellow-400 font-black py-5 rounded-[2.5rem] shadow-2xl uppercase text-[11px] tracking-[0.2em] border-b-4 border-yellow-400 active:scale-95 transition-all">Finalizar Pedido</button>
          </div>
        )}
      </div>
    </>
  );
};

export default Cart;
