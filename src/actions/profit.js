'use server';

import prisma from '@/lib/prisma';
import { getAllExpenses, getAllIncome } from './history';
import { checkSufficientBalance } from '@/lib/balanceCheck';
import { getSession } from '@/lib/session';

export async function getMonthlyProfitData(year, monthIndex) {
  try {
    // Generate start and end dates for the selected month
    let startDate = new Date(year, monthIndex, 1);
    let endDate = new Date(year, monthIndex + 1, 0, 23, 59, 59, 999);
    
    if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
      const d = new Date();
      startDate = new Date(d.getFullYear(), d.getMonth(), 1);
      endDate = new Date(d.getFullYear(), d.getMonth() + 1, 0, 23, 59, 59, 999);
      year = d.getFullYear();
      monthIndex = d.getMonth();
    }

    // 1. Fetch Sold Vehicles for the month
    const soldVehicles = await prisma.vehicle.findMany({
      where: {
        status: 'SOLD',
        saleDate: {
          gte: startDate.toISOString(),
          lte: endDate.toISOString()
        }
      },
      include: {
        partnerships: {
          include: {
            partnerAccount: true
          }
        },
        expenses: true
      },
      orderBy: {
        saleDate: 'desc'
      }
    });

    // 2. Fetch Office Expenses for the month
    const officeExpenses = await prisma.expense.findMany({
      where: {
        expenseType: 'OFFICE_EXPENSE',
        date: {
          gte: startDate.toISOString(),
          lte: endDate.toISOString()
        }
      },
      orderBy: {
        date: 'desc'
      }
    });

    // 3. Fetch Car Expenses for the month
    const carExpenses = await prisma.expense.findMany({
      where: {
        expenseType: 'CAR_EXPENSE',
        date: {
          gte: startDate.toISOString(),
          lte: endDate.toISOString()
        }
      }
    });

    // 4. Fetch In-Stock Vehicles
    const inStockVehicles = await prisma.vehicle.findMany({
      where: { status: 'IN_STOCK' },
      include: {
        expenses: true,
        partnerships: true
      }
    });
    const inStockCount = inStockVehicles.length;
    const inStockValue = inStockVehicles.reduce((sum, v) => {
      const totalExpenses = v.expenses?.reduce((expSum, exp) => expSum + Number(exp.amount || 0), 0) || 0;
      const legacyExp = Number(v.legacyExpenses || 0);
      const totalCost = Number(v.purchasePrice || 0) + totalExpenses + legacyExp;
      const partnerInvestment = v.partnerships?.reduce((pSum, p) => pSum + Number(p.investmentAmount || 0), 0) || 0;
      const firmPending = Number(v.purchasePendingBalance || 0);
      return sum + Math.max(0, totalCost - partnerInvestment - firmPending);
    }, 0);

    // 5. Process calculations
    let totalGrossProfit = 0;
    let totalPartnerDeductions = 0;

    const processedVehicles = soldVehicles.map(v => {
      // carProfit is the Net Profit for this specific car (Sale - Cost - Repairs)
      const carProfit = Number(v.profit || 0);
      
      // We calculate the Gross Profit (Sale - Purchase) for Ledger / UI purposes
      const carGrossProfit = Number(v.salePrice || 0) - Number(v.purchasePrice || 0);
      totalGrossProfit += carGrossProfit;

      // Calculate Partner Share for this car (usually based on Net Profit)
      let carPartnerShare = 0;
      if (v.partnerships && v.partnerships.length > 0) {
        v.partnerships.forEach(p => {
          const share = carProfit * (Number(p.profitSharePercentage) / 100);
          if (share > 0) {
            carPartnerShare += share;
          }
        });
      }
      totalPartnerDeductions += carPartnerShare;

      return {
        ...v,
        purchasePrice: Number(v.purchasePrice),
        salePrice: Number(v.salePrice),
        purchasePendingBalance: Number(v.purchasePendingBalance),
        salePendingBalance: Number(v.salePendingBalance || 0),
        legacyExpenses: Number(v.legacyExpenses || 0),
        profit: carProfit,
        partnerShare: carPartnerShare,
        netOurProfit: carProfit - carPartnerShare,
        expenses: v.expenses?.map(e => ({
          ...e,
          amount: Number(e.amount)
        })) || [],
        partnerships: v.partnerships?.map(p => ({
          ...p,
          investmentAmount: Number(p.investmentAmount),
          profitSharePercentage: Number(p.profitSharePercentage),
          paidAmount: Number(p.paidAmount || 0),
          partnerAccount: p.partnerAccount ? {
            ...p.partnerAccount,
            openingBalance: Number(p.partnerAccount.openingBalance),
            profitShare: Number(p.partnerAccount.profitShare || 0)
          } : undefined
        })) || []
      };
    });

    const processedOfficeExpenses = officeExpenses.map(exp => ({
      id: exp.id,
      description: exp.description,
      amount: Number(exp.amount),
      date: exp.date
    }));

    const { expenses: ledgerExpenses } = await getAllExpenses(year, monthIndex);
    const { income: ledgerIncome } = await getAllIncome(year, monthIndex);

    // Pure Cash-Basis Calculations for Dashboard
    let totalOfficeExpenseAmount = 0;
    let totalCarExpenseAmount = 0;
    let totalAdvanceAmount = 0;

    const { calculateCashBasisExpense, calculateCashBasisIncome } = require('@/lib/cashBasis');
    const allAccounts = await prisma.account.findMany();

    const totalLedgerExpenses = ledgerExpenses?.reduce((sum, exp) => {
      const cashBasisAmount = calculateCashBasisExpense(exp, allAccounts);
      if (cashBasisAmount <= 0) return sum;

      const isAdvance = (exp.rawCategory === 'UPAD_WITHDRAWAL' || exp.rawCategory === 'UPAD_REPAYMENT' || exp.rawCategory === 'SALARY');
      
      if (isAdvance) {
        totalAdvanceAmount += cashBasisAmount;
      } else if (exp.expenseType === 'OFFICE_EXPENSE') {
        totalOfficeExpenseAmount += cashBasisAmount;
      } else if (exp.expenseType === 'CAR_EXPENSE') {
        totalCarExpenseAmount += cashBasisAmount;
      } else {
        totalOfficeExpenseAmount += cashBasisAmount; // Fallback
      }

      return sum + cashBasisAmount;
    }, 0) || 0;

    // Net Profit is Gross Profit minus ALL expenses for the month
    const netProfit = totalGrossProfit - totalOfficeExpenseAmount - totalCarExpenseAmount - totalAdvanceAmount;

    const rawOperatingIncome = ledgerIncome?.reduce((sum, inc) => {
      return sum + calculateCashBasisIncome(inc, allAccounts);
    }, 0) || 0;
    
    const totalLedgerIncome = rawOperatingIncome + Math.max(0, totalGrossProfit - totalPartnerDeductions);

    // Pure accrual for Founders Distribution
    const pureOperatingIncome = ledgerIncome?.reduce((sum, inc) => {
      if (inc.rawCategory === 'VEHICLE_SALE') return sum;
      if (inc.rawCategory === 'CAPITAL_INJECTION') return sum; // Exclude
      if (inc.description === 'Opening Balance' || inc.description === 'Capital Introduced / Opening Balance') return sum; // Exclude
      if (inc.description?.startsWith('Token Received:') && !inc.isForfeitedToken) return sum;
      if (inc.description?.startsWith('Income: Received from')) return sum;
      if (inc.description?.startsWith('Auto-Entry: Received Pending Capital')) return sum;
      if (inc.description?.startsWith('Auto-Entry: Paid Pending Udhari')) return sum;
      if (inc.description?.startsWith('Auto-Entry: Partnership Capital Investment')) return sum;
      return sum + (!inc.isTransfer ? Number(inc.amount) : 0);
    }, 0) || 0;
    
    const pureTotalLedgerIncome = pureOperatingIncome + Math.max(0, totalGrossProfit - totalPartnerDeductions);
    const founderNetProfit = pureTotalLedgerIncome - totalLedgerExpenses;

    return {
      success: true,
      data: {
        totalGrossProfit,
        totalPartnerDeductions,
        netCarProfit: totalGrossProfit - totalPartnerDeductions,
        totalOfficeExpenseAmount,
        totalCarExpenseAmount,
        totalAdvanceAmount,
        netProfit,
        inStockCount,
        inStockValue,
        soldCount: soldVehicles.length,
        totalLedgerIncome,
        totalLedgerExpenses,
        founderNetProfit,
        vehicles: processedVehicles,
        officeExpenses: processedOfficeExpenses
      }
    };
  } catch (error) {
    console.error('Failed to get monthly profit data:', error);
    return { success: false, error: 'Failed to calculate profit data.' };
  }
}

