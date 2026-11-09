// Isolated native-I/O failure regressions for the actual storage coordinator.
import fs from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';
import {webcrypto} from 'node:crypto';
const source=fs.readFileSync('production-loader.js','utf8');
const pause=ms=>new Promise(resolve=>setTimeout(resolve,ms));
function deferred(){let resolve,reject;const promise=new Promise((yes,no)=>{resolve=yes;reject=no;});return{promise,resolve,reject};}
async function harness({failRead=false}={}){
  const values=new Map(),writes=[],events=[],warnings=[];
  const io={failRead,failSave:false};
  const window={__TAURI__:{core:{invoke:async(command,payload)=>{
    if(command==='load_app_state'){events.push('read');if(io.failRead)throw Error('test database read blocked');return null;}
    if(command==='save_app_state'){events.push('main-save');if(io.saveGate){const gate=io.saveGate;io.saveGate=null;await gate.promise;}if(io.failSave)throw Error('test database write blocked');writes.push(JSON.parse(payload.state));return null;}
    throw Error('Unexpected isolated native command '+command);
  }}}};
  const context={window,localStorage:{getItem:key=>values.get(key)??null,setItem:(key,value)=>values.set(key,String(value)),removeItem:key=>values.delete(key)},crypto:webcrypto,console:{...console,error:(...args)=>warnings.push(args.map(String).join(' ')),warn:(...args)=>warnings.push(args.map(String).join(' '))},setTimeout,clearTimeout};
  vm.createContext(context);vm.runInContext(source,context,{filename:'production-loader.js'});
  await window.EFC_CORE_STORAGE_READY;
  return{window,values,writes,events,io,warnings};
}
{
  const h=await harness(),pendingCertificate=deferred(),pendingBank=deferred();
  let certificateAmount=100,bankAmount=200;
  h.window.EFC_REGISTER_STATE_CONTRIBUTOR('test-read-certificate',snapshot=>{h.events.push('snapshot');return{...snapshot,certificateReceipts:[{amount:certificateAmount}],bankEntries:[{amount:bankAmount}]};});
  h.window.EFC_REGISTER_FLUSH_CONTRIBUTOR('test-pending-certificate',async()=>{await pendingCertificate.promise;certificateAmount=250;h.events.push('certificate-flushed');});
  h.window.EFC_REGISTER_FLUSH_CONTRIBUTOR('test-pending-bank',async()=>{await pendingBank.promise;bankAmount=350;h.events.push('bank-flushed');});
  const saving=h.window.EFC_FORCE_PERSIST();await pause(25);
  assert.equal(h.writes.length,0,'main storage must wait for pending independent certificate/bank writes');assert(!h.events.includes('snapshot'),'the main snapshot must be collected after the pending streams settle');
  pendingCertificate.resolve();await pause(10);assert.equal(h.writes.length,0);
  pendingBank.resolve();await saving;
  assert.equal(h.writes.length,1);assert.equal(h.writes[0].certificateReceipts[0].amount,250);assert.equal(h.writes[0].bankEntries[0].amount,350);
  assert(h.events.indexOf('snapshot')>h.events.indexOf('bank-flushed'));assert(h.events.indexOf('main-save')>h.events.indexOf('certificate-flushed'));
}
{
  const h=await harness();let fail=true;
  h.window.EFC_REGISTER_FLUSH_CONTRIBUTOR('test-rejected-stream',async()=>{if(fail)throw Error('test pending stream failed');});
  await assert.rejects(h.window.EFC_FORCE_PERSIST(),/test pending stream failed/);
  assert.equal(h.writes.length,0,'a failed stream must prevent reporting a successful main save');
  assert.equal(h.window.EFC_STORAGE_HEALTH.snapshot().status,'error');
  fail=false;await h.window.EFC_FORCE_PERSIST();assert.equal(h.writes.length,1,'a failed explicit save must allow a later successful retry');
  assert.equal(h.window.EFC_STORAGE_HEALTH.snapshot().status,'ok');
}
{
  const h=await harness(),gate=deferred();let currentRevision=1;
  h.io.saveGate=gate;h.window.EFC_REGISTER_STATE_CONTRIBUTOR('test-current-revision',snapshot=>({...snapshot,testRevision:currentRevision}));
  const first=h.window.EFC_FORCE_PERSIST();await pause(20);currentRevision=2;const second=h.window.EFC_FORCE_PERSIST();await pause(20);
  assert.equal(h.events.filter(event=>event==='main-save').length,1,'concurrent explicit saves must serialize native writes');
  gate.resolve();await Promise.all([first,second]);
  assert.deepEqual(h.writes.map(snapshot=>snapshot.testRevision),[1,2],'a queued save gathers the current snapshot when its own turn starts');
}
{
  const h=await harness(),unhandled=[];
  const listener=error=>unhandled.push(error);process.on('unhandledRejection',listener);
  try{
    h.io.failSave=true;h.window.EFC_CORE_CHANGED();await pause(240);
    assert.equal(h.writes.length,0);assert.equal(unhandled.length,0,'background persistence failures must be consumed by the scheduler rather than create detached rejections');
    assert.equal(h.window.EFC_STORAGE_HEALTH.snapshot().status,'error','background failures remain observable until a successful save');
    await assert.rejects(h.window.EFC_FORCE_PERSIST(),/test database write blocked/);
    h.io.failSave=false;await h.window.EFC_FORCE_PERSIST();assert.equal(h.writes.length,1,'recovery reuses the current snapshot instead of an earlier stale queued payload');
    assert.equal(h.window.EFC_STORAGE_HEALTH.snapshot().status,'ok');
  }finally{process.removeListener('unhandledRejection',listener);}
}
{
  const h=await harness({failRead:true});
  h.values.set('efc-students-v1',JSON.stringify([{id:'local-only',name:'Cached record',payments:[]} ]));
  h.window.EFC_CORE_CHANGED();await pause(240);
  assert.equal(h.writes.length,0,'a failed native boot read must not convert an empty or stale cache into an automatic native replacement');
  assert.equal(h.window.EFC_STORAGE_HEALTH.snapshot().status,'blocked');
  await assert.rejects(h.window.EFC_FORCE_PERSIST());assert.equal(h.writes.length,0,'an explicit save cannot bypass an unresolved native read failure');
  h.io.failRead=false;const recovered=await h.window.EFC_RETRY_STORAGE();
  assert.equal(recovered.reloadRequired,true,'main native read recovery requires a reload before ordinary saving');assert.equal(h.writes.length,0,'read recovery must not immediately replace the database with the previous cache');
}
// Execute the real early close entry point before the heavy runtime has loaded.
// At login no full runtime snapshot exists, so closing must validate the native
// records rather than overwrite financial extras from a partial startup cache.
const closeSource=fs.readFileSync('index.html','utf8').match(/<script>\s*([\s\S]*?)<\/script>/)[1];
for(const wantBackup of [false,true]){
  const calls=[],alerts=[];
  const financialState={version:3,students:[],specialties:[],paymentMethods:['cash'],expenses:[{id:'saved-expense',amount:900}],fiscalState:{archives:[{number:1}]} };
  const window={EFC_CORE_STORAGE_READY:Promise.resolve(),EFC_CORE_STORAGE_V13:{ready:true},EFC_FORCE_PERSIST:async()=>{throw Error('A login close must not compose a partial snapshot');},confirm:()=>wantBackup,alert:message=>alerts.push(String(message)),__TAURI__:{core:{invoke:async command=>{
    calls.push(command);
    if(command==='load_app_state')return JSON.stringify(financialState);
    if(command==='load_certificate_state')return JSON.stringify({certificateBranches:[],certificateReceipts:[{amount:250}],nextReceiptNo:2});
    if(command==='load_bank_state')return JSON.stringify({entries:[{amount:125}],tombstones:[],nextReceiptNo:2});
    if(command==='export_backup')return'TEST-ONLY-backup.json';
    if(command==='exit_app')return null;
    throw Error('Unexpected login-close command '+command);
  }}}};
  vm.runInNewContext(closeSource,{window,console});await window.EFC_REQUEST_CLOSE_BACKUP();
  if(wantBackup){assert.equal(alerts.length,1,'backup at login requires the fully initialized runtime');assert(!calls.includes('export_backup')&&!calls.includes('exit_app'),'login backup cannot export potentially stale native data and report completion');}
  else{assert.deepEqual(alerts,[]);assert(calls.includes('load_app_state')&&calls.includes('load_certificate_state')&&calls.includes('load_bank_state'),'login close validates all existing native streams');assert.equal(calls.at(-1),'exit_app');}
  assert(!calls.some(command=>command.startsWith('save_')),'login close cannot erase main financial extras with an incomplete snapshot');
}
{
  const calls=[],alerts=[];
  const window={EFC_CORE_STORAGE_READY:Promise.resolve(),EFC_CORE_STORAGE_V13:{ready:true},EFC_FOUNDATION_V13:{ready:true},EFC_FORCE_PERSIST:async()=>calls.push('force'),confirm:()=>false,alert:message=>alerts.push(String(message)),__TAURI__:{core:{invoke:async command=>calls.push(command)}}};
  vm.runInNewContext(closeSource,{window,console});await window.EFC_REQUEST_CLOSE_BACKUP();
  assert.deepEqual(calls,[],'a partially loaded heavy runtime cannot close through a partial snapshot');assert.equal(alerts.length,1,'partial startup tells the user to wait and try again');
}
console.log('Storage safety v66 passed: flush-before-snapshot ordering, stream failure propagation, retry recovery, consumed background rejections and failed-read overwrite protection.');
