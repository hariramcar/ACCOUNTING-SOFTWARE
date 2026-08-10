'use client';

import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Plus, X } from 'lucide-react';
import ExpenseForm from './ExpenseForm';

export default function MobileExpenseModal({ 
  vehicles, 
  accounts, 
  addExpenseAction, 
  addTransferAction, 
  sellVehicleAction, 
  isAdmin 
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  return (
    <>
      <button 
        onClick={() => setIsOpen(true)}
        className="flex lg:hidden items-center justify-center gap-1.5 bg-indigo-600 text-white rounded-lg px-4 py-2 font-bold shadow-sm hover:bg-indigo-700 transition-colors"
      >
        <Plus size={18} />
        <span className="text-sm tracking-wide">New</span>
      </button>

      {mounted && isOpen && createPortal(
        <div className="fixed inset-0 z-[100] flex flex-col justify-end bg-slate-900/60 backdrop-blur-md p-0 lg:hidden transition-all">
          <div className="absolute inset-0" onClick={() => setIsOpen(false)}></div>
          
          <div className="bg-slate-50 rounded-t-[1.5rem] shadow-[0_20px_60px_-15px_rgba(0,0,0,0.3)] w-full h-[90vh] overflow-hidden flex flex-col relative z-10 animate-in slide-in-from-bottom-full duration-500 ease-out border-t border-slate-200">
            
            {/* Header */}
            <div className="px-6 py-5 border-b border-slate-200 bg-white flex items-center justify-between sticky top-0 z-20 shrink-0">
              <h2 className="text-xl font-black text-slate-900 m-0 tracking-tight">New Transaction</h2>
              <button 
                type="button"
                onClick={() => setIsOpen(false)}
                className="text-slate-400 hover:text-slate-700 bg-slate-50 hover:bg-slate-100 border-none cursor-pointer p-2 rounded-full transition-colors"
              >
                <X size={20} strokeWidth={2.5} />
              </button>
            </div>
            
            {/* Content (Expense Form) */}
            <div className="flex-1 overflow-y-auto min-h-0 p-4 bg-slate-50 pb-20" style={{ scrollbarWidth: 'thin' }}>
              <ExpenseForm 
                vehicles={vehicles} 
                accounts={accounts} 
                addExpenseAction={addExpenseAction} 
                addTransferAction={addTransferAction} 
                sellVehicleAction={sellVehicleAction} 
                isAdmin={isAdmin}
                onSuccess={() => setIsOpen(false)} 
              />
            </div>
          </div>
        </div>,
        document.body
      )}
    </>
  );
}
