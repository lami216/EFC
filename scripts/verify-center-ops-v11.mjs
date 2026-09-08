import { readFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';

const overlayPath = 'assets/production-center-ops-v11.js';
const fixPath = 'assets/production-center-ops-v11-fix1.js';
const gatePath = 'assets/production-license-gate-v8.js';
const overlay = readFileSync(overlayPath, 'utf8');
const fix = readFileSync(fixPath, 'utf8');
const gate = readFileSync(gatePath, 'utf8');
const index = readFileSync('index.html', 'utf8');
const buildScript = readFileSync('scripts/build-demo.mjs', 'utf8');
const packageJson = readFileSync('package.json', 'utf8');
const tauri = readFileSync('src-tauri/tauri.conf.json', 'utf8');
const cargo = readFileSync('src-tauri/Cargo.toml', 'utf8');

function requireText(text, needle, label = needle) {
  if (!text.includes(needle)) throw new Error(`Missing center-ops v11 marker: ${label}`);
}
function forbidText(text, needle, label = needle) {
  if (text.includes(needle)) throw new Error(`Unexpected center-ops v11 marker: ${label}`);
}

execFileSync(process.execPath, ['--check', overlayPath], { stdio: 'inherit' });
execFileSync(process.execPath, ['--check', fixPath], { stdio: 'inherit' });
execFileSync(process.execPath, ['--check', gatePath], { stdio: 'inherit' });

for (const marker of [
  "coursePriceAtRegistration:true",
  "monthlyOpenThreeDaysEarly:true",
  "partialDebtDueDate:true",
  "inactiveStudentsExcludedFromDues:true",
  "paymentMethodsCanBeDisabled:true",
  "expensesAndProfitability:true",
  "dailyNewestFirstScrollable:true",
  "notificationBell:true",
  "reminderPdf:true",
  "usersAndPermissions:true",
  "adminRecoveryEncrypted:true",
  "certificateReceiptTitleLarge:true"
]) requireText(overlay, marker);

for (const marker of [
  "const OFFICIAL_NAME='مركز EFC للغات والمعلوماتية'",
  "const GENERAL_EXPENSE='__expense_general__'",
  "EFC-ADMIN-RECOVERY-1.",
  "EFC-ADMIN-RESET-1.",
  "RSA-OAEP",
  "PBKDF2",
  "iterations:120000",
  "addDays(due,-3)",
  "student.active=false",
  "status='inactive'",
  "max-height:470px",
  "position:sticky",
  "finance-line-v11.expense",
  "مصروف عام",
  "وصل إدارة الشهادات"
]) requireText(overlay, marker);

for (const marker of [
  "securityPrelock:true",
  "dynamicMonthlyDuesOpenEnded:true",
  "normalReceiptOfficialName:true",
  "certificateHeaderMatchesReceipt:true",
  "certificatePdfUsesPatchedHeader:true",
  "efc-security-prelock-v11",
  "EFC_SAVE_CERTIFICATE_PDF=saveCertificatePdf",
  "official-name-v11-fix",
  "cert-recognition-v11"
]) requireText(fix, marker);

// Center Ops must not start before the license gate. The license gate owns the
// complete application script order and refuses to unlock if v11 never reaches
// its public ready markers.
requireText(index, './assets/production-license-gate-v8.js', 'license gate');
forbidText(index, '<script src="./assets/production-center-ops-v11.js"', 'direct center ops script tag');
forbidText(index, '<script src="./assets/production-center-ops-v11-fix1.js"', 'direct center ops fix script tag');
for (const marker of [
  "'./assets/production-receipt-sequences-v10.js'",
  "'./assets/production-center-ops-v11.js'",
  "'./assets/production-center-ops-v11-fix1.js'",
  'waitForRuntimeReady',
  'window.EFC_CENTER_OPS_V11',
  'window.EFC_CENTER_OPS_V11_FIX1',
  'centerOpsRuntimeGuard:true',
  'centerOpsLoadedAfterLicense:true'
]) requireText(gate, marker);
const receiptIndex = gate.indexOf("'./assets/production-receipt-sequences-v10.js'");
const overlayIndex = gate.indexOf("'./assets/production-center-ops-v11.js'");
const fixIndex = gate.indexOf("'./assets/production-center-ops-v11-fix1.js'");
if (!(receiptIndex >= 0 && overlayIndex > receiptIndex && fixIndex > overlayIndex)) {
  throw new Error('Center Ops v11 must load after receipt v10 and before its fix layer.');
}

// Regression for the exact runtime failure found in build #28. The source
// baseline intentionally remains unchanged, but production dist must expose
// replaceable save hooks before v11 wraps them.
for (const marker of [
  "const saveStudents=()=>localStorage.setItem(LS_STUDENTS,JSON.stringify(students));",
  "const saveSpecs=()=>localStorage.setItem(LS_SPECS,JSON.stringify(specialties));",
  "replace('const saveStudents', 'let saveStudents')",
  "replace('const saveSpecs', 'let saveSpecs')"
]) requireText(marker.startsWith('const ') ? readFileSync('demo-app.js', 'utf8') : buildScript, marker);

execFileSync(process.execPath, ['scripts/build-demo.mjs'], { stdio: 'inherit' });
const builtApp = readFileSync('dist/demo-app.js', 'utf8');
const builtIndex = readFileSync('dist/index.html', 'utf8');
for (const marker of [
  "let saveStudents=()=>localStorage.setItem(LS_STUDENTS,JSON.stringify(students));",
  "let saveSpecs=()=>localStorage.setItem(LS_SPECS,JSON.stringify(specialties));"
]) requireText(builtApp, marker, `built runtime ${marker.slice(0, 18)}`);
forbidText(builtApp, "const saveStudents=()=>localStorage.setItem(LS_STUDENTS,JSON.stringify(students));", 'immutable built saveStudents');
forbidText(builtApp, "const saveSpecs=()=>localStorage.setItem(LS_SPECS,JSON.stringify(specialties));", 'immutable built saveSpecs');
forbidText(builtIndex, '<script src="./assets/production-center-ops-v11.js"', 'built direct center ops script tag');
execFileSync(process.execPath, ['--check', 'dist/demo-app.js'], { stdio: 'inherit' });
execFileSync(process.execPath, ['--check', 'dist/assets/production-center-ops-v11.js'], { stdio: 'inherit' });
execFileSync(process.execPath, ['--check', 'dist/assets/production-center-ops-v11-fix1.js'], { stdio: 'inherit' });

requireText(packageJson, '"version": "1.1.0"', 'package version 1.1.0');
requireText(tauri, '"version": "1.1.0"', 'Tauri version 1.1.0');
requireText(cargo, 'version = "1.1.0"', 'Rust package version 1.1.0');
requireText(tauri, '"title": "مركز EFC للغات والمعلوماتية"', 'official Windows title');

console.log('Center operations v11 runtime verification passed.');
