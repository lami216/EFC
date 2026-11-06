// Browser integration/print/PDF regression test. Requires Playwright and a local
// Chromium browser. Optional EFC_PLAYWRIGHT_MODULE and EFC_BROWSER_PATH select
// existing installations; EFC_QA_OUTPUT is an optional screenshot/PDF directory.
import fs from 'node:fs';
import path from 'node:path';
import http from 'node:http';
import {pathToFileURL} from 'node:url';
import assert from 'node:assert/strict';
const moduleName=process.env.EFC_PLAYWRIGHT_MODULE||'playwright';
const {chromium}=await import(path.isAbsolute(moduleName)?pathToFileURL(moduleName).href:moduleName);
const root=path.resolve('dist');
const server=http.createServer((req,res)=>{
  const file=path.resolve(root,'.'+decodeURIComponent((req.url||'/').split('?')[0]==='/'?'/index.html':req.url.split('?')[0]));
  if(!file.startsWith(root+path.sep)){res.writeHead(403).end();return;}
  try{res.setHeader('Content-Type',file.endsWith('.js')?'application/javascript':file.endsWith('.css')?'text/css':file.endsWith('.svg')?'image/svg+xml':file.endsWith('.webp')?'image/webp':'text/html');res.end(fs.readFileSync(file));}catch{res.writeHead(404).end();}
});
await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
const browser=await chromium.launch({headless:true,...(process.env.EFC_BROWSER_PATH?{executablePath:process.env.EFC_BROWSER_PATH}:{})});
const output=process.env.EFC_QA_OUTPUT;if(output)fs.mkdirSync(output,{recursive:true});
try{
  const context=await browser.newContext({viewport:{width:1440,height:1000},timezoneId:'UTC',acceptDownloads:true});
  const page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(String(e)));page.on('dialog',d=>d.dismiss());
  await page.clock.setFixedTime(new Date('2026-11-15T12:00:00Z'));
  await page.addInitScript(()=>{
    if(localStorage.getItem('finance-qa-seeded'))return;localStorage.setItem('finance-qa-seeded','1');
    localStorage.setItem('efc-branches-v13',JSON.stringify([{id:'a',name:'المركز الأول'},{id:'b',name:'المركز الثاني'}]));
    localStorage.setItem('efc-specialties-v1',JSON.stringify([{id:'x',name:'الفرنسية',courseType:'quick',billing:'one_time',fee:1000,durationValue:365,durationUnit:'day'},{id:'y',name:'المعلوماتية',courseType:'quick',billing:'one_time',fee:1000,durationValue:365,durationUnit:'day'}]));
    const payment=(date,amount,n)=>[date,amount,'نقداً','12:00',n,'',`tx-${n}`,null,n];
    const student=(id,date,branch,specialty,payments,extra={})=>({id,recordCode:`r-${id}`,name:`طالب ${id}`,phone:'22223333',registeredAt:date,branch,specialty,reg:id==='new'?1:id==='old'?2:3,start:date,end:'2027-12-01',active:true,status:'active',required:1000,paid:payments.reduce((s,p)=>s+p[1],0),payments,snapshot:{billing:'one_time',fee:1000,durationValue:365,durationUnit:'day'},...extra});
    localStorage.setItem('efc-students-v1',JSON.stringify([
      student('new','2026-11-01','a','x',[payment('2026-11-01',100,1),payment('2026-11-15',50,2),payment('2026-11-16',999,3)]),
      student('old','2026-10-01','a','x',[payment('2026-10-31',200,4),payment('2026-11-01',60,5),payment('2026-11-15',40,6)],{active:false,status:'inactive',required:300,snapshot:{centerOpsV13:true,billing:'one_time',fee:300,durationValue:365,durationUnit:'day'}}),
      student('unpaid','2026-11-15','a','x',[]),student('other','2026-09-01','b','y',[payment('2026-11-10',90,7)])
    ]));
    const expense=(id,date,branch,specialty,amount,name)=>({id,name,branch,specialty,date,amount,method:'نقداً',time:'12:00',receiptNo:id+1,createdAt:id+1});
    localStorage.setItem('efc-expenses-v11',JSON.stringify([
      ...Array.from({length:140},(_,i)=>expense(i,'2026-11-10','a','x',i+1,`مصروف ${i} · ${i%9===0?'وصف عربي طويل لاختبار التفاف النص داخل الجدول بدون قص المحتوى '.repeat(6):'تشغيل المركز'}`)),
      expense(200,'2026-11-16','a','x',999,'مصروف مستقبلي'),expense(201,'2026-10-31','a','x',75,'مصروف سابق'),expense(202,'2026-11-10','b','y',80,'مصروف الفرع الثاني'),expense(203,'2026-11-10','a','__expense_general__',20,'مصروف عام'),
      expense(204,'2026-11-16','a','__expense_general__',400,'مصروف عام مستقبلي'),expense(205,'2026-10-31','a','__expense_general__',30,'مصروف عام سابق'),expense(206,'2026-11-10','b','__expense_general__',40,'مصروف عام في الفرع الثاني')
    ]));
    localStorage.setItem('efc-certificate-state-v1',JSON.stringify({certificateReceipts:[{id:'cert',recordCode:'cert-r',transactionCode:'cert-tx',receiptNo:1,studentType:'internal',studentId:'old',studentName:'طالب قديم',specialtyId:'x',specialtyName:'الفرنسية',branchType:'internal',branchId:'a',branchName:'المركز الأول',amount:30,method:'نقداً',date:'2026-11-10',time:'12:00'}]}));
  });
  await page.goto(`http://127.0.0.1:${server.address().port}/#finance`);
  await page.waitForFunction(()=>window.EFC_SECURITY_UI_V13?.ready&&window.EFC_ACCOUNTING_INTEGRITY_V21?.ready);
  await page.waitForSelector('#financeBodyV13 .finance-partition-v58');
  const money=text=>Number(String(text).replace(/[^0-9-]/g,''));
  const partitionValues=async()=>{const selectors=['[data-income-part="new"] b','[data-income-part="earlier"] b','[data-student-part="new"] b','[data-student-part="earlier"] b'];return await Promise.all(selectors.map(async selector=>money(await page.locator(selector).textContent())));};
  const checkHorizontalCards=async target=>{
    for(const cardName of ['finance-income-card-v59','finance-student-card-v59']){
      const card=target.locator('.'+cardName),cells=card.locator('.finance-horizontal-split-v60>.finance-split-cell-v60');assert.equal(await cells.count(),2);
      const rects=await cells.evaluateAll(items=>items.map(el=>{const r=el.getBoundingClientRect();return{x:r.x,y:r.y,width:r.width,bottom:r.bottom};}));
      assert(rects[0].x>rects[1].x,'new cohort is on the right in RTL');assert(Math.abs(rects[0].y-rects[1].y)<1,'both cohort cells share the same row');assert(Math.abs(rects[0].width-rects[1].width)<1,'equal width halves');
      assert(await cells.evaluateAll(items=>items.every(el=>el.scrollWidth<=el.clientWidth+1)),'labels and values fit each half');
      if(cardName==='finance-income-card-v59'){const total=await card.locator('[data-income-part=total]').boundingBox();assert(total.y>=Math.max(...rects.map(r=>r.bottom))-1,'total is below both income halves');assert(total.width>rects[0].width*1.8,'total spans the card');}
    }
  };
  const kpis=async()=>page.locator('#financeBodyV13>.kpis>.card').allTextContents();
  let cards=await kpis();assert.equal(cards.length,3);assert.equal(money(await page.locator('[data-income-part=total] b').textContent()),340);
  assert.deepEqual(await partitionValues(),[240,100,3,1],'the September-start student whose first actual payment is in November is financially new in November');
  assert.equal(await page.locator('[data-student-part=new]').count(),1,'new count is not repeated');
  assert.deepEqual(await page.locator('.finance-income-card-v59 [data-income-part]').evaluateAll(rows=>rows.map(r=>r.dataset.incomePart)),['new','earlier','total']);
  await checkHorizontalCards(page);
  const inactiveBefore=await page.evaluate(()=>JSON.stringify(students.find(s=>s.id==='old')));
  const debt=await page.locator('#financeBodyV13>.kpis>.card').nth(2).textContent();
  await page.locator('#branchV13').selectOption('a');await page.locator('#specV13').selectOption('x');
  assert.deepEqual(await partitionValues(),[150,100,2,1]);
  assert.equal(money(await page.locator('[data-income-part=total] b').textContent()),250);
  const filteredDebt=await page.locator('#financeBodyV13>.kpis>.card').nth(2).textContent();
  await page.locator('#financeModeV13 [data-mode=daily]').click();
  assert.deepEqual(await partitionValues(),[0,90,1,1]);
  assert.equal(await page.locator('#financeBodyV13>.kpis>.card').nth(2).textContent(),filteredDebt,'debt must ignore time filter');
  await page.locator('#financeModeV13 [data-mode=weekly]').click();await page.locator('#fromV13').fill('2026-11-15');await page.locator('#fromV13').dispatchEvent('change');await page.locator('#toV13').fill('2026-11-01');await page.locator('#toV13').dispatchEvent('change');
  assert.deepEqual(await partitionValues(),[150,100,2,1],'reversed range must normalize');
  await page.locator('#fromV13').fill('');await page.locator('#fromV13').dispatchEvent('change');
  assert.equal(money(await page.locator('[data-income-part=total] b').textContent()),360,'blank start uses oldest finance date through chosen end');
  await page.locator('#financeModeV13 [data-mode=yearly]').click();
  assert.equal(money(await page.locator('[data-income-part=total] b').textContent()),450);
  assert.equal(await page.evaluate(()=>JSON.stringify(students.find(s=>s.id==='old'))),inactiveBefore,'view/filter operations must not reactivate canceled students');
  await page.locator('#financeModeV13 [data-mode=monthly]').click();
  if(output)await page.screenshot({path:path.join(output,'income-dashboard.png'),fullPage:true});
  await page.locator('#viewIncomeHistoryV13').click();
  assert.equal(await page.locator('.finance-partition-v58').count(),0,'history gets export only');
  // Test the real table/filter/export pipeline in all four modes.
  await page.locator('#incomeHistoryBranchV13').selectOption('a');await page.locator('#incomeHistorySpecV13').selectOption('x');
  assert.equal(await page.locator('#incomeHistoryBodyV13 tbody tr').count(),4);
  const preview=async(kind,expected)=>{
    const tableRows=await page.locator(`#${kind}HistoryBodyV13 tbody tr`).count();assert.equal(tableRows,expected);
    const selectedBranch=await page.locator(`#${kind}HistoryBranchV13 option:checked`).textContent(),selectedCourse=await page.locator(`#${kind}HistorySpecV13 option:checked`).textContent();
    await page.locator(`#${kind}HistoryExportV58`).click();
    const frame=page.frameLocator('.receipt-viewer-frame-v13');await frame.locator('#historySaveV58:not([disabled])').waitFor();
    assert.equal(await frame.locator('.history-report-table-v58 tbody tr').count(),expected||1);
    assert.equal(await frame.locator('.history-report-table-v58 th').filter({hasText:'الإجراءات'}).count(),0);
    assert.equal(await frame.locator('.head12').count(),1,'EFC branding appears on the first page only');
    const pages=await frame.locator('.history-paper-v58').count();
    assert.deepEqual(await frame.locator('.history-report-title-v59 h2').allTextContents(),[kind==='income'?'سجل المداخيل':'سجل المصاريف']);
    assert.equal(await frame.locator('[data-report-field=from]').count(),1);assert.equal(await frame.locator('[data-report-field=to]').count(),1);
    assert.equal(await frame.locator('.history-report-table-v58 thead').count(),pages,'column labels remain on every page');
    assert.equal(await frame.locator('[data-report-page=continuation] .history-report-meta-v58').count(),0);
    assert.equal(await frame.locator('.history-report-summary-v58:not([hidden])').count(),1,'aggregate appears once at the end');
    assert(await frame.locator('.history-paper-v58').last().locator('.history-report-summary-v58').isVisible());
    assert((await frame.locator('[data-report-field=extracted]').first().textContent()).includes('15/11/2026'));
    assert((await frame.locator('[data-report-field=extracted]').first().textContent()).includes('12:00:00'));
    assert.equal(await frame.locator('[data-report-field=branch] b').first().textContent(),selectedBranch);
    assert.equal(await frame.locator('[data-report-field=course] b').first().textContent(),selectedCourse);
    assert.equal(await frame.locator('.history-report-title-v59 h2').first().evaluate(el=>getComputedStyle(el).color),kind==='expense'?'rgb(169, 50, 61)':'rgb(8, 99, 79)');
    assert.equal(new Set(await frame.locator('[data-report-field=extracted]').allTextContents()).size,1,'extraction timestamp must be identical on all pages');
    assert.equal(await frame.locator('.history-report-table-v58 .open-income-receipt-v13').count(),0);
    const fitting=await frame.locator('.history-paper-v58').evaluateAll(pages=>pages.every(p=>Math.max(p.querySelector('.history-report-table-v58').getBoundingClientRect().bottom,p.querySelector('.history-report-summary-v58').getBoundingClientRect().bottom)<=p.getBoundingClientRect().bottom-45));assert(fitting,'every table and final total must fit its page');
    return frame;
  };
  let frame=await preview('income',4);
  assert(!(await frame.locator('.history-report-table-v58').textContent()).includes('رسوم شهادة'),'certificate stream must stay separate');
  await page.locator('.receipt-viewer-close-v13').click();
  await page.locator('#incomeHistoryModeV13 [data-mode=daily]').click();await preview('income',2);await page.locator('.receipt-viewer-close-v13').click();
  await page.locator('#incomeHistoryModeV13 [data-mode=weekly]').click();await page.locator('#incomeHistoryFromV13').fill('2026-11-15');await page.locator('#incomeHistoryFromV13').dispatchEvent('change');await page.locator('#incomeHistoryToV13').fill('2026-11-01');await page.locator('#incomeHistoryToV13').dispatchEvent('change');
  await preview('income',4);await page.locator('.receipt-viewer-close-v13').click();
  await page.locator('#incomeHistoryFromV13').fill('');await page.locator('#incomeHistoryFromV13').dispatchEvent('change');await preview('income',3);await page.locator('.receipt-viewer-close-v13').click();
  await page.locator('#incomeHistoryModeV13 [data-mode=yearly]').click();await preview('income',5);await page.locator('.receipt-viewer-close-v13').click();
  await page.locator('#incomeHistoryBranchV13').selectOption('b');await page.locator('#incomeHistorySpecV13').selectOption('x');
  assert.equal(money(await page.locator('#incomeHistoryTotalV53').textContent()),0);
  await page.locator('#incomeHistoryExportV58').click();frame=page.frameLocator('.receipt-viewer-frame-v13');await frame.locator('#historySaveV58:not([disabled])').waitFor();assert((await frame.locator('body').textContent()).includes('لا توجد نتائج'));await page.locator('.receipt-viewer-close-v13').click();
  await page.locator('#backToIncomeFinanceV13').click();await page.locator('[data-section=expenses]').click();
  const expenseCards=async()=>{
    const values=[];
    for(const card of ['count','total']){
      const group=page.locator(`.finance-expense-${card}-card-v53`);
      values.push(await Promise.all(['course','general','total'].map(async part=>money(await group.locator(`[data-expense-part=${part}]`).textContent()))));
    }
    return values;
  };
  const expensesBefore=await page.evaluate(()=>JSON.stringify(EFC_DOMAIN_V13.getExpenses()));
  assert.equal(await page.locator('#specV13 option[value="__expense_general__"]').count(),0,'general expenses are outside the main expense course filter');
  assert.deepEqual(await expenseCards(),[[141,2,143],[9950,60,10010]],'both groups follow the selected month and exclude future expenses');
  await page.locator('#branchV13').selectOption('a');await page.locator('#specV13').selectOption('x');
  assert.deepEqual(await expenseCards(),[[140,1,141],[9870,20,9890]],'course selection leaves this center’s general expenses visible');
  await page.locator('#specV13').selectOption('y');assert.deepEqual(await expenseCards(),[[0,1,1],[0,20,20]],'no matching course expenses does not hide the general group');
  await page.locator('#branchV13').selectOption('b');assert.deepEqual(await expenseCards(),[[1,1,2],[80,40,120]],'center selection scopes both groups');
  await page.locator('#branchV13').selectOption('a');await page.locator('#specV13').selectOption('x');
  await page.locator('#financeModeV13 [data-mode=daily]').click();assert.deepEqual(await expenseCards(),[[0,0,0],[0,0,0]]);
  await page.locator('#dayV13').fill('2026-11-10');await page.locator('#dayV13').dispatchEvent('change');assert.deepEqual(await expenseCards(),[[140,1,141],[9870,20,9890]]);
  await page.locator('#financeModeV13 [data-mode=weekly]').click();await page.locator('#fromV13').fill('2026-10-31');await page.locator('#fromV13').dispatchEvent('change');await page.locator('#toV13').fill('2026-11-10');await page.locator('#toV13').dispatchEvent('change');
  assert.deepEqual(await expenseCards(),[[141,2,143],[9945,50,9995]],'explicit range includes both groups from the chosen dates');
  await page.locator('#financeModeV13 [data-mode=yearly]').click();assert.deepEqual(await expenseCards(),[[141,2,143],[9945,50,9995]],'year total includes prior months and still excludes future expenses');
  await page.locator('#financeModeV13 [data-mode=monthly]').click();
  for(const width of [1440,1024,840]){
    await page.setViewportSize({width,height:900});
    for(const kind of ['count','total']){
      const card=page.locator(`.finance-expense-${kind}-card-v53`),cells=card.locator('.finance-split-cell-v60');
      const rects=await cells.evaluateAll(elements=>elements.map(el=>{const r=el.getBoundingClientRect();return{x:r.x,y:r.y,bottom:r.bottom,width:r.width,fit:el.scrollWidth<=el.clientWidth+1};}));
      assert.equal(rects.length,2);assert(rects[0].x>rects[1].x&&Math.abs(rects[0].y-rects[1].y)<1&&Math.abs(rects[0].width-rects[1].width)<1,'expense groups share an evenly split RTL row');
      assert(rects.every(r=>r.fit),'expense group labels and values fit their halves');
      const total=await card.locator('.finance-expense-split-total-v64').boundingBox();assert(total.y>=Math.max(...rects.map(r=>r.bottom))-1,'expense total sits below both groups');
    }
    if(output)await page.screenshot({path:path.join(output,`expense-dashboard-${width}.png`)});
  }
  await page.setViewportSize({width:1440,height:1000});
  await page.locator('[data-section=profit]').click();assert.equal(money(await page.locator('#financeBodyV13>.kpis>.card').nth(1).locator('b').textContent()),9870,'course profitability excludes general expenses as before');
  assert.equal(await page.locator('#specV13 option[value="__expense_general__"]').count(),1,'profit keeps the general expense filter');
  await page.locator('[data-section=expenses]').click();assert.deepEqual(await expenseCards(),[[140,1,141],[9870,20,9890]]);
  assert.equal(await page.evaluate(()=>JSON.stringify(EFC_DOMAIN_V13.getExpenses())),expensesBefore,'display filters never rewrite expense records');
  await page.locator('#viewExpenseHistoryV13').click();
  await page.locator('#expenseHistoryBranchV13').selectOption('a');await page.locator('#expenseHistorySpecV13').selectOption('x');
  if(output)await page.screenshot({path:path.join(output,'expense-history.png'),fullPage:true});
  frame=await preview('expense',140);const pageCount=await frame.locator('.history-paper-v58').count();assert(pageCount>1&&pageCount<20,'compact continuation pages must improve on the previous 20-page fixture');
  const rowCounts=await frame.locator('.history-paper-v58').evaluateAll(pages=>pages.map(p=>p.querySelectorAll('tbody tr').length));assert(rowCounts[1]>rowCounts[0],'continuation page reuses the space freed by the first-page header');
  assert.equal(await frame.locator('.history-report-table-v58 tbody tr td:first-child').allTextContents().then(a=>new Set(a).size),140,'every receipt exactly once');
  assert((await frame.locator('.history-report-summary-v58:not([hidden])').textContent()).includes('140'));
  if(output)await frame.locator('.history-paper-v58').first().screenshot({path:path.join(output,'report-page-1.png')});
  if(output){await frame.locator('.history-paper-v58').nth(1).screenshot({path:path.join(output,'report-page-2.png')});await frame.locator('.history-paper-v58').last().screenshot({path:path.join(output,'report-page-last.png')});}
  await frame.locator('body').evaluate(()=>{window.print=()=>{window.qaPrintCalls=(window.qaPrintCalls||0)+1;};});
  await frame.locator('#historyPrintV58').click();assert.equal(await frame.locator('body').evaluate(()=>window.qaPrintCalls),1);
  const printPage=await context.newPage();await printPage.setContent(await frame.locator('html').evaluate(el=>el.outerHTML));
  const printed=await printPage.pdf({preferCSSPageSize:true,printBackground:true});
  assert.equal((printed.toString('latin1').match(/\/Type \/Page\b/g)||[]).length,pageCount,'browser print must preserve the paginated report');
  if(output)fs.writeFileSync(path.join(output,'expense-history-print.pdf'),printed);await printPage.close();
  // Exercise the real local html2canvas/jsPDF path and inspect the download.
  const downloadEvent=page.waitForEvent('download');await frame.locator('#historySaveV58').click();const download=await downloadEvent;
  const pdf=fs.readFileSync(await download.path());assert.equal(pdf.subarray(0,5).toString(),'%PDF-');
  assert.equal((pdf.toString('latin1').match(/\/Type \/Page\b/g)||[]).length,pageCount,'saved PDF must contain every preview page');
  if(output)fs.writeFileSync(path.join(output,'expense-history.pdf'),pdf);
  // Native bridge save/cancel uses the existing licensed command, no silent downloads.
  await page.evaluate(()=>{window.__TAURI__={core:{invoke:async(command,args)=>{window.qaSaved={command,fileName:args.fileName,prefix:atob(args.dataBase64).slice(0,5)};return null;}}};});
  await frame.locator('#historySaveV58:not([disabled])').waitFor();await frame.locator('#historySaveV58').click();await page.waitForFunction(()=>window.qaSaved);
  assert.equal(await page.evaluate(()=>qaSaved.command),'save_receipt_pdf');assert.equal(await page.evaluate(()=>qaSaved.prefix),'%PDF-');
  await frame.locator('#historySaveV58:not([disabled])').waitFor();
  // Preview immutability when the underlying filter changes programmatically.
  await page.locator('#expenseHistoryBranchV13').selectOption('b',{force:true});assert.equal(await frame.locator('.history-report-table-v58 tbody tr').count(),140);
  await page.locator('.receipt-viewer-close-v13').click();
  await page.locator('#expenseHistoryBranchV13').selectOption('a');await page.locator('#expenseHistorySpecV13').selectOption('__expense_general__');await preview('expense',1);await page.locator('.receipt-viewer-close-v13').click();
  await page.locator('#expenseHistorySpecV13').selectOption('x');await page.locator('#expenseHistoryModeV13 [data-mode=daily]').click();assert.equal(money(await page.locator('#expenseHistoryTotalV53').textContent()),0);
  await page.locator('#expenseHistoryModeV13 [data-mode=weekly]').click();await page.locator('#expenseHistoryFromV13').fill('2026-11-10');await page.locator('#expenseHistoryFromV13').dispatchEvent('change');await page.locator('#expenseHistoryToV13').fill('2026-11-10');await page.locator('#expenseHistoryToV13').dispatchEvent('change');assert.equal(await page.locator('#expenseHistoryBodyV13 tbody tr').count(),140);
  await page.locator('#expenseHistoryModeV13 [data-mode=yearly]').click();assert.equal(await page.locator('#expenseHistoryBodyV13 tbody tr').count(),141);
  for(const width of [1440,1024,840]){await page.setViewportSize({width,height:900});assert(await page.locator('#expenseHistoryExportV58').isVisible());assert(await page.locator('#expenseHistoryExportV58').evaluate(el=>el.getBoundingClientRect().right<=innerWidth+1));if(output)await page.screenshot({path:path.join(output,`history-${width}.png`)});}
  await page.evaluate(()=>{delete window.__TAURI__;const D=window.EFC_DOMAIN_V13;D.saveExpenses([...D.getExpenses(),{id:'giant',name:'وصف طويل جدًا '.repeat(1000),amount:10,branch:'a',specialty:'x',method:'نقداً',date:'2026-11-15',time:'12:00',receiptNo:999}]);});
  await page.locator('#expenseHistoryModeV13 [data-mode=daily]').click();await page.locator('#expenseHistoryDayV13').fill('2026-11-15');await page.locator('#expenseHistoryDayV13').dispatchEvent('change');
  await page.locator('#expenseHistoryExportV58').click();frame=page.frameLocator('.receipt-viewer-frame-v13');await frame.locator('#historySaveV58:not([disabled])').waitFor();
  assert((await frame.locator('.history-paper-v58').count())>1,'one oversized description must continue across pages');
  const originalDescription=await page.evaluate(()=>window.EFC_DOMAIN_V13.getExpenses().find(e=>e.id==='giant').name),exportedDescription=await frame.locator('.history-report-table-v58 tbody tr td:nth-child(4)').allTextContents().then(a=>a.join(''));
  assert(exportedDescription===originalDescription,'continuation pages preserve every character of the canonical description');
  assert(await frame.locator('.history-paper-v58').evaluateAll(pages=>pages.every(p=>Math.max(p.querySelector('.history-report-table-v58').getBoundingClientRect().bottom,p.querySelector('.history-report-summary-v58').getBoundingClientRect().bottom)<=p.getBoundingClientRect().bottom-45)));
  await page.locator('.receipt-viewer-close-v13').click();
  // Real fiscal state: closed details may have been cleaned, so neither histories
  // nor new dashboard cards may pretend a live subset is the complete total.
  await page.evaluate(()=>localStorage.setItem('efc-fiscal-state-v14',JSON.stringify({version:14,config:{anchorDate:'2025-11-11',firstEndDate:'2026-11-10'},archives:[{number:1,first:true,periodStart:'2025-11-11',periodEnd:'2026-11-10',boundary:'2026-11-11',totals:{}}]})));
  await page.reload();await page.waitForFunction(()=>window.EFC_ACCOUNTING_INTEGRITY_V21?.ready&&window.EFC_SECURITY_UI_V13?.ready);await page.waitForSelector('#financeBodyV13 .efc-archive-only-v21');
  assert.equal(await page.locator('#financeBodyV13 .finance-partition-v58').count(),0);
  await page.locator('#viewIncomeHistoryV13').click();assert(await page.locator('#incomeHistoryExportV58').isDisabled());assert.equal(await page.locator('#incomeHistoryTotalV53').textContent(),'—');assert.equal(await page.locator('#incomeHistoryBodyV13 .efc-archive-only-v21').count(),1);
  await page.locator('#incomeHistoryModeV13 [data-mode=daily]').click();await page.locator('#incomeHistoryDayV13').fill('2026-11-01');await page.locator('#incomeHistoryDayV13').dispatchEvent('change');assert(await page.locator('#incomeHistoryExportV58').isDisabled());
  await page.locator('#incomeHistoryDayV13').fill('2026-11-15');await page.locator('#incomeHistoryDayV13').dispatchEvent('change');assert(!(await page.locator('#incomeHistoryExportV58').isDisabled()));
  await page.locator('#backToIncomeFinanceV13').click();await page.locator('#financeModeV13 [data-mode=weekly]').click();await page.locator('#fromV13').fill('2026-11-11');await page.locator('#fromV13').dispatchEvent('change');await page.locator('#toV13').fill('2026-11-15');await page.locator('#toV13').dispatchEvent('change');
  await page.waitForSelector('.finance-partition-v58');await page.evaluate(()=>window.EFC_ACCOUNTING_INTEGRITY_V21.guardFinanceViews());assert.equal(await page.locator('#financeBodyV13 .efc-archive-only-v21').count(),0,'weekly fiscal guard must not use the whole calendar year');
  await page.locator('[data-section=expenses]').click();await page.locator('#financeModeV13 [data-mode=monthly]').click();
  assert.equal(await page.locator('#financeBodyV13 .efc-archive-only-v21').count(),1);assert.equal(await page.locator('[data-expense-part]').count(),0,'split expense values are hidden for mixed fiscal periods');
  await page.locator('#viewExpenseHistoryV13').click();await page.locator('#expenseHistoryModeV13 [data-mode=monthly]').click();assert(await page.locator('#expenseHistoryExportV58').isDisabled());assert.equal(await page.locator('#expenseHistoryTotalV53').textContent(),'—');assert.equal(await page.locator('#expenseHistoryBodyV13 .efc-archive-only-v21').count(),1);
  assert.deepEqual(errors,[],'browser runtime must stay error-free');
  // Restore the same realistic backup supplied to the user. Independent expected
  // totals: 48 earlier payers, of whom 41 have fully settled obligations at Nov 1.
  const demoContext=await browser.newContext({viewport:{width:1440,height:1000},timezoneId:'UTC'}),demo=await demoContext.newPage();
  demo.on('pageerror',e=>errors.push(String(e)));demo.on('dialog',d=>d.dismiss());await demo.clock.setFixedTime(new Date('2026-11-01T16:30:00Z'));
  await demo.goto(`http://127.0.0.1:${server.address().port}/#finance`);
  const demoReady=()=>demo.waitForFunction(()=>window.EFC_SECURITY_UI_V13?.ready&&window.EFC_ACCOUNTING_INTEGRITY_V21?.ready);await demoReady();
  const backup=JSON.parse(fs.readFileSync('docs/sample-data/EFC-Demo-2026-11-01.json','utf8'));
  await demo.evaluate(async data=>await window.EFC_APPLY_RESTORED_STATE(data),backup);await demo.reload();await demoReady();
  assert.equal(money(await demo.locator('[data-student-part=new] b').textContent()),30);
  assert.equal(money(await demo.locator('[data-student-part=earlier] b').textContent()),41);
  assert.equal(money(await demo.locator('[data-income-part=new] b').textContent()),72900);assert.equal(money(await demo.locator('[data-income-part=earlier] b').textContent()),106500);assert.equal(money(await demo.locator('[data-income-part=total] b').textContent()),179400);
  assert.equal(money(await demo.locator('#financeBodyV13>.kpis>.card').nth(2).locator('b').textContent()),53400,'aggregate debt is unchanged');
  for(const [branch,count] of [['demo-center-1',14],['demo-center-2',13],['demo-center-3',14]]){await demo.locator('#branchV13').selectOption(branch);assert.equal(money(await demo.locator('[data-student-part=earlier] b').textContent()),count);}
  await demo.locator('#branchV13').selectOption('');assert.equal(await demo.evaluate(()=>students.filter(s=>s.active===false).length),2);
  for(const width of [1440,1024,840]){await demo.setViewportSize({width,height:900});await checkHorizontalCards(demo);if(output)await demo.screenshot({path:path.join(output,`demo-income-horizontal-${width}.png`),fullPage:true});}
  await demoContext.close();assert.deepEqual(errors,[]);
  console.log(`Finance browser v64 passed: first-page-only branding/filters, compact continuation rows, final total once, ${pageCount} pages instead of 20, PDF/print/native save and oversized text; independent general-expense display, RTL geometry, unchanged profitability and financial totals, all filters, source states and fiscal guards.`);
}finally{await browser.close();await new Promise(resolve=>server.close(resolve));}
