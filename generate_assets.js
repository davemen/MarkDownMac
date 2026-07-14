const fs = require('fs');
const path = require('path');

const assetsDir = path.join(__dirname, 'assets');
if (!fs.existsSync(assetsDir)) {
  fs.mkdirSync(assetsDir, { recursive: true });
}

// 1x1 transparent PNG hex
const pngHex = '89504e470d0a1a0a0000000d49484452000000010000000108060000001f15c4890000000d49444154789c6360606060000000050001222fa16b0000000049454e44ae426082';
const pngBuffer = Buffer.from(pngHex, 'hex');

fs.writeFileSync(path.join(assetsDir, 'icon-16.png'), pngBuffer);
fs.writeFileSync(path.join(assetsDir, 'icon-32.png'), pngBuffer);
fs.writeFileSync(path.join(assetsDir, 'icon-80.png'), pngBuffer);

console.log('Icons generated successfully in assets/ directory.');
