import fs from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';

const iso=date=>date.toISOString().slice(0,10);
const addDays=(value,count)=>{const date=new Date(value+'T12:00:00Z');date.setUTCDate(date.getUTCDate()+count);return iso(date);};
const addDuration=(value,count,unit)=>{const date=new Date(value+'T12:00:00Z');if(unit==='month'){const day=date.getUTCDate();date.setUTCDate(1);date.setUTCMonth(date.getUTCMonth()+count);date.setUTCDate(Math.min(day,new Date(Date.UTC(date.getUTCFullYear(),date.getUTCMonth()+1,0)).getUTCDate()));}else date.setUTCDate(date.getUTCDate()+count*(unit==='week'?7:1));return iso(date);};
const students=[],saved=[];let failSave=false,failFlush=0,role='admin',editable=true,flushCalls=0;
const B={ready:true,today:()=> '2026-11-15',nowTime:()=> '12:00',cash:String,showDate:String,esc:String,addDays,uid:()=> 'tx-generated',isDynamicMonthly:student=>student.snapshot?.billing==='monthly',isNewModel:()=>true,isInactive:student=>student.active===false||student.status==='inactive',paymentTotal:student=>student.payments.reduce((sum,payment)=>sum+Number(payment[1]||0),0),requiredAmount:student=>student.required,remainingAmount:student=>Math.max(0,student.required-student.paid),installmentPlan:()=>[],setDebtDate(){},persistExtrasSoon(){}};
const context={console,structuredClone,students,addDuration,receiptModelV4:()=>({}),remainingOf:null,installmentPlanV3:null,monthlyFocusV3:null,dueNowV3:null,suggestedPaymentV3:null,allocV4:null,financialStatus:null,monthBadgeV3:null,EFC_DOMAIN_V13:B,EFC_FISCAL_V14:{assertDateOpen(){}},EFC_AUTH_V13:{canEdit:()=>editable,currentUser:()=>({role,username:'Manager'})},saveStudents(){if(failSave)throw Error('local save failed');saved.push(JSON.parse(JSON.stringify(students)));},async EFC_FORCE_PERSIST(){flushCalls++;if(failFlush-->0)throw Error('native save failed');return saved.at(-1);}};
context.window=context;vm.createContext(context);vm.runInContext(fs.readFileSync('assets/production-monthly-prepayment-domain-v14.js','utf8'),context);const D=context.EFC_DOMAIN_V13;
const payment=(date,amount,code,month=1)=>[date,amount,'cash','12:00',1,'Original source '+code,code,month,code,null,[{monthNumber:month,amount}],1];
function make(overrides={}){const student={id:'s-'+students.length,recordCode:'record-'+students.length,name:'Student',phone:'1234',branch:'a',specialty:'monthly',reg:students.length+1,start:'2026-10-01',end:'2026-10-31',stoppedAt:'2026-10-31',stopReason:'Mistake',stopEndBasis:'effective-date',active:false,status:'inactive',frozenMonths:1,updatedAt:100,lifecycleStateUpdatedAt:100,payments:[payment('2026-10-01',200,'tx-'+students.length)],snapshot:{centerOpsV13:true,billing:'monthly',fee:500,durationValue:1,durationUnit:'month'},debtDueDates:{},...overrides};students.push(student);D.reconcileStudent(student);return student;}

const student=make(),before=JSON.stringify(student),receipts=JSON.stringify(student.payments),preview=D.previewStudentReactivation(student);
assert.equal(JSON.stringify(student),before,'preview must not change state');
assert.deepEqual(JSON.parse(JSON.stringify(preview)),{asOf:'2026-11-15',stoppedAt:'2026-10-31',monthly:true,beforeRequired:500,afterRequired:1000,beforeRemaining:300,afterRemaining:800,beforeUnallocated:0,afterUnallocated:0,beforeMonths:1,afterMonths:2,restoredMonths:1,restoredEnd:''});
const identity=[student.id,student.recordCode,student.branch,student.specialty,student.reg,student.start];
student.updatedAt=Date.now()+5000;student.lifecycleStateUpdatedAt=student.updatedAt+5000;const priorRevision=student.lifecycleStateUpdatedAt;
await D.reactivateStudent(student);
assert.equal(student.active,true);assert.equal(student.status,'active');assert.equal(D.remainingAmount(student),800);
assert.deepEqual([student.id,student.recordCode,student.branch,student.specialty,student.reg,student.start],identity);
assert.equal(JSON.stringify(student.payments),receipts,'correction never alters source receipts or paid amounts');
for(const key of ['stoppedAt','stopReason','stopEndBasis','frozenMonths','scheduledEndBeforeStop'])assert.equal(Object.hasOwn(student,key),false);
assert(student.lifecycleStateUpdatedAt>priorRevision);assert.equal(student.lifecycleStateUpdatedAt,student.updatedAt);
assert.equal(student.stopCorrectionHistory[0].stoppedAt,'2026-10-31');assert.equal(student.stopCorrectionHistory[0].by,'Manager');
assert.equal(saved.at(-1).find(item=>item.id===student.id).active,true,'corrected state is persisted');
await assert.rejects(()=>D.reactivateStudent(student),/غير موقوف/);
const correctedRevision=student.lifecycleStateUpdatedAt;D.stopStudent(student,'Again','2026-11-15');assert(student.lifecycleStateUpdatedAt>correctedRevision);assert.equal(student.active,false);

