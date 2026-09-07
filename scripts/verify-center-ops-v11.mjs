import { readFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';

const overlayPath = 'assets/production-center-ops-v11.js';
const fixPath = 'assets/production-center-ops-v11-fix1.js';
const overlay = readFileSync(overlayPath, 'utf8');
const fix = readFileSync(fixPath, 'utf8');
const index = readFileSync('index.html', 'utf8');
const tauri = readFileSync('src-tauri/tauri.conf.json', 'utf8');

function requireText(text, needle, label = needle) {
  if (!text.includes(needle)) throw new Error(`Missing center-ops v11 marker: ${label}`);
}

execFileSync(process.execPath, ['--check', overlayPath], { stdio: 'inherit' });
execFileSync(process.execPath, ['--check', fixPath], { stdio: 'inherit' });

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

requireText(index, './assets/production-license-gate-v8.js', 'license gate');
requireText(index, './assets/production-center-ops-v11.js', 'center ops v11 script');
requireText(index, './assets/production-center-ops-v11-fix1.js', 'center ops v11 fix script');
const gateIndex = index.indexOf('./assets/production-license-gate-v8.js');
const overlayIndex = index.indexOf('./assets/production-center-ops-v11.js');
const fixIndex = index.indexOf('./assets/production-center-ops-v11-fix1.js');
if (!(gateIndex >= 0 && overlayIndex > gateIndex && fixIndex > overlayIndex)) {
  throw new Error('Center ops v11 scripts must be declared after the license gate and in fix order.');
}
requireText(tauri, '"title": "مركز EFC للغات والمعلوماتية"', 'official Windows title');

console.log('Center operations v11 verification passed.');