export async function getPendingPayables() {
  try {
    const pendingVehicles = await prisma.vehicle.findMany({
      where: {
        purchasePendingBalance: { gt: 0 },
        OR: [
          { payableAccountId: null },
          { payableAccount: { type: { notIn: ['FINANCIER', 'DSA_AGENT', 'PARTNER', 'STAFF'] } } }
        ]
      },
      include: {
        payableAccount: true
      },
      orderBy: {
        purchaseDate: 'desc'
      }
    });

    const pendingReceivablesVehicles = await prisma.vehicle.findMany({
      where: {
        salePendingBalance: { gt: 0 },
        status: 'SOLD',
        OR: [
          { receivableAccountId: null },
          { receivableAccount: { type: { notIn: ['FINANCIER', 'DSA_AGENT', 'PARTNER', 'STAFF'] } } }
        ]
      },
      include: {
        receivableAccount: true
      },
      orderBy: {
        saleDate: 'desc'
      }
    });

    // Serialize
    const payables = pendingVehicles.map(v => ({
      id: v.id,
      make: v.make,
      model: v.model,
      registration: v.registration,
      purchaseDate: v.purchaseDate,
      pendingBalance: Number(v.purchasePendingBalance),
      payableAccountId: v.payableAccountId,
      payableAccountName: v.payableAccount?.name || 'Unknown Account',
      payableAccountType: v.payableAccount?.type || 'UNKNOWN'
    }));

    const receivables = pendingReceivablesVehicles.map(v => ({
      id: v.id,
      make: v.make,
      model: v.model,
      registration: v.registration,
      saleDate: v.saleDate,
      pendingBalance: Number(v.salePendingBalance),
      receivableAccountId: v.receivableAccountId,
      receivableAccountName: v.receivableAccount?.name || 'Unknown Agent/Buyer',
      receivableAccountType: v.receivableAccount?.type || 'UNKNOWN'
    }));

    // Fetch cash/bank accounts for payment dropdown
    const accountsRaw = await prisma.account.findMany({
      where: {
        type: {
          in: ['CASH', 'BANK']
        }
      },
      orderBy: { name: 'asc' }
    });

    const accounts = accountsRaw.map(acc => ({
      ...acc,
      openingBalance: Number(acc.openingBalance),
      profitShare: Number(acc.profitShare || 0)
    }));

    return { success: true, payables, receivables, accounts };
  } catch (error) {
    console.error('Failed to get pending payables:', error);
    return { success: false, error: 'Failed to load pending payables.' };
  }
}

