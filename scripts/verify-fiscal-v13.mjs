import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';

const source=readFileSync('assets/production-fiscal-year-v13.js','utf8');
for(const forbidden of ['new MutationObserver(','window.open=','production-center-ops-v11','production-center-ops-v12'])assert.equal(source.includes(forbidden),false,`forbidden legacy runtime pattern: ${forbidden}`);
for(const required of ['firstArchiveIncludesAllPriorHistory:true','annualAutomaticBoundaries:true','activeStudentsNeverPurged:true','unpaidInactiveStudentsNeverPurged:true','pendingCloseJournal:true','certificatePiiPurgedAfterClose:true'])assert.equal(source.includes(required),true,`missing fiscal contract: ${required}`);

let currentDate='2026-09-09';
const store=new Map();
store.set('efc-fiscal-state-v13',JSON.stringify({version:13,config:{anchorDate:'2025-09-09',configuredAt:'2025-09-09',configuredBy:'Admin'},archives:[],pendingClose:null,updatedAt:1}));
store.set('efc-certificate-state-v1',JSON.stringify({certificateBranches:[{id:'c1',name:'مركز شهادات أ'}],certificateReceipts:[
  {id:'cert-old',recordCode:'cr-old',transactionCode:'ctx-old',receiptNo:1,studentName:'قديم',branchName:'مركز شهادات أ',specialtyName:'فرنسية',amount:300,method:'نقداً',date:'2025-08-01',time:'10:00'},
  {id:'cert-new',recordCode:'cr-new',transactionCode:'ctx-new',receiptNo:2,studentName:'جديد',branchName:'مركز شهادات أ',specialtyName:'فرنسية',amount:400,method:'Bankily',date:'2026-10-01',time:'10:00'}
]}));

