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
          paidAmount: Number(p.paidAmount || 0),
          partnerAccount: p.partnerAccount ? {
            ...p.partnerAccount,
            openingBalance: Number(p.partnerAccount.openingBalance)
          } : null
        })),
        salePendingBalance: Number(v.salePendingBalance || 0),
        receivableAccount: v.receivableAccount ? { ...v.receivableAccount, openingBalance: Number(v.receivableAccount.openingBalance) } : null,
        payableAccount: v.payableAccount ? { ...v.payableAccount, openingBalance: Number(v.payableAccount.openingBalance) } : null,
        saleTransactions: saleTransactions.filter(t => t.referenceId === v.id).map(t => ({
          ...t,
          amount: Number(t.amount),
          accountName: t.account ? t.account.name : null,
          account: t.account ? { ...t.account, openingBalance: Number(t.account.openingBalance) } : null
        })),
        purchaseTransactions: purchaseTransactions.filter(t => t.referenceId === v.id).map(t => ({
          ...t,
          amount: Number(t.amount),
          accountName: t.account ? t.account.name : null,
          account: t.account ? { ...t.account, openingBalance: Number(t.account.openingBalance) } : null
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
    const make = formData.get('make');
    const model = formData.get('model');
    const registration = formData.get('registration') || null;
    const purchasePriceStr = formData.get('purchasePrice') || '0';
    const purchasePrice = parseFloat(purchasePriceStr.replace(/,/g, ''));
    const purchaseDate = new Date(formData.get('purchaseDate') || Date.now());
    const isLegacy = formData.get('isLegacy') === 'on';
    const legacyExpenses = isLegacy ? parseFloat(formData.get('legacyExpenses') || '0') : 0;

    if (registration) {
      const regRegex = /^[A-Za-z]{2}[ -]?[0-9]{2}[ -]?[A-Za-z]{0,3}[ -]?[0-9]{4}$/;
      if (!regRegex.test(registration.trim())) {
        return { success: false, error: 'Invalid Registration Number format. Must use 2-digit RTO and 4-digit number. Example: GJ 01 BS 8801 or GJ 05 0001' };
      }
    }

    // Split Payments
    const p1Amount = parseFloat((formData.get('payment1Amount') || '0').replace(/,/g, ''));
    const p1Mode = formData.get('payment1Mode') || null;
    const p1AccountId = formData.get('payment1AccountId') || null;

    const p2Amount = parseFloat((formData.get('payment2Amount') || '0').replace(/,/g, ''));
    const p2Mode = formData.get('payment2Mode') || null;
    const p2AccountId = formData.get('payment2AccountId') || null;

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
    const partnerInvestment = parseFloat((formData.get('partnerInvestment') || '0').replace(/,/g, ''));
    const profitSharePercentage = parseFloat(formData.get('profitSharePercentage') || '0');

    const partnerPaid1Amount = parseFloat((formData.get('partnerPaid1Amount') || '0').replace(/,/g, ''));
    const partnerPayment1Mode = formData.get('partnerPayment1Mode') || null;
    const partnerPayment1AccountId = formData.get('partnerPayment1AccountId') || null;

    const partnerPaid2Amount = parseFloat((formData.get('partnerPaid2Amount') || '0').replace(/,/g, ''));
    const partnerPayment2Mode = formData.get('partnerPayment2Mode') || null;
    const partnerPayment2AccountId = formData.get('partnerPayment2AccountId') || null;
    
    const partnerTotalPaid = partnerPaid1Amount + partnerPaid2Amount;

    const payableAccountId = formData.get('payableAccountId');
    
    const totalPaidOrInvested = p1Amount + p2Amount + partnerInvestment;
    if (totalPaidOrInvested > purchasePrice) {
      return { success: false, error: 'Your payment amount cannot be greater than your expense amount (purchase price).' };
    }
    
    const pendingAmount = Math.round((purchasePrice - totalPaidOrInvested) * 100) / 100;

    // Strict validation for missing accounts
    if (p1Amount > 0 && !p1AccountId) {
      return { success: false, error: 'Please select an account for Payment 1.' };
    }
    if (p2Amount > 0 && !p2AccountId) {
      return { success: false, error: 'Please select an account for Payment 2.' };
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
          purchasePendingBalance: pendingAmount > 0 ? pendingAmount : 0,
          payableAccountId: (payableAccountId && pendingAmount > 0) ? payableAccountId : null,
          status: 'IN_STOCK',
          isLegacy,
          legacyExpenses
        }
      });

      // Handle Payment 1 (Suppress cash deduction for legacy cars)
      if (!isLegacy && p1AccountId && p1Mode && p1Amount > 0) {
        await checkSufficientBalance(tx, p1AccountId, p1Amount);
        const p1Acc = await tx.account.findUnique({ where: { id: p1AccountId } });
        const isInternal1 = p1Acc && p1Acc.type !== 'CASH' && p1Acc.type !== 'BANK';
        await tx.transaction.create({
          data: {
            date: purchaseDate,
            transactionMode: isInternal1 ? 'CASH' : p1Mode, // Internal ledger uses CASH mode
            type: isInternal1 ? 'CREDIT' : 'DEBIT', // Agent pays on our behalf -> We owe them more / they owe us less (CREDIT). Firm pays -> Firm balance decreases (DEBIT)
            amount: p1Amount,
            accountId: p1AccountId,
            category: 'VEHICLE_PURCHASE',
            referenceId: vehicle.id,
            description: `Expense: Purchased car ${make} ${model} (${registration || 'Unregistered'}) - Firm Payment 1${isInternal1 ? ' (Paid by Agent/Financier)' : ''}`
          }
        });
      }

      // Handle Payment 2 (Suppress cash deduction for legacy cars)
      if (!isLegacy && p2AccountId && p2Mode && p2Amount > 0) {
        await checkSufficientBalance(tx, p2AccountId, p2Amount);
        const p2Acc = await tx.account.findUnique({ where: { id: p2AccountId } });
        const isInternal2 = p2Acc && p2Acc.type !== 'CASH' && p2Acc.type !== 'BANK';
        await tx.transaction.create({
          data: {
            date: purchaseDate,
            transactionMode: isInternal2 ? 'CASH' : p2Mode,
            type: isInternal2 ? 'CREDIT' : 'DEBIT',
            amount: p2Amount,
            accountId: p2AccountId,
            category: 'VEHICLE_PURCHASE',
            referenceId: vehicle.id,
            description: `Expense: Purchased car ${make} ${model} (${registration || 'Unregistered'}) - Firm Payment 2${isInternal2 ? ' (Paid by Agent/Financier)' : ''}`
          }
        });
      }

      // Handle Pending Payable (Udhari)
      if (payableAccountId && pendingAmount > 0) {
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
            isInvestmentPaid: partnerTotalPaid >= partnerInvestment,
            paidAmount: partnerTotalPaid > 0 ? partnerTotalPaid : 0
          }
        });

        // The amount to credit to the partner's ledger is what they ACTUALLY paid.
        // If they didn't specify a payment mode, we fall back to the full investment (legacy behavior)
        // Record exact segments of capital invested to the partner's ledger
        if (!isLegacy) {
          if (partnerPaid1Amount > 0) {
            await tx.transaction.create({
              data: {
                date: purchaseDate,
                transactionMode: partnerPayment1Mode || 'CASH', 
                type: 'CREDIT', 
                amount: partnerPaid1Amount,
                accountId: partnerAccountId,
                category: 'GENERAL',
                referenceId: vehicle.id,
                description: `Auto-Entry: Partnership Capital Investment from ${partnerName} for car ${make} ${model} - Payment 1 (${partnerPayment1Mode})`
              }
            });
          }
          if (partnerPaid2Amount > 0) {
            await tx.transaction.create({
              data: {
                date: purchaseDate,
                transactionMode: partnerPayment2Mode || 'CASH', 
                type: 'CREDIT', 
                amount: partnerPaid2Amount,
                accountId: partnerAccountId,
                category: 'GENERAL',
                referenceId: vehicle.id,
                description: `Auto-Entry: Partnership Capital Investment from ${partnerName} for car ${make} ${model} - Payment 2 (${partnerPayment2Mode})`
              }
            });
          }
        } else {
          // For legacy vehicles, just record the total paid (or full investment if no paid amount is specified)
          const amountToCreditPartner = (partnerTotalPaid > 0) ? partnerTotalPaid : partnerInvestment;
          if (amountToCreditPartner > 0) {
            await tx.transaction.create({
              data: {
                date: purchaseDate,
                transactionMode: 'CASH', 
                type: 'CREDIT', 
                amount: amountToCreditPartner,
                accountId: partnerAccountId,
                category: 'GENERAL',
                referenceId: vehicle.id,
                description: `Auto-Entry: Partnership Investment from ${partnerName} for car ${make} ${model} (Legacy)`
              }
            });
          }
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
    return { success: false, error: error.message || 'Failed to add vehicle.' };
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

      // Debit Source Account (Cash/Bank goes DOWN)
      await tx.transaction.create({
        data: {
          date: new Date(),
          transactionMode: sourceAcc.type === 'BANK' ? 'BANK' : 'CASH',
          type: 'DEBIT',
          amount,
          accountId: sourceAccountId,
          category: 'VEHICLE_PURCHASE',
          referenceId: vehicleId,
          description: `Auto-Entry: Paid Pending Udhari for ${vehicle.make} ${vehicle.model}`
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
    const vehicleId = formData.get('vehicleId');
    const salePrice = parseFloat((formData.get('salePrice') || '0').toString().replace(/,/g, ''));
    const saleDate = new Date(formData.get('saleDate') || Date.now());
    const customerName = formData.get('customerName');
    const customerMobile = formData.get('customerMobile');

    // Dynamic Payments
    const paymentModes = formData.getAll('paymentModes');
    const paymentAccountIds = formData.getAll('paymentAccountIds');
    const paymentAmounts = formData.getAll('paymentAmounts');

    let totalPaid = 0;
    const payments = [];

    for (let i = 0; i < paymentModes.length; i++) {
      const mode = paymentModes[i];
      const accountId = paymentAccountIds[i];
      const amount = parseFloat((paymentAmounts[i] || '0').toString().replace(/,/g, ''));

      if (mode && accountId && amount > 0) {
        totalPaid += amount;
        payments.push({ mode, accountId, amount });
      }
    }

    const appliedTokenId = formData.get('appliedTokenId');
    let appliedToken = null;

    if (appliedTokenId) {
      appliedToken = await prisma.vehicleToken.findUnique({ where: { id: appliedTokenId } });
      if (appliedToken && appliedToken.status === 'ACTIVE') {
        totalPaid += Number(appliedToken.amount);
      }
    }

    if (totalPaid > salePrice) {
      return { success: false, error: 'Your payment amount (including applied tokens) cannot be greater than your income amount.' };
    }

    const receivableAccountId = formData.get('receivableAccountId');
    const pendingReceivable = Math.round((salePrice - totalPaid) * 100) / 100;

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

      const totalExpenses = vehicle.expenses.reduce((sum, exp) => sum + Number(exp.amount), 0);
      const legacyExp = Number(vehicle.legacyExpenses || 0);
      const totalCost = Number(vehicle.purchasePrice) + totalExpenses + legacyExp;
      const profit = Math.round((salePrice - totalCost) * 100) / 100;

      let finalReceivableAccountId = receivableAccountId;
      
      // Auto-create Customer Account if direct customer udhari is chosen
      if (!finalReceivableAccountId && pendingReceivable !== 0) {
        const newCustomerAccount = await tx.account.create({
          data: {
            name: `${customerName || 'Direct Customer'} (Customer)`,
            type: 'UGHRANI',
            openingBalance: 0
          }
        });
        finalReceivableAccountId = newCustomerAccount.id;
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
        await tx.transaction.create({
          data: {
            date: saleDate,
            transactionMode: 'CASH', // Internal ledger entry
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

      // 2. Debit the partner's ledger for the full settlement amount paid out (clears their capital + profit)
      await tx.transaction.create({
        data: {
          date: new Date(),
          transactionMode: sourceAcc.type === 'BANK' ? 'BANK' : 'CASH',
          type: 'DEBIT',
          amount: amount,
          accountId: partnership.partnerAccountId,
          category: 'GENERAL',
          referenceId: partnership.vehicleId,
          description: `Auto-Entry: Paid Full Settlement (Capital + Profit Share) for ${partnership.vehicle.make} ${partnership.vehicle.model}`
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
          description: `Auto-Entry: Paid Full Settlement (Capital + Profit Share) to ${partnership.partnerAccount.name} for ${partnership.vehicle.make} ${partnership.vehicle.model}`
        }
      });

      const cutAmount = parseFloat(formData.get('cutAmount') || '0');
      if (cutAmount > 0) {
        // Dummy DEBIT to offset the incoming CREDIT so cash balance doesn't artificially inflate
        await tx.transaction.create({
          data: {
            date: new Date(),
            transactionMode: sourceAcc.type === 'BANK' ? 'BANK' : 'CASH',
            type: 'DEBIT',
            amount: cutAmount,
            accountId: sourceAccountId,
            category: 'GENERAL',
            referenceId: partnership.vehicleId,
            description: `Auto-Entry: Offset for Cut Profit from ${partnership.partnerAccount.name}`
          }
        });

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
