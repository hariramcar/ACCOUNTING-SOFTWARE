'use client';

import { useState } from 'react';
import { X, ArrowUpRight, ArrowDownRight, Clock, FileText } from 'lucide-react';
import { getAccountTransactions } from '@/actions/accounts';

export default function AccountHistoryModal({ account, children }) {
  const [isOpen, setIsOpen] = useState(false);
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(false);

  const openModal = async () => {
    setIsOpen(true);
    setLoading(true);
    const result = await getAccountTransactions(account.id);
    if (result.success) {
      setTransactions(result.transactions);
    }
    setLoading(false);
  };

  return (
    <>
      <div onClick={openModal} className="cursor-pointer h-full">
        {children}
      </div>

      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-3xl overflow-hidden flex flex-col max-h-[85vh] animate-in fade-in zoom-in-95 duration-200">
            {/* Header */}
            <div className="px-6 py-5 border-b border-slate-100 flex justify-between items-center bg-slate-50">
              <div>
                <h2 className="text-xl font-bold text-slate-800 m-0">{account.name} Ledger</h2>
                <p className="text-sm font-medium text-slate-500 m-0 mt-1">
                  Current Balance:{' '}
                  <span className={`font-bold ${account.currentBalance >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                    ₹{account.currentBalance.toLocaleString('en-IN')}
                  </span>
                </p>
              </div>
              <button 
                onClick={() => setIsOpen(false)}
                className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-200/50 rounded-full transition-colors border-none bg-transparent cursor-pointer"
              >
                <X size={20} />
              </button>
            </div>

            {/* Content */}
            <div className="p-6 overflow-y-auto flex-1">
              {loading ? (
                <div className="flex flex-col items-center justify-center py-12 gap-4">
                  <div className="w-8 h-8 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin"></div>
                  <div className="text-slate-500 font-medium text-sm">Loading ledger entries...</div>
                </div>
              ) : transactions.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 gap-3 text-center">
                  <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center text-slate-400 mb-2">
                    <FileText size={24} />
                  </div>
                  <h3 className="text-lg font-bold text-slate-700 m-0">No Transactions Yet</h3>
                  <p className="text-slate-500 font-medium text-sm max-w-sm m-0">There are no ledger entries recorded for this account.</p>
                </div>
              ) : (
                <div className="flex flex-col gap-3">
                  {transactions.map(t => (
                    <div key={t.id} className="flex items-center justify-between p-4 rounded-xl border border-slate-100 hover:border-slate-200 hover:shadow-sm transition-all bg-white group">
                      <div className="flex items-center gap-4">
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                          t.type === 'CREDIT' ? 'bg-emerald-50 text-emerald-600' : 'bg-red-50 text-red-600'
                        }`}>
                          {t.type === 'CREDIT' ? <ArrowDownRight size={18} /> : <ArrowUpRight size={18} />}
                        </div>
                        <div>
                          <h4 className="m-0 mb-1 font-bold text-slate-800 text-[15px]">{t.description || t.category}</h4>
                          <div className="flex items-center gap-2 text-xs font-medium text-slate-500">
                            <Clock size={12} />
                            {new Date(t.date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
                            <span className="px-1.5 py-0.5 bg-slate-100 rounded text-[10px] uppercase font-bold tracking-wider ml-1">{t.transactionMode}</span>
                          </div>
                        </div>
                      </div>
                      <div className={`font-black text-lg ${t.type === 'CREDIT' ? 'text-emerald-600' : 'text-red-600'}`}>
                        {t.type === 'CREDIT' ? '' : '-'}₹{t.amount.toLocaleString('en-IN')}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
            
            {/* Footer */}
            <div className="px-6 py-4 border-t border-slate-100 bg-slate-50 flex justify-end">
              <button 
                onClick={() => setIsOpen(false)}
                className="px-5 py-2.5 bg-white border border-slate-200 text-slate-700 rounded-lg font-bold text-sm shadow-sm hover:bg-slate-50 transition-colors focus:ring-4 focus:ring-slate-100 cursor-pointer"
              >
                Close Ledger
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
