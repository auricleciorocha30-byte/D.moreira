
import React from 'react';
import { Product } from '../types';

interface MenuItemProps {
  product: Product;
  onAdd: (product: Product) => void;
}

const MenuItem: React.FC<MenuItemProps> = ({ product, onAdd }) => {
  const isCombo = product.category === 'Combos';

  return (
    <div className={`bg-white rounded-2xl shadow-sm border ${isCombo ? 'border-yellow-400 border-2' : 'border-gray-100'} overflow-hidden flex flex-col relative`}>
      {isCombo && (
        <div className="absolute top-3 left-3 z-10 bg-black text-yellow-400 text-[10px] font-black uppercase px-2 py-1 rounded-md shadow-lg">
          Combo 🔥
        </div>
      )}
      
      <div className="h-40 overflow-hidden relative">
        <img 
          src={product.image} 
          alt={product.name} 
          className="w-full h-full object-cover transition-transform hover:scale-105 duration-500"
        />
        <div className={`absolute top-2 right-2 ${isCombo ? 'bg-black text-yellow-400' : 'bg-yellow-400 text-black'} font-bold px-3 py-1 rounded-full text-sm shadow-sm`}>
          R$ {product.price.toFixed(2).replace('.', ',')}
        </div>
      </div>
      
      <div className="p-4 flex flex-col flex-1">
        <h3 className="font-bold text-gray-900 text-lg mb-1 leading-tight">{product.name}</h3>
        <p className="text-gray-500 text-xs mb-3 flex-1">{product.description}</p>
        
        {product.savings && (
          <div className="mb-3">
            <span className="bg-green-100 text-green-700 text-[10px] font-bold px-2 py-0.5 rounded-full uppercase">
              {product.savings}
            </span>
          </div>
        )}
        
        <button 
          onClick={() => onAdd(product)}
          className={`w-full ${isCombo ? 'bg-black text-white' : 'bg-yellow-400 text-black'} hover:opacity-90 font-bold py-2.5 rounded-xl transition-all active:scale-95 flex items-center justify-center gap-2`}
        >
          <span>{isCombo ? 'Levar Combo' : 'Adicionar'}</span>
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
        </button>
      </div>
    </div>
  );
};

export default MenuItem;
