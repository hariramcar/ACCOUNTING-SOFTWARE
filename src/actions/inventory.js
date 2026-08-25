'use server';

import prisma from '@/lib/prisma';
import { revalidatePath } from 'next/cache';
import { checkSufficientBalance } from '@/lib/balanceCheck';

export async function getInventory(year, month) {
  try {
    let startDate, endDate;
    if (year !== undefined && month !== undefined) {
      startDate = new Date(year, month, 1);
      endDate = new Date(year, month + 1, 0, 23, 59, 59, 999);
    } else {
      const d = new Date();
      startDate = new Date(d.getFullYear(), d.getMonth(), 1);
      endDate = new Date(d.getFullYear(), d.getMonth() + 1, 0, 23, 59, 59, 999);
    }

    // 1. Fetch vehicles relevant to this specific month
    const vehicles = await prisma.vehicle.findMany({
      where: {
        purchaseDate: { lte: endDate },
        OR: [
          { status: 'IN_STOCK' },
          {
            status: 'SOLD',
            saleDate: { gte: startDate }
          }
        ]
      },
      orderBy: { createdAt: 'desc' },
      include: {
        expenses: true,
        partnerships: { include: { partnerAccount: true } },
        receivableAccount: true,
        payableAccount: true,
        tokens: true
      }
    });

    // 2. Fetch all current stock unconditionally for the Sell Modal
    const rawAllCurrentStock = await prisma.vehicle.findMany({
      where: { status: 'IN_STOCK' },
      orderBy: { createdAt: 'desc' },
      include: {
        expenses: true,
        partnerships: { include: { partnerAccount: true } },
        receivableAccount: true,
        payableAccount: true,
        tokens: true
      }
    });

    const allVehicleIds = [...new Set([...vehicles.map(v => v.id), ...rawAllCurrentStock.map(v => v.id)])];
    const saleTransactions = await prisma.transaction.findMany({
      where: {
        referenceId: { in: allVehicleIds },
        category: 'VEHICLE_SALE'
      },
      include: { account: true }
    });

    const purchaseTransactions = await prisma.transaction.findMany({
      where: {
        referenceId: { in: allVehicleIds },
        category: 'VEHICLE_PURCHASE'
      },
      include: { account: true }
    });

    const profitPayouts = await prisma.transaction.findMany({
      where: {
        referenceId: { in: allVehicleIds },
        category: 'GENERAL',
        type: 'DEBIT',
        description: { contains: 'Paid Full Settlement' }
      },
      include: { account: true }
    });

    const partnerTransactions = await prisma.transaction.findMany({
      where: {
        referenceId: { in: allVehicleIds },
        category: 'GENERAL',
        type: 'CREDIT',
        OR: [
          { description: { contains: 'Income: Received from' } },
          { description: { contains: 'Received Pending Capital from' } }
        ]
      },
      include: { account: true }
    });

    const processVehicle = (v) => {
      const totalExpenses = v.expenses.reduce((sum, exp) => sum + Number(exp.amount), 0);
      const legacyExp = Number(v.legacyExpenses || 0);
      const totalCost = Number(v.purchasePrice) + totalExpenses + legacyExp;
      return {
        ...v,
        legacyExpenses: legacyExp,
        purchasePrice: Number(v.purchasePrice),
        purchasePendingBalance: Number(v.purchasePendingBalance),
        salePrice: v.salePrice ? Number(v.salePrice) : null,
        profit: v.profit ? Number(v.profit) : null,
        totalExpenses,
        totalCost,
        expenses: v.expenses.map(exp => ({ ...exp, amount: Number(exp.amount) })),
        partnerships: v.partnerships.map(p => ({
          ...p,
          investmentAmount: Number(p.investmentAmount),
          profitSharePercentage: Number(p.profitSharePercentage),
          paidAmount: v.isLegacy ? Number(p.investmentAmount) : Number(p.paidAmount || 0),
          partnerAccount: p.partnerAccount ? {
            ...p.partnerAccount,
            openingBalance: Number(p.partnerAccount.openingBalance),
            profitShare: Number(p.partnerAccount.profitShare || 0)
          } : null
        })),
        salePendingBalance: Number(v.salePendingBalance || 0),
        receivableAccount: v.receivableAccount ? { ...v.receivableAccount, openingBalance: Number(v.receivableAccount.openingBalance), profitShare: Number(v.receivableAccount.profitShare || 0) } : null,
        payableAccount: v.payableAccount ? { ...v.payableAccount, openingBalance: Number(v.payableAccount.openingBalance), profitShare: Number(v.payableAccount.profitShare || 0) } : null,
        saleTransactions: saleTransactions.filter(t => t.referenceId === v.id).map(t => ({
          ...t,
          amount: Number(t.amount),
          accountName: t.account ? t.account.name : null,
          account: t.account ? { ...t.account, openingBalance: Number(t.account.openingBalance), profitShare: Number(t.account.profitShare || 0) } : null
        })),
        purchaseTransactions: purchaseTransactions.filter(t => t.referenceId === v.id).map(t => ({
          ...t,
          amount: Number(t.amount),
          accountName: t.account ? t.account.name : null,
          account: t.account ? { ...t.account, openingBalance: Number(t.account.openingBalance), profitShare: Number(t.account.profitShare || 0) } : null
        })),
        partnerTransactions: partnerTransactions.filter(t => t.referenceId === v.id).map(t => ({
          id: t.id,
          amount: Number(t.amount),
          accountName: t.account ? t.account.name : null,
          transactionMode: t.transactionMode,
          description: t.description
        })),
        profitPayouts: profitPayouts.filter(t => t.referenceId === v.id).map(t => ({
          id: t.id,
          amount: Number(t.amount),
          accountName: t.account ? t.account.name : null,
          transactionMode: t.transactionMode,
          description: t.description
        })),
        tokens: v.tokens ? v.tokens.map(t => ({
          ...t,
          amount: Number(t.amount),
          agreedSalePrice: t.agreedSalePrice ? Number(t.agreedSalePrice) : null
        })) : []
      };
    };

    const processed = vehicles.map(processVehicle);
    const allCurrentStock = rawAllCurrentStock.map(processVehicle);

    const soldThisMonth = [];
    const inStockThisMonth = [];

    processed.forEach(v => {
      if (v.status === 'SOLD' && v.saleDate >= startDate && v.saleDate <= endDate) {
        soldThisMonth.push(v);
      } else {
        inStockThisMonth.push(v);
      }
    });

    return {
      success: true,
      inStock: inStockThisMonth,
      sold: soldThisMonth,
      allCurrentStock
    };
  } catch (error) {
    console.error('Failed to load inventory:', error);
    return { success: false, error: 'Failed to load inventory.' };
  }
}

