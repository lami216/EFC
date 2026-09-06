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
  'production-runtime.js',
  'production-monthly-merge-v2.js',
  'assets/production-student-profile-v3.js',
  'assets/production-registration-receipt-v4.js',
  'assets/production-ledger-finance-ui-v5.js'
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
const monthlyMerge = await readFile('production-monthly-merge-v2.js', 'utf8');
const studentProfile = await readFile('assets/production-student-profile-v3.js', 'utf8');
const registrationReceipt = await readFile('assets/production-registration-receipt-v4.js', 'utf8');
const ledgerFinanceUi = await readFile('assets/production-ledger-finance-ui-v5.js', 'utf8');
const iconGenerator = await readFile('scripts/generate-app-icon.mjs', 'utf8');
const packageJson = await readFile('package.json', 'utf8');
const tauriConfig = await readFile('src-tauri/tauri.conf.json', 'utf8');
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
if (!index.includes('./assets/production-student-profile-v3.js')) throw new Error('Student profile refinement is not wired in index.html.');
if (!index.includes('./assets/production-registration-receipt-v4.js')) throw new Error('Registration/receipt refinement is not wired in index.html.');
if (!index.includes('./assets/production-ledger-finance-ui-v5.js')) throw new Error('Ledger/finance UI refinement is not wired in index.html.');
if (index.includes('<script src="./demo-app.js"')) throw new Error('index.html still loads demo scripts directly.');

for (const required of ['settings','renderSettingsProd','period-tabs-prod','sortable-head-prod','EFC_FORCE_PERSIST']) {
  if (!(runtime.includes(required) || loader.includes(required))) throw new Error(`Production feature missing: ${required}`);
}
if (!runtime.includes("currentPage === 'payments' || currentPage === 'status'")) throw new Error('Legacy status/payments redirects are missing.');
if (!runtime.includes('window.downloadReceiptPdfV12 = r => receiptWindowV4(r,true)')) throw new Error('Offline receipt PDF/print fallback is missing.');
if (!loader.includes('chooseNewestState') || !loader.includes('updatedAt')) throw new Error('Newest-state startup protection is missing.');

for (const required of [
  'production-monthly-merge-v2.js',
  'EFC_MERGE_IMPORTED_STATE',
  'transactionCodes',
  'recordCode',
  'sourceCenters',
  'mergePayments'
]) {
  if (!loader.includes(required) && !monthlyMerge.includes(required)) throw new Error(`Merge/dedup feature missing: ${required}`);
}
for (const required of [
  'openPayment = function(id, targetMonth = null)',
  'month-receipt-mm',
  'month-pay-mm',
  'المسجلون',
  'المستحقات',
  'نهايات الدورات'
]) {
  if (!monthlyMerge.includes(required)) throw new Error(`Monthly/search refinement missing: ${required}`);
}
if (monthlyMerge.includes('data-tab="payments"')) throw new Error('Payments tab must not return to unified search.');
if (monthlyMerge.includes("['الإجراء'")) throw new Error('Action column must not return to unified search.');

for (const required of [
  "openStudent = function(studentId, mode = 'finance')",
  "currentPage === 'students'",
  'student-file-tabs-v3',
  'student-file-profile-v3',
  'month-paid-placeholder-v3',
  'compactMonthActionsUseExistingSpace',
  "['السجل','الطالب','الهاتف','الفرع','التخصص','البداية','النهاية','حالة الدورة']"
]) {
  if (!studentProfile.includes(required)) throw new Error(`Student profile refinement missing: ${required}`);
}

for (const required of [
  "ensureBlankChoice(form.elements?.branch,'اختر الفرع')",
  "ensureBlankChoice(form.elements?.specialty,'اختر التخصص')",
  'manualBranchAndSpecialty:true',
  'monthlyReceiptUsesMonthRemaining:true',
  'nonMonthlyReceiptUsesCourseRemaining:true',
  "(student.snapshot||{}).billing!=='monthly'",
  'installmentPlanV3(scoped.student)',
  'model.remaining=Math.max(0,Number(month.remaining||0))'
]) {
  if (!registrationReceipt.includes(required)) throw new Error(`Registration/receipt behavior missing: ${required}`);
}

for (const required of [
  'ledgerTransactionReceiptOpen:true',
  'resolvePaymentIndex(payment)',
  'receiptWindowV4(receiptModelV4(student,index))',
  'financeDailyBySelectedMonth:true',
  'financeMonthlyBySelectedYear:true',
  'financeYearlyLastTenYears:true',
  'weeklyFinanceRemoved:true',
  "['يناير','فبراير','مارس','أبريل','مايو','يونيو','يوليو','أغسطس','سبتمبر','أكتوبر','نوفمبر','ديسمبر']",
  "<button data-mode=\"daily\">يومي</button>",
  "<button data-mode=\"monthly\" class=\"active\">شهري</button>",
  "<button data-mode=\"yearly\">سنوي</button>",
  '.shell nav i svg{width:24px;height:24px;display:block}'
]) {
  if (!ledgerFinanceUi.includes(required)) throw new Error(`Ledger/finance UI behavior missing: ${required}`);
}
if (ledgerFinanceUi.includes('data-mode="weekly"')) throw new Error('Weekly finance mode must remain removed.');

if (!iconGenerator.includes("readFile('efc-logo.svg'")) throw new Error('Desktop icon must be generated from the sidebar EFC logo source.');
if (!iconGenerator.includes("writeFile('src-tauri/app-icon.svg'")) throw new Error('Square app icon source generation is missing.');
if (!packageJson.includes('"icons": "node scripts/generate-app-icon.mjs && tauri icon src-tauri/app-icon.svg"')) throw new Error('App icon npm command is missing.');
if (!workflow.includes('npm run icons')) throw new Error('Windows build must generate the EFC icons before bundling.');
for (const requiredIcon of ['icons/32x32.png','icons/128x128.png','icons/128x128@2x.png','icons/icon.ico']) {
  if (!tauriConfig.includes(requiredIcon)) throw new Error(`Tauri bundle icon missing: ${requiredIcon}`);
}

for (const command of ['load_app_state','save_app_state','export_backup','import_backup']) {
  if (!rust.includes(command)) throw new Error(`Rust command missing: ${command}`);
}
if (!rust.includes('auto-before-restore')) throw new Error('Automatic safety backup before restore is missing.');
if (rust.includes('save_state_raw(&app, &state)?;\n    Ok(Some(state))')) {
  throw new Error('Import must not replace SQLite before browser-side merge.');
}
if (!rust.includes('as_millis')) throw new Error('Safety backup names must be collision resistant.');
if (workflow.includes('git push') || workflow.includes('git commit')) throw new Error('Build workflow must not mutate main.');

console.log('Production checks passed: clickable ledger receipts, daily/monthly/yearly finance periods without weekly mode, larger semantic sidebar icons, EFC desktop icon generation, manual registration choices, month-only receipt remaining for monthly courses, course remaining for non-monthly courses, month-targeted payments, per-month receipts, informational student profile, merge-safe backups, hidden transaction codes, deduplication, immutable CI.');
