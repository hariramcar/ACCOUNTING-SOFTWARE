import { getSession } from '@/lib/session';
import { redirect } from 'next/navigation';
import prisma from '@/lib/prisma';
import { cookies } from 'next/headers';
import { BookOpen, Wallet, Clock, Car, Building2 } from 'lucide-react';

export const metadata = {
  title: 'My Monthly Ledger | Hariram Accounting',
};

export default async function StaffLedgerPage() {
  const session = await getSession();
  
  // Only STAFF can access this (or ADMIN checking it out)
  if (!session) {
    redirect('/login');
  }

  // Find the user's linked account
  const dbUser = await prisma.user.findUnique({
    where: { id: session.userId },
    select: { accountId: true }
  });

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

  const startDate = new Date(year, month, 1);
  const endDate = new Date(year, month + 1, 0, 23, 59, 59, 999);

  const expensesRaw = await prisma.expense.findMany({
    where: {
      submittedById: session.userId,
      date: {
        gte: startDate,
        lte: endDate
      }
    },
    orderBy: { date: 'desc' },
    include: {
      vehicle: true
    }
  });

  // Fetch Advances given to this staff member (Internal Transfers to their account)
  let advancesRaw = [];
  if (dbUser?.accountId) {
      advancesRaw = await prisma.transaction.findMany({
        where: {
          accountId: dbUser.accountId,
          OR: [
            { category: 'INTERNAL_TRANSFER', type: 'CREDIT' },
            { category: 'UPAD_WITHDRAWAL', type: 'DEBIT' },
            { category: 'SALARY' }
          ],
          date: {
            gte: startDate,
            lte: endDate
          }
        },
        orderBy: { date: 'desc' }
      });
    }

    const allTransactions = [
      ...expensesRaw.map(exp => ({
        ...exp,
        amount: Number(exp.amount),
        _type: 'EXPENSE'
      })),
      ...advancesRaw.map(adv => ({
        id: adv.id,
        date: adv.date,
        expenseType: adv.category === 'SALARY' ? 'SALARY' : 'ADVANCE',
        amount: Number(adv.amount),
        description: adv.description,
        status: 'APPROVED', // Advances are instantly approved transfers
        _type: adv.category === 'SALARY' ? 'SALARY' : 'ADVANCE'
      }))
    ].sort((a, b) => new Date(b.date) - new Date(a.date));

    // Calculate totals
    const totalApproved = allTransactions
      .filter(e => e._type === 'EXPENSE' && e.status === 'APPROVED')
      .reduce((sum, e) => sum + e.amount, 0);

    const totalPending = allTransactions
      .filter(e => e._type === 'EXPENSE' && e.status === 'PENDING')
      .reduce((sum, e) => sum + e.amount, 0);

    const totalAdvances = allTransactions
      .filter(e => e._type === 'ADVANCE')
      .reduce((sum, e) => sum + e.amount, 0);

    const totalSalary = allTransactions
      .filter(e => e._type === 'SALARY')
      .reduce((sum, e) => sum + e.amount, 0);

    // Group by Upad Cycles
    const sortedAsc = [...allTransactions].sort((a, b) => new Date(a.date) - new Date(b.date));
    
    let cycles = [];
    let currentCycle = null;

    for (const tx of sortedAsc) {
      if (tx._type === 'ADVANCE') {
        if (currentCycle && (currentCycle.advanceTx || currentCycle.events.length > 0)) {
          cycles.push(currentCycle);
        }
        currentCycle = { 
          id: tx.id,
          advanceTx: tx, 
          amount: tx.amount, 
          events: [] 
        };
      } else {
        if (!currentCycle) {
          // Orphan expenses before the first advance in the month
          currentCycle = {
            id: 'orphan-cycle',
            advanceTx: null,
            amount: 0,
            events: []
          };
        }
        currentCycle.events.push(tx);
      }
    }
    if (currentCycle && (currentCycle.advanceTx || currentCycle.events.length > 0)) {
      cycles.push(currentCycle);
    }

    // Sort events within each cycle by descending date, then reverse the cycles to show newest cycle first
    cycles.forEach(c => c.events.sort((a, b) => new Date(b.date) - new Date(a.date)));
    cycles.reverse();

    const monthName = new Date(year, month).toLocaleString('en-US', { month: 'long', year: 'numeric' });

    return (
    <div className="w-full max-w-5xl mx-auto px-4 pt-1 pb-4 md:p-8 flex flex-col gap-6 text-slate-900">
      <div className="flex flex-col md:flex-row md:justify-between items-start md:items-end gap-4 border-b border-slate-200 pb-5">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <div className="w-10 h-10 bg-indigo-50 text-indigo-600 rounded-lg flex items-center justify-center border border-indigo-100 shadow-sm">
              <BookOpen size={20} />
            </div>
            <h1 className="text-2xl md:text-3xl font-semibold tracking-tight text-slate-900 m-0">My Monthly Ledger</h1>
          </div>
          <p className="text-slate-500 m-0 font-medium ml-13">All your transactions for {monthName}</p>
        </div>
      </div>

      {/* Stat Cards - Native Mobile Layout */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-2 md:gap-4">
        {/* Total Salary */}
        <div className="col-span-2 md:col-span-1 bg-indigo-50 border border-indigo-200 rounded-xl p-3 md:p-5 shadow-sm flex items-center gap-3">
          <div className="p-2 md:p-3 bg-indigo-100 text-indigo-600 rounded-lg">
            <BookOpen size={20} className="md:w-6 md:h-6" />
          </div>
          <div>
            <div className="text-[10px] md:text-xs font-bold uppercase tracking-widest text-indigo-600 mb-0.5">Salary Received</div>
            <div className="text-xl md:text-2xl font-black text-indigo-700 leading-none">₹{totalSalary.toLocaleString('en-IN')}</div>
          </div>
        </div>

        {/* Total Advance */}
        <div className="col-span-2 md:col-span-1 bg-blue-50 border border-blue-200 rounded-xl p-3 md:p-5 shadow-sm flex flex-col justify-center gap-1">
          <div className="text-[9px] md:text-xs font-bold uppercase tracking-widest text-blue-600">Upad/Advance Received</div>
          <div className="text-lg md:text-2xl font-black text-blue-700 leading-none">₹{totalAdvances.toLocaleString('en-IN')}</div>
        </div>

        {/* Total Spent */}
        <div className="col-span-1 bg-red-50 border border-red-200 rounded-xl p-3 md:p-5 shadow-sm flex flex-col justify-center gap-1">
          <div className="text-[9px] md:text-xs font-bold uppercase tracking-widest text-red-600">Approved Spent</div>
          <div className="text-lg md:text-2xl font-black text-red-700 leading-none">₹{totalApproved.toLocaleString('en-IN')}</div>
        </div>

        {/* Pending Approvals */}
        <div className="col-span-1 bg-amber-50 border border-amber-200 rounded-xl p-3 md:p-5 shadow-sm flex flex-col justify-center gap-1">
          <div className="text-[9px] md:text-xs font-bold uppercase tracking-widest text-amber-600">Pending Spent</div>
          <div className="text-lg md:text-2xl font-black text-amber-700 leading-none">₹{totalPending.toLocaleString('en-IN')}</div>
        </div>

        {/* Remaining Balance (Cash in Hand / Due) */}
        <div className={`col-span-2 md:col-span-1 border rounded-xl p-3 md:p-5 shadow-sm flex items-center gap-3 ${totalAdvances - totalApproved < 0 ? 'bg-rose-50 border-rose-200' : 'bg-emerald-50 border-emerald-200'}`}>
          <div className={`p-2 md:p-3 rounded-lg ${totalAdvances - totalApproved < 0 ? 'bg-rose-100 text-rose-600' : 'bg-emerald-100 text-emerald-600'}`}>
            <Wallet size={20} className="md:w-6 md:h-6" />
          </div>
          <div>
            <div className={`text-[10px] md:text-xs font-bold uppercase tracking-widest mb-0.5 ${totalAdvances - totalApproved < 0 ? 'text-rose-600' : 'text-emerald-600'}`}>
              {totalAdvances - totalApproved < 0 ? 'Reimbursement Due' : 'Available Upad'}
            </div>
            <div className={`text-xl md:text-2xl font-black leading-none ${totalAdvances - totalApproved < 0 ? 'text-rose-700' : 'text-emerald-700'}`}>
              ₹{Math.abs(totalAdvances - totalApproved).toLocaleString('en-IN')}
            </div>
          </div>
        </div>
      </div>

      <div className="mt-4 flex flex-col gap-8">
        {cycles.length === 0 ? (
          <div className="text-center py-16 bg-white border border-slate-200 rounded-xl shadow-sm">
            <BookOpen size={48} className="mx-auto text-slate-300 mb-4" />
            <h3 className="text-lg font-semibold text-slate-700">No Transactions Found</h3>
            <p className="text-slate-500 mt-2">You haven't submitted any expenses in {monthName}.</p>
          </div>
        ) : (
          cycles.map((cycle, cycleIndex) => {
            const cycleSpent = cycle.events
              .filter(e => e._type === 'EXPENSE' && e.status === 'APPROVED')
              .reduce((sum, e) => sum + e.amount, 0);
              
            const cyclePending = cycle.events
              .filter(e => e._type === 'EXPENSE' && e.status === 'PENDING')
              .reduce((sum, e) => sum + e.amount, 0);

            const remainingInCycle = cycle.amount - cycleSpent;

            return (
            <div key={cycle.id || cycleIndex} className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
              {/* CYCLE HEADER */}
              <div className="bg-slate-50 border-b border-slate-200 p-4 md:p-5 flex flex-col md:flex-row md:items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="bg-blue-100 text-blue-600 p-2 rounded-lg border border-blue-200">
                    <Wallet size={20} />
                  </div>
                  <div>
                    <h3 className="font-black text-slate-800 text-lg md:text-xl m-0 leading-none">
                      {cycle.advanceTx ? `Upad Received` : `Unallocated / Previous Balance`}
                    </h3>
                    {cycle.advanceTx && (
                      <div className="text-[11px] font-bold text-slate-500 uppercase tracking-widest mt-1">
                        {new Date(cycle.advanceTx.date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                      </div>
                    )}
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-0.5">Advance Amount</div>
                  <div className="font-black text-2xl text-blue-700 leading-none">
                    ₹{cycle.amount.toLocaleString('en-IN')}
                  </div>
                </div>
              </div>

              {/* CYCLE BODY (EVENTS) */}
              <div className="p-4 md:p-5 flex flex-col gap-3">
                {cycle.events.length === 0 ? (
                  <div className="text-center py-6 text-sm font-medium text-slate-400 italic bg-slate-50 rounded-xl border border-dashed border-slate-200">
                    No expenses logged in this cycle yet.
                  </div>
                ) : (
                  cycle.events.map(exp => (
                    <div key={exp.id} className="bg-white rounded-xl p-3 md:p-4 flex justify-between items-start gap-2 md:gap-4 border border-slate-100 shadow-[0_2px_8px_-4px_rgba(0,0,0,0.05)] transition-shadow hover:shadow-md">
                      <div className="flex items-start gap-3 md:gap-4 flex-1 min-w-0">
                        <div className={`mt-0.5 p-2 md:p-2.5 rounded-xl border flex-shrink-0 ${
                          exp.expenseType === 'SALARY' ? 'bg-indigo-50 text-indigo-600 border-indigo-100 shadow-sm' :
                          exp.expenseType === 'OFFICE_EXPENSE' ? 'bg-red-50 text-red-600 border-red-100 shadow-sm' : 'bg-orange-50 text-orange-600 border-orange-100 shadow-sm'
                        }`}>
                          {exp.expenseType === 'SALARY' ? <BookOpen size={18} className="md:w-5 md:h-5" /> :
                           exp.expenseType === 'OFFICE_EXPENSE' ? <Building2 size={18} className="md:w-5 md:h-5" /> : <Car size={18} className="md:w-5 md:h-5" />}
                        </div>
                        <div className="min-w-0 pt-0.5">
                          <div className="font-bold text-slate-800 text-sm md:text-base truncate leading-tight mb-1.5">{exp.description}</div>
                          <div className="flex items-center flex-wrap gap-2">
                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                              {new Date(exp.date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}
                            </span>
                            <span className="text-slate-300 text-[10px]">•</span>
                            <span className={`text-[9px] md:text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border ${
                              exp.expenseType === 'SALARY' ? 'bg-indigo-50 text-indigo-700 border-indigo-200' :
                              exp.expenseType === 'OFFICE_EXPENSE' ? 'bg-red-50 text-red-700 border-red-200' : 'bg-orange-50 text-orange-700 border-orange-200'
                            }`}>
                              {exp.expenseType.replace('_', ' ')}
                            </span>
                            
                            {exp.vehicle && (
                              <span className="text-[9px] md:text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 border border-slate-200">
                                {exp.vehicle.make} {exp.vehicle.model} ({exp.vehicle.registration})
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="flex flex-col items-end justify-center gap-1.5 flex-shrink-0 text-right pt-0.5">
                        <div className={`font-black text-base md:text-lg whitespace-nowrap leading-none ${exp.expenseType === 'SALARY' ? 'text-indigo-600' : 'text-slate-900'}`}>
                          {exp.expenseType === 'SALARY' ? '+' : '-'}₹{exp.amount.toLocaleString('en-IN')}
                        </div>
                        {exp.expenseType !== 'SALARY' && (
                          <div className={`text-[9px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-md ${
                            exp.status === 'APPROVED' ? 'bg-emerald-100 text-emerald-800' : 
                            exp.status === 'PENDING' ? 'bg-amber-100 text-amber-800' : 
                            'bg-rose-100 text-rose-800'
                          }`}>
                            {exp.status}
                          </div>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>

              {/* CYCLE FOOTER (SUMMARY) */}
              <div className="bg-slate-50 border-t border-slate-200 p-4 flex flex-col md:flex-row items-center justify-between gap-4">
                <div className="flex items-center gap-4 w-full md:w-auto">
                  <div className="flex flex-col">
                    <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Total Spent</span>
                    <span className="font-bold text-red-600">₹{cycleSpent.toLocaleString('en-IN')}</span>
                  </div>
                  <div className="w-px h-8 bg-slate-300"></div>
                  <div className="flex flex-col">
                    <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Pending</span>
                    <span className="font-bold text-amber-600">₹{cyclePending.toLocaleString('en-IN')}</span>
                  </div>
                </div>

                <div className={`w-full md:w-auto flex items-center justify-between md:justify-end gap-4 px-4 py-2.5 rounded-xl border ${
                  remainingInCycle < 0 ? 'bg-rose-50 border-rose-200' :
                  remainingInCycle === 0 ? 'bg-slate-100 border-slate-300' : 'bg-emerald-50 border-emerald-200'
                }`}>
                  <span className={`text-[10px] md:text-xs font-bold uppercase tracking-widest ${
                    remainingInCycle < 0 ? 'text-rose-600' :
                    remainingInCycle === 0 ? 'text-slate-600' : 'text-emerald-600'
                  }`}>
                    {remainingInCycle < 0 ? 'Reimbursement Due' : remainingInCycle === 0 ? 'Fully Settled' : 'Cycle Balance'}
                  </span>
                  <span className={`font-black text-lg md:text-xl leading-none ${
                    remainingInCycle < 0 ? 'text-rose-700' :
                    remainingInCycle === 0 ? 'text-slate-700' : 'text-emerald-700'
                  }`}>
                    ₹{Math.abs(remainingInCycle).toLocaleString('en-IN')}
                  </span>
                </div>
              </div>
            </div>
            );
          })
        )}
      </div>
    </div>
  );
}
