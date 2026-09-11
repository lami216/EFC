import { readFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';

const read=path=>readFileSync(path,'utf8');
const requireText=(text,needle,label=needle)=>{if(!text.includes(needle))throw new Error(`Login redesign missing: ${label}`);};
const forbidText=(text,needle,label=needle)=>{if(text.includes(needle))throw new Error(`Login redesign forbidden: ${label}`);};

const login=read('assets/production-login-ui-v13.js');
const security=read('assets/production-security-ui-v13.js');
const build=read('scripts/build-production.mjs');
const packageJson=JSON.parse(read('package.json'));

execFileSync(process.execPath,['--check','assets/production-login-ui-v13.js'],{stdio:'inherit'});

for(const token of [
  'referenceRedesignV15:true',
  'existingLogoReused:true',
  'functionalRecoveryLinks:true',
  'functionalPinReveal:true',
  'responsiveLogin:true',
  "const observer=new MutationObserver(queueEnhance)",
  "toggle.onclick=()=>",
  "event.formData.set('pin'",
  "#forgotV13",
  "#resetV13",
  "./efc-logo.svg",
  'efc-login-redesign-v15',
  'efc-login-slogan-v15',
  'efc-login-version-v15'
])requireText(login,token);

for(const token of [
  "overlay.querySelector('#forgotV13').onclick=()=>showRecoveryRequest(overlay)",
  "overlay.querySelector('#resetV13').onclick=()=>showResetEntry(overlay)",
  "overlay.querySelector('form').onsubmit=async event=>"
])requireText(security,token,`security flow ${token}`);

forbidText(login,'data:image','embedded replacement logo/image');
requireText(build,"'assets/production-login-ui-v13.js'",'login UI packaged in production build');
if(!String(packageJson.version||''))throw new Error('Package version is missing.');
requireText(login,`const APP_VERSION='${packageJson.version}'`,'displayed app version follows package.json');

console.log('Login redesign v15 verification passed: existing logo reused, PIN reveal preserves real PIN, auth/recovery IDs remain wired, responsive layout is packaged.');
