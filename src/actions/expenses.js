'use server';

import prisma from '@/lib/prisma';
import { syncVehicleState } from './syncVehicle';
import { revalidatePath } from 'next/cache';
import { checkSufficientBalance } from '@/lib/balanceCheck';
import { getSession } from '@/lib/session';

function processExpense(exp) {
  const processed = {
    ...exp,
    amount: Number(exp.amount),
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
}

export async function getRecentExpenses(dateString = null) {
  try {
    const session = await getSession();
    const isAdmin = session?.role === 'ADMIN';

    let dateFilter = {};
    if (dateString) {
      dateFilter = { 
        gte: new Date(dateString + 'T00:00:00'),
        lte: new Date(dateString + 'T23:59:59') 
      };
    }

    const expenses = await prisma.expense.findMany({
      where: {
        ...(isAdmin ? { status: { not: 'REJECTED' } } : { submittedById: session?.userId || 'missing-id' }),
        ...(dateString ? { date: dateFilter } : {})
      },
      take: 100,
      orderBy: [{ date: 'desc' }, { createdAt: 'desc' }],
      include: {
        vehicle: true
      }
    });

    // Also fetch raw transactions for Car Purchases and Transfers so they show up here (Admin only)
    let rawTx = [];
    if (isAdmin) {
      rawTx = await prisma.transaction.findMany({
        where: {
          NOT: [
            { category: 'CAPITAL_INJECTION' },
            { description: { startsWith: 'Auto-Entry: Partnership Investment' } },
            { description: { startsWith: 'Auto-Entry: Profit Share' } },
            { description: { startsWith: 'Auto-Entry: Agent Car Payment Settled' } },
            { description: { startsWith: 'Auto-Entry: Paid Pending Investment Share' } },
            { description: { startsWith: 'Income Received:' } },
            { description: { startsWith: 'Pending Income Baki:' } },
            { category: 'EXPENSE' } // Expenses are pulled from the Expense table below
          ],
          ...(dateString ? { date: dateFilter } : {})
        },
        take: 100,
        orderBy: [{ date: 'desc' }, { createdAt: 'desc' }],
        include: { account: true }
      });
    }

    const allAccounts = await prisma.account.findMany({
      select: { id: true, name: true, type: true }
    });

    const filteredRawTx = rawTx.filter(tx => {
      if (tx.category === 'UPAD_WITHDRAWAL' || tx.category === 'UPAD_REPAYMENT') {
        if (tx.account && (tx.account.type === 'CASH' || tx.account.type === 'BANK')) {
          return false;
        }
      }
      return true;
    });

    const additionalExpenses = filteredRawTx.map(tx => {
      let finalAmount = Number(tx.amount);
      let paymentSource = tx.transactionMode || 'UNKNOWN';
      
      let expType = 'OFFICE_EXPENSE';
      if (tx.type === 'CREDIT') expType = 'INCOME';
      else if (tx.category === 'VEHICLE_PURCHASE' || tx.category === 'GENERAL') expType = 'CAR_EXPENSE';
      else if (tx.category === 'INTERNAL_TRANSFER' || tx.category === 'UPAD_WITHDRAWAL' || tx.category === 'UPAD_REPAYMENT') expType = 'ADVANCE';

      return {
        id: tx.id,
        amount: finalAmount,
        date: tx.date,
        description: tx.description,
        expenseType: expType,
        status: 'APPROVED',
        vehicle: null,
        transferDetails: (tx.category === 'INTERNAL_TRANSFER' && tx.referenceId && !tx.referenceId.match(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i)) ? tx.referenceId : null,
        paymentSource,
        recipient: tx.account ? tx.account.name : null,
        accountId: tx.accountId,
        isRawTx: true,
        isTransfer: tx.category === 'INTERNAL_TRANSFER'
      };
    });

    const formattedExpenses = expenses.map(exp => {
      let finalAmount = Number(exp.amount);

      const paymentAccount = allAccounts.find(a => a.id === exp.requestedAccountId);
      let paymentSource = exp.requestedMode || 'PENDING';
      
      if (exp.expenseType === 'INCOME' && exp.requestedMode) {
        try {
          const parsed = JSON.parse(exp.requestedMode);
          if (parsed.payments && parsed.payments.length === 1) {
            paymentSource = parsed.payments[0].mode === 'CASH' ? 'Cash' : 'Bank';
          } else if (parsed.payments && parsed.payments.length > 1) {
            paymentSource = 'Split Payment';
          } else {
            paymentSource = 'Pending';
          }
        } catch (e) {
          console.warn(`[Ledger] Fallback string used for requestedMode: ${exp.requestedMode}`);
          // If it's not valid JSON, leave it as is (legacy fallback)
        }
      }
      
      if (paymentAccount) {
        if (exp.requestedMode === 'UGHRANI') {
          paymentSource = paymentAccount.name;
        } else if (paymentAccount.type === 'STAFF') {
          paymentSource = `${paymentAccount.name}'s Advance`;
        }
      }

      return {
        id: exp.id,
        amount: finalAmount,
        date: exp.date,
        description: exp.description,
        expenseType: exp.expenseType,
        status: exp.status,
        paymentSource,
        accountId: exp.requestedAccountId,
        vehicle: exp.vehicle ? {
          make: exp.vehicle.make,
          model: exp.vehicle.model,
          registration: exp.vehicle.registration
        } : null
      };
    });

    // Note: We already filtered out FIRM_CASH double entries for UPAD transactions above.
    const filteredAdditional = additionalExpenses.filter(tx => {
      return true;
    });

    let combined = [...formattedExpenses, ...filteredAdditional];

    // Merge Pending Receivable/Advance into Sold entries and remove them as standalone rows
    const pendingEntries = combined.filter(c => c.description?.includes('Pending Receivable from sale of') || c.description?.includes('Advance Received from sale of'));
    const finalCombined = [];

    const usedPendingIds = new Set();

    for (const item of combined) {
      if (item.description?.startsWith('Auto-Entry: Sold ') && item.description?.includes('- Payment 1')) {
        // Extract vehicle name (everything between "Sold " and " - Payment")
        const vehicleMatch = item.description.match(/Sold (.*?) - Payment/);
        if (vehicleMatch) {
          const vehicleName = vehicleMatch[1];
          // Find matching pending entry on the same date
          const pending = pendingEntries.find(p => p.description.includes(vehicleName) && new Date(p.date).getTime() === new Date(item.date).getTime());
          if (pending) {
            item.transferDetails = `${pending.paymentSource}: ₹${pending.amount.toLocaleString('en-IN')}`;
            usedPendingIds.add(pending.id);
          }
        }
      }
      
      if (!item.description?.includes('Pending Receivable from sale of') && !item.description?.includes('Advance Received from sale of')) {
        finalCombined.push(item);
      } else if (!usedPendingIds.has(item.id)) {
        // If it wasn't merged for some reason, we still exclude it so it doesn't clutter the UI
        // since the user explicitly said "this entry not require separetly"
      }
    }

    finalCombined.sort((a, b) => new Date(b.date) - new Date(a.date));

    return { success: true, expenses: finalCombined };
  } catch (error) {
    console.error('Failed to load expenses:', error);
    return { success: false, error: 'Failed to load expenses.' };
  }
}

export async function addExpense(formData) {
  try {
    const session = await getSession();
    if (!session) return { success: false, error: 'Unauthorized' };
    
    const userId = session.userId || session.id;
    if (!userId) return { success: false, error: 'Invalid session cookie. Please log out and log back in.' };

    const dbUser = await prisma.user.findUnique({ where: { id: userId } });
    if (!dbUser) return { success: false, error: 'User no longer exists. Please log out and log back in.' };
    
    const isStaff = session.role === 'STAFF';

    const expenseType = formData.get('expenseType'); // 'CAR_EXPENSE' or 'OFFICE_EXPENSE'
    const description = formData.get('description');
    const amount = Math.round(parseFloat((formData.get('amount') || '0').toString().replace(/,/g, '')) * 100) / 100 || 0;
    const date = new Date(formData.get('date') || Date.now());
    
    const vehicleId = formData.get('vehicleId'); // Optional, only if CAR_EXPENSE
    const customerName = formData.get('customerName') || null;
    const customerMobile = formData.get('customerMobile') || null;
    
    const paymentModes = formData.getAll('paymentModes');
    const paymentAccountIds = formData.getAll('paymentAccountIds');
    const paymentAmounts = formData.getAll('paymentAmounts');
    const receivableAccountId = formData.get('receivableAccountId');

    let paymentDataStr = null;
    const payments = [];
    let totalPaid = 0;
    
    if (isStaff && expenseType !== 'INCOME') {
      // If staff is submitting an expense, force payment to come from their own UPAD
      // Unless they selected UGHRANI (Market Place)
      const ughraniIndex = paymentModes.findIndex(m => m === 'UGHRANI');
      if (ughraniIndex !== -1 && paymentAccountIds[ughraniIndex]) {
         payments.push({
           mode: 'UGHRANI',
           accountId: paymentAccountIds[ughraniIndex],
           amount: amount
         });
         totalPaid = amount;
      } else {
         payments.push({
           mode: 'CASH',
           accountId: dbUser.accountId,
           amount: amount
         });
         totalPaid = amount;
         
         // Validation: Staff cannot exceed their Available Upad Balance
         // We must calculate their current Upad balance here.
         const account = await prisma.account.findUnique({
           where: { id: dbUser.accountId },
           include: { transactions: true }
         });
         if (!account) return { success: false, error: 'Staff account not found' };
         
         let upadBalance = 0;
         account.transactions.forEach(t => {
           if (t.category !== 'SALARY') {
             if (t.type === 'CREDIT') upadBalance += Number(t.amount);
             else if (t.type === 'DEBIT') upadBalance -= Number(t.amount);
           }
         });
         
         const availableUpad = upadBalance < 0 ? Math.abs(upadBalance) : 0;
         
         if (amount > availableUpad) {
           return { success: false, error: `You cannot submit an expense of ₹${amount.toLocaleString('en-IN')}. Your available Upad balance is only ₹${availableUpad.toLocaleString('en-IN')}.` };
         }
      }
    } else {
      for (let i = 0; i < paymentModes.length; i++) {
        const amt = Math.round(parseFloat((paymentAmounts[i] || '0').toString().replace(/,/g, '')) * 100) / 100 || 0;
        if (paymentModes[i] && paymentAccountIds[i] && amt > 0) {
          payments.push({
            mode: paymentModes[i],
            accountId: paymentAccountIds[i],
            amount: amt
          });
          totalPaid += amt;
        }
      }
    }

    if (expenseType === 'INCOME') {
      if (totalPaid > amount) {
        return { success: false, error: 'Your payment amount cannot be greater than your income amount.' };
      }
      paymentDataStr = JSON.stringify({
        payments,
        receivableAccountId,
        pendingBalance: amount - totalPaid
      });
    } else {
      if (totalPaid !== amount && payments.length > 0) {
        return { success: false, error: 'For expenses, your payment allocations must exactly match the total expense amount.' };
      }
      paymentDataStr = JSON.stringify({
        payments
      });
    }

    const status = isStaff ? 'PENDING' : 'APPROVED';

    await prisma.$transaction(async (tx) => {
      // 1. Create the Expense Record
      const expense = await tx.expense.create({
        data: {
          expenseType,
          description,
          amount,
          date,
          vehicleId: vehicleId ? vehicleId : null,
          customerName,
          customerMobile,
          status,
          requestedAccountId: null,
          requestedMode: paymentDataStr,
          submittedById: userId
        }
      });

      // 2. Auto-Deduct/Add from Rojmel (ONLY if Admin directly adds it, or if no approval needed)
        if (paymentDataStr) {
          const data = JSON.parse(paymentDataStr);
          
          if (expenseType === 'INCOME') {
            for (const p of data.payments) {
              await tx.transaction.create({
                data: {
                  date,
                  transactionMode: p.mode,
                  type: 'CREDIT',
                  amount: p.amount,
                  accountId: p.accountId,
                  category: 'GENERAL',
                  referenceId: expense.id,
                  description: `Income Received: ${description}`
                }
              });
            }
            if (data.pendingBalance > 0 && data.receivableAccountId) {
              await tx.transaction.create({
                data: {
                  date,
                  transactionMode: 'CASH',
                  type: 'DEBIT',
                  amount: data.pendingBalance,
                  accountId: data.receivableAccountId,
                  category: 'GENERAL',
                  referenceId: expense.id,
                  description: `Pending Income Baki: ${description}`
                }
              });
            }
          } else {
            // EXPENSE Mode processing
            for (const p of data.payments) {
              if (p.mode !== 'UGHRANI') {
                await checkSufficientBalance(tx, p.accountId, p.amount);
              }
              await tx.transaction.create({
                data: {
                  date,
                  transactionMode: p.mode === 'UGHRANI' ? 'CASH' : p.mode,
                  type: p.mode === 'UGHRANI' ? 'CREDIT' : 'DEBIT',
                  amount: p.amount,
                  accountId: p.accountId,
                  category: 'EXPENSE',
                  referenceId: expense.id,
                  description: `Auto-Entry (${expenseType === 'CAR_EXPENSE' ? 'Car Repair' : 'Office'}): ${description}`
                }
              });
            }
          }
        }
    }, { maxWait: 15000, timeout: 30000 }, { maxWait: 15000, timeout: 30000 });

    revalidatePath('/expenses');
    revalidatePath('/history');
    revalidatePath('/');
    revalidatePath('/profit');
    revalidatePath('/dashboard');
    revalidatePath('/inventory');
    revalidatePath('/rojmel');
    return { success: true };
  } catch (error) {
    console.error('Failed to add expense:', error);
    return { success: false, error: error.message || 'Failed to add expense.' };
  }
}

export async function getPendingExpenses() {
  try {
    const session = await getSession();
    if (!session || session.role !== 'ADMIN') return { success: false, expenses: [] };

    const expenses = await prisma.expense.findMany({
      where: { status: 'PENDING' },
      orderBy: { createdAt: 'asc' },
      include: {
        vehicle: true,
        submittedBy: true
      }
    });

    return { success: true, expenses: expenses.map(processExpense) };
  } catch (error) {
    console.error('Failed to load pending expenses:', error);
    return { success: false, error: 'Failed to load pending expenses.' };
  }
}

export async function approveExpense(formData) {
  try {
    const session = await getSession();
    if (!session || session.role !== 'ADMIN') return { success: false, error: 'Unauthorized' };
    
    const expenseId = formData.get('expenseId');
    
    await prisma.$transaction(async (tx) => {
      const expense = await tx.expense.findUnique({ where: { id: expenseId } });
      if (!expense || expense.status !== 'PENDING') throw new Error('Invalid expense or already processed.');

      await tx.expense.update({
        where: { id: expenseId },
        data: { status: 'APPROVED' }
      });

      if (expense.requestedMode && expense.requestedMode.startsWith('{')) {
        const data = JSON.parse(expense.requestedMode);
        
        if (expense.expenseType === 'INCOME') {
          for (const p of data.payments) {
            await tx.transaction.create({
              data: {
                date: expense.date,
                transactionMode: p.mode,
                type: 'CREDIT',
                amount: p.amount,
                accountId: p.accountId,
                category: 'GENERAL',
                referenceId: expense.id,
                description: `Income Received: ${expense.description}`
              }
            });
          }
          if (data.pendingBalance > 0 && data.receivableAccountId) {
            await tx.transaction.create({
              data: {
                date: expense.date,
                transactionMode: 'CASH',
                type: 'DEBIT',
                amount: data.pendingBalance,
                accountId: data.receivableAccountId,
                category: 'GENERAL',
                referenceId: expense.id,
                description: `Pending Income Baki: ${expense.description}`
              }
            });
          }
        } else {
          // EXPENSE Mode processing
          for (const p of data.payments) {
            let isStaffAccount = false;
            if (p.mode === 'CASH' && p.accountId) {
              const acc = await tx.account.findUnique({ where: { id: p.accountId } });
              isStaffAccount = acc?.type === 'STAFF';
            }

            if (p.mode !== 'UGHRANI' && !isStaffAccount) {
              await checkSufficientBalance(tx, p.accountId, p.amount);
            }
            
            // If UGHRANI (vendor), we CREDIT them (meaning we owe them more).
            // If STAFF (using their Upad), we CREDIT them (meaning their Upad balance drops, they owe us less).
            // Otherwise (Firm Cash/Bank), we DEBIT them (money leaves the firm).
            const isCredit = p.mode === 'UGHRANI' || isStaffAccount;

            await tx.transaction.create({
              data: {
                date: expense.date,
                transactionMode: p.mode === 'UGHRANI' ? 'CASH' : p.mode,
                type: isCredit ? 'CREDIT' : 'DEBIT',
                amount: p.amount,
                accountId: p.accountId,
                category: 'EXPENSE',
                referenceId: expense.id,
                description: `Auto-Entry (${expense.expenseType === 'CAR_EXPENSE' ? 'Car Repair' : 'Office'}): ${expense.description}`
              }
            });
          }
        }
      } else if (expense.requestedAccountId && expense.requestedMode) {
        // Legacy fallback for old expenses
        if (expense.requestedMode !== 'UGHRANI') {
          await checkSufficientBalance(tx, expense.requestedAccountId, expense.amount);
        }
        await tx.transaction.create({
          data: {
            date: expense.date,
            transactionMode: expense.requestedMode === 'UGHRANI' ? 'CASH' : expense.requestedMode,
            type: expense.requestedMode === 'UGHRANI' ? 'CREDIT' : 'DEBIT',
            amount: expense.amount,
            accountId: expense.requestedAccountId,
            category: 'EXPENSE',
            referenceId: expense.id,
            description: `Auto-Entry (${expense.expenseType === 'CAR_EXPENSE' ? 'Car Repair' : 'Office'}): ${expense.description}`
          }
        });
      }

      if (expense.vehicleId) {
        await syncVehicleState(tx, expense.vehicleId);
      }
    }, { maxWait: 15000, timeout: 30000 });

    revalidatePath('/expenses');
    revalidatePath('/history');
    revalidatePath('/');
    revalidatePath('/profit');
    revalidatePath('/dashboard');
    revalidatePath('/rojmel');
    revalidatePath('/inventory');
    return { success: true };
  } catch (error) {
    console.error('Failed to approve expense:', error);
    return { success: false, error: error.message || 'Failed to approve expense.' };
  }
}

export async function rejectExpense(formData) {
  try {
    const session = await getSession();
    if (!session || session.role !== 'ADMIN') return { success: false, error: 'Unauthorized' };
    
    const expenseId = formData.get('expenseId');
    
    await prisma.$transaction(async (tx) => {
      const exp = await tx.expense.update({
        where: { id: expenseId },
        data: { status: 'REJECTED' }
      });
      if (exp.vehicleId) {
        await syncVehicleState(tx, exp.vehicleId);
      }
    }, { maxWait: 15000, timeout: 30000 });

    revalidatePath('/expenses');
    revalidatePath('/history');
    revalidatePath('/');
    revalidatePath('/profit');
    revalidatePath('/dashboard');
    return { success: true };
  } catch (error) {
    console.error('Failed to reject expense:', error);
    return { success: false, error: 'Failed to reject expense.' };
  }
}

export async function addTransfer(formData) {
  try {
    const session = await getSession();
    if (!session || session.role !== 'ADMIN') return { success: false, error: 'Unauthorized' };

    const amount = parseFloat((formData.get('amount') || '0').replace(/,/g, ''));
    const date = new Date(formData.get('date') || Date.now());
    const description = formData.get('description');
    
    const fromAccountId = formData.get('fromAccountId');
    const toAccountId = formData.get('toAccountId');

    if (!fromAccountId || !toAccountId || isNaN(amount) || amount <= 0) {
      return { success: false, error: 'Invalid transfer details' };
    }
    if (fromAccountId === toAccountId) {
      return { success: false, error: 'Cannot transfer to the same account' };
    }
    
    const fromAcc = await prisma.account.findUnique({ where: { id: fromAccountId } });
    const toAcc = await prisma.account.findUnique({ where: { id: toAccountId } });
    const transferRef = fromAcc && toAcc ? `${fromAcc.name} → ${toAcc.name}` : null;
    
    await prisma.$transaction(async (tx) => {
      // 1. DEBIT from the source account (Money OUT)
      await checkSufficientBalance(tx, fromAccountId, amount);
      
      await tx.transaction.create({
        data: {
          date,
          transactionMode: fromAcc.type === 'BANK' ? 'BANK' : 'CASH', 
          type: 'DEBIT',
          amount,
          accountId: fromAccountId,
          category: 'INTERNAL_TRANSFER',
          referenceId: transferRef,
          description: `Transfer Out: ${description}`
        }
      });

      // 2. CREDIT to the destination account (Money IN)
      await tx.transaction.create({
        data: {
          date,
          transactionMode: toAcc.type === 'BANK' ? 'BANK' : 'CASH',
          type: 'CREDIT',
          amount,
          accountId: toAccountId,
          category: 'INTERNAL_TRANSFER',
          referenceId: transferRef,
          description: `Transfer In: ${description}`
        }
      });
    }, { maxWait: 15000, timeout: 30000 });

    revalidatePath('/expenses');
    revalidatePath('/history');
    revalidatePath('/');
    revalidatePath('/profit');
    revalidatePath('/dashboard');
    revalidatePath('/accounts');
    revalidatePath('/rojmel');
    return { success: true };
  } catch (error) {
    console.error('Failed to add transfer:', error);
    return { success: false, error: 'Failed to complete transfer.' };
  }
}

export async function deleteExpense(expenseId, isRawTx = false) {
  try {
    const session = await getSession();
    if (!session || session.role !== 'ADMIN') return { success: false, error: 'Unauthorized' };

    await prisma.$transaction(async (tx) => {
      if (isRawTx) {
        const txToDelete = await tx.transaction.findUnique({ where: { id: expenseId } });
        if (txToDelete) {
          if (txToDelete.category === 'INTERNAL_TRANSFER') {
            // Delete DEBIT leg
            await tx.transaction.delete({ where: { id: expenseId } });
            
            // Delete matching CREDIT leg
            const matchingCredit = await tx.transaction.findFirst({
              where: {
                type: 'CREDIT',
                category: 'INTERNAL_TRANSFER',
                amount: txToDelete.amount,
                date: txToDelete.date,
                description: txToDelete.description.replace('Transfer Out:', 'Transfer In:')
              }
            });
            if (matchingCredit) {
              await tx.transaction.delete({ where: { id: matchingCredit.id } });
            }
          } else {
            // Delete standard raw transaction (e.g. VEHICLE_PURCHASE)
            
            // Reversal logic for dynamically linked entities
            if (txToDelete.referenceId) {
              const vehicle = await tx.vehicle.findUnique({ where: { id: txToDelete.referenceId }});
              if (vehicle) {
                // Smart Cascade for Partner Investment Delete
                const possibleLegs = await tx.transaction.findMany({
                    where: { 
                      referenceId: vehicle.id, 
                      amount: txToDelete.amount,
                      date: txToDelete.date
                    }
                });
                
                const leg1 = possibleLegs.find(t => t.category === 'GENERAL' && (t.description.includes('Partnership Investment') || t.description.includes('Paid Pending Investment Share')));
                const leg2 = possibleLegs.find(t => t.category === 'GENERAL' && (t.description.includes('Income: Received from') || t.description.includes('Received Pending Capital')));
                const leg3 = possibleLegs.find(t => t.category === 'VEHICLE_PURCHASE' && (t.description.includes('from Partner Capital') || (t.description.includes('Purchased car') && t.description.includes('Payment'))));

                if (leg1 && leg2 && leg3 && (txToDelete.id === leg1.id || txToDelete.id === leg2.id || txToDelete.id === leg3.id)) {
                    // Delete all 3 legs
                    await tx.transaction.deleteMany({
                        where: { id: { in: [leg1.id, leg2.id, leg3.id] } }
                    });

                    // Update Partnership table
                    const partnership = await tx.partnership.findFirst({
                        where: { vehicleId: vehicle.id, partnerAccountId: leg1.accountId }
                    });
                    if (partnership) {
                        const newPaidAmount = Math.max(0, Number(partnership.paidAmount) - Number(txToDelete.amount));
                        const isInitial = leg1.description.includes('Partnership Investment');
                        const newInvestmentAmount = isInitial ? Math.max(0, Number(partnership.investmentAmount) - Number(txToDelete.amount)) : partnership.investmentAmount;
                        
                        await tx.partnership.update({
                            where: { id: partnership.id },
                            data: {
                                paidAmount: newPaidAmount,
                                investmentAmount: newInvestmentAmount,
                                isInvestmentPaid: newPaidAmount >= newInvestmentAmount
                            }
                        });
                    }
                } else {
                    await tx.transaction.delete({ where: { id: expenseId } });
                }
                
                await syncVehicleState(tx, vehicle.id);
              }
            } else {
              await tx.transaction.delete({ where: { id: expenseId } });
            }
          }
        }
      } else {
        // Standard expense deletion
        const expToDelete = await tx.expense.findUnique({ where: { id: expenseId } });
        await tx.transaction.deleteMany({
          where: { referenceId: expenseId }
        });
        await tx.expense.delete({
          where: { id: expenseId }
        });
        
        if (expToDelete && expToDelete.vehicleId) {
            await syncVehicleState(tx, expToDelete.vehicleId);
        }
      }
    }, { maxWait: 15000, timeout: 30000 });

    revalidatePath('/expenses');
    revalidatePath('/history');
    revalidatePath('/');
    revalidatePath('/profit');
    revalidatePath('/dashboard');
    revalidatePath('/rojmel');
    revalidatePath('/inventory');
    return { success: true };
  } catch (error) {
    console.error('Failed to delete expense:', error);
    return { success: false, error: 'Failed to delete expense.' };
  }
}

export async function updateExpense(expenseId, data, isRawTx = false) {
  try {
    const session = await getSession();
    if (!session || session.role !== 'ADMIN') return { success: false, error: 'Unauthorized' };

    await prisma.$transaction(async (tx) => {
      if (isRawTx) {
        const txToUpdate = await tx.transaction.findUnique({ where: { id: expenseId } });
        if (txToUpdate) {
          if (txToUpdate.category === 'INTERNAL_TRANSFER') {
            // Update DEBIT leg
            await tx.transaction.update({
              where: { id: expenseId },
              data: {
                amount: Math.round(parseFloat(String(data.amount || '0').replace(/,/g, '')) * 100) / 100,
                date: new Date(data.date),
                description: `Transfer Out: ${data.description.replace(/^Transfer Out:\s*/, '')}`
              }
            });
            
            // Update matching CREDIT leg
            const matchingCredit = await tx.transaction.findFirst({
              where: {
                type: 'CREDIT',
                category: 'INTERNAL_TRANSFER',
                amount: txToUpdate.amount,
                date: txToUpdate.date,
                description: txToUpdate.description.replace('Transfer Out:', 'Transfer In:')
              }
            });
            if (matchingCredit) {
              await checkSufficientBalance(tx, txToUpdate.accountId, Math.round(parseFloat(String(data.amount || '0').replace(/,/g, '')) * 100) / 100, txToUpdate.id);
              await tx.transaction.update({
                where: { id: matchingCredit.id },
                data: {
                  amount: Math.round(parseFloat(String(data.amount || '0').replace(/,/g, '')) * 100) / 100,
                  date: new Date(data.date),
                  description: `Transfer In: ${data.description.replace(/^Transfer Out:\s*/, '').replace(/^Transfer In:\s*/, '')}`
                }
              });
            }
          } else {
            // Check if this is a Token Transaction
            if (txToUpdate.category === 'GENERAL' && txToUpdate.description.startsWith('Token Received:') && txToUpdate.referenceId) {
              const token = await tx.vehicleToken.findUnique({
                where: { id: txToUpdate.referenceId },
                include: { vehicle: true }
              });

              if (token) {
                if (token.status === 'APPLIED') {
                  throw new Error('Cannot edit this token because the vehicle has already been sold. Please adjust the vehicle\'s pending balance directly if needed.');
                }

                const newAmount = Math.round(parseFloat(String(data.amount || '0').replace(/,/g, '')) * 100) / 100;
                
                let newAccountId = token.paymentAccountId;
                let newPaymentMode = token.paymentMode;
                if (data.accountId && data.accountId !== txToUpdate.accountId) {
                  const newAcc = await tx.account.findUnique({ where: { id: data.accountId }});
                  if (newAcc) {
                    newAccountId = data.accountId;
                    newPaymentMode = newAcc.type === 'BANK' ? 'BANK' : 'CASH';
                  }
                }

                // 1. Sync the VehicleToken
                await tx.vehicleToken.update({
                  where: { id: token.id },
                  data: {
                    amount: newAmount,
                    paymentAccountId: newAccountId,
                    paymentMode: newPaymentMode
                  }
                });

                // 2. If FORFEITED, sync the corresponding firm INCOME Expense
                if (token.status === 'FORFEITED') {
                  const expenseMatches = await tx.expense.findMany({
                    where: { expenseType: 'INCOME' }
                  });
                  const targetExpense = expenseMatches.find(e => 
                    e.description.includes(token.customerName) &&
                    (e.description.includes(token.vehicle.registration || 'Unregistered') || e.description.includes('UNREG')) &&
                    Number(e.amount) === Number(token.amount)
                  );
                  if (targetExpense) {
                    await tx.expense.update({
                      where: { id: targetExpense.id },
                      data: {
                        amount: newAmount,
                        requestedAccountId: newAccountId,
                        requestedMode: newPaymentMode
                      }
                    });
                  }
                }
              }
            }

            // Update standard raw transaction (e.g. VEHICLE_PURCHASE or the Token Transaction itself)
            const updateData = {
              amount: Math.round(parseFloat(String(data.amount || '0').replace(/,/g, '')) * 100) / 100,
              date: new Date(data.date),
              description: data.description
            };
            if (txToUpdate.type === 'DEBIT') {
              const checkAccountId = data.accountId || txToUpdate.accountId;
              if (checkAccountId) {
                await checkSufficientBalance(tx, checkAccountId, updateData.amount, txToUpdate.id);
              }
            }
            if (data.accountId && data.accountId !== txToUpdate.accountId) {
              const newAcc = await tx.account.findUnique({ where: { id: data.accountId }});
              if (newAcc) {
                updateData.accountId = data.accountId;
                updateData.transactionMode = newAcc.type === 'BANK' ? 'BANK' : 'CASH';
              }
            }
            
            // If it's a direct firm vehicle purchase, sync the difference to the vehicle's purchase price
            if (txToUpdate.category === 'VEHICLE_PURCHASE' && txToUpdate.referenceId && !txToUpdate.description.includes('Partner')) {
               const diff = updateData.amount - txToUpdate.amount;
               if (diff !== 0) {
                 const vehicle = await tx.vehicle.findUnique({ where: { id: txToUpdate.referenceId }});
                 if (vehicle) {
                   await tx.vehicle.update({
                     where: { id: vehicle.id },
                     data: { purchasePrice: vehicle.purchasePrice + diff }
                   });
                 }
               }
            }
            
            // If it's a vehicle sale payment, sync the difference to the vehicle's salePrice and profit
            if (txToUpdate.category === 'VEHICLE_SALE' && txToUpdate.referenceId && txToUpdate.description.includes('Auto-Entry: Sold')) {
               const diff = updateData.amount - txToUpdate.amount;
               if (diff !== 0) {
                 const vehicle = await tx.vehicle.findUnique({ where: { id: txToUpdate.referenceId }});
                 if (vehicle) {
                   await tx.vehicle.update({
                     where: { id: vehicle.id },
                     data: { 
                       salePrice: (vehicle.salePrice || 0) + diff,
                       profit: (vehicle.profit || 0) + diff
                     }
                   });
                 }
               }
            }
            
            let isPartnerInvestment = false;
            let partnerLegs = [];
            
            if (txToUpdate.referenceId) {
                const extractPaymentSuffix = (desc) => {
                  const match = desc.match(/- Payment (\d+)$/);
                  return match ? match[0] : '';
                };
                const suffix = extractPaymentSuffix(txToUpdate.description);
                
                const possibleLegs = await tx.transaction.findMany({
                    where: { 
                      referenceId: txToUpdate.referenceId, 
                      amount: txToUpdate.amount,
                      description: { contains: suffix }
                    }
                });
                
                const leg1 = possibleLegs.find(t => t.category === 'GENERAL' && (t.description.includes('Partnership Capital Investment') || t.description.includes('Paid Pending Investment Share') || t.description.includes('Partnership Investment')));
                const leg2 = possibleLegs.find(t => t.category === 'GENERAL' && (t.description.includes('Income: Received from') || t.description.includes('Received Pending Capital')));
                const leg3 = possibleLegs.find(t => t.category === 'VEHICLE_PURCHASE' && (t.description.includes('from Partner Capital') || (t.description.includes('Purchased car') && t.description.includes('Payment'))));
                
                if (leg1 && leg2 && leg3 && (txToUpdate.id === leg1.id || txToUpdate.id === leg2.id || txToUpdate.id === leg3.id)) {
                    isPartnerInvestment = true;
                    partnerLegs = [leg1, leg2, leg3];
                }
            }

            if (isPartnerInvestment) {
                for (const leg of partnerLegs) {
                    await tx.transaction.update({
                        where: { id: leg.id },
                        data: { amount: updateData.amount, date: updateData.date }
                    });
                }
                
                await tx.transaction.update({
                    where: { id: expenseId },
                    data: updateData
                });
                
                const leg1 = partnerLegs.find(t => t.category === 'GENERAL' && (t.description.includes('Partnership Investment') || t.description.includes('Paid Pending Investment Share')));
                const partnership = await tx.partnership.findFirst({
                    where: { vehicleId: txToUpdate.referenceId, partnerAccountId: leg1.accountId }
                });
                
                if (partnership) {
                    const diff = Number(updateData.amount) - Number(txToUpdate.amount);
                    const isInitial = leg1.description.includes('Partnership Investment');
                    const newPaid = Number(partnership.paidAmount) + diff;
                    const newInvestment = isInitial ? Number(partnership.investmentAmount) + diff : partnership.investmentAmount;
                    
                    await tx.partnership.update({
                        where: { id: partnership.id },
                        data: {
                            paidAmount: newPaid,
                            investmentAmount: newInvestment,
                            isInvestmentPaid: newPaid >= newInvestment
                        }
                    });
                }
            } else {
                await tx.transaction.update({
                    where: { id: expenseId },
                    data: updateData
                });
            }
              
            if (txToUpdate.referenceId) {
                await syncVehicleState(tx, txToUpdate.referenceId);
            }
          }
        }
      } else {
        // Standard expense update
        const expToUpdate = await tx.expense.findUnique({ where: { id: expenseId }});
        
        console.log("UPDATE_EXPENSE DEBUG - Checking token logic");
                if (expToUpdate.description && expToUpdate.description.startsWith('Forfeited Token Income:')) {
          console.log("UPDATE_EXPENSE DEBUG - Inside token if block");
          const tokens = await tx.vehicleToken.findMany({
             where: { status: 'FORFEITED' },
             include: { vehicle: true }
          });
          console.log("UPDATE_EXPENSE DEBUG - Tokens found:", tokens.length);
          
          const matchedToken = tokens.find(t => 
            expToUpdate.description.includes(t.customerName) &&
            expToUpdate.description.includes(`(Ref: ${t.vehicle.make} ${t.vehicle.registration})`)
          );
          
          console.log("UPDATE_EXPENSE DEBUG - Matched Token:", matchedToken ? matchedToken.id : 'null');

          if (matchedToken) {
            const newAmount = Math.round(parseFloat(String(data.amount || '0').replace(/,/g, '')) * 100) / 100;
            const newCustomerName = data.customerName || matchedToken.customerName;
            
            // 1. Update the VehicleToken
            await tx.vehicleToken.update({
               where: { id: matchedToken.id },
               data: { 
                 amount: newAmount, 
                 customerName: newCustomerName,
                 customerMobile: data.customerMobile || matchedToken.customerMobile
               }
            });

            // 2. Update the Expense record
            const updateData = {
              amount: newAmount,
              date: new Date(data.date),
              description: `Forfeited Token Income: ${newCustomerName} (Ref: ${matchedToken.vehicle.make} ${matchedToken.vehicle.registration})`,
              customerName: newCustomerName,
              customerMobile: data.customerMobile || null
            };

            if (data.accountId && data.accountId !== expToUpdate.requestedAccountId) {
              const newAcc = await tx.account.findUnique({ where: { id: data.accountId }});
              if (newAcc) {
                updateData.requestedAccountId = data.accountId;
                updateData.requestedMode = newAcc.type === 'BANK' ? 'BANK' : 'CASH';
              }
            }

            await tx.expense.update({
              where: { id: expenseId },
              data: updateData
            });

            // 3. Update the Transaction linked to the Token
            const tokenTxs = await tx.transaction.findMany({ where: { referenceId: matchedToken.id } });
            if (tokenTxs.length === 1) {
              const txUpdateData = {
                amount: newAmount,
                date: new Date(data.date),
                description: `Token Received: ${newCustomerName} for ${matchedToken.vehicle.make} ${matchedToken.vehicle.model} (${matchedToken.vehicle.registration || 'UNREG'})`
              };
              if (updateData.requestedAccountId) {
                txUpdateData.accountId = updateData.requestedAccountId;
                txUpdateData.transactionMode = updateData.requestedMode;
              }
              await tx.transaction.update({
                where: { id: tokenTxs[0].id },
                data: txUpdateData
              });
            }
            return; // Finished token sync
          }
        }

        const updateData = {
          amount: Math.round(parseFloat(String(data.amount || '0').replace(/,/g, '')) * 100) / 100,
          date: new Date(data.date),
          description: data.description,
          vehicleId: data.vehicleId || null,
          customerName: data.customerName || null,
          customerMobile: data.customerMobile || null
        };
        if (data.accountId) {
          const newAcc = await tx.account.findUnique({ where: { id: data.accountId }});
          if (newAcc) {
            let modeStr = newAcc.type === 'BANK' ? 'BANK' : newAcc.type === 'UGHRANI' ? 'UGHRANI' : 'CASH';
            
            // Check if existing requestedMode is a JSON string
            if (expToUpdate.requestedMode && expToUpdate.requestedMode.startsWith('{')) {
              try {
                const parsed = JSON.parse(expToUpdate.requestedMode);
                if (parsed.payments && parsed.payments.length === 1) {
                  parsed.payments[0].accountId = data.accountId;
                  parsed.payments[0].mode = modeStr;
                  parsed.payments[0].amount = updateData.amount;
                  updateData.requestedMode = JSON.stringify(parsed);
                }
              } catch(e) {}
            } else {
              updateData.requestedAccountId = data.accountId;
              updateData.requestedMode = modeStr;
            }
          }
        }
        await tx.expense.update({
          where: { id: expenseId },
          data: updateData
        });
        
        if (expToUpdate.vehicleId) {
          await syncVehicleState(tx, expToUpdate.vehicleId);
        }
        
        // Sync VehicleToken if this is a forfeited token income
        if (expToUpdate.description && expToUpdate.description.startsWith('Auto-Forfeited Token Income:')) {
          const match = expToUpdate.description.match(/Auto-Forfeited Token Income: (.*?) \(Ref:/);
          if (match) {
            const customerName = match[1];
            // Find the forfeited token that matches the vehicle and customer
            const tokenToUpdate = await tx.vehicleToken.findFirst({
              where: { 
                vehicleId: expToUpdate.vehicleId, 
                customerName: customerName,
                status: 'FORFEITED' 
              }
            });
            if (tokenToUpdate) {
               await tx.vehicleToken.update({
                 where: { id: tokenToUpdate.id },
                 data: { amount: updateData.amount }
               });
            }
          }
        }
        
        const txs = await tx.transaction.findMany({ where: { referenceId: expenseId } });
        if (txs.length === 1) {
          const txUpdateData = {
            amount: Math.round(parseFloat(String(data.amount || '0').replace(/,/g, '')) * 100) / 100,
            date: new Date(data.date),
            description: `Auto-Entry: ${data.description}`
          };
          if (updateData.requestedMode && !updateData.requestedMode.startsWith('{')) {
            txUpdateData.accountId = updateData.requestedAccountId;
            txUpdateData.transactionMode = updateData.requestedMode;
          } else if (updateData.requestedMode && updateData.requestedMode.startsWith('{')) {
            const parsed = JSON.parse(updateData.requestedMode);
            if (parsed.payments && parsed.payments.length === 1) {
              txUpdateData.accountId = parsed.payments[0].accountId;
              txUpdateData.transactionMode = parsed.payments[0].mode === 'UGHRANI' ? 'CASH' : parsed.payments[0].mode;
              if (expToUpdate.expenseType !== 'INCOME') {
                txUpdateData.type = parsed.payments[0].mode === 'UGHRANI' ? 'CREDIT' : 'DEBIT';
              }
            }
          }
          if (txs[0].type === 'DEBIT' && txUpdateData.type !== 'CREDIT') {
             await checkSufficientBalance(tx, txUpdateData.accountId || txs[0].accountId, txUpdateData.amount, txs[0].id);
          }
          await tx.transaction.update({
            where: { id: txs[0].id },
            data: txUpdateData
          });
        } else if (txs.length > 1) {
          for (const t of txs) {
            await tx.transaction.update({
              where: { id: t.id },
              data: { date: new Date(data.date) }
            });
          }
        }
      }
    }, { maxWait: 15000, timeout: 30000 });

    revalidatePath('/expenses');
    revalidatePath('/history');
    revalidatePath('/');
    revalidatePath('/profit');
    revalidatePath('/dashboard');
    revalidatePath('/rojmel');
    revalidatePath('/inventory');
    return { success: true };
  } catch (error) {
    console.error('Failed to update expense:', error);
    return { success: false, error: 'Failed to update expense.' };
  }
}

