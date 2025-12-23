import React from 'react';
import { Product } from '../types';

interface MenuItemProps {
  product: Product;
  onAdd: (product: Product) => void;
}

const MenuItem: React.FC<MenuItemProps> = ({ product, onAdd }) => {
  const isCombo = product.category === 'Combos';

  return (
    <div className={`group bg-white rounded-[2rem] shadow-md border ${isCombo ? 'border-yellow-400 border-2' : 'border-gray-100'} overflow-hidden flex flex-col relative transition-all duration-300 hover:shadow-2xl hover:-translate-y-1`}>
      {isCombo && (
        <div className="absolute top-4 left-4 z-10 bg-black text-yellow-400 text-[10px] font-black uppercase px-3 py-1.5 rounded-full shadow-lg">
          Combo 🔥
        </div>
      )}
      
      <div className="aspect-[4/3] overflow-hidden relative bg-gray-100">
        <img 
          src={product.image} 
          alt={product.name} 
          className="w-full h-full object-cover transition-transform group-hover:scale-110 duration-700"
        />
        <div className={`absolute bottom-3 right-3 ${isCombo ? 'bg-black text-yellow-400' : 'bg-yellow-400 text-black'} font-black px-4 py-1.5 rounded-full text-sm shadow-xl`}>
          R$ {product.price.toFixed(2).replace('.', ',')}
        </div>
      </div>
      
      <div className="p-6 flex flex-col flex-1">
        <h3 className="font-extrabold text-gray-900 text-xl mb-1 leading-tight">{product.name}</h3>
        <p className="text-gray-500 text-xs mb-5 flex-1 line-clamp-2 leading-relaxed">{product.description}</p>
        
        {product.savings && (
          <div className="mb-4">
            <span className="bg-green-100 text-green-700 text-[10px] font-black px-3 py-1.5 rounded-lg uppercase tracking-wider">
              {product.savings}
            </span>
          </div>
        )}
        
        <button 
          onClick={() => onAdd(product)}
          className={`w-full ${isCombo ? 'bg-black text-white' : 'bg-yellow-400 text-black'} font-black py-4 rounded-2xl transition-all active:scale-95 flex items-center justify-center gap-2 shadow-lg hover:brightness-110`}
        >
          <span className="text-sm uppercase tracking-widest">{isCombo ? 'Escolher Combo' : 'Adicionar'}</span>
          <svg width="20" height="20" className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M12 4v16m8-8H4" />
          </svg>
        </button>
      </div>
    </div>
  );
};

export default MenuItem;