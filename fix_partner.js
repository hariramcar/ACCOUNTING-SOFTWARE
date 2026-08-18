
const { PrismaClient } = require('./src/generated/prisma/client');
const { PrismaPg } = require('@prisma/adapter-pg');
const { Pool } = require('pg');
require('dotenv').config({ path: '.env.local' });
require('dotenv').config({ path: '.env' });

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function fix() {
  const profitTx = await prisma.transaction.findFirst({
    where: { description: { contains: 'Profit Earned from sale of Maruti Suzuki swift' } },
    orderBy: { createdAt: 'desc' },
    include: { account: true }
  });

  if (!profitTx) return console.log('Profit Tx not found');
  console.log('Found profit tx for partner:', profitTx.account.name);
  
  const firmPayout = await prisma.transaction.findFirst({
    where: { 
      referenceId: profitTx.referenceId,
      description: { contains: 'Paid Full Settlement' },
      type: 'DEBIT'
    }
  });

  if (!firmPayout) return console.log('Firm payout not found');
  console.log('Found Firm Payout of amount:', firmPayout.amount);

  const existingDebit = await prisma.transaction.findFirst({
    where: {
      accountId: profitTx.accountId,
      referenceId: profitTx.referenceId,
      type: 'DEBIT',
      description: { contains: 'Received Full Settlement' }
    }
  });

  if (existingDebit) {
    return console.log('Already fixed!');
  }

  const created = await prisma.transaction.create({
    data: {
      date: firmPayout.date,
      transactionMode: 'CASH',
      type: 'DEBIT',
      amount: firmPayout.amount,
      accountId: profitTx.accountId,
      category: 'GENERAL',
      referenceId: profitTx.referenceId,
      description: 'Auto-Entry: Received Full Settlement (Capital + Profit Share) for Maruti Suzuki swift (gj05de1245)'
    }
  });

  console.log('Fixed Partner Ledger! Created Tx ID:', created.id);
}

fix().catch(console.error).finally(() => prisma['$disconnect']());

