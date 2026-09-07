import fs from 'node:fs';

const file='tools/license-generator/efc-license-generator.html';
if(!fs.existsSync(file)) throw new Error('Missing HTML license generator.');
const html=fs.readFileSync(file,'utf8');

const required=[
  'efc-license',
  'efc-license-v1',
  'ECDSA_P256_SHA256',
  'ECDSA',
  'P-256',
  'SHA-256',
  'crypto.subtle.importKey',
  'crypto.subtle.sign',
  'EFC-license-master-private.pem',
  'durationSeconds',
  'single-install'
];
for(const token of required){if(!html.includes(token))throw new Error(`HTML license generator missing: ${token}`);}
if(/-----BEGIN PRIVATE KEY-----[A-Za-z0-9+/=\s]+-----END PRIVATE KEY-----/.test(html))throw new Error('Private signing key must never be embedded in HTML.');
if(/<script\s+[^>]*src=/i.test(html))throw new Error('HTML generator must not load external scripts.');
if(/https?:\/\//i.test(html))throw new Error('HTML generator must be fully offline.');

const matches=[...html.matchAll(/<script>([\s\S]*?)<\/script>/gi)];
if(matches.length!==1)throw new Error('Expected one inline generator script.');
new Function(matches[0][1]);

const order=['licenseId','customerName','centerName','deviceId','edition','type','durationSeconds','activationMode','notes'];
let last=-1;
for(const field of order){
  const index=html.indexOf(`${field}:`,last+1);
  if(index<0)throw new Error(`Canonical payload field missing: ${field}`);
  if(index<last)throw new Error('Canonical payload field order changed.');
  last=index;
}

console.log('HTML activation generator verified: offline, no embedded private key, compatible payload/signature schema.');
