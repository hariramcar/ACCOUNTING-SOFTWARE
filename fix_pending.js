const prisma = require('./src/lib/prisma.js').default;

async function main() {
  const tx = await prisma.transaction.findFirst({ where: { description: { startsWith: 'Auto-Entry: Received Pending Capital from' } } });
  if (tx) {
    const exists = await prisma.transaction.findFirst({ where: { referenceId: tx.referenceId, type: 'DEBIT', description: { contains: 'Paid to Seller (from Partner Capital)' } } });
    if (!exists) {
      await prisma.transaction.create({
        data: {
          date: tx.date,
          transactionMode: tx.transactionMode,
          type: 'DEBIT',
          amount: tx.amount,
          accountId: tx.accountId,
          category: 'VEHICLE_PURCHASE',
          referenceId: tx.referenceId,
          description: tx.description.replace('Received Pending Capital from yash', 'Paid to Seller (from Partner Capital)').replace('Received Pending Capital from', 'Paid to Seller (from Partner Capital)')
        }
      });
      const vehicle = await prisma.vehicle.findUnique({ where: { id: tx.referenceId } });
      await prisma.vehicle.update({
        where: { id: tx.referenceId },
        data: { purchasePendingBalance: Math.max(0, Number(vehicle.purchasePendingBalance) - Number(tx.amount)) }
      });
      console.log('Fixed missing pass-through DEBIT!');
    } else {
      console.log('Already fixed!');
    }
  } else {
    console.log('No pending capital transaction found');
  }
}
main().catch(console.error).finally(() => process.exit(0));
