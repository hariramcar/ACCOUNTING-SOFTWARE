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

    // Map vehicle details directly to each transaction (matching referenceId or registration in description)
    const transactions = transactionsRaw.map(t => {
      let v = t.referenceId ? allVehicles.find(veh => veh.id === t.referenceId) : null;
      if (!v && t.description) {
        v = allVehicles.find(veh => veh.registration && veh.registration.length > 4 && t.description.includes(veh.registration));
      }
      return {
        ...t,
        vehicle: v ? {
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
        } : null
      };
    });

    // Vehicles active or sold in this date range
    const vehiclesInRange = allVehicles.filter(v => {
      if (!startDateStr || !endDateStr) return true;
      const pDate = v.purchaseDate ? new Date(v.purchaseDate) : null;
      const sDate = v.saleDate ? new Date(v.saleDate) : null;
      const hasPurchaseInRange = pDate && pDate >= dateFilter.gte && pDate <= dateFilter.lte;
      const hasSaleInRange = sDate && sDate >= dateFilter.gte && sDate <= dateFilter.lte;
      const hasTxInRange = transactions.some(t => t.referenceId === v.id || (v.registration && t.description?.includes(v.registration)));
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
