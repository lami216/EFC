(()=>{
  const FLAG='__EFC_CERTIFICATES_V7__';
  if(window[FLAG]) return;

  const STORAGE_KEY='efc-certificate-state-v1';
  const invoke=window.__TAURI__?.core?.invoke;
  const esc=value=>String(value??'').replace(/[&<>"']/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
  const pad2=value=>String(value).padStart(2,'0');
  const padReceipt=value=>String(Math.max(0,Number(value||0))).padStart(5,'0');
  const today=()=>typeof deviceTodayV3==='function'?deviceTodayV3():DEMO_TODAY;
  const showDate=value=>typeof fmtDateV3==='function'?fmtDateV3(value):fmtDate(value);
  const cash=value=>typeof moneyV3==='function'?moneyV3(value):money(value);
  const uid=prefix=>`${prefix}-${Date.now().toString(36)}-${globalThis.crypto?.randomUUID?.().replaceAll('-','').slice(0,14)||Math.random().toString(36).slice(2,16)}`;
  const logoUrl=()=>new URL('./efc-logo.svg',location.href).href;

  let certificateState={certificateBranches:[],certificateReceipts:[]};
  let certificateMode='internal';
  let selectedStudentId=null;
  let saveChain=Promise.resolve();

  function normalizeBranch(item){
    const name=String(item?.name||'').trim();
    if(!name) return null;
    return {
      id:String(item?.id||uid('cert-branch')),
      recordCode:String(item?.recordCode||uid('cert-branch-record')),
      name,
      createdAt:Number(item?.createdAt||Date.now())
    };
  }

  function normalizeReceipt(item){
    if(!item||typeof item!=='object') return null;
    const amount=Math.max(0,Number(item.amount||0));
    const name=String(item.studentName||item.name||'').trim();
    if(!name||amount<=0) return null;
    return {
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
    const branchSeen=new Set();
    const receiptSeen=new Set();
    return {
      certificateBranches:branches.filter(item=>{const key=item.recordCode||item.name.toLowerCase();if(branchSeen.has(key))return false;branchSeen.add(key);return true;}),
      certificateReceipts:receipts.filter(item=>{const key=item.recordCode||item.transactionCode;if(receiptSeen.has(key))return false;receiptSeen.add(key);return true;})
    };
  }

  function mergeState(current,incoming){
    const a=normalizeState(current),b=normalizeState(incoming);
    const branches=[...a.certificateBranches];
    const byBranchCode=new Map(branches.map(item=>[item.recordCode,item]));
    const byBranchName=new Map(branches.map(item=>[item.name.trim().toLowerCase(),item]));
    b.certificateBranches.forEach(item=>{
      if(byBranchCode.has(item.recordCode)||byBranchName.has(item.name.trim().toLowerCase())) return;
      branches.push(item);byBranchCode.set(item.recordCode,item);byBranchName.set(item.name.trim().toLowerCase(),item);
    });
    const receipts=[...a.certificateReceipts];
    const receiptCodes=new Set(receipts.flatMap(item=>[item.recordCode,item.transactionCode]).filter(Boolean));
    b.certificateReceipts.forEach(item=>{
      if(receiptCodes.has(item.recordCode)||receiptCodes.has(item.transactionCode)) return;
      receipts.push(item);receiptCodes.add(item.recordCode);receiptCodes.add(item.transactionCode);
    });
    return {certificateBranches:branches,certificateReceipts:receipts};
  }

  function readLocal(){
    try{return normalizeState(JSON.parse(localStorage.getItem(STORAGE_KEY)||'{}'));}catch{return normalizeState({});}
  }

  function writeLocal(){localStorage.setItem(STORAGE_KEY,JSON.stringify(certificateState));}

  async function persist(){
    writeLocal();
    if(!invoke) return;
    const snapshot=JSON.stringify(certificateState);
    saveChain=saveChain.catch(()=>undefined).then(()=>invoke('save_certificate_state',{state:snapshot}));
    await saveChain;
  }

  async function loadState(){
    const local=readLocal();
    if(!invoke){certificateState=local;return;}
    try{
      const raw=await invoke('load_certificate_state');
      const native=raw?normalizeState(JSON.parse(raw)):normalizeState({});
      certificateState=mergeState(native,local);
      await persist();
    }catch(error){
      console.error('EFC certificate state load failed; using local cache.',error);
      certificateState=local;
    }
  }

  function nextReceiptNo(){return Math.max(0,...certificateState.certificateReceipts.map(item=>Number(item.receiptNo||0)))+1;}
  function nowTime(){const d=new Date();return `${pad2(d.getHours())}:${pad2(d.getMinutes())}`;}

  function certificatePayment(receipt){
    const specialtyValue=spec(receipt.specialtyId)?receipt.specialtyId:(receipt.specialtyName||receipt.specialtyId);
    const studentLike={
      id:`certificate:${receipt.id}`,
      name:receipt.studentName,
      phone:receipt.phone||'',
      branch:receipt.branchType==='internal'?receipt.branchId:receipt.branchName,
      specialty:specialtyValue,
      reg:receipt.reg||''
    };
    return {
      student:studentLike,
      date:receipt.date,
      amount:Number(receipt.amount||0),
      method:receipt.method,
      time:receipt.time||'00:00',
      order:Number(receipt.timestamp||0),
      description:`رسوم شهادة · ${receipt.specialtyName||'دورة'}`,
      paymentIndex:0,
      receipt:padReceipt(receipt.receiptNo),
      sourceType:'certificate',
      certificateId:receipt.id
    };
  }

  function certificateReceiptCss(){return `
    *{box-sizing:border-box}body{margin:0;background:#eef1f0;color:#111715;font-family:Tahoma,Arial,sans-serif}.cert-paper{width:1040px;max-width:96vw;margin:18px auto;background:#fff;border:2px solid #293631;padding:14px 20px 13px;direction:ltr}.cert-head{display:grid;grid-template-columns:210px 1fr 150px;gap:14px;align-items:center;border-bottom:1px solid #b2b8b5;padding-bottom:8px}.cert-contact{display:grid;grid-template-columns:82px 1fr;gap:8px;align-items:center;direction:ltr}.cert-contact img,.cert-logo img{width:78px;height:58px;object-fit:contain}.cert-contact b{font-size:13px;white-space:nowrap}.cert-contact small{display:block;font-size:11px;margin-top:5px}.cert-center{text-align:center;direction:rtl}.cert-center h1{font-size:26px;margin:0 0 3px}.cert-center p{font-size:12px;font-weight:800;margin:0}.cert-no{display:flex;justify-content:center;gap:8px;align-items:baseline;margin-top:5px;direction:ltr}.cert-no b{font-size:21px}.cert-logo{display:grid;place-items:center}.cert-meta{display:flex;justify-content:space-between;direction:rtl;font-size:12px;padding:8px 0 5px}.cert-row{display:grid;grid-template-columns:165px minmax(0,1fr) 145px;gap:9px;align-items:center;height:38px;direction:ltr;font-size:14px}.cert-fr{text-align:left;font-weight:700}.cert-ar{text-align:right;direction:rtl;font-weight:800}.cert-track{position:relative;display:flex;align-items:center;justify-content:center;height:30px}.cert-track:before{content:"";position:absolute;left:0;right:0;top:50%;border-top:2px dotted #7d8581}.cert-track b{position:relative;background:#fff;padding:0 11px;z-index:1;direction:rtl;font-size:16px;max-width:95%;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.cert-pair{display:grid;grid-template-columns:1fr 1fr;gap:24px}.cert-half{display:grid;grid-template-columns:105px minmax(0,1fr) 115px;gap:7px;align-items:center;height:38px;direction:ltr;font-size:13px}.cert-methods{border-top:1px dotted #c4c8c6;margin-top:5px;padding-top:9px;display:grid;grid-template-columns:repeat(auto-fit,minmax(120px,1fr));gap:7px;direction:rtl}.cert-method{display:flex;align-items:center;justify-content:center;gap:6px;font-size:11px}.cert-check{width:28px;height:24px;border:2px solid #555;display:grid;place-items:center;font-weight:900}.cert-method.on .cert-check{background:#159a55;border-color:#159a55;color:#fff}.cert-note{text-align:center;direction:rtl;font-size:10px;font-weight:700;margin:9px 0 2px}.cert-actions{width:1040px;max-width:96vw;margin:0 auto 18px;display:flex;direction:rtl;gap:8px}.cert-actions button{border:0;border-radius:7px;padding:10px 17px;font:700 13px Tahoma;cursor:pointer}.cert-print{background:#155ea8;color:#fff}.cert-save{background:#159a55;color:#fff}@media print{body{background:#fff}.cert-paper{width:100%;max-width:none;margin:0;border:1px solid #222}.cert-actions{display:none}@page{size:landscape;margin:8mm}}
  `;}

  function receiptMethods(current){
    const list=[...new Set([...(methods||[]).map(String),String(current||'')].map(item=>item.trim()).filter(Boolean))];
    return list.map(name=>`<div class="cert-method ${name===current?'on':''}"><span class="cert-check">${name===current?'✓':''}</span><b>${esc(name)}</b></div>`).join('');
  }

  function certificateReceiptBody(receipt){
    const reg=receipt.reg?String(receipt.reg).padStart(4,'0'):'—';
    const logo=logoUrl();
    const row=(fr,value,ar)=>`<div class="cert-row"><span class="cert-fr">${fr}</span><span class="cert-track"><b>${esc(value||'—')}</b></span><span class="cert-ar">${ar}</span></div>`;
    const half=(fr,value,ar)=>`<div class="cert-half"><span class="cert-fr">${fr}</span><span class="cert-track"><b>${esc(value||'—')}</b></span><span class="cert-ar">${ar}</span></div>`;
    return `<div class="cert-head"><div class="cert-contact"><img src="${logo}" alt="EFC"><div><b>Tél: 48 02 84 84</b><small>32 09 86 89</small></div></div><div class="cert-center"><h1>Centre EFC · مركز</h1><p>وصل إدارة الشهادات</p><div class="cert-no"><span>Reçu N°</span><b>${padReceipt(receipt.receiptNo)}</b><span>وصل رقم</span></div></div><div class="cert-logo"><img src="${logo}" alt="EFC"></div></div><div class="cert-meta"><span>الفرع: <b>${esc(receipt.branchName||'—')}</b></span><span>التاريخ: <b>${showDate(receipt.date)}</b></span></div>${row("Nom de l’étudiant",receipt.studentName,'اسم الطالب')}${row('Nature de la Session',receipt.specialtyName,'طبيعة الدورة')}${row('Filière',receipt.branchName,'الفرع')}<div class="cert-pair">${half('N° Registre',reg,'رقم السجل')}${half('Montant',cash(receipt.amount),'المبلغ')}</div><div class="cert-methods">${receiptMethods(receipt.method)}</div><p class="cert-note">ملاحظة: هذا الوصل خاص برسوم الشهادة ولا يغيّر رصيد الدورة الدراسية للطالب.</p>`;
  }

  function certificateDocument(receipt,actions=true,autoPrint=false){
    const data=JSON.stringify(receipt).replace(/</g,'\\u003c');
    return `<!doctype html><html lang="ar" dir="rtl"><head><meta charset="utf-8"><title>روسي شهادة ${padReceipt(receipt.receiptNo)}</title><style>${certificateReceiptCss()}</style></head><body><div class="cert-paper">${certificateReceiptBody(receipt)}</div>${actions?`<div class="cert-actions"><button class="cert-print" onclick="print()">طباعة</button><button class="cert-save" onclick="(opener||parent).EFC_SAVE_CERTIFICATE_PDF(CERT)">حفظ PDF</button></div>`:''}<script>const CERT=${data};${autoPrint?'setTimeout(()=>print(),250);':''}<\/script></body></html>`;
  }

  function openCertificateReceipt(receipt,autoPrint=false){
    const w=window.open('','_blank','width=1120,height=700');
    if(!w) return;
    w.document.write(certificateDocument(receipt,true,autoPrint));
    w.document.close();
  }

  function loadLocalScript(src,key){
    if(window[key]) return Promise.resolve();
    return new Promise((resolve,reject)=>{const script=document.createElement('script');script.src=src;script.onload=resolve;script.onerror=()=>reject(new Error(`تعذر تحميل ${src} محليًا.`));document.head.appendChild(script);});
  }
  function waitFrame(frame){return new Promise((resolve,reject)=>{const timer=setTimeout(()=>reject(new Error('تأخر تجهيز روسي الشهادة.')),4000);frame.onload=()=>{clearTimeout(timer);resolve();};});}
  async function waitImages(root){await Promise.all([...root.querySelectorAll('img')].map(image=>image.complete?Promise.resolve():new Promise(resolve=>{image.onload=resolve;image.onerror=resolve;setTimeout(resolve,1200);})));try{await root.ownerDocument.fonts?.ready;}catch{}}
  function arrayBufferToBase64(buffer){const bytes=new Uint8Array(buffer);let binary='';for(let offset=0;offset<bytes.length;offset+=0x8000)binary+=String.fromCharCode(...bytes.subarray(offset,Math.min(offset+0x8000,bytes.length)));return btoa(binary);}

  async function saveCertificatePdf(receipt){
    let frame;
    try{
      await Promise.all([loadLocalScript('./vendor/html2canvas.min.js','html2canvas'),loadLocalScript('./vendor/jspdf.umd.min.js','jspdf')]);
      frame=document.createElement('iframe');frame.setAttribute('aria-hidden','true');frame.style.cssText='position:fixed;left:-16000px;top:0;width:1120px;height:760px;border:0;opacity:0;pointer-events:none';document.body.appendChild(frame);
      const loaded=waitFrame(frame);frame.srcdoc=certificateDocument(receipt,false,false);await loaded;
      const paper=frame.contentDocument?.querySelector('.cert-paper');if(!paper) throw new Error('تعذر العثور على روسي الشهادة.');await waitImages(paper);
      const canvas=await window.html2canvas(paper,{scale:2,backgroundColor:'#fff',useCORS:false,allowTaint:false,logging:false});
      const {jsPDF}=window.jspdf,pdf=new jsPDF({orientation:'landscape',unit:'mm',format:'a4'}),pw=pdf.internal.pageSize.getWidth(),ph=pdf.internal.pageSize.getHeight(),ratio=Math.min(pw/canvas.width,ph/canvas.height),width=canvas.width*ratio,height=canvas.height*ratio;
      pdf.addImage(canvas.toDataURL('image/jpeg',.96),'JPEG',(pw-width)/2,(ph-height)/2,width,height);
      const fileName=`روسي-شهادة-${padReceipt(receipt.receiptNo)}.pdf`,buffer=pdf.output('arraybuffer');
      if(!invoke){pdf.save(fileName);return fileName;}
      const path=await invoke('save_receipt_pdf',{fileName,dataBase64:arrayBufferToBase64(buffer)});alert(`تم حفظ روسي الشهادة في التنزيلات:\n${path}`);return path;
    }catch(error){console.error('EFC certificate PDF save failed.',error);alert(String(error?.message||error||'تعذر حفظ روسي الشهادة.'));return null;}finally{frame?.remove();}
  }

  function addCertificateBranch(){
    const name=String(prompt('اسم فرع الشهادة الجديد:')||'').trim();
    if(!name) return;
    if(certificateState.certificateBranches.some(item=>item.name.trim().toLowerCase()===name.toLowerCase())){alert('هذا الفرع موجود مسبقًا في فروع الشهادات.');return;}
    certificateState.certificateBranches.push({id:uid('cert-branch'),recordCode:uid('cert-branch-record'),name,createdAt:Date.now()});
    certificateMode='external';
    persist().then(()=>renderCertificates());
  }

  function internalStudentMatches(query){
    const q=String(query||'').trim().toLowerCase();
    if(!q) return [];
    return students.filter(student=>String(student.name||'').toLowerCase().includes(q)||String(student.phone||'').includes(q)||String(student.reg||'').includes(q)||String(student.recordCode||'').toLowerCase().includes(q)).slice(0,10);
  }

  function renderInternalSelection(){
    const box=document.getElementById('certSelectedStudent');if(!box)return;
    const student=students.find(item=>item.id===selectedStudentId);
    box.innerHTML=student?`<div class="cert-selected-v7"><div><small>الطالب</small><b>${esc(student.name)}</b></div><div><small>الهاتف</small><b>${esc(student.phone||'—')}</b></div><div><small>الفرع</small><b>${esc(branchName(student.branch))}</b></div><div><small>الدورة</small><b>${esc(spec(student.specialty)?.name||student.specialty)}</b></div><div><small>رقم السجل</small><b>${String(student.reg).padStart(4,'0')}</b></div></div>`:'<div class="cert-empty-v7">اختر طالبًا من نتائج البحث.</div>';
  }

  function drawStudentResults(){
    const root=document.getElementById('certStudentResults'),input=document.getElementById('certStudentSearch');if(!root||!input)return;
    const results=internalStudentMatches(input.value);
    root.innerHTML=results.length?results.map(student=>`<button type="button" class="cert-student-option-v7" data-student="${esc(student.id)}"><b>${esc(student.name)}</b><span>${esc(student.phone||'—')} · ${String(student.reg).padStart(4,'0')} · ${esc(spec(student.specialty)?.name||student.specialty)}</span></button>`).join(''):(input.value.trim()?'<div class="cert-search-empty-v7">لا توجد نتائج مطابقة.</div>':'');
    root.querySelectorAll('[data-student]').forEach(button=>button.onclick=()=>{selectedStudentId=button.dataset.student;input.value=students.find(item=>item.id===selectedStudentId)?.name||'';root.innerHTML='';renderInternalSelection();});
  }

  function historyRows(){
    return [...certificateState.certificateReceipts].sort((a,b)=>b.date.localeCompare(a.date)||Number(b.timestamp)-Number(a.timestamp)).map(receipt=>`<tr class="cert-history-row-v7" data-certificate="${esc(receipt.id)}"><td>${padReceipt(receipt.receiptNo)}</td><td><b>${esc(receipt.studentName)}</b><small>${esc(receipt.phone||'')}</small></td><td>${receipt.studentType==='internal'?'مسجل':'خارجي'}</td><td>${esc(receipt.branchName)}</td><td>${esc(receipt.specialtyName)}</td><td>${cash(receipt.amount)}</td><td>${esc(receipt.method)}</td><td>${showDate(receipt.date)}</td></tr>`).join('');
  }

  function switchMode(mode){
    certificateMode=mode==='external'?'external':'internal';
    document.querySelectorAll('.cert-mode-v7 button').forEach(button=>button.classList.toggle('active',button.dataset.mode===certificateMode));
    const internalPane=document.getElementById('certInternalPane'),externalPane=document.getElementById('certExternalPane');
    if(internalPane) internalPane.hidden=certificateMode!=='internal';
    if(externalPane) externalPane.hidden=certificateMode!=='external';
  }

  function renderCertificates(){
    currentPage='certificates';
    const branchOptions=certificateState.certificateBranches.map(item=>`<option value="${esc(item.id)}">${esc(item.name)}</option>`).join('');
    shell(`${pageTitle('إدارة الشهادات','روسي الشهادة','أصدر روسي شهادة لطالب مسجل أو لطالب خارجي. دخل الشهادة يدخل المالية واليومية ولا يغيّر رصيد الدورة.')}<div class="cert-layout-v7"><div class="card cert-form-v7"><div class="cert-mode-v7"><button type="button" data-mode="internal">طالب مسجل</button><button type="button" data-mode="external">طالب خارجي</button></div><div id="certInternalPane"><label>ابحث عن الطالب<input class="input" id="certStudentSearch" placeholder="الاسم أو الهاتف أو رقم السجل"></label><div id="certStudentResults" class="cert-results-v7"></div><div id="certSelectedStudent"></div></div><div id="certExternalPane"><div class="grid two"><label>اسم الطالب<input class="input" id="certExternalName" placeholder="اسم الطالب الكامل"></label><label>رقم الهاتف<input class="input" id="certExternalPhone" placeholder="يحفظ في السجل ولا يطبع على الروسي"></label><label>الدورة<select id="certExternalSpec"><option value="">اختر الدورة</option>${specialties.map(item=>`<option value="${esc(item.id)}">${esc(item.name)}</option>`).join('')}</select></label><label>فرع الشهادة<select id="certExternalBranch"><option value="">اختر فرع الشهادة</option>${branchOptions}</select></label></div><button type="button" class="mini cert-add-branch-v7" id="certAddBranch">＋ إضافة فرع شهادة</button><small class="cert-private-note-v7">فروع الشهادات هنا مستقلة ولا تظهر في تسجيل الطلاب أو فلاتر الفروع العادية.</small></div><div class="grid two cert-payment-v7"><label>المبلغ<input class="input" id="certAmount" type="number" min="1" placeholder="المبلغ المدفوع" required></label><label>وسيلة الدفع<select id="certMethod">${methods.map(item=>`<option>${esc(item)}</option>`).join('')}</select></label></div><button class="button" type="button" id="certIssue">إصدار روسي الشهادة</button></div><div class="card cert-help-v7"><h3>ما الذي يحفظه النظام؟</h3><p>يحفظ الاسم والهاتف والدورة والفرع والمبلغ ووسيلة الدفع وتاريخ العملية. الهاتف يبقى في السجل فقط ولا يظهر في الروسي.</p><p>للطالب المسجل، رقم السجل والفرع والدورة تُسحب تلقائيًا من تسجيله الحالي.</p><p>رسوم الشهادة عملية مالية مستقلة، لذلك لا تزيد المدفوع للدورة ولا تقلل متبقيها.</p></div></div><div class="card cert-history-v7"><div class="section-head"><h2>سجل روسيات الشهادات</h2><span>${certificateState.certificateReceipts.length} عملية</span></div>${table(['رقم الروسي','الطالب','النوع','الفرع','الدورة','المبلغ','وسيلة الدفع','التاريخ'],historyRows())}</div>`);
    document.querySelectorAll('.cert-mode-v7 button').forEach(button=>button.onclick=()=>switchMode(button.dataset.mode));
    const search=document.getElementById('certStudentSearch');if(search)search.oninput=drawStudentResults;
    const addBranch=document.getElementById('certAddBranch');if(addBranch)addBranch.onclick=addCertificateBranch;
    const issue=document.getElementById('certIssue');if(issue)issue.onclick=issueCertificateReceipt;
    document.querySelectorAll('.cert-history-row-v7').forEach(row=>row.onclick=()=>{const receipt=certificateState.certificateReceipts.find(item=>item.id===row.dataset.certificate);if(receipt)openCertificateReceipt(receipt);});
    switchMode(certificateMode);renderInternalSelection();
  }

  async function issueCertificateReceipt(){
    const amount=Math.max(0,Number(document.getElementById('certAmount')?.value||0));
    const method=String(document.getElementById('certMethod')?.value||'').trim();
    if(amount<=0){alert('أدخل مبلغًا صحيحًا.');return;}
    let data;
    if(certificateMode==='internal'){
      const student=students.find(item=>item.id===selectedStudentId);if(!student){alert('اختر الطالب المسجل أولًا.');return;}
      const specialty=spec(student.specialty);
      data={studentType:'internal',studentId:student.id,studentName:student.name,phone:student.phone||'',reg:student.reg,specialtyId:student.specialty,specialtyName:specialty?.name||student.specialty,branchType:'internal',branchId:student.branch,branchName:branchName(student.branch)};
    }else{
      const name=String(document.getElementById('certExternalName')?.value||'').trim(),phone=String(document.getElementById('certExternalPhone')?.value||'').trim(),specialtyId=String(document.getElementById('certExternalSpec')?.value||''),branchId=String(document.getElementById('certExternalBranch')?.value||'');
      const specialty=spec(specialtyId),branch=certificateState.certificateBranches.find(item=>item.id===branchId);
      if(!name){alert('أدخل اسم الطالب.');return;}
      if(!specialty){alert('اختر الدورة.');return;}
      if(!branch){alert('اختر فرع الشهادة أو أضف فرعًا جديدًا.');return;}
      data={studentType:'external',studentId:null,studentName:name,phone,reg:null,specialtyId,specialtyName:specialty.name,branchType:'certificate',branchId:branch.id,branchName:branch.name};
    }
    const receipt=normalizeReceipt({...data,id:uid('certificate'),recordCode:uid('certificate-record'),transactionCode:uid('certificate-tx'),receiptNo:nextReceiptNo(),amount,method,date:today(),time:nowTime(),timestamp:Date.now(),createdAt:Date.now()});
    certificateState.certificateReceipts.unshift(receipt);
    await persist();
    renderCertificates();
    openCertificateReceipt(receipt);
  }

  function ensureSidebarLink(icon){
    const nav=document.querySelector('.shell nav');
    if(!nav||nav.querySelector('a[href="#certificates"]')) return;
    const link=document.createElement('a');
    link.href='#certificates';
    link.innerHTML=`<i>${icon}</i><span>الشهادات</span>`;
    const finance=nav.querySelector('a[href="#finance"]');
    nav.insertBefore(link,finance||null);
  }

  async function boot(){
    const ready=window.EFC_LEDGER_PDF_V6&&typeof allPayments==='function'&&typeof shell==='function'&&typeof navItems!=='undefined'&&typeof table==='function';
    if(!ready){setTimeout(boot,40);return;}
    window[FLAG]=true;
    await loadState();

    const style=document.createElement('style');
    style.textContent=`
      .cert-layout-v7{display:grid;grid-template-columns:minmax(0,1.7fr) minmax(280px,.8fr);gap:16px;margin-bottom:16px}.cert-form-v7{display:grid;gap:16px}.cert-mode-v7{display:flex;gap:5px;background:#edf1ef;border:1px solid var(--border);border-radius:9px;padding:5px;width:max-content}.cert-mode-v7 button{border:0;background:transparent;color:var(--muted);padding:8px 14px;border-radius:6px;font-size:9px;cursor:pointer}.cert-mode-v7 button.active{background:#fff;color:var(--primary);box-shadow:0 2px 7px #0000000c}.cert-results-v7{display:grid;gap:5px;margin-top:6px}.cert-student-option-v7{border:1px solid var(--border);background:#fff;border-radius:8px;padding:9px 11px;text-align:right;cursor:pointer;color:var(--text)}.cert-student-option-v7:hover{background:var(--soft)}.cert-student-option-v7 b{display:block;font-size:10px}.cert-student-option-v7 span{display:block;color:var(--muted);font-size:8px;margin-top:3px}.cert-search-empty-v7,.cert-empty-v7{padding:12px;border:1px dashed var(--border);border-radius:8px;color:var(--muted);font-size:9px}.cert-selected-v7{display:grid;grid-template-columns:repeat(5,minmax(0,1fr));gap:8px;margin-top:10px}.cert-selected-v7 div{background:var(--surface2);border:1px solid var(--border);border-radius:8px;padding:10px}.cert-selected-v7 small{display:block;color:var(--muted);font-size:8px;margin-bottom:5px}.cert-selected-v7 b{font-size:9px}.cert-add-branch-v7{margin-top:9px}.cert-private-note-v7{display:block;color:var(--muted);font-size:8px;margin-top:7px}.cert-payment-v7{padding-top:14px;border-top:1px solid var(--border)}.cert-help-v7{height:max-content}.cert-help-v7 h3{margin:0 0 12px;font-size:14px}.cert-help-v7 p{color:var(--muted);font-size:9px;line-height:1.9;margin:8px 0}.cert-history-v7{padding:18px}.cert-history-v7 .table-wrap{margin-top:12px}.cert-history-row-v7{cursor:pointer}.cert-history-row-v7:hover{background:#f1f8f5}.cert-history-row-v7 td:nth-child(2) b{display:block}.cert-history-row-v7 td:nth-child(2) small{display:block;color:var(--muted);font-size:8px;margin-top:3px}@media(max-width:1250px){.cert-layout-v7{grid-template-columns:1fr}.cert-selected-v7{grid-template-columns:repeat(3,1fr)}}
    `;
    document.head.appendChild(style);

    const icon='<svg viewBox="0 0 24 24" aria-hidden="true"><g fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M6 3.5h12v11H6z"/><path d="M9 7h6M9 10h4"/><circle cx="12" cy="17" r="3"/><path d="m10.2 19.3-.7 2.2 2.5-1 2.5 1-.7-2.2"/></g></svg>';
    if(!navItems.some(item=>item[0]==='certificates')){
      const financeIndex=navItems.findIndex(item=>item[0]==='finance');
      navItems.splice(financeIndex>=0?financeIndex:navItems.length,0,['certificates',icon,'الشهادات']);
    }
    ensureSidebarLink(icon);

    const baseAllPayments=allPayments;
    allPayments=function(){
      const combined=[...baseAllPayments(),...certificateState.certificateReceipts.map(certificatePayment)];
      return combined.sort((a,b)=>String(b.date||'').localeCompare(String(a.date||''))||Number(b.order||0)-Number(a.order||0)||String(b.time||'').localeCompare(String(a.time||'')));
    };

    document.addEventListener('click',event=>{
      const target=event.target instanceof Element?event.target:null;
      const certLink=target?.closest('a[href="#certificates"]');
      if(certLink){event.preventDefault();history.replaceState(null,'','#certificates');renderCertificates();return;}
      const ledgerRow=target?.closest('#ledgerBody tbody tr[data-student^="certificate:"]');
      if(ledgerRow){
        const id=String(ledgerRow.dataset.student||'').replace(/^certificate:/,'');
        const receipt=certificateState.certificateReceipts.find(item=>item.id===id);
        if(receipt){event.preventDefault();event.stopImmediatePropagation();openCertificateReceipt(receipt);}
      }
    },true);

    window.addEventListener('hashchange',()=>{if(location.hash==='#certificates')setTimeout(renderCertificates,1);});

    const baseForce=window.EFC_FORCE_PERSIST;
    if(typeof baseForce==='function') window.EFC_FORCE_PERSIST=async()=>{const result=await baseForce();await persist();return result;};
    const baseApply=window.EFC_APPLY_RESTORED_STATE;
    if(typeof baseApply==='function') window.EFC_APPLY_RESTORED_STATE=async incoming=>{
      const result=await baseApply(incoming);
      if(Array.isArray(incoming?.certificateBranches)||Array.isArray(incoming?.certificateReceipts)){
        certificateState=mergeState(certificateState,{certificateBranches:incoming.certificateBranches||[],certificateReceipts:incoming.certificateReceipts||[]});
        await persist();
      }
      return result;
    };

    window.EFC_SAVE_CERTIFICATE_PDF=saveCertificatePdf;
    window.EFC_OPEN_CERTIFICATE_RECEIPT=openCertificateReceipt;
    window.EFC_CERTIFICATES_V7=Object.freeze({separateCertificateFinance:true,externalCertificateBranches:true,internalStudentAutofill:true,phoneStoredNotPrinted:true,certificateIncomeInLedgerAndFinance:true,backupIntegrated:true});

    if(location.hash==='#certificates') renderCertificates();
    else if(location.hash==='#finance'&&typeof renderFinance==='function') renderFinance();
    else if(location.hash==='#ledger'&&typeof renderLedger==='function') renderLedger();
  }

  boot();
})();
