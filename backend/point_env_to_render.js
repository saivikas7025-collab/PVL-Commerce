// point_env_to_render.js — one-shot. Idempotent. Backs up .env first.
const fs   = require('fs');
const path = require('path');

const RENDER_URL = 'postgresql://pvl_commerce_user:MgfLImjED0WYBZyHEHuSJ7p4RW2Q4aaK@dpg-dahuav4s728c73dkitvg-a.singapore-postgres.render.com/pvl_commerce?sslmode=require';
const envPath    = path.join(__dirname, '.env');
const stamp      = new Date().toISOString().replace(/[:.]/g, '-');
const backup     = envPath + '.bak_' + stamp;

if (!fs.existsSync(envPath)) { console.error('No .env found at', envPath); process.exit(1); }

// Backup
fs.copyFileSync(envPath, backup);
console.log('[backup]', path.basename(backup));

let lines = fs.readFileSync(envPath, 'utf8').split(/\r?\n/);
let replaced = false;
let out = [];

for (const line of lines) {
  if (/^\s*DATABASE_URL\s*=/.test(line)) {
    out.push(`DATABASE_URL=${RENDER_URL}`);
    replaced = true;
  } else {
    out.push(line);
  }
}

if (!replaced) {
  // insert DATABASE_URL right after the PORT line (or at the top)
  const idx = out.findIndex(l => /^\s*PORT\s*=/.test(l));
  const insertAt = idx >= 0 ? idx + 1 : 0;
  out.splice(insertAt, 0, '', `DATABASE_URL=${RENDER_URL}`);
}

fs.writeFileSync(envPath, out.join('\n'), 'utf8');
console.log(replaced ? '[updated] DATABASE_URL replaced' : '[added]   DATABASE_URL inserted');
console.log('\nDone. Restart the backend to pick up the change.');