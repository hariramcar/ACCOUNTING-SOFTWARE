import { getAllExpenses, getAllIncome } from '@/actions/history';
import { getSession } from '@/lib/session';
import { redirect } from 'next/navigation';
import { BookOpen, Receipt, TrendingUp } from 'lucide-react';
import { cookies } from 'next/headers';
import LedgerTabs from './LedgerTabs';

export default async function HistoryPage() {
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
  } else {
    const d = new Date();
    year = d.getFullYear();
    month = d.getMonth();
  }

  const { expenses } = await getAllExpenses(year, month);
  const { income } = await getAllIncome(year, month);

  // Calculate totals (exclude internal transfers, Market Place, and Staff Advances from totals)
  const totalExpenses = expenses?.reduce((sum, exp) => {
    if (exp.requestedMode === 'UGHRANI') return sum;
    if (exp.isStaffAdvance) return sum;
    return sum + (!exp.isTransfer && exp.status !== 'REJECTED' ? Number(exp.amount) : 0);
  }, 0) || 0;
  const totalIncome = income?.reduce((sum, inc) => sum + (!inc.isTransfer ? Number(inc.amount) : 0), 0) || 0;

  return (
    <div className="w-full max-w-7xl mx-auto p-4 md:p-8 flex flex-col gap-6 md:gap-8 text-slate-900 pb-24 md:pb-8">
      <div className="flex flex-col md:flex-row md:justify-between items-start md:items-end gap-4 border-b border-slate-200 pb-5 sticky top-0 bg-slate-50/90 backdrop-blur-xl z-30 pt-4 md:pt-0 -mx-4 px-4 md:mx-0 md:px-0">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <div className="w-8 h-8 md:w-10 md:h-10 bg-indigo-50 text-indigo-600 rounded-lg flex items-center justify-center border border-indigo-100 shadow-sm">
              <BookOpen size={18} className="md:w-5 md:h-5" />
            </div>
            <h1 className="text-xl md:text-3xl font-semibold tracking-tight text-slate-900 m-0">Ledger History</h1>
          </div>
          <p className="text-xs md:text-sm text-slate-500 m-0 font-medium ml-0 md:ml-13 mt-1.5 md:mt-0">Historical record of all money in and money out for this month.</p>
        </div>
      </div>

      {/* Summary Cards and Transaction List are handled by the Client Component */}
      <LedgerTabs 
        income={income} 
        expenses={expenses} 
        totalIncome={totalIncome}
        totalExpenses={totalExpenses}
      />
    </div>
  );
}
