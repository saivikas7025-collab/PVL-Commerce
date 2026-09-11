const { Pool } = require("pg");
require("dotenv").config();

// Prefer DATABASE_URL, but fall back to discrete env vars so existing
// developer setups keep working.
const pool = process.env.DATABASE_URL
  ? new Pool({ connectionString: process.env.DATABASE_URL })
  : new Pool({
      host: process.env.DB_HOST,
      port: Number(process.env.DB_PORT || 5432),
      database: process.env.DB_NAME,
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
    });

pool.on("error", (err) => {
  console.error("Unexpected PostgreSQL error:", err);
});

async function testDatabaseConnection() {
  try {
    const result = await pool.query("SELECT NOW() AS current_time");
    console.log(
      "PostgreSQL connected successfully:",
      result.rows[0].current_time
    );
  } catch (error) {
    console.error("PostgreSQL connection failed:", error.message);
  }
}

module.exports = {
  pool,
  testDatabaseConnection,
};
