import { getAccountBalances } from '@/actions/accounts';
import { Landmark, WalletCards, BriefcaseBusiness, Handshake, Users2, LineChart } from 'lucide-react';
import DeleteAccountButton from './DeleteAccountButton';
import AddAccountModal from './AddAccountModal';
import AccountHistoryModal from './AccountHistoryModal';
import UpadModals from './UpadModals';
import AgentPaymentModal from './AgentPaymentModal';
import { cookies } from 'next/headers';
import { getSession } from '@/lib/session';
import { redirect } from 'next/navigation';
import prisma from '@/lib/prisma';
export default async function AccountsPage() {
  const session = await getSession();
  if (!session || session.role !== 'ADMIN') {
    redirect('/expenses');
  }

  const cookieStore = await cookies();
  const globalMonth = cookieStore.get('global_month')?.value;
  
  let year, month;
  if (globalMonth) {
    const parts = globalMonth.split('-');
    year = Number(parts[0]);
    month = Number(parts[1]);
  }

  const { accounts } = await getAccountBalances(year, month);

  const rawVehicles = await prisma.vehicle.findMany({
    where: { status: 'SOLD', salePendingBalance: { gt: 0 } },
    select: { id: true, make: true, model: true, registration: true, salePendingBalance: true, receivableAccountId: true }
  });
  const vehicles = rawVehicles.map(v => ({
    ...v,
    salePendingBalance: Number(v.salePendingBalance)
  }));

  const cashAccounts = accounts?.filter(a => a.type === 'CASH') || [];
  const bankAccounts = accounts?.filter(a => a.type === 'BANK') || [];
  const agentAccounts = accounts?.filter(a => a.type === 'DSA_AGENT' || a.type === 'FINANCIER') || [];
  const ughraniAccounts = accounts?.filter(a => a.type === 'UGHRANI') || [];
  const staffAccounts = accounts?.filter(a => a.type === 'STAFF') || [];
  const partnerAccounts = accounts?.filter(a => a.type === 'PARTNER') || [];
  
  // Only show Uchak accounts that have a non-zero balance
  const uchakAccounts = accounts?.filter(a => a.type === 'UCHAK' && Number(a.balance) !== 0) || [];

  return (
    <div className="w-full max-w-7xl mx-auto px-4 pt-1 md:p-8 flex flex-col gap-4 md:gap-8 text-slate-900 pb-24 md:pb-8">
      <div className="flex flex-col md:flex-row md:justify-between items-start md:items-end gap-3 md:gap-4 border-b border-slate-200 pb-3 md:pb-5 mb-1 md:mb-8 sticky top-0 bg-slate-50/90 backdrop-blur-xl z-30 pt-1 md:pt-0 -mx-4 px-4 md:mx-0 md:px-0">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <div className="w-8 h-8 md:w-10 md:h-10 bg-indigo-50 text-indigo-600 rounded-lg flex items-center justify-center border border-indigo-100 shadow-sm">
              <Landmark size={18} className="md:w-5 md:h-5" />
            </div>
            <h1 className="text-xl md:text-3xl font-semibold tracking-tight text-slate-900 m-0">Master Capital Dashboard</h1>
          </div>
          <p className="text-xs md:text-sm text-slate-500 m-0 font-medium ml-0 md:ml-13 mt-1.5 md:mt-0">Manage Banks, Cash Drawers, Loan Agents, and Market Place.</p>
        </div>
        <div className="flex items-center gap-2.5 w-full md:w-auto overflow-x-auto pb-1 md:pb-0 md:overflow-visible shrink-0" style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>

          <AgentPaymentModal 
            agentAccounts={[...agentAccounts, ...uchakAccounts, ...staffAccounts]} 
            ledgerAccounts={[...cashAccounts, ...bankAccounts]} 
            vehicles={vehicles} 
          />
          <UpadModals 
            upadAccounts={[...staffAccounts, ...ughraniAccounts, ...uchakAccounts]} 
            ledgerAccounts={[...cashAccounts, ...bankAccounts]} 
          />
          <AddAccountModal />
        </div>
      </div>

      <div className="flex flex-col gap-8">
          
        {/* CASH DRAWERS */}
        <div className="flex flex-col w-full mb-2">
          <div className="flex items-center gap-2 mb-3">
            <WalletCards size={20} className="text-emerald-500" />
            <h3 className="text-lg font-bold text-slate-800 m-0 tracking-tight">Cash Drawers</h3>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-3">
            {cashAccounts.map(acc => (
              <CompactAccountCard 
                key={acc.id} account={acc} colorClass="bg-emerald-50/20 border-emerald-200 text-emerald-900" 
                balanceLogic={(b) => ({ color: b >= 0 ? 'text-emerald-700' : 'text-red-700' })}
              />
            ))}
            {cashAccounts.length === 0 && <p className="text-slate-400 text-sm font-medium italic col-span-full">No cash accounts.</p>}
          </div>
        </div>

        {/* BANK ACCOUNTS */}
        <div className="flex flex-col w-full mb-4">
          <div className="flex items-center gap-2 mb-3">
            <Landmark size={20} className="text-blue-500" />
            <h3 className="text-lg font-bold text-slate-800 m-0 tracking-tight">Bank Accounts</h3>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-3">
            {bankAccounts.map(acc => (
              <CompactAccountCard 
                key={acc.id} account={acc} colorClass="bg-blue-50/20 border-blue-200 text-blue-900" 
                balanceLogic={(b) => ({ color: b >= 0 ? 'text-blue-700' : 'text-red-700' })}
              />
            ))}
            {bankAccounts.length === 0 && <p className="text-slate-400 text-sm font-medium italic col-span-full">No bank accounts.</p>}
          </div>
        </div>

        {/* LOAN AGENTS */}
        <div className="bg-white p-4 md:p-5 rounded-xl border border-slate-200 shadow-sm flex flex-col w-full">
          <div className="flex items-center gap-2 border-b border-slate-100 pb-3 mb-2">
            <BriefcaseBusiness size={18} className="text-purple-500" />
            <h3 className="text-base font-bold text-slate-800 m-0 flex-1">Loan Agents</h3>
          </div>
          <p className="text-xs font-medium text-slate-500 mb-3 mt-1">Track pending loan payouts and commissions from DSA agents.</p>
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-3">
            {agentAccounts.map(acc => (
              <AccountCard 
                key={acc.id} account={acc} colorClass="bg-purple-50/30 border-purple-200 text-purple-800" 
                creditLabel="Amount Received" debitLabel="Pending Payouts Logged"
                balanceLogic={(b) => {
                  if (b === 0) return { color: 'text-slate-700', text: 'Settled' };
                  if (b < 0) return { color: 'text-emerald-700', text: 'Receivable (They Owe Us)' };
                  return { color: 'text-red-700', text: 'Payable (We Owe Them)' };
                }}
              />
            ))}
            {agentAccounts.length === 0 && <p className="text-slate-400 text-sm font-medium italic col-span-full">No loan agents added.</p>}
          </div>
        </div>

        {/* MARKET PLACE */}
        <div className="bg-white p-4 md:p-5 rounded-xl border border-slate-200 shadow-sm flex flex-col w-full">
          <div className="flex items-center gap-2 border-b border-slate-100 pb-3 mb-2">
            <LineChart size={18} className="text-amber-500" />
            <h3 className="text-base font-bold text-slate-800 m-0">Market Place</h3>
          </div>
          <p className="text-xs font-medium text-slate-500 mb-3 mt-1">Car repair vendors and parts. Track monthly advances (Upad) and work billed.</p>
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-3">
            {ughraniAccounts.map(acc => (
              <AccountCard 
                key={acc.id} account={acc} colorClass="bg-amber-50/30 border-amber-200 text-amber-800" 
                creditLabel="Work Billed (Credit)" debitLabel="Upad Paid (Debit)"
                balanceLogic={(b) => {
                  if (b === 0) return { color: 'text-slate-700', text: 'Settled' };
                  if (b < 0) return { color: 'text-blue-700', text: 'Advance Given (Upad)' };
                  return { color: 'text-red-700', text: 'Payable (We Owe Vendor)' };
                }}
              />
            ))}
            {ughraniAccounts.length === 0 && <p className="text-slate-400 text-sm font-medium italic col-span-full">No market place accounts added.</p>}
          </div>
        </div>

        {/* STAFF & EMPLOYEES */}
        <div className="bg-white p-4 md:p-5 rounded-xl border border-slate-200 shadow-sm flex flex-col w-full">
          <div className="flex items-center gap-2 border-b border-slate-100 pb-3 mb-2">
            <Users2 size={18} className="text-pink-500" />
            <h3 className="text-base font-bold text-slate-800 m-0">Staff & Employees</h3>
          </div>
          <p className="text-xs font-medium text-slate-500 mb-3 mt-1">Track staff Upad (Advances given) vs Salary and Bills settled.</p>
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-3">
            {staffAccounts.map(acc => {
               const availableUpad = acc.currentBalance < 0 ? Math.abs(acc.currentBalance) : 0;
               return (
                 <AccountHistoryModal key={acc.id} account={acc}>
                   <div className="bg-pink-50/30 border-pink-200 text-pink-800 border rounded-lg p-3 shadow-sm interactive-card cursor-pointer flex flex-col h-full">
                     <div className="flex justify-between items-center mb-3 border-b border-black/5 pb-2">
                       <strong className="text-[15px] tracking-tight flex-1">{acc.name}</strong>
                       <DeleteAccountButton accountId={acc.id} accountName={acc.name} />
                     </div>
                     <div className="flex flex-col gap-2 flex-1">
                       <div className="grid grid-cols-2 gap-2 mb-1">
                         <div className="flex flex-col gap-1 p-2 bg-indigo-50/50 rounded border border-indigo-100">
                           <span className="text-[9px] font-bold uppercase tracking-wider text-indigo-600/80">Salary Paid</span>
                           <span className="text-sm font-semibold text-indigo-700">₹{acc.salaryGiven?.toLocaleString('en-IN') || '0'}</span>
                         </div>
                         <div className="flex flex-col gap-1 p-2 bg-emerald-50/50 rounded border border-emerald-100">
                           <span className="text-[9px] font-bold uppercase tracking-wider text-emerald-600/80">Upad Used</span>
                           <span className="text-sm font-semibold text-emerald-700">₹{acc.upadUsed?.toLocaleString('en-IN') || '0'}</span>
                         </div>
                         <div className="flex flex-col gap-1 p-2 bg-red-50/50 rounded border border-red-100">
                           <span className="text-[9px] font-bold uppercase tracking-wider text-red-600/80">Upad Given</span>
                           <span className="text-sm font-semibold text-red-700">₹{acc.upadGiven?.toLocaleString('en-IN') || '0'}</span>
                         </div>
                         <div className="flex flex-col gap-1 p-2 bg-amber-50/50 rounded border border-amber-100">
                           <span className="text-[9px] font-bold uppercase tracking-wider text-amber-600/80">Available Upad</span>
                           <span className="text-sm font-semibold text-amber-700">₹{availableUpad.toLocaleString('en-IN')}</span>
                         </div>
                       </div>
                     </div>
                   </div>
                 </AccountHistoryModal>
               );
            })}
            {staffAccounts.length === 0 && <p className="text-slate-400 text-sm font-medium italic col-span-full">No staff accounts added.</p>}
          </div>
        </div>

        {/* UCHAK ACCOUNTS (TEMPORARY ADVANCES) */}
        {uchakAccounts.length > 0 && (
          <div className="bg-white p-4 md:p-5 rounded-xl border border-slate-200 shadow-sm flex flex-col w-full border-l-4 border-l-orange-500">
            <div className="flex items-center gap-2 border-b border-slate-100 pb-3 mb-2">
              <Landmark size={18} className="text-orange-500" />
              <h3 className="text-base font-bold text-slate-800 m-0">Uchak (Temporary Advances)</h3>
            </div>
            <p className="text-xs font-medium text-slate-500 mb-3 mt-1">Short-term cash advances given to third parties. These accounts auto-hide when settled.</p>
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-3">
              {uchakAccounts.map(acc => (
                <AccountCard 
                  key={acc.id} account={acc} colorClass="bg-orange-50/40 border-orange-200 text-orange-900" 
                  creditLabel="Settlement Received" debitLabel="Advance Given"
                  balanceLogic={(b) => {
                    if (b === 0) return { color: 'text-slate-700', text: 'Settled' };
                    if (b < 0) return { color: 'text-emerald-700', text: 'They Owe Us' };
                    return { color: 'text-red-700', text: 'We Owe Them' };
                  }}
                />
              ))}
            </div>
          </div>
        )}

        {/* BUSINESS PARTNERS */}
        <div className="bg-white p-4 md:p-5 rounded-xl border border-slate-200 shadow-sm flex flex-col w-full">
          <div className="flex items-center gap-2 border-b border-slate-100 pb-3 mb-2">
            <Handshake size={18} className="text-teal-500" />
            <h3 className="text-base font-bold text-slate-800 m-0">Business Partners</h3>
          </div>
          <p className="text-xs font-medium text-slate-500 mb-3 mt-1">Partners who co-invest in vehicles. Track their capital, profit shares, and payouts.</p>
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-3">
            {partnerAccounts.map(acc => (
              <PartnerAccountCard 
                key={acc.id} account={acc} colorClass="bg-teal-50/30 border-teal-200 text-teal-800" 
              />
            ))}
            {partnerAccounts.length === 0 && <p className="text-slate-400 text-sm font-medium italic col-span-full">No business partners added.</p>}
          </div>
        </div>

      </div>
    </div>
  );
}

