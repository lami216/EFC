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
  values.set('efc-students-v1',JSON.stringify([{id:'student-1',name:'Test',payments:[]} ]));
  window.EFC_CORE_CHANGED();
  await new Promise(resolve=>setTimeout(resolve,180));
  await Promise.race([
    window.EFC_FORCE_PERSIST(),
    new Promise((_,reject)=>setTimeout(()=>reject(new Error('Native persistence remained pending (possible write-chain self dependency).')),750))
  ]);
  if(!saves.length)throw new Error('Native persistence did not write a snapshot.');
}

const registration=read('assets/production-registration-select-native-v19.js');
forbidText(registration,'select.onchange=','registration placeholder replacing the base onchange handler');
requireText(registration,"select.addEventListener('change',sync)",'registration placeholder preserves the base onchange handler');

const certificates=read('assets/production-certificates-v13.js');
for(const token of ['selectStudent(id)','clearStudentSelection()','renderStudentPicker()','renderHistoryRows()'])requireText(certificates,token,`certificate controller ${token}`);
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
console.log('Critical runtime verification passed: persistence completes, registration preserves its base change handler, and certificates use one direct renderer/state owner without observer patches.');
