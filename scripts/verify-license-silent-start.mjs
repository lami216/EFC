import { readFile } from 'node:fs/promises';

const gate=await readFile('assets/production-license-gate-v8.js','utf8');

for(const required of [
  'async function silentStartup()',
  "status=await invoke('get_license_status')",
  'if(status?.valid)',
  'await unlock(status)',
  'ensureActivationUi(',
  'silentValidStartup:true',
  'activationUiOnlyWhenInvalid:true',
  'noReloadAfterInstall:true',
  'noStartupSplash:true'
]){
  if(!gate.includes(required))throw new Error(`Silent license startup behavior missing: ${required}`);
}

if(gate.includes('جاري التحقق من حالة التفعيل…'))throw new Error('Activation verification screen must not be rendered before saved-license validation.');
if(gate.includes("setTimeout(()=>location.reload(),300)"))throw new Error('Successful first activation must unlock directly without reloading through the activation gate.');
if(gate.includes('mountStartupShield')||gate.includes('جاري تجهيز النظام'))throw new Error('Valid startup must not render a startup splash/shield.');

const silentIndex=gate.indexOf('async function silentStartup()');
const statusIndex=gate.indexOf("status=await invoke('get_license_status')",silentIndex);
const validIndex=gate.indexOf('if(status?.valid)',silentIndex);
const uiIndex=gate.indexOf('ensureActivationUi(',statusIndex);
if(silentIndex<0||statusIndex<0||validIndex<0||uiIndex<0||statusIndex>validIndex||validIndex>uiIndex){
  throw new Error('Silent startup must validate the saved license before constructing activation UI.');
}

console.log('Silent license startup verified: saved activation is checked first and no startup/activation screen is rendered when valid.');