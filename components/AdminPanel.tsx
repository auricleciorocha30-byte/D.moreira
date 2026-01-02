
import React, { useState, useMemo, useEffect } from 'react';
import { Table, Order, Product, CategoryType, OrderStatus, Category } from '../types';
import { CloseIcon, TrashIcon, VolumeIcon } from './Icons';
import { supabase } from '../lib/supabase';

interface AdminPanelProps {
  tables: Table[];
  menuItems: Product[];
  categories: Category[];
  audioEnabled: boolean;
  onToggleAudio: () => void;
  onUpdateTable: (tableId: number, status: 'free' | 'occupied', order?: Order | null) => void;
  onAddToOrder: (tableId: number, product: Product) => void;
  onRefreshData: () => void;
  salesHistory: Order[];
  onLogout: () => void;
  onSaveProduct: (product: Partial<Product>) => void;
  onDeleteProduct: (id: string) => void;
  dbStatus: 'loading' | 'ok' | 'error_tables_missing';
}

const AdminPanel: React.FC<AdminPanelProps> = ({ tables, menuItems, categories, audioEnabled, onToggleAudio, onUpdateTable, onAddToOrder, onRefreshData, salesHistory, onLogout, onSaveProduct, onDeleteProduct, dbStatus }) => {
  const [activeTab, setActiveTab] = useState<'tables' | 'delivery' | 'takeaway' | 'menu' | 'categories'>('tables');
  const [selectedTableId, setSelectedTableId] = useState<number | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  
  // Estado do Produto Editando (preço como string para permitir campo vazio)
  const [editingProduct, setEditingProduct] = useState<any | null>(null);
  const [isProductModalOpen, setIsProductModalOpen] = useState(false);
  
  // Estados para gestão de categorias
  const [newCategoryName, setNewCategoryName] = useState('');
  const [renamingCategoryId, setRenamingCategoryId] = useState<string | null>(null);
  const [renamingName, setRenamingName] = useState('');

  const physicalTables = tables.filter(t => t.id <= 12).sort((a,b) => a.id - b.id);
  const deliveryTable = tables.find(t => t.id === 900);
  const counterTable = tables.find(t => t.id === 901);

  const hasNewTables = physicalTables.some(t => t.status === 'occupied' && t.currentOrder?.isUpdated);
  const hasNewDelivery = deliveryTable?.status === 'occupied' && deliveryTable.currentOrder?.isUpdated;
  const hasNewTakeaway = counterTable?.status === 'occupied' && counterTable.currentOrder?.isUpdated;

  const selectedTable = useMemo(() => 
    tables.find(t => t.id === selectedTableId) || null
  , [tables, selectedTableId]);

  const filteredItemsToAdd = useMemo(() => 
    menuItems.filter(item => item.name.toLowerCase().includes(searchTerm.toLowerCase()))
  , [menuItems, searchTerm]);

  const openEditModal = (product: Product) => {
    setEditingProduct({ 
      ...product,
      price: product.price.toString() // Converte para string para o input
    });
    setIsProductModalOpen(true);
  };

  const openAddModal = () => {
    // Busca a categoria inicial
    const initialCat = categories.length > 0 ? categories[0].name : (menuItems.length > 0 ? menuItems[0].category : '');
    setEditingProduct({
      name: '',
      price: '', // Campo inicia TOTALMENTE VAZIO
      category: initialCat,
      description: '',
      image: '',
      isAvailable: true
    });
    setIsProductModalOpen(true);
  };

  const handleAddCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCategoryName.trim()) return;
    const { error } = await supabase.from('categories').insert([{ name: newCategoryName.trim() }]);
    if (error) alert('Erro ao criar: ' + error.message);
    else { setNewCategoryName(''); onRefreshData(); }
  };

  const handleRenameCategory = async (id: string) => {
    if (!renamingName.trim()) return;
    const { error } = await supabase.from('categories').update({ name: renamingName.trim() }).eq('id', id);
    if (error) alert('Erro ao renomear: ' + error.message);
    else { setRenamingCategoryId(null); onRefreshData(); }
  };

  const handleDeleteCategory = async (id: string, name: string) => {
    if (!confirm(`Excluir categoria "${name}"?`)) return;
    const { error } = await supabase.from('categories').delete().eq('id', id);
    if (error) alert('Erro ao excluir: ' + error.message);
    else onRefreshData();
  };

  const handleProductSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const priceNum = parseFloat(editingProduct.price);
    if (!editingProduct?.name || isNaN(priceNum) || !editingProduct?.category) {
      return alert('Preencha nome, preço e categoria corretamente.');
    }
    onSaveProduct({ ...editingProduct, price: priceNum });
    setIsProductModalOpen(false);
  };

  const getStatusLabel = (status: OrderStatus) => {
    switch (status) {
      case 'pending': return { text: 'Pendente', color: 'bg-red-500' };
      case 'preparing': return { text: 'Preparo', color: 'bg-orange-500' };
      case 'ready': return { text: 'Pronto', color: 'bg-blue-500' };
      case 'delivered': return { text: 'Entregue', color: 'bg-green-500' };
      default: return { text: 'Pendente', color: 'bg-red-500' };
    }
  };

  const handleOpenTable = (id: number) => {
    const table = tables.find(t => t.id === id);
    if (table?.currentOrder?.isUpdated) {
      onUpdateTable(id, 'occupied', { ...table.currentOrder, isUpdated: false });
    }
    setSelectedTableId(id);
  };

  const handlePrint = (order: Order, type: 'kitchen' | 'customer') => {
    const printWindow = window.open('', '_blank', 'width=800,height=800');
    if (!printWindow) return;
    const tableLabel = order.tableId === 900 ? 'ENTREGA' : order.tableId === 901 ? 'BALCÃO' : `MESA ${order.tableId}`;
    let content = `<html><body style="font-family:monospace;width:72mm;padding:5mm;font-size:12px;">`;
    if (type === 'kitchen') {
      content += `
          <h2 style="text-align:center;margin:0;">COZINHA</h2>
          <div style="text-align:center;font-size:24px;font-weight:bold;margin:10px 0;">${tableLabel}</div>
          <div style="text-align:center;margin-bottom:10px;">REF: ${order.customerName}</div>
          <p style="text-align:center; font-weight:bold;">${order.orderType === 'takeaway' || order.orderType === 'delivery' || order.orderType === 'counter' ? '*** PARA VIAGEM ***' : 'CONSUMO LOCAL'}</p>
          <hr/>
          ${order.items.map(i => `<div style="font-size:18px;margin-bottom:5px;"><b>${i.quantity}x</b> ${i.name.toUpperCase()}</div>`).join('')}
          <hr/>
      `;
    } else {
      content += `
          <h2 style="text-align:center;margin:0;">D.MOREIRA</h2>
          <hr/>
          <p><b>REF:</b> ${tableLabel}</p>
          <p><b>CLIENTE:</b> ${order.customerName}</p>
          <hr/>
          <table style="width:100%;border-collapse:collapse;">
            ${order.items.map(i => `<tr><td>${i.quantity}x ${i.name}</td><td style="text-align:right;">R$ ${(i.price*i.quantity).toFixed(2)}</td></tr>`).join('')}
          </table>
          <hr/><div style="text-align:right;font-size:18px;"><b>TOTAL: R$ ${order.total.toFixed(2)}</b></div>
          ${order.address ? `<p><b>ENDEREÇO:</b> ${order.address}</p><hr/>` : ''}
      `;
    }
    content += `<script>window.print();window.close();</script></body></html>`;
    printWindow.document.write(content);
    printWindow.document.close();
  };

  return (
    <div className="w-full">
      <div className="bg-white p-6 rounded-[3rem] shadow-sm border border-gray-100 mb-10">
        <div className="flex flex-col md:flex-row justify-between items-center gap-6">
          <div className="flex items-center gap-4">
            <h2 className="text-3xl font-black italic tracking-tighter">Admin D.Moreira</h2>
            <button onClick={onToggleAudio} className={`p-3 rounded-full transition-all flex items-center gap-2 ${audioEnabled ? 'bg-yellow-400 text-black shadow-md' : 'bg-gray-100 text-gray-400'}`}>
              <VolumeIcon muted={!audioEnabled} /><span className="text-[8px] font-black uppercase tracking-widest">{audioEnabled ? 'Ativo' : 'Ativar'}</span>
            </button>
          </div>
          <div className="flex gap-2 sm:gap-4 overflow-x-auto no-scrollbar w-full md:w-auto p-1 items-center">
            <button onClick={() => setActiveTab('tables')} className={`relative whitespace-nowrap px-5 py-2.5 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === 'tables' ? 'bg-yellow-400 text-black shadow-lg' : 'text-gray-400 hover:bg-gray-50'}`}>Mesas {hasNewTables && <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-600 rounded-full border-[3px] border-white animate-pulse"></span>}</button>
            <button onClick={() => setActiveTab('delivery')} className={`relative whitespace-nowrap px-5 py-2.5 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === 'delivery' ? 'bg-yellow-400 text-black shadow-lg' : 'text-gray-400 hover:bg-gray-50'}`}>Entregas {hasNewDelivery && <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-600 rounded-full border-[3px] border-white animate-pulse shadow-lg"></span>}</button>
            <button onClick={() => setActiveTab('takeaway')} className={`relative whitespace-nowrap px-5 py-2.5 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === 'takeaway' ? 'bg-yellow-400 text-black shadow-lg' : 'text-gray-400 hover:bg-gray-50'}`}>Retiradas {hasNewTakeaway && <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-600 rounded-full border-[3px] border-white animate-pulse shadow-lg"></span>}</button>
            <button onClick={() => setActiveTab('menu')} className={`whitespace-nowrap px-5 py-2.5 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === 'menu' ? 'bg-yellow-400 text-black shadow-lg' : 'text-gray-400 hover:bg-gray-50'}`}>Cardápio</button>
            <button onClick={() => setActiveTab('categories')} className={`whitespace-nowrap px-5 py-2.5 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === 'categories' ? 'bg-yellow-400 text-black shadow-lg' : 'text-gray-400 hover:bg-gray-50'}`}>Categorias</button>
            <button onClick={onLogout} className="whitespace-nowrap text-red-500 font-black text-[10px] uppercase ml-4 px-3 py-2 hover:bg-red-50 rounded-xl transition-colors">Sair</button>
          </div>
        </div>
      </div>

      {activeTab === 'categories' && (
        <div className="bg-white p-8 rounded-[3.5rem] shadow-sm border border-gray-100 max-w-2xl mx-auto animate-fade-in">
          <h3 className="text-3xl font-black italic tracking-tighter mb-8">Categorias</h3>
          <form onSubmit={handleAddCategory} className="flex gap-3 mb-8">
            <input type="text" value={newCategoryName} onChange={(e) => setNewCategoryName(e.target.value)} placeholder="Nova Categoria..." className="flex-1 bg-gray-50 border rounded-2xl px-6 py-4 text-sm font-bold outline-none focus:border-yellow-400 shadow-inner" />
            <button type="submit" className="bg-black text-yellow-400 px-6 py-4 rounded-2xl font-black text-xs uppercase shadow-xl hover:brightness-110 active:scale-95 transition-all">Add</button>
          </form>
          <div className="space-y-2">
            {categories.map(cat => (
              <div key={cat.id} className="flex justify-between items-center bg-gray-50 p-4 rounded-2xl border hover:border-yellow-400 transition-all">
                {renamingCategoryId === cat.id ? (
                  <div className="flex-1 flex gap-2">
                    <input autoFocus type="text" value={renamingName} onChange={e => setRenamingName(e.target.value)} className="flex-1 border rounded-xl px-4 py-2 text-sm font-bold" />
                    <button onClick={() => handleRenameCategory(cat.id)} className="bg-green-500 text-white px-4 rounded-xl font-black text-[10px] uppercase">OK</button>
                    <button onClick={() => setRenamingCategoryId(null)} className="text-gray-400 uppercase text-[10px] font-black">X</button>
                  </div>
                ) : (
                  <>
                    <span className="font-black text-gray-800 uppercase tracking-widest text-xs">{cat.name}</span>
                    <div className="flex gap-2">
                      <button onClick={() => { setRenamingCategoryId(cat.id); setRenamingName(cat.name); }} className="p-2 text-gray-400 hover:text-black">
                        <svg width="18" height="18" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg>
                      </button>
                      <button onClick={() => handleDeleteCategory(cat.id, cat.name)} className="p-2 text-red-300 hover:text-red-500"><TrashIcon size={18}/></button>
                    </div>
                  </>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {activeTab === 'menu' && (
        <div className="bg-white p-8 rounded-[3.5rem] shadow-sm border border-gray-100">
          <div className="flex justify-between items-center mb-10">
            <h3 className="text-3xl font-black italic tracking-tighter">Cardápio</h3>
            <button onClick={openAddModal} className="bg-black text-yellow-400 px-8 py-4 rounded-2xl font-black text-xs uppercase shadow-xl active:scale-95 hover:brightness-110">+ Novo Produto</button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {menuItems.map(item => (
              <div key={item.id} className="bg-gray-50 p-5 rounded-[2.5rem] border hover:border-yellow-400 transition-all">
                <img src={item.image} className="w-full aspect-square object-cover rounded-2xl mb-4" />
                <h4 className="font-black text-sm truncate">{item.name}</h4>
                <div className="flex justify-between items-center mb-4">
                   <span className="text-[8px] font-black uppercase text-gray-400 bg-gray-100 px-2 py-1 rounded-md">{item.category}</span>
                   <p className="text-yellow-700 font-black text-xs">R$ {item.price.toFixed(2)}</p>
                </div>
                <div className="flex gap-2">
                  <button onClick={() => openEditModal(item)} className="flex-1 bg-white py-3 rounded-xl font-black text-[10px] uppercase border hover:bg-gray-100">Editar</button>
                  <button onClick={() => { if(confirm(`Excluir ${item.name}?`)) onDeleteProduct(item.id); }} className="p-3 bg-red-50 text-red-500 rounded-xl hover:bg-red-500 hover:text-white"><TrashIcon size={16}/></button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {(activeTab === 'tables' || activeTab === 'delivery' || activeTab === 'takeaway') && (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-6 animate-fade-in">
          {activeTab === 'tables' && physicalTables.map(t => (
            <button key={t.id} onClick={() => handleOpenTable(t.id)} className={`p-6 rounded-[2.5rem] border-4 transition-all flex flex-col items-center justify-center gap-1 h-48 relative overflow-hidden ${t.status === 'free' ? 'bg-white border-gray-100 hover:border-yellow-400' : 'bg-yellow-400 border-black shadow-xl scale-105'}`}>
              {t.status === 'occupied' && t.currentOrder?.isUpdated && <div className="absolute top-3 right-3 bg-red-600 w-3 h-3 rounded-full animate-pulse ring-4 ring-white"></div>}
              <span className="text-4xl font-black italic mb-1">{t.id}</span>
              <span className={`text-[8px] font-black uppercase px-2.5 py-1 rounded-full ${t.status === 'free' ? 'bg-gray-100 text-gray-400' : 'bg-black text-white'}`}>{t.status === 'free' ? 'Livre' : 'Ocupada'}</span>
              {t.status === 'occupied' && <span className="text-[11px] font-black mt-1 truncate w-full px-2">{t.currentOrder?.customerName}</span>}
            </button>
          ))}
          {activeTab === 'delivery' && deliveryTable && (
             <button onClick={() => handleOpenTable(900)} className={`p-6 rounded-[2.5rem] border-4 transition-all flex flex-col items-center justify-center gap-1 h-48 relative overflow-hidden ${deliveryTable.status === 'free' ? 'bg-white border-gray-100 hover:border-yellow-400' : 'bg-yellow-400 border-black shadow-xl scale-105'}`}>
                {deliveryTable.status === 'occupied' && deliveryTable.currentOrder?.isUpdated && <div className="absolute top-3 right-3 bg-red-600 w-3 h-3 rounded-full animate-pulse ring-4 ring-white"></div>}
                <span className="text-4xl font-black italic mb-1">🚚</span>
                <span className={`text-[8px] font-black uppercase px-2.5 py-1 rounded-full ${deliveryTable.status === 'free' ? 'bg-gray-100 text-gray-400' : 'bg-black text-white'}`}>Entrega</span>
                {deliveryTable.status === 'occupied' && <span className="text-[11px] font-black mt-1 truncate w-full px-2">{deliveryTable.currentOrder?.customerName}</span>}
             </button>
          )}
          {activeTab === 'takeaway' && counterTable && (
             <button onClick={() => handleOpenTable(901)} className={`p-6 rounded-[2.5rem] border-4 transition-all flex flex-col items-center justify-center gap-1 h-48 relative overflow-hidden ${counterTable.status === 'free' ? 'bg-white border-gray-100 hover:border-yellow-400' : 'bg-yellow-400 border-black shadow-xl scale-105'}`}>
                {counterTable.status === 'occupied' && counterTable.currentOrder?.isUpdated && <div className="absolute top-3 right-3 bg-red-600 w-3 h-3 rounded-full animate-pulse ring-4 ring-white"></div>}
                <span className="text-4xl font-black italic mb-1">🛍️</span>
                <span className={`text-[8px] font-black uppercase px-2.5 py-1 rounded-full ${counterTable.status === 'free' ? 'bg-gray-100 text-gray-400' : 'bg-black text-white'}`}>Balcão</span>
                {counterTable.status === 'occupied' && <span className="text-[11px] font-black mt-1 truncate w-full px-2">{counterTable.currentOrder?.customerName}</span>}
             </button>
          )}
        </div>
      )}

      {isProductModalOpen && (
        <div className="fixed inset-0 z-[300] flex items-center justify-center p-6 bg-black/90 backdrop-blur-md">
          <div className="bg-white w-full max-w-lg rounded-[3.5rem] p-10 relative">
             <button onClick={() => setIsProductModalOpen(false)} className="absolute top-6 right-6 p-2 hover:bg-gray-100 rounded-full"><CloseIcon size={20}/></button>
             <h3 className="text-3xl font-black italic mb-8">{editingProduct?.id ? 'Editar' : 'Novo Produto'}</h3>
             <form onSubmit={handleProductSubmit} className="space-y-4">
                <input type="text" placeholder="Nome *" value={editingProduct?.name || ''} onChange={e => setEditingProduct({...editingProduct!, name: e.target.value})} className="w-full bg-gray-50 border rounded-2xl px-6 py-4 text-sm font-bold outline-none" required />
                <div className="grid grid-cols-2 gap-4">
                   <input type="number" step="0.01" placeholder="Preço (R$) *" value={editingProduct?.price || ''} onChange={e => setEditingProduct({...editingProduct!, price: e.target.value})} className="w-full bg-gray-50 border rounded-2xl px-6 py-4 text-sm font-bold outline-none" required />
                   <select value={editingProduct?.category} onChange={e => setEditingProduct({...editingProduct!, category: e.target.value})} className="w-full bg-gray-50 border rounded-2xl px-6 py-4 text-sm font-bold outline-none">
                      {categories.map(cat => <option key={cat.id} value={cat.name}>{cat.name}</option>)}
                      {!categories.some(c => c.name === editingProduct?.category) && editingProduct?.category && <option value={editingProduct.category}>{editingProduct.category}</option>}
                   </select>
                </div>
                <input type="text" placeholder="URL Imagem" value={editingProduct?.image || ''} onChange={e => setEditingProduct({...editingProduct!, image: e.target.value})} className="w-full bg-gray-50 border rounded-2xl px-6 py-4 text-sm font-bold outline-none" />
                <textarea placeholder="Descrição" value={editingProduct?.description || ''} onChange={e => setEditingProduct({...editingProduct!, description: e.target.value})} className="w-full bg-gray-50 border rounded-2xl px-6 py-4 text-sm font-bold outline-none h-24" />
                <button type="submit" className="w-full bg-black text-yellow-400 py-5 rounded-2xl font-black text-xs uppercase shadow-xl hover:brightness-110">Salvar Produto</button>
             </form>
          </div>
        </div>
      )}

      {selectedTable && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/90 backdrop-blur-md" onClick={() => setSelectedTableId(null)} />
          <div className="relative bg-white w-full max-w-6xl rounded-[4rem] p-12 shadow-2xl flex flex-col md:flex-row gap-8 max-h-[92vh] border-[12px] border-yellow-400 overflow-hidden">
            <button onClick={() => setSelectedTableId(null)} className="absolute top-6 right-6 p-3 bg-gray-100 rounded-full z-10"><CloseIcon size={24} /></button>
            <div className="flex-[1.2] flex flex-col min-w-0">
              <h3 className="text-5xl font-black italic tracking-tighter mb-6">{selectedTable.id > 800 ? (selectedTable.id === 900 ? '🚚 Entrega' : '🛍️ Balcão') : 'Mesa ' + selectedTable.id}</h3>
              <div className="flex-1 overflow-y-auto no-scrollbar space-y-4 mb-6">
                {selectedTable.currentOrder?.items.map((item, idx) => (
                  <div key={idx} className="flex justify-between items-center bg-gray-50 p-5 rounded-2xl border border-gray-100">
                    <div className="flex items-center gap-3"><span className="bg-black text-white w-7 h-7 rounded-full flex items-center justify-center text-[11px] font-black">{item.quantity}</span><span className="font-black text-sm">{item.name}</span></div>
                    <span className="font-black text-sm text-yellow-700">R$ {(item.price * item.quantity).toFixed(2)}</span>
                  </div>
                )) || <p className="text-gray-400 font-black uppercase text-center py-20">Vazia</p>}
              </div>
              {selectedTable.currentOrder && (
                <div className="pt-6 border-t space-y-4">
                  <div className="flex justify-between items-end"><span className="text-gray-400 font-black uppercase text-[10px]">Total</span><span className="text-4xl font-black italic">R$ {selectedTable.currentOrder.total.toFixed(2)}</span></div>
                  <div className="grid grid-cols-2 gap-3">
                    <button onClick={() => handlePrint(selectedTable.currentOrder!, 'customer')} className="bg-gray-100 py-5 rounded-2xl font-black uppercase text-[10px]">Cupom</button>
                    <button onClick={() => { if(confirm('Fechar conta?')) onUpdateTable(selectedTable.id, 'free'); setSelectedTableId(null); }} className="bg-green-600 text-white py-5 rounded-2xl font-black uppercase text-[10px] shadow-xl">Fechar Conta</button>
                  </div>
                </div>
              )}
            </div>
            <div className="flex-1 bg-gray-50 rounded-[3rem] p-8 flex flex-col min-w-0 border">
              <h4 className="text-xl font-black italic mb-4">Lançar Item</h4>
              <input type="text" placeholder="Buscar..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="w-full bg-white border border-gray-200 rounded-2xl px-5 py-4 text-sm font-bold mb-6 outline-none shadow-inner" />
              <div className="flex-1 overflow-y-auto no-scrollbar space-y-2">
                {filteredItemsToAdd.map(item => (
                  <button key={item.id} onClick={() => { if (!selectedTable.currentOrder) { onUpdateTable(selectedTable.id, 'occupied', { id: 'N-'+Date.now(), customerName: 'Local', items: [{...item, quantity: 1}], total: item.price, paymentMethod: 'Pix', timestamp: new Date().toISOString(), tableId: selectedTable.id, orderType: selectedTable.id > 800 ? (selectedTable.id === 900 ? 'delivery' : 'counter') : 'table', status: 'pending' }); } else { onAddToOrder(selectedTable.id, item); } }} className="w-full flex items-center gap-4 bg-white p-3 rounded-2xl border hover:border-yellow-400 transition-all text-left">
                    <img src={item.image} className="w-10 h-10 rounded-xl object-cover" />
                    <div className="flex-1 min-w-0"><p className="font-black text-[10px] truncate">{item.name}</p><p className="text-yellow-600 font-black text-[10px]">R$ {item.price.toFixed(2)}</p></div>
                    <div className="bg-yellow-400 p-1.5 rounded-lg text-black font-black">+</div>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminPanel;
