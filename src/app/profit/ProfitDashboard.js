import { getMonthlyProfitData, getPendingPayables, getFoundersData } from '@/actions/profit';
import { getAccountBalances } from '@/actions/accounts';
import { BarChart3, TrendingDown, ReceiptText, CircleDollarSign, Car, Building2, Landmark, Wallet, TrendingUp, Users } from 'lucide-react';
import PendingPayablesModal from './PendingPayablesModal';
import ProfitCharts from './ProfitCharts';
import VehiclesSoldTable from './VehiclesSoldTable';
import FoundersUpadModal from './FoundersUpadModal';
import EditPartnersModal from './EditPartnersModal';
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

  const [result, payablesResult, balancesResult, foundersResult] = await Promise.all([
    getMonthlyProfitData(year, month),
    getPendingPayables(),
    getAccountBalances(),
    getFoundersData()
  ]);

  const data = result.success ? result.data : null;
  const payables = payablesResult.success ? payablesResult.payables : [];
  const receivables = payablesResult.success ? (payablesResult.receivables || []) : [];
  const accounts = payablesResult.success ? payablesResult.accounts : [];
  const foundersList = foundersResult?.success ? foundersResult.founders : [];
  
  const firmNetProfit = data ? (data.totalLedgerIncome - data.totalLedgerExpenses) : 0;

  let capitalMetrics = { cash: 0, bank: 0, total: 0 };
  let udhariAccounts = [];
  if (balancesResult.accounts) {
    const cash = balancesResult.accounts.filter(a => a.type === 'CASH').reduce((sum, a) => sum + a.currentBalance, 0);
    const bank = balancesResult.accounts.filter(a => a.type === 'BANK').reduce((sum, a) => sum + a.currentBalance, 0);
    const ughrani = balancesResult.accounts.filter(a => a.type === 'UGHRANI').reduce((sum, a) => sum + a.currentBalance, 0);
    capitalMetrics = { cash, bank, total: cash + bank + ughrani };

    udhariAccounts = balancesResult.accounts.filter(a => ['UGHRANI', 'FINANCIER', 'DSA_AGENT'].includes(a.type) && Math.abs(a.currentBalance) > 0);
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

      {/* FOUNDERS & PROFIT DISTRIBUTION (FULL WIDTH) */}
      <div className="w-full bg-white border border-slate-200 rounded-2xl p-6 shadow-sm mb-2 mt-4 relative overflow-hidden group">
        <div className="absolute right-0 top-0 w-64 h-64 bg-indigo-50/50 rounded-bl-full -mr-10 -mt-10 pointer-events-none"></div>
        <div className="flex items-center justify-between mb-6 relative z-10 border-b border-slate-100 pb-4">
          <div>
            <h2 className="text-xl md:text-2xl font-black text-slate-800 flex items-center gap-3 uppercase tracking-tight m-0">
              <Users size={26} className="text-indigo-600" /> Founders & Profit Distribution
            </h2>
            <p className="text-xs text-slate-500 mt-1 font-medium">Auto-calculated profit stakes and capital drawings (Upar)</p>
          </div>
          <div className="flex items-center gap-2 md:gap-3">
            {foundersList.length > 0 && <EditPartnersModal partners={foundersList} />}
            {foundersList.length > 0 && <FoundersUpadModal founders={foundersList} ledgerAccounts={accounts} />}
          </div>
        </div>
        
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 relative z-10">
          {foundersList.map(founder => {
            const sharePercent = (founder.profitShare || 0) / 100;
            const profitShare = Math.floor(firmNetProfit * sharePercent);
            const retained = profitShare - founder.upadTaken;
            const recent = founder.recentUpar || [];
            
            return (
              <div key={founder.id} className="bg-slate-50 border border-slate-200 rounded-xl p-5 hover:shadow-md transition-all flex flex-col h-full">
                {/* Header */}
                <div className="flex justify-between items-start mb-5 pb-5 border-b border-slate-200">
                  <div>
                    <h3 className="text-2xl font-black text-slate-900 tracking-tight leading-none mb-2">{founder.name}</h3>
                    <div className="text-[11px] font-bold uppercase tracking-widest text-indigo-700 bg-indigo-100 px-3 py-1 rounded-full inline-block">{sharePercent * 100}% Ownership Stake</div>
                  </div>
                  <div className="text-right">
                    <div className="text-xs font-bold uppercase tracking-widest text-slate-500 mb-1">Total Profit Share</div>
                    <div className="text-2xl font-black text-slate-800 leading-none">₹{profitShare.toLocaleString('en-IN')}</div>
                  </div>
                </div>
                
                {/* Metrics */}
                <div className="grid grid-cols-2 gap-4 mb-6">
                  <div className="bg-white p-4 rounded-xl border border-rose-100 shadow-sm flex flex-col justify-center">
                    <div className="text-[10px] font-bold uppercase tracking-widest text-rose-500 mb-1">Total Upar Withdrawn</div>
                    <div className="text-xl font-bold text-rose-600">-₹{founder.upadTaken.toLocaleString('en-IN')}</div>
                  </div>
                  <div className="bg-white p-4 rounded-xl border border-emerald-100 shadow-sm flex flex-col justify-center">
                    <div className="text-[10px] font-bold uppercase tracking-widest text-emerald-600 mb-1">Current Retained Balance</div>
                    <div className={`text-xl font-black ${retained >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                      {retained >= 0 ? '₹' : '-₹'}{Math.abs(retained).toLocaleString('en-IN')}
                    </div>
                  </div>
                </div>

                {/* Recent Upar */}
                <div className="mt-auto pt-2">
                  <h4 className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-3 flex items-center gap-2">
                    Recent Upar Transactions
                    <span className="flex-1 h-px bg-slate-200"></span>
                  </h4>
                  {recent.length > 0 ? (
                    <div className="flex flex-col gap-2">
                      {recent.map((tx, idx) => (
                        <div key={idx} className="flex justify-between items-center bg-white p-3 rounded-lg border border-slate-100 shadow-sm text-sm">
                          <div className="flex flex-col">
                            <span className="font-bold text-slate-700">{new Date(tx.date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}</span>
                            <span className="text-[10px] text-slate-400 uppercase tracking-widest font-semibold">{tx.mode} • {tx.description}</span>
                          </div>
                          <span className="font-bold text-rose-600">-₹{tx.amount.toLocaleString('en-IN')}</span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-xs font-medium text-slate-400 italic text-center py-4 bg-white rounded-lg border border-slate-100 border-dashed">
                      No recent upar withdrawn
                    </div>
                  )}
                </div>
              </div>
            );
          })}
          {foundersList.length === 0 && <div className="col-span-full p-8 bg-slate-50 border border-slate-100 rounded-xl text-sm text-slate-500 font-bold italic text-center">No founders data available</div>}
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
              <Wallet size={16} className="text-amber-400" /> Ledgers (Agents & Udhari)
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
