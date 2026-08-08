'use client';

import { useState } from 'react';
import { PlusCircle, X, AlertCircle } from 'lucide-react';

export default function AddVehicleModal({ accounts, addVehicleAction }) {
  const [isOpen, setIsOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState(null);

  const [purchasePrice, setPurchasePrice] = useState('');
  const [payment1Amount, setPayment1Amount] = useState('');
  const [payment2Amount, setPayment2Amount] = useState('');
  
  const [payment1Mode, setPayment1Mode] = useState('');
  const [payment2Mode, setPayment2Mode] = useState('');

  const [partnerInvestment, setPartnerInvestment] = useState('');
  const [profitSharePercentage, setProfitSharePercentage] = useState('');
  const [partnerPaymentMode, setPartnerPaymentMode] = useState('CASH');
  
  const formatIndianNumber = (val) => {
    let numericString = val.replace(/[^0-9.]/g, '');
    const parts = numericString.split('.');
    if (parts.length > 2) numericString = parts[0] + '.' + parts.slice(1).join('');
    if (!numericString) return '';
    if (parts.length === 2) return Number(parts[0]).toLocaleString('en-IN') + '.' + parts[1];
    return Number(numericString).toLocaleString('en-IN');
  };

  const handlePriceChange = (e) => setPurchasePrice(formatIndianNumber(e.target.value));
  const handlePayment1Change = (e) => setPayment1Amount(formatIndianNumber(e.target.value));
  const handlePayment2Change = (e) => setPayment2Amount(formatIndianNumber(e.target.value));

  const handleInvestmentChange = (e) => {
    const val = formatIndianNumber(e.target.value);
    setPartnerInvestment(val);
    const cost = Number((purchasePrice || '').replace(/,/g, ''));
    const parsedVal = Number(val.replace(/,/g, ''));
    if (cost > 0 && val !== '') {
      const percentage = (parsedVal / cost) * 100;
      setProfitSharePercentage(percentage.toFixed(2).replace(/\.00$/, ''));
    } else if (val === '') {
      setProfitSharePercentage('');
    }
  };

  const handlePercentageChange = (e) => {
    const val = e.target.value;
    setProfitSharePercentage(val);
    const cost = Number((purchasePrice || '').replace(/,/g, ''));
    if (cost > 0 && val !== '') {
      const investment = (Number(val) / 100) * cost;
      setPartnerInvestment(investment.toFixed(2).replace(/\.00$/, ''));
    } else if (val === '') {
      setPartnerInvestment('');
    }
  };

  const pendingBalance = Math.max(0, 
    Math.round((
      (Number((purchasePrice || '').replace(/,/g, '')) || 0) 
      - (Number((payment1Amount || '').replace(/,/g, '')) || 0) 
      - (Number((payment2Amount || '').replace(/,/g, '')) || 0)
      - ((partnerPaymentMode === 'CASH' || partnerPaymentMode === 'BANK') ? (Number((partnerInvestment || '').replace(/,/g, '')) || 0) : 0)
    ) * 100) / 100
  );

  const handleSubmit = async (e) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    setIsSubmitting(true);
    setError(null);
    const result = await addVehicleAction(formData);
    
    if (result && !result.success) {
      setError(result.error);
      setIsSubmitting(false);
    } else {
      setIsSubmitting(false);
      setIsOpen(false);
      setPurchasePrice('');
      setPayment1Amount('');
      setPayment2Amount('');
      setPayment1Mode('');
      setPayment2Mode('');
      setPartnerInvestment('');
      setProfitSharePercentage('');
      setPartnerPaymentMode('CASH');
      e.target.reset();
    }
  };

  return (
    <>
      <button 
        onClick={() => setIsOpen(true)}
        className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white py-2.5 px-4 rounded-lg font-bold shadow-sm transition-colors text-sm"
      >
        <PlusCircle size={18} />
        Add New Vehicle
      </button>

      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm overflow-y-auto">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh]">
            <div className="px-6 py-4 border-b border-slate-100 bg-slate-50 flex items-center justify-between sticky top-0 z-10">
              <div className="flex items-center gap-2">
                <PlusCircle size={18} className="text-indigo-600" />
                <h2 className="text-lg font-bold text-slate-900 m-0">Add New Vehicle</h2>
              </div>
              <button 
                onClick={() => setIsOpen(false)}
                className="text-slate-400 hover:text-slate-700 bg-transparent border-none cursor-pointer p-1 rounded-md hover:bg-slate-200 transition-colors"
              >
                <X size={20} />
              </button>
            </div>
            
            <form onSubmit={handleSubmit} className="p-6 flex flex-col gap-5 overflow-y-auto">
              {error && (
                <div className="bg-red-50 text-red-600 border border-red-200 p-3 rounded-lg text-sm font-bold flex items-center gap-2">
                  <AlertCircle size={16} />
                  {error}
                </div>
              )}

              <div className="flex items-center gap-3 bg-amber-50/50 p-4 rounded-lg border border-amber-200/60">
                <input type="checkbox" name="isLegacy" id="isLegacy" className="w-4 h-4 text-amber-600 rounded border-amber-300 focus:ring-amber-500 focus:ring-offset-0" />
                <label htmlFor="isLegacy" className="m-0 font-bold text-amber-700 cursor-pointer text-xs uppercase tracking-wider">Legacy Stock (Already here)</label>
              </div>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="flex flex-col gap-1.5">
                  <label className="text-[11px] uppercase tracking-wider font-bold text-slate-500">Make</label>
                  <input type="text" name="make" required placeholder="e.g. Maruti" className="p-2.5 rounded-lg border border-slate-200 bg-white text-slate-900 text-sm outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all font-medium" />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-[11px] uppercase tracking-wider font-bold text-slate-500">Model</label>
                  <input type="text" name="model" required placeholder="e.g. Swift VXI" className="p-2.5 rounded-lg border border-slate-200 bg-white text-slate-900 text-sm outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all font-medium" />
                </div>
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-[11px] uppercase tracking-wider font-bold text-slate-500">Registration Number</label>
                <input type="text" name="registration" placeholder="e.g. GJ-05-XX-1234" className="p-2.5 rounded-lg border border-slate-200 bg-white text-slate-900 text-sm outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all font-medium uppercase placeholder:normal-case" />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="flex flex-col gap-1.5">
                  <label className="text-[11px] uppercase tracking-wider font-bold text-slate-500">Car Price (₹)</label>
                  <input 
                    type="text" 
                    inputMode="decimal"
                    name="purchasePrice" 
                    required 
                    placeholder="e.g. 1,50,000" 
                    value={purchasePrice}
                    onChange={handlePriceChange}
                    className="p-2.5 rounded-lg border border-slate-200 bg-white text-slate-900 text-sm outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all font-semibold" 
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-[11px] uppercase tracking-wider font-bold text-slate-500">Purchase Date</label>
                  <input type="date" name="purchaseDate" required defaultValue={new Date().toISOString().split('T')[0]} className="p-2.5 rounded-lg border border-slate-200 bg-white text-slate-900 text-sm outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all font-medium text-slate-600" />
                </div>
              </div>

              <div className="bg-slate-50 p-4 rounded-lg mt-2 border border-slate-200">
                <p className="m-0 mb-3 text-xs uppercase tracking-wider font-bold text-slate-700">Auto-Deduct from Rojmel</p>
                
                <div className="grid grid-cols-3 gap-2 mb-2">
                  <select 
                    name="payment1Mode" 
                    value={payment1Mode}
                    onChange={(e) => setPayment1Mode(e.target.value)}
                    className="text-[11px] font-medium p-2 rounded-md border border-slate-200 bg-white text-slate-700 outline-none focus:border-indigo-500"
                  >
                    <option value="">No Entry</option>
                    <option value="CASH">Cash</option>
                    <option value="BANK">Bank</option>
                  </select>
                  <select name="payment1AccountId" className="text-[11px] font-medium p-2 rounded-md border border-slate-200 bg-white text-slate-700 outline-none focus:border-indigo-500">
                    <option value="">Account...</option>
                    {accounts?.filter(acc => payment1Mode === '' || acc.type === payment1Mode).map(acc => <option key={acc.id} value={acc.id}>{acc.name}</option>)}
                  </select>
                  <input 
                    type="text" 
                    inputMode="decimal"
                    name="payment1Amount" 
                    placeholder="Amt 1 (₹)" 
                    value={payment1Amount}
                    onChange={handlePayment1Change}
                    className="text-[11px] font-semibold p-2 rounded-md border border-slate-200 bg-white text-slate-900 outline-none focus:border-indigo-500 placeholder:font-normal" 
                  />
                </div>

                <div className="grid grid-cols-3 gap-2">
                  <select 
                    name="payment2Mode" 
                    value={payment2Mode}
                    onChange={(e) => setPayment2Mode(e.target.value)}
                    className="text-[11px] font-medium p-2 rounded-md border border-slate-200 bg-white text-slate-700 outline-none focus:border-indigo-500"
                  >
                    <option value="">No Entry</option>
                    <option value="CASH">Cash</option>
                    <option value="BANK">Bank</option>
                  </select>
                  <select name="payment2AccountId" className="text-[11px] font-medium p-2 rounded-md border border-slate-200 bg-white text-slate-700 outline-none focus:border-indigo-500">
                    <option value="">Account...</option>
                    {accounts?.filter(acc => payment2Mode === '' || acc.type === payment2Mode).map(acc => <option key={acc.id} value={acc.id}>{acc.name}</option>)}
                  </select>
                  <input 
                    type="text" 
                    inputMode="decimal"
                    name="payment2Amount" 
                    placeholder="Amt 2 (₹)" 
                    value={payment2Amount}
                    onChange={handlePayment2Change}
                    className="text-[11px] font-semibold p-2 rounded-md border border-slate-200 bg-white text-slate-900 outline-none focus:border-indigo-500 placeholder:font-normal" 
                  />
                </div>

                <div className="mt-4 border-t border-slate-200 pt-4">
                  <div className="flex justify-between items-end mb-2">
                    <p className="m-0 text-[11px] uppercase tracking-wider font-bold text-amber-600">Pending Balance (Not Paid)</p>
                    {pendingBalance > 0 ? (
                      <strong className="text-amber-600 text-sm font-black">₹{pendingBalance.toLocaleString('en-IN')}</strong>
                    ) : (
                      <span className="text-slate-400 text-xs font-bold">₹0</span>
                    )}
                  </div>
                  <input type="hidden" name="payableAccountId" value="" />
                </div>
              </div>

              <div className="bg-purple-50 p-4 rounded-lg mt-1 border border-purple-100">
                <p className="m-0 mb-3 text-xs uppercase tracking-wider font-bold text-purple-700">Partnership (Optional)</p>
                <div className="grid grid-cols-1 gap-2">
                  <select name="partnerAccountId" className="text-[11px] font-medium p-2 rounded-md border border-purple-200 bg-white text-slate-700 outline-none focus:border-purple-500">
                    <option value="">Select Partner / Dealer</option>
                    {accounts?.filter(a => a.type === 'PARTNER').map(acc => <option key={acc.id} value={acc.id}>{acc.name}</option>)}
                  </select>
                  <div className="flex gap-2">
                    <input 
                      type="text" 
                      inputMode="decimal"
                      name="partnerInvestment" 
                      placeholder="Investment (₹)" 
                      value={partnerInvestment}
                      onChange={handleInvestmentChange}
                      className="text-[11px] font-semibold flex-1 p-2 rounded-md border border-purple-200 bg-white text-slate-900 outline-none focus:border-purple-500 placeholder:font-normal" 
                    />
                    <input 
                      type="number" 
                      name="profitSharePercentage" 
                      placeholder="Share (%)" 
                      step="0.01" 
                      value={profitSharePercentage}
                      onChange={handlePercentageChange}
                      className="text-[11px] font-semibold flex-1 p-2 rounded-md border border-purple-200 bg-white text-slate-900 outline-none focus:border-purple-500 placeholder:font-normal" 
                    />
                  </div>
                  {partnerInvestment > 0 && (
                    <select 
                      name="partnerPaymentMode" 
                      value={partnerPaymentMode}
                      onChange={(e) => setPartnerPaymentMode(e.target.value)}
                      className="text-[11px] font-medium p-2 rounded-md border border-purple-200 bg-white text-slate-700 outline-none focus:border-purple-500 mt-1"
                    >
                      <option value="CASH">Paid in Cash</option>
                      <option value="BANK">Paid in Bank</option>
                    </select>
                  )}
                </div>
              </div>

              <div className="sticky bottom-0 bg-white pt-2 mt-2">
                <button 
                  type="submit" 
                  disabled={isSubmitting}
                  className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-3 px-4 rounded-lg shadow-sm transition-all text-sm focus:ring-4 focus:ring-indigo-500/20 disabled:opacity-70"
                >
                  {isSubmitting ? 'Saving...' : 'Add to Stock'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
