// Isolated packaged UI regressions: real notification/preview/PDF interactions,
// independent visibility state, and the three-column expense-history summary.
import fs from 'node:fs';
import path from 'node:path';
import http from 'node:http';
import {pathToFileURL} from 'node:url';
import assert from 'node:assert/strict';
const moduleName=process.env.EFC_PLAYWRIGHT_MODULE||'playwright';
const {chromium}=await import(path.isAbsolute(moduleName)?pathToFileURL(moduleName).href:moduleName);
const root=path.resolve('dist'),output=process.env.EFC_QA_OUTPUT;
if(output)fs.mkdirSync(output,{recursive:true});
const server=http.createServer((req,res)=>{
  const request=decodeURIComponent((req.url||'/').split('?')[0]),file=path.resolve(root,'.'+(request==='/'?'/index.html':request));
  if(!file.startsWith(root+path.sep)){res.writeHead(403).end();return;}
  try{res.setHeader('Content-Type',file.endsWith('.js')?'application/javascript':file.endsWith('.css')?'text/css':file.endsWith('.svg')?'image/svg+xml':file.endsWith('.webp')?'image/webp':'text/html');res.end(fs.readFileSync(file));}catch{res.writeHead(404).end();}
});
await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
const browser=await chromium.launch({headless:true,...(process.env.EFC_BROWSER_PATH?{executablePath:process.env.EFC_BROWSER_PATH}:{})});
const errors=[],alerts=[];
async function boot(){
  const context=await browser.newContext({viewport:{width:1440,height:1000},timezoneId:'UTC',acceptDownloads:true}),page=await context.newPage();
  page.on('pageerror',error=>errors.push(String(error)));page.on('dialog',async dialog=>{alerts.push(dialog.message());await dialog.dismiss();});
  await page.clock.setFixedTime(new Date('2026-11-09T12:00:00Z'));
  await page.addInitScript(()=>{
    if(localStorage.getItem('ui-reminders-seeded-v67'))return;localStorage.setItem('ui-reminders-seeded-v67','1');
    localStorage.setItem('efc-branches-v13',JSON.stringify([{id:'a',name:'المركز الأول'},{id:'b',name:'المركز الثاني'}]));
    localStorage.setItem('efc-specialties-v1',JSON.stringify([{id:'m',name:'الفرنسية',courseType:'normal',billing:'monthly',fee:500,durationValue:1,durationUnit:'month'},{id:'q',name:'المعلوماتية',courseType:'quick',billing:'one_time',fee:500,durationValue:30,durationUnit:'day'}]));
    const student=(id,branch,reg)=>({id,recordCode:'reminder-record-'+id,name:'طالب '+id,phone:'22223333',registeredAt:'2026-10-12',branch,specialty:'m',reg,start:'2026-10-12',end:'',active:true,status:'active',required:500,paid:500,debtDueDates:{},snapshot:{centerOpsV13:true,centerOpsMonthlyV13:true,dynamicMonthly:true,courseType:'normal',billing:'monthly',fee:500,durationValue:1,durationUnit:'month'},payments:[['2026-10-12',500,'نقداً','12:00',reg,'دفعة تسجيل','reminder-payment-'+id,1,reg,null,[{monthNumber:1,amount:500}],1]]});
    localStorage.setItem('efc-students-v1',JSON.stringify([student('A','a',1),student('B','a',2),student('C','b',1)]));
    const expense=(id,date,branch,specialty,amount)=>({id:'expense-'+id,name:'مصروف تجريبي '+id,date,branch,specialty,amount,method:'نقداً',time:'12:00',receiptNo:id,createdAt:id});
    localStorage.setItem('efc-expenses-v11',JSON.stringify([expense(1,'2026-11-09','a','m',100),expense(2,'2026-11-09','a','q',200),expense(3,'2026-11-09','a','__expense_general__',300),expense(4,'2026-11-09','b','m',400),expense(5,'2026-11-09','b','__expense_general__',500),expense(6,'2026-11-10','a','m',1000),expense(7,'2026-10-31','a','m',40)]));
  });
  await page.goto(`http://127.0.0.1:${server.address().port}/#finance`);
  await page.waitForFunction(()=>window.EFC_SECURITY_UI_V13?.ready&&window.EFC_REMINDER_STATE_V67?.ready&&window.EFC_ACCOUNTING_INTEGRITY_V21?.ready);
  await page.evaluate(()=>window.EFC_REMINDER_STATE_READY_V67);
  return{page,context};
}
const count=async page=>Number(await page.locator('.efc-bell-v13 b').textContent());
const openProfile=async(page,id)=>{await page.evaluate(id=>window.openStudent(id,'profile'),id);await page.locator('.student-profile-v3').waitFor();};
const closeProfile=async page=>{await page.locator('.modal:not(.reminder-viewer-v13) .modal-head>.x').last().click();};
const noteFor=(page,id)=>page.locator('.notification-item-v13').filter({has:page.locator(`.notification-open-v67[data-id="${id}"]`)});
async function previewAndClose(page){
  await page.locator('.reminder-view-v13').click();
  const frame=page.frameLocator('.reminder-viewer-frame-v13');await frame.locator('.reminder-paper-v13').waitFor();
  assert((await frame.locator('body').textContent()).includes('جميع الشهادات معترف بها من طرف الدولة'),'the shared reminder branding is preserved');
  assert.equal(await page.locator('.reminder-hide-v67').count(),0,'opening the preview alone does not reveal hide');
  await page.locator('.reminder-viewer-close-v13').click();await page.locator('.reminder-hide-v67:not([disabled])').waitFor();
}
try{
  const {page,context}=await boot();assert.equal(await count(page),3,'all three independently due students are counted');
  assert.equal(await page.locator('.finance-certificate-note-v58').count(),0,'the separate-certificate explanatory note is removed only from the dashboard');
  const studentsBefore=await page.evaluate(()=>JSON.stringify(students));
  await page.locator('.efc-bell-v13').click();await page.locator('.efc-notification-panel-v13:not([hidden])').waitFor();
  if(output)await page.screenshot({path:path.join(output,'notification-panel-v67.png')});
  await noteFor(page,'A').locator('.notification-dismiss-v67').click();
  await page.waitForFunction(()=>document.querySelector('.efc-bell-v13 b')?.textContent==='2');
  assert.equal(await page.locator('.modal').count(),0,'dismiss does not bubble into opening the student file');assert.equal(await noteFor(page,'B').count(),1);assert.equal(await noteFor(page,'C').count(),1);
  await page.locator('.notification-head-v13 .x').click();
  await openProfile(page,'A');assert.equal(await page.locator('.student-reminder-card-v13').count(),1,'bell dismissal leaves the profile notice present');assert.equal(await page.locator('.reminder-hide-v67').count(),0);
  if(output)await page.screenshot({path:path.join(output,'student-reminder-before-view-v67.png')});
  const downloadEvent=page.waitForEvent('download');await page.locator('.reminder-pdf-v13').click();const download=await downloadEvent,pdf=fs.readFileSync(await download.path());assert.equal(pdf.subarray(0,5).toString(),'%PDF-');if(output)fs.writeFileSync(path.join(output,'reminder-direct-v67.pdf'),pdf);
  assert.equal(await page.locator('.reminder-hide-v67').count(),0,'direct PDF creation does not replace viewing and closing the preview');
  await previewAndClose(page);if(output)await page.screenshot({path:path.join(output,'student-reminder-viewed-v67.png')});await page.locator('.reminder-hide-v67').click();await page.waitForFunction(()=>!document.querySelector('.student-reminder-card-v13'));
  assert.equal(await count(page),2,'hiding an already bell-dismissed profile notice leaves other bell notices alone');await closeProfile(page);
  await openProfile(page,'B');await previewAndClose(page);await page.locator('.reminder-hide-v67').click();await page.waitForFunction(()=>!document.querySelector('.student-reminder-card-v13'));
  assert.equal(await count(page),2,'profile hide does not dismiss the same notification from the bell');await closeProfile(page);
  await page.locator('.efc-bell-v13').click();assert.equal(await noteFor(page,'B').count(),1);assert.equal(await noteFor(page,'C').count(),1);await page.locator('.notification-head-v13 .x').click();
  await openProfile(page,'C');assert.equal(await page.locator('.student-reminder-card-v13').count(),1);assert.equal(await page.locator('.reminder-hide-v67').count(),0,'one student preview does not unlock another student hide');await closeProfile(page);
  assert.equal(await page.evaluate(()=>JSON.stringify(students)),studentsBefore,'visibility actions never change student/payment/accounting records');
  const backup=await page.evaluate(()=>window.EFC_FORCE_PERSIST());assert(backup.reminderVisibilityV67,'the canonical backup snapshot contains reminder visibility');
  await page.reload();await page.waitForFunction(()=>window.EFC_SECURITY_UI_V13?.ready&&window.EFC_REMINDER_STATE_V67?.ready);assert.equal(await count(page),2,'bell state survives restart');
  await openProfile(page,'A');assert.equal(await page.locator('.student-reminder-card-v13').count(),0,'profile state survives restart');await closeProfile(page);
  const restored=await boot();await restored.page.evaluate(state=>window.EFC_APPLY_RESTORED_STATE(state),backup);await restored.page.reload();await restored.page.waitForFunction(()=>window.EFC_SECURITY_UI_V13?.ready&&window.EFC_REMINDER_STATE_V67?.ready);assert.equal(await count(restored.page),2,'hidden bell state survives canonical backup restore');
  await openProfile(restored.page,'B');assert.equal(await restored.page.locator('.student-reminder-card-v13').count(),0,'hidden profile state survives canonical backup restore');await restored.context.close();
  for(const [day,title]of [['2026-11-10','يومان'],['2026-11-11','يوم واحد'],['2026-11-12','دين قائم']]){
    await page.clock.setFixedTime(new Date(day+'T12:00:00Z'));await page.evaluate(()=>window.renderCurrentV13());assert.equal(await count(page),3,'a hidden earlier stage cannot suppress a later reminder');await openProfile(page,'A');assert((await page.locator('.student-reminder-card-v13').textContent()).includes(title));assert.equal(await page.locator('.reminder-hide-v67').count(),0,'a new stage requires its own closed preview');await closeProfile(page);
  }
  for(const day of ['2026-11-12','2026-11-13']){
    const financialBefore=await page.evaluate(()=>JSON.stringify(students));await openProfile(page,'A');await previewAndClose(page);await page.locator('.reminder-hide-v67').click();await page.waitForFunction(()=>!document.querySelector('.student-reminder-card-v13'));await closeProfile(page);
    await page.locator('.efc-bell-v13').click();await noteFor(page,'A').locator('.notification-dismiss-v67').click();await page.waitForFunction(()=>document.querySelector('.efc-bell-v13 b')?.textContent==='2');await page.locator('.notification-head-v13 .x').click();assert.equal(await page.evaluate(()=>JSON.stringify(students)),financialBefore,'hiding daily debt changes no financial data');
    const next=day==='2026-11-12'?'2026-11-13':'2026-11-14';await page.clock.setFixedTime(new Date(next+'T12:00:00Z'));await page.evaluate(()=>window.renderCurrentV13());assert.equal(await count(page),3,'hiding the previous overdue date does not hide the next date');await openProfile(page,'A');assert((await page.locator('.student-reminder-card-v13').textContent()).includes('دين قائم'));assert.equal(await page.locator('.reminder-hide-v67').count(),0);await closeProfile(page);
  }
  await page.evaluate(()=>{const s=students.find(s=>s.id==='A');EFC_DOMAIN_V13.appendPayment(s,{amount:500,method:'نقداً',date:'2026-11-14',targetMonth:2});EFC_DOMAIN_V13.stopStudent(students.find(s=>s.id==='B'),'توقف تجريبي');renderCurrentV13();});
  assert.equal(await count(page),1,'canonical payment and stop rules still remove resolved reminders');assert.deepEqual(await page.evaluate(()=>students.filter(s=>s.id==='A'||s.id==='B').map(s=>EFC_DOMAIN_V13.notificationsForStudent(s).length)),[0,0]);
  await context.close();
  // A fresh fixed-date context keeps the expense assertions independent of the
  // reminder progression/pay/stop scenarios above.
  const finance=await boot(),fp=finance.page,money=text=>Number(String(text).replace(/[^0-9-]/g,''));
  await fp.locator('[data-section=expenses]').click();await fp.locator('#viewExpenseHistoryV13').click();
  const totals=async()=>Promise.all(['CourseTotalV65','GeneralTotalV65','TotalV53'].map(async suffix=>money(await fp.locator('#expenseHistory'+suffix).textContent())));
  assert.deepEqual(await totals(),[700,800,1500]);assert.equal(await fp.locator('#expenseHistoryBodyV13 tbody tr').count(),5);
  for(const width of [1440,1024,840]){
    await fp.setViewportSize({width,height:1000});
    const cells=await fp.locator('.expense-history-parts-v65>div').evaluateAll(elements=>elements.map(element=>{const r=element.getBoundingClientRect();return{x:r.x,y:r.y,width:r.width,fit:element.scrollWidth<=element.clientWidth+1};}));
    assert.equal(cells.length,3);assert(cells[0].x>cells[1].x&&cells[1].x>cells[2].x,'course/general/aggregate remain a single RTL row');assert(Math.max(...cells.map(r=>r.y))-Math.min(...cells.map(r=>r.y))<1,'all three columns share the same vertical level');assert(Math.max(...cells.map(r=>r.width))-Math.min(...cells.map(r=>r.width))<1,'all three summary columns have equal width');assert(cells.every(r=>r.fit),'summary text fits each column');
    if(output)await fp.screenshot({path:path.join(output,`expense-history-three-columns-${width}-v67.png`)});
  }
  await fp.setViewportSize({width:1440,height:1000});await fp.locator('#expenseHistoryBranchV13').selectOption('a');assert.deepEqual(await totals(),[300,300,600]);await fp.locator('#expenseHistorySpecV13').selectOption('m');assert.deepEqual(await totals(),[100,0,100]);await fp.locator('#expenseHistorySpecV13').selectOption('__expense_general__');assert.deepEqual(await totals(),[0,300,300]);
  await fp.locator('#expenseHistoryBranchV13').selectOption('');await fp.locator('#expenseHistorySpecV13').selectOption('');await fp.locator('#expenseHistoryExportV58').click();
  const report=fp.frameLocator('.receipt-viewer-frame-v13');await report.locator('#historySaveV58:not([disabled])').waitFor();assert.equal(await report.locator('.history-report-table-v58 tbody tr').count(),5);assert.equal(await report.locator('.head12').count(),1);assert.equal(await report.locator('.history-report-title-v59 h2').textContent(),'سجل المصاريف');assert((await report.locator('.history-report-summary-v58').textContent()).includes('1\u202f500')||(await report.locator('.history-report-summary-v58').textContent()).replace(/\s/g,'').includes('1500'));
  await finance.context.close();assert.deepEqual(errors,[],'no uncaught application errors');assert.deepEqual(alerts,[],'ordinary hide/preview/export flows have no failure alerts');
  console.log('PASS v67 UI: independent bell/profile dismissal; preview-only eligibility; PDF isolation; restart/restore; stages; canonical payment/stop; three-column expense summary at 840/1024/1440; filters/report preserved.');
}finally{await browser.close();await new Promise(resolve=>server.close(resolve));}
