const fs = require('fs');
const path = 'middleware/auth.js';
let src = fs.readFileSync(path, 'utf8');
if (src.charCodeAt(0) === 0xFEFF) src = src.slice(1);
const before = src;

if (src.includes('__QUERY_TOKEN_FALLBACK__')) {
  console.log('Already patched.');
} else {
  // Replace the first ~11 lines of the function body with query-token-aware version
  const oldHead = `function authenticate(req, res, next) {
    try {
        const header = req.headers.authorization || "";

        if (!header.startsWith("Bearer ")) {
            return res.status(401).json({
                success: false,
                message: "Authentication required"
            });
        }

        const token = header.substring(7).trim();`;

  const newHead = `function authenticate(req, res, next) {
    try {
        /* __QUERY_TOKEN_FALLBACK__ */
        const header = req.headers.authorization || "";
        let token = null;

        if (header.startsWith("Bearer ")) {
            token = header.substring(7).trim();
        } else if (req.method === 'GET' && typeof req.query.token === 'string') {
            // Allow ?token= on GET only (browser link-opens can't send headers)
            token = req.query.token.trim();
        }

        if (!token) {
            return res.status(401).json({
                success: false,
                message: "Authentication required"
            });
        }`;

  if (!src.includes(oldHead)) {
    console.error('Anchor not found — pasting snippet of actual file:');
    console.error(JSON.stringify(src.slice(0, 400)));
    process.exit(1);
  }
  src = src.replace(oldHead, newHead);
  console.log('auth.js: added ?token= fallback for GET.');
}

fs.writeFileSync(path + '.querytok.bak', before);
fs.writeFileSync(path, src);
console.log('auth.js saved.');
