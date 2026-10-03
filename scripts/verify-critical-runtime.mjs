import {readFileSync} from 'node:fs';
import {webcrypto} from 'node:crypto';
import vm from 'node:vm';

const read=path=>readFileSync(path,'utf8');
const requireText=(text,needle,label=needle)=>{if(!text.includes(needle))throw new Error(`Critical runtime missing: ${label}`);};
const forbidText=(text,needle,label=needle)=>{if(text.includes(needle))throw new Error(`Critical runtime forbidden: ${label}`);};

async function verifyPersistenceCompletes(){
  const values=new Map();
  const saves=[];
  const window={
    __TAURI__:{core:{invoke:async(command,payload)=>{
      if(command==='load_app_state')return null;
      if(command==='save_app_state'){saves.push(JSON.parse(payload.state));return null;}
      throw new Error(`Unexpected native command: ${command}`);
    }}}
  };
  const context={
    window,
    localStorage:{getItem:key=>values.has(key)?values.get(key):null,setItem:(key,value)=>values.set(key,String(value)),removeItem:key=>values.delete(key)},
    crypto:webcrypto,
    console,
    setTimeout,
    clearTimeout,
    Promise,
    JSON,
    Date,
    Math,
    Object,
    Array,
    String,
    Number,
    Set,
    Map
  };
  context.globalThis=context;
  vm.runInNewContext(read('production-loader.js'),context,{filename:'production-loader.js'});
  await window.EFC_CORE_STORAGE_READY;
  window.EFC_REGISTER_STATE_CONTRIBUTOR('test-extended-state',snapshot=>Object.assign(snapshot,{
    expenses:[{id:'expense-1',amount:250}],
    branches:[{id:'branch-1',name:'Test Center'}],
    security:{users:[{id:'user-1',username:'Admin'}]},
    centerOpsMeta:{updatedAt:123456789,version:13}
  }));
  values.set('efc-students-v1',JSON.stringify([{id:'student-1',name:'Test',payments:[]} ]));
  window.EFC_CORE_CHANGED();
  await new Promise(resolve=>setTimeout(resolve,180));
  await Promise.race([
    window.EFC_FORCE_PERSIST(),
    new Promise((_,reject)=>setTimeout(()=>reject(new Error('Native persistence remained pending (possible write-chain self dependency).')),750))
  ]);
  if(!saves.length)throw new Error('Native persistence did not write a snapshot.');
  const persisted=saves.at(-1);
  if(!Array.isArray(persisted.expenses)||persisted.expenses[0]?.id!=='expense-1')throw new Error('State contributor expenses were dropped before native persistence.');
  if(!Array.isArray(persisted.branches)||persisted.branches[0]?.id!=='branch-1')throw new Error('State contributor branches were dropped before native persistence.');
  if(persisted.security?.users?.[0]?.id!=='user-1')throw new Error('State contributor security data was dropped before native persistence.');
  if(persisted.centerOpsMeta?.updatedAt!==123456789)throw new Error('State contributor metadata was dropped before native persistence.');
}

const registration=read('assets/production-registration-schedule-matrix-v17.js');
forbidText(registration,'select.onchange=','registration placeholder replacing the base onchange handler');
requireText(registration,"select.addEventListener('change',sync)",'registration placeholder preserves the base onchange handler');

const registrationReceipt=read('assets/production-registration-schedule-matrix-v17.js');
forbidText(registrationReceipt,'pendingSchedule','registration receipt global state leaking between registrations');
requireText(registrationReceipt,'noCrossRegistrationPendingState:true','registration receipts use the saved student schedule without cross-operation pending state');

