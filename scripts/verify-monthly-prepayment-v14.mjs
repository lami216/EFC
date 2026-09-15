import {readFileSync,existsSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
import vm from 'node:vm';
import {webcrypto} from 'node:crypto';

const files={domain:'assets/production-domain-v13.js',patch:'assets/production-monthly-prepayment-domain-v14.js',ui:'assets/production-monthly-prepayment-ui-v14.js',gate:'assets/production-license-gate-v8.js',build:'scripts/build-production.mjs'};
for(const path of Object.values(files))if(!existsSync(path))throw new Error(`Missing monthly prepayment file: ${path}`);
execFileSync(process.execPath,['--check',files.patch],{stdio:'inherit'});
execFileSync(process.execPath,['--check',files.ui],{stdio:'inherit'});
const source=Object.fromEntries(Object.entries(files).map(([key,path])=>[key,readFileSync(path,'utf8')]));
const requireText=(text,needle,label=needle)=>{if(!text.includes(needle))throw new Error(`Monthly prepayment v14 missing: ${label}`);};
for(const [token,label] of [
  ['prepayAcrossMonths:true','domain prepayment marker'],['allocationPersisted:true','persisted allocation marker'],['nextMonthVisibleBeforeRenewal:true','early next-month visibility'],['dueAfterMonthStarts:true','due timing marker'],['monthlyDueGraceDays:DUE_GRACE_DAYS','grace-day export'],['payment[10]','payment allocation metadata'],['allocationSummary','shared allocation statement'],['month.openDate','pre-renewal reminder window'],['month.dueFrom','due threshold after month start'],
  ['registrationEditAtomic:true','atomic registration edit marker'],['registrationEditStudentScoped:true','student-scoped registration edit marker'],['monthlyReallocationOnEdit:true','monthly reallocation edit marker'],['function updateStudentRegistration(student,changes={})','source registration update function'],['const draft=clone(student)','edit validation happens on a draft'],['Object.assign(student,draft)','validated edit commits atomically']
])requireText(source.patch,token,label);
for(const [token,label] of [
  ['registrationOverpayment:true','registration overpayment UI'],['paymentOverMonthValue:true','payment larger than month UI'],['studentPrepaidMonthBadges:true','prepaid month badge UI'],['monthReceiptUsesAllocations:true','month receipt allocation UI'],['ledgerUsesAllocationSummary:true','ledger allocation statement UI'],['يمكن إدخال قيمة أكبر من قيمة الشهر','overpayment explanation']
])requireText(source.ui,token,label);
const order=['production-domain-v13.js','production-monthly-prepayment-domain-v14.js','production-receipt-sequences-v10.js','production-student-ui-v13.js','production-registration-schedule-v13.js','production-finance-ui-v13.js','production-monthly-prepayment-ui-v14.js','production-security-ui-v13.js'];
let last=-1;for(const token of order){const pos=source.gate.indexOf(token);if(pos<0)throw new Error(`License gate missing ${token}`);if(pos<last)throw new Error(`Monthly prepayment runtime order is wrong at ${token}`);last=pos;}
for(const token of ['assets/production-monthly-prepayment-domain-v14.js','assets/production-monthly-prepayment-ui-v14.js'])requireText(source.build,token,`production build includes ${token}`);

const store=new Map();
const localStorage={getItem:key=>store.has(key)?store.get(key):null,setItem:(key,value)=>store.set(key,String(value)),removeItem:key=>store.delete(key)};
const students=[];
const specialties=[
  {id:'normal',name:'عادية',courseType:'normal',billing:'monthly',durationUnit:'month',durationValue:1},
  {id:'quick',name:'سريعة',courseType:'quick',billing:'one_time',durationUnit:'day',durationValue:30,quickDays:30}
];
const methods=['نقداً','Bankily'];
const dateOnly=value=>new Date(`${value}T12:00:00`),pad=value=>String(value).padStart(2,'0'),iso=date=>`${date.getFullYear()}-${pad(date.getMonth()+1)}-${pad(date.getDate())}`;
const addDuration=(start,value,unit)=>{const date=dateOnly(start);if(unit==='day')date.setDate(date.getDate()+Number(value));if(unit==='month'){const day=date.getDate();date.setDate(1);date.setMonth(date.getMonth()+Number(value));const lastDay=new Date(date.getFullYear(),date.getMonth()+1,0).getDate();date.setDate(Math.min(day,lastDay));}return iso(date);};
const money=value=>`${Number(value||0)} أوقية`,fmtDate=value=>String(value||'');
const context={console,Date,setTimeout,clearTimeout,structuredClone,crypto:webcrypto,TextEncoder,TextDecoder,Uint8Array,atob:globalThis.atob,btoa:globalThis.btoa,localStorage,students,specialties,methods,DEMO_TODAY:'2026-09-09',dateOnly,iso,addDuration,money,moneyV3:money,fmtDate,fmtDateV3:fmtDate,spec:id=>specialties.find(item=>item.id===id),branchName:id=>id,saveStudents:()=>localStorage.setItem('efc-students-v1',JSON.stringify(students)),saveSpecs:()=>{},remainingOf:student=>Math.max(0,Number(student.required||0)-Number(student.paid||0)),courseStatus:()=> 'نشطة',financialStatus:()=> 'لم يدفع',installmentPlanV3:()=>[],monthlyFocusV3:()=>null,dueNowV3:student=>Math.max(0,Number(student.required||0)-Number(student.paid||0)),suggestedPaymentV3:student=>Math.max(0,Number(student.required||0)-Number(student.paid||0)),allocV4:()=>({desc:'',before:0,after:0,months:[]}),receiptModelV4:(student,index,statement=false)=>({statement,student:student.name,amount:index===null?0:Number(student.payments?.[Number(index)]?.[1]||0),remaining:Number(student.required||0),month:'—',desc:''}),window:{EFC_RECEIPTS_V13:{ready:true},EFC_FORCE_PERSIST:async()=>({students,specialties,paymentMethods:methods}),EFC_APPLY_RESTORED_STATE:async()=>({}),EFC_CODES:{newTransactionCode:student=>`tx-${student.id}-${student.payments.length+1}`,ensureStudentRecord:()=> 'record'}}};
context.window.window=context.window;vm.createContext(context);vm.runInContext(source.domain,context,{filename:files.domain});await context.window.EFC_DOMAIN_V13_READY;vm.runInContext(source.patch,context,{filename:files.patch});const D=context.window.EFC_DOMAIN_V13;if(!D?.monthlyPrepayment)throw new Error('Patched domain was not published.');

const makeStudent=(id='m1',specialty='normal',fee=600)=>({id,name:id,phone:'',branch:'main',specialty,reg:1,start:'2026-09-09',end:specialty==='quick'?'2026-10-09':'',required:fee,paid:0,active:true,status:'active',debtDueDates:{},schedule:null,snapshot:{centerOpsV13:true,centerOpsMonthlyV13:specialty==='normal',dynamicMonthly:specialty==='normal',courseType:specialty==='normal'?'normal':'quick',billing:specialty==='normal'?'monthly':'one_time',fee,durationValue:specialty==='normal'?1:30,durationUnit:specialty==='normal'?'month':'day'},payments:[]});
const snapshot=value=>JSON.stringify(value);
const allocationTotal=payment=>(Array.isArray(payment?.[10])?payment[10]:[]).reduce((sum,item)=>sum+Number(item?.amount||0),0);

const twoMonths=makeStudent('two');students.push(twoMonths);const twoIndex=D.appendPayment(twoMonths,{amount:1200,method:'نقداً',date:'2026-09-09',targetMonth:1,persist:false});if(twoIndex!==0||twoMonths.payments.length!==1)throw new Error('Two-month prepayment must remain one financial transaction.');
if(!Array.isArray(twoMonths.payments[0][10])||twoMonths.payments[0][10].length!==2)throw new Error('Two-month allocation was not persisted on the payment.');
let plan=D.installmentPlan(twoMonths,'2026-09-09');if(plan.length!==2||plan[0].paid!==600||plan[1].paid!==600||!plan[1].prepaid||D.remainingAmount(twoMonths,'2026-09-09')!==0)throw new Error('Full two-month prepayment allocation is incorrect.');
if(!D.allocationSummary(twoMonths,0,'2026-09-09').includes('الشهر 1 كامل')||!D.allocationSummary(twoMonths,0,'2026-09-09').includes('الشهر 2 كامل'))throw new Error('Two-month receipt statement is unclear.');

const partNext=makeStudent('partial-next');students.push(partNext);D.appendPayment(partNext,{amount:900,method:'Bankily',date:'2026-09-09',targetMonth:1,persist:false});plan=D.installmentPlan(partNext,'2026-09-09');if(plan.length!==2||plan[0].paid!==600||plan[1].paid!==300||!plan[1].partialPrepaid||D.remainingAmount(partNext,'2026-09-09')!==300)throw new Error('Partial next-month prepayment allocation is incorrect.');
if(!D.allocationSummary(partNext,0,'2026-09-09').includes('جزء من الشهر 2'))throw new Error('Partial next-month statement is missing.');

const carry=makeStudent('carry');students.push(carry);D.appendPayment(carry,{amount:400,method:'نقداً',date:'2026-09-09',targetMonth:1,persist:false});const carryIndex=D.appendPayment(carry,{amount:800,method:'نقداً',date:'2026-09-10',targetMonth:1,persist:false});const carrySummary=D.allocationSummary(carry,carryIndex,'2026-09-10');if(!carrySummary.includes('إكمال الشهر 1')||!carrySummary.includes('الشهر 2 كامل'))throw new Error('Carry-forward payment did not finish the current month before the next one.');

const timing=makeStudent('timing');students.push(timing);context.DEMO_TODAY='2026-10-06';plan=D.installmentPlan(timing);if(plan.length!==2||plan[1].state!=='upcoming')throw new Error('Month 2 must appear three days before it starts without being due yet.');if(!D.notificationsForStudent(timing).some(note=>note.message.includes('الشهر 2 سيبدأ')))throw new Error('Pre-renewal reminder for month 2 is missing.');
context.DEMO_TODAY='2026-10-09';plan=D.installmentPlan(timing);if(plan[1].state!=='upcoming')throw new Error('Month 2 should not become due on its first day.');
context.DEMO_TODAY='2026-10-12';plan=D.installmentPlan(timing);if(plan[1].state!=='due')throw new Error('Month 2 must become due after entering the new month grace window.');
context.DEMO_TODAY='2026-11-09';plan=D.installmentPlan(timing);if(plan[1].state!=='overdue')throw new Error('Unpaid month 2 should become overdue only after the following month starts.');

// Student-scoped transactional edit: another student in the same course must be untouched.
context.DEMO_TODAY='2026-09-09';
const editA=makeStudent('edit-a','normal',600),editB=makeStudent('edit-b','normal',600);editA.reg=10;editB.reg=11;students.push(editA,editB);
const aIndex=D.appendPayment(editA,{amount:900,method:'نقداً',date:'2026-09-09',targetMonth:1,debtDueDate:'2026-09-20',persist:false});
D.appendPayment(editA,{amount:300,method:'Bankily',date:'2026-09-10',targetMonth:2,persist:false});
D.appendPayment(editB,{amount:600,method:'نقداً',date:'2026-09-09',targetMonth:1,persist:false});
editA.payments[aIndex][8]=77;const transactionBefore=editA.payments[aIndex][6],receiptBefore=editA.payments[aIndex][8],otherBefore=snapshot(editB);
D.updateStudentRegistration(editA,{name:'طالب معدل',phone:'2222',branch:'center-b',specialty:'normal',start:'2026-09-08',fee:700,paymentIndex:aIndex,paymentAmount:1000,paymentMethod:'Bankily',paymentDate:'2026-09-11',paymentDescription:'تصحيح إداري',debtDueDate:'2026-09-25',schedule:{version:3,specialtyId:'normal',specialtyName:'عادية',days:[]}});
if(snapshot(editB)!==otherBefore)throw new Error('Editing one receipt/student changed another student in the same course.');
if(editA.name!=='طالب معدل'||editA.phone!=='2222'||editA.branch!=='center-b'||editA.start!=='2026-09-08'||Number(editA.snapshot.fee)!==700)throw new Error('Edited student registration fields were not committed.');
if(editA.payments[aIndex][6]!==transactionBefore||editA.payments[aIndex][8]!==receiptBefore)throw new Error('Receipt edit changed protected transaction/receipt identifiers.');
if(editA.payments[aIndex][1]!==1000||editA.payments[aIndex][2]!=='Bankily'||editA.payments[aIndex][0]!=='2026-09-11')throw new Error('Receipt financial edit did not update the source transaction.');
for(const payment of editA.payments){if(Math.round(allocationTotal(payment)*100)!==Math.round(Number(payment[1]||0)*100))throw new Error('Edited monthly payment allocation no longer equals its transaction amount.');}
if(!editA.payments[aIndex][5].includes('تصحيح إداري'))throw new Error('Custom edited payment description was not preserved with allocation summary.');
if(!Array.isArray(editA.registrationEditHistory)||!editA.registrationEditHistory.length)throw new Error('Receipt edit audit metadata was not recorded.');

// Quick course fee/payment editing must remain isolated and reject contradictory totals atomically.
const quickA=makeStudent('quick-a','quick',1000),quickB=makeStudent('quick-b','quick',1000);quickA.reg=20;quickB.reg=21;students.push(quickA,quickB);
D.appendPayment(quickA,{amount:700,method:'نقداً',date:'2026-09-09',persist:false});D.appendPayment(quickA,{amount:200,method:'Bankily',date:'2026-09-10',persist:false});D.appendPayment(quickB,{amount:1000,method:'نقداً',date:'2026-09-09',persist:false});
quickA.payments[0][8]=88;const quickTransaction=quickA.payments[0][6],quickReceipt=quickA.payments[0][8],quickOtherBefore=snapshot(quickB),quickBeforeRejected=snapshot(quickA);
let rejected=false;try{D.updateStudentRegistration(quickA,{fee:800,specialty:'quick',paymentIndex:0,paymentAmount:700,paymentMethod:'نقداً',paymentDate:'2026-09-09'});}catch{rejected=true;}
if(!rejected)throw new Error('Quick edit accepted a course fee lower than this student total payments.');
if(snapshot(quickA)!==quickBeforeRejected)throw new Error('Rejected edit mutated the student before validation completed.');
if(snapshot(quickB)!==quickOtherBefore)throw new Error('Rejected edit mutated another student.');
D.updateStudentRegistration(quickA,{fee:850,specialty:'quick',paymentIndex:0,paymentAmount:600,paymentMethod:'Bankily',paymentDate:'2026-09-12',paymentDescription:'تصحيح دفعة'});
if(Number(quickA.snapshot.fee)!==850||D.paymentTotal(quickA)!==800||D.remainingAmount(quickA)!==50)throw new Error('Quick student fee/payment edit did not reconcile balances.');
if(quickA.payments[0][6]!==quickTransaction||quickA.payments[0][8]!==quickReceipt)throw new Error('Quick edit changed protected payment identifiers.');
if(snapshot(quickB)!==quickOtherBefore)throw new Error('Successful quick edit changed another student in the same course.');

console.log('Monthly prepayment v14 verified: prepayment allocation, timing, atomic student-scoped receipt edits, protected identifiers, monthly reallocation, and quick-course balance validation are consistent.');
