import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';

const source=readFileSync('assets/production-finance-ui-v13.js','utf8');
const esc=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const context={console,URL,Date,Set,Map,Intl,renderFinance:null,renderLedger:null,renderPaymentMethods:null,location:{href:'http://localhost/'},document:{createElement:()=>({}),head:{appendChild(){}}}};
context.window=context;
context.EFC_DOMAIN_V13={ready:true,esc,today:()=> '2026-11-15',cash:String,showDate:String,getExpenses:()=>[],getMethodRecords:()=>[]};
vm.createContext(context);
// Exercise the actual runtime helpers without adding test-only production exports.
vm.runInContext(source.replace('window.EFC_FINANCE_UI_V13=Object.freeze(',`window.financeTest={studentRegistrationDate,incomeRegistrationPartition,incomePartitionCards,historyReportModel,historyReportAllowed,expenseReceiptHeader,monthBounds,yearBounds};window.EFC_FINANCE_UI_V13=Object.freeze(`),context);
const api=context.financeTest,partition=api.incomeRegistrationPartition;
const student=(id,date,extra={})=>({id,recordCode:`r-${id}`,registeredAt:date,start:'2020-01-01',...extra});
const newStudent=student('new','2026-11-01'),old=student('old','2026-10-31'),unpaid=student('unpaid','2026-11-15'),late=student('late','2026-12-01'),unknown={id:'unknown'};
const row=(student,amount,extra={})=>({student,amount,date:'2026-11-15',...extra});
const income=[row(newStudent,100),row(newStudent,50),row(old,80),row({...old},20),row({id:'certificate:1'},30,{sourceType:'certificate'}),row(late,12),row(unknown,8)];
const before=JSON.stringify({income,registered:[newStudent,unpaid]});
const result=partition(income,[newStudent,unpaid,{...unpaid}],{from:'2026-11-01',to:'2026-11-15'});
assert.deepEqual(JSON.parse(JSON.stringify(result)),{newIncome:150,earlierIncome:100,certificateIncome:30,unclassifiedIncome:20,newCount:2,earlierCount:1});
assert.equal(result.newIncome+result.earlierIncome+result.certificateIncome+result.unclassifiedIncome,income.reduce((sum,r)=>sum+r.amount,0));
assert.equal(JSON.stringify({income,registered:[newStudent,unpaid]}),before,'partition must never mutate source payments/student state');
assert.equal(api.studentRegistrationDate(student('explicit','2026-10-01',{registrationDate:'2026-11-01'})),'2026-10-01');
assert.equal(api.studentRegistrationDate({registrationDate:'2026-09-02',start:'2026-11-01'}),'2026-09-02');
assert.equal(api.studentRegistrationDate({id:`student-${Date.parse('2026-10-05T12:00:00Z').toString(36)}-uuid`,start:'2026-11-01'}),'2026-10-05','original id timestamp precedes editable course start');
assert.equal(api.studentRegistrationDate({id:'legacy',start:'2026-08-02'}),'2026-08-02','legacy course start remains the final fallback');
for(const range of [{from:'2026-11-15',to:'2026-11-15'},api.monthBounds(2026,11),api.yearBounds(2026),{from:'2026-10-31',to:'2026-11-15'}]){
  for(const branch of ['', 'a', 'b'])for(const specialty of ['', 'x', 'y']){
    const fixtures=[newStudent,old,unpaid].map((s,i)=>({...s,branch:i===1?'b':'a',specialty:i===1?'y':'x'}));
    // Filter fixtures, then test the presentation contract on any canonical slice.
    const matches=s=>(!branch||s.branch===branch)&&(!specialty||s.specialty===specialty);
    const selected=fixtures.flatMap(s=>[row(s,23),row(s,17)]).filter(r=>r.date>=range.from&&r.date<=range.to&&matches(r.student));
    const registered=fixtures.filter(s=>matches(s)&&s.registeredAt>=range.from&&s.registeredAt<=range.to);
    const p=partition(selected,registered,range);
    assert.equal(p.newIncome+p.earlierIncome+p.certificateIncome+p.unclassifiedIncome,selected.length*20);
    assert.equal(p.newCount,new Set(registered.map(s=>s.recordCode)).size);
    assert.equal(p.earlierCount,new Set(selected.filter(r=>r.student.registeredAt<range.from).map(r=>r.student.recordCode)).size);
  }
}
assert.equal(partition([],[],{from:'2026-11-01',to:'2026-11-15'}).newCount,0);
assert.equal(partition([row(newStudent,0),row(newStudent,-5)], [newStudent],{from:'2026-11-01',to:'2026-11-15'}).newIncome,-5,'partition must preserve canonical signed/zero amounts');
context.branchName=id=>id||'كل الفروع';context.spec=()=>({name:'دورة'});
context.EFC_RECEIPT_LOGO_DATA_URI='data:image/jpeg;base64,logo';
const range={from:'2026-11-01',to:'2026-11-30',effectiveTo:'2026-11-15',label:'نوفمبر 2026'};
const sample=[{student:{name:'<script>alert(1)</script>',branch:'a',specialty:'x'},receipt:'12',date:'2026-11-12',amount:90,sourceType:'certificate',description:'رسوم شهادة'}];
const model=api.historyReportModel('income',sample,range,'الفرع الأول','دورة');
sample[0].amount=999;sample[0].student.name='changed';range.from='2020-01-01';
assert.equal(model.total,90);assert.equal(model.rows[0][3],'<script>alert(1)</script>');assert.equal(model.range.from,'2026-11-01');
assert.equal(model.columns.length,9);assert.equal(model.rows[0].length,9);
assert(!model.columns.includes('الإجراءات'),'read-only report must omit source mutation controls');
assert(api.expenseReceiptHeader(null,'سجل المداخيل').includes('Centre EFC'));
assert(!api.expenseReceiptHeader(null,'سجل المداخيل').includes('Pièce N°'),'report header must not impersonate a numbered source receipt');
assert.equal(api.historyReportAllowed(model.range),true);
context.EFC_FISCAL_V14={lockedThrough:()=> '2026-11-10'};
assert.equal(api.historyReportAllowed(model.range),false,'fiscal fallback blocks mixed ranges');
context.EFC_ACCOUNTING_INTEGRITY_V21={rangeState:()=>({status:'closed'})};
assert.equal(api.historyReportAllowed(model.range),false);
context.EFC_ACCOUNTING_INTEGRITY_V21={rangeState:()=>({status:'mixed'})};
assert.equal(api.historyReportAllowed(model.range),false);
context.EFC_ACCOUNTING_INTEGRITY_V21={rangeState:()=>({status:'open'})};
assert.equal(api.historyReportAllowed(model.range),true);
for(const name of ['Income','Expense']){
  const block=source.slice(source.indexOf(`function render${name}History(){`),source.indexOf('\n}',source.indexOf(`function render${name}History(){`)));
  assert(block.includes('exportButton.onclick=()=>openHistoryReport(historyReportModel('));
  assert(!block.includes('incomePartitionCards'),'history must not acquire dashboard partitions');
}
assert(source.includes('save_receipt_pdf'),'reuse licensed native PDF save facility');
assert(source.includes('oldestAvailableDate:financeOldestAvailableDate'),'archive guard resolves the same blank range as finance');
console.log('Finance history v58: partition, identity, source immutability, filter matrices, report snapshots, branded header and closed/mixed fiscal export guards passed.');
