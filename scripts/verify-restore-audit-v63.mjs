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
  const initial=s('lifecycle',[p('tx-registration','2026-10-01')]);
  const stopped={...initial,active:false,status:'inactive',updatedAt:20,stoppedAt:'2026-10-12',frozenMonths:1,end:'2026-10-12'};
  const edited={...initial,active:true,status:'active',updatedAt:30,name:'Updated contact'};
  const h=await harness(state([stopped]));
  const merge=(local,incoming)=>h.api.mergeStates(state([local]),state([incoming])).state.students[0];
  const merged=merge(stopped,edited);
  assert.equal(merged.name,edited.name);
  assert.equal(merged.active,false,'a newer legacy contact edit cannot undo a stop');
  assert.equal(merged.frozenMonths,1);
  assert.equal(merged.end,'2026-10-12');
  const corrected={...edited,lifecycleStateUpdatedAt:40,updatedAt:40,end:'2026-11-01'};
  for(const restored of [merge(stopped,corrected),merge(corrected,{...stopped,updatedAt:50})]){
    assert.equal(restored.active,true,'an explicit correction survives ordinary later edits');
    assert.equal(restored.stoppedAt,undefined);
    assert.equal(restored.end,'2026-11-01');
    assert.equal(restored.payments.length,1);
  }
  const restopped={...stopped,lifecycleStateUpdatedAt:60,updatedAt:60};
  assert.equal(merge(corrected,restopped).active,false,'a newer explicit stop supersedes correction');
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
  const baseline={...s('billing',[p('billing-registration','2026-10-01',200)]),registrationPaymentCode:'billing-registration',registrationPaymentInferred:false,registrationReceiptNo:'00021',start:'2026-10-01',end:'2026-10-15',snapshot:{centerOpsV13:true,dynamicMonthly:true,billing:'monthly',fee:500,durationValue:1,durationUnit:'month'},active:false,status:'inactive',stoppedAt:'2026-10-15',stopEndBasis:'effective-date',frozenMonths:1,lifecycleStateUpdatedAt:100,updatedAt:100};
  const pause={id:'pause-one',stoppedAt:'2026-10-15',afterMonthNumber:1,coveredThrough:'2026-10-31'};
  const waiver={id:'waiver-one',at:100,date:'2026-10-15',reason:'تصفير المتبقي',parts:[{monthNumber:1,amount:300}]};
  const stopped={...baseline,billingLifecycleV71:{version:1,revision:100,pauses:[pause],waivers:[waiver]}};
  const legacy={...baseline,name:'New contact from older client',phone:'222',active:true,status:'active',start:'2026-09-01',end:'2027-01-01',branch:'old-client-center',specialty:'old-client-course',reg:99,required:900,snapshot:{centerOpsV13:true,dynamicMonthly:false,billing:'one_time',fee:900,durationValue:120,durationUnit:'day'},lifecycleStateUpdatedAt:900,updatedAt:900};
  delete legacy.stoppedAt;delete legacy.stopEndBasis;delete legacy.frozenMonths;
  const h=await harness(),merge=(a,b)=>h.api.mergeStates(state([a]),state([b])).state.students[0],terms=['start','end','branch','specialty','reg','snapshot','required'];
  const assertSame=(actual,expected,label)=>assert.deepEqual(JSON.parse(JSON.stringify(actual)),JSON.parse(JSON.stringify(expected)),label);
  for(const merged of [merge(stopped,legacy),merge(legacy,stopped)]){
    assertSame(merged.billingLifecycleV71,stopped.billingLifecycleV71,'pre-upgrade snapshots cannot erase pauses or waivers');
    assert.equal(merged.active,false);assert.equal(merged.frozenMonths,1);assert.equal(merged.lifecycleStateUpdatedAt,100);
    terms.forEach(field=>assertSame(merged[field],stopped[field],`billing schedule field ${field} travels with the lifecycle`));
    assert.equal(merged.name,legacy.name);assert.equal(merged.phone,legacy.phone,'ordinary contact edits still merge by their own revision');
    assert.equal(merged.paid,200,'a waiver never becomes cash');assert.equal(merged.payments[0][6],'billing-registration');
  }
  const resumed={...stopped,active:true,status:'active',end:'',lifecycleStateUpdatedAt:200,updatedAt:200,billingLifecycleV71:{version:1,revision:200,pauses:[{...pause,resumedAt:'2026-12-01',nextCycleStart:'2026-12-01'}],waivers:[{...waiver,reversedAt:200,reversedDate:'2026-12-01'}]}};
  for(const field of ['stoppedAt','stopEndBasis','frozenMonths','scheduledEndBeforeStop'])delete resumed[field];
  const stale={...stopped,name:'Later contact',updatedAt:1000,payments:[...stopped.payments,p('billing-later-payment','2026-12-02',50)]};
  for(const merged of [merge(resumed,stale),merge(stale,resumed)]){
    assertSame(merged.billingLifecycleV71,resumed.billingLifecycleV71);assert.equal(merged.active,true);assert.equal(merged.status,'active');assert.equal(merged.stoppedAt,undefined);assert.equal(merged.frozenMonths,undefined);assert.equal(merged.end,'');
    assert.equal(merged.paid,250,'actual distinct cash payments merge independently of the selected lifecycle');assert.equal(merged.payments.length,2);assert.equal(merged.name,stale.name);
    assert.equal(merged.registrationPaymentCode,'billing-registration');assert.equal(merged.registrationReceiptNo,'00021');
  }
  const restopped={...stopped,stoppedAt:'2027-01-10',frozenMonths:3,end:'2027-01-10',lifecycleStateUpdatedAt:300,updatedAt:300,billingLifecycleV71:{version:1,revision:300,pauses:[...resumed.billingLifecycleV71.pauses,{id:'pause-two',stoppedAt:'2027-01-10',afterMonthNumber:3,coveredThrough:'2027-01-31'}],waivers:[...resumed.billingLifecycleV71.waivers,{id:'waiver-two',at:300,date:'2027-01-10',reason:'إيقاف ثانٍ',parts:[{monthNumber:3,amount:100}]}]}};
  for(const merged of [merge(restopped,{...resumed,updatedAt:2000}),merge({...resumed,updatedAt:2000},restopped)]){
    assertSame(merged.billingLifecycleV71,restopped.billingLifecycleV71);assert.equal(merged.active,false);assert.equal(merged.frozenMonths,3);assert.equal(merged.billingLifecycleV71.waivers.length,2,'repeat decisions retain history rather than unioning stale states');
  }
  const fixed={...resumed,end:'2027-03-15',snapshot:{centerOpsV13:true,billing:'one_time',fee:500,durationValue:60,durationUnit:'day'},billingLifecycleV71:{version:1,revision:200,pauses:[{id:'fixed-pause',stoppedAt:'2026-10-15',afterMonthNumber:null,coveredThrough:'2026-11-30',resumedAt:'2027-01-15',nextCycleStart:'2027-01-15',resumedEnd:'2027-03-15'}],waivers:[]}};
  const fixedOld={...fixed,end:'2026-11-30',updatedAt:999,lifecycleStateUpdatedAt:100,billingLifecycleV71:{...fixed.billingLifecycleV71,revision:100,pauses:[]}};
  for(const merged of [merge(fixed,fixedOld),merge(fixedOld,fixed)])assert.equal(merged.end,'2027-03-15','active fixed-course resumed end is part of the lifecycle snapshot');
  h.conflicts.length=0;
  const conflict={...restopped,billingLifecycleV71:{...restopped.billingLifecycleV71,waivers:[]}};
  assertSame(merge(restopped,conflict).billingLifecycleV71,restopped.billingLifecycleV71,'equal lifecycle revisions keep local history');assert(h.conflicts.some(entry=>entry.type==='student-lifecycle'),'ambiguous equal revisions are reported');
  const destination=await harness(state());
  await destination.window.EFC_MERGE_IMPORTED_STATE(state([restopped]));
  await destination.window.EFC_MERGE_IMPORTED_STATE(state([legacy]));
  await destination.window.EFC_MERGE_IMPORTED_STATE(state([restopped]));
  const recovered=JSON.parse(destination.storage.get('efc-students-v1'));
  assert.equal(recovered.length,1,'repeat disaster recovery preserves one registration');assertSame(recovered[0].billingLifecycleV71,restopped.billingLifecycleV71);assert.equal(recovered[0].payments.length,1);assert.equal(recovered[0].paid,200);assert.equal(recovered[0].payments[0][6],'billing-registration');
  const before=destination.storage.get('efc-students-v1'),savedCount=destination.saves.length;
  const malformed=[null,{...stopped.billingLifecycleV71,version:2},{...stopped.billingLifecycleV71,revision:0},{...stopped.billingLifecycleV71,revision:101},{...stopped.billingLifecycleV71,pauses:null},{...stopped.billingLifecycleV71,waivers:{}}];
  for(const billingLifecycleV71 of malformed){
    await assert.rejects(destination.window.EFC_MERGE_IMPORTED_STATE(state([{...stopped,billingLifecycleV71}])),/سجل الإيقاف/);
    assert.equal(destination.storage.get('efc-students-v1'),before,'invalid lifecycle state is rejected before replacing saved students');assert.equal(destination.saves.length,savedCount,'invalid backup never writes native state');
  }
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
console.log('Restore audit v63: lifecycle/schedule atomic revisions, waiver and resume preservation, independent recovery, malformed backup rejection, live arrays, deterministic legacy identity, registration anchors and revision watermarks passed.');
