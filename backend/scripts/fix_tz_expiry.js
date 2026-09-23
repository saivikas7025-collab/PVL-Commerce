const fs = require('fs');
const path = 'services/dispatchEngine.js';
let src = fs.readFileSync(path, 'utf8');
const before = src;

// --- Fix offerToStore ---
src = src.replace(
`async function offerToStore(orderId, storeId, score, cfg) {
  const expires = new Date(Date.now() + cfg.store_offer_timeout_seconds * 1000);
  await pool.query(
    \`INSERT INTO store_assignments (order_id, store_id, status, score, expires_at)
     VALUES ($1,$2,'offered',$3,$4)\`,
    [orderId, storeId, score, expires]
  );`,
`async function offerToStore(orderId, storeId, score, cfg) {
  const seconds = Number(cfg.store_offer_timeout_seconds) || 90;
  await pool.query(
    \`INSERT INTO store_assignments (order_id, store_id, status, score, expires_at)
     VALUES ($1,$2,'offered',$3, now() + ($4 || ' seconds')::interval)\`,
    [orderId, storeId, score, String(seconds)]
  );`
);

// --- Fix offerToDriver ---
src = src.replace(
`async function offerToDriver(orderId, driverId, score, cfg) {
  const expires = new Date(Date.now() + cfg.driver_offer_timeout_seconds * 1000);
  await pool.query(
    \`INSERT INTO delivery_assignments
       (order_id, delivery_partner_id, status, score, offered_at, expires_at)
     VALUES ($1,$2,'offered',$3, now(), $4)\`,
    [orderId, driverId, score, expires]
  );`,
`async function offerToDriver(orderId, driverId, score, cfg) {
  const seconds = Number(cfg.driver_offer_timeout_seconds) || 30;
  await pool.query(
    \`INSERT INTO delivery_assignments
       (order_id, delivery_partner_id, status, score, offered_at, expires_at)
     VALUES ($1,$2,'offered',$3, now(), now() + ($4 || ' seconds')::interval)\`,
    [orderId, driverId, score, String(seconds)]
  );`
);

if (src === before) {
  console.log('No changes made — pattern did not match. Paste the current offerToStore/offerToDriver functions.');
  process.exit(1);
}

fs.writeFileSync(path + '.tzfix.bak', before);
fs.writeFileSync(path, src);
console.log('dispatchEngine.js patched for timezone-safe expiry.');
