import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const read=path=>fs.readFileSync(path,'utf8');
const domain=read('assets/production-domain-v13.js');
const studentsDomain=read('assets/production-student-lifecycle-domain-v20.js');
const foundation=read('assets/production-foundation-v13.js');
const bank=read('assets/production-bank-v22.js');
const finance=read('assets/production-finance-ui-v13.js');
const loader=read('production-loader.js');
const courseUi=read('assets/production-student-ui-v13.js');
const receipts=read('assets/production-receipt-sequences-v10.js');

for(const file of [
  'assets/production-domain-v13.js','assets/production-student-lifecycle-domain-v20.js',
  'assets/production-student-lifecycle-ui-v20.js','assets/production-foundation-v13.js',
  'assets/production-bank-v22.js','assets/production-finance-ui-v13.js',
  'assets/production-student-ui-v13.js','assets/production-courses-centers-redesign-v23.js',
  'assets/production-receipt-sequences-v10.js','production-loader.js'
]) new vm.Script(read(file),{filename:file});

assert.ok(!fs.existsSync('assets/production-devices-v57.js'),'Stable branch must not contain device scheduling feature');
assert.ok(!read('src-tauri/src/license.rs').includes('LICENSE_KEY_ID_V4'),'Stable branch must preserve v3-only activation');

