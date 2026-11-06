import fs from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';
const iso=d=>d.toISOString().slice(0,10),addDays=(v,n)=>{const d=new Date(v+'T12:00:00Z');d.setUTCDate(d.getUTCDate()+n);return iso(d);};
const addDuration=(v,n,unit)=>{const d=new Date(v+'T12:00:00Z');if(unit==='month'){const day=d.getUTCDate();d.setUTCDate(1);d.setUTCMonth(d.getUTCMonth()+n);const last=new Date(Date.UTC(d.getUTCFullYear(),d.getUTCMonth()+1,0)).getUTCDate();d.setUTCDate(Math.min(day,last));}else d.setUTCDate(d.getUTCDate()+n);return iso(d);};
const students=[];let failSave=false;
const B={ready:true,today:()=> '2026-11-15',nowTime:()=> '12:00',cash:String,showDate:String,addDays,uid:()=> 'tx-generated',esc:String,isDynamicMonthly:s=>s.snapshot?.billing==='monthly',isNewModel:()=>true,isInactive:s=>s.active===false||s.status==='inactive',paymentTotal:s=>s.payments.reduce((n,p)=>n+Number(p[1]||0),0),installmentPlan:()=>[],remainingAmount:()=>0,requiredAmount:()=>0,setDebtDate(s,k,v){s.debtDueDates||={};if(v)s.debtDueDates[k]=v;else delete s.debtDueDates[k];},persistExtrasSoon(){}};
const context={console,structuredClone,students,addDuration,receiptModelV4:()=>({}),remainingOf:null,installmentPlanV3:null,monthlyFocusV3:null,dueNowV3:null,suggestedPaymentV3:null,allocV4:null,financialStatus:null,monthBadgeV3:null,saveStudents:()=>{if(failSave)throw Error('save failed');},EFC_DOMAIN_V13:B,EFC_CODES:{newTransactionCode:s=>'tx-'+s.payments.length}};context.window=context;vm.createContext(context);vm.runInContext(fs.readFileSync('assets/production-monthly-prepayment-domain-v14.js','utf8'),context);const D=context.EFC_DOMAIN_V13;
const make=()=>({id:'monthly',start:'2026-11-01',active:true,status:'active',payments:[],snapshot:{billing:'monthly',fee:500},debtDueDates:{}});
const payment=(date,amount,explicit=null)=>[date,amount,'cash','12:00',1,'','tx-existing',1,null,null,explicit];
const sum=xs=>xs.reduce((n,x)=>n+Number(x.amount||0),0);
function conserved(s,date){const a=D.dynamicAllocation(s,date),expected=s.payments.filter(p=>p[0]<=date).reduce((n,p)=>n+Math.max(0,p[1]),0);assert(Math.abs(sum(a.allocations)+sum(a.unallocated)-expected)<1e-7,'every source amount must be allocated or explicitly reported at the supported limit');assert.equal(a.count,a.monthPaid.length);assert.equal(D.installmentPlan(s,date).length,a.count);return a;}
const topup=make();topup.payments=[payment('2026-11-01',200,[{monthNumber:1,amount:200}])];
const unchanged=JSON.stringify(topup),preview=D.previewMonthlyPaymentAllocation(topup,{amount:500,date:'2026-11-15',targetMonth:1});
assert.equal(JSON.stringify(topup),unchanged,'preview is read-only');assert(preview.summary.includes('إكمال الشهر 1')&&preview.summary.includes('جزء من الشهر 2'));
const i=D.appendPayment(topup,{amount:500,method:'cash',date:'2026-11-15',targetMonth:1,persist:false});assert.deepEqual(JSON.parse(JSON.stringify(topup.payments[i][10])),[{monthNumber:1,amount:300},{monthNumber:2,amount:200}]);assert.deepEqual(Array.from(conserved(topup,'2026-11-15').monthPaid),[500,200]);
const backdated=make();backdated.payments=[payment('2026-11-10',200,[{monthNumber:1,amount:200}])];D.appendPayment(backdated,{amount:500,method:'cash',date:'2026-11-01',targetMonth:1,persist:false});
assert.deepEqual(Array.from(conserved(backdated,'2026-11-01').monthPaid),[500]);assert.deepEqual(Array.from(conserved(backdated,'2026-11-15').monthPaid),[500,200]);assert.equal(sum(conserved(JSON.parse(JSON.stringify(backdated)),'2026-11-15').allocations),700,'serialized old overlapping allocations recover full coverage on read');
// Multiple explicit allocations, unassigned legacy receipts, dates and targets.
for(let seed=1;seed<=20;seed++){
  const s=make();s.payments=Array.from({length:12},(_,i)=>{const amount=((seed*37+i*73)%900)+1,date=`2026-11-${String((i*3)%15+1).padStart(2,'0')}`,target=(i%4)+1,p=payment(date,amount,i%2?[{monthNumber:target,amount}]:null);p[7]=target;p[6]='p-'+i;return p;});
  const before=JSON.stringify(s);for(const date of ['2026-11-01','2026-11-05','2026-11-10','2026-11-15'])conserved(s,date);assert.equal(JSON.stringify(s),before,'historical allocation reads never rewrite source receipts');
}
const limit=make();limit.payments=[payment('2026-11-01',120000,[{monthNumber:1,amount:120000}])];assert.equal(conserved(limit,'2026-11-15').count,240);const beforeLimit=JSON.stringify(limit);assert.throws(()=>D.appendPayment(limit,{amount:1,method:'cash',targetMonth:1,persist:false}));assert.equal(JSON.stringify(limit),beforeLimit,'limit rejection must be atomic');
const oldExcess=make();oldExcess.payments=[payment('2026-11-01',120001)];assert.equal(sum(conserved(oldExcess,'2026-11-15').unallocated),1,'legacy excess beyond 240 months remains explicit');
const futureLimit=make();futureLimit.payments=[payment('2026-11-10',120000)];const beforeFutureLimit=JSON.stringify(futureLimit);assert.throws(()=>D.appendPayment(futureLimit,{amount:500,method:'cash',date:'2026-11-01',targetMonth:1,persist:false}));assert.equal(JSON.stringify(futureLimit),beforeFutureLimit,'backdating cannot bypass eventual capacity and lose money when future receipts become visible');
const stopped=JSON.parse(JSON.stringify(topup));students.push(stopped);D.stopStudent(stopped,'test');const frozen=stopped.frozenMonths;D.installmentPlan(stopped,'2028-12-01');assert.equal(stopped.frozenMonths,frozen);assert.equal(stopped.active,false);assert.equal(D.installmentPlan(stopped,'2028-12-01').length,frozen);
const stoppedExcess={...make(),active:false,status:'inactive',frozenMonths:1,payments:[payment('2026-11-01',700)]};assert.deepEqual(Array.from(conserved(stoppedExcess,'2026-11-15').monthPaid),[500]);assert.equal(sum(D.dynamicAllocation(stoppedExcess).unallocated),200,'frozen obligations do not grow to hide legacy advance credit');const stoppedBefore=JSON.stringify(stoppedExcess);assert.throws(()=>D.appendPayment(stoppedExcess,{amount:1,method:'cash',persist:false}));assert.equal(JSON.stringify(stoppedExcess),stoppedBefore);
const stoppedLegacy={...make(),active:false,status:'inactive',payments:[payment('2026-11-01',200)]};assert.deepEqual(Array.from(conserved(stoppedLegacy,'2026-11-15').monthPaid),[200]);assert.equal(D.remainingAmount(stoppedLegacy),300,'missing legacy frozenMonths must preserve the prior obligation and debt');assert.equal(D.remainingAmount(stoppedLegacy,'2028-12-01'),300,'legacy stopped obligations do not grow with the calendar');
const first=make();D.appendPayment(first,{amount:300,method:'cash',persist:false});assert.equal(first.registrationPaymentCode,first.payments[0][6]);assert.equal(first.registrationPaymentInferred,false);D.appendPayment(first,{amount:200,method:'cash',persist:false});assert.equal(first.registrationPaymentCode,first.payments[0][6]);
const rollback=make(),beforeRollback=JSON.stringify(rollback);failSave=true;assert.throws(()=>D.appendPayment(rollback,{amount:100,method:'cash'}));failSave=false;assert.equal(JSON.stringify(rollback),beforeRollback,'save rejection rolls back receipt and registration marker');

