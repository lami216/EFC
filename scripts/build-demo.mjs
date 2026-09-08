import { cp, mkdir, rm, readFile, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';

const files = [
  'index.html',
  'demo.css',
  'production-loader.js',
  'production-runtime.js',
  'production-monthly-merge-v2.js',
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
  'efc-logo.svg'
];

await rm('dist', { recursive: true, force: true });
await mkdir('dist', { recursive: true });

for (const file of files) {
  if (!existsSync(file)) throw new Error(`Missing EFC runtime file: ${file}`);
  await cp(file, `dist/${file}`);
}

// Center Ops v11 intentionally wraps the legacy save functions so it can
// persist expenses/security together with student/specialty mutations.
// The legacy demo shell declared those two hooks as const, which makes the
// production overlay crash at runtime with "Assignment to constant variable".
// Keep the source baseline untouched, but make the production dist hooks
// replaceable before Tauri packages the application.
const legacyRuntimePath = 'dist/demo-app.js';
let legacyRuntime = await readFile(legacyRuntimePath, 'utf8');
const legacySaveStudents = "const saveStudents=()=>localStorage.setItem(LS_STUDENTS,JSON.stringify(students));";
const legacySaveSpecs = "const saveSpecs=()=>localStorage.setItem(LS_SPECS,JSON.stringify(specialties));";
if (!legacyRuntime.includes(legacySaveStudents) || !legacyRuntime.includes(legacySaveSpecs)) {
  throw new Error('Legacy persistence hooks changed; Center Ops v11 compatibility patch was not applied.');
}
legacyRuntime = legacyRuntime
  .replace(legacySaveStudents, legacySaveStudents.replace('const saveStudents', 'let saveStudents'))
  .replace(legacySaveSpecs, legacySaveSpecs.replace('const saveSpecs', 'let saveSpecs'));
await writeFile(legacyRuntimePath, legacyRuntime, 'utf8');

if (!existsSync('assets')) throw new Error('Missing EFC assets directory');
await cp('assets', 'dist/assets', { recursive: true });

const vendorFiles = [
  ['node_modules/html2canvas/dist/html2canvas.min.js', 'dist/vendor/html2canvas.min.js'],
  ['node_modules/jspdf/dist/jspdf.umd.min.js', 'dist/vendor/jspdf.umd.min.js']
];
await mkdir('dist/vendor', { recursive: true });
for (const [source, target] of vendorFiles) {
  if (!existsSync(source)) throw new Error(`Missing offline PDF dependency: ${source}`);
  await cp(source, target);
}

console.log('EFC production interface copied to dist with Center Ops runtime compatibility and offline PDF libraries.');
