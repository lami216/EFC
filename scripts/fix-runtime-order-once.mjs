import fs from 'node:fs';

function read(path){return fs.readFileSync(path,'utf8');}
function write(path,text){fs.writeFileSync(path,text);}
function replaceOnce(text,from,to,label){
  const count=text.split(from).length-1;
  if(count!==1)throw new Error(`${label}: expected exactly one match, found ${count}`);
  return text.replace(from,to);
}

const gatePath='assets/production-license-gate-v8.js';
let gate=read(gatePath);
const oldRuntime=`  './assets/production-registration-schedule-matrix-v17.js',\n  './assets/production-security-ui-v13.js',\n  './assets/production-login-ui-v13.js'`;
const newRuntime=`  './assets/production-registration-schedule-matrix-v17.js',\n  './assets/production-registration-select-native-v19.js',\n  './assets/production-registration-receipt-schedule-v22.js',\n  './assets/production-courses-centers-redesign-v23.js',\n  './assets/production-courses-centers-compact-v25.js',\n  './assets/production-courses-centers-detail-fix-v27.js',\n  './assets/production-period-search-redesign-v28.js',\n  './assets/production-sidebar-lock-v30.js',\n  './assets/production-student-search-redesign-v31.js',\n  './assets/production-search-detail-polish-v32.js',\n  './assets/production-period-count-and-grid-polish-v33.js',\n  './assets/production-search-title-grid-unify-v34.js',\n  './assets/production-security-ui-v13.js',\n  './assets/production-login-ui-v13.js'`;
gate=replaceOnce(gate,oldRuntime,newRuntime,'license gate runtime manifest');
gate=replaceOnce(gate,"const RUNTIME_VERSION='20260913-settings-redesign-2';","const RUNTIME_VERSION='20260913-windows-runtime-parity-1';",'runtime cache version');

const oldTail=`    await loadScript(RUNTIME[14]);\n    await waitUntil(()=>window.EFC_CENTER_OPS_V13?.ready,'النظام النهائي');\n\n    await loadScript(RUNTIME[15]);\n    await waitUntil(()=>window.EFC_LOGIN_UI_V13?.ready,'واجهة تسجيل الدخول');`;
const newTail=`    await loadScript(RUNTIME[14]);\n    await waitUntil(()=>window.EFC_REGISTRATION_SELECT_NATIVE_V19?.ready,'قوائم تسجيل الطالب');\n\n    await loadScript(RUNTIME[15]);\n    await waitUntil(()=>window.EFC_REGISTRATION_RECEIPT_SCHEDULE_V22?.ready,'جدول إيصال التسجيل');\n\n    await loadScript(RUNTIME[16]);\n    await waitUntil(()=>window.EFC_COURSES_CENTERS_REDESIGN_V23?.ready,'تصميم الدورات والمراكز');\n\n    await loadScript(RUNTIME[17]);\n    await waitUntil(()=>window.EFC_COURSES_CENTERS_COMPACT_V25?.ready,'تحجيم الدورات والمراكز');\n\n    await loadScript(RUNTIME[18]);\n    await waitUntil(()=>window.EFC_COURSES_CENTERS_DETAIL_FIX_V27?.ready,'تفاصيل الدورات والمراكز');\n\n    await loadScript(RUNTIME[19]);\n    await waitUntil(()=>window.EFC_PERIOD_SEARCH_REDESIGN_V28?.ready,'تصميم آلية البحث');\n\n    await loadScript(RUNTIME[20]);\n    await waitUntil(()=>window.EFC_SIDEBAR_LOCK_V30?.ready,'توحيد الشريط الجانبي');\n\n    await loadScript(RUNTIME[21]);\n    await waitUntil(()=>window.EFC_STUDENT_SEARCH_REDESIGN_V31?.ready,'تصميم البحث عن طالب');\n\n    await loadScript(RUNTIME[22]);\n    await waitUntil(()=>window.EFC_SEARCH_DETAIL_POLISH_V32?.ready,'تفاصيل صفحات البحث');\n\n    await loadScript(RUNTIME[23]);\n    await waitUntil(()=>window.EFC_PERIOD_COUNT_GRID_POLISH_V33?.ready,'عداد ونتائج آلية البحث');\n\n    await loadScript(RUNTIME[24]);\n    await waitUntil(()=>window.EFC_SEARCH_TITLE_GRID_UNIFY_V34?.ready,'توحيد جداول البحث');\n\n    await loadScript(RUNTIME[25]);\n    await waitUntil(()=>window.EFC_CENTER_OPS_V13?.ready,'النظام النهائي');\n\n    await loadScript(RUNTIME[26]);\n    await waitUntil(()=>window.EFC_LOGIN_UI_V13?.ready,'واجهة تسجيل الدخول');`;
gate=replaceOnce(gate,oldTail,newTail,'license gate startup tail');
write(gatePath,gate);

const indexPath='index.html';
let index=read(indexPath);
index=index.replaceAll('20260913-settings-redesign-2','20260913-windows-runtime-parity-1');
const delayed=[
  'production-registration-select-native-v19.js',
  'production-registration-receipt-schedule-v22.js',
  'production-courses-centers-redesign-v23.js',
  'production-courses-centers-compact-v25.js',
  'production-courses-centers-detail-fix-v27.js',
  'production-period-search-redesign-v28.js',
  'production-sidebar-lock-v30.js',
  'production-student-search-redesign-v31.js',
  'production-search-detail-polish-v32.js',
  'production-period-count-and-grid-polish-v33.js',
  'production-search-title-grid-unify-v34.js'
];
index=index.split('\n').filter(line=>!delayed.some(file=>line.includes(file))).join('\n');
write(indexPath,index);

const verifyPath='scripts/verify-critical-runtime.mjs';
let verify=read(verifyPath);
const marker=`const runtimeManifest=read('scripts/build-production.mjs');`;
const checks=`const deterministicPostLicenseRuntime=[\n  'production-registration-select-native-v19.js',\n  'production-registration-receipt-schedule-v22.js',\n  'production-courses-centers-redesign-v23.js',\n  'production-courses-centers-compact-v25.js',\n  'production-courses-centers-detail-fix-v27.js',\n  'production-period-search-redesign-v28.js',\n  'production-sidebar-lock-v30.js',\n  'production-student-search-redesign-v31.js',\n  'production-search-detail-polish-v32.js',\n  'production-period-count-and-grid-polish-v33.js',\n  'production-search-title-grid-unify-v34.js'\n];\nlet lastRuntimeIndex=-1;\nfor(const file of deterministicPostLicenseRuntime){\n  forbidText(indexHtml,file,\`index must not race-load post-license runtime: \${file}\`);\n  requireText(licenseGate,file,\`license gate owns post-license runtime: \${file}\`);\n  const current=licenseGate.indexOf(file);\n  if(current<=lastRuntimeIndex)throw new Error(\`Post-license runtime order is not deterministic at \${file}.\`);\n  lastRuntimeIndex=current;\n}\nrequireText(licenseGate,"RUNTIME[25]",'security UI loads only after all redesign modules');\nrequireText(licenseGate,"RUNTIME[26]",'login UI loads after the consolidated security runtime');\n\n${marker}`;
verify=replaceOnce(verify,marker,checks,'critical runtime insertion');
verify=replaceOnce(verify,"preview cache versions remain synchronized.');","preview cache versions remain synchronized, and browser/Windows use one deterministic post-license redesign runtime.');",'critical runtime success message');
write(verifyPath,verify);

console.log('Fixed browser/Windows runtime parity: all redesign modules are now owned by the license gate and load only after a valid license/runtime dependency chain.');
