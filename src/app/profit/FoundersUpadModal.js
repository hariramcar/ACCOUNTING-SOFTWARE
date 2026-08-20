'use client';

import { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X, ArrowUpRight, AlertCircle, HandCoins } from 'lucide-react';
import { giveAdvance } from '@/actions/upad';
import { useRouter } from 'next/navigation';

const formatIndianNumber = (val) => {
  let numericString = val.replace(/[^0-9.]/g, '');
  const parts = numericString.split('.');
  if (parts.length > 2) numericString = parts[0] + '.' + parts.slice(1).join('');
  if (!numericString) return '';
  if (parts.length === 2) return Number(parts[0]).toLocaleString('en-IN') + '.' + parts[1];
  return Number(numericString).toLocaleString('en-IN');
};

function getLocalDateString() {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export default function FoundersUpadModal({ founders, ledgerAccounts }) {
  const [isOpen, setIsOpen] = useState(false);
  const [amount, setAmount] = useState('');
  const [advancePayMode, setAdvancePayMode] = useState('CASH');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [mounted, setMounted] = useState(false);
  
  const isSubmittingRef = useRef(false);
  const router = useRouter();

  useEffect(() => setMounted(true), []);

  const handleAmountChange = (e) => setAmount(formatIndianNumber(e.target.value));

  const handleSubmit = async (e) => {
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
        setIsOpen(false);
        setAmount('');
        e.target.reset();
        router.refresh();
      }
    } finally {
      isSubmittingRef.current = false;
      setIsSubmitting(false);
    }
  };

  return (
    <>
      <button 
        onClick={() => setIsOpen(true)}
        className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white py-2 px-3 rounded-lg font-bold shadow-md transition-all text-[13px] whitespace-nowrap"
      >
        <HandCoins size={14} />
        Take Upad
      </button>

      {mounted && isOpen && createPortal(
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-slate-900/40 backdrop-blur-sm animate-in fade-in duration-200">
          <div 
            className="absolute inset-0" 
            onClick={() => { setIsOpen(false); setAmount(''); setError(null); }}
          ></div>
          
          <div className="bg-white rounded-t-2xl sm:rounded-2xl shadow-2xl w-full max-w-md relative z-10 flex flex-col max-h-[90vh] animate-in slide-in-from-bottom-10 sm:slide-in-from-bottom-4 duration-300">
            <div className="px-5 py-4 border-b border-slate-100 bg-slate-50 flex items-center justify-between sticky top-0 z-10 rounded-t-2xl">
              <div className="flex items-center gap-2">
                <ArrowUpRight size={18} className="text-indigo-600" />
                <h2 className="text-lg font-bold text-slate-900 m-0">Take Upad (Founder)</h2>
              </div>
              <button 
                onClick={() => { setIsOpen(false); setAmount(''); setError(null); }}
                className="text-slate-400 hover:text-slate-700 p-1 rounded-md hover:bg-slate-200 transition-colors"
              >
                <X size={20} />
              </button>
            </div>
            
            <form onSubmit={handleSubmit} className="overflow-y-auto p-4 md:p-6 flex flex-col gap-5">
              {error && (
                <div className="bg-red-50 text-red-600 border border-red-200 p-4 rounded-xl text-sm font-bold flex items-center gap-2 shadow-sm">
                  <AlertCircle size={18} />
                  {error}
                </div>
              )}

              <div className="bg-slate-50/50 p-4 rounded-2xl border border-slate-100 flex flex-col gap-4">
                <div>
                  <label className="text-[11px] uppercase tracking-wider font-bold text-slate-500 mb-1.5 block">Select Founder</label>
                  <select name="accountId" required className="w-full p-4 rounded-xl border border-transparent bg-slate-100 shadow-inner text-slate-900 text-[15px] font-bold outline-none focus:ring-4 focus:ring-indigo-500/15 focus:border-indigo-500 focus:bg-white transition-all cursor-pointer">
                    <option value="">Select Founder...</option>
                    {founders.map(f => (
                      <option key={f.id} value={f.id}>{f.name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-[11px] uppercase tracking-wider font-bold text-indigo-700 mb-1.5 block">Amount (₹)</label>
                  <input 
                    type="text" 
                    inputMode="decimal"
                    name="amount" 
                    required 
                    value={amount}
                    onChange={handleAmountChange}
                    placeholder="e.g. 5,000" 
                    className="w-full p-4 rounded-xl border border-indigo-100 bg-white shadow-[0_2px_10px_-4px_rgba(79,70,229,0.15)] text-indigo-950 text-[16px] font-black outline-none focus:ring-4 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all placeholder:text-indigo-200" 
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
                      className="w-full p-4 rounded-xl border border-transparent bg-slate-100 shadow-inner text-slate-700 text-[15px] font-bold outline-none focus:ring-4 focus:ring-indigo-500/15 focus:border-indigo-500 focus:bg-white transition-all cursor-pointer" 
                    />
                  </div>

                  <div>
                    <label className="text-[11px] uppercase tracking-wider font-bold text-slate-500 mb-1.5 block">Pay From</label>
                    <div className="flex gap-2 mb-2">
                      <button type="button" onClick={() => setAdvancePayMode('CASH')} className={`flex-1 py-2.5 rounded-xl text-xs font-bold border transition-all ${advancePayMode === 'CASH' ? 'bg-indigo-600 text-white border-indigo-600 shadow-md' : 'bg-slate-100 text-slate-600 border-slate-200 hover:bg-slate-200'}`}>💵 Cash</button>
                      <button type="button" onClick={() => setAdvancePayMode('BANK')} className={`flex-1 py-2.5 rounded-xl text-xs font-bold border transition-all ${advancePayMode === 'BANK' ? 'bg-blue-600 text-white border-blue-600 shadow-md' : 'bg-slate-100 text-slate-600 border-slate-200 hover:bg-slate-200'}`}>🏦 Bank</button>
                    </div>
                    {advancePayMode === 'CASH' ? (
                      <>
                        <div className="p-3 rounded-xl bg-indigo-50 border border-indigo-200 text-sm font-bold text-indigo-700">💵 Cash Account (Auto-selected)</div>
                        <input type="hidden" name="sourceAccountId" value={ledgerAccounts.find(a => a.type === 'CASH')?.id || ''} />
                      </>
                    ) : (
                      <select name="sourceAccountId" required className="w-full p-4 rounded-xl border border-transparent bg-slate-100 shadow-inner text-slate-900 text-[15px] font-bold outline-none focus:ring-4 focus:ring-indigo-500/15 focus:border-indigo-500 focus:bg-white transition-all cursor-pointer">
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
                    defaultValue="Partner Upad / Drawing"
                    className="w-full p-4 rounded-xl border border-transparent bg-slate-100 shadow-inner text-slate-900 text-[15px] font-bold outline-none focus:ring-4 focus:ring-indigo-500/15 focus:border-indigo-500 focus:bg-white transition-all" 
                  />
                </div>
              </div>
              
              <button 
                type="submit" 
                disabled={isSubmitting}
                className="mt-2 w-full bg-indigo-600 hover:bg-indigo-700 text-white font-black text-[15px] py-4 px-4 rounded-xl shadow-[0_8px_20px_-8px_rgba(79,70,229,0.5)] transition-all focus:ring-4 focus:ring-indigo-500/20 disabled:opacity-70"
              >
                {isSubmitting ? 'Processing...' : 'Take Upad'}
              </button>
            </form>
          </div>
        </div>,
        document.body
      )}
    </>
  );
}
