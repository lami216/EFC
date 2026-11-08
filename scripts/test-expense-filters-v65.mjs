// Full packaged-app regression for expense labels, history splits and strict exports.
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
  const requested=decodeURIComponent((req.url||'/').split('?')[0]);
  const file=path.resolve(root,'.'+(requested==='/'?'/index.html':requested));
  if(!file.startsWith(root+path.sep))return res.writeHead(403).end();
  try{res.setHeader('Content-Type',file.endsWith('.js')?'application/javascript':file.endsWith('.css')?'text/css':file.endsWith('.svg')?'image/svg+xml':file.endsWith('.webp')?'image/webp':'text/html');res.end(fs.readFileSync(file));}catch{res.writeHead(404).end();}
});
await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
const browser=await chromium.launch({headless:true,...(process.env.EFC_BROWSER_PATH?{executablePath:process.env.EFC_BROWSER_PATH}:{})});
const general='__expense_general__';
const expense=(id,date,branch,specialty,amount,receiptNo)=>({id,date,branch,specialty,amount,receiptNo,name:`Expense ${id}`,time:'12:00',method:'نقداً',createdAt:receiptNo});
const fixtures=[
  ...Array.from({length:100},(_,i)=>expense(`long-${i}`,'2026-11-10','a','x',i+1,i+1)),
  expense('ax','2026-11-01','a','x',10,101),expense('ay','2026-11-02','a','y',20,102),expense('ag','2026-11-03','a',general,30,103),
  expense('bx','2026-11-04','b','x',40,104),expense('by','2026-11-05','b','y',50,105),expense('bg','2026-11-06','b',general,60,106),
  expense('prior-course','2026-10-31','a','x',70,107),expense('prior-general','2026-10-31','a',general,80,108),
  expense('future-course','2026-11-16','a','x',90,109),expense('future-general','2026-11-16','a',general,100,110),expense('today','2026-11-15','a','x',110,111)
];
const courseName='دورة الفرنسية <اختبار الفلاتر والاسم الطويل>';
const expected=({branch='',specialty='',from='2026-11-01',to='2026-11-15'}={})=>fixtures.filter(row=>(!branch||row.branch===branch)&&(!specialty||row.specialty===specialty)&&row.date>=from&&row.date<=to);
const amount=rows=>rows.reduce((sum,row)=>sum+row.amount,0);
const money=text=>Number(String(text).replace(/[^0-9-]/g,''));
try{
  const context=await browser.newContext({viewport:{width:1440,height:1000},timezoneId:'UTC',acceptDownloads:true});
  const page=await context.newPage(),errors=[];page.on('pageerror',error=>errors.push(String(error)));page.on('dialog',dialog=>dialog.dismiss());
  await page.clock.setFixedTime(new Date('2026-11-15T12:00:00Z'));
  await page.addInitScript(({fixtures,courseName})=>{
    if(localStorage.getItem('expense-v65'))return;localStorage.setItem('expense-v65','1');
    localStorage.setItem('efc-branches-v13',JSON.stringify([{id:'a',name:'المركز الأول'},{id:'b',name:'المركز الثاني'},{id:'empty',name:'مركز بلا مصاريف'}]));
    localStorage.setItem('efc-specialties-v1',JSON.stringify([{id:'x',name:courseName},{id:'y',name:'المعلوماتية'},{id:'empty',name:'دورة بلا مصاريف'}].map(course=>({...course,courseType:'quick',billing:'one_time',fee:500,durationValue:365,durationUnit:'day'}))));
    localStorage.setItem('efc-expenses-v11',JSON.stringify(fixtures));
    localStorage.setItem('efc-students-v1',JSON.stringify([{id:'income-student',recordCode:'income-student',name:'طالب',branch:'a',specialty:'x',reg:1,start:'2026-11-01',end:'2027-11-01',required:500,paid:500,active:true,status:'active',payments:[['2026-11-01',500,'نقداً','12:00',1,'','income-tx',null,1]],snapshot:{billing:'one_time',fee:500,durationValue:365,durationUnit:'day'}}]));
  },{fixtures,courseName});
  const ready=()=>page.waitForFunction(()=>window.EFC_SECURITY_UI_V13?.ready&&window.EFC_ACCOUNTING_INTEGRITY_V21?.ready);
  await page.goto(`http://127.0.0.1:${server.address().port}/#finance`);await ready();await page.waitForSelector('#financeBodyV13 .finance-partition-v58');
  const incomeBefore=await page.locator('#financeBodyV13').innerText();
  const sourceBefore=await page.evaluate(()=>JSON.stringify(EFC_DOMAIN_V13.getExpenses()));
  await page.locator('[data-section=expenses]').click();await page.locator('#branchV13').selectOption('a');await page.locator('#specV13').selectOption('x');
  const dashboard=page.locator('.finance-expense-total-card-v53');
  assert((await dashboard.locator('.finance-split-cell-v60').first().locator('small').textContent()).includes(courseName),'the dashboard amount identifies the actual selected course');
  assert.equal(money(await dashboard.locator('[data-expense-part=course]').textContent()),5170);
  assert.equal(money(await dashboard.locator('[data-expense-part=general]').textContent()),30,'dashboard general stays visible independently of the course selection');
  for(const width of [1440,1024,840]){
    await page.setViewportSize({width,height:1000});
    for(const kind of ['count','total']){
      const cells=page.locator(`.finance-expense-${kind}-card-v53 .finance-split-cell-v60`);
      const geometry=await cells.evaluateAll(elements=>elements.map(el=>{const r=el.getBoundingClientRect(),label=el.querySelector('small');return{x:r.x,y:r.y,width:r.width,fit:el.scrollWidth<=el.clientWidth+1&&label.scrollWidth<=label.clientWidth+1};}));
      assert.equal(geometry.length,2);assert(geometry[0].x>geometry[1].x&&Math.abs(geometry[0].y-geometry[1].y)<1,'dashboard groups remain alongside each other');assert(geometry.every(cell=>cell.fit),'long selected-course labels wrap inside their dashboard half');
    }
    if(output)await page.screenshot({path:path.join(output,`expense-dashboard-long-label-${width}.png`)});
  }
  await page.setViewportSize({width:1440,height:1000});
  await page.locator('#specV13').selectOption('y');assert.equal(money(await dashboard.locator('[data-expense-part=course]').textContent()),20);assert.equal(money(await dashboard.locator('[data-expense-part=general]').textContent()),30);
  await page.locator('#viewExpenseHistoryV13').click();
  async function check(rows,{selectedCourse=''}={}){
    const ids=await page.locator('#expenseHistoryBodyV13 .open-expense-receipt-v13').evaluateAll(buttons=>buttons.map(button=>button.dataset.id));
    assert.deepEqual(ids.sort(),rows.map(row=>row.id).sort(),'history rows obey the full period/center/course intersection');
    const courseRows=rows.filter(row=>row.specialty!==general),generalRows=rows.filter(row=>row.specialty===general);
    const fields={expenseHistoryTotalV53:amount(rows),expenseHistoryCourseTotalV65:amount(courseRows),expenseHistoryGeneralTotalV65:amount(generalRows),expenseHistoryCourseCountV65:courseRows.length,expenseHistoryGeneralCountV65:generalRows.length};
    for(const [id,value] of Object.entries(fields))assert.equal(money(await page.locator('#'+id).textContent()),value,id+' follows exactly the visible rows');
    if(selectedCourse)assert((await page.locator('#expenseHistoryCourseLabelV65').textContent()).includes(selectedCourse));
    assert.equal(await page.locator('#expenseHistoryBodyV13 .edit-expense-history-v13').count(),rows.length);assert.equal(await page.locator('#expenseHistoryBodyV13 .delete-expense-v13').count(),rows.length);
  }
  async function select(branch='',specialty=''){
    await page.locator('#expenseHistoryBranchV13').selectOption(branch);await page.locator('#expenseHistorySpecV13').selectOption(specialty);
    const rows=expected({branch,specialty});await check(rows,{selectedCourse:specialty==='x'?courseName:specialty==='y'?'المعلوماتية':''});return rows;
  }
  let selected=await select();assert.equal(selected.length,107);
  for(const branch of ['', 'a','b','empty'])for(const specialty of ['', 'x','y','empty',general])await select(branch,specialty);
  selected=await select('a');assert.equal(selected.length,104);assert(selected.some(row=>row.specialty===general),'center-only history contains general and every course in that center');
  selected=await select('','x');assert.equal(selected.length,103);assert(selected.every(row=>row.specialty==='x'),'course-only history excludes all general expenses');
  selected=await select('a','x');assert.equal(selected.length,102);
  // Date controls feed the same predicate for both counts and every monetary total.
  await page.locator('#expenseHistoryModeV13 [data-mode=daily]').click();await check(expected({branch:'a',specialty:'x',from:'2026-11-15',to:'2026-11-15'}));
  await page.locator('#expenseHistoryDayV13').fill('2026-11-10');await page.locator('#expenseHistoryDayV13').dispatchEvent('change');await check(expected({branch:'a',specialty:'x',from:'2026-11-10',to:'2026-11-10'}));
  await page.locator('#expenseHistoryModeV13 [data-mode=weekly]').click();await page.locator('#expenseHistoryFromV13').fill('2026-11-10');await page.locator('#expenseHistoryFromV13').dispatchEvent('change');await page.locator('#expenseHistoryToV13').fill('2026-11-01');await page.locator('#expenseHistoryToV13').dispatchEvent('change');await check(expected({branch:'a',specialty:'x',from:'2026-11-01',to:'2026-11-10'}));
  await page.locator('#expenseHistoryFromV13').fill('');await page.locator('#expenseHistoryFromV13').dispatchEvent('change');await check(expected({branch:'a',specialty:'x',from:'2026-10-31',to:'2026-11-01'}));
  await page.locator('#expenseHistoryModeV13 [data-mode=yearly]').click();await check(expected({branch:'a',specialty:'x',from:'2026-01-01'}));
  await page.locator('#expenseHistoryYearV13').selectOption('2025');await check([]);await page.locator('#expenseHistoryYearV13').selectOption('2026');
  await page.locator('#expenseHistoryModeV13 [data-mode=monthly]').click();await page.locator('#expenseHistoryMonthV13').selectOption('10');await check(expected({branch:'a',specialty:'x',from:'2026-10-01',to:'2026-10-31'}));await page.locator('#expenseHistoryMonthV13').selectOption('11');selected=await select('a','x');
  for(const width of [1440,1024,840]){
    await page.setViewportSize({width,height:1000});
    for(const id of ['expenseHistoryCourseTotalV65','expenseHistoryGeneralTotalV65'])assert(await page.locator('#'+id).isVisible());
    const geometry=await page.locator('.expense-history-parts-v65>div').evaluateAll(elements=>elements.map(el=>{const r=el.getBoundingClientRect();return{x:r.x,y:r.y,width:r.width,fit:el.scrollWidth<=el.clientWidth+1};}));
    assert.equal(geometry.length,2);assert(geometry[0].x>geometry[1].x&&Math.abs(geometry[0].y-geometry[1].y)<1,'history groups remain alongside each other');assert(geometry.every(cell=>cell.fit),'long selected-course labels fit the history summary');
    assert(await page.locator('#expenseHistoryExportV58').evaluate(el=>el.getBoundingClientRect().right<=innerWidth+1));
    const exportBox=await page.locator('#expenseHistoryExportV58').boundingBox(),bellBox=await page.locator('.efc-bell-v13').boundingBox();
    assert(exportBox&&bellBox);assert(exportBox.x+exportBox.width<=bellBox.x||bellBox.x+bellBox.width<=exportBox.x||exportBox.y+exportBox.height<=bellBox.y||bellBox.y+bellBox.height<=exportBox.y,'history export and notification bell never overlap');
    if(output)await page.screenshot({path:path.join(output,`expense-history-split-${width}.png`),fullPage:true});
  }
  await page.setViewportSize({width:1440,height:1000});
  async function preview(rows){
    await page.locator('#expenseHistoryExportV58').click();const frame=page.frameLocator('.receipt-viewer-frame-v13');await frame.locator('#historySaveV58:not([disabled])').waitFor();
    const codes=await frame.locator('.history-report-table-v58 tbody tr td:first-child').allTextContents();
    assert.deepEqual(codes.map(Number).sort((a,b)=>a-b),rows.map(row=>row.receiptNo).sort((a,b)=>a-b),'export includes every filtered receipt even beyond the table viewport');
    assert.equal(new Set(codes).size,rows.length);assert.equal(money(await frame.locator('.history-report-summary-v58:not([hidden]) b').textContent()),amount(rows));
    assert.equal(await frame.locator('.head12').count(),1);assert.equal(await frame.locator('.history-report-table-v58 .expense-history-actions-v13').count(),0);
    return frame;
  }
  let frame=await preview(selected);let pages=await frame.locator('.history-paper-v58').count();assert(pages>1,'the selected course fixture must paginate');
  const downloadEvent=page.waitForEvent('download');await frame.locator('#historySaveV58').click();const download=await downloadEvent;const pdf=fs.readFileSync(await download.path());assert.equal(pdf.subarray(0,5).toString(),'%PDF-');assert.equal((pdf.toString('latin1').match(/\/Type \/Page\b/g)||[]).length,pages);
  if(output)fs.writeFileSync(path.join(output,'filtered-course-expenses.pdf'),pdf);
  await page.locator('#expenseHistoryBranchV13').selectOption('empty',{force:true});assert.equal(await frame.locator('.history-report-table-v58 tbody tr').count(),selected.length,'open preview is an immutable filtered snapshot');
  await page.locator('.receipt-viewer-close-v13').click();selected=await select('a');frame=await preview(selected);assert((await frame.locator('.history-report-table-v58').allTextContents()).join('').includes('مصروف عام'),'center-only PDF preview includes general records');await page.locator('.receipt-viewer-close-v13').click();
  selected=await select('a',general);frame=await preview(selected);assert.equal(await frame.locator('.history-report-table-v58 tbody tr').count(),1,'general-only export excludes every course expense');await page.locator('.receipt-viewer-close-v13').click();
  await select('empty','x');await page.locator('#expenseHistoryExportV58').click();frame=page.frameLocator('.receipt-viewer-frame-v13');await frame.locator('#historySaveV58:not([disabled])').waitFor();assert((await frame.locator('body').textContent()).includes('لا توجد نتائج'));assert.equal(money(await frame.locator('.history-report-summary-v58:not([hidden]) b').textContent()),0);await page.locator('.receipt-viewer-close-v13').click();
  assert.equal(await page.evaluate(()=>JSON.stringify(EFC_DOMAIN_V13.getExpenses())),sourceBefore,'filtering and exports retain canonical source records');
  await page.locator('#backToFinanceV13').click();await page.locator('[data-section=income]').click();assert.equal(await page.locator('#financeBodyV13').innerText(),incomeBefore,'income cards and totals retain their existing behavior');
  await page.evaluate(()=>localStorage.setItem('efc-fiscal-state-v14',JSON.stringify({version:14,config:{anchorDate:'2025-11-11',firstEndDate:'2026-11-10'},archives:[{number:1,first:true,periodStart:'2025-11-11',periodEnd:'2026-11-10',boundary:'2026-11-11',totals:{}}]})));
  await page.reload();await ready();await page.locator('[data-section=expenses]').click();await page.locator('#viewExpenseHistoryV13').click();
  assert.equal(await page.locator('#expenseHistoryBodyV13 .efc-archive-only-v21').count(),1);assert(await page.locator('#expenseHistoryExportV58').isDisabled());
  for(const id of ['expenseHistoryTotalV53','expenseHistoryCourseTotalV65','expenseHistoryGeneralTotalV65','expenseHistoryCourseCountV65','expenseHistoryGeneralCountV65'])assert.equal(await page.locator('#'+id).textContent(),'—','archive guard masks every split value');
  await page.locator('#expenseHistoryModeV13 [data-mode=daily]').click();await page.locator('#expenseHistoryDayV13').fill('2026-11-01');await page.locator('#expenseHistoryDayV13').dispatchEvent('change');
  assert(await page.locator('#expenseHistoryExportV58').isDisabled());for(const id of ['expenseHistoryTotalV53','expenseHistoryCourseTotalV65','expenseHistoryGeneralTotalV65','expenseHistoryCourseCountV65','expenseHistoryGeneralCountV65'])assert.equal(await page.locator('#'+id).textContent(),'—','closed days also mask every split value');
  await page.locator('#expenseHistoryDayV13').fill('2026-11-15');await page.locator('#expenseHistoryDayV13').dispatchEvent('change');
  await check(expected({from:'2026-11-15',to:'2026-11-15'}));assert(!(await page.locator('#expenseHistoryExportV58').isDisabled()),'switching from a locked period to an open day restores all summary fields and export');
  assert.deepEqual(errors,[]);
  console.log('Expense filters v65 browser passed: selected-course labels, split history values/counts, center/course intersections, zero states, date modes and cutoff, full paginated PDF snapshots, source controls, responsive layout, income preservation and archive masks.');
}finally{await browser.close();await new Promise(resolve=>server.close(resolve));}