export async function payPendingBalance(formData) {
  try {
    const vehicleId = formData.get('vehicleId');
    const amount = parseFloat((formData.get('amount') || '0').toString().replace(/,/g, ''));
    const mode = formData.get('mode'); // 'CASH' or 'BANK'
    const paymentAccountId = formData.get('paymentAccountId');
    const paymentType = formData.get('paymentType') || 'PAYABLE';

    if (!vehicleId || isNaN(amount) || amount <= 0 || !mode || !paymentAccountId) {
      return { success: false, error: 'Invalid payment details.' };
    }

    await prisma.$transaction(async (tx) => {
      const vehicle = await tx.vehicle.findUnique({
        where: { id: vehicleId }
      });

      if (!vehicle) {
        throw new Error('Vehicle not found');
      }
      
      if (paymentType === 'RECEIVABLE') {
        const currentPending = Number(vehicle.salePendingBalance);
        if (amount > currentPending) {
          throw new Error('Payment amount cannot exceed pending balance');
        }

        // Add to our cash/bank (CREDIT because we are receiving money)
        await tx.transaction.create({
          data: {
            date: new Date(),
            transactionMode: mode,
            type: 'CREDIT', 
            amount: amount,
            accountId: paymentAccountId,
            category: 'VEHICLE_SALE',
            description: `Received Pending Payment for ${vehicle.make} ${vehicle.model} (${vehicle.registration || 'Unregistered'})`
          }
        });

        // Reduce the pending sale balance on the vehicle
        await tx.vehicle.update({
          where: { id: vehicleId },
          data: {
            salePendingBalance: {
              decrement: amount
            }
          }
        });
      } else {
        const currentPending = Number(vehicle.purchasePendingBalance);
        if (amount > currentPending) {
          throw new Error('Payment amount cannot exceed pending balance');
        }

        await checkSufficientBalance(tx, paymentAccountId, amount);

        // Deduct from our cash/bank (DEBIT to the payment account because we are spending money)
        await tx.transaction.create({
          data: {
            date: new Date(),
            transactionMode: mode,
            type: 'DEBIT', 
            amount: amount,
            accountId: paymentAccountId, 
            category: 'VEHICLE_PURCHASE',
            description: `Paid Udhari for ${vehicle.make} ${vehicle.model} (${vehicle.registration || 'Unregistered'})`
          }
        });

        // Reduce the pending purchase balance on the vehicle
        await tx.vehicle.update({
          where: { id: vehicleId },
          data: {
            purchasePendingBalance: {
              decrement: amount
            }
          }
        });
      }
    });

    return { success: true };
  } catch (error) {
    console.error('Failed to process pending balance:', error);
    return { success: false, error: error.message || 'Failed to process payment.' };
  }
}

