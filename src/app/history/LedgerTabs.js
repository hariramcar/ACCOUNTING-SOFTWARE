'use client';

import { useState, useMemo } from 'react';
import { Building2, Car, ArrowDownRight, ArrowUpRight, TrendingUp, Receipt, Wallet, BookOpen, Search, X } from 'lucide-react';
import TransactionActions from '../expenses/TransactionActions';
import { updateExpense } from '@/actions/expenses';

export default function LedgerTabs({ income, expenses, totalIncome, totalExpenses }) {
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

  return (
    <div className="flex flex-col gap-8 mt-2">
      {/* Summary Cards acting as Toggle Buttons */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Income Card Toggle */}
        <div 
          onClick={() => setActiveTab('INCOME')}
          className={`rounded-xl p-6 flex items-center justify-between relative overflow-hidden cursor-pointer transition-all duration-300 ease-out transform ${
            activeTab === 'INCOME' 
              ? 'bg-white border-2 border-emerald-400 shadow-[0_8px_30px_rgb(16,185,129,0.15)] scale-[1.02]' 
              : 'bg-white border border-slate-200 shadow-sm hover:border-emerald-300 hover:shadow-md opacity-70 hover:opacity-100 scale-100'
          }`}
        >
          {activeTab === 'INCOME' && <div className="absolute -right-4 -top-4 w-24 h-24 bg-emerald-50 rounded-full blur-2xl opacity-100"></div>}
          <div className="relative z-10">
            <p className={`text-[11px] font-bold uppercase tracking-widest mb-1 ${activeTab === 'INCOME' ? 'text-emerald-600/90' : 'text-slate-500'}`}>Total Income (This Month)</p>
            <h2 className={`text-3xl font-black tracking-tight m-0 ${activeTab === 'INCOME' ? 'text-emerald-600' : 'text-slate-700'}`}>₹{Number(totalIncome).toLocaleString('en-IN')}</h2>
          </div>
          <div className={`w-12 h-12 rounded-full flex items-center justify-center relative z-10 transition-colors ${
            activeTab === 'INCOME' ? 'bg-emerald-100 text-emerald-600' : 'bg-slate-100 text-slate-400'
          }`}>
            <TrendingUp size={24} />
          </div>
        </div>
        
        {/* Expense Card Toggle */}
        <div 
          onClick={() => setActiveTab('EXPENSE')}
          className={`rounded-xl p-6 flex items-center justify-between relative overflow-hidden cursor-pointer transition-all duration-300 ease-out transform ${
            activeTab === 'EXPENSE' 
              ? 'bg-white border-2 border-red-400 shadow-[0_8px_30px_rgb(239,68,68,0.15)] scale-[1.02]' 
              : 'bg-white border border-slate-200 shadow-sm hover:border-red-300 hover:shadow-md opacity-70 hover:opacity-100 scale-100'
          }`}
        >
          {activeTab === 'EXPENSE' && <div className="absolute -right-4 -top-4 w-24 h-24 bg-red-50 rounded-full blur-2xl opacity-100"></div>}
          <div className="relative z-10">
            <p className={`text-[11px] font-bold uppercase tracking-widest mb-1 ${activeTab === 'EXPENSE' ? 'text-red-600/90' : 'text-slate-500'}`}>Total Expenses (This Month)</p>
            <h2 className={`text-3xl font-black tracking-tight m-0 ${activeTab === 'EXPENSE' ? 'text-red-600' : 'text-slate-700'}`}>₹{Number(totalExpenses).toLocaleString('en-IN')}</h2>
          </div>
          <div className={`w-12 h-12 rounded-full flex items-center justify-center relative z-10 transition-colors ${
            activeTab === 'EXPENSE' ? 'bg-red-100 text-red-600' : 'bg-slate-100 text-slate-400'
          }`}>
            <Receipt size={24} />
          </div>
        </div>
      </div>

      {/* Smart Search & Filter Bar */}
      <div className="bg-white/80 backdrop-blur-xl border border-slate-200 rounded-2xl p-4 shadow-sm relative z-20">
        <div className="flex flex-col gap-4">
          {/* Search Input */}
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-400">
              <Search size={18} />
            </div>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search transactions, names, amounts, or cars..."
              className="w-full pl-11 pr-10 py-3.5 bg-slate-50/50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 text-slate-900 placeholder:text-slate-400 font-medium transition-all"
            />
            {searchQuery && (
              <button 
                onClick={() => setSearchQuery('')}
                className="absolute inset-y-0 right-0 pr-4 flex items-center text-slate-400 hover:text-slate-600"
              >
                <X size={18} />
              </button>
            )}
          </div>
          
          {/* Filter Chips */}
          <div className="flex flex-wrap items-center gap-2">
            {[
              { id: 'ALL', label: 'All Transactions' },
              { id: 'CASH', label: 'Cash Only' },
              { id: 'BANK', label: 'Bank Transfers' },
              { id: 'TRANSFERS', label: 'Internal Transfers' }
            ].map(chip => (
              <button
                key={chip.id}
                onClick={() => setFilterType(chip.id)}
                className={`px-4 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider transition-all duration-200 ${
                  filterType === chip.id 
                    ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/20 scale-105' 
                    : 'bg-slate-100 text-slate-500 hover:bg-slate-200 hover:text-slate-700'
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
            {/* Desktop Header */}
            {filteredIncome?.length > 0 && (
              <div className="hidden md:flex items-center px-4 py-2 text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                <div className="w-24 text-left px-2">Date</div>
                <div className="flex-1 min-w-[200px]">Description</div>
                <div className="w-36 text-right pr-4">Payment Source</div>
                <div className="w-32 text-right">Amount</div>
                <div className="w-16"></div> {/* Actions Spacer */}
              </div>
            )}

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
                  <div className="flex items-center gap-2 mb-3 ml-2">
                    <div className="h-px bg-slate-200 flex-1"></div>
                    <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">{dateStr}</span>
                    <div className="h-px bg-slate-200 flex-1"></div>
                  </div>
                  <div className="flex flex-col gap-3">
                    {items.map(inc => (
                      <div key={inc.id} className="bg-white rounded-xl p-4 md:px-4 md:py-3 flex flex-col md:flex-row md:items-center gap-3 md:gap-4 shadow-sm border border-emerald-100 hover:border-emerald-300 transition-colors relative">
                
                {/* Desktop Col 1 (Date) */}
                <div className="hidden md:block w-24 px-2">
                  <span className="text-[12px] font-bold text-slate-600">{new Date(inc.date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })}</span>
                </div>

                {/* Mobile Top Row / Desktop Col 2 (Description) */}
                <div className="flex items-center gap-4 flex-1 min-w-[200px] pr-10 md:pr-0 overflow-hidden">
                  <div className={`p-2.5 rounded-lg border shrink-0 hidden md:flex ${
                    inc.isTransfer ? 'bg-blue-50 text-blue-500 border-blue-100' : 'bg-emerald-50 text-emerald-500 border-emerald-100'
                  }`}>
                    {inc.isTransfer ? <Wallet size={18} /> : <ArrowDownRight size={18} />}
                  </div>
                  <div className="flex flex-col truncate w-full">
                    <span className="text-[15px] md:text-sm font-medium text-slate-900" title={inc.description}>
                      {inc.description || 'Incoming Funds'}
                      {inc.transferDetails && (
                        <span className="text-blue-600 ml-2 text-xs font-bold uppercase tracking-wider">({inc.transferDetails})</span>
                      )}
                    </span>
                    {/* Mobile Only Details */}
                    <span className="md:hidden text-xs font-medium text-slate-400 mt-1 flex items-center gap-2">
                      {inc.paymentSource && (
                        <span className="bg-slate-100 border border-slate-200 text-slate-600 px-1.5 py-0.5 rounded font-bold uppercase tracking-wider text-[9px] shadow-sm">
                          {inc.paymentSource === 'UGHRANI' ? 'MARKET PLACE' : inc.paymentSource}
                        </span>
                      )}
                    </span>
                  </div>
                </div>



                {/* Desktop Col 3 (Payment Source) */}
                <div className="hidden md:block w-36 text-right pr-4">
                  {inc.paymentSource ? (
                    <span className="bg-slate-100 border border-slate-200 text-slate-600 px-2 py-1 rounded font-bold uppercase tracking-wider text-[10px] shadow-sm inline-block">
                      {inc.paymentSource === 'UGHRANI' ? 'MARKET PLACE' : inc.paymentSource}
                    </span>
                  ) : (
                    <span className="text-slate-300 font-bold">-</span>
                  )}
                </div>

                {/* Mobile Bottom Row / Desktop Col 3 (Amount) */}
                <div className="flex items-center justify-between md:justify-end w-auto md:w-32">
                  <div className="md:hidden text-xs font-bold text-slate-400 uppercase tracking-wider">Amount</div>
                  <div className="font-black text-emerald-600 text-lg md:text-base tracking-tight whitespace-nowrap">
                    +₹{Number(inc.amount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </div>
                </div>

                {/* Actions */}
                <div className="absolute top-3 right-4 md:static md:w-16 flex justify-end">
                  <TransactionActions 
                    expense={inc} 
                    updateExpenseAction={updateExpense} 
                    isRawTx={inc.isRawTx}
                    hideDelete={true}
                  />
                </div>
              </div>
            ))}
                  </div>
                </div>
              ));
            })()}

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
            {/* Desktop Header */}
            {filteredExpenses?.length > 0 && (
              <div className="hidden md:flex items-center px-4 py-2 text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                <div className="w-24 text-left px-2">Date</div>
                <div className="flex-1 min-w-[150px]">Description</div>
                <div className="w-32 text-left px-2">Paid To</div>
                <div className="w-36 text-right pr-4">Payment Source</div>
                <div className="w-32 text-right">Amount</div>
                <div className="w-16"></div> {/* Actions Spacer */}
              </div>
            )}

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
                  <div className="flex items-center gap-2 mb-3 ml-2">
                    <div className="h-px bg-slate-200 flex-1"></div>
                    <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">{dateStr}</span>
                    <div className="h-px bg-slate-200 flex-1"></div>
                  </div>
                  <div className="flex flex-col gap-3">
                    {items.map(exp => (
                      <div key={exp.id} className={`bg-white rounded-xl p-4 md:px-4 md:py-3 flex flex-col md:flex-row md:items-center gap-3 md:gap-4 shadow-sm border transition-colors relative ${exp.status === 'REJECTED' ? 'border-red-200 bg-red-50/30' : 'border-slate-200 hover:border-slate-300'}`}>
                
                {/* Desktop Col 1 (Date) */}
                <div className="hidden md:block w-24 px-2">
                  <span className="text-[12px] font-bold text-slate-600">{new Date(exp.date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })}</span>
                </div>

                {/* Mobile Top Row / Desktop Col 2 (Description) */}
                <div className="flex items-center gap-4 flex-1 min-w-[200px] pr-10 md:pr-0 overflow-hidden">
                  <div className={`p-2.5 rounded-lg border shrink-0 hidden md:flex ${
                    exp.expenseType === 'ADVANCE' ? 'bg-blue-50 text-blue-500 border-blue-100' :
                    exp.expenseType === 'OFFICE_EXPENSE' ? 'bg-red-50 text-red-500 border-red-100' : 'bg-indigo-50 text-indigo-500 border-indigo-100'
                  }`}>
                    {exp.expenseType === 'ADVANCE' ? <Wallet size={18} /> : 
                     exp.expenseType === 'OFFICE_EXPENSE' ? <Building2 size={18} /> : <Car size={18} />}
                  </div>
                  <div className="flex flex-col truncate w-full">
                    <span className={`text-[15px] md:text-sm font-medium ${exp.status === 'REJECTED' ? 'line-through text-slate-400' : 'text-slate-900'}`} title={exp.description}>
                      {exp.description}
                      {exp.transferDetails && (
                        <span className="text-blue-600 ml-2 text-xs font-bold uppercase tracking-wider">({exp.transferDetails})</span>
                      )}
                    </span>
                    {exp.vehicle && (
                      <div className="text-[11px] font-medium text-slate-500 mt-0.5">
                        Linked to: <span className="font-bold text-slate-700">{exp.vehicle.make} {exp.vehicle.model}</span> <span className="uppercase tracking-wider">({exp.vehicle.registration || 'UNREGISTERED'})</span>
                      </div>
                    )}
                    {/* Mobile Only Details */}
                    <span className="md:hidden text-xs font-medium text-slate-400 mt-1 flex items-center gap-2">
                      {exp.recipient && (
                        <>
                          <span className="text-slate-700 font-bold capitalize">{exp.recipient}</span>
                          <span className="text-slate-300">•</span>
                        </>
                      )}
                      {exp.paymentSource && (
                        <>
                          <span className="bg-slate-100 border border-slate-200 text-slate-600 px-1.5 py-0.5 rounded font-bold uppercase tracking-wider text-[9px] shadow-sm">
                            {exp.paymentSource === 'UGHRANI' ? 'MARKET PLACE' : exp.paymentSource}
                          </span>
                        </>
                      )}
                    </span>
                  </div>
                </div>

                {/* Desktop Col 2 (Paid To) */}
                <div className="hidden md:block w-32 px-2">
                  {exp.recipient ? (
                    <span className="text-[13px] font-bold text-slate-700 capitalize">{exp.recipient}</span>
                  ) : (
                    <span className="text-slate-300 font-bold">-</span>
                  )}
                </div>

                {/* Desktop Col 3 (Payment Source) */}
                <div className="hidden md:block w-36 text-right pr-4">
                  {exp.paymentSource ? (
                    <span className="bg-slate-100 border border-slate-200 text-slate-600 px-2 py-1 rounded font-bold uppercase tracking-wider text-[10px] shadow-sm inline-block">
                      {exp.paymentSource === 'UGHRANI' ? 'MARKET PLACE' : exp.paymentSource}
                    </span>
                  ) : (
                    <span className="text-slate-300 font-bold">-</span>
                  )}
                </div>

                {/* Mobile Bottom Row / Desktop Col 4 (Amount) */}
                <div className="flex items-center justify-between md:justify-end w-auto md:w-32">
                  <div className="md:hidden text-xs font-bold text-slate-400 uppercase tracking-wider">Amount</div>
                  <div className={`font-black text-lg md:text-base tracking-tight whitespace-nowrap ${
                    exp.status === 'REJECTED' ? 'text-slate-400 line-through' : (exp.expenseType === 'OFFICE_EXPENSE' ? 'text-red-600' : 'text-indigo-600')
                  }`}>
                    -₹{Number(exp.amount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </div>
                </div>

                {/* Actions */}
                <div className="absolute top-3 right-4 md:static md:w-16 flex justify-end">
                  <TransactionActions 
                    expense={exp} 
                    updateExpenseAction={updateExpense} 
                    isRawTx={exp.isRawTx}
                    hideDelete={true}
                  />
                </div>
              </div>
            ))}
                  </div>
                </div>
              ));
            })()}

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