const certificates=read('assets/production-certificates-v13.js');
requireText(certificates,'certificateReceiptPaidAmountLabel:true','certificate receipt labels the paid amount explicitly');
requireText(certificates,"half('Montant',cash(receipt.amount),'المبلغ المدفوع')",'certificate receipt paid amount wording');
for(const token of ['selectStudent(id)','clearStudentSelection()','renderStudentPicker()','renderHistoryRows(receipts=state.certificateReceipts)','drawCertificateHistory()','resetTransientIssueState()','issueInFlight','addBranchOption(branch)'])requireText(certificates,token,`certificate controller ${token}`);
requireText(certificates,'state.certificateReceipts=state.certificateReceipts.filter','certificate issue rollback after persistence failure');
requireText(certificates,"'\"':'&quot;'",'certificate HTML quote escaping');
forbidText(certificates,'persist().then(renderCertificates)','certificate branch add rerendering and discarding the external form draft');
requireText(certificates,'externalCertificateBranchDelete:true','external certificate branches can be deleted');
requireText(certificates,'deletedCertificateBranchHistoryPreserved:true','deleted certificate branches preserve historical receipt text without remaining selectable');
requireText(certificates,'certificateBranchFiltersRequireLiveReceipt:true','certificate branch filters only exist while a live certificate receipt needs them');
requireText(certificates,'certificateBranchFiltersRequireLiveSource:true','certificate branch filters cannot resurrect branches removed from their primary source');
requireText(certificates,'certificateBranchDisplayResolvesCurrentSource:true','certificate displays resolve live branch names by branch identity');
requireText(certificates,'certificateBranchStoredNameFallback:true','certificate displays preserve stored branch text only when the source identity is gone');
requireText(certificates,'function certificateBranchDisplayName(receipt)','certificate branch display has one canonical resolver');
requireText(certificates,"const current=(Array.isArray(branches)?branches:[]).find(item=>id&&String(item?.id||'')===id)",'internal certificate branches resolve their current source name by id');
requireText(certificates,'<td>${esc(certificateBranchDisplayName(receipt))}</td>','certificate history does not render stale receipt branchName snapshots directly');
requireText(certificates,'label=certificateBranchDisplayName(receipt)','certificate filter labels use the same canonical branch display resolver');
requireText(certificates,'externalCertificateBranchReactivation:true','re-adding a deleted branch reactivates the same branch identity');
requireText(certificates,'function activeCertificateBranches()','certificate issue dropdown excludes deleted branches');
requireText(certificates,'function deleteBranch()','certificate branch delete controller');
requireText(certificates,"branch.deletedAt=Date.now();branch.updatedAt=branch.deletedAt",'certificate branch delete is archived instead of destroying history identity');
requireText(certificates,'function certificateBranchSourceIsActive(receipt)','certificate filters validate each receipt branch against its live primary source');
requireText(certificates,'if(!certificateBranchSourceIsActive(receipt))return;','deleted or orphaned branches cannot remain in certificate filter lists');
requireText(certificates,"state.certificateReceipts.forEach(receipt=>{if(!certificateBranchSourceIsActive(receipt))return;const key=certificateBranchKey(receipt)",'certificate filter branch list remains receipt-driven without stale primary-source entries');
requireText(certificates,'id="certDeleteBranchV13"','external certificate branch delete button');
requireText(certificates,'certificateRegisteredIssuanceRemoved:true','registered-student certificate issuance is removed');
requireText(certificates,'certificateManualReceiptOnly:true','certificate issuance uses the manual receipt form only');
requireText(certificates,'cert-single-mode-v51','certificate workspace exposes one receipt mode instead of registered/external choices');
requireText(certificates,'id="certEditBranchV13"','certificate branch rename button exists');
requireText(certificates,'async function renameBranch()','certificate branch rename preserves the branch identity');
requireText(certificates,'certificateExternalBranchRename:true','certificate branch rename feature marker');
requireText(certificates,'certificateManagerReceiptMultiBranch:true','certificate manager receipt supports multiple branches');
requireText(certificates,'certificateManagerReceiptBranchChips:true','certificate manager receipt shows removable selected-branch chips');
requireText(certificates,'id="certManagerBranchChipsV52"','certificate manager branch chips container exists');
requireText(certificates,'const range=certificateManagerCurrentRange(),branchOptions=certificateFinanceBranches(),branchNames=new Map(branchOptions),specialtyOptions=certificateFinanceSpecialties(),selectedBranches=new Set()','certificate manager starts with an empty multi-branch selection meaning all branches');
requireText(certificates,'branches:branchKeys,branchLabels','selected branch set is passed into the manager receipt model');
forbidText(certificates,'>طالب مسجل</button>','registered-student issuance mode must not be visible');
forbidText(certificates,'>طالب خارجي</button>','old external-student issuance mode label must be removed');
for(const [token,label] of [
  ['certificateHistoryIdentitySearch:true','certificate history exposes one identity search control'],
  ['certificateHistorySearchMatchesStudentIdentityRules:true','certificate history search follows the student identity rules'],
  ['function certificateHistorySearchMatches(receipt,query)','certificate history has a dedicated name/phone/register matcher'],
  ["certificateHistorySearchDigits(receipt?.phone).includes(digits)||certificateHistoryDisplayRecord(receipt?.reg).includes(digits)",'certificate history numeric search matches phone or displayed register number'],
  ['id="certRecordsSearchV50"','certificate history search banner input'],
  ['placeholder="ابحث بالاسم أو الهاتف أو رقم السجل"','certificate history search wording matches the existing search pages'],
  ["document.getElementById('certRecordsSearchV50')?.addEventListener('input',drawCertificateHistory)",'certificate history search redraws results while typing'],
  ['certificateHistorySearchMatches(receipt,query)&&certificateFilterMatches','certificate history identity search composes with existing filters']
])requireText(certificates,token,label);
requireText(certificates,'certificateHistoryFilterByDeliveryStatus:true','certificate history filters by delivery status instead of specialty');
requireText(certificates,'id="certRecordsDeliveryV51"','certificate history exposes a delivery-status filter');
requireText(certificates,'<option value="received">مستلمة</option>','certificate history can show received certificates only');
requireText(certificates,'<option value="pending">غير مستلمة</option>','certificate history can show pending certificates only');
requireText(certificates,"certificateFilterMatches(receipt,{branch,method,delivery:deliveryStatus})",'delivery status composes with records search/date/branch/payment filters');
forbidText(certificates,'certRecordsSpecialtyV48','certificate records no longer expose the specialty filter');
forbidText(certificates,'الفلترة الخاصة بها ستبقى محفوظة','deleted external branches must not remain as filter options');

