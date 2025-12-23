
import React from 'react';
import { STORE_INFO } from '../constants';
import { GasIcon } from './Icons';

const Header: React.FC = () => {
  return (
    <header className="bg-yellow-400 pt-8 pb-12 px-6 rounded-b-[2rem] shadow-lg relative overflow-hidden">
      {/* Decorative background circle */}
      <div className="absolute -top-10 -right-10 w-40 h-40 bg-yellow-300 rounded-full opacity-50 blur-2xl"></div>
      
      <div className="relative z-10 flex flex-col items-center text-center">
        <div className="bg-black p-3 rounded-full mb-4 shadow-xl">
          <GasIcon className="w-8 h-8 text-yellow-400" />
        </div>
        <h1 className="text-4xl font-extrabold text-black tracking-tight mb-1">
          {STORE_INFO.name}
        </h1>
        <p className="text-black font-semibold uppercase tracking-widest text-sm mb-4">
          {STORE_INFO.slogan}
        </p>
        <div className="bg-black/5 px-4 py-2 rounded-full inline-flex items-center gap-2 backdrop-blur-sm border border-black/10">
          <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
          <span className="text-xs font-bold text-black uppercase">{STORE_INFO.hours}</span>
        </div>
      </div>
    </header>
  );
};

export default Header;
