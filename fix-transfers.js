require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function main() {
  const result = await pool.query(`
    SELECT t.id, t.description, a.type as account_type, t."transactionMode"
    FROM "Transaction" t
    JOIN "Account" a ON t."accountId" = a.id
    WHERE t.category = 'INTERNAL_TRANSFER'
  `);
  
  const transfers = result.rows;
  console.log(`Found ${transfers.length} internal transfers to fix.`);

  for (const tx of transfers) {
    const mode = tx.account_type === 'BANK' ? 'BANK' : 'CASH';
    if (tx.transactionMode !== mode) {
      console.log(`Updating tx ${tx.id} (${tx.description}) mode from ${tx.transactionMode} to ${mode}`);
      await pool.query(`UPDATE "Transaction" SET "transactionMode" = $1 WHERE id = $2`, [mode, tx.id]);
    }
  }
  
  console.log('Done!');
}

main()
  .catch(console.error)
  .finally(() => pool.end());
