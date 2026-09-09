import {readFileSync} from 'node:fs';
import {execFileSync} from 'node:child_process';

const read=path=>readFileSync(path,'utf8');
const requireText=(text,needle,label=needle)=>{if(!text.includes(needle))throw new Error(`Production v13 missing: ${label}`);};
const forbidText=(text,needle,label=needle)=>{if(text.includes(needle))throw new Error(`Production v13 forbidden: ${label}`);};

const packageJson=JSON.parse(read('package.json'));
const index=read('index.html');
const gate=read('assets/production-license-gate-v8.js');
const loader=read('production-loader.js');
const core=read('demo-app.js');
const runtime=read('production-runtime.js');
const certificate=read('assets/production-certificates-v13.js');
const domain=read('assets/production-domain-v13.js');
const studentUi=read('assets/production-student-ui-v13.js');
const financeUi=read('assets/production-finance-ui-v13.js');
const securityUi=read('assets/production-security-ui-v13.js');
const fiscal=read('assets/production-fiscal-year-v13.js');
const build=read('scripts/build-demo.mjs');
const tauri=read('src-tauri/tauri.conf.json');
const rust=read('src-tauri/src/main.rs');

const runtimeFiles=[
  'production-loader.js','demo-app.js','demo-period-merge.js','demo-monthly-finance-v3.js','demo-receipts-v4.js','demo-v5-runtime-guard.js','demo-brand-receipt-v5.js','demo-repair-v6.js','demo-receipt-layout-v7.js','demo-fix-v8.js','demo-receipt-logo-v9.js','demo-receipt-compact-v10.js','demo-receipt-paper-v11.js','demo-receipt-clean-v12.js','production-runtime.js','production-monthly-merge-v2.js',
  'assets/production-license-gate-v8.js','assets/production-student-profile-v3.js','assets/production-registration-receipt-v4.js','assets/production-ledger-finance-ui-v5.js','assets/production-ledger-pdf-v6.js','assets/production-certificates-v13.js','assets/production-receipt-sequences-v10.js','assets/production-domain-v13.js','assets/production-student-ui-v13.js','assets/production-finance-ui-v13.js','assets/production-security-ui-v13.js','assets/production-fiscal-year-v13.js'
];
for(const path of runtimeFiles)execFileSync(process.execPath,['--check',path],{stdio:'inherit'});

requireText(core,'const seedStudents=[];','empty student seed');
requireText(core,'const seedSpecialties = [];','empty specialty seed');
for(const demo of ['أحمد سالم ولد محمد','مريم بنت أحمد','efc-demo-v2-students','efc-demo-v2-specialties'])forbidText(core,demo,'demo production data');

requireText(index,'<div id="app"></div>','empty startup root');
requireText(index,'<script src="./assets/production-license-gate-v8.js" defer></script>','single direct production bootstrap');
forbidText(index,'<script src="./demo-app.js"','direct demo script');
forbidText(index,'جاري تشغيل مركز EFC','visible startup splash');
requireText(index,'html.efc-booting #app{visibility:hidden}','silent boot guard');

const gateOrder=['production-loader.js','production-student-profile-v3.js','production-registration-receipt-v4.js','production-ledger-finance-ui-v5.js','production-ledger-pdf-v6.js','production-certificates-v13.js','production-receipt-sequences-v10.js','production-domain-v13.js','production-student-ui-v13.js','production-finance-ui-v13.js','production-security-ui-v13.js','production-fiscal-year-v13.js'];
let last=-1;for(const token of gateOrder){const position=gate.indexOf(token);if(position<0)throw new Error(`Gate does not contain ${token}`);if(position<last)throw new Error(`Gate runtime order is wrong at ${token}`);last=position;}
for(const obsolete of ['production-certificates-v7.js','production-certificate-filters-v8.js','production-center-ops-v11.js','production-center-ops-v11-fix1.js','production-center-ops-v12.js'])forbidText(gate,obsolete,`obsolete gate layer ${obsolete}`);
requireText(gate,'silentValidStartup:true','silent valid-license startup');
requireText(gate,'activationUiOnlyWhenInvalid:true','activation UI invalid-only');
requireText(gate,'noStartupSplash:true','no startup splash marker');
requireText(gate,'fiscalV13:true','fiscal runtime marker');
requireText(gate,"waitUntil(()=>window.EFC_FISCAL_V13?.ready,'السنة المالية')",'fiscal readiness before reveal');

