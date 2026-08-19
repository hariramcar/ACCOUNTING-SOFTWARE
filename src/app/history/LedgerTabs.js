'use client';

import { useState, useMemo } from 'react';
import { Building2, Car, ArrowDownRight, ArrowUpRight, TrendingUp, Receipt, Wallet, BookOpen, Search, X, CheckCircle2 } from 'lucide-react';
import TransactionActions from '../expenses/TransactionActions';
import { updateExpense } from '@/actions/expenses';

const isExpenseCounted = (exp) => {
  if (exp.rawCategory === 'VEHICLE_PURCHASE') return false;
  if (exp.description?.startsWith('Auto-Entry: Paid Full Settlement')) return false;
  if (exp.isTransfer) return false;
  if (exp.status === 'REJECTED') return false;
  
  if (exp.rawCategory === 'UPAD_WITHDRAWAL' || exp.rawCategory === 'UPAD_REPAYMENT') return false;
  
  return true;
};

const PaymentSource = ({ source, accounts, inline = false }) => {
  if (!source) return <span className="text-slate-300 font-bold">-</span>;
  
  try {
    if (typeof source === 'string' && source.startsWith('{') && source.includes('"payments"')) {
      const parsed = JSON.parse(source);
      if (parsed.payments && Array.isArray(parsed.payments)) {
        if (inline) {
          return (
            <span className="text-slate-700 font-bold tracking-wider inline-flex gap-1 items-center">
              {parsed.payments.map((p, i) => {
                const accName = accounts?.find(a => a.id === p.accountId)?.name || p.mode;
                const displayName = accName === 'UGHRANI' ? 'MARKET PLACE' : accName;
                return (
                  <span key={i}>
                    {displayName} {parsed.payments.length > 1 && <span className="opacity-70">(₹{Number(p.amount || 0).toLocaleString('en-IN')})</span>}
                    {i < parsed.payments.length - 1 ? ', ' : ''}
                  </span>
                );
              })}
            </span>
          );
        }
        
        return (
          <div className="flex flex-wrap gap-1">
            {parsed.payments.map((p, i) => {
              const accName = accounts?.find(a => a.id === p.accountId)?.name || p.mode;
              const displayName = accName === 'UGHRANI' ? 'MARKET PLACE' : accName;
              return (
                <span key={i} className="bg-slate-100 border border-slate-200 text-slate-600 px-1.5 py-0.5 rounded font-bold uppercase tracking-wider text-[9px] whitespace-nowrap inline-flex items-center gap-1">
                  {displayName} {parsed.payments.length > 1 && <span className="opacity-70">(₹{Number(p.amount || 0).toLocaleString('en-IN')})</span>}
                </span>
              );
            })}
          </div>
        );
      }
    }
  } catch(e) {
    console.error('Error parsing payment source:', e);
  }
  
  const displayName = source === 'UGHRANI' ? 'MARKET PLACE' : source;
  
  if (inline) {
    return <span className="text-slate-700">{displayName}</span>;
  }
  
  return (
    <span className="bg-slate-100 border border-slate-200 text-slate-600 px-2 py-1 rounded font-bold uppercase tracking-wider text-[10px] inline-block">
      {displayName}
    </span>
  );
};

const isIncomeCounted = (inc) => {
  if (inc.rawCategory === 'VEHICLE_SALE') return false;
  if (inc.description?.startsWith('Token Received:') && !inc.isForfeitedToken) return false;
  if (inc.description?.startsWith('Income: Received from')) return false;
  if (inc.description?.startsWith('Auto-Entry: Received Pending Capital')) return false;
  if (inc.description?.startsWith('Auto-Entry: Paid Pending Udhari')) return false;
  if (inc.description?.startsWith('Auto-Entry: Partnership Capital Investment')) return false;
  if (inc.isTransfer) return false;
  return true;
};

