import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';

const source=readFileSync('assets/production-fiscal-year-v14.js','utf8');
const monthlySource=readFileSync('assets/production-monthly-prepayment-domain-v14.js','utf8');
const financeSource=readFileSync('assets/production-finance-ui-v13.js','utf8');
const securitySource=readFileSync('assets/production-security-ui-v13.js','utf8');
const certificateSource=readFileSync('assets/production-certificates-v13.js','utf8');
for(const [text,token] of [[monthlySource,"EFC_FISCAL_V14?.assertDateOpen?.(String(date||today()),'تاريخ الدفعة'"],[monthlySource,"EFC_FISCAL_V14?.assertDateOpen?.(candidatePaymentDate,'تاريخ الدفعة'"],[financeSource,"EFC_FISCAL_V14?.assertDateOpen?.(record.date,'تاريخ المصروف'"],[securitySource,'EFC_ENHANCE_FISCAL_SETTINGS_V14'],[certificateSource,'EFC_CERTIFICATE_STATE_V14']])assert.equal(text.includes(token),true,`missing fiscal integration: ${token}`);
for(const forbidden of ["addEventListener('hashchange'",'new MutationObserver(','window.open='])assert.equal(source.includes(forbidden),false,`forbidden fiscal runtime pattern: ${forbidden}`);
for(const required of ['currentLevelImplementation:true','ownerChoosesStartDate:true','automaticEndDate:true','annualSameAnchor:true','continuingStudentsRetained:true','debtorsRetained:true','separateCourseAndCertificateIncome:true','tombstoneRestoreProtection:true','pendingCloseJournal:true','closedPeriodsImmutable:true','noRouterHook:true'])assert.equal(source.includes(required),true,`missing fiscal contract: ${required}`);

