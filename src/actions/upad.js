'use server';

import prisma from '@/lib/prisma';
import { revalidatePath } from 'next/cache';
import { checkSufficientBalance } from '@/lib/balanceCheck';
import { getSession } from '@/lib/session';

export async function giveAdvance(formData) {
  try {
    const accountId = formData.get('accountId');
    const amount = parseFloat((formData.get('amount') || '0').replace(/,/g, ''));
    const dateStr = formData.get('date');
    const description = formData.get('description');
    const sourceAccountId = formData.get('sourceAccountId');
    const isSalary = formData.get('isSalary') === 'true';

    if (!accountId || !sourceAccountId || isNaN(amount) || amount <= 0) {
      throw new Error('Invalid input');
    }

    // Get the source account to know if it's CASH or BANK
    const sourceAcc = await prisma.account.findUnique({ where: { id: sourceAccountId } });
    if (!sourceAcc) throw new Error('Source account not found');

    const targetAcc = await prisma.account.findUnique({ where: { id: accountId } });
    if (!targetAcc) throw new Error('Recipient account not found');

    const baseDescription1 = description ? description : (isSalary ? 'Salary Paid' : 'Advance (Upad) Given');
    const finalDescription1 = `${baseDescription1} - ${targetAcc.name}`;

    const baseDescription2 = isSalary ? `Salary Paid to Staff` : `Advance Given to Staff/Mechanic`;
    const finalDescription2 = description ? `${description} - ${targetAcc.name}` : `${baseDescription2} - ${targetAcc.name}`;

    await prisma.$transaction(async (tx) => {
      await checkSufficientBalance(tx, sourceAccountId, amount);
      
      // 1. DEBIT STAFF/UPAD Account 
      // If it's salary, we still debit them but mark it as SALARY so it doesn't affect their Upad balance
      await tx.transaction.create({
        data: {
          date: dateStr ? new Date(dateStr) : new Date(),
          transactionMode: sourceAcc.type === 'BANK' ? 'BANK' : 'CASH',
          type: 'DEBIT',
          amount,
          accountId, // The STAFF / UPAD person
          category: isSalary ? 'SALARY' : 'UPAD_WITHDRAWAL',
          description: finalDescription1
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
          category: isSalary ? 'SALARY' : 'UPAD_WITHDRAWAL',
          description: finalDescription2
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

    const vendorAcc = await prisma.account.findUnique({ where: { id: accountId } });
    if (!vendorAcc) throw new Error('Vendor account not found');

    const baseDescription = description ? description : 'Bill Settled / Paid to Vendor';
    const finalDescription = `${baseDescription} - ${vendorAcc.name}`;

    await prisma.$transaction(async (tx) => {
      if (amount > 0 && sourceAccountId) {
        await checkSufficientBalance(tx, sourceAccountId, amount);
      }
      
      // 1. DEBIT UPAD Account (We owe them less / they owe us more)
      await tx.transaction.create({
        data: {
          date: dateStr ? new Date(dateStr) : new Date(),
          transactionMode: sourceAcc.type === 'BANK' ? 'BANK' : 'CASH',
          type: 'DEBIT',
          amount,
          accountId, // The UPAD person
          category: 'UPAD_REPAYMENT',
          description: finalDescription
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
          description: finalDescription
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

export async function receiveAgentCarPayment(formData) {
  try {
    const session = await getSession();
    if (!session || session.role !== 'ADMIN') return { success: false, error: 'Unauthorized' };

    const vehicleId = formData.get('vehicleId');
    const agentAccountId = formData.get('agentAccountId');
    const ledgerAccountId = formData.get('ledgerAccountId');
    const rawAmount = formData.get('amount')?.toString().replace(/,/g, '') || '0';
    const amount = Math.round(parseFloat(rawAmount) * 100) / 100 || 0;
    const dateStr = formData.get('date');
    const description = formData.get('description');
    
    if (amount <= 0 || !agentAccountId || !ledgerAccountId) {
      return { success: false, error: 'Invalid input parameters.' };
    }

    const date = new Date(dateStr || Date.now());

    await prisma.$transaction(async (tx) => {
      let vehicleDetails = '';
      
      // 1. Update Vehicle Pending Balance
      if (vehicleId) {
        const vehicle = await tx.vehicle.findUnique({ where: { id: vehicleId } });
        if (vehicle) {
          vehicleDetails = ` (Ref: ${vehicle.make} ${vehicle.model} ${vehicle.registration || 'UNREG'})`;
          await tx.vehicle.update({
            where: { id: vehicleId },
            data: {
              salePendingBalance: Math.max(0, Number(vehicle.salePendingBalance) - amount)
            }
          });
        }
      }

      // 2. Credit Cash/Bank Account (Money In)
      const ledgerAcc = await tx.account.findUnique({ where: { id: ledgerAccountId } });
      const agentAcc = await tx.account.findUnique({ where: { id: agentAccountId } });
      
      if (ledgerAcc) {
        const finalDescription = description 
          ? `${description} - ${agentAcc?.name || 'Agent'}${vehicleDetails}`
          : `Payment Settled by ${agentAcc?.name || 'Agent'}${vehicleDetails}`;

        await tx.transaction.create({
          data: {
            date,
            transactionMode: ledgerAcc.type === 'BANK' ? 'BANK' : 'CASH',
            type: 'CREDIT',
            amount,
            accountId: ledgerAccountId,
            category: 'INTERNAL_TRANSFER',
            referenceId: agentAccountId, // Internal link for tracking
            description: finalDescription
          }
        });
      }

      // 3. Credit Agent/Uchak Account (Settle their balance)
      if (agentAcc) {
        const isStaff = agentAcc.type === 'STAFF';
        await tx.transaction.create({
          data: {
            date,
            transactionMode: 'CASH', // Internal ledger link
            type: 'CREDIT',
            amount,
            accountId: agentAccountId,
            category: isStaff ? 'UPAD_REPAYMENT' : 'INTERNAL_TRANSFER',
            referenceId: ledgerAccountId, // Internal link back to bank
            description: isStaff 
              ? `Payment Received (Money In) - ${description || ''}`
              : `Auto-Entry: Agent Car Payment Settled - ${description || 'Money Received'}${vehicleDetails}`
          }
        });
      }
    });

    revalidatePath('/accounts');
    revalidatePath('/expenses');
    revalidatePath('/inventory');
    revalidatePath('/rojmel');
    
    return { success: true };
  } catch (error) {
    console.error('Failed to receive agent payment:', error);
    return { success: false, error: 'Failed to record agent payment.' };
  }
}

export async function receiveAdvancePayment(formData) {
  try {
    const session = await getSession();
    if (!session || session.role !== 'ADMIN') return { success: false, error: 'Unauthorized' };

    const accountId = formData.get('accountId');
    const destinationAccountId = formData.get('destinationAccountId');
    const rawAmount = formData.get('amount')?.toString().replace(/,/g, '') || '0';
    const amount = Math.round(parseFloat(rawAmount) * 100) / 100 || 0;
    const dateStr = formData.get('date');
    const description = formData.get('description');
    
    if (amount <= 0 || !accountId || !destinationAccountId) {
      return { success: false, error: 'Invalid input parameters.' };
    }

    const date = new Date(dateStr || Date.now());

    await prisma.$transaction(async (tx) => {
      const upadAcc = await tx.account.findUnique({ where: { id: accountId } });
      const destAcc = await tx.account.findUnique({ where: { id: destinationAccountId } });
      
      if (!upadAcc || !destAcc) throw new Error('Account not found');

      // 1. CREDIT Destination Account (Money enters our bank/cash)
      await tx.transaction.create({
        data: {
          date,
          transactionMode: destAcc.type === 'BANK' ? 'BANK' : 'CASH',
          type: 'CREDIT',
          amount,
          accountId: destinationAccountId,
          category: 'UPAD_REPAYMENT',
          description: description || `Payment Received from ${upadAcc.name}`
        }
      });

      // 2. CREDIT UPAD Account (Reduce what they owe us)
      await tx.transaction.create({
        data: {
          date,
          transactionMode: 'CASH',
          type: 'CREDIT',
          amount,
          accountId: accountId,
          category: 'UPAD_REPAYMENT',
          description: `Payment Received (Money In)`
        }
      });
    });

    revalidatePath('/accounts');
    revalidatePath('/rojmel');
    
    return { success: true };
  } catch (error) {
    console.error('Failed to receive advance payment:', error);
    return { success: false, error: error.message || 'Failed to receive payment.' };
  }
}
