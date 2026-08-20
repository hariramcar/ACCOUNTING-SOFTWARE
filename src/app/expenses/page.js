import { getRecentExpenses, addExpense, getPendingExpenses, addTransfer, deleteExpense, updateExpense } from '@/actions/expenses';
import { getAccountBalances } from '@/actions/accounts';
import { getHistoricalCashBalances } from '@/actions/rojmel';
import { sellVehicle } from '@/actions/inventory';
import prisma from '@/lib/prisma';
import ExpenseForm from './ExpenseForm';
import PendingApprovalsModal from './PendingApprovalsModal';
import MobileExpenseModal from './MobileExpenseModal';
import DateSelector from './DateSelector';
import TransactionActions from './TransactionActions';
import { Receipt, Building2, Car, Wallet } from 'lucide-react';
import { getSession } from '@/lib/session';
import DiaryPad from '../components/DiaryPad';

export default async function ExpensesPage({ searchParams }) {
  const session = await getSession();
  const isAdmin = session?.role === 'ADMIN';

  const awaitedParams = await searchParams;
  let defaultDateStr = '';
  if (!awaitedParams?.date) {
    const d = new Date();
    d.setUTCHours(d.getUTCHours() + 5);
    d.setUTCMinutes(d.getUTCMinutes() + 30);
    const year = d.getUTCFullYear();
    const month = String(d.getUTCMonth() + 1).padStart(2, '0');
    const day = String(d.getUTCDate()).padStart(2, '0');
    defaultDateStr = `${year}-${month}-${day}`;
  }
  const targetDate = awaitedParams?.date || defaultDateStr;

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
    // STAFF logic: get their specific account balance and diary note
    const dbUser = await prisma.user.findUnique({ 
      where: { id: session?.userId }, 
      select: { accountId: true, diaryNote: true } 
    });
    staffWallet = { balance: 0, spent: 0, diaryNote: dbUser?.diaryNote || '' };
    if (dbUser?.accountId) {
      const acc = accounts.find(a => a.id === dbUser.accountId);
      if (acc) {
        // Calculate total spent by staff (approved + pending expenses submitted by them)
        const totalSpent = expenses.reduce((sum, exp) => {
          let staffSplitsSum = 0;
          try {
            if (exp.requestedMode && exp.requestedMode.startsWith('{')) {
              const parsed = JSON.parse(exp.requestedMode);
              if (parsed.payments && parsed.payments.length > 0) {
                staffSplitsSum = parsed.payments
                  .filter(p => p.mode === 'CASH' || p.mode === 'BANK')
                  .reduce((acc, p) => acc + Number(p.amount || 0), 0);
                return sum + staffSplitsSum;
              }
            } else if (exp.requestedMode === 'CASH' || exp.requestedMode === 'BANK') {
               return sum + Number(exp.amount);
            }
          } catch(e) {}
          return sum + Number(exp.amount);
        }, 0);
        
        // Calculate breakdown of Cash vs Bank Upad
        const staffTxs = await prisma.transaction.findMany({
          where: { accountId: dbUser.accountId }
        });
        
        let cashBalance = Number(acc.openingBalance || 0) * -1;
        let bankBalance = 0;
        
        staffTxs.forEach(t => {
          if (t.category !== 'SALARY') {
            const isDebtIncrease = t.type === 'DEBIT'; // advance received
            const isDebtDecrease = t.type === 'CREDIT'; // expense spent
            
            if (t.transactionMode === 'CASH') {
              if (isDebtIncrease) cashBalance += Number(t.amount);
              else if (isDebtDecrease) cashBalance -= Number(t.amount);
            } else if (t.transactionMode === 'BANK') {
              if (isDebtIncrease) bankBalance += Number(t.amount);
              else if (isDebtDecrease) bankBalance -= Number(t.amount);
            }
          }
        });
        
        staffWallet = {
          balance: Number(acc.currentBalance || 0) * -1,
          cashBalance: Math.max(0, cashBalance),
          bankBalance: Math.max(0, bankBalance),
          spent: totalSpent,
          diaryNote: dbUser?.diaryNote || ''
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
      expenses: { select: { amount: true } },
      tokens: { 
        where: { status: 'ACTIVE' },
        select: { id: true, amount: true, customerName: true }
      }
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
      totalCost,
      tokens: v.tokens.map(t => ({
        id: t.id,
        amount: Number(t.amount),
        customerName: t.customerName
      }))
    };
  });

  return (
    <div className="w-full max-w-7xl mx-auto px-4 pt-1 md:p-8 flex flex-col gap-4 md:gap-8 text-slate-900 pb-24 md:pb-8">
      <div className="flex flex-col lg:flex-row lg:justify-between items-start lg:items-end gap-3 md:gap-4 border-b border-slate-200 pb-3 md:pb-5 mb-1 md:mb-6 sticky top-0 bg-slate-50/90 backdrop-blur-xl z-30 pt-1 md:pt-0 -mx-4 px-4 md:mx-0 md:px-0">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <div className="w-8 h-8 md:w-10 md:h-10 bg-indigo-50 text-indigo-600 rounded-lg flex items-center justify-center border border-indigo-100">
              <Receipt size={18} className="md:w-5 md:h-5" />
            </div>
            <h1 className="text-xl md:text-3xl font-semibold tracking-tight text-slate-900 m-0">Daily Transaction</h1>
          </div>
          <p className="text-xs md:text-sm text-slate-500 m-0 font-medium ml-0 md:ml-13 mt-1.5 md:mt-0">Rapid data entry for month-end vendor bills and office costs.</p>
        </div>

        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 w-full lg:w-auto">
          <div className="flex items-center gap-3 w-full sm:w-auto flex-shrink-0">
            <div className="flex-1 sm:flex-none">
              <DateSelector defaultDate={targetDate} />
            </div>

            {/* Mobile + New Button */}
            <MobileExpenseModal
              vehicles={vehicles}
              accounts={accounts || []}
              addExpenseAction={addExpense}
              addTransferAction={addTransfer}
              sellVehicleAction={sellVehicle}
              isAdmin={isAdmin}
              staffWallet={staffWallet}
            />

            {isAdmin && (
              <PendingApprovalsModal pendingExpenses={pendingExpenses} accounts={accounts} />
            )}
          </div>

          {isAdmin && (
            <div className="flex bg-slate-50 border border-slate-200 rounded-xl p-3 shadow-sm w-full sm:w-auto overflow-hidden">
              <div className="pr-4 border-r border-slate-200 flex-1 sm:flex-none">
                <div className="text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-0.5 truncate">Opening Cash</div>
                <div className="text-lg font-black text-slate-700">₹{openingCash.toLocaleString('en-IN')}</div>
              </div>
              <div className="pl-4 flex-1 sm:flex-none">
                <div className="text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-0.5 truncate">Closing Cash</div>
                <div className="text-lg font-black text-emerald-600">₹{closingCash.toLocaleString('en-IN')}</div>
              </div>
            </div>
          )}

          {!isAdmin && staffWallet && (
            <div className="flex bg-indigo-900 border border-indigo-800 rounded-xl p-3 shadow-md w-full sm:w-auto flex-wrap gap-y-3">
              <div className="pr-4 border-r border-indigo-700/50 flex-1 sm:flex-none">
                <div className="text-[10px] font-bold uppercase tracking-wider text-indigo-300 mb-0.5 truncate">Cash Available</div>
                <div className="text-lg font-black text-emerald-300">₹{staffWallet.cashBalance.toLocaleString('en-IN')}</div>
              </div>
              <div className="px-4 border-r border-indigo-700/50 flex-1 sm:flex-none">
                <div className="text-[10px] font-bold uppercase tracking-wider text-indigo-300 mb-0.5 truncate">Bank Available</div>
                <div className="text-lg font-black text-emerald-300">₹{staffWallet.bankBalance.toLocaleString('en-IN')}</div>
              </div>
              <div className="pl-4 flex-1 sm:flex-none">
                <div className="text-[10px] font-bold uppercase tracking-wider text-indigo-300 mb-0.5 truncate">Total Spent Today</div>
                <div className="text-lg font-black text-white">₹{staffWallet.spent.toLocaleString('en-IN')}</div>
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 md:gap-8">
        {/* ADD EXPENSE FORM (CLIENT COMPONENT - HIDDEN ON MOBILE) */}
        <div className="hidden lg:block lg:col-span-1">
          <ExpenseForm vehicles={vehicles} accounts={accounts || []} addExpenseAction={addExpense} addTransferAction={addTransfer} sellVehicleAction={sellVehicle} isAdmin={isAdmin} staffWallet={staffWallet} />
        </div>

        {/* EXPENSES LEDGER */}
        <div className="lg:col-span-2 order-2 lg:order-2 flex flex-col gap-3">
          {!isAdmin && <DiaryPad initialNote={staffWallet?.diaryNote || ''} />}
          <h2 className="border-b border-slate-200 pb-3 mb-3 text-lg font-bold text-slate-900">Recent Transactions Ledger</h2>

          {(() => {
            const renderPaymentSource = (source) => {
              if (!source) return null;
              try {
                if (typeof source === 'string' && source.startsWith('{') && source.includes('"payments"')) {
                  const parsed = JSON.parse(source);
                  if (parsed.payments && Array.isArray(parsed.payments)) {
                    return (
                      <div className="flex flex-wrap gap-1">
                        {parsed.payments.map((p, i) => {
                          const accName = accounts?.find(a => a.id === p.accountId)?.name || p.mode;
                          const displayName = accName === 'UGHRANI' ? 'MARKET PLACE' : accName;
                          return (
                            <span key={i} className="bg-slate-100 border border-slate-200 text-slate-600 px-1.5 py-0.5 rounded font-bold uppercase tracking-wider text-[9px] whitespace-nowrap inline-flex items-center gap-1">
                              {displayName} {parsed.payments.length > 1 && <span className="opacity-70">(₹{Number(p.amount || 0).toLocaleString('en-IN')})</span>}
                            </span>
                          );
                        })}
                      </div>
                    );
                  }
                }
              } catch(e) {
                console.error('Error parsing payment source:', e);
              }
              
              const displayName = source === 'UGHRANI' ? 'MARKET PLACE' : source;
              return (
                <span className="bg-slate-100 border border-slate-200 text-slate-600 px-1.5 py-0.5 rounded font-bold uppercase tracking-wider text-[9px] whitespace-nowrap">
                  {displayName}
                </span>
              );
            };

            if (!expenses || expenses.length === 0) return null;

            const grouped = expenses.reduce((acc, exp) => {
              const dateStr = new Date(exp.date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
              if (!acc[dateStr]) acc[dateStr] = [];
              acc[dateStr].push(exp);
              return acc;
            }, {});

            return Object.entries(grouped).map(([dateStr, exps]) => (
              <div key={dateStr} className="mb-6">
                <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3 px-2 md:px-0">{dateStr}</h3>

                {/* Mobile Cards */}
                <div className="flex flex-col gap-3 md:hidden">
                  {exps.map(exp => (
                    <div key={exp.id} className="bg-white rounded-xl p-3 flex flex-col shadow-sm border border-slate-200 interactive-card gap-2 md:hidden">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-start gap-2.5">
                          <div className={`mt-0.5 p-1.5 rounded-lg border flex-shrink-0 ${exp.expenseType === 'INCOME' ? 'bg-emerald-50 text-emerald-500 border-emerald-100' :
                            exp.expenseType === 'ADVANCE' ? 'bg-blue-50 text-blue-500 border-blue-100' :
                              exp.expenseType === 'OFFICE_EXPENSE' ? 'bg-red-50 text-red-500 border-red-100' : 'bg-indigo-50 text-indigo-500 border-indigo-100'
                            }`}>
                            {exp.expenseType === 'INCOME' ? <Wallet size={14} /> :
                              exp.expenseType === 'ADVANCE' ? <Wallet size={14} /> :
                                exp.expenseType === 'OFFICE_EXPENSE' ? <Building2 size={14} /> : <Car size={14} />}
                          </div>
                          <div className="flex flex-col">
                            <span className="text-[13px] font-bold text-slate-900 leading-tight">{exp.description}</span>
                            {exp.vehicle && (
                              <span className="text-[10px] font-medium text-slate-500 mt-0.5">
                                Linked to: <span className="font-bold text-slate-700">{exp.vehicle.make} {exp.vehicle.model} ({exp.vehicle.registration})</span>
                              </span>
                            )}
                          </div>
                        </div>
                        <div className={`font-black text-[15px] whitespace-nowrap ${exp.expenseType === 'INCOME' ? 'text-emerald-600' :
                          exp.expenseType === 'OFFICE_EXPENSE' ? 'text-red-600' : 'text-indigo-600'
                          }`}>
                          {exp.expenseType === 'INCOME' ? '+' : '-'}₹{Number(exp.amount).toLocaleString('en-IN')}
                        </div>
                      </div>

                      <div className="border-t border-slate-100 pt-2 flex items-center justify-between gap-2 mt-0.5">
                        {exp.status && (
                          <div className="text-[9px] font-bold uppercase tracking-wider text-slate-500 flex flex-wrap items-center gap-x-2 gap-y-1">
                            <div>
                              Status: <span className={
                                exp.status === 'APPROVED' ? 'text-emerald-600' :
                                  exp.status === 'PENDING' ? 'text-amber-500' : 'text-red-500'
                              }>{exp.status}</span>
                            </div>
                            <div className="w-1 h-1 rounded-full bg-slate-300 hidden sm:block"></div>
                            {exp.recipient && (
                              <div className="flex items-center gap-1 text-slate-700 font-bold capitalize">
                                {exp.recipient}
                              </div>
                            )}
                            <div className="flex items-center gap-1">
                              <Wallet size={10} className="text-slate-400" />
                              {renderPaymentSource(exp.paymentSource)}
                            </div>
                          </div>
                        )}
                        {isAdmin && (
                          <div className="flex justify-end shrink-0">
                            <TransactionActions
                              expense={exp}
                              deleteExpenseAction={deleteExpense}
                              updateExpenseAction={updateExpense}
                              isRawTx={exp.isRawTx}
                              accounts={accounts || []}
                              vehicles={vehicles || []}
                            />
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>

                {/* Desktop Table */}
                <div className="hidden md:block w-full overflow-hidden bg-white border border-slate-200 rounded-xl shadow-sm">
                  <table className="w-full text-left border-collapse">
                    <tbody className="divide-y divide-slate-100">
                      {exps.map(exp => (
                        <tr key={exp.id} className="hover:bg-slate-50/80 transition-colors group">
                          <td className="py-4 px-5">
                            <div className="flex items-center gap-4">
                              <div className={`p-2 rounded-lg border ${exp.expenseType === 'INCOME' ? 'bg-emerald-50 text-emerald-500 border-emerald-100' :
                                exp.expenseType === 'ADVANCE' ? 'bg-blue-50 text-blue-500 border-blue-100' :
                                  exp.expenseType === 'OFFICE_EXPENSE' ? 'bg-red-50 text-red-500 border-red-100' : 'bg-indigo-50 text-indigo-500 border-indigo-100'
                                }`}>
                                {exp.expenseType === 'INCOME' ? <Wallet size={18} /> :
                                  exp.expenseType === 'ADVANCE' ? <Wallet size={18} /> :
                                    exp.expenseType === 'OFFICE_EXPENSE' ? <Building2 size={18} /> : <Car size={18} />}
                              </div>
                              <div className="flex flex-col">
                                <span className="text-[15px] font-bold text-slate-900">{exp.description}</span>
                                {exp.vehicle && (
                                  <span className="text-[12px] font-medium text-slate-500">
                                    Linked to: <span className="font-bold text-slate-700">{exp.vehicle.make} {exp.vehicle.model} ({exp.vehicle.registration})</span>
                                  </span>
                                )}
                              </div>
                            </div>
                          </td>
                          <td className="py-4 px-5 hidden lg:table-cell">
                            {exp.status && (
                              <div className="text-[10px] font-bold uppercase tracking-wider text-slate-500 flex flex-col gap-1">
                                <div>
                                  Status: <span className={
                                    exp.status === 'APPROVED' ? 'text-emerald-600' :
                                      exp.status === 'PENDING' ? 'text-amber-500' : 'text-red-500'
                                  }>{exp.status}</span>
                                </div>
                              </div>
                            )}
                          </td>
                          <td className="py-4 px-5 hidden sm:table-cell">
                            {exp.paymentSource && (
                              <div className="flex items-center gap-1.5 text-xs font-bold text-slate-600 uppercase tracking-wider">
                                <Wallet size={14} className="text-slate-400" />
                                {renderPaymentSource(exp.paymentSource)}
                              </div>
                            )}
                          </td>
                          <td className="py-4 px-5 text-right w-40">
                            <div className={`font-black text-lg whitespace-nowrap ${exp.expenseType === 'INCOME' ? 'text-emerald-600' :
                              exp.expenseType === 'OFFICE_EXPENSE' ? 'text-red-600' : 'text-indigo-600'
                              }`}>
                              {exp.expenseType === 'INCOME' ? '+' : '-'}₹{Number(exp.amount).toLocaleString('en-IN')}
                            </div>
                          </td>
                          <td className="py-4 px-5 text-right w-24">
                            {isAdmin && (
                              <div className="flex justify-end opacity-0 group-hover:opacity-100 transition-opacity">
                                <TransactionActions
                                  expense={exp}
                                  deleteExpenseAction={deleteExpense}
                                  updateExpenseAction={updateExpense}
                                  isRawTx={exp.isRawTx}
                                  accounts={accounts || []}
                                  vehicles={vehicles || []}
                                />
                              </div>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
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
