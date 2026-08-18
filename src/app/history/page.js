import { getAllExpenses, getAllIncome } from '@/actions/history';
import { getSession } from '@/lib/session';
import { redirect } from 'next/navigation';
import { BookOpen, Receipt, TrendingUp } from 'lucide-react';
import { cookies } from 'next/headers';
import LedgerTabs from './LedgerTabs';
import prisma from '@/lib/prisma';

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
  
  const accountsRaw = await prisma.account.findMany({
    orderBy: { type: 'asc' }
  });
  const accounts = accountsRaw.map(acc => ({
    ...acc,
    openingBalance: Number(acc.openingBalance)
  }));
  
  const vehiclesRaw = await prisma.vehicle.findMany({
    where: { status: 'IN_STOCK' },
    orderBy: { createdAt: 'desc' },
    select: {
      id: true,
      make: true,
      model: true,
      registration: true,
      status: true,
      purchasePrice: true,
      legacyExpenses: true,
      expenses: { select: { amount: true } }
    }
  });

  const vehicles = vehiclesRaw.map(v => {
    const totalExpenses = v.expenses.reduce((sum, exp) => sum + Number(exp.amount), 0);
    const legacyExp = Number(v.legacyExpenses || 0);
    const totalCost = Number(v.purchasePrice || 0) + totalExpenses + legacyExp;
    return {
      id: v.id,
      make: v.make,
      model: v.model,
      registration: v.registration,
      status: v.status,
      totalCost
    };
  });

  const soldVehiclesRaw = await prisma.vehicle.findMany({
    where: { 
      status: 'SOLD',
      saleDate: {
        gte: new Date(year, month, 1),
        lte: new Date(year, month + 1, 0, 23, 59, 59, 999)
      }
    },
    include: {
      partnerships: true
    }
  });

  const firmCarProfitThisMonth = soldVehiclesRaw.reduce((acc, car) => {
    const partnerProfitShare = (car.partnerships || []).reduce((sum, p) => sum + (Math.round((Number(car.profit || 0) * (Number(p.profitSharePercentage) / 100)) * 100) / 100), 0);
    return acc + Math.max(0, (Number(car.profit || 0) - partnerProfitShare));
  }, 0);

  // Calculate totals (exclude internal transfers, Market Place, Staff Advances, and Asset Exchanges from totals)
  const totalExpenses = expenses?.reduce((sum, exp) => {
    if (exp.requestedMode === 'UGHRANI') return sum;
    if (exp.isStaffAdvance) return sum;
    if (exp.rawCategory === 'VEHICLE_PURCHASE') return sum;
    if (exp.description?.startsWith('Auto-Entry: Paid Full Settlement')) return sum;
    return sum + (!exp.isTransfer && exp.status !== 'REJECTED' ? Number(exp.amount) : 0);
  }, 0) || 0;
  
  const rawOperatingIncome = income?.reduce((sum, inc) => {
    if (inc.rawCategory === 'VEHICLE_SALE') return sum;
    if (inc.description?.startsWith('Token Received:') && !inc.isForfeitedToken) return sum; // Exclude applied/active tokens to prevent double-counting
    if (inc.description?.startsWith('Income: Received from')) return sum;
    if (inc.description?.startsWith('Auto-Entry: Received Pending Capital')) return sum;
    return sum + (!inc.isTransfer ? Number(inc.amount) : 0);
  }, 0) || 0;

  const totalIncome = rawOperatingIncome + firmCarProfitThisMonth;

  return (
    <div className="w-full max-w-7xl mx-auto px-4 pt-1 md:p-8 flex flex-col gap-4 md:gap-8 text-slate-900 pb-24 md:pb-8">
      <div className="flex flex-col md:flex-row md:justify-between items-start md:items-end gap-3 md:gap-4 border-b border-slate-200 pb-3 md:pb-5 mb-1 md:mb-6 sticky top-0 bg-slate-50/90 backdrop-blur-xl z-30 pt-1 md:pt-0 -mx-4 px-4 md:mx-0 md:px-0">
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
        accounts={accounts}
        vehicles={vehicles}
      />
    </div>
  );
}