context.spec=id=>({id,name:'Monthly',billing:'monthly'});
context.EFC_AUTH_V13={canEdit:section=>section==='students',currentUser:()=>({role:'admin'})};
const october=()=>({...make(),name:'Monthly student',branch:'a',specialty:'m',start:'2026-10-01'});
const correctedStop=october();
correctedStop.payments=[
  payment('2026-10-01',200,[{monthNumber:1,amount:200}]),
  payment('2026-11-03',500,[{monthNumber:2,amount:500}]),
  payment('2026-11-10',100,[{monthNumber:1,amount:100}])
];
correctedStop.payments[1][7]=2;
const originalReceipts=JSON.stringify(correctedStop.payments),olderRevision=Date.now()+5000;
correctedStop.updatedAt=olderRevision;
D.stopStudent(correctedStop,'تاريخ فعلي','2026-10-31');
assert.equal(correctedStop.stoppedAt,'2026-10-31');
assert.equal(correctedStop.end,'2026-10-31');
assert.equal(correctedStop.frozenMonths,1);
assert.equal(correctedStop.active,false);
assert(correctedStop.updatedAt>olderRevision,'a dated stop advances the revision even if the old clock was ahead');
assert.equal(JSON.stringify(correctedStop.payments),originalReceipts,'stopping preserves every original receipt and date');
assert.deepEqual(Array.from(conserved(correctedStop,'2026-11-15').monthPaid),[300]);
assert.equal(D.remainingAmount(correctedStop),200,'later collections for a started month still reduce frozen debt');
assert.equal(sum(D.dynamicAllocation(correctedStop).unallocated),500,'a payment for a removed month remains visible as credit');

