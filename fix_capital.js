
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

  // Check if they already exist
  const existingCapital = await prisma.transaction.findFirst({
    where: {
      accountId: profitTx.accountId,
      referenceId: profitTx.referenceId,
      description: { contains: 'Auto-Entry: Partnership Capital Investment for Maruti Suzuki swift' }
    }
  });

  if (existingCapital) {
    return console.log('Capital already fixed!');
  }

  // Create ICICI Capital
  await prisma.transaction.create({
    data: {
      date: new Date('2026-08-18T00:00:00Z'), // Approximate purchase date
      transactionMode: 'CASH', // Internal ledger mode
      type: 'CREDIT',
      amount: 100000,
      accountId: profitTx.accountId,
      category: 'GENERAL',
      referenceId: profitTx.referenceId,
      description: 'Auto-Entry: Partnership Capital Investment for Maruti Suzuki swift (gj05de1245) - Payment 1'
    }
  });

  // Create Cash Capital
  await prisma.transaction.create({
    data: {
      date: new Date('2026-08-18T00:00:00Z'),
      transactionMode: 'CASH',
      type: 'CREDIT',
      amount: 200000,
      accountId: profitTx.accountId,
      category: 'GENERAL',
      referenceId: profitTx.referenceId,
      description: 'Auto-Entry: Partnership Capital Investment for Maruti Suzuki swift (gj05de1245) - Payment 2'
    }
  });

  console.log('Fixed Partner Capital Ledger!');
}

fix().catch(console.error).finally(() => prisma['$disconnect']());

