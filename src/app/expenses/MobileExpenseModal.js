'use client';

import { useState } from 'react';
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

  return (
    <>
      <button 
        onClick={() => setIsOpen(true)}
        className="flex lg:hidden items-center justify-center gap-1 bg-indigo-600 text-white rounded-lg px-3 py-2 font-bold shadow-sm hover:bg-indigo-700 transition-colors"
      >
        <Plus size={16} />
        <span className="text-xs tracking-wider uppercase">New</span>
      </button>

      {isOpen && (
        <div className="fixed inset-0 z-50 flex flex-col lg:hidden bg-slate-50 animate-in slide-in-from-bottom-full duration-300">
          
          {/* Header */}
          <div className="px-5 py-4 border-b border-slate-200 bg-white flex items-center justify-between sticky top-0 z-20 shadow-sm">
            <h2 className="text-xl font-bold text-slate-900 m-0">New Transaction</h2>
            <button 
              onClick={() => setIsOpen(false)}
              className="text-slate-400 hover:text-slate-700 bg-slate-50 border border-slate-200 p-2 rounded-full shadow-sm transition-colors"
            >
              <X size={20} />
            </button>
          </div>
          
          {/* Content (Expense Form) */}
          <div className="flex-1 overflow-y-auto p-4 bg-slate-50 pb-20">
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
      )}
    </>
  );
}
