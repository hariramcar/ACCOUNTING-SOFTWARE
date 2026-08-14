'use client';

import { useState, useEffect, useRef } from 'react';
import { ArrowLeftRight, Building2, Car, PlusCircle, Trash2 } from 'lucide-react';
import { useFormStatus } from 'react-dom';

function ExpenseSubmitButton({ txType, expenseSubType }) {
  const { pending } = useFormStatus();
  return (
    <button type="submit" disabled={pending} className={`mt-2 w-full p-3 rounded-lg font-bold border-none cursor-pointer text-white text-sm transition-all shadow-sm flex items-center justify-center gap-2 focus:ring-4 ${
      pending ? 'bg-slate-400 cursor-not-allowed opacity-70' :
      txType === 'INCOME' ? 'bg-emerald-600 hover:bg-emerald-700 focus:ring-emerald-500/20' :
      expenseSubType === 'OFFICE_EXPENSE' ? 'bg-red-600 hover:bg-red-700 focus:ring-red-500/20' : 'bg-indigo-600 hover:bg-indigo-700 focus:ring-indigo-500/20'
    }`}>
      {pending ? 'Processing...' : `Add ${txType === 'INCOME' ? 'Income' : expenseSubType === 'OFFICE_EXPENSE' ? 'Office Expense' : 'Car Expense'}`}
    </button>
  );
}

function TransferSubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button type="submit" disabled={pending} className={`mt-2 w-full p-3 rounded-lg font-bold border-none cursor-pointer text-white text-sm transition-all shadow-sm flex items-center justify-center gap-2 focus:ring-4 ${
      pending ? 'bg-slate-400 cursor-not-allowed opacity-70' : 'bg-blue-600 hover:bg-blue-700 focus:ring-blue-500/20'
    }`}>
      <ArrowLeftRight size={18} /> {pending ? 'Processing...' : 'Make Transfer'}
    </button>
  );
}

