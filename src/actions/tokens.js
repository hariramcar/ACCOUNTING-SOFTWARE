'use server'

import prisma from '@/lib/prisma';
import { getSession } from '@/lib/session';
import { revalidatePath } from 'next/cache';

/**
 * Record a new Advance Booking Token
 */
export async function addToken(formData) {
  try {
    const session = await getSession();
    if (!session || session.role !== 'ADMIN') return { success: false, error: 'Unauthorized' };

    const vehicleId = formData.get('vehicleId');
    const customerName = formData.get('customerName');
    const customerMobile = formData.get('customerMobile');
    const amount = parseFloat((formData.get('amount') || '0').replace(/,/g, ''));
    const paymentAccountId = formData.get('paymentAccountId');
    const paymentMode = formData.get('paymentMode');
    const date = new Date(formData.get('date') || Date.now());

    if (!vehicleId || !customerName || amount <= 0 || !paymentAccountId) {
      return { success: false, error: 'Missing required fields or invalid amount' };
    }

    const vehicle = await prisma.vehicle.findUnique({ where: { id: vehicleId } });
    if (!vehicle) return { success: false, error: 'Vehicle not found' };

    const token = await prisma.$transaction(async (tx) => {
      // 1. Create Token
      const newToken = await tx.vehicleToken.create({
        data: {
          vehicleId,
          customerName,
          customerMobile,
          amount,
          date,
          paymentAccountId,
          paymentMode,
          status: 'ACTIVE'
        }
      });

      // 2. Deposit into Bank/Cash as Income immediately
      await tx.transaction.create({
        data: {
          date,
          transactionMode: paymentMode,
          type: 'CREDIT',
          amount,
          accountId: paymentAccountId,
          category: 'GENERAL',
          description: `Token Received: ${customerName} for ${vehicle.make} ${vehicle.model} (${vehicle.registration || 'UNREG'})`,
          referenceId: newToken.id,
        }
      });

      return newToken;
    });

    revalidatePath('/inventory');
    revalidatePath('/history');
    return { 
      success: true, 
      token: {
        ...token,
        amount: Number(token.amount)
      } 
    };
  } catch (error) {
    console.error('Error adding token:', error);
    return { success: false, error: 'Failed to add token' };
  }
}

/**
 * Forfeit a Token (Firm keeps 100% of the money)
 */
export async function forfeitToken(tokenId) {
  try {
    const session = await getSession();
    if (!session || session.role !== 'ADMIN') return { success: false, error: 'Unauthorized' };

    const token = await prisma.vehicleToken.findUnique({ 
      where: { id: tokenId },
      include: { vehicle: true }
    });
    
    if (!token) return { success: false, error: 'Token not found' };
    if (token.status !== 'ACTIVE') return { success: false, error: 'Token is not active' };

    await prisma.$transaction(async (tx) => {
      // 1. Update Token Status to FORFEITED
      await tx.vehicleToken.update({
        where: { id: tokenId },
        data: { status: 'FORFEITED' }
      });

      // 2. Record it as an INCOME Expense so it shows up cleanly on the ledger as 100% firm profit.
      // NOTE: We DO NOT create a Transaction here because the money was already 
      // deposited into the bank when the token was received. Creating one would double-count.
      await tx.expense.create({
        data: {
          amount: token.amount,
          date: new Date(),
          description: `Forfeited Token Income: ${token.customerName} (Ref: ${token.vehicle.make} ${token.vehicle.registration})`,
          expenseType: 'INCOME',
          // Do NOT link to vehicleId, because the client specified that token forfeiture
          // is 100% firm income. If we link it to the vehicleId, the partner will get 50%
          // of this income during `syncVehicleState`. Keeping it null isolates the profit.
          status: 'APPROVED',
          requestedAccountId: token.paymentAccountId,
          requestedMode: token.paymentMode,
          customerName: token.customerName,
          customerMobile: token.customerMobile,
          submittedById: session.userId,
        }
      });
    });

    revalidatePath('/inventory');
    revalidatePath('/history');
    return { success: true };
  } catch (error) {
    console.error('Error forfeiting token:', error);
    return { success: false, error: 'Failed to forfeit token' };
  }
}

/**
 * FUTURE REQUIREMENT: Refund Token
 * If the client requests a Refund feature in the future, uncomment and implement this:
 * 
 * export async function refundToken(tokenId) {
 *   // 1. Update Token Status to REFUNDED
 *   // 2. Create a DEBIT transaction to return the money from paymentAccountId
 *   // 3. No Expense record needed since it cancels out the original CREDIT.
 * }
 */
