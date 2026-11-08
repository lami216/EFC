import fs from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';

const domain=fs.readFileSync('assets/production-domain-v13.js','utf8');
const finance=fs.readFileSync('assets/production-finance-ui-v13.js','utf8');
const general='__expense_general__';
const expense=(id,date,branch,specialty,amount)=>({id,date,branch,specialty,amount,name:`Expense ${id}`,time:'12:00',method:id==='ay'?'bank':'cash',receiptNo:id.length+1});
const rows=[
  expense('ax','2026-11-01','a','x',100),expense('ay','2026-11-02','a','y',200),expense('ag','2026-11-03','a',general,300),
  expense('bx','2026-11-04','b','x',400),expense('by','2026-11-05','b','y',500),expense('bg','2026-11-06','b',general,600),
  expense('prior-course','2026-10-31','a','x',700),expense('prior-general','2026-10-31','a',general,800),
  expense('future-course','2026-11-16','a','x',900),expense('future-general','2026-11-16','a',general,1000),expense('today','2026-11-15','a','x',1100)
];
const esc=value=>String(value??'').replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
const context={console,URL,Date,Set,Map,Intl,location:{href:'http://localhost/'},renderFinance:null,renderLedger:null,renderPaymentMethods:null,branchName:id=>id,spec:id=>({name:id}),document:{createElement:()=>({}),head:{appendChild(){}}}};
context.window=context;
vm.createContext(context);
const predicate=domain.slice(domain.indexOf('function expenseMatches('),domain.indexOf('function allocateExpenseReceiptNumber('));
vm.runInContext(predicate,context);
context.EFC_DOMAIN_V13={ready:true,GENERAL_EXPENSE:general,esc,today:()=> '2026-11-15',cash:String,showDate:String,getExpenses:()=>rows,getMethodRecords:()=>[],expenseMatches:context.expenseMatches,expenseSpecialtyName:value=>value===general?'مصروف عام':value,expenseReceiptNumberOf:row=>row.receiptNo};
vm.runInContext(finance.replace('window.EFC_FINANCE_UI_V13=Object.freeze(', 'window.expenseTest={historyReportModel,expensePartitionCard,monthBounds,yearBounds};window.EFC_FINANCE_UI_V13=Object.freeze('),context);
const {historyReportModel,expensePartitionCard,monthBounds,yearBounds}=context.expenseTest;
const monthly={from:'2026-11-01',to:'2026-11-15'};
const cases=[
  [{},['ax','ay','ag','bx','by','bg','today']],
  [{branch:'a'},['ax','ay','ag','today']],
  [{branch:'b'},['bx','by','bg']],
  [{specialty:'x'},['ax','bx','today']],
  [{specialty:'y'},['ay','by']],
  [{branch:'a',specialty:'x'},['ax','today']],
  [{branch:'b',specialty:'y'},['by']],
  [{branch:'a',specialty:general},['ag']],
  [{branch:'empty'},[]],[{specialty:'empty'},[]],[{branch:'a',specialty:'empty'},[]],
  [{method:'bank'},['ay']]
];
const before=JSON.stringify(rows);
for(const [filters,ids] of cases){
  const selected=rows.filter(row=>context.expenseMatches(row,{...monthly,...filters}));
  assert.deepEqual(selected.map(row=>row.id),ids,'canonical expense filters combine every visible constraint');
  const model=historyReportModel('expense',selected,{...monthly,effectiveTo:monthly.to,label:'November'},filters.branch||'All centers',filters.specialty||'All courses');
  assert.equal(model.rows.length,ids.length);assert.equal(model.total,selected.reduce((sum,row)=>sum+row.amount,0));
  assert.deepEqual(Array.from(model.rows,row=>row[3]),ids.map(id=>`Expense ${id}`),'the report consumes all and only filtered source rows');
  assert.equal(model.rows.filter(row=>row[5]==='مصروف عام').length,selected.filter(row=>row.specialty===general).length,'the report explicitly identifies every filtered general expense');
  if(filters.specialty&&filters.specialty!==general)assert.equal(model.rows.filter(row=>row[5]==='مصروف عام').length,0,'a course report never adds general expenses');
}
assert.equal(JSON.stringify(rows),before,'filtering and report creation are read-only');
assert.deepEqual(rows.filter(row=>context.expenseMatches(row,{from:'2026-11-15',to:'2026-11-15',branch:'a'})).map(row=>row.id),['today']);
assert.deepEqual(rows.filter(row=>context.expenseMatches(row,{from:'2026-10-31',to:'2026-11-03',branch:'a'})).map(row=>row.id),['ax','ay','ag','prior-course','prior-general']);
const year=yearBounds(2026),month=monthBounds(2026,11);
assert.equal(month.to,'2026-11-30');assert.equal(year.from,'2026-01-01');
assert.equal(rows.filter(row=>context.expenseMatches(row,{from:year.from,to:monthly.to})).length,9,'the shared current-day cutoff excludes future course and general rows');
const report=historyReportModel('expense',rows.slice(0,3),{...month,effectiveTo:monthly.to,label:'November'},'Center A','All courses');
rows[0].amount=9999;rows[0].name='changed';assert.equal(report.total,600);assert.equal(report.rows[0][3],'Expense ax','an open report remains a snapshot');
const card=expensePartitionCard({title:'value',cardClass:'test',periodContext:'November',course:100,general:300,total:400,courseLabel:'مصاريف <دورة مختارة>'});
assert(card.includes('&lt;دورة مختارة&gt;'),'selected course names are escaped at the display boundary');
assert(card.includes('data-expense-part="general"')&&card.includes('data-expense-part="total"'));
console.log('Expense filters v65 passed: canonical branch/course/method/date intersections, general-only and zero states, current cutoff, complete filtered report snapshots and escaped selected-course labels.');
