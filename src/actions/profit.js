'use server';

import prisma from '@/lib/prisma';
import { getAllExpenses, getAllIncome } from './history';
import { checkSufficientBalance } from '@/lib/balanceCheck';

export async function getMonthlyProfitData(year, monthIndex) {
  try {
    // Generate start and end dates for the selected month
    // monthIndex is 0-11 (0 = January, 11 = December)
    const startDate = new Date(year, monthIndex, 1);
    const endDate = new Date(year, monthIndex + 1, 0, 23, 59, 59, 999);

    // 1. Fetch Sold Vehicles for the month
    const soldVehicles = await prisma.vehicle.findMany({
      where: {
        status: 'SOLD',
        saleDate: {
          gte: startDate,
          lte: endDate
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
          gte: startDate,
          lte: endDate
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
          gte: startDate,
          lte: endDate
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
      return sum + Math.max(0, totalCost - partnerInvestment);
    }, 0);

    // 5. Process calculations
    let totalGrossProfit = 0;
    let totalPartnerDeductions = 0;
    let totalOfficeExpenseAmount = 0;
    let totalCarExpenseAmount = 0;

    carExpenses.forEach(exp => {
      if (exp.status !== 'REJECTED') {
        totalCarExpenseAmount += Number(exp.amount || 0);
      }
    });

    const processedVehicles = soldVehicles.map(v => {
      // The profit column in DB already has SalePrice - TotalCost (including repairs/legacy)
      const carProfit = Number(v.profit || 0);
      totalGrossProfit += carProfit;

      // Calculate Partner Share for this car
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
            openingBalance: Number(p.partnerAccount.openingBalance)
          } : undefined
        })) || []
      };
    });

    const processedOfficeExpenses = officeExpenses.map(exp => {
      totalOfficeExpenseAmount += Number(exp.amount);
      return {
        id: exp.id,
        description: exp.description,
        amount: Number(exp.amount),
        date: exp.date
      };
    });

    const netProfit = totalGrossProfit - totalOfficeExpenseAmount;

    // 6. Fetch Ledger History Totals for Summary
    const { expenses: ledgerExpenses } = await getAllExpenses(year, monthIndex);
    const { income: ledgerIncome } = await getAllIncome(year, monthIndex);

    const totalLedgerExpenses = ledgerExpenses?.reduce((sum, exp) => {
      if (exp.requestedMode === 'UGHRANI') return sum;
      if (exp.isStaffAdvance) return sum;
      if (exp.rawCategory === 'VEHICLE_PURCHASE') return sum;
      return sum + (!exp.isTransfer && exp.status !== 'REJECTED' ? Number(exp.amount) : 0);
    }, 0) || 0;

    const rawOperatingIncome = ledgerIncome?.reduce((sum, inc) => {
      if (inc.rawCategory === 'VEHICLE_SALE') return sum;
      return sum + (!inc.isTransfer ? Number(inc.amount) : 0);
    }, 0) || 0;
    
    const totalLedgerIncome = rawOperatingIncome + Math.max(0, totalGrossProfit - totalPartnerDeductions);

    return {
      success: true,
      data: {
        totalGrossProfit,
        totalPartnerDeductions,
        netCarProfit: totalGrossProfit - totalPartnerDeductions,
        totalOfficeExpenseAmount,
        totalCarExpenseAmount,
        netProfit,
        inStockCount,
        inStockValue,
        soldCount: soldVehicles.length,
        totalLedgerIncome,
        totalLedgerExpenses,
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
        purchasePendingBalance: { gt: 0 }
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
        status: 'SOLD'
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
      openingBalance: Number(acc.openingBalance)
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
