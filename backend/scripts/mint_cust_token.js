require('dotenv').config({ quiet: true });
const { pool } = require('../db');
const jwt = require('jsonwebtoken');
(async () => {
  try {
    const { rows: [u] } = await pool.query(`SELECT id FROM users WHERE role='customer' LIMIT 1`);
    const { rows: [a] } = await pool.query(`SELECT id FROM addresses WHERE user_id=$1 LIMIT 1`, [u.id]);
    const token = jwt.sign({ userId: u.id, role: 'customer' }, process.env.JWT_SECRET, { expiresIn: '1h' });
    console.log(JSON.stringify({ userId: u.id, addrId: a.id, token }));
  } finally { await pool.end(); }
})();
