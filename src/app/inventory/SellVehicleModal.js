'use client';
import { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { PlusCircle, Trash2, HandCoins, X, ChevronDown, Check } from 'lucide-react';
import { sellVehicle } from '@/actions/inventory';
import toast from 'react-hot-toast';
import VehicleSearchSelect from '@/components/VehicleSearchSelect';

function getLocalDateString() {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export default function SellVehicleModal({ inStock, accounts }) {
  const [isOpen, setIsOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [selectedVehicleId, setSelectedVehicleId] = useState('');
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  
  const [customerName, setCustomerName] = useState('');
  const [customerMobile, setCustomerMobile] = useState('');
  const [salePrice, setSalePrice] = useState('');
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
  const [appliedTokenId, setAppliedTokenId] = useState('');
  const [pendingBalance, setPendingBalance] = useState(0);
  const [warningState, setWarningState] = useState(null); // null, 'UDHARI', 'UDHARI_ACCEPTED'
  const [vehicleNeedingTokenConfirm, setVehicleNeedingTokenConfirm] = useState(null);

  // Derive the currently selected vehicle object to access its tokens
  const selectedVehicle = inStock.find(v => v.id === selectedVehicleId);

  const handleVehicleSelect = (car) => {
    setIsDropdownOpen(false);
    
    const hasActiveTokens = car.tokens && car.tokens.some(t => t.status === 'ACTIVE');
    
    if (!hasActiveTokens) {
      setVehicleNeedingTokenConfirm(car);
    } else {
      setSelectedVehicleId(car.id);
      setAppliedTokenId('');
    }
  };

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    const price = parseFloat((salePrice || '').toString().replace(/,/g, '')) || 0;
    const totalPayments = payments.reduce((sum, p) => sum + (parseFloat((p.amount || '').toString().replace(/,/g, '')) || 0), 0);
    
    // Add applied token amount to total paid
    let appliedTokenAmount = 0;
    if (appliedTokenId && selectedVehicle?.tokens) {
      const token = selectedVehicle.tokens.find(t => t.id === appliedTokenId);
      if (token) appliedTokenAmount = Number(token.amount);
    }
    
    const pending = Math.round((price - (totalPayments + appliedTokenAmount)) * 100) / 100;
    setPendingBalance(pending);
    setWarningState(null); // Reset confirm state if anything changes
  }, [salePrice, payments, appliedTokenId, selectedVehicle]);

  const addPayment = () => {
    setPayments([...payments, { id: Date.now(), mode: '', accountId: '', amount: '' }]);
  };

  const removePayment = (id) => {
    if (payments.length > 1) {
      setPayments(payments.filter(p => p.id !== id));
    }
  };

  const updatePayment = (id, field, value) => {
    const cashAcc = accounts?.find(a => a.type === 'CASH');
    setPayments(payments.map(p => {
      if (p.id !== id) return p;
      const updated = { ...p, [field]: value };
      if (field === 'mode' && value === 'CASH') {
        updated.accountId = cashAcc?.id || '';
      } else if (field === 'mode' && value !== 'CASH') {
        updated.accountId = '';
      }
      return updated;
    }));
  };
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const isSubmittingRef = useRef(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (isSubmittingRef.current) return;

    if (!selectedVehicleId) {
      toast.error("Please select a vehicle to sell.");
      return;
    }

    if (pendingBalance < 0) {
      toast.error("Total payments (including token) cannot exceed the Sale Price.");
      return;
    }
    
    const formData = new FormData(e.currentTarget);
    
    // Udhari Warning Check
    const receivableAccountId = formData.get('receivableAccountId');
    if (pendingBalance > 0 && !receivableAccountId && warningState !== 'UDHARI_ACCEPTED') {
      setWarningState('UDHARI');
      return;
    }
    
    isSubmittingRef.current = true;
    setIsSubmitting(true);

    try {
      const res = await sellVehicle(formData);
      if (res?.success) {
        toast.success("Vehicle sold successfully!");
        setIsOpen(false);
        setPayments([{ id: Date.now(), mode: '', accountId: '', amount: '' }]);
        setSalePrice('');
        setAppliedTokenId('');
        e.target.reset();
      } else if (res?.error) {
        toast.error(res.error);
      }
    } finally {
      isSubmittingRef.current = false;
      setIsSubmitting(false);
    }
  };

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className="flex flex-col md:flex-row items-center justify-center gap-1 md:gap-2 w-full px-2 py-2.5 md:px-4 bg-emerald-50 text-emerald-700 font-bold rounded-lg hover:bg-emerald-100 transition-all border border-emerald-200 shadow-sm whitespace-nowrap text-xs md:text-sm"
      >
        <HandCoins size={18} className="mb-0.5 md:mb-0 md:w-[18px] md:h-[18px]" />
        <span>Sell</span>
      </button>

      {mounted && isOpen && createPortal(
        <div className="fixed inset-0 z-50 flex flex-col justify-end md:justify-center md:items-center bg-slate-900/60 backdrop-blur-md p-0 md:p-4 transition-all">
          <div className="absolute inset-0" onClick={() => setIsOpen(false)}></div>
          <div className="bg-white rounded-t-[1.5rem] md:rounded-[2rem] shadow-[0_20px_60px_-15px_rgba(0,0,0,0.3)] w-full h-[90vh] md:h-[85vh] md:max-w-3xl overflow-hidden flex flex-col relative z-10 animate-in slide-in-from-bottom-full md:slide-in-from-bottom-8 duration-500 ease-out border border-slate-100">
            
            <div className="px-6 py-5 border-b border-slate-100 bg-white flex items-center justify-between sticky top-0 z-20 shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-emerald-50 flex items-center justify-center border border-emerald-100">
                  <HandCoins size={20} className="text-emerald-600" />
                </div>
                <h2 className="text-xl font-black text-slate-900 m-0 tracking-tight">Sell Vehicle</h2>
              </div>
              <button 
                type="button"
                onClick={() => {
                  setIsOpen(false);
                  setCustomerName('');
                  setCustomerMobile('');
                  setSalePrice('');
                  setAppliedTokenId('');
                  setSelectedVehicleId('');
                  setVehicleNeedingTokenConfirm(null);
                }}
                className="text-slate-400 hover:text-slate-700 bg-slate-50 hover:bg-slate-100 border-none cursor-pointer p-2 rounded-full transition-colors"
              >
                <X size={20} strokeWidth={2.5} />
              </button>
            </div>

            {vehicleNeedingTokenConfirm && (
                <div className="absolute inset-0 z-50 bg-white/95 backdrop-blur-sm flex items-center justify-center p-6 animate-in fade-in duration-300">
                  <div className="bg-white max-w-md w-full rounded-2xl shadow-[0_20px_60px_-15px_rgba(0,0,0,0.3)] border border-slate-100 overflow-hidden flex flex-col">
                    <div className="p-6 pb-0 flex flex-col items-center text-center">
                      <div className="w-16 h-16 bg-blue-50 text-blue-500 rounded-full flex items-center justify-center mb-4 border border-blue-100">
                        <HandCoins size={32} />
                      </div>
                      <h3 className="text-xl font-black text-slate-900 tracking-tight mb-2">No Token Received</h3>
                      <p className="text-slate-500 text-sm font-medium mb-6">
                        The vehicle <strong className="text-slate-700">{vehicleNeedingTokenConfirm.make} {vehicleNeedingTokenConfirm.model}</strong> has not received any token yet. 
                        Do you want to continue selling it directly, or wait and add a token first?
                      </p>
                    </div>
                    <div className="p-4 bg-slate-50 border-t border-slate-100 flex flex-col gap-2">
                      <button 
                        type="button"
                        onClick={() => {
                          setSelectedVehicleId(vehicleNeedingTokenConfirm.id);
                          setAppliedTokenId('');
                          setVehicleNeedingTokenConfirm(null);
                        }}
                        className="w-full py-3.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl transition-all shadow-sm flex items-center justify-center gap-2"
                      >
                        <Check size={18} /> Continue Without Token
                      </button>
                      <button 
                        type="button"
                        onClick={() => {
                          setVehicleNeedingTokenConfirm(null);
                          setIsOpen(false);
                        }}
                        className="w-full py-3.5 bg-white border border-slate-200 hover:bg-slate-50 hover:text-slate-900 text-slate-600 font-bold rounded-xl transition-all shadow-sm"
                      >
                        Cancel & Add Token
                      </button>
                    </div>
                  </div>
                </div>
              )}

            <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto min-h-0 p-6 flex flex-col gap-6 text-sm" style={{ scrollbarWidth: 'thin' }}>
              
              {/* Vehicle Selection & Basic Details Block */}
              <div className="bg-slate-50/50 p-4 md:p-6 rounded-2xl border border-slate-100 flex flex-col gap-5">
                <div className="relative">
                  <label className="text-[11px] uppercase font-bold text-slate-500 mb-2 block tracking-wider">Select Vehicle from Stock</label>
                  
                  {/* Custom Dropdown */}
                  <VehicleSearchSelect 
                    vehicles={inStock}
                    value={selectedVehicleId}
                    onChange={(id) => {
                      if (!id) {
                        setSelectedVehicleId('');
                        setVehicleNeedingTokenConfirm(null);
                        return;
                      }
                      const car = inStock.find(v => v.id === id);
                      if (car) handleVehicleSelect(car);
                    }}
                    placeholder="-- Choose a Vehicle --"
                    className="w-full p-4 rounded-xl text-slate-900 bg-slate-100 border-transparent shadow-inner focus-within:ring-4 focus-within:ring-emerald-500/15 focus-within:border-emerald-500 focus-within:bg-white transition-all"
                    required={true}
                    showCost={true}
                  />
                </div>

                {selectedVehicle && selectedVehicle.tokens && selectedVehicle.tokens.filter(t => t.status === 'ACTIVE').length > 0 && (
                  <div className="flex flex-col gap-2 mt-2 pt-4 border-t border-slate-200">
                    <label className="text-[11px] uppercase font-bold text-blue-600 tracking-wider">Apply Booking Token (Optional)</label>
                    <div className="relative">
                      <select 
                        name="appliedTokenId"
                        value={appliedTokenId}
                        onChange={(e) => {
                          const tokenId = e.target.value;
                          setAppliedTokenId(tokenId);
                          if (tokenId && selectedVehicle) {
                            const token = selectedVehicle.tokens.find(t => t.id === tokenId);
                            if (token) {
                              setCustomerName(token.customerName || '');
                              setCustomerMobile(token.customerMobile || '');
                              if (token.agreedSalePrice) {
                                setSalePrice(handleAmountFormat(token.agreedSalePrice));
                              }
                            }
                          } else {
                            setCustomerName('');
                            setCustomerMobile('');
                            setSalePrice('');
                          }
                        }}
                        className="w-full p-3.5 rounded-xl border border-blue-200 bg-blue-50/50 shadow-inner text-sm font-bold text-blue-900 outline-none focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-500/15 transition-all appearance-none"
                      >
                        <option value="">No Token Applied</option>
                        {selectedVehicle.tokens.filter(t => t.status === 'ACTIVE').map(token => (
                          <option key={token.id} value={token.id}>
                            {token.customerName} - ₹{Number(token.amount).toLocaleString('en-IN')}
                          </option>
                        ))}
                      </select>
                    </div>
                    <p className="text-[10px] text-blue-500 font-medium ml-1">Applying a token will automatically deduct its amount from the pending balance and auto-fill the customer details.</p>
                  </div>
                )}

                <div className="flex flex-col md:flex-row gap-4 items-start">
                  <div className="flex-1 w-full">
                    <label className="text-[11px] uppercase font-bold text-emerald-700 mb-2 block tracking-wider">Sale Price (₹)</label>
                    <input 
                      type="text" 
                      inputMode="decimal"
                      name="salePrice" 
                      placeholder="Final Price" 
                      required 
                      value={salePrice}
                      onChange={(e) => setSalePrice(handleAmountFormat(e.target.value))}
                      className="w-full p-4 rounded-xl border border-emerald-100 bg-white text-[16px] font-black outline-none focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/20 transition-all shadow-[0_2px_10px_-4px_rgba(16,185,129,0.2)] text-emerald-900 placeholder:text-emerald-200" 
                    />
                  </div>
                                      <div className="flex-1 w-full">
                      <label className="text-[11px] uppercase font-bold text-slate-500 mb-2 block tracking-wider">Sale Date</label>
                      <input type="date" name="saleDate" required defaultValue={getLocalDateString()} className="w-full p-4 rounded-xl border border-transparent bg-slate-100 shadow-inner text-[15px] font-semibold outline-none focus:border-emerald-500 focus:bg-white focus:ring-4 focus:ring-emerald-500/15 transition-all text-slate-700" />
                    </div>
                  </div>
                  
                  <div className="flex flex-col md:flex-row gap-4 mt-4">
                    <div className="flex-1">
                      <label className="text-[11px] uppercase font-bold text-slate-500 mb-2 block tracking-wider">Customer Name <span className="text-red-500">*</span></label>
                      <input type="text" name="customerName" required value={customerName} onChange={(e) => setCustomerName(e.target.value)} placeholder="Enter Customer Name" className="w-full p-4 rounded-xl border border-transparent bg-slate-100 shadow-inner text-[15px] font-semibold outline-none focus:border-emerald-500 focus:bg-white focus:ring-4 focus:ring-emerald-500/15 transition-all text-slate-700" />
                    </div>
                    <div className="flex-1">
                      <label className="text-[11px] uppercase font-bold text-slate-500 mb-2 block tracking-wider">Customer Mobile Number <span className="text-red-500">*</span></label>
                      <input type="text" name="customerMobile" required value={customerMobile} onChange={(e) => setCustomerMobile(e.target.value)} pattern="[0-9]{10}" title="Please enter a valid 10-digit mobile number" placeholder="Enter Mobile Number" maxLength={10} className="w-full p-4 rounded-xl border border-transparent bg-slate-100 shadow-inner text-[15px] font-semibold outline-none focus:border-emerald-500 focus:bg-white focus:ring-4 focus:ring-emerald-500/15 transition-all text-slate-700" />
                    </div>
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
                     <label className="text-[10px] uppercase font-bold text-amber-700 mb-2 block tracking-wider">Select Loan Agent / Financier (Optional for Direct Customer)</label>
                     <select name="receivableAccountId" className="w-full p-3 rounded-xl border border-amber-200 bg-white shadow-inner text-sm font-bold outline-none focus:border-amber-500 focus:ring-4 focus:ring-amber-500/20 text-amber-900 transition-all">
                      <option value="">-- Direct Customer Udhari --</option>
                      {accounts?.filter(a => a.type === 'DSA_AGENT' || a.type === 'FINANCIER').map(acc => (
                        <option key={acc.id} value={acc.id}>{acc.name} ({acc.type === 'FINANCIER' ? 'Financier' : 'Agent'})</option>
                      ))}
                    </select>
                  </div>
                )}
              </div>
              
              {/* Payments Section */}
              <div className="bg-slate-50/50 p-4 md:p-6 rounded-2xl border border-slate-100 flex flex-col gap-4">
                <div className="flex items-center justify-between pb-1">
                  <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Payments Received</div>
                  <button 
                    type="button" 
                    onClick={addPayment}
                    className="text-[11px] uppercase font-bold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition-colors shadow-sm border border-indigo-100"
                  >
                    <PlusCircle size={14} /> Add Payment
                  </button>
                </div>

                <div className="flex flex-col gap-3">
                  {payments.map((p, index) => (
                    <div key={p.id} className="bg-white p-3 rounded-xl border border-slate-200 flex flex-col md:flex-row md:items-center gap-3 shadow-[0_2px_10px_-4px_rgba(0,0,0,0.05)] hover:border-slate-300 transition-all">
                      <div className="flex-1">
                        <select 
                          name="paymentModes" 
                          value={p.mode}
                          onChange={(e) => updatePayment(p.id, 'mode', e.target.value)}
                          className="w-full p-3 rounded-lg border-0 bg-slate-100 shadow-inner text-sm font-semibold outline-none focus:ring-2 focus:ring-emerald-500 text-slate-700 transition-all"
                        >
                          <option value="">Mode</option>
                          <option value="CASH">Cash</option>
                          <option value="BANK">Bank</option>
                        </select>
                      </div>
                      <div className="flex-[1.5]">
                        {p.mode === 'CASH' ? (
                          <>
                            <div className="p-3 rounded-lg bg-emerald-50 border border-emerald-200 text-sm font-bold text-emerald-700">💵 Cash (Auto-selected)</div>
                            <input type="hidden" name="paymentAccountIds" value={accounts?.find(a => a.type === 'CASH')?.id || ''} />
                          </>
                        ) : (
                          <select 
                            name="paymentAccountIds" 
                            value={p.accountId}
                            onChange={(e) => updatePayment(p.id, 'accountId', e.target.value)}
                            className="w-full p-3 rounded-lg border-0 bg-slate-100 shadow-inner text-sm font-semibold outline-none focus:ring-2 focus:ring-emerald-500 text-slate-700 transition-all"
                          >
                            <option value="">Select Account...</option>
                            {accounts?.filter(acc => p.mode === 'BANK' ? acc.type === 'BANK' : (p.mode === '' ? true : acc.type === p.mode)).map(acc => <option key={acc.id} value={acc.id}>{acc.name}</option>)}
                          </select>
                        )}
                      </div>
                      <div className="flex-1">
                        <input 
                          type="text" 
                          inputMode="decimal"
                          name="paymentAmounts" 
                          placeholder="Amount" 
                          required 
                          value={p.amount || ''}
                          onChange={(e) => updatePayment(p.id, 'amount', handleAmountFormat(e.target.value))}
                          className="w-full p-3 rounded-lg border-0 bg-slate-100 shadow-inner text-sm font-bold outline-none focus:ring-2 focus:ring-emerald-500 text-slate-900 placeholder:font-medium transition-all" 
                        />
                      </div>
                      {payments.length > 1 && (
                        <button 
                          type="button" 
                          onClick={() => removePayment(p.id)}
                          className="p-3 text-slate-400 hover:bg-red-50 hover:text-red-600 rounded-lg transition-colors shrink-0"
                          title="Remove Payment"
                        >
                          <Trash2 size={18} />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              <div className="pt-4 border-t border-slate-100 flex justify-end gap-3 mt-2 shrink-0 bg-white sticky bottom-0 -mx-6 -mb-6 p-6">
                {!warningState || warningState === 'UDHARI_ACCEPTED' ? (
                  <>
                    <button 
                      type="button" 
                      onClick={() => setIsOpen(false)}
                      className="px-5 py-3 rounded-xl font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={isSubmitting || !selectedVehicleId || inStock?.length === 0}
                      className="px-6 py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold transition-all shadow-sm disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                    >
                      {isSubmitting ? 'Selling...' : (
                        <>
                          <HandCoins size={18} />
                          Confirm Sale
                        </>
                      )}
                    </button>
                  </>
                ) : (
                  <div className="flex flex-col sm:flex-row items-center justify-between w-full p-4 bg-amber-50 border border-amber-200 rounded-xl animate-in slide-in-from-bottom-2 duration-300">
                    <div className="mb-3 sm:mb-0">
                       <h3 className="text-amber-900 font-bold text-sm mb-1 flex items-center gap-1.5">
                         Customer Udhari Warning!
                       </h3>
                       <p className="text-amber-700 text-xs font-medium max-w-sm">
                         You did not select a Loan Agent. <strong className="text-amber-800">₹{pendingBalance.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</strong> will be kept pending on the customer's account. Are you OK to proceed?
                       </p>
                    </div>
                    <div className="flex gap-2 w-full sm:w-auto shrink-0">
                      <button 
                        type="button" 
                        onClick={() => setWarningState(null)}
                        className="flex-1 sm:flex-none px-4 py-2.5 rounded-lg font-bold text-amber-800 bg-amber-200/50 hover:bg-amber-200 transition-colors text-sm"
                      >
                        Wait, Go Back
                      </button>
                      <button
                        type="submit"
                        disabled={isSubmitting}
                        onClick={() => setWarningState('UDHARI_ACCEPTED')}
                        className="flex-1 sm:flex-none px-5 py-2.5 bg-amber-600 hover:bg-amber-700 text-white rounded-lg font-bold transition-all shadow-sm text-sm flex items-center gap-2"
                      >
                        {isSubmitting ? 'Confirming...' : (
                          <>
                            <Check size={16} /> Yes, I am OK
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </form>
          </div>
        </div>,
        document.body
      )}
    </>
  );
}
