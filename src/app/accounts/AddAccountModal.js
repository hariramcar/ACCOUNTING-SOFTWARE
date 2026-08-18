'use client';

import { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { PlusCircle, X } from 'lucide-react';
import { createAccount } from '@/actions/accounts';
import IndianNumberInput from '@/components/IndianNumberInput';

export default function AddAccountModal() {
  const [isOpen, setIsOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [accountType, setAccountType] = useState('CASH');
  const [mounted, setMounted] = useState(false);
  
  const handleAmountFormat = (val) => {
    const rawValue = val.replace(/[^0-9.]/g, '');
    if (!rawValue) return '';
    const parts = rawValue.split('.');
    parts[0] = Number(parts[0]).toLocaleString('en-IN');
    return parts.join('.');
  };

  const isSubmittingRef = useRef(false);

  useEffect(() => setMounted(true), []);

  const handleSubmit = async (formData) => {
    if (isSubmittingRef.current) return;
    isSubmittingRef.current = true;
    setIsSubmitting(true);
    try {
      await createAccount(formData);
      setIsOpen(false);
    } finally {
      isSubmittingRef.current = false;
      setIsSubmitting(false);
    }
  };

  return (
    <>
      <button 
        onClick={() => setIsOpen(true)}
        className="flex-shrink-0 flex items-center justify-center gap-1.5 bg-indigo-600 hover:bg-indigo-700 text-white py-2 md:py-2.5 px-3 md:px-4 rounded-lg font-bold shadow-sm transition-colors text-[13px] md:text-sm whitespace-nowrap"
      >
        <PlusCircle size={16} />
        Add New Account
      </button>

      {isOpen && mounted && createPortal(
        <div className="fixed inset-0 z-[100] flex flex-col justify-end md:justify-center md:items-center p-0 md:p-4 bg-slate-900/50 backdrop-blur-sm">
          <div className="bg-white rounded-t-3xl md:rounded-xl shadow-xl w-full max-w-sm h-[85vh] md:h-auto md:max-h-[85vh] overflow-hidden flex flex-col relative z-10 animate-in slide-in-from-bottom-full md:zoom-in-95 duration-200">
            {/* Mobile Drag Handle */}
            <div className="md:hidden flex justify-center pt-4 pb-2 bg-slate-50 shrink-0">
              <div className="w-12 h-1.5 bg-slate-200 rounded-full"></div>
            </div>
            <div className="px-6 py-4 border-b border-slate-100 bg-slate-50 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2">
                <PlusCircle size={18} className="text-indigo-600" />
                <h2 className="text-lg font-bold text-slate-900 m-0">Add New Account</h2>
              </div>
              <button 
                onClick={() => setIsOpen(false)}
                className="text-slate-400 hover:text-slate-700 bg-transparent border-none cursor-pointer p-1 rounded-md hover:bg-slate-200 transition-colors"
              >
                <X size={20} />
              </button>
            </div>
            
            <form action={handleSubmit} className="overflow-y-auto p-4 md:p-6 pt-2 md:pt-4 flex flex-col gap-5">
              
              <div className="bg-slate-50/50 p-4 rounded-2xl border border-slate-100 flex flex-col gap-4">
                <div>
                  <label className="text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1.5 block">Account Name</label>
                  <input type="text" name="name" placeholder='e.g. "Main Drawer", "HDFC"' required className="w-full p-4 rounded-xl border border-transparent bg-slate-100 shadow-inner text-slate-900 text-[15px] font-bold outline-none focus:ring-4 focus:ring-indigo-500/15 focus:border-indigo-500 focus:bg-white transition-all" />
                </div>
                <div>
                  <label className="text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1.5 block">Account Type</label>
                  <select name="type" required value={accountType} onChange={(e) => setAccountType(e.target.value)} className="w-full p-4 rounded-xl border border-transparent bg-slate-100 shadow-inner text-slate-900 text-[15px] font-bold outline-none focus:ring-4 focus:ring-indigo-500/15 focus:border-indigo-500 focus:bg-white transition-all cursor-pointer">
                    <option value="CASH">Cash Drawer</option>
                    <option value="BANK">Bank Account / UPI</option>
                    <option value="DSA_AGENT">Loan Agent</option>
                    <option value="UGHRANI">Market Place</option>
                    <option value="PARTNER">Business Partner</option>
                    <option value="UCHAK">Uchak (Temporary)</option>
                  </select>
                </div>
                
                {['CASH', 'BANK'].includes(accountType) && (
                  <div className="animate-in fade-in slide-in-from-top-2 duration-200">
                    <label className="text-[11px] font-bold uppercase tracking-wider text-indigo-700 mb-1.5 block">Opening Balance / Money (₹)</label>
                    <IndianNumberInput name="openingBalance" step="0.01" defaultValue="0" className="w-full p-4 rounded-xl border border-indigo-100 bg-white shadow-[0_2px_10px_-4px_rgba(79,70,229,0.15)] text-indigo-950 text-[16px] font-black outline-none focus:ring-4 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all placeholder:text-indigo-200" />
                  </div>
                )}
              </div>
              
              <div className="flex flex-col sm:flex-row justify-end gap-3 pt-2">
                <button 
                  type="button" 
                  onClick={() => setIsOpen(false)}
                  className="w-full sm:w-auto px-6 py-4 rounded-xl font-bold text-slate-600 hover:bg-slate-100 transition-colors text-[15px]"
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  disabled={isSubmitting}
                  className="w-full sm:w-auto flex-1 bg-indigo-600 hover:bg-indigo-700 text-white font-black text-[15px] py-4 px-6 rounded-xl shadow-[0_8px_20px_-8px_rgba(79,70,229,0.5)] transition-all focus:ring-4 focus:ring-indigo-500/20 disabled:opacity-70"
                >
                  {isSubmitting ? 'Saving...' : 'Add Account'}
                </button>
              </div>
            </form>
          </div>
        </div>,
        document.body
      )}
    </>
  );
}

// force reload
