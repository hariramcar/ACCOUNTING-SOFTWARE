'use server';

import prisma from '@/lib/prisma';
import { revalidatePath } from 'next/cache';
import { checkSufficientBalance } from '@/lib/balanceCheck';
import { requireAdmin, requireAuth } from '@/lib/authGuard';

export async function getDailyTransactions(dateString) {
  try {
    await requireAdmin();
    // Parse date to start and end of day
    const date = new Date(dateString || new Date());
    date.setHours(0, 0, 0, 0);
    const nextDay = new Date(date);
    nextDay.setDate(nextDay.getDate() + 1);

    const transactions = await prisma.transaction.findMany({
      where: {
        date: {
          gte: date.toISOString(),
          lt: nextDay.toISOString(),
        },
      },
      include: {
        account: true,
      },
      orderBy: {
        date: 'desc',
      },
    });

    // Calculate closing balances for the day
    let cashBalance = 0;
    let bankBalance = 0;

    transactions.forEach(t => {
      const amount = Number(t.amount);
      if (t.account.type === 'CASH') {
        t.type === 'CREDIT' ? cashBalance += amount : cashBalance -= amount;
      } else if (t.account.type === 'BANK') {
        t.type === 'CREDIT' ? bankBalance += amount : bankBalance -= amount;
      }
    });

    return { 
      success: true, 
      transactions,
      dayCashMovement: cashBalance,
      dayBankMovement: bankBalance
    };
  } catch (error) {
    console.error('Failed to fetch transactions:', error);
    return { success: false, error: error.message || 'Failed to load Rojmel data.' };
  }
}

export async function getAccounts() {
  try {
    const session = await requireAuth();
    const isAdmin = session.role === 'ADMIN';

    const rawAccounts = await prisma.account.findMany({
      orderBy: { name: 'asc' }
    });
    
    const accounts = rawAccounts.map(acc => ({
      id: acc.id,
      name: acc.name,
      type: acc.type,
      openingBalance: isAdmin ? Number(acc.openingBalance || 0) : 0,
      currentAdvance: isAdmin ? Number(acc.currentAdvance || 0) : 0,
      profitShare: isAdmin ? Number(acc.profitShare || 0) : 0
    }));

    return { success: true, accounts };
  } catch (error) {
    return { success: false, error: error.message || 'Failed to load accounts.' };
  }
}

export async function addTransaction(formData) {
  try {
    await requireAdmin();
    const amount = parseFloat((formData.get('amount') || '0').replace(/,/g, ''));
    const type = formData.get('type');
    const transactionMode = formData.get('mode');
    const accountId = formData.get('accountId');
    const description = formData.get('description');
    const category = formData.get('category') || 'GENERAL';

    await prisma.$transaction(async (tx) => {
      // Validate balance
      if (type === 'DEBIT') {
        await checkSufficientBalance(tx, accountId, amount);
      }
      
      await tx.transaction.create({
        data: {
          amount,
          type,
          transactionMode,
          accountId,
          description,
          category,
          date: new Date()
        }
      });
    });

    revalidatePath('/rojmel');
    return { success: true };
  } catch (error) {
    console.error('Failed to add transaction:', error);
    return { success: false, error: error.message || 'Failed to save transaction.' };
  }
}

export async function getHistoricalCashBalances(targetDateString) {
  try {
    await requireAdmin();
    const targetDate = new Date(targetDateString || new Date());
    targetDate.setHours(0, 0, 0, 0);
    const nextDay = new Date(targetDate);
    nextDay.setDate(nextDay.getDate() + 1);

    let totalOpening = 0; // Opening balance injected via credit transaction

    // Sum all transactions BEFORE targetDate using fast database-level aggregation
    const priorAggregates = await prisma.transaction.groupBy({
      by: ['type'],
      where: {
        account: { type: 'CASH' },
        date: { lt: targetDate }
      },
      _sum: { amount: true }
    });

    priorAggregates.forEach(agg => {
      const amt = Number(agg._sum.amount || 0);
      if (agg.type === 'CREDIT') totalOpening += amt;
      else if (agg.type === 'DEBIT') totalOpening -= amt;
    });

    // Sum all transactions ON targetDate with selective column projection
    const dayTransactions = await prisma.transaction.findMany({
      where: {
        account: { type: 'CASH' },
        date: { gte: targetDate, lt: nextDay }
      },
      select: {
        amount: true,
        type: true,
        category: true,
        description: true
      }
    });

    let closingCash = totalOpening;
    dayTransactions.forEach(t => {
      const amt = Number(t.amount);
      
      // If the transaction is an opening capital injection created TODAY, 
      // we consider it as part of the Opening Cash for today rather than operating income.
      if (t.category === 'CAPITAL_INJECTION' || t.description === 'Opening Balance' || t.description === 'Capital Introduced / Opening Balance') {
        if (t.type === 'CREDIT') totalOpening += amt;
        else totalOpening -= amt;
      }
      
      if (t.type === 'CREDIT') closingCash += amt;
      else closingCash -= amt;
    });

    return { 
      success: true, 
      openingCash: totalOpening,
      closingCash: closingCash
    };
  } catch (error) {
    console.error('Failed to calculate historical cash:', error);
    return { success: false, openingCash: 0, closingCash: 0, error: error.message };
  }
}
