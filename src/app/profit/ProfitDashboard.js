import { getMonthlyProfitData, getPendingPayables } from '@/actions/profit';
import { getAccountBalances } from '@/actions/accounts';
import { BarChart3, TrendingDown, ReceiptText, CircleDollarSign, Car, Building2, Landmark, Wallet, TrendingUp } from 'lucide-react';
import PendingPayablesModal from './PendingPayablesModal';
import ProfitCharts from './ProfitCharts';
import VehiclesSoldTable from './VehiclesSoldTable';
import { cookies } from 'next/headers';

export default async function ProfitDashboard() {
  const cookieStore = await cookies();
  const globalMonth = cookieStore.get('global_month')?.value;
  
  let year, month;
  if (globalMonth) {
    const parts = globalMonth.split('-');
    year = Number(parts[0]);
    month = Number(parts[1]);
  } else {
    const d = new Date();
    year = d.getFullYear();
    month = d.getMonth();
  }

  const [result, payablesResult, balancesResult] = await Promise.all([
    getMonthlyProfitData(year, month),
    getPendingPayables(),
    getAccountBalances()
  ]);

  const data = result.success ? result.data : null;
  const payables = payablesResult.success ? payablesResult.payables : [];
  const accounts = payablesResult.success ? payablesResult.accounts : [];
  
  let capitalMetrics = { cash: 0, bank: 0, total: 0 };
  if (balancesResult.accounts) {
    const cash = balancesResult.accounts.filter(a => a.type === 'CASH').reduce((sum, a) => sum + a.currentBalance, 0);
    const bank = balancesResult.accounts.filter(a => a.type === 'BANK').reduce((sum, a) => sum + a.currentBalance, 0);
    const ughrani = balancesResult.accounts.filter(a => a.type === 'UGHRANI').reduce((sum, a) => sum + a.currentBalance, 0);
    capitalMetrics = { cash, bank, total: cash + bank + ughrani };
  }

  const totalMarketplacePending = payables.reduce((sum, p) => sum + p.amount, 0);

  if (!data) return null;

  return (
    <div className="w-full max-w-7xl mx-auto p-4 sm:p-8 flex flex-col gap-6 sm:gap-8 text-slate-900 bg-slate-50 min-h-screen font-sans pb-24 md:pb-8">
      
      {/* HEADER SECTION */}
      <div className="flex flex-col md:flex-row md:justify-between items-start md:items-end gap-4 border-b border-slate-200 pb-5 sticky top-0 bg-slate-50/90 backdrop-blur-xl z-30 pt-4 md:pt-0 -mx-4 px-4 md:mx-0 md:px-0">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 md:w-12 md:h-12 bg-indigo-900 text-indigo-100 rounded-xl flex items-center justify-center shadow-inner">
              <BarChart3 size={20} className="md:w-6 md:h-6" />
            </div>
            <h1 className="text-2xl md:text-4xl font-black tracking-tighter text-slate-900 m-0">Profit Engine</h1>
          </div>
          <p className="text-slate-500 m-0 font-medium ml-0 md:ml-15 tracking-wide uppercase text-[10px] md:text-xs mt-1 md:mt-0">Automated Financial Intelligence</p>
        </div>
      </div>

      {/* OVERALL CAPITAL STATUS */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="py-5 px-6 bg-white rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between group hover:shadow-lg transition-all relative overflow-hidden">
          <div className="absolute left-0 top-0 bottom-0 w-1.5 bg-emerald-500"></div>
          <div>
            <div className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">Liquid Cash</div>
            <div className="font-black text-3xl text-slate-800 tracking-tight">₹{capitalMetrics.cash.toLocaleString('en-IN')}</div>
          </div>
          <div className="w-14 h-14 bg-emerald-50 text-emerald-600 rounded-full flex items-center justify-center group-hover:scale-110 transition-transform">
            <Landmark size={24} />
          </div>
        </div>
        
        <div className="py-5 px-6 bg-white rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between group hover:shadow-lg transition-all relative overflow-hidden">
          <div className="absolute left-0 top-0 bottom-0 w-1.5 bg-blue-500"></div>
          <div>
            <div className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">Bank Balance</div>
            <div className="font-black text-3xl text-slate-800 tracking-tight">₹{capitalMetrics.bank.toLocaleString('en-IN')}</div>
          </div>
          <div className="w-14 h-14 bg-blue-50 text-blue-600 rounded-full flex items-center justify-center group-hover:scale-110 transition-transform">
            <Building2 size={24} />
          </div>
        </div>
        
        <div className="py-5 px-6 bg-gradient-to-br from-slate-900 to-indigo-950 rounded-2xl shadow-xl flex items-center justify-between transform md:scale-105 z-10 relative overflow-hidden ring-1 ring-white/10">
          <div className="absolute right-0 top-0 w-32 h-32 bg-white/5 rounded-bl-full -mr-4 -mt-4 blur-xl"></div>
          <div>
            <div className="text-xs font-bold uppercase tracking-wider text-indigo-200 mb-1 relative z-10">Total Operating Capital</div>
            <div className="font-black text-4xl text-white tracking-tight relative z-10 drop-shadow-md">₹{capitalMetrics.total.toLocaleString('en-IN')}</div>
          </div>
          <div className="w-14 h-14 bg-white/10 text-white rounded-full flex items-center justify-center relative z-10 backdrop-blur-md border border-white/20">
            <CircleDollarSign size={28} />
          </div>
        </div>
      </div>

      <h2 className="text-xl font-black text-slate-800 mt-2 mb-2 flex items-center gap-3 uppercase tracking-tight">
        <TrendingUp size={22} className="text-indigo-600" /> Executive Summary
      </h2>

      {/* TOP METRICS & GRAPHS GRID */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 mb-2">
        
        {/* LEFT COLUMN: METRICS */}
        <div className="lg:col-span-1 flex flex-col gap-4">
          <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm relative overflow-hidden group hover:shadow-md transition-all">
            <div className="absolute right-0 top-0 w-24 h-24 bg-emerald-50 rounded-bl-full -mr-4 -mt-4 transition-transform group-hover:scale-110"></div>
            <h3 className="m-0 mb-3 text-slate-500 text-[11px] uppercase font-bold tracking-widest relative z-10">Total Gross Profit</h3>
            <strong className="text-3xl text-slate-900 font-black relative z-10 block mb-1">₹{data.totalGrossProfit.toLocaleString('en-IN')}</strong>
            <div className="text-xs text-slate-400 font-medium relative z-10">Profit from vehicles sold</div>
          </div>

          <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm relative overflow-hidden group hover:shadow-md transition-all">
            <div className="absolute right-0 top-0 w-24 h-24 bg-red-50 rounded-bl-full -mr-4 -mt-4 transition-transform group-hover:scale-110"></div>
            <h3 className="m-0 mb-3 text-slate-500 text-[11px] uppercase font-bold tracking-widest relative z-10">Office Expenses</h3>
            <strong className="text-3xl text-red-600 font-black relative z-10 block mb-1">- ₹{data.totalOfficeExpenseAmount.toLocaleString('en-IN')}</strong>
            <div className="text-xs text-slate-400 font-medium relative z-10">Fixed & variable costs</div>
          </div>

          <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm relative overflow-hidden group hover:shadow-md transition-all">
            <div className="absolute right-0 top-0 w-24 h-24 bg-amber-50 rounded-bl-full -mr-4 -mt-4 transition-transform group-hover:scale-110"></div>
            <h3 className="m-0 mb-3 text-slate-500 text-[11px] uppercase font-bold tracking-widest relative z-10">Total Car Repairs</h3>
            <strong className="text-3xl text-amber-600 font-black relative z-10 block mb-1">- ₹{(data.totalCarExpenseAmount || 0).toLocaleString('en-IN')}</strong>
            <div className="text-xs text-slate-400 font-medium relative z-10">Spent on vehicles this month</div>
          </div>

          <div className="bg-gradient-to-r from-indigo-600 to-indigo-800 rounded-2xl p-6 shadow-xl relative overflow-hidden z-10 ring-1 ring-indigo-900/50">
            <div className="absolute right-0 top-0 w-32 h-32 bg-white/10 rounded-bl-full -mr-8 -mt-8"></div>
            <h3 className="m-0 mb-3 text-indigo-200 text-[11px] uppercase font-bold tracking-widest relative z-10">Final Net Profit</h3>
            <strong className="text-4xl text-white font-black relative z-10 block mb-1 drop-shadow-md">
              {data.netProfit >= 0 ? '₹' : '-₹'}{Math.abs(data.netProfit).toLocaleString('en-IN')}
            </strong>
            <div className="text-[10px] text-indigo-800 font-black bg-emerald-400 inline-block px-2.5 py-1 rounded uppercase tracking-wider mt-2 relative z-10 shadow-sm">Your Take-Home</div>
          </div>
        </div>

        {/* RIGHT COLUMN: CHARTS & PAYABLES */}
        <div className="lg:col-span-3 flex flex-col gap-6">
          {/* CHART AREA */}
          <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm h-[320px] flex flex-col">
            <h3 className="text-sm font-bold text-slate-800 mb-4 uppercase tracking-wider flex items-center gap-2">
              <BarChart3 size={16} className="text-indigo-500" /> Revenue vs Expenses Overview
            </h3>
            <div className="flex-1 w-full relative">
              <ProfitCharts data={data} />
            </div>
          </div>

          {/* MARKETPLACE PAYABLES SUMMARY */}
          <div className="bg-slate-900 rounded-2xl p-6 shadow-xl relative overflow-hidden flex flex-col sm:flex-row items-center justify-between gap-6 border border-slate-800">
            <div className="absolute left-0 top-0 bottom-0 w-2 bg-gradient-to-b from-amber-400 to-orange-500"></div>
            <div className="absolute right-0 top-0 w-64 h-64 bg-white/5 rounded-full -mr-20 -mt-20 blur-3xl"></div>
            
            <div className="relative z-10 flex-1">
              <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2 mb-2">
                <Wallet size={16} className="text-amber-400" /> Marketplace Outstanding (Udhari)
              </h3>
              <div className="flex items-end gap-3">
                <span className="text-4xl font-black text-white tracking-tight">₹{totalMarketplacePending.toLocaleString('en-IN')}</span>
                <span className="text-sm text-slate-400 font-medium mb-1.5 hidden sm:inline-block">pending to pay</span>
              </div>
            </div>
            
            <div className="relative z-10 w-full sm:w-auto">
              <PendingPayablesModal payables={payables} accounts={accounts} />
            </div>
          </div>
        </div>
      </div>

      {/* TABLES SECTION */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mt-4">
        {/* CARS SOLD LIST */}
        <VehiclesSoldTable vehicles={data.vehicles} accounts={accounts} />

        {/* OFFICE EXPENSES LIST */}
        <div className="lg:col-span-1 bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden flex flex-col">
          <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/80 backdrop-blur-sm">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-red-100 text-red-700 rounded-lg"><Building2 size={18} /></div>
              <h2 className="m-0 text-slate-900 text-lg font-black tracking-tight">Office Expenses</h2>
            </div>
          </div>
          
          {data.officeExpenses.length === 0 ? (
            <div className="p-12 text-center text-slate-500 font-medium text-sm flex flex-col items-center gap-2">
              <ReceiptText size={32} className="text-slate-300" />
              No office expenses.
            </div>
          ) : (
            <div className="flex flex-col max-h-[400px] overflow-y-auto p-4 gap-3 bg-slate-50/30">
              {data.officeExpenses.map(exp => (
                <div key={exp.id} className="flex justify-between items-center p-4 bg-white rounded-xl border border-slate-200 shadow-sm hover:border-slate-300 hover:shadow-md transition-all group">
                  <div className="flex-1 min-w-0 pr-4">
                    <strong className="text-slate-900 text-sm font-bold block mb-1 truncate">{exp.description}</strong>
                    <div className="text-[11px] font-bold text-slate-400 tracking-wider uppercase">{new Date(exp.date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}</div>
                  </div>
                  <strong className="text-red-600 text-base font-black shrink-0">
                    -₹{Number(exp.amount).toLocaleString('en-IN')}
                  </strong>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
