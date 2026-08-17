import pg from 'pg';
const { Pool } = pg;

// Use the local database URL from standard Prisma setups. 
// Assuming it's postgresql://postgres:postgres@localhost:5432/hariram?schema=public or similar.
// Actually, let's just use process.env.DATABASE_URL. We need to load .env.
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, '../.env') });

const pool = new Pool({
  connectionString: process.env.DATABASE_URL
});

async function run() {
  const res = await pool.query(`SELECT * FROM "Expense" WHERE "expenseType" = 'INCOME'`);
  console.log('Expenses:', res.rows);
  
  const tokens = await pool.query(`SELECT * FROM "VehicleToken"`);
  console.log('\nTokens:', tokens.rows);
  
  pool.end();
}

run().catch(console.error);