let currentDate='2026-09-15';
const store=new Map();
const students=[
  {id:'active-cross',recordCode:'reg-active',name:'طالب مستمر',active:true,status:'active',branch:'main',specialty:'sp1',start:'2025-10-01',end:'2027-01-01',required:1200,paid:600,payments:[['2025-10-01',300,'نقداً'],['2026-09-15',300,'Bankily']]},
  {id:'ended-settled',recordCode:'reg-ended',name:'منتهي مسدد',active:true,status:'active',branch:'main',specialty:'sp1',start:'2025-01-01',end:'2026-06-01',required:500,paid:500,payments:[['2025-02-01',500,'نقداً']]},
  {id:'inactive-debt',recordCode:'reg-debt',name:'منتهي عليه دين',active:false,status:'inactive',branch:'main',specialty:'sp1',start:'2025-02-01',stoppedAt:'2026-05-02',required:500,paid:200,payments:[['2025-03-01',200,'نقداً']]},
  {id:'future',recordCode:'reg-future',name:'طالب جديد',active:true,status:'active',branch:'main',specialty:'sp1',start:'2026-10-01',end:'2027-11-01',required:700,paid:0,payments:[]}
];
let expenses=[
  {id:'e-old',name:'إيجار',amount:100,method:'نقداً',branch:'main',specialty:'__expense_general__',date:'2026-01-01',time:'09:00'},
  {id:'e-new',name:'كهرباء',amount:50,method:'Bankily',branch:'main',specialty:'__expense_general__',date:'2026-10-02',time:'09:00'}
];
let certificateState={certificateBranches:[{id:'c1',name:'مركز شهادات أ'}],certificateReceipts:[
  {id:'cert-old',recordCode:'cr-old',transactionCode:'ctx-old',receiptNo:1,studentName:'قديم',branchName:'مركز شهادات أ',specialtyName:'فرنسية',amount:300,method:'نقداً',date:'2026-02-01',time:'10:00'},
  {id:'cert-new',recordCode:'cr-new',transactionCode:'ctx-new',receiptNo:2,studentName:'جديد',branchName:'مركز شهادات أ',specialtyName:'فرنسية',amount:400,method:'Bankily',date:'2026-10-01',time:'10:00'}
]};
const paymentRows=()=>students.flatMap(student=>(student.payments||[]).map((payment,index)=>({student,date:payment[0],amount:Number(payment[1]),method:payment[2],paymentIndex:index,sourceType:'student'})));
const localStorage={getItem:key=>store.has(key)?store.get(key):null,setItem:(key,value)=>store.set(key,String(value)),removeItem:key=>store.delete(key)};
const document={head:{appendChild(){}},createElement(){return{style:{},appendChild(){},remove(){},addEventListener(){},prepend(){}};},querySelector(){return null;},getElementById(){return null;}};
const contributors=new Map();
let appliedIncoming=null;
const context={console,structuredClone,JSON,Date,Math,Intl,Promise,setTimeout,clearTimeout,localStorage,document,location:{hash:'#register',href:'http://localhost/'},confirm:()=>true,alert(){},students,specialties:[{id:'sp1',name:'فرنسية'}],methods:['نقداً','Bankily'],branchName:id=>id==='main'?'الفرع الرئيسي':String(id),spec:id=>id==='sp1'?{name:'فرنسية'}:null,allPayments:paymentRows};
context.window=context;
context.window.EFC_CERTIFICATES_V13={ready:true};
context.window.EFC_CERTIFICATE_STATE_V14={snapshot:()=>structuredClone(certificateState),purgeReceiptsByIdentity:async({ids=[],recordCodes=[],transactionCodes=[]}={})=>{const idSet=new Set(ids.map(String)),records=new Set(recordCodes.map(String)),transactions=new Set(transactionCodes.map(String)),before=certificateState.certificateReceipts.length;certificateState={...certificateState,certificateReceipts:certificateState.certificateReceipts.filter(row=>!idSet.has(String(row.id||''))&&!records.has(String(row.recordCode||''))&&!transactions.has(String(row.transactionCode||'')))};return{deleted:before-certificateState.certificateReceipts.length};}};
context.window.EFC_AUTH_V13={currentUser:()=>({username:'Admin',role:'admin'})};
context.window.EFC_REGISTER_STATE_CONTRIBUTOR=(name,fn)=>contributors.set(name,fn);
context.window.EFC_FORCE_PERSIST=async()=>{let snapshot={students:structuredClone(students),specialties:[],paymentMethods:['نقداً','Bankily']};for(const fn of contributors.values())snapshot=await fn(snapshot)||snapshot;return snapshot;};
context.window.EFC_APPLY_RESTORED_STATE=async incoming=>{appliedIncoming=structuredClone(incoming);return incoming;};
context.window.EFC_DOMAIN_V13={ready:true,esc:value=>String(value??''),today:()=>currentDate,cash:value=>`${Number(value||0)}`,showDate:value=>String(value||''),remainingAmount:s=>Math.max(0,Number(s.required||0)-(s.payments||[]).reduce((sum,p)=>sum+Number(p?.[1]||0),0)),expenseSpecialtyName:v=>v==='__expense_general__'?'مصروف عام':String(v||'—'),getExpenses:()=>expenses,saveExpenses:next=>{expenses=next;},saveStudents:()=>{}};
vm.createContext(context);
vm.runInContext(source,context,{filename:'production-fiscal-year-v14.js'});
await new Promise(resolve=>setTimeout(resolve,0));
const F=context.window.EFC_FISCAL_V14;
assert.equal(F?.ready,true);
assert.equal(F.addYearsClamped('2024-02-29',1),'2025-02-28');
assert.equal(F.addYearsClamped('2024-02-29',4),'2028-02-29');

await F.configure('2025-09-15');
let saved=F.getState();
assert.equal(saved.config.anchorDate,'2025-09-15');
assert.equal(saved.config.firstEndDate,'2026-09-14');
let plan=F.nextPlan();
assert.deepEqual(JSON.parse(JSON.stringify(plan)),{number:1,boundary:'2026-09-15',declaredStart:'2025-09-15',periodStart:null,periodEnd:'2026-09-14',first:true,due:true});
let preview=F.previewArchive();
assert.equal(preview.totals.courseIncome,1000,'first archive should include all prior course income through fiscal end');
assert.equal(preview.totals.certificateIncome,300);
assert.equal(preview.totals.expenses,100);
assert.equal(preview.totals.totalIncome,1300);
assert.equal(preview.totals.net,1200);
assert.equal(F.studentContinuesAfter(students[0],plan.periodEnd),true);
assert.equal(F.eligibleStudent(students[1],plan),true,'ended settled student should be eligible even if active flag was never manually stopped');
assert.equal(F.eligibleStudent(students[2],plan),false,'debtor must remain');

