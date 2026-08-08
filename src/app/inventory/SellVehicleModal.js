'use client';

import { useState, useEffect } from 'react';
import { PlusCircle, Trash2, HandCoins, X } from 'lucide-react';
import { sellVehicle } from '@/actions/inventory';

export default function SellVehicleModal({ inStock, accounts }) {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedVehicleId, setSelectedVehicleId] = useState('');
  
  const [salePrice, setSalePrice] = useState('');
  const [payments, setPayments] = useState([{ id: Date.now(), mode: '', accountId: '', amount: '' }]);
  const [pendingBalance, setPendingBalance] = useState(0);

  useEffect(() => {
    const price = parseFloat(salePrice) || 0;
    const totalPaid = payments.reduce((sum, p) => sum + (parseFloat(p.amount) || 0), 0);
    const pending = Math.round((price - totalPaid) * 100) / 100;
    setPendingBalance(pending);
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
  
  const handleSubmit = async (formData) => {
    if (!selectedVehicleId) {
      alert("Please select a vehicle to sell.");
      return;
    }
    
    // In Next.js Server Actions, form will execute action automatically.
    // Close modal on submit.
    setTimeout(() => setIsOpen(false), 50);
  };

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-lg font-bold flex items-center gap-2 transition-all shadow-sm border border-emerald-700/50"
      >
        <HandCoins size={18} />
        Sell Vehicle
      </button>

      {isOpen && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl overflow-hidden border border-slate-200">
            <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
              <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2 m-0">
                <HandCoins className="text-emerald-600" />
                Sell Vehicle
              </h2>
              <button 
                onClick={() => setIsOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-md hover:bg-slate-200 transition-colors"
              >
                <X size={20} />
              </button>
            </div>

            <form action={sellVehicle} onSubmit={handleSubmit} className="p-6 flex flex-col gap-5 text-sm">
              
              {/* Vehicle Selection */}
              <div>
                <label className="text-xs uppercase font-bold text-slate-500 mb-1.5 block tracking-wider">Select Vehicle from Stock</label>
                <select 
                  name="vehicleId" 
                  required 
                  value={selectedVehicleId}
                  onChange={(e) => setSelectedVehicleId(e.target.value)}
                  className="w-full p-2.5 rounded-lg border border-slate-200 bg-slate-50 text-slate-900 font-bold outline-none focus:border-emerald-500 focus:bg-white transition-all shadow-sm"
                >
                  <option value="">-- Choose a Vehicle --</option>
                  {inStock?.map(car => (
                    <option key={car.id} value={car.id}>
                      {car.make} {car.model} {car.registration ? `(${car.registration})` : ''} - Total Cost: ₹{car.totalCost.toLocaleString('en-IN')}
                    </option>
                  ))}
                </select>
                {inStock?.length === 0 && (
                  <p className="text-xs text-red-500 mt-1 font-medium">No vehicles in stock to sell.</p>
                )}
              </div>

              {/* Basic Sale Details & Pending Balance */}
              <div className="flex flex-col md:flex-row gap-4 items-start">
                <div className="flex-1 w-full">
                  <label className="text-xs uppercase font-bold text-emerald-700 mb-1.5 block tracking-wider">Sale Price (₹)</label>
                  <input 
                    type="text" 
                    inputMode="decimal"
                    name="salePrice" 
                    placeholder="Final Price" 
                    required 
                    value={salePrice}
                    onChange={(e) => setSalePrice(e.target.value.replace(/,/g, ''))}
                    className="w-full p-2.5 rounded-lg border border-emerald-200 bg-white text-sm font-bold outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-all shadow-sm" 
                  />
                </div>
                <div className="flex-1 w-full">
                  <label className="text-xs uppercase font-bold text-emerald-700 mb-1.5 block tracking-wider">Sale Date</label>
                  <input type="date" name="saleDate" required defaultValue={new Date().toISOString().split('T')[0]} className="w-full p-2.5 rounded-lg border border-emerald-200 bg-white text-sm font-medium outline-none focus:border-emerald-500 text-slate-700 shadow-sm" />
                </div>
              </div>
              
              <div className={`p-3 rounded-lg border flex flex-col md:flex-row md:items-center justify-between gap-3 ${pendingBalance !== 0 ? 'bg-amber-50 border-amber-200 shadow-sm' : 'bg-slate-50 border-slate-200'}`}>
                <div>
                  <div className={`text-[10px] font-bold uppercase tracking-wider mb-0.5 ${pendingBalance !== 0 ? 'text-amber-700' : 'text-slate-500'}`}>
                    {pendingBalance < 0 ? 'Advance (We Owe Customer)' : 'Pending Balance (Customer Owes)'}
                  </div>
                  <div className={`font-black text-lg ${pendingBalance !== 0 ? 'text-amber-600' : 'text-slate-400'}`}>
                    {pendingBalance < 0 ? '-' : ''}₹{Math.abs(pendingBalance).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </div>
                </div>
                
                {pendingBalance !== 0 && (
                  <div className="flex-1 w-full md:w-auto">
                     <label className="text-[10px] uppercase font-bold text-amber-700 mb-1 block tracking-wider">Select Agent Account (For Pending Baki/Advance)</label>
                     <select name="receivableAccountId" required className="w-full p-2 rounded-md border border-amber-300 bg-white text-sm font-medium outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500">
                      <option value="">Select Account</option>
                      {accounts?.filter(a => !['CASH', 'BANK'].includes(a.type)).map(acc => (
                        <option key={acc.id} value={acc.id}>{acc.name} ({acc.type})</option>
                      ))}
                    </select>
                  </div>
                )}
              </div>
              
              {/* Payments Section */}
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
                        value={p.mode}
                        onChange={(e) => updatePayment(p.id, 'mode', e.target.value)}
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
                        value={p.accountId}
                        onChange={(e) => updatePayment(p.id, 'accountId', e.target.value)}
                        className="w-full p-2 rounded-md border border-slate-300 bg-white text-xs font-semibold outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
                      >
                        <option value="">Account</option>
                        {accounts?.filter(acc => p.mode === '' || acc.type === p.mode).map(acc => <option key={acc.id} value={acc.id}>{acc.name}</option>)}
                      </select>
                    </div>
                    <div className="flex-1">
                      <label className="text-[10px] uppercase font-bold text-slate-500 mb-1 block tracking-wider">Amount (₹)</label>
                      <input 
                        type="text" 
                        inputMode="decimal"
                        name="paymentAmounts" 
                        placeholder="Amt" 
                        required 
                        value={p.amount || ''}
                        onChange={(e) => updatePayment(p.id, 'amount', e.target.value.replace(/,/g, ''))}
                        className="w-full p-2 rounded-md border border-slate-300 bg-white text-xs font-bold outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500" 
                      />
                    </div>
                    {payments.length > 1 && (
                      <button 
                        type="button" 
                        onClick={() => removePayment(p.id)}
                        className="p-2 mb-[1px] text-red-600 hover:bg-red-50 hover:text-red-700 rounded-md transition-colors border border-transparent hover:border-red-200"
                        title="Remove Payment"
                      >
                        <Trash2 size={16} />
                      </button>
                    )}
                  </div>
                ))}
              </div>

              <div className="pt-4 border-t border-slate-100 flex justify-end gap-3 mt-2">
                <button 
                  type="button" 
                  onClick={() => setIsOpen(false)}
                  className="px-5 py-2.5 rounded-lg font-bold text-slate-600 hover:bg-slate-100 transition-colors"
                >
                  Cancel
                </button>
                <button 
                  type="submit"
                  disabled={!selectedVehicleId || inStock?.length === 0}
                  className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-bold transition-all shadow-sm disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                >
                  <HandCoins size={18} />
                  Confirm Sale
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
