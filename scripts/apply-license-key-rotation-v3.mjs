import fs from 'node:fs';

const OLD_KEY_ID='efc-license-v2';
const NEW_KEY_ID='efc-license-v3';
const OLD_PUBLIC='BAbRmaYeE4aeAI09ADkpDXreSynMo3LY9GTgQti1ava5MPqzOld4EKamVj2pnzAR5h1ypeOVjOQ9fcIEzCzzgr0';
const NEW_PUBLIC='BDDLo6mYqhmQbaUyS_xmMkebb3Nz28ZmWU3bF6alhqeXt7mxLrk_pxDc4vaz9RXV5mICatMtADIQvkF4EdLM8LY';
const OLD_FILE='EFC-license-master-private.pem';
const NEW_FILE='EFC-license-master-private-v3.pem';

function replaceAll(path, replacements){
  let text=fs.readFileSync(path,'utf8');
  for(const [from,to,min=1] of replacements){
    const count=text.split(from).length-1;
    if(count<min) throw new Error(`${path}: expected at least ${min} occurrence(s) of ${from}, found ${count}`);
    text=text.split(from).join(to);
  }
  fs.writeFileSync(path,text);
}

replaceAll('src-tauri/src/license.rs',[
  [OLD_KEY_ID,NEW_KEY_ID],
  [OLD_PUBLIC,NEW_PUBLIC]
]);

replaceAll('tools/license-generator/src/main.rs',[
  [OLD_KEY_ID,NEW_KEY_ID],
  [OLD_PUBLIC,NEW_PUBLIC],
  [OLD_FILE,NEW_FILE]
]);

replaceAll('tools/license-generator/efc-license-generator.html',[
  [OLD_KEY_ID,NEW_KEY_ID],
  [OLD_PUBLIC,NEW_PUBLIC],
  [OLD_FILE,NEW_FILE],
  ['EFC license private-key validation v2','EFC license private-key validation v3']
]);

replaceAll('tools/license-generator/README-HTML.txt',[
  [OLD_FILE,NEW_FILE]
]);

replaceAll('scripts/verify-license-generator-html.mjs',[
  [OLD_KEY_ID,NEW_KEY_ID],
  [OLD_FILE,NEW_FILE],
  ['compatible v2 payload/signature schema','compatible v3 signing key / current payload schema']
]);

const verifier=`import fs from 'node:fs';\n\nconst KEY_ID='${NEW_KEY_ID}';\nconst PUBLIC_KEY='${NEW_PUBLIC}';\nconst PRIVATE_NAME='${NEW_FILE}';\nconst files=[\n  'src-tauri/src/license.rs',\n  'tools/license-generator/src/main.rs',\n  'tools/license-generator/efc-license-generator.html'\n];\nfor(const file of files){\n  const text=fs.readFileSync(file,'utf8');\n  if(!text.includes(KEY_ID)) throw new Error(\`\${file}: missing current key id \${KEY_ID}\`);\n  if(!text.includes(PUBLIC_KEY)) throw new Error(\`\${file}: missing current public key\`);\n  if(text.includes('${OLD_KEY_ID}')||text.includes('${OLD_PUBLIC}')) throw new Error(\`\${file}: stale v2 activation key material remains\`);\n}\nconst html=fs.readFileSync('tools/license-generator/efc-license-generator.html','utf8');\nconst rustGenerator=fs.readFileSync('tools/license-generator/src/main.rs','utf8');\nif(!html.includes(PRIVATE_NAME)||!rustGenerator.includes(PRIVATE_NAME)) throw new Error('Current private-key filename is not consistent across activation generators.');\nif(/-----BEGIN PRIVATE KEY-----[A-Za-z0-9+/=\\s]+-----END PRIVATE KEY-----/.test(html)) throw new Error('Private activation key must never be embedded in HTML.');\nconsole.log('Activation signing key v3 verified across Windows verifier and both generators.');\n`;
fs.writeFileSync('scripts/verify-license-key-v3.mjs',verifier);

const pkg=JSON.parse(fs.readFileSync('package.json','utf8'));
const token='node scripts/verify-license-key-v3.mjs';
if(!pkg.scripts.check.includes(token)) pkg.scripts.check += ` && ${token}`;
fs.writeFileSync('package.json',JSON.stringify(pkg,null,2)+'\n');

for(const path of ['src-tauri/src/license.rs','tools/license-generator/src/main.rs','tools/license-generator/efc-license-generator.html']){
  const text=fs.readFileSync(path,'utf8');
  if(text.includes(OLD_PUBLIC)||text.includes(OLD_KEY_ID)) throw new Error(`${path}: old activation key still present after rotation`);
}
console.log('Applied complete EFC activation signing-key rotation to v3.');