export async function addVehicle(formData) {
  try {
    const rawData = {
      make: formData.get('make'),
      model: formData.get('model'),
      registration: formData.get('registration'),
      purchasePrice: formData.get('purchasePrice'),
      purchaseDate: formData.get('purchaseDate'),
      isLegacy: formData.get('isLegacy') === 'on',
      legacyExpenses: formData.get('legacyExpenses'),
    };

    const { ZodError } = await import('zod');
    const { AddVehicleSchema } = await import('@/lib/validations');
    const { toDecimal, math } = await import('@/lib/math');

    let parsed;
    try {
      parsed = AddVehicleSchema.parse(rawData);
    } catch (err) {
      if (err instanceof ZodError) {
        return { success: false, error: (err.issues || err.errors)?.map(e => e.message).join(', ') || 'Validation failed' };
      }
      throw err;
    }

    const { make, model, registration, purchasePrice, purchaseDate, isLegacy, legacyExpenses } = parsed;

    const receivedDocsJson = formData.get('receivedDocsJson');
    let receivedDocs = [];
    if (receivedDocsJson) {
      try {
        receivedDocs = JSON.parse(receivedDocsJson);
      } catch (e) {
        console.error('Failed to parse receivedDocsJson:', e);
      }
    }

    const firmPaymentsJson = formData.get('firmPaymentsJson');
    let firmPayments = [];
    if (firmPaymentsJson) {
      try {
        firmPayments = JSON.parse(firmPaymentsJson);
      } catch (e) {
        console.error('Failed to parse firmPaymentsJson:', e);
        return { success: false, error: 'Internal system error: Invalid payment data format. Please refresh and try again.' };
      }
    }

    if (registration) {
      const existing = await prisma.vehicle.findFirst({
        where: {
          registration: {
            equals: registration,
            mode: 'insensitive'
          }
        }
      });
      if (existing) {
        if (existing.status === 'IN_STOCK') {
          return { success: false, error: 'This registration number is already in stock.' };
        } else {
          return { success: false, error: 'This vehicle was previously sold. Cannot re-add the exact same registration.' };
        }
      }
    }

    const partnerAccountId = formData.get('partnerAccountId');
    const partnerInvestment = toDecimal(formData.get('partnerInvestment')).toNumber();
    const profitSharePercentage = toDecimal(formData.get('profitSharePercentage')).toNumber();

    const partnerPaid1Amount = toDecimal(formData.get('partnerPaid1Amount')).toNumber();
    const partnerPayment1Mode = formData.get('partnerPayment1Mode') || null;
    const partnerPayment1AccountId = formData.get('partnerPayment1AccountId') || null;

    const partnerPaid2Amount = toDecimal(formData.get('partnerPaid2Amount')).toNumber();
    const partnerPayment2Mode = formData.get('partnerPayment2Mode') || null;
    const partnerPayment2AccountId = formData.get('partnerPayment2AccountId') || null;
    
    const partnerTotalPaid = math.add(partnerPaid1Amount, partnerPaid2Amount);

    const payableAccountId = formData.get('payableAccountId');
    
    const firmPaymentsTotal = math.sum(firmPayments.map(p => p.amount));
    const totalPaidOrInvested = math.add(firmPaymentsTotal, partnerInvestment);
    if (totalPaidOrInvested > purchasePrice) {
      return { success: false, error: 'Your payment amount cannot be greater than your expense amount (purchase price).' };
    }
    
    const pendingAmount = math.sub(purchasePrice, totalPaidOrInvested);

    // Strict validation for missing accounts and agent balances
    for (const p of firmPayments) {
      if (p.amount > 0 && !p.accountId) {
        return { success: false, error: 'Please select an account for all entered payments.' };
      }
      
      if (p.mode === 'AGENT' && p.accountId && p.amount > 0) {
        const agentAcc = await prisma.account.findUnique({ 
          where: { id: p.accountId },
          include: { transactions: true }
        });
        
        if (agentAcc && (agentAcc.type === 'DSA_AGENT' || agentAcc.type === 'FINANCIER')) {
          // Validation removed as per user request: Allow agents to go negative (we owe them) when buying a new car.
        }
      }
    }
    if (partnerPaid1Amount > 0 && !partnerPayment1AccountId) {
      return { success: false, error: 'Please select an account for Partner Payment 1.' };
    }
    if (partnerPaid2Amount > 0 && !partnerPayment2AccountId) {
      return { success: false, error: 'Please select an account for Partner Payment 2.' };
    }

    let partnerName = 'Partner';
    if (partnerAccountId) {
      const pAcc = await prisma.account.findUnique({ where: { id: partnerAccountId } });
      if (pAcc) partnerName = pAcc.name;
    }

    await prisma.$transaction(async (tx) => {
      const vehicle = await tx.vehicle.create({
        data: {
          make,
          model,
          registration,
          purchasePrice,
          purchaseDate,
          purchasePendingBalance: isLegacy ? 0 : (pendingAmount > 0 ? pendingAmount : 0),
          payableAccountId: (!isLegacy && payableAccountId && pendingAmount > 0) ? payableAccountId : null,
          status: 'IN_STOCK',
          isLegacy,
          legacyExpenses,
          receivedDocs
        }
      });

      // Handle Firm Payments (Suppress cash deduction for legacy cars)
      if (!isLegacy) {
        for (let i = 0; i < firmPayments.length; i++) {
          const p = firmPayments[i];
          if (p.accountId && p.mode && p.amount > 0) {
            await checkSufficientBalance(tx, p.accountId, p.amount);
            const pAcc = await tx.account.findUnique({ where: { id: p.accountId } });
            const isInternal = pAcc && pAcc.type !== 'CASH' && pAcc.type !== 'BANK';
            await tx.transaction.create({
              data: {
                date: purchaseDate,
                transactionMode: isInternal ? (p.agentPaymentMode || 'CASH') : p.mode,
                type: isInternal ? 'CREDIT' : 'DEBIT', // Agent pays on our behalf -> We owe them more / they owe us less (CREDIT). Firm pays -> Firm balance decreases (DEBIT)
                amount: p.amount,
                accountId: p.accountId,
                category: 'VEHICLE_PURCHASE',
                referenceId: vehicle.id,
                description: `Expense: Purchased car ${make} ${model} (${registration || 'Unregistered'}) - Firm Payment ${i + 1}${isInternal ? ' (Paid by Agent/Financier)' : ''}`
              }
            });
          }
        }
      }

      // Handle Pending Payable (Udhari)
      if (!isLegacy && payableAccountId && pendingAmount > 0) {
        await tx.transaction.create({
          data: {
            date: purchaseDate,
            transactionMode: 'CASH', // Internal ledger entry
            type: 'CREDIT', // Credit increases their balance (we owe them more)
            amount: pendingAmount,
            accountId: payableAccountId,
            category: 'VEHICLE_PURCHASE',
            referenceId: vehicle.id,
            description: `Auto-Entry: Pending Udhari for ${make} ${model} (${registration || 'Unregistered'})`
          }
        });
      }

      // Handle Partnership
      if (partnerAccountId && partnerInvestment > 0) {
        
        let investmentModeStr = 'PENDING';
        if (partnerPaid1Amount > 0 && partnerPaid2Amount > 0) {
           investmentModeStr = 'MULTIPLE';
        } else if (partnerPaid1Amount > 0) {
           investmentModeStr = partnerPayment1Mode;
        } else if (partnerPaid2Amount > 0) {
           investmentModeStr = partnerPayment2Mode;
        }
        
        await tx.partnership.create({
          data: {
            vehicleId: vehicle.id,
            partnerAccountId: partnerAccountId,
            investmentAmount: partnerInvestment,
            profitSharePercentage: profitSharePercentage,
            investmentMode: investmentModeStr,
            isInvestmentPaid: isLegacy ? true : (partnerTotalPaid >= partnerInvestment),
            paidAmount: isLegacy ? partnerInvestment : (partnerTotalPaid > 0 ? partnerTotalPaid : 0)
          }
        });

        // Credit the Partner's Ledger for their capital investment
        if (partnerPayment1Mode && partnerPaid1Amount > 0) {
          await tx.transaction.create({
            data: {
              date: purchaseDate,
              transactionMode: 'CASH', // Internal ledger mode
              type: 'CREDIT',
              amount: partnerPaid1Amount,
              accountId: partnerAccountId,
              category: 'GENERAL',
              referenceId: vehicle.id,
              description: `Auto-Entry: Partnership Capital Investment for ${make} ${model} (${registration || 'Unregistered'}) - Payment 1`
            }
          });
        }
        if (partnerPayment2Mode && partnerPaid2Amount > 0) {
          await tx.transaction.create({
            data: {
              date: purchaseDate,
              transactionMode: 'CASH', // Internal ledger mode
              type: 'CREDIT',
              amount: partnerPaid2Amount,
              accountId: partnerAccountId,
              category: 'GENERAL',
              referenceId: vehicle.id,
              description: `Auto-Entry: Partnership Capital Investment for ${make} ${model} (${registration || 'Unregistered'}) - Payment 2`
            }
          });
        }

        // Record the actual payment received from the partner to the firm's cash/bank (Suppress for legacy cars)
        if (!isLegacy) {
          if (partnerPayment1Mode && partnerPayment1AccountId && partnerPaid1Amount > 0) {
            await tx.transaction.create({
              data: {
                date: purchaseDate,
                transactionMode: partnerPayment1Mode,
                type: 'CREDIT', // Money comes IN to the firm
                amount: partnerPaid1Amount,
                accountId: partnerPayment1AccountId,
                category: 'GENERAL',
                referenceId: vehicle.id,
                description: `Income: Received from ${partnerName} for car ${make} ${model} (${registration || 'Unregistered'}) - Payment 1`
              }
            });
          }
          if (partnerPayment2Mode && partnerPayment2AccountId && partnerPaid2Amount > 0) {
            await tx.transaction.create({
              data: {
                date: purchaseDate,
                transactionMode: partnerPayment2Mode,
                type: 'CREDIT', // Money comes IN to the firm
                amount: partnerPaid2Amount,
                accountId: partnerPayment2AccountId,
                category: 'GENERAL',
                referenceId: vehicle.id,
                description: `Income: Received from ${partnerName} for car ${make} ${model} (${registration || 'Unregistered'}) - Payment 2`
              }
            });
          }
        }

          // And since this capital was used to buy the car, it passes through to the seller
          if (partnerPayment1Mode && partnerPayment1AccountId && partnerPaid1Amount > 0) {
            await tx.transaction.create({
              data: {
                date: purchaseDate,
                transactionMode: partnerPayment1Mode,
                type: 'DEBIT', // Money goes OUT to the seller
                amount: partnerPaid1Amount,
                accountId: partnerPayment1AccountId,
                category: 'VEHICLE_PURCHASE',
                referenceId: vehicle.id,
                description: `Expense: Purchased car ${make} ${model} (${registration || 'Unregistered'}) - ${partnerName} Payment 1`
              }
            });
          }
          if (partnerPayment2Mode && partnerPayment2AccountId && partnerPaid2Amount > 0) {
            await tx.transaction.create({
              data: {
                date: purchaseDate,
                transactionMode: partnerPayment2Mode,
                type: 'DEBIT', // Money goes OUT to the seller
                amount: partnerPaid2Amount,
                accountId: partnerPayment2AccountId,
                category: 'VEHICLE_PURCHASE',
                referenceId: vehicle.id,
                description: `Expense: Purchased car ${make} ${model} (${registration || 'Unregistered'}) - ${partnerName} Payment 2`
              }
            });
          }
        }
    });

    revalidatePath('/inventory');
    revalidatePath('/rojmel');

    return { success: true };
  } catch (error) {
    console.error('Failed to add vehicle:', error);
    return { success: false, error: error.stack || error.message || 'Failed to add vehicle.' };
  }
}

