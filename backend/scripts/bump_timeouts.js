require('dotenv').config({ quiet: true });
const { pool } = require('../db');
(async () => {
  try {
    await pool.query(`UPDATE dispatch_config SET store_offer_timeout_seconds = 600, driver_offer_timeout_seconds = 600 WHERE id=1`);
    const { rows } = await pool.query(`SELECT store_offer_timeout_seconds, driver_offer_timeout_seconds FROM dispatch_config WHERE id=1`);
    console.log('New timeouts (dev):', rows[0]);
  } finally { await pool.end(); }
})();