export async function getFoundersData(year, monthIndex) {
  const session = await getSession();
  if (!session || session.role !== 'ADMIN') return { success: false, error: 'Unauthorized' };

  try {
    const founders = await prisma.account.findMany({
      where: { type: 'PARTNER' }
    });
    
    let dateFilter = {};
    if (year !== undefined && monthIndex !== undefined) {
      const gte = new Date(year, monthIndex, 1);
      const lte = new Date(year, monthIndex + 1, 0, 23, 59, 59, 999);
      if (!isNaN(gte.getTime()) && !isNaN(lte.getTime())) {
        dateFilter = { gte: gte.toISOString(), lte: lte.toISOString() };
      }
    }

    const result = [];
    for (const acc of founders) {
      const txs = await prisma.transaction.findMany({
        where: { 
          accountId: acc.id,
          ...(year !== undefined ? { date: dateFilter } : {})
        },
        orderBy: { date: 'desc' }
      });
      
      let monthDebits = 0;
      let monthCredits = 0;
      txs.forEach(t => {
        if (t.type === 'DEBIT') monthDebits += Number(t.amount);
        else if (t.type === 'CREDIT' && !t.description.startsWith('Auto-Entry: Profit Earned')) monthCredits += Number(t.amount); // Exclude auto-profit so it represents actual capital deposited
      });
      
      // Filter recent UPAR transactions (DEBIT)
      const recentUpar = txs
        .filter(t => t.type === 'DEBIT')
        .slice(0, 5)
        .map(t => ({
          id: t.id,
          date: t.date,
          amount: Number(t.amount),
          mode: t.transactionMode,
          description: t.description || 'Upad'
        }));
      
      // Auto-heal legacy founder percentages
      let finalProfitShare = Number(acc.profitShare || 0);
      if (acc.name.toLowerCase() === 'bhaudip' && finalProfitShare === 0) {
        await prisma.account.update({ where: { id: acc.id }, data: { profitShare: 90 } });
        finalProfitShare = 90;
      } else if (acc.name.toLowerCase() === 'afeel' && finalProfitShare === 0) {
        await prisma.account.update({ where: { id: acc.id }, data: { profitShare: 10 } });
        finalProfitShare = 10;
      }

      if (finalProfitShare > 0) {
        result.push({
          id: acc.id,
          name: acc.name,
          profitShare: finalProfitShare,
          upadTaken: monthDebits,
          capitalDeposited: monthCredits,
          recentUpar
        });
      }
    }

    return { success: true, founders: result };
  } catch (error) {
    console.error('Error fetching founders data:', error);
    return { success: false, error: error.message };
  }
}
