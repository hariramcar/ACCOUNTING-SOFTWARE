import prisma from '@/lib/prisma';
import Link from 'next/link';

export default async function Home() {
  // Fetch sold vehicles with their expenses and partnerships to calculate accurate profit
  const soldVehicles = await prisma.vehicle.findMany({
    where: { status: 'SOLD' },
    orderBy: { saleDate: 'desc' },
    include: {
      expenses: true,
      partnerships: {
        include: { partnerAccount: true }
      }
    }
  });

  // Calculate Total Car Gross Profit
  const totalCarProfit = soldVehicles.reduce((sum, v) => sum + Number(v.profit || 0), 0);

  // Calculate Partner Payouts (Money we owed/gave to partners from the profit)
  let totalPartnerPayouts = 0;
  soldVehicles.forEach(v => {
    if (v.partnerships && v.partnerships.length > 0) {
      v.partnerships.forEach(p => {
        const payout = Number(v.profit || 0) * (Number(p.profitSharePercentage) / 100);
        if (payout > 0) totalPartnerPayouts += payout;
      });
    }
  });

  // Our Net Car Profit (After paying partners)
  const ourCarProfit = totalCarProfit - totalPartnerPayouts;

  // Fetch Total Office Expenses
  const officeExpenses = await prisma.expense.findMany({
    where: { expenseType: 'OFFICE_EXPENSE' }
  });
  const totalOfficeExpenses = officeExpenses.reduce((sum, e) => sum + Number(e.amount), 0);

  // TRUE NET PROFIT
  const trueNetProfit = ourCarProfit - totalOfficeExpenses;

  return (
    <div className="w-full max-w-7xl mx-auto p-4 md:p-8 flex flex-col gap-8 text-slate-900">
      <div className="flex flex-col md:flex-row md:justify-between items-start md:items-end gap-4 border-b border-slate-200 pb-5">
        <div>
          <h1 className="text-3xl md:text-4xl font-bold tracking-tight text-slate-900 mb-2">
            Executive Dashboard
          </h1>
          <p className="text-slate-500 font-medium">
            Real-time financial overview and True Net Profit calculation.
          </p>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
        <div className="glass-card p-6 rounded-2xl border-l-4 border-l-blue-500 flex flex-col justify-center">
          <div className="text-xs md:text-sm font-bold text-slate-500 uppercase tracking-wider mb-2">Total Gross Profit</div>
          <div className="text-2xl md:text-3xl font-black text-blue-500">₹{totalCarProfit.toLocaleString('en-IN')}</div>
        </div>

        <div className="glass-card p-6 rounded-2xl border-l-4 border-l-purple-500 flex flex-col justify-center">
          <div className="text-xs md:text-sm font-bold text-slate-500 uppercase tracking-wider mb-2">Partner Payouts</div>
          <div className="text-2xl md:text-3xl font-black text-purple-500">₹{totalPartnerPayouts.toLocaleString('en-IN')}</div>
        </div>

        <div className="glass-card p-6 rounded-2xl border-l-4 border-l-red-500 flex flex-col justify-center">
          <div className="text-xs md:text-sm font-bold text-slate-500 uppercase tracking-wider mb-2">Office Expenses</div>
          <div className="text-2xl md:text-3xl font-black text-red-500">₹{totalOfficeExpenses.toLocaleString('en-IN')}</div>
        </div>

        <div className="glass-card p-6 rounded-2xl border-l-4 border-l-emerald-500 flex flex-col justify-center">
          <div className="text-xs md:text-sm font-bold text-slate-500 uppercase tracking-wider mb-2">True Net Profit</div>
          <div className="text-3xl md:text-4xl font-black text-emerald-500">₹{trueNetProfit.toLocaleString('en-IN')}</div>
        </div>
      </div>

      {/* Sold Vehicles Breakdown */}
      <div className="glass-card rounded-2xl shadow-sm overflow-hidden flex flex-col mt-4">
        <div className="px-6 py-5 border-b border-slate-100 bg-slate-50/50">
          <h2 className="text-lg font-bold text-slate-900 m-0">Recent Sales Breakdown</h2>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[700px]">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50/30">
                <th className="py-4 px-6 text-xs font-bold text-slate-500 uppercase tracking-wider">Date Sold</th>
                <th className="py-4 px-6 text-xs font-bold text-slate-500 uppercase tracking-wider">Vehicle</th>
                <th className="py-4 px-6 text-xs font-bold text-slate-500 uppercase tracking-wider">Total Cost</th>
                <th className="py-4 px-6 text-xs font-bold text-slate-500 uppercase tracking-wider">Sale Price</th>
                <th className="py-4 px-6 text-xs font-bold text-slate-500 uppercase tracking-wider">Gross Profit</th>
                <th className="py-4 px-6 text-xs font-bold text-slate-500 uppercase tracking-wider">Partner Split</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {soldVehicles.map(car => {
                const totalExp = car.expenses.reduce((sum, e) => sum + Number(e.amount), 0);
                const cost = Number(car.purchasePrice) + totalExp;
                const hasPartner = car.partnerships && car.partnerships.length > 0;

                return (
                  <tr key={car.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="py-4 px-6 whitespace-nowrap text-sm text-slate-600">
                      {car.saleDate ? new Date(car.saleDate).toLocaleDateString('en-GB') : '-'}
                    </td>
                    <td className="py-4 px-6 font-bold text-primary">
                      {car.make} {car.model}
                      <span className="ml-2 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-slate-500 bg-slate-100 border border-slate-200 rounded-sm">
                        {car.registration || 'UNREG'}
                      </span>
                    </td>
                    <td className="py-4 px-6 text-sm text-slate-700 font-medium">₹{cost.toLocaleString('en-IN')}</td>
                    <td className="py-4 px-6 text-sm font-bold text-slate-900">₹{Number(car.salePrice).toLocaleString('en-IN')}</td>
                    <td className="py-4 px-6 text-sm font-bold text-blue-500">₹{Number(car.profit).toLocaleString('en-IN')}</td>
                    <td className="py-4 px-6 text-sm">
                      {hasPartner ? (
                        <div className="flex flex-col gap-1">
                          {car.partnerships.map(p => (
                            <div key={p.id} className="text-xs">
                              <span className="font-bold text-purple-500">{p.partnerAccount.name}</span>
                              <span className="text-slate-500 ml-1">({p.profitSharePercentage}%):</span>
                              <span className="font-bold text-red-500 ml-1">
                                -₹{(Number(car.profit) * (Number(p.profitSharePercentage) / 100)).toLocaleString('en-IN')}
                              </span>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <span className="text-slate-400 font-medium text-xs uppercase tracking-wider">No Partner</span>
                      )}
                    </td>
                  </tr>
                );
              })}
              {soldVehicles.length === 0 && (
                <tr>
                  <td colSpan="6" className="py-12 text-center text-slate-500 font-medium text-sm">
                    No vehicles sold yet. Start selling to see profits!
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