export default function LedgerTabs({ income, expenses, totalIncome, totalExpenses, accounts = [], vehicles = [] }) {
  const [activeTab, setActiveTab] = useState('INCOME');
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState('ALL'); // 'ALL', 'CASH', 'BANK', 'TRANSFERS'

  const applyFilters = (data) => {
    if (!data) return [];
    
    let filtered = data;

    // Apply Chip Filter
    if (filterType === 'CASH') {
      filtered = filtered.filter(item => item.paymentSource === 'CASH');
    } else if (filterType === 'BANK') {
      filtered = filtered.filter(item => item.paymentSource !== 'CASH' && item.paymentSource !== 'UNKNOWN' && !item.isTransfer);
    } else if (filterType === 'TRANSFERS') {
      filtered = filtered.filter(item => item.isTransfer);
    } else if (filterType === 'CAR_EXPENSE') {
      filtered = filtered.filter(item => item.expenseType === 'CAR_EXPENSE');
    } else if (filterType === 'OFFICE_EXPENSE') {
      filtered = filtered.filter(item => item.expenseType === 'OFFICE_EXPENSE');
    } else if (filterType === 'ADVANCE') {
      filtered = filtered.filter(item => item.expenseType === 'ADVANCE');
    } else if (['STAFF', 'PARTNER', 'FINANCIER', 'DSA_AGENT', 'UGHRANI'].includes(filterType)) {
      filtered = filtered.filter(item => item.accountType === filterType);
    }

    // Apply Text Search
    if (searchQuery.trim() !== '') {
      const q = searchQuery.toLowerCase();
      filtered = filtered.filter(item => {
        const descMatch = item.description?.toLowerCase().includes(q);
        const recipientMatch = item.recipient?.toLowerCase().includes(q);
        const amountMatch = item.amount?.toString().includes(q);
        const carMatch = item.vehicle ? `${item.vehicle.make} ${item.vehicle.model} ${item.vehicle.registration}`.toLowerCase().includes(q) : false;
        
        return descMatch || recipientMatch || amountMatch || carMatch;
      });
    }

    return filtered;
  };

  const filteredIncome = useMemo(() => applyFilters(income), [income, filterType, searchQuery]);
  const filteredExpenses = useMemo(() => applyFilters(expenses), [expenses, filterType, searchQuery]);

  const netProfit = totalIncome - totalExpenses;

  
  const handleAmountFormat = (val) => {
    const rawValue = val.replace(/[^0-9.]/g, '');
    if (!rawValue) return '';
    const parts = rawValue.split('.');
    parts[0] = Number(parts[0]).toLocaleString('en-IN');
    return parts.join('.');
  };

  return (
    <div className="flex flex-col gap-8 mt-2">
      {/* Summary Cards acting as Toggle Buttons */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3 md:gap-6">
        {/* Income Card Toggle */}
        <div 
          onClick={() => setActiveTab('INCOME')}
          className={`rounded-xl p-3 md:p-6 flex flex-col md:flex-row items-start md:items-center justify-between relative overflow-hidden cursor-pointer transition-all duration-300 ease-out transform ${
            activeTab === 'INCOME' 
              ? 'bg-white border-2 border-emerald-400 shadow-[0_8px_30px_rgb(16,185,129,0.15)] scale-[1.02]' 
              : 'bg-white border border-slate-200 shadow-sm hover:border-emerald-300 hover:shadow-md opacity-70 hover:opacity-100 scale-100'
          }`}
        >
          {activeTab === 'INCOME' && <div className="absolute -right-4 -top-4 w-16 h-16 md:w-24 md:h-24 bg-emerald-50 rounded-full blur-xl md:blur-2xl opacity-100"></div>}
          <div className="relative z-10 w-full text-center md:text-left">
            <p className={`text-[10px] md:text-[11px] font-bold uppercase tracking-widest mb-0.5 md:mb-1 ${activeTab === 'INCOME' ? 'text-emerald-600/90' : 'text-slate-500'}`}>Total Income</p>
            <h2 className={`text-[17px] sm:text-xl md:text-3xl font-black tracking-tight m-0 ${activeTab === 'INCOME' ? 'text-emerald-600' : 'text-slate-700'}`}>₹{Number(totalIncome).toLocaleString('en-IN')}</h2>
          </div>
          <div className={`hidden md:flex w-12 h-12 rounded-full items-center justify-center relative z-10 transition-colors flex-shrink-0 ${
            activeTab === 'INCOME' ? 'bg-emerald-100 text-emerald-600' : 'bg-slate-100 text-slate-400'
          }`}>
            <TrendingUp className="w-6 h-6" />
          </div>
        </div>
        
        {/* Expense Card Toggle */}
        <div 
          onClick={() => setActiveTab('EXPENSE')}
          className={`rounded-xl p-3 md:p-6 flex flex-col md:flex-row items-start md:items-center justify-between relative overflow-hidden cursor-pointer transition-all duration-300 ease-out transform ${
            activeTab === 'EXPENSE' 
              ? 'bg-white border-2 border-red-400 shadow-[0_8px_30px_rgb(239,68,68,0.15)] scale-[1.02]' 
              : 'bg-white border border-slate-200 shadow-sm hover:border-red-300 hover:shadow-md opacity-70 hover:opacity-100 scale-100'
          }`}
        >
          {activeTab === 'EXPENSE' && <div className="absolute -right-4 -top-4 w-16 h-16 md:w-24 md:h-24 bg-red-50 rounded-full blur-xl md:blur-2xl opacity-100"></div>}
          <div className="relative z-10 w-full text-center md:text-left">
            <p className={`text-[10px] md:text-[11px] font-bold uppercase tracking-widest mb-0.5 md:mb-1 ${activeTab === 'EXPENSE' ? 'text-red-600/90' : 'text-slate-500'}`}>Total Expenses</p>
            <h2 className={`text-[17px] sm:text-xl md:text-3xl font-black tracking-tight m-0 ${activeTab === 'EXPENSE' ? 'text-red-600' : 'text-slate-700'}`}>₹{Number(totalExpenses).toLocaleString('en-IN')}</h2>
          </div>
          <div className={`hidden md:flex w-12 h-12 rounded-full items-center justify-center relative z-10 transition-colors flex-shrink-0 ${
            activeTab === 'EXPENSE' ? 'bg-red-100 text-red-600' : 'bg-slate-100 text-slate-400'
          }`}>
            <Receipt className="w-6 h-6" />
          </div>
        </div>
        {/* Net Profit Card (Desktop Only) */}
        <div 
          className="hidden md:flex rounded-xl p-3 md:p-6 flex-col md:flex-row items-start md:items-center justify-between relative overflow-hidden bg-white border border-slate-200 shadow-sm opacity-90 scale-100 cursor-default"
        >
          <div className="relative z-10 w-full text-center md:text-left">
            <p className="text-[10px] md:text-[11px] font-bold uppercase tracking-widest mb-0.5 md:mb-1 text-slate-500">Net Profit (expenses-income)</p>
            <h2 className={`text-[17px] sm:text-xl md:text-3xl font-black tracking-tight m-0 ${netProfit >= 0 ? 'text-indigo-600' : 'text-rose-600'}`}>
              {netProfit < 0 ? '-' : ''}₹{Math.abs(netProfit).toLocaleString('en-IN')}
            </h2>
          </div>
          <div className={`hidden md:flex w-12 h-12 rounded-full items-center justify-center relative z-10 transition-colors flex-shrink-0 ${netProfit >= 0 ? 'bg-indigo-100 text-indigo-600' : 'bg-rose-100 text-rose-600'}`}>
            <Wallet className="w-6 h-6" />
          </div>
        </div>
      </div>

      {/* Premium Search & Filter Bar */}
      <div className="bg-white rounded-2xl md:rounded-[1.5rem] p-2 shadow-[0_8px_30px_rgb(0,0,0,0.06)] border border-slate-100 relative z-20 ring-1 ring-slate-900/5">
        <div className="flex flex-col gap-2">
          {/* Search Input */}
          <div className="relative group">
            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-400 group-focus-within:text-indigo-500 transition-colors">
              <Search className="w-5 h-5" />
            </div>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search..."
              className="w-full pl-11 pr-11 py-3.5 bg-slate-50/80 border-0 rounded-xl md:rounded-[1.25rem] focus:outline-none focus:ring-4 focus:ring-indigo-500/10 focus:bg-white text-slate-900 placeholder:text-slate-400 text-[15px] font-semibold transition-all"
            />
            {searchQuery && (
              <button 
                onClick={() => setSearchQuery('')}
                className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600 transition-colors"
              >
                <div className="bg-slate-200/50 p-1.5 rounded-full hover:bg-slate-200 transition-colors">
                  <X className="w-4 h-4 text-slate-600" />
                </div>
              </button>
            )}
          </div>
          
          {/* Filter Chips - Premium iOS Style */}
          <div className="flex overflow-x-auto items-center gap-1.5 pb-1 px-1 scroll-smooth snap-x hide-scrollbar" style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
            {[
              { id: 'ALL', label: 'All' },
              { id: 'CASH', label: 'Cash' },
              { id: 'BANK', label: 'Bank' },
              { id: 'TRANSFERS', label: 'Transfers' },
              { id: 'CAR_EXPENSE', label: 'Car Expenses' },
              { id: 'OFFICE_EXPENSE', label: 'Office Expenses' },
              { id: 'ADVANCE', label: 'Advances' },
              { id: 'STAFF', label: 'Staff' },
              { id: 'PARTNER', label: 'Partner' },
              { id: 'FINANCIER', label: 'Financier' },
              { id: 'DSA_AGENT', label: 'DSA Agent' },
              { id: 'UGHRANI', label: 'Market Place' }
            ].map(chip => (
              <button
                key={chip.id}
                onClick={() => setFilterType(chip.id)}
                className={`flex-shrink-0 snap-start whitespace-nowrap px-5 py-2 rounded-xl text-[13px] font-bold tracking-wide transition-all duration-300 ease-out ${
                  filterType === chip.id 
                    ? 'bg-slate-900 text-white shadow-md shadow-slate-900/20 scale-[1.02]' 
                    : 'bg-transparent text-slate-500 hover:bg-slate-100 hover:text-slate-800'
                }`}
              >
                {chip.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Content Area - Full Width */}
      <div className="w-full">
        {activeTab === 'INCOME' && (
          <div className="flex flex-col gap-3">
            {/* Mobile Card Layout */}
            <div className="flex flex-col gap-3 md:hidden">
              {(() => {
                if (!filteredIncome || filteredIncome.length === 0) return null;
                const grouped = filteredIncome.reduce((acc, inc) => {
                  const dateStr = new Date(inc.date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
                  if (!acc[dateStr]) acc[dateStr] = [];
                  acc[dateStr].push(inc);
                  return acc;
                }, {});
                return Object.entries(grouped).map(([dateStr, items]) => (
                  <div key={dateStr} className="mb-4">
                    <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2 ml-2">{dateStr}</h3>
                    <div className="bg-white rounded-xl shadow-[0_2px_10px_-4px_rgba(0,0,0,0.05)] border border-slate-200 overflow-hidden flex flex-col">
                      {items.map(inc => (
                        <div key={inc.id} className="p-3 border-b border-slate-100 last:border-0 active:bg-slate-50 transition-colors flex justify-between items-start gap-3">
                          <div className="flex flex-col gap-1 flex-1 min-w-0">
                            <span className="text-[13px] font-bold text-slate-900 leading-tight line-clamp-2">{inc.description || 'Incoming Funds'}</span>
                            <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                              {inc.transferDetails && (
                                <span className="text-blue-600 text-[10px] font-bold uppercase tracking-wider">{inc.transferDetails}</span>
                              )}
                              {inc.paymentSource && (
                                <span className="text-slate-500 text-[10px] font-semibold flex items-center gap-1">
                                  Source: <PaymentSource source={inc.paymentSource} accounts={accounts} inline={true} />
                                  {isIncomeCounted(inc) && <CheckCircle2 size={12} className="text-emerald-500" title="Counted in Total Income" />}
                                </span>
                              )}
                            </div>
                          </div>
                          <span className={`text-[14px] font-black tracking-tight whitespace-nowrap shrink-0 mt-0.5 ${inc.isTransfer ? 'text-blue-600' : 'text-emerald-600'}`}>
                            +₹{Number(inc.amount).toLocaleString('en-IN')}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                ));
              })()}
            </div>

            {/* Desktop Table Layout */}
            <div className="hidden md:block w-full overflow-hidden bg-white border border-slate-200 rounded-xl shadow-sm">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50/80 border-b border-slate-200">
                    <th className="py-4 px-5 text-[10px] font-bold text-slate-500 uppercase tracking-wider">Date</th>
                    <th className="py-4 px-5 text-[10px] font-bold text-slate-500 uppercase tracking-wider">Description</th>
                    <th className="py-4 px-5 text-[10px] font-bold text-slate-500 uppercase tracking-wider">Source</th>
                    <th className="py-4 px-5 text-[10px] font-bold text-slate-500 uppercase tracking-wider text-right">Amount</th>
                    <th className="py-4 px-5"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredIncome?.map(inc => (
                    <tr key={inc.id} className="hover:bg-slate-50/80 transition-colors group">
                      <td className="py-4 px-5 text-[12px] font-bold text-slate-600 whitespace-nowrap">
                        {new Date(inc.date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
                      </td>
                      <td className="py-4 px-5">
                        <div className="flex items-center gap-3">
                          <div className={`p-2 rounded-lg border flex-shrink-0 ${inc.isTransfer ? 'bg-blue-50 text-blue-500 border-blue-100' : 'bg-emerald-50 text-emerald-500 border-emerald-100'}`}>
                            {inc.isTransfer ? <Wallet size={16} /> : <ArrowDownRight size={16} />}
                          </div>
                          <div className="flex flex-col">
                            <span className="text-[14px] font-bold text-slate-900">{inc.description || 'Incoming Funds'}</span>
                            {inc.transferDetails && (
                              <span className="text-blue-600 text-[10px] font-bold uppercase tracking-wider">{inc.transferDetails}</span>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="py-4 px-5">
                        <div className="flex items-center gap-2">
                          {inc.paymentSource ? (
                            <PaymentSource source={inc.paymentSource} accounts={accounts} />
                          ) : <span className="text-slate-300 font-bold">-</span>}
                          {isIncomeCounted(inc) && <CheckCircle2 size={14} className="text-emerald-500 shrink-0" title="Counted in Total Income" />}
                        </div>
                      </td>
                      <td className="py-4 px-5 text-right font-black text-lg whitespace-nowrap">
                        <span className={inc.isTransfer ? 'text-blue-600' : 'text-emerald-600'}>
                          +₹{Number(inc.amount).toLocaleString('en-IN')}
                        </span>
                      </td>
                      <td className="py-4 px-5 text-right">
                        <div className="opacity-0 group-hover:opacity-100 transition-opacity flex justify-end">
                          <TransactionActions expense={inc} updateExpenseAction={updateExpense} isRawTx={inc.isRawTx} hideDelete={true} accounts={accounts} vehicles={vehicles} />
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {(!filteredIncome || filteredIncome.length === 0) && (
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-12 flex flex-col items-center justify-center text-center">
                <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mb-4 text-slate-400">
                  <Search size={24} />
                </div>
                <p className="text-slate-600 text-lg font-bold m-0 mb-1">No income records found</p>
                <p className="text-slate-500 text-sm font-medium m-0">Try adjusting your search or filters.</p>
              </div>
            )}
          </div>
        )}

        {activeTab === 'EXPENSE' && (
          <div className="flex flex-col gap-3">
            {/* Mobile Card Layout */}
            <div className="flex flex-col gap-3 md:hidden">
              {(() => {
                if (!filteredExpenses || filteredExpenses.length === 0) return null;
                const grouped = filteredExpenses.reduce((acc, exp) => {
                  const dateStr = new Date(exp.date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
                  if (!acc[dateStr]) acc[dateStr] = [];
                  acc[dateStr].push(exp);
                  return acc;
                }, {});
                return Object.entries(grouped).map(([dateStr, items]) => (
                  <div key={dateStr} className="mb-4">
                    <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2 ml-2">{dateStr}</h3>
                    <div className="bg-white rounded-xl shadow-[0_2px_10px_-4px_rgba(0,0,0,0.05)] border border-slate-200 overflow-hidden flex flex-col">
                      {items.map(exp => (
                        <div key={exp.id} className={`p-3 border-b border-slate-100 last:border-0 active:bg-slate-50 transition-colors flex justify-between items-start gap-3 ${exp.status === 'REJECTED' ? 'bg-red-50/30' : ''}`}>
                          <div className="flex flex-col gap-1 flex-1 min-w-0">
                            <span className={`text-[13px] font-bold leading-tight line-clamp-2 ${exp.status === 'REJECTED' ? 'line-through text-slate-400' : 'text-slate-900'}`}>{exp.description}</span>
                            <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                              {exp.vehicle && (
                                <span className="text-[10px] font-semibold text-slate-500">Vehicle: <span className="text-slate-700">{exp.vehicle.make} {exp.vehicle.model} ({exp.vehicle.registration})</span></span>
                              )}
                              {/* Recipient removed */}
                              {exp.paymentSource && (
                                <span className="text-[10px] font-semibold text-slate-500 flex items-center gap-1">Source: <PaymentSource source={exp.paymentSource} accounts={accounts} inline={true} />
                                {isExpenseCounted(exp) && <CheckCircle2 size={12} className="text-emerald-500" title="Counted in Total Expenses" />}
                                </span>
                              )}
                            </div>
                          </div>
                          <div className="flex flex-col items-end shrink-0 mt-0.5 gap-1">
                            <span className={`text-[14px] font-black tracking-tight whitespace-nowrap ${exp.status === 'REJECTED' ? 'text-slate-400 line-through' : (exp.expenseType === 'OFFICE_EXPENSE' ? 'text-red-600' : 'text-indigo-600')}`}>
                              -₹{Number(exp.amount).toLocaleString('en-IN')}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ));
              })()}
            </div>

            {/* Desktop Table Layout */}
            <div className="hidden md:block w-full overflow-hidden bg-white border border-slate-200 rounded-xl shadow-sm">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50/80 border-b border-slate-200">
                    <th className="py-4 px-5 text-[10px] font-bold text-slate-500 uppercase tracking-wider">Date</th>
                    <th className="py-4 px-5 text-[10px] font-bold text-slate-500 uppercase tracking-wider">Description</th>
                    {/* Paid To column removed */}
                    <th className="py-4 px-5 text-[10px] font-bold text-slate-500 uppercase tracking-wider">Source</th>
                    <th className="py-4 px-5 text-[10px] font-bold text-slate-500 uppercase tracking-wider text-right">Amount</th>
                    <th className="py-4 px-5"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredExpenses?.map(exp => (
                    <tr key={exp.id} className={`hover:bg-slate-50/80 transition-colors group ${exp.status === 'REJECTED' ? 'bg-red-50/30' : ''}`}>
                      <td className="py-4 px-5 text-[12px] font-bold text-slate-600 whitespace-nowrap">
                        {new Date(exp.date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
                      </td>
                      <td className="py-4 px-5">
                        <div className="flex items-center gap-3">
                          <div className={`p-2 rounded-lg border flex-shrink-0 ${exp.expenseType === 'ADVANCE' ? 'bg-blue-50 text-blue-500 border-blue-100' : exp.expenseType === 'OFFICE_EXPENSE' ? 'bg-red-50 text-red-500 border-red-100' : 'bg-indigo-50 text-indigo-500 border-indigo-100'}`}>
                            {exp.expenseType === 'ADVANCE' ? <Wallet size={16} /> : exp.expenseType === 'OFFICE_EXPENSE' ? <Building2 size={16} /> : <Car size={16} />}
                          </div>
                          <div className="flex flex-col">
                            <span className={`text-[14px] font-bold ${exp.status === 'REJECTED' ? 'line-through text-slate-400' : 'text-slate-900'}`}>{exp.description}</span>
                            {exp.transferDetails && (
                              <span className="text-blue-600 text-[10px] font-bold uppercase tracking-wider">{exp.transferDetails}</span>
                            )}
                            {exp.vehicle && (
                              <span className="text-[11px] font-medium text-slate-500 mt-0.5">Linked to: <span className="font-bold text-slate-700">{exp.vehicle.make} {exp.vehicle.model} ({exp.vehicle.registration})</span></span>
                            )}
                          </div>
                        </div>
                      </td>
                      {/* Paid To column removed */}
                      <td className="py-4 px-5">
                        <div className="flex items-center gap-2">
                          <PaymentSource source={exp.paymentSource} accounts={accounts} />
                          {isExpenseCounted(exp) && <CheckCircle2 size={14} className="text-emerald-500 shrink-0" title="Counted in Total Expenses" />}
                        </div>
                      </td>
                      <td className="py-4 px-5 text-right font-black text-lg whitespace-nowrap">
                        <span className={exp.status === 'REJECTED' ? 'text-slate-400 line-through' : (exp.expenseType === 'OFFICE_EXPENSE' ? 'text-red-600' : 'text-indigo-600')}>
                          -₹{Number(exp.amount).toLocaleString('en-IN')}
                        </span>
                      </td>
                      <td className="py-4 px-5 text-right">
                        <div className="opacity-0 group-hover:opacity-100 transition-opacity flex justify-end">
                          <TransactionActions expense={exp} updateExpenseAction={updateExpense} isRawTx={exp.isRawTx} hideDelete={true} accounts={accounts} vehicles={vehicles} />
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {(!filteredExpenses || filteredExpenses.length === 0) && (
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-12 flex flex-col items-center justify-center text-center">
                <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mb-4 text-slate-400">
                  <Search size={24} />
                </div>
                <p className="text-slate-600 text-lg font-bold m-0 mb-1">No expense records found</p>
                <p className="text-slate-500 text-sm font-medium m-0">Try adjusting your search or filters.</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
