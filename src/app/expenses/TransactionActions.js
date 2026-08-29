'use client';

import { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Pencil, Trash2, X, AlertTriangle } from 'lucide-react';
import toast from 'react-hot-toast';
import VehicleSearchSelect from '@/components/VehicleSearchSelect';

export default function TransactionActions({ expense, deleteExpenseAction, updateExpenseAction, isRawTx, hideDelete = false, accounts = [], vehicles = [] }) {
  const [isDeleting, setIsDeleting] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [warningType, setWarningType] = useState(null);
  const [deleteConfirmText, setDeleteConfirmText] = useState('');
  const [mounted, setMounted] = useState(false);
  
  useEffect(() => setMounted(true), []);
  
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


  const handleDeleteClick = () => {
    setWarningType('delete');
    setDeleteConfirmText('');
  };

  const handleConfirmDelete = async () => {
    if (deleteConfirmText !== 'DELETE') return;
    setWarningType(null);
    
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

  const getImpactAnalysis = () => {
    const impacts = [];
    
    // 1. Vehicle Impact
    if (expense.vehicle) {
      const reg = expense.vehicle.registration || 'UNREG';
      impacts.push(`Vehicle Khata in ${expense.vehicle.make} ${expense.vehicle.model} ${reg} will be recalculated.`);
    }

    // 2. Global Profit / Ledger History
    if (isIncome) {
       impacts.push(`Ledger History in income side will be adjusted.`);
    } else if (isOffice || expense.vehicle) {
       impacts.push(`Ledger History in expense side will be adjusted.`);
    } else {
       impacts.push(`Global Ledger History will be adjusted.`);
    }
    
    // 3. Account Impact
    const acc = accounts.find(a => a.id === initialAccountId);
    if (acc) {
      impacts.push(`Master Capital Dashboard in ${acc.name} will be updated.`);
    } else if (!isRawTx && expense.requestedMode === 'UGHRANI') {
       impacts.push(`Master Capital Dashboard in Market Place / Vendor will be updated.`);
    }

    // 4. Transfer Specific
    if (isTransfer) {
      impacts.push(`Both the Sending and Receiving Master Capital Dashboards will be simultaneously altered.`);
    }

    if (impacts.length === 0) {
      impacts.push(`Ledger accounts connected to this transaction will be updated.`);
    }

    return impacts;
  };

  const handleEditClick = () => {
    if (isSplitPayment) {
      toast.error('Transactions with split payment sources cannot be edited directly yet. Please delete and re-create it.');
      return;
    }
    setWarningType('edit');
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
            onClick={handleDeleteClick}
            disabled={isDeleting}
            className="flex items-center justify-center w-8 h-8 rounded-full bg-slate-50 border border-slate-200 text-slate-500 hover:bg-red-500 hover:text-white hover:border-red-600 hover:shadow-md transition-all focus:ring-2 focus:ring-red-100 outline-none"
            title="Delete Transaction"
          >
            <Trash2 size={13} className="shrink-0" />
          </button>
        )}
      </div>

      {warningType && mounted && createPortal(
        <div className="fixed inset-0 bg-slate-900/60 flex flex-col justify-center items-center p-4 z-[9999] backdrop-blur-sm">
          <div className="absolute inset-0" onClick={() => { setWarningType(null); setDeleteConfirmText(''); }}></div>
          <div className="bg-white rounded-2xl w-full max-w-md overflow-hidden shadow-2xl relative z-[10000] animate-in zoom-in-95 duration-200 border border-amber-200">
            <div className={`${warningType === 'edit' ? 'bg-amber-50 border-amber-100' : 'bg-red-50 border-red-100'} p-5 border-b flex items-start gap-4`}>
              <div className={`${warningType === 'edit' ? 'bg-amber-100 text-amber-600' : 'bg-red-100 text-red-600'} p-2.5 rounded-full shrink-0`}>
                <AlertTriangle size={24} />
              </div>
              <div>
                <h3 className={`font-black text-lg m-0 mb-1 leading-tight ${warningType === 'edit' ? 'text-amber-900' : 'text-red-900'}`}>
                  {warningType === 'edit' ? 'Critical Ledger Edit Warning' : 'Critical Deletion Impact Warning'}
                </h3>
                <p className={`text-xs font-bold leading-relaxed m-0 ${warningType === 'edit' ? 'text-amber-700/80' : 'text-red-700/80'}`}>
                  {warningType === 'edit' 
                    ? 'Editing a transaction alters your accounting data globally. Proceeding will trigger cascading updates across your system.' 
                    : 'Deleting a transaction permanently removes it and reverses its effects globally. Proceeding will trigger cascading updates across your system.'}
                </p>
              </div>
            </div>
            
            <div className="p-5 bg-white">
              <p className="text-xs uppercase tracking-widest font-black text-slate-400 mb-3">Predicted System Impact:</p>
              <ul className="space-y-3 mb-6">
                {getImpactAnalysis().map((impact, idx) => (
                  <li key={idx} className="flex items-start gap-2 text-sm font-bold text-slate-700">
                    <span className={`w-1.5 h-1.5 rounded-full shrink-0 mt-1.5 ${warningType === 'edit' ? 'bg-amber-500' : 'bg-red-500'}`}></span>
                    <span>{impact}</span>
                  </li>
                ))}
              </ul>
              
              {warningType === 'edit' ? (
                <div className="flex gap-3">
                  <button 
                    onClick={() => { setWarningType(null); setIsEditing(true); }}
                    className="flex-1 bg-amber-500 hover:bg-amber-600 text-white font-black py-3 rounded-lg text-sm transition-all shadow-lg shadow-amber-500/20 active:scale-[0.98]"
                  >
                    I Understand, Edit Anyhow
                  </button>
                  <button 
                    onClick={() => { setWarningType(null); setDeleteConfirmText(''); }}
                    className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold py-3 rounded-lg text-sm transition-all active:scale-[0.98]"
                  >
                    Cancel
                  </button>
                </div>
              ) : (
                <div className="flex flex-col gap-3">
                  <input 
                    type="text" 
                    placeholder='Type "DELETE" to confirm' 
                    value={deleteConfirmText}
                    onChange={e => setDeleteConfirmText(e.target.value)}
                    className="w-full p-3 rounded-lg border border-red-200 text-center font-bold outline-none focus:border-red-500 focus:ring-2 focus:ring-red-100 bg-slate-50"
                  />
                  <div className="flex gap-3">
                    <button 
                      onClick={handleConfirmDelete}
                      disabled={deleteConfirmText !== 'DELETE' || isDeleting}
                      className="flex-1 bg-red-600 hover:bg-red-700 disabled:bg-slate-300 disabled:text-slate-500 disabled:shadow-none text-white font-black py-3 rounded-lg text-sm transition-all shadow-lg shadow-red-500/20 active:scale-[0.98]"
                    >
                      {isDeleting ? 'Deleting...' : 'PERMANENTLY DELETE'}
                    </button>
                    <button 
                      onClick={() => { setWarningType(null); setDeleteConfirmText(''); }}
                      className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold py-3 rounded-lg text-sm transition-all active:scale-[0.98]"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>,
        document.body
      )}

      {isEditing && mounted && createPortal(
        <div className="fixed inset-0 bg-slate-900/50 flex flex-col justify-end md:justify-center md:items-center p-0 md:p-4 z-[9999] backdrop-blur-sm">
          <div className="absolute inset-0" onClick={() => setIsEditing(false)}></div>
          <div className="bg-white rounded-t-3xl md:rounded-2xl w-full max-w-md overflow-hidden shadow-2xl relative z-[10000] animate-in slide-in-from-bottom-full md:slide-in-from-bottom-4 duration-300">
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
                    <VehicleSearchSelect
                      vehicles={vehicles.filter(v => v.status !== 'SOLD')}
                      value={editData.vehicleId}
                      onChange={id => setEditData({...editData, vehicleId: id})}
                      placeholder="-- No Specific Vehicle --"
                      className={`w-full p-2.5 rounded-lg border ${theme.border} bg-white text-sm font-medium outline-none ${theme.focusBorder} focus-within:ring-1 ${theme.focusRing} text-slate-700 transition-all shadow-sm`}
                      showCost={false}
                    />
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
      , document.body)}
    </>
  );
}
