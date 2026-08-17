'use client'

import { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X, User, Phone, IndianRupee, CreditCard, CarFront } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { addToken } from '@/actions/tokens';
import { handleAmountFormat } from '@/lib/amountHelper';

function getLocalDateString() {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export default function ReceiveTokenModal({ isOpen, onClose, vehicle, inStock = [], accounts }) {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [amount, setAmount] = useState('');
  const [selectedVehicleId, setSelectedVehicleId] = useState('');
  const [mounted, setMounted] = useState(false);
  const isSubmittingRef = useRef(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!isOpen || !mounted) return null;

  const activeVehicleId = vehicle?.id || selectedVehicleId;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (isSubmittingRef.current) return;
    isSubmittingRef.current = true;
    
    setIsSubmitting(true);
    setError(null);

    const formData = new FormData(e.currentTarget);
    formData.append('vehicleId', activeVehicleId);
    formData.append('amount', (amount || '0').replace(/,/g, ''));

    const result = await addToken(formData);

    if (result.success) {
      router.refresh();
      onClose();
    } else {
      setError(result.error || 'Failed to record token.');
    }

    isSubmittingRef.current = false;
    setIsSubmitting(false);
  };

  return createPortal(
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[9999] flex justify-center items-center p-4">
      <div 
        className="bg-white w-full max-w-lg rounded-2xl shadow-2xl flex flex-col max-h-[90vh] overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        <div className="px-6 py-5 border-b border-slate-200 bg-white flex justify-between items-start shrink-0">
          <div>
            <h2 className="text-xl font-black text-slate-900 tracking-tight m-0 mb-1">
              Receive Advance Token
            </h2>
            <div className="flex items-center gap-2 mt-1">
              <span className="text-sm font-bold text-slate-500">
                {vehicle ? `${vehicle.make} ${vehicle.model} (${vehicle.registration || 'UNREGISTERED'})` : 'Select a vehicle below'}
              </span>
            </div>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 p-1.5 rounded-full hover:bg-slate-100 transition-colors">
            <X size={20} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          {error && (
            <div className="bg-red-50 text-red-600 p-4 rounded-xl text-sm font-bold border border-red-100 mb-6">
              {error}
            </div>
          )}

          <form id="token-form" onSubmit={handleSubmit} className="space-y-6">
            
            {!vehicle && (
              <div className="flex flex-col gap-2">
                <label className="text-[11px] uppercase font-bold text-slate-500 tracking-wider">Select Vehicle</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                    <CarFront size={16} />
                  </div>
                  <select 
                    required 
                    value={selectedVehicleId}
                    onChange={(e) => setSelectedVehicleId(e.target.value)}
                    className="w-full pl-10 p-3.5 rounded-xl border border-transparent bg-slate-100 shadow-inner text-sm font-bold text-slate-800 outline-none focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-500/15 transition-all appearance-none"
                  >
                    <option value="">Choose a car in stock...</option>
                    {inStock.map(v => (
                      <option key={v.id} value={v.id}>{v.make} {v.model} ({v.registration || 'UNREG'})</option>
                    ))}
                  </select>
                </div>
              </div>
            )}
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              <div className="flex flex-col gap-2">
                <label className="text-[11px] uppercase font-bold text-slate-500 tracking-wider">Customer Name</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                    <User size={16} />
                  </div>
                  <input type="text" name="customerName" required placeholder="e.g. Ramji" className="w-full pl-10 p-3.5 rounded-xl border border-transparent bg-slate-100 shadow-inner text-sm font-bold text-slate-800 outline-none focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-500/15 transition-all" />
                </div>
              </div>
              <div className="flex flex-col gap-2">
                <label className="text-[11px] uppercase font-bold text-slate-500 tracking-wider">Mobile Number</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                    <Phone size={16} />
                  </div>
                  <input type="tel" name="customerMobile" placeholder="Optional" className="w-full pl-10 p-3.5 rounded-xl border border-transparent bg-slate-100 shadow-inner text-sm font-bold text-slate-800 outline-none focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-500/15 transition-all" />
                </div>
              </div>
            </div>

            <div className="flex flex-col gap-2">
              <label className="text-[11px] uppercase font-bold text-blue-700 tracking-wider">Token Amount (₹)</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-blue-500">
                  <IndianRupee size={20} />
                </div>
                <input 
                  type="text" 
                  inputMode="decimal"
                  required
                  value={amount}
                  onChange={(e) => setAmount(handleAmountFormat(e.target.value))}
                  placeholder="e.g. 20000" 
                  className="w-full pl-10 p-4 rounded-xl border border-transparent bg-blue-50/50 shadow-inner text-lg font-black text-blue-900 outline-none focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-500/20 transition-all placeholder:text-blue-300" 
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              <div className="flex flex-col gap-2">
                <label className="text-[11px] uppercase font-bold text-slate-500 tracking-wider">Payment Mode</label>
                <select name="paymentMode" required className="w-full p-3.5 rounded-xl border border-transparent bg-slate-100 shadow-inner text-sm font-bold text-slate-800 outline-none focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-500/15 transition-all">
                  <option value="BANK">Bank Transfer / UPI</option>
                  <option value="CASH">Cash</option>
                </select>
              </div>

              <div className="flex flex-col gap-2">
                <label className="text-[11px] uppercase font-bold text-slate-500 tracking-wider">Deposit Into</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                    <CreditCard size={16} />
                  </div>
                  <select name="paymentAccountId" required className="w-full pl-10 p-3.5 rounded-xl border border-transparent bg-slate-100 shadow-inner text-sm font-bold text-slate-800 outline-none focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-500/15 transition-all appearance-none">
                    <option value="">Select Account</option>
                    {accounts.filter(a => a.type === 'BANK' || a.type === 'CASH').map(acc => (
                      <option key={acc.id} value={acc.id}>{acc.name} (₹{acc.openingBalance.toLocaleString('en-IN')})</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            <div className="flex flex-col gap-2">
              <label className="text-[11px] uppercase font-bold text-slate-500 tracking-wider">Date Received</label>
              <input type="date" name="date" required defaultValue={getLocalDateString()} className="w-full p-3.5 rounded-xl border border-transparent bg-slate-100 shadow-inner text-sm font-bold text-slate-800 outline-none focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-500/15 transition-all" />
            </div>
            
          </form>
        </div>

        <div className="p-6 border-t border-slate-200 bg-slate-50 flex justify-end gap-3 shrink-0">
          <button type="button" onClick={onClose} className="px-6 py-3 rounded-xl font-bold text-slate-500 hover:text-slate-700 hover:bg-slate-200/50 transition-colors">
            Cancel
          </button>
          <button 
            type="submit" 
            form="token-form"
            disabled={isSubmitting}
            className="px-6 py-3 rounded-xl font-bold text-white bg-blue-600 hover:bg-blue-700 shadow-lg shadow-blue-600/20 transition-all active:scale-[0.98] disabled:opacity-50 flex items-center gap-2"
          >
            {isSubmitting ? 'Saving...' : 'Save Token'}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
