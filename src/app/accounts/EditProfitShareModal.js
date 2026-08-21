'use client';

import { useState, useRef } from 'react';
import { createPortal } from 'react-dom';
import { Edit2, X, AlertCircle } from 'lucide-react';
import { editProfitShare } from '@/actions/accounts';
import toast from 'react-hot-toast';

export default function EditProfitShareModal({ accountId, currentShare, accountName }) {
  const [isOpen, setIsOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [share, setShare] = useState(currentShare || 0);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (isSubmitting) return;
    
    const parsedShare = parseFloat(share);
    if (isNaN(parsedShare) || parsedShare < 0 || parsedShare > 100) {
      toast.error('Please enter a valid percentage between 0 and 100');
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await editProfitShare(accountId, parsedShare);
      if (res?.success) {
        toast.success(`Updated ${accountName}'s profit share to ${parsedShare}%`);
        setIsOpen(false);
      } else {
        toast.error(res?.error || 'Failed to update profit share');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      <button 
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          setIsOpen(true);
        }}
        className="text-teal-600 hover:text-teal-800 bg-teal-50 hover:bg-teal-100 p-1.5 rounded-md transition-colors flex items-center gap-1 border border-teal-200 shadow-sm"
        title="Edit Firm Profit Share"
      >
        <Edit2 size={14} />
        <span className="text-[10px] font-bold uppercase tracking-wider">{currentShare}% Firm Stake</span>
      </button>

      {isOpen && createPortal(
        <div className="fixed inset-0 z-[100] flex flex-col justify-end md:justify-center md:items-center p-0 md:p-4 bg-slate-900/50 backdrop-blur-sm">
          <div className="bg-white rounded-t-3xl md:rounded-xl shadow-xl w-full max-w-sm overflow-hidden flex flex-col relative z-10 animate-in slide-in-from-bottom-full md:zoom-in-95 duration-200">
            <div className="px-6 py-4 border-b border-slate-100 bg-slate-50 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Edit2 size={18} className="text-teal-600" />
                <h2 className="text-lg font-bold text-slate-900 m-0">Edit Firm Profit Share</h2>
              </div>
              <button 
                onClick={() => setIsOpen(false)}
                className="text-slate-400 hover:text-slate-700 bg-transparent border-none cursor-pointer p-1 rounded-md hover:bg-slate-200 transition-colors"
              >
                <X size={20} />
              </button>
            </div>
            
            <form onSubmit={handleSubmit} className="p-4 md:p-6 flex flex-col gap-5">
              <div className="bg-amber-50 p-3 rounded-lg border border-amber-200 flex items-start gap-2 text-amber-800">
                <AlertCircle size={16} className="shrink-0 mt-0.5" />
                <p className="text-xs font-medium m-0 leading-tight">
                  Editing <strong>{accountName}</strong>. The total firm profit share across all partners must not exceed 100%. 
                  Set to 0% if they are only a Car Partner.
                </p>
              </div>

              <div>
                <label className="text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1.5 block">Firm Profit Share (%)</label>
                <input 
                  type="number" 
                  step="0.01" 
                  min="0" 
                  max="100" 
                  value={share}
                  onChange={(e) => setShare(e.target.value)}
                  required 
                  className="w-full p-4 rounded-xl border border-transparent bg-slate-100 shadow-inner text-slate-900 text-[18px] font-black outline-none focus:ring-4 focus:ring-teal-500/15 focus:border-teal-500 focus:bg-white transition-all" 
                />
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
                  className="w-full sm:w-auto flex-1 bg-teal-600 hover:bg-teal-700 text-white font-black text-[15px] py-4 px-6 rounded-xl shadow-[0_8px_20px_-8px_rgba(20,184,166,0.5)] transition-all focus:ring-4 focus:ring-teal-500/20 disabled:opacity-70"
                >
                  {isSubmitting ? 'Saving...' : 'Save Changes'}
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
