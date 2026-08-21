'use client';
function getLocalDateString() {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}


import { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X, ArrowDownRight, AlertCircle } from 'lucide-react';
import { receiveAgentCarPayment } from '@/actions/upad';
import VehicleSearchSelect from '@/components/VehicleSearchSelect';

const formatIndianNumber = (num) => {
  if (!num) return '';
  const numericString = num.toString().replace(/,/g, '').replace(/[^\d.-]/g, '');
  if (!numericString) return '';
  return Number(numericString).toLocaleString('en-IN');
};

export default function AgentPaymentModal({ agentAccounts = [], ledgerAccounts = [], vehicles = [] }) {
  const [isOpen, setIsOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [amount, setAmount] = useState('');
  const [selectedVehicleId, setSelectedVehicleId] = useState('');
  const [selectedAgentId, setSelectedAgentId] = useState('');
  const [depositMode, setDepositMode] = useState('CASH');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  const isSubmittingRef = useRef(false);

  const handleAmountChange = (e) => setAmount(formatIndianNumber(e.target.value));

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (isSubmittingRef.current) return;
    isSubmittingRef.current = true;
    
    const formData = new FormData(e.currentTarget);
    setIsSubmitting(true);
    setError(null);
    
    try {
      const result = await receiveAgentCarPayment(formData);
      
      if (result && !result.success) {
        setError(result.error);
      } else {
        setIsOpen(false);
        setAmount('');
        setSelectedAgentId('');
        e.target.reset();
      }
    } finally {
      isSubmittingRef.current = false;
      setIsSubmitting(false);
    }
  };

  const formatAccountType = (type) => {
    if (type === 'UGHRANI') return 'Marketplace';
    if (type === 'UCHAK') return 'Uchak';
    if (type === 'STAFF') return 'Staff';
    if (type === 'PARTNER') return 'Partner';
    if (type === 'FINANCIER' || type === 'DSA_AGENT') return 'Loan Agent';
    return type;
  };

  return (
    <>
      <button 
        onClick={() => setIsOpen(true)}
        className="flex-shrink-0 flex items-center justify-center gap-1.5 bg-gradient-to-r from-purple-600 to-indigo-600 text-white hover:from-purple-700 hover:to-indigo-700 py-2 md:py-2.5 px-3 md:px-4 rounded-lg font-bold shadow-sm transition-colors text-[13px] md:text-sm border border-purple-500/50 whitespace-nowrap"
      >
        <ArrowDownRight size={16} />
        Receive Payment
      </button>

      {mounted && isOpen && createPortal(
        <div className="fixed inset-0 z-[100] flex flex-col justify-end md:justify-center md:items-center p-0 md:p-4 bg-slate-900/50 backdrop-blur-sm">
          <div className="absolute inset-0" onClick={() => setIsOpen(false)}></div>
          <div className="bg-white rounded-t-3xl md:rounded-2xl shadow-xl w-full max-w-md overflow-hidden flex flex-col relative z-10 animate-in slide-in-from-bottom-full md:slide-in-from-bottom-4 duration-300">
            {/* Mobile Drag Handle */}
            <div className="md:hidden flex justify-center pt-4 pb-2 bg-slate-50">
              <div className="w-12 h-1.5 bg-slate-200 rounded-full"></div>
            </div>
            
            <div className="px-5 py-4 border-b border-slate-100 bg-slate-50 flex items-center justify-between sticky top-0 z-10">
              <div className="flex items-center gap-2">
                <ArrowDownRight size={18} className="text-purple-600" />
                <h2 className="text-lg font-bold text-slate-900 m-0">Receive Payment</h2>
              </div>
              <button 
                onClick={() => { setIsOpen(false); setAmount(''); setError(null); }}
                className="text-slate-400 hover:text-slate-700 bg-transparent border-none cursor-pointer p-1 rounded-md hover:bg-slate-200 transition-colors"
              >
                <X size={20} />
              </button>
            </div>
            
            <form onSubmit={handleSubmit} className="p-6 pt-4 flex flex-col gap-4 overflow-y-auto max-h-[80vh]">
              {error && (
                <div className="bg-red-50 text-red-600 border border-red-200 p-3 rounded-lg text-sm font-bold flex items-center gap-2">
                  <AlertCircle size={16} />
                  {error}
                </div>
              )}

              <div className="flex flex-col gap-1.5">
                  <label className="text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1.5 block">Select Vehicle (Optional)</label>
                  <VehicleSearchSelect 
                    vehicles={vehicles}
                    value={selectedVehicleId}
                    onChange={(val) => setSelectedVehicleId(val)}
                  />
                  <input type="hidden" name="vehicleId" value={selectedVehicleId} />
              </div>

              <div className="flex flex-col gap-1.5">
                  <label className="text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1.5 block">Select Person / Account</label>
                  <select 
                    name="agentAccountId" 
                    required 
                    value={selectedAgentId}
                    onChange={(e) => setSelectedAgentId(e.target.value)}
                    className="w-full p-3.5 rounded-xl border border-transparent bg-slate-100 shadow-inner text-slate-900 text-[15px] font-bold outline-none focus:ring-4 focus:ring-purple-500/15 focus:border-purple-500 focus:bg-white transition-all cursor-pointer"
                  >
                    <option value="">Select Account...</option>
                  {agentAccounts.map(acc => (
                    <option key={acc.id} value={acc.id}>{acc.name} ({formatAccountType(acc.type)})</option>
                  ))}
                </select>
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Deposit To</label>
                <div className="flex gap-2 mb-1">
                  <button type="button" onClick={() => setDepositMode('CASH')} className={`flex-1 py-2 rounded-lg text-xs font-bold border transition-all ${depositMode === 'CASH' ? 'bg-emerald-600 text-white border-emerald-600 shadow-md' : 'bg-slate-100 text-slate-600 border-slate-200 hover:bg-slate-200'}`}>💵 Cash</button>
                  <button type="button" onClick={() => setDepositMode('BANK')} className={`flex-1 py-2 rounded-lg text-xs font-bold border transition-all ${depositMode === 'BANK' ? 'bg-blue-600 text-white border-blue-600 shadow-md' : 'bg-slate-100 text-slate-600 border-slate-200 hover:bg-slate-200'}`}>🏦 Bank</button>
                </div>
                {depositMode === 'CASH' ? (
                  <>
                    <div className="p-2.5 rounded-lg bg-emerald-50 border border-emerald-200 text-sm font-bold text-emerald-700 flex items-center gap-1.5">💵 Cash Account (Auto-selected)</div>
                    <input type="hidden" name="ledgerAccountId" value={ledgerAccounts.find(a => a.type === 'CASH')?.id || ''} />
                  </>
                ) : (
                  <select name="ledgerAccountId" required className="p-2.5 rounded-lg border border-slate-200 bg-slate-50 text-slate-900 outline-none focus:border-indigo-500 font-medium">
                    <option value="">Select Bank Account...</option>
                    {ledgerAccounts.filter(acc => acc.type === 'BANK').map(acc => (
                      <option key={acc.id} value={acc.id}>{acc.name}</option>
                    ))}
                  </select>
                )}
              </div>

              <div className="flex gap-4">
                <div className="flex flex-col gap-1.5 flex-1">
                  <label className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Amount (₹)</label>
                  <input
                    type="text"
                    inputMode="decimal"
                    name="amount"
                    required
                    placeholder="0"
                    value={amount}
                    onChange={handleAmountChange}
                    className="p-2.5 rounded-lg border border-slate-200 bg-white text-slate-900 outline-none focus:border-indigo-500 transition-all font-black text-lg"
                  />
                </div>
                <div className="flex flex-col gap-1.5 flex-1">
                  <label className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Date</label>
                  <input
                    type="date"
                    name="date"
                    required
                    defaultValue={getLocalDateString()}
                    style={{ colorScheme: 'light' }}
                    className="p-2.5 rounded-lg border border-slate-200 bg-white text-slate-900 outline-none focus:border-indigo-500 transition-all font-medium text-sm block w-full"
                  />
                </div>
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Description / Note</label>
                <input
                  type="text"
                  name="description"
                  required
                  placeholder="e.g. Received from Agent"
                  className="p-2.5 rounded-lg border border-slate-200 bg-white text-slate-900 outline-none focus:border-indigo-500 transition-all font-medium text-sm"
                />
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full mt-2 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white font-bold py-3 rounded-xl shadow-md transition-colors disabled:opacity-70 disabled:cursor-not-allowed"
              >
                {isSubmitting ? 'Processing...' : 'Record Income'}
              </button>
            </form>
          </div>
        </div>
      , document.body)}
    </>
  );
}
