const fs = require('fs');
const buf = fs.readFileSync('prisma/schema.prisma');
console.log('First 4 bytes:', buf.slice(0, 4));
const str = buf.toString('utf8');
console.log('First 20 chars (utf8):', str.substring(0, 20));
