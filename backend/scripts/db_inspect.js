// backend/scripts/db_inspect.js
require('dotenv').config();
const { Pool } = require('pg');

const dbUrl = new URL(process.env.DATABASE_URL);
const pool = new Pool({
  host: dbUrl.hostname,
  port: Number(dbUrl.port || 5432),
  user: decodeURIComponent(dbUrl.username),
  password: decodeURIComponent(dbUrl.password),
  database: dbUrl.pathname.replace('/', ''),
  ssl: { rejectUnauthorized: false },
});

const QUERIES = {
  sections: `SELECT section, COUNT(*) AS cnt
             FROM categories
             GROUP BY section
             ORDER BY section;`,

  categories_fv: `SELECT id, name, section
                  FROM categories
                  WHERE section = 'Fruits & Vegetables'
                  ORDER BY name;`,

  categories_cd: `SELECT id, name, section
                  FROM categories
                  WHERE section = 'Cold Drinks & Juices'
                  ORDER BY name;`,

  products_per_section: `SELECT c.section, COUNT(*) AS cnt
                         FROM products p
                         JOIN categories c ON c.id = p.category_id
                         GROUP BY c.section
                         ORDER BY c.section;`,

  fv_breakdown: `SELECT c.name AS category, COUNT(*) AS cnt
                 FROM products p
                 JOIN categories c ON c.id = p.category_id
                 WHERE c.section = 'Fruits & Vegetables'
                 GROUP BY c.name
                 ORDER BY c.name;`,

  cd_breakdown: `SELECT c.name AS category, COUNT(*) AS cnt
                 FROM products p
                 JOIN categories c ON c.id = p.category_id
                 WHERE c.section = 'Cold Drinks & Juices'
                 GROUP BY c.name
                 ORDER BY c.name;`,

  // Garbage rows that got mis-imported
  garbage_rows: `SELECT p.id, c.section, c.name AS category, p.name
                 FROM products p
                 JOIN categories c ON c.id = p.category_id
                 WHERE p.name LIKE '-%**%'
                    OR p.name LIKE '%loaded rows%'
                    OR p.name LIKE '%shown rows%'
                    OR p.name LIKE '%much larger full totals%'
                 ORDER BY p.id;`,

  product_cols: `SELECT column_name, data_type, is_nullable
                 FROM information_schema.columns
                 WHERE table_name = 'products'
                 ORDER BY ordinal_position;`,

  category_cols: `SELECT column_name, data_type, is_nullable
                  FROM information_schema.columns
                  WHERE table_name = 'categories'
                  ORDER BY ordinal_position;`,
};

(async () => {
  const name = process.argv[2] || 'sections';
  const sql = QUERIES[name];
  if (!sql) {
    console.log('Available queries: ' + Object.keys(QUERIES).join(', '));
    process.exit(1);
  }
  try {
    const { rows } = await pool.query(sql);
    console.log(`\n=== ${name} ===`);
    console.table(rows);
  } catch (e) {
    console.error(e.message);
  } finally {
    await pool.end();
  }
})();