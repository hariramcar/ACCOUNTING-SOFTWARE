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
      select: { id: true, name: true, type: true }
    });

    const expenses = expensesRaw.map(exp => {
      let finalAmount = Number(exp.amount);

      const paymentAccount = allAccounts.find(a => a.id === exp.requestedAccountId);
      let paymentSource = exp.requestedMode || 'PENDING';
      let isStaffAdvance = false;

      if (paymentAccount) {
        if (exp.requestedMode === 'UGHRANI') {
          paymentSource = paymentAccount.name;
        } else if (paymentAccount.type === 'STAFF') {
          paymentSource = `${paymentAccount.name}'s Advance`;
          isStaffAdvance = true;
        }
      }

      const processed = {
        ...exp,
        amount: finalAmount,
        paymentSource,
        isStaffAdvance,
        accountType: paymentAccount ? paymentAccount.type : null
      };
      if (exp.vehicle) {
        processed.vehicle = {
          ...exp.vehicle,
          legacyExpenses: Number(exp.vehicle.legacyExpenses || 0),
          purchasePrice: Number(exp.vehicle.purchasePrice),
          purchasePendingBalance: Number(exp.vehicle.purchasePendingBalance),
          salePrice: exp.vehicle.salePrice ? Number(exp.vehicle.salePrice) : null,
          salePendingBalance: Number(exp.vehicle.salePendingBalance || 0),
          profit: exp.vehicle.profit ? Number(exp.vehicle.profit) : null,
        };
      }
      return processed;
    });

    const rawTx = await prisma.transaction.findMany({
      where: {
        category: { in: ['VEHICLE_PURCHASE', 'INTERNAL_TRANSFER', 'UPAD_WITHDRAWAL', 'UPAD_REPAYMENT'] },
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

    const filteredRawTx = rawTx.filter(tx => {
      if (tx.category === 'UPAD_WITHDRAWAL' || tx.category === 'UPAD_REPAYMENT') {
        if (tx.account && (tx.account.type === 'CASH' || tx.account.type === 'BANK')) {
          return false;
        }
      }
      return true;
    });

    const additionalExpenses = filteredRawTx
      .map(tx => {
        let finalAmount = Number(tx.amount);
        
        let paymentSource = tx.transactionMode || 'UNKNOWN';
        let recipient = null;

        if (tx.category === 'VEHICLE_PURCHASE') {
          paymentSource = tx.account ? tx.account.name : paymentSource;
          // Recipient is usually null or extracted from description if needed, null is fine
        } else if (tx.category === 'INTERNAL_TRANSFER') {
          paymentSource = tx.account ? tx.account.name : paymentSource;
          recipient = tx.referenceId || null;
        } else if (tx.category === 'UPAD_WITHDRAWAL' || tx.category === 'UPAD_REPAYMENT') {
          // tx.account is the upad account here
          recipient = tx.account ? tx.account.name : null;
        } else {
          recipient = tx.account ? tx.account.name : null;
        }

        return {
          id: tx.id,
          amount: finalAmount,
          date: tx.date,
          description: tx.description,
          expenseType: tx.category === 'VEHICLE_PURCHASE' ? 'CAR_EXPENSE' : (tx.category === 'INTERNAL_TRANSFER' || tx.category === 'UPAD_WITHDRAWAL' || tx.category === 'UPAD_REPAYMENT') ? 'ADVANCE' : 'OFFICE_EXPENSE',
          status: 'APPROVED',
          vehicle: null,
          submittedBy: null,
          transferDetails: (tx.category === 'INTERNAL_TRANSFER' || tx.category === 'UPAD_WITHDRAWAL' || tx.category === 'UPAD_REPAYMENT') ? tx.referenceId : null,
          paymentSource,
          recipient,
          isRawTx: true,
          isTransfer: tx.category === 'INTERNAL_TRANSFER',
          accountType: tx.account ? tx.account.type : null
        };
      });

    const filteredAdditional = additionalExpenses.filter(tx => {
      if (tx.description.startsWith('Auto-Entry: Pending Receivable') || tx.description.startsWith('Auto-Entry: Advance Received')) {
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
          { description: { startsWith: 'Auto-Entry: Paid Pending Investment Share' } },
          { description: { startsWith: 'Auto-Entry: Profit Share' } },
          { description: { startsWith: 'Auto-Entry: Pending Receivable' } },
          { description: { startsWith: 'Auto-Entry: Advance Received' } },
          { description: { startsWith: 'Auto-Entry: Agent Car Payment Settled' } },
          { category: 'EXPENSE' },
          { category: 'UPAD_REPAYMENT' } // Exclude vendor payments from income
        ]
      },
      orderBy: { date: 'desc' },
      include: {
        account: true
      }
    });

    const income = transactionsRaw.map(t => {
      let finalAmount = Number(t.amount);

      // For transactions logged directly on Firm Cash/Bank, the recipient is the description's subject
      // For INTERNAL_TRANSFER, the recipient is the account it went into
      const recipient = t.category === 'INTERNAL_TRANSFER' 
        ? (t.account ? t.account.name : null) 
        : null;

      return {
        ...t,
        amount: finalAmount,
        paymentSource: t.account && (t.account.type === 'CASH' || t.account.type === 'BANK') ? t.account.name : (t.transactionMode || 'UNKNOWN'),
        recipient,
        isRawTx: true,
        isTransfer: t.category === 'INTERNAL_TRANSFER',
        transferDetails: t.category === 'INTERNAL_TRANSFER' ? t.referenceId : null,
        accountType: t.account ? t.account.type : null,
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
