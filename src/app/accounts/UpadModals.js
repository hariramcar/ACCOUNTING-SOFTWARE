'use client';

function getLocalDateString() {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

import { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { ArrowUpRight, ArrowDownRight, X, AlertCircle } from 'lucide-react';
import { giveAdvance, settleBill, receiveAdvancePayment } from '@/actions/upad';

const formatIndianNumber = (val) => {
  let numericString = val.replace(/[^0-9.]/g, '');
  const parts = numericString.split('.');
  if (parts.length > 2) numericString = parts[0] + '.' + parts.slice(1).join('');
  if (!numericString) return '';
  if (parts.length === 2) return Number(parts[0]).toLocaleString('en-IN') + '.' + parts[1];
  return Number(numericString).toLocaleString('en-IN');
};

export default function UpadModals({ upadAccounts, ledgerAccounts = [] }) {
  const [activeModal, setActiveModal] = useState(null); // 'advance' | 'settle' | 'receive' | null
  const [amount, setAmount] = useState('');
  
  const [advancePayMode, setAdvancePayMode] = useState('CASH');
  const [billPayMode, setBillPayMode] = useState('CASH');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [mounted, setMounted] = useState(false);

  const isSubmittingRef = useRef(false);

  useEffect(() => setMounted(true), []);

  const handleAmountChange = (e) => setAmount(formatIndianNumber(e.target.value));

  const handleAdvanceSubmit = async (e) => {
    e.preventDefault();
    if (isSubmittingRef.current) return;
    isSubmittingRef.current = true;
    
    const formData = new FormData(e.currentTarget);
    setIsSubmitting(true);
    setError(null);
    try {
      const result = await giveAdvance(formData);
      
      if (result && !result.success) {
        setError(result.error);
      } else {
        setActiveModal(null);
        setAmount('');
        e.target.reset();
      }
    } finally {
      isSubmittingRef.current = false;
      setIsSubmitting(false);
    }
  };

  const handleSettleSubmit = async (e) => {
    e.preventDefault();
    if (isSubmittingRef.current) return;
    isSubmittingRef.current = true;
    
    const formData = new FormData(e.currentTarget);
    setIsSubmitting(true);
    setError(null);
    try {
      const result = await settleBill(formData);
      
      if (result && !result.success) {
        setError(result.error);
      } else {
        setActiveModal(null);
        setAmount('');
        e.target.reset();
      }
    } finally {
      isSubmittingRef.current = false;
      setIsSubmitting(false);
    }
  };

  const handleReceiveSubmit = async (e) => {
    e.preventDefault();
    if (isSubmittingRef.current) return;
    isSubmittingRef.current = true;
    
    const formData = new FormData(e.currentTarget);
    setIsSubmitting(true);
    setError(null);
    try {
      const result = await receiveAdvancePayment(formData);
      
      if (result && !result.success) {
        setError(result.error);
      } else {
        setActiveModal(null);
        setAmount('');
        e.target.reset();
      }
    } finally {
      isSubmittingRef.current = false;
      setIsSubmitting(false);
    }
  };
  const formatAccountType = (type) => {
    if (type === 'UGHRANI') return 'Marketplace';
    if (type === 'UCHAK') return 'Uchak';
    if (type === 'STAFF') return 'Staff';
    if (type === 'PARTNER') return 'Partner';
    if (type === 'FINANCIER' || type === 'DSA_AGENT') return 'Loan Agent';
    return type;
  };


  return (
    <>
      <>
        <button 
          onClick={() => setActiveModal('advance')}
          className="flex-shrink-0 flex items-center justify-center gap-1.5 bg-blue-50 text-blue-700 hover:bg-blue-100 py-2 md:py-2.5 px-3 md:px-4 rounded-lg font-bold shadow-sm transition-colors text-[13px] md:text-sm border border-blue-200 whitespace-nowrap"
        >
          <ArrowUpRight size={16} />
          Give Advance
        </button>
        <button 
          onClick={() => setActiveModal('settle')}
          className="flex-shrink-0 flex items-center justify-center gap-1.5 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 py-2 md:py-2.5 px-3 md:px-4 rounded-lg font-bold shadow-sm transition-colors text-[13px] md:text-sm border border-emerald-200 whitespace-nowrap"
        >
          <ArrowUpRight size={16} />
          Pay Bill
        </button>
      </>

      {activeModal === 'advance' && mounted && createPortal(
        <div className="fixed inset-0 z-[100] flex flex-col justify-end md:justify-center md:items-center p-0 md:p-4 bg-slate-900/50 backdrop-blur-sm">
          <div className="absolute inset-0" onClick={() => setActiveModal(null)}></div>
          <div className="bg-white rounded-t-3xl md:rounded-2xl shadow-xl w-full max-w-sm h-[85vh] md:h-auto md:max-h-[85vh] overflow-hidden flex flex-col relative z-10 animate-in slide-in-from-bottom-full md:slide-in-from-bottom-4 duration-300">
            <div className="md:hidden flex justify-center pt-4 pb-2 bg-slate-50 shrink-0">
              <div className="w-12 h-1.5 bg-slate-200 rounded-full"></div>
            </div>
            <div className="px-5 py-4 border-b border-slate-100 bg-slate-50 flex items-center justify-between sticky top-0 z-10 shrink-0">
              <div className="flex items-center gap-2">
                <ArrowUpRight size={18} className="text-blue-600" />
                <h2 className="text-lg font-bold text-slate-900 m-0">Give Advance</h2>
              </div>
              <button 
                onClick={() => { setActiveModal(null); setAmount(''); setError(null); }}
                className="text-slate-400 hover:text-slate-700 bg-transparent border-none cursor-pointer p-1 rounded-md hover:bg-slate-200 transition-colors"
              >
                <X size={20} />
              </button>
            </div>
            
            <form onSubmit={handleAdvanceSubmit} className="overflow-y-auto p-4 md:p-6 pt-2 md:pt-4 flex flex-col gap-5">
              {error && (
                <div className="bg-red-50 text-red-600 border border-red-200 p-4 rounded-xl text-sm font-bold flex items-center gap-2 shadow-sm">
                  <AlertCircle size={18} />
                  {error}
                </div>
              )}

              <div className="bg-slate-50/50 p-4 rounded-2xl border border-slate-100 flex flex-col gap-4">
                <div>
                  <label className="text-[11px] uppercase tracking-wider font-bold text-slate-500 mb-1.5 block">Select Person</label>
                  <select 
                    name="accountId" 
                    required 
                    onChange={(e) => {
                       const selected = upadAccounts.find(a => a.id === e.target.value);
                       if (selected && selected.type === 'STAFF') {
                          document.getElementById('salary-checkbox-container').classList.remove('hidden');
                       } else {
                          document.getElementById('salary-checkbox-container').classList.add('hidden');
                       }
                    }}
                    className="w-full p-4 rounded-xl border border-transparent bg-slate-100 shadow-inner text-slate-900 text-[15px] font-bold outline-none focus:ring-4 focus:ring-blue-500/15 focus:border-blue-500 focus:bg-white transition-all cursor-pointer"
                  >
                    <option value="">Select Account...</option>
                    {upadAccounts.map(acc => (
                      <option key={acc.id} value={acc.id}>{acc.name} ({formatAccountType(acc.type)})</option>
                    ))}
                  </select>
                </div>
                
                <div id="salary-checkbox-container" className="hidden bg-blue-50/50 p-3 rounded-xl border border-blue-100">
                  <label className="flex items-center gap-3 cursor-pointer">
                    <input type="checkbox" name="isSalary" value="true" className="w-5 h-5 rounded border-blue-300 text-blue-600 focus:ring-blue-500 bg-white" />
                    <div className="flex flex-col">
                      <span className="text-sm font-bold text-blue-900">Mark as Salary Payment</span>
                      <span className="text-[10px] font-medium text-blue-600/80">Check this if you are paying salary (does not affect Upad/Advance balance)</span>
                    </div>
                  </label>
                </div>

                <div>
                  <label className="text-[11px] uppercase tracking-wider font-bold text-blue-700 mb-1.5 block">Amount (₹)</label>
                  <input 
                    type="text" 
                    inputMode="decimal"
                    name="amount" 
                    required 
                    value={amount}
                    onChange={handleAmountChange}
                    placeholder="e.g. 5,000" 
                    className="w-full p-4 rounded-xl border border-blue-100 bg-white shadow-[0_2px_10px_-4px_rgba(37,99,235,0.15)] text-blue-950 text-[16px] font-black outline-none focus:ring-4 focus:ring-blue-500/20 focus:border-blue-500 transition-all placeholder:text-blue-200" 
                  />
                </div>
              </div>

              <div className="bg-slate-50/50 p-4 rounded-2xl border border-slate-100 flex flex-col gap-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="text-[11px] uppercase tracking-wider font-bold text-slate-500 mb-1.5 block">Date</label>
                    <input type="date" name="date" required defaultValue={getLocalDateString()} className="w-full p-4 rounded-xl border border-transparent bg-slate-100 shadow-inner text-slate-700 text-[15px] font-bold outline-none focus:ring-4 focus:ring-blue-500/15 focus:border-blue-500 focus:bg-white transition-all cursor-pointer" />
                  </div>
                  
                  <div>
                    <label className="text-[11px] uppercase tracking-wider font-bold text-slate-500 mb-1.5 block">Payment Account</label>
                    <div className="flex gap-2 mb-2">
                      <button type="button" onClick={() => setAdvancePayMode('CASH')} className={`flex-1 py-2.5 rounded-xl text-xs font-bold border transition-all ${advancePayMode === 'CASH' ? 'bg-emerald-600 text-white border-emerald-600 shadow-md' : 'bg-slate-100 text-slate-600 border-slate-200 hover:bg-slate-200'}`}>💵 Cash</button>
                      <button type="button" onClick={() => setAdvancePayMode('BANK')} className={`flex-1 py-2.5 rounded-xl text-xs font-bold border transition-all ${advancePayMode === 'BANK' ? 'bg-blue-600 text-white border-blue-600 shadow-md' : 'bg-slate-100 text-slate-600 border-slate-200 hover:bg-slate-200'}`}>🏦 Bank</button>
                    </div>
                    {advancePayMode === 'CASH' ? (
                      <>
                        <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-sm font-bold text-emerald-700">💵 Cash Account (Auto-selected)</div>
                        <input type="hidden" name="sourceAccountId" value={ledgerAccounts.find(a => a.type === 'CASH')?.id || ''} />
                      </>
                    ) : (
                      <select name="sourceAccountId" required className="w-full p-4 rounded-xl border border-transparent bg-slate-100 shadow-inner text-slate-900 text-[15px] font-bold outline-none focus:ring-4 focus:ring-blue-500/15 focus:border-blue-500 focus:bg-white transition-all cursor-pointer">
                        <option value="">Select Bank Account...</option>
                        {ledgerAccounts.filter(acc => acc.type === 'BANK').map(acc => (
                          <option key={acc.id} value={acc.id}>{acc.name}</option>
                        ))}
                      </select>
                    )}
                  </div>
                </div>

                <div>
                  <label className="text-[11px] uppercase tracking-wider font-bold text-slate-500 mb-1.5 block">Description / Note</label>
                  <input type="text" name="description" placeholder="e.g. Advance given" className="w-full p-4 rounded-xl border border-transparent bg-slate-100 shadow-inner text-slate-900 text-[15px] font-bold outline-none focus:ring-4 focus:ring-blue-500/15 focus:border-blue-500 focus:bg-white transition-all" />
                </div>
              </div>
              
              <button 
                type="submit" 
                disabled={isSubmitting}
                className="mt-2 w-full bg-blue-600 hover:bg-blue-700 text-white font-black text-[15px] py-4 px-4 rounded-xl shadow-[0_8px_20px_-8px_rgba(37,99,235,0.5)] transition-all focus:ring-4 focus:ring-blue-500/20 disabled:opacity-70"
              >
                {isSubmitting ? 'Processing...' : 'Give Advance'}
              </button>
            </form>
          </div>
        </div>,
        document.body
      )}

      {activeModal === 'settle' && mounted && createPortal(
        <div className="fixed inset-0 z-[100] flex flex-col justify-end md:justify-center md:items-center p-0 md:p-4 bg-slate-900/50 backdrop-blur-sm">
          <div className="absolute inset-0" onClick={() => setActiveModal(null)}></div>
          <div className="bg-white rounded-t-3xl md:rounded-2xl shadow-xl w-full max-w-sm h-[85vh] md:h-auto md:max-h-[85vh] overflow-hidden flex flex-col relative z-10 animate-in slide-in-from-bottom-full md:slide-in-from-bottom-4 duration-300">
            <div className="md:hidden flex justify-center pt-4 pb-2 bg-slate-50 shrink-0">
              <div className="w-12 h-1.5 bg-slate-200 rounded-full"></div>
            </div>
            <div className="px-5 py-4 border-b border-slate-100 bg-slate-50 flex items-center justify-between sticky top-0 z-10 shrink-0">
              <div className="flex items-center gap-2">
                <ArrowUpRight size={18} className="text-emerald-600" />
                <h2 className="text-lg font-bold text-slate-900 m-0">Pay Bill</h2>
              </div>
              <button 
                onClick={() => { setActiveModal(null); setAmount(''); setError(null); }}
                className="text-slate-400 hover:text-slate-700 bg-transparent border-none cursor-pointer p-1 rounded-md hover:bg-slate-200 transition-colors"
              >
                <X size={20} />
              </button>
            </div>
            
            <form onSubmit={handleSettleSubmit} className="overflow-y-auto p-4 md:p-6 pt-2 md:pt-4 flex flex-col gap-5">
              {error && (
                <div className="bg-red-50 text-red-600 border border-red-200 p-4 rounded-xl text-sm font-bold flex items-center gap-2 shadow-sm">
                  <AlertCircle size={18} />
                  {error}
                </div>
              )}

              <div className="bg-slate-50/50 p-4 rounded-2xl border border-slate-100 flex flex-col gap-4">
                <div>
                  <label className="text-[11px] uppercase tracking-wider font-bold text-slate-500 mb-1.5 block">Select Person / Vendor</label>
                  <select name="accountId" required className="w-full p-4 rounded-xl border border-transparent bg-slate-100 shadow-inner text-slate-900 text-[15px] font-bold outline-none focus:ring-4 focus:ring-emerald-500/15 focus:border-emerald-500 focus:bg-white transition-all cursor-pointer">
                    <option value="">Select Account...</option>
                    {upadAccounts.filter(acc => acc.type === 'UGHRANI').map(acc => (
                      <option key={acc.id} value={acc.id}>{acc.name} ({formatAccountType(acc.type)})</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-[11px] uppercase tracking-wider font-bold text-emerald-700 mb-1.5 block">Amount (₹)</label>
                  <input 
                    type="text" 
                    inputMode="decimal"
                    name="amount" 
                    required 
                    value={amount}
                    onChange={handleAmountChange}
                    placeholder="e.g. 1,500" 
                    className="w-full p-4 rounded-xl border border-emerald-100 bg-white shadow-[0_2px_10px_-4px_rgba(16,185,129,0.15)] text-emerald-950 text-[16px] font-black outline-none focus:ring-4 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all placeholder:text-emerald-200" 
                  />
                </div>
              </div>

              <div className="bg-slate-50/50 p-4 rounded-2xl border border-slate-100 flex flex-col gap-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="text-[11px] uppercase tracking-wider font-bold text-slate-500 mb-1.5 block">Date</label>
                    <input 
                      type="date" 
                      name="date" 
                      required
                      defaultValue={getLocalDateString()}
                      className="w-full p-4 rounded-xl border border-transparent bg-slate-100 shadow-inner text-slate-700 text-[15px] font-bold outline-none focus:ring-4 focus:ring-emerald-500/15 focus:border-emerald-500 focus:bg-white transition-all cursor-pointer" 
                    />
                  </div>

                  <div>
                    <label className="text-[11px] uppercase tracking-wider font-bold text-slate-500 mb-1.5 block">Pay From</label>
                    <div className="flex gap-2 mb-2">
                      <button type="button" onClick={() => setBillPayMode('CASH')} className={`flex-1 py-2.5 rounded-xl text-xs font-bold border transition-all ${billPayMode === 'CASH' ? 'bg-emerald-600 text-white border-emerald-600 shadow-md' : 'bg-slate-100 text-slate-600 border-slate-200 hover:bg-slate-200'}`}>💵 Cash</button>
                      <button type="button" onClick={() => setBillPayMode('BANK')} className={`flex-1 py-2.5 rounded-xl text-xs font-bold border transition-all ${billPayMode === 'BANK' ? 'bg-blue-600 text-white border-blue-600 shadow-md' : 'bg-slate-100 text-slate-600 border-slate-200 hover:bg-slate-200'}`}>🏦 Bank</button>
                    </div>
                    {billPayMode === 'CASH' ? (
                      <>
                        <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-sm font-bold text-emerald-700">💵 Cash Account (Auto-selected)</div>
                        <input type="hidden" name="sourceAccountId" value={ledgerAccounts.find(a => a.type === 'CASH')?.id || ''} />
                      </>
                    ) : (
                      <select name="sourceAccountId" required className="w-full p-4 rounded-xl border border-transparent bg-slate-100 shadow-inner text-slate-900 text-[15px] font-bold outline-none focus:ring-4 focus:ring-emerald-500/15 focus:border-emerald-500 focus:bg-white transition-all cursor-pointer">
                        <option value="">Select Bank Account...</option>
                        {ledgerAccounts.filter(acc => acc.type === 'BANK').map(acc => (
                          <option key={acc.id} value={acc.id}>{acc.name}</option>
                        ))}
                      </select>
                    )}
                  </div>
                </div>

                <div>
                  <label className="text-[11px] uppercase tracking-wider font-bold text-slate-500 mb-1.5 block">Description / Note</label>
                  <input 
                    type="text" 
                    name="description" 
                    placeholder="e.g. Paid for repair bill" 
                    className="w-full p-4 rounded-xl border border-transparent bg-slate-100 shadow-inner text-slate-900 text-[15px] font-bold outline-none focus:ring-4 focus:ring-emerald-500/15 focus:border-emerald-500 focus:bg-white transition-all" 
                  />
                </div>
              </div>
              
              <button 
                type="submit" 
                disabled={isSubmitting}
                className="mt-2 w-full bg-emerald-600 hover:bg-emerald-700 text-white font-black text-[15px] py-4 px-4 rounded-xl shadow-[0_8px_20px_-8px_rgba(16,185,129,0.5)] transition-all focus:ring-4 focus:ring-emerald-500/20 disabled:opacity-70"
              >
                {isSubmitting ? 'Processing...' : 'Pay Bill'}
              </button>
            </form>
          </div>
        </div>,
        document.body
      )}

    </>
  );
}
