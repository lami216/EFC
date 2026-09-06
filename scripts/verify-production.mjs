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
  'assets/production-ledger-finance-ui-v5.js',
  'assets/production-ledger-pdf-v6.js',
  'assets/production-certificates-v7.js'
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
const ledgerPdf = await readFile('assets/production-ledger-pdf-v6.js', 'utf8');
const certificates = await readFile('assets/production-certificates-v7.js', 'utf8');
const iconGenerator = await readFile('scripts/generate-app-icon.mjs', 'utf8');
const buildScript = await readFile('scripts/build-demo.mjs', 'utf8');
const packageJson = await readFile('package.json', 'utf8');
const tauriConfig = await readFile('src-tauri/tauri.conf.json', 'utf8');
const nsisHooks = await readFile('src-tauri/windows/hooks.nsh', 'utf8');
const buildRs = await readFile('src-tauri/build.rs', 'utf8');
const cargo = await readFile('src-tauri/Cargo.toml', 'utf8');
const rust = await readFile('src-tauri/src/main.rs', 'utf8');
const certificateRust = await readFile('src-tauri/src/certificate_state.rs', 'utf8');
const receiptPdfRust = await readFile('src-tauri/src/receipt_pdf.rs', 'utf8');
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
for (const asset of [
  './assets/production-student-profile-v3.js',
  './assets/production-registration-receipt-v4.js',
  './assets/production-ledger-finance-ui-v5.js',
  './assets/production-ledger-pdf-v6.js',
  './assets/production-certificates-v7.js'
]) {
  if (!index.includes(asset)) throw new Error(`Production refinement is not wired: ${asset}`);
}
if (index.indexOf('production-ledger-pdf-v6.js') < index.indexOf('production-ledger-finance-ui-v5.js')) {
  throw new Error('Ledger/PDF v6 must load after the successful finance/ledger v5 refinement.');
}
if (index.indexOf('production-certificates-v7.js') < index.indexOf('production-ledger-pdf-v6.js')) {
  throw new Error('Certificates v7 must load after the stable ledger/PDF layer.');
}
if (index.includes('<script src="./demo-app.js"')) throw new Error('index.html still loads demo scripts directly.');

for (const required of ['settings','renderSettingsProd','period-tabs-prod','sortable-head-prod','EFC_FORCE_PERSIST']) {
  if (!(runtime.includes(required) || loader.includes(required))) throw new Error(`Production feature missing: ${required}`);
}
if (!runtime.includes("currentPage === 'payments' || currentPage === 'status'")) throw new Error('Legacy status/payments redirects are missing.');
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

for (const required of [
  '#ledgerBody tbody tr[data-student][data-payment]',
  'event.stopImmediatePropagation()',
  'receiptWindowV4(receiptModelV4(student,paymentIndex))',
  "loadLocalScript('./vendor/html2canvas.min.js','html2canvas')",
  "loadLocalScript('./vendor/jspdf.umd.min.js','jspdf')",
  "invoke('save_receipt_pdf'",
  'directDownloadsFolderSave:true',
  'printAndPdfSeparated:true'
]) {
  if (!ledgerPdf.includes(required)) throw new Error(`Ledger/PDF v6 behavior missing: ${required}`);
}

for (const required of [
  "['certificates',icon,'الشهادات']",
  "studentType:'internal'",
  "studentType:'external'",
  "branchType:'certificate'",
  "sourceType:'certificate'",
  "id:`certificate:${receipt.id}`",
  'allPayments=function()',
  'رسوم شهادة',
  'الهاتف يبقى في السجل فقط ولا يظهر في الروسي',
  'receipt.reg?String(receipt.reg).padStart(4,\'0\'):\'—\'',
  'window.EFC_APPLY_RESTORED_STATE=async incoming',
  "invoke('save_certificate_state'",
  "invoke('load_certificate_state'",
  'certificateIncomeInLedgerAndFinance:true',
  'phoneStoredNotPrinted:true',
  'externalCertificateBranches:true'
]) {
  if (!certificates.includes(required)) throw new Error(`Certificate workflow missing: ${required}`);
}
if (certificates.includes('students.push(receipt)') || certificates.includes('student.payments.push')) {
  throw new Error('Certificate fees must remain financially separate from student course payments.');
}
if (!certificates.includes("target?.closest('#ledgerBody tbody tr[data-student^=\"certificate:\"]')")) {
  throw new Error('Certificate transactions in the ledger must open their exact certificate receipt.');
}

