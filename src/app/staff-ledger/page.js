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
          { category: 'UPAD_WITHDRAWAL', type: 'DEBIT' } // This is how UPAD is recorded from the Accounts page
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
      expenseType: 'ADVANCE',
      amount: Number(adv.amount),
      description: adv.description,
      status: 'APPROVED', // Advances are instantly approved transfers
      _type: 'ADVANCE'
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

  // Group by date
  const grouped = allTransactions.reduce((acc, tx) => {
    const dateStr = new Date(tx.date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
    if (!acc[dateStr]) acc[dateStr] = [];
    acc[dateStr].push(tx);
    return acc;
  }, {});

  const monthName = new Date(year, month).toLocaleString('en-US', { month: 'long', year: 'numeric' });

  return (
    <div className="w-full max-w-5xl mx-auto p-4 md:p-8 flex flex-col gap-6 text-slate-900">
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

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-5 shadow-sm flex items-center gap-4">
          <div className="p-3 bg-blue-100 text-blue-600 rounded-lg">
            <BookOpen size={24} />
          </div>
          <div>
            <div className="text-xs font-bold uppercase tracking-widest text-blue-600 mb-1">Total Advance Received</div>
            <div className="text-2xl font-black text-blue-700">₹{totalAdvances.toLocaleString('en-IN')}</div>
          </div>
        </div>

        <div className="bg-red-50 border border-red-200 rounded-xl p-5 shadow-sm flex items-center gap-4">
          <div className="p-3 bg-red-100 text-red-600 rounded-lg">
            <Wallet size={24} />
          </div>
          <div>
            <div className="text-xs font-bold uppercase tracking-widest text-red-600 mb-1">Total Spent</div>
            <div className="text-2xl font-black text-red-700">₹{totalApproved.toLocaleString('en-IN')}</div>
          </div>
        </div>

        <div className={`border rounded-xl p-5 shadow-sm flex items-center gap-4 ${totalAdvances - totalApproved < 0 ? 'bg-amber-50 border-amber-200' : 'bg-emerald-50 border-emerald-200'}`}>
          <div className={`p-3 rounded-lg ${totalAdvances - totalApproved < 0 ? 'bg-amber-100 text-amber-600' : 'bg-emerald-100 text-emerald-600'}`}>
            <Wallet size={24} />
          </div>
          <div>
            <div className={`text-xs font-bold uppercase tracking-widest mb-1 ${totalAdvances - totalApproved < 0 ? 'text-amber-600' : 'text-emerald-600'}`}>Remaining Balance</div>
            <div className={`text-2xl font-black ${totalAdvances - totalApproved < 0 ? 'text-amber-700' : 'text-emerald-700'}`}>
              {totalAdvances - totalApproved < 0 ? '-' : ''}₹{Math.abs(totalAdvances - totalApproved).toLocaleString('en-IN')}
            </div>
          </div>
        </div>
      </div>

      <div className="mt-4">
        {allTransactions.length === 0 ? (
          <div className="text-center py-16 bg-white border border-slate-200 rounded-xl shadow-sm">
            <BookOpen size={48} className="mx-auto text-slate-300 mb-4" />
            <h3 className="text-lg font-semibold text-slate-700">No Transactions Found</h3>
            <p className="text-slate-500 mt-2">You haven't submitted any expenses in {monthName}.</p>
          </div>
        ) : (
          Object.entries(grouped).map(([dateStr, exps]) => (
            <div key={dateStr} className="mb-6">
              <div className="flex items-center gap-3 mb-4">
                <span className="text-xs font-black uppercase tracking-widest text-slate-500 px-3 py-1 bg-slate-100 rounded-full border border-slate-200">{dateStr}</span>
                <div className="h-px bg-slate-200 flex-1"></div>
              </div>
              <div className="flex flex-col gap-3">
                {exps.map(exp => (
                  <div key={exp.id} className="bg-white rounded-xl p-4 md:p-5 flex justify-between items-start gap-2 sm:gap-4 shadow-sm border border-slate-200 hover:shadow-md transition-shadow">
                    <div className="flex items-start gap-3 flex-1 min-w-0">
                      <div className={`mt-0.5 p-2 rounded-lg border flex-shrink-0 ${
                        exp.expenseType === 'INCOME' ? 'bg-emerald-50 text-emerald-500 border-emerald-100' :
                        exp.expenseType === 'ADVANCE' ? 'bg-blue-50 text-blue-500 border-blue-100' :
                        exp.expenseType === 'OFFICE_EXPENSE' ? 'bg-red-50 text-red-500 border-red-100' : 'bg-indigo-50 text-indigo-500 border-indigo-100'
                      }`}>
                        {exp.expenseType === 'INCOME' ? <Wallet size={16} /> :
                         exp.expenseType === 'ADVANCE' ? <Wallet size={16} /> :
                         exp.expenseType === 'OFFICE_EXPENSE' ? <Building2 size={16} /> : <Car size={16} />}
                      </div>
                      <div className="min-w-0">
                        <div className="font-bold text-slate-900 text-[13px] sm:text-sm truncate">{exp.description}</div>
                        <div className="flex items-center flex-wrap gap-1.5 mt-1">
                          <span className={`text-[9px] sm:text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-full border ${
                            exp.expenseType === 'INCOME' ? 'bg-emerald-50 text-emerald-600 border-emerald-200' :
                            exp.expenseType === 'ADVANCE' ? 'bg-blue-50 text-blue-600 border-blue-200' :
                            exp.expenseType === 'OFFICE_EXPENSE' ? 'bg-red-50 text-red-600 border-red-200' : 'bg-indigo-50 text-indigo-600 border-indigo-200'
                          }`}>
                            {exp.expenseType.replace('_', ' ')}
                          </span>
                          
                          {exp.vehicle && (
                            <span className="text-[9px] sm:text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-full bg-slate-100 text-slate-600 border border-slate-200">
                              {exp.vehicle.make} {exp.vehicle.model}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="flex flex-col items-end justify-center gap-1 flex-shrink-0 text-right">
                      <div className={`font-black text-sm sm:text-base md:text-lg whitespace-nowrap ${exp.expenseType === 'INCOME' || exp.expenseType === 'ADVANCE' ? 'text-emerald-600' : 'text-slate-900'}`}>
                        {exp.expenseType === 'INCOME' || exp.expenseType === 'ADVANCE' ? '+' : ''}₹{exp.amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      </div>
                      <div className={`text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-md ${
                        exp.status === 'APPROVED' ? 'bg-emerald-100 text-emerald-700' : 
                        exp.status === 'PENDING' ? 'bg-amber-100 text-amber-700' : 
                        'bg-red-100 text-red-700'
                      }`}>
                        {exp.status}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
