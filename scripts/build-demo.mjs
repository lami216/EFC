import { cp, mkdir, rm } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { dirname } from 'node:path';

const runtimeFiles = [
  'index.html',
  'demo.css',
  'production-loader.js',
  'efc-logo.svg',
  'assets/production-license-gate-v8.js',
  'assets/production-foundation-v13.js',
  'assets/production-receipts-v13.js',
  'assets/production-certificates-v13.js',
  'assets/production-receipt-sequences-v10.js',
  'assets/production-domain-v13.js',
  'assets/production-student-ui-v13.js',
  'assets/production-finance-ui-v13.js',
  'assets/production-security-ui-v13.js'
];

const forbiddenProductionFiles = [
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
  'production-runtime.js',
  'production-monthly-merge-v2.js',
  'assets/production-student-profile-v3.js',
  'assets/production-registration-receipt-v4.js',
  'assets/production-ledger-finance-ui-v5.js',
  'assets/production-ledger-pdf-v6.js'
];

await rm('dist', { recursive: true, force: true });
await mkdir('dist', { recursive: true });

for (const file of runtimeFiles) {
  if (!existsSync(file)) throw new Error(`Missing EFC production runtime file: ${file}`);
  const target = `dist/${file}`;
  await mkdir(dirname(target), { recursive: true });
  await cp(file, target);
}

const vendorFiles = [
  ['node_modules/html2canvas/dist/html2canvas.min.js', 'dist/vendor/html2canvas.min.js'],
  ['node_modules/jspdf/dist/jspdf.umd.min.js', 'dist/vendor/jspdf.umd.min.js']
];
await mkdir('dist/vendor', { recursive: true });
for (const [source, target] of vendorFiles) {
  if (!existsSync(source)) throw new Error(`Missing offline PDF dependency: ${source}`);
  await cp(source, target);
}

for (const file of forbiddenProductionFiles) {
  if (existsSync(`dist/${file}`)) throw new Error(`Legacy runtime leaked into production dist: ${file}`);
}

console.log('EFC clean v13 runtime copied to dist with offline PDF libraries; legacy demo runtime excluded.');