forbidText(certificates,'new MutationObserver(','certificate renderer observer');
forbidText(certificates,'activeStudentId','duplicate certificate student state');
forbidText(certificates,'.click();','visible certificate control forwarding to a hidden control');

const domain=read('assets/production-domain-v13.js');
for(const token of ['function reminderNote(','kind:\'monthly-upcoming\'','kind:overdue?\'debt-overdue\':\'debt-due\'','contextLabel','contextValue','هذا تذكير بتجديد الشهر القادم','موعد الاستحقاق','تحديث ملفكم المالي'])requireText(domain,token,`structured reminder domain ${token}`);

const studentUi=read('assets/production-student-ui-v13.js');
for(const [token,label] of [
  ['endingFutureRangeFilter:true','ending tab exposes a future-capable date range'],
  ['endingRangeIndependentFromOtherTabs:true','ending date range is independent from the other period tabs'],
  ['periodEndingFromV13','ending range start control'],
  ['periodEndingToV13','ending range end control'],
  ['unifiedStudentIdentitySearch:true','student search keeps one identity field'],
  ['unifiedPeriodIdentitySearch:true','period search keeps one identity field'],
  ['displayedRegisterDigitsSearch:true','identity search checks the displayed register digits'],
  ['function studentIdentitySearchMatchesV13(student,query)','shared name/phone/register search matcher'],
  ["searchDigitsV13(student?.phone).includes(digits)||displayRecordV13(student?.reg).includes(digits)",'numeric search matches either phone digits or the displayed register number'],
  ['placeholder="ابحث بالاسم أو الهاتف أو رقم السجل"','unified identity search wording']
])requireText(studentUi,token,label);
for(const token of ['reminder-view-v13','EFC_OPEN_REMINDER_V13','student-reminder-actions-v13','حفظ PDF'])requireText(studentUi,token,`student reminder action ${token}`);

