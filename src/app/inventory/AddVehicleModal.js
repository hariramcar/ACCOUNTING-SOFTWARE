'use client';
import { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { PlusCircle, X, AlertCircle } from 'lucide-react';
import toast from 'react-hot-toast';
function getLocalDateString() {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export default function AddVehicleModal({ accounts, addVehicleAction }) {
  const [isOpen, setIsOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  const [purchasePrice, setPurchasePrice] = useState('');
  const [isLegacy, setIsLegacy] = useState(false);
  const [firmPayments, setFirmPayments] = useState([{ id: Date.now(), mode: '', accountId: '', amount: '' }]);

  const addFirmPayment = () => {
    setFirmPayments([...firmPayments, { id: Date.now(), mode: '', accountId: '', amount: '' }]);
  };
  
  const removeFirmPayment = (id) => {
    setFirmPayments(firmPayments.filter(p => p.id !== id));
  };
  
  const updateFirmPayment = (id, field, value) => {
    setFirmPayments(firmPayments.map(p => {
      if (p.id === id) {
        if (field === 'amount') return { ...p, amount: formatIndianNumber(value) };
        if (field === 'mode') return { ...p, mode: value, accountId: value === 'CASH' ? (accounts?.find(a => a.type === 'CASH')?.id || '') : '' };
        return { ...p, [field]: value };
      }
      return p;
    }));
  };

  const [partnerInvestment, setPartnerInvestment] = useState('');
  const [profitSharePercentage, setProfitSharePercentage] = useState('');
  const [partnerPaid1Amount, setPartnerPaid1Amount] = useState('');
  const [partnerPayment1Mode, setPartnerPayment1Mode] = useState('');
  const [partnerPaid2Amount, setPartnerPaid2Amount] = useState('');
  const [partnerPayment2Mode, setPartnerPayment2Mode] = useState('');
  
  const formatIndianNumber = (val) => {
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

  const handlePriceChange = (e) => setPurchasePrice(formatIndianNumber(e.target.value));

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
      - firmPayments.reduce((sum, p) => sum + (Number((p.amount || '').replace(/,/g, '')) || 0), 0)
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
    const regNum = formData.get('registration');
    if (regNum) {
      const regRegex = /^[A-Za-z]{2}[ -]?[0-9]{2}[ -]?[A-Za-z]{0,3}[ -]?[0-9]{4}$/;
      if (!regRegex.test(regNum.trim())) {
        toast.error('Invalid Registration Number format.');
        isSubmittingRef.current = false;
        setIsSubmitting(false);
        return;
      }
    }

    formData.append('purchasePrice', (purchasePrice || '0').replace(/,/g, ''));
    
    const firmPaymentsData = firmPayments.map(p => ({
      mode: p.mode,
      accountId: p.accountId,
      amount: parseFloat((p.amount || '0').replace(/,/g, ''))
    })).filter(p => p.amount > 0);
    formData.append('firmPaymentsJson', JSON.stringify(firmPaymentsData));

    formData.append('partnerInvestment', (partnerInvestment || '0').replace(/,/g, ''));

    const partnerId = formData.get('partnerAccountId');
    const pInv = parseFloat((partnerInvestment || '0').replace(/,/g, ''));
    const pShare = parseFloat(formData.get('profitSharePercentage') || '0');

    if (partnerId || pInv > 0 || pShare > 0) {
      if (!partnerId) {
        toast.error('Please select a Partner Account in the Partnership section.');
        isSubmittingRef.current = false;
        setIsSubmitting(false);
        return;
      }
      if (pInv <= 0) {
        toast.error('Please enter a valid Partner Investment amount.');
        isSubmittingRef.current = false;
        setIsSubmitting(false);
        return;
      }
      if (pShare <= 0) {
        toast.error('Please enter a valid Profit Share Percentage.');
        isSubmittingRef.current = false;
        setIsSubmitting(false);
        return;
      }
    }
    
    try {
      const result = await addVehicleAction(formData);

      if (result && !result.success) {
        toast.error(result.error || 'Failed to add vehicle');
      } else {
        toast.success('Vehicle added successfully!');
        setIsOpen(false);
        setPurchasePrice('');
        setFirmPayments([{ id: Date.now(), mode: '', accountId: '', amount: '' }]);
        setPartnerInvestment('');
        setProfitSharePercentage('');
        setPartnerPaid1Amount('');
        setPartnerPayment1Mode('');
        setPartnerPaid2Amount('');
        setPartnerPayment2Mode('');
        setIsLegacy(false);
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
        className="flex flex-col md:flex-row items-center justify-center gap-1 md:gap-2 w-full px-2 py-2.5 md:px-4 bg-slate-900 text-white font-bold rounded-lg hover:bg-slate-800 transition-all shadow-md whitespace-nowrap text-xs md:text-sm"
      >
        <PlusCircle size={18} className="mb-0.5 md:mb-0 md:w-[18px] md:h-[18px]" />
        <span>Add</span>
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
                <input 
                  type="checkbox" 
                  name="isLegacy" 
                  id="isLegacy" 
                  checked={isLegacy}
                  onChange={(e) => setIsLegacy(e.target.checked)}
                  className="w-5 h-5 text-amber-600 rounded border-amber-300 focus:ring-amber-500 focus:ring-offset-0 transition-all" 
                />
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
                <div className={`flex flex-col gap-2 ${isLegacy ? 'sm:col-span-2' : ''}`}>
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
                {!isLegacy && (
                  <div className="flex flex-col gap-2">
                    <label className="text-[11px] uppercase tracking-wider font-bold text-slate-500">Purchase Date</label>
                    <input type="date" name="purchaseDate" required defaultValue={getLocalDateString()} className="w-full p-4 rounded-xl border border-transparent bg-slate-100 shadow-inner text-slate-700 text-[15px] outline-none focus:ring-4 focus:ring-indigo-500/15 focus:border-indigo-500 focus:bg-white font-bold transition-all" />
                  </div>
                )}
              </div>
              
              {!isLegacy && (
                <div className="bg-slate-50/50 p-5 rounded-2xl mt-3 border border-slate-100 flex flex-col gap-3">
                  <p className="m-0 mb-1 text-xs uppercase tracking-wider font-bold text-slate-700">Auto-Deduct from Rojmel</p>
                  
                  {firmPayments.map((p, idx) => (
                    <div key={p.id} className="flex gap-2 mb-3">
                      <div className="grid grid-cols-3 gap-2 flex-1">
                        <select 
                          value={p.mode}
                          onChange={(e) => updateFirmPayment(p.id, 'mode', e.target.value)}
                          className="w-full text-xs font-bold p-3 rounded-xl border-0 bg-slate-100 shadow-inner text-slate-700 outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
                        >
                          <option value="">No Entry</option>
                          <option value="CASH">Cash</option>
                          <option value="BANK">Bank</option>
                          <option value="AGENT">Agent/Financier</option>
                        </select>
                        {p.mode === 'CASH' ? (
                          <div className="w-full text-xs font-bold p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-700 flex items-center">💵 Cash (Auto)</div>
                        ) : (
                          <select 
                            value={p.accountId}
                            onChange={(e) => updateFirmPayment(p.id, 'accountId', e.target.value)}
                            required={!!p.amount || !!p.mode} 
                            className="w-full text-xs font-bold p-3 rounded-xl border-0 bg-slate-100 shadow-inner text-slate-700 outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
                          >
                            <option value="">Account...</option>
                            {accounts?.filter(acc => p.mode === '' || (p.mode === 'AGENT' ? (acc.type === 'DSA_AGENT' || acc.type === 'FINANCIER') : acc.type === p.mode)).map(acc => <option key={acc.id} value={acc.id}>{acc.name}</option>)}
                          </select>
                        )}
                        <input 
                          type="text" 
                          inputMode="decimal"
                          placeholder="Amount (₹)" 
                          value={p.amount}
                          onChange={(e) => updateFirmPayment(p.id, 'amount', e.target.value)}
                          className="w-full text-[13px] font-black p-3 rounded-xl border-0 bg-slate-100 shadow-inner text-slate-900 outline-none focus:ring-2 focus:ring-indigo-500 placeholder:font-semibold transition-all" 
                        />
                      </div>
                      {idx > 0 && (
                        <button 
                          type="button" 
                          onClick={() => removeFirmPayment(p.id)}
                          className="shrink-0 w-11 flex items-center justify-center rounded-xl bg-red-50 text-red-500 hover:bg-red-100 hover:text-red-600 transition-colors"
                        >
                          <X size={16} strokeWidth={2.5} />
                        </button>
                      )}
                    </div>
                  ))}
                  <button 
                    type="button" 
                    onClick={addFirmPayment}
                    className="text-xs font-bold text-indigo-600 bg-indigo-50/80 hover:bg-indigo-100/80 p-2.5 rounded-xl transition-colors border border-indigo-100 w-full flex items-center justify-center gap-1.5"
                  >
                    <PlusCircle size={14} /> Add Payment Source
                  </button>

                  <div className="mt-2 border-t border-slate-200/60 pt-4">
                    <div className="flex justify-between items-end mb-3">
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
              )}

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
                  {!isLegacy && (
                    <div className="flex flex-col gap-3 mt-1 pt-3 border-t border-purple-200/50">
                      <p className="m-0 text-[10px] uppercase tracking-wider font-bold text-purple-700">Payment Received from Partner</p>
                      
                      <div className="grid grid-cols-3 gap-3">
                        <select 
                          name="partnerPayment1Mode"
                          value={partnerPayment1Mode}
                          onChange={(e) => setPartnerPayment1Mode(e.target.value)}
                          className="w-full text-[13px] font-bold p-3 rounded-xl border-0 bg-white shadow-[0_2px_10px_-4px_rgba(168,85,247,0.15)] text-purple-900 outline-none focus:ring-4 focus:ring-purple-500/20 transition-all"
                        >
                          <option value="">No Entry</option>
                          <option value="CASH">Cash</option>
                          <option value="BANK">Bank</option>
                        </select>
                        {partnerPayment1Mode === 'CASH' ? (
                          <>
                            <div className="w-full text-[13px] font-bold p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-700">💵 Cash (Auto)</div>
                            <input type="hidden" name="partnerPayment1AccountId" value={accounts?.find(a => a.type === 'CASH')?.id || ''} />
                          </>
                        ) : (
                          <select name="partnerPayment1AccountId" required={!!partnerPaid1Amount || !!partnerPayment1Mode} className="w-full text-[13px] font-bold p-3 rounded-xl border-0 bg-white shadow-[0_2px_10px_-4px_rgba(168,85,247,0.15)] text-purple-900 outline-none focus:ring-4 focus:ring-purple-500/20 transition-all">
                            <option value="">Account...</option>
                            {accounts?.filter(acc => partnerPayment1Mode === '' || acc.type === partnerPayment1Mode).map(acc => (
                              <option key={acc.id} value={acc.id}>{acc.name}</option>
                            ))}
                          </select>
                        )}
                        <input 
                          type="text" 
                          inputMode="decimal"
                          name="partnerPaid1Amount"
                          placeholder="Amt 1 (₹)"
                          value={partnerPaid1Amount}
                          onChange={(e) => setPartnerPaid1Amount(formatIndianNumber(e.target.value))}
                          className="w-full text-[13px] font-black p-3 rounded-xl border-0 bg-white shadow-[0_2px_10px_-4px_rgba(168,85,247,0.15)] text-purple-900 outline-none focus:ring-4 focus:ring-purple-500/20 placeholder:text-purple-300 transition-all"
                        />
                      </div>

                      <div className="grid grid-cols-3 gap-3">
                        <select 
                          name="partnerPayment2Mode"
                          value={partnerPayment2Mode}
                          onChange={(e) => setPartnerPayment2Mode(e.target.value)}
                          className="w-full text-[13px] font-bold p-3 rounded-xl border-0 bg-white shadow-[0_2px_10px_-4px_rgba(168,85,247,0.15)] text-purple-900 outline-none focus:ring-4 focus:ring-purple-500/20 transition-all"
                        >
                          <option value="">No Entry</option>
                          <option value="CASH">Cash</option>
                          <option value="BANK">Bank</option>
                        </select>
                        {partnerPayment2Mode === 'CASH' ? (
                          <>
                            <div className="w-full text-[13px] font-bold p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-700">💵 Cash (Auto)</div>
                            <input type="hidden" name="partnerPayment2AccountId" value={accounts?.find(a => a.type === 'CASH')?.id || ''} />
                          </>
                        ) : (
                          <select name="partnerPayment2AccountId" required={!!partnerPaid2Amount || !!partnerPayment2Mode} className="w-full text-[13px] font-bold p-3 rounded-xl border-0 bg-white shadow-[0_2px_10px_-4px_rgba(168,85,247,0.15)] text-purple-900 outline-none focus:ring-4 focus:ring-purple-500/20 transition-all">
                            <option value="">Account...</option>
                            {accounts?.filter(acc => partnerPayment2Mode === '' || acc.type === partnerPayment2Mode).map(acc => (
                              <option key={acc.id} value={acc.id}>{acc.name}</option>
                            ))}
                          </select>
                        )}
                        <input 
                          type="text" 
                          inputMode="decimal"
                          name="partnerPaid2Amount"
                          placeholder="Amt 2 (₹)"
                          value={partnerPaid2Amount}
                          onChange={(e) => setPartnerPaid2Amount(formatIndianNumber(e.target.value))}
                          className="w-full text-[13px] font-black p-3 rounded-xl border-0 bg-white shadow-[0_2px_10px_-4px_rgba(168,85,247,0.15)] text-purple-900 outline-none focus:ring-4 focus:ring-purple-500/20 placeholder:text-purple-300 transition-all"
                        />
                      </div>
                    </div>
                  )}
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
