require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function getCarData() {
  console.log('Querying database for car...');
  
  const res = await pool.query(`SELECT * FROM "Vehicle" WHERE registration ILIKE '%gj05cr3392%'`);
  
  if (res.rows.length === 0) {
    console.log("Car not found in database.");
  } else {
    const car = res.rows[0];
    console.log("=== VEHICLE DATA ===");
    console.dir(car, { depth: null, colors: true });

    // Partnerships
    const pRes = await pool.query(`SELECT * FROM "Partnership" WHERE "vehicleId" = $1`, [car.id]);
    console.log("\n=== PARTNERSHIPS ===");
    console.dir(pRes.rows, { depth: null, colors: true });

    // Expenses
    const eRes = await pool.query(`SELECT * FROM "Expense" WHERE "vehicleId" = $1`, [car.id]);
    console.log("\n=== EXPENSES ===");
    console.dir(eRes.rows, { depth: null, colors: true });

    // Transactions matching make
    const tRes = await pool.query(`SELECT * FROM "Transaction" WHERE description ILIKE $1`, [`%${car.make}%`]);
    console.log("\n=== RELATED TRANSACTIONS ===");
    console.dir(tRes.rows, { depth: null, colors: true });
  }
}

getCarData()
  .catch(console.error)
  .finally(() => pool.end());
