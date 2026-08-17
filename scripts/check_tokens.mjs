import prisma from '../src/lib/prisma.js';

async function run() {
  const expenses = await prisma.expense.findMany({
    where: { expenseType: 'INCOME', description: { startsWith: 'Forfeited Token Income' } }
  });
  console.log('Expenses:', JSON.stringify(expenses, null, 2));

  const tokens = await prisma.vehicleToken.findMany({
    where: { status: 'FORFEITED' }
  });
  console.log('\nTokens:', JSON.stringify(tokens, null, 2));

  const txs = await prisma.transaction.findMany({
    where: { referenceId: { in: tokens.map(t => t.id) } }
  });
  console.log('\nTxs:', JSON.stringify(txs, null, 2));
}

run()
  .catch(console.error);
