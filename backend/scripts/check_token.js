const fs = require('fs');
const t = JSON.parse(fs.readFileSync('./token.json', 'utf8'));
console.log('Has refresh_token:', !!t.refresh_token);
console.log('Has access_token:', !!t.access_token);
console.log('Refresh token length:', t.refresh_token ? t.refresh_token.length : 0);
if (t.refresh_token) console.log('Refresh token starts with:', t.refresh_token.slice(0, 20) + '...');
