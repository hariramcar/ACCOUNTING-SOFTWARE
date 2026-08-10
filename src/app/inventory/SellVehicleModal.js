'use client';

import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { PlusCircle, Trash2, HandCoins, X, ChevronDown, Check } from 'lucide-react';
import { sellVehicle } from '@/actions/inventory';

export default function SellVehicleModal({ inStock, accounts }) {
  const [isOpen, setIsOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [selectedVehicleId, setSelectedVehicleId] = useState('');
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  
  const [salePrice, setSalePrice] = useState('');
  const [payments, setPayments] = useState([{ id: Date.now(), mode: '', accountId: '', amount: '' }]);
  const [pendingBalance, setPendingBalance] = useState(0);

  useEffect(() => {
    setMounted(true);
  }, []);

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
                onClick={() => setIsOpen(false)}
                className="text-slate-400 hover:text-slate-700 bg-slate-50 hover:bg-slate-100 border-none cursor-pointer p-2 rounded-full transition-colors"
              >
                <X size={20} strokeWidth={2.5} />
              </button>
            </div>

            <form action={sellVehicle} onSubmit={handleSubmit} className="flex-1 overflow-y-auto min-h-0 p-6 flex flex-col gap-6 text-sm" style={{ scrollbarWidth: 'thin' }}>
              
              {/* Vehicle Selection & Basic Details Block */}
              <div className="bg-slate-50/50 p-4 md:p-6 rounded-2xl border border-slate-100 flex flex-col gap-5">
                <div className="relative">
                  <label className="text-[11px] uppercase font-bold text-slate-500 mb-2 block tracking-wider">Select Vehicle from Stock</label>
                  
                  {/* Custom Dropdown */}
                  <div 
                    onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                    className={`w-full p-4 rounded-xl border ${isDropdownOpen ? 'border-emerald-500 bg-white ring-4 ring-emerald-500/15' : 'border-transparent bg-slate-100 shadow-inner'} text-slate-900 cursor-pointer flex justify-between items-center transition-all`}
                  >
                    {selectedVehicleId ? (
                      (() => {
                        const car = inStock?.find(c => c.id === selectedVehicleId);
                        return car ? (
                          <div className="flex flex-col gap-0.5">
                            <span className="font-bold text-[15px]">{car.make} {car.model}</span>
                            <span className="text-xs text-slate-500 font-medium">Cost: ₹{car.totalCost.toLocaleString('en-IN')} {car.registration ? `• ${car.registration}` : ''}</span>
                          </div>
                        ) : <span className="text-slate-400 font-medium text-[15px]">-- Choose a Vehicle --</span>;
                      })()
                    ) : (
                      <span className="text-slate-400 font-medium text-[15px]">-- Choose a Vehicle --</span>
                    )}
                    <ChevronDown size={18} className={`text-slate-400 transition-transform ${isDropdownOpen ? 'rotate-180' : ''}`} />
                  </div>

                  {/* Dropdown Options */}
                  {isDropdownOpen && (
                    <div className="absolute z-30 top-full mt-2 left-0 right-0 max-h-64 overflow-y-auto bg-white rounded-xl shadow-[0_10px_40px_-10px_rgba(0,0,0,0.2)] border border-slate-100 p-2 flex flex-col gap-1">
                      {inStock?.length === 0 ? (
                        <div className="p-4 text-center text-sm font-medium text-slate-500">No vehicles in stock</div>
                      ) : (
                        inStock?.map(car => (
                          <div 
                            key={car.id} 
                            onClick={() => {
                              setSelectedVehicleId(car.id);
                              setIsDropdownOpen(false);
                            }}
                            className={`p-3 rounded-lg cursor-pointer flex flex-col gap-1.5 transition-colors ${selectedVehicleId === car.id ? 'bg-emerald-50 border border-emerald-100' : 'hover:bg-slate-50 border border-transparent'}`}
                          >
                            <div className="flex justify-between items-start gap-2">
                              <span className={`font-bold text-sm ${selectedVehicleId === car.id ? 'text-emerald-900' : 'text-slate-900'}`}>{car.make} {car.model}</span>
                              <span className="text-xs font-black text-emerald-600 shrink-0">₹{car.totalCost.toLocaleString('en-IN')}</span>
                            </div>
                            {car.registration && (
                              <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400 bg-slate-100 px-2 py-0.5 rounded w-fit">{car.registration}</span>
                            )}
                          </div>
                        ))
                      )}
                    </div>
                  )}

                  {/* Hidden Input for Form Submission */}
                  <input type="hidden" name="vehicleId" value={selectedVehicleId} required />
                  
                  {/* Invisible overlay to close dropdown when clicking outside */}
                  {isDropdownOpen && (
                    <div className="fixed inset-0 z-20" onClick={() => setIsDropdownOpen(false)}></div>
                  )}
                </div>

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
                      onChange={(e) => setSalePrice(e.target.value.replace(/,/g, ''))}
                      className="w-full p-4 rounded-xl border border-emerald-100 bg-white text-[16px] font-black outline-none focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/20 transition-all shadow-[0_2px_10px_-4px_rgba(16,185,129,0.2)] text-emerald-900 placeholder:text-emerald-200" 
                    />
                  </div>
                  <div className="flex-1 w-full">
                    <label className="text-[11px] uppercase font-bold text-slate-500 mb-2 block tracking-wider">Sale Date</label>
                    <input type="date" name="saleDate" required defaultValue={new Date().toISOString().split('T')[0]} className="w-full p-4 rounded-xl border border-transparent bg-slate-100 shadow-inner text-[15px] font-semibold outline-none focus:border-emerald-500 focus:bg-white focus:ring-4 focus:ring-emerald-500/15 transition-all text-slate-700" />
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
                     <label className="text-[10px] uppercase font-bold text-amber-700 mb-2 block tracking-wider">Select Agent Account (For Pending Baki/Advance)</label>
                     <select name="receivableAccountId" required className="w-full p-3 rounded-xl border border-amber-200 bg-white shadow-inner text-sm font-bold outline-none focus:border-amber-500 focus:ring-4 focus:ring-amber-500/20 text-amber-900 transition-all">
                      <option value="">Select Account</option>
                      {accounts?.filter(a => a.type === 'DSA_AGENT').map(acc => (
                        <option key={acc.id} value={acc.id}>{acc.name}</option>
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
                        <select 
                          name="paymentAccountIds" 
                          value={p.accountId}
                          onChange={(e) => updatePayment(p.id, 'accountId', e.target.value)}
                          className="w-full p-3 rounded-lg border-0 bg-slate-100 shadow-inner text-sm font-semibold outline-none focus:ring-2 focus:ring-emerald-500 text-slate-700 transition-all"
                        >
                          <option value="">Account...</option>
                          {accounts?.filter(acc => p.mode === '' || acc.type === p.mode).map(acc => <option key={acc.id} value={acc.id}>{acc.name}</option>)}
                        </select>
                      </div>
                      <div className="flex-1">
                        <input 
                          type="text" 
                          inputMode="decimal"
                          name="paymentAmounts" 
                          placeholder="Amount" 
                          required 
                          value={p.amount || ''}
                          onChange={(e) => updatePayment(p.id, 'amount', e.target.value.replace(/,/g, ''))}
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
                <button 
                  type="button" 
                  onClick={() => setIsOpen(false)}
                  className="px-5 py-3 rounded-xl font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 transition-colors"
                >
                  Cancel
                </button>
                <button 
                  type="submit"
                  disabled={!selectedVehicleId || inStock?.length === 0}
                  className="px-6 py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold transition-all shadow-sm disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                >
                  <HandCoins size={18} />
                  Confirm Sale
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
