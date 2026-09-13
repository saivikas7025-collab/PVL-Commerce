const { Client } = require('pg');

// Match emoji + pastel color by product name keyword
function iconFor(name) {
  const n = name.toLowerCase();
  if (n.includes('apple'))     return { icon: '🍎', color: '#FCE4E4' };
  if (n.includes('banana'))    return { icon: '🍌', color: '#FCEFD4' };
  if (n.includes('orange'))    return { icon: '🍊', color: '#FCE8D0' };
  if (n.includes('tomato'))    return { icon: '🍅', color: '#FBE0DC' };
  if (n.includes('onion'))     return { icon: '🧅', color: '#F5E4DC' };
  if (n.includes('potato'))    return { icon: '🥔', color: '#F0E4D4' };
  if (n.includes('milk'))      return { icon: '🥛', color: '#F0F0E8' };
  if (n.includes('egg'))       return { icon: '🥚', color: '#FAF3E4' };
  if (n.includes('paneer'))    return { icon: '🧈', color: '#FAF0DC' };
  if (n.includes('parle') || n.includes('biscuit') || n.includes('marie'))
                                return { icon: '🍪', color: '#F5E8D4' };
  if (n.includes('chips'))     return { icon: '🥔', color: '#F5EED8' };
  if (n.includes('coca') || n.includes('cola'))
                                return { icon: '🥤', color: '#F5E4E8' };
  if (n.includes('buttermilk')) return { icon: '🥛', color: '#F0E8F0' };
  if (n.includes('tea'))       return { icon: '☕', color: '#E8DCC8' };
  if (n.includes('surf'))      return { icon: '🧺', color: '#E0EEF5' };
  if (n.includes('vim'))       return { icon: '🧽', color: '#DEEBF8' };
  if (n.includes('colgate'))   return { icon: '🪥', color: '#E0F5F0' };
  return { icon: '📦', color: '#F0F0F0' };
}

(async () => {
  const c = new Client({ connectionString: process.env.DATABASE_URL });
  await c.connect();

  // Add columns if missing
  await c.query(`ALTER TABLE products ADD COLUMN IF NOT EXISTS icon VARCHAR(20)`);
  await c.query(`ALTER TABLE products ADD COLUMN IF NOT EXISTS bg_color VARCHAR(10)`);

  const all = await c.query(`SELECT id, name FROM products ORDER BY id`);
  console.log(`Updating ${all.rows.length} products...`);

  for (const p of all.rows) {
    const { icon, color } = iconFor(p.name);
    await c.query(
      `UPDATE products SET icon = $1, bg_color = $2 WHERE id = $3`,
      [icon, color, p.id]
    );
    console.log(`  ${p.name.padEnd(30)}  →  ${icon}`);
  }

  console.log('\n✅ PRODUCTS UPDATED');
  await c.end();
})().catch(e => { console.error('FAILED:', e.message); process.exit(1); });
