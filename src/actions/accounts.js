'use server';

import prisma from '@/lib/prisma';
import { revalidatePath } from 'next/cache';

export async function getAccountsList() {
  try {
    const accounts = await prisma.account.findMany({
      orderBy: { createdAt: 'asc' },
    });
    
    const processedAccounts = accounts.map(acc => ({
      ...acc,
      openingBalance: Number(acc.openingBalance),
      profitShare: Number(acc.profitShare || 0)
    }));

    return { success: true, accounts: processedAccounts };
  } catch (error) {
    console.error('Failed to load accounts:', error);
    return { success: false, error: 'Failed to load accounts.' };
  }
}

export async function getAccountBalances(year, month) {
  try {
    const now = new Date();
    const startOfMonth = (year !== undefined && month !== undefined) 
      ? new Date(year, month, 1) 
      : new Date(now.getFullYear(), now.getMonth(), 1);
      
    const endOfMonth = (year !== undefined && month !== undefined)
      ? new Date(year, month + 1, 0, 23, 59, 59, 999)
      : new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);

    const accounts = await prisma.account.findMany({
      orderBy: { createdAt: 'asc' },
      include: {
        transactions: true,
        partnerships: {
          where: { 
            OR: [
              { vehicle: { status: 'IN_STOCK' } },
              { vehicle: { status: 'SOLD', saleDate: { gte: startOfMonth, lte: endOfMonth } } }
            ]
          },
          include: {
            vehicle: true
          }
        }
      }
    });

    const processedAccounts = accounts.map(acc => {
      let openingBalance = 0;
      let currentBalance = 0;
      let totalPaid = 0; // Current month's incoming money
      let totalExpenses = 0; // Current month's outgoing money
      
      let salaryGiven = 0;
      let upadGiven = 0;
      let upadUsed = 0;
      
      acc.transactions.forEach(t => {
        const amt = Number(t.amount);
        const isOpeningInjection = (t.category === 'CAPITAL_INJECTION' || t.description === 'Opening Balance' || t.description === 'Capital Introduced / Opening Balance');

        if (acc.type === 'STAFF') {
          if (t.category === 'SALARY') {
            salaryGiven += amt;
          } else if (t.category === 'UPAD_WITHDRAWAL') {
            upadGiven += amt;
          } else if (t.category === 'UPAD_REPAYMENT' || t.category === 'EXPENSE') {
            upadUsed += amt;
          }
        }

        // 1. Calculate Monthly Opening Balance 
        // (Includes all past transactions, PLUS any explicit "Opening Balance" injections made this month)
        if (t.date < startOfMonth || (isOpeningInjection && t.date <= endOfMonth)) {
          if (t.category !== 'SALARY') {
            if (t.type === 'CREDIT') openingBalance += amt;
            else openingBalance -= amt;
          }
        }

        // 2. Calculate Monthly In/Out (Operating flow THIS month)
        if (t.date >= startOfMonth && t.date <= endOfMonth && !isOpeningInjection) {
          if (t.category !== 'SALARY') {
            if (t.type === 'CREDIT') totalPaid += amt;
            else if (t.type === 'DEBIT') totalExpenses += amt;
          }
        }

        // 3. Current Balance up to the end of the selected month
        if (t.date <= endOfMonth) {
          if (t.category !== 'SALARY') {
            if (t.type === 'CREDIT') currentBalance += amt;
            else if (t.type === 'DEBIT') currentBalance -= amt;
          }
        }
      });

      const pendingInvestments = acc.partnerships?.reduce((sum, p) => sum + Number(p.investmentAmount), 0) || 0;
      
      const partnerVehicles = acc.partnerships?.map(p => ({
        id: p.id,
        make: p.vehicle.make,
        model: p.vehicle.model,
        registration: p.vehicle.registration,
        status: p.vehicle.status,
        profit: p.vehicle.profit ? Number(p.vehicle.profit) : 0,
        purchasePrice: Number(p.vehicle.purchasePrice),
        investmentAmount: Number(p.investmentAmount),
        profitSharePercentage: Number(p.profitSharePercentage || 0)
      })) || [];

      return {
        id: acc.id,
        name: acc.name,
        type: acc.type,
        openingBalance: Number(acc.openingBalance || 0),
        profitShare: Number(acc.profitShare || 0),
        createdAt: acc.createdAt,
        updatedAt: acc.updatedAt,
        currentBalance,
        totalPaid,
        totalExpenses,
        salaryGiven,
        upadGiven,
        upadUsed,
        pendingInvestments,
        partnerVehicles
      };
    });

    return { success: true, accounts: processedAccounts };
  } catch (error) {
    console.error('Failed to load account balances:', error);
    return { success: false, error: 'Failed to load account balances.' };
  }
}

