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
const rust = await readFile('src-tauri/src/main.rs', 'utf8');

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
if (!runtime.includes('receipt-viewer-card-prod')) throw new Error('In-app receipt viewer is missing.');
if (!rust.includes('load_app_state') || !rust.includes('save_app_state')) throw new Error('SQLite state commands are missing.');

console.log('Production checks passed: no demo student data, loader wired, receipt viewer present, SQLite commands present.');
