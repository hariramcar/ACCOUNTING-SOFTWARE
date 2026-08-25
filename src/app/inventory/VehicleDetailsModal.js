'use client';

import { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X, User, IndianRupee, MapPin, Wrench, Calendar, Banknote, ShieldCheck, PenSquare, Trash2, CheckCircle2, FileText, BadgeCent, Handshake, AlertCircle } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { payVehiclePendingBalance, payPartnerPendingInvestment, payPartnerProfit, updateVehicleDocuments } from '@/actions/inventory';
import { forfeitToken } from '@/actions/tokens';
import { FolderCheck } from 'lucide-react';

const REQUIRED_DOCS = [
  'RC Book',
  'Aadhar Card',
  'PAN Card',
  'NOC',
  'Second Key',
  'TTO'
];

export default function VehicleDetailsModal({ car, isOpen, onClose, accounts = [], onReceiveToken }) {
  const router = useRouter();
  const [isPaying, setIsPaying] = useState(false);
  const [payingPartnerId, setPayingPartnerId] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [amount, setAmount] = useState('');
  const handleAmountFormat = (val) => {
    const rawValue = val.replace(/[^0-9.]/g, '');
    if (!rawValue) return '';
    const parts = rawValue.split('.');
    parts[0] = Number(parts[0]).toLocaleString('en-IN');
    return parts.join('.');
  };

  const [sourceAccountId, setSourceAccountId] = useState('');
  const [partnerAmount, setPartnerAmount] = useState('');
  const [partnerSourceAccountId, setPartnerSourceAccountId] = useState('');
  const [payingProfitId, setPayingProfitId] = useState(null);
  const [profitSourceAccountId, setProfitSourceAccountId] = useState('');
  const [profitPaymentAmount, setProfitPaymentAmount] = useState('');
  const [payMode, setPayMode] = useState('CASH');
  const [partnerPayMode, setPartnerPayMode] = useState('CASH');
  const [profitPayMode, setProfitPayMode] = useState('CASH');
  const [error, setError] = useState(null);
  const [partnerError, setPartnerError] = useState(null);
  const [profitError, setProfitError] = useState(null);
  const isSubmittingRef = useRef(false);
  const [mounted, setMounted] = useState(false);
  
  const [receivedDocs, setReceivedDocs] = useState([]);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (car) {
      setReceivedDocs(Array.isArray(car.receivedDocs) ? car.receivedDocs : []);
    }
  }, [car]);

  if (!isOpen || !car || !mounted) return null;

  const toggleDocument = async (docName) => {
    const isCurrentlyReceived = receivedDocs.includes(docName);
    const newDocs = isCurrentlyReceived 
      ? receivedDocs.filter(d => d !== docName)
      : [...receivedDocs, docName];
    
    setReceivedDocs(newDocs); // optimistic update
    await updateVehicleDocuments(car.id, newDocs);
  };

  const handlePayPending = async (e) => {
    e.preventDefault();
    if (isSubmittingRef.current) return;
    isSubmittingRef.current = true;
    
    setIsSubmitting(true);
    setError(null);
    
    const formData = new FormData();
    formData.append('vehicleId', car.id);
    formData.append('amount', amount);
    const finalSourceId = payMode === 'CASH' ? (accounts.find(a => a.type === 'CASH')?.id || '') : sourceAccountId;
    formData.append('sourceAccountId', finalSourceId);

    try {
      const result = await payVehiclePendingBalance(formData);
      if (result && !result.success) {
        setError(result.error);
      } else {
        setIsPaying(false);
        setAmount('');
        setSourceAccountId('');
        setPayMode('CASH');
        onClose(); // Close modal to refresh
      }
    } finally {
      isSubmittingRef.current = false;
      setIsSubmitting(false);
    }
  };

  const handlePayPartnerPending = async (e, partnershipId) => {
    e.preventDefault();
    if (isSubmittingRef.current) return;
    isSubmittingRef.current = true;
    
    setIsSubmitting(true);
    setPartnerError(null);
    
    const formData = new FormData();
    formData.append('partnershipId', partnershipId);
    formData.append('amount', partnerAmount);
    const finalPartnerSourceId = partnerPayMode === 'CASH' ? (accounts.find(a => a.type === 'CASH')?.id || '') : partnerSourceAccountId;
    formData.append('targetAccountId', finalPartnerSourceId);

    try {
      const result = await payPartnerPendingInvestment(formData);
      if (result && !result.success) {
        setPartnerError(result.error);
      } else {
        setPayingPartnerId(null);
        setPartnerAmount('');
        setPartnerSourceAccountId('');
        setPartnerPayMode('CASH');
        onClose();
      }
    } finally {
      isSubmittingRef.current = false;
      setIsSubmitting(false);
    }
  };

  const handlePayPartnerProfit = async (e, partnershipId, amount) => {
    e.preventDefault();
    if (isSubmittingRef.current) return;
    isSubmittingRef.current = true;
    
    setIsSubmitting(true);
    setProfitError(null);
    
    const formData = new FormData();
    formData.append('partnershipId', partnershipId);
    
    const finalAmount = profitPaymentAmount ? parseFloat(profitPaymentAmount.replace(/,/g, '')) : amount;
    formData.append('amount', finalAmount);
    const finalProfitSourceId = profitPayMode === 'CASH' ? (accounts.find(a => a.type === 'CASH')?.id || '') : profitSourceAccountId;
    formData.append('sourceAccountId', finalProfitSourceId);
    
    const cutAmount = Math.max(0, amount - finalAmount);
    if (cutAmount > 0) {
      formData.append('cutAmount', cutAmount);
    }

    try {
      const result = await payPartnerProfit(formData);
      if (result && !result.success) {
        setProfitError(result.error);
      } else {
        setPayingProfitId(null);
        setProfitSourceAccountId('');
        setProfitPayMode('CASH');
        onClose();
      }
    } finally {
      isSubmittingRef.current = false;
      setIsSubmitting(false);
    }
  };

  const legacyRepairs = Number(car.legacyExpenses || 0);
  const totalRepairs = (car.expenses || []).reduce((sum, exp) => sum + Number(exp.amount), 0);
  const calculatedTotalCost = Number(car.purchasePrice) + totalRepairs + legacyRepairs;
  
  const partnerTotalProfit = (car.partnerships || []).reduce((sum, p) => sum + (Math.round((Number(car.profit || 0) * (Number(p.profitSharePercentage) / 100)) * 100) / 100), 0);
  const netOurProfit = Number(car.profit || 0) - partnerTotalProfit;

  const partnerTotalInvestment = (car.partnerships || []).reduce((sum, p) => sum + Number(p.investmentAmount || 0), 0);
  const firmCapital = Math.max(0, Number(car.purchasePrice) - partnerTotalInvestment);
  
  const firmPayments = (car.purchaseTransactions || []).filter(tx => {
    return !car.partnerships?.some(p => p.partnerAccount?.name && tx.description.includes(p.partnerAccount.name));
  });

  return createPortal(
    <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-end z-[9999] transition-all">
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
              {car.partnerships && car.partnerships.length > 0 && (
                <span className="text-xs uppercase tracking-widest bg-purple-100 text-purple-700 px-2 py-0.5 rounded font-bold border border-purple-200">
                  Partnered
                </span>
              )}
              {car.isLegacy && <span className="bg-amber-100 text-amber-700 px-2 py-0.5 rounded text-[10px] uppercase tracking-wider font-bold">Legacy</span>}
              {car.status === 'IN_STOCK' && onReceiveToken && (
                <button
                  onClick={onReceiveToken}
                  className="bg-blue-100 hover:bg-blue-200 text-blue-700 px-2 py-0.5 rounded text-[10px] uppercase tracking-wider font-bold border border-blue-200 transition-colors flex items-center gap-1"
                >
                  <BadgeCent size={12} /> Receive Token
                </button>
              )}
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
              <div className="p-4 border-b border-indigo-800 flex items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-indigo-800 text-indigo-300 rounded-lg">
                    <IndianRupee size={20} />
                  </div>
                  <div>
                    <div className="text-[10px] font-bold text-indigo-300 uppercase tracking-wider">Vehicle Sold For</div>
                    <div className="text-2xl font-black text-white">₹{Number(car.salePrice).toLocaleString('en-IN')}</div>
                  </div>
                </div>
                
                {(car.customerName || car.customerMobile) && (
                  <div className="text-right">
                    <div className="text-[10px] font-bold text-indigo-300 uppercase tracking-wider">Sold To</div>
                    {car.customerName && <div className="text-sm font-bold text-white capitalize">{car.customerName}</div>}
                    {car.customerMobile && <div className="text-xs text-indigo-200">{car.customerMobile}</div>}
                  </div>
                )}
              </div>
              
              <div className="bg-indigo-950 p-4 border-b border-indigo-800/50 grid grid-cols-2 gap-4">
                <div>
                  <div className="text-[9px] font-bold text-indigo-300 uppercase tracking-wider mb-1">Received from Client</div>
                  <div className="font-bold text-sm text-emerald-400">₹{(Number(car.salePrice) - Number(car.salePendingBalance)).toLocaleString('en-IN')}</div>
                </div>
                {Number(car.salePendingBalance) > 0 && (
                  <div>
                    <div className="text-[9px] font-bold text-indigo-300 uppercase tracking-wider mb-1">
                      {car.receivableAccount && ['FINANCIER', 'DSA_AGENT'].includes(car.receivableAccount.type) ? 'Loan Agent Pay' : 'Pending Amount'}
                    </div>
                    <div className="font-bold text-sm text-amber-400">₹{Number(car.salePendingBalance).toLocaleString('en-IN')}</div>
                    {car.receivableAccount && (
                      <div className="text-[9px] font-medium text-amber-200 mt-0.5">Owed by: {car.receivableAccount.name}</div>
                    )}
                  </div>
                )}
                
                {car.saleTransactions && car.saleTransactions.filter(tx => tx.type === 'CREDIT').length > 0 && (
                  <div className="col-span-2 mt-1 pt-3 border-t border-indigo-800/50">
                    <div className="text-[9px] font-bold text-indigo-300 uppercase tracking-wider mb-2">Payment Breakdown</div>
                    <div className="flex flex-col gap-1.5">
                      {car.saleTransactions.filter(tx => tx.type === 'CREDIT').map((tx, idx) => (
                        <div key={idx} className="flex justify-between items-center text-xs">
                          <span className="text-indigo-200 flex items-center gap-2">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500/50"></span>
                            {tx.accountName || tx.transactionMode} Payment
                          </span>
                          <span className="font-medium text-emerald-300 font-mono">₹{tx.amount.toLocaleString('en-IN')}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
              
              <div className="bg-indigo-950/70 p-4 grid grid-cols-2 gap-4">
                <div>
                  <div className="text-[9px] font-bold text-indigo-300 uppercase tracking-wider mb-1">Net Profit</div>
                  <div className="font-black text-lg text-emerald-400">₹{Number(car.profit).toLocaleString('en-IN')}</div>
                </div>
                {partnerTotalProfit > 0 && (
                  <div>
                    <div className="text-[9px] font-bold text-indigo-300 uppercase tracking-wider mb-1">Partner Profit Share</div>
                    <div className="font-bold text-sm text-purple-400">- ₹{partnerTotalProfit.toLocaleString('en-IN')}</div>
                    {(() => {
                      let extraProfit = 0;
                      car.partnerships?.forEach(p => {
                        const pp = Math.round((Number(car.profit || 0) * (Number(p.profitSharePercentage) / 100)) * 100) / 100;
                        const inv = Number(p.paidAmount || 0);
                        const expected = pp + inv;
                        const tx = car.profitPayouts?.find(t => t.description.includes(p.partnerAccount?.name)) || 
                                   (car.partnerships.length === 1 ? car.profitPayouts?.find(t => t.description.includes('Paid Full Settlement')) : null);
                        if (tx) {
                          const paid = Number(tx.amount);
                          if (expected > paid) extraProfit += (expected - paid);
                        }
                      });
                      
                      return (
                        <div className="text-xs font-bold text-emerald-300 mt-1 flex flex-col gap-0.5">
                          <span>Our Share: ₹{netOurProfit.toLocaleString('en-IN')}</span>
                          {extraProfit > 0 && (
                            <span className="text-[9px] text-amber-400 font-bold bg-amber-400/10 px-1.5 py-0.5 rounded border border-amber-400/20 w-fit">
                              + ₹{extraProfit.toLocaleString('en-IN')} (Cut from Partner)
                            </span>
                          )}
                        </div>
                      );
                    })()}
                  </div>
                )}
                {car.partnerships && car.partnerships.length > 0 && (
                  <div className="col-span-2 mt-2 pt-3 border-t border-indigo-800/50">
                    <div className="text-[9px] font-bold text-indigo-300 uppercase tracking-wider mb-2">Partner Distribution Tracker</div>
                    <div className="flex flex-col gap-2">
                      {car.partnerships.map((p, i) => {
                        const partnerProfit = Math.round((Number(car.profit || 0) * (Number(p.profitSharePercentage) / 100)) * 100) / 100;
                        const capitalInvested = Number(p.paidAmount || 0);
                        const totalPayout = partnerProfit + capitalInvested;
                        
                        // We check if it's paid based on the description containing the partner's name.
                        // If it doesn't contain the name (from older consolidated entries), we accept it if they're the only partner
                        const hasNameMatch = car.profitPayouts?.some(t => t.description.includes(p.partnerAccount?.name));
                        const hasGeneralMatch = car.profitPayouts?.some(t => t.description.includes('Paid Full Settlement') && (!p.partnerAccount?.name || !t.description.includes(p.partnerAccount.name)));
                        const isPaid = hasNameMatch || (car.partnerships.length === 1 && hasGeneralMatch);
                        const isPayingThis = payingProfitId === p.id;
                        
                        const payoutTx = car.profitPayouts?.find(t => t.description.includes(p.partnerAccount?.name)) || 
                                        (car.partnerships.length === 1 ? car.profitPayouts?.find(t => t.description.includes('Paid Full Settlement')) : null);
                        
                        const actualPaid = payoutTx ? Number(payoutTx.amount) : 0;
                        const cutAmount = isPaid ? (totalPayout - actualPaid) : 0;
                        
                        return (
                          <div key={i} className="flex flex-col gap-2 bg-indigo-900/50 p-2 rounded-lg border border-indigo-800/30">
                            <div className="flex justify-between items-start text-xs">
                              <div>
                                <span className="font-bold text-indigo-200">{p.partnerAccount?.name}</span>
                                <span className="text-indigo-400 ml-1">({p.profitSharePercentage}%)</span>
                              </div>
                              <div className="text-right flex flex-col items-end gap-1">
                                <span className="font-bold text-purple-300 text-sm">₹{totalPayout.toLocaleString('en-IN')}</span>
                                <span className="text-[9px] text-indigo-400 font-medium">
                                  (₹{capitalInvested.toLocaleString('en-IN')} Capital + ₹{partnerProfit.toLocaleString('en-IN')} Profit)
                                </span>
                                <div className="mt-1 flex flex-col items-end gap-1.5">
                                  {isPaid ? (
                                    <>
                                      <span className="text-[9px] font-bold text-emerald-400/90 bg-emerald-400/10 px-1.5 py-0.5 rounded-sm uppercase tracking-widest flex items-center gap-1">
                                        <CheckCircle2 size={10} /> Paid ₹{actualPaid.toLocaleString('en-IN')}
                                      </span>
                                    </>
                                  ) : (
                                    !isPayingThis && totalPayout > 0 && (
                                      <button 
                                        onClick={() => {
                                          setPayingProfitId(p.id);
                                          setProfitPaymentAmount(totalPayout.toString());
                                        }}
                                        className="text-[9px] font-bold text-white bg-emerald-500/80 hover:bg-emerald-500 px-2 py-1 rounded-sm uppercase tracking-widest transition-colors"
                                      >
                                        Pay Settlement
                                      </button>
                                    )
                                  )}
                                </div>
                              </div>
                            </div>
                            
                            {isPayingThis && !isPaid && (
                              <form onSubmit={(e) => handlePayPartnerProfit(e, p.id, totalPayout)} className="mt-1 pt-2 border-t border-indigo-800/50 flex flex-col gap-2">
                                {profitError && <div className="text-[10px] text-red-400 bg-red-400/10 p-1.5 rounded-md">{profitError}</div>}
                                <div className="flex gap-1 mb-1">
                                  <button type="button" onClick={() => { setProfitPayMode('CASH'); setProfitSourceAccountId(accounts.find(a => a.type === 'CASH')?.id || ''); }} className={`flex-1 py-1 rounded-md text-[9px] font-bold border transition-all ${profitPayMode === 'CASH' ? 'bg-emerald-600 text-white border-emerald-600' : 'bg-indigo-800/50 text-indigo-300 border-indigo-700 hover:bg-indigo-800'}`}>💵 Cash</button>
                                  <button type="button" onClick={() => { setProfitPayMode('BANK'); setProfitSourceAccountId(''); }} className={`flex-1 py-1 rounded-md text-[9px] font-bold border transition-all ${profitPayMode === 'BANK' ? 'bg-blue-600 text-white border-blue-600' : 'bg-indigo-800/50 text-indigo-300 border-indigo-700 hover:bg-indigo-800'}`}>🏦 Bank</button>
                                </div>
                                {profitPayMode === 'CASH' ? (
                                  <>
                                    <div className="text-xs p-1.5 rounded-md bg-emerald-500/20 border border-emerald-500/30 text-emerald-300 font-bold">💵 Cash (Auto-selected)</div>
                                    <input type="hidden" value={accounts.find(a => a.type === 'CASH')?.id || ''} />
                                  </>
                                ) : (
                                  <select 
                                    required
                                    value={profitSourceAccountId}
                                    onChange={(e) => setProfitSourceAccountId(e.target.value)}
                                    className="text-xs p-1.5 rounded-md border border-indigo-700 bg-indigo-800/50 text-indigo-100 font-medium outline-none focus:ring-2 focus:ring-indigo-500/50"
                                  >
                                    <option value="">Select Bank Account...</option>
                                    {accounts.filter(a => a.type === 'BANK').map(acc => (
                                      <option key={acc.id} value={acc.id}>{acc.name}</option>
                                    ))}
                                  </select>
                                )}
                                <input 
                                  type="text"
                                  inputMode="decimal"
                                  required
                                  value={profitPaymentAmount}
                                  onChange={(e) => setProfitPaymentAmount(handleAmountFormat(e.target.value))}
                                  className="text-xs p-1.5 rounded-md border border-indigo-700 bg-indigo-800/50 text-indigo-100 font-bold outline-none focus:ring-2 focus:ring-indigo-500/50"
                                  placeholder="Final Payout Amount"
                                />
                                {(() => {
                                  const amt = parseFloat((profitPaymentAmount || '0').replace(/,/g, ''));
                                  if (!isNaN(amt) && amt < totalPayout && amt >= 0) {
                                    return (
                                      <div className="text-[9px] font-bold text-amber-400 bg-amber-400/10 p-1.5 rounded-md border border-amber-400/20">
                                        Paying ₹{(totalPayout - amt).toLocaleString('en-IN')} less. This is kept as Firm's Extra Profit.
                                      </div>
                                    );
                                  }
                                  return null;
                                })()}
                                <div className="flex gap-2">
                                  <button type="submit" disabled={isSubmitting} className="flex-1 bg-emerald-500 hover:bg-emerald-600 text-white text-[10px] uppercase tracking-wider font-bold py-1.5 rounded-md transition-colors">
                                    {isSubmitting ? '...' : 'Confirm'}
                                  </button>
                                  <button type="button" onClick={() => setPayingProfitId(null)} className="flex-1 bg-indigo-800 hover:bg-indigo-700 text-indigo-200 text-[10px] uppercase tracking-wider font-bold py-1.5 rounded-md transition-colors">
                                    Cancel
                                  </button>
                                </div>
                              </form>
                            )}
                          </div>
                        );
                      })}
                    </div>
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

              {firmPayments.length > 0 && (
                <div className="mt-1 pt-3 border-t border-slate-200/80 flex flex-col gap-1.5">
                  <div className="text-[9px] font-bold text-indigo-500 uppercase tracking-wider mb-0.5">Firm's Payments</div>
                  {firmPayments.map((tx, idx) => (
                    <div key={idx} className="flex justify-between items-center text-[10px]">
                      <span className="text-slate-600 font-medium flex items-center gap-1.5">
                        <span className="w-1.5 h-1.5 rounded-full bg-indigo-400"></span>
                        <span className="capitalize">{tx.accountName || tx.transactionMode}</span>
                      </span>
                      <span className="font-bold text-indigo-700 font-mono">₹{tx.amount.toLocaleString('en-IN')}</span>
                    </div>
                  ))}
                </div>
              )}

              {(!car.isLegacy && Number(car.purchasePendingBalance) > 0) && (
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
                      <div className="flex gap-2 mb-2">
                        <button type="button" onClick={() => { setPayMode('CASH'); setSourceAccountId(accounts.find(a => a.type === 'CASH')?.id || ''); }} className={`flex-1 py-2 rounded-lg text-xs font-bold border transition-all ${payMode === 'CASH' ? 'bg-emerald-600 text-white border-emerald-600 shadow-md' : 'bg-slate-100 text-slate-600 border-slate-200 hover:bg-slate-200'}`}>💵 Cash</button>
                        <button type="button" onClick={() => { setPayMode('BANK'); setSourceAccountId(''); }} className={`flex-1 py-2 rounded-lg text-xs font-bold border transition-all ${payMode === 'BANK' ? 'bg-blue-600 text-white border-blue-600 shadow-md' : 'bg-slate-100 text-slate-600 border-slate-200 hover:bg-slate-200'}`}>🏦 Bank</button>
                        <button type="button" onClick={() => { setPayMode('AGENT'); setSourceAccountId(''); }} className={`flex-1 py-2 rounded-lg text-xs font-bold border transition-all ${payMode === 'AGENT' ? 'bg-amber-600 text-white border-amber-600 shadow-md' : 'bg-slate-100 text-slate-600 border-slate-200 hover:bg-slate-200'}`}>👤 Agent</button>
                      </div>
                      {payMode === 'CASH' ? (
                        <>
                          <div className="p-2 rounded-lg bg-emerald-50 border border-emerald-200 text-sm font-bold text-emerald-700 flex items-center gap-1.5">💵 Cash Account (Auto-selected)</div>
                        </>
                      ) : (
                        <select 
                          required
                          value={sourceAccountId}
                          onChange={(e) => setSourceAccountId(e.target.value)}
                          className="text-sm p-2 rounded-lg border border-amber-300 bg-white font-medium outline-none focus:ring-4 focus:ring-amber-500/10 focus:border-amber-500"
                        >
                          <option value="">Select {payMode === 'AGENT' ? 'Agent' : 'Bank'} Account...</option>
                          {accounts.filter(a => payMode === 'AGENT' ? (a.type === 'DSA_AGENT' || a.type === 'FINANCIER') : a.type === 'BANK').map(acc => (
                            <option key={acc.id} value={acc.id}>{acc.name}</option>
                          ))}
                        </select>
                      )}
                      <input 
                        type="text"
                        inputMode="decimal"
                        required
                        value={amount}
                        onChange={(e) => setAmount(handleAmountFormat(e.target.value))}
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
                {car.partnerships.map(p => {
                  const invested = Number(p.investmentAmount);
                  const paid = Number(p.paidAmount || 0);
                  const unpaid = invested - paid;
                  const isPayingThis = payingPartnerId === p.id;
                  
                  return (
                    <div key={p.id} className="bg-purple-50/50 border border-purple-100 rounded-xl p-4 flex flex-col gap-3">
                      <div className="flex justify-between items-start">
                        <div>
                          <div className="font-bold text-purple-900">{p.partnerAccount?.name || 'Unknown Partner'}</div>
                          <div className="text-xs font-medium text-purple-600 mt-0.5">
                            {p.profitSharePercentage}% Profit Share
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-[9px] font-bold text-purple-400 uppercase tracking-wider">Invested</div>
                          <div className="font-bold text-sm text-purple-700">₹{invested.toLocaleString('en-IN')}</div>
                        </div>
                      </div>

                      {(() => {
                        const partnerTx = (car.partnerTransactions || []).filter(tx => p.partnerAccount?.name && tx.description.includes(p.partnerAccount.name));
                        if (partnerTx.length === 0) return null;
                        return (
                          <div className="mt-1 pt-2 border-t border-purple-100/60 flex flex-col gap-1.5">
                            <div className="text-[9px] font-bold text-purple-400 uppercase tracking-wider mb-0.5">Payment Breakdown</div>
                            {partnerTx.map((tx, idx) => (
                              <div key={idx} className="flex justify-between items-center text-xs">
                                <span className="text-purple-600/80 flex items-center gap-1.5">
                                  <span className="w-1 h-1 rounded-full bg-purple-400"></span>
                                  {tx.accountName || tx.transactionMode} Payment
                                </span>
                                <span className="font-medium text-purple-700 font-mono">₹{tx.amount.toLocaleString('en-IN')}</span>
                              </div>
                            ))}
                          </div>
                        );
                      })()}

                      {unpaid > 0 && (
                        <div className="mt-2 pt-3 border-t border-purple-100 flex flex-col gap-2">
                          <div className="flex justify-between items-center">
                            <div className="text-[10px] font-bold text-purple-500 uppercase tracking-wider">Pending (Not Paid)</div>
                            {!isPayingThis && (
                              <button 
                                onClick={() => { setPayingPartnerId(p.id); setPartnerAmount(unpaid.toString()); }}
                                className="text-[10px] font-bold bg-purple-100 text-purple-700 px-3 py-1.5 rounded-md hover:bg-purple-200 transition-colors"
                              >
                                Pay Now
                              </button>
                            )}
                          </div>
                          <div className="text-sm font-black text-purple-600">₹{unpaid.toLocaleString('en-IN')}</div>
                          
                          {isPayingThis && (
                            <form onSubmit={(e) => handlePayPartnerPending(e, p.id)} className="flex flex-col gap-3 mt-2">
                              {partnerError && <div className="text-[10px] text-red-600 bg-red-50 p-2 rounded-md">{partnerError}</div>}
                              <div className="flex gap-2 mb-2">
                                <button type="button" onClick={() => { setPartnerPayMode('CASH'); setPartnerSourceAccountId(accounts.find(a => a.type === 'CASH')?.id || ''); }} className={`flex-1 py-2 rounded-lg text-xs font-bold border transition-all ${partnerPayMode === 'CASH' ? 'bg-emerald-600 text-white border-emerald-600 shadow-md' : 'bg-slate-100 text-slate-600 border-slate-200 hover:bg-slate-200'}`}>💵 Cash</button>
                                <button type="button" onClick={() => { setPartnerPayMode('BANK'); setPartnerSourceAccountId(''); }} className={`flex-1 py-2 rounded-lg text-xs font-bold border transition-all ${partnerPayMode === 'BANK' ? 'bg-blue-600 text-white border-blue-600 shadow-md' : 'bg-slate-100 text-slate-600 border-slate-200 hover:bg-slate-200'}`}>🏦 Bank</button>
                              </div>
                              {partnerPayMode === 'CASH' ? (
                                <>
                                  <div className="p-2 rounded-lg bg-emerald-50 border border-emerald-200 text-sm font-bold text-emerald-700 flex items-center gap-1.5">💵 Cash Account (Auto-selected)</div>
                                </>
                              ) : (
                                <select 
                                  required
                                  value={partnerSourceAccountId}
                                  onChange={(e) => setPartnerSourceAccountId(e.target.value)}
                                  className="text-sm p-2 rounded-lg border border-purple-300 bg-white font-medium outline-none focus:ring-4 focus:ring-purple-500/10 focus:border-purple-500"
                                >
                                  <option value="">Select Bank Account...</option>
                                  {accounts.filter(a => a.type === 'BANK').map(acc => (
                                    <option key={acc.id} value={acc.id}>{acc.name}</option>
                                  ))}
                                </select>
                              )}
                              <input 
                                type="text"
                                inputMode="decimal"
                                required
                                value={partnerAmount}
                                onChange={(e) => setPartnerAmount(handleAmountFormat(e.target.value))}
                                className="text-sm p-2 rounded-lg border border-purple-300 bg-white font-bold outline-none focus:ring-4 focus:ring-purple-500/10 focus:border-purple-500"
                                placeholder="Amount Received"
                              />
                              <div className="flex flex-col gap-2 mt-1">
                                <button type="submit" disabled={isSubmitting} className="w-full bg-purple-600 hover:bg-purple-700 text-white text-sm font-bold py-2.5 rounded-lg transition-colors">
                                  {isSubmitting ? 'Processing...' : 'Confirm Receipt'}
                                </button>
                                <button type="button" onClick={() => setPayingPartnerId(null)} className="w-full py-2 text-slate-500 hover:text-slate-700 hover:bg-purple-100/50 rounded-lg text-xs font-bold transition-colors">
                                  Cancel
                                </button>
                              </div>
                            </form>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Tokens & Bookings */}
          {car.tokens && car.tokens.length > 0 && (
            <div className="mb-6">
              <h3 className="text-xs font-bold text-blue-500 uppercase tracking-wider mb-3 flex items-center gap-2">
                <FileText size={14} /> Tokens & Bookings
              </h3>
              <div className="bg-white rounded-xl border border-slate-200 shadow-sm divide-y divide-slate-100 overflow-hidden">
                {car.tokens.map(token => (
                  <div key={token.id} className={`p-4 flex flex-col sm:flex-row justify-between sm:items-center gap-3 ${token.status === 'FORFEITED' ? 'bg-red-50/30' : token.status === 'APPLIED' ? 'bg-emerald-50/30' : 'bg-blue-50/30'}`}>
                    <div className="flex items-start gap-3">
                      <div className={`p-2 rounded-lg mt-0.5 ${token.status === 'FORFEITED' ? 'bg-red-100 text-red-600' : token.status === 'APPLIED' ? 'bg-emerald-100 text-emerald-600' : 'bg-blue-100 text-blue-600'}`}>
                        <FileText size={16} />
                      </div>
                      <div>
                        <div className="font-bold text-sm text-slate-800">{token.customerName}</div>
                        <div className="text-xs font-medium text-slate-500 mt-0.5">
                          {new Date(token.date).toLocaleDateString('en-GB')} {token.customerMobile ? `• ${token.customerMobile}` : ''}
                        </div>
                        <div className="mt-1">
                          <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded uppercase tracking-wider ${token.status === 'FORFEITED' ? 'bg-red-100 text-red-700 border-red-200' : token.status === 'APPLIED' ? 'bg-emerald-100 text-emerald-700 border-emerald-200' : 'bg-blue-100 text-blue-700 border-blue-200'} border`}>
                            {token.status}
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="flex flex-col sm:items-end gap-2 shrink-0 border-t sm:border-t-0 pt-3 sm:pt-0 border-slate-200/60">
                        <div className="flex flex-col items-end">
                          <span className="font-black text-lg text-slate-800">
                            ₹{Number(token.amount).toLocaleString('en-IN')}
                          </span>
                          {token.agreedSalePrice && (
                            <span className="text-[10px] font-bold text-emerald-600 uppercase tracking-wider">
                              Sale: ₹{Number(token.agreedSalePrice).toLocaleString('en-IN')}
                            </span>
                          )}
                        </div>
                      {token.status === 'ACTIVE' && (
                        <button 
                          onClick={async () => {
                            if(confirm(`Are you sure you want to FORFEIT ${token.customerName}'s token? This will permanently mark ₹${Number(token.amount).toLocaleString('en-IN')} as firm income.`)) {
                              const res = await forfeitToken(token.id);
                              if (res.success) {
                                alert('Token forfeited successfully!');
                                router.refresh();
                                onClose();
                              } else {
                                alert(res.error || 'Failed to forfeit token');
                              }
                            }
                          }}
                          className="text-[10px] font-bold bg-red-100 hover:bg-red-200 text-red-700 px-3 py-1.5 rounded transition-colors uppercase tracking-wider"
                        >
                          Forfeit (Income)
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Document Verification */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-2 m-0">
                <FolderCheck size={14} /> Document Verification
              </h3>
              <div className="text-[10px] font-bold uppercase tracking-widest bg-slate-100 text-slate-500 px-2 py-0.5 rounded-full">
                {receivedDocs.length} / {REQUIRED_DOCS.length} Received
              </div>
            </div>
            
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4 grid grid-cols-2 sm:grid-cols-3 gap-3">
              {REQUIRED_DOCS.map(doc => {
                const isReceived = receivedDocs.includes(doc);
                return (
                  <button
                    key={doc}
                    onClick={() => toggleDocument(doc)}
                    className={`flex items-center justify-between p-3 rounded-lg border transition-all text-left ${
                      isReceived 
                        ? 'bg-emerald-50 border-emerald-200 text-emerald-700 shadow-inner' 
                        : 'bg-slate-50 border-slate-200 text-slate-500 hover:bg-slate-100'
                    }`}
                  >
                    <span className="text-xs font-bold tracking-tight">{doc}</span>
                    <div className={`w-4 h-4 rounded-full flex items-center justify-center border ${
                      isReceived ? 'bg-emerald-500 border-emerald-600 text-white' : 'border-slate-300 bg-white'
                    }`}>
                      {isReceived && <CheckCircle2 size={10} strokeWidth={4} />}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

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
    </div>,
    document.body
  );
}
