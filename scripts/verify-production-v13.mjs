import {readFileSync,existsSync} from 'node:fs';
import {execFileSync} from 'node:child_process';

const read=path=>readFileSync(path,'utf8');
const requireText=(text,needle,label=needle)=>{if(!text.includes(needle))throw new Error(`Production v13 missing: ${label}`);};
const forbidText=(text,needle,label=needle)=>{if(text.includes(needle))throw new Error(`Production v13 forbidden: ${label}`);};

const packageJson=JSON.parse(read('package.json'));
const index=read('index.html');
const gate=read('assets/production-license-gate-v8.js');
const loader=read('production-loader.js');
const foundation=read('assets/production-foundation-v13.js');
const receipts=read('assets/production-receipts-v13.js');
const certificate=read('assets/production-certificates-v13.js');
const sequence=read('assets/production-receipt-sequences-v10.js');
const domain=read('assets/production-domain-v13.js');
const studentUi=read('assets/production-student-ui-v13.js');
const financeUi=read('assets/production-finance-ui-v13.js');
const securityUi=read('assets/production-security-ui-v13.js');
const build=read('scripts/build-production.mjs');
const tauri=read('src-tauri/tauri.conf.json');
const rust=read('src-tauri/src/main.rs');

const activeRuntimeFiles=[
  'production-loader.js',
  'assets/production-license-gate-v8.js',
  'assets/production-foundation-v13.js',
  'assets/production-receipts-v13.js',
  'assets/production-certificates-v13.js',
  'assets/production-domain-v13.js',
  'assets/production-receipt-sequences-v10.js',
  'assets/production-student-ui-v13.js',
  'assets/production-finance-ui-v13.js',
  'assets/production-security-ui-v13.js'
];
for(const path of activeRuntimeFiles)execFileSync(process.execPath,['--check',path],{stdio:'inherit'});

const obsoleteSourceFiles=[
  '.demo-imported','demo.css','demo-app.js','demo-period-merge.js','demo-monthly-finance-v3.js','demo-receipts-v4.js','demo-v5-runtime-guard.js','demo-brand-receipt-v5.js','demo-repair-v6.js','demo-receipt-layout-v7.js','demo-fix-v8.js','demo-receipt-logo-v9.js','demo-receipt-compact-v10.js','demo-receipt-paper-v11.js','demo-receipt-clean-v12.js','production-runtime.js','production-monthly-merge-v2.js',
  'assets/production-student-profile-v3.js','assets/production-registration-receipt-v4.js','assets/production-ledger-finance-ui-v5.js','assets/production-ledger-pdf-v6.js',
  'scripts/build-demo.mjs','scripts/harden-production.mjs','scripts/verify-center-ops-v11.mjs','scripts/verify-production.mjs'
];
for(const path of obsoleteSourceFiles)if(existsSync(path))throw new Error(`Obsolete source must be removed from clean v13: ${path}`);
if(!existsSync('assets/production-ui-v13.css'))throw new Error('Production v13 stylesheet is missing.');

requireText(index,'<div id="app"></div>','empty startup root');
requireText(index,'<script src="./assets/production-license-gate-v8.js" defer></script>','single direct production bootstrap');
requireText(index,'<link rel="stylesheet" href="./assets/production-ui-v13.css" />','production stylesheet');
requireText(index,'html.efc-booting #app{visibility:hidden}','silent boot guard');
forbidText(index,'جاري تشغيل مركز EFC','visible startup splash');
forbidText(index,'demo.css','demo stylesheet reference');
forbidText(index,'./demo-app.js','demo runtime documentation');

const gateOrder=['production-loader.js','production-foundation-v13.js','production-receipts-v13.js','production-certificates-v13.js','production-domain-v13.js','production-receipt-sequences-v10.js','production-student-ui-v13.js','production-finance-ui-v13.js','production-security-ui-v13.js'];
let last=-1;for(const token of gateOrder){const position=gate.indexOf(token);if(position<0)throw new Error(`Gate does not contain ${token}`);if(position<last)throw new Error(`Gate runtime order is wrong at ${token}`);last=position;}
for(const obsolete of ['demo-app.js','demo-period-merge.js','demo-monthly-finance-v3.js','production-runtime.js','production-monthly-merge-v2.js','production-student-profile-v3.js','production-registration-receipt-v4.js','production-ledger-finance-ui-v5.js','production-ledger-pdf-v6.js','production-center-ops-v11.js','production-center-ops-v12.js'])forbidText(gate,obsolete,`legacy gate layer ${obsolete}`);
for(const token of ['silentValidStartup:true','activationUiOnlyWhenInvalid:true','noStartupSplash:true','noLegacyDemoRuntime:true','foundationV13:true','standaloneReceiptsV13:true','domainBeforeReceiptSequence:true','singleStartupRender:true'])requireText(gate,token,`gate ${token}`);

for(const token of ['chooseNewestState','EFC_FORCE_PERSIST','EFC_APPLY_RESTORED_STATE','EFC_CORE_CHANGED','explicitPersistence:true','noStoragePrototypePatch:true','noRuntimeScriptChain:true'])requireText(loader,token,`loader ${token}`);
forbidText(loader,'SCRIPT_ORDER','legacy loader script chain');
forbidText(loader,'Storage.prototype.setItem','global storage setItem patch');
forbidText(loader,'Storage.prototype.removeItem','global storage removeItem patch');
forbidText(loader,'loadScript(','runtime script loader');

for(const token of ['noRouter:true','noMutationObserver:true','noStartupRender:true','legacyDataAdapter:true','renderSettings','EFC_CORE_CHANGED'])requireText(foundation,token,`foundation ${token}`);
forbidText(foundation,"addEventListener('hashchange'",'foundation router');
forbidText(foundation,'new MutationObserver(','foundation observer');

