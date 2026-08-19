import { getSession } from '@/lib/session';
import { redirect } from 'next/navigation';
import prisma from '@/lib/prisma';
import { cookies } from 'next/headers';
import { BookOpen, Wallet, Clock, Car, Building2 } from 'lucide-react';
import { getAccountBalances } from '@/actions/accounts';

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

  const { accounts } = await getAccountBalances(year, month);
  let previousCarryOver = 0;
  if (dbUser?.accountId) {
    const acc = accounts.find(a => a.id === dbUser.accountId);
    if (acc) {
      // In this system, negative balance means they owe us money (Upad)
      previousCarryOver = (Number(acc.openingBalance) || 0) * -1;
    }
  }

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
            { category: 'UPAD_REPAYMENT', type: 'CREDIT' },
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

    const baseTransactions = [
      ...expensesRaw.map(exp => {
        let expMode = 'CASH';
        try {
          if (exp.requestedMode) {
            const parsed = JSON.parse(exp.requestedMode);
            if (parsed.payments && parsed.payments.length > 0) {
              expMode = parsed.payments[0].mode || 'CASH';
            }
          }
        } catch(e) {}
        return {
          ...exp,
          amount: Number(exp.amount),
          _type: 'EXPENSE',
          mode: expMode
        };
      }),
      ...advancesRaw.map(adv => ({
        id: adv.id,
        date: adv.date,
        expenseType: adv.category === 'SALARY' ? 'SALARY' : adv.category === 'UPAD_REPAYMENT' ? 'REPAYMENT' : 'ADVANCE',
        amount: Number(adv.amount),
        description: adv.description,
        status: 'APPROVED', // Advances/Repayments are instantly approved transfers
        _type: adv.category === 'SALARY' ? 'SALARY' : adv.category === 'UPAD_REPAYMENT' ? 'REPAYMENT' : 'ADVANCE',
        mode: adv.transactionMode || 'CASH'
      }))
    ];

    if (previousCarryOver > 0) {
      baseTransactions.push({
        id: 'carryover',
        date: new Date(year, month, 1, 0, 0, 1), // First second of the month
        expenseType: 'ADVANCE', // Renders as a blue wallet icon
        amount: previousCarryOver,
        description: 'Previous Month Carryover',
        status: 'APPROVED',
        _type: 'ADVANCE',
        mode: 'CASH', // Defaulting carryover to cash visually
        isCarryOver: true
      });
    }

    const allTransactions = baseTransactions.sort((a, b) => new Date(b.date) - new Date(a.date));

    // Calculate totals
    const totalApproved = allTransactions
      .filter(e => e._type === 'EXPENSE' && e.status === 'APPROVED' && !e.isCarryOver)
      .reduce((sum, e) => sum + e.amount, 0);
      
    const cashApproved = allTransactions
      .filter(e => e._type === 'EXPENSE' && e.status === 'APPROVED' && e.mode === 'CASH' && !e.isCarryOver)
      .reduce((sum, e) => sum + e.amount, 0);
      
    const bankApproved = allTransactions
      .filter(e => e._type === 'EXPENSE' && e.status === 'APPROVED' && e.mode === 'BANK' && !e.isCarryOver)
      .reduce((sum, e) => sum + e.amount, 0);

    const totalPending = allTransactions
      .filter(e => e._type === 'EXPENSE' && e.status === 'PENDING' && !e.isCarryOver)
      .reduce((sum, e) => sum + e.amount, 0);

    const totalAdvances = allTransactions
      .filter(e => e._type === 'ADVANCE' && !e.isCarryOver)
      .reduce((sum, e) => sum + e.amount, 0);
      
    const cashAdvances = allTransactions
      .filter(e => e._type === 'ADVANCE' && e.mode === 'CASH' && !e.isCarryOver)
      .reduce((sum, e) => sum + e.amount, 0);
      
    const bankAdvances = allTransactions
      .filter(e => e._type === 'ADVANCE' && e.mode === 'BANK' && !e.isCarryOver)
      .reduce((sum, e) => sum + e.amount, 0);

    const totalRepayments = allTransactions
      .filter(e => e._type === 'REPAYMENT' && !e.isCarryOver)
      .reduce((sum, e) => sum + e.amount, 0);
      
    const cashRepayments = allTransactions
      .filter(e => e._type === 'REPAYMENT' && e.mode === 'CASH' && !e.isCarryOver)
      .reduce((sum, e) => sum + e.amount, 0);
      
    const bankRepayments = allTransactions
      .filter(e => e._type === 'REPAYMENT' && e.mode === 'BANK' && !e.isCarryOver)
      .reduce((sum, e) => sum + e.amount, 0);

    const totalSalary = allTransactions
      .filter(e => e._type === 'SALARY' && !e.isCarryOver)
      .reduce((sum, e) => sum + e.amount, 0);

    const netUpadAvailable = previousCarryOver + totalAdvances - totalApproved - totalRepayments;
    
    // We assume previousCarryOver is fully Cash because historical data didn't track it.
    const netCashUpad = previousCarryOver + cashAdvances - cashApproved - cashRepayments;
    const netBankUpad = bankAdvances - bankApproved - bankRepayments;

    // Sort all transactions by date descending
    const sortedTransactions = [...allTransactions].sort((a, b) => new Date(b.date) - new Date(a.date));

    const monthName = new Date(year, month).toLocaleString('en-US', { month: 'long', year: 'numeric' });

    return (
    <div className="w-full px-4 pt-1 pb-4 md:p-8 flex flex-col gap-6 text-slate-900">
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
          <div className="flex justify-between items-center mt-1.5 text-[9px] md:text-[10px] font-bold text-blue-800 bg-blue-100/50 p-1.5 rounded">
            <span>Cash: ₹{cashAdvances.toLocaleString('en-IN')}</span>
            <span>Bank: ₹{bankAdvances.toLocaleString('en-IN')}</span>
          </div>
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
        <div className={`col-span-2 md:col-span-1 border rounded-xl p-3 md:p-5 shadow-sm flex flex-col justify-center gap-1 ${netUpadAvailable < 0 ? 'bg-rose-50 border-rose-200' : 'bg-emerald-50 border-emerald-200'}`}>
          <div className={`text-[9px] md:text-xs font-bold uppercase tracking-widest ${netUpadAvailable < 0 ? 'text-rose-600' : 'text-emerald-600'}`}>
            {netUpadAvailable < 0 ? 'Reimbursement Due' : 'Available Upad'}
          </div>
          <div className={`text-lg md:text-2xl font-black leading-none ${netUpadAvailable < 0 ? 'text-rose-700' : 'text-emerald-700'}`}>
            ₹{Math.abs(netUpadAvailable).toLocaleString('en-IN')}
          </div>
          <div className={`flex justify-between items-center mt-1.5 text-[9px] md:text-[10px] font-bold p-1.5 rounded ${netUpadAvailable < 0 ? 'text-rose-800 bg-rose-100/50' : 'text-emerald-800 bg-emerald-100/50'}`}>
            <span>Cash: ₹{netCashUpad.toLocaleString('en-IN')}</span>
            <span>Bank: ₹{netBankUpad.toLocaleString('en-IN')}</span>
          </div>
        </div>
      </div>

      <div className="mt-4">
        {sortedTransactions.length === 0 ? (
          <div className="text-center py-16 bg-white border border-slate-200 rounded-xl shadow-sm">
            <BookOpen size={48} className="mx-auto text-slate-300 mb-4" />
            <h3 className="text-lg font-semibold text-slate-700">No Transactions Found</h3>
            <p className="text-slate-500 mt-2">You haven't submitted any expenses in {monthName}.</p>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {/* Mobile Card Layout */}
            <div className="flex flex-col gap-3 md:hidden">
              {(() => {
                const grouped = sortedTransactions.reduce((acc, exp) => {
                  const dateStr = new Date(exp.date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
                  if (!acc[dateStr]) acc[dateStr] = [];
                  acc[dateStr].push(exp);
                  return acc;
                }, {});
                
                return Object.entries(grouped).map(([dateStr, items]) => (
                  <div key={dateStr} className="mb-4">
                    <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2 ml-2">{dateStr}</h3>
                    <div className="bg-white rounded-xl shadow-[0_2px_10px_-4px_rgba(0,0,0,0.05)] border border-slate-200 overflow-hidden flex flex-col">
                      {items.map((exp, index) => (
                        <div key={exp.id || index} className="p-3 border-b border-slate-100 last:border-0 active:bg-slate-50 transition-colors flex justify-between items-start gap-3">
                          <div className="flex flex-col gap-1 flex-1 min-w-0">
                            <span className="text-[13px] font-bold text-slate-900 leading-tight line-clamp-2">{exp.description}</span>
                            <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                              <span className={`text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded border ${
                                exp.expenseType === 'SALARY' ? 'bg-indigo-50 text-indigo-700 border-indigo-200' :
                                exp.expenseType === 'REPAYMENT' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
                                exp.expenseType === 'ADVANCE' ? 'bg-blue-50 text-blue-700 border-blue-200' :
                                exp.expenseType === 'OFFICE_EXPENSE' ? 'bg-red-50 text-red-700 border-red-200' : 'bg-orange-50 text-orange-700 border-orange-200'
                              }`}>
                                {exp.expenseType.replace('_', ' ')}
                              </span>
                              
                              <span className="text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded border bg-slate-100 text-slate-600 border-slate-200">
                                {exp.mode}
                              </span>

                              {exp.vehicle && (
                                <span className="text-[10px] font-semibold text-slate-500 w-full mt-0.5">
                                  Vehicle: <span className="text-slate-700">{exp.vehicle.make} {exp.vehicle.model} ({exp.vehicle.registration})</span>
                                </span>
                              )}
                            </div>
                          </div>
                          <div className="flex flex-col items-end shrink-0 mt-0.5 gap-1.5">
                            <span className={`text-[14px] font-black tracking-tight whitespace-nowrap ${
                              exp.expenseType === 'SALARY' || exp.expenseType === 'ADVANCE' ? 'text-blue-600' : 
                              exp.expenseType === 'REPAYMENT' ? 'text-emerald-600' : 'text-slate-900'
                            }`}>
                              {exp.expenseType === 'SALARY' || exp.expenseType === 'ADVANCE' ? '+' : '-'}₹{exp.amount.toLocaleString('en-IN')}
                            </span>
                            {exp.expenseType !== 'SALARY' && exp.expenseType !== 'ADVANCE' && exp.expenseType !== 'REPAYMENT' && (
                              <span className={`text-[9px] font-bold uppercase tracking-widest px-1.5 py-0.5 rounded ${
                                exp.status === 'APPROVED' ? 'bg-emerald-100 text-emerald-800' : 
                                exp.status === 'PENDING' ? 'bg-amber-100 text-amber-800' : 
                                'bg-rose-100 text-rose-800'
                              }`}>
                                {exp.status}
                              </span>
                            )}
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
                    <th className="py-4 px-5 text-[10px] font-bold text-slate-500 uppercase tracking-wider">Details</th>
                    <th className="py-4 px-5 text-[10px] font-bold text-slate-500 uppercase tracking-wider">Source</th>
                    <th className="py-4 px-5 text-[10px] font-bold text-slate-500 uppercase tracking-wider text-right">Amount</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {sortedTransactions.map((exp, index) => (
                    <tr key={exp.id || index} className="hover:bg-slate-50/80 transition-colors group">
                      <td className="py-4 px-5 text-[12px] font-bold text-slate-600 whitespace-nowrap align-top">
                        {new Date(exp.date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
                      </td>
                      <td className="py-4 px-5 align-top">
                        <div className="flex items-start gap-3">
                          <div className={`mt-0.5 p-2 rounded-lg border flex-shrink-0 ${
                            exp.expenseType === 'SALARY' ? 'bg-indigo-50 text-indigo-600 border-indigo-100 shadow-sm' :
                            exp.expenseType === 'REPAYMENT' ? 'bg-emerald-50 text-emerald-600 border-emerald-100 shadow-sm' :
                            exp.expenseType === 'ADVANCE' ? 'bg-blue-50 text-blue-600 border-blue-100 shadow-sm' :
                            exp.expenseType === 'OFFICE_EXPENSE' ? 'bg-red-50 text-red-600 border-red-100 shadow-sm' : 'bg-orange-50 text-orange-600 border-orange-100 shadow-sm'
                          }`}>
                            {exp.expenseType === 'SALARY' ? <BookOpen size={16} /> :
                             exp.expenseType === 'REPAYMENT' ? <Wallet size={16} /> :
                             exp.expenseType === 'ADVANCE' ? <Wallet size={16} /> :
                             exp.expenseType === 'OFFICE_EXPENSE' ? <Building2 size={16} /> : <Car size={16} />}
                          </div>
                          <div className="flex flex-col pt-0.5">
                            <span className="text-[14px] font-bold text-slate-900">{exp.description}</span>
                            {exp.vehicle && (
                              <span className="text-[11px] font-medium text-slate-500 mt-1">
                                Linked to: <span className="font-bold text-slate-700">{exp.vehicle.make} {exp.vehicle.model} ({exp.vehicle.registration})</span>
                              </span>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="py-4 px-5 align-top pt-5">
                        <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-1 rounded-md border ${
                          exp.expenseType === 'SALARY' ? 'bg-indigo-50 text-indigo-700 border-indigo-200' :
                          exp.expenseType === 'REPAYMENT' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
                          exp.expenseType === 'ADVANCE' ? 'bg-blue-50 text-blue-700 border-blue-200' :
                          exp.expenseType === 'OFFICE_EXPENSE' ? 'bg-red-50 text-red-700 border-red-200' : 'bg-orange-50 text-orange-700 border-orange-200'
                        }`}>
                          {exp.expenseType.replace('_', ' ')}
                        </span>
                      </td>
                      <td className="py-4 px-5 align-top pt-5">
                        <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-1 rounded-md border bg-slate-100 text-slate-600 border-slate-200">
                          {exp.mode}
                        </span>
                      </td>
                      <td className="py-4 px-5 align-top text-right pt-4">
                        <div className="flex flex-col items-end gap-1.5">
                          <span className={`text-[15px] font-black tracking-tight whitespace-nowrap ${
                            exp.expenseType === 'SALARY' || exp.expenseType === 'ADVANCE' ? 'text-blue-600' : 
                            exp.expenseType === 'REPAYMENT' ? 'text-emerald-600' : 'text-slate-900'
                          }`}>
                            {exp.expenseType === 'SALARY' || exp.expenseType === 'ADVANCE' ? '+' : '-'}₹{exp.amount.toLocaleString('en-IN')}
                          </span>
                          {exp.expenseType !== 'SALARY' && exp.expenseType !== 'ADVANCE' && exp.expenseType !== 'REPAYMENT' && (
                            <span className={`text-[9px] font-bold uppercase tracking-widest px-1.5 py-0.5 rounded ${
                              exp.status === 'APPROVED' ? 'bg-emerald-100 text-emerald-800' : 
                              exp.status === 'PENDING' ? 'bg-amber-100 text-amber-800' : 
                              'bg-rose-100 text-rose-800'
                            }`}>
                              {exp.status}
                            </span>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
