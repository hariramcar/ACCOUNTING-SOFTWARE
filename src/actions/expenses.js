'use server';

import prisma from '@/lib/prisma';
import { revalidatePath } from 'next/cache';
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
      orderBy: { date: 'desc' },
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
            { description: { in: ['Opening Balance', 'Capital Introduced / Opening Balance'] } },
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
        orderBy: { date: 'desc' },
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
      else if (tx.category === 'VEHICLE_PURCHASE') expType = 'CAR_EXPENSE';
      else if (tx.category === 'INTERNAL_TRANSFER' || tx.category === 'UPAD_WITHDRAWAL' || tx.category === 'UPAD_REPAYMENT') expType = 'ADVANCE';

      return {
        id: tx.id,
        amount: finalAmount,
        date: tx.date,
        description: tx.description,
        expenseType: expType,
        status: 'APPROVED',
        vehicle: null,
        transferDetails: (tx.category === 'INTERNAL_TRANSFER' || tx.category === 'UPAD_WITHDRAWAL' || tx.category === 'UPAD_REPAYMENT') ? tx.referenceId : null,
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
          // If it's not valid JSON, leave it as is
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
    const amount = Math.round(parseFloat(formData.get('amount')) * 100) / 100 || 0;
    const date = new Date(formData.get('date') || Date.now());
    
    const vehicleId = formData.get('vehicleId'); // Optional, only if CAR_EXPENSE
    
    // Auto-ledger parameters (Expense)
    let accountId = formData.get('accountId') || null;
    let mode = formData.get('mode') || null;

    if (isStaff) {
      if (mode === 'UGHRANI') {
        // Allow them to use Market Place account. mode and accountId from form are kept.
      } else {
        // If not UGHRANI, force it to be CASH from their own advance
        accountId = dbUser.accountId;
        mode = 'CASH';
      }
    }

    // Advanced parameters (Income)
    const paymentModes = formData.getAll('paymentModes');
    const paymentAccountIds = formData.getAll('paymentAccountIds');
    const paymentAmounts = formData.getAll('paymentAmounts');
    const receivableAccountId = formData.get('receivableAccountId');

    let incomeDataStr = null;
    if (expenseType === 'INCOME') {
      const payments = [];
      let totalPaid = 0;
      for (let i = 0; i < paymentModes.length; i++) {
        const amt = Math.round(parseFloat(paymentAmounts[i]) * 100) / 100 || 0;
        if (paymentModes[i] && paymentAccountIds[i] && amt > 0) {
          payments.push({
            mode: paymentModes[i],
            accountId: paymentAccountIds[i],
            amount: amt
          });
          totalPaid += amt;
        }
      }
      incomeDataStr = JSON.stringify({
        payments,
        receivableAccountId,
        pendingBalance: amount - totalPaid
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
          status,
          requestedAccountId: expenseType === 'INCOME' ? null : accountId,
          requestedMode: expenseType === 'INCOME' ? incomeDataStr : mode,
          submittedById: userId
        }
      });

      // 2. Auto-Deduct/Add from Rojmel (ONLY if Admin directly adds it, or if no approval needed)
      if (status === 'APPROVED') {
        if (expenseType === 'INCOME') {
          if (incomeDataStr) {
            const data = JSON.parse(incomeDataStr);
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
          }
        } else if (accountId && mode) {
          await tx.transaction.create({
            data: {
              date,
              transactionMode: mode === 'UGHRANI' ? 'CASH' : mode,
              type: mode === 'UGHRANI' ? 'CREDIT' : 'DEBIT',
              amount,
              accountId,
              category: 'EXPENSE',
              referenceId: expense.id,
              description: `Auto-Entry (${expenseType === 'CAR_EXPENSE' ? 'Car Repair' : 'Office'}): ${description}`
            }
          });
        }
      }
    }, { maxWait: 15000, timeout: 30000 });

    revalidatePath('/expenses');
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

      if (expense.expenseType === 'INCOME') {
        if (expense.requestedMode) {
          const data = JSON.parse(expense.requestedMode);
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
        }
      } else if (expense.requestedAccountId && expense.requestedMode) {
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
    });

    revalidatePath('/expenses');
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
    
    await prisma.expense.update({
      where: { id: expenseId },
      data: { status: 'REJECTED' }
    });

    revalidatePath('/expenses');
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
    });

    revalidatePath('/expenses');
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
                // If it's a vehicle purchase payment, deleting it means we didn't pay the seller!
                // So the amount we owe the seller (pending balance) increases!
                if (txToDelete.category === 'VEHICLE_PURCHASE' && txToDelete.type === 'DEBIT') {
                  await tx.vehicle.update({
                    where: { id: vehicle.id },
                    data: { purchasePendingBalance: Number(vehicle.purchasePendingBalance) + Number(txToDelete.amount) }
                  });
                }
                
                // If it's a partner capital payment to the firm, deleting it means they haven't paid!
                // So the paidAmount in the Partnership decreases!
                if (txToDelete.category === 'GENERAL' && txToDelete.type === 'CREDIT' && 
                   (txToDelete.description.includes('Capital Received from Partner') || 
                    txToDelete.description.includes('Paid Pending Investment Share'))) {
                  
                  const partnership = await tx.partnership.findFirst({
                    where: { vehicleId: vehicle.id, partnerAccountId: txToDelete.accountId }
                  });
                  
                  if (partnership) {
                    const newPaidAmount = Math.max(0, Number(partnership.paidAmount) - Number(txToDelete.amount));
                    await tx.partnership.update({
                      where: { id: partnership.id },
                      data: { 
                        paidAmount: newPaidAmount,
                        isInvestmentPaid: newPaidAmount >= Number(partnership.investmentAmount)
                      }
                    });
                  }
                  
                  // Also, if there's a matching pass-through DEBIT (Paid to Seller from Partner Capital), delete it too
                  if (txToDelete.description.includes('Capital Received from Partner') || txToDelete.description.includes('Received Pending Capital from')) {
                     await tx.transaction.deleteMany({
                       where: {
                         referenceId: vehicle.id,
                         category: 'VEHICLE_PURCHASE',
                         type: 'DEBIT',
                         amount: txToDelete.amount,
                         description: { contains: 'Paid to Seller (from Partner Capital)' }
                       }
                     });
                     // And since we deleted a pass-through DEBIT (payment to seller), we must ALSO increase pending balance
                     await tx.vehicle.update({
                       where: { id: vehicle.id },
                       data: { purchasePendingBalance: Number(vehicle.purchasePendingBalance) + Number(txToDelete.amount) }
                     });
                  }
                }
              }
            }
            
            await tx.transaction.delete({ where: { id: expenseId } });
          }
        }
      } else {
        // Standard expense deletion
        await tx.transaction.deleteMany({
          where: { referenceId: expenseId }
        });
        await tx.expense.delete({
          where: { id: expenseId }
        });
      }
    });

    revalidatePath('/expenses');
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
                amount: Math.round(parseFloat(data.amount) * 100) / 100,
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
              await tx.transaction.update({
                where: { id: matchingCredit.id },
                data: {
                  amount: Math.round(parseFloat(data.amount) * 100) / 100,
                  date: new Date(data.date),
                  description: `Transfer In: ${data.description.replace(/^Transfer Out:\s*/, '').replace(/^Transfer In:\s*/, '')}`
                }
              });
            }
          } else {
            // Update standard raw transaction (e.g. VEHICLE_PURCHASE)
            const updateData = {
              amount: Math.round(parseFloat(data.amount) * 100) / 100,
              date: new Date(data.date),
              description: data.description
            };
            if (data.accountId && data.accountId !== txToUpdate.accountId) {
              const newAcc = await tx.account.findUnique({ where: { id: data.accountId }});
              if (newAcc) {
                updateData.accountId = data.accountId;
                updateData.transactionMode = newAcc.type === 'BANK' ? 'BANK' : 'CASH';
              }
            }
            await tx.transaction.update({
              where: { id: expenseId },
              data: updateData
            });
          }
        }
      } else {
        // Standard expense update
        const expToUpdate = await tx.expense.findUnique({ where: { id: expenseId }});
        const updateData = {
          amount: Math.round(parseFloat(data.amount) * 100) / 100,
          date: new Date(data.date),
          description: data.description
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
        
        const txs = await tx.transaction.findMany({ where: { referenceId: expenseId } });
        if (txs.length === 1) {
          const txUpdateData = {
            amount: Math.round(parseFloat(data.amount) * 100) / 100,
            date: new Date(data.date),
            description: `Auto-Entry: ${data.description}`
          };
          if (updateData.requestedAccountId) {
            txUpdateData.accountId = updateData.requestedAccountId;
            txUpdateData.transactionMode = updateData.requestedMode;
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
    });

    revalidatePath('/expenses');
    revalidatePath('/rojmel');
    revalidatePath('/inventory');
    return { success: true };
  } catch (error) {
    console.error('Failed to update expense:', error);
    return { success: false, error: 'Failed to update expense.' };
  }
}