function AccountCard({ account, colorClass, creditLabel, debitLabel, balanceLogic, hideTotals = false }) {
  const { color, text } = balanceLogic(account.currentBalance);

  return (
    <AccountHistoryModal account={account}>
      <div className={`border rounded-lg p-3 shadow-sm interactive-card cursor-pointer flex flex-col h-full ${colorClass}`}>
        <div className="flex justify-between items-center mb-3 border-b border-black/5 pb-2">
          <strong className="text-[15px] tracking-tight flex-1">{account.name}</strong>
          <DeleteAccountButton accountId={account.id} accountName={account.name} />
        </div>
        <div className="flex flex-col gap-2 flex-1">
          {!hideTotals && (
            <div className="grid grid-cols-2 gap-2 mb-1">
              <div className="flex flex-col gap-1 p-2 bg-emerald-50/50 rounded border border-emerald-100">
                <span className="text-[9px] font-bold uppercase tracking-wider text-emerald-600/80">{creditLabel}</span>
                <span className="text-sm font-semibold text-emerald-700">₹{account.totalPaid?.toLocaleString('en-IN') || '0'}</span>
              </div>
              <div className="flex flex-col gap-1 p-2 bg-red-50/50 rounded border border-red-100">
                <span className="text-[9px] font-bold uppercase tracking-wider text-red-600/80">{debitLabel}</span>
                <span className="text-sm font-semibold text-red-700">₹{account.totalExpenses?.toLocaleString('en-IN') || '0'}</span>
              </div>
            </div>
          )}

          {hideTotals && account.openingBalance > 0 && (
            <div className="flex justify-between items-center bg-black/5 p-2 rounded-md mb-1">
              <span className="text-[10px] font-bold uppercase tracking-wider opacity-80">Opening Balance</span>
              <span className="text-sm font-semibold">₹{account.openingBalance.toLocaleString('en-IN')}</span>
            </div>
          )}
          
          {account.pendingInvestments > 0 && (
            <div className="flex justify-between items-center bg-red-50 p-2 rounded-md border border-red-100 mb-0.5">
              <span className="text-[10px] font-bold uppercase tracking-wider text-red-700">Pending Capital (They Owe)</span>
              <span className="text-sm font-black text-red-700">₹{account.pendingInvestments.toLocaleString('en-IN')}</span>
            </div>
          )}

          <div className="mt-auto pt-1">
            <div className="flex justify-between items-center bg-black/10 p-2.5 rounded-md">
              <span className="text-[11px] font-bold uppercase tracking-wider opacity-90">{text}</span>
              <span className={`text-xl font-black ${color}`}>
                {account.currentBalance < 0 ? '-' : ''}₹{Math.abs(account.currentBalance).toLocaleString('en-IN')}
              </span>
            </div>
          </div>
        </div>
      </div>
    </AccountHistoryModal>
  );
}