const part=(source,start,end)=>{const a=source.indexOf(start),b=source.indexOf(end,a+start.length);assert.ok(a>=0&&b>a,'Cannot extract '+start);return source.slice(a,b);};
// The temporary expense opt-in feature was withdrawn: all courses stay eligible.
assert.doesNotMatch(domain,/migrateCourseExpenseFlags|courseExpensesEnabled|hasCourseExpenses/);
assert.doesNotMatch(courseUi,/name="expenseEnabled"/);
const courseCards=read('assets/production-courses-centers-redesign-v23.js');
assert.doesNotMatch(courseCards,/efc-course-expense-badge-v58|expenseEnabled/);
const expenseEditor=part(finance,'function openExpenseEditor(','\nfunction renderLedgerBaseV13(');
assert.match(expenseEditor,/specialties\.map\(item=>/);
assert.doesNotMatch(expenseEditor,/courseExpensesEnabled|غير مفعلة للمصاريف/);
const expenseOps=vm.runInNewContext(part(domain,'function saveExpenses(next){','function saveMethodRecords(')+';({saveExpenses,getExpenses:()=>expenses})',{
  expenses:[],normalizeExpenses:()=>{},repairExpenseReceiptSequence:()=>{},
  markExtrasChanged:()=>{},persistExtrasSoon:()=>{}
});
expenseOps.saveExpenses([
  {id:'one',specialty:'normal-french',amount:300},
  {id:'two',specialty:'quick-french',amount:100},
  {id:'general',specialty:'__expense_general__',amount:50}
]);
assert.equal(expenseOps.getExpenses().length,3,'Expense entry must accept every course and general expenses');
assert.match(finance,/row\.archivedEnrollment/);

const addDays=(date,number)=>{const d=new Date(date+'T12:00:00Z');d.setUTCDate(d.getUTCDate()+number);return d.toISOString().slice(0,10);};
const student={id:'student-1',recordCode:'reg-1',reg:7,name:'Student',branch:'main',specialty:'a',
  start:'2026-04-01',end:'2026-05-05',stoppedAt:'2026-06-01',
  status:'inactive',active:false,required:300,paid:300,
  snapshot:{centerOpsV13:true,fee:300,billing:'one_time',durationUnit:'day',durationValue:35},
  payments:[['2026-04-01',300,'نقداً','10:00',123456,'', 'tx-first',null,104]]
};
let studentSaves=0;
const B={isInactive:s=>s.active===false||s.status==='inactive',remainingAmount:s=>Math.max(0,s.required-s.paid),
  cash:val=>String(val),today:()=> '2026-10-17',addDays,
  isDynamicMonthly:()=>false,
  appendPayment:(cycle,{amount,method,date,description})=>{
    const index=cycle.payments.length;
    cycle.payments.push([date,amount,method,'10:00',2000000000,description,'tx-debt-'+index,null,null]);
    B.reconcileStudent(cycle);
    return index;
  },
  reconcileStudent:s=>{s.paid=s.payments.reduce((total,p)=>total+Number(p[1]||0),0);s.required=Number(s.snapshot.fee||0);},
  saveStudents:()=>{studentSaves++;}
};
const studentFns=vm.runInNewContext(part(studentsDomain,'function cycleRemainingDebt(cycle){','\nstate=readLocal();')+';({mayReactivateStudent,reactivateStudent,cycleRemainingDebt,historicalDebtRemaining,payHistoricalDebt,validReactivationStart})',{
  B,students:[student],clone:value=>JSON.parse(JSON.stringify(value)),now:()=>20261017001,
  spec:()=>({durationValue:35,durationUnit:'day'}),window:{addDuration:date=>date},Date,Math
});
assert.equal(studentFns.mayReactivateStudent(student),true);
studentFns.reactivateStudent(student,'2026-10-10');
assert.equal(student.active,true);
assert.equal(student.start,'2026-10-10');
assert.equal(student.end,'2026-11-13');
assert.equal(student.recordCode,'reg-1');
assert.equal(student.reg,7);
assert.equal(student.payments.length,0);
assert.equal(student.enrollmentHistory.length,1);
assert.equal(student.enrollmentHistory[0].payments[0][6],'tx-first');
assert.equal(student.enrollmentHistory[0].payments[0][8],104);
assert.equal(studentSaves,1);
assert.throws(()=>studentFns.reactivateStudent(student,'2026-10-11'),/موقوف|انتهت/);
const allPayments=vm.runInNewContext(part(foundation,'window.allPayments=()=>','\nwindow.EFC_SYNC_BRAND_V13=')+';window.allPayments',{
  students:[student],window:{},String,Number
});
let payments=allPayments();
assert.equal(payments.length,1);
assert.equal(payments[0].archivedEnrollment,true);
assert.equal(payments[0].student.start,'2026-04-01');
student.payments.push(['2026-10-11',300,'نقداً','11:00',111111,'', 'tx-second',null,105]);
payments=allPayments();
assert.equal(payments.length,2);
assert.equal(payments.filter(row=>row.archivedEnrollment).length,1);
assert.equal(payments.reduce((sum,row)=>sum+row.amount,0),600,'Historical income cannot disappear');
// A past-period debt is an outstanding liability, not income until a real payment occurs.
const oldDebtStudent=()=>({
 id:'student-2',recordCode:'reg-2',reg:22,name:'Debtor',branch:'main',specialty:'a',
 start:'2026-04-01',end:'2026-05-05',stoppedAt:'2026-06-01',active:false,status:'inactive',
 required:500,paid:200,snapshot:{centerOpsV13:true,fee:500,billing:'one_time',durationUnit:'day',durationValue:35},
 payments:[['2026-04-01',200,'نقداً','10:00',11111,'first payment','tx-orig']]
});
function debtorTest(action,date='2026-10-20',additional={}){
 const debtor=oldDebtStudent(),sampleB={...B};
 const scoped=vm.runInNewContext(part(studentsDomain,'function cycleRemainingDebt(cycle){','\nstate=readLocal();')
   +';({reactivateStudent,cycleRemainingDebt,historicalDebtRemaining,payHistoricalDebt})',{
   B:sampleB,students:[debtor],clone:value=>JSON.parse(JSON.stringify(value)),now:()=>20261017001,
   spec:()=>({durationValue:35,durationUnit:'day'}),window:{addDuration:date=>date},Date,Math
 });
 scoped.reactivateStudent(debtor,date,{debtAction:action,...additional});
 return{debtor,scoped};
}
const carried=debtorTest('keep');
assert.equal(carried.debtor.status,'scheduled','Tomorrow/future study date must be allowed');
assert.equal(carried.debtor.start,'2026-10-20');
assert.equal(carried.debtor.enrollmentHistory.length,1);
assert.equal(carried.scoped.historicalDebtRemaining(carried.debtor),300);
assert.equal(carried.debtor.payments.length,0,'Carry must not record fictional income');
carried.scoped.payHistoricalDebt(carried.debtor,carried.debtor.enrollmentHistory[0].archivedCycleId,
 {amount:100,method:'نقداً',date:'2026-10-17'});
assert.equal(carried.scoped.historicalDebtRemaining(carried.debtor),200);
assert.equal(carried.debtor.enrollmentHistory[0].payments.at(-1)[1],100);
assert.equal(carried.debtor.enrollmentHistory[0].payments.at(-1)[12].specialty,'a');
assert.equal(carried.debtor.payments.length,0,'Paying prior dues must not pay current study');
const waived=debtorTest('waive','2026-10-20',{waiverReason:'إعفاء بقرار المدير'});
assert.equal(waived.scoped.historicalDebtRemaining(waived.debtor),0);
assert.equal(waived.debtor.enrollmentHistory[0].debtWaiver.amount,300);
assert.equal(waived.debtor.enrollmentHistory[0].payments.length,1,'Waiver must not become income');
const settled=debtorTest('pay','2026-10-20',{paymentMethod:'نقداً',paymentDate:'2026-10-17'});
assert.equal(settled.scoped.historicalDebtRemaining(settled.debtor),0);
assert.equal(settled.debtor.enrollmentHistory[0].payments.length,2,'Actual settlement must add a real receipt');
assert.equal(settled.debtor.enrollmentHistory[0].payments[1][1],300);
assert.equal(settled.debtor.payments.length,0);
const lifecycleUi=read('assets/production-student-lifecycle-ui-v20.js');
assert.doesNotMatch(lifecycleUi,/max="\$\{D\.today\(\)\}" required><\/label>/,'Study start date must have no today maximum');
assert.match(lifecycleUi,/min="\$\{minDate\}"/);
assert.match(lifecycleUi,/name="debtAction"/);
assert.match(lifecycleUi,/name="paymentDate"/);
assert.match(lifecycleUi,/name="waiverReason"/);
assert.match(lifecycleUi,/openPastDebtPayment/);
assert.match(finance,/D\.cycleRemainingDebt/);
assert.match(read('assets/production-fiscal-year-v14.js'),/historicalDebtRemaining/);

assert.match(loader,/archivedPaymentCodes/);
assert.match(loader,/filteredImport/);
assert.match(receipts,/enrollmentHistory/);
assert.match(studentsDomain,/cycles\.flatMap\(cycle/);
assert.match(bank,/وصل حساب البنك لمؤسسة EFC/);
assert.match(bank,/نوع الحركة:/);
const bankReceipt=vm.runInNewContext(part(bank,'function receiptBody(entry){','function receiptDocument(')+';receiptBody',{
  receiptHeader:()=>'',cash:value=>String(value),showDate:value=>String(value),esc:value=>String(value)
});
const bankCss=vm.runInNewContext(part(bank,'function receiptCss(){','function receiptHeader(')+';receiptCss()',{});
const sample={date:'2026-10-17',time:'12:00',amount:1500,statement:'test transaction'};
const incoming=bankReceipt({...sample,type:'in'});
const outgoing=bankReceipt({...sample,type:'out'});
assert.match(incoming,/bank-amount-v22 in/);
assert.match(incoming,/bank-operation-v58 in/);
assert.match(incoming,/نوع الحركة: <b>دخل<\/b>/);
assert.match(outgoing,/bank-amount-v22 out/);
assert.match(outgoing,/bank-operation-v58 out/);
assert.match(outgoing,/صرف \/ سحب/);
assert.match(bankCss,/\.bank-amount-v22\.in \.bank-track-v22 b\{color:#087344\}/);
assert.match(bankCss,/\.bank-amount-v22\.out \.bank-track-v22 b\{color:#b4232c\}/);
assert.match(bank,/stage\.innerHTML=`<style>\$\{receiptCss\(\)\}<\/style>/);

console.log('Stable EFC v58: unrestricted course expenses, enrollment history/reactivation and color-coded bank receipts verified.');