export async function payVehiclePendingBalance(formData) {
  try {
    const vehicleId = formData.get('vehicleId');
    const amount = parseFloat((formData.get('amount') || '0').replace(/,/g, ''));
    const sourceAccountId = formData.get('sourceAccountId');

    if (!vehicleId || !sourceAccountId || isNaN(amount) || amount <= 0) {
      throw new Error('Invalid input');
    }

    const sourceAcc = await prisma.account.findUnique({ where: { id: sourceAccountId } });
    if (!sourceAcc) throw new Error('Source account not found');

    await prisma.$transaction(async (tx) => {
      await checkSufficientBalance(tx, sourceAccountId, amount);
      const vehicle = await tx.vehicle.findUnique({ where: { id: vehicleId } });
      if (!vehicle) throw new Error('Vehicle not found');
      if (Number(vehicle.purchasePendingBalance) < amount) {
        throw new Error('Payment exceeds pending balance');
      }

      // Update vehicle pending balance
      await tx.vehicle.update({
        where: { id: vehicleId },
        data: {
          purchasePendingBalance: Number(vehicle.purchasePendingBalance) - amount
        }
      });

      // Record Payment Source
      const isAgent = sourceAcc.type === 'DSA_AGENT' || sourceAcc.type === 'FINANCIER';
      
      await tx.transaction.create({
        data: {
          date: new Date(),
          transactionMode: sourceAcc.type === 'BANK' ? 'BANK' : 'CASH',
          type: isAgent ? 'CREDIT' : 'DEBIT', // If agent pays, we owe them more (Credit). If firm pays, cash goes down (Debit).
          amount,
          accountId: sourceAccountId,
          category: 'VEHICLE_PURCHASE',
          referenceId: vehicleId,
          description: isAgent 
            ? `Auto-Entry: Paid Pending Udhari for ${vehicle.make} ${vehicle.model} (Paid by ${sourceAcc.name})`
            : `Auto-Entry: Paid Pending Udhari for ${vehicle.make} ${vehicle.model}`
        }
      });

      // If the vehicle was linked to a payable Vendor account, debit that vendor account (We owe them less)
      if (vehicle.payableAccountId) {
        await tx.transaction.create({
          data: {
            date: new Date(),
            transactionMode: sourceAcc.type === 'BANK' ? 'BANK' : 'CASH',
            type: 'DEBIT',
            amount,
            accountId: vehicle.payableAccountId,
            category: 'VEHICLE_PURCHASE',
            description: `Auto-Entry: Received Payment for Udhari on ${vehicle.make} ${vehicle.model}`
          }
        });
      }
    });

    revalidatePath('/inventory');
    revalidatePath('/rojmel');
    revalidatePath('/accounts');
    return { success: true };
  } catch (error) {
    console.error('Failed to pay pending balance:', error);
    return { success: false, error: error.message || 'Failed to pay pending balance.' };
  }
}

