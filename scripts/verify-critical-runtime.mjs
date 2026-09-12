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

const registration=read('assets/production-registration-select-native-v19.js');
forbidText(registration,'select.onchange=','registration placeholder replacing the base onchange handler');
requireText(registration,"select.addEventListener('change',sync)",'registration placeholder preserves the base onchange handler');

const registrationReceipt=read('assets/production-registration-receipt-schedule-v22.js');
forbidText(registrationReceipt,'pendingSchedule','registration receipt global state leaking between registrations');
requireText(registrationReceipt,'noCrossRegistrationPendingState:true','registration receipts use the saved student schedule without cross-operation pending state');

const certificates=read('assets/production-certificates-v13.js');
for(const token of ['selectStudent(id)','clearStudentSelection()','renderStudentPicker()','renderHistoryRows()','resetTransientIssueState()','issueInFlight','addBranchOption(branch)'])requireText(certificates,token,`certificate controller ${token}`);
requireText(certificates,'state.certificateReceipts=state.certificateReceipts.filter','certificate issue rollback after persistence failure');
requireText(certificates,"'\"':'&quot;'",'certificate HTML quote escaping');
forbidText(certificates,'persist().then(renderCertificates)','certificate branch add rerendering and discarding the external form draft');
forbidText(certificates,'new MutationObserver(','certificate renderer observer');
forbidText(certificates,'activeStudentId','duplicate certificate student state');
forbidText(certificates,'.click();','visible certificate control forwarding to a hidden control');

const domain=read('assets/production-domain-v13.js');
for(const token of ['function reminderNote(','kind:\'monthly-upcoming\'','kind:overdue?\'debt-overdue\':\'debt-due\'','contextLabel','contextValue','هذا تذكير بتجديد الشهر القادم','موعد الاستحقاق','تحديث ملفكم المالي'])requireText(domain,token,`structured reminder domain ${token}`);

const studentUi=read('assets/production-student-ui-v13.js');
for(const token of ['reminder-view-v13','EFC_OPEN_REMINDER_V13','student-reminder-actions-v13','حفظ PDF'])requireText(studentUi,token,`student reminder action ${token}`);

const financeUi=read('assets/production-finance-ui-v13.js');
requireText(financeUi,'finance-hero-v13','finance page uses the shared mint hero language');
requireText(financeUi,'height=230','finance chart is compact enough for the fixed workspace');
requireText(financeUi,'#financeModeV13 button.active','finance period buttons have an explicit active visual state');
forbidText(financeUi,"pageTitle('الإدارة المالية','المالية','المداخيل والمصاريف والربحية حسب الفترة والفلاتر.')",'legacy finance title notes');

const securityUi=read('assets/production-security-ui-v13.js');
for(const token of ['function reminderHeader(','function reminderDocument(','function openReminder(','window.EFC_OPEN_REMINDER_V13=openReminder','reminder-viewer-v13','Centre EFC','class=\"official12\">للغات والمعلوماتية','grid-template-columns:repeat(8','contextValue'])requireText(securityUi,token,`reminder document ${token}`);
forbidText(securityUi,"stage.innerHTML=`<div class=\"reminder-paper-v13\"",'legacy reminder-only PDF stage without preview document');
forbidText(securityUi,'<span>Rappel</span>','duplicate reminder title in receipt-style header');
const receiptsUi=read('assets/production-receipts-v13.js');
requireText(receiptsUi,'class=\"official12\">للغات والمعلوماتية','receipt header secondary line without duplicated center name');

const indexHtml=read('index.html');
const licenseGate=read('assets/production-license-gate-v8.js');
const runtimeVersion=licenseGate.match(/const RUNTIME_VERSION='([^']+)'/)?.[1]||'';
const indexVersions=[...indexHtml.matchAll(/\?v=([^"'&\s]+)/g)].map(match=>match[1]);
if(!runtimeVersion)throw new Error('Critical runtime missing: license gate cache version.');
if(!indexVersions.length||indexVersions.some(version=>version!==runtimeVersion))throw new Error('Preview cache versions are not synchronized between index.html and the license gate runtime.');

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
console.log('Critical runtime verification passed: full contributed state persists, registration receipt state cannot leak across operations, certificates keep direct state ownership, reminder documents stay consolidated, and preview cache versions remain synchronized.');
