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

await verifyPersistenceCompletes();
console.log('Critical runtime verification passed: full contributed state persists, registration receipt state cannot leak across operations, and certificates reset completed work safely without duplicate-submit or draft-loss behavior.');
