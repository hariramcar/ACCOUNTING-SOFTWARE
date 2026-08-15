require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function clearData() {
  console.log('Clearing database...');
  
  // 1. Unlink accounts from users to prevent foreign key issues
  await pool.query('UPDATE "User" SET "accountId" = NULL');

  // 2. Delete all records in order of dependencies
  await pool.query('DELETE FROM "Transaction"');
  await pool.query('DELETE FROM "Expense"');
  await pool.query('DELETE FROM "Partnership"');
  
  // 3. Vehicles might have foreign keys to accounts
  await pool.query('DELETE FROM "Vehicle"');
  
  // 4. Delete all accounts
  await pool.query('DELETE FROM "Account"');

  // 5. Delete all users except admin@hariramcars.com
  await pool.query('DELETE FROM "User" WHERE username != $1', ['admin@hariramcars.com']);

  console.log('✅ All data cleared successfully! The system is now completely fresh.');
  console.log('✅ Admin users were preserved so you can still log in.');
}

clearData()
  .catch((e) => {
    console.error('Failed to clear database:', e);
    process.exit(1);
  })
  .finally(() => {
    pool.end();
  });
