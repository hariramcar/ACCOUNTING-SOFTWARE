'use client';

import { useState } from 'react';
import { X, Calendar, Wrench, Handshake, IndianRupee, FileText, AlertCircle } from 'lucide-react';
import { payVehiclePendingBalance } from '@/actions/inventory';

export default function VehicleDetailsModal({ car, isOpen, onClose, accounts = [] }) {
  const [isPaying, setIsPaying] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [amount, setAmount] = useState('');
  const [sourceAccountId, setSourceAccountId] = useState('');
  const [error, setError] = useState(null);

  if (!isOpen || !car) return null;

  const handlePayPending = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);
    
    const formData = new FormData();
    formData.append('vehicleId', car.id);
    formData.append('amount', amount);
    formData.append('sourceAccountId', sourceAccountId);

    const result = await payVehiclePendingBalance(formData);
    if (result && !result.success) {
      setError(result.error);
      setIsSubmitting(false);
    } else {
      setIsSubmitting(false);
      setIsPaying(false);
      setAmount('');
      setSourceAccountId('');
      onClose(); // Close modal to refresh
    }
  };

  const legacyRepairs = Number(car.legacyExpenses || 0);
  const totalRepairs = (car.expenses || []).reduce((sum, exp) => sum + Number(exp.amount), 0);
  const calculatedTotalCost = Number(car.purchasePrice) + totalRepairs + legacyRepairs;

  return (
    <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-end z-50 transition-all">
      <div 
        className="bg-slate-50 w-full max-w-md h-full shadow-2xl flex flex-col animate-in slide-in-from-right duration-300 border-l border-slate-200"
      >
        {/* Header */}
        <div className="px-6 py-5 border-b border-slate-200 bg-white flex justify-between items-start shrink-0">
          <div>
            <h2 className="text-2xl font-black text-slate-900 tracking-tight m-0 mb-1">
              {car.make} {car.model}
            </h2>
            <div className="flex gap-2 items-center">
              <span className="text-xs bg-slate-100 border border-slate-200 px-2 py-0.5 rounded font-bold text-slate-500 uppercase tracking-widest">
                {car.registration || 'UNREGISTERED'}
              </span>
              {car.isLegacy && <span className="bg-amber-100 text-amber-700 px-2 py-0.5 rounded text-[10px] uppercase tracking-wider font-bold">Legacy</span>}
            </div>
          </div>
          <button 
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 p-1.5 rounded-full hover:bg-slate-100 transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">

          {/* Sale Information (If Sold) */}
          {car.status === 'SOLD' && (
            <div className="bg-indigo-900 rounded-xl border border-indigo-800 shadow-lg overflow-hidden">
              <div className="p-4 border-b border-indigo-800 flex items-center gap-3">
                <div className="p-2 bg-indigo-800 text-indigo-300 rounded-lg">
                  <IndianRupee size={20} />
                </div>
                <div>
                  <div className="text-[10px] font-bold text-indigo-300 uppercase tracking-wider">Vehicle Sold For</div>
                  <div className="text-2xl font-black text-white">₹{Number(car.salePrice).toLocaleString('en-IN')}</div>
                </div>
              </div>
              
              <div className="bg-indigo-950 p-4 grid grid-cols-2 gap-4">
                <div>
                  <div className="text-[9px] font-bold text-indigo-300 uppercase tracking-wider mb-1">Net Profit</div>
                  <div className="font-black text-lg text-emerald-400">₹{Number(car.profit).toLocaleString('en-IN')}</div>
                </div>
                {car.partnerShare > 0 && (
                  <div>
                    <div className="text-[9px] font-bold text-indigo-300 uppercase tracking-wider mb-1">Partner Profit Share</div>
                    <div className="font-bold text-sm text-purple-400">- ₹{Number(car.partnerShare).toLocaleString('en-IN')}</div>
                    <div className="text-xs font-bold text-emerald-300 mt-1">Our Share: ₹{Number(car.netOurProfit).toLocaleString('en-IN')}</div>
                  </div>
                )}
              </div>
            </div>
          )}
          
          {/* Main Financials Card */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="p-4 border-b border-slate-100 flex items-center gap-3">
              <div className="p-2 bg-emerald-100 text-emerald-600 rounded-lg">
                <IndianRupee size={20} />
              </div>
              <div>
                <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Total Investment (Cost)</div>
                <div className="text-xl font-black text-slate-900">₹{(car.totalCost || calculatedTotalCost).toLocaleString('en-IN')}</div>
              </div>
            </div>
            
            <div className="bg-slate-50 p-4 flex flex-col gap-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:divide-x divide-slate-200">
                <div>
                  <div className="text-[9px] font-bold text-slate-500 uppercase tracking-wider mb-1">Purchase Price</div>
                  <div className="font-bold text-sm text-slate-700">₹{car.purchasePrice.toLocaleString('en-IN')}</div>
                  {car.purchaseDate && (
                    <div className="text-[10px] text-slate-500 flex items-center gap-1 mt-1">
                      <Calendar size={10} /> {new Date(car.purchaseDate).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
                    </div>
                  )}
                </div>
                <div className="sm:pl-4">
                  <div className="text-[9px] font-bold text-slate-500 uppercase tracking-wider mb-1">Total Repairs</div>
                  <div className="font-bold text-sm text-red-500">+ ₹{(totalRepairs + legacyRepairs).toLocaleString('en-IN')}</div>
                </div>
              </div>

              {Number(car.purchasePendingBalance) > 0 && (
                <div className="p-4 bg-amber-50 rounded-xl border border-amber-200/60 w-full shadow-sm mt-1">
                  <div className="flex justify-between items-center mb-1">
                    <div className="text-[9px] font-bold text-amber-600 uppercase tracking-widest">Pending (Not Paid)</div>
                    {!isPaying && (
                      <button 
                        onClick={() => { setIsPaying(true); setAmount(car.purchasePendingBalance.toString()); }}
                        className="text-[10px] font-bold bg-amber-100 text-amber-700 px-3 py-1.5 rounded-md hover:bg-amber-200 transition-colors"
                      >
                        Pay Now
                      </button>
                    )}
                  </div>
                  <div className="text-base font-black text-amber-700 mb-2">₹{Number(car.purchasePendingBalance).toLocaleString('en-IN')}</div>
                  
                  {isPaying && (
                    <form onSubmit={handlePayPending} className="flex flex-col gap-3 mt-4 pt-4 border-t border-amber-200/60">
                      {error && <div className="text-[10px] text-red-600 bg-red-50 p-2 rounded-md">{error}</div>}
                      <select 
                        required
                        value={sourceAccountId}
                        onChange={(e) => setSourceAccountId(e.target.value)}
                        className="text-sm p-2 rounded-lg border border-amber-300 bg-white font-medium outline-none focus:ring-4 focus:ring-amber-500/10 focus:border-amber-500"
                      >
                        <option value="">Pay From (Cash/Bank)...</option>
                        {accounts.filter(a => ['CASH', 'BANK'].includes(a.type)).map(acc => (
                          <option key={acc.id} value={acc.id}>{acc.name}</option>
                        ))}
                      </select>
                      <input 
                        type="text"
                        inputMode="decimal"
                        required
                        value={amount}
                        onChange={(e) => setAmount(e.target.value.replace(/,/g, ''))}
                        className="text-sm p-2 rounded-lg border border-amber-300 bg-white font-bold outline-none focus:ring-4 focus:ring-amber-500/10 focus:border-amber-500"
                        placeholder="Amount to pay"
                      />
                      <div className="flex flex-col gap-2 mt-2">
                        <button type="submit" disabled={isSubmitting} className="w-full bg-amber-600 hover:bg-amber-700 text-white text-sm font-bold py-2.5 rounded-lg transition-colors">
                          {isSubmitting ? 'Processing...' : 'Confirm Payment'}
                        </button>
                        <button type="button" onClick={() => setIsPaying(false)} className="w-full py-2.5 text-slate-500 hover:text-slate-700 hover:bg-amber-100/50 rounded-lg text-xs font-bold transition-colors">
                          Cancel
                        </button>
                      </div>
                    </form>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Partner Details */}
          {car.partnerships && car.partnerships.length > 0 && (
            <div>
              <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3 flex items-center gap-2">
                <Handshake size={14} /> Partnership Details
              </h3>
              <div className="space-y-3">
                {car.partnerships.map(p => (
                  <div key={p.id} className="bg-purple-50/50 border border-purple-100 rounded-xl p-4 flex justify-between items-center">
                    <div>
                      <div className="font-bold text-purple-900">{p.partnerAccount?.name || 'Unknown Partner'}</div>
                      <div className="text-xs font-medium text-purple-600 mt-0.5">
                        {p.profitSharePercentage}% Profit Share
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-[9px] font-bold text-purple-400 uppercase tracking-wider">Invested</div>
                      <div className="font-bold text-sm text-purple-700">₹{Number(p.investmentAmount).toLocaleString('en-IN')}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Repair Details */}
          <div>
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3 flex items-center gap-2">
              <Wrench size={14} /> Repair & Expense Log
            </h3>
            
            {(!car.expenses || car.expenses.length === 0) && !car.isLegacy ? (
              <div className="bg-slate-50 border border-slate-200 border-dashed rounded-xl p-6 text-center text-sm font-medium text-slate-500">
                No repairs or expenses recorded yet.
              </div>
            ) : (
              <div className="bg-white rounded-xl border border-slate-200 shadow-sm divide-y divide-slate-100 overflow-hidden">
                {car.isLegacy && legacyRepairs > 0 && (
                  <div className="p-4 flex justify-between items-center bg-amber-50/30">
                    <div className="flex items-center gap-3">
                      <div className="p-1.5 bg-amber-100 text-amber-600 rounded-md">
                        <FileText size={14} />
                      </div>
                      <div>
                        <div className="font-bold text-sm text-slate-700">Legacy Repairs</div>
                        <div className="text-xs text-slate-500">Imported total</div>
                      </div>
                    </div>
                    <div className="font-bold text-sm text-amber-600">
                      ₹{legacyRepairs.toLocaleString('en-IN')}
                    </div>
                  </div>
                )}
                
                {car.expenses?.map(exp => (
                  <div key={exp.id} className="p-4 flex justify-between items-center">
                    <div className="flex items-center gap-3">
                      <div className="p-1.5 bg-red-50 text-red-500 rounded-md">
                        <Wrench size={14} />
                      </div>
                      <div>
                        <div className="font-bold text-sm text-slate-700">{exp.description || 'Repair Expense'}</div>
                        <div className="text-[10px] text-slate-400 mt-0.5">
                          {new Date(exp.date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
                        </div>
                      </div>
                    </div>
                    <div className="font-bold text-sm text-red-500">
                      ₹{Number(exp.amount).toLocaleString('en-IN')}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

        </div>
      </div>
    </div>
  );
}
