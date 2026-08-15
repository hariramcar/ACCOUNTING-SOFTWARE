'use server';

import prisma from '@/lib/prisma';
import { revalidatePath } from 'next/cache';
import { checkSufficientBalance } from '@/lib/balanceCheck';

export async function getDailyTransactions(dateString) {
  // Parse date to start and end of day
  const date = new Date(dateString || new Date());
  date.setHours(0, 0, 0, 0);
  const nextDay = new Date(date);
  nextDay.setDate(nextDay.getDate() + 1);

  try {
    const transactions = await prisma.transaction.findMany({
      where: {
        date: {
          gte: date,
          lt: nextDay,
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
    return { success: false, error: 'Failed to load Rojmel data.' };
  }
}

export async function getAccounts() {
  try {
    const rawAccounts = await prisma.account.findMany({
      orderBy: { name: 'asc' }
    });
    
    const accounts = rawAccounts.map(acc => ({
      id: acc.id,
      name: acc.name,
      type: acc.type,
      openingBalance: Number(acc.openingBalance || 0),
      currentAdvance: Number(acc.currentAdvance || 0)
    }));

    return { success: true, accounts };
  } catch (error) {
    return { success: false, error: 'Failed to load accounts.' };
  }
}

export async function addTransaction(formData) {
  try {
    const amount = parseFloat((formData.get('amount') || '0').replace(/,/g, ''));
    const type = formData.get('type');
    const transactionMode = formData.get('mode');
    const accountId = formData.get('accountId');
    const description = formData.get('description');
    const category = formData.get('category') || 'GENERAL';

    await prisma.transaction.create({
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

    revalidatePath('/rojmel');
    return { success: true };
  } catch (error) {
    console.error('Failed to add transaction:', error);
    return { success: false, error: 'Failed to save transaction.' };
  }
}

export async function getHistoricalCashBalances(targetDateString) {
  try {
    const targetDate = new Date(targetDateString || new Date());
    targetDate.setHours(0, 0, 0, 0);
    const nextDay = new Date(targetDate);
    nextDay.setDate(nextDay.getDate() + 1);

    const cashAccounts = await prisma.account.findMany({
      where: { type: 'CASH' }
    });

    let totalOpening = 0; // We do not add acc.openingBalance here because createAccount already injects a CREDIT transaction for it.

    // Sum all transactions BEFORE targetDate
    const priorTransactions = await prisma.transaction.findMany({
      where: {
        account: { type: 'CASH' },
        date: { lt: targetDate }
      }
    });

    priorTransactions.forEach(t => {
      const amt = Number(t.amount);
      if (t.type === 'CREDIT') totalOpening += amt;
      else totalOpening -= amt;
    });

    // Sum all transactions ON targetDate
    const dayTransactions = await prisma.transaction.findMany({
      where: {
        account: { type: 'CASH' },
        date: { gte: targetDate, lt: nextDay }
      }
    });

    let closingCash = totalOpening;
    dayTransactions.forEach(t => {
      const amt = Number(t.amount);
      
      // If the transaction is an opening capital injection created TODAY, 
      // we consider it as part of the Opening Cash for today rather than operating income.
      if (t.description === 'Opening Balance' || t.description === 'Capital Introduced / Opening Balance') {
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
    return { success: false, openingCash: 0, closingCash: 0 };
  }
}