export async function sellVehicle(formData) {
  try {
    const rawData = {
      vehicleId: formData.get('vehicleId'),
      salePrice: formData.get('salePrice'),
      saleDate: formData.get('saleDate'),
      customerName: formData.get('customerName'),
      customerMobile: formData.get('customerMobile'),
      receivableAccountId: formData.get('receivableAccountId') || null,
      appliedTokenId: formData.get('appliedTokenId') || null,
    };

    const { ZodError } = await import('zod');
    const { SellVehicleSchema } = await import('@/lib/validations');
    const { toDecimal, math } = await import('@/lib/math');

    let parsed;
    try {
      parsed = SellVehicleSchema.parse(rawData);
    } catch (err) {
      if (err instanceof ZodError) {
        return { success: false, error: (err.issues || err.errors)?.map(e => e.message).join(', ') || 'Validation failed' };
      }
      throw err;
    }

    const { vehicleId, salePrice, saleDate, customerName, customerMobile, receivableAccountId, appliedTokenId } = parsed;

    // Dynamic Payments
    const paymentModes = formData.getAll('paymentModes');
    const paymentAccountIds = formData.getAll('paymentAccountIds');
    const paymentAmounts = formData.getAll('paymentAmounts');

    let totalPaid = 0;
    const payments = [];

    for (let i = 0; i < paymentModes.length; i++) {
      const mode = paymentModes[i];
      const accountId = paymentAccountIds[i];
      const amount = toDecimal(paymentAmounts[i]).toNumber();

      if (mode && accountId && amount > 0) {
        totalPaid = math.add(totalPaid, amount);
        payments.push({ mode, accountId, amount });
      }
    }

    let appliedToken = null;
    if (appliedTokenId) {
      appliedToken = await prisma.vehicleToken.findUnique({ where: { id: appliedTokenId } });
      if (appliedToken && appliedToken.status === 'ACTIVE') {
        totalPaid = math.add(totalPaid, appliedToken.amount);
      }
    }

    if (totalPaid > salePrice) {
      return { success: false, error: 'Your payment amount (including applied tokens) cannot be greater than your income amount.' };
    }

    const pendingReceivable = math.sub(salePrice, totalPaid);

    await prisma.$transaction(async (tx) => {
      // Get the vehicle with its expenses and partnerships to calculate profit and payouts
      const vehicle = await tx.vehicle.findUnique({
        where: { id: vehicleId },
        include: {
          expenses: true,
          partnerships: {
            include: {
              partnerAccount: true
            }
          },
          tokens: true
        }
      });

      if (!vehicle) throw new Error('Vehicle not found');

      const totalExpenses = vehicle.expenses.reduce((sum, exp) => math.add(sum, exp.amount), 0);
      const legacyExp = toDecimal(vehicle.legacyExpenses).toNumber();
      const totalCost = math.add(math.add(vehicle.purchasePrice, totalExpenses), legacyExp);
      const profit = math.sub(salePrice, totalCost);

      let finalReceivableAccountId = receivableAccountId;
      
      let newCustomerAccountId = null;
      // Auto-create Customer Account if direct customer udhari is chosen
      if (!finalReceivableAccountId && pendingReceivable !== 0) {
        const newCustomerAccount = await tx.account.create({
          data: {
            name: `${customerName || 'Direct Customer'} (Customer)`,
            type: 'UGHRANI',
            openingBalance: 0
          }
        });
        newCustomerAccountId = newCustomerAccount.id;
        finalReceivableAccountId = newCustomerAccountId;
      }

      await tx.vehicle.update({
        where: { id: vehicleId },
        data: {
          status: 'SOLD',
          salePrice,
          saleDate,
          profit,
          customerName,
          customerMobile,
          salePendingBalance: pendingReceivable,
          receivableAccountId: (finalReceivableAccountId && pendingReceivable !== 0) ? finalReceivableAccountId : null
        }
      });

      // Handle Dynamic Payments
      for (let i = 0; i < payments.length; i++) {
        const p = payments[i];
        await tx.transaction.create({
          data: {
            date: saleDate,
            transactionMode: p.mode,
            type: 'CREDIT',
            amount: p.amount,
            accountId: p.accountId,
            category: 'VEHICLE_SALE',
            referenceId: vehicleId,
            description: `Auto-Entry: Sold ${vehicle.make} ${vehicle.model} (${vehicle.registration || 'Unregistered'}) - Payment ${i + 1}`
          }
        });
      }

      // Handle Pending Receivable / Advance (Customer owes us OR We owe Customer)
      if (finalReceivableAccountId && pendingReceivable !== 0) {
        const isInternalAgent = finalReceivableAccountId !== newCustomerAccountId;
        const receivablePaymentMode = isInternalAgent ? formData.get('receivablePaymentMode') || 'CASH' : 'CASH';
        
        await tx.transaction.create({
          data: {
            date: saleDate,
            transactionMode: receivablePaymentMode,
            type: pendingReceivable > 0 ? 'DEBIT' : 'CREDIT', // DEBIT if they owe us more, CREDIT if they paid an advance
            amount: Math.abs(pendingReceivable),
            accountId: finalReceivableAccountId,
            category: 'VEHICLE_SALE',
            referenceId: vehicleId,
            description: `Auto-Entry: ${pendingReceivable > 0 ? 'Pending Receivable' : 'Advance Received'} from sale of ${vehicle.make} ${vehicle.model} (${vehicle.registration || 'Unregistered'})`
          }
        });
      }

      // Mark Token as Applied
      if (appliedToken && appliedToken.status === 'ACTIVE') {
        await tx.vehicleToken.update({
          where: { id: appliedToken.id },
          data: { status: 'APPLIED' }
        });
      }

      // Automatically Forfeit all OTHER active tokens for this vehicle
      const activeTokensToForfeit = vehicle.tokens.filter(t => t.status === 'ACTIVE' && t.id !== appliedTokenId);
      
      for (const tokenToForfeit of activeTokensToForfeit) {
        // 1. Update status to FORFEITED
        await tx.vehicleToken.update({
          where: { id: tokenToForfeit.id },
          data: { status: 'FORFEITED' }
        });

        // 2. Record it as an INCOME Expense (100% firm profit)
        await tx.expense.create({
          data: {
            amount: tokenToForfeit.amount,
            date: saleDate,
            description: `Auto-Forfeited Token Income: ${tokenToForfeit.customerName} (Ref: ${vehicle.make} ${vehicle.registration || 'Unregistered'})`,
            expenseType: 'INCOME',
            // DO NOT link to vehicleId, so it stays 100% firm profit
            status: 'APPROVED',
            requestedAccountId: tokenToForfeit.paymentAccountId,
            requestedMode: tokenToForfeit.paymentMode,
            customerName: tokenToForfeit.customerName,
            customerMobile: tokenToForfeit.customerMobile,
          }
        });
      }

      // Record Profit/Loss Distribution

      // (Removed as per user request: The user prefers to manually log profit payments via the Vehicle Details modal instead of auto-generating them on sale)
      if (vehicle.partnerships && vehicle.partnerships.length > 0) {
        // No auto-ledger entries are created here.
      }
    });
    revalidatePath('/inventory');
    revalidatePath('/history');
    revalidatePath('/dashboard');
    revalidatePath('/rojmel');
    return { success: true };
  } catch (error) {
    console.error('Failed to sell vehicle:', error);
    return { success: false, error: 'Failed to sell vehicle.' };
  }
}

