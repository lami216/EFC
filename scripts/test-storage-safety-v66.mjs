// Native commands are isolated in-memory fixtures. This does not touch a real
// Tauri database, Windows account, activation file, or production user profile.
import fs from 'node:fs';
import path from 'node:path';
import http from 'node:http';
import assert from 'node:assert/strict';
import {pathToFileURL} from 'node:url';
const moduleName=process.env.EFC_PLAYWRIGHT_MODULE||'playwright';
const {chromium}=await import(path.isAbsolute(moduleName)?pathToFileURL(moduleName).href:moduleName);
const root=path.resolve('dist');
const output=process.env.EFC_QA_OUTPUT;
if(output)fs.mkdirSync(output,{recursive:true});
const server=http.createServer((req,res)=>{
  const pathname=decodeURIComponent((req.url||'/').split('?')[0]);
  const file=path.resolve(root,'.'+(pathname==='/'?'/index.html':pathname));
  if(!file.startsWith(root+path.sep))return res.writeHead(403).end();
  try{res.setHeader('Content-Type',file.endsWith('.js')?'application/javascript':file.endsWith('.css')?'text/css':file.endsWith('.svg')?'image/svg+xml':'text/html');res.end(fs.readFileSync(file));}catch{res.writeHead(404).end();}
});
await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
const browser=await chromium.launch({headless:true,...(process.env.EFC_BROWSER_PATH?{executablePath:process.env.EFC_BROWSER_PATH}:{})});
const errors=[];
try{
  async function boot({failedRead='',staleCache=false,requireLogin=false}={}){
    const context=await browser.newContext({viewport:{width:1440,height:1000},timezoneId:'UTC'});
    const page=await context.newPage();
    page.on('pageerror',error=>errors.push(String(error)));
    page.on('dialog',async dialog=>{
      if(dialog.type()==='confirm'&&dialog.message().includes('نسخة احتياطية')){
        if(page.storageWantBackup)await dialog.accept();else await dialog.dismiss();
      }else await dialog.accept();
    });
    await page.addInitScript(({failedRead,staleCache,requireLogin})=>{
      const course={id:'x',recordCode:'course-x',name:'الفرنسية',courseType:'quick',billing:'one_time',fee:500,quickDays:30,durationValue:30,durationUnit:'day'};
      const certificate={id:'certificate-native',recordCode:'certificate-native-record',transactionCode:'certificate-native-tx',receiptNo:1,studentName:'طالب محفوظ',studentType:'external',phone:'00000000',reg:'1',specialtyId:'x',specialtyName:'الفرنسية',branchType:'certificate',branchId:'cb',branchName:'فرع الشهادات',amount:250,method:'نقداً',date:'2026-11-01',time:'12:00',createdAt:1,timestamp:1,updatedAt:200};
      const nativeMain={version:3,installationId:'storage-test-installation',updatedAt:200,students:[],specialties:[course],paymentMethods:['نقداً'],branches:[{id:'a',name:'المركز الأول'}],security:{users:[]},centerOpsMeta:{updatedAt:200}};
      if(requireLogin)nativeMain.security={users:[{id:'storage-test-admin',username:'Storage Test Admin',role:'admin',permissions:{},pin:{salt:'AAAAAAAAAAAAAAAAAAAAAA',hash:'AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA'}}]};
      const initial={main:nativeMain,certificates:{certificateBranches:[{id:'cb',recordCode:'cb-record',name:'فرع الشهادات',createdAt:1,updatedAt:1}],certificateReceipts:[certificate],nextReceiptNo:2},bank:{entries:[{id:'bank-native',recordCode:'bank-native-record',receiptNo:1,type:'in',amount:75,statement:'حركة محفوظة',date:'2026-11-01',time:'12:00',createdAt:1,updatedAt:200}],nextReceiptNo:2,tombstones:[]}};
      if(!localStorage.getItem('storage-test-seeded-v66')){
        localStorage.setItem('storage-test-seeded-v66','1');
        localStorage.setItem('efc-specialties-v1',JSON.stringify([course]));localStorage.setItem('efc-branches-v13',JSON.stringify(nativeMain.branches));
        localStorage.setItem('efc-state-meta-v1',JSON.stringify({installationId:nativeMain.installationId,updatedAt:1}));
        if(requireLogin)localStorage.setItem('efc-security-v11',JSON.stringify(nativeMain.security));
        if(staleCache){localStorage.setItem('efc-certificate-state-v1',JSON.stringify({...initial.certificates,certificateReceipts:[{...certificate,amount:100,updatedAt:10}]}));localStorage.setItem('efc-bank-state-v22',JSON.stringify({...initial.bank,entries:[{...initial.bank.entries[0],amount:25,updatedAt:10}]}));}
      }
      const native=JSON.parse(sessionStorage.getItem('storage-test-native-v66')||JSON.stringify(initial));
      const qa=window.storageQA={native,events:[],wantBackup:false,failMainWrite:false,failWrites:{certificates:false,bank:false},failReads:{main:false,certificates:false,bank:false},holds:{},pending:{main:0,certificates:0,bank:0}};
      if(failedRead&&!sessionStorage.getItem('storage-test-recovered-'+failedRead))qa.failReads[failedRead]=true;
      qa.holdSave=stream=>{let resolve,reject;const promise=new Promise((yes,no)=>{resolve=yes;reject=no;});qa.holds[stream]={promise,resolve,reject};};
      qa.releaseSave=(stream,error)=>{const hold=qa.holds[stream];delete qa.holds[stream];if(error)hold.reject(Error(error));else hold.resolve();};
      qa.recoverRead=stream=>{qa.failReads[stream]=false;sessionStorage.setItem('storage-test-recovered-'+stream,'1');};
      const reads={load_app_state:'main',load_certificate_state:'certificates',load_bank_state:'bank'};
      const writes={save_app_state:'main',save_certificate_state:'certificates',save_bank_state:'bank'};
      window.__TAURI__={core:{invoke:async(command,payload={})=>{
        if(command==='get_license_status')return{valid:true};
        if(command==='get_license_device_id')return'STORAGE-TEST-DEVICE';
        if(reads[command]){const stream=reads[command];qa.events.push({kind:'read',stream});if(qa.failReads[stream])throw Error('test native '+stream+' read failed');return JSON.stringify(qa.native[stream]);}
        if(writes[command]){
          const stream=writes[command];qa.events.push({kind:'save-start',stream});qa.pending[stream]++;
          try{
            if(qa.holds[stream])await qa.holds[stream].promise;
            if(stream==='main'&&qa.failMainWrite)throw Error('test native main write failed');
            if(qa.failWrites[stream])throw Error('test native '+stream+' write failed');
            qa.native[stream]=JSON.parse(payload.state);sessionStorage.setItem('storage-test-native-v66',JSON.stringify(qa.native));qa.events.push({kind:'save-finish',stream,state:qa.native[stream]});return null;
          }catch(error){qa.events.push({kind:'save-failed',stream});throw error;}
          finally{qa.pending[stream]--;}
        }
        if(command==='export_backup'){qa.events.push({kind:'export'});return'TEST-ONLY-backup.json';}
        if(command==='exit_app'){qa.events.push({kind:'exit'});return null;}
        throw Error('Unexpected mocked native command '+command);
      }}};
    },{failedRead,staleCache,requireLogin});
    await page.goto(`http://127.0.0.1:${server.address().port}/#certificates`);
    await page.waitForFunction(()=>window.EFC_STORAGE_HEALTH&&window.EFC_CORE_STORAGE_V13?.ready);
    if(failedRead!=='main')await ready(page);
    return{page,context};
  }
  const ready=page=>page.waitForFunction(()=>window.EFC_SECURITY_UI_V13?.ready&&window.EFC_CERTIFICATES_V13?.ready&&window.EFC_BANK_V22?.ready);
  const health=page=>page.evaluate(()=>window.EFC_STORAGE_HEALTH.snapshot());
  const resetEvents=page=>page.evaluate(()=>{window.storageQA.events=[];});
  async function checkStatusGeometry(page){
    const boxes=await page.evaluate(()=>{
      const box=selector=>{const element=document.querySelector(selector);if(!element)return null;const rect=element.getBoundingClientRect();return{left:rect.left,right:rect.right,top:rect.top,bottom:rect.bottom};};
      return{banner:box('#efcStorageStatusV66'),sidebar:box('.shell-v13 aside'),bell:box('.efc-bell-v13'),main:box('.shell-v13 main'),viewportHeight:innerHeight,pageHeight:document.documentElement.scrollHeight};
    });
    assert(boxes.banner&&boxes.sidebar&&boxes.bell,'storage warning, sidebar and notification bell are rendered');
    const overlaps=(a,b)=>Math.min(a.right,b.right)>Math.max(a.left,b.left)+1&&Math.min(a.bottom,b.bottom)>Math.max(a.top,b.top)+1;
    assert(!overlaps(boxes.banner,boxes.sidebar),'the visible storage warning must fit beside the sidebar');
    assert(!overlaps(boxes.banner,boxes.bell),'the visible storage warning must leave the notification bell accessible');
    assert(boxes.main&&boxes.main.bottom<=boxes.viewportHeight+1,'the main application viewport fits below the warning');
    assert(boxes.pageHeight<=boxes.viewportHeight+1,'the warning does not push a second full-height application below the viewport');
  }
  async function startClose(page,wantBackup=false){page.storageWantBackup=wantBackup;await page.evaluate(want=>{window.storageQA.wantBackup=want;window.storageQA.closeDone=false;window.EFC_REQUEST_CLOSE_BACKUP().then(()=>window.storageQA.closeDone=true);},wantBackup);}
  {
    const {page,context}=await boot();await page.evaluate(()=>window.EFC_FORCE_PERSIST());await resetEvents(page);
    await page.evaluate(()=>{window.storageQA.holdSave('certificates');window.storageQA.holdSave('bank');});
    await page.locator('#certExternalNameV13').fill('طالب حفظ معلّق');await page.locator('#certExternalRegV13').fill('2');await page.locator('#certExternalSpecV13').selectOption('x');await page.locator('#certExternalBranchV13').selectOption('cb');await page.locator('#certAmountV13').fill('500');await page.locator('#certIssueV13').click();
    await page.waitForFunction(()=>window.storageQA.pending.certificates>0);
    await page.evaluate(()=>window.EFC_RENDER_BANK_V22());await page.locator('#bankAmountV22').fill('125');await page.locator('#bankStatementV22').fill('حركة حفظ معلّق');await page.locator('#bankSaveV22').click();await page.waitForFunction(()=>window.storageQA.pending.bank>0);
    await startClose(page,false);
    assert.equal(await page.evaluate(()=>window.storageQA.events.filter(e=>e.kind==='exit').length),0,'close-without-backup waits for the real pending stream saves');
    await page.evaluate(()=>window.storageQA.releaseSave('certificates'));await page.waitForFunction(()=>window.storageQA.events.some(e=>e.kind==='save-finish'&&e.stream==='certificates'));
    assert.equal(await page.evaluate(()=>window.storageQA.events.filter(e=>e.kind==='exit').length),0,'one flushed stream does not release the close while another is pending');
    await page.evaluate(()=>window.storageQA.releaseSave('bank'));await page.waitForFunction(()=>window.storageQA.closeDone);
    const events=await page.evaluate(()=>window.storageQA.events);assert.equal(events.filter(e=>e.kind==='exit').length,1);assert.equal(events.filter(e=>e.kind==='export').length,0);
    const saved=events.findLast(e=>e.kind==='save-finish'&&e.stream==='main').state;
    assert(saved.certificateReceipts.some(r=>r.studentName==='طالب حفظ معلّق'&&r.amount===500));assert(saved.bankEntries.some(r=>r.statement==='حركة حفظ معلّق'&&r.amount===125));
    assert(events.findLastIndex(e=>e.kind==='save-finish'&&e.stream==='main')<events.findIndex(e=>e.kind==='exit'));
    await context.close();
  }
  for(const stream of ['certificates','bank']){
    const {page,context}=await boot();await page.evaluate(()=>window.EFC_FORCE_PERSIST());await resetEvents(page);
    await page.evaluate(stream=>window.storageQA.holdSave(stream),stream);
    if(stream==='certificates'){
      await page.locator('#certExternalNameV13').fill('شهادة عملية فاشلة');await page.locator('#certExternalRegV13').fill('2');await page.locator('#certExternalSpecV13').selectOption('x');await page.locator('#certExternalBranchV13').selectOption('cb');await page.locator('#certAmountV13').fill('500');await page.locator('#certIssueV13').click();
    }else{
      await page.evaluate(()=>window.EFC_RENDER_BANK_V22());await page.locator('#bankAmountV22').fill('125');await page.locator('#bankStatementV22').fill('حركة عملية فاشلة');await page.locator('#bankSaveV22').click();
    }
    await page.waitForFunction(stream=>window.storageQA.pending[stream]>0,stream);await startClose(page,false);
    await page.evaluate(stream=>window.storageQA.releaseSave(stream,'test one-shot pending rejection'),stream);await page.waitForFunction(()=>window.storageQA.closeDone);
    await page.evaluate(()=>window.EFC_FORCE_PERSIST());
    const result=await page.evaluate(()=>({certificates:window.EFC_CERTIFICATE_STATE_V14.snapshot().certificateReceipts,bank:window.EFC_BANK_STATE_V22.snapshot().entries,native:window.storageQA.native}));
    assert.equal(result.certificates.length,1);assert.equal(result.bank.length,1);
    assert.equal(result.native.certificates.certificateReceipts.length,1);assert.equal(result.native.bank.entries.length,1);
    assert.equal(result.native.main.certificateReceipts.length,1);assert.equal(result.native.main.bankEntries.length,1,'a close retry snapshot taken after a rejected pending operation must retain the completed UI rollback');
    assert.equal(result.native.main.certificateReceipts[0].amount,250);assert.equal(result.native.main.bankEntries[0].amount,75);
    await context.close();
  }
  for(const stream of ['certificates','bank']){
    const {page,context}=await boot();await page.evaluate(()=>window.EFC_FORCE_PERSIST());await resetEvents(page);
    await page.evaluate(stream=>{window.storageQA.failWrites[stream]=true;},stream);
    if(stream==='certificates'){
      await page.evaluate(()=>window.EFC_EDIT_CERTIFICATE_RECEIPT_V13(window.EFC_CERTIFICATE_STATE_V14.snapshot().certificateReceipts[0]));
      await page.locator('#certAmountV13').fill('700');await page.locator('#certIssueV13').click();
    }else{
      await page.evaluate(()=>window.EFC_RENDER_BANK_V22());await page.locator('#bankAmountV22').fill('125');await page.locator('#bankStatementV22').fill('حركة فشل اختباري');await page.locator('#bankSaveV22').click();
    }
    await page.waitForFunction(stream=>window.storageQA.events.some(e=>e.kind==='save-failed'&&e.stream===stream),stream);
    await page.locator('#efcStorageStatusV66').waitFor({state:'visible'});assert.equal((await health(page)).status,'error');
    await startClose(page,false);await page.waitForFunction(()=>window.storageQA.closeDone);assert.equal(await page.evaluate(()=>window.storageQA.events.filter(e=>e.kind==='exit').length),0,'a failed independent stream cannot be bypassed by closing without backup');
    await page.evaluate(stream=>{window.storageQA.failWrites[stream]=false;},stream);await page.locator('#efcStorageRetryV66').click();await page.waitForFunction(()=>window.EFC_STORAGE_HEALTH.snapshot().status==='ok');
    await startClose(page,false);await page.waitForFunction(()=>window.storageQA.closeDone);assert.equal(await page.evaluate(()=>window.storageQA.events.filter(e=>e.kind==='exit').length),1,'an independent stream retry recovers the close pathway');
    await context.close();
  }
  {
    const {page,context}=await boot();await page.evaluate(()=>window.EFC_FORCE_PERSIST());await resetEvents(page);await startClose(page,true);await page.waitForFunction(()=>window.storageQA.closeDone);
    const backupEvents=await page.evaluate(()=>window.storageQA.events);assert(backupEvents.findLastIndex(e=>e.kind==='save-finish'&&e.stream==='main')<backupEvents.findIndex(e=>e.kind==='export'));assert(backupEvents.findIndex(e=>e.kind==='export')<backupEvents.findIndex(e=>e.kind==='exit'));
    await context.close();
  }
  {
    const {page,context}=await boot();await page.evaluate(()=>window.EFC_FORCE_PERSIST());await resetEvents(page);
    await page.evaluate(()=>{window.storageQA.failMainWrite=true;window.EFC_CORE_CHANGED();});await page.waitForFunction(()=>window.storageQA.events.some(e=>e.kind==='save-failed'&&e.stream==='main'));
    await page.locator('#efcStorageStatusV66').waitFor({state:'visible'});assert.equal((await health(page)).status,'error');
    await page.evaluate(()=>window.renderFinance());assert(await page.locator('#efcStorageStatusV66').isVisible(),'save failure remains visible after navigating to a different page');
    await checkStatusGeometry(page);
    if(output)await page.screenshot({path:path.join(output,'storage-write-error-v66.png'),fullPage:true});
    await page.setViewportSize({width:840,height:900});await checkStatusGeometry(page);
    if(output)await page.screenshot({path:path.join(output,'storage-write-error-840-v66.png'),fullPage:true});
    await page.setViewportSize({width:1440,height:1000});
    await startClose(page,false);await page.waitForFunction(()=>window.storageQA.closeDone);assert.equal(await page.evaluate(()=>window.storageQA.events.filter(e=>e.kind==='exit').length),0,'failed persistence prevents exit even when no backup is requested');
    await page.evaluate(()=>{window.storageQA.failMainWrite=false;});await page.locator('#efcStorageRetryV66').click();await page.waitForFunction(()=>window.EFC_STORAGE_HEALTH.snapshot().status==='ok');assert(!(await page.locator('#efcStorageStatusV66').isVisible()));
    await startClose(page,false);await page.waitForFunction(()=>window.storageQA.closeDone);assert.equal(await page.evaluate(()=>window.storageQA.events.filter(e=>e.kind==='exit').length),1,'a successful retry permits a subsequent durable close');
    await context.close();
  }
  for(const failedRead of ['main','certificates','bank']){
    const {page,context}=await boot({failedRead,staleCache:true,requireLogin:failedRead==='main'});
    await page.locator('#efcStorageStatusV66').waitFor({state:'visible'});assert.equal((await health(page)).status,'blocked');
    if(failedRead==='main'){
      await page.waitForSelector('.login-overlay-v13');assert.equal(await page.evaluate(()=>Boolean(window.EFC_FOUNDATION_V13?.ready)),false,'failed storage recovery must be available while login is still waiting, before the heavy UI runtime');
      assert(await page.locator('#efcStorageRetryV66').isEnabled(),'the early recovery control remains usable without completing login');
    }
    await page.evaluate(()=>window.EFC_CORE_CHANGED());
    const rejected=await page.evaluate(async()=>{try{await window.EFC_FORCE_PERSIST();return false;}catch{return true;}});assert(rejected,'a failed boot read blocks an explicit flush');
    assert.equal(await page.evaluate(stream=>window.storageQA.events.filter(e=>e.kind==='save-start'&&e.stream===stream).length,failedRead),0,'a failed native stream read never automatically writes its stale cache');
    await page.evaluate(stream=>window.storageQA.recoverRead(stream),failedRead);
    if(failedRead==='main'){
      await page.setViewportSize({width:840,height:900});
      if(output)await page.screenshot({path:path.join(output,'storage-read-error-login-840-v66.png'),fullPage:true});
      await page.locator('#efcStorageRetryV66').click();
      await page.waitForFunction(()=>window.EFC_STORAGE_HEALTH?.snapshot().status==='ok'&&window.EFC_AUTH_BOOTSTRAP_V13?.ready);
      assert.equal(await page.evaluate(()=>window.storageQA.events.filter(e=>e.kind==='save-start'&&e.stream==='main').length),0,'main read recovery reloads authoritative storage before any replacement write');
      await page.evaluate(()=>window.EFC_AUTH_BOOTSTRAP_V13.setSessionUser('Storage Test Admin'));
      await page.reload();await ready(page);
    }else await page.locator('#efcStorageRetryV66').click();
    await page.waitForFunction(()=>window.EFC_STORAGE_HEALTH.snapshot().status==='ok');
    await page.evaluate(()=>window.EFC_FORCE_PERSIST());
    const persisted=await page.evaluate(()=>window.storageQA.native);
    assert.equal(persisted.certificates.certificateReceipts[0].amount,250,'recovery retains the native certificate revision over the stale cache');assert.equal(persisted.bank.entries[0].amount,75,'recovery retains the native bank revision over the stale cache');
    await context.close();
  }
  assert.deepEqual(errors,[],'native errors are surfaced through the storage status instead of unhandled browser rejections');
  console.log('Storage browser v66 passed: pending certificate/bank flushes, both durable close options, visible save failures and retry, blocked native boot reads and authoritative recovery using isolated native I/O fixtures.');
}finally{await browser.close();await new Promise(resolve=>server.close(resolve));}
