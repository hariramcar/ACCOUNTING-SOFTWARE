'use client';

import { useState } from 'react';
import { CreditCard, X, AlertCircle, HandCoins } from 'lucide-react';
import { payPendingBalance } from '@/actions/profit';

export default function PendingPayablesModal({ payables, accounts, onPaymentSuccess }) {
  const [isOpen, setIsOpen] = useState(false);
  const [payingVehicleId, setPayingVehicleId] = useState(null);
  const [amount, setAmount] = useState('');
  const [paymentAccountId, setPaymentAccountId] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState(null);

  const totalPending = payables.reduce((sum, p) => sum + p.pendingBalance, 0);

  const handlePay = async (e, vehicleId) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);

    const formData = new FormData();
    formData.append('vehicleId', vehicleId);
    formData.append('amount', amount);
    
    // Find mode based on selected account
    const selectedAccount = accounts.find(a => a.id === paymentAccountId);
    formData.append('mode', selectedAccount ? selectedAccount.type : 'CASH');
    formData.append('paymentAccountId', paymentAccountId);

    const result = await payPendingBalance(formData);
    
    if (result.success) {
      setPayingVehicleId(null);
      setAmount('');
      onPaymentSuccess(); // trigger a re-fetch
    } else {
      setError(result.error);
    }
    
    setIsSubmitting(false);
  };

  return (
    <>
      <div 
        onClick={() => setIsOpen(true)}
        className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm relative overflow-hidden group hover:shadow-md transition-all cursor-pointer"
      >
        <div className="absolute right-0 top-0 w-24 h-24 bg-rose-50 rounded-bl-full -mr-4 -mt-4 transition-transform group-hover:scale-110"></div>
        <h3 className="m-0 mb-3 text-slate-500 text-xs uppercase font-bold tracking-wider relative z-10">Total Pending Payables</h3>
        <strong className="text-3xl text-rose-600 font-extrabold relative z-10 block mb-1">₹{totalPending.toLocaleString('en-IN')}</strong>
        <div className="text-xs text-rose-500 font-bold relative z-10 flex items-center gap-1 mt-2">
          <span className="bg-rose-100 px-2 py-1 rounded">Click to View & Pay &rarr;</span>
        </div>
      </div>

      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm overflow-y-auto">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-3xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="px-6 py-4 border-b border-slate-100 bg-slate-50 flex items-center justify-between sticky top-0 z-10">
              <div className="flex items-center gap-2">
                <HandCoins size={20} className="text-rose-600" />
                <h2 className="text-lg font-bold text-slate-900 m-0">Pending Car Payments (Udhari)</h2>
              </div>
              <button 
                onClick={() => setIsOpen(false)}
                className="text-slate-400 hover:text-slate-700 bg-transparent border-none cursor-pointer p-1 rounded-md hover:bg-slate-200 transition-colors"
              >
                <X size={20} />
              </button>
            </div>
            
            <div className="p-6 overflow-y-auto bg-slate-50/30">
              {error && (
                <div className="bg-red-50 text-red-600 border border-red-200 p-3 rounded-lg text-sm font-bold flex items-center gap-2 mb-4">
                  <AlertCircle size={16} />
                  {error}
                </div>
              )}

              {payables.length === 0 ? (
                <div className="text-center py-12 text-slate-500 font-medium">No pending payments for any cars! 🎉</div>
              ) : (
                <div className="flex flex-col gap-4">
                  {payables.map((v) => (
                    <div key={v.id} className="bg-white border border-slate-200 rounded-lg p-5 shadow-sm flex flex-col gap-4">
                      <div className="flex justify-between items-start">
                        <div>
                          <h4 className="m-0 text-slate-900 font-bold text-lg">{v.make} {v.model}</h4>
                          <div className="text-xs text-slate-500 font-medium mt-1">{v.registration || 'Unregistered'} • Bought {new Date(v.purchaseDate).toLocaleDateString()}</div>
                          <div className="mt-3 flex items-center gap-2">
                            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Owed To:</span>
                            <span className="text-sm font-semibold text-slate-700 bg-slate-100 px-2 py-0.5 rounded">{v.payableAccountName}</span>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-xs text-slate-500 uppercase tracking-wider font-bold mb-1">Pending Balance</div>
                          <strong className="text-2xl font-black text-rose-600">₹{v.pendingBalance.toLocaleString('en-IN')}</strong>
                        </div>
                      </div>

                      {payingVehicleId === v.id ? (
                        <form onSubmit={(e) => handlePay(e, v.id)} className="mt-2 pt-4 border-t border-slate-100 flex items-end gap-3 bg-rose-50/50 p-4 rounded-lg">
                          <div className="flex-1">
                            <label className="text-[11px] uppercase tracking-wider font-bold text-slate-500 block mb-1">Payment Amount (₹)</label>
                            <input 
                              type="number" 
                              required 
                              step="0.01" 
                              max={v.pendingBalance}
                              value={amount}
                              onChange={(e) => setAmount(e.target.value)}
                              placeholder={`Max: ${v.pendingBalance}`}
                              className="w-full p-2.5 rounded-md border border-slate-200 bg-white text-slate-900 text-sm outline-none focus:border-rose-500 font-semibold"
                            />
                          </div>
                          <div className="flex-1">
                            <label className="text-[11px] uppercase tracking-wider font-bold text-slate-500 block mb-1">Pay From (Bank/Cash)</label>
                            <select 
                              required
                              value={paymentAccountId}
                              onChange={(e) => setPaymentAccountId(e.target.value)}
                              className="w-full p-2.5 rounded-md border border-slate-200 bg-white text-slate-900 text-sm outline-none focus:border-rose-500 font-medium"
                            >
                              <option value="">Select Account...</option>
                              {accounts?.map(acc => (
                                <option key={acc.id} value={acc.id}>{acc.name} ({acc.type})</option>
                              ))}
                            </select>
                          </div>
                          <div className="flex gap-2">
                            <button 
                              type="button"
                              onClick={() => { setPayingVehicleId(null); setError(null); }}
                              className="px-4 py-2.5 rounded-md font-bold text-sm bg-white border border-slate-200 text-slate-600 hover:bg-slate-50"
                            >
                              Cancel
                            </button>
                            <button 
                              type="submit"
                              disabled={isSubmitting}
                              className="px-6 py-2.5 rounded-md font-bold text-sm bg-rose-600 hover:bg-rose-700 text-white shadow-sm flex items-center gap-2 disabled:opacity-70"
                            >
                              {isSubmitting ? 'Paying...' : 'Confirm Payment'}
                            </button>
                          </div>
                        </form>
                      ) : (
                        <div className="mt-2 pt-4 border-t border-slate-100 flex justify-end">
                          <button 
                            onClick={() => {
                              setPayingVehicleId(v.id);
                              setAmount(v.pendingBalance);
                              setError(null);
                            }}
                            className="flex items-center gap-2 bg-slate-900 hover:bg-slate-800 text-white px-4 py-2 rounded-md font-bold text-sm transition-colors"
                          >
                            <CreditCard size={16} />
                            Pay Now
                          </button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
