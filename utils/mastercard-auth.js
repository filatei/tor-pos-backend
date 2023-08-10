// The following code shows how to load the private key using node-forge:

const forge = require("node-forge");
const fs = require("fs");
const os = require("os");
const oauth = require('mastercard-oauth1-signer');

function generateAuthHeader() {

  
  const hostname = os.hostname();
  const homedir = os.homedir();
  
  const p12Content = fs.readFileSync(`${homedir}/keys/Torama_Pay-sandbox.p12`, 'binary');
  const p12Asn1 = forge.asn1.fromDer(p12Content, false);
  const p12 = forge.pkcs12.pkcs12FromAsn1(p12Asn1, false, "keystorepassword");
  const keyObj = p12.getBags({
      friendlyName: "keyalias",
      bagType: forge.pki.oids.pkcs8ShroudedKeyBag
  }).friendlyName[0];
  const signingKey = forge.pki.privateKeyToPem(keyObj.key);

  const consumerKey = "JHfaJqBOAnIIygruFZ3SH3NaJjoW4wOBGbot3eN466603007!317f372a144a48c89260965b3c9349f50000000000000000";
  const uri = "https://sandbox.api.mastercard.com/service";
  const method = "POST";
  const payload = "Hello world!";

  const authHeader = oauth.getAuthorizationHeader(uri, method, payload, consumerKey, signingKey);
  return authHeader;
}

module.exports = generateAuthHeader;

