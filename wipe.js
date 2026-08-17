const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function main() {
  try {
    console.log('Starting data wipe using raw SQL...');
    
    // Delete in reverse relational order to avoid foreign key constraints
    await pool.query('DELETE FROM "Transaction"');
    console.log('Deleted transactions.');
    
    await pool.query('DELETE FROM "Partnership"');
    console.log('Deleted partnerships.');
    
    await pool.query('DELETE FROM "Expense"');
    console.log('Deleted expenses.');
    
    await pool.query('DELETE FROM "Vehicle"');
    console.log('Deleted vehicles.');
    
    // We do not delete the 'Account' named 'CASH' or 'BANK' if we wanted to keep them,
    // but the user said "all pages data will be deleted", only ID is kept.
    // However, if we delete all accounts, we might need to recreate them later, or the user will create them.
    await pool.query('DELETE FROM "Account"');
    console.log('Deleted accounts.');
    
    // Delete all users EXCEPT the admin
    await pool.query('DELETE FROM "User" WHERE username != $1', ['admin@hariramcars.com']);
    console.log('Deleted all users except admin@hariramcars.com.');

    console.log('✅ Wipe completed successfully! Only Hariram Motor Admin ID remains.');
  } catch (err) {
    console.error('❌ Wipe failed:', err);
  } finally {
    await pool.end();
  }
}

main();
