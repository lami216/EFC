(async()=>{
'use strict';
if(window.EFC_CERTIFICATES_WORKSPACE_V36?.ready)return;
const waitUntil=async(check,timeout=15000)=>{const start=Date.now();while(!check()){if(Date.now()-start>timeout)throw new Error('Certificates workspace v36 timed out.');await new Promise(resolve=>setTimeout(resolve,20));}};
await waitUntil(()=>window.EFC_CERTIFICATES_REDESIGN_V35?.ready&&window.EFC_CERTIFICATES_V13?.ready);

const icon=body=>`<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><g fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round">${body}</g></svg>`;
const HISTORY_ICON=icon('<path d="M4 5h16M4 10h16M4 15h10M4 20h10"/><path d="M18 15v5M15.5 17.5h5"/>');
const BACK_ICON=icon('<path d="m15 6-6 6 6 6"/>');
const CERT_ICON=icon('<path d="M6 3h12v18H6z"/><path d="M9 7h6M9 11h6"/><circle cx="12" cy="16" r="2.2"/><path d="m10.6 17.7-.6 2.1 2-1 2 1-.6-2.1"/>');
let scheduled=false;

function currentPage(){return location.hash.replace('#','')||window.currentPage||'';}
function todayIso(){
  if(typeof window.deviceTodayV3==='function')return window.deviceTodayV3();
  const d=new Date(),pad=n=>String(n).padStart(2,'0');
  return`${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`;
}
function displayDateToIso(value){
  const text=String(value||'').trim();
  const slash=text.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if(slash)return`${slash[3]}-${String(slash[2]).padStart(2,'0')}-${String(slash[1]).padStart(2,'0')}`;
  const iso=text.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
  if(iso)return`${iso[1]}-${String(iso[2]).padStart(2,'0')}-${String(iso[3]).padStart(2,'0')}`;
  return'';
}
function setPlaceholder(id,text){const input=document.getElementById(id);if(input&&input.tagName==='INPUT'&&input.placeholder!==text)input.placeholder=text;}
function ensureHero(content){
  const title=content?.querySelector('.page-title');
  if(!title)return;
  title.classList.add('efc-cert-hero-v36');
  const inner=title.querySelector(':scope>div');
  if(!inner)return;
  if(!inner.querySelector('.efc-cert-title-icon-v36')){
    inner.querySelector('.efc-cert-title-icon-v35')?.remove();
    const marker=document.createElement('span');
    marker.className='efc-cert-title-icon-v36';
    marker.innerHTML=CERT_ICON;
    inner.prepend(marker);
  }
}
function applyHistoryDateFilter(history,form){
  if(!history||!form)return;
  const from=form.querySelector('#certHistoryFromV36')?.value||'';
  const to=form.querySelector('#certHistoryToV36')?.value||'';
  let visible=0;
  history.querySelectorAll('tbody tr.cert-history-row-v13').forEach(row=>{
    const date=displayDateToIso(row.lastElementChild?.textContent||'');
    const show=(!from||!date||date>=from)&&(!to||!date||date<=to);
    row.hidden=!show;
    if(show)visible+=1;
  });
  const count=history.querySelector('.section-head>span');
  if(count)count.textContent=`${visible} عملية`;
}
function ensureHistoryDateFilters(form,history,toolbar,toggle){
  let actions=toolbar.querySelector('.efc-cert-history-actions-v36');
  if(!actions){
    actions=document.createElement('div');
    actions.className='efc-cert-history-actions-v36';
    toolbar.appendChild(actions);
  }
  let filters=actions.querySelector('.efc-cert-history-filters-v36');
  if(!filters){
    const today=todayIso();
    filters=document.createElement('div');
    filters.className='efc-cert-history-filters-v36';
    filters.hidden=true;
    filters.innerHTML=`<label class="efc-cert-history-date-v36"><span>من</span><input id="certHistoryFromV36" type="date" value="${today}" aria-label="من تاريخ"></label><label class="efc-cert-history-date-v36"><span>إلى</span><input id="certHistoryToV36" type="date" value="${today}" aria-label="إلى تاريخ"></label>`;
    actions.appendChild(filters);
    filters.querySelectorAll('input').forEach(input=>{
      input.addEventListener('change',()=>applyHistoryDateFilter(history,form));
      input.addEventListener('input',()=>applyHistoryDateFilter(history,form));
    });
    filters.querySelectorAll('.efc-cert-history-date-v36').forEach(label=>{
      label.addEventListener('click',event=>{
        if(event.target?.tagName==='INPUT')return;
        const input=label.querySelector('input');
        input?.focus();
        try{input?.showPicker?.();}catch{}
      });
    });
  }
  if(toggle.parentElement!==actions)actions.appendChild(toggle);
  return filters;
}
function setHistoryMode(form,history,showHistory){
  if(!form||!history)return;
  form.dataset.efcHistoryOpenV36=showHistory?'1':'0';
  history.hidden=!showHistory;
  history.classList.toggle('efc-cert-history-open-v36',showHistory);
  form.querySelectorAll('#certInternalPaneV13,#certExternalPaneV13,.cert-payment-v13,#certIssueV13').forEach(node=>{
    if(showHistory){
      node.dataset.efcHistoryWasHiddenV36=node.hidden?'1':'0';
      node.hidden=true;
    }else if(node.id==='certInternalPaneV13'||node.id==='certExternalPaneV13'){
      const internal=form.querySelector('.cert-mode-v13 button[data-mode="internal"]')?.classList.contains('active');
      node.hidden=node.id==='certInternalPaneV13'?!internal:internal;
    }else{
      node.hidden=node.dataset.efcHistoryWasHiddenV36==='1';
    }
  });
  const button=form.querySelector('.efc-cert-history-toggle-v36');
  if(button){
    button.classList.toggle('active',showHistory);
    button.innerHTML=showHistory?`${BACK_ICON}<span>العودة للإصدار</span>`:`${HISTORY_ICON}<span>سجل الشهادات</span>`;
    button.setAttribute('aria-pressed',showHistory?'true':'false');
  }
  const filters=form.querySelector('.efc-cert-history-filters-v36');
  if(filters)filters.hidden=!showHistory;
  if(showHistory)applyHistoryDateFilter(history,form);
}
function buildToolbar(form,history){
  const mode=form.querySelector('.cert-mode-v13');
  if(!mode)return;
  let toolbar=form.querySelector('.efc-cert-workspace-toolbar-v36');
  if(!toolbar){
    toolbar=document.createElement('div');
    toolbar.className='efc-cert-workspace-toolbar-v36';
    mode.parentNode.insertBefore(toolbar,mode);
    toolbar.appendChild(mode);
  }
  let toggle=toolbar.querySelector('.efc-cert-history-toggle-v36');
  if(!toggle){
    toggle=document.createElement('button');
    toggle.type='button';
    toggle.className='efc-cert-history-toggle-v36';
    toggle.innerHTML=`${HISTORY_ICON}<span>سجل الشهادات</span>`;
    toggle.setAttribute('aria-pressed','false');
    toggle.addEventListener('click',()=>setHistoryMode(form,history,form.dataset.efcHistoryOpenV36!=='1'));
  }
  ensureHistoryDateFilters(form,history,toolbar,toggle);
  mode.querySelectorAll('button').forEach(button=>{
    if(button.dataset.efcHistoryCloseBoundV36==='1')return;
    button.dataset.efcHistoryCloseBoundV36='1';
    button.addEventListener('click',()=>{if(form.dataset.efcHistoryOpenV36==='1')setHistoryMode(form,history,false);});
  });
}
function enhanceCertificates(){
  scheduled=false;
  if(currentPage()!=='certificates')return;
  document.body.classList.add('efc-certificates-workspace-v36');
  const content=document.querySelector('.shell.shell-v13 main>.content');
  const form=content?.querySelector('.cert-form-v13');
  const history=content?.querySelector('.cert-history-v13');
  if(!content||!form||!history)return;
  ensureHero(content);

  setPlaceholder('certStudentSearchV13','ابحث عن الطالب');
  setPlaceholder('certExternalNameV13','اسم الطالب');
  setPlaceholder('certExternalPhoneV13','رقم الهاتف');
  setPlaceholder('certExternalRegV13','رقم التسجيل');
  setPlaceholder('certAmountV13','المبلغ');

  if(history.parentElement!==form){
    form.appendChild(history);
    history.hidden=true;
  }
  buildToolbar(form,history);
  if(!form.dataset.efcWorkspaceReadyV36){
    form.dataset.efcWorkspaceReadyV36='1';
    setHistoryMode(form,history,false);
  }
}
function scheduleEnhance(){
  if(scheduled)return;
  scheduled=true;
  requestAnimationFrame(enhanceCertificates);
}

window.addEventListener('hashchange',()=>{
  document.body.classList.toggle('efc-certificates-workspace-v36',currentPage()==='certificates');
  if(currentPage()==='certificates')setTimeout(scheduleEnhance,30);
});
const app=document.getElementById('app');
if(app){
  const observer=new MutationObserver(mutations=>{
    if(currentPage()!=='certificates')return;
    if(mutations.some(mutation=>mutation.type==='childList'&&(mutation.addedNodes.length||mutation.removedNodes.length)))scheduleEnhance();
  });
  observer.observe(app,{childList:true,subtree:true});
}
if(currentPage()==='certificates')scheduleEnhance();

const style=document.createElement('style');
style.id='efc-certificates-workspace-style-v36';
style.textContent=`
/* Keep the certificate title redesigned even after the certificate runtime redraws itself. */
html body.efc-certificates-redesign-v35 .page-title,
html body.efc-certificates-workspace-v36 .page-title{
  position:relative!important;display:flex!important;align-items:center!important;justify-content:center!important;
  width:470px!important;min-width:470px!important;max-width:470px!important;height:76px!important;min-height:76px!important;max-height:76px!important;
  margin:0 auto 18px!important;padding:0 20px!important;border:0!important;border-radius:17px!important;
  background:linear-gradient(135deg,#e4f8f0,#d4efe5)!important;box-shadow:0 10px 30px rgba(20,102,76,.05)!important;color:#073f35!important;box-sizing:border-box!important;
}
html body.efc-certificates-redesign-v35 .page-title>div,
html body.efc-certificates-workspace-v36 .page-title>div{width:auto!important;display:flex!important;align-items:center!important;justify-content:center!important;gap:18px!important}
html body.efc-certificates-redesign-v35 .page-title p,
html body.efc-certificates-redesign-v35 .page-title>div>span:not(.efc-cert-title-icon-v35):not(.efc-cert-title-icon-v36),
html body.efc-certificates-workspace-v36 .page-title p,
html body.efc-certificates-workspace-v36 .page-title>div>span:not(.efc-cert-title-icon-v35):not(.efc-cert-title-icon-v36){display:none!important}
html body.efc-certificates-redesign-v35 .page-title h1,
html body.efc-certificates-workspace-v36 .page-title h1{margin:0!important;font-size:31px!important;line-height:1!important;font-weight:850!important;color:#073f35!important;white-space:nowrap!important}
html body.efc-certificates-workspace-v36 .efc-cert-title-icon-v36{width:42px!important;height:42px!important;display:grid!important;place-items:center!important;color:#073f35!important;flex:0 0 42px!important}
html body.efc-certificates-workspace-v36 .efc-cert-title-icon-v36 svg{width:42px!important;height:42px!important}
html body.efc-certificates-redesign-v35 .page-title::after,
html body.efc-certificates-workspace-v36 .page-title::after{content:''!important;position:absolute!important;bottom:9px!important;left:50%!important;transform:translateX(-50%)!important;width:48px!important;height:3px!important;border-radius:6px!important;background:#0a7f62!important}

/* Registration-like fields: clear dark labels above, lighter field names/placeholders inside. */
html body.efc-certificates-workspace-v36 .cert-form-v13 label{
  display:flex!important;flex-direction:column!important;gap:7px!important;color:#101b18!important;font-size:13px!important;font-weight:850!important;line-height:1.2!important;
}
html body.efc-certificates-workspace-v36 .cert-form-v13 input,
html body.efc-certificates-workspace-v36 .cert-form-v13 select{
  height:48px!important;min-height:48px!important;border:1px solid #c7d5d0!important;border-radius:10px!important;background:#fff!important;
  color:#344b44!important;font-size:13px!important;font-weight:500!important;font-family:inherit!important;padding:8px 13px!important;box-shadow:0 2px 8px rgba(11,71,54,.025)!important;outline:none!important;
}
html body.efc-certificates-workspace-v36 .cert-form-v13 input::placeholder{color:#9aa8a3!important;opacity:1!important;font-weight:500!important}
html body.efc-certificates-workspace-v36 .cert-form-v13 select:invalid{color:#9aa8a3!important}
html body.efc-certificates-workspace-v36 .cert-form-v13 input:focus,
html body.efc-certificates-workspace-v36 .cert-form-v13 select:focus{border-color:#128264!important;box-shadow:0 0 0 3px rgba(18,130,100,.10)!important}

/* One top workspace row: student type on the right, history controls opposite it. */
html body.efc-certificates-workspace-v36 .efc-cert-workspace-toolbar-v36{
  width:100%!important;display:flex!important;align-items:center!important;justify-content:space-between!important;gap:16px!important;margin:0 0 2px!important;direction:rtl!important;
}
html body.efc-certificates-workspace-v36 .efc-cert-workspace-toolbar-v36 .cert-mode-v13{margin:0!important;flex:0 0 auto!important}
html body.efc-certificates-workspace-v36 .efc-cert-history-actions-v36{display:flex!important;align-items:center!important;gap:8px!important;direction:rtl!important;flex:0 0 auto!important}
html body.efc-certificates-workspace-v36 .efc-cert-history-filters-v36{display:flex!important;align-items:center!important;gap:7px!important;direction:rtl!important}
html body.efc-certificates-workspace-v36 .efc-cert-history-filters-v36[hidden]{display:none!important}
html body.efc-certificates-workspace-v36 .efc-cert-history-date-v36{
  width:145px!important;height:40px!important;min-height:40px!important;display:flex!important;flex-direction:row!important;align-items:center!important;gap:6px!important;
  padding:0 9px!important;border:1px solid #a8c8be!important;border-radius:8px!important;background:#fff!important;color:#183e34!important;box-sizing:border-box!important;cursor:pointer!important;
}
html body.efc-certificates-workspace-v36 .efc-cert-history-date-v36>span{font-size:10px!important;font-weight:850!important;color:#49665e!important;flex:0 0 auto!important}
html body.efc-certificates-workspace-v36 .efc-cert-history-date-v36>input{
  width:100%!important;height:38px!important;min-height:38px!important;padding:0 2px!important;border:0!important;border-radius:0!important;background:transparent!important;
  box-shadow:none!important;color:#173d33!important;font-size:11px!important;font-weight:750!important;cursor:pointer!important;outline:none!important;
}
html body.efc-certificates-workspace-v36 .efc-cert-history-date-v36>input::-webkit-calendar-picker-indicator{cursor:pointer!important;opacity:.75!important}
html body.efc-certificates-workspace-v36 .efc-cert-history-toggle-v36{
  height:40px!important;min-width:142px!important;padding:0 14px!important;border:1px solid #78a99b!important;border-radius:8px!important;
  background:#fff!important;color:#0c604d!important;display:inline-flex!important;align-items:center!important;justify-content:center!important;gap:8px!important;
  font-family:inherit!important;font-size:12px!important;font-weight:850!important;cursor:pointer!important;box-shadow:none!important;
}
html body.efc-certificates-workspace-v36 .efc-cert-history-toggle-v36:hover,
html body.efc-certificates-workspace-v36 .efc-cert-history-toggle-v36.active{background:#e4f5ef!important;border-color:#28856d!important;color:#084a3d!important}
html body.efc-certificates-workspace-v36 .efc-cert-history-toggle-v36 svg{width:20px!important;height:20px!important;flex:0 0 20px!important}

/* In history mode only the toolbar + history remain; payment fields and issue button are forcibly hidden. */
html body.efc-certificates-workspace-v36 .cert-form-v13[data-efc-history-open-v36="1"]>#certInternalPaneV13,
html body.efc-certificates-workspace-v36 .cert-form-v13[data-efc-history-open-v36="1"]>#certExternalPaneV13,
html body.efc-certificates-workspace-v36 .cert-form-v13[data-efc-history-open-v36="1"]>.cert-payment-v13,
html body.efc-certificates-workspace-v36 .cert-form-v13[data-efc-history-open-v36="1"]>#certIssueV13{display:none!important}

/* History lives inside the chooser workspace instead of below it. */
html body.efc-certificates-workspace-v36 .cert-form-v13>.cert-history-v13{
  width:100%!important;min-width:0!important;max-width:100%!important;margin:0!important;padding:12px!important;
  border:1.2px solid #73aa99!important;border-radius:11px!important;background:#fff!important;box-shadow:none!important;box-sizing:border-box!important;
}
html body.efc-certificates-workspace-v36 .cert-form-v13>.cert-history-v13[hidden]{display:none!important}
html body.efc-certificates-workspace-v36 .cert-form-v13>.cert-history-v13 .section-head{margin:0 0 10px!important}
html body.efc-certificates-workspace-v36 .cert-form-v13>.cert-history-v13 .table-wrap{
  width:100%!important;max-width:100%!important;max-height:390px!important;overflow:auto!important;overscroll-behavior:contain!important;
  border:1.25px solid rgba(0,0,0,.86)!important;border-radius:9px!important;background:#fff!important;
}
html body.efc-certificates-workspace-v36 .cert-form-v13>.cert-history-v13 table{min-width:780px!important;width:100%!important;border-collapse:collapse!important}
html body.efc-certificates-workspace-v36 .cert-form-v13>.cert-history-v13 thead th{position:sticky!important;top:0!important;z-index:2!important}
html body.efc-certificates-workspace-v36 .cert-form-v13>.cert-history-v13 th,
html body.efc-certificates-workspace-v36 .cert-form-v13>.cert-history-v13 td{border:1.25px solid rgba(0,0,0,.86)!important}
html body.efc-certificates-workspace-v36 .cert-form-v13>.cert-history-v13 tbody tr[hidden]{display:none!important}

@media(max-width:1180px){
  html body.efc-certificates-workspace-v36 .cert-form-v13>.cert-history-v13 .table-wrap{max-height:340px!important}
}
`;
document.head.appendChild(style);

window.EFC_CERTIFICATES_WORKSPACE_V36=Object.freeze({
  ready:true,registrationLikeFields:true,darkLabels:true,lightPlaceholders:true,
  persistentCertificateHero:true,historyToggleInToolbar:true,historyReplacesChooser:true,
  historyHidesPaymentFields:true,historyDateFilter:true,historyDateDefaultsToday:true,historyDateWholeControlClickable:true,
  scrollContainedHistory:true,mutationObserverIdempotent:true,certificateLogicUntouched:true,mainUntouched:true
});
})();