const financeUi=read('assets/production-finance-ui-v13.js');
requireText(financeUi,'finance-hero-v13','finance page uses the shared mint hero language');
requireText(financeUi,'height=235','finance chart keeps a larger readable workspace');
requireText(financeUi,'#financeModeV13 button.active','finance period buttons have an explicit active visual state');
requireText(financeUi,'customDateRangeFilter:true','finance page exposes a custom date-range filter');
requireText(financeUi,'data-mode="weekly">أسبوع</button>','finance custom period mode uses the same week label as certificate finance');
requireText(financeUi,'id="fromV13"','finance custom period has a start date');
requireText(financeUi,'id="toV13"','finance custom period has an end date');
requireText(financeUi,"mode==='weekly'?{from:from<=to?from:to,to:from<=to?to:from}",'profitability details preserve the selected custom period');
requireText(financeUi,"['dayV13','fromV13','toV13','monthV13','yearV13','branchV13','specV13']", 'finance redraws when either custom-period date changes');
requireText(financeUi,"controlsRoot.dataset.mode=mode",'finance controls expose their selected period for certificate-matched geometry');
requireText(financeUi,'.finance-controls-v13[data-mode="weekly"]{grid-template-columns:148px 124px 124px 102px 140px!important','general finance week geometry matches certificate finance without its payment-method column');
requireText(financeUi,'#financeModeV13{width:100%!important;max-width:100%!important;min-width:0!important;height:34px!important','general finance period switch matches certificate finance height');
requireText(financeUi,'grid-template-columns:repeat(4,minmax(0,1fr))!important','general finance period switch uses the certificate four-button geometry');
requireText(financeUi,'button[data-mode="weekly"]{background:linear-gradient(180deg,#f7f4ff,#f0ecfb)!important','general finance week button uses the certificate finance color');
requireText(financeUi,'EFC_DELETE_EXPENSE_RECEIPT_V13','expense receipt exposes source deletion');
requireText(financeUi,'expenseReceiptSourceDeletion:true','expense receipt deletion feature marker');
requireText(financeUi,'viewExpenseHistoryV13','finance expenses expose a dedicated history action');
requireText(financeUi,'delete-expense-v13','expense history supports deleting an expense');
requireText(financeUi,'height:min(520px,calc(100dvh - 205px))!important','expense history keeps a fixed full-height list frame');
requireText(financeUi,'scrollbar-gutter:auto!important','expense history only gives space to a scrollbar when it exists');
requireText(financeUi,'ledger-hero-v13','daily ledger uses the shared mint hero language');
requireText(financeUi,'height:min(390px,calc(100dvh - 315px))!important','daily ledger keeps a bounded internal-scroll transaction list');
requireText(financeUi,'efc-ledger-redesign-v13','daily ledger styling is consolidated in the finance source');
requireText(financeUi,'.ledger-summary-v13 small{font-size:10.5px!important','daily ledger KPI labels remain readable');
requireText(financeUi,'.ledger-scroll-v13 table{width:100%!important;border-collapse:collapse!important;table-layout:fixed!important;font-size:10px!important','daily ledger records use the established table text size');
requireText(financeUi,'.expense-history-v13 table{width:100%!important;border-collapse:collapse!important;font-size:10px!important','expense history records match the established table text size');
requireText(financeUi,'.finance-kpi-line-v13 small{margin:0!important;font-size:10.5px!important','finance KPI labels remain readable');
requireText(financeUi,'addLedgerExpenseV13','daily ledger owns new expense registration');
requireText(financeUi,'expenseLedgerStatement','daily ledger separates expense name from its statement');
requireText(financeUi,"<td>${esc(item.row.name||'—')}</td><td>${esc(expenseLedgerStatement(item.row))}</td>",'expense name appears in the daily name column');
requireText(financeUi,'finance-topbar-v13','finance section actions share the tab row');
forbidText(financeUi,'addExpenseV13','new expense registration no longer lives in finance');
forbidText(financeUi,"pageTitle('الحركة اليومية','اليومية','اليوم المحدد فقط، وأحدث عملية في الأعلى.')",'legacy daily ledger title notes');
requireText(financeUi,'finance-kpi-line-v13','finance KPI labels and values share one compact row');
requireText(financeUi,'finance-kpi-align-v13','finance KPI rows stay top-aligned even when one card has a period subtitle');
requireText(financeUi,'justify-content:flex-start!important','finance KPI cards align their primary rows consistently at the top');
const periodUi=read('assets/production-period-search-redesign-v28.js');
const studentSearchUi=read('assets/production-student-search-redesign-v31.js');
const sidebarUi=read('assets/production-sidebar-lock-v30.js');
const baseUi=read('assets/production-ui-v13.css');
const homeBackground=read('assets/production-home-background-v36.css');
const registrationRedesign=read('assets/production-registration-redesign-v15.js');
const coursesRedesign=read('assets/production-courses-centers-redesign-v23.js');
const tauriConfig=JSON.parse(read('src-tauri/tauri.conf.json'));
const mainWindow=tauriConfig?.app?.windows?.[0]||{};
if(Number(mainWindow.minWidth||0)!==840)throw new Error('Critical runtime missing: responsive desktop minimum width must remain 840px.');
if(Number(mainWindow.minHeight||0)!==560)throw new Error('Critical runtime missing: responsive desktop minimum height must remain 560px.');
if(mainWindow.maximized!==true)throw new Error('Critical runtime missing: desktop window must start maximized inside the Windows work area.');
requireText(read('index.html'),'body{min-width:840px}','browser preview minimum width matches the responsive desktop workspace');
for(const [token,label] of [
  ['@media(max-width:1080px)','sidebar compacts for narrower Windows displays'],
  ['@media(max-width:900px)','sidebar has an extra compact-width breakpoint'],
  ['@media(max-height:760px)','sidebar compacts vertically on short Windows displays'],
  ['@media(max-height:640px)','sidebar has an extra short-height breakpoint'],
  ['overflow-y:auto!important','short sidebar can scroll instead of hiding controls below the taskbar'],
  ['width:min(900px,calc(100% - 32px))!important','settings workspace shrinks with available width'],
  ['responsiveSmallViewport:true','responsive sidebar runtime advertises its compact-screen safeguard'],
  ['settingsFitAvailableWidth:true','settings runtime advertises width-safe layout'],
  ['shortScreenSidebarScrollFallback:true','short-screen sidebar exposes a scroll fallback'],
  ['height:100dvh!important;max-height:100dvh!important','main workspace is constrained to the visible app viewport'],
  ['overflow-x:hidden!important;overflow-y:auto!important','main workspace scrolls vertically instead of losing bottom actions'],
  ['main>.efc-taskbar-safe-space-v30{display:block!important;width:100%!important;height:56px!important;min-height:56px!important','short screens keep a taskbar-safe bottom clearance without reusing the decorative main pseudo-element'],
  ['canonicalTaskbarSpacer:true','sidebar runtime advertises the canonical bottom spacer'],
  ['mainViewportScroll:true','sidebar runtime advertises the main viewport scroll safeguard'],
  ['taskbarSafeBottomClearance:true','sidebar runtime advertises the taskbar bottom clearance'],
  ['singleMainScrollOwner:true','main is the canonical page-level scroll owner']
])requireText(sidebarUi,token,label);
requireText(homeBackground,'main>.content{position:relative!important;z-index:1!important;height:auto!important;min-height:100%!important;overflow:visible!important','page content grows inside the single main scrollbar');
requireText(homeBackground,'main>.content:has(.efc-home-v35){height:100%!important;min-height:100%!important;overflow:hidden!important','home page keeps its full-height artwork exception');
requireText(registrationRedesign,'singleMainScrollOwner:true','registration redesign uses the canonical main scrollbar');
requireText(coursesRedesign,'singleMainScrollOwner:true','courses/centers redesign uses the canonical main scrollbar');
forbidText(registrationRedesign,'padding:20px 22px 34px!important;\n  overflow-x:hidden;','registration content must not become a nested vertical scroll container through overflow-x');
forbidText(coursesRedesign,'padding:18px 22px 34px!important;overflow-x:hidden','courses content must not become a nested vertical scroll container through overflow-x');
forbidText(registration,'body.efc-registration-editing-v17{overflow-y:auto!important}','registration edit mode must not move page scrolling back to body');
forbidText(registration,'max-height:calc(100dvh - 118px)!important;overflow-y:auto!important','registration edit form must not create a second page-height scrollbar');
requireText(periodUi,'height:calc(100vh - 392px)!important','period search results scroll internally');
requireText(periodUi,'endingFutureRangeVisuals:true','period redesign styles the dedicated ending range');
requireText(periodUi,'unifiedIdentitySearchControl:true','period search redesign keeps one identity control');
forbidText(periodUi,'periodPhoneV13','period search must not reintroduce a separate phone field');
forbidText(periodUi,'periodRegV13','period search must not reintroduce a separate register field');
requireText(periodUi,"'periodEndingFromV13','periodEndingToV13'",'period result count tracks ending-range changes');
requireText(periodUi,'position:sticky!important;top:0!important;z-index:3!important','period search keeps its table header visible');
requireText(studentSearchUi,'height:calc(100vh - 205px)!important','student search results scroll internally');
requireText(studentSearchUi,'unifiedIdentitySearchControl:true','student search redesign keeps one identity control');
forbidText(studentSearchUi,'studentPhoneV13','student search must not reintroduce a separate phone field');
forbidText(studentSearchUi,'studentRegV13','student search must not reintroduce a separate register field');
requireText(baseUi,'.content .table-wrap{max-height:min(520px,calc(100dvh - 250px))','long app tables have a global internal-scroll safety cap');
requireText(baseUi,'scrollbar-gutter:auto','table lists do not reserve an empty scrollbar gutter');
requireText(financeUi,'function axisStep','finance charts use stable human-friendly Y-axis steps');
requireText(financeUi,'viewProfitabilityDetailsV13','profitability dashboard exposes a dedicated details action');
requireText(financeUi,'profitabilityDetailsTotalProfit:true','profitability details show total profit');
requireText(financeUi,'financeResponsiveAt900LikeLedger:true','finance compact layout matches ledger behavior');
requireText(financeUi,'function renderProfitabilityDetails','profitability detail table lives on its own page');
requireText(financeUi,'compactFinanceKpis:true','finance KPI titles stay compact');
forbidText(financeUi,'expense-list-v13','expense history is no longer embedded under the expense dashboard');
requireText(financeUi,'margin-right:22px!important','finance workspace keeps certificate-page sidebar spacing');
forbidText(financeUi,'zoom:.92','finance page should not shrink the entire workspace on short screens');
forbidText(financeUi,'zoom:.86','finance page should not shrink the entire workspace on short screens');
forbidText(financeUi,"pageTitle('الإدارة المالية','المالية','المداخيل والمصاريف والربحية حسب الفترة والفلاتر.')",'legacy finance title notes');

