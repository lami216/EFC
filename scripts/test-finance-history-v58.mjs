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
      student('old','2026-10-01','a','x',[payment('2026-10-31',200,4),payment('2026-11-01',60,5),payment('2026-11-15',40,6)],{active:false,status:'inactive'}),
      student('unpaid','2026-11-15','a','x',[]),student('other','2026-09-01','b','y',[payment('2026-11-10',90,7)])
    ]));
    const expense=(id,date,branch,specialty,amount,name)=>({id,name,branch,specialty,date,amount,method:'نقداً',time:'12:00',receiptNo:id+1,createdAt:id+1});
    localStorage.setItem('efc-expenses-v11',JSON.stringify([
      ...Array.from({length:140},(_,i)=>expense(i,'2026-11-10','a','x',i+1,`مصروف ${i} · ${i%9===0?'وصف عربي طويل لاختبار التفاف النص داخل الجدول بدون قص المحتوى '.repeat(6):'تشغيل المركز'}`)),
      expense(200,'2026-11-16','a','x',999,'مصروف مستقبلي'),expense(201,'2026-10-31','a','x',75,'مصروف سابق'),expense(202,'2026-11-10','b','y',80,'مصروف الفرع الثاني'),expense(203,'2026-11-10','a','__expense_general__',20,'مصروف عام')
    ]));
    localStorage.setItem('efc-certificate-state-v1',JSON.stringify({certificateReceipts:[{id:'cert',recordCode:'cert-r',transactionCode:'cert-tx',receiptNo:1,studentType:'internal',studentId:'old',studentName:'طالب قديم',specialtyId:'x',specialtyName:'الفرنسية',branchType:'internal',branchId:'a',branchName:'المركز الأول',amount:30,method:'نقداً',date:'2026-11-10',time:'12:00'}]}));
  });
  await page.goto(`http://127.0.0.1:${server.address().port}/#finance`);
  await page.waitForFunction(()=>window.EFC_SECURITY_UI_V13?.ready&&window.EFC_ACCOUNTING_INTEGRITY_V21?.ready);
  await page.waitForSelector('#financeBodyV13 .finance-partition-v58');
  const money=text=>Number(String(text).replace(/[^0-9-]/g,''));
  const kpis=async()=>page.locator('#financeBodyV13>.kpis>.card').allTextContents();
  let cards=await kpis();assert.equal(cards.length,3);assert.equal(money(await page.locator('.finance-kpi-line-v13 b').first().textContent()),340);
  assert.deepEqual(await page.locator('.finance-partition-line-v58 b').allTextContents().then(a=>a.map(money)),[150,190,2,2]);
  const inactiveBefore=await page.evaluate(()=>JSON.stringify(students.find(s=>s.id==='old')));
  const debt=await page.locator('#financeBodyV13>.kpis>.card').nth(2).textContent();
  await page.locator('#branchV13').selectOption('a');await page.locator('#specV13').selectOption('x');
  assert.deepEqual(await page.locator('.finance-partition-line-v58 b').allTextContents().then(a=>a.map(money)),[150,100,2,1]);
  assert.equal(money(await page.locator('.finance-kpi-line-v13 b').first().textContent()),250);
  const filteredDebt=await page.locator('#financeBodyV13>.kpis>.card').nth(2).textContent();
  await page.locator('#financeModeV13 [data-mode=daily]').click();
  assert.deepEqual(await page.locator('.finance-partition-line-v58 b').allTextContents().then(a=>a.map(money)),[0,90,1,2]);
  assert.equal(await page.locator('#financeBodyV13>.kpis>.card').nth(2).textContent(),filteredDebt,'debt must ignore time filter');
  await page.locator('#financeModeV13 [data-mode=weekly]').click();await page.locator('#fromV13').fill('2026-11-15');await page.locator('#fromV13').dispatchEvent('change');await page.locator('#toV13').fill('2026-11-01');await page.locator('#toV13').dispatchEvent('change');
  assert.deepEqual(await page.locator('.finance-partition-line-v58 b').allTextContents().then(a=>a.map(money)),[150,100,2,1],'reversed range must normalize');
  await page.locator('#fromV13').fill('');await page.locator('#fromV13').dispatchEvent('change');
  assert.equal(money(await page.locator('.finance-kpi-line-v13 b').first().textContent()),360,'blank start uses oldest finance date through chosen end');
  await page.locator('#financeModeV13 [data-mode=yearly]').click();
  assert.equal(money(await page.locator('.finance-kpi-line-v13 b').first().textContent()),450);
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
    await page.locator(`#${kind}HistoryExportV58`).click();
    const frame=page.frameLocator('.receipt-viewer-frame-v13');await frame.locator('#historySaveV58:not([disabled])').waitFor();
    assert.equal(await frame.locator('.history-report-table-v58 tbody tr').count(),expected||1);
    assert.equal(await frame.locator('.history-report-table-v58 th').filter({hasText:'الإجراءات'}).count(),0);
    assert.equal(await frame.locator('.head12').count(),await frame.locator('.history-paper-v58').count());
    assert.equal(await frame.locator('.history-report-table-v58 .open-income-receipt-v13').count(),0);
    const fitting=await frame.locator('.history-paper-v58').evaluateAll(pages=>pages.every(p=>p.querySelector('.history-report-summary-v58').getBoundingClientRect().bottom<=p.getBoundingClientRect().bottom-45));assert(fitting,'every page must fit its measured content');
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
  await page.locator('#backToIncomeFinanceV13').click();await page.locator('[data-section=expenses]').click();await page.locator('#viewExpenseHistoryV13').click();
  await page.locator('#expenseHistoryBranchV13').selectOption('a');await page.locator('#expenseHistorySpecV13').selectOption('x');
  if(output)await page.screenshot({path:path.join(output,'expense-history.png'),fullPage:true});
  frame=await preview('expense',140);const pageCount=await frame.locator('.history-paper-v58').count();assert(pageCount>5,'long filtered result must paginate');
  assert.equal(await frame.locator('.history-report-table-v58 tbody tr td:first-child').allTextContents().then(a=>new Set(a).size),140,'every receipt exactly once');
  assert((await frame.locator('.history-report-summary-v58').first().textContent()).includes('140'));
  if(output)await frame.locator('.history-paper-v58').first().screenshot({path:path.join(output,'report-page-1.png')});
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
  assert(await frame.locator('.history-paper-v58').evaluateAll(pages=>pages.every(p=>p.querySelector('.history-report-summary-v58').getBoundingClientRect().bottom<=p.getBoundingClientRect().bottom-45)));
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
  await page.locator('[data-section=expenses]').click();await page.locator('#viewExpenseHistoryV13').click();await page.locator('#expenseHistoryModeV13 [data-mode=monthly]').click();assert(await page.locator('#expenseHistoryExportV58').isDisabled());assert.equal(await page.locator('#expenseHistoryTotalV53').textContent(),'—');assert.equal(await page.locator('#expenseHistoryBodyV13 .efc-archive-only-v21').count(),1);
  assert.deepEqual(errors,[],'browser runtime must stay error-free');
  console.log(`Finance browser v58 passed: dashboard partitions, branch/course/day/reversed/blank/month/year filters, canceled-state preservation, both histories, empty results, general expenses, ${pageCount}-page preview/PDF/native save, snapshot stability and responsive widths.`);
}finally{await browser.close();await new Promise(resolve=>server.close(resolve));}
