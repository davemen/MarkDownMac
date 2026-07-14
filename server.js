const fs = require('fs');
const path = require('path');
const https = require('https');
const { execSync } = require('child_process');
const express = require('express');

const PORT = 3000;
const CERTS_DIR = path.join(__dirname, 'certs');
const KEY_PATH = path.join(CERTS_DIR, 'key.pem');
const CERT_PATH = path.join(CERTS_DIR, 'cert.pem');

// 1. Ensure SSL certificates exist
function ensureCertificates() {
  if (!fs.existsSync(CERTS_DIR)) {
    fs.mkdirSync(CERTS_DIR, { recursive: true });
  }

  if (!fs.existsSync(KEY_PATH) || !fs.existsSync(CERT_PATH)) {
    console.log('Generating self-signed SSL certificates...');
    try {
      execSync(
        `openssl req -newkey rsa:2048 -x509 -nodes -keyout "${KEY_PATH}" -out "${CERT_PATH}" -days 365 -subj "/CN=localhost"`,
        { stdio: 'inherit' }
      );
      console.log('SSL certificates generated successfully.');

      // Try to register the certificate in the macOS Keychain so it is trusted automatically
      try {
        console.log('Attempting to add certificate to macOS Keychain...');
        // macOS Keychain file is usually login.keychain-db or login.keychain
        const keychainPath = path.join(process.env.HOME, 'Library/Keychains/login.keychain-db');
        const keychainPathLegacy = path.join(process.env.HOME, 'Library/Keychains/login.keychain');
        const keychain = fs.existsSync(keychainPath) ? keychainPath : keychainPathLegacy;

        execSync(
          `security add-trusted-cert -d -r trustRoot -k "${keychain}" "${CERT_PATH}"`,
          { stdio: 'inherit' }
        );
        console.log('Certificate added to macOS Keychain trust store.');
      } catch (keychainError) {
        console.warn('Could not add certificate to macOS Keychain trust store automatically.');
        console.warn('You may need to open https://localhost:3000 in Safari or Chrome and trust the certificate manually.');
      }
    } catch (err) {
      console.error('Error generating SSL certificates:', err);
      process.exit(1);
    }
  }
}

ensureCertificates();

// 2. Setup Express server
const app = express();

// Serve static files from the current directory
app.use(express.static(__dirname));

// Custom route for taskpane.html to ensure clean URL resolution
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'taskpane.html'));
});

// 3. Start HTTPS Server
try {
  const options = {
    key: fs.readFileSync(KEY_PATH),
    cert: fs.readFileSync(CERT_PATH)
  };

  https.createServer(options, app).listen(PORT, () => {
    console.log(`==================================================`);
    console.log(`Markdown Word Add-in server running securely at:`);
    console.log(`👉 https://localhost:${PORT}`);
    console.log(`==================================================`);
  });
} catch (serverError) {
  console.error('Failed to start HTTPS server:', serverError);
  process.exit(1);
}
