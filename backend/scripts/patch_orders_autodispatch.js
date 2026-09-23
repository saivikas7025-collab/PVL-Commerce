const fs = require('fs');
const path = 'routes/orders.js';
let src = fs.readFileSync(path, 'utf8');
if (src.charCodeAt(0) === 0xFEFF) src = src.slice(1);
const before = src;

// Add engine require
if (!src.includes("services/dispatchEngine")) {
  const anchor = "const express = require('express');";
  const i = src.indexOf(anchor);
  if (i === -1) throw new Error('express anchor not found');
  const at = i + anchor.length;
  src = src.slice(0, at) + "\nconst dispatchEngine = require('../services/dispatchEngine');" + src.slice(at);
  console.log('orders.js: added engine require.');
}

// Find the POST '/' handler that creates an order (usually responds with the new order id)
// We'll inject an auto-dispatch call right before res.json({...}) success response.
// This is a targeted patch: look for the FIRST occurrence of a POST '/' that returns an order.
// Guard: skip if already patched.
if (src.includes('__AUTO_DISPATCH_PATCHED__')) {
  console.log('orders.js: auto-dispatch already patched.');
} else {
  // Find the post / handler
  const postIdx = src.indexOf("router.post('/'");
  const postIdx2 = postIdx === -1 ? src.indexOf('router.post("/"') : postIdx;
  if (postIdx2 === -1) throw new Error('POST / handler not found in orders.js');

  // Find the first successful res.json inside that handler
  // We look for 'res.json(' or 'res.status(201).json(' after postIdx2
  const window = src.slice(postIdx2, postIdx2 + 8000);
  const jsonMatch = window.match(/return res(\.status\(\d+\))?\.json\(/);
  if (!jsonMatch) throw new Error('No res.json found in POST handler');

  const insertAt = postIdx2 + jsonMatch.index;
  // Insert a dispatch call BEFORE the json response
  // We need to know what the order id variable is called — commonly `order.id` or `result.rows[0].id`
  // To be safe, dispatch on the LAST inserted order for this user
  const patch = `/* __AUTO_DISPATCH_PATCHED__ */
    try {
      const lastOrder = await pool.query('SELECT id FROM orders WHERE user_id=$1 ORDER BY id DESC LIMIT 1', [req.userId || req.user?.id || req.body.userId]);
      if (lastOrder.rowCount > 0) {
        dispatchEngine.dispatchOrder(lastOrder.rows[0].id).catch(err =>
          console.error('[auto-dispatch] order', lastOrder.rows[0].id, 'failed:', err.message)
        );
      }
    } catch (e) {
      console.error('[auto-dispatch] trigger failed:', e.message);
    }
    `;

  src = src.slice(0, insertAt) + patch + src.slice(insertAt);
  console.log('orders.js: auto-dispatch inserted before response.');
}

fs.writeFileSync(path + '.dispatch.bak', before);
fs.writeFileSync(path, src);
console.log('orders.js patched.');
