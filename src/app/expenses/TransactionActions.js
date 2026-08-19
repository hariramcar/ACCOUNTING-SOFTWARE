'use client';

import { useState, useRef } from 'react';
import { Pencil, Trash2, X } from 'lucide-react';
import toast from 'react-hot-toast';

export default function TransactionActions({ expense, deleteExpenseAction, updateExpenseAction, isRawTx, hideDelete = false, accounts = [], vehicles = [] }) {
  const [isDeleting, setIsDeleting] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  
  const getLocalDateString = (dateObj) => {
    if (!dateObj) return '';
    const d = new Date(dateObj);
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const handleAmountFormat = (val) => {
    if (val === null || val === undefined) return '';
    const rawValue = String(val).replace(/[^0-9.]/g, '');
    if (!rawValue) return '';
    const parts = rawValue.split('.');
    parts[0] = Number(parts[0]).toLocaleString('en-IN');
    return parts.join('.');
  };

  let initialAccountId = expense.accountId || '';
  let isSplitPayment = false;
  
  if (!isRawTx && expense.requestedMode && typeof expense.requestedMode === 'string' && expense.requestedMode.startsWith('{')) {
    try {
      const parsed = JSON.parse(expense.requestedMode);
      if (parsed.payments && Array.isArray(parsed.payments)) {
        if (parsed.payments.length > 1) {
          isSplitPayment = true;
        } else if (parsed.payments.length === 1) {
          initialAccountId = parsed.payments[0].accountId || '';
        }
      }
    } catch(e) {}
  }

  const [editData, setEditData] = useState({
    description: expense.description,
    amount: handleAmountFormat(expense.amount),
    date: getLocalDateString(expense.date),
    accountId: initialAccountId,
    vehicleId: expense.vehicle?.id || expense.referenceId || '',
    customerName: expense.customerName || '',
    customerMobile: expense.customerMobile || ''
  });

  const isSubmittingRef = useRef(false);

  const isIncome = expense.expenseType === 'INCOME';
  const isOffice = expense.expenseType === 'OFFICE_EXPENSE';
  const isTransfer = expense.isTransfer;
  
  let themeName = 'indigo';
  let title = 'Edit Car Expense';
  if (isIncome) {
    themeName = 'emerald';
    title = 'Edit Income';
  } else if (isOffice) {
    themeName = 'red';
    title = 'Edit Office Expense';
  } else if (isTransfer) {
    themeName = 'blue';
    title = 'Edit Transfer';
  }

  const theme = {
    emerald: {
      text: 'text-emerald-700',
      border: 'border-emerald-200',
      focusBorder: 'focus:border-emerald-500',
      focusRing: 'focus:ring-emerald-500',
      focusRingLight: 'focus:ring-emerald-500/20',
      bgBtn: 'bg-emerald-600 hover:bg-emerald-700',
    },
    red: {
      text: 'text-red-700',
      border: 'border-red-200',
      focusBorder: 'focus:border-red-500',
      focusRing: 'focus:ring-red-500',
      focusRingLight: 'focus:ring-red-500/20',
      bgBtn: 'bg-red-600 hover:bg-red-700',
    },
    blue: {
      text: 'text-blue-700',
      border: 'border-blue-200',
      focusBorder: 'focus:border-blue-500',
      focusRing: 'focus:ring-blue-500',
      focusRingLight: 'focus:ring-blue-500/20',
      bgBtn: 'bg-blue-600 hover:bg-blue-700',
    },
    indigo: {
      text: 'text-indigo-700',
      border: 'border-indigo-200',
      focusBorder: 'focus:border-indigo-500',
      focusRing: 'focus:ring-indigo-500',
      focusRingLight: 'focus:ring-indigo-500/20',
      bgBtn: 'bg-indigo-600 hover:bg-indigo-700',
    },
  }[themeName];


  const handleDelete = async () => {
    const confirmText = prompt(`Are you sure you want to delete this ${expense.amount}? This will affect your bank balance! Type "DELETE" to confirm:`);
    if (confirmText !== 'DELETE') {
      toast.error('Deletion cancelled. You must type DELETE precisely.');
      return;
    }
    
    if (isSubmittingRef.current) return;
    isSubmittingRef.current = true;
    setIsDeleting(true);
    const res = await deleteExpenseAction(expense.id, isRawTx);
    if (!res?.success) {
      toast.error(res?.error || 'Failed to delete');
    } else {
      toast.success('Successfully deleted!');
    }
    setIsDeleting(false);
    isSubmittingRef.current = false;
  };

  const handleEditClick = () => {
    if (isSplitPayment) {
      toast.error('Transactions with split payment sources cannot be edited directly yet. Please delete and re-create it.');
      return;
    }
    if (confirm('WARNING: Editing a transaction is a very powerful action that can alter your ledger and balances across the software. Are you sure you want to edit this?')) {
      setIsEditing(true);
    }
  };

  const handleEdit = async (e) => {
    e.preventDefault();
    if (isSubmittingRef.current) return;
    isSubmittingRef.current = true;
    setIsDeleting(true); // Reusing this for loading state
    
    try {
      const res = await updateExpenseAction(expense.id, editData, isRawTx);
      if (res?.success) {
        toast.success('Successfully updated!');
        setIsEditing(false);
      } else {
        toast.error(res?.error || 'Failed to update');
      }
    } finally {
      isSubmittingRef.current = false;
      setIsDeleting(false);
    }
  };

  return (
    <>
      <div className="flex items-center gap-1.5 opacity-100 md:opacity-50 md:group-hover:opacity-100 transition-all duration-300">
        <button 
          onClick={handleEditClick}
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
              <h3 className="font-bold text-slate-800 m-0">{title}</h3>
              <button onClick={() => setIsEditing(false)} className="text-slate-400 hover:text-slate-600 bg-white rounded-full p-1 border shadow-sm">
                <X size={18} />
              </button>
            </div>
            
            <form onSubmit={handleEdit} className="p-6 pt-4 flex flex-col gap-4 overflow-y-auto max-h-[80vh]">
              
              <div className="flex flex-col md:flex-row gap-4 items-start mb-2">
                <div className="flex-1 w-full">
                  <label className={`text-xs uppercase font-bold ${theme.text} mb-1.5 block tracking-wider`}>Description</label>
                  <input 
                    type="text" 
                    value={editData.description}
                    onChange={e => setEditData({...editData, description: e.target.value})}
                    required 
                    className={`w-full p-2.5 rounded-lg border ${theme.border} bg-white text-sm font-medium outline-none ${theme.focusBorder} focus:ring-1 ${theme.focusRing} transition-all shadow-sm`}
                  />
                </div>
              </div>

              <div className="flex flex-col md:flex-row gap-4 items-start mb-2">
                <div className="flex-1 w-full">
                  <label className={`text-xs uppercase font-bold ${theme.text} mb-1.5 block tracking-wider`}>Amount (₹)</label>
                  <input 
                    type="text" 
                    inputMode="decimal"
                    value={editData.amount}
                    onChange={e => setEditData({...editData, amount: handleAmountFormat(e.target.value)})}
                    required 
                    className={`w-full p-2.5 rounded-lg border ${theme.border} bg-white text-sm font-bold outline-none ${theme.focusBorder} focus:ring-1 ${theme.focusRing} transition-all shadow-sm`}
                  />
                </div>
                
                <div className="flex-1 w-full">
                  <label className={`text-xs uppercase font-bold ${theme.text} mb-1.5 block tracking-wider`}>Date</label>
                  <input 
                    type="date" 
                    value={editData.date}
                    onChange={e => setEditData({...editData, date: e.target.value})}
                    required 
                    className={`w-full p-2.5 rounded-lg border ${theme.border} bg-white text-sm font-medium outline-none ${theme.focusBorder} focus:ring-1 ${theme.focusRing} text-slate-700 transition-all shadow-sm`}
                  />
                </div>
              </div>
              
              {(isIncome || themeName === 'indigo') && vehicles.length > 0 && (
                <div className="flex flex-col md:flex-row gap-4 items-start mb-2">
                  <div className="flex-1 w-full">
                    <label className={`text-xs uppercase font-bold ${theme.text} mb-1.5 block tracking-wider`}>Select Vehicle</label>
                    <select
                      value={editData.vehicleId}
                      onChange={e => setEditData({...editData, vehicleId: e.target.value})}
                      className={`w-full p-2.5 rounded-lg border ${theme.border} bg-white text-sm font-medium outline-none ${theme.focusBorder} focus:ring-1 ${theme.focusRing} text-slate-700 transition-all shadow-sm`}
                    >
                      <option value="">-- No Specific Vehicle --</option>
                      {vehicles.filter(v => v.status !== 'SOLD').map(v => (
                        <option key={v.id} value={v.id}>
                          {v.make} {v.model} {v.registration ? `(${v.registration})` : ''}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              )}

              {isIncome && editData.vehicleId && (
                <div className="flex flex-col md:flex-row gap-4 items-start mb-2">
                  <div className="flex-1 w-full">
                    <label className={`text-xs uppercase font-bold ${theme.text} mb-1.5 block tracking-wider`}>Customer Name</label>
                    <input 
                      type="text" 
                      value={editData.customerName}
                      onChange={e => setEditData({...editData, customerName: e.target.value})}
                      placeholder="Name..."
                      required 
                      className={`w-full p-2.5 rounded-lg border ${theme.border} bg-white text-sm font-medium outline-none ${theme.focusBorder} focus:ring-1 ${theme.focusRing} text-slate-700 transition-all shadow-sm`}
                    />
                  </div>
                  <div className="flex-1 w-full">
                    <label className={`text-xs uppercase font-bold ${theme.text} mb-1.5 block tracking-wider`}>Customer Mobile</label>
                    <input 
                      type="tel" 
                      value={editData.customerMobile}
                      onChange={e => setEditData({...editData, customerMobile: e.target.value})}
                      placeholder="Optional"
                      className={`w-full p-2.5 rounded-lg border ${theme.border} bg-white text-sm font-medium outline-none ${theme.focusBorder} focus:ring-1 ${theme.focusRing} text-slate-700 transition-all shadow-sm`}
                    />
                  </div>
                </div>
              )}

              {editData.accountId && accounts.length > 0 && (
                <div className="flex flex-col md:flex-row gap-4 items-start mb-2">
                  <div className="flex-1 w-full">
                    <label className={`text-xs uppercase font-bold ${theme.text} mb-1.5 block tracking-wider`}>Payment Source</label>
                    <select
                      value={editData.accountId}
                      onChange={e => setEditData({...editData, accountId: e.target.value})}
                      required
                      className={`w-full p-2.5 rounded-lg border ${theme.border} bg-white text-sm font-medium outline-none ${theme.focusBorder} focus:ring-1 ${theme.focusRing} text-slate-700 transition-all shadow-sm`}
                    >
                      <option value="">Select Account</option>
                      {accounts.filter(a => a.type === 'CASH' || a.type === 'BANK' || a.id === editData.accountId).map(acc => (
                        <option key={acc.id} value={acc.id}>{acc.name} {acc.type === 'UGHRANI' ? '(MARKET PLACE)' : `(${acc.type})`}</option>
                      ))}
                    </select>
                  </div>
                </div>
              )}

              <button type="submit" disabled={isDeleting} className={`mt-2 w-full p-3 rounded-lg font-bold border-none cursor-pointer text-white text-sm transition-all shadow-sm flex items-center justify-center gap-2 focus:ring-4 ${theme.bgBtn} ${theme.focusRingLight} disabled:opacity-50`}>
                {isDeleting ? 'Saving...' : 'Save Changes'}
              </button>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