export default function ExpenseForm({ vehicles, accounts, addExpenseAction, addTransferAction, sellVehicleAction, isAdmin, onSuccess }) {
  const [txType, setTxType] = useState('EXPENSE'); // INCOME, EXPENSE, or TRANSFER
  const [expenseSubType, setExpenseSubType] = useState('OFFICE_EXPENSE'); // OFFICE_EXPENSE or CAR_EXPENSE

  // Expenses State
  const [mode, setMode] = useState('');

  // Income State (Mirrors Sell Vehicle)
  const [amount, setAmount] = useState('');
  const [payments, setPayments] = useState([{ id: Date.now(), mode: '', accountId: '', amount: '' }]);
  const [pendingBalance, setPendingBalance] = useState(0);

  useEffect(() => {
    if (txType === 'INCOME') {
      const total = parseFloat(amount) || 0;
      const totalPaid = payments.reduce((sum, p) => sum + (parseFloat(p.amount) || 0), 0);
      const pending = Math.round((total - totalPaid) * 100) / 100;
      setPendingBalance(pending);
    }
  }, [amount, payments, txType]);

  const addPayment = () => {
    setPayments([...payments, { id: Date.now(), mode: '', accountId: '', amount: '' }]);
  };

  const removePayment = (id) => {
    if (payments.length > 1) {
      setPayments(payments.filter(p => p.id !== id));
    }
  };

  const updatePayment = (id, field, value) => {
    setPayments(payments.map(p => p.id === id ? { ...p, [field]: value } : p));
  };

  const isSubmittingRef = useRef(false);

  const finalExpenseType = txType === 'INCOME' ? 'INCOME' : expenseSubType;
  const handleExpenseSubmit = async (formData) => {
    if (isSubmittingRef.current) return;
    isSubmittingRef.current = true;
    
    try {
      if (finalExpenseType === 'INCOME' && formData.get('vehicleId')) {
        // Map form fields to match sellVehicle backend action
        formData.set('salePrice', formData.get('amount'));
        formData.set('saleDate', formData.get('date'));
        
        const result = await sellVehicleAction(formData);
        if (result && !result.success) {
          alert(`Error: ${result.error}`);
        } else {
          setAmount('');
          setMode('');
          setPayments([{ id: Date.now(), mode: '', accountId: '', amount: '' }]);
          document.getElementById('expense-form').reset();
          if (onSuccess) onSuccess();
        }
      } else {
        const result = await addExpenseAction(formData);
        if (result && !result.success) {
          alert(`Error: ${result.error}`);
        } else {
          setAmount('');
          setMode('');
          setPayments([{ id: Date.now(), mode: '', accountId: '', amount: '' }]);
          document.getElementById('expense-form').reset();
          if (onSuccess) onSuccess();
        }
      }
    } finally {
      isSubmittingRef.current = false;
    }
  };

  const handleTransferSubmit = async (formData) => {
    if (isSubmittingRef.current) return;
    isSubmittingRef.current = true;
    
    try {
      const result = await addTransferAction(formData);
      if (result && !result.success) {
        alert(`Error: ${result.error}`);
      } else {
        document.getElementById('transfer-form').reset();
        if (onSuccess) onSuccess();
      }
    } finally {
      isSubmittingRef.current = false;
    }
  };

  return (
    <div className="bg-white border border-slate-200 rounded-xl p-4 md:p-6 shadow-sm">
      {isAdmin && (
        <div className="flex gap-3 mb-4 bg-slate-50 p-1.5 rounded-lg border border-slate-200">
          <button
            type="button"
            onClick={() => setTxType('INCOME')}
            className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-md font-semibold text-sm transition-all ${txType === 'INCOME' ? 'bg-emerald-500 text-white shadow-sm border border-emerald-600' : 'text-slate-500 hover:text-slate-700 hover:bg-slate-100/50'
              }`}
          >
            Income
          </button>
          <button
            type="button"
            onClick={() => setTxType('EXPENSE')}
            className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-md font-semibold text-sm transition-all ${txType === 'EXPENSE' ? 'bg-white text-slate-900 shadow-sm border border-slate-200' : 'text-slate-500 hover:text-slate-700 hover:bg-slate-100/50'
              }`}
          >
            Expense
          </button>
          {isAdmin && (
            <button
              type="button"
              onClick={() => setTxType('TRANSFER')}
              className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-md font-semibold text-sm transition-all ${txType === 'TRANSFER' ? 'bg-blue-500 text-white shadow-sm border border-blue-600' : 'text-slate-500 hover:text-slate-700 hover:bg-slate-100/50'
                }`}
            >
              Transfer
            </button>
          )}
        </div>
      )}

      {txType === 'EXPENSE' && (
        <div className="flex gap-3 mb-6">
          <button
            type="button"
            onClick={() => setExpenseSubType('OFFICE_EXPENSE')}
            className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-md font-semibold text-xs border transition-all ${expenseSubType === 'OFFICE_EXPENSE' ? 'bg-red-50 text-red-600 border-red-200' : 'bg-white text-slate-500 border-slate-200 hover:bg-slate-50'
              }`}
          >
            <Building2 size={14} className={expenseSubType === 'OFFICE_EXPENSE' ? 'text-red-500' : ''} />
            Office
          </button>
          <button
            type="button"
            onClick={() => setExpenseSubType('CAR_EXPENSE')}
            className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-md font-semibold text-xs border transition-all ${expenseSubType === 'CAR_EXPENSE' ? 'bg-indigo-50 text-indigo-600 border-indigo-200' : 'bg-white text-slate-500 border-slate-200 hover:bg-slate-50'
              }`}
          >
            <Car size={14} className={expenseSubType === 'CAR_EXPENSE' ? 'text-indigo-500' : ''} />
            Car
          </button>
        </div>
      )}

      {txType !== 'TRANSFER' && (
        <form id="expense-form" action={handleExpenseSubmit} className="flex flex-col gap-4">
          <input type="hidden" name="expenseType" value={finalExpenseType} />

          {finalExpenseType === 'CAR_EXPENSE' && (
            <div className="bg-indigo-50/50 p-4 rounded-lg border border-indigo-100 flex flex-col gap-2">
              <label className="text-indigo-700 font-bold text-[11px] uppercase tracking-wider">Link to Specific Car</label>
              <select name="vehicleId" required className="p-2.5 rounded-lg border border-indigo-200 bg-white text-slate-900 text-sm outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 font-medium">
                <option value="">Select a Car...</option>
                {vehicles.map(v => (
                  <option key={v.id} value={v.id}>
                    {v.make} {v.model} ({v.registration || 'UNREGISTERED'}) {v.status === 'SOLD' ? '- SOLD' : ''}
                  </option>
                ))}
              </select>
            </div>
          )}

          {txType === 'INCOME' ? (
            <>
              {/* Income Specific Layout (Mirrors Sell Vehicle exactly) */}
              <div className="mb-2">
                <label className="text-xs uppercase font-bold text-emerald-700 mb-1.5 block tracking-wider">Select Vehicle (Optional)</label>
                <select name="vehicleId" className="w-full p-2.5 rounded-lg border border-emerald-200 bg-white text-sm font-medium outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-all shadow-sm text-slate-700">
                  <option value="">-- No Specific Vehicle --</option>
                  {vehicles.filter(v => v.status !== 'SOLD').map(v => (
                    <option key={v.id} value={v.id}>
                      {v.make} {v.model} {v.registration ? `(${v.registration})` : ''} - Total Cost: ₹{(v.totalCost || 0).toLocaleString('en-IN')}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex flex-col md:flex-row gap-4 items-start mb-2">
                <div className="flex-1 w-full">
                  <label className="text-xs uppercase font-bold text-emerald-700 mb-1.5 block tracking-wider">Description</label>
                  <input type="text" name="description" required placeholder="e.g. Electricity Bill, Painter, Parts" className="w-full p-2.5 rounded-lg border border-emerald-200 bg-white text-sm font-medium outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-all shadow-sm" />
                </div>
              </div>

              <div className="flex flex-col md:flex-row gap-4 items-start mb-2">
                <div className="flex-1 w-full">
                  <label className="text-xs uppercase font-bold text-emerald-700 mb-1.5 block tracking-wider">Income Amount (₹)</label>
                  <input
                    type="text"
                    inputMode="decimal"
                    name="amount"
                    required
                    placeholder="0"
                    value={amount ?? ''}
                    onChange={(e) => setAmount(e.target.value.replace(/,/g, ''))}
                    className="w-full p-2.5 rounded-lg border border-emerald-200 bg-white text-sm font-bold outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-all shadow-sm"
                  />
                </div>
                <div className="flex-1 w-full">
                  <label className="text-xs uppercase font-bold text-emerald-700 mb-1.5 block tracking-wider">Date</label>
                  <input type="date" name="date" required defaultValue={new Date().toISOString().split('T')[0]} className="w-full p-2.5 rounded-lg border border-emerald-200 bg-white text-sm font-medium outline-none focus:border-emerald-500 text-slate-700 shadow-sm" />
                </div>
              </div>

              <div className={`p-4 rounded-lg border flex flex-col md:flex-row md:items-center gap-4 ${pendingBalance !== 0 ? 'bg-amber-50 border-amber-200 shadow-sm' : 'bg-slate-50 border-slate-200'}`}>
                <div className="flex-1">
                  <div className={`text-[10px] font-bold uppercase tracking-wider mb-0.5 ${pendingBalance !== 0 ? 'text-amber-700' : 'text-slate-500'}`}>
                    {pendingBalance < 0 ? 'Advance (We Owe Customer)' : 'Pending Balance (Customer Owes)'}
                  </div>
                  <div className={`font-black text-lg ${pendingBalance !== 0 ? 'text-amber-600' : 'text-slate-400'}`}>
                    {pendingBalance < 0 ? '-' : ''}₹{Math.abs(pendingBalance).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </div>
                </div>

                {pendingBalance !== 0 && (
                  <div className="flex-1">
                    <label className="text-[10px] uppercase font-bold text-amber-700 mb-1 block tracking-wider">Select Agent Account (For Pending Baki/Advance)</label>
                    <select name="receivableAccountId" required className="w-full p-2.5 rounded-md border border-amber-300 bg-white text-sm font-medium outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500">
                      <option value="">Select Account</option>
                      {accounts?.filter(a => a.type === 'DSA_AGENT').map(acc => (
                        <option key={acc.id} value={acc.id}>{acc.name}</option>
                      ))}
                    </select>
                  </div>
                )}
              </div>

              <div className="flex flex-col gap-2.5 mt-2">
                <div className="flex items-center justify-between border-b border-emerald-200/50 pb-2">
                  <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Payments Received</div>
                  <button
                    type="button"
                    onClick={addPayment}
                    className="text-[10px] uppercase font-bold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 px-2 py-1 rounded-md flex items-center gap-1 transition-colors border border-indigo-200 shadow-sm"
                  >
                    <PlusCircle size={12} /> Add Payment
                  </button>
                </div>

                {payments.map((p, index) => (
                  <div key={p.id} className="bg-slate-50 p-2.5 rounded-lg border border-slate-200 flex flex-col md:flex-row md:items-end gap-2.5 shadow-sm">
                    <div className="flex-1">
                      <label className="text-[10px] uppercase font-bold text-slate-500 mb-1 block tracking-wider">Mode</label>
                      <select
                        name="paymentModes"
                        value={p.mode ?? ''}
                        onChange={(e) => updatePayment(p.id, 'mode', e.target.value)}
                        required
                        className="w-full p-2 rounded-md border border-slate-300 bg-white text-xs font-semibold outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
                      >
                        <option value="">None</option>
                        <option value="CASH">Cash</option>
                        <option value="BANK">Bank</option>
                      </select>
                    </div>
                    <div className="flex-[1.5]">
                      <label className="text-[10px] uppercase font-bold text-slate-500 mb-1 block tracking-wider">Account</label>
                      <select
                        name="paymentAccountIds"
                        value={p.accountId ?? ''}
                        onChange={(e) => updatePayment(p.id, 'accountId', e.target.value)}
                        required
                        className="w-full p-2 rounded-md border border-slate-300 bg-white text-xs font-semibold outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
                      >
                        <option value="">Account</option>
                        {accounts?.filter(acc => p.mode === '' || acc.type === p.mode).map(acc => <option key={acc.id} value={acc.id}>{acc.name}</option>)}
                      </select>
                    </div>
                    <div className="flex-[1.5]">
                      <label className="text-[10px] uppercase font-bold text-slate-500 mb-1 block tracking-wider">Amount (₹)</label>
                      <input
                        type="text"
                        inputMode="decimal"
                        name="paymentAmounts"
                        placeholder="Amt"
                        required
                        value={p.amount ?? ''}
                        onChange={(e) => updatePayment(p.id, 'amount', e.target.value.replace(/,/g, ''))}
                        className="w-full p-2 rounded-md border border-slate-300 bg-white text-xs font-bold outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
                      />
                    </div>
                    {payments.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removePayment(p.id)}
                        className="p-2 mb-[1px] text-red-600 hover:bg-red-50 hover:text-red-700 rounded-md transition-colors border border-transparent hover:border-red-200"
                      >
                        <Trash2 size={16} />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </>
          ) : (
            <>
              {/* Expense Original Form */}
              <div className="flex flex-col gap-1.5">
                <label className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Description</label>
                <input type="text" name="description" required placeholder="e.g. Electricity Bill, Painter, Parts" className="p-2.5 rounded-lg border border-slate-200 bg-white text-slate-900 outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all text-sm font-medium" />
              </div>

              <div className="flex flex-col sm:flex-row gap-4">
                <div className="flex flex-col gap-1.5 flex-1">
                  <label className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Total Amount (₹)</label>
                  <input
                    type="text"
                    inputMode="decimal"
                    name="amount"
                    required
                    placeholder="0"
                    value={amount ?? ''}
                    onChange={(e) => setAmount(e.target.value.replace(/,/g, ''))}
                    className="p-2.5 rounded-lg border border-slate-200 bg-white text-slate-900 outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all text-sm font-semibold"
                  />
                </div>
                <div className="flex flex-col gap-1.5 flex-1">
                  <label className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Date</label>
                  <input type="date" name="date" required defaultValue={new Date().toISOString().split('T')[0]} className="p-2.5 rounded-lg border border-slate-200 bg-white text-slate-900 outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all text-sm font-medium" />
                </div>
              </div>

              {/* EXPENSE SIMPLE AUTO-DEDUCT SECTION */}
              <div className="bg-slate-50 p-4 rounded-lg mt-2 border border-slate-200">
                <p className="m-0 mb-3 text-[11px] font-bold uppercase tracking-wider text-slate-700">{isAdmin ? 'Auto-Deduct from Rojmel (Optional)' : 'Payment Source'}</p>
                {accounts.length === 0 ? (
                  <div className="bg-red-50 text-red-600 border border-red-200 rounded-md p-3 text-sm font-semibold">
                    ⚠️ You haven't created any Cash Drawers or Bank Accounts yet! Go to the Master Capital Dashboard (Bank Icon) to add one first.
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="flex flex-col gap-1.5">
                      <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Payment Mode</label>
                      <select
                        name="mode"
                        value={mode ?? ''}
                        onChange={(e) => setMode(e.target.value)}
                        className="p-2 rounded-lg border border-slate-200 bg-white text-slate-700 text-sm font-medium outline-none focus:border-indigo-500"
                      >
                        {isAdmin && <option value="">No Auto-Entry (Keep Pending)</option>}
                        <option value="CASH">{isAdmin ? 'Cash' : 'My Advance (Cash)'}</option>
                        {isAdmin && <option value="BANK">Bank</option>}
                        <option value="UGHRANI">Market Place (Garage/Vendor)</option>
                      </select>
                    </div>
                    
                    {/* For STAFF, hide account dropdown if CASH (auto-assigned). For ADMIN, show it for everything if mode is selected. */}
                    {(mode === 'BANK' || mode === 'UGHRANI' || (isAdmin && mode === 'CASH')) && (
                      <div className="flex flex-col gap-1.5">
                        <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Ledger Account</label>
                        <select name="accountId" required={mode !== ''} className="p-2 rounded-lg border border-slate-200 bg-white text-slate-700 text-sm font-medium outline-none focus:border-indigo-500">
                          <option value="">Select Account...</option>
                          {accounts.filter(acc => acc.type === mode).map(acc => (
                            <option key={acc.id} value={acc.id}>{acc.name}</option>
                          ))}
                        </select>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </>
          )}

          <ExpenseSubmitButton txType={txType} expenseSubType={expenseSubType} />
        </form>
      )}

      {txType === 'TRANSFER' && (
        <form id="transfer-form" action={handleTransferSubmit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <label className="text-[11px] font-bold uppercase tracking-wider text-blue-700">Description / Note</label>
            <input type="text" name="description" required placeholder="e.g. Cash deposited to HDFC Bank" className="p-2.5 rounded-lg border border-blue-200 bg-white text-slate-900 outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all text-sm font-medium shadow-sm" />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="flex flex-col gap-1.5 flex-1">
              <label className="text-[11px] font-bold uppercase tracking-wider text-blue-700">Transfer From (Money Out)</label>
              <select name="fromAccountId" required className="p-2.5 rounded-lg border border-blue-200 bg-white text-slate-900 outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all text-sm font-medium shadow-sm">
                <option value="">Select Account...</option>
                {accounts.filter(a => a.type === 'CASH' || a.type === 'BANK').map(acc => (
                  <option key={acc.id} value={acc.id}>{acc.name} ({acc.type})</option>
                ))}
              </select>
            </div>
            <div className="flex flex-col gap-1.5 flex-1">
              <label className="text-[11px] font-bold uppercase tracking-wider text-blue-700">Transfer To (Money In)</label>
              <select name="toAccountId" required className="p-2.5 rounded-lg border border-blue-200 bg-white text-slate-900 outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all text-sm font-medium shadow-sm">
                <option value="">Select Account...</option>
                {accounts.filter(a => a.type === 'CASH' || a.type === 'BANK').map(acc => (
                  <option key={acc.id} value={acc.id}>{acc.name} ({acc.type})</option>
                ))}
              </select>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex flex-col gap-1.5 flex-1">
              <label className="text-[11px] font-bold uppercase tracking-wider text-blue-700">Amount (₹)</label>
              <input
                type="number"
                name="amount"
                required
                step="0.01"
                placeholder="0.00"
                className="p-2.5 rounded-lg border border-blue-200 bg-white text-slate-900 outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all text-sm font-semibold shadow-sm"
              />
            </div>
            <div className="flex flex-col gap-1.5 flex-1">
              <label className="text-[11px] font-bold uppercase tracking-wider text-blue-700">Date</label>
              <input type="date" name="date" required defaultValue={new Date().toISOString().split('T')[0]} className="p-2.5 rounded-lg border border-blue-200 bg-white text-slate-900 outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all text-sm font-medium shadow-sm" />
            </div>
          </div>

          <TransferSubmitButton />
        </form>
      )}
    </div>
  );
}
