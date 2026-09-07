(()=>{
'use strict';
const FLAG='__EFC_CENTER_OPS_V11_FIX1__';
if(window[FLAG])return;
window[FLAG]=true;

const OFFICIAL_NAME='مركز EFC للغات والمعلوماتية';
const SECURITY_KEY='efc-security-v11';
const SESSION_KEY='efc-current-user-v11';
const esc=value=>String(value??'').replace(/[&<>"']/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));

function securityUsers(){
  try{
    const state=JSON.parse(localStorage.getItem(SECURITY_KEY)||'null');
    return Array.isArray(state?.users)?state.users:[];
  }catch{return[];}
}

let prelock=null;
if(securityUsers().length&&!sessionStorage.getItem(SESSION_KEY)){
  prelock=document.createElement('div');
  prelock.id='efc-security-prelock-v11';
  prelock.style.cssText='position:fixed;inset:0;z-index:2147483500;background:#eef3f1;display:grid;place-items:center;padding:22px;direction:rtl;font-family:Tahoma,Arial,sans-serif;color:#17332b';
  prelock.innerHTML=`<section style="width:min(520px,96vw);background:#fff;border:1px solid #d7e1dd;border-radius:18px;padding:28px;text-align:center;box-shadow:0 18px 60px #143b2b22"><img src="./efc-logo.svg" alt="EFC" style="width:90px;height:70px;object-fit:contain"><h1 style="font-size:20px;margin:8px 0">${OFFICIAL_NAME}</h1><p style="font-size:10px;color:#70827b">جاري تجهيز تسجيل الدخول…</p></section>`;
  document.body.appendChild(prelock);
  const preObserver=new MutationObserver(()=>{
    if(document.querySelector('.login-overlay-v11')){
      prelock?.remove();
      prelock=null;
      preObserver.disconnect();
    }
  });
  preObserver.observe(document.body,{childList:true,subtree:true});
}

function boot(){
  const ready=window.EFC_CENTER_OPS_V11&&window.EFC_OPEN_CERTIFICATE_RECEIPT&&typeof students!=='undefined'&&typeof remainingOf==='function'&&typeof financialStatus==='function';
  if(!ready){setTimeout(boot,40);return;}

  const isDynamic=student=>Boolean(student?.snapshot?.dynamicMonthly||student?.snapshot?.centerOpsMonthlyV11);
  const isInactive=student=>student?.active===false||student?.status==='inactive';
  const showDate=value=>typeof fmtDateV3==='function'?fmtDateV3(value):(typeof fmtDate==='function'?fmtDate(value):String(value||'—'));
  const cash=value=>typeof moneyV3==='function'?moneyV3(value):(typeof money==='function'?money(value):String(value||0));
  const spName=student=>typeof spec==='function'?(spec(student.specialty)?.name||student.specialty||'—'):(student.specialty||'—');
  const brName=student=>typeof branchName==='function'?branchName(student.branch):(student.branch||'—');

  function repairPeriodDues(){
    if(location.hash!=='#period')return;
    const root=document.getElementById('periodResult');
    const activeTab=document.querySelector('#periodTabsProd button.active')?.dataset.tab;
    if(!root||activeTab!=='dues')return;
    const tbody=root.querySelector('tbody');
    if(!tbody)return;

    root.querySelectorAll('tr[data-id]').forEach(row=>{
      const student=students.find(item=>String(item.id)===String(row.dataset.id));
      if(student&&isInactive(student))row.remove();
    });

    const query=String(document.getElementById('periodSearch')?.value||'').trim().toLowerCase();
    const branch=String(document.getElementById('periodBranch')?.value||'');
    const specialty=String(document.getElementById('periodSpec')?.value||'');
    const state=String(document.getElementById('periodState')?.value||'');
    const to=String(document.getElementById('periodTo')?.value||'');
    const identity=student=>!query||
      String(student.name||'').toLowerCase().includes(query)||
      String(student.phone||'').includes(query)||
      String(student.reg??'').padStart(4,'0').includes(query)||
      String(student.reg??'')===query;
    const statusMatch=student=>!state||(state==='outstanding'?remainingOf(student)>0:financialStatus(student)===state);
    const existing=new Set([...root.querySelectorAll('tr[data-id]')].map(row=>String(row.dataset.id)));

    const missing=students.filter(student=>
      isDynamic(student)&&
      !isInactive(student)&&
      remainingOf(student)>0&&
      identity(student)&&
      statusMatch(student)&&
      (!branch||student.branch===branch)&&
      (!specialty||student.specialty===specialty)&&
      (!to||String(student.start||'')<=to)&&
      !existing.has(String(student.id))
    );

    missing.forEach(student=>{
      const remaining=remainingOf(student);
      const row=document.createElement('tr');
      row.className='student-row';
      row.dataset.id=student.id;
      row.innerHTML=`<td>${String(student.reg??'').padStart(4,'0')}</td><td><b>${esc(student.name)}</b><small>${esc(student.phone||'')}</small></td><td>${esc(brName(student))}</td><td>${esc(spName(student))}</td><td>${showDate(student.start)}</td><td>—</td><td>${cash(student.required)}</td><td>${cash(student.paid)}</td><td>${cash(remaining)}</td><td>${badge(financialStatus(student))}</td><td><button class="mini pay-now period-pay-prod" data-id="${esc(student.id)}">تسجيل دفعة</button></td>`;
      row.addEventListener('click',event=>{
        if(event.target instanceof Element&&event.target.closest('button'))return;
        openStudent(student.id,'finance');
      });
      row.querySelector('.pay-now')?.addEventListener('click',event=>{
        event.preventDefault();
        event.stopPropagation();
        openPayment(student.id);
      });
      tbody.appendChild(row);
    });

    const count=root.querySelector('.period-result-head-prod b');
    if(count){
      const next=`${root.querySelectorAll('tbody tr[data-id]').length} نتيجة`;
      if(count.textContent!==next)count.textContent=next;
    }
    if(typeof convertDigitsInNodeV3==='function')convertDigitsInNodeV3(root);
  }

  let periodRoot=null;
  function watchPeriod(){
    if(location.hash!=='#period')return;
    const root=document.getElementById('periodResult');
    if(!root)return;
    repairPeriodDues();
    if(root===periodRoot)return;
    periodRoot=root;
    new MutationObserver(repairPeriodDues).observe(root,{childList:true,subtree:true});
  }
  document.addEventListener('click',event=>{
    const tab=event.target instanceof Element?event.target.closest('#periodTabsProd button'):null;
    if(tab)setTimeout(watchPeriod,0);
  },true);
  document.addEventListener('change',event=>{
    const id=event.target instanceof Element?event.target.id:'';
    if(['periodFrom','periodTo','periodBranch','periodSpec','periodState'].includes(id))setTimeout(watchPeriod,0);
  },true);
  document.addEventListener('input',event=>{
    if(event.target instanceof Element&&event.target.id==='periodSearch')setTimeout(watchPeriod,0);
  },true);
  window.addEventListener('hashchange',()=>setTimeout(watchPeriod,1));
  watchPeriod();

  function patchReceiptHtml(input){
    let text=String(input??'');
    if(text.includes('paper12')){
      if(!text.includes('official-name-v11-fix')){
        text=text.replace('</style>',`.official-name-v11-fix{font-size:11px;font-weight:800;margin-top:2px;direction:rtl}</style>`);
        text=text.replace('<div class="tag12">','<div class="official-name-v11-fix">مركز EFC للغات والمعلوماتية</div><div class="tag12">');
      }
    }
    if(text.includes('cert-paper')&&text.includes('وصل إدارة الشهادات')){
      if(!text.includes('cert-header-v11-fix')){
        text=text.replace('</style>',`
.cert-header-v11-fix{display:none}
.cert-head{grid-template-columns:240px 1fr 150px!important;gap:14px!important;padding-bottom:6px!important}
.cert-contact{grid-template-columns:92px 1fr!important;text-align:left!important}
.cert-contact img,.cert-logo img{width:82px!important;height:62px!important}
.cert-contact-text-v11{display:grid;gap:2px;align-content:center}
.cert-contact-text-v11 b{font-size:13px!important}
.cert-contact-text-v11 small{font-size:10px!important;margin:0!important;white-space:nowrap}
.cert-title-v11{display:flex;justify-content:center;gap:12px;align-items:baseline;direction:ltr;font-size:27px!important}
.cert-title-v11 span:last-child{direction:rtl}
.cert-official-name{font-size:11px!important;font-weight:800!important;margin-top:3px!important}
.cert-recognition-v11{font-size:11px;font-weight:700;margin-top:3px}
.cert-title-large{font-size:22px!important;font-weight:900!important;margin:5px 0 2px!important}
</style>`);
      }
      text=text.replace(
        /<div class="cert-contact">(<img[^>]*>)<div><b>Tél: 48 02 84 84<\/b><small>32 09 86 89<\/small><\/div><\/div>/,
        '<div class="cert-contact">$1<div class="cert-contact-text-v11"><b>Tél: 48 02 84 84</b><small>WhatsApp: 32 09 86 89</small><small>Facebook: الأستاذ محمد ديدي</small></div></div>'
      );
      const center=`<h1 class="cert-title-v11"><span>Centre EFC</span><span>مركز</span></h1><div class="cert-official-name">مركز EFC للغات والمعلوماتية</div><div class="cert-recognition-v11">جميع الشهادات معترف بها من طرف الدولة</div><p class="cert-title-large">وصل إدارة الشهادات</p>`;
      text=text.replace('<h1>Centre EFC · مركز</h1><p>وصل إدارة الشهادات</p>',center);
      text=text.replace(/<h1>Centre EFC <span>مركز<\/span><\/h1><div class="cert-official-name">مركز EFC للغات والمعلوماتية<\/div><p class="cert-title-large">وصل إدارة الشهادات<\/p>/,center);
    }
    return text;
  }

  let certificateCapture=null;
  const previousOpen=window.open.bind(window);
  window.open=function(url='',target='',features=''){
    if(certificateCapture){
      const state=certificateCapture;
      certificateCapture=null;
      return {
        closed:false,
        close(){},
        focus(){},
        document:{
          write(chunk){state.html+=String(chunk??'');},
          close(){
            if(state.done)return;
            state.done=true;
            state.resolve(patchReceiptHtml(state.html));
          }
        }
      };
    }
    const result=previousOpen(url,target,features);
    if(!result?.document?.write)return result;
    try{
      const write=result.document.write.bind(result.document);
      result.document.write=chunk=>write(patchReceiptHtml(chunk));
    }catch{}
    return result;
  };

  function captureCertificateHtml(receipt){
    return new Promise((resolve,reject)=>{
      const state={html:'',done:false,resolve};
      certificateCapture=state;
      const timer=setTimeout(()=>{
        if(state.done)return;
        state.done=true;
        if(certificateCapture===state)certificateCapture=null;
        reject(new Error('تعذر تجهيز روسي الشهادة.'));
      },3500);
      state.resolve=html=>{clearTimeout(timer);resolve(html);};
      try{window.EFC_OPEN_CERTIFICATE_RECEIPT(receipt,false);}
      catch(error){
        clearTimeout(timer);
        state.done=true;
        if(certificateCapture===state)certificateCapture=null;
        reject(error);
      }
    });
  }

  function loadLocalScript(src,key){
    if(window[key])return Promise.resolve();
    return new Promise((resolve,reject)=>{
      const script=document.createElement('script');
      script.src=src;
      script.onload=resolve;
      script.onerror=()=>reject(new Error(`تعذر تحميل ${src} محليًا.`));
      document.head.appendChild(script);
    });
  }
  async function waitImages(root){
    await Promise.all([...root.querySelectorAll('img')].map(image=>image.complete?Promise.resolve():new Promise(resolve=>{
      image.onload=resolve;
      image.onerror=resolve;
      setTimeout(resolve,1200);
    })));
    try{await root.ownerDocument.fonts?.ready;}catch{}
  }
  function arrayBufferToBase64(buffer){
    const bytes=new Uint8Array(buffer);
    let binary='';
    for(let offset=0;offset<bytes.length;offset+=0x8000)binary+=String.fromCharCode(...bytes.subarray(offset,Math.min(offset+0x8000,bytes.length)));
    return btoa(binary);
  }
  async function saveCertificatePdf(receipt){
    let frame;
    try{
      await Promise.all([
        loadLocalScript('./vendor/html2canvas.min.js','html2canvas'),
        loadLocalScript('./vendor/jspdf.umd.min.js','jspdf')
      ]);
      const html=await captureCertificateHtml(receipt);
      frame=document.createElement('iframe');
      frame.setAttribute('aria-hidden','true');
      frame.style.cssText='position:fixed;left:-16000px;top:0;width:1120px;height:760px;border:0;opacity:0;pointer-events:none';
      document.body.appendChild(frame);
      const loaded=new Promise((resolve,reject)=>{
        const timer=setTimeout(()=>reject(new Error('تأخر تجهيز روسي الشهادة.')),4000);
        frame.onload=()=>{clearTimeout(timer);resolve();};
      });
      frame.srcdoc=html;
      await loaded;
      const paper=frame.contentDocument?.querySelector('.cert-paper');
      if(!paper)throw new Error('تعذر العثور على روسي الشهادة.');
      await waitImages(paper);
      const canvas=await window.html2canvas(paper,{scale:2,backgroundColor:'#fff',useCORS:false,allowTaint:false,logging:false});
      const {jsPDF}=window.jspdf;
      const pdf=new jsPDF({orientation:'landscape',unit:'mm',format:'a4'});
      const pw=pdf.internal.pageSize.getWidth(),ph=pdf.internal.pageSize.getHeight();
      const ratio=Math.min(pw/canvas.width,ph/canvas.height),width=canvas.width*ratio,height=canvas.height*ratio;
      pdf.addImage(canvas.toDataURL('image/jpeg',.96),'JPEG',(pw-width)/2,(ph-height)/2,width,height);
      const number=String(Math.max(1,Number(receipt?.receiptNo||1))).padStart(5,'0');
      const fileName=`روسي-شهادة-${number}.pdf`;
      const invoke=window.__TAURI__?.core?.invoke;
      if(!invoke){pdf.save(fileName);return fileName;}
      const path=await invoke('save_receipt_pdf',{fileName,dataBase64:arrayBufferToBase64(pdf.output('arraybuffer'))});
      alert(`تم حفظ روسي الشهادة في التنزيلات:\n${path}`);
      return path;
    }catch(error){
      console.error('EFC certificate v11 PDF fix failed.',error);
      alert(String(error?.message||error||'تعذر حفظ روسي الشهادة.'));
      return null;
    }finally{frame?.remove();}
  }
  window.EFC_SAVE_CERTIFICATE_PDF=saveCertificatePdf;

  if(document.querySelector('.login-overlay-v11')){
    prelock?.remove();
    prelock=null;
  }

  window.EFC_CENTER_OPS_V11_FIX1=Object.freeze({
    securityPrelock:true,
    dynamicMonthlyDuesOpenEnded:true,
    normalReceiptOfficialName:true,
    certificateHeaderMatchesReceipt:true,
    certificatePdfUsesPatchedHeader:true
  });
}
boot();
})();