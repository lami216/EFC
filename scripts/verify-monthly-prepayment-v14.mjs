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
  ['prepayAcrossMonths:true','domain prepayment marker'],['allocationPersisted:true','persisted allocation marker'],['nextMonthVisibleBeforeRenewal:true','early next-month visibility'],['dueAfterMonthStarts:true','due timing marker'],['monthlyDueGraceDays:DUE_GRACE_DAYS','grace-day export'],['payment[10]','payment allocation metadata'],['allocationSummary','shared allocation statement'],['month.openDate','pre-renewal reminder window'],['month.dueFrom','due threshold after month start']
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
const specialties=[{id:'normal',name:'عادية',courseType:'normal',billing:'monthly',durationUnit:'month',durationValue:1}];
const methods=['نقداً','Bankily'];
const dateOnly=value=>new Date(`${value}T12:00:00`),pad=value=>String(value).padStart(2,'0'),iso=date=>`${date.getFullYear()}-${pad(date.getMonth()+1)}-${pad(date.getDate())}`;
const addDuration=(start,value,unit)=>{const date=dateOnly(start);if(unit==='day')date.setDate(date.getDate()+Number(value));if(unit==='month'){const day=date.getDate();date.setDate(1);date.setMonth(date.getMonth()+Number(value));const lastDay=new Date(date.getFullYear(),date.getMonth()+1,0).getDate();date.setDate(Math.min(day,lastDay));}return iso(date);};
const money=value=>`${Number(value||0)} أوقية`,fmtDate=value=>String(value||'');
const context={console,Date,setTimeout,clearTimeout,structuredClone,crypto:webcrypto,TextEncoder,TextDecoder,Uint8Array,atob:globalThis.atob,btoa:globalThis.btoa,localStorage,students,specialties,methods,DEMO_TODAY:'2026-09-09',dateOnly,iso,addDuration,money,moneyV3:money,fmtDate,fmtDateV3:fmtDate,spec:id=>specialties.find(item=>item.id===id),branchName:id=>id,saveStudents:()=>localStorage.setItem('efc-students-v1',JSON.stringify(students)),saveSpecs:()=>{},remainingOf:student=>Math.max(0,Number(student.required||0)-Number(student.paid||0)),courseStatus:()=> 'نشطة',financialStatus:()=> 'لم يدفع',installmentPlanV3:()=>[],monthlyFocusV3:()=>null,dueNowV3:student=>Math.max(0,Number(student.required||0)-Number(student.paid||0)),suggestedPaymentV3:student=>Math.max(0,Number(student.required||0)-Number(student.paid||0)),allocV4:()=>({desc:'',before:0,after:0,months:[]}),receiptModelV4:(student,index,statement=false)=>({statement,student:student.name,amount:index===null?0:Number(student.payments?.[Number(index)]?.[1]||0),remaining:Number(student.required||0),month:'—',desc:''}),window:{EFC_RECEIPTS_V13:{ready:true},EFC_FORCE_PERSIST:async()=>({students,specialties,paymentMethods:methods}),EFC_APPLY_RESTORED_STATE:async()=>({}),EFC_CODES:{newTransactionCode:()=>`tx-${Date.now()}`,ensureStudentRecord:()=> 'record'}}};
context.window.window=context.window;vm.createContext(context);vm.runInContext(source.domain,context,{filename:files.domain});await context.window.EFC_DOMAIN_V13_READY;vm.runInContext(source.patch,context,{filename:files.patch});const D=context.window.EFC_DOMAIN_V13;if(!D?.monthlyPrepayment)throw new Error('Patched domain was not published.');

const makeStudent=(id='m1')=>({id,name:id,branch:'main',specialty:'normal',reg:1,start:'2026-09-09',end:'',required:600,paid:0,active:true,status:'active',debtDueDates:{},snapshot:{centerOpsV13:true,centerOpsMonthlyV13:true,dynamicMonthly:true,courseType:'normal',billing:'monthly',fee:600,durationValue:1,durationUnit:'month'},payments:[]});
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

console.log('Monthly prepayment v14 verified: one transaction spans months, partial future coverage is preserved, month 2 appears before renewal, reminders precede renewal, and due status starts after the new month begins.');
