import { readFile } from 'node:fs/promises';

const sequence=await readFile('assets/production-receipt-sequences-v10.js','utf8');
const certificates=await readFile('assets/production-certificates-v13.js','utf8');
const gate=await readFile('assets/production-license-gate-v8.js','utf8');
const index=await readFile('index.html','utf8');
const license=await readFile('src-tauri/src/license.rs','utf8');
const generator=await readFile('tools/license-generator/efc-license-generator.html','utf8');
const generatorRust=await readFile('tools/license-generator/src/main.rs','utf8');

new Function(sequence);
new Function(certificates);

for(const token of [
  'registrationReceiptNo',
  'payment[8]=number',
  'model.receipt=String',
  'generalReceiptsNumericOnly:true',
  'generalReceiptsStartAtOne:true',
  'certificateReceiptsStartAtOne:true',
  'externalCertificateRegistrationNative:true',
  'noCertificateDomObserver:true',
  'noCertificateReloadPatch:true',
  'legacyReceiptPrefixesRemoved:true'
]){
  if(!sequence.includes(token))throw new Error(`Receipt v10 feature missing: ${token}`);
}
for(const token of [
  'certExternalRegV13',
  'أدخل رقم تسجيل الطالب',
  'reg,',
  'externalRegistrationNative:true',
  'receiptHeaderUnified:true',
  'certificateReceiptTitleLarge:true',
  'noObserverPatch:true'
]){
  if(!certificates.includes(token))throw new Error(`Native certificate v13 feature missing: ${token}`);
}
if(sequence.includes('MutationObserver')||sequence.includes('window.open=')||sequence.includes('location.reload()'))throw new Error('Receipt sequencing must not patch certificate DOM/window/reload behavior.');
if(certificates.includes('new MutationObserver('))throw new Error('Certificates v13 must not use DOM observers.');
if(!gate.includes("'./assets/production-certificates-v13.js'"))throw new Error('Certificates v13 are not loaded by the license gate.');
if(!gate.includes("'./assets/production-receipt-sequences-v10.js'"))throw new Error('Receipt sequencing is not loaded by the license gate.');
if(gate.indexOf('production-receipt-sequences-v10.js')<gate.indexOf('production-certificates-v13.js'))throw new Error('Receipt sequencing must load after native certificates v13.');
if(!index.includes('./assets/production-certificates-v13.js')||!index.includes('./assets/production-receipt-sequences-v10.js'))throw new Error('Runtime documentation is missing certificate/receipt sequence layers.');

const publicKey='BAbRmaYeE4aeAI09ADkpDXreSynMo3LY9GTgQti1ava5MPqzOld4EKamVj2pnzAR5h1ypeOVjOQ9fcIEzCzzgr0';
for(const [name,source] of [['license.rs',license],['HTML generator template',generator],['legacy generator',generatorRust]]){
  if(!source.includes('efc-license-v2'))throw new Error(`${name} is not on key id v2.`);
  if(!source.includes(publicKey))throw new Error(`${name} does not use the v2 public key.`);
}
if(license.includes('BK_2ws4TMDStsDqV7HokicMC814XtpAu00YZtUZ8KYBZfnzVXY0GB0ufHBUp9--5Ixb8DbgNUyoenXAQ3To6shI'))throw new Error('Old v1 public key still present in native verifier.');
if(/R-\$\{|S-\$\{/.test(sequence))throw new Error('Receipt v10 must not generate letter-prefixed receipt numbers.');

console.log('V10 checks passed: numeric receipt sequence, native certificate registration, no DOM patch, license key v2.');