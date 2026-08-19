import { PrismaClient } from './src/generated/prisma/client/index.js';
import { PrismaLibSQL } from '@prisma/adapter-libsql';
import { createClient } from '@libsql/client';

const libsql = createClient({ url: 'file:prisma/dev.db' });
const adapter = new PrismaLibSQL(libsql);
const prisma = new PrismaClient({ adapter });

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

  const allStaff = await prisma.transaction.findMany({
    where: { account: { type: 'STAFF' } }
  });
  console.log('All Staff TX:', allStaff.map(x => ({ type: x.type, amount: x.amount, cat: x.category })));
}
run();
