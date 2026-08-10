'use client';

import { useState } from 'react';
import { ArrowUpRight, ArrowDownRight, X, AlertCircle } from 'lucide-react';
import { giveAdvance, settleBill } from '@/actions/upad';

const formatIndianNumber = (val) => {
  let numericString = val.replace(/[^0-9.]/g, '');
  const parts = numericString.split('.');
  if (parts.length > 2) numericString = parts[0] + '.' + parts.slice(1).join('');
  if (!numericString) return '';
  if (parts.length === 2) return Number(parts[0]).toLocaleString('en-IN') + '.' + parts[1];
  return Number(numericString).toLocaleString('en-IN');
};

export default function UpadModals({ upadAccounts, ledgerAccounts = [] }) {
  const [activeModal, setActiveModal] = useState(null); // 'advance' | 'settle' | null
  const [amount, setAmount] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState(null);

  const handleAmountChange = (e) => setAmount(formatIndianNumber(e.target.value));

  const handleAdvanceSubmit = async (e) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    setIsSubmitting(true);
    setError(null);
    const result = await giveAdvance(formData);
    
    if (result && !result.success) {
      setError(result.error);
      setIsSubmitting(false);
    } else {
      setIsSubmitting(false);
      setActiveModal(null);
      setAmount('');
      e.target.reset();
    }
  };

  const handleSettleSubmit = async (e) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    setIsSubmitting(true);
    setError(null);
    const result = await settleBill(formData);
    
    if (result && !result.success) {
      setError(result.error);
      setIsSubmitting(false);
    } else {
      setIsSubmitting(false);
      setActiveModal(null);
      setAmount('');
      e.target.reset();
    }
  };

  return (
    <>
      <div className="flex flex-wrap gap-2">
        <button 
          onClick={() => setActiveModal('advance')}
          className="flex items-center gap-1.5 bg-blue-50 text-blue-700 hover:bg-blue-100 py-2 px-3 rounded-lg font-bold shadow-sm transition-colors text-sm border border-blue-200"
        >
          <ArrowUpRight size={16} />
          Give Advance
        </button>
        <button 
          onClick={() => setActiveModal('settle')}
          className="flex items-center gap-1.5 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 py-2 px-3 rounded-lg font-bold shadow-sm transition-colors text-sm border border-emerald-200"
        >
          <ArrowDownRight size={16} />
          Settle Bill
        </button>
      </div>

      {activeModal === 'advance' && (
        <div className="fixed inset-0 z-50 flex flex-col justify-end md:justify-center md:items-center p-0 md:p-4 bg-slate-900/50 backdrop-blur-sm">
          <div className="absolute inset-0" onClick={() => setActiveModal(null)}></div>
          <div className="bg-white rounded-t-3xl md:rounded-2xl shadow-xl w-full max-w-sm overflow-hidden flex flex-col relative z-10 animate-in slide-in-from-bottom-full md:slide-in-from-bottom-4 duration-300">
            {/* Mobile Drag Handle */}
            <div className="md:hidden flex justify-center pt-4 pb-2 bg-slate-50">
              <div className="w-12 h-1.5 bg-slate-200 rounded-full"></div>
            </div>
            <div className="px-5 py-4 border-b border-slate-100 bg-slate-50 flex items-center justify-between sticky top-0 z-10">
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
            
            <form onSubmit={handleAdvanceSubmit} className="p-6 pt-4 flex flex-col gap-4 overflow-y-auto max-h-[80vh]">
              {error && (
                <div className="bg-red-50 text-red-600 border border-red-200 p-3 rounded-lg text-sm font-bold flex items-center gap-2">
                  <AlertCircle size={16} />
                  {error}
                </div>
              )}

              <div className="flex flex-col gap-1.5">
                <label className="text-[11px] uppercase tracking-wider font-bold text-slate-500">Select Person</label>
                <select name="accountId" required className="p-2.5 rounded-lg border border-slate-200 bg-white text-slate-900 text-sm outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 font-medium">
                  <option value="">Select Mechanic/Staff...</option>
                  {upadAccounts.map(acc => (
                    <option key={acc.id} value={acc.id}>{acc.name} ({acc.type})</option>
                  ))}
                </select>
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-[11px] uppercase tracking-wider font-bold text-slate-500">Amount (₹)</label>
                <input 
                  type="text" 
                  inputMode="decimal"
                  name="amount" 
                  required 
                  value={amount}
                  onChange={handleAmountChange}
                  placeholder="e.g. 5,000" 
                  className="p-2.5 rounded-lg border border-slate-200 bg-white text-slate-900 text-sm outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 font-semibold" 
                />
              </div>

              <div className="flex gap-4">
                <div className="flex flex-col gap-1.5 flex-1">
                  <label className="text-[11px] uppercase tracking-wider font-bold text-slate-500">Date</label>
                  <input type="date" name="date" required defaultValue={new Date().toISOString().split('T')[0]} className="p-2.5 rounded-lg border border-slate-200 bg-white text-slate-900 text-sm outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 font-medium" />
                </div>
                
                <div className="flex flex-col gap-1.5 flex-1">
                  <label className="text-[11px] uppercase tracking-wider font-bold text-slate-500">Payment Account</label>
                  <select name="sourceAccountId" required className="p-2.5 rounded-lg border border-slate-200 bg-white text-slate-900 text-sm outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 font-medium">
                    <option value="">Select Account...</option>
                    {ledgerAccounts.map(acc => (
                      <option key={acc.id} value={acc.id}>{acc.name} ({acc.type})</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-[11px] uppercase tracking-wider font-bold text-slate-500">Description / Note</label>
                <input type="text" name="description" placeholder="e.g. Advance for repairs" className="p-2.5 rounded-lg border border-slate-200 bg-white text-slate-900 text-sm outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 font-medium" />
              </div>
              <button 
                type="submit" 
                disabled={isSubmitting}
                className="mt-2 bg-blue-600 hover:bg-blue-700 text-white font-bold py-2.5 px-4 rounded-lg transition-colors disabled:opacity-70"
              >
                {isSubmitting ? 'Saving...' : 'Give Advance'}
              </button>
            </form>
          </div>
        </div>
      )}

      {activeModal === 'settle' && (
        <div className="fixed inset-0 z-50 flex flex-col justify-end md:justify-center md:items-center p-0 md:p-4 bg-slate-900/50 backdrop-blur-sm">
          <div className="absolute inset-0" onClick={() => setActiveModal(null)}></div>
          <div className="bg-white rounded-t-3xl md:rounded-2xl shadow-xl w-full max-w-sm overflow-hidden flex flex-col relative z-10 animate-in slide-in-from-bottom-full md:slide-in-from-bottom-4 duration-300">
            {/* Mobile Drag Handle */}
            <div className="md:hidden flex justify-center pt-4 pb-2 bg-slate-50">
              <div className="w-12 h-1.5 bg-slate-200 rounded-full"></div>
            </div>
            <div className="px-5 py-4 border-b border-slate-100 bg-slate-50 flex items-center justify-between sticky top-0 z-10">
              <div className="flex items-center gap-2">
                <ArrowDownRight size={18} className="text-emerald-600" />
                <h2 className="text-lg font-bold text-slate-900 m-0">Settle Bill</h2>
              </div>
              <button 
                onClick={() => { setActiveModal(null); setAmount(''); setError(null); }}
                className="text-slate-400 hover:text-slate-700 bg-transparent border-none cursor-pointer p-1 rounded-md hover:bg-slate-200 transition-colors"
              >
                <X size={20} />
              </button>
            </div>
            
            <form onSubmit={handleSettleSubmit} className="p-6 pt-4 flex flex-col gap-4 overflow-y-auto max-h-[80vh]">
              {error && (
                <div className="bg-red-50 text-red-600 border border-red-200 p-3 rounded-lg text-sm font-bold flex items-center gap-2">
                  <AlertCircle size={16} />
                  {error}
                </div>
              )}

              <div className="flex flex-col gap-1.5">
                <label className="text-[11px] uppercase tracking-wider font-bold text-slate-500">Select Person</label>
                <select name="accountId" required className="p-2.5 rounded-lg border border-slate-200 bg-white text-slate-900 text-sm outline-none focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500 font-medium">
                  <option value="">Select Mechanic/Staff...</option>
                  {upadAccounts.map(acc => (
                    <option key={acc.id} value={acc.id}>{acc.name} ({acc.type})</option>
                  ))}
                </select>
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-[11px] uppercase tracking-wider font-bold text-slate-500">Pay From (Source Account)</label>
                <select name="sourceAccountId" required className="p-2.5 rounded-lg border border-slate-200 bg-white text-slate-900 text-sm outline-none focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500 font-medium">
                  <option value="">Select Bank or Cash...</option>
                  {ledgerAccounts.map(acc => (
                    <option key={acc.id} value={acc.id}>{acc.name} ({acc.type})</option>
                  ))}
                </select>
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-[11px] uppercase tracking-wider font-bold text-slate-500">Bill Amount (₹)</label>
                <input 
                  type="text" 
                  inputMode="decimal"
                  name="amount" 
                  required 
                  value={amount}
                  onChange={handleAmountChange}
                  placeholder="e.g. 1,500" 
                  className="p-2.5 rounded-lg border border-slate-200 bg-white text-slate-900 text-sm outline-none focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500 font-semibold" 
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-[11px] uppercase tracking-wider font-bold text-slate-500">Date</label>
                <input 
                  type="date" 
                  name="date" 
                  required
                  defaultValue={new Date().toISOString().split('T')[0]}
                  className="p-2.5 rounded-lg border border-slate-200 bg-white text-slate-900 text-sm outline-none focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500 font-medium" 
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-[11px] uppercase tracking-wider font-bold text-slate-500">Description / Note</label>
                <input 
                  type="text" 
                  name="description" 
                  placeholder="e.g. Settling remaining balance for light work" 
                  className="p-2.5 rounded-lg border border-slate-200 bg-white text-slate-900 text-sm outline-none focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500 font-medium" 
                />
              </div>
              <button 
                type="submit" 
                disabled={isSubmitting}
                className="mt-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-2.5 px-4 rounded-lg transition-colors disabled:opacity-70"
              >
                {isSubmitting ? 'Saving...' : 'Settle & Deduct Balance'}
              </button>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