export async function addRepairExpense(formData) {
  try {
    const vehicleId = formData.get('vehicleId');
    const amount = parseFloat((formData.get('amount') || '0').toString().replace(/,/g, ''));
    const description = formData.get('description');

    // Auto-ledger parameters
    const accountId = formData.get('accountId');
    const mode = formData.get('mode');

    if (amount > 0 && !accountId) {
      return { success: false, error: 'Please select a Cash or Bank account for the repair expense.' };
    }

    await prisma.$transaction(async (tx) => {
      if (mode && accountId && amount > 0) {
        await checkSufficientBalance(tx, accountId, amount);
      }
      const expense = await tx.expense.create({
        data: {
          amount,
          date: new Date(),
          description,
          expenseType: 'CAR_EXPENSE',
          vehicleId
        }
      });

      if (accountId && mode) {
        // Automatically deduct repair cost from the ledger
        await tx.transaction.create({
          data: {
            date: new Date(),
            transactionMode: mode,
            type: 'DEBIT',
            amount: amount,
            accountId: accountId,
            category: 'EXPENSE',
            description: `Repair Expense: ${description}`
          }
        });
      }
    });

    revalidatePath('/inventory');
    revalidatePath('/rojmel');
    return { success: true };
  } catch (error) {
    console.error('Failed to add expense:', error);
    return { success: false, error: 'Failed to add repair expense.' };
  }
}

