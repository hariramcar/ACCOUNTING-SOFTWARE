'use client';

function getLocalDateString() {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

import { useState, useEffect, useRef } from 'react';
import { ArrowLeftRight, Building2, Car, PlusCircle, Trash2 } from 'lucide-react';
import { useFormStatus } from 'react-dom';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';
import VehicleSearchSelect from '@/components/VehicleSearchSelect';

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
  const router = useRouter();
  const [txType, setTxType] = useState('EXPENSE'); // INCOME, EXPENSE, or TRANSFER
  const [expenseSubType, setExpenseSubType] = useState('OFFICE_EXPENSE'); // OFFICE_EXPENSE or CAR_EXPENSE
  


  // Expenses State
  const [mode, setMode] = useState('');

  // Income State (Mirrors Sell Vehicle)
  const [amount, setAmount] = useState('');
  const handleAmountFormat = (val) => {
    if (!val) return '';
    let lowerVal = val.toString().toLowerCase();
    let multiplier = 1;
    if (lowerVal.endsWith('k')) {
      multiplier = 1000;
      lowerVal = lowerVal.slice(0, -1);
    } else if (lowerVal.endsWith('l')) {
      multiplier = 100000;
      lowerVal = lowerVal.slice(0, -1);
    }

    const rawValue = lowerVal.replace(/[^0-9.]/g, '');
    if (!rawValue) return '';
    
    let num = parseFloat(rawValue);
    if (isNaN(num)) return '';
    
    num = num * multiplier;
    
    if (multiplier > 1) {
       const parts = num.toString().split('.');
       parts[0] = Number(parts[0]).toLocaleString('en-IN');
       return parts.join('.');
    } else {
       const parts = rawValue.split('.');
       parts[0] = Number(parts[0]).toLocaleString('en-IN');
       return parts.join('.');
    }
  };

  const [payments, setPayments] = useState([{ id: Date.now(), mode: '', accountId: '', amount: '' }]);
  const [pendingBalance, setPendingBalance] = useState(0);
  const [overpaidAmount, setOverpaidAmount] = useState(0);

  useEffect(() => {
    if (txType === 'INCOME' || txType === 'EXPENSE') {
      const total = parseFloat((amount || '').toString().replace(/,/g, '')) || 0;
      const totalPaid = payments.reduce((sum, p) => sum + (parseFloat((p.amount || '').toString().replace(/,/g, '')) || 0), 0);
      const pending = Math.round((total - totalPaid) * 100) / 100;
      setPendingBalance(Math.max(0, pending));
      setOverpaidAmount(pending < 0 ? Math.abs(pending) : 0);
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

  const cashAccount = accounts?.find(a => a.type === 'CASH');

  const updatePayment = (id, field, value) => {
    setPayments(payments.map(p => {
      if (p.id !== id) return p;
      const updated = { ...p, [field]: value };
      // Auto-select CASH account when mode changes to CASH
      if (field === 'mode' && value === 'CASH') {
        updated.accountId = cashAccount?.id || '';
      } else if (field === 'mode' && value !== 'CASH') {
        updated.accountId = ''; // Reset so user picks bank account
      }
      return updated;
    }));
  };

  const isSubmittingRef = useRef(false);

  const finalExpenseType = txType === 'INCOME' ? 'INCOME' : expenseSubType;
  const handleExpenseSubmit = async (formData) => {
    // 1. Validation: Amount must be > 0
    const rawAmount = formData.get('amount') || '0';
    const numAmount = parseFloat(rawAmount.toString().replace(/,/g, ''));
    if (isNaN(numAmount) || numAmount <= 0) {
      toast.error('Amount must be greater than 0.');
      return;
    }

    // 2. Validation: Description minimum 3 chars
    const description = (formData.get('description') || '').toString().trim();
    if (description.length < 3) {
      toast.error('Please provide a clear description (min 3 characters).');
      return;
    }

    // 3. Validation: No future dates
    const inputDate = new Date(formData.get('date') || Date.now());
    const today = new Date();
    today.setHours(23, 59, 59, 999);
    if (inputDate > today) {
      toast.error('You cannot add transactions for future dates.');
      return;
    }

    if (overpaidAmount > 0) {
      toast.error('Payment amounts cannot exceed the total amount.');
      return;
    }

    // 4. Validation: Account Selection Guard
    if (txType === 'INCOME') {
      if (pendingBalance > 0 && !formData.get('receivableAccountId')) {
        toast.error('Please select an agent account for the pending balance.');
        return;
      }
    } else {
      if (pendingBalance > 0) {
        toast.error(`For expenses, your payments must exactly match the total amount. You have a difference of ₹${pendingBalance.toLocaleString('en-IN')}`);
        return;
      }
    }

    if (isSubmittingRef.current) return;
    isSubmittingRef.current = true;
    
    try {
      if (finalExpenseType === 'INCOME' && formData.get('vehicleId')) {
        // Map form fields to match sellVehicle backend action
        formData.set('salePrice', formData.get('amount'));
        formData.set('saleDate', formData.get('date'));
        
        const result = await sellVehicleAction(formData);
        if (result && !result.success) {
          toast.error(`Error: ${result.error}`);
        } else {
          toast.success('Income added successfully!');
          setAmount('');
          setMode('');
          setPayments([{ id: Date.now(), mode: '', accountId: '', amount: '' }]);
          document.getElementById('expense-form').reset();
          router.refresh();
          if (onSuccess) onSuccess();
        }
      } else {
        const result = await addExpenseAction(formData);
        if (result && !result.success) {
          toast.error(`Error: ${result.error}`);
        } else {
          toast.success('Added successfully!');
          setAmount('');
          setMode('');
          setPayments([{ id: Date.now(), mode: '', accountId: '', amount: '' }]);
          document.getElementById('expense-form').reset();
          router.refresh();
          if (onSuccess) onSuccess();
        }
      }
    } finally {
      isSubmittingRef.current = false;
    }
  };

  const handleTransferSubmit = async (formData) => {
    // 1. Validation: Amount > 0
    const rawAmount = formData.get('amount') || '0';
    const numAmount = parseFloat(rawAmount.toString().replace(/,/g, ''));
    if (isNaN(numAmount) || numAmount <= 0) {
      toast.error('Transfer amount must be greater than 0.');
      return;
    }

    // 2. Validation: Description length
    const description = (formData.get('description') || '').toString().trim();
    if (description.length < 3) {
      toast.error('Please provide a transfer description (min 3 characters).');
      return;
    }

    // 3. Validation: No future dates
    const inputDate = new Date(formData.get('date') || Date.now());
    const today = new Date();
    today.setHours(23, 59, 59, 999);
    if (inputDate > today) {
      toast.error('You cannot schedule future transfers here.');
      return;
    }

    // 5. Transfer Loop Validation
    const fromAccountId = formData.get('fromAccountId');
    const toAccountId = formData.get('toAccountId');
    if (fromAccountId === toAccountId) {
      toast.error('Cannot transfer money to the same account.');
      return;
    }

    if (isSubmittingRef.current) return;
    isSubmittingRef.current = true;
    
    try {
      const result = await addTransferAction(formData);
      if (result && !result.success) {
        toast.error(`Error: ${result.error}`);
      } else {
        toast.success('Transfer complete!');
        document.getElementById('transfer-form').reset();
        router.refresh();
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
              <VehicleSearchSelect 
                vehicles={vehicles}
                name="vehicleId"
                required={true}
                placeholder="Select a Car..."
              />
            </div>
          )}



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
                onChange={(e) => setAmount(handleAmountFormat(e.target.value))}
                className="p-2.5 rounded-lg border border-slate-200 bg-white text-slate-900 outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all text-sm font-semibold"
              />
            </div>
            <div className="flex flex-col gap-1.5 flex-1">
              <label className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Date</label>
              <input type="date" name="date" required max={getLocalDateString()} defaultValue={getLocalDateString()} className="p-2.5 rounded-lg border border-slate-200 bg-white text-slate-900 outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all text-sm font-medium" />
            </div>
          </div>

          <div className={`p-4 rounded-lg border flex flex-col md:flex-row md:items-center gap-4 ${overpaidAmount > 0 ? 'bg-red-50 border-red-200 shadow-sm' : pendingBalance !== 0 ? 'bg-amber-50 border-amber-200 shadow-sm' : 'bg-slate-50 border-slate-200'}`}>
            <div className="flex-1">
              <div className={`text-[10px] font-bold uppercase tracking-wider mb-0.5 ${overpaidAmount > 0 ? 'text-red-700' : pendingBalance !== 0 ? 'text-amber-700' : 'text-slate-500'}`}>
                {overpaidAmount > 0 ? 'Payment exceeds total amount' : pendingBalance !== 0 ? 'Difference / Unallocated' : 'Fully Allocated'}
              </div>
              {overpaidAmount > 0 ? (
                <div className="font-black text-lg text-red-600 bg-red-100 px-2 py-0.5 rounded border border-red-300 w-max">
                  Exceeds by ₹{overpaidAmount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </div>
              ) : (
                <div className={`font-black text-lg ${pendingBalance !== 0 ? 'text-amber-600' : 'text-slate-400'}`}>
                  ₹{pendingBalance.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </div>
              )}
            </div>

            {txType === 'INCOME' && pendingBalance !== 0 && overpaidAmount === 0 && (
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
            <div className="flex items-center justify-between border-b border-indigo-200/50 pb-2">
              <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Payment Sources</div>
              <button
                type="button"
                onClick={addPayment}
                className="text-[10px] uppercase font-bold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 px-2 py-1 rounded-md flex items-center gap-1 transition-colors border border-indigo-200 shadow-sm"
              >
                <PlusCircle size={12} /> Add Payment Source
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
                    className="w-full p-2 rounded-md border border-slate-300 bg-white text-xs font-semibold outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                  >
                    <option value="">None</option>
                    <option value="CASH">Cash</option>
                    <option value="BANK">Bank</option>
                    {txType === 'EXPENSE' && <option value="UGHRANI">Market Place / Vendor</option>}
                  </select>
                </div>
                <div className="flex-[1.5]">
                  <label className="text-[10px] uppercase font-bold text-slate-500 mb-1 block tracking-wider">Account</label>
                  {(!isAdmin && (p.mode === 'CASH' || p.mode === 'BANK')) ? (
                    <>
                      <div className={`p-2 rounded-md border text-xs font-bold flex items-center gap-1.5 ${p.mode === 'CASH' ? 'bg-emerald-50 border-emerald-200 text-emerald-700' : 'bg-sky-50 border-sky-200 text-sky-700'}`}>
                        {p.mode === 'CASH' ? '💵 Cash' : '🏦 Bank'} (Auto-selected)
                      </div>
                      <input type="hidden" name="paymentAccountIds" value="staff_auto" />
                    </>
                  ) : p.mode === 'CASH' ? (
                    <>
                      <div className="p-2 rounded-md bg-emerald-50 border border-emerald-200 text-xs font-bold text-emerald-700 flex items-center gap-1.5">
                        💵 Cash (Auto-selected)
                      </div>
                      <input type="hidden" name="paymentAccountIds" value={cashAccount?.id || ''} />
                    </>
                  ) : (
                    <select
                      name="paymentAccountIds"
                      value={p.accountId ?? ''}
                      onChange={(e) => updatePayment(p.id, 'accountId', e.target.value)}
                      required
                      className="w-full p-2 rounded-md border border-slate-300 bg-white text-xs font-semibold outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                    >
                      <option value="">Select Account</option>
                      {accounts?.filter(acc => p.mode === 'BANK' ? acc.type === 'BANK' : (p.mode === '' ? true : acc.type === p.mode)).map(acc => <option key={acc.id} value={acc.id}>{acc.name}</option>)}
                    </select>
                  )}
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
                    className="w-full p-2 rounded-md border border-slate-300 bg-white text-xs font-bold outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
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
              <input type="date" name="date" required max={getLocalDateString()} defaultValue={getLocalDateString()} className="p-2.5 rounded-lg border border-blue-200 bg-white text-slate-900 outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all text-sm font-medium shadow-sm" />
            </div>
          </div>

          <TransferSubmitButton />
        </form>
      )}
    </div>
  );
}
