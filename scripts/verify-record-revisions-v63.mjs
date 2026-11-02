import fs from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';
const read=file=>fs.readFileSync('assets/'+file,'utf8');
const domain=read('production-domain-v13.js'),registration=read('production-registration-schedule-v13.js'),student=read('production-student-ui-v13.js'),finance=read('production-finance-ui-v13.js');
const extract=(source,start,end)=>{const from=source.indexOf(start),to=source.indexOf(end,from);assert(from>=0&&to>from);return source.slice(from,to);};
const clock=class extends Date{static now(){return 1000;}};
function harness(){
  const form={elements:{name:{focus(){}},type:{value:'quick'},days:{required:false}}},controls=new Map(),modal={remove(){},querySelector(selector){if(selector==='form')return form;if(!controls.has(selector))controls.set(selector,{});return controls.get(selector);}};
  const c={console,Date:clock,Set,Map,Number,String,Math,JSON,FormData:class{get(key){return c.data[key];}},data:{},D:{uid:prefix=>prefix+'-new',nowTime:()=> '12:00'},esc:String,today:()=> '2026-11-15',window:{renderSpecialties(){}},document:{body:{appendChild(){}},createElement:()=>modal},branches:[],specialties:[],students:[],expenses:[],saveCenters(){},renderSpecialties(){},modalShell:()=>modal,courseTypeOf:item=>item.courseType||'quick',spec:id=>c.specialties.find(item=>item.id===id),alert:message=>{throw Error(message);},methodOptions:()=>'<option>cash</option>',STORAGE:{expenses:'expenses'},GENERAL_EXPENSE:'general',uid:prefix=>prefix+'-new',allocateExpenseReceiptNumber:()=>9,writeJson(){}};
  c.D.saveSpecs=()=>{};c.D.getExpenses=()=>c.expenses;c.D.saveExpenses=values=>{c.expenses=values;};vm.createContext(c);return{c,form};
}
{
  const {c}=harness();c.expenses=[{id:'legacy',name:'rent',amount:100,branch:'a',specialty:'x',createdAt:17},{id:'new',name:'supplies',amount:200,branch:'a',specialty:'x',updatedAt:501}];
  vm.runInContext(extract(domain,'function normalizeExpenses(){','function repairExpenseReceiptSequence(){'),c);c.normalizeExpenses();
  assert.equal(c.expenses[0].updatedAt,0,'normalizing legacy expenses must not fabricate a fresh revision');assert.equal(c.expenses[1].updatedAt,501);
  c.normalizeExpenses();assert.equal(c.expenses[0].updatedAt,0);assert.equal(c.expenses[1].updatedAt,501);
}
{
  const {c,form}=harness();vm.runInContext(extract(registration,'function normalizeCenters(items){','function applyCenters(items,'),c);
  c.branches=c.normalizeCenters([{id:'legacy',name:' old '},{id:'new',name:'new',updatedAt:2000}]);
  assert.equal(c.branches[0].updatedAt,0);assert.equal(c.branches[1].updatedAt,2000);
  vm.runInContext(extract(registration,'function contributeCenters(state){','function saveCenters(){'),c);assert.equal(c.contributeCenters({}).branches[1].updatedAt,2000,'backup contribution preserves the record revision');
  vm.runInContext(extract(registration,'function openCenterEditor(id=null){','function centersMarkup(){'),c);c.data={name:'corrected'};c.openCenterEditor('new');form.onsubmit({preventDefault(){}});
  assert.equal(c.branches[1].name,'corrected');assert.equal(c.branches[1].updatedAt,2001,'center edits advance monotonically even if clock moved backwards');
  c.data={name:'fresh'};c.openCenterEditor();form.onsubmit({preventDefault(){}});assert.equal(c.branches.at(-1).updatedAt,1000);
}
{
  const {c,form}=harness();c.specialties=[{id:'x',recordCode:'spec-x',name:'course',courseType:'quick',durationValue:365,updatedAt:2000}];c.students=[{specialty:'x',snapshot:{durationValue:365}}];
  const priorStudent=JSON.stringify(c.students);vm.runInContext(extract(student,'function openCourseEditor(id=null){','// Registration rendering'),c);
  c.data={name:'corrected course',type:'quick',days:'30'};c.openCourseEditor('x');form.onsubmit({preventDefault(){}});
  assert.equal(c.specialties[0].updatedAt,2001);assert.equal(c.specialties[0].durationValue,30);assert.equal(c.specialties[0].recordCode,'spec-x');assert.equal(JSON.stringify(c.students),priorStudent,'course revisions do not rewrite historical student snapshots');
  c.openCourseEditor();form.onsubmit({preventDefault(){}});assert.equal(c.specialties.at(-1).updatedAt,1000);
}
{
  const {c,form}=harness();c.expenses=[{id:'expense',name:'rent',amount:100,method:'cash',branch:'a',specialty:'x',date:'2026-11-01',createdAt:17,updatedAt:2000,receiptNo:4}];
  vm.runInContext(extract(finance,'function openExpenseEditor(id=null,onSave){','function renderLedgerBaseV13(){'),c);c.data={name:'corrected rent',amount:'250',method:'cash',branch:'a',specialty:'x',date:'2026-11-01',time:'12:00'};c.openExpenseEditor('expense');form.onsubmit({preventDefault(){},target:form});
  assert.equal(c.expenses[0].updatedAt,2001);assert.equal(c.expenses[0].amount,250);assert.equal(c.expenses[0].createdAt,17);assert.equal(c.expenses[0].receiptNo,4);assert.equal(c.expenses[0].id,'expense');
  c.openExpenseEditor();form.onsubmit({preventDefault(){},target:form});assert.equal(c.expenses.at(-1).updatedAt,1000);
}
console.log('Record revisions v63 passed: legacy normalization stays revision 0; expense/center/course edits preserve identity and stamp monotonic revisions; backup center revisions and historical course snapshots retained.');
