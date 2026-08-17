import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function testBalance() {
  const cashAccount = await prisma.account.findFirst({
    where: { name: 'cash' }
  });
  
  if (!cashAccount) {
    console.log("No cash account found.");
    return;
  }

  console.log("Cash account:", cashAccount.name, "Opening:", cashAccount.openingBalance.toString());

  // Try checkSufficientBalance logic
  const requiredAmount = 500000;
  
  const aggregates = await prisma.transaction.groupBy({
    by: ['type'],
    where: { accountId: cashAccount.id },
    _sum: { amount: true }
  });

  let totalCredit = 0;
  let totalDebit = 0;
  
  aggregates.forEach(agg => {
    if (agg.type === 'CREDIT') totalCredit = Number(agg._sum.amount ? agg._sum.amount.toString() : 0);
    if (agg.type === 'DEBIT') totalDebit = Number(agg._sum.amount ? agg._sum.amount.toString() : 0);
  });

  const openingBalance = cashAccount.openingBalance ? Number(cashAccount.openingBalance.toString()) : 0;
  const currentBalance = openingBalance + totalCredit - totalDebit;
  
  console.log("Total Credit:", totalCredit);
  console.log("Total Debit:", totalDebit);
  console.log("Current Balance:", currentBalance);
  console.log("Required Amount:", requiredAmount);

  if (currentBalance < requiredAmount) {
    console.log(`Insufficient funds. Throws error! (Balance: ${currentBalance} < Required: ${requiredAmount})`);
  } else {
    console.log("Sufficient funds. Passes check.");
  }
}

testBalance().catch(console.error).finally(() => prisma.$disconnect());
