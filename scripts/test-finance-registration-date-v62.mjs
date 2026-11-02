// Real packaged-app regression: existing registrations, original receipt date
// edits, canonical filter scopes, later collections, unpaid and restored records.
import fs from 'node:fs';
import path from 'node:path';
import http from 'node:http';
import assert from 'node:assert/strict';
import {pathToFileURL} from 'node:url';
const moduleName=process.env.EFC_PLAYWRIGHT_MODULE||'playwright';
const {chromium}=await import(path.isAbsolute(moduleName)?pathToFileURL(moduleName).href:moduleName);
const root=path.resolve('dist'),output=process.env.EFC_QA_OUTPUT;
if(output)fs.mkdirSync(output,{recursive:true});
const server=http.createServer((req,res)=>{
  const file=path.resolve(root,'.'+decodeURIComponent((req.url||'/').split('?')[0]==='/'?'/index.html':req.url.split('?')[0]));
  if(!file.startsWith(root+path.sep))return res.writeHead(403).end();
  try{res.setHeader('Content-Type',file.endsWith('.js')?'application/javascript':file.endsWith('.css')?'text/css':'text/html');res.end(fs.readFileSync(file));}catch{res.writeHead(404).end();}
});
await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
const browser=await chromium.launch({headless:true,...(process.env.EFC_BROWSER_PATH?{executablePath:process.env.EFC_BROWSER_PATH}:{})});
const errors=[];
try{
  const context=await browser.newContext({viewport:{width:1440,height:1000},timezoneId:'UTC'}),page=await context.newPage();
  page.on('pageerror',e=>errors.push(String(e)));page.on('dialog',d=>d.dismiss());
  await page.clock.setFixedTime(new Date('2026-11-15T12:00:00Z'));
  await page.addInitScript(()=>{
    if(localStorage.getItem('finance-date-v62'))return;localStorage.setItem('finance-date-v62','1');
    localStorage.setItem('efc-branches-v13',JSON.stringify([{id:'a',name:'المركز الأول'},{id:'b',name:'المركز الثاني'}]));
    localStorage.setItem('efc-specialties-v1',JSON.stringify(['x','y'].map((id,i)=>({id,name:i?'المعلوماتية':'الفرنسية',courseType:'quick',billing:'one_time',fee:500,quickDays:365,durationValue:365,durationUnit:'day'}))));
    localStorage.setItem('efc-students-v1',JSON.stringify([{
      id:`student-${Date.parse('2026-11-02T12:00:00Z').toString(36)}-existing`,recordCode:'existing-record',name:'طالب موجود قبل التحديث',phone:'00000000',branch:'a',specialty:'x',reg:1,
      registeredAt:'2026-11-02',registrationDate:'2026-11-02',start:'2026-10-25',end:'2027-10-25',required:500,paid:500,active:true,status:'active',
      snapshot:{centerOpsV13:true,billing:'one_time',fee:500,durationValue:365,durationUnit:'day'},
      payments:[['2026-10-25',300,'نقداً','12:00',1,'دفعة تسجيل','registration-tx',null,1],['2026-11-10',200,'نقداً','12:00',2,'باقي الدورة','collection-tx',null,2]]
    }]));
  });
  const ready=()=>page.waitForFunction(()=>window.EFC_SECURITY_UI_V13?.ready&&window.EFC_ACCOUNTING_INTEGRITY_V21?.ready);
  await page.goto(`http://127.0.0.1:${server.address().port}/#finance`);await ready();
  const value=async selector=>Number((await page.locator(selector).textContent()).replace(/[^0-9-]/g,''));
  const values=async()=>Promise.all(['[data-student-part=new] b','[data-student-part=earlier] b','[data-income-part=new] b','[data-income-part=earlier] b','[data-income-part=total] b'].map(value));
  async function monthly(month,branch='a',specialty='x'){
    await page.evaluate(()=>window.renderFinance());await page.locator('#monthV13').selectOption(String(month));await page.locator('#branchV13').selectOption(branch);await page.locator('#specV13').selectOption(specialty);return values();
  }
  const source=()=>page.evaluate(()=>JSON.stringify(students));
  const original=await source();
  assert.deepEqual(await monthly(11),[0,1,0,200,200],'already installed data is corrected immediately: October registration, November collection');
  assert.equal(await page.locator('[data-income-part=unclassified]').count(),0,'old wrong November creation metadata no longer leaves October income unclassified');
  assert.deepEqual(await monthly(10),[1,0,300,0,300]);
  assert.equal(await page.locator('[data-income-part=unclassified]').count(),0);
  assert.equal(await source(),original,'reading corrected cohorts does not migrate or rewrite student/payment data');
  assert.deepEqual(await monthly(11,'b'),[0,0,0,0,0]);assert.deepEqual(await monthly(11,'a','y'),[0,0,0,0,0]);
  await monthly(11);
  await page.locator('#financeModeV13 [data-mode=daily]').click();await page.locator('#dayV13').fill('2026-11-10');await page.locator('#dayV13').dispatchEvent('change');assert.deepEqual(await values(),[0,1,0,200,200]);
  await page.locator('#dayV13').fill('2026-10-25');await page.locator('#dayV13').dispatchEvent('change');assert.deepEqual(await values(),[1,0,300,0,300]);
  await page.locator('#financeModeV13 [data-mode=weekly]').click();await page.locator('#fromV13').fill('2026-10-01');await page.locator('#fromV13').dispatchEvent('change');await page.locator('#toV13').fill('2026-11-15');await page.locator('#toV13').dispatchEvent('change');assert.deepEqual(await values(),[1,0,500,0,500]);
  await page.locator('#financeModeV13 [data-mode=yearly]').click();assert.deepEqual(await values(),[1,0,500,0,500]);
  assert.equal(await source(),original,'filter matrices are read-only');
  // Search intentionally keeps its original start-date semantics.
  await page.evaluate(()=>window.renderPeriod());await page.locator('#periodFromV13').fill('2026-11-01');await page.locator('#periodFromV13').dispatchEvent('change');assert.equal(await page.locator('#periodResultV13 tbody tr[data-id]').count(),0);
  await page.locator('#periodFromV13').fill('2026-10-01');await page.locator('#periodFromV13').dispatchEvent('change');assert.equal(await page.locator('#periodResultV13 tbody tr[data-id]').count(),1);
  async function editReceipt(index,date,start){
    await page.evaluate(index=>window.receiptWindowV4(window.receiptModelV4(students[0],index,false)),index);
    await page.frameLocator('.receipt-viewer-frame-v13').locator('.edit12').click();
    await page.waitForSelector('#regFormV13.registration-edit-mode-v17');
    assert(await page.locator('#regFormV13 [name=paymentDate]').isEnabled(),'original source receipt exposes its date editor');
    await page.locator('#regFormV13 [name=paymentDate]').fill(date);
    if(start)await page.locator('#regFormV13 [name=start]').fill(start);
    await page.locator('.registration-save-edit-v17').click();
    await page.waitForFunction(()=>!window.EFC_REGISTRATION_EDIT_V17.active());
  }
  // Exercise the actual receipt -> edit -> save flow, not a test-only mutation.
  await editReceipt(0,'2026-11-02');assert.deepEqual(await monthly(11),[1,0,500,0,500]);assert.deepEqual(await monthly(10),[0,0,0,0,0]);
  const creation=await page.evaluate(()=>({id:students[0].id,registeredAt:students[0].registeredAt,registrationDate:students[0].registrationDate,start:students[0].start,payments:students[0].payments.map(p=>p[0])}));
  assert.equal(creation.registeredAt,'2026-11-02');assert.equal(creation.start,'2026-10-25');assert.deepEqual(creation.payments,['2026-11-02','2026-11-10']);
  await editReceipt(0,'2026-10-25','2026-10-25');assert.deepEqual(await monthly(11),[0,1,0,200,200]);assert.deepEqual(await monthly(10),[1,0,300,0,300]);
  assert.equal(await page.evaluate(()=>students[0].id),creation.id,'moving the receipt never creates or replaces the student');
  assert.equal(await page.evaluate(()=>students.length),1);
  // A later collection dated earlier than the original receipt cannot take over.
  await editReceipt(1,'2026-10-01');assert.deepEqual(await monthly(10),[1,0,500,0,500]);assert.deepEqual(await monthly(11),[0,0,0,0,0]);
  await page.locator('#financeModeV13 [data-mode=daily]').click();await page.locator('#dayV13').fill('2026-10-25');await page.locator('#dayV13').dispatchEvent('change');assert.deepEqual(await values(),[1,0,300,0,300]);
  await editReceipt(1,'2026-11-10');assert.deepEqual(await monthly(11),[0,1,0,200,200]);
  // Personal-data edits and start corrections must not move financial registration.
  await page.evaluate(()=>window.openStudent(students[0].id,'profile'));await page.locator('.student-edit-info-v20').click();
  await page.locator('#regFormV13 [name=start]').fill('2026-09-20');await page.locator('.registration-save-edit-v17').click();await page.waitForFunction(()=>!window.EFC_REGISTRATION_EDIT_V17.active());
  assert.deepEqual(await monthly(10),[1,0,300,0,300]);assert.deepEqual(await monthly(11),[0,1,0,200,200]);
  await page.reload();await ready();assert.deepEqual(await monthly(11),[0,1,0,200,200],'old metadata cannot return after restart');
  const restored=await page.evaluate(()=>({version:3,students:JSON.parse(JSON.stringify(students))}));
  await page.evaluate(async backup=>await window.EFC_APPLY_RESTORED_STATE(backup),restored);await page.reload();await ready();
  assert.deepEqual(await monthly(11),[0,1,0,200,200]);assert.equal(await page.evaluate(()=>students.length),1,'same backup must not duplicate a registration');
  // An old imported record lacking an id must use its original payment, not its
  // newly generated import id. Stable recordCode makes repeat restore idempotent.
  const imported={...restored.students[0],id:undefined,recordCode:'import-without-id',reg:2,start:'2026-10-25'};
  for(let i=0;i<2;i++){await page.evaluate(async student=>await window.EFC_APPLY_RESTORED_STATE({version:3,students:[student]}),imported);await page.reload();await ready();}
  assert.equal(await page.evaluate(()=>students.length),2);assert.deepEqual(await monthly(10),[2,0,600,0,600]);assert.deepEqual(await monthly(11),[0,2,0,400,400]);
  // Preserve pre-existing unpaid-registration visibility. Its first payment
  // becomes authoritative as soon as it is entered, without creating a new file.
  await page.evaluate(()=>{const s={...students[0],id:'unpaid-legacy',recordCode:'unpaid-legacy',reg:3,start:'2026-11-05',paid:0,payments:[],active:true,status:'active'};students.push(s);window.EFC_DOMAIN_V13.saveStudents();});
  assert.deepEqual(await monthly(11),[1,2,0,400,400]);
  await page.evaluate(()=>window.EFC_DOMAIN_V13.appendPayment(students.find(s=>s.id==='unpaid-legacy'),{amount:100,method:'نقداً',date:'2026-10-30'}));
  assert.deepEqual(await monthly(11),[0,2,0,400,400]);assert.deepEqual(await monthly(10),[3,0,700,0,700]);
  await page.evaluate(()=>window.EFC_DOMAIN_V13.stopStudent(students[0],'test stopped state'));await monthly(11);
  assert.equal(await page.evaluate(()=>students[0].active),false);await page.reload();await ready();assert.equal(await page.evaluate(()=>students[0].active),false,'count correction never reactivates stopped students');
  if(output){await monthly(11);await page.screenshot({path:path.join(output,'existing-registration-november.png'),fullPage:true});await monthly(10);await page.screenshot({path:path.join(output,'existing-registration-october.png'),fullPage:true});}
  assert.deepEqual(errors,[]);
  console.log('Finance registration v62 passed: existing records correct immediately; original receipt date edits move count/income cohorts; later collections, source order, branch/course/daily/range/year filters, start-based search, restarts, restore, unpaid fallback and stopped state preserved.');
}finally{await browser.close();await new Promise(resolve=>server.close(resolve));}
