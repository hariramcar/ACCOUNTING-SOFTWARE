'use client';

import { useState } from 'react';
import { PlusCircle, X } from 'lucide-react';
import { createAccount } from '@/actions/accounts';
import IndianNumberInput from '@/components/IndianNumberInput';

export default function AddAccountModal() {
  const [isOpen, setIsOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [accountType, setAccountType] = useState('CASH');

  const handleSubmit = async (formData) => {
    setIsSubmitting(true);
    await createAccount(formData);
    setIsSubmitting(false);
    setIsOpen(false);
  };

  return (
    <>
      <button 
        onClick={() => setIsOpen(true)}
        className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white py-2.5 px-4 rounded-lg font-bold shadow-sm transition-colors text-sm"
      >
        <PlusCircle size={18} />
        Add New Account
      </button>

      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-sm overflow-hidden flex flex-col animate-in fade-in duration-200">
            <div className="px-6 py-4 border-b border-slate-100 bg-slate-50 flex items-center justify-between">
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
            
            <form action={handleSubmit} className="p-6 flex flex-col gap-4">
              <div className="flex flex-col gap-1.5">
                <label className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Account Name</label>
                <input type="text" name="name" placeholder='e.g. "Main Drawer", "HDFC"' required className="p-2.5 rounded-lg border border-slate-200 bg-white text-slate-900 text-sm outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all font-medium" />
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Account Type</label>
                <select name="type" required value={accountType} onChange={(e) => setAccountType(e.target.value)} className="p-2.5 rounded-lg border border-slate-200 bg-white text-slate-900 text-sm outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all font-medium">
                  <option value="CASH">Cash Drawer</option>
                  <option value="BANK">Bank Account / UPI</option>
                  <option value="DSA_AGENT">Loan Agent</option>
                  <option value="UGHRANI">Market Place</option>
                  <option value="PARTNER">Business Partner</option>
                </select>
              </div>
              
              {['CASH', 'BANK'].includes(accountType) && (
                <div className="flex flex-col gap-1.5 animate-in fade-in slide-in-from-top-2 duration-200">
                  <label className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Opening Balance / Money (₹)</label>
                  <IndianNumberInput name="openingBalance" step="0.01" defaultValue="0" className="p-2.5 rounded-lg border border-slate-200 bg-white text-slate-900 text-sm outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all font-semibold" />
                </div>
              )}
              <div className="pt-2 flex justify-end gap-3 border-t border-slate-100 mt-2">
                <button 
                  type="button" 
                  onClick={() => setIsOpen(false)}
                  className="px-4 py-2.5 rounded-lg font-bold text-slate-600 hover:bg-slate-100 transition-colors text-sm"
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  disabled={isSubmitting}
                  className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-bold text-sm shadow-sm transition-all focus:ring-4 focus:ring-indigo-500/20 disabled:opacity-70"
                >
                  {isSubmitting ? 'Creating...' : 'Create Account'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}

// force reload