export async function payPartnerPendingInvestment(formData) {
  try {
    const partnershipId = formData.get('partnershipId');
    const amount = parseFloat((formData.get('amount') || '0').replace(/,/g, ''));
    const targetAccountId = formData.get('targetAccountId'); // The firm's Cash/Bank receiving the money

    if (!partnershipId || !targetAccountId || isNaN(amount) || amount <= 0) {
      throw new Error('Invalid input');
    }

    const targetAcc = await prisma.account.findUnique({ where: { id: targetAccountId } });
    if (!targetAcc) throw new Error('Target receiving account not found');

    await prisma.$transaction(async (tx) => {
      const partnership = await tx.partnership.findUnique({ 
        where: { id: partnershipId },
        include: { vehicle: true, partnerAccount: true }
      });
      if (!partnership) throw new Error('Partnership not found');
      
      const remainingUnpaid = Number(partnership.investmentAmount) - Number(partnership.paidAmount);
      if (remainingUnpaid < amount) {
        throw new Error('Payment exceeds the pending unpaid investment balance');
      }

      // Update partnership paid amount
      const newPaidAmount = Number(partnership.paidAmount) + amount;
      await tx.partnership.update({
        where: { id: partnershipId },
        data: {
          paidAmount: newPaidAmount,
          isInvestmentPaid: newPaidAmount >= Number(partnership.investmentAmount)
        }
      });

      // 1. We also need to credit the Partner's Ledger to reflect they actually gave us more of their share
      await tx.transaction.create({
        data: {
          date: new Date(),
          transactionMode: 'CASH', // Internal ledger mode
          type: 'CREDIT', 
          amount: amount,
          accountId: partnership.partnerAccountId,
          category: 'GENERAL',
          referenceId: partnership.vehicleId,
          description: `Auto-Entry: Paid Pending Investment Share for ${partnership.vehicle.make} ${partnership.vehicle.model}`
        }
      });

      // 2. We credit the Firm's Cash/Bank account to receive the money
      await tx.transaction.create({
        data: {
          date: new Date(),
          transactionMode: targetAcc.type === 'BANK' ? 'BANK' : 'CASH',
          type: 'CREDIT', // Money IN
          amount: amount,
          accountId: targetAccountId,
          category: 'GENERAL',
          referenceId: partnership.vehicleId,
          description: `Auto-Entry: Received Pending Capital from ${partnership.partnerAccount.name} for ${partnership.vehicle.make} ${partnership.vehicle.model}`
        }
      });

      // 3. We pass this money directly to the seller, so we create a matching DEBIT
      await tx.transaction.create({
        data: {
          date: new Date(),
          transactionMode: targetAcc.type === 'BANK' ? 'BANK' : 'CASH',
          type: 'DEBIT', // Money OUT to seller
          amount: amount,
          accountId: targetAccountId,
          category: 'VEHICLE_PURCHASE',
          referenceId: partnership.vehicleId,
          description: `Auto-Entry: Paid to Seller (from Partner Capital) for ${partnership.vehicle.make} ${partnership.vehicle.model}`
        }
      });

      // 4. And since we paid the seller, we must reduce the pending balance on the car!
      await tx.vehicle.update({
        where: { id: partnership.vehicleId },
        data: {
          purchasePendingBalance: Math.max(0, Number(partnership.vehicle.purchasePendingBalance) - amount)
        }
      });
    });

    revalidatePath('/inventory');
    revalidatePath('/rojmel');
    return { success: true };
  } catch (error) {
    console.error('Failed to pay partner pending investment:', error);
    return { success: false, error: error.message || 'Failed to process payment.' };
  }
}

