import fs from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';

const source=fs.readFileSync('assets/production-bank-v22.js','utf8');
const mutationSource=source.slice(source.indexOf('async function saveEntry(){'),source.indexOf('function renderBank(){'));
const normalizeSource=source.slice(source.indexOf('function normalizeEntry(item){'),source.indexOf('function normalizeTombstone(item){'));
const original={id:'bank-one',recordCode:'bank-rec-one',receiptNo:1,type:'in',amount:100,statement:'original',date:'2025-10-01',time:'12:00',createdAt:1,updatedAt:1};
function harness(entry=original){
  const state={entries:entry?[{...entry}]:[],nextReceiptNo:2,tombstones:[]},fields={bankTypeV22:{value:'in'},bankAmountV22:{value:'900'},bankStatementV22:{value:'corrected',focus(){}},bankDateV22:{value:'2026-11-15'}};
  let lock='2025-12-31',failure=false,writes=0,allocations=0,renders=0,confirms=0;
  const alerts=[],c={state,editingId:entry?.id||null,Date,Math,Number,String,JSON,console:{error(){}},canEditBank:()=>true,today:()=> '2026-11-15',nowTime:()=> '12:00',uid:prefix=>prefix+'-new',receiptCode:e=>String(e.receiptNo),requestAnimationFrame:fn=>fn(),alert:msg=>alerts.push(String(msg)),confirm:()=>{confirms++;return true;},renderBank:()=>renders++,openReceipt(){},writeLocal(){},nextReceiptNo:()=>{allocations++;return state.nextReceiptNo++;},persist:async()=>{writes++;if(failure)throw Error('injected save failure');},document:{getElementById:id=>fields[id]||null,querySelectorAll:()=>[]},window:{EFC_FISCAL_V14:{assertDateOpen(date){if(lock&&date<=lock)throw Error('closed '+date);}}}};
  vm.createContext(c);vm.runInContext(normalizeSource+mutationSource,c);
  return{c,state,fields,alerts,setLock:value=>lock=value,setFailure:value=>failure=value,stats:()=>({writes,allocations,renders,confirms})};
}
const copy=s=>JSON.stringify(s);
{
  const h=harness(),before=copy(h.state);await h.c.saveEntry();
  assert.equal(copy(h.c.state),before,'closed original date must block amount/date changes before mutation');
  assert.equal(h.stats().writes,0);assert.equal(h.alerts.length,1);
  h.c.editingId=null;h.c.beginEdit(original.id);assert.equal(h.c.editingId,null,'closed source cannot enter edit mode');
  assert.equal(await h.c.deleteEntry(original.id),false);assert.equal(h.stats().confirms,0,'closed deletion blocks before confirmation');
}
{
  const h=harness({...original,date:'2026-11-01'}),before=copy(h.state);h.fields.bankDateV22.value='2025-11-01';await h.c.saveEntry();
  assert.equal(copy(h.c.state),before,'open record cannot be moved into a closed target period');assert.equal(h.stats().writes,0);
}
{
  const h=harness(null),before=copy(h.state);h.fields.bankDateV22.value='2025-11-01';await h.c.saveEntry();
  assert.equal(copy(h.c.state),before,'new entry cannot target a closed period');assert.equal(h.stats().allocations,0,'blocked creation must not allocate a receipt');
}
{
  const h=harness({...original,date:'2026-11-01'});h.setLock('');h.c.beginEdit(original.id);assert.equal(h.c.editingId,original.id);
  const before=copy(h.state);h.setLock('2026-11-01');await h.c.saveEntry();assert.equal(copy(h.c.state),before,'save rechecks the original after a fiscal close while editor was open');
}
for(const type of ['in','out']){
  const h=harness({...original,date:'2026-11-01'});h.fields.bankTypeV22.value=type;await h.c.saveEntry();
  assert.equal(h.c.state.entries[0].amount,900);assert.equal(h.c.state.entries[0].type,type);assert.equal(h.c.state.entries[0].date,'2026-11-15');
  assert.equal(h.c.state.entries[0].id,original.id);assert.equal(h.c.state.entries[0].recordCode,original.recordCode);assert.equal(h.c.state.entries[0].receiptNo,1);assert.equal(h.stats().allocations,0);
  assert.equal(await h.c.deleteEntry(original.id),true);assert.equal(h.c.state.entries.length,0);assert.equal(h.c.state.tombstones[0].recordCode,original.recordCode);
}
{
  const h=harness({...original,date:'2026-11-01'}),before=copy(h.state);h.setFailure(true);await h.c.saveEntry();
  assert.equal(copy(h.c.state),before,'failed persistence rolls back the editable record');assert.equal(h.c.editingId,original.id);
}
console.log('Bank fiscal v63 passed: source/target/creation locks, recheck at save, unchanged receipt identities, open-period edits/deletion and failed-save rollback.');
