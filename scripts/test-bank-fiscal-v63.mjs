// Packaged-app regression for F09. Use an isolated browser profile and fixtures.
import fs from 'node:fs';
import path from 'node:path';
import http from 'node:http';
import assert from 'node:assert/strict';
import {pathToFileURL} from 'node:url';
const moduleName=process.env.EFC_PLAYWRIGHT_MODULE||'playwright';
const {chromium}=await import(path.isAbsolute(moduleName)?pathToFileURL(moduleName).href:moduleName);
const root=path.resolve('dist');
const server=http.createServer((req,res)=>{
  const requested=decodeURIComponent((req.url||'/').split('?')[0]),file=path.resolve(root,'.'+(requested==='/'?'/index.html':requested));
  if(!file.startsWith(root+path.sep))return res.writeHead(403).end();
  try{res.setHeader('Content-Type',file.endsWith('.js')?'application/javascript':file.endsWith('.css')?'text/css':'text/html');res.end(fs.readFileSync(file));}catch{res.writeHead(404).end();}
});
await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
const browser=await chromium.launch({headless:true,...(process.env.EFC_BROWSER_PATH?{executablePath:process.env.EFC_BROWSER_PATH}:{})});
try{
  const context=await browser.newContext({viewport:{width:1440,height:1000},timezoneId:'UTC'}),page=await context.newPage(),dialogs=[],errors=[];
  page.on('pageerror',error=>errors.push(String(error)));page.on('dialog',async dialog=>{dialogs.push(dialog.message());await dialog.accept();});
  await page.clock.setFixedTime(new Date('2026-11-15T12:00:00Z'));
  await page.addInitScript(()=>{
    if(localStorage.getItem('bank-fiscal-test-v63'))return;localStorage.setItem('bank-fiscal-test-v63','1');
    const bank=(id,date,amount)=>({id,recordCode:'record-'+id,receiptNo:id==='closed'?1:2,type:'in',amount,statement:'حركة '+id,date,time:'12:00',createdAt:1,updatedAt:1});
    localStorage.setItem('efc-bank-state-v22',JSON.stringify({entries:[bank('closed','2025-10-01',100),bank('open','2026-11-15',200)],nextReceiptNo:3,tombstones:[]}));
    localStorage.setItem('efc-fiscal-state-v14',JSON.stringify({version:14,config:{anchorDate:'2025-01-01'},archives:[{number:1,boundary:'2026-01-01',periodEnd:'2025-12-31',closedAt:1}],updatedAt:1}));
  });
  const ready=()=>page.waitForFunction(()=>window.EFC_SECURITY_UI_V13?.ready&&window.EFC_FISCAL_V14?.ready&&window.EFC_BANK_V22?.ready);
  await page.goto(`http://127.0.0.1:${server.address().port}/#bank`);await ready();
  const state=()=>page.evaluate(()=>window.EFC_BANK_STATE_V22.snapshot());
  const original=await state();assert.equal(await page.evaluate(()=>EFC_FISCAL_V14.lockedThrough()),'2025-12-31');
  await page.locator('#bankFilterDayV22').fill('2025-10-01');await page.locator('#bankFilterDayV22').dispatchEvent('change');
  await page.locator('.bank-delete-v22').click();assert.deepEqual(await state(),original);assert(dialogs.at(-1).includes('مقفلة'));
  await page.locator('.bank-edit-v22').click();assert.equal(await page.locator('.bank-edit-note-v22').count(),0);assert(dialogs.at(-1).includes('مقفلة'));assert.deepEqual(await state(),original);
  await page.locator('#bankFilterDayV22').fill('2026-11-15');await page.locator('#bankFilterDayV22').dispatchEvent('change');await page.locator('.bank-edit-v22').click();
  await page.locator('#bankAmountV22').fill('900');await page.locator('#bankDateV22').fill('2025-10-01');await page.locator('#bankSaveV22').click();
  assert.deepEqual(await state(),original,'an editable open record cannot be moved into a locked year');assert(dialogs.at(-1).includes('مقفلة'));
  await page.locator('#bankDateV22').fill('2026-11-15');await page.locator('#bankSaveV22').click();await page.waitForFunction(()=>EFC_BANK_STATE_V22.snapshot().entries.find(e=>e.id==='open')?.amount===900);
  const edited=await state();assert.deepEqual(edited.entries.find(e=>e.id==='closed'),original.entries.find(e=>e.id==='closed'));assert.equal(edited.entries.find(e=>e.id==='open').receiptNo,2);assert.equal(edited.entries.find(e=>e.id==='open').recordCode,'record-open');
  await page.locator('#bankAmountV22').fill('50');await page.locator('#bankStatementV22').fill('حركة جديدة للاختبار');await page.locator('#bankDateV22').fill('2025-10-01');await page.locator('#bankSaveV22').click();
  assert.deepEqual(await state(),edited,'new closed-period movement does not allocate a receipt or mutate state');
  await page.locator('#bankDateV22').fill('2026-11-15');await page.locator('#bankSaveV22').click();await page.waitForSelector('.receipt-viewer-v13');await page.locator('.receipt-viewer-close-v13').click();
  assert.equal((await state()).entries.length,3);assert.equal((await state()).nextReceiptNo,4);
  await page.reload();await ready();assert.deepEqual((await state()).entries.find(e=>e.id==='closed'),original.entries.find(e=>e.id==='closed'),'closed record remains immutable after restart');
  assert.deepEqual(errors,[]);
  console.log('Bank browser v63 passed: closed source edit/delete blocked; closed target/new entry blocked before allocation; open edits and new entries persist with stable source identities and unchanged closed history.');
}finally{await browser.close();await new Promise(resolve=>server.close(resolve));}
