require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function run() {
  try {
    const res = await pool.query(`SELECT id FROM "Account" WHERE "name" ILIKE '%icici%'`);
    for (const row of res.rows) {
      const accountId = row.id;
      // Nullify references in User
      await pool.query(`UPDATE "User" SET "accountId" = NULL WHERE "accountId" = $1`, [accountId]);
      // Delete Vehicles payable to this account
      await pool.query(`UPDATE "Vehicle" SET "payableAccountId" = NULL WHERE "payableAccountId" = $1`, [accountId]);
      await pool.query(`UPDATE "Vehicle" SET "receivableAccountId" = NULL WHERE "receivableAccountId" = $1`, [accountId]);
      // Delete Partnerships using this account
      await pool.query(`DELETE FROM "Partnership" WHERE "partnerAccountId" = $1`, [accountId]);
      // Delete transactions tied to this account
      await pool.query(`DELETE FROM "Transaction" WHERE "accountId" = $1`, [accountId]);
      // Delete the account
      await pool.query(`DELETE FROM "Account" WHERE "id" = $1`, [accountId]);
    }
    console.log('Deleted icici accounts completely!');
    process.exit(0);
  } catch (error) {
    console.error(error);
    process.exit(1);
  }
}
run();
