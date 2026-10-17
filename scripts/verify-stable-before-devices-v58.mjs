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
const courses=[{id:'a'},{id:'b'},{id:'c',expenseEnabled:true},{id:'d',expenseEnabled:false}];
const expenseRows=[{id:'expense-old',specialty:'a',amount:200}];
let saves=0;
const courseFns=vm.runInNewContext(part(domain,'function hasCourseExpenses(courseId){','function targetRemaining(')+';({migrateCourseExpenseFlags,hasCourseExpenses,courseExpensesEnabled})',{
  specialties:courses,expenses:expenseRows,GENERAL_EXPENSE:'__expense_general__',
  saveSpecs:()=>{saves++;},persistExtrasSoon:()=>{}
});
assert.equal(courseFns.migrateCourseExpenseFlags(),true);
assert.deepEqual(courses.map(c=>c.expenseEnabled),[true,false,true,false]);
assert.equal(courseFns.courseExpensesEnabled('b'),false);
assert.equal(courseFns.courseExpensesEnabled('__expense_general__'),true);
assert.equal(saves,1);
assert.equal(courseFns.migrateCourseExpenseFlags(),false);
assert.equal(saves,1);
courses[0].expenseEnabled=false;
assert.equal(courseFns.migrateCourseExpenseFlags(),true,'Existing expenses cannot be orphaned');
assert.equal(courses[0].expenseEnabled,true);
assert.match(courseUi,/name="expenseEnabled"/);
assert.match(courseUi,/hasCourseExpenses/);
assert.match(finance,/specialties\.filter\(item=>D\.courseExpensesEnabled/);
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
  reconcileStudent:s=>{s.paid=s.payments.reduce((total,p)=>total+Number(p[1]||0),0);s.required=Number(s.snapshot.fee||0);},
  saveStudents:()=>{studentSaves++;}
};
const studentFns=vm.runInNewContext(part(studentsDomain,'function mayReactivateStudent(student){','\nstate=readLocal();')+';({mayReactivateStudent,reactivateStudent})',{
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
assert.match(loader,/archivedPaymentCodes/);
assert.match(loader,/filteredImport/);
assert.match(receipts,/enrollmentHistory/);
assert.match(studentsDomain,/cycles\.flatMap\(cycle/);
assert.match(bank,/وصل حساب البنك لمؤسسة EFC/);
assert.match(bank,/نوع الحركة:/);

console.log('Stable pre-devices v58: expense migration, financial history, reactivation, receipt numbers, and bank title verified.');
