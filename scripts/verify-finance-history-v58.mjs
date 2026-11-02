import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';

const source=readFileSync('assets/production-finance-ui-v13.js','utf8');
const esc=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const context={console,URL,Date,Set,Map,Intl,renderFinance:null,renderLedger:null,renderPaymentMethods:null,location:{href:'http://localhost/'},document:{createElement:()=>({}),head:{appendChild(){}}}};
context.window=context;
context.EFC_DOMAIN_V13={ready:true,esc,today:()=> '2026-11-15',cash:String,showDate:String,getExpenses:()=>[],getMethodRecords:()=>[],remainingAmount:s=>Math.max(0,Number(s.required||0)-(s.payments||[]).reduce((sum,p)=>sum+Number(p[1]||0),0))};
vm.createContext(context);
// Exercise the actual runtime helpers without adding test-only production exports.
vm.runInContext(source.replace('window.EFC_FINANCE_UI_V13=Object.freeze(',`window.financeTest={studentRegistrationDate,registrationIsSettled,incomeRegistrationPartition,incomePartitionCards,historyReportModel,historyReportAllowed,expenseReceiptHeader,monthBounds,yearBounds};window.EFC_FINANCE_UI_V13=Object.freeze(`),context);
const api=context.financeTest,partition=api.incomeRegistrationPartition;
const student=(id,date,extra={})=>({id,recordCode:`r-${id}`,registeredAt:date,start:date,required:100,payments:[[date,100]],...extra});
const newStudent=student('new','2026-11-01'),old=student('old','2026-10-31'),unpaid=student('unpaid','2026-11-15'),late=student('late','2026-12-01'),unknown={id:'unknown'};
const row=(student,amount,extra={})=>({student,amount,date:'2026-11-15',...extra});
const income=[row(newStudent,100),row(newStudent,50),row(old,80),row({...old},20),row({id:'certificate:1'},30,{sourceType:'certificate'}),row(late,12),row(unknown,8)];
const before=JSON.stringify({income,registered:[newStudent,unpaid]});
const result=partition(income,[newStudent,unpaid,{...unpaid}],{from:'2026-11-01',to:'2026-11-15'});
assert.deepEqual(JSON.parse(JSON.stringify(result)),{newIncome:150,earlierIncome:100,certificateIncome:30,unclassifiedIncome:20,newCount:2,earlierCount:1});
assert.equal(result.newIncome+result.earlierIncome+result.certificateIncome+result.unclassifiedIncome,income.reduce((sum,r)=>sum+r.amount,0));
assert.equal(JSON.stringify({income,registered:[newStudent,unpaid]}),before,'partition must never mutate source payments/student state');
assert.equal(api.studentRegistrationDate(student('explicit','2026-10-01',{registrationDate:'2026-11-01'})),'2026-10-01');
assert.equal(api.studentRegistrationDate({registrationDate:'2026-09-02',start:'2026-11-01'}),'2026-11-01','unpaid registrations follow start, never stale creation metadata');
assert.equal(api.studentRegistrationDate({id:`student-${Date.parse('2026-10-05T12:00:00Z').toString(36)}-uuid`,start:'2026-11-01'}),'2026-11-01','native id creation timestamp never decides the financial registration month');
assert.equal(api.studentRegistrationDate({id:'legacy',start:'2026-08-02'}),'2026-08-02','legacy course start remains the final fallback');
const corrected=student('existing','2026-11-02',{start:'2026-11-05',payments:[['2026-10-25',100],['2026-11-10',20]]});
assert.equal(api.studentRegistrationDate(corrected),'2026-10-25','existing records automatically use the original payment, ignoring creation/start dates');
corrected.payments[0][0]='2026-11-02';assert.equal(api.studentRegistrationDate(corrected),'2026-11-02','editing the registration receipt moves the financial registration month');
corrected.payments[1][0]='2026-09-01';assert.equal(api.studentRegistrationDate(corrected),'2026-11-02','a later backdated collection must not replace the original registration payment');
assert.equal(api.studentRegistrationDate({start:'2026-08-02',payments:[['2026-07-01',0],['2026-07-02',-10],['2026-09-02',100]]}),'2026-09-02','non-payments never define a registration');
assert.equal(api.studentRegistrationDate({start:'2026-08-02',payments:[['',100]]}),'2026-08-02','missing source payment date matches canonical allPayments start fallback');
assert.equal(api.studentRegistrationDate({registeredAt:'2026-11-01',registrationDate:'2026-11-01',start:'2026-10-25',payments:[['2026-10-25',100]]}),'2026-10-25','both stale registration metadata fields are ignored');
assert.equal(api.studentRegistrationDate({payments:[]}), '','missing dates remain unknown instead of being fabricated');
for(const created of ['2020-01-01T12:00:00Z','2026-12-01T12:00:00Z'])assert.equal(api.studentRegistrationDate({id:`student-${Date.parse(created).toString(36)}-uuid`,payments:[['2026-10-25',100]]}),'2026-10-25','creation time and future-clock cutoffs cannot change financial registration dates');
const existing=student('pre-update','2026-11-02',{start:'2026-10-25',required:500,payments:[['2026-10-25',300],['2026-11-10',200]]});
function periodPartition(s,range){
  const rows=s.payments.map(p=>row(s,p[1],{date:p[0]})).filter(r=>r.date>=range.from&&r.date<=range.to);
  const date=api.studentRegistrationDate(s),registered=date>=range.from&&date<=range.to?[s]:[];
  const result=partition(rows,registered,range);
  assert.equal(result.newIncome+result.earlierIncome+result.certificateIncome+result.unclassifiedIncome,rows.reduce((sum,r)=>sum+r.amount,0),'date corrections preserve the canonical filtered aggregate');
  return JSON.parse(JSON.stringify(result));
}
const oct={from:'2026-10-01',to:'2026-10-31'},nov={from:'2026-11-01',to:'2026-11-15'};
assert.deepEqual(periodPartition(existing,oct),{newIncome:300,earlierIncome:0,certificateIncome:0,unclassifiedIncome:0,newCount:1,earlierCount:0});
assert.deepEqual(periodPartition(existing,nov),{newIncome:0,earlierIncome:200,certificateIncome:0,unclassifiedIncome:0,newCount:0,earlierCount:1});
existing.payments[0][0]='2026-11-02';assert.equal(periodPartition(existing,oct).newCount,0);assert.equal(periodPartition(existing,nov).newCount,1);assert.equal(periodPartition(existing,nov).newIncome,500);assert.equal(periodPartition(existing,nov).earlierCount,0);
existing.start='2026-09-01';assert.equal(periodPartition(existing,nov).newCount,1,'course-start edits no longer change a paid financial registration');
existing.payments[0][0]='2026-10-25';assert.equal(periodPartition(existing,oct).newCount,1);assert.equal(periodPartition(existing,nov).earlierIncome,200,'source date correction works in both directions');
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
const partial=student('partial','2026-10-01',{required:200,payments:[['2026-10-01',10],['2026-11-15',50]]}),future=student('future','2026-10-01',{payments:[['2026-10-01',10],['2026-11-15',10],['2026-11-16',80]]});
const scoped={from:'2026-11-01',to:'2026-11-15'},paymentRows=[row(old,80),row({...old},20),row(partial,50),row(future,20)];
assert.equal(partition(paymentRows,[],scoped).earlierCount,1,'only distinct fully settled earlier students count; partial and future settlement do not');
assert.equal(partition(paymentRows,[],scoped).earlierIncome,170,'partial amounts still remain in canonical income');
assert.equal(partition([row(old,0),row(old,-5)],[],scoped).earlierCount,0,'zero or negative rows cannot make a paying student');
assert.equal(partition(paymentRows,[],{...scoped,to:'2026-11-16'}).earlierCount,2,'a later settlement becomes eligible only when the selected period reaches it');
const originalFuture=JSON.stringify(future);api.registrationIsSettled(future,'2026-11-15');assert.equal(JSON.stringify(future),originalFuture,'settlement lookup is read-only');
const cards=api.incomePartitionCards(250,{newIncome:150,earlierIncome:100,certificateIncome:0,unclassifiedIncome:0,newCount:7,earlierCount:3},'نوفمبر');
assert.equal((cards.match(/data-student-part="new"/g)||[]).length,1,'new registration number has one row');
assert(cards.indexOf('data-income-part="new"')<cards.indexOf('data-income-part="earlier"')&&cards.indexOf('data-income-part="earlier"')<cards.indexOf('data-income-part="total"'),'income order is new, earlier, then aggregate');
context.branchName=id=>id||'كل الفروع';context.spec=()=>({name:'دورة'});
context.EFC_RECEIPT_LOGO_DATA_URI='data:image/jpeg;base64,logo';
const range={from:'2026-11-01',to:'2026-11-30',effectiveTo:'2026-11-15',label:'نوفمبر 2026'};
const sample=[{student:{name:'<script>alert(1)</script>',branch:'a',specialty:'x'},receipt:'12',date:'2026-11-12',amount:90,sourceType:'certificate',description:'رسوم شهادة'}];
const model=api.historyReportModel('income',sample,range,'الفرع الأول','دورة');
sample[0].amount=999;sample[0].student.name='changed';range.from='2020-01-01';
assert.equal(model.total,90);assert.equal(model.rows[0][3],'<script>alert(1)</script>');assert.equal(model.range.from,'2026-11-01');
assert.equal(model.columns.length,9);assert.equal(model.rows[0].length,9);
assert(Number.isFinite(Date.parse(model.generatedAt)),'report captures a real extraction timestamp');
assert(/^\d{4}-\d{2}-\d{2}$/.test(model.generatedDate));assert(/^\d{2}:\d{2}:\d{2}$/.test(model.generatedTime));
const generatedAt=model.generatedAt;context.Date=class extends Date{constructor(...args){super(...(args.length?args:['2030-01-01T01:02:03Z']));}};assert.equal(model.generatedAt,generatedAt,'existing report time remains a snapshot');
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
