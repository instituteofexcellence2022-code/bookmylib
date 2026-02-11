const fs = require('fs');
const buf = fs.readFileSync('prisma/schema.prisma');
if (buf[0] === 0xEF && buf[1] === 0xBB && buf[2] === 0xBF) {
    const newBuf = buf.slice(3);
    fs.writeFileSync('prisma/schema.prisma', newBuf);
    console.log('Removed BOM');
} else {
    console.log('No BOM found');
}
