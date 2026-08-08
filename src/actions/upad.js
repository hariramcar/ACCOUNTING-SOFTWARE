'use server';

import prisma from '@/lib/prisma';
import { revalidatePath } from 'next/cache';

export async function giveAdvance(formData) {
  try {
    const accountId = formData.get('accountId');
    const amount = parseFloat((formData.get('amount') || '0').replace(/,/g, ''));
    const dateStr = formData.get('date');
    const description = formData.get('description');
    const sourceAccountId = formData.get('sourceAccountId');

    if (!accountId || !sourceAccountId || isNaN(amount) || amount <= 0) {
      throw new Error('Invalid input');
    }

    // Get the source account to know if it's CASH or BANK
    const sourceAcc = await prisma.account.findUnique({ where: { id: sourceAccountId } });
    if (!sourceAcc) throw new Error('Source account not found');

    await prisma.$transaction(async (tx) => {
      // 1. DEBIT UPAD Account (They OWE us more money now, so their balance goes UP)
      await tx.transaction.create({
        data: {
          date: dateStr ? new Date(dateStr) : new Date(),
          transactionMode: sourceAcc.type === 'BANK' ? 'BANK' : 'CASH',
          type: 'DEBIT',
          amount,
          accountId, // The UPAD person
          category: 'UPAD_WITHDRAWAL',
          description: description || 'Advance (Upad) Given'
        }
      });

      // 2. DEBIT Source Account (Money goes OUT of our bank/cash, so balance goes DOWN)
      // Note: In this system, money leaving a CASH/BANK account is a DEBIT.
      await tx.transaction.create({
        data: {
          date: dateStr ? new Date(dateStr) : new Date(),
          transactionMode: 'CASH', // Internal ledger link
          type: 'DEBIT', // Money leaving
          amount,
          accountId: sourceAccountId, // The Bank/Cash account
          category: 'UPAD_WITHDRAWAL',
          description: `Advance Given to Staff/Mechanic`
        }
      });
    });

    revalidatePath('/upad');
    revalidatePath('/accounts');
    revalidatePath('/rojmel');
    return { success: true };
  } catch (error) {
    console.error('Failed to give advance:', error);
    return { success: false, error: 'Failed to give advance.' };
  }
}

export async function settleBill(formData) {
  try {
    const accountId = formData.get('accountId');
    const amount = parseFloat((formData.get('amount') || '0').replace(/,/g, ''));
    const dateStr = formData.get('date');
    const description = formData.get('description');
    const sourceAccountId = formData.get('sourceAccountId');

    if (!accountId || !sourceAccountId || isNaN(amount) || amount <= 0) {
      throw new Error('Invalid input');
    }

    // Get the source account to know if it's CASH or BANK
    const sourceAcc = await prisma.account.findUnique({ where: { id: sourceAccountId } });
    if (!sourceAcc) throw new Error('Source account not found');

    await prisma.$transaction(async (tx) => {
      // 1. DEBIT UPAD Account (We owe them less / they owe us more)
      await tx.transaction.create({
        data: {
          date: dateStr ? new Date(dateStr) : new Date(),
          transactionMode: sourceAcc.type === 'BANK' ? 'BANK' : 'CASH',
          type: 'DEBIT',
          amount,
          accountId, // The UPAD person
          category: 'UPAD_REPAYMENT',
          description: description || 'Bill Settled / Paid to Vendor'
        }
      });

      // 2. DEBIT Source Account (Money goes OUT of our bank/cash)
      await tx.transaction.create({
        data: {
          date: dateStr ? new Date(dateStr) : new Date(),
          transactionMode: 'CASH',
          type: 'DEBIT', // Money leaving
          amount,
          accountId: sourceAccountId, // The Bank/Cash account
          category: 'UPAD_REPAYMENT',
          description: 'Bill Settled / Paid to Vendor'
        }
      });
    });

    revalidatePath('/upad');
    revalidatePath('/accounts');
    revalidatePath('/rojmel');
    return { success: true };
  } catch (error) {
    console.error('Failed to settle bill:', error);
    return { success: false, error: 'Failed to settle bill.' };
  }
}