for(const token of ['SCRIPT_ORDER','production-runtime.js','production-monthly-merge-v2.js','chooseNewestState','updatedAt','EFC_FORCE_PERSIST','EFC_APPLY_RESTORED_STATE'])requireText(loader,token,`loader ${token}`);
for(const token of ['renderSettingsProd','createBackupProd','restoreBackupProd','EFC_FORCE_PERSIST'])requireText(runtime,token,`production runtime ${token}`);

for(const token of ['externalRegistrationNative:true','internalBranchAndSpecialtyFilter:true','receiptHeaderUnified:true','certificateReceiptTitleLarge:true','certificateIncomeInLedgerAndFinance:true','window.EFC_OPEN_CERTIFICATE_RECEIPT_V13','window.EFC_SAVE_CERTIFICATE_PDF_V13'])requireText(certificate,token,`certificate ${token}`);
forbidText(certificate,'new MutationObserver(','certificate observer patch');
forbidText(certificate,'window.open=','window.open override');

for(const token of ['function appendPayment(student','student.paid=paymentTotal(student)','function remainingAmount(student','hydrateExtrasFromDesktop','window.EFC_DOMAIN_V13_READY'])requireText(domain,token,`domain ${token}`);
for(const token of ['quickDaysV13','DEBT_IDLE_MS=450','appendPayment(student,{amount:paidNow','appendPayment(student,{amount,method:','autocompleteOff','renderPeriod=function','.quick-days-v13[hidden]'])requireText(studentUi,token,`student UI ${token}`);
for(const token of ['financePrimaryActionV13','renderFinance=function','renderLedger=function','مصروف عام','paymentMethodsNoDelete:true'])requireText(financeUi,token,`finance UI ${token}`);
for(const token of ['renderCurrentV13','mountLogin','loginAttemptThrottle:true','notificationBell:true','usersAndPermissions:true','EFC-ADMIN-RECOVERY-2.','RSA-PSS'])requireText(securityUi,token,`security UI ${token}`);
for(const token of ['firstArchiveIncludesAllPriorHistory:true','annualAutomaticBoundaries:true','activeStudentsNeverPurged:true','unpaidInactiveStudentsNeverPurged:true','certificatePiiPurgedAfterClose:true','expenseDetailsCompacted:true','pendingCloseJournal:true','closedArchivesReadOnly:true'])requireText(fiscal,token,`fiscal ${token}`);

for(const source of [domain,studentUi,financeUi,securityUi,fiscal]){
  forbidText(source,'new MutationObserver(','v13 observer');
  forbidText(source,'saveStudents=function','saveStudents reassignment');
  forbidText(source,'saveSpecs=function','saveSpecs reassignment');
}
forbidText(fiscal,'window.open=','fiscal window.open patch');
for(const obsolete of ['production-center-ops-v11','production-center-ops-v12'])forbidText(fiscal,obsolete,`fiscal obsolete reference ${obsolete}`);

requireText(build,"await cp('assets', 'dist/assets', { recursive: true });",'assets copied into dist');
requireText(build,'Production source is copied verbatim','verbatim production build');
forbidText(build,"replace('const saveStudents'",'build-time JS mutation');
forbidText(build,'production-center-ops-v11','obsolete build patch');
requireText(tauri,'"frontendDist": "../dist"','Tauri packaged frontend');
for(const command of ['save_app_state','load_app_state','save_receipt_pdf','save_certificate_state','load_certificate_state','get_license_status'])requireText(rust,command,`native command ${command}`);

for(const verifier of ['verify-runtime-core-v13.mjs','verify-production-v13.mjs','verify-upgrade-v13.mjs','verify-fiscal-v13.mjs'])if(!String(packageJson.scripts?.check||'').includes(verifier))throw new Error(`package check does not run ${verifier}.`);

console.log('Production v13 verification passed: deterministic boot, canonical payments, native certificates, fiscal archive, finance/security modules.');
