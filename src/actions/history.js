'use server';

import prisma from '@/lib/prisma';
import { getSession } from '@/lib/session';

export async function getAllExpenses(year, month) {
  try {
    const session = await getSession();
    if (!session || session.role !== 'ADMIN') return { success: false, error: 'Unauthorized' };

    const startDate = new Date(year, month, 1);
    const endDate = new Date(year, month + 1, 0, 23, 59, 59, 999);

    const expensesRaw = await prisma.expense.findMany({
      where: {
        date: {
          gte: startDate,
          lte: endDate
        }
      },
      orderBy: { date: 'desc' },
      include: {
        vehicle: true,
        submittedBy: true
      }
    });

    const allAccounts = await prisma.account.findMany({
      select: { id: true, name: true }
    });

    const expenses = expensesRaw.map(exp => {
      let finalAmount = Number(exp.amount);

      const paymentAccount = allAccounts.find(a => a.id === exp.requestedAccountId);
      const paymentSource = exp.requestedMode === 'UGHRANI' && paymentAccount ? paymentAccount.name : (exp.requestedMode || 'PENDING');

      const processed = {
        ...exp,
        amount: finalAmount,
        paymentSource
      };
      if (exp.vehicle) {
        processed.vehicle = {
          ...exp.vehicle,
          legacyExpenses: Number(exp.vehicle.legacyExpenses || 0),
          purchasePrice: Number(exp.vehicle.purchasePrice),
          purchasePendingBalance: Number(exp.vehicle.purchasePendingBalance),
          salePrice: exp.vehicle.salePrice ? Number(exp.vehicle.salePrice) : null,
          profit: exp.vehicle.profit ? Number(exp.vehicle.profit) : null,
        };
      }
      return processed;
    });

    const rawTx = await prisma.transaction.findMany({
      where: {
        category: { in: ['VEHICLE_PURCHASE', 'INTERNAL_TRANSFER', 'UPAD_WITHDRAWAL'] },
        type: 'DEBIT',
        date: {
          gte: startDate,
          lte: endDate
        }
      },
      orderBy: { date: 'desc' },
      include: {
        account: true
      }
    });

    const additionalExpenses = rawTx

      .map(tx => {
        let finalAmount = Number(tx.amount);

        return {
          id: tx.id,
          amount: finalAmount,
          date: tx.date,
          description: tx.description,
          expenseType: tx.category === 'VEHICLE_PURCHASE' ? 'CAR_EXPENSE' : (tx.category === 'INTERNAL_TRANSFER' || tx.category === 'UPAD_WITHDRAWAL') ? 'ADVANCE' : 'OFFICE_EXPENSE',
          status: 'APPROVED',
          vehicle: null,
          submittedBy: null,
          transferDetails: (tx.category === 'INTERNAL_TRANSFER' || tx.category === 'UPAD_WITHDRAWAL') ? tx.referenceId : null,
          paymentSource: tx.account ? tx.account.name : tx.transactionMode,
          isRawTx: true,
          isTransfer: tx.category === 'INTERNAL_TRANSFER'
        };
      });

    const filteredAdditional = additionalExpenses.filter(tx => {
      if (tx.description === 'Advance Given to Staff/Mechanic') {
        return false;
      }
      return true;
    });

    const combined = [...expenses, ...filteredAdditional]
      .sort((a, b) => new Date(b.date) - new Date(a.date));

    return { success: true, expenses: combined };
  } catch (error) {
    console.error('Failed to load all expenses:', error);
    return { success: false, error: 'Failed to load historical expenses.' };
  }
}

export async function getAllIncome(year, month) {
  try {
    const session = await getSession();
    if (!session || session.role !== 'ADMIN') return { success: false, error: 'Unauthorized' };

    const startDate = new Date(year, month, 1);
    const endDate = new Date(year, month + 1, 0, 23, 59, 59, 999);

    const transactionsRaw = await prisma.transaction.findMany({
      where: {
        type: 'CREDIT', // Only money coming in
        date: {
          gte: startDate,
          lte: endDate
        },
        NOT: [
          { description: { in: ['Opening Balance', 'Capital Introduced / Opening Balance'] } },
          { description: { startsWith: 'Auto-Entry: Partnership Investment' } },
          { category: 'EXPENSE' }
        ]
      },
      orderBy: { date: 'desc' },
      include: {
        account: true
      }
    });



    const income = transactionsRaw.map(t => {
      let finalAmount = Number(t.amount);

      return {
        ...t,
        amount: finalAmount,
        isRawTx: true,
        isTransfer: t.category === 'INTERNAL_TRANSFER',
        transferDetails: t.category === 'INTERNAL_TRANSFER' ? t.referenceId : null,
        account: t.account ? {
          ...t.account,
          openingBalance: Number(t.account.openingBalance)
        } : null
      };
    });

    return { success: true, income };
  } catch (error) {
    console.error('Failed to load all income:', error);
    return { success: false, error: 'Failed to load historical income.' };
  }
}
