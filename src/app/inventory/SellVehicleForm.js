'use client';
function getLocalDateString() {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}


import { useState, useEffect } from 'react';
import { PlusCircle, Trash2 } from 'lucide-react';
import { sellVehicle } from '@/actions/inventory';
import SubmitButton from '@/components/SubmitButton';

export default function SellVehicleForm({ car, accounts }) {
  const [salePrice, setSalePrice] = useState('');
  const [payments, setPayments] = useState([{ id: Date.now(), mode: '', accountId: '', amount: '' }]);
  const [pendingBalance, setPendingBalance] = useState(0);

  useEffect(() => {
    const price = parseFloat(salePrice) || 0;
    const totalPaid = payments.reduce((sum, p) => sum + (parseFloat(p.amount) || 0), 0);
    const pending = price - totalPaid;
    setPendingBalance(pending > 0 ? pending : 0);
  }, [salePrice, payments]);

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

  return (
    <form action={sellVehicle} className="flex flex-col gap-2 relative z-10 text-xs">
      <input type="hidden" name="vehicleId" value={car.id} />
      
      {/* Basic Sale Details & Pending Balance */}
      <div className="flex gap-2 items-start">
        <div className="flex-[0.8]">
          <label className="text-[9px] uppercase font-bold text-emerald-700 mb-0.5 block tracking-wider">Sale Price (₹)</label>
          <input 
            type="number" 
            name="salePrice" 
            placeholder="Final Price" 
            required 
            step="0.01" 
            value={salePrice}
            onChange={(e) => setSalePrice(e.target.value)}
            className="w-full p-1.5 rounded border border-emerald-200 bg-white text-xs font-bold outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-all" 
          />
        </div>
        <div className="flex-[0.8]">
          <label className="text-[9px] uppercase font-bold text-emerald-700 mb-0.5 block tracking-wider">Sale Date</label>
          <input type="date" name="saleDate" required defaultValue={getLocalDateString()} className="w-full p-1.5 rounded border border-emerald-200 bg-white text-xs font-medium outline-none focus:border-emerald-500 text-slate-600" />
        </div>
        
        {/* Pending Balance */}
        <div className={`flex-[1.5] p-1.5 rounded border flex items-center justify-between ${pendingBalance > 0 ? 'bg-amber-50 border-amber-200' : 'bg-slate-50 border-slate-200'}`}>
          <div>
            <div className={`text-[8px] font-bold uppercase tracking-wider mb-0.5 ${pendingBalance > 0 ? 'text-amber-600' : 'text-slate-500'}`}>
              Pending Balance (Customer Owes)
            </div>
            <div className={`font-black text-sm ${pendingBalance > 0 ? 'text-amber-700' : 'text-slate-400'}`}>
              ₹{pendingBalance.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
          </div>
          
          {pendingBalance > 0 && (
            <div className="flex-1 ml-2">
               <label className="text-[7px] uppercase font-bold text-amber-600 mb-0.5 block tracking-wider">Select Account</label>
               <select name="receivableAccountId" required className="w-full p-1 rounded border border-amber-300 bg-white text-[10px] font-medium outline-none focus:border-amber-500">
                <option value="">Select Account</option>
                {accounts?.filter(a => ['UGHRANI', 'DSA_AGENT', 'PARTNER'].includes(a.type)).map(acc => (
                  <option key={acc.id} value={acc.id}>{acc.name} ({acc.type})</option>
                ))}
              </select>
            </div>
          )}
        </div>
      </div>
      
      {/* Payments Section */}
      <div className="flex flex-col gap-1.5">
        <div className="flex items-center justify-between border-b border-emerald-200/50 pb-1 mt-1">
          <div className="text-[9px] font-bold text-slate-500 uppercase tracking-wider">Payments Received</div>
          <button 
            type="button" 
            onClick={addPayment}
            className="text-[9px] uppercase font-bold text-indigo-600 bg-indigo-50 hover:bg-indigo-100 px-1.5 py-0.5 rounded flex items-center gap-1 transition-colors border border-indigo-100"
          >
            <PlusCircle size={10} /> Add Payment
          </button>
        </div>

        {payments.map((p, index) => (
          <div key={p.id} className="bg-white/80 p-1.5 rounded border border-emerald-100 shadow-sm flex items-end gap-1.5">
            <div className="flex-1">
              <label className="text-[8px] uppercase font-bold text-slate-400 mb-0.5 block tracking-wider">Mode</label>
              <select 
                name="paymentModes" 
                value={p.mode}
                onChange={(e) => updatePayment(p.id, 'mode', e.target.value)}
                className="w-full p-1.5 rounded border border-slate-200 bg-white text-xs font-medium outline-none focus:border-emerald-500"
              >
                <option value="">None</option>
                <option value="CASH">Cash</option>
                <option value="BANK">Bank</option>
              </select>
            </div>
            <div className="flex-[1.5]">
              <label className="text-[8px] uppercase font-bold text-slate-400 mb-0.5 block tracking-wider">Account</label>
              <select 
                name="paymentAccountIds" 
                value={p.accountId}
                onChange={(e) => updatePayment(p.id, 'accountId', e.target.value)}
                className="w-full p-1.5 rounded border border-slate-200 bg-white text-xs font-medium outline-none focus:border-emerald-500"
              >
                <option value="">Account</option>
                {accounts?.map(acc => <option key={acc.id} value={acc.id}>{acc.name}</option>)}
              </select>
            </div>
            <div className="flex-1">
              <label className="text-[8px] uppercase font-bold text-slate-400 mb-0.5 block tracking-wider">Amount (₹)</label>
              <input 
                type="number" 
                name="paymentAmounts" 
                placeholder="Amt" 
                step="0.01" 
                value={p.amount}
                onChange={(e) => updatePayment(p.id, 'amount', e.target.value)}
                className="w-full p-1.5 rounded border border-slate-200 bg-white text-xs font-semibold outline-none focus:border-emerald-500" 
              />
            </div>
            {payments.length > 1 && (
              <button 
                type="button" 
                onClick={() => removePayment(p.id)}
                className="p-1.5 mb-[1px] text-red-500 hover:bg-red-50 rounded transition-colors"
                title="Remove Payment"
              >
                <Trash2 size={14} />
              </button>
            )}
          </div>
        ))}
      </div>



      <SubmitButton className="w-full bg-emerald-600 hover:bg-emerald-700 text-white p-2 rounded border-none cursor-pointer text-xs font-bold transition-colors shadow-sm uppercase tracking-wider" pendingText="Confirming...">
        Confirm Sale
      </SubmitButton>
    </form>
  );
}