const first=await F.closeCurrentYear();
assert.equal(first.number,1);
assert.equal(students.some(s=>s.recordCode==='reg-active'),true,'cross-year student must remain');
assert.equal(students.find(s=>s.recordCode==='reg-active').payments.length,2,'continuing student history remains intact');
assert.equal(students.some(s=>s.recordCode==='reg-ended'),false,'ended settled student should be purged');
assert.equal(students.some(s=>s.recordCode==='reg-debt'),true,'debtor must remain');
assert.deepEqual(expenses.map(x=>x.id),['e-new']);
assert.deepEqual(certificateState.certificateReceipts.map(x=>x.recordCode),['cr-new']);
assert.equal(first.cleanup.studentIds.includes('ended-settled'),true);
assert.equal(first.cleanup.studentRecordCodes.includes('reg-ended'),true);
assert.equal(first.cleanup.expenseIds.includes('e-old'),true);
assert.equal(first.cleanup.certificateIds.includes('cert-old'),true);
assert.equal(first.cleanup.certificateRecordCodes.includes('cr-old'),true);
assert.equal(F.lockedThrough(),'2026-09-14');
assert.equal(F.isDateClosed('2026-09-14'),true);
assert.equal(F.isDateClosed('2026-09-15'),false);
assert.throws(()=>F.assertDateOpen('2026-09-14','تاريخ الدفعة'),/سنة مالية مقفلة/);
assert.doesNotThrow(()=>F.assertDateOpen('2026-09-15','تاريخ الدفعة'));

plan=F.nextPlan();
assert.equal(plan.number,2);
assert.equal(plan.periodStart,'2026-09-15');
assert.equal(plan.periodEnd,'2027-09-14');
preview=F.previewArchive();
assert.equal(preview.totals.courseIncome,300,'next archive must not recount previous-year continuing-student payment');
assert.equal(preview.totals.certificateIncome,400);
assert.equal(preview.totals.expenses,50);

const imported={students:[{id:'ended-settled',payments:[]}],expenses:[{id:'e-old',amount:100}],certificateReceipts:[{id:'cert-old'}],specialties:[],paymentMethods:[],fiscalState:F.getState()};
await context.window.EFC_APPLY_RESTORED_STATE(imported);
assert.equal(appliedIncoming.students.length,0,'closed student tombstone must filter restored backup');
assert.equal(appliedIncoming.expenses.length,0,'closed expense tombstone must filter restored backup');
assert.equal(appliedIncoming.certificateReceipts.length,0,'closed certificate tombstone must filter restored backup');
const mismatch=structuredClone(F.getState());mismatch.config.anchorDate='2025-10-01';mismatch.config.firstEndDate='2026-09-30';
await assert.rejects(context.window.EFC_APPLY_RESTORED_STATE({students:[],specialties:[],paymentMethods:[],fiscalState:mismatch}),/بداية سنة مالية مختلفة/,'different fiscal anchors must never be silently merged');

saved=F.getState();
assert.equal(saved.archives.length,1);
assert.equal(saved.archives[0].totals.courseIncome,1000);
assert.equal(saved.pendingClose,null);

