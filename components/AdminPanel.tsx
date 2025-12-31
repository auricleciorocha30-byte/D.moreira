
import React, { useState, useMemo, useEffect } from 'react';
import { Table, Order, Product, CategoryType, OrderStatus } from '../types';
import { CloseIcon } from './Icons';
import { MENU_ITEMS as STATIC_MENU } from '../constants';
import { supabase } from '../lib/supabase';

interface AdminPanelProps {
  tables: Table[];
  menuItems: Product[];
  onUpdateTable: (tableId: number, status: 'free' | 'occupied', order?: Order | null) => void;
  onAddToOrder: (tableId: number, product: Product) => void;
  onRefreshData: () => void;
  salesHistory: Order[];
  onLogout: () => void;
  onSaveProduct: (product: Partial<Product>) => void;
  dbStatus: 'loading' | 'ok' | 'error_tables_missing';
}

const AdminPanel: React.FC<AdminPanelProps> = ({ tables, menuItems, onUpdateTable, onAddToOrder, onRefreshData, salesHistory, onLogout, onSaveProduct, dbStatus }) => {
  const [activeTab, setActiveTab] = useState<'tables' | 'functions' | 'setup'>('tables');
  const [selectedTable, setSelectedTable] = useState<Table | null>(null);
  const [showSalesReport, setShowSalesReport] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  
  const [editingProduct, setEditingProduct] = useState<Partial<Product> | null>(null);
  const [isProductModalOpen, setIsProductModalOpen] = useState(false);

  const categories: (CategoryType | 'Todos')[] = ['Todos', 'Combos', 'Cafeteria', 'Lanches', 'Bebidas', 'Conveniência'];

  // SQL para exibição no modo Setup (Atualizado para ser à prova de falhas)
  const sqlSetup = `-- 1. CRIAR TABELA DE PRODUTOS
CREATE TABLE IF NOT EXISTS public.products (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT,
    price DECIMAL(10,2) NOT NULL,
    category TEXT NOT NULL,
    image TEXT,
    savings TEXT,
    is_available BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);
ALTER TABLE public.products DISABLE ROW LEVEL SECURITY;

-- 2. CRIAR TABELA DE MESAS
CREATE TABLE IF NOT EXISTS public.tables (
    id INTEGER PRIMARY KEY,
    status TEXT DEFAULT 'free',
    current_order JSONB,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);
ALTER TABLE public.tables DISABLE ROW LEVEL SECURITY;

-- 3. CRIAR TABELA DE VENDAS
CREATE TABLE IF NOT EXISTS public.sales (
    id BIGSERIAL PRIMARY KEY,
    customer_name TEXT,
    items JSONB,
    total DECIMAL(10,2),
    payment_method TEXT,
    table_id INTEGER,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);
ALTER TABLE public.sales DISABLE ROW LEVEL SECURITY;

-- 4. HABILITAR REALTIME (EVITA ERRO DE JÁ EXISTIR)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'products') THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE products;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'tables') THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE tables;
    END IF;
END $$;

-- 5. INSERIR MESAS INICIAIS
INSERT INTO tables (id, status) VALUES (1,'free'),(2,'free'),(3,'free'),(4,'free'),(5,'free'),(6,'free'),(7,'free'),(8,'free'),(9,'free'),(10,'free'),(11,'free'),(12,'free') ON CONFLICT DO NOTHING;`;

  const getStatusLabel = (status: OrderStatus) => {
    switch (status) {
      case 'pending': return { text: 'Pendente', color: 'bg-red-500' };
      case 'preparing': return { text: 'Preparo', color: 'bg-orange-500' };
      case 'ready': return { text: 'Pronto', color: 'bg-blue-500' };
      case 'delivered': return { text: 'Entregue', color: 'bg-green-500' };
      default: return { text: 'Pendente', color: 'bg-red-500' };
    }
  };

  const handleRepopulateMenu = async () => {
    if (confirm('Deseja sincronizar os produtos padrão com o banco?')) {
      setIsSyncing(true);
      try {
        const payload = STATIC_MENU.map(item => ({
          id: item.id,
          name: item.name,
          description: item.description,
          price: item.price,
          category: item.category,
          image: item.image,
          savings: item.savings || '',
          is_available: true
        }));
        
        const { error } = await supabase.from('products').upsert(payload);
        if (error) throw error;
        
        alert('Cardápio sincronizado!');
        onRefreshData();
      } catch (err: any) {
        alert('Erro ao sincronizar: Verifique se as tabelas foram criadas no SQL Editor com RLS desativado.');
      } finally {
        setIsSyncing(false);
      }
    }
  };

  return (
    <div className="w-full animate-pop-in">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-10 gap-6 bg-white p-6 rounded-[3rem] shadow-sm border border-gray-100">
        <div>
          <h2 className="text-3xl font-black italic tracking-tighter">D.Moreira Admin</h2>
          <div className="flex gap-6 mt-4">
            <button onClick={() => setActiveTab('tables')} className={`text-[11px] font-black uppercase tracking-[0.2em] pb-1 border-b-4 transition-all ${activeTab === 'tables' ? 'border-yellow-400 text-black' : 'border-transparent text-gray-300 hover:text-gray-500'}`}>Pedidos</button>
            <button onClick={() => setActiveTab('functions')} className={`text-[11px] font-black uppercase tracking-[0.2em] pb-1 border-b-4 transition-all ${activeTab === 'functions' ? 'border-yellow-400 text-black' : 'border-transparent text-gray-300 hover:text-gray-500'}`}>Cardápio</button>
            <button onClick={() => setActiveTab('setup')} className={`text-[11px] font-black uppercase tracking-[0.2em] pb-1 border-b-4 transition-all ${activeTab === 'setup' ? 'border-red-400 text-black' : 'border-transparent text-gray-300 hover:text-gray-500'} ${dbStatus === 'error_tables_missing' ? 'animate-pulse text-red-500' : ''}`}>Setup Banco</button>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <button onClick={() => setShowSalesReport(true)} className="bg-black text-white px-6 py-3 rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-xl">💰 Caixa</button>
          <button onClick={onLogout} className="bg-red-50 text-red-500 px-5 py-3 rounded-2xl font-black text-[10px] uppercase hover:bg-red-100 transition-colors">Sair</button>
        </div>
      </div>

      {activeTab === 'tables' && (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-6">
          {tables.map(table => {
            const statusInfo = table.currentOrder ? getStatusLabel(table.currentOrder.status) : null;
            return (
              <button key={table.id} onClick={() => setSelectedTable(table)} className={`p-6 rounded-[2.5rem] border-4 transition-all flex flex-col items-center justify-center gap-2 group relative h-48 ${table.status === 'free' ? 'bg-white border-gray-100 hover:border-yellow-400' : 'bg-yellow-400 border-black shadow-2xl scale-105 z-10'}`}>
                {statusInfo && <div className={`absolute top-4 left-4 ${statusInfo.color} text-white text-[8px] font-black px-2 py-0.5 rounded-full uppercase`}>{statusInfo.text}</div>}
                <span className="text-4xl font-black italic">{table.id}</span>
                <span className={`text-[9px] font-black uppercase px-3 py-1 rounded-full ${table.status === 'free' ? 'bg-gray-100 text-gray-400' : 'bg-black text-white'}`}>{table.status === 'free' ? 'Livre' : 'Ocupada'}</span>
                {table.currentOrder && <span className="text-[10px] font-bold text-black/70 mt-1 truncate w-full text-center px-2">{table.currentOrder.customerName}</span>}
              </button>
            );
          })}
        </div>
      )}

      {activeTab === 'functions' && (
        <div className="bg-white rounded-[3.5rem] p-8 md:p-12 shadow-sm border border-gray-100">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-10 gap-6">
            <div><h3 className="text-3xl font-black italic tracking-tighter">Estoque & Itens</h3></div>
            <div className="flex gap-3">
              <button onClick={handleRepopulateMenu} disabled={isSyncing} className="bg-gray-100 text-gray-600 px-6 py-5 rounded-2xl font-black text-[10px] uppercase tracking-widest">{isSyncing ? 'Carregando...' : 'Sincronizar'}</button>
              <button onClick={() => { setEditingProduct({ category: 'Lanches', isAvailable: true }); setIsProductModalOpen(true); }} className="bg-yellow-400 text-black px-8 py-5 rounded-2xl font-black text-xs uppercase tracking-[0.2em] shadow-2xl hover:scale-105 transition-all border-b-4 border-black">+ Novo</button>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {menuItems.map(item => (
              <div key={item.id} className={`group p-5 rounded-[2.5rem] border-2 transition-all ${item.isAvailable ? 'bg-gray-50 border-gray-100' : 'bg-red-50/50 border-red-100'}`}>
                <div className="relative mb-4">
                  <img src={item.image} className={`w-full h-32 object-cover rounded-2xl ${!item.isAvailable && 'grayscale'}`} />
                  {!item.isAvailable && <span className="absolute inset-0 flex items-center justify-center bg-black/20 rounded-2xl font-black text-white text-[10px] uppercase">Esgotado</span>}
                </div>
                <h4 className="font-black text-sm text-gray-900 truncate">{item.name}</h4>
                <p className="text-yellow-700 font-black text-xs mb-4">R$ {item.price.toFixed(2)}</p>
                <div className="flex gap-2">
                  <button onClick={() => { setEditingProduct(item); setIsProductModalOpen(true); }} className="flex-1 bg-white border border-gray-200 py-3 rounded-xl font-black text-[10px] uppercase">Editar</button>
                  <button onClick={() => onSaveProduct({ ...item, isAvailable: !item.isAvailable })} className={`px-4 py-3 rounded-xl font-black text-[10px] uppercase ${item.isAvailable ? 'text-red-500' : 'bg-green-500 text-white'}`}>{item.isAvailable ? 'Remover' : 'Repor'}</button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {activeTab === 'setup' && (
        <div className="bg-black text-white rounded-[3.5rem] p-10 md:p-16 shadow-2xl animate-pop-in">
          <h3 className="text-4xl font-black italic mb-6">Configurar Banco (SQL)</h3>
          <p className="text-gray-400 font-bold mb-10 text-sm max-w-2xl leading-relaxed">O erro de publicação acontece porque você tentou adicionar uma tabela que já está configurada. Use o código atualizado abaixo para corrigir:</p>
          <ol className="space-y-8 mb-12">
            <li className="flex gap-6 items-start">
              <span className="bg-yellow-400 text-black w-10 h-10 rounded-full flex items-center justify-center font-black shrink-0">1</span>
              <div><p className="font-black uppercase text-xs tracking-widest text-yellow-400 mb-1">SQL Editor</p><p className="text-gray-400 text-xs">Vá para o "SQL Editor" no seu Supabase e crie um "New Query".</p></div>
            </li>
            <li className="flex gap-6 items-start">
              <span className="bg-yellow-400 text-black w-10 h-10 rounded-full flex items-center justify-center font-black shrink-0">2</span>
              <div className="flex-1">
                <p className="font-black uppercase text-xs tracking-widest text-yellow-400 mb-1">Copiar & Colar</p>
                <div className="bg-gray-900 p-6 rounded-3xl border border-white/10 relative group">
                  <pre className="text-[10px] font-mono text-gray-300 overflow-x-auto whitespace-pre-wrap">{sqlSetup}</pre>
                  <button onClick={() => { navigator.clipboard.writeText(sqlSetup); alert('Novo SQL Copiado!'); }} className="absolute top-4 right-4 bg-yellow-400 text-black px-4 py-2 rounded-xl text-[10px] font-black uppercase shadow-xl hover:scale-105 transition-all">Copiar SQL Atualizado</button>
                </div>
              </div>
            </li>
            <li className="flex gap-6 items-start">
              <span className="bg-yellow-400 text-black w-10 h-10 rounded-full flex items-center justify-center font-black shrink-0">3</span>
              <div><p className="font-black uppercase text-xs tracking-widest text-yellow-400 mb-1">Executar</p><p className="text-gray-400 text-xs">Clique em "RUN". O script agora ignora erros de publicação e desativa RLS automaticamente.</p></div>
            </li>
          </ol>
          <button onClick={() => window.location.reload()} className="w-full bg-white text-black py-6 rounded-[2rem] font-black uppercase text-xs tracking-widest shadow-xl hover:bg-yellow-400 transition-colors">Recarregar Aplicativo</button>
        </div>
      )}

      {isProductModalOpen && editingProduct && (
        <div className="fixed inset-0 z-[300] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/90 backdrop-blur-md" onClick={() => setIsProductModalOpen(false)} />
          <div className="relative bg-white w-full max-w-lg rounded-[4rem] p-10 shadow-2xl border-[12px] border-yellow-400 overflow-y-auto max-h-[95vh] no-scrollbar">
            <h3 className="text-3xl font-black mb-8 italic tracking-tighter">{editingProduct.id ? 'Ajustar Produto' : 'Novo Item'}</h3>
            <div className="space-y-5">
              <div><label className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-2 mb-1 block">Nome Comercial</label><input type="text" className="w-full bg-gray-50 border border-gray-100 rounded-2xl px-6 py-4 text-sm font-bold outline-none" value={editingProduct.name || ''} onChange={e => setEditingProduct({...editingProduct, name: e.target.value})} /></div>
              <div className="grid grid-cols-2 gap-4">
                <div><label className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-2 mb-1 block">Preço (R$)</label><input type="number" step="0.01" className="w-full bg-gray-50 border border-gray-100 rounded-2xl px-6 py-4 text-sm font-bold outline-none" value={editingProduct.price || ''} onChange={e => setEditingProduct({...editingProduct, price: parseFloat(e.target.value)})} /></div>
                <div><label className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-2 mb-1 block">Categoria</label>
                  <select className="w-full bg-gray-50 border border-gray-100 rounded-2xl px-6 py-4 text-sm font-bold outline-none" value={editingProduct.category} onChange={e => setEditingProduct({...editingProduct, category: e.target.value as CategoryType})}>
                    {categories.filter(c => c !== 'Todos').map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
              </div>
              <div className="flex items-center gap-4 p-5 bg-gray-50 rounded-3xl border border-gray-100">
                <input type="checkbox" id="avail_chk" className="w-6 h-6 accent-yellow-400 rounded-lg" checked={editingProduct.isAvailable} onChange={e => setEditingProduct({...editingProduct, isAvailable: e.target.checked})} />
                <label htmlFor="avail_chk" className="text-xs font-black uppercase tracking-widest cursor-pointer">Disponível</label>
              </div>
              <div className="grid grid-cols-2 gap-6 pt-6">
                <button onClick={() => setIsProductModalOpen(false)} className="py-5 bg-gray-100 rounded-3xl font-black uppercase text-xs tracking-widest">Sair</button>
                <button onClick={() => { onSaveProduct(editingProduct); setIsProductModalOpen(false); }} className="py-5 bg-black text-yellow-400 rounded-3xl font-black uppercase text-xs tracking-widest shadow-2xl transition-all">Salvar</button>
              </div>
            </div>
          </div>
        </div>
      )}
      
      {selectedTable && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/90 backdrop-blur-md" onClick={() => setSelectedTable(null)} />
          <div className="relative bg-white w-full max-w-3xl rounded-[4rem] p-10 shadow-2xl flex flex-col max-h-[92vh] border-[15px] border-yellow-400 animate-pop-in">
            <div className="flex justify-between items-start mb-8 shrink-0">
              <h3 className="text-5xl font-black italic tracking-tighter">Mesa {selectedTable.id}</h3>
              <button onClick={() => setSelectedTable(null)} className="p-3 hover:bg-gray-100 rounded-full transition-colors"><CloseIcon size={32}/></button>
            </div>
            <div className="flex-1 overflow-y-auto no-scrollbar mb-8 pr-2 text-center py-20 opacity-20 italic font-black text-2xl uppercase">
              {tables.find(t => t.id === selectedTable.id)?.currentOrder ? 'Ver Pedido...' : 'Mesa Livre'}
            </div>
            <button onClick={() => { if(confirm('Fechar conta?')) onUpdateTable(selectedTable.id, 'free'); setSelectedTable(null); }} className="w-full bg-green-500 text-white py-6 rounded-[2rem] font-black uppercase text-xs shadow-xl">Encerrar & Liberar</button>
          </div>
        </div>
      )}

      {showSalesReport && (
        <div className="fixed inset-0 z-[300] flex items-center justify-center p-4 bg-black/95">
          <div className="bg-white w-full max-w-xl rounded-[4rem] p-12 border-[12px] border-yellow-400 text-center relative animate-pop-in">
            <button onClick={() => setShowSalesReport(false)} className="absolute top-8 right-8"><CloseIcon/></button>
            <h3 className="text-4xl font-black mb-10 italic">Caixa Hoje</h3>
            <div className="bg-yellow-50 p-8 rounded-[2rem] border-2 border-yellow-100 mb-8">
               <span className="font-black text-4xl italic">R$ {salesHistory.reduce((acc, o) => acc + o.total, 0).toFixed(2).replace('.', ',')}</span>
            </div>
            <button onClick={() => window.print()} className="w-full bg-black text-white py-6 rounded-[2rem] font-black uppercase text-xs">Imprimir Relatório</button>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminPanel;
