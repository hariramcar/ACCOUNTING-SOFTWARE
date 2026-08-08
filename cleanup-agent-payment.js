require('dotenv').config({ path: '.env.local' });
require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function run() {
  try {
    // Delete the Expense
    await pool.query(`DELETE FROM "Expense" WHERE "amount" = 700000 AND "expenseType" = 'INCOME'`);
    // Delete the Agent Transaction
    await pool.query(`DELETE FROM "Transaction" WHERE "amount" = 700000 AND "description" LIKE 'Payment Received for Sold Car: Toyota%'`);
    // Delete the Bank Transaction
    await pool.query(`DELETE FROM "Transaction" WHERE "amount" = 700000 AND "description" LIKE 'Income Received:%'`);
    
    console.log('Cleaned up the duplicate entries!');
  } catch(e) {
    console.error(e);
  }
  process.exit(0);
}
run();