export async function payPartnerProfit(formData) {
  try {
    const partnershipId = formData.get('partnershipId');
    const amount = parseFloat((formData.get('amount') || '0').replace(/,/g, ''));
    const sourceAccountId = formData.get('sourceAccountId'); // Firm's Cash/Bank

    if (!partnershipId || !sourceAccountId || isNaN(amount) || amount <= 0) {
      throw new Error('Invalid input');
    }

    const sourceAcc = await prisma.account.findUnique({ where: { id: sourceAccountId } });
    if (!sourceAcc) throw new Error('Source payment account not found');

    await prisma.$transaction(async (tx) => {
      await checkSufficientBalance(tx, sourceAccountId, amount);
      const partnership = await tx.partnership.findUnique({ 
        where: { id: partnershipId },
        include: { vehicle: true, partnerAccount: true }
      });
      if (!partnership) throw new Error('Partnership not found');
      
      const capitalInvested = Number(partnership.paidAmount || 0);
      const actualProfitPaid = amount - capitalInvested;

      // 1. Credit the partner's ledger for the actual profit they earned from this settlement
      if (actualProfitPaid > 0) {
        await tx.transaction.create({
          data: {
            date: new Date(),
            transactionMode: 'CASH',
            type: 'CREDIT',
            amount: actualProfitPaid,
            accountId: partnership.partnerAccountId,
            category: 'GENERAL',
            referenceId: partnership.vehicleId,
            description: `Auto-Entry: Profit Earned from sale of ${partnership.vehicle.make} ${partnership.vehicle.model}`
          }
        });
      }

      // 2. DEBIT the Partner's Ledger for the total payout to reduce the firm's debt to them
      await tx.transaction.create({
        data: {
          date: new Date(),
          transactionMode: 'CASH',
          type: 'DEBIT',
          amount: amount,
          accountId: partnership.partnerAccountId,
          category: 'GENERAL',
          referenceId: partnership.vehicleId,
          description: `Auto-Entry: Received Full Settlement (Capital + Profit Share) for ${partnership.vehicle.make} ${partnership.vehicle.model}`
        }
      });

      // DEBIT from Firm's Cash/Bank Account (It's an Expense payout)
      await tx.transaction.create({
        data: {
          date: new Date(),
          transactionMode: sourceAcc.type === 'BANK' ? 'BANK' : 'CASH',
          type: 'DEBIT', // Money OUT of firm
          amount: amount,
          accountId: sourceAccountId,
          category: 'GENERAL',
          referenceId: partnership.vehicleId, // Link to vehicle so we can detect it
          description: `Auto-Entry: Paid Full Settlement (Capital + Profit Share) for ${partnership.vehicle.make} ${partnership.vehicle.model}`
        }
      });

      const cutAmount = parseFloat(formData.get('cutAmount') || '0');
      if (cutAmount > 0) {
        // Removed Dummy DEBIT offset. Net cash correctly decreases by (Payout - Cut)

        // The explicit CREDIT (Income) that the user wants to see in the ledger history
        await tx.transaction.create({
          data: {
            date: new Date(),
            transactionMode: sourceAcc.type === 'BANK' ? 'BANK' : 'CASH',
            type: 'CREDIT',
            amount: cutAmount,
            accountId: sourceAccountId,
            category: 'GENERAL',
            referenceId: partnership.vehicleId,
            description: `Income: Extra Profit Kept (Settlement Cut) from ${partnership.partnerAccount.name} for ${partnership.vehicle.make} ${partnership.vehicle.model}`
          }
        });
      }
    });

    revalidatePath('/inventory');
    revalidatePath('/rojmel');
    revalidatePath('/expenses');
    return { success: true };
  } catch (error) {
    console.error('Failed to pay partner profit:', error);
    return { success: false, error: error.message || 'Failed to pay partner profit.' };
  }
}

export async function updateVehicleDocuments(vehicleId, receivedDocsArray) {
  try {
    await prisma.vehicle.update({
      where: { id: vehicleId },
      data: {
        receivedDocs: receivedDocsArray
      }
    });
    revalidatePath('/inventory');
    return { success: true };
  } catch (error) {
    console.error('Failed to update documents:', error);
    return { success: false, error: 'Failed to update documents.' };
  }
}
