import { readFile } from 'node:fs/promises';

const browserScripts = [
  'production-loader.js',
  'demo-app.js',
  'demo-period-merge.js',
  'demo-monthly-finance-v3.js',
  'demo-receipts-v4.js',
  'demo-v5-runtime-guard.js',
  'demo-brand-receipt-v5.js',
  'demo-repair-v6.js',
  'demo-receipt-layout-v7.js',
  'demo-fix-v8.js',
  'demo-receipt-logo-v9.js',
  'demo-receipt-compact-v10.js',
  'demo-receipt-paper-v11.js',
  'demo-receipt-clean-v12.js',
  'production-runtime.js'
];

for (const file of browserScripts) {
  const source = await readFile(file, 'utf8');
  try {
    new Function(source);
  } catch (error) {
    throw new Error(`${file} has invalid JavaScript: ${error.message}`);
  }
}

const core = await readFile('demo-app.js', 'utf8');
const index = await readFile('index.html', 'utf8');
const runtime = await readFile('production-runtime.js', 'utf8');
const loader = await readFile('production-loader.js', 'utf8');
const rust = await readFile('src-tauri/src/main.rs', 'utf8');
const workflow = await readFile('.github/workflows/windows-build.yml', 'utf8');

const forbiddenDemoData = [
  "id:'s01'",
  'أحمد سالم ولد محمد',
  'مريم بنت أحمد',
  "const DEMO_TODAY = '2026-09-03'",
  'efc-demo-v2-students',
  'efc-demo-v2-specialties'
];
for (const needle of forbiddenDemoData) {
  if (core.includes(needle)) throw new Error(`Demo data still present in demo-app.js: ${needle}`);
}

if (!core.includes('const seedStudents=[];')) throw new Error('Student seed is not empty.');
if (!core.includes('const seedSpecialties = [];')) throw new Error('Specialty seed is not empty.');
if (!index.includes('./production-loader.js')) throw new Error('Production loader is not wired in index.html.');
if (index.includes('<script src="./demo-app.js"')) throw new Error('index.html still loads demo scripts directly.');

for (const required of ['settings','renderSettingsProd','period-tabs-prod','sortable-head-prod','EFC_FORCE_PERSIST','EFC_APPLY_RESTORED_STATE']) {
  if (!(runtime.includes(required) || loader.includes(required))) throw new Error(`Production feature missing: ${required}`);
}
if (!runtime.includes("currentPage === 'payments' || currentPage === 'status'")) throw new Error('Legacy status/payments redirects are missing.');
if (!runtime.includes('window.downloadReceiptPdfV12 = r => receiptWindowV4(r,true)')) throw new Error('Offline receipt PDF/print fallback is missing.');
if (!loader.includes('chooseNewestState') || !loader.includes('updatedAt')) throw new Error('Newest-state startup protection is missing.');

for (const command of ['load_app_state','save_app_state','export_backup','import_backup']) {
  if (!rust.includes(command)) throw new Error(`Rust command missing: ${command}`);
}
if (!rust.includes('auto-before-restore')) throw new Error('Automatic safety backup before restore is missing.');
if (workflow.includes('git push') || workflow.includes('git commit')) throw new Error('Build workflow must not mutate main.');

console.log('Production checks passed: clean data, safe persistence, settings backup/restore, unified search sorting, offline receipt print/PDF, immutable CI.');
