import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function GET() {
  const expenses = await prisma.expense.findMany({
    where: { expenseType: 'INCOME', description: { startsWith: 'Forfeited Token Income' } }
  });
  
  const tokens = await prisma.vehicleToken.findMany({
    where: { status: 'FORFEITED' },
    include: { vehicle: true }
  });

  const txs = await prisma.transaction.findMany({
    where: { referenceId: { in: tokens.map(t => t.id) } }
  });

  return NextResponse.json({
    expenses,
    tokens,
    txs
  });
}
