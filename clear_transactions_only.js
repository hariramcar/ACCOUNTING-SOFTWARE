require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function clearData() {
  console.log('Clearing transactional data...');
  
  // 1. Delete all records in order of dependencies
  await pool.query('DELETE FROM "Transaction"');
  await pool.query('DELETE FROM "Expense"');
  await pool.query('DELETE FROM "Partnership"');
  
  // 2. Vehicles
  await pool.query('DELETE FROM "Vehicle"');

  console.log('✅ All Transactions, Expenses, Vehicles, and Partnerships cleared successfully!');
  console.log('✅ Accounts (Bank, Cash, Partners) and Users were preserved.');
}

clearData()
  .catch((e) => {
    console.error('Failed to clear database:', e);
    process.exit(1);
  })
  .finally(() => {
    pool.end();
  });
