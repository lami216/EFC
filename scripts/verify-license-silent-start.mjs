import { readFile } from 'node:fs/promises';

const gate=await readFile('assets/production-license-gate-v8.js','utf8');

for(const required of [
  'async function silentStartup()',
  "status=await invoke('get_license_status')",
  'if(status?.valid)',
  'await unlock(status)',
  'ensureActivationUi()',
  'silentValidStartup:true',
  'activationUiOnlyWhenInvalid:true',
  'noReloadAfterInstall:true'
]){
  if(!gate.includes(required))throw new Error(`Silent license startup behavior missing: ${required}`);
}

if(gate.includes('جاري التحقق من حالة التفعيل…')){
  throw new Error('Activation verification screen must not be rendered before saved-license validation.');
}
if(gate.includes("setTimeout(()=>location.reload(),300)")){
  throw new Error('Successful first activation must unlock directly without reloading through the activation gate.');
}

const silentIndex=gate.indexOf('async function silentStartup()');
const statusIndex=gate.indexOf("status=await invoke('get_license_status')",silentIndex);
const validIndex=gate.indexOf('if(status?.valid)',silentIndex);
const uiIndex=gate.indexOf('ensureActivationUi();',silentIndex);
if(silentIndex<0||statusIndex<0||validIndex<0||uiIndex<0||statusIndex>uiIndex){
  throw new Error('Silent startup must check the saved license before creating the activation UI.');
}

console.log('Silent license startup verified: valid saved activation opens without rendering activation UI.');
