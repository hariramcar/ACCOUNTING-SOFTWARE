const prisma = require('./src/lib/prisma').default;

async function run() {
  const badTx = await prisma.transaction.findMany({
    where: { account: { type: 'STAFF' }, category: 'EXPENSE', type: 'DEBIT' }
  });
  console.log('Bad transactions found:', badTx.length);
  
  if (badTx.length > 0) {
    for (const tx of badTx) {
      await prisma.transaction.update({
        where: { id: tx.id },
        data: { type: 'CREDIT' }
      });
      console.log('Fixed TX:', tx.id);
    }
  }
}
run();
