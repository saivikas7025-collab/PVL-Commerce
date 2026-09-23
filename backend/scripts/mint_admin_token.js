require('dotenv').config({ quiet: true });
const jwt = require('jsonwebtoken');
const secret = process.env.JWT_SECRET;
if (!secret) { process.stderr.write('FATAL: JWT_SECRET missing\n'); process.exit(1); }
process.stdout.write(jwt.sign({ userId: 1, role: 'admin' }, secret, { expiresIn: '2h' }));