const securityUi=read('assets/production-security-ui-v13.js');
const authUi=read('assets/production-auth-bootstrap-v13.js');
const foundationUi=read('assets/production-foundation-v13.js');
forbidText(securityUi,"document.getElementById('addUserV13')?.addEventListener",'settings user button must not accumulate duplicate click listeners across rerenders');
forbidText(financeUi,"document.getElementById('addMethodV13')?.addEventListener",'payment-method button must not accumulate duplicate click listeners across rerenders');
for(const token of [
  'function activeSubviewOpen()',
  ".expense-history-v13,.profitability-details-v13",
  '[data-efc-history-open-v36="1"]',
  "target.closest('.shell nav a.active')",
  'activeSubviewNavigationReset:true'
])requireText(securityUi,token,`active sidebar navigation resets nested view ${token}`);
if((securityUi.match(/#addCenterV13/g)||[]).length<2||(securityUi.match(/\.edit-center-v13/g)||[]).length<2)throw new Error('Critical runtime missing: center add/edit controls must be covered by both permission disabling and click guards.');
requireText(foundationUi,'efc-taskbar-safe-space-v30','canonical shell includes one real bottom safety spacer for short Windows work areas');
requireText(foundationUi,'grid-template-rows:155px 300px auto auto!important','settings gives more height to payment methods and users than backup cards');
requireText(foundationUi,'max-height:188px!important;overflow:auto!important','settings payment and user lists scroll internally when needed');
requireText(securityUi,'settings-empty-row-v13','settings user list has an explicit empty state and renders account rows when present');
for(const token of ['function reminderHeader(','function reminderDocument(','function openReminder(','window.EFC_OPEN_REMINDER_V13=openReminder','reminder-viewer-v13','Centre EFC','class=\"official12\">للغات والمعلوماتية','grid-template-columns:repeat(8','contextValue'])requireText(securityUi,token,`reminder document ${token}`);
forbidText(securityUi,"stage.innerHTML=`<div class=\"reminder-paper-v13\"",'legacy reminder-only PDF stage without preview document');
forbidText(securityUi,'<span>Rappel</span>','duplicate reminder title in receipt-style header');
requireText(authUi,"if(section==='ledger')return user.permissions?.ledger?.view===true||user.permissions?.register?.view===true||user.permissions?.register?.edit===true",'registration access also exposes the daily ledger');
requireText(authUi,"if(section==='ledger')return user.permissions?.ledger?.edit===true||user.permissions?.register?.edit===true",'registration edit access can record daily expenses');
requireText(securityUi,"finance:'.edit-expense-v13',ledger:'#addLedgerExpenseV13'",'finance view actions stay usable while daily expense creation has its own guard');
const receiptsUi=read('assets/production-receipts-v13.js');
requireText(receiptsUi,'registrationReceiptPaidAmountLabel:true','registration receipt labels the paid amount explicitly');
requireText(receiptsUi,"half('Montant',moneyV3(model.amount),'المبلغ المدفوع')",'registration receipt paid amount wording');
requireText(receiptsUi,'class=\"official12\">للغات والمعلوماتية','receipt header secondary line without duplicated center name');
const accountingIntegrity=read('assets/production-accounting-integrity-v21.js');
for(const [token,label] of [
  ['paymentTombstones','deleted student payments have restore tombstones'],
  ['paymentRestoreTombstones:true','payment deletion survives backup restore'],
  ['paymentReceiptDeletionReversesSource:true','student receipt deletion reverses the payment source'],
  ['registrationReceiptDeletionRemovesRegistration:true','registration receipt deletion reverses the registration source'],
  ['studentReceiptDeleteAction:true','student receipt viewer receives a delete action'],
  ['certificateDeliveryReceiptDeleteAction:true','certificate delivery receipt receives a delete action'],
  ['certificateDeliveryDeleteReversesSource:true','certificate delivery deletion reverses delivery state'],
  ['aggregateReportsRemainReadOnly:true','aggregate reports are intentionally not fake-deletable'],
  ['deleteStudentPaymentSource','student payment source delete implementation'],
  ['deleteCertificateDeliverySource','certificate delivery source delete implementation']
])requireText(accountingIntegrity,token,label);

const indexHtml=read('index.html');
const licenseGate=read('assets/production-license-gate-v8.js');
const runtimeVersion=licenseGate.match(/const RUNTIME_VERSION='([^']+)'/)?.[1]||'';
const indexVersions=[...indexHtml.matchAll(/\?v=([^"'&\s]+)/g)].map(match=>match[1]);
if(!runtimeVersion)throw new Error('Critical runtime missing: license gate cache version.');
if(!indexVersions.length||indexVersions.some(version=>version!==runtimeVersion))throw new Error('Preview cache versions are not synchronized between index.html and the license gate runtime.');

const deterministicPostLicenseRuntime=[
  'production-courses-centers-redesign-v23.js',
  'production-period-search-redesign-v28.js',
  'production-sidebar-lock-v30.js',
  'production-student-search-redesign-v31.js'
];
let lastRuntimeIndex=-1;
for(const file of deterministicPostLicenseRuntime){
  forbidText(indexHtml,file,`index must not race-load post-license runtime: ${file}`);
  requireText(licenseGate,file,`license gate owns post-license runtime: ${file}`);
  const current=licenseGate.indexOf(file);
  if(current<=lastRuntimeIndex)throw new Error(`Post-license runtime order is not deterministic at ${file}.`);
  lastRuntimeIndex=current;
}
requireText(licenseGate,"await window.EFC_AUTH_BOOTSTRAP_V13.requireLogin()",'canonical login completes before heavy app runtime');
requireText(licenseGate,"loadStage('./assets/production-security-ui-v13.js'",'security UI remains the final routed app layer');
forbidText(licenseGate,'production-login-ui-v13.js','obsolete post-security login layer');

const runtimeManifest=read('scripts/build-production.mjs');
const runtimeBlock=runtimeManifest.match(/const runtimeFiles\s*=\s*\[([\s\S]*?)\];/)?.[1]||'';
for(const obsolete of [
  'production-certificates-redesign-v35.js',
  'production-certificates-workspace-v36.js',
  'production-certificates-date-control-fix-v37.js',
  'production-certificates-student-picker-v38.js',
  'production-certificates-student-results-panel-v39.js',
  'production-certificates-student-layout-v40.js'
])forbidText(runtimeBlock,obsolete,`obsolete certificate patch ${obsolete}`);
for(const leftover of ['scripts/apply-reminder-document-polish.mjs','.github/workflows/reminder-document-polish.yml'])requireText(runtimeManifest,leftover,`temporary reminder patch guard ${leftover}`);

await verifyPersistenceCompletes();
console.log('Critical runtime verification passed: full contributed state persists, registration receipt state cannot leak across operations, compact-screen safeguards are enforced, certificates keep direct state ownership, reminder documents stay consolidated, preview cache versions remain synchronized, and browser/Windows use one deterministic post-license redesign runtime.');
