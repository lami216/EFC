(()=>{
'use strict';
if(window.EFC_CERTIFICATES_V13?.ready)return;
if(!window.EFC_RECEIPTS_V13?.ready||typeof allPayments!=='function'||typeof shell!=='function')throw new Error('Certificates v13 loaded before clean receipt/foundation runtime.');

const STORAGE_KEY='efc-certificate-state-v1';
const CERTIFICATE_SUBTITLE='للغات والمعلوماتية';
const invoke=window.__TAURI__?.core?.invoke;
const esc=value=>String(value??'').replace(/[&<>"']/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot',"'":'&#39;'}[ch]));
const pad2=value=>String(value).padStart(2,'0');
const padReceipt=value=>String(Math.max(0,Number(value||0))).padStart(5,'0');
const today=()=>typeof deviceTodayV3==='function'?deviceTodayV3():DEMO_TODAY;
const showDate=value=>typeof fmtDateV3==='function'?fmtDateV3(value):fmtDate(value);
const cash=value=>typeof moneyV3==='function'?moneyV3(value):money(value);
const uid=prefix=>`${prefix}-${Date.now().toString(36)}-${globalThis.crypto?.randomUUID?.().replaceAll('-','').slice(0,14)||Math.random().toString(36).slice(2,16)}`;
const logoUrl=()=>new URL('./efc-logo.svg',location.href).href;
const canEditCertificates=()=>window.EFC_AUTH_V13?.canEdit?.('certificates')??true;
const icon=body=>`<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><g fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round">${body}</g></svg>`;
const CERT_ICON=icon('<path d="M6 3h12v18H6z"/><path d="M9 7h6M9 11h6"/><circle cx="12" cy="16" r="2.2"/><path d="m10.6 17.7-.6 2.1 2-1 2 1-.6-2.1"/>');
const HISTORY_ICON=icon('<path d="M4 5h16M4 10h16M4 15h10M4 20h10"/><path d="M18 15v5M15.5 17.5h5"/>');
const BACK_ICON=icon('<path d="m15 6-6 6 6 6"/>');
const X_ICON=icon('<path d="M6 6l12 12M18 6 6 18"/>');

let state={certificateBranches:[],certificateReceipts:[]};
let mode='internal';
let selectedStudentId=null;
let historyOpen=false;
let issueInFlight=false;
let branchSaveInFlight=false;
let saveChain=Promise.resolve();

function normalizeBranch(item){
  const name=String(item?.name||'').trim();
  if(!name)return null;
  return{id:String(item.id||uid('cert-branch')),recordCode:String(item.recordCode||uid('cert-branch-record')),name,createdAt:Number(item.createdAt||Date.now())};
}
function normalizeReceipt(item){
  if(!item||typeof item!=='object')return null;
  const amount=Math.max(0,Number(item.amount||0));
  const name=String(item.studentName||item.name||'').trim();
  if(!name||amount<=0)return null;
  return{
    id:String(item.id||uid('certificate')),
    recordCode:String(item.recordCode||uid('certificate-record')),
    transactionCode:String(item.transactionCode||uid('certificate-tx')),
    receiptNo:Math.max(1,Number(item.receiptNo||1)),
    studentType:item.studentType==='external'?'external':'internal',
    studentId:item.studentId?String(item.studentId):null,
    studentName:name,
    phone:String(item.phone||''),
    reg:item.reg===null||item.reg===undefined||item.reg===''?null:String(item.reg),
    specialtyId:String(item.specialtyId||''),
    specialtyName:String(item.specialtyName||''),
    branchType:item.branchType==='certificate'?'certificate':'internal',
    branchId:item.branchId?String(item.branchId):null,
    branchName:String(item.branchName||''),
    amount,
    method:String(item.method||''),
    date:String(item.date||today()),
    time:String(item.time||'00:00'),
    timestamp:Number(item.timestamp||item.createdAt||Date.now()),
    createdAt:Number(item.createdAt||item.timestamp||Date.now())
  };
}
function normalizeState(raw){
  const branches=(Array.isArray(raw?.certificateBranches)?raw.certificateBranches:[]).map(normalizeBranch).filter(Boolean);
  const receipts=(Array.isArray(raw?.certificateReceipts)?raw.certificateReceipts:[]).map(normalizeReceipt).filter(Boolean);
  const branchKeys=new Set(),receiptKeys=new Set();
  return{
    certificateBranches:branches.filter(item=>{const key=item.recordCode||item.name.toLowerCase();if(branchKeys.has(key))return false;branchKeys.add(key);return true;}),
    certificateReceipts:receipts.filter(item=>{const key=item.recordCode||item.transactionCode;if(receiptKeys.has(key))return false;receiptKeys.add(key);return true;})
  };
}
function mergeState(current,incoming){
  const a=normalizeState(current),b=normalizeState(incoming),branches=[...a.certificateBranches],receipts=[...a.certificateReceipts];
  const branchCodes=new Set(branches.flatMap(item=>[item.recordCode,item.name.trim().toLowerCase()]));
  const receiptCodes=new Set(receipts.flatMap(item=>[item.recordCode,item.transactionCode]));
  b.certificateBranches.forEach(item=>{const name=item.name.trim().toLowerCase();if(branchCodes.has(item.recordCode)||branchCodes.has(name))return;branches.push(item);branchCodes.add(item.recordCode);branchCodes.add(name);});
  b.certificateReceipts.forEach(item=>{if(receiptCodes.has(item.recordCode)||receiptCodes.has(item.transactionCode))return;receipts.push(item);receiptCodes.add(item.recordCode);receiptCodes.add(item.transactionCode);});
  return{certificateBranches:branches,certificateReceipts:receipts};
}
function readLocal(){try{return normalizeState(JSON.parse(localStorage.getItem(STORAGE_KEY)||'{}'));}catch{return normalizeState({});}}
function writeLocal(){localStorage.setItem(STORAGE_KEY,JSON.stringify(state));}
async function persist(){
  writeLocal();
  if(!invoke)return;
  const snapshot=JSON.stringify(state);
  saveChain=saveChain.catch(()=>undefined).then(()=>invoke('save_certificate_state',{state:snapshot}));
  await saveChain;
}
async function loadState(){
  const local=readLocal();
  if(!invoke){state=local;return;}
  try{
    const raw=await invoke('load_certificate_state');
    const native=raw?normalizeState(JSON.parse(raw)):normalizeState({});
    state=mergeState(native,local);
    await persist();
  }catch(error){console.error('EFC certificate state load failed; local state kept.',error);state=local;}
}
function nextReceiptNo(){return Math.max(0,...state.certificateReceipts.map(item=>Number(item.receiptNo||0)))+1;}
function nowTime(){const date=new Date();return`${pad2(date.getHours())}:${pad2(date.getMinutes())}`;}
function certificatePayment(receipt){
  const specialtyValue=spec(receipt.specialtyId)?receipt.specialtyId:(receipt.specialtyName||receipt.specialtyId);
  return{
    student:{id:`certificate:${receipt.id}`,name:receipt.studentName,phone:receipt.phone||'',branch:receipt.branchType==='internal'?receipt.branchId:receipt.branchName,specialty:specialtyValue,reg:receipt.reg||''},
    date:receipt.date,amount:Number(receipt.amount||0),method:receipt.method,time:receipt.time||'00:00',order:Number(receipt.timestamp||0),description:`رسوم شهادة · ${receipt.specialtyName||'دورة'}`,paymentIndex:0,receipt:padReceipt(receipt.receiptNo),sourceType:'certificate',certificateId:receipt.id
  };
}

const whatsappIcon=()=>`<span class="socialIcon12" aria-hidden="true"><svg viewBox="0 0 32 32"><path d="M16.05 3.2A12.65 12.65 0 0 0 5.2 22.34L3.5 28.5l6.3-1.65a12.63 12.63 0 1 0 6.25-23.65Zm0 22.98a10.4 10.4 0 0 1-5.3-1.45l-.38-.23-3.74.98 1-3.64-.25-.38a10.42 10.42 0 1 1 8.67 4.72Zm5.72-7.8c-.31-.16-1.85-.91-2.14-1.02-.28-.1-.49-.16-.7.16-.2.31-.8 1.02-.98 1.23-.18.2-.36.23-.67.08-.31-.16-1.31-.48-2.5-1.54-.92-.82-1.55-1.84-1.73-2.15-.18-.31-.02-.48.14-.64.14-.14.31-.36.47-.55.16-.18.2-.31.31-.52.1-.2.05-.39-.03-.55-.08-.16-.7-1.68-.96-2.3-.25-.6-.51-.52-.7-.53h-.6c-.2 0-.54.08-.83.39-.28.31-1.08 1.05-1.08 2.57 0 1.51 1.1 2.98 1.26 3.18.16.2 2.17 3.31 5.25 4.64.73.32 1.3.5 1.75.64.74.23 1.4.2 1.93.12.59-.09 1.85-.76 2.11-1.49.26-.73.26-1.36.18-1.49-.08-.13-.29-.2-.6-.36Z"/></svg></span>`;
const facebookIcon=()=>`<span class="socialIcon12" aria-hidden="true"><svg viewBox="0 0 32 32"><path d="M18.3 29V17.1h4l.6-4.7h-4.6v-3c0-1.35.37-2.28 2.32-2.28H23V2.94c-.41-.06-1.82-.18-3.47-.18-3.44 0-5.8 2.1-5.8 5.96v3.68H9.84v4.7h3.89V29h4.57Z"/></svg></span>`;
function receiptHeader(receipt){const img=`<img src="${logoUrl()}" alt="EFC">`;return`<div class="head12"><div class="contact12">${img}<div class="contactText12"><b>Tél: 48 02 84 84</b><div class="socialLine12">${whatsappIcon()}<span>32 09 86 89</span></div><div class="socialLine12 teacher12">${facebookIcon()}<span>الأستاذ محمد ديدي</span></div></div></div><div class="center12"><h1 class="title12"><span class="enTitle12">Centre EFC</span><span class="arTitle12">مركز</span></h1><div class="official12">${CERTIFICATE_SUBTITLE}</div><div class="tag12">جميع الشهادات معترف بها من طرف الدولة</div><div class="rn12"><span>Reçu N°</span><b>${padReceipt(receipt.receiptNo)}</b><span>وصل رقم</span></div></div><div class="logoOnly12">${img}</div></div>`;}
function receiptCss(){return`
*{box-sizing:border-box}body{font-family:Tahoma,Arial,sans-serif;margin:0;background:#eef1f0;color:#111715}.cert-paper{width:1040px;max-width:96vw;margin:18px auto;background:#fff;border:2px solid #293631;padding:12px 18px 11px;direction:ltr}
.head12{display:grid;grid-template-columns:240px 1fr 150px;gap:14px;align-items:center;border-bottom:1px solid #b2b8b5;padding-bottom:6px}.contact12{display:grid;grid-template-columns:92px 1fr;gap:8px;align-items:center;direction:ltr;text-align:left}.contact12 img,.logoOnly12 img{width:82px;height:62px;object-fit:contain;object-position:center;display:block}.contactText12{display:grid;gap:1px;align-content:center}.contactText12>b{display:block;font-size:13px;line-height:1.35;white-space:nowrap;direction:ltr;text-align:left}.socialLine12{display:flex;align-items:center;gap:5px;font-size:13px;line-height:1.35;white-space:nowrap;direction:ltr;text-align:left;font-weight:700;justify-content:flex-start}.socialLine12.teacher12{font-size:10px;font-weight:700;margin-top:2px;direction:ltr;justify-content:flex-start}.socialLine12.teacher12 span:last-child{font-weight:700;direction:rtl;unicode-bidi:isolate}.socialIcon12{width:14px;height:14px;display:inline-block;flex:0 0 14px;color:#111715}.socialIcon12 svg{width:100%;height:100%;display:block;fill:currentColor}.center12{text-align:center;direction:rtl}.center12 h1{margin:0;font-size:27px;line-height:1}.title12{display:flex;direction:ltr;justify-content:center;align-items:baseline;gap:12px;white-space:nowrap}.title12 .enTitle12{direction:ltr}.title12 .arTitle12{direction:rtl}.center12 .official12{font-size:11px;font-weight:900;margin-top:3px}.center12 .tag12{font-size:11px;font-weight:700;margin-top:3px}.rn12{display:flex;direction:ltr;justify-content:center;align-items:center;gap:9px;margin-top:4px;font-size:17px}.rn12 b{font-size:21px}.logoOnly12{height:66px;display:grid;place-items:center}
.cert-section-title{text-align:center;direction:rtl;font-size:25px;font-weight:900;line-height:1.15;margin:5px 0 2px}.cert-meta{display:flex;justify-content:space-between;align-items:center;gap:24px;direction:ltr;padding:3px 0 2px;font-size:11px}.cert-meta>span{direction:rtl}.cert-row{display:grid;grid-template-columns:145px minmax(0,1fr) 135px;gap:8px;align-items:center;height:34px;font-size:13px;direction:ltr}.cert-fr{text-align:left;direction:ltr;font-weight:700}.cert-ar{text-align:right;direction:rtl;font-weight:800}.cert-track{position:relative;height:28px;display:flex;align-items:center;justify-content:center;min-width:0}.cert-track:before{content:"";position:absolute;left:0;right:0;top:50%;border-top:2px dotted #7d8581;transform:translateY(-50%)}.cert-track b{position:relative;z-index:1;background:#fff;padding:0 10px;font-size:15px;font-weight:800;direction:rtl;white-space:nowrap;max-width:94%;overflow:hidden;text-overflow:ellipsis}.cert-pair{display:grid;grid-template-columns:1fr 1fr;gap:24px;direction:ltr}.cert-half{display:grid;grid-template-columns:92px minmax(0,1fr) 110px;gap:7px;align-items:center;height:34px;font-size:13px;direction:ltr}.cert-reg b{border:2px solid #555;min-width:120px;text-align:center;padding:3px 20px;background:#fff}
.cert-methods{border-top:1px solid #d7dcda;margin-top:7px;padding-top:8px;display:flex;align-items:center;justify-content:space-between;gap:16px;direction:ltr}.cert-method{min-width:0;flex:1;display:flex;align-items:center;justify-content:center;gap:7px;font-size:10px;font-weight:700;white-space:nowrap}.cert-check{width:44px;height:30px;border:2px solid #555;background:#fff;display:grid;place-items:center;font-size:18px;font-weight:900;flex:0 0 44px}.cert-method.on .cert-check{color:#158b4c;border-color:#158b4c}.cert-method-name{display:flex;align-items:center;gap:3px;line-height:1.1}.cert-actions{width:1040px;max-width:96vw;margin:0 auto 18px;display:flex;direction:rtl;gap:8px}.cert-actions button{border:0;border-radius:7px;padding:10px 17px;font:700 13px Tahoma;cursor:pointer}.cert-print{background:#155ea8;color:#fff}.cert-save{background:#159a55;color:#fff}@media(max-width:820px){.cert-methods{gap:6px;flex-wrap:wrap}.cert-method{font-size:8px;min-width:120px}.cert-check{width:34px;flex-basis:34px}}@media print{body{background:#fff}.cert-paper{width:100%;max-width:none;margin:0;border:1px solid #222}.cert-actions{display:none}@page{size:landscape;margin:8mm}}
`;}
function normalizeMethod(value){return String(value||'').trim().toLowerCase().replace(/\s+/g,' ').replace(/[ًٌٍَُِّْـ]/g,'');}
function receiptMethods(current){
  const selected=normalizeMethod(current);
  const items=[...new Set((methods||[]).map(value=>String(value||'').trim()).filter(Boolean))];
  return items.map(name=>{const on=normalizeMethod(name)===selected;return`<div class="cert-method ${on?'on':''}"><span class="cert-check">${on?'✓':''}</span><span class="cert-method-name"><b>${esc(name)}</b></span></div>`;}).join('');
}
function receiptBody(receipt){
  const reg=receipt.reg?String(receipt.reg).padStart(4,'0'):'—';
  const row=(fr,value,ar)=>`<div class="cert-row"><span class="cert-fr">${fr}</span><span class="cert-track"><b>${esc(value||'—')}</b></span><span class="cert-ar">${ar}</span></div>`;
  const half=(fr,value,ar,cls='')=>`<div class="cert-half ${cls}"><span class="cert-fr">${fr}</span><span class="cert-track"><b>${esc(value||'—')}</b></span><span class="cert-ar">${ar}</span></div>`;
  return`${receiptHeader(receipt)}<div class="cert-section-title">إدارة الشهادات</div><div class="cert-meta"><span>تم الدفع في تاريخ: <b>${showDate(receipt.date)}</b></span><span>الفرع: <b>${esc(receipt.branchName||'—')}</b></span></div>${row("Nom de l’étudiant",receipt.studentName,'اسم الطالب')}${row('Nature de la Session',receipt.specialtyName,'طبيعة الدورة')}${row('Filière',receipt.branchName,'الفرع')}<div class="cert-pair">${half('N° Registre',reg,'رقم السجل','cert-reg')}${half('Montant',cash(receipt.amount),'المبلغ')}</div><div class="cert-methods">${receiptMethods(receipt.method)}</div>`;
}
function receiptDocument(receipt,actions=true,autoPrint=false){const data=JSON.stringify(receipt).replace(/</g,'\\u003c');return`<!doctype html><html lang="ar" dir="rtl"><head><meta charset="utf-8"><title>روسي شهادة ${padReceipt(receipt.receiptNo)}</title><style>${receiptCss()}</style></head><body><div class="cert-paper">${receiptBody(receipt)}</div>${actions?`<div class="cert-actions"><button class="cert-print" onclick="print()">طباعة</button><button class="cert-save" onclick="parent.EFC_SAVE_CERTIFICATE_PDF_V13(CERT)">حفظ PDF</button></div>`:''}<script>const CERT=${data};${autoPrint?'setTimeout(()=>print(),250);':''}<\/script></body></html>`;}
function openReceipt(receipt,autoPrint=false){
  if(!receipt)return null;
  const modal=document.createElement('div');modal.className='modal receipt-viewer-v13';
  modal.innerHTML=`<div class="receipt-viewer-card-v13"><div class="receipt-viewer-head-v13"><b>عرض روسي الشهادة</b><button class="receipt-viewer-close-v13" type="button" title="إغلاق">×</button></div><iframe class="receipt-viewer-frame-v13" title="روسي الشهادة"></iframe></div>`;
  document.body.appendChild(modal);const frame=modal.querySelector('iframe'),close=()=>modal.remove();modal.querySelector('.receipt-viewer-close-v13').onclick=close;frame.srcdoc=receiptDocument(receipt,true,autoPrint);return{closed:false,close,focus:()=>frame.focus(),frame};
}
function loadLocalScript(src,key){if(window[key])return Promise.resolve();return new Promise((resolve,reject)=>{const script=document.createElement('script');script.src=src;script.onload=resolve;script.onerror=()=>reject(new Error(`تعذر تحميل ${src} محليًا.`));document.head.appendChild(script);});}
function waitFrame(frame){return new Promise((resolve,reject)=>{const timer=setTimeout(()=>reject(new Error('تأخر تجهيز روسي الشهادة.')),4000);frame.onload=()=>{clearTimeout(timer);resolve();};});}
async function waitImages(root){await Promise.all([...root.querySelectorAll('img')].map(image=>image.complete?Promise.resolve():new Promise(resolve=>{image.onload=resolve;image.onerror=resolve;setTimeout(resolve,1200);})));try{await root.ownerDocument.fonts?.ready;}catch{}}
function arrayBufferToBase64(buffer){const bytes=new Uint8Array(buffer);let binary='';for(let offset=0;offset<bytes.length;offset+=0x8000)binary+=String.fromCharCode(...bytes.subarray(offset,Math.min(offset+0x8000,bytes.length)));return btoa(binary);}
async function savePdf(receipt){
  let frame;
  try{
    await Promise.all([loadLocalScript('./vendor/html2canvas.min.js','html2canvas'),loadLocalScript('./vendor/jspdf.umd.min.js','jspdf')]);
    frame=document.createElement('iframe');frame.setAttribute('aria-hidden','true');frame.style.cssText='position:fixed;left:-16000px;top:0;width:1120px;height:760px;border:0;opacity:0;pointer-events:none';document.body.appendChild(frame);
    const loaded=waitFrame(frame);frame.srcdoc=receiptDocument(receipt,false,false);await loaded;
    const paper=frame.contentDocument?.querySelector('.cert-paper');if(!paper)throw new Error('تعذر العثور على روسي الشهادة.');await waitImages(paper);
    const canvas=await window.html2canvas(paper,{scale:2,backgroundColor:'#fff',useCORS:false,allowTaint:false,logging:false});
    const {jsPDF}=window.jspdf,pdf=new jsPDF({orientation:'landscape',unit:'mm',format:'a4'}),pw=pdf.internal.pageSize.getWidth(),ph=pdf.internal.pageSize.getHeight(),ratio=Math.min(pw/canvas.width,ph/canvas.height),width=canvas.width*ratio,height=canvas.height*ratio;
    pdf.addImage(canvas.toDataURL('image/jpeg',.96),'JPEG',(pw-width)/2,(ph-height)/2,width,height);
    const fileName=`روسي-شهادة-${padReceipt(receipt.receiptNo)}.pdf`,buffer=pdf.output('arraybuffer');
    if(!invoke){pdf.save(fileName);return fileName;}
    return await invoke('save_receipt_pdf',{fileName,dataBase64:arrayBufferToBase64(buffer)});
  }catch(error){console.error('EFC certificate PDF save failed.',error);alert(String(error?.message||error||'تعذر حفظ روسي الشهادة.'));return null;}finally{frame?.remove();}
}

function isOperationalStudent(student){return Boolean(student&&student.active!==false&&student.status!=='inactive');}
function syncBranchButtonBusy(){const button=document.getElementById('certAddBranchV13');if(button)button.disabled=branchSaveInFlight||!canEditCertificates();}
function addBranchOption(branch){
  const select=document.getElementById('certExternalBranchV13');if(!select)return;
  let option=[...select.options].find(item=>item.value===branch.id);
  if(!option){option=document.createElement('option');option.value=branch.id;option.textContent=branch.name;select.appendChild(option);}
  select.value=branch.id;
}
async function addBranch(){
  if(branchSaveInFlight)return;
  if(!canEditCertificates())return alert('الحساب الحالي لا يملك صلاحية تعديل الشهادات.');
  const name=String(prompt('اسم فرع الشهادة الجديد:')||'').trim();if(!name)return;
  if(state.certificateBranches.some(item=>item.name.trim().toLowerCase()===name.toLowerCase()))return alert('هذا الفرع موجود مسبقًا.');
  const branch={id:uid('cert-branch'),recordCode:uid('cert-branch-record'),name,createdAt:Date.now()};
  state.certificateBranches.push(branch);branchSaveInFlight=true;syncBranchButtonBusy();
  try{await persist();addBranchOption(branch);}
  catch(error){state.certificateBranches=state.certificateBranches.filter(item=>item.id!==branch.id);writeLocal();console.error('EFC certificate branch save failed.',error);alert('تعذر حفظ فرع الشهادة. لم يتم تغيير البيانات المدخلة.');}
  finally{branchSaveInFlight=false;syncBranchButtonBusy();}
}
function historyRows(){return[...state.certificateReceipts].sort((a,b)=>b.date.localeCompare(a.date)||Number(b.timestamp)-Number(a.timestamp)).map(receipt=>`<tr class="cert-history-row-v13" data-certificate="${esc(receipt.id)}" data-date="${esc(receipt.date)}"><td>${padReceipt(receipt.receiptNo)}</td><td><b>${esc(receipt.studentName)}</b><small>${esc(receipt.phone||'')}</small></td><td>${receipt.studentType==='internal'?'مسجل':'خارجي'}</td><td>${esc(receipt.branchName)}</td><td>${esc(receipt.specialtyName)}</td><td>${cash(receipt.amount)}</td><td>${esc(receipt.method)}</td><td>${showDate(receipt.date)}</td></tr>`).join('');}
function renderHistoryRows(){return historyRows();}
function syncIssueButton(){const issue=document.getElementById('certIssueV13');if(issue)issue.disabled=issueInFlight||!canEditCertificates()||(mode==='internal'&&!selectedStudentId);}
function selectedStudent(){const student=students.find(item=>String(item.id)===String(selectedStudentId));if(!isOperationalStudent(student))selectedStudentId=null;return isOperationalStudent(student)?student:null;}
function selectedStudentMarkup(student){const reg=String(student.reg??'').padStart(4,'0');return`<div class="efc-cert-selected-main-v38"><span class="efc-cert-selected-kicker-v38">الطالب المختار</span><strong>${esc(student.name||'—')}</strong><div class="efc-cert-selected-facts-v38"><span><small>الهاتف</small><b>${esc(student.phone||'—')}</b></span><span><small>رقم السجل</small><b>${esc(reg)}</b></span><span><small>الفرع</small><b>${esc(branchName(student.branch))}</b></span><span><small>الدورة</small><b>${esc(spec(student.specialty)?.name||student.specialty||'—')}</b></span></div></div><button type="button" class="efc-cert-cancel-student-v38" aria-label="إلغاء اختيار الطالب">${X_ICON}<span>إلغاء الاختيار</span></button>`;}
function selectStudent(id){const student=students.find(item=>String(item.id)===String(id));selectedStudentId=isOperationalStudent(student)?String(student.id):null;renderStudentPicker();}
function clearStudentSelection(){selectedStudentId=null;renderStudentPicker();}
function resetTransientIssueState(){selectedStudentId=null;historyOpen=false;}
function renderStudentPicker(){
  const root=document.getElementById('certStudentResultsV13'),host=document.querySelector('.efc-cert-selected-host-v40'),filters=document.querySelector('.efc-cert-student-filters-v38');
  if(!root||!host||!filters)return;
  const branch=document.getElementById('certInternalBranchV13')?.value||'',specialty=document.getElementById('certInternalSpecV13')?.value||'',query=String(document.getElementById('certStudentSearchV13')?.value||'').trim().toLowerCase();
  const student=selectedStudent(),matches=query?students.filter(item=>isOperationalStudent(item)&&(!branch||item.branch===branch)&&(!specialty||item.specialty===specialty)&&(String(item.name||'').toLowerCase().includes(query)||String(item.phone||'').includes(query)||String(item.reg||'').includes(query))).slice(0,30):[];
  root.innerHTML=!query?'<div class="cert-empty-v13">اكتب الاسم أو الهاتف أو رقم السجل، ويمكنك استخدام الفرع والتخصص فقط لتضييق النتائج.</div>':matches.length?matches.map(item=>`<button class="cert-student-option-v13${String(student?.id)===String(item.id)?' is-selected':''}" data-student="${esc(item.id)}" type="button" aria-pressed="${String(student?.id)===String(item.id)?'true':'false'}"><b>${esc(item.name)}</b><span>${esc(item.phone||'—')} · سجل ${String(item.reg??'').padStart(4,'0')} · ${esc(branchName(item.branch))} · ${esc(spec(item.specialty)?.name||item.specialty||'—')}</span></button>`).join(''):'<div class="cert-empty-v13">لا يوجد طالب مطابق.</div>';
  root.querySelectorAll('[data-student]').forEach(button=>button.addEventListener('click',()=>selectStudent(button.dataset.student)));
  const pane=document.getElementById('certInternalPaneV13');pane?.classList.toggle('efc-cert-has-selected-v38',Boolean(student));
  filters.hidden=Boolean(student);
  host.hidden=!student;
  host.innerHTML=student?selectedStudentMarkup(student):'';
  host.querySelector('.efc-cert-cancel-student-v38')?.addEventListener('click',clearStudentSelection);
  syncIssueButton();
}
function placePaymentControls(){
  const form=document.querySelector('.cert-form-v13'),pane=document.getElementById('certInternalPaneV13'),anchor=document.querySelector('.efc-cert-payment-anchor-v40'),payment=document.querySelector('.cert-payment-v13'),issue=document.getElementById('certIssueV13');
  if(!form||!pane||!anchor||!payment||!issue)return;
  if(mode==='internal'){payment.classList.add('efc-cert-internal-payment-v40');issue.classList.add('efc-cert-internal-issue-v40');pane.append(payment,issue);}
  else{payment.classList.remove('efc-cert-internal-payment-v40');issue.classList.remove('efc-cert-internal-issue-v40');anchor.after(payment);payment.after(issue);}
}
function switchMode(next){
  mode=next==='external'?'external':'internal';
  document.querySelectorAll('.cert-mode-v13 button').forEach(button=>button.classList.toggle('active',button.dataset.mode===mode));
  const internal=document.getElementById('certInternalPaneV13'),external=document.getElementById('certExternalPaneV13');
  if(internal)internal.hidden=historyOpen||mode!=='internal';if(external)external.hidden=historyOpen||mode==='internal';
  placePaymentControls();
  const payment=document.querySelector('.cert-payment-v13'),issue=document.getElementById('certIssueV13');if(payment)payment.hidden=historyOpen;if(issue)issue.hidden=historyOpen;
  syncIssueButton();syncBranchButtonBusy();
}
function formatHistoryDate(value){const match=String(value||'').match(/^(\d{4})-(\d{2})-(\d{2})$/);return match?`${match[3]}/${match[2]}/${match[1]}`:'اختر التاريخ';}
function applyHistoryDateFilter(){
  const from=document.getElementById('certHistoryFromV13')?.value||'',to=document.getElementById('certHistoryToV13')?.value||'';let visible=0;
  document.querySelectorAll('.cert-history-row-v13').forEach(row=>{const date=String(row.dataset.date||'');const show=(!from||!date||date>=from)&&(!to||!date||date<=to);row.hidden=!show;if(show)visible+=1;});
  const count=document.querySelector('.cert-history-v13 .section-head>span');if(count)count.textContent=`${visible} عملية`;
}
function syncHistoryDate(input){const value=input?.closest('label')?.querySelector('.efc-cert-history-date-value-v37');if(value)value.textContent=formatHistoryDate(input.value);applyHistoryDateFilter();}
function setHistoryMode(show){
  historyOpen=Boolean(show);const form=document.querySelector('.cert-form-v13'),history=document.querySelector('.cert-history-v13'),toggle=document.querySelector('.efc-cert-history-toggle-v36'),filters=document.querySelector('.efc-cert-history-filters-v36');
  if(form)form.dataset.efcHistoryOpenV36=historyOpen?'1':'0';if(history)history.hidden=!historyOpen;if(filters)filters.hidden=!historyOpen;
  if(toggle){toggle.classList.toggle('active',historyOpen);toggle.innerHTML=historyOpen?`${BACK_ICON}<span>العودة للإصدار</span>`:`${HISTORY_ICON}<span>سجل الشهادات</span>`;toggle.setAttribute('aria-pressed',historyOpen?'true':'false');}
  switchMode(mode);if(historyOpen)applyHistoryDateFilter();
}
async function issueReceipt(){
  if(issueInFlight)return;
  if(!canEditCertificates())return alert('الحساب الحالي لا يملك صلاحية تعديل الشهادات.');
  const amount=Math.max(0,Number(document.getElementById('certAmountV13')?.value||0)),method=String(document.getElementById('certMethodV13')?.value||'').trim();
  if(amount<=0)return alert('أدخل مبلغًا صحيحًا.');if(!method)return alert('اختر وسيلة الدفع.');
  let data;
  if(mode==='internal'){
    const student=students.find(item=>String(item.id)===String(selectedStudentId));if(!student||!isOperationalStudent(student))return alert('اختر الطالب المسجل أولًا.');const specialty=spec(student.specialty);
    data={studentType:'internal',studentId:student.id,studentName:student.name,phone:student.phone||'',reg:student.reg,specialtyId:student.specialty,specialtyName:specialty?.name||student.specialty,branchType:'internal',branchId:student.branch,branchName:branchName(student.branch)};
  }else{
    const name=String(document.getElementById('certExternalNameV13')?.value||'').trim(),phone=String(document.getElementById('certExternalPhoneV13')?.value||'').trim(),reg=String(document.getElementById('certExternalRegV13')?.value||'').trim(),specialtyId=String(document.getElementById('certExternalSpecV13')?.value||''),branchId=String(document.getElementById('certExternalBranchV13')?.value||''),specialty=spec(specialtyId),branch=state.certificateBranches.find(item=>item.id===branchId);
    if(!name)return alert('أدخل اسم الطالب.');if(!reg)return alert('أدخل رقم تسجيل الطالب.');if(!specialty)return alert('اختر الدورة.');if(!branch)return alert('اختر فرع الشهادة أو أضف فرعًا جديدًا.');
    data={studentType:'external',studentId:null,studentName:name,phone,reg,specialtyId,specialtyName:specialty.name,branchType:'certificate',branchId:branch.id,branchName:branch.name};
  }
  const receipt=normalizeReceipt({...data,id:uid('certificate'),recordCode:uid('certificate-record'),transactionCode:uid('certificate-tx'),receiptNo:nextReceiptNo(),amount,method,date:today(),time:nowTime(),timestamp:Date.now(),createdAt:Date.now()});
  issueInFlight=true;syncIssueButton();state.certificateReceipts.unshift(receipt);
  try{await persist();}
  catch(error){state.certificateReceipts=state.certificateReceipts.filter(item=>item.id!==receipt.id);writeLocal();issueInFlight=false;syncIssueButton();console.error('EFC certificate issue failed.',error);alert('تعذر حفظ الشهادة. لم يتم اعتماد العملية، ويمكنك المحاولة مجددًا.');return;}
  issueInFlight=false;renderCertificates();openReceipt(receipt);
}

function renderCertificates(){
  resetTransientIssueState();
  currentPage='certificates';document.body.classList.add('efc-certificates-redesign-v35','efc-certificates-workspace-v36');
  const branchOptions=state.certificateBranches.map(item=>`<option value="${esc(item.id)}">${esc(item.name)}</option>`).join(''),editable=canEditCertificates(),date=today();
  const title=`<div class="page-title efc-cert-hero-v35 efc-cert-hero-v36"><div><span class="efc-cert-title-icon-v36">${CERT_ICON}</span><h1>روسي الشهادة</h1></div></div>`;
  const payment=`<div class="grid two cert-payment-v13"><label>المبلغ<input class="input" id="certAmountV13" type="number" min="1" autocomplete="off" placeholder="المبلغ" required ${editable?'':'disabled'}></label><label>وسيلة الدفع<select id="certMethodV13" ${editable?'':'disabled'}>${methods.map(item=>`<option>${esc(item)}</option>`).join('')}</select></label></div><button class="button" type="button" id="certIssueV13" disabled>إصدار روسي الشهادة</button>`;
  const history=`<div class="card cert-history-v13" hidden><div class="section-head"><h2>سجل روسيات الشهادات</h2><span>${state.certificateReceipts.length} عملية</span></div>${table(['رقم الروسي','الطالب','النوع','الفرع','الدورة','المبلغ','وسيلة الدفع','التاريخ'],renderHistoryRows())}</div>`;
  shell(`${title}<div class="cert-layout-v13"><div class="card cert-form-v13" data-efc-history-open-v36="0"><div class="efc-cert-workspace-toolbar-v36"><div class="cert-mode-v13"><button type="button" data-mode="internal">طالب مسجل</button><button type="button" data-mode="external">طالب خارجي</button></div><div class="efc-cert-history-actions-v36"><div class="efc-cert-history-filters-v36" hidden><label class="efc-cert-history-date-v36"><span class="efc-cert-history-date-caption-v37">من</span><span class="efc-cert-history-date-value-v37">${formatHistoryDate(date)}</span><input id="certHistoryFromV13" type="date" value="${date}" aria-label="من تاريخ"></label><label class="efc-cert-history-date-v36"><span class="efc-cert-history-date-caption-v37">إلى</span><span class="efc-cert-history-date-value-v37">${formatHistoryDate(date)}</span><input id="certHistoryToV13" type="date" value="${date}" aria-label="إلى تاريخ"></label></div><button type="button" class="efc-cert-history-toggle-v36" aria-pressed="false">${HISTORY_ICON}<span>سجل الشهادات</span></button></div></div><div id="certInternalPaneV13"><label class="efc-cert-student-search-v38">ابحث عن الطالب<input class="input" id="certStudentSearchV13" autocomplete="off" placeholder="ابحث عن الطالب"></label><div class="grid two efc-cert-student-filters-v38"><label>الفرع<select id="certInternalBranchV13"><option value="">كل الفروع</option>${branches.map(item=>`<option value="${esc(item.id)}">${esc(item.name)}</option>`).join('')}</select></label><label>التخصص<select id="certInternalSpecV13"><option value="">كل التخصصات</option>${specialties.map(item=>`<option value="${esc(item.id)}">${esc(item.name)}</option>`).join('')}</select></label></div><div id="certStudentResultsV13" class="cert-results-v13"></div><div class="efc-cert-selected-host-v40" hidden></div>${payment}</div><div id="certExternalPaneV13" hidden><div class="grid two"><label>اسم الطالب<input class="input" id="certExternalNameV13" autocomplete="off" placeholder="اسم الطالب" ${editable?'':'disabled'}></label><label>رقم الهاتف<input class="input" id="certExternalPhoneV13" autocomplete="off" placeholder="رقم الهاتف" ${editable?'':'disabled'}></label><label>رقم التسجيل<input class="input" id="certExternalRegV13" inputmode="numeric" autocomplete="off" placeholder="رقم التسجيل" required ${editable?'':'disabled'}></label><label>الدورة<select id="certExternalSpecV13" ${editable?'':'disabled'}><option value="">اختر الدورة</option>${specialties.map(item=>`<option value="${esc(item.id)}">${esc(item.name)}</option>`).join('')}</select></label><label>فرع الشهادة<select id="certExternalBranchV13" ${editable?'':'disabled'}><option value="">اختر فرع الشهادة</option>${branchOptions}</select></label></div><button type="button" class="mini" id="certAddBranchV13" ${editable?'':'disabled'}>＋ إضافة فرع شهادة</button></div><span class="efc-cert-payment-anchor-v40" hidden></span>${history}</div></div>`);
  document.querySelectorAll('.cert-mode-v13 button').forEach(button=>button.addEventListener('click',()=>{setHistoryMode(false);switchMode(button.dataset.mode);}));
  document.getElementById('certInternalBranchV13').addEventListener('change',renderStudentPicker);
  document.getElementById('certInternalSpecV13').addEventListener('change',renderStudentPicker);
  document.getElementById('certStudentSearchV13').addEventListener('input',renderStudentPicker);
  document.getElementById('certAddBranchV13').addEventListener('click',addBranch);
  document.getElementById('certIssueV13').addEventListener('click',issueReceipt);
  document.querySelector('.efc-cert-history-toggle-v36').addEventListener('click',()=>setHistoryMode(!historyOpen));
  document.querySelectorAll('.efc-cert-history-date-v36 input').forEach(input=>{input.addEventListener('input',()=>syncHistoryDate(input));input.addEventListener('change',()=>syncHistoryDate(input));});
  document.querySelectorAll('.cert-history-row-v13').forEach(row=>row.addEventListener('click',()=>{const receipt=state.certificateReceipts.find(item=>item.id===row.dataset.certificate);if(receipt)openReceipt(receipt);}));
  renderStudentPicker();setHistoryMode(false);switchMode(mode);window.EFC_AUTOCOMPLETE_OFF_V13?.(document.querySelector('.cert-form-v13'));
}
function ensureSidebar(){if(!navItems.some(item=>item[0]==='certificates')){const financeIndex=navItems.findIndex(item=>item[0]==='finance'),icon='<svg viewBox="0 0 24 24" aria-hidden="true"><g fill="none" stroke="currentColor" stroke-width="1.8"><path d="M6 3.5h12v11H6z"/><circle cx="12" cy="17" r="3"/></g></svg>';navItems.splice(financeIndex>=0?financeIndex:navItems.length,0,['certificates',icon,'الشهادات']);}}

async function boot(){
  await loadState();ensureSidebar();
  const baseAllPayments=allPayments;
  allPayments=function(){const combined=[...baseAllPayments(),...state.certificateReceipts.map(certificatePayment)];return combined.sort((a,b)=>String(b.date||'').localeCompare(String(a.date||''))||Number(b.order||0)-Number(a.order||0)||String(b.time||'').localeCompare(String(a.time||'')));};
  window.EFC_REGISTER_STATE_CONTRIBUTOR?.('certificates',snapshot=>Object.assign(snapshot,{certificateBranches:state.certificateBranches,certificateReceipts:state.certificateReceipts}));
  const baseApply=window.EFC_APPLY_RESTORED_STATE;if(typeof baseApply==='function')window.EFC_APPLY_RESTORED_STATE=async incoming=>{const result=await baseApply(incoming);if(Array.isArray(incoming?.certificateBranches)||Array.isArray(incoming?.certificateReceipts)){state=mergeState(state,{certificateBranches:incoming.certificateBranches||[],certificateReceipts:incoming.certificateReceipts||[]});await persist();}return result;};

  window.EFC_OPEN_CERTIFICATE_RECEIPT_V13=openReceipt;
  window.EFC_SAVE_CERTIFICATE_PDF_V13=savePdf;
  window.EFC_FIND_CERTIFICATE_V13=id=>state.certificateReceipts.find(item=>String(item.id)===String(id))||null;
  window.EFC_RENDER_CERTIFICATES_V13=renderCertificates;
  window.EFC_CERTIFICATES_V13=Object.freeze({ready:true,consolidatedRenderer:true,singleStudentSelectionState:true,directSelectionControls:true,freshIssueStateAfterRender:true,asyncIssueGuard:true,branchAddPreservesDraft:true,separateCertificateFinance:true,externalCertificateBranches:true,internalBranchAndSpecialtyFilter:true,internalSearchWithoutRequiredFilters:true,certificateStudentResultsClickable:true,certificateReceiptInAppViewer:true,externalRegistrationNative:true,externalReceiptIssueEnabled:true,certificateIncomeInLedgerAndFinance:true,receiptHeaderUnified:true,certificateReceiptTitleLarge:true,certificateManagementTitleBelowHeader:true,paymentMethodsFromSettings:true,certificateReceiptHeaderSimplified:true,certificateFeeNoteRemoved:true,permissionsEnforced:true,noObserverPatch:true,noRouterHook:true,cleanReceiptDependency:true});
}

boot().catch(error=>{console.error('EFC certificates v13 failed to initialize.',error);throw error;});
})();
