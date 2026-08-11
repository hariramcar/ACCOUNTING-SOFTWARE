'use client';

import { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { PlusCircle, X, AlertCircle } from 'lucide-react';

export default function AddVehicleModal({ accounts, addVehicleAction }) {
  const [isOpen, setIsOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  const [purchasePrice, setPurchasePrice] = useState('');
  const [payment1Amount, setPayment1Amount] = useState('');
  const [payment2Amount, setPayment2Amount] = useState('');
  
  const [payment1Mode, setPayment1Mode] = useState('');
  const [payment2Mode, setPayment2Mode] = useState('');

  const [partnerInvestment, setPartnerInvestment] = useState('');
  const [profitSharePercentage, setProfitSharePercentage] = useState('');
  
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
    let val = e.target.value.replace(/[^0-9.]/g, '');
    const parts = val.split('.');
    if (parts.length > 2) val = parts[0] + '.' + parts.slice(1).join('');
    
    setProfitSharePercentage(val);
    const cost = Number((purchasePrice || '').replace(/,/g, ''));
    if (cost > 0 && val !== '') {
      const investment = (Number(val) / 100) * cost;
      setPartnerInvestment(formatIndianNumber(investment.toFixed(2).replace(/\.00$/, '')));
    } else if (val === '') {
      setPartnerInvestment('');
    }
  };

  const pendingBalance = Math.max(0, 
    Math.round((
      (Number((purchasePrice || '').replace(/,/g, '')) || 0) 
      - (Number((payment1Amount || '').replace(/,/g, '')) || 0) 
      - (Number((payment2Amount || '').replace(/,/g, '')) || 0)
      - (Number((partnerInvestment || '').replace(/,/g, '')) || 0)
    ) * 100) / 100
  );

  const isSubmittingRef = useRef(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (isSubmittingRef.current) return;
    isSubmittingRef.current = true;
    
    setIsSubmitting(true);
    setError(null);

    const formData = new FormData(e.currentTarget);
    formData.append('purchasePrice', (purchasePrice || '0').replace(/,/g, ''));
    formData.append('payment1Amount', (payment1Amount || '0').replace(/,/g, ''));
    formData.append('payment2Amount', (payment2Amount || '0').replace(/,/g, ''));
    formData.append('partnerInvestment', (partnerInvestment || '0').replace(/,/g, ''));
    
    try {
      const result = await addVehicleAction(formData);

      if (result && !result.success) {
        setError(result.error || 'Failed to add vehicle');
      } else {
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
    } catch (err) {
      setError(err.message || 'An unexpected error occurred');
    } finally {
      isSubmittingRef.current = false;
      setIsSubmitting(false);
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

      {mounted && isOpen && createPortal(
        <div className="fixed inset-0 z-50 flex flex-col justify-end md:justify-center md:items-center bg-slate-900/60 backdrop-blur-md p-0 md:p-4 transition-all">
          <div className="absolute inset-0" onClick={() => setIsOpen(false)}></div>
          <div className="bg-white rounded-t-[1.5rem] md:rounded-[2rem] shadow-[0_20px_60px_-15px_rgba(0,0,0,0.3)] w-full h-[90vh] md:max-w-2xl overflow-hidden flex flex-col relative z-10 animate-in slide-in-from-bottom-full md:slide-in-from-bottom-8 duration-500 ease-out border border-slate-100">
            
            <div className="px-6 py-5 border-b border-slate-100 bg-white flex items-center justify-between sticky top-0 z-20 shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-indigo-50 flex items-center justify-center border border-indigo-100">
                  <PlusCircle size={20} className="text-indigo-600" />
                </div>
                <h2 className="text-xl font-black text-slate-900 m-0 tracking-tight">Add Vehicle</h2>
              </div>
              <button 
                type="button"
                onClick={() => setIsOpen(false)}
                className="text-slate-400 hover:text-slate-700 bg-slate-50 hover:bg-slate-100 border-none cursor-pointer p-2 rounded-full transition-colors"
              >
                <X size={20} strokeWidth={2.5} />
              </button>
            </div>
            
            <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto min-h-0 p-6 flex flex-col gap-6" style={{ scrollbarWidth: 'thin' }}>
              {error && (
                <div className="bg-red-50 text-red-600 border border-red-200 p-3 rounded-lg text-sm font-bold flex items-center gap-2">
                  <AlertCircle size={16} />
                  {error}
                </div>
              )}

              <div className="flex items-center gap-3 bg-amber-50/50 p-4 rounded-xl border border-amber-200/60 shadow-[0_2px_10px_-4px_rgba(245,158,11,0.1)]">
                <input type="checkbox" name="isLegacy" id="isLegacy" className="w-5 h-5 text-amber-600 rounded border-amber-300 focus:ring-amber-500 focus:ring-offset-0 transition-all" />
                <label htmlFor="isLegacy" className="m-0 font-bold text-amber-800 cursor-pointer text-xs uppercase tracking-wider">Legacy Stock (Already here)</label>
              </div>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                <div className="flex flex-col gap-2">
                  <label className="text-[11px] uppercase tracking-wider font-bold text-slate-500">Make</label>
                  <input type="text" name="make" required placeholder="e.g. Maruti" className="w-full p-4 rounded-xl border border-transparent bg-slate-100 shadow-inner text-slate-900 text-[15px] outline-none focus:ring-4 focus:ring-indigo-500/15 focus:border-indigo-500 focus:bg-white font-bold transition-all" />
                </div>
                <div className="flex flex-col gap-2">
                  <label className="text-[11px] uppercase tracking-wider font-bold text-slate-500">Model</label>
                  <input type="text" name="model" required placeholder="e.g. Swift" className="w-full p-4 rounded-xl border border-transparent bg-slate-100 shadow-inner text-slate-900 text-[15px] outline-none focus:ring-4 focus:ring-indigo-500/15 focus:border-indigo-500 focus:bg-white font-bold transition-all" />
                </div>
              </div>

              <div className="flex flex-col gap-2">
                <label className="text-[11px] uppercase tracking-wider font-bold text-slate-500">Reg. Number</label>
                <input type="text" name="registration" required placeholder="e.g. GJ05DE1234" className="w-full p-4 rounded-xl border border-transparent bg-slate-100 shadow-inner text-slate-900 text-[15px] outline-none focus:ring-4 focus:ring-indigo-500/15 focus:border-indigo-500 focus:bg-white font-black uppercase tracking-wider transition-all" />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                <div className="flex flex-col gap-2">
                  <label className="text-[11px] uppercase tracking-wider font-bold text-indigo-700">Car Price (₹)</label>
                  <input 
                    type="text" 
                    inputMode="decimal"
                    name="purchasePrice" 
                    required 
                    placeholder="e.g. 1,50,000" 
                    value={purchasePrice}
                    onChange={handlePriceChange}
                    className="w-full p-4 rounded-xl border border-indigo-100 bg-white text-indigo-950 text-[16px] outline-none focus:ring-4 focus:ring-indigo-500/20 focus:border-indigo-500 shadow-[0_2px_10px_-4px_rgba(79,70,229,0.15)] font-black transition-all placeholder:text-indigo-200" 
                  />
                </div>
                <div className="flex flex-col gap-2">
                  <label className="text-[11px] uppercase tracking-wider font-bold text-slate-500">Purchase Date</label>
                  <input type="date" name="purchaseDate" required defaultValue={new Date().toISOString().split('T')[0]} className="w-full p-4 rounded-xl border border-transparent bg-slate-100 shadow-inner text-slate-700 text-[15px] outline-none focus:ring-4 focus:ring-indigo-500/15 focus:border-indigo-500 focus:bg-white font-bold transition-all" />
                </div>
              </div>

              <div className="bg-slate-50/50 p-5 rounded-2xl mt-3 border border-slate-100 flex flex-col gap-3">
                <p className="m-0 mb-1 text-xs uppercase tracking-wider font-bold text-slate-700">Auto-Deduct from Rojmel</p>
                
                <div className="grid grid-cols-3 gap-3">
                  <select 
                    name="payment1Mode" 
                    value={payment1Mode}
                    onChange={(e) => setPayment1Mode(e.target.value)}
                    className="w-full text-xs font-bold p-3 rounded-xl border-0 bg-slate-100 shadow-inner text-slate-700 outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
                  >
                    <option value="">No Entry</option>
                    <option value="CASH">Cash</option>
                    <option value="BANK">Bank</option>
                  </select>
                  <select name="payment1AccountId" className="w-full text-xs font-bold p-3 rounded-xl border-0 bg-slate-100 shadow-inner text-slate-700 outline-none focus:ring-2 focus:ring-indigo-500 transition-all">
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
                    className="w-full text-[13px] font-black p-3 rounded-xl border-0 bg-slate-100 shadow-inner text-slate-900 outline-none focus:ring-2 focus:ring-indigo-500 placeholder:font-semibold transition-all" 
                  />
                </div>

                <div className="grid grid-cols-3 gap-3">
                  <select 
                    name="payment2Mode" 
                    value={payment2Mode}
                    onChange={(e) => setPayment2Mode(e.target.value)}
                    className="w-full text-xs font-bold p-3 rounded-xl border-0 bg-slate-100 shadow-inner text-slate-700 outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
                  >
                    <option value="">No Entry</option>
                    <option value="CASH">Cash</option>
                    <option value="BANK">Bank</option>
                  </select>
                  <select name="payment2AccountId" className="w-full text-xs font-bold p-3 rounded-xl border-0 bg-slate-100 shadow-inner text-slate-700 outline-none focus:ring-2 focus:ring-indigo-500 transition-all">
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
                    className="w-full text-[13px] font-black p-3 rounded-xl border-0 bg-slate-100 shadow-inner text-slate-900 outline-none focus:ring-2 focus:ring-indigo-500 placeholder:font-semibold transition-all" 
                  />
                </div>

                <div className="mt-2 border-t border-slate-200/60 pt-4">
                  <div className="flex justify-between items-end mb-1">
                    <p className="m-0 text-[11px] uppercase tracking-wider font-bold text-amber-600">Pending Balance (Not Paid)</p>
                    {pendingBalance > 0 ? (
                      <strong className="text-amber-600 text-sm font-black tracking-tight">₹{pendingBalance.toLocaleString('en-IN')}</strong>
                    ) : (
                      <span className="text-slate-400 text-sm font-bold">₹0</span>
                    )}
                  </div>
                  <input type="hidden" name="payableAccountId" value="" />
                </div>
              </div>

              <div className="bg-purple-50/50 p-5 rounded-2xl mt-1 border border-purple-100 flex flex-col gap-3">
                <p className="m-0 mb-1 text-xs uppercase tracking-wider font-black text-purple-700">Partnership (Optional)</p>
                <div className="grid grid-cols-1 gap-3">
                  <select name="partnerAccountId" className="w-full text-[13px] font-bold p-3 rounded-xl border-0 bg-white shadow-[0_2px_10px_-4px_rgba(168,85,247,0.15)] text-purple-900 outline-none focus:ring-4 focus:ring-purple-500/20 focus:border-purple-500 transition-all">
                    <option value="">Select Partner / Dealer</option>
                    {accounts?.filter(a => a.type === 'PARTNER').map(acc => <option key={acc.id} value={acc.id}>{acc.name}</option>)}
                  </select>
                  <div className="flex gap-3">
                    <input 
                      type="text" 
                      inputMode="decimal"
                      name="partnerInvestment" 
                      placeholder="Investment (₹)" 
                      value={partnerInvestment}
                      onChange={handleInvestmentChange}
                      className="text-[13px] font-black flex-1 p-3 rounded-xl border-0 bg-white shadow-[0_2px_10px_-4px_rgba(168,85,247,0.15)] text-purple-900 outline-none focus:ring-4 focus:ring-purple-500/20 placeholder:text-purple-300 transition-all" 
                    />
                    <input 
                      type="text" 
                      inputMode="decimal"
                      name="profitSharePercentage" 
                      placeholder="Share (%)" 
                      value={profitSharePercentage}
                      onChange={handlePercentageChange}
                      className="text-[13px] font-black flex-1 p-3 rounded-xl border-0 bg-white shadow-[0_2px_10px_-4px_rgba(168,85,247,0.15)] text-purple-900 outline-none focus:ring-4 focus:ring-purple-500/20 placeholder:text-purple-300 transition-all" 
                    />
                  </div>
                </div>
              </div>

              <div className="sticky bottom-0 bg-white pt-4 mt-2 border-t border-slate-100 shrink-0 -mx-6 -mb-6 p-6">
                <button 
                  type="submit" 
                  disabled={isSubmitting}
                  className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3.5 px-4 rounded-xl shadow-sm transition-all focus:ring-4 focus:ring-indigo-500/20 disabled:opacity-70 flex items-center justify-center gap-2"
                >
                  <PlusCircle size={18} />
                  {isSubmitting ? 'Saving...' : 'Add to Stock'}
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
