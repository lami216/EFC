import fs from 'node:fs';
import path from 'node:path';
import http from 'node:http';
import assert from 'node:assert/strict';
import {pathToFileURL} from 'node:url';
const moduleName=process.env.EFC_PLAYWRIGHT_MODULE||'playwright';
const {chromium}=await import(path.isAbsolute(moduleName)?pathToFileURL(moduleName).href:moduleName);
const root=path.resolve('dist'),output=process.env.EFC_QA_OUTPUT;if(output)fs.mkdirSync(output,{recursive:true});
const server=http.createServer((req,res)=>{const url=(req.url||'/').split('?')[0],file=path.resolve(root,'.'+decodeURIComponent(url==='/'?'/index.html':url));if(!file.startsWith(root+path.sep))return res.writeHead(403).end();try{res.setHeader('Content-Type',file.endsWith('.js')?'application/javascript':file.endsWith('.css')?'text/css':'text/html');res.end(fs.readFileSync(file));}catch{res.writeHead(404).end();}});
await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
const browser=await chromium.launch({headless:true,...(process.env.EFC_BROWSER_PATH?{executablePath:process.env.EFC_BROWSER_PATH}:{})}),errors=[];
const pay=(date,amount,code,n=1)=>[date,amount,'نقداً','12:00',n,'',code,1,n,null,[{monthNumber:1,amount}],n];
const student=payments=>({id:'monthly-audit',recordCode:'monthly-audit',name:'طالب الاختبار الشهري',phone:'00000000',branch:'a',specialty:'monthly',reg:1,start:'2026-11-01',end:'',active:true,status:'active',payments,required:500,paid:payments.reduce((n,p)=>n+p[1],0),snapshot:{centerOpsV13:true,dynamicMonthly:true,billing:'monthly',fee:500,durationValue:1,durationUnit:'month'},debtDueDates:{}});
const ready=page=>page.waitForFunction(()=>window.EFC_SECURITY_UI_V13?.ready&&window.EFC_ACCOUNTING_INTEGRITY_V21?.ready);
async function pageFor(s,extra={}){const context=await browser.newContext({viewport:{width:1440,height:1000},timezoneId:'UTC'}),page=await context.newPage();page.dialogs=[];page.acceptDeletion=false;page.on('pageerror',e=>errors.push(String(e)));page.on('dialog',d=>{page.dialogs.push(d.message());return d.type()==='confirm'&&page.acceptDeletion?d.accept():d.dismiss();});await page.clock.setFixedTime(new Date('2026-11-15T12:00:00Z'));await page.addInitScript(({s,extra})=>{if(localStorage.getItem('monthly-audit'))return;localStorage.setItem('monthly-audit','1');localStorage.setItem('efc-branches-v13',JSON.stringify([{id:'a',name:'مركز الاختبار'}]));localStorage.setItem('efc-specialties-v1',JSON.stringify([{id:'monthly',name:'دورة شهرية',courseType:'normal',billing:'monthly',fee:500,durationValue:1,durationUnit:'month'}]));localStorage.setItem('efc-students-v1',JSON.stringify([s]));for(const [key,value]of Object.entries(extra))localStorage.setItem(key,JSON.stringify(value));},{s,extra});await page.goto(`http://127.0.0.1:${server.address().port}/#students`);await ready(page);return page;}
async function openStudentFinance(page){await page.locator('#studentsTableV13 tr[data-id="monthly-audit"]').click();await page.locator('.open-finance-v13').click();}
async function sourceReceipt(page,selector){await page.locator(selector).click();const frame=await(await page.locator('.receipt-viewer-frame-v13').elementHandle()).contentFrame();await frame.waitForSelector('.actions12');return{f:frame,model:await frame.evaluate(()=>RECEIPT)};}
async function allocation(page){return page.evaluate(()=>{const s=students[0],D=EFC_DOMAIN_V13,a=D.dynamicAllocation(s);return{paid:s.payments.reduce((n,p)=>n+p[1],0),allocated:a.allocations.reduce((n,p)=>n+p.amount,0),unallocated:a.unallocated.reduce((n,p)=>n+p.amount,0),plan:D.installmentPlan(s).map(m=>m.paid),paymentCount:s.payments.length};});}
async function monthReceipt(page,n){await page.evaluate(()=>{document.querySelectorAll('.modal').forEach(m=>m.remove());openStudent(students[0].id,'finance');});await page.locator(`.month-receipt-v13[data-month="${n}"]`).click();const f=page.frameLocator('.receipt-viewer-frame-v13');await f.locator('.edit12').waitFor();const model=await page.frames().find(f=>f.url()==='about:srcdoc').evaluate(()=>RECEIPT);return{f,model};}
try{
  const topup=await pageFor(student([pay('2026-11-01',200,'first')]));await topup.evaluate(()=>openStudent(students[0].id,'finance'));await topup.locator('.prepay-next-v14').click();await topup.locator('#paymentFormPrepayV14 [name=amount]').fill('500');
  const preview=await topup.locator('#prepayPreviewV14').innerText();assert(preview.includes('إكمال الشهر 1')&&preview.includes('300')&&preview.includes('جزء من الشهر 2')&&preview.includes('200'),'preview accounts for the existing 200 and explains 300+200 split');
  await topup.locator('#paymentFormPrepayV14 button[type=submit]').click();await topup.waitForFunction(()=>students[0].payments.length===2);await topup.locator('.receipt-mini-v4').waitFor();assert.deepEqual(await allocation(topup),{paid:700,allocated:700,unallocated:0,plan:[500,200],paymentCount:2});
  let receipt=await monthReceipt(topup,1);assert.equal(receipt.model.amount,500);assert.equal(receipt.model.receiptSource,'derived-month');assert.equal(receipt.model.editableReceipt,false);assert.equal(receipt.model.registrationReceipt,false);assert.equal(receipt.model.paymentIndex,null);assert.equal(await receipt.f.locator('.edit12').isDisabled(),true);assert.equal(await receipt.f.locator('.efc-source-delete-receipt-v21').count(),0,'aggregated month receipt offers no source deletion');
  const before=await topup.evaluate(()=>JSON.stringify(students));assert.equal(await topup.evaluate(model=>EFC_ACCOUNTING_INTEGRITY_V21.deleteStudentPaymentSource(model),receipt.model),false);assert.equal(await topup.evaluate(()=>JSON.stringify(students)),before,'direct derived-source delete is rejected without touching the student');
  receipt=await monthReceipt(topup,2);assert.equal(receipt.model.amount,200);assert.equal(receipt.model.receiptSource,'derived-month');assert(await receipt.f.locator('.edit12').isDisabled());assert.equal(await receipt.f.locator('.efc-source-delete-receipt-v21').count(),0);
  if(output)await topup.screenshot({path:path.join(output,'monthly-derived-safe.png'),fullPage:true});await topup.reload();await ready(topup);assert.equal((await allocation(topup)).allocated,700);
  const split=student([pay('2026-11-01',1000,'two-months')]);split.payments[0][10]=[{monthNumber:1,amount:500},{monthNumber:2,amount:500}];const splitPage=await pageFor(split);receipt=await monthReceipt(splitPage,2);assert.equal(receipt.model.amount,500);assert.equal(receipt.model.registrationReceipt,false);assert.equal(receipt.model.transactionCode,'');assert.equal(receipt.model.paymentIndex,null);assert(await receipt.f.locator('.edit12').isDisabled());assert.equal(await receipt.f.locator('.efc-source-delete-receipt-v21').count(),0);assert.equal(await splitPage.evaluate(()=>students.length),1);assert.equal(await splitPage.evaluate(model=>EFC_ACCOUNTING_INTEGRITY_V21.deleteStudentPaymentSource(model),receipt.model),false,'direct action on a split registration summary must be rejected');assert.equal(await splitPage.evaluate(()=>students.length),1,'split summary cannot delete its wider source registration');
  const exact=await pageFor(student([pay('2026-11-01',500,'exact-source')]));receipt=await monthReceipt(exact,1);assert.equal(receipt.model.receiptSource,'payment-clone');assert.equal(receipt.model.sourceEquivalent,true);assert.equal(receipt.model.amount,500);assert.equal(receipt.model.transactionCode,'exact-source');assert(await receipt.f.locator('.edit12').isEnabled(),'an exact clone retains legitimate source editing');
  await receipt.f.locator('.efc-source-delete-receipt-v21').waitFor();assert.equal(await receipt.f.locator('.efc-source-delete-receipt-v21').innerText(),'حذف التسجيل كاملًا','a registration clone explicitly warns that the entire registration will be removed');

  // Exercise the actual receipt controls, not just the exported delete API.
  const laterStudent={...student([pay('2026-10-01',500,'registration'),pay('2026-11-01',200,'later',2),pay('2026-11-10',300,'last',3)]),start:'2026-10-01'};
  laterStudent.payments.slice(1).forEach(payment=>{payment[7]=2;payment[10]=[{monthNumber:2,amount:payment[1]}];});
  const laterPage=await pageFor(laterStudent);await openStudentFinance(laterPage);
  let originalLater;
  for(let attempt=0;attempt<5;attempt++){
    const opened=await sourceReceipt(laterPage,'.payment-receipt-v13[data-index="1"]');originalLater=opened.model;
    assert.equal(originalLater.registrationReceipt,false);assert.equal(originalLater.receiptSource,'payment');
    await opened.f.locator('.efc-source-delete-receipt-v21').waitFor();assert.equal(await opened.f.locator('.efc-source-delete-receipt-v21').count(),1,'every fresh iframe receives one delete control');
    if(attempt<4)await laterPage.locator('.receipt-viewer-close-v13').click();
  }
  const beforeDelete=await laterPage.evaluate(()=>JSON.stringify(students));
  assert.equal(await laterPage.evaluate(model=>EFC_ACCOUNTING_INTEGRITY_V21.deleteStudentPaymentSource({...model,registrationReceipt:true}),originalLater),false,'an ordinary payment cannot be relabelled as registration deletion');
  assert.equal(await laterPage.evaluate(()=>JSON.stringify(students)),beforeDelete);
  const laterFrame=laterPage.frameLocator('.receipt-viewer-frame-v13');
  await laterFrame.locator('.efc-source-delete-receipt-v21').click();assert.equal(await laterPage.evaluate(()=>JSON.stringify(students)),beforeDelete,'cancelling deletion changes nothing');
  await laterPage.waitForFunction(()=>document.querySelector('.receipt-viewer-frame-v13')?.contentDocument.querySelector('.efc-source-delete-receipt-v21')?.disabled===false);
  await laterPage.evaluate(()=>{
    const base=window.EFC_FORCE_PERSIST;let held=false;
    window.EFC_FORCE_PERSIST=(...args)=>{
      if(held||!EFC_ACCOUNTING_INTEGRITY_V21.snapshot().paymentTombstones.some(item=>item.transactionCode==='later'))return base(...args);
      held=true;return new Promise((resolve,reject)=>{window.rejectReceiptSave=()=>{window.EFC_FORCE_PERSIST=base;reject(new Error('تعذر الحفظ التجريبي'));};});
    };
  });
  laterPage.acceptDeletion=true;const confirmsBefore=laterPage.dialogs.length;
  await laterFrame.locator('.efc-source-delete-receipt-v21').click();await laterPage.waitForFunction(()=>typeof window.rejectReceiptSave==='function');
  assert(await laterFrame.locator('.efc-source-delete-receipt-v21').isDisabled(),'delete stays disabled while persistence is pending');
  await laterFrame.locator('.efc-source-delete-receipt-v21').evaluate(button=>button.dispatchEvent(new MouseEvent('click',{bubbles:true})));
  assert.equal(laterPage.dialogs.length,confirmsBefore+1,'even an explicitly dispatched second click cannot reenter deletion');
  await laterPage.evaluate(()=>window.rejectReceiptSave());
  await laterPage.waitForFunction(()=>document.querySelector('.receipt-viewer-frame-v13')?.contentDocument.querySelector('.efc-source-delete-receipt-v21')?.disabled===false);
  assert.equal(await laterPage.evaluate(()=>JSON.stringify(students)),beforeDelete,'failed persistence restores the source and leaves its control usable');
  assert.equal(await laterPage.evaluate(()=>EFC_ACCOUNTING_INTEGRITY_V21.snapshot().paymentTombstones.some(item=>item.transactionCode==='later')),false);
  laterPage.acceptDeletion=true;await laterFrame.locator('.efc-source-delete-receipt-v21').click();
  await laterPage.waitForFunction(()=>students[0]?.payments.length===2&&!document.querySelector('.receipt-viewer-v13'));
  assert.deepEqual(await allocation(laterPage),{paid:800,allocated:800,unallocated:0,plan:[500,300],paymentCount:2});
  assert.equal(await laterPage.evaluate(()=>EFC_DOMAIN_V13.remainingAmount(students[0])),200);
  assert.deepEqual(await laterPage.evaluate(()=>students[0].payments.map(payment=>payment[6])),['registration','last']);
  assert(await laterPage.evaluate(()=>EFC_ACCOUNTING_INTEGRITY_V21.snapshot().paymentTombstones.some(item=>item.transactionCode==='later')));
  const afterDelete=await laterPage.evaluate(()=>JSON.stringify(students));
  assert.equal(await laterPage.evaluate(model=>EFC_ACCOUNTING_INTEGRITY_V21.deleteStudentPaymentSource(model),originalLater),false,'a stale transaction cannot delete the payment now occupying its former index');
  assert.equal(await laterPage.evaluate(()=>JSON.stringify(students)),afterDelete);
  await laterPage.reload();await ready(laterPage);assert.equal(await laterPage.evaluate(()=>EFC_DOMAIN_V13.remainingAmount(students[0])),200);
  await openStudentFinance(laterPage);
  const lastClone=await sourceReceipt(laterPage,'.month-receipt-v13[data-month="2"]');assert.equal(lastClone.model.receiptSource,'payment-clone');assert.equal(lastClone.model.sourceEquivalent,true);
  await lastClone.f.locator('.efc-source-delete-receipt-v21').click();await laterPage.waitForFunction(()=>students[0]?.payments.length===1);
  assert.equal(await laterPage.evaluate(()=>EFC_DOMAIN_V13.remainingAmount(students[0])),500,'deleting the remaining month-two payment restores the entire monthly debt');
  assert.equal(await laterPage.evaluate(()=>students[0].active),true);

  const registrationPage=await pageFor(laterStudent);await openStudentFinance(registrationPage);
  const registration=await sourceReceipt(registrationPage,'.registration-receipt-v13');await registration.f.locator('.efc-source-delete-receipt-v21').waitFor();
  assert.equal(await registration.f.locator('.efc-source-delete-receipt-v21').innerText(),'حذف التسجيل كاملًا');
  if(output)await registrationPage.screenshot({path:path.join(output,'registration-delete-explicit.png'),fullPage:true});
  await registrationPage.evaluate(()=>{const unrelated=document.createElement('div');unrelated.id='unrelated-student-modal-test';unrelated.className='modal';unrelated.dataset.efcStudentIdV21='another-student';unrelated.style.display='none';document.body.appendChild(unrelated);});
  registrationPage.acceptDeletion=true;await registration.f.locator('.efc-source-delete-receipt-v21').click();await registrationPage.waitForFunction(()=>students.length===0);
  await registrationPage.waitForFunction(()=>!document.querySelector('.modal[data-efc-student-id-v21="monthly-audit"]'));
  assert.equal(await registrationPage.locator('.receipt-viewer-v13').count(),0,'successful registration deletion closes its receipt viewer');
  assert.equal(await registrationPage.locator('.student-actions-v13').count(),0,'successful registration deletion also closes the deleted student profile');
  assert.equal(await registrationPage.locator('#unrelated-student-modal-test').count(),1,'unrelated student dialogs remain untouched');
  assert(registrationPage.dialogs.some(message=>message.includes('جميع دفعاته')&&message.includes('3')),'registration deletion confirms all associated payments, not just one receipt');
  assert(await registrationPage.evaluate(()=>EFC_ACCOUNTING_INTEGRITY_V21.snapshot().studentTombstones.some(item=>item.recordCode==='monthly-audit')));

  const reordered=await pageFor({...laterStudent,registrationPaymentCode:'registration',registrationPaymentInferred:false,payments:[laterStudent.payments[1],laterStudent.payments[0],laterStudent.payments[2]]});
  await openStudentFinance(reordered);const anchored=await sourceReceipt(reordered,'.registration-receipt-v13');
  assert.equal(anchored.model.transactionCode,'registration','the registration control follows the stable original transaction, not array index zero');assert.equal(anchored.model.paymentIndex,1);assert.equal(anchored.model.registrationReceipt,true);
  await anchored.f.locator('.efc-source-delete-receipt-v21').waitFor();assert.equal(await anchored.f.locator('.efc-source-delete-receipt-v21').innerText(),'حذف التسجيل كاملًا');
  await reordered.locator('.receipt-viewer-close-v13').click();await reordered.evaluate(()=>{students[0].registrationPaymentCode='missing-original';});
  await reordered.locator('.registration-receipt-v13').click();assert.equal(await reordered.locator('.receipt-viewer-v13').count(),0,'a missing explicit registration source cannot open a different payment');assert.equal(await reordered.evaluate(()=>students[0].payments.length),3);

  const blockedPage=await pageFor(laterStudent);await blockedPage.evaluate(()=>{EFC_AUTH_BOOTSTRAP_V13.replaceSecurityState({users:[{username:'viewer',role:'user',permissions:{students:{view:true,edit:true},register:{view:true,edit:false}}}]});EFC_AUTH_BOOTSTRAP_V13.setSessionUser('viewer');});
  await openStudentFinance(blockedPage);const denied=await sourceReceipt(blockedPage,'.payment-receipt-v13[data-index="1"]');assert.equal(await denied.f.locator('.efc-source-delete-receipt-v21').count(),0);
  assert.equal(await blockedPage.evaluate(model=>EFC_ACCOUNTING_INTEGRITY_V21.deleteStudentPaymentSource(model),denied.model),false);assert.equal(await blockedPage.evaluate(()=>students[0].payments.length),3);

  const closedPage=await pageFor({...laterStudent,start:'2025-10-01',payments:[pay('2025-10-01',500,'old-registration'),pay('2025-11-01',200,'closed-payment',2)]},{'efc-fiscal-state-v14':{version:14,config:{anchorDate:'2025-01-01'},archives:[{number:1,boundary:'2026-01-01',periodEnd:'2025-12-31',closedAt:1}],updatedAt:1}});
  await openStudentFinance(closedPage);const closed=await sourceReceipt(closedPage,'.payment-receipt-v13[data-index="1"]');closedPage.acceptDeletion=true;
  await closed.f.locator('.efc-source-delete-receipt-v21').click();assert.equal(await closedPage.evaluate(()=>students[0].payments.length),2);assert(closedPage.dialogs.some(message=>message.includes('مقفلة')));
  const splitModel=await splitPage.evaluate(()=>EFC_MONTH_RECEIPT_MODEL_V15(students[0],2));
  const forged={...splitModel,receiptSource:'payment-clone',editableReceipt:true,sourceEquivalent:true,transactionCode:'two-months',paymentIndex:0};
  assert.equal(await splitPage.evaluate(model=>EFC_ACCOUNTING_INTEGRITY_V21.deleteStudentPaymentSource(model),forged),false,'source-equivalence flags cannot authorize deleting a partial view of a larger source');
  assert.equal(await splitPage.evaluate(model=>EFC_ACCOUNTING_INTEGRITY_V21.deleteStudentPaymentSource({...model,amount:1000,registrationReceipt:true}),forged),false,'a multi-month source cannot masquerade as a single-month equivalent clone even with a matching total');
  assert.equal(await splitPage.evaluate(()=>students[0].payments[0][1]),1000);
  const backdated=await pageFor(student([pay('2026-11-10',200,'existing')]));await backdated.evaluate(()=>openPayment(students[0].id,1));await backdated.locator('#paymentFormPrepayV14 [name=amount]').fill('500');await backdated.locator('#paymentFormPrepayV14 [name=date]').fill('2026-11-01');await backdated.locator('#paymentFormPrepayV14 [name=date]').dispatchEvent('change');await backdated.locator('#paymentFormPrepayV14 button[type=submit]').click();await backdated.waitForFunction(()=>students[0].payments.length===2);assert.deepEqual(await allocation(backdated),{paid:700,allocated:700,unallocated:0,plan:[500,200],paymentCount:2});await backdated.reload();await ready(backdated);assert.equal((await allocation(backdated)).allocated,700,'backdated overlapping metadata conserves money across restart');
  const legacy=student([pay('2026-11-10',200,'existing'),pay('2026-11-01',500,'old-overlap',2)]),legacyPage=await pageFor(legacy);assert.deepEqual(await allocation(legacyPage),{paid:700,allocated:700,unallocated:0,plan:[500,200],paymentCount:2},'existing legacy overlap corrects on read without changing source amounts');
  const stopped={...student([pay('2026-11-01',700,'frozen-excess')]),active:false,status:'inactive',frozenMonths:1},stoppedPage=await pageFor(stopped);assert.deepEqual(await allocation(stoppedPage),{paid:700,allocated:500,unallocated:200,plan:[500],paymentCount:1});await stoppedPage.evaluate(()=>openStudent(students[0].id,'finance'));assert((await stoppedPage.locator('.monthly-unallocated-v63').innerText()).includes('200'),'unsupported old frozen advance credit is explicit in the real student UI');assert.equal(await stoppedPage.locator('.prepay-next-v14').count(),0);assert.equal(await stoppedPage.evaluate(()=>students[0].active),false);
  if(output)await stoppedPage.screenshot({path:path.join(output,'monthly-frozen-credit-explicit.png'),fullPage:true});

  const dated={...student([pay('2026-10-01',200,'october'),pay('2026-11-03',500,'november',2),pay('2026-11-10',100,'late-october',3)]),start:'2026-10-01'};
  dated.payments[1][7]=2;
  dated.payments[1][10]=[{monthNumber:2,amount:500}];
  const datedPage=await pageFor(dated);
  const priorBackup=await datedPage.evaluate(()=>EFC_FORCE_PERSIST());
  const originalReceipts=await datedPage.evaluate(()=>JSON.stringify(students[0].payments));
  await datedPage.evaluate(()=>openStudent(students[0].id,'finance'));
  await datedPage.locator('.stop-student-v13').click();
  const date=datedPage.locator('.student-stop-dialog-v64 [name=stopDate]');
  assert.equal(await date.inputValue(),'2026-11-15','stop date defaults to today');
  assert.equal(await date.getAttribute('min'),'2026-10-01');
  assert.equal(await date.getAttribute('max'),'2026-11-15');
  await date.fill('2026-10-31');
  await datedPage.locator('.student-stop-dialog-v64 .cancel').click();
  assert.equal(await datedPage.evaluate(()=>students[0].active),true,'cancelling the date choice keeps the student active');
  await datedPage.locator('.stop-student-v13').click();
  await date.fill('2026-10-31');
  await datedPage.locator('.student-stop-dialog-v64 [name=stopReason]').fill('توقف في نهاية أكتوبر');
  if(output)await datedPage.screenshot({path:path.join(output,'student-effective-stop-dialog.png'),fullPage:true});
  await datedPage.locator('.confirm-stop-v64').click();
  assert.deepEqual(await datedPage.evaluate(()=>({date:students[0].stoppedAt,end:students[0].end,active:students[0].active,frozen:students[0].frozenMonths,reason:students[0].stopReason})),{date:'2026-10-31',end:'2026-10-31',active:false,frozen:1,reason:'توقف في نهاية أكتوبر'});
  assert.equal(await datedPage.evaluate(()=>JSON.stringify(students[0].payments)),originalReceipts);
  assert.deepEqual(await allocation(datedPage),{paid:800,allocated:300,unallocated:500,plan:[300],paymentCount:3});
  assert((await datedPage.locator('.monthly-unallocated-v63').innerText()).includes('500'));
  await datedPage.locator('.pay-month-v13[data-month="1"]').click();
  assert.equal(await datedPage.locator('#paymentFormPrepayV14 [name=amount]').inputValue(),'200');
  await datedPage.locator('#paymentFormPrepayV14 button[type=submit]').click();
  await datedPage.waitForFunction(()=>students[0].payments.length===4);
  await datedPage.reload();
  await ready(datedPage);
  await datedPage.evaluate(state=>EFC_APPLY_RESTORED_STATE(state),priorBackup);
  assert.equal(await datedPage.evaluate(()=>students[0].active),false,'an older backup does not reverse the recorded stop');
  assert.equal(await datedPage.evaluate(()=>students[0].stoppedAt),'2026-10-31');
  assert.deepEqual(await allocation(datedPage),{paid:1000,allocated:500,unallocated:500,plan:[500],paymentCount:4});

  const staffPage=await pageFor({...student([]),start:'2026-10-01'});
  await staffPage.evaluate(()=>{
    EFC_AUTH_BOOTSTRAP_V13.replaceSecurityState({users:[{username:'staff',role:'user',permissions:{students:{view:true,edit:true}}}]});
    EFC_AUTH_BOOTSTRAP_V13.setSessionUser('staff');
    openStudent(students[0].id,'profile');
  });
  await staffPage.locator('.stop-student-v13').click();
  const staffDate=staffPage.locator('.student-stop-dialog-v64 [name=stopDate]');
  assert.equal(await staffDate.inputValue(),'2026-11-15');
  assert.equal(await staffDate.evaluate(input=>input.readOnly),true);
  await staffDate.evaluate(input=>{input.value='2026-10-31';});
  await staffPage.locator('.confirm-stop-v64').click();
  assert.match(await staffPage.locator('.stop-date-error-v64').innerText(),/مسؤول/);
  assert.equal(await staffPage.evaluate(()=>students[0].active),true);
  await staffDate.evaluate(input=>{input.value='2026-11-15';});
  await staffPage.locator('.confirm-stop-v64').click();
  assert.equal(await staffPage.evaluate(()=>students[0].stoppedAt),'2026-11-15');
  assert.equal(await staffPage.evaluate(()=>students[0].active),false);
  assert.deepEqual(errors,[]);
  console.log('Monthly browser audit passed: payment conservation, guarded receipts, dated stop, frozen collections, restart/restore and staff permissions.');
}finally{await browser.close();await new Promise(resolve=>server.close(resolve));}
