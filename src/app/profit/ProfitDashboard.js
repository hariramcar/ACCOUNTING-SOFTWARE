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
  const receivables = payablesResult.success ? (payablesResult.receivables || []) : [];
  const accounts = payablesResult.success ? payablesResult.accounts : [];

  let capitalMetrics = { cash: 0, bank: 0, total: 0 };
  let udhariAccounts = [];
  if (balancesResult.accounts) {
    const cash = balancesResult.accounts.filter(a => a.type === 'CASH').reduce((sum, a) => sum + a.currentBalance, 0);
    const bank = balancesResult.accounts.filter(a => a.type === 'BANK').reduce((sum, a) => sum + a.currentBalance, 0);
    const ughrani = balancesResult.accounts.filter(a => a.type === 'UGHRANI').reduce((sum, a) => sum + a.currentBalance, 0);
    capitalMetrics = { cash, bank, total: cash + bank + ughrani };

    udhariAccounts = balancesResult.accounts.filter(a => a.type === 'UGHRANI' && Math.abs(a.currentBalance) > 0);
  }

  const totalMarketplacePending = udhariAccounts.reduce((sum, a) => sum + Math.abs(a.currentBalance), 0);

  if (!data) return null;

  return (
    <div className="w-full max-w-7xl mx-auto px-4 pt-1 sm:p-8 flex flex-col gap-6 sm:gap-8 text-slate-900 bg-slate-50 min-h-screen font-sans pb-24 md:pb-8">

      {/* HEADER SECTION */}
      <div className="flex flex-col md:flex-row md:justify-between items-start md:items-end gap-3 md:gap-4 border-b border-slate-200 pb-3 md:pb-5 mb-1 md:mb-6 sticky top-0 bg-slate-50/90 backdrop-blur-xl z-30 pt-1 md:pt-0 -mx-4 px-4 md:mx-0 md:px-0">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <div className="w-8 h-8 md:w-10 md:h-10 bg-indigo-50 text-indigo-600 rounded-lg flex items-center justify-center border border-indigo-100 shadow-sm">
              <BarChart3 size={18} className="md:w-5 md:h-5" />
            </div>
            <h1 className="text-xl md:text-3xl font-semibold tracking-tight text-slate-900 m-0">
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 to-purple-600">Profit</span> Dashboard
            </h1>
          </div>
          <p className="text-xs md:text-sm text-slate-500 m-0 font-medium ml-0 md:ml-13 mt-1.5 md:mt-0">Automated financial intelligence and performance metrics.</p>
        </div>
      </div>

      {/* OVERALL CAPITAL STATUS */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="py-5 px-6 bg-white rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between group hover:shadow-lg transition-all relative overflow-hidden">
          <div className="absolute left-0 top-0 bottom-0 w-1.5 bg-emerald-500"></div>
          <div>
            <div className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">Liquid Cash</div>
            <div className="font-bold text-3xl text-slate-800 tracking-tight">₹{capitalMetrics.cash.toLocaleString('en-IN')}</div>
          </div>
          <div className="w-14 h-14 bg-emerald-50 text-emerald-600 rounded-full flex items-center justify-center group-hover:scale-110 transition-transform">
            <Landmark size={24} />
          </div>
        </div>

        <div className="py-5 px-6 bg-white rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between group hover:shadow-lg transition-all relative overflow-hidden">
          <div className="absolute left-0 top-0 bottom-0 w-1.5 bg-blue-500"></div>
          <div>
            <div className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">Bank Balance</div>
            <div className="font-bold text-3xl text-slate-800 tracking-tight">₹{capitalMetrics.bank.toLocaleString('en-IN')}</div>
          </div>
          <div className="w-14 h-14 bg-blue-50 text-blue-600 rounded-full flex items-center justify-center group-hover:scale-110 transition-transform">
            <Building2 size={24} />
          </div>
        </div>

        <div className="py-5 px-6 bg-gradient-to-br from-slate-900 to-indigo-950 rounded-2xl shadow-xl flex items-center justify-between transform md:scale-105 z-10 relative overflow-hidden ring-1 ring-white/10">
          <div className="absolute right-0 top-0 w-32 h-32 bg-white/5 rounded-bl-full -mr-4 -mt-4 blur-xl"></div>
          <div>
            <div className="text-xs font-bold uppercase tracking-wider text-indigo-200 mb-1 relative z-10">Total Operating Capital</div>
            <div className="font-bold text-4xl text-white tracking-tight relative z-10 drop-shadow-md">₹{capitalMetrics.total.toLocaleString('en-IN')}</div>
          </div>
          <div className="w-14 h-14 bg-white/10 text-white rounded-full flex items-center justify-center relative z-10 backdrop-blur-md border border-white/20">
            <CircleDollarSign size={28} />
          </div>
        </div>
      </div>

      {/* TOP METRICS & GRAPHS GRID (Responsive ordering) */}
      <div className="flex flex-col lg:grid lg:grid-cols-4 gap-6 mb-2">
        
        {/* LEFT COLUMN: METRICS (Order 2 on Mobile, Order 1 on Desktop) */}
        <div className="order-2 lg:order-1 lg:col-span-1 flex flex-col gap-4">
          <h2 className="text-xl font-bold text-slate-800 mb-2 flex items-center gap-3 uppercase tracking-tight">
            <TrendingUp size={22} className="text-indigo-600" /> Executive Summary
          </h2>

          <div className="grid grid-cols-2 gap-4">
            <div className="bg-white border border-slate-200 rounded-2xl p-4 sm:p-5 shadow-sm relative overflow-hidden group hover:shadow-md transition-all text-center sm:text-left flex flex-col justify-center">
              <div className="absolute right-0 top-0 w-16 h-16 bg-blue-50 rounded-bl-full -mr-2 -mt-2 transition-transform group-hover:scale-110"></div>
              <h3 className="m-0 mb-2 text-slate-500 text-[10px] sm:text-[11px] uppercase font-bold tracking-widest relative z-10 leading-tight">In Stock</h3>
              <strong className="text-3xl text-slate-900 font-bold relative z-10 block">{data.inStockCount}</strong>
            </div>

            <div className="bg-white border border-slate-200 rounded-2xl p-4 sm:p-5 shadow-sm relative overflow-hidden group hover:shadow-md transition-all text-center sm:text-left flex flex-col justify-center">
              <div className="absolute right-0 top-0 w-16 h-16 bg-amber-50 rounded-bl-full -mr-2 -mt-2 transition-transform group-hover:scale-110"></div>
              <h3 className="m-0 mb-2 text-slate-500 text-[10px] sm:text-[11px] uppercase font-bold tracking-widest relative z-10 leading-tight">Sold <br className="hidden sm:block" />(This Month)</h3>
              <strong className="text-3xl text-amber-600 font-bold relative z-10 block">{data.soldCount}</strong>
            </div>
          </div>

          <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm relative overflow-hidden group hover:shadow-md transition-all">
            <div className="absolute right-0 top-0 w-24 h-24 bg-emerald-50 rounded-bl-full -mr-4 -mt-4 transition-transform group-hover:scale-110"></div>
            <h3 className="m-0 mb-2 text-slate-500 text-[11px] uppercase font-bold tracking-widest relative z-10">Total Stock Value</h3>
            <strong className="text-3xl text-emerald-600 font-bold relative z-10 block mb-1">₹{(data.inStockValue || 0).toLocaleString('en-IN')}</strong>
            <div className="text-[10px] text-slate-400 font-medium relative z-10">Capital locked in stock</div>
          </div>

          <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm flex flex-col justify-center relative overflow-hidden group hover:shadow-md transition-all">
            <div className="absolute right-0 top-0 w-24 h-24 bg-emerald-50 rounded-bl-full -mr-4 -mt-4 transition-transform group-hover:scale-110"></div>
            <h3 className="text-slate-500 font-bold uppercase tracking-widest text-[11px] mb-1 relative z-10">Total Income</h3>
            <div className="text-3xl font-bold text-emerald-600 relative z-10">₹{(data.totalLedgerIncome || 0).toLocaleString('en-IN')}</div>
          </div>

          <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm flex flex-col justify-center relative overflow-hidden group hover:shadow-md transition-all">
            <div className="absolute right-0 top-0 w-24 h-24 bg-red-50 rounded-bl-full -mr-4 -mt-4 transition-transform group-hover:scale-110"></div>
            <h3 className="text-slate-500 font-bold uppercase tracking-widest text-[11px] mb-1 relative z-10">Total Expenses</h3>
            <div className="text-3xl font-bold text-red-600 relative z-10">₹{(data.totalLedgerExpenses || 0).toLocaleString('en-IN')}</div>
          </div>

          <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm flex flex-col justify-center relative overflow-hidden group hover:shadow-md transition-all">
            <div className="absolute right-0 top-0 w-24 h-24 bg-indigo-50 rounded-bl-full -mr-4 -mt-4 transition-transform group-hover:scale-110"></div>
            <h3 className="text-slate-500 font-bold uppercase tracking-widest text-[11px] mb-1 relative z-10">Net Profit (Income - Expenses)</h3>
            <div className={`text-4xl font-bold relative z-10 ${(data.totalLedgerIncome - data.totalLedgerExpenses) >= 0 ? 'text-indigo-600' : 'text-red-600'}`}>
              {(data.totalLedgerIncome - data.totalLedgerExpenses) >= 0 ? '₹' : '-₹'}{Math.abs(data.totalLedgerIncome - data.totalLedgerExpenses).toLocaleString('en-IN')}
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN: CHARTS (Order 1 on Mobile, Order 2 on Desktop) */}
        <div className="order-1 lg:order-2 lg:col-span-3 flex flex-col gap-6 mb-6 lg:mb-0">
          <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm flex flex-col gap-6 h-full">
            <h3 className="text-sm font-bold text-slate-800 m-0 uppercase tracking-wider flex items-center gap-2">
              <BarChart3 size={16} className="text-indigo-500" /> Revenue vs Expenses Overview
            </h3>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
                <div className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">Gross Car Profit</div>
                <div className="text-xl font-bold text-emerald-600">₹{(data.totalGrossProfit || 0).toLocaleString('en-IN')}</div>
              </div>
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
                <div className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">Office Expenses</div>
                <div className="text-xl font-bold text-red-500">₹{(data.totalOfficeExpenseAmount || 0).toLocaleString('en-IN')}</div>
              </div>
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
                <div className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">Car Repairs</div>
                <div className="text-xl font-bold text-amber-500">₹{(data.totalCarExpenseAmount || 0).toLocaleString('en-IN')}</div>
              </div>
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
                <div className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">Net Profit</div>
                <div className={`text-xl font-bold ${data.netProfit >= 0 ? 'text-indigo-600' : 'text-red-600'}`}>
                  {data.netProfit >= 0 ? '₹' : '-₹'}{Math.abs(data.netProfit || 0).toLocaleString('en-IN')}
                </div>
              </div>
            </div>

            <div className="w-full flex-1 min-h-[320px] relative">
              <ProfitCharts data={data} />
            </div>
          </div>
        </div>
      </div>

      {/* TABLES SECTION */}
      <div className="flex flex-col lg:grid lg:grid-cols-3 gap-6 mt-4">
        
        {/* LEFT COLUMN: CARS SOLD LIST (Order 2 on Mobile, Order 1 on Desktop) */}
        <div className="order-2 lg:order-1 lg:col-span-2">
          <VehiclesSoldTable vehicles={data.vehicles} accounts={accounts} />
        </div>

        {/* RIGHT COLUMN: PAYABLES & UDHARI (Order 1 on Mobile, Order 2 on Desktop) */}
        <div className="order-1 lg:order-2 lg:col-span-1 flex flex-col gap-6 h-full mb-6 lg:mb-0">
          
          {/* 1. UDHARI ACCOUNTS (Marketplace) */}
          <div className="bg-slate-900 rounded-2xl p-6 shadow-xl relative overflow-hidden flex flex-col border border-slate-800">
            <div className="absolute left-0 top-0 bottom-0 w-2 bg-gradient-to-b from-amber-400 to-orange-500"></div>
            <div className="absolute right-0 top-0 w-64 h-64 bg-white/5 rounded-full -mr-20 -mt-20 blur-3xl"></div>

            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2 mb-4 relative z-10">
              <Wallet size={16} className="text-amber-400" /> Marketplace (Udhari)
            </h3>

            <div className="flex flex-col gap-3 z-10 relative max-h-[300px] overflow-y-auto pr-1">
              {udhariAccounts.length === 0 ? (
                <div className="text-slate-500 text-sm text-center py-4 font-medium">No pending udhari.</div>
              ) : (
                udhariAccounts.map(acc => (
                  <div key={acc.id} className="flex justify-between items-center bg-slate-800/50 p-3 rounded-xl border border-slate-700/50 hover:bg-slate-800 transition-colors">
                    <span className="text-slate-200 font-bold text-sm truncate pr-2">{acc.name}</span>
                    <span className="text-rose-400 font-bold whitespace-nowrap">₹{Math.abs(acc.currentBalance).toLocaleString('en-IN')}</span>
                  </div>
                ))
              )}
            </div>

            {udhariAccounts.length > 0 && (
              <div className="mt-4 pt-4 border-t border-slate-700/50 flex justify-between items-center z-10 relative">
                <span className="text-slate-400 text-xs font-bold uppercase tracking-wider">Total Pending</span>
                <span className="text-white font-bold text-xl">₹{totalMarketplacePending.toLocaleString('en-IN')}</span>
              </div>
            )}
          </div>

          {/* 2. VEHICLE PAYABLES / RECEIVABLES */}
          <PendingPayablesModal payables={payables} receivables={receivables} accounts={accounts} />
        </div>
      </div>
    </div>
  );
}
