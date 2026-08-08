require('dotenv').config({ path: '.env.local' });
require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function run() {
  try {
    const res = await pool.query(`SELECT id FROM "Account" WHERE name ILIKE '%raj%' LIMIT 1`);
    const raj = res.rows[0];
    if(raj) {
      await pool.query(`UPDATE "Vehicle" SET "salePendingBalance" = 700000, "receivableAccountId" = $1 WHERE "registration" = 'gj05de1246'`, [raj.id]);
      console.log('Fixed Toyota Glanza!');
    } else {
      console.log('Raj not found!');
    }
  } catch(e) {
    console.error(e);
  }
  process.exit(0);
}
run();
