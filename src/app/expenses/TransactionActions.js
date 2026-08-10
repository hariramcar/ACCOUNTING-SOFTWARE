'use client';

import { useState } from 'react';
import { Pencil, Trash2, X } from 'lucide-react';

export default function TransactionActions({ expense, deleteExpenseAction, updateExpenseAction, isRawTx, hideDelete = false }) {
  const [isDeleting, setIsDeleting] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  
  const [editData, setEditData] = useState({
    description: expense.description,
    amount: expense.amount,
    date: expense.date ? new Date(expense.date).toISOString().split('T')[0] : ''
  });

  const handleDelete = async () => {
    if (confirm('Are you sure you want to delete this transaction? This will refund any cash deducted in the ledger.')) {
      setIsDeleting(true);
      await deleteExpenseAction(expense.id, isRawTx);
      setIsDeleting(false);
    }
  };

  const handleEdit = async (e) => {
    e.preventDefault();
    setIsDeleting(true); // Reusing this for loading state
    await updateExpenseAction(expense.id, editData, isRawTx);
    setIsDeleting(false);
    setIsEditing(false);
  };

  return (
    <>
      <div className="flex items-center gap-1.5 opacity-100 md:opacity-50 md:group-hover:opacity-100 transition-all duration-300">
        <button 
          onClick={() => setIsEditing(true)}
          disabled={isDeleting}
          className="flex items-center justify-center w-8 h-8 rounded-full bg-slate-50 border border-slate-200 text-slate-500 hover:bg-indigo-50 hover:text-indigo-600 hover:border-indigo-200 hover:shadow-sm transition-all focus:ring-2 focus:ring-indigo-100 outline-none"
          title="Edit Transaction"
        >
          <Pencil size={13} className="shrink-0" />
        </button>
        {!hideDelete && (
          <button 
            onClick={handleDelete}
            disabled={isDeleting}
            className="flex items-center justify-center w-8 h-8 rounded-full bg-slate-50 border border-slate-200 text-slate-500 hover:bg-red-500 hover:text-white hover:border-red-600 hover:shadow-md transition-all focus:ring-2 focus:ring-red-100 outline-none"
            title="Delete Transaction"
          >
            <Trash2 size={13} className="shrink-0" />
          </button>
        )}
      </div>

      {isEditing && (
        <div className="fixed inset-0 bg-slate-900/50 flex flex-col justify-end md:justify-center md:items-center p-0 md:p-4 z-50 backdrop-blur-sm">
          <div className="absolute inset-0" onClick={() => setIsEditing(false)}></div>
          <div className="bg-white rounded-t-3xl md:rounded-2xl w-full max-w-md overflow-hidden shadow-2xl relative z-10 animate-in slide-in-from-bottom-full md:slide-in-from-bottom-4 duration-300">
            {/* Mobile Drag Handle */}
            <div className="md:hidden flex justify-center pt-4 pb-2 bg-slate-50">
              <div className="w-12 h-1.5 bg-slate-200 rounded-full"></div>
            </div>
            
            <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50 sticky top-0 z-10">
              <h3 className="font-bold text-slate-800 m-0">Edit Transaction</h3>
              <button onClick={() => setIsEditing(false)} className="text-slate-400 hover:text-slate-600 bg-white rounded-full p-1 border shadow-sm">
                <X size={18} />
              </button>
            </div>
            
            <form onSubmit={handleEdit} className="p-6 pt-4 flex flex-col gap-4 overflow-y-auto max-h-[80vh]">
              <div className="flex flex-col gap-1.5">
                <label className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Description</label>
                <input 
                  type="text" 
                  value={editData.description}
                  onChange={e => setEditData({...editData, description: e.target.value})}
                  required 
                  className="p-2.5 rounded-lg border border-slate-200 bg-white text-slate-900 outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all text-sm font-medium" 
                />
              </div>

              <div className="flex gap-4">
                <div className="flex flex-col gap-1.5 flex-1">
                  <label className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Amount (₹)</label>
                  <input 
                    type="number" 
                    step="0.01"
                    value={editData.amount}
                    onChange={e => setEditData({...editData, amount: e.target.value})}
                    required 
                    className="p-2.5 rounded-lg border border-slate-200 bg-white text-slate-900 outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all text-sm font-bold" 
                  />
                </div>
                
                <div className="flex flex-col gap-1.5 flex-1">
                  <label className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Date</label>
                  <input 
                    type="date" 
                    value={editData.date}
                    onChange={e => setEditData({...editData, date: e.target.value})}
                    required 
                    className="p-2.5 rounded-lg border border-slate-200 bg-white text-slate-900 outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all text-sm font-medium" 
                  />
                </div>
              </div>

              <button type="submit" disabled={isDeleting} className="mt-4 w-full p-3 rounded-lg font-bold border-none cursor-pointer text-white text-sm transition-all shadow-sm flex items-center justify-center gap-2 focus:ring-4 bg-indigo-600 hover:bg-indigo-700 focus:ring-indigo-500/20 disabled:opacity-50">
                {isDeleting ? 'Saving...' : 'Save Changes'}
              </button>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