const denied=make(),deniedBefore=JSON.stringify(denied);role='staff';assert.throws(()=>D.previewStudentReactivation(denied),/للمسؤول/);await assert.rejects(()=>D.reactivateStudent(denied),/للمسؤول/);role='admin';editable=false;await assert.rejects(()=>D.reactivateStudent(denied),/للمسؤول/);editable=true;
const auth=context.EFC_AUTH_V13;delete context.EFC_AUTH_V13;await assert.rejects(()=>D.reactivateStudent(denied),/للمسؤول/);context.EFC_AUTH_V13=auth;assert.equal(JSON.stringify(denied),deniedBefore);
for(const overrides of [{stoppedAt:''},{stoppedAt:'2026-02-31'},{start:'2026-11-01'},{stoppedAt:'2026-11-16'}]){const invalid=make(overrides),original=JSON.stringify(invalid);await assert.rejects(()=>D.reactivateStudent(invalid),/غير واضح/);assert.equal(JSON.stringify(invalid),original);}
await assert.rejects(()=>D.reactivateStudent({...denied}),/لم يعد موجودًا/);

context.EFC_FISCAL_V14={assertDateOpen(date){if(date<='2026-10-31')throw Error('سنة مقفلة');}};
const locked=make(),lockedBefore=JSON.stringify(locked);await assert.rejects(()=>D.reactivateStudent(locked),/مقفلة/);assert.equal(JSON.stringify(locked),lockedBefore);
const legacyLocked=make({start:'2026-01-01',stoppedAt:'2026-11-10'});await assert.rejects(()=>D.reactivateStudent(legacyLocked),/مقفلة/,'old under-frozen months cannot be reopened inside an archived period');context.EFC_FISCAL_V14={assertDateOpen(){}};

const credit=make({payments:[payment('2026-10-01',700,'credit')]}),creditReceipts=JSON.stringify(credit.payments),creditPreview=D.previewStudentReactivation(credit);
assert.equal(creditPreview.beforeUnallocated,200);assert.equal(creditPreview.afterUnallocated,0);assert.equal(creditPreview.afterRemaining,300);await D.reactivateStudent(credit);assert.equal(JSON.stringify(credit.payments),creditReceipts);
const future=make({payments:[payment('2026-12-01',500,'future')]}),futurePreview=D.previewStudentReactivation(future);assert.equal(futurePreview.afterRemaining,1000,'future-dated collections do not pay current displayed obligations');

const quick=make({end:'2026-10-31',scheduledEndBeforeStop:'2026-12-01',snapshot:{centerOpsV13:true,billing:'one_time',fee:1000,durationValue:61,durationUnit:'day'}});const quickReceipts=JSON.stringify(quick.payments);await D.reactivateStudent(quick);assert.equal(quick.end,'2026-12-01');assert.equal(D.remainingAmount(quick),800);assert.equal(JSON.stringify(quick.payments),quickReceipts);
const knownLegacy=make({snapshot:{centerOpsV13:true,billing:'one_time',fee:1000,durationValue:30,durationUnit:'day'}});await D.reactivateStudent(knownLegacy);assert.equal(knownLegacy.end,'2026-10-31','legacy fixed-term end can only come from its own saved duration');
const ambiguous=make({snapshot:{centerOpsV13:true,billing:'one_time',fee:1000}});await assert.rejects(()=>D.reactivateStudent(ambiguous),/الأصلية غير محفوظة/);

const failedNative=make(),nativeBefore=JSON.stringify(failedNative),callsBefore=flushCalls;failFlush=1;await assert.rejects(()=>D.reactivateStudent(failedNative),/native save failed/);assert.equal(JSON.stringify(failedNative),nativeBefore);assert.equal(flushCalls,callsBefore+2,'rollback is also flushed');assert.equal(saved.at(-1).find(item=>item.id===failedNative.id).active,false);
const failedLocal=make(),localBefore=JSON.stringify(failedLocal);failSave=true;const oldError=context.console;context.console={...console,error(){}};await assert.rejects(()=>D.reactivateStudent(failedLocal),/local save failed/);failSave=false;context.console=oldError;assert.equal(JSON.stringify(failedLocal),localBefore);
const fiscal=context.EFC_FISCAL_V14;delete context.EFC_FISCAL_V14;await assert.rejects(()=>D.reactivateStudent(make()),/لم يجهز/);context.EFC_FISCAL_V14=fiscal;
const unavailable=make(),force=context.EFC_FORCE_PERSIST;delete context.EFC_FORCE_PERSIST;const unavailableBefore=JSON.stringify(unavailable);await assert.rejects(()=>D.reactivateStudent(unavailable),/لم تجهز/);context.EFC_FORCE_PERSIST=force;assert.equal(JSON.stringify(unavailable),unavailableBefore);

console.log('Student reactivation v69: admin-only undo-stop, explicit retroactive debt preview, fiscal/legacy guards, source preservation, monotonic lifecycle revisions and durable rollback passed.');
