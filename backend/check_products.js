const { pool } = require("./db");
pool.query("SELECT column_name, data_type, is_nullable, column_default FROM information_schema.columns WHERE table_name = $1 ORDER BY ordinal_position", ["products"])
.then(r => { console.table(r.rows); return pool.end(); })
.catch(e => { console.error(e.message); pool.end(); });
