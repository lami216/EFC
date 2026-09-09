import {readFileSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
import vm from 'node:vm';
import {webcrypto} from 'node:crypto';

const files={
  gate:'assets/production-license-gate-v8.js',
  domain:'assets/production-domain-v13.js',
  student:'assets/production-student-ui-v13.js',
  finance:'assets/production-finance-ui-v13.js',
  security:'assets/production-security-ui-v13.js',
  index:'index.html',
  build:'scripts/build-demo.mjs'
};
const source=Object.fromEntries(Object.entries(files).map(([key,path])=>[key,readFileSync(path,'utf8')]));
const requireText=(text,needle,label=needle)=>{if(!text.includes(needle))throw new Error(`Missing v13 invariant: ${label}`);};
const forbidText=(text,needle,label=needle)=>{if(text.includes(needle))throw new Error(`Forbidden v13 pattern: ${label}`);};

for(const path of [files.gate,files.domain,files.student,files.finance,files.security])execFileSync(process.execPath,['--check',path],{stdio:'inherit'});

for(const marker of [
  "'./assets/production-domain-v13.js'",
  "'./assets/production-student-ui-v13.js'",
  "'./assets/production-finance-ui-v13.js'",
  "'./assets/production-security-ui-v13.js'",
  'window.EFC_DOMAIN_V13_READY',
  'window.EFC_CENTER_OPS_V13?.ready',
  'noStartupSplash:true'
])requireText(source.gate,marker);
for(const obsolete of ['production-center-ops-v11.js','production-center-ops-v11-fix1.js','production-center-ops-v12.js'])forbidText(source.gate,obsolete,`obsolete runtime ${obsolete}`);
forbidText(source.gate,'mountStartupShield','visible startup shield');
forbidText(source.gate,'جاري تجهيز النظام','startup progress page');
requireText(source.index,'<div id="app"></div>','empty startup root');
requireText(source.index,'class="efc-booting"','boot visibility guard');
forbidText(source.index,'جاري تشغيل مركز EFC','old visible startup text');

const v13Combined=source.domain+source.student+source.finance+source.security;
forbidText(v13Combined,'new MutationObserver(','v13 DOM observer');
forbidText(v13Combined,'window.open=function','v13 window.open interception');
forbidText(v13Combined,'saveStudents=function','legacy saveStudents reassignment');
forbidText(v13Combined,'saveSpecs=function','legacy saveSpecs reassignment');
requireText(source.domain,'function paymentTotal(student)','canonical payment sum');
requireText(source.domain,'function appendPayment(student','single transaction writer');
requireText(source.domain,'student.paid=paymentTotal(student)','paid amount reconciled from transactions');
requireText(source.student,'appendPayment(student,{amount:paidNow','registration uses transaction writer');
requireText(source.student,'appendPayment(student,{amount,method:','profile/payment modal uses transaction writer');
forbidText(source.student,'student.paid=Number(student.paid||0)+','manual paid accumulator');
requireText(source.student,'DEBT_IDLE_MS=450','debt-date typing debounce');
requireText(source.student,'paidTouched&&paid>0&&price>0&&paid<price','registration debt date only for real partial payment');
requireText(source.student,'.quick-days-v13[hidden]','quick duration hidden rule');
requireText(source.student,"typeEl.value==='quick'",'quick duration conditional');
requireText(source.student,"form.setAttribute('autocomplete','off')",'global form autocomplete disable');
requireText(source.finance,"pageTitle('الإدارة المالية','المالية'",'finance page title action');
requireText(source.finance,'financePrimaryActionV13','expense primary action slot');
requireText(source.finance,"section==='expenses'&&canEdit('finance')",'expense action only on expense page');
requireText(source.finance,'historicalExpenseMethodPreserved:true','historical expense method preservation');
requireText(source.finance,'certificateLedgerReceiptNavigation:true','certificate ledger receipt navigation');

const store=new Map();
const localStorage={getItem:key=>store.has(key)?store.get(key):null,setItem:(key,value)=>store.set(key,String(value)),removeItem:key=>store.delete(key)};
const students=[];
const specialties=[{id:'quick',name:'سريعة',courseType:'quick',billing:'one_time',durationUnit:'day',durationValue:35,quickDays:35},{id:'normal',name:'عادية',courseType:'normal',billing:'monthly',durationUnit:'month',durationValue:1}];
const methods=['نقداً','Bankily','Masrvi','السداد'];
const dateOnly=value=>new Date(`${value}T12:00:00`);
const pad=value=>String(value).padStart(2,'0');
const iso=date=>`${date.getFullYear()}-${pad(date.getMonth()+1)}-${pad(date.getDate())}`;
const addDuration=(start,value,unit)=>{const date=dateOnly(start);if(unit==='day')date.setDate(date.getDate()+Number(value));if(unit==='month'){const day=date.getDate();date.setDate(1);date.setMonth(date.getMonth()+Number(value));const last=new Date(date.getFullYear(),date.getMonth()+1,0).getDate();date.setDate(Math.min(day,last));}return iso(date);};
const context={
  console,Date,setTimeout,clearTimeout,structuredClone,crypto:webcrypto,TextEncoder,TextDecoder,Uint8Array,atob:globalThis.atob,btoa:globalThis.btoa,
  localStorage,students,specialties,methods,DEMO_TODAY:'2026-09-09',dateOnly,iso,addDuration,
  spec:id=>specialties.find(item=>item.id===id),branchName:id=>id,
  saveStudents:()=>localStorage.setItem('efc-students-v1',JSON.stringify(students)),saveSpecs:()=>localStorage.setItem('efc-specialties-v1',JSON.stringify(specialties)),
  remainingOf:student=>Math.max(0,Number(student.required||0)-Number(student.paid||0)),courseStatus:()=> 'نشطة',financialStatus:()=> 'لم يدفع',
  installmentPlanV3:()=>[],monthlyFocusV3:()=>null,dueNowV3:student=>Math.max(0,Number(student.required||0)-Number(student.paid||0)),suggestedPaymentV3:student=>Math.max(0,Number(student.required||0)-Number(student.paid||0)),allocV4:()=>({desc:'',before:0,after:0,months:[]}),
  receiptModelV4:(student,index)=>index===null?{amount:0,remaining:student.required}:{amount:Number(student.payments[index][1]),remaining:Math.max(0,student.required-Number(student.payments[index][1]))},
  window:{EFC_RECEIPT_SEQUENCES_V10:true,EFC_FORCE_PERSIST:async()=>({students,specialties,paymentMethods:methods}),EFC_APPLY_RESTORED_STATE:async()=>({}),EFC_CODES:{newTransactionCode:()=>`tx-${Date.now()}`,ensureStudentRecord:()=> 'record'}}
};
context.window.window=context.window;
vm.createContext(context);
vm.runInContext(source.domain,context,{filename:files.domain});
await context.window.EFC_DOMAIN_V13_READY;
const D=context.window.EFC_DOMAIN_V13;
if(!D?.ready)throw new Error('Domain v13 did not publish readiness.');

const quick={id:'q1',name:'Quick',branch:'main',specialty:'quick',reg:1,start:'2026-09-09',end:'2026-10-14',required:10000,paid:0,active:true,status:'active',debtDueDates:{},snapshot:{centerOpsV13:true,courseType:'quick',billing:'one_time',fee:10000,durationValue:35,durationUnit:'day'},payments:[]};
students.push(quick);
const qIndex=D.appendPayment(quick,{amount:10000,method:'Bankily',date:'2026-09-09',description:'دفعة تسجيل',persist:false});
if(qIndex!==0||quick.payments.length!==1)throw new Error('Quick registration payment was not stored as one transaction.');
if(quick.payments[0][2]!=='Bankily')throw new Error('Payment method was not stored on the transaction.');
if(D.paymentTotal(quick)!==10000||quick.paid!==10000||D.remainingAmount(quick)!==0)throw new Error('Quick full payment did not close the balance.');

const monthly={id:'m1',name:'Monthly',branch:'main',specialty:'normal',reg:2,start:'2026-09-09',end:'',required:600,paid:0,active:true,status:'active',debtDueDates:{},snapshot:{centerOpsV13:true,centerOpsMonthlyV13:true,dynamicMonthly:true,courseType:'normal',billing:'monthly',fee:600,durationValue:1,durationUnit:'month'},payments:[]};
students.push(monthly);
D.appendPayment(monthly,{amount:400,method:'نقداً',date:'2026-09-09',description:'جزئي',targetMonth:1,debtDueDate:'2026-09-15',persist:false});
if(D.remainingAmount(monthly)!==200||monthly.debtDueDates['1']!=='2026-09-15')throw new Error('Monthly partial payment/debt date is inconsistent.');
D.appendPayment(monthly,{amount:200,method:'Masrvi',date:'2026-09-09',description:'إكمال',targetMonth:1,persist:false});
if(D.paymentTotal(monthly)!==600||monthly.paid!==600||D.remainingAmount(monthly)!==0||monthly.debtDueDates['1'])throw new Error('Monthly balance did not close after the final current-date payment.');
const earlyPlan=D.installmentPlan(monthly,'2026-10-06');
if(earlyPlan.length!==2)throw new Error('Next monthly period was not opened three days before renewal.');

execFileSync(process.execPath,['scripts/build-demo.mjs'],{stdio:'inherit'});
for(const path of [files.gate,files.domain,files.student,files.finance,files.security]){
  const dist=`dist/${path}`;const text=readFileSync(dist,'utf8');execFileSync(process.execPath,['--check',dist],{stdio:'inherit'});if(path===files.gate)requireText(text,'production-domain-v13.js','v13 packaged gate');
}
forbidText(readFileSync(`dist/${files.gate}`,'utf8'),'production-center-ops-v12.js','v12 absent from packaged gate');
console.log('Runtime architecture and accounting v13 verification passed.');