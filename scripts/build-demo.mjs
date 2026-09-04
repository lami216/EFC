import { cp, mkdir, rm } from 'node:fs/promises';
import { existsSync } from 'node:fs';

const files = [
  'index.html',
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
  'efc-logo.svg'
];

await rm('dist', { recursive: true, force: true });
await mkdir('dist', { recursive: true });

for (const file of files) {
  if (!existsSync(file)) throw new Error(`Missing approved demo file: ${file}`);
  await cp(file, `dist/${file}`);
}

if (!existsSync('assets')) throw new Error('Missing approved demo assets directory');
await cp('assets', 'dist/assets', { recursive: true });

console.log('Approved GitHub Pages demo copied to dist without modification.');