if (!packageJson.includes('"html2canvas": "1.4.1"') || !packageJson.includes('"jspdf": "2.5.2"')) {
  throw new Error('Offline PDF dependencies must be pinned locally.');
}
for (const required of [
  'node_modules/html2canvas/dist/html2canvas.min.js',
  'dist/vendor/html2canvas.min.js',
  'node_modules/jspdf/dist/jspdf.umd.min.js',
  'dist/vendor/jspdf.umd.min.js'
]) {
  if (!buildScript.includes(required)) throw new Error(`Offline PDF build copy missing: ${required}`);
}

if (!iconGenerator.includes("readFile('efc-logo.svg'")) throw new Error('Desktop icon must be generated from the sidebar EFC logo source.');
if (!iconGenerator.includes("writeFile('src-tauri/app-icon.svg'")) throw new Error('Square app icon source generation is missing.');
if (!packageJson.includes('"icons": "node scripts/generate-app-icon.mjs && tauri icon src-tauri/app-icon.svg"')) throw new Error('App icon npm command is missing.');
if (!workflow.includes('npm run icons')) throw new Error('Windows build must generate the EFC icons before bundling.');
for (const requiredIcon of ['icons/32x32.png','icons/128x128.png','icons/128x128@2x.png','icons/icon.ico']) {
  if (!tauriConfig.includes(requiredIcon)) throw new Error(`Tauri bundle icon missing: ${requiredIcon}`);
}
for (const forbidden of ['paint_icon','write_ico','png::Encoder','ico::IconDir']) {
  if (buildRs.includes(forbidden)) throw new Error(`build.rs must not overwrite generated EFC icons: ${forbidden}`);
}
if (!buildRs.includes('tauri_build::build()')) throw new Error('Tauri build hook is missing.');
if (cargo.includes('\npng =') || cargo.includes('\nico =')) throw new Error('Old build-time icon painting dependencies must remain removed.');
if (!tauriConfig.includes('"version": "1.0.1"')) throw new Error('Windows version must be bumped so the icon fix installs as a real upgrade.');
if (!tauriConfig.includes('"installerHooks": "./windows/hooks.nsh"')) throw new Error('NSIS shortcut icon hook is not configured.');
for (const required of ['NSIS_HOOK_POSTINSTALL','File /oname=efc-logo-${VERSION}.ico','Delete "$DESKTOP\\${PRODUCTNAME}.lnk"','CreateShortcut "$DESKTOP\\${PRODUCTNAME}.lnk"','${MAINBINARYNAME}.exe']) {
  if (!nsisHooks.includes(required)) throw new Error(`NSIS shortcut icon behavior missing: ${required}`);
}

for (const command of ['load_app_state','save_app_state','export_backup','import_backup','receipt_pdf::save_receipt_pdf','load_certificate_state','save_certificate_state']) {
  if (!rust.includes(command)) throw new Error(`Rust command missing: ${command}`);
}
for (const required of ['CERT_KEY','certificateBranches','certificateReceipts','merge_into_main_state','save_raw','load_raw']) {
  if (!certificateRust.includes(required)) throw new Error(`Native certificate state behavior missing: ${required}`);
}
if (!rust.includes('certificate_state::merge_into_main_state(app, &current)')) throw new Error('Safety backups must include certificate data.');
if (!rust.includes('certificate_state::merge_into_main_state(&app, &state)')) throw new Error('Manual backups must include certificate data.');
for (const required of ['save_receipt_pdf','USERPROFILE','Downloads','%PDF-','unique_path']) {
  if (!receiptPdfRust.includes(required)) throw new Error(`Native receipt PDF save behavior missing: ${required}`);
}
if (!cargo.includes('base64 = "0.22"')) throw new Error('Native PDF base64 dependency is missing.');
if (!rust.includes('auto-before-restore')) throw new Error('Automatic safety backup before restore is missing.');
if (rust.includes('save_state_raw(&app, &state)?;\n    Ok(Some(state))')) {
  throw new Error('Import must not replace SQLite before browser-side merge.');
}
if (!rust.includes('as_millis')) throw new Error('Safety backup names must be collision resistant.');
if (workflow.includes('git push') || workflow.includes('git commit')) throw new Error('Build workflow must not mutate main.');

console.log('Production checks passed: certificate receipts with separate course balances and certificate-only branches, certificate income in finance/ledger, certificate backup persistence, whole-row ledger receipts, direct offline PDF saving to Downloads, separate print/PDF actions, NSIS desktop shortcut pinned to the generated EFC logo icon, daily/monthly/yearly finance periods without weekly mode, manual registration choices, month-only receipt remaining for monthly courses, informational student profile, merge-safe backups, hidden transaction codes, deduplication, immutable CI.');
