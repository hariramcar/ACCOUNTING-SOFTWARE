'use client';

import { useState } from 'react';
import { X, ArrowUpRight, ArrowDownRight, Clock, FileText } from 'lucide-react';
import { getAccountTransactions } from '@/actions/accounts';

export default function AccountHistoryModal({ account, filterVehicle, children }) {
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
        <div className="fixed inset-0 z-50 flex flex-col justify-end md:justify-center md:items-center p-0 md:p-4 bg-slate-900/40 backdrop-blur-sm">
          <div className="absolute inset-0" onClick={() => setIsOpen(false)}></div>
          <div className="bg-white rounded-t-3xl md:rounded-2xl shadow-xl w-full max-w-3xl overflow-hidden flex flex-col max-h-[90vh] md:max-h-[85vh] relative z-10 animate-in slide-in-from-bottom-full md:slide-in-from-bottom-4 duration-300">
            {/* Mobile Drag Handle */}
            <div className="md:hidden flex justify-center pt-4 pb-2 bg-slate-50">
              <div className="w-12 h-1.5 bg-slate-200 rounded-full"></div>
            </div>
            {/* Header */}
            <div className="px-5 py-4 md:px-6 md:py-5 border-b border-slate-100 flex justify-between items-center bg-slate-50 sticky top-0 z-10">
              <div>
                <h2 className="text-xl font-bold text-slate-800 m-0">
                  {account.name} {filterVehicle ? `(${filterVehicle.make} ${filterVehicle.model} - ${filterVehicle.registration})` : 'Ledger'}
                </h2>
                {!filterVehicle && (
                  <p className="text-sm font-medium text-slate-500 m-0 mt-1">
                    Current Balance:{' '}
                    <span className={`font-bold ${account.currentBalance >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                      ₹{account.currentBalance.toLocaleString('en-IN')}
                    </span>
                  </p>
                )}
              </div>
              <button 
                onClick={() => setIsOpen(false)}
                className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-200/50 rounded-full transition-colors border-none bg-transparent cursor-pointer"
              >
                <X size={20} />
              </button>
            </div>

            {/* Content */}
            <div className="p-4 md:p-6 overflow-y-auto flex-1">
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
                  {(() => {
                    let displayTxs = transactions;
                    
                    if (filterVehicle) {
                      displayTxs = transactions.filter(t => {
                        const desc = t.description?.toLowerCase() || '';
                        const hasReg = filterVehicle.registration && desc.includes(filterVehicle.registration.toLowerCase());
                        const hasMakeModel = desc.includes(filterVehicle.make.toLowerCase()) && desc.includes(filterVehicle.model.toLowerCase());
                        return hasReg || hasMakeModel;
                      });
                    }

                    if (displayTxs.length === 0 && filterVehicle) {
                      return (
                        <div className="flex flex-col items-center justify-center py-12 gap-3 text-center">
                          <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center text-slate-400 mb-2">
                            <FileText size={24} />
                          </div>
                          <h3 className="text-lg font-bold text-slate-700 m-0">No Transactions Found</h3>
                          <p className="text-slate-500 font-medium text-sm max-w-sm m-0">There are no ledger entries explicitly linked to {filterVehicle.make} {filterVehicle.model} ({filterVehicle.registration}).</p>
                        </div>
                      );
                    }

                    if (account.type !== 'PARTNER' || filterVehicle) {
                      return displayTxs.map(t => <TransactionItem key={t.id} t={t} />);
                    }
                    
                    const grouped = {};
                    const unlinked = [];
                    
                    account.partnerVehicles?.forEach(v => {
                      grouped[v.id] = { vehicle: v, txs: [] };
                    });
                    
                    transactions.forEach(t => {
                      let matched = false;
                      const desc = t.description?.toLowerCase() || '';
                      
                      if (account.partnerVehicles) {
                        for (const v of account.partnerVehicles) {
                          const hasReg = v.registration && desc.includes(v.registration.toLowerCase());
                          const hasMakeModel = desc.includes(v.make.toLowerCase()) && desc.includes(v.model.toLowerCase());
                          
                          if (hasReg || hasMakeModel) {
                            grouped[v.id].txs.push(t);
                            matched = true;
                            break;
                          }
                        }
                      }
                      
                      if (!matched) {
                        unlinked.push(t);
                      }
                    });
                    
                    return (
                      <div className="flex flex-col gap-6">
                        {Object.values(grouped).filter(g => g.txs.length > 0).map(g => (
                          <div key={g.vehicle.id} className="border border-teal-100 rounded-xl overflow-hidden shadow-sm">
                            <div className="bg-teal-50/50 px-4 py-3 border-b border-teal-100 flex justify-between items-center">
                              <div>
                                <h4 className="m-0 text-[15px] font-bold text-slate-800">{g.vehicle.make} {g.vehicle.model} ({g.vehicle.registration})</h4>
                                <p className="m-0 text-xs font-medium text-teal-600 mt-0.5">Share: {g.vehicle.profitSharePercentage}%</p>
                              </div>
                            </div>
                            <div className="flex flex-col">
                              {g.txs.map(t => <TransactionItem key={t.id} t={t} className="border-b last:border-0 rounded-none border-slate-100 shadow-none" />)}
                            </div>
                          </div>
                        ))}
                        
                        {unlinked.length > 0 && (
                          <div className="border border-slate-200 rounded-xl overflow-hidden shadow-sm">
                             <div className="bg-slate-50 px-4 py-3 border-b border-slate-200">
                               <h4 className="m-0 text-[14px] font-bold text-slate-700">General Transactions</h4>
                             </div>
                             <div className="flex flex-col">
                               {unlinked.map(t => <TransactionItem key={t.id} t={t} className="border-b last:border-0 rounded-none border-slate-100 shadow-none" />)}
                             </div>
                          </div>
                        )}
                      </div>
                    );
                  })()}
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

function TransactionItem({ t, className = '' }) {
  return (
    <div className={`p-4 md:p-5 flex flex-col md:flex-row justify-between items-start md:items-center gap-3 md:gap-0 rounded-xl border border-slate-100 hover:bg-slate-50 transition-all bg-white group ${className}`}>
      <div className="flex items-start gap-4">
        <div className={`mt-0.5 w-10 h-10 rounded-full flex items-center justify-center shrink-0 border ${
          t.type === 'CREDIT' ? 'bg-emerald-50 text-emerald-600 border-emerald-100' : 'bg-red-50 text-red-600 border-red-100'
        }`}>
          {t.type === 'CREDIT' ? <ArrowDownRight size={18} /> : <ArrowUpRight size={18} />}
        </div>
        <div>
          <h4 className="m-0 mb-1.5 font-bold text-slate-800 text-[15px] leading-tight break-words">{t.description || t.category}</h4>
          <div className="flex flex-wrap items-center gap-2 text-[11px] font-medium text-slate-500">
            <span className="flex items-center gap-1.5 bg-slate-100 text-slate-600 px-2 py-0.5 rounded-md font-semibold border border-slate-200 shadow-sm">
              <Clock size={12} className="text-slate-400" />
              {new Date(t.date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
            </span>
            <span className={`px-2 py-0.5 rounded-md text-[10px] uppercase font-bold tracking-wider shadow-sm border ${
              (t.transactionMode === 'CASH' && t.category !== 'EXPENSE') ? 'bg-amber-50 text-amber-600 border-amber-200' : 
              t.transactionMode === 'BANK' ? 'bg-blue-50 text-blue-600 border-blue-200' : 
              'bg-purple-50 text-purple-600 border-purple-200'
            }`}>
              {t.category === 'EXPENSE' ? 'UGHRANI / PENDING' : t.transactionMode}
            </span>
          </div>
        </div>
      </div>
      
      <div className="flex items-center justify-between md:justify-end w-full md:w-auto border-t border-slate-100 md:border-t-0 pt-3 md:pt-0 mt-1 md:mt-0">
        <div className="md:hidden text-xs font-bold text-slate-400 uppercase tracking-wider">Amount</div>
        <div className={`font-black text-lg tracking-tight ${t.type === 'CREDIT' ? 'text-emerald-600' : 'text-red-600'}`}>
          {t.type === 'CREDIT' ? '+' : '-'}₹{t.amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
        </div>
      </div>
    </div>
  );
}
