import { cp, mkdir, rm } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { dirname } from 'node:path';

const runtimeFiles = [
  'index.html',
  'assets/production-ui-v13.css',
  'production-loader.js',
  'efc-logo.svg',
  'assets/production-license-gate-v8.js',
  'assets/production-foundation-v13.js',
  'assets/production-receipts-v13.js',
  'assets/production-certificates-v13.js',
  'assets/production-domain-v13.js',
  'assets/production-receipt-sequences-v10.js',
  'assets/production-student-ui-v13.js',
  'assets/production-registration-schedule-v13.js',
  'assets/production-finance-ui-v13.js',
  'assets/production-security-ui-v13.js',
  'assets/production-login-ui-v13.js'
];

const forbiddenProductionFiles = [
  '.demo-imported',
  'demo.css',
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
  'assets/production-ledger-pdf-v6.js',
  'scripts/build-demo.mjs',
  'scripts/harden-production.mjs',
  'scripts/verify-center-ops-v11.mjs',
  'scripts/verify-production.mjs'
];

for (const file of forbiddenProductionFiles) {
  if (existsSync(file)) throw new Error(`Obsolete EFC source still present in clean v13: ${file}`);
}

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
  if (existsSync(`dist/${file}`)) throw new Error(`Obsolete runtime leaked into production dist: ${file}`);
}

console.log('EFC clean v13 production runtime copied to dist with registration schedule, login UI and offline PDF libraries; obsolete demo-era sources are absent.');
