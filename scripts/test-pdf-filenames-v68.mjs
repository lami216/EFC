// Only in-memory native fixtures and isolated browser profiles are used here.
import fs from 'node:fs';
import path from 'node:path';
import http from 'node:http';
import assert from 'node:assert/strict';
import {pathToFileURL} from 'node:url';
const moduleName=process.env.EFC_PLAYWRIGHT_MODULE||'playwright';
const {chromium}=await import(path.isAbsolute(moduleName)?pathToFileURL(moduleName).href:moduleName);
const root=path.resolve('dist'),output=process.env.EFC_QA_OUTPUT;if(output)fs.mkdirSync(output,{recursive:true});
const server=http.createServer((req,res)=>{const requested=decodeURIComponent((req.url||'/').split('?')[0]),file=path.resolve(root,'.'+(requested==='/'?'/index.html':requested));if(!file.startsWith(root+path.sep))return res.writeHead(403).end();try{res.setHeader('Content-Type',file.endsWith('.js')?'application/javascript':file.endsWith('.css')?'text/css':file.endsWith('.svg')?'image/svg+xml':'text/html');res.end(fs.readFileSync(file));}catch{res.writeHead(404).end();}});
await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
const browser=await chromium.launch({headless:true,...(process.env.EFC_BROWSER_PATH?{executablePath:process.env.EFC_BROWSER_PATH}:{})}),errors=[];
const ready=page=>page.waitForFunction(()=>window.EFC_SECURITY_UI_V13?.ready&&window.EFC_ACCOUNTING_INTEGRITY_V21?.ready&&typeof window.EFC_PERSON_PDF_FILE_NAME_V68==='function');
async function boot(native){
  const context=await browser.newContext({viewport:{width:1440,height:1000},timezoneId:'UTC',acceptDownloads:true}),page=await context.newPage();
  page.on('pageerror',error=>errors.push(String(error)));page.on('dialog',dialog=>dialog.accept());
  await page.clock.setFixedTime(new Date('2026-11-15T12:00:00Z'));
  await page.addInitScript(native=>{
    const branches=[{id:'a',name:'مركز النور / الشمال',updatedAt:200},{id:'b',name:'فرع الجنوب',updatedAt:200}];
    const specialties=[{id:'monthly',name:'الفرنسية',courseType:'normal',billing:'monthly',fee:500,durationValue:1,durationUnit:'month'},{id:'quick',name:'المعلوماتية',courseType:'quick',billing:'one_time',fee:500,quickDays:30,durationValue:30,durationUnit:'day'}];
    const payment=(date,amount,code,receipt,target,allocations)=>[date,amount,'نقداً','12:00',receipt,'دفعة اختبار',code,target,receipt,null,allocations,receipt];
    const students=[{id:'pdf-monthly',recordCode:'pdf-monthly-record',name:'محمد / أحمد: المختار',phone:'00000000',branch:'a',specialty:'monthly',reg:42,start:'2026-11-01',end:'',active:true,status:'active',registrationPaymentCode:'pdf-registration',registrationPaymentInferred:false,required:1500,paid:1200,payments:[payment('2026-11-01',1000,'pdf-registration',12,1,[{monthNumber:1,amount:500},{monthNumber:2,amount:500}]),payment('2026-11-10',200,'pdf-payment',13,3,[{monthNumber:3,amount:200}])],snapshot:{centerOpsV13:true,dynamicMonthly:true,billing:'monthly',fee:500,durationValue:1,durationUnit:'month'},debtDueDates:{}},{id:'pdf-quick',recordCode:'pdf-quick-record',name:'سلمى بنت علي',phone:'11111111',branch:'b',specialty:'quick',reg:7,start:'2026-11-01',end:'2026-12-01',active:true,status:'active',required:500,paid:200,payments:[payment('2026-11-01',200,'pdf-quick-payment',14,null,[])],snapshot:{centerOpsV13:true,courseType:'quick',billing:'one_time',fee:500,durationValue:30,durationUnit:'day'},debtDueDates:{}}];
    const certificate=(id,overrides)=>({id,recordCode:'record-'+id,transactionCode:'transaction-'+id,receiptNo:21,studentType:'external',studentId:null,studentName:'مريم / محمد: الأمين',phone:'22222222',reg:'٠٠٤٢',specialtyId:'quick',specialtyName:'المعلوماتية',branchType:'certificate',branchId:'cb',branchName:'اسم فرع قديم',amount:250,method:'نقداً',date:'2026-11-01',time:'12:00',createdAt:1,timestamp:1,updatedAt:200,...overrides});
    const certificates={certificateBranches:[{id:'cb',recordCode:'cb-record',name:'فرع الشهادات الجديد',createdAt:1,updatedAt:200}],certificateReceipts:[certificate('external',{delivery:{receiverType:'agent',receiverName:'وكيل الاستلام',receiverPhone:'33333333',date:'2026-11-10',time:'13:00',recordedAt:200},deliveryUpdatedAt:200}),certificate('internal',{receiptNo:22,studentType:'internal',studentId:'pdf-monthly',studentName:students[0].name,branchType:'internal',branchId:'a'}),certificate('legacy',{receiptNo:23,reg:null,branchId:'missing',branchName:'فرع تاريخي محفوظ',studentName:'طالب قديم'})],nextReceiptNo:24};
    const main={version:3,updatedAt:200,installationId:'pdf-fixture',students,specialties,paymentMethods:['نقداً'],branches,security:{users:[]},centerOpsMeta:{updatedAt:200}};
    if(!localStorage.getItem('pdf-fixture-v68')){localStorage.setItem('pdf-fixture-v68','1');localStorage.setItem('efc-students-v1',JSON.stringify(students));localStorage.setItem('efc-specialties-v1',JSON.stringify(specialties));localStorage.setItem('efc-payment-methods-v1',JSON.stringify(['نقداً']));localStorage.setItem('efc-branches-v13',JSON.stringify(branches));localStorage.setItem('efc-center-ops-meta-v13',JSON.stringify({updatedAt:200}));localStorage.setItem('efc-state-meta-v1',JSON.stringify({installationId:'pdf-fixture',updatedAt:100}));localStorage.setItem('efc-certificate-state-v1',JSON.stringify(certificates));}
    const qa=window.pdfQA={native:{main,certificates,bank:{entries:[],nextReceiptNo:1,tombstones:[]}},saves:[],downloads:[],pickers:[],writes:[]};
    if(native)window.__TAURI__={core:{invoke:async(command,payload={})=>{
      if(command==='get_license_status')return{valid:true};if(command==='get_license_device_id')return'PDF-TEST-DEVICE';
      const reads={load_app_state:'main',load_certificate_state:'certificates',load_bank_state:'bank'},writes={save_app_state:'main',save_certificate_state:'certificates',save_bank_state:'bank'};
      if(reads[command])return JSON.stringify(qa.native[reads[command]]);
      if(writes[command]){qa.native[writes[command]]=JSON.parse(payload.state);return null;}
      if(command==='save_receipt_pdf'){qa.saves.push({...payload});return'C:/isolated-pdf-test/'+payload.fileName;}
      throw Error('Unexpected mocked native command '+command);
    }}};
  },native);
  await page.goto(`http://127.0.0.1:${server.address().port}/#students`);await ready(page);return{page,context};
}
async function modelsFor(page){
  await page.evaluate(()=>{window.pdfModels={registration:receiptModelV4(students.find(s=>s.id==='pdf-monthly'),0,false),payment:receiptModelV4(students.find(s=>s.id==='pdf-monthly'),1,false),statement:receiptModelV4(students.find(s=>s.id==='pdf-quick'),null,true)};});
  async function capture(button,key){
    await page.evaluate(()=>{document.querySelectorAll('.modal').forEach(node=>node.remove());openStudent('pdf-monthly','finance');});
    await page.locator(button).click();const frame=await (await page.locator('.receipt-viewer-frame-v13').elementHandle()).contentFrame();await frame.waitForSelector('.paper12');
    const model=await frame.evaluate(()=>RECEIPT),title=await frame.title();
    const expected=await page.evaluate(model=>EFC_PERSON_PDF_FILE_NAME_V68({documentType:model.statement?'كشف حساب':'روسي',studentName:model.student,branchName:model.branch,registrationNumber:model.reg,receiptNumber:model.receipt}),model);
    assert.equal(title,expected.slice(0,-4),'the open student document title uses the same identity as its PDF filename');
    await page.evaluate(({key,model})=>{window.pdfModels[key]=model;},{key,model});
  }
  await capture('.month-receipt-v13[data-month="1"]','oneMonth');
  assert.equal(await page.evaluate(()=>pdfModels.oneMonth.receiptSource),'derived-month');
  await capture('.all-months-receipt-v13','aggregate');
  assert.equal(await page.evaluate(()=>pdfModels.registration.registrationReceipt),true);
  assert.equal(await page.evaluate(()=>pdfModels.payment.registrationReceipt),false);
  assert.equal(await page.evaluate(()=>pdfModels.aggregate.statement),true);
  await page.evaluate(()=>document.querySelectorAll('.modal').forEach(node=>node.remove()));
}
async function stubRenderer(page){await page.evaluate(()=>{
  const bytes=new TextEncoder().encode('%PDF-filename-test');
  window.html2canvas=async()=>({width:1040,height:650,toDataURL:()=>''});
  window.jspdf={jsPDF:class{internal={pageSize:{getWidth:()=>297,getHeight:()=>210}};addImage(){}output(kind){return kind==='blob'?new Blob([bytes],{type:'application/pdf'}):bytes.buffer.slice(0);}save(name){pdfQA.downloads.push(name);}}};
  Object.defineProperty(window,'showSaveFilePicker',{value:undefined,writable:true,configurable:true});
});}
const financialSnapshot=page=>page.evaluate(()=>JSON.stringify({students,certificates:EFC_CERTIFICATE_STATE_V14.snapshot(),expenses:EFC_DOMAIN_V13.getExpenses(),payments:allPayments()}));
const windowsSafe=name=>{assert(name.endsWith('.pdf'));assert(!/[<>:"/\\|?*\u0000-\u001f\u007f-\u009f\u061c\u200e\u200f\u202a-\u202e\u2066-\u2069]/.test(name));assert(name.length<=240);};
try{
  for(const native of [true,false]){
    const {page,context}=await boot(native);await modelsFor(page);await stubRenderer(page);const before=await financialSnapshot(page);
    const names=await page.evaluate(async native=>{
      const results=[];
      for(const [kind,model] of Object.entries(pdfModels)){
        const expected=EFC_PERSON_PDF_FILE_NAME_V68({documentType:model.statement?'كشف حساب':'روسي',studentName:model.student,branchName:model.branch,registrationNumber:model.reg,receiptNumber:model.receipt});
        const result=await EFC_SAVE_RECEIPT_PDF(model),captured=native?pdfQA.saves.at(-1)?.fileName:pdfQA.downloads.at(-1);results.push({kind,expected,captured,result});
      }
      const receipts=EFC_CERTIFICATE_STATE_V14.snapshot().certificateReceipts;
      for(const receipt of receipts){
        const label=receipt.id==='internal'?'مركز النور / الشمال':receipt.id==='external'?'فرع الشهادات الجديد':'فرع تاريخي محفوظ';
        const expected=EFC_PERSON_PDF_FILE_NAME_V68({documentType:'شهادة',studentName:receipt.studentName,branchName:label,registrationNumber:receipt.reg,receiptNumber:String(receipt.receiptNo).padStart(5,'0')});
        const result=await EFC_SAVE_CERTIFICATE_PDF_V13(receipt),captured=native?pdfQA.saves.at(-1)?.fileName:pdfQA.downloads.at(-1);results.push({kind:'certificate-'+receipt.id,expected,captured,result});
        if(receipt.delivery){const expectedDelivery=EFC_PERSON_PDF_FILE_NAME_V68({documentType:'استلام شهادة',studentName:receipt.studentName,branchName:label,registrationNumber:receipt.reg,receiptNumber:String(receipt.receiptNo).padStart(5,'0')});const resultDelivery=await EFC_SAVE_CERTIFICATE_DELIVERY_PDF_V13(receipt),capturedDelivery=native?pdfQA.saves.at(-1)?.fileName:pdfQA.downloads.at(-1);results.push({kind:'certificate-delivery',expected:expectedDelivery,captured:capturedDelivery,result:resultDelivery});}
      }
      return results;
    },native);
    assert.equal(names.length,9);for(const item of names){assert.equal(item.captured,item.expected,item.kind+' uses the shared filename for '+(native?'Windows suggestion':'browser download'));windowsSafe(item.captured);assert(item.result,'the existing save path still completes');}
    assert(names.find(item=>item.kind==='certificate-external').captured.includes('فرع الشهادات الجديد'),'filename resolves the same live renamed certificate branch as its document');
    assert(!names.find(item=>item.kind==='certificate-external').captured.includes('اسم فرع قديم'));
    assert(names.find(item=>item.kind==='certificate-legacy').captured.includes('غير مسجل'),'a missing historical registration number is explicit rather than fabricated');
    assert(!names.find(item=>item.kind==='certificate-delivery').captured.includes('وكيل الاستلام'),'the delivery PDF names its student rather than the receiving agent');
    assert.equal(await financialSnapshot(page),before,'saving PDFs leaves source receipts, balances, courses and filters unchanged');
    if(!native){
      await page.evaluate(()=>{window.showSaveFilePicker=async options=>{pdfQA.pickers.push(options.suggestedName);return{createWritable:async()=>({write:async blob=>{pdfQA.writes.push(blob.type);},close:async()=>{}})};};});
      const expected=await page.evaluate(async()=>{const m=pdfModels.registration,expected=EFC_PERSON_PDF_FILE_NAME_V68({studentName:m.student,branchName:m.branch,registrationNumber:m.reg,receiptNumber:m.receipt});await EFC_SAVE_RECEIPT_PDF(m);return expected;});
      assert.equal(await page.evaluate(()=>pdfQA.pickers.at(-1)),expected);assert.equal(await page.evaluate(()=>pdfQA.writes.at(-1)),'application/pdf');
      // One unstubbed PDF verifies the real existing renderer/download facility.
      await page.evaluate(()=>{delete window.html2canvas;delete window.jspdf;window.showSaveFilePicker=undefined;receiptWindowV4(pdfModels.registration);});
      const frame=page.frameLocator('.receipt-viewer-frame-v13');await frame.locator('.paper12').waitFor();
      assert((await frame.locator('.head12').innerText()).includes('Centre EFC'));
      const downloaded=page.waitForEvent('download');await frame.locator('.download12').click();const download=await downloaded;
      assert.equal(download.suggestedFilename(),expected);windowsSafe(download.suggestedFilename());const downloadedPath=await download.path(),bytes=fs.readFileSync(downloadedPath);
      assert.equal(bytes.subarray(0,5).toString(),'%PDF-');assert(bytes.length>10000,'the real PDF contains its branded rendered receipt');
      if(output)await download.saveAs(path.join(output,'person-filename-real-pdf-v68.pdf'));
      assert.equal(await financialSnapshot(page),before);
    }
    await context.close();
  }
  assert.deepEqual(errors,[]);console.log('PDF filename browser v68 passed: real receipt models, Windows suggestions, browser picker/downloads, live certificate branch resolution, delivery/legacy names, immutable finance, and a real branded PDF.');
}finally{await browser.close();await new Promise(resolve=>server.close(resolve));}
