
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
  const [appliedCoupon, setAppliedCoupon] = useState<Coupon | null>(null);
  const [loyaltyConfig, setLoyaltyConfig] = useState<LoyaltyConfig | null>(null);
  
  const [tableNumber, setTableNumber] = useState('');
  const [orderType, setOrderType] = useState<OrderType>('table');
  const [address, setAddress] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<'Dinheiro' | 'Pix' | 'Cartão'>('Pix');
  const [isSuccess, setIsSuccess] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

  useEffect(() => {
    if (isOpen) {
      // Buscar config de fidelidade atualizada ao abrir a sacola
      supabase.from('loyalty_config').select('*').single().then(({ data }) => {
        if (data) setLoyaltyConfig(data);
      });
    }
  }, [isOpen]);

  const subtotal = useMemo(() => items.reduce((acc, item) => acc + item.price * item.quantity, 0), [items]);
  
  const discount = useMemo(() => {
    if (!appliedCoupon) return 0;
    
    // Cupom para toda a loja
    if (appliedCoupon.scopeType === 'all') {
      return (subtotal * appliedCoupon.percentage) / 100;
    }
    
    // Cupom por categoria ou produto específico
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
    // Verificando is_active conforme padrão snake_case da tabela de cupons no supabase
    const { data } = await supabase.from('coupons').select('*').eq('code', couponCode.toUpperCase()).eq('is_active', true).single();
    if (data) {
      setAppliedCoupon({
        id: data.id, code: data.code, percentage: data.percentage, 
        isActive: data.is_active, scopeType: data.scope_type, scopeValue: data.scope_value
      });
    } else {
      alert('Cupom inválido ou expirado.');
      setAppliedCoupon(null);
    }
  };

  const handleCheckout = async () => {
    if (items.length === 0) return;
    if (!customerName.trim()) return alert('Por favor, informe seu nome para o pedido.');
    
    let targetTableId = 0;
    let finalOrderType = orderType;

    if (orderType === 'table') {
      if (!tableNumber) return alert('Por favor, selecione o número da sua mesa.');
      targetTableId = parseInt(tableNumber);
    } else if (orderType === 'delivery') {
      if (!address.trim()) return alert('Informe o endereço completo para a entrega.');
      targetTableId = -900;
    } else if (orderType === 'takeaway') {
      targetTableId = -950;
      finalOrderType = 'counter';
    }

    setIsProcessing(true);

    const newOrder: Order = {
      id: Math.random().toString(36).substr(2, 6).toUpperCase(),
      customerName,
      customerPhone: customerPhone.trim() || undefined,
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

    try {
      // Registrar acúmulo de fidelidade
      if (loyaltyConfig?.isActive && customerPhone.trim()) {
        const eligibleLoyaltyValue = items.reduce((acc, item) => {
          const isEligible = loyaltyConfig.scopeType === 'all' || 
            (loyaltyConfig.scopeType === 'category' && item.category === loyaltyConfig.scopeValue) ||
            (loyaltyConfig.scopeType === 'product' && item.id === loyaltyConfig.scopeValue);
          return isEligible ? acc + (item.price * item.quantity) : acc;
        }, 0);

        if (eligibleLoyaltyValue > 0) {
          const { data: user } = await supabase.from('loyalty_users').select('*').eq('phone', customerPhone).maybeSingle();
          if (user) {
            await supabase.from('loyalty_users').update({ accumulated: Number(user.accumulated) + eligibleLoyaltyValue }).eq('phone', customerPhone);
          } else {
            await supabase.from('loyalty_users').insert([{ phone: customerPhone, name: customerName, accumulated: eligibleLoyaltyValue }]);
          }
        }
      }

      onPlaceOrder(newOrder);
      setIsSuccess(true);
      setAppliedCoupon(null);
      setCouponCode('');
      setCustomerName('');
      setCustomerPhone('');
      setTableNumber('');
      setAddress('');
    } catch (err) {
      alert('Erro ao processar checkout. Tente novamente.');
    } finally {
      setIsProcessing(false);
    }
  };

  if (isSuccess) {
    return (
      <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 animate-in fade-in duration-300">
        <div className="absolute inset-0 bg-black/80 backdrop-blur-md" onClick={() => { setIsSuccess(false); onClose(); }} />
        <div className="relative bg-white w-full max-w-sm rounded-[3.5rem] p-12 text-center shadow-2xl border-t-8 border-green-500">
          <div className="w-24 h-24 bg-green-100 text-green-500 rounded-full flex items-center justify-center mx-auto mb-8 animate-bounce">
            <svg className="w-12 h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={4} d="M5 13l4 4L19 7" /></svg>
          </div>
          <h2 className="text-4xl font-black text-gray-900 mb-4 italic tracking-tighter">D.MOREIRA</h2>
          <p className="text-gray-500 font-black uppercase text-[10px] tracking-[0.3em] leading-relaxed">Seu pedido foi recebido!<br/>Já estamos preparando.</p>
          <button onClick={() => { setIsSuccess(false); onClose(); }} className="w-full bg-black text-white py-6 rounded-[2rem] font-black uppercase shadow-xl mt-10 tracking-[0.2em] text-[10px] active:scale-95 transition-all">Concluir</button>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className={`fixed inset-0 bg-black/70 backdrop-blur-md z-[50] transition-opacity duration-300 ${isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}`} onClick={onClose}/>
      <div className={`fixed right-0 top-0 h-full w-full max-w-md bg-white z-[60] shadow-2xl transition-transform duration-500 ease-out transform ${isOpen ? 'translate-x-0' : 'translate-x-full'} flex flex-col`}>
        {/* Header Sacola */}
        <div className="p-8 border-b flex justify-between items-center bg-white sticky top-0 z-10">
          <div className="flex flex-col">
            <h2 className="text-3xl font-black text-gray-900 italic uppercase tracking-tighter">Minha Sacola</h2>
            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">{items.length} {items.length === 1 ? 'Item' : 'Itens'} selecionados</span>
          </div>
          <button onClick={onClose} className="p-3 hover:bg-gray-100 rounded-full transition-all active:scale-90"><CloseIcon size={28} /></button>
        </div>

        {/* Corpo Sacola */}
        <div className="flex-1 overflow-y-auto p-8 space-y-8 no-scrollbar pb-32">
          {items.length > 0 ? (
            <>
              {/* Seção Identificação */}
              <div className="bg-gray-50 p-7 rounded-[3rem] border border-gray-100 space-y-5 shadow-sm">
                <div className="space-y-1">
                  <p className="text-[9px] font-black uppercase text-gray-400 ml-2 tracking-widest">Identificação</p>
                  <input type="text" value={customerName} onChange={(e) => setCustomerName(e.target.value)} placeholder="COMO PODEMOS TE CHAMAR?" className="w-full bg-white border-2 border-transparent focus:border-yellow-400 rounded-2xl px-6 py-5 text-xs font-black uppercase outline-none transition-all shadow-sm"/>
                </div>
                
                <div className="space-y-1">
                  <p className="text-[9px] font-black uppercase text-gray-400 ml-2 tracking-widest">WhatsApp (Opcional)</p>
                  <input type="tel" value={customerPhone} onChange={(e) => setCustomerPhone(e.target.value)} placeholder="(85) 90000-0000" className="w-full bg-white border-2 border-transparent focus:border-yellow-400 rounded-2xl px-6 py-5 text-xs font-black outline-none transition-all shadow-sm"/>
                </div>

                <div className="space-y-4 pt-2">
                  <p className="text-[9px] font-black uppercase text-gray-400 ml-2 tracking-widest">Onde Você Está?</p>
                  <div className="grid grid-cols-3 gap-2">
                    {(['table', 'takeaway', 'delivery'] as OrderType[]).map(type => (
                      <button key={type} onClick={() => setOrderType(type)} className={`py-4 rounded-2xl text-[9px] font-black uppercase border-2 transition-all ${orderType === type ? 'bg-black text-white border-black shadow-lg' : 'bg-white text-gray-400 border-gray-100'}`}>
                        {type === 'table' ? 'Mesa' : type === 'takeaway' ? 'Balcão' : 'Entrega'}
                      </button>
                    ))}
                  </div>

                  {orderType === 'table' && (
                    <div className="pt-2 animate-in fade-in slide-in-from-top-2">
                      <p className="text-[9px] font-black uppercase text-gray-400 mb-3 ml-2">Escolha sua Mesa</p>
                      <div className="grid grid-cols-4 gap-2">
                         {Array.from({ length: 12 }, (_, i) => i + 1).map(num => (
                          <button key={num} onClick={() => setTableNumber(num.toString())} className={`py-3.5 rounded-xl text-xs font-black transition-all ${tableNumber === num.toString() ? 'bg-yellow-400 text-black shadow-md border-black' : 'bg-white text-gray-400 border border-gray-100 hover:border-black'}`}>
                            {num}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {orderType === 'delivery' && (
                    <div className="pt-2 animate-in fade-in slide-in-from-top-2">
                      <p className="text-[9px] font-black uppercase text-gray-400 mb-3 ml-2">Endereço de Entrega</p>
                      <textarea value={address} onChange={(e) => setAddress(e.target.value)} placeholder="Rua, número, bairro, ponto de referência..." className="w-full bg-white border-2 border-transparent focus:border-yellow-400 rounded-2xl px-6 py-5 text-xs font-black outline-none transition-all h-28 resize-none shadow-sm"/>
                    </div>
                  )}
                </div>

                <div className="space-y-4 pt-2">
                   <p className="text-[9px] font-black uppercase text-gray-400 ml-2 tracking-widest">Pagamento</p>
                   <div className="grid grid-cols-3 gap-2">
                      {(['Pix', 'Dinheiro', 'Cartão'] as const).map(method => (
                        <button key={method} onClick={() => setPaymentMethod(method)} className={`py-4 rounded-2xl text-[9px] font-black uppercase border-2 transition-all ${paymentMethod === method ? 'bg-black text-white border-black shadow-lg' : 'bg-white text-gray-400 border-gray-100'}`}>
                          {method}
                        </button>
                      ))}
                   </div>
                </div>

                <div className="pt-6 flex gap-3">
                   <input type="text" value={couponCode} onChange={(e) => setCouponCode(e.target.value)} placeholder="CUPOM" className="flex-1 bg-white border-2 border-transparent focus:border-yellow-400 rounded-2xl px-6 py-4 text-[10px] font-black uppercase outline-none transition-all shadow-sm"/>
                   <button onClick={handleApplyCoupon} className="bg-black text-yellow-400 px-8 py-4 rounded-2xl font-black text-[10px] uppercase shadow-lg active:scale-95 transition-all">Validar</button>
                </div>
                {appliedCoupon && (
                  <div className="bg-green-100 text-green-700 p-4 rounded-2xl flex items-center justify-between border border-green-200 animate-in slide-in-from-right duration-300">
                    <span className="text-[10px] font-black uppercase">Cupom {appliedCoupon.code} Aplicado!</span>
                    <span className="font-black">-{appliedCoupon.percentage}%</span>
                  </div>
                )}
              </div>

              {/* Lista de Itens */}
              <div className="space-y-4">
                <p className="text-[9px] font-black uppercase text-gray-400 ml-2 tracking-widest">Itens na Sacola</p>
                {items.map(item => (
                  <div key={item.id} className="flex gap-5 bg-white p-5 rounded-[2rem] border border-gray-100 shadow-sm items-center hover:border-yellow-200 transition-all">
                    <img src={item.image} alt={item.name} className="w-20 h-20 rounded-2xl object-cover shrink-0 shadow-sm" />
                    <div className="flex-1 min-w-0">
                      <h4 className="font-black text-xs text-gray-900 uppercase truncate leading-none">{item.name}</h4>
                      <p className="text-[9px] text-gray-400 font-bold uppercase mt-1 mb-2">{item.category}</p>
                      <p className="text-yellow-700 font-black text-sm italic">R$ {item.price.toFixed(2).replace('.', ',')}</p>
                    </div>
                    <div className="flex flex-col items-center gap-2">
                      <div className="flex items-center gap-3 bg-gray-50 p-1 rounded-xl">
                        <button onClick={() => onUpdateQuantity(item.id, -1)} className="w-8 h-8 rounded-lg bg-white shadow-sm flex items-center justify-center font-black active:bg-gray-200 transition-all">-</button>
                        <span className="font-black text-sm w-4 text-center">{item.quantity}</span>
                        <button onClick={() => onUpdateQuantity(item.id, 1)} className="w-8 h-8 rounded-lg bg-white shadow-sm flex items-center justify-center font-black active:bg-gray-200 transition-all">+</button>
                      </div>
                      <button onClick={() => onRemove(item.id)} className="text-red-400 hover:text-red-600 text-[10px] font-black uppercase tracking-widest p-1">Excluir</button>
                    </div>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <div className="flex flex-col items-center justify-center py-20 text-center opacity-40">
              <div className="bg-gray-100 w-28 h-28 rounded-full flex items-center justify-center mb-8">
                <svg className="w-12 h-12 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" /></svg>
              </div>
              <p className="text-gray-900 font-black text-xs uppercase tracking-[0.2em]">Sacola vazia</p>
              <button onClick={onClose} className="mt-6 text-yellow-600 font-black text-[10px] uppercase tracking-widest border-b-2 border-yellow-200">Adicionar Produtos</button>
            </div>
          )}
        </div>

        {/* Rodapé Resumo */}
        {items.length > 0 && (
          <div className="p-10 border-t-4 border-gray-50 bg-white sticky bottom-0 left-0 right-0 shadow-[0_-20px_50px_rgba(0,0,0,0.1)] rounded-t-[4rem] z-20">
            <div className="flex justify-between items-center mb-8">
              <div className="flex flex-col">
                <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Total à Pagar</span>
                <span className="text-4xl font-black text-gray-900 italic tracking-tighter">R$ {finalTotal.toFixed(2).replace('.', ',')}</span>
              </div>
              {discount > 0 && (
                <div className="text-right">
                  <span className="text-[10px] font-black text-green-600 uppercase tracking-widest">Desconto Ativo</span>
                  <p className="text-lg font-black text-green-600 italic">- R$ {discount.toFixed(2).replace('.', ',')}</p>
                </div>
              )}
            </div>
            <button 
              onClick={handleCheckout} 
              disabled={isProcessing}
              className={`w-full ${isProcessing ? 'bg-gray-200 cursor-not-allowed' : 'bg-yellow-400 hover:brightness-110'} text-black py-6 rounded-[2.5rem] font-black uppercase text-[12px] tracking-[0.3em] shadow-2xl active:scale-95 transition-all flex items-center justify-center gap-3`}
            >
              {isProcessing ? 'PROCESSANDO...' : 'FECHAR PEDIDO 🏁'}
            </button>
          </div>
        )}
      </div>
    </>
  );
};

export default Cart;
