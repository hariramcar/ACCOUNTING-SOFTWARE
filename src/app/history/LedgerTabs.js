'use client';

import { useState } from 'react';
import { Building2, Car, ArrowDownRight, ArrowUpRight, TrendingUp, Receipt, Wallet, BookOpen } from 'lucide-react';
import TransactionActions from '../expenses/TransactionActions';
import { updateExpense } from '@/actions/expenses';

export default function LedgerTabs({ income, expenses, totalIncome, totalExpenses }) {
  const [activeTab, setActiveTab] = useState('INCOME');

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

      {/* Content Area - Full Width */}
      <div className="w-full">
        {activeTab === 'INCOME' && (
          <div className="flex flex-col gap-3">
            {/* Desktop Header */}
            {income?.length > 0 && (
              <div className="hidden md:flex items-center px-4 py-2 text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                <div className="flex-1 min-w-[200px]">Description</div>
                <div className="w-32 text-right pr-4">Date</div>
                <div className="w-32 text-right">Amount</div>
                <div className="w-16"></div> {/* Actions Spacer */}
              </div>
            )}

            {income?.map(inc => (
              <div key={inc.id} className="bg-white rounded-xl p-4 md:px-4 md:py-3 flex flex-col md:flex-row md:items-center gap-3 md:gap-4 shadow-sm border border-emerald-100 hover:border-emerald-300 transition-colors relative">
                
                {/* Mobile Top Row / Desktop Col 1 (Description) */}
                <div className="flex items-center gap-4 flex-1 min-w-[200px] pr-10 md:pr-0 overflow-hidden">
                  <div className="p-2.5 rounded-lg bg-emerald-50 text-emerald-500 border border-emerald-100 shrink-0 hidden md:flex">
                    <ArrowDownRight size={18} />
                  </div>
                  <div className="flex flex-col truncate w-full">
                    <span className="text-[15px] md:text-sm font-medium text-slate-900" title={inc.description}>
                      {inc.description || 'Incoming Funds'}
                      {inc.transferDetails && (
                        <span className="text-blue-600 ml-2 text-xs font-bold uppercase tracking-wider">({inc.transferDetails})</span>
                      )}
                    </span>
                    {/* Mobile Only Details */}
                    <span className="md:hidden text-xs font-medium text-slate-400 mt-1">
                      {new Date(inc.date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                    </span>
                  </div>
                </div>

                {/* Desktop Col 2 (Date) */}
                <div className="hidden md:block w-32 text-right pr-4 text-sm font-medium text-slate-500">
                  {new Date(inc.date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
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

            {(!income || income.length === 0) && (
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-12 flex flex-col items-center justify-center text-center">
                <p className="text-slate-500 text-base font-medium m-0">No income records found for this month.</p>
              </div>
            )}
          </div>
        )}

        {activeTab === 'EXPENSE' && (
          <div className="flex flex-col gap-3">
            {/* Desktop Header */}
            {expenses?.length > 0 && (
              <div className="hidden md:flex items-center px-4 py-2 text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                <div className="flex-1 min-w-[200px]">Description</div>
                <div className="w-28 text-right">Date</div>
                <div className="w-36 text-right pr-4">Payment Source</div>
                <div className="w-32 text-right">Amount</div>
                <div className="w-16"></div> {/* Actions Spacer */}
              </div>
            )}

            {expenses?.map(exp => (
              <div key={exp.id} className={`bg-white rounded-xl p-4 md:px-4 md:py-3 flex flex-col md:flex-row md:items-center gap-3 md:gap-4 shadow-sm border transition-colors relative ${exp.status === 'REJECTED' ? 'border-red-200 bg-red-50/30' : 'border-slate-200 hover:border-slate-300'}`}>
                
                {/* Mobile Top Row / Desktop Col 1 (Description) */}
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
                    
                    {/* Mobile Only Details */}
                    <span className="md:hidden text-xs font-medium text-slate-400 mt-1 flex items-center gap-2">
                      <span>{new Date(exp.date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
                      {exp.paymentSource && (
                        <>
                          <span className="text-slate-300">•</span>
                          <span className="bg-slate-100 border border-slate-200 text-slate-600 px-1.5 py-0.5 rounded font-bold uppercase tracking-wider text-[9px] shadow-sm">
                            {exp.paymentSource === 'UGHRANI' ? 'MARKET PLACE' : exp.paymentSource}
                          </span>
                        </>
                      )}
                    </span>
                  </div>
                </div>

                {/* Desktop Col 2 (Date) */}
                <div className="hidden md:block w-28 text-right text-sm font-medium text-slate-500">
                  {new Date(exp.date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
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

            {(!expenses || expenses.length === 0) && (
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-12 flex flex-col items-center justify-center text-center">
                <p className="text-slate-500 text-base font-medium m-0">No expense records found for this month.</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
