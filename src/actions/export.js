'use server';

import prisma from '@/lib/prisma';
import { getSession } from '@/lib/session';

export async function getExportData(startDateStr, endDateStr) {
  const session = await getSession();
  if (!session || session.role !== 'ADMIN') {
    return { success: false, error: 'Unauthorized' };
  }

  try {
    let dateFilter = {};
    if (startDateStr && endDateStr) {
      const [sY, sM, sD] = startDateStr.split('-').map(Number);
      const [eY, eM, eD] = endDateStr.split('-').map(Number);
      const gteDate = new Date(sY, sM - 1, sD, 0, 0, 0, 0);
      const lteDate = new Date(eY, eM - 1, eD, 23, 59, 59, 999);
      dateFilter = {
        gte: gteDate,
        lte: lteDate
      };
    }

    const [transactionsRaw, allVehicles, accounts, expenses] = await Promise.all([
      prisma.transaction.findMany({
        where: (startDateStr && endDateStr) ? { date: dateFilter } : undefined,
        include: { account: true },
        orderBy: [{ date: 'desc' }, { createdAt: 'desc' }]
      }),
      prisma.vehicle.findMany({
        include: { 
          expenses: true, 
          tokens: true,
          partnerships: { include: { partnerAccount: true } },
          payableAccount: true,
          receivableAccount: true
        },
        orderBy: { createdAt: 'desc' }
      }),
      prisma.account.findMany({
        orderBy: { type: 'asc' }
      }),
      prisma.expense.findMany({
        where: (startDateStr && endDateStr) ? { date: dateFilter } : undefined,
        include: { vehicle: true, submittedBy: true },
        orderBy: [{ date: 'desc' }, { createdAt: 'desc' }]
      })
    ]);

    // Fetch linked expenses and tokens for all transaction references
    const refIds = transactionsRaw.map(t => t.referenceId).filter(Boolean);
    const [linkedExpenses, linkedTokens] = await Promise.all([
      prisma.expense.findMany({
        where: { id: { in: refIds } },
        include: { vehicle: true }
      }),
      prisma.vehicleToken.findMany({
        where: { id: { in: refIds } },
        include: { vehicle: true }
      })
    ]);

    const expenseMap = new Map();
    linkedExpenses.forEach(exp => {
      expenseMap.set(exp.id, exp);
    });

    const tokenMap = new Map();
    linkedTokens.forEach(tok => {
      tokenMap.set(tok.id, tok);
    });

    // Map vehicle details directly to each transaction (matching vehicleId, expenseId, tokenId, or registration in description)
    const transactions = transactionsRaw.map(t => {
      let v = null;
      let linkedExpenseId = null;
      let linkedExpenseType = null;

      // 1. Direct match with a vehicle ID
      if (t.referenceId) {
        v = allVehicles.find(veh => veh.id === t.referenceId);
      }

      // 2. Match with an Expense ID (for all auto-entry car repair and office expenses)
      if (t.referenceId && expenseMap.has(t.referenceId)) {
        const exp = expenseMap.get(t.referenceId);
        linkedExpenseId = exp.id;
        linkedExpenseType = exp.expenseType;
        if (!v) {
          if (exp.vehicle) {
            v = exp.vehicle;
          } else if (exp.vehicleId) {
            v = allVehicles.find(veh => veh.id === exp.vehicleId);
          }
        }
      }

      // 3. Match with a Token ID
      if (!v && t.referenceId && tokenMap.has(t.referenceId)) {
        const tok = tokenMap.get(t.referenceId);
        if (tok.vehicle) {
          v = tok.vehicle;
        } else if (tok.vehicleId) {
          v = allVehicles.find(veh => veh.id === tok.vehicleId);
        }
      }

      // 4. Match with registration or car name in transaction description ONLY IF it's not an office transaction
      const isOfficeDesc = Boolean(t.description && (t.description.toLowerCase().includes('(office)') || t.description.toLowerCase().includes('office')));
      if (!v && t.description && !isOfficeDesc && linkedExpenseType !== 'OFFICE_EXPENSE') {
        const descLower = t.description.toLowerCase();
        v = allVehicles.find(veh => {
          if (!veh.registration) return false;
          const regLower = veh.registration.toLowerCase();
          const regClean = regLower.replace(/[^a-z0-9]/g, '');
          return descLower.includes(regLower) || (regClean.length > 4 && descLower.includes(regClean));
        });
      }

      const isCarRepair = Boolean(linkedExpenseType === 'CAR_EXPENSE' || (t.description && t.description.toLowerCase().includes('car repair')));
      const isOffice = Boolean(linkedExpenseType === 'OFFICE_EXPENSE' || isOfficeDesc);

      return {
        ...t,
        expenseId: linkedExpenseId,
        expenseType: linkedExpenseType,
        isCarRepairExpense: isCarRepair,
        isOfficeExpense: isOffice,
        vehicle: isOffice ? null : (v ? {
          id: v.id,
          make: v.make,
          model: v.model,
          registration: v.registration || 'Unregistered',
          status: v.status,
          purchasePrice: Number(v.purchasePrice || 0),
          salePrice: v.salePrice ? Number(v.salePrice) : null,
          profit: v.profit ? Number(v.profit) : null,
          customerName: v.customerName || null,
          customerMobile: v.customerMobile || null
        } : null)
      };
    });

    // Vehicles active, sold, or involved in transactions in this date range
    const vehiclesInRange = allVehicles.filter(v => {
      if (!startDateStr || !endDateStr) return true;
      const pDate = v.purchaseDate ? new Date(v.purchaseDate) : null;
      const sDate = v.saleDate ? new Date(v.saleDate) : null;
      const hasPurchaseInRange = pDate && pDate >= dateFilter.gte && pDate <= dateFilter.lte;
      const hasSaleInRange = sDate && sDate >= dateFilter.gte && sDate <= dateFilter.lte;
      const hasTxInRange = transactions.some(t => 
        t.referenceId === v.id || 
        t.vehicle?.id === v.id || 
        (v.registration && t.description?.toLowerCase().includes(v.registration.toLowerCase()))
      );
      return hasPurchaseInRange || hasSaleInRange || hasTxInRange;
    });

    // Compute period activity for each account
    const accountsWithActivity = accounts.map(acc => {
      const accTxs = transactions.filter(t => t.accountId === acc.id);
      let periodCredit = 0;
      let periodDebit = 0;
      accTxs.forEach(t => {
        const amt = Number(t.amount || 0);
        if (t.type === 'CREDIT') periodCredit += amt;
        else if (t.type === 'DEBIT') periodDebit += amt;
      });
      return {
        ...acc,
        periodCredit,
        periodDebit,
        periodNet: periodCredit - periodDebit,
        txCount: accTxs.length
      };
    });

    const rawData = {
      transactions,
      vehicles: vehiclesInRange,
      allVehicles,
      accounts: accountsWithActivity,
      expenses
    };

    return {
      success: true,
      data: JSON.parse(JSON.stringify(rawData))
    };
  } catch (error) {
    console.error('Export error:', error);
    return { success: false, error: error.message };
  }
}
