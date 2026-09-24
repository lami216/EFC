(function bankModule(){
'use strict';
if(window.EFC_BANK_V22?.ready)return;
if(!window.EFC_RECEIPTS_V13?.ready||typeof shell!=='function')throw new Error('Bank v22 loaded before receipt/foundation runtime.');

const STORAGE_KEY='efc-bank-state-v22';
const invoke=window.__TAURI__?.core?.invoke;
const esc=value=>String(value??'').replace(/[&<>"']/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
const pad2=value=>String(value).padStart(2,'0');
const today=()=>typeof deviceTodayV3==='function'?deviceTodayV3():(()=>{const d=new Date();return`${d.getFullYear()}-${pad2(d.getMonth()+1)}-${pad2(d.getDate())}`;})();
const showDate=value=>typeof fmtDateV3==='function'?fmtDateV3(value):String(value||'—');
const cash=value=>typeof moneyV3==='function'?moneyV3(value):`${Number(value||0)} أوقية`;
const uid=prefix=>`${prefix}-${Date.now().toString(36)}-${globalThis.crypto?.randomUUID?.().replaceAll('-','').slice(0,12)||Math.random().toString(36).slice(2,14)}`;
const canEditBank=()=>window.EFC_AUTH_BOOTSTRAP_V13?.canEdit?.('bank')??true;
const receiptLogo=()=>window.EFC_RECEIPT_LOGO_DATA_URI||new URL('./efc-logo.svg',location.href).href;
let state={entries:[],nextReceiptNo:1,tombstones:[]},editingId=null,saveChain=Promise.resolve();

function normalizeEntry(item){
  if(!item||typeof item!=='object')return null;
  const amount=Math.max(0,Number(item.amount||0)),statement=String(item.statement||item.note||'').trim();
  if(amount<=0||!statement)return null;
  return{
    id:String(item.id||uid('bank')),
    recordCode:String(item.recordCode||uid('bank-record')),
    receiptNo:Math.max(1,Number(item.receiptNo||1)),
    type:item.type==='out'?'out':'in',
    amount,
    statement,
    date:String(item.date||today()),
    time:String(item.time||'00:00'),
    createdAt:Math.max(0,Number(item.createdAt||Date.now())),
    updatedAt:Math.max(0,Number(item.updatedAt||item.createdAt||Date.now()))
  };
}
function normalizeTombstone(item){
  if(!item||typeof item!=='object')return null;
  const recordCode=String(item.recordCode||'').trim(),id=String(item.id||'').trim();
  if(!recordCode&&!id)return null;
  return{recordCode,id,deletedAt:Math.max(0,Number(item.deletedAt||Date.now()))};
}
function normalizeState(raw){
  const source=raw&&typeof raw==='object'?raw:{},tombstoneMap=new Map();
  (Array.isArray(source.tombstones)?source.tombstones:Array.isArray(source.bankTombstones)?source.bankTombstones:[]).map(normalizeTombstone).filter(Boolean).forEach(item=>{
    const key=item.recordCode?`r:${item.recordCode}`:`i:${item.id}`,old=tombstoneMap.get(key);if(!old||item.deletedAt>=old.deletedAt)tombstoneMap.set(key,item);
  });
  const tombstones=[...tombstoneMap.values()],deadRecord=new Set(tombstones.map(item=>item.recordCode).filter(Boolean)),deadId=new Set(tombstones.map(item=>item.id).filter(Boolean)),entryMap=new Map();
  (Array.isArray(source.entries)?source.entries:Array.isArray(source.bankEntries)?source.bankEntries:[]).map(normalizeEntry).filter(Boolean).forEach(item=>{
    if(deadRecord.has(item.recordCode)||deadId.has(item.id))return;
    const key=item.recordCode?`r:${item.recordCode}`:`i:${item.id}`,old=entryMap.get(key);if(!old||item.updatedAt>=old.updatedAt)entryMap.set(key,item);
  });
  const entries=[...entryMap.values()],maxReceipt=Math.max(0,...entries.map(item=>Number(item.receiptNo||0))),configured=Math.max(1,Number(source.nextReceiptNo||source.bankNextReceiptNo||1));
  return{entries,nextReceiptNo:Math.max(configured,maxReceipt+1),tombstones};
}
function mergeState(aRaw,bRaw){
  const a=normalizeState(aRaw),b=normalizeState(bRaw);
  return normalizeState({entries:[...a.entries,...b.entries],tombstones:[...a.tombstones,...b.tombstones],nextReceiptNo:Math.max(a.nextReceiptNo,b.nextReceiptNo)});
}
function readLocal(){try{return normalizeState(JSON.parse(localStorage.getItem(STORAGE_KEY)||'{}'));}catch{return normalizeState({});}}
function writeLocal(){localStorage.setItem(STORAGE_KEY,JSON.stringify(state));}
async function persist(){
  writeLocal();
  if(!invoke){window.EFC_CORE_CHANGED?.();return;}
  const snapshot=JSON.stringify(state);
  saveChain=saveChain.catch(()=>undefined).then(()=>invoke('save_bank_state',{state:snapshot}));
  await saveChain;
  window.EFC_CORE_CHANGED?.();
}
async function loadState(){
  const local=readLocal();
  if(!invoke){state=local;return;}
  try{
    const raw=await invoke('load_bank_state'),native=raw?normalizeState(JSON.parse(raw)):normalizeState({});
    state=mergeState(native,local);await persist();
  }catch(error){console.error('EFC bank state load failed; local state kept.',error);state=local;}
}
function nextReceiptNo(){const floor=Math.max(1,...state.entries.map(item=>Number(item.receiptNo||0)+1)),number=Math.max(floor,Number(state.nextReceiptNo||1));state.nextReceiptNo=number+1;writeLocal();return number;}
function nowTime(){const d=new Date();return`${pad2(d.getHours())}:${pad2(d.getMinutes())}`;}
function receiptCode(entry){return String(Math.max(1,Number(entry?.receiptNo||1))).padStart(5,'0');}
const whatsappIcon=()=>`<span class="socialIcon12" aria-hidden="true"><svg viewBox="0 0 32 32"><path d="M16.05 3.2A12.65 12.65 0 0 0 5.2 22.34L3.5 28.5l6.3-1.65a12.63 12.63 0 1 0 6.25-23.65Zm0 22.98a10.4 10.4 0 0 1-5.3-1.45l-.38-.23-3.74.98 1-3.64-.25-.38a10.42 10.42 0 1 1 8.67 4.72Zm5.72-7.8c-.31-.16-1.85-.91-2.14-1.02-.28-.1-.49-.16-.7.16-.2.31-.8 1.02-.98 1.23-.18.2-.36.23-.67.08-.31-.16-1.31-.48-2.5-1.54-.92-.82-1.55-1.84-1.73-2.15-.18-.31-.02-.48.14-.64.14-.14.31-.36.47-.55.16-.18.2-.31.31-.52.1-.2.05-.39-.03-.55-.08-.16-.7-1.68-.96-2.3-.25-.6-.51-.52-.7-.53h-.6c-.2 0-.54.08-.83.39-.28.31-1.08 1.05-1.08 2.57 0 1.51 1.1 2.98 1.26 3.18.16.2 2.17 3.31 5.25 4.64.73.32 1.3.5 1.75.64.74.23 1.4.2 1.93.12.59-.09 1.85-.76 2.11-1.49.26-.73.26-1.36.18-1.49-.08-.13-.29-.2-.6-.36Z"/></svg></span>`;
const facebookIcon=()=>`<span class="socialIcon12" aria-hidden="true"><svg viewBox="0 0 32 32"><path d="M18.3 29V17.1h4l.6-4.7h-4.6v-3c0-1.35.37-2.28 2.32-2.28H23V2.94c-.41-.06-1.82-.18-3.47-.18-3.44 0-5.8 2.1-5.8 5.96v3.68H9.84v4.7h3.89V29h4.57Z"/></svg></span>`;
function receiptCss(){return`
*{box-sizing:border-box}body{font-family:Tahoma,Arial,sans-serif;margin:0;background:#eef1f0;color:#111715}.bank-paper-v22{width:1040px;max-width:96vw;margin:18px auto;background:#fff;border:2px solid #293631;padding:12px 18px 18px;direction:ltr}.head12{display:grid;grid-template-columns:240px 1fr 150px;gap:14px;align-items:center;border-bottom:1px solid #b2b8b5;padding-bottom:6px}.contact12{display:grid;grid-template-columns:92px 1fr;gap:8px;align-items:center;direction:ltr;text-align:left}.contact12 img,.logoOnly12 img{width:82px;height:62px;object-fit:contain;display:block}.contactText12{display:grid;gap:1px}.contactText12>b{font-size:13px;white-space:nowrap}.socialLine12{display:flex;align-items:center;gap:5px;font-size:13px;font-weight:700;white-space:nowrap}.socialLine12.teacher12{font-size:10px;margin-top:2px}.socialLine12.teacher12 span:last-child{direction:rtl}.socialIcon12{width:14px;height:14px;display:inline-block;flex:0 0 14px}.socialIcon12 svg{width:100%;height:100%;fill:currentColor}.center12{text-align:center;direction:rtl}.title12{display:flex;direction:ltr;justify-content:center;align-items:baseline;gap:12px;white-space:nowrap;margin:0;font-size:27px}.official12{font-size:11px;font-weight:900;margin-top:3px}.rn12{display:flex;direction:ltr;justify-content:center;gap:9px;margin-top:4px;font-size:17px}.rn12 b{font-size:21px}.logoOnly12{height:66px;display:grid;place-items:center}.bank-kind-v22{text-align:center;direction:rtl;margin:12px 0 10px;font-size:30px;font-weight:950}.bank-kind-v22.in{color:#08745b}.bank-kind-v22.out{color:#a33b32}.bank-meta-v22{display:flex;justify-content:space-between;gap:20px;direction:ltr;border-bottom:1px solid #d9dedc;padding:6px 0}.bank-meta-v22 span{direction:rtl}.bank-row-v22{display:grid;grid-template-columns:160px minmax(0,1fr) 140px;gap:10px;align-items:center;min-height:52px;font-size:14px;direction:ltr}.bank-row-v22>span:first-child{text-align:left;font-weight:700}.bank-row-v22>span:last-child{text-align:right;direction:rtl;font-weight:800}.bank-track-v22{position:relative;min-height:36px;display:flex;align-items:center;justify-content:center}.bank-track-v22:before{content:"";position:absolute;left:0;right:0;top:50%;border-top:2px dotted #7d8581}.bank-track-v22 b{position:relative;background:#fff;padding:0 12px;direction:rtl;font-size:17px}.bank-amount-v22 b{font-size:24px;color:#7d2e2e}.bank-actions-v22{width:1040px;max-width:96vw;margin:0 auto 18px;display:flex;direction:rtl;gap:8px}.bank-actions-v22 button{border:0;border-radius:7px;padding:10px 17px;font:700 13px Tahoma;cursor:pointer}.bank-print-v22{background:#155ea8;color:#fff}.bank-save-v22{background:#159a55;color:#fff}@media print{body{background:#fff}.bank-paper-v22{width:100%;max-width:none;margin:0;border:1px solid #222}.bank-actions-v22{display:none}@page{size:landscape;margin:8mm}}
`;}
function receiptHeader(entry){
  const img=`<img src="${receiptLogo()}" alt="EFC">`;
  return`<div class="head12"><div class="contact12">${img}<div class="contactText12"><b>Tél: 48 02 84 84</b><div class="socialLine12">${whatsappIcon()}<span>32 09 86 89</span></div><div class="socialLine12 teacher12">${facebookIcon()}<span>الأستاذ محمد ديدي</span></div></div></div><div class="center12"><h1 class="title12"><span>Centre EFC</span><span>مركز</span></h1><div class="official12">للغات والمعلوماتية</div><div class="rn12"><span>Pièce N°</span><b>${receiptCode(entry)}</b><span>سند رقم</span></div></div><div class="logoOnly12">${img}</div></div>`;
}
function receiptBody(entry){
  const kind=entry.type==='out'?'صرف':'دخل';
  return`${receiptHeader(entry)}<div class="bank-kind-v22 ${entry.type}">${kind}</div><div class="bank-meta-v22"><span>التاريخ: <b>${showDate(entry.date)}</b></span><span>الوقت: <b>${esc(entry.time||'—')}</b></span></div><div class="bank-row-v22 bank-amount-v22"><span>Montant</span><span class="bank-track-v22"><b>${cash(entry.amount)}</b></span><span>المبلغ</span></div><div class="bank-row-v22"><span>Libellé</span><span class="bank-track-v22"><b>${esc(entry.statement)}</b></span><span>البيان</span></div>`;
}
function receiptDocument(entry,actions=true,autoPrint=false){
  const data=JSON.stringify(entry).replace(/</g,'\\u003c');
  return`<!doctype html><html lang="ar" dir="rtl"><head><meta charset="utf-8"><title>روسي البنك ${receiptCode(entry)}</title><style>${receiptCss()}</style></head><body><div class="bank-paper-v22">${receiptBody(entry)}</div>${actions?`<div class="bank-actions-v22"><button class="bank-print-v22" onclick="print()">طباعة</button><button class="bank-save-v22" onclick="parent.EFC_SAVE_BANK_RECEIPT_PDF_V22(BANK_ENTRY)">حفظ PDF</button></div>`:''}<script>const BANK_ENTRY=${data};${autoPrint?'setTimeout(()=>print(),250);':''}<\/script></body></html>`;
}
function openReceipt(entry,autoPrint=false){
  if(!entry)return null;
  const modal=document.createElement('div');modal.className='modal receipt-viewer-v13';modal.innerHTML='<div class="receipt-viewer-card-v13"><div class="receipt-viewer-head-v13"><b>عرض روسي البنك</b><button class="receipt-viewer-close-v13" type="button">×</button></div><iframe class="receipt-viewer-frame-v13" title="روسي البنك"></iframe></div>';
  document.body.appendChild(modal);const frame=modal.querySelector('iframe'),close=()=>modal.remove();modal.querySelector('.receipt-viewer-close-v13').onclick=close;frame.srcdoc=receiptDocument(entry,true,autoPrint);return{close,frame};
}
function loadLocal(src,key){if(window[key])return Promise.resolve();return new Promise((resolve,reject)=>{const script=document.createElement('script');script.src=src;script.onload=resolve;script.onerror=()=>reject(new Error(`تعذر تحميل ${src} محليًا.`));document.head.appendChild(script);});}
async function waitImages(root){await Promise.all([...root.querySelectorAll('img')].map(async image=>{if(!image.complete||!image.naturalWidth)await new Promise(resolve=>{const done=()=>resolve();image.addEventListener('load',done,{once:true});image.addEventListener('error',done,{once:true});setTimeout(done,1600);});try{await image.decode?.();}catch{}}));try{await root.ownerDocument.fonts?.ready;}catch{}}
function bufferToBase64(buffer){const bytes=new Uint8Array(buffer);let binary='';for(let i=0;i<bytes.length;i+=0x8000)binary+=String.fromCharCode(...bytes.subarray(i,Math.min(i+0x8000,bytes.length)));return btoa(binary);}
async function saveReceiptPdf(entry){
  let stage;
  try{
    await Promise.all([loadLocal('./vendor/html2canvas.min.js','html2canvas'),loadLocal('./vendor/jspdf.umd.min.js','jspdf')]);
    stage=document.createElement('div');stage.style.cssText='position:fixed;left:-16000px;top:0;width:1040px;background:#fff;z-index:-9999';stage.innerHTML=`<style>${receiptCss()}</style><div class="bank-paper-v22">${receiptBody(entry)}</div>`;document.body.appendChild(stage);
    const paper=stage.querySelector('.bank-paper-v22');await waitImages(paper);const canvas=await window.html2canvas(paper,{scale:2,backgroundColor:'#fff',useCORS:false,allowTaint:false,logging:false}),{jsPDF}=window.jspdf,pdf=new jsPDF({orientation:'landscape',unit:'mm',format:'a4'}),pw=pdf.internal.pageSize.getWidth(),ph=pdf.internal.pageSize.getHeight(),ratio=Math.min(pw/canvas.width,ph/canvas.height),w=canvas.width*ratio,h=canvas.height*ratio;pdf.addImage(canvas.toDataURL('image/jpeg',.96),'JPEG',(pw-w)/2,(ph-h)/2,w,h);
    const fileName=`روسي-البنك-${receiptCode(entry)}.pdf`;if(!invoke){pdf.save(fileName);return fileName;}const saved=await invoke('save_receipt_pdf',{fileName,dataBase64:bufferToBase64(pdf.output('arraybuffer'))});if(saved)alert(`تم حفظ روسي البنك:\n${saved}`);return saved;
  }catch(error){if(error?.name==='AbortError')return null;console.error('EFC bank receipt PDF failed.',error);alert(String(error?.message||error||'تعذر حفظ روسي البنك.'));return null;}finally{stage?.remove();}
}
function totals(){return state.entries.reduce((acc,item)=>{if(item.type==='out')acc.out+=Number(item.amount||0);else acc.in+=Number(item.amount||0);return acc;},{in:0,out:0});}
function sortedEntries(){return [...state.entries].sort((a,b)=>String(b.date).localeCompare(String(a.date))||String(b.time).localeCompare(String(a.time))||Number(b.createdAt)-Number(a.createdAt));}
function ensureStyle(){
  if(document.getElementById('efc-bank-style-v22'))return;
  const style=document.createElement('style');style.id='efc-bank-style-v22';style.textContent=`
.bank-hero-v22{width:min(470px,100%);height:76px;margin:0 auto 14px;border-radius:15px;background:linear-gradient(110deg,#dcf6ee,#e8faf5 68%,#e4f7f2);display:flex;align-items:center;justify-content:center;gap:18px;color:#073f35;position:relative}.bank-hero-v22:after{content:"";position:absolute;bottom:10px;left:50%;width:48px;height:3px;border-radius:99px;background:#0b7b62;transform:translateX(-50%)}.bank-hero-v22 svg{width:38px;height:38px}.bank-hero-v22 h1{margin:0;font-size:31px}.bank-form-v22{display:grid;grid-template-columns:130px 150px 150px minmax(240px,1fr) auto;gap:10px;align-items:end;margin-bottom:12px}.bank-form-v22 label{display:grid;gap:5px;font-size:10px;font-weight:750}.bank-form-v22 input,.bank-form-v22 select,.bank-form-v22 textarea{width:100%;min-width:0;border:1px solid #ccd9d4;border-radius:8px;background:#fff;font-family:inherit;font-size:11px;padding:8px}.bank-form-v22 textarea{height:40px;min-height:40px;max-height:40px;resize:none;overflow:auto}.bank-form-v22 .button{height:40px}.bank-edit-note-v22{grid-column:1/-1;color:#795b24;font-size:9px}.bank-kpis-v22{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:10px;margin-bottom:12px}.bank-kpis-v22 .card{min-height:76px;display:flex;flex-direction:column;justify-content:center;gap:5px}.bank-kpis-v22 small{color:#63736d;font-size:9px}.bank-kpis-v22 b{font-size:18px}.bank-kpis-v22 .balance b{color:#075844}.bank-table-v22 .bank-type-in{color:#08745b;font-weight:850}.bank-table-v22 .bank-type-out{color:#a33b32;font-weight:850}.bank-actions-cell-v22{display:flex;gap:5px;flex-wrap:wrap}.bank-actions-cell-v22 .mini{height:29px}.bank-actions-cell-v22 .bank-delete-v22{color:#9c332c;border-color:#e5bdb8}.bank-empty-v22{text-align:center;padding:28px;color:#73817c}@media(max-width:1100px){.bank-form-v22{grid-template-columns:repeat(2,minmax(0,1fr))}.bank-form-v22 label:nth-child(4){grid-column:1/-1}.bank-form-v22 .button{width:100%}}@media(max-width:760px){.bank-kpis-v22{grid-template-columns:1fr}.bank-form-v22{grid-template-columns:1fr}.bank-form-v22 label:nth-child(4){grid-column:auto}}
`;document.head.appendChild(style);
}
async function saveEntry(){
  if(!canEditBank())return alert('الحساب الحالي لا يملك صلاحية تعديل البنك.');
  const type=document.getElementById('bankTypeV22')?.value==='out'?'out':'in',amount=Math.max(0,Number(document.getElementById('bankAmountV22')?.value||0)),statement=String(document.getElementById('bankStatementV22')?.value||'').trim(),date=String(document.getElementById('bankDateV22')?.value||today());
  if(amount<=0)return alert('أدخل مبلغًا صحيحًا.');if(!statement)return alert('أدخل البيان أو الملاحظة.');
  const current=editingId?state.entries.find(item=>item.id===editingId):null,entry=normalizeEntry(current?{...current,type,amount,statement,date,updatedAt:Date.now()}:{id:uid('bank'),recordCode:uid('bank-record'),receiptNo:nextReceiptNo(),type,amount,statement,date,time:nowTime(),createdAt:Date.now(),updatedAt:Date.now()});
  if(!entry)return alert('تعذر تجهيز حركة البنك.');
  if(current)state.entries=state.entries.map(item=>item.id===current.id?entry:item);else state.entries.push(entry);
  try{await persist();editingId=null;renderBank();if(!current)openReceipt(entry);}catch(error){console.error('EFC bank save failed.',error);alert('تعذر حفظ حركة البنك.');}
}
function beginEdit(id){const entry=state.entries.find(item=>item.id===id);if(!entry||!canEditBank())return;editingId=id;renderBank();requestAnimationFrame(()=>document.getElementById('bankStatementV22')?.focus());}
async function deleteEntry(id){
  if(!canEditBank())return alert('الحساب الحالي لا يملك صلاحية تعديل البنك.');
  const entry=state.entries.find(item=>item.id===id);if(!entry)return;
  if(!confirm(`هل تريد حذف حركة البنك رقم ${receiptCode(entry)}؟`))return;
  state.tombstones.push({recordCode:entry.recordCode,id:entry.id,deletedAt:Date.now()});state.entries=state.entries.filter(item=>item.id!==entry.id);if(editingId===id)editingId=null;
  try{await persist();renderBank();}catch(error){console.error('EFC bank delete failed.',error);alert('تعذر حذف حركة البنك.');}
}
function renderBank(){
  ensureStyle();currentPage='bank';const editable=canEditBank(),editing=editingId?state.entries.find(item=>item.id===editingId):null,{in:income,out:outcome}=totals(),balance=income-outcome,rows=sortedEntries();
  const icon='<svg viewBox="0 0 24 24" aria-hidden="true"><g fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="6" width="18" height="14" rx="2"/><path d="M5 6l7-3 7 3M7 11h10M8 15h2m4 0h2"/></g></svg>';
  shell(`<section class="bank-hero-v22">${icon}<h1>البنك</h1></section><div class="card bank-form-v22"><label>نوع الحركة<select id="bankTypeV22" ${editable?'':'disabled'}><option value="in" ${editing?.type!=='out'?'selected':''}>دخل</option><option value="out" ${editing?.type==='out'?'selected':''}>مخرج</option></select></label><label>المبلغ<input class="input" id="bankAmountV22" type="number" min="1" value="${editing?Number(editing.amount||0):''}" ${editable?'':'disabled'}></label><label>التاريخ<input class="input" id="bankDateV22" type="date" value="${esc(editing?.date||today())}" ${editable?'':'disabled'}></label><label>البيان / الملاحظة<textarea id="bankStatementV22" ${editable?'':'disabled'} placeholder="اكتب سبب الحركة أو ملاحظتها">${esc(editing?.statement||'')}</textarea></label><button class="button" id="bankSaveV22" type="button" ${editable?'':'disabled'}>${editing?'حفظ التعديل':'تسجيل الحركة'}</button>${editing?'<div class="bank-edit-note-v22">أنت تعدل حركة موجودة. رقم الروسي سيبقى كما هو.</div>':''}</div><div class="bank-kpis-v22"><div class="card"><small>إجمالي الدخل</small><b>${cash(income)}</b></div><div class="card"><small>إجمالي الصرف</small><b>${cash(outcome)}</b></div><div class="card balance"><small>الرصيد</small><b>${cash(balance)}</b></div></div><div class="card bank-table-v22">${rows.length?`<div class="table-wrap"><table><thead><tr><th>رقم الروسي</th><th>النوع</th><th>المبلغ</th><th>البيان</th><th>التاريخ</th><th>الوقت</th><th>إجراء</th></tr></thead><tbody>${rows.map(entry=>`<tr data-bank-id="${esc(entry.id)}"><td>${receiptCode(entry)}</td><td class="${entry.type==='out'?'bank-type-out':'bank-type-in'}">${entry.type==='out'?'صرف':'دخل'}</td><td>${cash(entry.amount)}</td><td>${esc(entry.statement)}</td><td>${showDate(entry.date)}</td><td>${esc(entry.time)}</td><td><div class="bank-actions-cell-v22"><button class="mini bank-receipt-v22" type="button">روسي</button><button class="mini bank-edit-v22" type="button" ${editable?'':'disabled'}>تعديل</button><button class="mini bank-delete-v22" type="button" ${editable?'':'disabled'}>حذف</button></div></td></tr>`).join('')}</tbody></table></div>`:'<div class="bank-empty-v22">لا توجد حركات بنك مسجلة بعد.</div>'}</div>`);
  document.getElementById('bankSaveV22')?.addEventListener('click',saveEntry);
  document.querySelectorAll('[data-bank-id]').forEach(row=>{const id=row.dataset.bankId,entry=state.entries.find(item=>item.id===id);row.querySelector('.bank-receipt-v22')?.addEventListener('click',()=>openReceipt(entry));row.querySelector('.bank-edit-v22')?.addEventListener('click',()=>beginEdit(id));row.querySelector('.bank-delete-v22')?.addEventListener('click',()=>deleteEntry(id));});
}
function ensureSidebar(){
  if(!Array.isArray(window.navItems)||window.navItems.some(item=>item?.[0]==='bank'))return;
  const icon='<svg viewBox="0 0 24 24" aria-hidden="true"><g fill="none" stroke="currentColor" stroke-width="1.8"><rect x="3" y="6" width="18" height="14" rx="2"/><path d="M5 6l7-3 7 3M7 11h10M8 15h2m4 0h2"/></g></svg>',settingsIndex=navItems.findIndex(item=>item[0]==='settings');navItems.splice(settingsIndex>=0?settingsIndex:navItems.length,0,['bank',icon,'البنك']);
}
async function boot(){
  await loadState();ensureSidebar();
  window.EFC_REGISTER_STATE_CONTRIBUTOR?.('bank-v22',snapshot=>Object.assign(snapshot,{bankEntries:state.entries,bankTombstones:state.tombstones,bankNextReceiptNo:state.nextReceiptNo}));
  const baseApply=window.EFC_APPLY_RESTORED_STATE;if(typeof baseApply==='function')window.EFC_APPLY_RESTORED_STATE=async incoming=>{const result=await baseApply(incoming);if(Array.isArray(incoming?.bankEntries)||Array.isArray(incoming?.bankTombstones)||incoming?.bankNextReceiptNo){state=mergeState(state,{bankEntries:incoming.bankEntries||[],bankTombstones:incoming.bankTombstones||[],bankNextReceiptNo:incoming.bankNextReceiptNo});await persist();}return result;};
  window.EFC_RENDER_BANK_V22=renderBank;
  window.EFC_OPEN_BANK_RECEIPT_V22=openReceipt;
  window.EFC_SAVE_BANK_RECEIPT_PDF_V22=saveReceiptPdf;
  window.EFC_BANK_STATE_V22=Object.freeze({snapshot:()=>JSON.parse(JSON.stringify(state))});
  window.EFC_BANK_V22=Object.freeze({ready:true,bankIndependentFromFinance:true,bankEntriesEditableAndDeletable:true,bankStatementFixedHeight:true,bankUsesIncomeAndExpenseLabels:true,bankReceiptSharedEmbeddedLogo:true,bankBackupRestore:true,bankOwnReceiptSequence:true,noFinanceStreamIntegration:true});
}
boot().catch(error=>{console.error('EFC bank v22 failed to initialize.',error);throw error;});
})();