export async function createAccount(formData) {
  try {
    const name = formData.get('name');
    const type = formData.get('type');
    const openingBalance = parseFloat(formData.get('openingBalance') || '0');
    const profitShare = parseFloat(formData.get('profitShare') || '0');

    // Enforce: only 1 CASH account allowed
    if (type === 'CASH') {
      const existingCash = await prisma.account.findFirst({ where: { type: 'CASH' } });
      if (existingCash) {
        return { success: false, error: 'Only one Cash account is allowed. A Cash account already exists.' };
      }
    }

    const account = await prisma.account.create({
      data: {
        name,
        type,
        openingBalance,
        profitShare
      }
    });

    if (openingBalance > 0) {
      await prisma.transaction.create({
        data: {
          date: new Date(),
          transactionMode: type === 'BANK' ? 'BANK' : 'CASH',
          type: 'CREDIT',
          amount: openingBalance,
          accountId: account.id,
          category: 'CAPITAL_INJECTION',
          description: 'Opening Balance'
        }
      });
    }

    revalidatePath('/accounts');
    revalidatePath('/rojmel');
    return { success: true };
  } catch (error) {
    console.error('Failed to create account:', error);
    return { success: false, error: 'Failed to create account.' };
  }
}

export async function injectCapital(formData) {
  try {
    const accountId = formData.get('accountId');
    const amount = parseFloat(formData.get('amount') || '0');
    const date = new Date(formData.get('date') || Date.now());

    if (amount <= 0) throw new Error('Amount must be positive');

    const account = await prisma.account.findUnique({ where: { id: accountId } });
    if (!account) throw new Error('Account not found');

    await prisma.transaction.create({
      data: {
        date,
        transactionMode: account.type === 'BANK' ? 'BANK' : 'CASH',
        type: 'CREDIT',
        amount,
        accountId,
        category: 'CAPITAL_INJECTION',
        description: 'Capital Introduced / Opening Balance'
      }
    });

    revalidatePath('/accounts');
    revalidatePath('/rojmel');
    return { success: true };
  } catch (error) {
    console.error('Failed to inject capital:', error);
    return { success: false, error: 'Failed to inject capital.' };
  }
}

export async function deleteAccount(formData) {
  try {
    const id = formData.get('id');
    
    // Check if account has transactions
    const count = await prisma.transaction.count({
      where: { accountId: id }
    });
    
    if (count > 0) {
      return { success: false, error: 'Cannot delete account because it has recorded transactions (Rojmel entries).' };
    }

    // Check if it's used in any partnerships
    const partnerCount = await prisma.partnership.count({
      where: { partnerAccountId: id }
    });

    if (partnerCount > 0) {
      return { success: false, error: 'Cannot delete account because it is linked to active partnerships on vehicles.' };
    }

    // Check if used in vehicles (payableAccountId)
    const vehicleCount = await prisma.vehicle.count({
      where: { payableAccountId: id }
    });

    if (vehicleCount > 0) {
      return { success: false, error: 'Cannot delete account because it is linked to pending vehicle purchases.' };
    }

    await prisma.account.delete({
      where: { id }
    });

    revalidatePath('/accounts');
    revalidatePath('/rojmel');
    revalidatePath('/inventory');
    return { success: true };
  } catch (error) {
    console.error('Failed to delete account:', error);
    return { success: false, error: 'Failed to delete account.' };
  }
}

export async function getAccountTransactions(accountId) {
  try {
    const transactions = await prisma.transaction.findMany({
      where: { accountId },
      orderBy: [{ date: 'desc' }, { createdAt: 'desc' }]
    });

    const processed = transactions.map(t => ({
      ...t,
      amount: Number(t.amount)
    }));

    return { success: true, transactions: processed };
  } catch (error) {
    console.error('Failed to load transactions:', error);
    return { success: false, error: 'Failed to load transactions.' };
  }
}
