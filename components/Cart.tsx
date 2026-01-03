
import React, { useState, useMemo, useEffect } from 'react';
import { CartItem, Product, Order, OrderType, Coupon, LoyaltyConfig } from '../types';
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
  const [appliedCoupons, setAppliedCoupons] = useState<Coupon[]>([]);
  const [loyaltyConfig, setLoyaltyConfig] = useState<LoyaltyConfig | null>(null);
  const [tableNumber, setTableNumber] = useState('');
  const [orderType, setOrderType] = useState<OrderType>('table');
  const [address, setAddress] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<'Dinheiro' | 'Pix' | 'Cartão'>('Pix');
  const [isSuccess, setIsSuccess] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

  useEffect(() => {
    if (isOpen) {
      supabase.from('loyalty_config').select('*').single().then(({ data }) => { 
        if (data) setLoyaltyConfig({
          isActive: data.is_active,
          spendingGoal: data.spending_goal,
          scopeType: data.scope_type,
          scopeValue: data.scope_value
        }); 
      });
    }
  }, [isOpen]);

  const subtotal = useMemo(() => items.reduce((acc, item) => acc + item.price * item.quantity, 0), [items]);
  
  const discount = useMemo(() => {
    if (appliedCoupons.length === 0) return 0;
    
    return items.reduce((totalDiscount, item) => {
      // Encontra todos os cupons que podem ser aplicados a este item específico
      const validCoupons = appliedCoupons.filter(c => {
        if (!c.isActive) return false;
        if (c.scopeType === 'all') return true;
        const scopeValues = (c.scopeValue || '').split(',');
        if (c.scopeType === 'category') return scopeValues.includes(item.category);
        if (c.scopeType === 'product') return scopeValues.includes(item.id);
        return false;
      });

      if (validCoupons.length === 0) return totalDiscount;

      // Se houver mais de um cupom com o mesmo código aplicável ao item, escolhe o melhor desconto
      const bestCoupon = validCoupons.reduce((prev, curr) => 
        (curr.percentage > prev.percentage) ? curr : prev
      );

      return totalDiscount + (item.price * item.quantity * bestCoupon.percentage / 100);
    }, 0);
  }, [appliedCoupons, items]);

  const finalTotal = subtotal - discount;

  const handleCheckout = async () => {
    if (items.length === 0 || !customerName.trim()) return alert('Informe seu nome.');
    setIsProcessing(true);
    let targetTableId = orderType === 'table' ? (parseInt(tableNumber) || 0) : orderType === 'delivery' ? -900 : -950;
    
    const newOrder: Order = {
      id: Math.random().toString(36).substr(2, 6).toUpperCase(),
      customerName, customerPhone: customerPhone.trim() || undefined,
      items: [...items], total: subtotal, discount, finalTotal, paymentMethod,
      timestamp: new Date().toISOString(), tableId: targetTableId,
      orderType: orderType === 'takeaway' ? 'counter' : orderType,
      address: orderType === 'delivery' ? address : undefined, status: 'pending', 
      couponCode: appliedCoupons.length > 0 ? appliedCoupons[0].code : undefined
    };

    try {
      if (loyaltyConfig?.isActive && customerPhone.trim()) {
        const eligibleValues = (loyaltyConfig.scopeValue || '').split(',');
        const eligible = items.reduce((acc, item) => {
          const ok = loyaltyConfig.scopeType === 'all' || 
                    (loyaltyConfig.scopeType === 'category' && eligibleValues.includes(item.category)) || 
                    (loyaltyConfig.scopeType === 'product' && eligibleValues.includes(item.id));
          return ok ? acc + (item.price * item.quantity) : acc;
        }, 0);
        
        const { data: user } = await supabase.from('loyalty_users').select('*').eq('phone', customerPhone).maybeSingle();
        if (user) await supabase.from('loyalty_users').update({ accumulated: Number(user.accumulated) + eligible }).eq('phone', customerPhone);
        else await supabase.from('loyalty_users').insert([{ phone: customerPhone, name: customerName, accumulated: eligible }]);
      }
      onPlaceOrder(newOrder);
      setIsSuccess(true);
      setAppliedCoupons([]);
      setCouponCode('');
    } catch (err) { 
      alert('Erro no checkout.'); 
    } finally { 
      setIsProcessing(false); 
    }
  };

  const handleValidateCoupon = async () => {
    if (!couponCode) return;
    // Busca todos os cupons que compartilham o mesmo código
    const { data, error } = await supabase.from('coupons')
      .select('*')
      .eq('code', couponCode.toUpperCase())
      .eq('is_active', true);
    
    if (error || !data || data.length === 0) {
      alert('Cupom inválido ou expirado.');
      setAppliedCoupons([]);
    } else {
      setAppliedCoupons(data.map(c => ({
        id: c.id, code: c.code, percentage: c.percentage, isActive: c.is_active,
        scopeType: c.scope_type, scopeValue: c.scope_value
      })));
    }
  };

  return (
    <>
      <div className={`fixed inset-0 bg-black/70 backdrop-blur-md z-[50] transition-opacity ${isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}`} onClick={onClose}/>
      <div className={`fixed right-0 top-0 h-full w-full max-w-md bg-white z-[60] shadow-2xl transition-transform duration-500 transform ${isOpen ? 'translate-x-0' : 'translate-x-full'} flex flex-col`}>
        {isSuccess ? (
          <div className="flex-1 flex flex-col items-center justify-center p-12 text-center font-black">
            <div className="w-20 h-20 bg-green-100 text-green-500 rounded-full flex items-center justify-center mx-auto mb-8 animate-bounce"><svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={4} d="M5 13l4 4L19 7" /></svg></div>
            <h2 className="text-3xl mb-4 italic uppercase">Recebido!</h2>
            <p className="text-gray-500 uppercase text-[10px] tracking-widest">Já estamos preparando sua parada.</p>
            <button onClick={() => { setIsSuccess(false); onClose(); }} className="w-full bg-black text-white py-5 rounded-[2rem] uppercase mt-10 text-[10px] tracking-widest">Concluir</button>
          </div>
        ) : (
          <>
            <div className="p-8 border-b flex justify-between items-center bg-white sticky top-0 z-10 font-black italic">
              <div><h2 className="text-3xl uppercase tracking-tighter">Minha Sacola</h2><span className="text-[10px] text-gray-400 not-italic uppercase tracking-widest">{items.length} Itens</span></div>
              <button onClick={onClose} className="p-3 hover:bg-gray-100 rounded-full transition-all active:scale-90"><CloseIcon size={28} /></button>
            </div>
            <div className="flex-1 overflow-y-auto p-8 space-y-8 no-scrollbar pb-32">
              {items.length > 0 ? (
                <>
                  <div className="bg-gray-50 p-7 rounded-[3rem] border border-gray-100 space-y-5 font-black uppercase">
                    <input type="text" value={customerName} onChange={(e) => setCustomerName(e.target.value)} placeholder="SEU NOME" className="w-full bg-white border-2 rounded-2xl px-6 py-5 text-xs outline-none shadow-sm"/>
                    <input type="tel" value={customerPhone} onChange={(e) => setCustomerPhone(e.target.value)} placeholder="WHATSAPP (OPCIONAL)" className="w-full bg-white border-2 rounded-2xl px-6 py-5 text-xs outline-none shadow-sm"/>
                    <div className="grid grid-cols-3 gap-2">{(['table', 'takeaway', 'delivery'] as OrderType[]).map(type => (
                      <button key={type} onClick={() => setOrderType(type)} className={`py-4 rounded-2xl text-[9px] border-2 transition-all ${orderType === type ? 'bg-black text-white' : 'bg-white text-gray-400'}`}>{type === 'table' ? 'Mesa' : type === 'takeaway' ? 'Balcão' : 'Entrega'}</button>
                    ))}</div>
                    {orderType === 'table' && <div className="grid grid-cols-4 gap-2 pt-2">{Array.from({ length: 12 }, (_, i) => i + 1).map(num => (
                      <button key={num} onClick={() => setTableNumber(num.toString())} className={`py-3 rounded-xl text-xs transition-all ${tableNumber === num.toString() ? 'bg-yellow-400 text-black' : 'bg-white text-gray-400 border'}`}>{num}</button>
                    ))}</div>}
                    {orderType === 'delivery' && <textarea value={address} onChange={(e) => setAddress(e.target.value)} placeholder="ENDEREÇO COMPLETO" className="w-full bg-white border-2 rounded-2xl px-6 py-5 text-xs outline-none h-28 resize-none shadow-sm"/>}
                    <div className="flex gap-3 pt-4">
                      <input type="text" value={couponCode} onChange={(e) => setCouponCode(e.target.value)} placeholder="CUPOM" className="flex-1 bg-white border-2 rounded-2xl px-6 py-4 text-[10px] outline-none shadow-sm"/>
                      <button onClick={handleValidateCoupon} className="bg-black text-yellow-400 px-8 py-4 rounded-2xl text-[10px] shadow-lg active:scale-95 transition-all">Validar</button>
                    </div>
                    {appliedCoupons.length > 0 && (
                      <div className="text-green-600 text-[9px] font-black px-4 py-2 bg-green-50 rounded-xl flex items-center gap-2">
                        <span>✓ Cupom {appliedCoupons[0].code} Aplicado</span>
                      </div>
                    )}
                  </div>
                  <div className="space-y-4">
                    {items.map(item => (
                      <div key={item.id} className="flex gap-5 bg-white p-5 rounded-[2rem] border items-center group">
                        <img src={item.image} className="w-20 h-20 rounded-2xl object-cover shrink-0 shadow-sm" />
                        <div className="flex-1 font-black"><h4 className="text-xs uppercase leading-none truncate">{item.name}</h4><p className="text-yellow-700 text-sm italic mt-2">R$ {item.price.toFixed(2)}</p></div>
                        <div className="flex flex-col items-end gap-2">
                          <button onClick={() => onRemove(item.id)} className="text-red-400 p-2 hover:bg-red-50 rounded-lg transition-colors">
                            <TrashIcon size={18} />
                          </button>
                          <div className="flex items-center gap-3 bg-gray-50 p-1 rounded-xl font-black">
                            <button onClick={() => onUpdateQuantity(item.id, -1)} className="w-8 h-8 rounded-lg bg-white shadow-sm flex items-center justify-center hover:bg-gray-100 transition-colors">-</button>
                            <span className="text-sm w-4 text-center">{item.quantity}</span>
                            <button onClick={() => onUpdateQuantity(item.id, 1)} className="w-8 h-8 rounded-lg bg-white shadow-sm flex items-center justify-center hover:bg-gray-100 transition-colors">+</button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </>
              ) : <div className="text-center py-20 opacity-30 font-black uppercase text-xs">Sacola Vazia</div>}
            </div>
            {items.length > 0 && (
              <div className="p-10 border-t-4 bg-white sticky bottom-0 rounded-t-[4rem] z-20 font-black italic shadow-2xl">
                <div className="flex justify-between items-center mb-8"><div><span className="text-[10px] text-gray-400 not-italic uppercase tracking-widest">Total</span><span className="text-4xl block">R$ {finalTotal.toFixed(2)}</span></div>{discount > 0 && <span className="text-green-600 text-sm">- R$ {discount.toFixed(2)}</span>}</div>
                <button onClick={handleCheckout} disabled={isProcessing} className="w-full bg-yellow-400 text-black py-6 rounded-[2.5rem] uppercase text-[12px] tracking-widest shadow-xl active:scale-95 transition-all">{isProcessing ? 'Enviando...' : 'Finalizar Pedido'}</button>
              </div>
            )}
          </>
        )}
      </div>
    </>
  );
};

export default Cart;
