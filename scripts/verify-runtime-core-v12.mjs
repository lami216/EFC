import { readFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';

const gatePath='assets/production-license-gate-v8.js';
const centerPath='assets/production-center-ops-v12.js';
const buildPath='scripts/build-demo.mjs';
const gate=readFileSync(gatePath,'utf8');
const center=readFileSync(centerPath,'utf8');
const build=readFileSync(buildPath,'utf8');
const loader=readFileSync('production-loader.js','utf8');
const core=readFileSync('demo-app.js','utf8');

const requireText=(text,needle,label=needle)=>{if(!text.includes(needle))throw new Error(`Missing runtime v12 invariant: ${label}`);};
const forbidText=(text,needle,label=needle)=>{if(text.includes(needle))throw new Error(`Forbidden runtime v12 pattern: ${label}`);};

for(const file of [gatePath,centerPath])execFileSync(process.execPath,['--check',file],{stdio:'inherit'});

// Deterministic boot: production-loader evaluation is not treated as runtime readiness.
for(const marker of [
  "const BASE_RUNTIME='./production-loader.js'",
  'window.EFC_DIAGNOSTICS',
  'waitUntil',
  "const CENTER_OPS='./assets/production-center-ops-v12.js'",
  'window.EFC_CENTER_OPS_V12?.ready===true',
  'deterministicRuntimeOrder:true',
  'baseRuntimeAwaited:true'
]) requireText(gate,marker);
forbidText(gate,'production-center-ops-v11.js','old v11 runtime must not load');
forbidText(gate,'production-center-ops-v11-fix1.js','old v11 fix layer must not load');
const baseLoad=gate.indexOf('await loadScript(BASE_RUNTIME)');
const baseReady=gate.indexOf("waitUntil(()=>window.EFC_DIAGNOSTICS");
const refinementLoad=gate.indexOf('for(const src of REFINEMENTS)');
const centerLoad=gate.indexOf('await loadScript(CENTER_OPS)');
if(!(baseLoad>=0&&baseReady>baseLoad&&refinementLoad>baseReady&&centerLoad>refinementLoad))throw new Error('Runtime boot order is not deterministic.');

// Root freeze regression: no DOM observer is allowed in the Center Ops layer.
forbidText(center,'MutationObserver','Center Ops must not observe and rewrite its own DOM');
forbidText(center,'saveStudents=function','Center Ops must not reassign legacy const saveStudents');
forbidText(center,'saveSpecs=function','Center Ops must not reassign legacy const saveSpecs');
for(const marker of [
  'renderCurrentSafe();',
  'singleFinalRender:true',
  'noMutationObserverLoop:true',
  'coursePriceAtRegistration:true',
  'monthlyOpenThreeDaysEarly:true',
  'partialDebtDueDate:true',
  'inactiveStudentsExcludedFromDues:true',
  'paymentMethodsCanBeDisabled:true',
  'expensesAndProfitability:true',
  'dailyNewestFirstScrollable:true',
  'notificationBell:true',
  'reminderPdf:true',
  'usersAndPermissions:true',
  'adminRecoveryEncrypted:true',
  'certificateReceiptTitleLarge:true'
]) requireText(center,marker);
const finalRender=center.lastIndexOf('renderCurrentSafe();');
const readyMarker=center.lastIndexOf('window.EFC_CENTER_OPS_V12=');
if(!(finalRender>=0&&readyMarker>finalRender))throw new Error('Center Ops ready marker must be published only after the final render.');

// Packaging must never mutate runtime JavaScript again.
forbidText(build,"replace('const saveStudents'",'build-time saveStudents rewrite');
forbidText(build,"replace('const saveSpecs'",'build-time saveSpecs rewrite');
forbidText(build,'writeFile(legacyRuntimePath','build-time runtime rewrite');
requireText(build,'Production source is copied verbatim','verbatim production build');
requireText(core,"const saveStudents=()=>",'legacy source remains unchanged and is not mutated by v12');
requireText(loader,'window.EFC_DIAGNOSTICS','base runtime completion marker');

// Build the exact dist shipped to Tauri and inspect it, not only source files.
execFileSync(process.execPath,['scripts/build-demo.mjs'],{stdio:'inherit'});
const distGate=readFileSync('dist/'+gatePath,'utf8');
const distCenter=readFileSync('dist/'+centerPath,'utf8');
const distCore=readFileSync('dist/demo-app.js','utf8');
requireText(distGate,"production-center-ops-v12.js",'v12 in packaged gate');
forbidText(distGate,'production-center-ops-v11.js','v11 absent from packaged gate');
forbidText(distCenter,'MutationObserver','packaged v12 observer loop');
requireText(distCore,"const saveStudents=()=>",'packaged legacy core copied verbatim');
execFileSync(process.execPath,['--check','dist/'+centerPath],{stdio:'inherit'});
execFileSync(process.execPath,['--check','dist/'+gatePath],{stdio:'inherit'});

console.log('Runtime architecture v12 verification passed.');