// Stopped and resumable registrations retain every actual receipt, including
// settled records from before the upgrade and completed pause histories.
const datedStop=(id,paid)=>({id,recordCode:`reg-${id}`,active:false,status:'inactive',stopEndBasis:'effective-date',start:'2026-10-01',end:'2026-10-15',stoppedAt:'2026-10-15',branch:'main',specialty:'sp1',required:500,paid,payments:[['2026-10-01',paid,'نقداً']]});
const credited=datedStop('dated-credit',1000),settled=datedStop('dated-settled',500);
const legacyStopped={...datedStop('legacy-zero',0),required:0,payments:[]};delete legacyStopped.stopEndBasis;
const resumed={...datedStop('resumed',500),active:true,status:'active',lifecycleStateUpdatedAt:50,billingLifecycleV71:{version:1,revision:50,pauses:[{id:'pause-resumed',stoppedAt:'2026-10-15',afterMonthNumber:1,coveredThrough:'2026-10-31',resumedAt:'2026-11-01',nextCycleStart:'2026-11-01'}],waivers:[]}};delete resumed.stoppedAt;delete resumed.stopEndBasis;
const waived={...datedStop('waived',200),required:200,lifecycleStateUpdatedAt:60,billingLifecycleV71:{version:1,revision:60,pauses:[],waivers:[{id:'waiver-one',at:60,date:'2026-10-15',reason:'وقف وتصفير',parts:[{monthNumber:1,amount:300}]}]}};
Object.assign(context.EFC_DOMAIN_V13,{
  isInactive:student=>student.active===false||student.status==='inactive',
  isDynamicMonthly:student=>student.stopEndBasis==='effective-date',
  dynamicAllocation(student,asOf){
    assert.equal(asOf,'2027-09-14','archive evaluates unapplied credit through the fiscal cutoff');
    return {unallocated:student.id===credited.id?[{paymentIndex:0,amount:500}]:[]};
  }
});
const retained=[credited,settled,legacyStopped,resumed,waived],receiptsBefore=retained.map(student=>JSON.stringify(student.payments));
students.push(...retained);currentDate='2027-09-15';plan=F.nextPlan();
assert.equal(F.eligibleStudent(credited,plan),false,'zero debt does not make unapplied prepaid credit eligible for cleanup');
for(const student of retained)assert.equal(F.eligibleStudent(student,plan),false,'stopped or resumable history must never become automatic fiscal cleanup');
const second=await F.closeCurrentYear();
assert.equal(second.cleanup.studentRecordCodes.includes(credited.recordCode),false);
assert.equal(second.cleanup.studentRecordCodes.includes(settled.recordCode),false);
assert.deepEqual(students.find(student=>student.id===credited.id)?.payments,[['2026-10-01',1000,'نقداً']],'archive preserves the original receipt with outstanding credit');
assert.equal(second.totals.courseIncome,2500,'archive aggregates include only genuine receipt amounts, not waived debt');
retained.forEach((student,index)=>assert.equal(JSON.stringify(students.find(item=>item.id===student.id)?.payments),receiptsBefore[index]));
assert.equal(F.previewArchive().totals.courseIncome,0,'retained historic receipts are not recounted in the next fiscal period');
await context.window.EFC_APPLY_RESTORED_STATE({students:retained,specialties:[],paymentMethods:[],fiscalState:F.getState()});
assert.deepEqual(appliedIncoming.students.map(student=>student.id),retained.map(student=>student.id));

