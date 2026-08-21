'use client';
import { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { Pencil, X, AlertCircle } from 'lucide-react';
import { updatePartners } from '@/actions/accounts';
import toast from 'react-hot-toast';

export default function EditPartnersModal({ partners }) {
  const [isOpen, setIsOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [partnersState, setPartnersState] = useState([]);

  useEffect(() => {
    setMounted(true);
    if (partners) {
      setPartnersState(partners.map(p => ({
        id: p.id,
        name: p.name,
        profitShare: p.profitShare
      })));
    }
  }, [partners, isOpen]);

  const handleChange = (id, field, value) => {
    setPartnersState(prev => prev.map(p => p.id === id ? { ...p, [field]: value } : p));
  };

  const isSubmittingRef = useRef(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (isSubmittingRef.current) return;
    isSubmittingRef.current = true;
    
    setIsSubmitting(true);
    setError(null);
    
    // Validation
    const totalPercentage = partnersState.reduce((sum, p) => sum + Number(p.profitShare || 0), 0);
    if (totalPercentage > 100) {
      setError(`Total profit share cannot exceed 100%. Current total: ${totalPercentage}%`);
      setIsSubmitting(false);
      isSubmittingRef.current = false;
      return;
    }

    try {
      const result = await updatePartners(partnersState);
      
      if (result && !result.success) {
        setError(result.error);
      } else {
        toast.success("Partners updated successfully!");
        setIsOpen(false);
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
        className="flex-shrink-0 flex items-center justify-center gap-1.5 bg-white text-indigo-700 hover:bg-indigo-50 py-2 px-3 md:px-4 rounded-lg font-bold shadow-sm transition-colors text-[13px] md:text-sm border border-indigo-200 whitespace-nowrap"
      >
        <Pencil size={16} />
        Edit Partners
      </button>

      {mounted && isOpen && createPortal(
        <div className="fixed inset-0 z-[100] flex flex-col justify-end md:justify-center md:items-center p-0 md:p-4 bg-slate-900/50 backdrop-blur-sm">
          <div className="absolute inset-0" onClick={() => setIsOpen(false)}></div>
          <div className="bg-white rounded-t-3xl md:rounded-2xl shadow-xl w-full max-w-lg overflow-hidden flex flex-col relative z-10 animate-in slide-in-from-bottom-full md:slide-in-from-bottom-4 duration-300">
            <div className="md:hidden flex justify-center pt-4 pb-2 bg-slate-50 shrink-0">
              <div className="w-12 h-1.5 bg-slate-200 rounded-full"></div>
            </div>
            
            <div className="px-5 py-4 border-b border-slate-100 bg-slate-50 flex items-center justify-between sticky top-0 z-10 shrink-0">
              <div className="flex items-center gap-2">
                <Pencil size={18} className="text-indigo-600" />
                <h2 className="text-lg font-bold text-slate-900 m-0">Edit Business Partners</h2>
              </div>
              <button 
                onClick={() => { setIsOpen(false); setError(null); }}
                className="text-slate-400 hover:text-slate-700 bg-transparent border-none cursor-pointer p-1 rounded-md hover:bg-slate-200 transition-colors"
              >
                <X size={20} />
              </button>
            </div>
            
            <form onSubmit={handleSubmit} className="overflow-y-auto p-4 md:p-6 pt-2 md:pt-4 flex flex-col gap-5 max-h-[75vh]">
              {error && (
                <div className="bg-red-50 text-red-600 border border-red-200 p-4 rounded-xl text-sm font-bold flex items-center gap-2 shadow-sm">
                  <AlertCircle size={18} />
                  {error}
                </div>
              )}

              <div className="flex flex-col gap-3">
                {partnersState.map(partner => (
                  <div key={partner.id} className="bg-slate-50/50 p-4 rounded-xl border border-slate-200 flex flex-col md:flex-row gap-3 items-start md:items-center">
                    <div className="w-full md:flex-1">
                       <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1 block">Partner Name</label>
                       <input 
                         type="text" 
                         required
                         value={partner.name}
                         onChange={(e) => handleChange(partner.id, 'name', e.target.value)}
                         className="w-full p-2.5 rounded-lg border border-slate-300 bg-white shadow-inner text-sm font-bold outline-none focus:ring-2 focus:ring-indigo-500 text-slate-900" 
                       />
                    </div>
                    <div className="w-full md:w-32">
                       <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1 block">Profit Share (%)</label>
                       <div className="relative">
                         <input 
                           type="number" 
                           required
                           min="0"
                           max="100"
                           step="0.01"
                           value={partner.profitShare}
                           onChange={(e) => handleChange(partner.id, 'profitShare', e.target.value)}
                           className="w-full p-2.5 rounded-lg border border-slate-300 bg-white shadow-inner text-sm font-bold outline-none focus:ring-2 focus:ring-indigo-500 text-slate-900 pr-8" 
                         />
                         <div className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 font-bold">%</div>
                       </div>
                    </div>
                  </div>
                ))}
                {partnersState.length === 0 && (
                   <p className="text-sm text-slate-500 italic text-center py-4">No business partners found. Please add them from the Accounts page first.</p>
                )}
              </div>

              <div className="flex justify-between items-center px-2 pt-2 border-t border-slate-100">
                 <div className="text-xs font-bold text-slate-500">
                    Total Share: <span className={`text-sm ${partnersState.reduce((sum, p) => sum + Number(p.profitShare || 0), 0) > 100 ? 'text-red-600' : 'text-emerald-600'}`}>{partnersState.reduce((sum, p) => sum + Number(p.profitShare || 0), 0)}%</span>
                 </div>
              </div>

              <div className="pt-2 flex justify-end gap-3 mt-2 shrink-0">
                <button 
                  type="button" 
                  onClick={() => setIsOpen(false)}
                  className="px-5 py-3 rounded-xl font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 transition-colors"
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  disabled={isSubmitting || partnersState.length === 0}
                  className="px-6 py-3 rounded-xl font-bold text-white bg-indigo-600 hover:bg-indigo-700 transition-all shadow-md disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
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
