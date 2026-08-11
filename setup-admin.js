require('dotenv').config();
const { Pool } = require('pg');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function main() {
  const hashedPassword = await bcrypt.hash('admin@123', 10);
  
  const query = `
    INSERT INTO "User" (id, username, password, name, role, "createdAt", "updatedAt")
    VALUES ($1, $2, $3, $4, $5, NOW(), NOW())
    ON CONFLICT (username) DO NOTHING
  `;
  
  const id = crypto.randomUUID();
  await pool.query(query, [id, 'admin@Hariramcars.com', hashedPassword, 'Super Admin', 'ADMIN']);
  
  console.log('✅ Admin user successfully created: admin@Hariramcars.com');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => {
    pool.end();
  });
