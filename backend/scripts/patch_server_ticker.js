const fs = require('fs');
const path = 'server.js';
let src = fs.readFileSync(path, 'utf8');
if (src.charCodeAt(0) === 0xFEFF) src = src.slice(1);
const before = src;

if (!src.includes("services/dispatchTicker")) {
  // Add require near top
  const anchor = "const dispatchRoutes = require('./routes/dispatch');";
  const i = src.indexOf(anchor);
  if (i === -1) throw new Error('dispatch require anchor not found');
  const at = i + anchor.length;
  src = src.slice(0, at) + "\nconst { startDispatchTicker } = require('./services/dispatchTicker');" + src.slice(at);
  console.log('server.js: added ticker require.');
}

if (!src.includes('__TICKER_STARTED__')) {
  // Add start call right before httpServer.listen(...)
  const listenIdx = src.indexOf('httpServer.listen');
  if (listenIdx === -1) throw new Error('httpServer.listen not found');
  const patch = `/* __TICKER_STARTED__ */\ntry { startDispatchTicker(15000); } catch (e) { console.error('[dispatch] ticker start failed:', e.message); }\n\n`;
  src = src.slice(0, listenIdx) + patch + src.slice(listenIdx);
  console.log('server.js: ticker start inserted.');
}

fs.writeFileSync(path + '.ticker.bak', before);
fs.writeFileSync(path, src);
console.log('server.js patched for ticker.');
