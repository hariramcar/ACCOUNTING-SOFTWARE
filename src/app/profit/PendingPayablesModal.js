'use client';

import { useState, useRef } from 'react';
import { CreditCard, X, AlertCircle, HandCoins, ArrowUpRight, ArrowDownRight, CheckCircle2 } from 'lucide-react';
import { payPendingBalance } from '@/actions/profit';
import { useRouter } from 'next/navigation';

export default function PendingPayablesModal({ payables = [], receivables = [], accounts = [] }) {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('PAYABLES'); // 'PAYABLES' | 'RECEIVABLES'
  const [payingVehicleId, setPayingVehicleId] = useState(null);
  const [amount, setAmount] = useState('');
  const [paymentAccountId, setPaymentAccountId] = useState('');
  const [payMode, setPayMode] = useState('CASH');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [successMsg, setSuccessMsg] = useState(null);

  const totalPayables = payables.reduce((sum, p) => sum + p.pendingBalance, 0);
  const totalReceivables = receivables.reduce((sum, p) => sum + p.pendingBalance, 0);

  const isSubmittingRef = useRef(false);

  const handlePay = async (e, vehicleId, isReceivable) => {
    e.preventDefault();
    if (isSubmittingRef.current) return;
    isSubmittingRef.current = true;
    
    setIsSubmitting(true);
    setError(null);
    setSuccessMsg(null);

    const formData = new FormData();
    formData.append('vehicleId', vehicleId);
    formData.append('amount', amount);
    
    const cashAccount = accounts.find(a => a.type === 'CASH');
    const finalAccountId = payMode === 'CASH' ? (cashAccount?.id || '') : paymentAccountId;
    const selectedAccount = accounts.find(a => a.id === finalAccountId);
    formData.append('mode', selectedAccount ? selectedAccount.type : 'CASH');
    formData.append('paymentAccountId', finalAccountId);
    formData.append('paymentType', isReceivable ? 'RECEIVABLE' : 'PAYABLE');

    try {
      const result = await payPendingBalance(formData);
      
      if (result.success) {
        setPayingVehicleId(null);
        setAmount('');
        setSuccessMsg('Payment processed successfully!');
        router.refresh(); // Refresh page data
        setTimeout(() => setSuccessMsg(null), 3000);
      } else {
        setError(result.error);
      }
    } finally {
      isSubmittingRef.current = false;
      setIsSubmitting(false);
    }
  };

  const activeData = activeTab === 'PAYABLES' ? payables : receivables;

  return (
    <>
      <div 
        onClick={() => setIsOpen(true)}
        className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm relative overflow-hidden group hover:shadow-md transition-all cursor-pointer"
      >
        <div className="absolute right-0 top-0 w-32 h-32 bg-indigo-50/50 rounded-bl-full -mr-4 -mt-4 transition-transform group-hover:scale-110"></div>
        
        <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2 mb-4 relative z-10">
          <HandCoins size={16} className="text-indigo-500" /> Pending Vehicle Payments
        </h3>
        
        <div className="grid grid-cols-2 gap-4 relative z-10">
          <div className="bg-rose-50/50 rounded-xl p-3 border border-rose-100">
            <div className="text-[10px] font-bold text-rose-500 uppercase tracking-widest mb-1 flex items-center gap-1">
              <ArrowUpRight size={12} /> To Pay (Buy)
            </div>
            <div className="text-xl font-bold text-rose-600">₹{totalPayables.toLocaleString('en-IN')}</div>
          </div>
          
          <div className="bg-emerald-50/50 rounded-xl p-3 border border-emerald-100">
            <div className="text-[10px] font-bold text-emerald-500 uppercase tracking-widest mb-1 flex items-center gap-1">
              <ArrowDownRight size={12} /> To Receive (Sell)
            </div>
            <div className="text-xl font-bold text-emerald-600">₹{totalReceivables.toLocaleString('en-IN')}</div>
          </div>
        </div>
        
        <div className="mt-4 pt-4 border-t border-slate-100 flex justify-center relative z-10">
          <span className="text-xs font-bold text-indigo-600 bg-indigo-50 px-3 py-1.5 rounded-full flex items-center gap-1 group-hover:bg-indigo-100 transition-colors">
            View & Manage All &rarr;
          </span>
        </div>
      </div>

      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl overflow-hidden flex flex-col max-h-[90vh]">
            
            {/* MODAL HEADER WITH TABS */}
            <div className="px-6 py-4 border-b border-slate-100 bg-slate-50 flex flex-col gap-4 sticky top-0 z-10">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <HandCoins size={20} className="text-indigo-600" />
                  <h2 className="text-lg font-bold text-slate-900 m-0">Pending Vehicle Payments</h2>
                </div>
                <button 
                  onClick={() => setIsOpen(false)}
                  className="text-slate-400 hover:text-slate-700 bg-transparent border-none cursor-pointer p-1 rounded-md hover:bg-slate-200 transition-colors"
                >
                  <X size={20} />
                </button>
              </div>
              
              <div className="flex gap-2">
                <button 
                  onClick={() => { setActiveTab('PAYABLES'); setError(null); setSuccessMsg(null); setPayingVehicleId(null); }}
                  className={`flex-1 py-2 text-sm font-bold rounded-lg transition-colors flex items-center justify-center gap-2 ${activeTab === 'PAYABLES' ? 'bg-rose-100 text-rose-700' : 'bg-slate-200/50 text-slate-500 hover:bg-slate-200'}`}
                >
                  <ArrowUpRight size={16} /> To Pay (Purchases)
                </button>
                <button 
                  onClick={() => { setActiveTab('RECEIVABLES'); setError(null); setSuccessMsg(null); setPayingVehicleId(null); }}
                  className={`flex-1 py-2 text-sm font-bold rounded-lg transition-colors flex items-center justify-center gap-2 ${activeTab === 'RECEIVABLES' ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-200/50 text-slate-500 hover:bg-slate-200'}`}
                >
                  <ArrowDownRight size={16} /> To Receive (Sales)
                </button>
              </div>
            </div>
            
            <div className="p-6 overflow-y-auto bg-slate-50/30 flex-1 custom-scrollbar">
              {error && (
                <div className="bg-red-50 text-red-600 border border-red-200 p-3 rounded-lg text-sm font-bold flex items-center gap-2 mb-4">
                  <AlertCircle size={16} /> {error}
                </div>
              )}
              {successMsg && (
                <div className="bg-emerald-50 text-emerald-600 border border-emerald-200 p-3 rounded-lg text-sm font-bold flex items-center gap-2 mb-4 animate-in fade-in slide-in-from-top-2">
                  <CheckCircle2 size={16} /> {successMsg}
                </div>
              )}

              {activeData.length === 0 ? (
                <div className="text-center py-12 flex flex-col items-center justify-center text-slate-400">
                  <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mb-3">
                    <CheckCircle2 size={32} className="text-slate-300" />
                  </div>
                  <h3 className="text-lg font-bold text-slate-700 mb-1">All Clear!</h3>
                  <p className="text-sm font-medium">No pending {activeTab.toLowerCase()} right now.</p>
                </div>
              ) : (
                <div className="flex flex-col gap-4">
                  {activeData.map((v) => {
                    const isReceivable = activeTab === 'RECEIVABLES';
                    const amountColorClass = isReceivable ? 'text-emerald-600' : 'text-rose-600';
                    const badgeColorClass = isReceivable ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-rose-50 text-rose-700 border-rose-200';
                    
                    return (
                      <div key={v.id} className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm flex flex-col gap-4">
                        <div className="flex justify-between items-start">
                          <div>
                            <h4 className="m-0 text-slate-900 font-bold text-lg">{v.make} {v.model}</h4>
                            <div className="text-xs text-slate-500 font-medium mt-1">
                              {v.registration || 'Unregistered'} • {isReceivable ? 'Sold' : 'Bought'} {new Date(isReceivable ? v.saleDate : v.purchaseDate).toLocaleDateString()}
                            </div>
                            <div className="mt-3 flex items-center gap-2">
                              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                                {isReceivable ? 'Owed By:' : 'Owed To:'}
                              </span>
                              <span className={`text-xs font-bold border px-2 py-0.5 rounded-md ${badgeColorClass}`}>
                                {isReceivable ? v.receivableAccountName : v.payableAccountName}
                              </span>
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="text-[10px] text-slate-400 uppercase tracking-widest font-bold mb-1">Pending Balance</div>
                            <strong className={`text-2xl font-bold ${amountColorClass}`}>₹{v.pendingBalance.toLocaleString('en-IN')}</strong>
                          </div>
                        </div>

                        {/* PAYMENT FORM OR TRIGGER */}
                        <div className="border-t border-slate-100 pt-4 mt-2">
                          {payingVehicleId === v.id ? (
                            <form onSubmit={(e) => handlePay(e, v.id, isReceivable)} className="bg-slate-50 p-4 rounded-xl border border-slate-200 animate-in fade-in zoom-in-95 duration-200">
                              <div className="flex items-center justify-between mb-3">
                                <h4 className="text-sm font-bold text-slate-800 m-0">Record {isReceivable ? 'Receipt' : 'Payment'}</h4>
                                <button type="button" onClick={() => setPayingVehicleId(null)} className="text-slate-400 hover:text-slate-600 bg-transparent border-none">
                                  <X size={16} />
                                </button>
                              </div>
                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
                                <div>
                                  <label className="block text-xs font-bold text-slate-500 mb-1">Amount (₹)</label>
                                  <input
                                    type="number"
                                    required
                                    min="1"
                                    max={v.pendingBalance}
                                    value={amount}
                                    onChange={(e) => setAmount(e.target.value)}
                                    placeholder="Enter amount"
                                    className="w-full bg-white border border-slate-300 text-slate-900 text-sm rounded-lg focus:ring-indigo-500 focus:border-indigo-500 block p-2.5 font-medium"
                                  />
                                </div>
                                <div>
                                  <label className="block text-xs font-bold text-slate-500 mb-1">Account (From/To)</label>
                                  <div className="flex gap-2 mb-2">
                                    <button type="button" onClick={() => { setPayMode('CASH'); setPaymentAccountId(''); }} className={`flex-1 py-2 rounded-lg text-xs font-bold border transition-all ${payMode === 'CASH' ? 'bg-emerald-600 text-white border-emerald-600 shadow-md' : 'bg-slate-100 text-slate-600 border-slate-200 hover:bg-slate-200'}`}>💵 Cash</button>
                                    <button type="button" onClick={() => { setPayMode('BANK'); setPaymentAccountId(''); }} className={`flex-1 py-2 rounded-lg text-xs font-bold border transition-all ${payMode === 'BANK' ? 'bg-blue-600 text-white border-blue-600 shadow-md' : 'bg-slate-100 text-slate-600 border-slate-200 hover:bg-slate-200'}`}>🏦 Bank</button>
                                  </div>
                                  {payMode === 'CASH' ? (
                                    <div className="p-2.5 rounded-lg bg-emerald-50 border border-emerald-200 text-sm font-bold text-emerald-700 flex items-center gap-1.5">💵 Cash Account (Auto-selected)</div>
                                  ) : (
                                    <select
                                      required
                                      value={paymentAccountId}
                                      onChange={(e) => setPaymentAccountId(e.target.value)}
                                      className="w-full bg-white border border-slate-300 text-slate-900 text-sm rounded-lg focus:ring-indigo-500 focus:border-indigo-500 block p-2.5 font-medium"
                                    >
                                      <option value="">Select Bank Account...</option>
                                      {accounts.filter(a => a.type === 'BANK').map(acc => (
                                        <option key={acc.id} value={acc.id}>
                                          {acc.name} (Bal: ₹{acc.openingBalance.toLocaleString('en-IN')})
                                        </option>
                                      ))}
                                    </select>
                                  )}
                                </div>
                              </div>
                              <div className="flex justify-end gap-2">
                                <button
                                  type="button"
                                  onClick={() => setPayingVehicleId(null)}
                                  className="px-4 py-2 text-sm font-bold text-slate-600 bg-white border border-slate-300 rounded-lg hover:bg-slate-50"
                                >
                                  Cancel
                                </button>
                                <button
                                  type="submit"
                                  disabled={isSubmitting || !amount || (payMode === 'BANK' && !paymentAccountId)}
                                  className={`px-4 py-2 text-sm font-bold text-white rounded-lg flex items-center gap-2 ${isSubmitting ? 'bg-slate-400' : isReceivable ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-rose-600 hover:bg-rose-700'} disabled:opacity-50`}
                                >
                                  <CreditCard size={16} />
                                  {isSubmitting ? 'Processing...' : isReceivable ? 'Record Receipt' : 'Record Payment'}
                                </button>
                              </div>
                            </form>
                          ) : (
                            <div className="flex justify-end">
                              <button
                                onClick={() => {
                                  setPayingVehicleId(v.id);
                                  setAmount(v.pendingBalance);
                                  setError(null);
                                }}
                                className={`px-4 py-2 text-sm font-bold rounded-lg flex items-center gap-2 transition-colors ${isReceivable ? 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100' : 'bg-rose-50 text-rose-700 hover:bg-rose-100'}`}
                              >
                                {isReceivable ? 'Receive Money' : 'Pay Balance'}
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