const students=[
  {id:'active-cross',name:'طالب مستمر',active:true,status:'active',start:'2025-10-01',required:1200,paid:600,payments:[['2025-10-01',300,'نقداً'],['2026-09-10',300,'Bankily']]},
  {id:'inactive-settled',name:'منتهي مسدد',active:false,status:'inactive',start:'2024-01-01',stoppedAt:'2026-05-01',required:500,paid:500,payments:[['2024-01-01',500,'نقداً']]},
  {id:'inactive-debt',name:'منتهي عليه دين',active:false,status:'inactive',start:'2024-02-01',stoppedAt:'2026-05-02',required:500,paid:200,payments:[['2024-02-01',200,'نقداً']]}
];
let expenses=[
  {id:'e-old',name:'إيجار',amount:100,method:'نقداً',branch:'main',specialty:'__expense_general__',date:'2025-07-01',time:'09:00'},
  {id:'e-new',name:'كهرباء',amount:50,method:'Bankily',branch:'main',specialty:'__expense_general__',date:'2026-10-02',time:'09:00'}
];
const paymentRows=()=>students.flatMap(student=>(student.payments||[]).map((payment,index)=>({student,date:payment[0],amount:Number(payment[1]),method:payment[2],paymentIndex:index,sourceType:'student'})));
const localStorage={getItem:key=>store.has(key)?store.get(key):null,setItem:(key,value)=>store.set(key,String(value)),removeItem:key=>store.delete(key)};
const document={head:{appendChild(){}},createElement(){return{style:{},appendChild(){},remove(){},addEventListener(){},prepend(){}};},querySelector(){return null;}};
const context={
  console,structuredClone,JSON,Date,Math,Intl,Promise,setTimeout,clearTimeout,localStorage,document,location:{hash:'#register',href:'http://localhost/'},confirm:()=>true,alert(){},
  students,specialties:[{id:'sp1',name:'فرنسية'}],methods:['نقداً','Bankily'],
  branchName:id=>id==='main'?'الفرع الرئيسي':String(id),spec:id=>id==='sp1'?{name:'فرنسية'}:null,
  allPayments:paymentRows,
};
context.window=context;
context.window.addEventListener=()=>{};
context.window.EFC_SECURITY_UI_V13={ready:true};
context.window.EFC_CERTIFICATES_V13={ready:true};
context.window.EFC_AUTH_V13={currentUser:()=>({username:'Admin',role:'admin'})};
context.window.EFC_FORCE_PERSIST=async()=>({students:structuredClone(students),specialties:[],paymentMethods:['نقداً','Bankily']});
context.window.EFC_APPLY_RESTORED_STATE=async()=>({});
context.window.EFC_DOMAIN_V13={
  ready:true,esc:value=>String(value??''),today:()=>currentDate,cash:value=>`${Number(value||0)}`,showDate:value=>String(value||''),
  isInactive:s=>s?.active===false||s?.status==='inactive',remainingAmount:s=>Math.max(0,Number(s.required||0)-(s.payments||[]).reduce((sum,p)=>sum+Number(p?.[1]||0),0)),expenseSpecialtyName:v=>v==='__expense_general__'?'مصروف عام':String(v||'—'),
  getExpenses:()=>expenses,saveExpenses:next=>{expenses=next;},saveStudents:()=>{},
};
vm.createContext(context);
vm.runInContext(source,context,{filename:'production-fiscal-year-v13.js'});
await new Promise(resolve=>setTimeout(resolve,0));
const F=context.window.EFC_FISCAL_V13;
assert.equal(F?.ready,true);
let plan=F.nextPlan();
assert.deepEqual(JSON.parse(JSON.stringify(plan)),{number:1,boundary:'2026-09-09',periodStart:null,periodEnd:'2026-09-08',first:true,due:true});
let preview=await F.previewArchive();
assert.equal(preview.totals.studentIncome,1000,'first fiscal archive must include all older student payments');
assert.equal(preview.totals.certificateIncome,300,'first fiscal archive must include old certificate income');
assert.equal(preview.totals.expenses,100,'first fiscal archive must include old expense');
assert.equal(preview.totals.income,1300);
assert.equal(preview.certificateCenters[0].center,'مركز شهادات أ');
assert.equal(preview.expensePurposes[0].name,'إيجار');
assert.deepEqual(F.eligibleStudentIds(plan),['inactive-settled'],'inactive student with debt must not be eligible');

const first=await F.closeCurrentYear();
assert.equal(first.number,1);
assert.equal(students.some(s=>s.id==='active-cross'),true,'active cross-year student must remain');
assert.equal(students.find(s=>s.id==='active-cross').payments.length,2,'active student full payment history must remain');
assert.equal(students.some(s=>s.id==='inactive-settled'),false,'settled inactive student should be purged after containing fiscal year closes');
assert.equal(students.some(s=>s.id==='inactive-debt'),true,'inactive debtor must remain payable');
assert.deepEqual(expenses.map(x=>x.id),['e-new'],'closed-period detailed expenses must be compacted');
const certAfter=JSON.parse(store.get('efc-certificate-state-v1'));
assert.deepEqual(certAfter.certificateReceipts.map(x=>x.id),['cert-new'],'closed-period certificate PII rows must be purged');

currentDate='2027-09-09';
plan=F.nextPlan();
assert.equal(plan.number,2);
assert.equal(plan.periodStart,'2026-09-09');
assert.equal(plan.periodEnd,'2027-09-08');
preview=await F.previewArchive();
assert.equal(preview.totals.studentIncome,300,'second fiscal year must not recount active student payment from first archive');
assert.equal(preview.totals.certificateIncome,400);
assert.equal(preview.totals.expenses,50);
const saved=F.getState();
assert.equal(saved.archives.length,1);
assert.equal(saved.archives[0].totals.studentIncome,1000);
assert.equal(saved.archives[0].cleanup.studentsDeleted,1);
assert.equal(saved.pendingClose,null);

console.log('Fiscal v13 verification passed: first-history archive, annual isolation, active-student retention, debtor retention, expense compaction, certificate PII purge.');