for(const token of ['window.receiptModelV4','window.receiptWindowV4','window.EFC_SAVE_RECEIPT_PDF','noLegacyReceiptChain:true','noWindowOpenPatch:true','offlinePdfLibraries:true','inAppReceiptViewer:true','restoredLegacyReceiptDesign:true','receipt-viewer-frame-v13','socialLine12'])requireText(receipts,token,`receipts ${token}`);
forbidText(receipts,'window.open=function','receipt global window.open patch');
forbidText(receipts,'window.open(','external receipt window');
forbidText(receipts,'new MutationObserver(','receipt observer');

for(const token of ['externalRegistrationNative:true','internalBranchAndSpecialtyFilter:true','internalSearchWithoutRequiredFilters:true','certificateStudentResultsClickable:true','certificateReceiptInAppViewer:true','كل الفروع','كل التخصصات','receipt-viewer-frame-v13','receiptHeaderUnified:true','certificateIncomeInLedgerAndFinance:true','window.EFC_RENDER_CERTIFICATES_V13','noRouterHook:true','cleanReceiptDependency:true','EFC_RECEIPTS_V13?.ready'])requireText(certificate,token,`certificate ${token}`);
forbidText(certificate,"addEventListener('hashchange'",'certificate router hook');
forbidText(certificate,'window.open=','certificate window.open override');
forbidText(certificate,'new MutationObserver(','certificate observer');

for(const token of ['EFC_RECEIPTS_V13?.ready','function appendPayment(student','student.paid=paymentTotal(student)','function remainingAmount(student','hydrateExtrasFromDesktop','window.EFC_DOMAIN_V13_READY'])requireText(domain,token,`domain ${token}`);
for(const token of ['quickDaysV13','DEBT_IDLE_MS=450','appendPayment(student,{amount:paidNow','appendPayment(student,{amount,method:','autocompleteOff','renderPeriod=function','renderStudents=function','.quick-days-v13[hidden]','debtDateStableSlot:true','studentSearchPageRestored:true','periodSearchHeaderRestored:true','monthlyCourseDefault:true','debt-slot-hidden','originalStudentFileLayoutRestored:true','monthlyReceiptActionsRestored:true','profileFirstFromStudentSearch:true','حالة التسجيل','روسي شامل للأشهر','روسي التسجيل','فتح الروسي','student-profile-section-v3','month-actions-mm'])requireText(studentUi,token,`student UI ${token}`);
for(const token of ['financePrimaryActionV13','renderFinance=function','renderLedger=function','مصروف عام','paymentMethodsNoDelete:true'])requireText(financeUi,token,`finance UI ${token}`);
for(const token of ['renderCurrentV13',"else if(page==='settings')renderSettings()","else if(page==='certificates')window.EFC_RENDER_CERTIFICATES_V13?.()",'settingsOwnedByFinalRouter:true','certificatesOwnedByFinalRouter:true','loginAttemptThrottle:true','notificationBell:true'])requireText(securityUi,token,`security UI ${token}`);

const activeCombined=[loader,foundation,receipts,certificate,sequence,domain,studentUi,financeUi,securityUi].join('\n');
for(const forbidden of ['new MutationObserver(','window.MutationObserver =','window.MutationObserver=','window.open=function','Storage.prototype.setItem =','Storage.prototype.setItem=','Storage.prototype.removeItem =','Storage.prototype.removeItem='])forbidText(activeCombined,forbidden,`active runtime global side effect ${forbidden}`);
const hashOwners=[foundation,receipts,certificate,sequence,domain,studentUi,financeUi,securityUi].filter(source=>source.includes("addEventListener('hashchange'")||source.includes('addEventListener("hashchange"'));
if(hashOwners.length!==1||hashOwners[0]!==securityUi)throw new Error(`Expected exactly one hashchange router owner; found ${hashOwners.length}.`);

const runtimeBlock=build.match(/const runtimeFiles\s*=\s*\[([\s\S]*?)\];/)?.[1]||'';
if(!runtimeBlock)throw new Error('Could not inspect production runtime file list.');
for(const legacy of obsoleteSourceFiles)forbidText(runtimeBlock,`'${legacy}'`,`obsolete packaged runtime ${legacy}`);
for(const required of ['assets/production-ui-v13.css','assets/production-foundation-v13.js','assets/production-receipts-v13.js','assets/production-security-ui-v13.js'])requireText(runtimeBlock,required,`clean packaged runtime ${required}`);
requireText(build,'forbiddenProductionFiles','obsolete source/dist guard');
forbidText(build,"await cp('assets', 'dist/assets', { recursive: true });",'recursive assets copy');
requireText(tauri,'"frontendDist": "../dist"','Tauri packaged frontend');
for(const command of ['save_app_state','load_app_state','save_receipt_pdf','save_certificate_state','load_certificate_state','get_license_status'])requireText(rust,command,`native command ${command}`);

if(String(packageJson.scripts?.build||'')!=='node scripts/build-production.mjs')throw new Error('package build must use the clean production builder.');
if('harden' in (packageJson.scripts||{}))throw new Error('Obsolete harden script must not remain in package scripts.');
if(!String(packageJson.scripts?.check||'').includes('verify-runtime-core-v13.mjs'))throw new Error('package check does not run runtime v13 verifier.');
if(!String(packageJson.scripts?.check||'').includes('verify-production-v13.mjs'))throw new Error('package check does not run production v13 verifier.');

console.log('Production v13 verification passed: clean runtime with restored original student/search/receipt experience, filter-first certificates, safe persistence, single router and canonical payments.');