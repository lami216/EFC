// Packaged-app regression for F09. Use an isolated browser profile and fixtures.
import fs from 'node:fs';
import path from 'node:path';
import http from 'node:http';
import assert from 'node:assert/strict';
import {pathToFileURL} from 'node:url';
const moduleName=process.env.EFC_PLAYWRIGHT_MODULE||'playwright';
const {chromium}=await import(path.isAbsolute(moduleName)?pathToFileURL(moduleName).href:moduleName);
const root=path.resolve('dist');
const output=process.env.EFC_QA_OUTPUT;if(output)fs.mkdirSync(output,{recursive:true});
const server=http.createServer((req,res)=>{
  const requested=decodeURIComponent((req.url||'/').split('?')[0]),file=path.resolve(root,'.'+(requested==='/'?'/index.html':requested));
  if(!file.startsWith(root+path.sep))return res.writeHead(403).end();
  try{res.setHeader('Content-Type',file.endsWith('.js')?'application/javascript':file.endsWith('.css')?'text/css':'text/html');res.end(fs.readFileSync(file));}catch{res.writeHead(404).end();}
});
await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
const browser=await chromium.launch({headless:true,...(process.env.EFC_BROWSER_PATH?{executablePath:process.env.EFC_BROWSER_PATH}:{})});
let page,phase='initial-boot';const dialogs=[],errors=[],diagnostic={console:[],requests:[],responses:[]};
try{
  const context=await browser.newContext({viewport:{width:1440,height:1000},timezoneId:'UTC'});page=await context.newPage();
  page.on('console',message=>{if(message.type()==='error'||message.type()==='warning')diagnostic.console.push({type:message.type(),text:message.text()});});
  page.on('requestfailed',request=>diagnostic.requests.push({url:request.url(),failure:request.failure()}));
  page.on('response',response=>{if(response.status()>=400)diagnostic.responses.push({url:response.url(),status:response.status()});});
  page.on('pageerror',error=>errors.push(String(error)));page.on('dialog',async dialog=>{dialogs.push(dialog.message());await dialog.accept();});
  await page.clock.setFixedTime(new Date('2026-11-15T12:00:00Z'));
  await page.addInitScript(()=>{
    window.bankFiscalEventsV63=[];
    const capture=event=>{
      if(!['bankAmountV22','bankDateV22','bankStatementV22','bankSaveV22'].includes(event.target?.id))return;
      const value=id=>document.getElementById(id)?.value??null;
      window.bankFiscalEventsV63.push({type:event.type,target:event.target.id,at:performance.now(),active:document.activeElement?.id||'',amount:value('bankAmountV22'),date:value('bankDateV22'),statement:value('bankStatementV22'),editing:Boolean(document.querySelector('.bank-edit-note-v22'))});
      if(window.bankFiscalEventsV63.length>100)window.bankFiscalEventsV63.shift();
    };
    for(const type of ['focusin','input','click'])document.addEventListener(type,capture,true);
    if(localStorage.getItem('bank-fiscal-test-v63'))return;localStorage.setItem('bank-fiscal-test-v63','1');
    const bank=(id,date,amount)=>({id,recordCode:'record-'+id,receiptNo:id==='closed'?1:2,type:'in',amount,statement:'حركة '+id,date,time:'12:00',createdAt:1,updatedAt:1});
    localStorage.setItem('efc-bank-state-v22',JSON.stringify({entries:[bank('closed','2025-10-01',100),bank('open','2026-11-15',200)],nextReceiptNo:3,tombstones:[]}));
    localStorage.setItem('efc-fiscal-state-v14',JSON.stringify({version:14,config:{anchorDate:'2025-01-01'},archives:[{number:1,boundary:'2026-01-01',periodEnd:'2025-12-31',closedAt:1}],updatedAt:1}));
  });
  const ready=()=>page.waitForFunction(()=>window.EFC_SECURITY_UI_V13?.ready&&window.EFC_FISCAL_V14?.ready&&window.EFC_BANK_V22?.ready);
  await page.goto(`http://127.0.0.1:${server.address().port}/#bank`);await ready();
  const state=()=>page.evaluate(()=>window.EFC_BANK_STATE_V22.snapshot());
  const original=await state();assert.equal(await page.evaluate(()=>EFC_FISCAL_V14.lockedThrough()),'2025-12-31');
  phase='closed-source-guards';
  await page.locator('#bankFilterDayV22').fill('2025-10-01');await page.locator('#bankFilterDayV22').dispatchEvent('change');
  await page.locator('.bank-delete-v22').click();assert.deepEqual(await state(),original);assert(dialogs.at(-1).includes('مقفلة'));
  await page.locator('.bank-edit-v22').click();assert.equal(await page.locator('.bank-edit-note-v22').count(),0);assert(dialogs.at(-1).includes('مقفلة'));assert.deepEqual(await state(),original);
  phase='open-edit-closed-target';
  await page.locator('#bankFilterDayV22').fill('2026-11-15');await page.locator('#bankFilterDayV22').dispatchEvent('change');await page.locator('.bank-edit-v22').click();
  await page.locator('#bankAmountV22').fill('900');await page.locator('#bankDateV22').fill('2025-10-01');await page.locator('#bankSaveV22').click();
  assert.deepEqual(await state(),original,'an editable open record cannot be moved into a locked year');assert(dialogs.at(-1).includes('مقفلة'));
  phase='open-edit-save-900';
  await page.locator('#bankDateV22').fill('2026-11-15');await page.locator('#bankSaveV22').click();await page.waitForFunction(()=>EFC_BANK_STATE_V22.snapshot().entries.find(e=>e.id==='open')?.amount===900);
  const edited=await state();assert.deepEqual(edited.entries.find(e=>e.id==='closed'),original.entries.find(e=>e.id==='closed'));assert.equal(edited.entries.find(e=>e.id==='open').receiptNo,2);assert.equal(edited.entries.find(e=>e.id==='open').recordCode,'record-open');
  phase='new-entry-closed-target';
  await page.locator('#bankAmountV22').fill('50');await page.locator('#bankStatementV22').fill('حركة جديدة للاختبار');await page.locator('#bankDateV22').fill('2025-10-01');await page.locator('#bankSaveV22').click();
  assert.deepEqual(await state(),edited,'new closed-period movement does not allocate a receipt or mutate state');
  phase='new-entry-open-target';
  await page.locator('#bankDateV22').fill('2026-11-15');await page.locator('#bankSaveV22').click();await page.waitForSelector('.receipt-viewer-v13');await page.locator('.receipt-viewer-close-v13').click();
  assert.equal((await state()).entries.length,3);assert.equal((await state()).nextReceiptNo,4);
  phase='reload-ready';
  await page.reload();await ready();assert.deepEqual((await state()).entries.find(e=>e.id==='closed'),original.entries.find(e=>e.id==='closed'),'closed record remains immutable after restart');
  assert.deepEqual(errors,[]);
  console.log('Bank browser v63 passed: closed source edit/delete blocked; closed target/new entry blocked before allocation; open edits and new entries persist with stable source identities and unchanged closed history.');
}catch(error){
  diagnostic.phase=phase;diagnostic.dialogs=dialogs;diagnostic.pageErrors=errors;
  if(page)try{diagnostic.runtime=await page.evaluate(()=>({url:location.href,health:window.EFC_STORAGE_HEALTH?.snapshot(),flags:Object.fromEntries(['EFC_CORE_STORAGE_V13','EFC_AUTH_BOOTSTRAP_V13','EFC_REMINDER_STATE_V67','EFC_FOUNDATION_V13','EFC_RECEIPTS_V13','EFC_CERTIFICATES_V13','EFC_DOMAIN_V13','EFC_BANK_V22','EFC_FISCAL_V14','EFC_SECURITY_UI_V13','EFC_ACCOUNTING_INTEGRITY_V21'].map(key=>[key,Boolean(window[key]?.ready)])),scripts:[...document.scripts].map(script=>script.src),bank:window.EFC_BANK_STATE_V22?.snapshot(),fiscal:window.EFC_FISCAL_V14?.getState?.(),controls:Object.fromEntries(['bankAmountV22','bankDateV22','bankStatementV22','bankSaveV22','bankFilterDayV22'].map(id=>{const el=document.getElementById(id);return[id,el?{value:el.value,disabled:el.disabled,text:el.textContent}:null];})),editing:Boolean(document.querySelector('.bank-edit-note-v22')),active:document.activeElement?.id||'',events:window.bankFiscalEventsV63,text:document.body.innerText}));}catch(captureError){diagnostic.captureError=String(captureError);}
  console.error('Bank fiscal regression failure:',JSON.stringify(diagnostic));
  if(output){try{fs.writeFileSync(path.join(output,'bank-fiscal-failure-v63.json'),JSON.stringify(diagnostic,null,2));}catch(captureError){console.error('Bank fiscal diagnostic write failed:',String(captureError));}if(page)await page.screenshot({path:path.join(output,'bank-fiscal-failure-v63.png'),fullPage:true}).catch(()=>{});}
  throw error;
}finally{await browser.close();await new Promise(resolve=>server.close(resolve));}