async function pendingHarness(initial,records){
  const local=new Map([['efc-fiscal-state-v14',JSON.stringify(initial)]]),live=structuredClone(records),stateContributors=new Map();let restored;
  const h={...context,students:live,localStorage:{getItem:key=>local.get(key)??null,setItem:(key,value)=>local.set(key,String(value)),removeItem:key=>local.delete(key)},allPayments:()=>live.flatMap(student=>(student.payments||[]).map(payment=>({student,date:payment[0],amount:payment[1],method:payment[2],sourceType:'student'})))};
  h.window=h;h.EFC_DOMAIN_V13={...context.EFC_DOMAIN_V13,today:()=> '2026-01-01',getExpenses:()=>[],saveExpenses(){},saveStudents(){}};
  h.EFC_CERTIFICATE_STATE_V14={snapshot:()=>({certificateReceipts:[]}),purgeReceiptsByIdentity:async()=>({deleted:0})};
  h.EFC_REGISTER_STATE_CONTRIBUTOR=(name,fn)=>stateContributors.set(name,fn);
  h.EFC_FORCE_PERSIST=async()=>{let snapshot={students:structuredClone(live)};for(const fn of stateContributors.values())snapshot=await fn(snapshot)||snapshot;return snapshot;};
  h.EFC_APPLY_RESTORED_STATE=async incoming=>{restored=structuredClone(incoming);return incoming;};
  delete h.EFC_FISCAL_V14;vm.createContext(h);vm.runInContext(source,h);await new Promise(resolve=>setTimeout(resolve,0));
  return{h,live,F:h.EFC_FISCAL_V14,restored:()=>restored};
}
const oldStopped={id:'pending-stopped',recordCode:'pending-stopped-r',active:false,status:'inactive',start:'2025-10-01',end:'2025-10-31',stoppedAt:'2025-10-31',required:100,payments:[['2025-10-01',100,'cash']]};
const oldResumed={id:'pending-resumed',recordCode:'pending-resumed-r',active:true,status:'active',start:'2025-10-01',end:'2025-11-30',required:200,payments:[['2025-10-01',200,'cash']],lifecycleStateUpdatedAt:70,billingLifecycleV71:{version:1,revision:70,pauses:[{id:'pending-pause',stoppedAt:'2025-10-31',afterMonthNumber:1,coveredThrough:'2025-10-31',resumedAt:'2025-11-01',nextCycleStart:'2025-11-01'}],waivers:[]}};
const ordinary={id:'pending-ordinary',recordCode:'pending-ordinary-r',active:true,status:'active',start:'2025-01-01',end:'2025-10-31',required:300,payments:[['2025-05-01',300,'cash']]};
const ids=[oldStopped,oldResumed,ordinary,{id:'already-removed',recordCode:'already-removed-r'}];
const frozenArchive={id:'fiscal-2026-01-01',number:1,first:true,periodStart:null,declaredStart:'2025-01-01',periodEnd:'2025-12-31',boundary:'2026-01-01',totals:{courseIncome:777,certificateIncome:0,totalIncome:777,expenses:0,net:777},byMonth:[{label:'2025-10',courseIncome:777}]};
const interrupted={version:14,config:{anchorDate:'2025-01-01'},archives:[],pendingClose:{archive:frozenArchive,cleanupPlan:{studentIds:ids.map(item=>item.id),studentRecordCodes:ids.map(item=>item.recordCode)},startedAt:1,backupPath:'isolated-safety-backup.json'},updatedAt:1};
const pending=await pendingHarness(interrupted,[oldStopped,oldResumed,ordinary]);
await pending.h.EFC_APPLY_RESTORED_STATE({students:[oldStopped,oldResumed,ordinary],fiscalState:interrupted});
assert.equal(pending.live.length,3,'pending candidates cannot silently purge student records during restore');assert.equal(pending.restored().students.length,3);
const finalized=await pending.F.finalizePending();
assert.deepEqual(pending.live.map(student=>student.id),[oldStopped.id,oldResumed.id]);
assert.deepEqual(JSON.parse(JSON.stringify(finalized.totals)),frozenArchive.totals,'resuming old pending cleanup never rebuilds the frozen aggregate');
assert.deepEqual(JSON.parse(JSON.stringify(finalized.byMonth)),frozenArchive.byMonth);
assert.deepEqual(Array.from(finalized.cleanup.studentIds),[ordinary.id,'already-removed'],'retained live records are not future tombstones; absent partial-cleanup identities stay protected');
assert.equal(pending.F.isDateClosed('2025-12-31'),true);
await pending.h.EFC_APPLY_RESTORED_STATE({students:[oldStopped,oldResumed,ordinary,{id:'already-removed'}],fiscalState:pending.F.getState()});
assert.deepEqual(pending.restored().students.map(student=>student.id),[oldStopped.id,oldResumed.id]);
assert.deepEqual(pending.live.map(student=>JSON.stringify(student.payments)),[JSON.stringify(oldStopped.payments),JSON.stringify(oldResumed.payments)]);
const oldArchiveState=pending.F.getState();oldArchiveState.archives[0].cleanup.studentIds.push(oldStopped.id,oldResumed.id);oldArchiveState.archives[0].cleanup.studentRecordCodes.push(oldStopped.recordCode,oldResumed.recordCode);
const preserved=pending.F.filterImportedState({students:[oldStopped,{...oldResumed,billingLifecycleV71:undefined}]},oldArchiveState);
assert.equal(preserved.students.length,2,'old archive candidates cannot erase stopped incoming records or a live resumable registration');
const unrelated={id:oldStopped.id,recordCode:'different-source-registration',active:true,start:'2025-01-01',end:'2025-12-31'};
assert.equal(pending.F.filterImportedState({students:[unrelated]},oldArchiveState).students.length,0,'a matching legacy id cannot borrow lifecycle protection from a different original registration code');
console.log('Fiscal v14 verification passed: immutable aggregates, no historic double count, stopped/resumable receipt retention, interrupted cleanup, actual tombstones and closed-period locks.');
