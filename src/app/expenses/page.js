import { getRecentExpenses, addExpense, getPendingExpenses, addTransfer, deleteExpense, updateExpense } from '@/actions/expenses';
import { getAccountBalances } from '@/actions/accounts';
import { getHistoricalCashBalances } from '@/actions/rojmel';
import { sellVehicle } from '@/actions/inventory';
import prisma from '@/lib/prisma';
import ExpenseForm from './ExpenseForm';
import PendingApprovalsModal from './PendingApprovalsModal';
import DateSelector from './DateSelector';
import TransactionActions from './TransactionActions';
import { Receipt, Building2, Car, Wallet } from 'lucide-react';
import { getSession } from '@/lib/session';

export default async function ExpensesPage({ searchParams }) {
  const session = await getSession();
  const isAdmin = session?.role === 'ADMIN';
  
  const awaitedParams = await searchParams;
  const targetDate = awaitedParams?.date || new Date().toISOString().split('T')[0];

  const { expenses } = await getRecentExpenses(targetDate);
  const { accounts } = await getAccountBalances();
  
  // Calculate exact historical Opening/Closing Cash for the selected date
  const { openingCash, closingCash } = await getHistoricalCashBalances(targetDate);
  
  let pendingExpenses = [];
  let staffWallet = null;

  if (isAdmin) {
    const res = await getPendingExpenses();
    if (res.success) pendingExpenses = res.expenses;
  } else {
    // STAFF logic: get their specific account balance
    const dbUser = await prisma.user.findUnique({ where: { id: session?.userId }, select: { accountId: true } });
    if (dbUser?.accountId) {
      const acc = accounts.find(a => a.id === dbUser.accountId);
      if (acc) {
        // Calculate total spent by staff (approved + pending expenses submitted by them)
        const totalSpent = expenses.reduce((sum, exp) => sum + Number(exp.amount), 0);
        staffWallet = {
          balance: Number(acc.currentBalance || 0) * -1,
          spent: totalSpent
        };
      }
    }
  }
  
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

  return (
    <div className="w-full max-w-7xl mx-auto p-8 flex flex-col gap-8 text-slate-900">
      <div className="flex flex-col md:flex-row md:justify-between items-start md:items-end gap-4 border-b border-slate-200 pb-5">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <div className="w-10 h-10 bg-indigo-50 text-indigo-600 rounded-lg flex items-center justify-center border border-indigo-100">
              <Receipt size={20} />
            </div>
            <h1 className="text-3xl font-semibold tracking-tight text-slate-900">Daily Transaction</h1>
          </div>
          <p className="text-slate-500 m-0 font-medium ml-13">Rapid data entry for month-end vendor bills and office costs.</p>
        </div>
        
        <div className="flex items-center gap-4">
          <DateSelector defaultDate={targetDate} />
          
          {isAdmin && (
            <div className="flex bg-slate-50 border border-slate-200 rounded-xl p-3 shadow-sm">
              <div className="pr-4 border-r border-slate-200">
                <div className="text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-0.5">Opening Cash</div>
                <div className="text-lg font-black text-slate-700">₹{openingCash.toLocaleString('en-IN')}</div>
              </div>
              <div className="pl-4">
                <div className="text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-0.5">Closing Cash</div>
                <div className="text-lg font-black text-emerald-600">₹{closingCash.toLocaleString('en-IN')}</div>
              </div>
            </div>
          )}

          {!isAdmin && staffWallet && (
            <div className="flex bg-indigo-900 border border-indigo-800 rounded-xl p-3 shadow-md">
              <div className="pr-4 border-r border-indigo-700/50">
                <div className="text-[10px] font-bold uppercase tracking-wider text-indigo-300 mb-0.5">My Wallet Balance</div>
                <div className="text-xl font-black text-white">₹{staffWallet.balance.toLocaleString('en-IN')}</div>
              </div>
              <div className="pl-4">
                <div className="text-[10px] font-bold uppercase tracking-wider text-indigo-300 mb-0.5">Total Spent</div>
                <div className="text-xl font-black text-emerald-400">₹{staffWallet.spent.toLocaleString('en-IN')}</div>
              </div>
            </div>
          )}
          
          {isAdmin && (
            <div>
              <PendingApprovalsModal pendingExpenses={pendingExpenses} />
            </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* ADD EXPENSE FORM (CLIENT COMPONENT) */}
        <div className="lg:col-span-1">
          <ExpenseForm vehicles={vehicles} accounts={accounts || []} addExpenseAction={addExpense} addTransferAction={addTransfer} sellVehicleAction={sellVehicle} isAdmin={isAdmin} />
        </div>

        {/* EXPENSES LEDGER */}
        <div className="lg:col-span-2 flex flex-col gap-3">
          <h2 className="border-b border-slate-200 pb-3 mb-3 text-lg font-bold text-slate-900">Recent Transactions Ledger</h2>
          
          {(() => {
            if (!expenses || expenses.length === 0) return null;
            
            const grouped = expenses.reduce((acc, exp) => {
              const dateStr = new Date(exp.date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
              if (!acc[dateStr]) acc[dateStr] = [];
              acc[dateStr].push(exp);
              return acc;
            }, {});

            return Object.entries(grouped).map(([dateStr, exps]) => (
              <div key={dateStr} className="mb-4">

                <div className="flex flex-col gap-3">
                  {exps.map(exp => (
                    <div key={exp.id} className="bg-white rounded-xl p-5 flex justify-between items-center shadow-sm border border-slate-200 hover:shadow-md transition-shadow group">
                      <div className="flex items-start gap-4">
                        <div className={`mt-0.5 p-2 rounded-lg border ${
                          exp.expenseType === 'INCOME' ? 'bg-emerald-50 text-emerald-500 border-emerald-100' :
                          exp.expenseType === 'ADVANCE' ? 'bg-blue-50 text-blue-500 border-blue-100' :
                          exp.expenseType === 'OFFICE_EXPENSE' ? 'bg-red-50 text-red-500 border-red-100' : 'bg-indigo-50 text-indigo-500 border-indigo-100'
                        }`}>
                          {exp.expenseType === 'INCOME' ? <Wallet size={18} /> : 
                           exp.expenseType === 'ADVANCE' ? <Wallet size={18} /> : 
                           exp.expenseType === 'OFFICE_EXPENSE' ? <Building2 size={18} /> : <Car size={18} />}
                        </div>
                        <div>
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-[15px] font-medium text-slate-900">{exp.description}</span>
                          </div>
                          {exp.vehicle && (
                            <div className="text-xs font-medium text-slate-500 mb-1">
                              Linked to: <span className="font-bold text-slate-700">{exp.vehicle.make} {exp.vehicle.model}</span> <span className="uppercase tracking-wider">({exp.vehicle.registration || 'UNREGISTERED'})</span>
                            </div>
                          )}
                          {exp.status && (
                            <div className="text-[10px] font-bold uppercase tracking-wider mb-1 text-slate-500 flex items-center gap-2">
                              <div>
                                Status: <span className={
                                  exp.status === 'APPROVED' ? 'text-emerald-600' : 
                                  exp.status === 'PENDING' ? 'text-amber-500' : 'text-red-500'
                                }>{exp.status}</span>
                                {exp.transferDetails && (
                                  <span className="text-blue-600 ml-1">({exp.transferDetails})</span>
                                )}
                              </div>
                              <div className="w-1 h-1 rounded-full bg-slate-300"></div>
                              {exp.recipient && (
                                <>
                                  <div className="flex items-center gap-1 text-slate-700 font-bold capitalize">
                                    {exp.recipient}
                                  </div>
                                  <div className="w-1 h-1 rounded-full bg-slate-300"></div>
                                </>
                              )}
                              <div className="flex items-center gap-1 text-slate-500">
                                <Wallet size={12} />
                                {exp.paymentSource}
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-6">
                        <div className={`font-bold text-xl tracking-tight ${
                          exp.expenseType === 'INCOME' ? 'text-emerald-600' :
                          exp.expenseType === 'OFFICE_EXPENSE' ? 'text-red-600' : 'text-indigo-600'
                        }`}>
                          {exp.expenseType === 'INCOME' ? '+' : '-'}₹{Number(exp.amount).toLocaleString('en-IN')}
                        </div>
                        
                        {/* Show Edit/Delete for all transactions */}
                        {isAdmin && (
                          <TransactionActions 
                            expense={exp} 
                            deleteExpenseAction={deleteExpense} 
                            updateExpenseAction={updateExpense} 
                            isRawTx={exp.isRawTx}
                          />
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ));
          })()}

          {(!expenses || expenses.length === 0) && (
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-12 flex flex-col items-center justify-center text-center">
              <Receipt size={32} className="text-slate-300 mb-3" />
              <h3 className="text-slate-600 font-bold m-0 mb-1">No expenses recorded</h3>
              <p className="text-slate-500 text-sm m-0">Add a new expense using the form to get started.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
