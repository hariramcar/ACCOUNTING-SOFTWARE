'use client';

import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Bell, CheckCircle, XCircle, X, Building2, Car } from 'lucide-react';
import { approveExpense, rejectExpense } from '@/actions/expenses';

export default function PendingApprovalsModal({ pendingExpenses }) {
  const [isOpen, setIsOpen] = useState(false);
  const [processingId, setProcessingId] = useState(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const pendingCount = pendingExpenses?.length || 0;

  const handleAction = async (expenseId, actionType) => {
    setProcessingId(expenseId);
    const formData = new FormData();
    formData.append('expenseId', expenseId);

    if (actionType === 'APPROVE') {
      await approveExpense(formData);
    } else {
      await rejectExpense(formData);
    }
    setProcessingId(null);
  };

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className="relative p-2 rounded-full hover:bg-slate-100 transition-colors text-slate-600"
      >
        <Bell size={24} />
        {pendingCount > 0 && (
          <span className="absolute top-0 right-0 transform translate-x-1/4 -translate-y-1/4 bg-red-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full border-2 border-white shadow-sm">
            {pendingCount}
          </span>
        )}
      </button>

      {mounted && isOpen && createPortal(
        <div className="fixed inset-0 z-[100] flex flex-col justify-end md:flex-row md:justify-end bg-slate-900/40 backdrop-blur-sm">
          <div className="absolute inset-0" onClick={() => setIsOpen(false)}></div>
          <div className="w-full h-[85dvh] md:h-full md:max-w-md bg-white shadow-2xl flex flex-col relative z-10 animate-in slide-in-from-bottom-full md:slide-in-from-right duration-300 rounded-t-3xl md:rounded-none">
            {/* Mobile Drag Handle */}
            <div className="md:hidden flex justify-center pt-4 pb-2 bg-slate-50 rounded-t-3xl border-b border-slate-100">
              <div className="w-12 h-1.5 bg-slate-200 rounded-full"></div>
            </div>
            
            <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50 sticky top-0 z-10">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-amber-100 text-amber-600 flex items-center justify-center">
                  <Bell size={18} />
                </div>
                <h2 className="text-lg font-bold text-slate-900 m-0">Pending Expenses</h2>
              </div>
              <button
                onClick={() => setIsOpen(false)}
                className="text-slate-400 hover:text-slate-700 p-1 rounded-md hover:bg-slate-200 transition-colors"
              >
                <X size={20} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-3 bg-slate-50/50">
              {pendingCount === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-slate-400 gap-2">
                  <CheckCircle size={48} className="text-slate-300" />
                  <p className="font-medium text-sm">All caught up! No pending requests.</p>
                </div>
              ) : (
                pendingExpenses.map(exp => (
                  <div key={exp.id} className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col gap-3">
                    <div className="flex justify-between items-start">
                      <div className="flex items-start gap-3">
                        <div className={`mt-0.5 p-2 rounded-lg border ${
                          exp.expenseType === 'OFFICE_EXPENSE' ? 'bg-red-50 text-red-500 border-red-100' : 'bg-indigo-50 text-indigo-500 border-indigo-100'
                        }`}>
                          {exp.expenseType === 'OFFICE_EXPENSE' ? <Building2 size={16} /> : <Car size={16} />}
                        </div>
                        <div>
                          <strong className="text-sm text-slate-900 block">{exp.description}</strong>
                          <span className="text-[10px] uppercase tracking-wider font-bold text-slate-400">
                            Requested by: {exp.submittedBy?.name || 'Staff'}
                          </span>
                        </div>
                      </div>
                      <div className="font-bold text-lg text-slate-900">
                        ₹{Number(exp.amount).toLocaleString('en-IN')}
                      </div>
                    </div>
                    
                    <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-100 text-xs font-medium text-slate-600">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        <div>
                          <span className="text-slate-400 uppercase tracking-wider text-[9px] font-bold block mb-0.5">Date</span>
                          {new Date(exp.date).toLocaleDateString('en-GB')}
                        </div>
                        <div>
                          <span className="text-slate-400 uppercase tracking-wider text-[9px] font-bold block mb-0.5">Requested Payout</span>
                          {exp.requestedMode === 'CASH' && exp.submittedBy 
                            ? `${exp.submittedBy.name}'s Advance (Cash)` 
                            : exp.requestedMode 
                              ? `${exp.requestedMode}` 
                              : 'No auto-entry requested'}
                        </div>
                      </div>
                      {exp.vehicle && (
                        <div className="mt-2 pt-2 border-t border-slate-200">
                          <span className="text-slate-400 uppercase tracking-wider text-[9px] font-bold block mb-0.5">Linked Vehicle</span>
                          {exp.vehicle.make} {exp.vehicle.model} ({exp.vehicle.registration || 'UNREG'})
                        </div>
                      )}
                    </div>

                    <div className="flex gap-2 mt-1">
                      <button
                        onClick={() => handleAction(exp.id, 'REJECT')}
                        disabled={processingId === exp.id}
                        className="flex-1 py-2 px-3 rounded-lg border border-red-200 text-red-600 font-bold text-xs flex items-center justify-center gap-1.5 hover:bg-red-50 transition-colors disabled:opacity-50"
                      >
                        <XCircle size={14} /> Reject
                      </button>
                      <button
                        onClick={() => handleAction(exp.id, 'APPROVE')}
                        disabled={processingId === exp.id}
                        className="flex-1 py-2 px-3 rounded-lg bg-emerald-600 text-white font-bold text-xs flex items-center justify-center gap-1.5 hover:bg-emerald-700 transition-colors disabled:opacity-50 shadow-sm"
                      >
                        <CheckCircle size={14} /> Approve & Entry
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>,
        document.body
      )}
    </>
  );
}