function CompactAccountCard({ account, colorClass, balanceLogic }) {
  const { color } = balanceLogic(account.currentBalance);
  
  return (
    <AccountHistoryModal account={account}>
      <div className={`border rounded-xl px-4 py-3.5 shadow-sm interactive-card cursor-pointer flex items-center justify-between ${colorClass}`}>
        <div className="flex flex-col gap-0.5">
          <strong className="text-[14px] tracking-tight m-0 leading-none">{account.name}</strong>
          {account.openingBalance > 0 && (
             <span className="text-[9px] font-bold text-slate-500 uppercase tracking-wider leading-none mt-1">Opening: ₹{account.openingBalance.toLocaleString('en-IN')}</span>
          )}
        </div>
        <div className="flex items-center gap-3">
          <span className={`text-lg font-black tracking-tight ${color}`}>
            {account.currentBalance < 0 ? '-' : ''}₹{Math.abs(account.currentBalance).toLocaleString('en-IN')}
          </span>
          <DeleteAccountButton accountId={account.id} accountName={account.name} />
        </div>
      </div>
    </AccountHistoryModal>
  );
}

function PartnerAccountCard({ account, colorClass }) {
  const cars = account.partnerVehicles || [];

  return (
    <div className={`border rounded-xl shadow-sm flex flex-col h-full bg-white relative ${colorClass}`}>
      <AccountHistoryModal account={account}>
        <div className="flex justify-between items-center mb-2 border-b border-black/5 pb-2 p-3 cursor-pointer hover:bg-black/5 rounded-t-xl transition-colors interactive-card">
          <strong className="text-[15px] tracking-tight flex-1">{account.name}</strong>
          <div>
            <DeleteAccountButton accountId={account.id} accountName={account.name} />
          </div>
        </div>
      </AccountHistoryModal>
      
      <div className="flex flex-col gap-2 flex-1 px-4 pb-4">
        {cars.length === 0 ? (
          <div className="text-xs text-teal-600/70 italic p-3 text-center border border-dashed border-teal-200 rounded-lg bg-teal-50/30">No active vehicles.</div>
        ) : (
          <div className="flex flex-col gap-2">
            <span className="text-[10px] font-bold uppercase tracking-wider text-teal-600/80 mb-1">Partner Vehicles</span>
            {cars.map((car, idx) => (
              <AccountHistoryModal key={idx} account={account} filterVehicle={car}>
                <div className="flex justify-between items-center bg-white p-2.5 rounded-lg border border-teal-100 shadow-sm relative overflow-hidden cursor-pointer interactive-card group">
                  <div className="flex flex-col z-10">
                    <span className="text-[13px] font-bold text-slate-800 leading-tight group-hover:text-teal-700 transition-colors">{car.make} {car.model} ({car.registration})</span>
                    <span className="text-[10px] text-slate-500 font-medium mt-0.5">
                      {car.registration || 'Unregistered'} 
                      <span className="text-teal-600 font-bold ml-1">({car.profitSharePercentage}%)</span>
                    </span>
                  </div>
                  <div className="flex flex-col items-end z-10">
                    {car.status === 'SOLD' ? (
                      <>
                        <span className="text-[9px] bg-purple-100 text-purple-700 px-1.5 py-0.5 rounded font-bold uppercase tracking-widest mb-1">Sold This Month</span>
                        <span className="text-[13px] font-black text-purple-700 leading-tight">Profit: ₹{Math.round(Number(car.profit || 0) * (car.profitSharePercentage / 100)).toLocaleString('en-IN')}</span>
                      </>
                    ) : (
                      <>
                        <span className="text-[10px] text-teal-600/70 uppercase font-bold">Car Price</span>
                        <span className="text-[13px] font-black text-teal-700 leading-tight">₹{car.purchasePrice.toLocaleString('en-IN')}</span>
                      </>
                    )}
                  </div>
                </div>
              </AccountHistoryModal>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
