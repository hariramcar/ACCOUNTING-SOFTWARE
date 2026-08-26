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
      dateFilter.gte = new Date(startDateStr).toISOString();
      const lteDate = new Date(endDateStr);
      lteDate.setHours(23, 59, 59, 999);
      dateFilter.lte = lteDate.toISOString();
    }

    const transactions = await prisma.transaction.findMany({
      where: startDateStr ? { date: dateFilter } : undefined,
      include: { account: true },
      orderBy: { createdAt: 'desc' }
    });

    const vehicles = await prisma.vehicle.findMany({
      where: startDateStr ? { 
        OR: [
          { purchaseDate: dateFilter },
          { saleDate: dateFilter }
        ]
      } : undefined,
      include: { expenses: true, partnerships: { include: { partnerAccount: true } } },
      orderBy: { createdAt: 'desc' }
    });

    const accounts = await prisma.account.findMany({
      orderBy: { type: 'asc' }
    });
    
    const expenses = await prisma.expense.findMany({
        where: startDateStr ? { date: dateFilter } : undefined,
        include: { vehicle: true },
        orderBy: { date: 'desc' }
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
