// utils/clerk.js
const fs   = require('fs');
const path = require('path');

let verifyClerkToken;

(async () => {
  // Dynamically import the ESM-only jose functions
  const { importSPKI, jwtVerify } = await import('jose');

  // Load your RSA PEM public key
  const pem = fs.readFileSync(
    path.join(__dirname, '../clerk_jwt_public_key.pem'),
    'utf8'
  );

  console.log(pem, 'pem from clerk');

  // Import it as RS256 (RSA SHA-256)
  const publicKey = await importSPKI(pem, 'RS256');
  console.log(publicKey, 'publicKey from clerk');

  verifyClerkToken = async (token) => {
    const { payload } = await jwtVerify(token, publicKey, {
      algorithms: ['RS256'],
      // issuer/audience checks here if you want them
    });
    return payload;
  };
})().catch(err => {
  console.error('Failed to initialize Clerk utils:', err);
  process.exit(1);
});

module.exports = {
  verifyClerkToken: (token) => {
    if (!verifyClerkToken) {
      throw new Error('Clerk utility not initialized yet');
    }
    return verifyClerkToken(token);
  }
};