import fs from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';
import {webcrypto} from 'node:crypto';
const source=fs.readFileSync('production-loader.js','utf8');
const p=(code,date,amount=100)=>[date,amount,'cash','12:00',1,'',code,null,1,null,null,1];
const s=(id,payments)=>({id,recordCode:'r-'+id,name:'Student '+id,branch:'a',specialty:'x',reg:1,start:'2026-10-01',required:500,paid:payments.reduce((sum,p)=>sum+p[1],0),payments});
const course=(name='Course',updatedAt=10)=>({id:'x',recordCode:'course-x',name,courseType:'quick',billing:'one_time',durationValue:30,durationUnit:'day',fee:500,updatedAt});
const state=(students=[],specialties=[course()])=>({version:3,installationId:'source-install',students,specialties,paymentMethods:['cash']});
async function harness(initial=state()){
  const storage=new Map([['efc-students-v1',JSON.stringify(initial.students)],['efc-specialties-v1',JSON.stringify(initial.specialties)],['efc-payment-methods-v1',JSON.stringify(initial.paymentMethods)],['efc-state-meta-v1',JSON.stringify({installationId:initial.installationId,updatedAt:1})]]),saves=[],conflicts=[];
  const window={__TAURI__:{core:{invoke:async(command,payload)=>{if(command==='load_app_state')return null;if(command==='save_app_state'){saves.push(JSON.parse(payload.state));return null;}throw Error(command);}}}};
  const context={window,console,crypto:webcrypto,setTimeout,clearTimeout,localStorage:{getItem:key=>storage.get(key)??null,setItem:(key,value)=>storage.set(key,String(value)),removeItem:key=>storage.delete(key)}};
  vm.createContext(context);vm.runInContext(source.replace('window.EFC_CORE_STORAGE_READY=ready;', 'window.loaderTest={normalizeStudent,normalizeState,mergeStates,registrationCodeAfterMerge};window.EFC_CORE_STORAGE_READY=ready;'),context);await window.EFC_CORE_STORAGE_READY;
  window.EFC_REPORT_RESTORE_CONFLICT=entry=>conflicts.push(JSON.parse(JSON.stringify(entry)));
  return{window,context,storage,saves,conflicts,api:window.loaderTest};
}
{
  const a=s('a',[p('tx-a','2026-10-01')]),b=s('b',[p('tx-b','2026-11-01')]),h=await harness(state([a]));
  h.window.students=JSON.parse(h.storage.get('efc-students-v1'));h.window.specialties=JSON.parse(h.storage.get('efc-specialties-v1'));h.window.methods=['cash'];const list=h.window.students;
  h.window.EFC_REGISTER_RESTORE_CONTRIBUTOR('tombstone-test',async()=>{
    const kept=h.window.students.filter(item=>item.id!=='a');h.window.students.splice(0,h.window.students.length,...kept);
    h.storage.set('efc-students-v1',JSON.stringify(h.window.students));await h.window.EFC_FORCE_PERSIST();
  });
  await h.window.EFC_MERGE_IMPORTED_STATE(state([b]));
  assert.equal(h.window.students,list,'restore preserves the live array reference used by existing domain readers');
  assert.deepEqual(Array.from(h.window.students,item=>item.id),['b'],'post-merge deletion callbacks must see newly restored student B, not stale A-only memory');
  assert.equal(JSON.parse(h.storage.get('efc-students-v1'))[0].id,'b');assert.equal(h.saves.at(-1).students[0].payments[0][6],'tx-b');
}
{
  const h=await harness(state()),legacy={name:'Legacy',branch:'a',specialty:'x',reg:4,start:'2026-10-01',required:500,payments:[p('legacy-tx','2026-10-01',500)]};
  await h.window.EFC_MERGE_IMPORTED_STATE(state([legacy]));const first=JSON.parse(h.storage.get('efc-students-v1'));
  await h.window.EFC_MERGE_IMPORTED_STATE(state([legacy]));const second=JSON.parse(h.storage.get('efc-students-v1'));
  assert.equal(second.length,1);assert.equal(second[0].id,first[0].id);assert.equal(second[0].recordCode,first[0].recordCode);assert.equal(second[0].paid,500,'id-less/code-less legacy repeat import does not duplicate money');
  const before=h.storage.get('efc-students-v1');await assert.rejects(h.window.EFC_MERGE_IMPORTED_STATE(state([{...legacy,name:'Different person'}])),/مطابقة هوية/);assert.equal(h.storage.get('efc-students-v1'),before,'ambiguous reused legacy register cannot merge two people by name');await assert.rejects(h.window.EFC_MERGE_IMPORTED_STATE(state([legacy,{...legacy,name:'Duplicate ambiguous identity'}])),/مطابقتها/);assert.equal(h.storage.get('efc-students-v1'),before);await assert.rejects(h.window.EFC_MERGE_IMPORTED_STATE(state([{name:'Unidentified',payments:[p('unknown','2026-10-01')]}])),/هوية موثوقة/);assert.equal(h.storage.get('efc-students-v1'),before,'unidentifiable legacy data is rejected before any merged state is applied');
}
{
  const h=await harness(),original=p('registration','2026-10-01',300),collection=p('collection','2026-11-01',200);
  const partial=state([s('same',[collection])]),full=state([s('same',[original,collection])]);
  const repaired=h.api.mergeStates(partial,full).state.students[0];assert.equal(repaired.registrationPaymentCode,'registration','a strictly fuller legacy ledger repairs a partial local inferred anchor');
  assert.deepEqual(Array.from(repaired.payments,p=>p[6]),['collection','registration'],'source transactions are never sorted to make a date become registration');
  const restored=h.api.mergeStates(state([repaired]),partial).state.students[0];assert.equal(restored.registrationPaymentCode,'registration','a later partial backup cannot undo the repaired anchor');assert.equal(restored.paid,500);
  const explicit={...s('same',[original,collection]),registrationPaymentCode:'registration',registrationPaymentInferred:false};
  const conflict={...s('same',[original,collection]),registrationPaymentCode:'collection',registrationPaymentInferred:false};
  assert.equal(h.api.mergeStates(state([explicit]),state([conflict])).state.students[0].registrationPaymentCode,'registration');assert(h.conflicts.some(c=>c.type==='registration-payment'));
  h.conflicts.length=0;
  const contradictory=h.api.mergeStates(full,state([s('same',[collection,original])])).state.students[0];
  assert.equal(contradictory.registrationPaymentCode,'registration','contradictory complete inferred histories must not silently replace the local registration identity');
  assert(h.conflicts.some(c=>c.type==='registration-payment'),'ambiguous complete ledgers require visible conflict resolution');
}
{
  const h=await harness();const initial=state([],[course('Original',10)]),confirmed=state([],[course('Original',200)]),stale=state([],[course('Older changed copy',100)]);
  const checkpoint=h.api.mergeStates(initial,confirmed).state;
  assert.equal(checkpoint.specialties[0].updatedAt,200,'identical content from a higher revision must advance its revision watermark');
  assert.equal(h.api.mergeStates(checkpoint,stale).state.specialties[0].name,'Original','a later restore of older differing data cannot roll back a confirmed newer value');
}
console.log('Restore audit v63: live-array synchronization, delete-plus-add preservation, deterministic legacy identity, unsafe legacy rejection, partial registration-anchor repair, ambiguous ordering conflicts and revision watermarks passed.');
