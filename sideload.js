const fs = require('fs');
const path = require('path');

const wefDir = '/Users/davemendlen/Library/Containers/com.microsoft.Word/Data/Documents/wef';
const manifestSource = path.join(__dirname, 'manifest.xml');
const manifestDest = path.join(wefDir, 'manifest.xml');

try {
  console.log(`Checking WEF directory: ${wefDir}`);
  if (!fs.existsSync(wefDir)) {
    fs.mkdirSync(wefDir, { recursive: true });
    console.log('Successfully created WEF directory.');
  } else {
    console.log('WEF directory already exists.');
  }

  console.log(`Copying manifest from ${manifestSource} to ${manifestDest}`);
  fs.copyFileSync(manifestSource, manifestDest);
  console.log('Successfully copied manifest.xml to Word sideload folder!');
} catch (err) {
  console.error('Sideload failed with error:', err.message);
  process.exit(1);
}