D.updateStudentRegistration(correctedStop,{name:'Corrected name'});
assert.equal(correctedStop.name,'Corrected name');
assert.equal(JSON.stringify(correctedStop.payments),originalReceipts,'personal edits preserve frozen payment allocation hints and excess credit');
D.updateStudentRegistration(correctedStop,{paymentIndex:2,paymentDate:'2026-11-11'});
assert.equal(correctedStop.payments[2][0],'2026-11-11');
assert.equal(correctedStop.stoppedAt,'2026-10-31');
assert.equal(correctedStop.end,'2026-10-31');
assert.equal(correctedStop.frozenMonths,1);
assert.equal(correctedStop.active,false);
assert.equal(D.remainingAmount(correctedStop),200);
assert.equal(sum(D.dynamicAllocation(correctedStop).unallocated),500);
assert.throws(()=>D.updateStudentRegistration(correctedStop,{start:'2026-11-01'}),/بداية الدورة/);
D.appendPayment(correctedStop,{amount:200,method:'cash',date:'2026-11-15',targetMonth:1,persist:false});
assert.equal(D.remainingAmount(correctedStop,'2027-01-01'),0);
assert.equal(correctedStop.frozenMonths,1);
assert.equal(correctedStop.active,false,'paying frozen debt does not reactivate the student');
assert.equal(sum(D.dynamicAllocation(correctedStop).unallocated),500);

const boundary=october();D.stopStudent(boundary,'','2026-11-01');
assert.equal(boundary.frozenMonths,2,'a month beginning on the chosen stop date counts');
assert.equal(D.remainingAmount(boundary),1000);
for(const invalid of ['', '2026-02-31','2026-09-30','2026-11-16']){
  const record=october(),before=JSON.stringify(record);
  assert.throws(()=>D.stopStudent(record,'',invalid));
  assert.equal(JSON.stringify(record),before,'invalid dates do not change the student');
}
context.EFC_FISCAL_V14={assertDateOpen:date=>{if(date<='2026-10-31')throw Error('سنة مالية مقفلة');}};
assert.throws(()=>D.stopStudent(october(),'','2026-10-31'),/مقفلة/);
delete context.EFC_FISCAL_V14;
context.EFC_AUTH_V13={canEdit:()=>true,currentUser:()=>({role:'staff'})};
const staff=october();assert.throws(()=>D.stopStudent(staff,'','2026-10-31'),/مسؤول/);
D.stopStudent(staff,'','2026-11-15');assert.equal(staff.frozenMonths,2);
assert.throws(()=>D.stopStudent(staff,'','2026-11-15'),/موقوف بالفعل/);
context.EFC_AUTH_V13={canEdit:()=>false,currentUser:()=>({role:'staff'})};
assert.throws(()=>D.stopStudent(october(),'','2026-11-15'),/صلاحية/);
context.EFC_AUTH_V13={canEdit:()=>true,currentUser:()=>({role:'admin'})};
const quick={...october(),end:'2026-11-20',snapshot:{billing:'one_time',fee:1000},payments:[payment('2026-10-01',200)]};
D.stopStudent(quick,'','2026-10-31');assert.equal(quick.end,'2026-10-31');assert.equal(D.remainingAmount(quick),800);
const failedStop=october(),beforeStopFailure=JSON.stringify(failedStop);failSave=true;
assert.throws(()=>D.stopStudent(failedStop,'','2026-10-31'));failSave=false;
assert.equal(JSON.stringify(failedStop),beforeStopFailure,'a failed dated stop rolls back its changes');

console.log('Monthly audit: allocations, conservation, identity, dated stop permissions and boundaries, frozen debt/credit, receipt edits and rollback passed.');
