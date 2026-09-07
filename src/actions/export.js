'use server';

import prisma from '@/lib/prisma';
import { getSession } from '@/lib/session';

export async function getExportData(startDateStr, endDateStr) {
  const session = await getSession();
  if (!session || session.role !== 'ADMIN') {
    return { success: false, error: 'Unauthorized' };
  }

  try {
    const dateFilter = {};
    if (startDateStr && endDateStr) {
      dateFilter.gte = new Date(`${startDateStr}T00:00:00.000Z`);
      dateFilter.lte = new Date(`${endDateStr}T23:59:59.999Z`);
    }

    const transactions = await prisma.transaction.findMany({
      where: (startDateStr && endDateStr) ? { date: dateFilter } : undefined,
      include: { account: true },
      orderBy: [{ date: 'desc' }, { createdAt: 'desc' }]
    });

    const vehicles = await prisma.vehicle.findMany({
      where: (startDateStr && endDateStr) ? { 
        OR: [
          { purchaseDate: dateFilter },
          { saleDate: dateFilter },
          { createdAt: dateFilter }
        ]
      } : undefined,
      include: { expenses: true, partnerships: { include: { partnerAccount: true } } },
      orderBy: { createdAt: 'desc' }
    });

    const accounts = await prisma.account.findMany({
      orderBy: { type: 'asc' }
    });
    
    const expenses = await prisma.expense.findMany({
      where: (startDateStr && endDateStr) ? { date: dateFilter } : undefined,
      include: { vehicle: true },
      orderBy: [{ date: 'desc' }, { createdAt: 'desc' }]
    });

    const rawData = {
      transactions,
      vehicles,
      accounts,
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
