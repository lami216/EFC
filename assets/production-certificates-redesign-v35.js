(async()=>{
'use strict';
if(window.EFC_CERTIFICATES_REDESIGN_V35?.ready)return;
const waitUntil=async(check,timeout=15000)=>{const start=Date.now();while(!check()){if(Date.now()-start>timeout)throw new Error('Certificates redesign v35 timed out.');await new Promise(resolve=>setTimeout(resolve,20));}};
await waitUntil(()=>window.EFC_CERTIFICATES_V13?.ready&&window.EFC_SIDEBAR_LOCK_V30?.ready&&window.EFC_REGISTRATION_REDESIGN_V15?.ready);

const icon=body=>`<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><g fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round">${body}</g></svg>`;
const CERT_ICON=icon('<path d="M6 3h12v18H6z"/><path d="M9 7h6M9 11h6"/><circle cx="12" cy="16" r="2.2"/><path d="m10.6 17.7-.6 2.1 2-1 2 1-.6-2.1"/>');

function currentPage(){return location.hash.replace('#','')||window.currentPage||'';}
function syncPageClass(){document.body.classList.toggle('efc-certificates-redesign-v35',currentPage()==='certificates');}
function cleanOptionalLabel(label){
  if(!label)return;
  const text=[...label.childNodes].find(node=>node.nodeType===Node.TEXT_NODE);
  if(text)text.nodeValue=String(text.nodeValue||'').replace(/\s*—\s*فلتر اختياري\s*/g,'');
}
function enhanceCertificates(){
  syncPageClass();
  if(currentPage()!=='certificates')return;
  const content=document.querySelector('.shell.shell-v13 main>.content');
  if(!content)return;
  const title=content.querySelector('.page-title');
  if(title){
    title.classList.add('efc-cert-hero-v35');
    const inner=title.querySelector(':scope>div');
    if(inner&&!inner.querySelector('.efc-cert-title-icon-v35')){
      const marker=document.createElement('span');
      marker.className='efc-cert-title-icon-v35';
      marker.innerHTML=CERT_ICON;
      inner.prepend(marker);
    }
  }
  cleanOptionalLabel(document.querySelector('#certInternalBranchV13')?.closest('label'));
  cleanOptionalLabel(document.querySelector('#certInternalSpecV13')?.closest('label'));
}

const baseCertificateRender=window.EFC_RENDER_CERTIFICATES_V13;
if(typeof baseCertificateRender==='function'){
  window.EFC_RENDER_CERTIFICATES_V13=function(){const result=baseCertificateRender();enhanceCertificates();return result;};
}
window.addEventListener('hashchange',()=>setTimeout(enhanceCertificates,50));
if(currentPage()==='certificates')setTimeout(enhanceCertificates,0);

const style=document.createElement('style');
style.id='efc-certificates-redesign-style-v35';
style.textContent=`
/* Certificate workspace follows the established EFC redesign language without changing certificate logic. */
html body.efc-certificates-redesign-v35{font-family:"Segoe UI Variable","Segoe UI",Tahoma,Arial,sans-serif!important;background:#f5fbf9!important;overflow-x:hidden!important}
html body.efc-certificates-redesign-v35 .shell.shell-v13{background:radial-gradient(circle at 43% 24%,#fbfffe 0,#f4faf7 54%,#edf6f2 100%)!important}
html body.efc-certificates-redesign-v35 .shell.shell-v13 main>.content{
  width:900px!important;max-width:900px!important;min-width:900px!important;
  margin:0 0 0 auto!important;margin-right:22px!important;padding:18px 0 34px!important;
  box-sizing:border-box!important;overflow:visible!important;
}

/* Same title card family as Registration / redesigned search pages; explanatory notes are intentionally removed. */
html body.efc-certificates-redesign-v35 .page-title.efc-cert-hero-v35{
  position:relative!important;display:flex!important;align-items:center!important;justify-content:center!important;
  width:470px!important;min-width:470px!important;max-width:470px!important;
  height:76px!important;min-height:76px!important;max-height:76px!important;
  margin:0 auto 18px!important;padding:0 20px!important;border:0!important;border-radius:17px!important;
  background:linear-gradient(135deg,#e4f8f0,#d4efe5)!important;
  box-shadow:0 10px 30px rgba(20,102,76,.05)!important;color:#073f35!important;box-sizing:border-box!important;
}
html body.efc-certificates-redesign-v35 .page-title.efc-cert-hero-v35>div{
  width:auto!important;display:flex!important;align-items:center!important;justify-content:center!important;gap:18px!important;
}
html body.efc-certificates-redesign-v35 .page-title.efc-cert-hero-v35 p,
html body.efc-certificates-redesign-v35 .page-title.efc-cert-hero-v35>div>span:not(.efc-cert-title-icon-v35){display:none!important}
html body.efc-certificates-redesign-v35 .page-title.efc-cert-hero-v35 h1{
  margin:0!important;font-size:31px!important;line-height:1!important;font-weight:850!important;color:#073f35!important;white-space:nowrap!important;
}
html body.efc-certificates-redesign-v35 .efc-cert-title-icon-v35{width:42px!important;height:42px!important;display:grid!important;place-items:center!important;color:#073f35!important;flex:0 0 42px!important}
html body.efc-certificates-redesign-v35 .efc-cert-title-icon-v35 svg{width:42px!important;height:42px!important}
html body.efc-certificates-redesign-v35 .page-title.efc-cert-hero-v35::after{
  content:''!important;position:absolute!important;bottom:9px!important;left:50%!important;transform:translateX(-50%)!important;
  width:48px!important;height:3px!important;border-radius:6px!important;background:#0a7f62!important;
}

/* Remove the explanatory/help notes; keep every operational control and field. */
html body.efc-certificates-redesign-v35 .cert-help-v13,
html body.efc-certificates-redesign-v35 .cert-private-note-v13{display:none!important}
html body.efc-certificates-redesign-v35 .cert-layout-v13{
  width:900px!important;max-width:900px!important;min-width:900px!important;
  display:grid!important;grid-template-columns:1fr!important;gap:14px!important;margin:0 0 14px!important;
}
html body.efc-certificates-redesign-v35 .cert-form-v13{
  width:900px!important;max-width:900px!important;min-width:900px!important;
  display:grid!important;gap:14px!important;margin:0!important;padding:15px!important;
  border:1.4px solid #4aa68c!important;border-radius:13px!important;
  background:linear-gradient(135deg,rgba(239,251,247,.96),rgba(255,255,255,.99))!important;
  box-shadow:0 10px 28px rgba(22,83,64,.05)!important;box-sizing:border-box!important;
}
html body.efc-certificates-redesign-v35 .cert-mode-v13{
  display:flex!important;align-items:center!important;gap:6px!important;width:max-content!important;margin:0!important;padding:4px!important;
  border:1px solid #a8c8be!important;border-radius:10px!important;background:#eef8f4!important;
}
html body.efc-certificates-redesign-v35 .cert-mode-v13 button{
  height:40px!important;padding:0 18px!important;border:1px solid transparent!important;border-radius:8px!important;
  background:transparent!important;color:#385b51!important;font-size:12px!important;font-weight:750!important;font-family:inherit!important;cursor:pointer!important;
}
html body.efc-certificates-redesign-v35 .cert-mode-v13 button.active{
  background:linear-gradient(180deg,#0b755d,#08624f)!important;border-color:#08624f!important;color:#fff!important;
  box-shadow:0 5px 12px rgba(8,98,79,.14)!important;
}
html body.efc-certificates-redesign-v35 .cert-form-v13 .grid.two{gap:11px 13px!important}
html body.efc-certificates-redesign-v35 .cert-form-v13 label{
  gap:6px!important;color:#203a33!important;font-size:11.5px!important;font-weight:750!important;
}
html body.efc-certificates-redesign-v35 .cert-form-v13 input,
html body.efc-certificates-redesign-v35 .cert-form-v13 select{
  height:44px!important;min-height:44px!important;border:1px solid #c9d8d3!important;border-radius:9px!important;background:#fff!important;
  color:#172622!important;font-size:12px!important;font-family:inherit!important;padding:8px 12px!important;box-shadow:none!important;outline:none!important;
}
html body.efc-certificates-redesign-v35 .cert-form-v13 input:focus,
html body.efc-certificates-redesign-v35 .cert-form-v13 select:focus{
  border-color:#1b8c70!important;box-shadow:0 0 0 3px rgba(27,140,112,.10)!important;
}
html body.efc-certificates-redesign-v35 #certStudentSearchV13{margin-top:1px!important}
html body.efc-certificates-redesign-v35 .cert-results-v13{display:grid!important;gap:6px!important;margin-top:7px!important}
html body.efc-certificates-redesign-v35 .cert-student-option-v13{
  min-height:48px!important;padding:9px 12px!important;border:1px solid #bad0c8!important;border-radius:9px!important;
  background:#fff!important;color:#162b25!important;font-family:inherit!important;transition:background-color .12s ease,border-color .12s ease!important;
}
html body.efc-certificates-redesign-v35 .cert-student-option-v13:hover{background:#d7ebe4!important;border-color:#4c9c84!important}
html body.efc-certificates-redesign-v35 .cert-student-option-v13 b,
html body.efc-certificates-redesign-v35 .cert-selected-v13 b{font-size:11.5px!important;font-weight:850!important}
html body.efc-certificates-redesign-v35 .cert-student-option-v13 span,
html body.efc-certificates-redesign-v35 .cert-selected-v13 span{font-size:9.5px!important;line-height:1.5!important;color:#59736b!important}
html body.efc-certificates-redesign-v35 .cert-empty-v13,
html body.efc-certificates-redesign-v35 .cert-selected-v13{padding:11px 12px!important;border-radius:9px!important;font-size:10px!important}
html body.efc-certificates-redesign-v35 .cert-selected-v13{border:1px solid #63aa95!important;background:#e8f7f1!important;color:#173d32!important}
html body.efc-certificates-redesign-v35 #certAddBranchV13{
  height:38px!important;padding:0 13px!important;border:1px solid #8ab9aa!important;border-radius:8px!important;background:#fff!important;color:#0b6651!important;font-size:11px!important;font-weight:800!important;font-family:inherit!important;
}
html body.efc-certificates-redesign-v35 .cert-payment-v13{
  margin-top:1px!important;padding-top:13px!important;border-top:1.2px solid #9fbcb2!important;
}
html body.efc-certificates-redesign-v35 #certIssueV13{
  min-height:48px!important;border:0!important;border-radius:9px!important;
  background:linear-gradient(180deg,#08785d,#056149)!important;color:#fff!important;
  font-size:14px!important;font-weight:850!important;font-family:inherit!important;box-shadow:0 7px 16px rgba(7,103,78,.13)!important;
}
html body.efc-certificates-redesign-v35 #certIssueV13:hover:not(:disabled){background:linear-gradient(180deg,#0a8668,#066a51)!important}
html body.efc-certificates-redesign-v35 #certIssueV13:disabled{opacity:.48!important;box-shadow:none!important}

/* Certificate history adopts the same card + dark-green table language as the search pages. */
html body.efc-certificates-redesign-v35 .cert-history-v13{
  width:900px!important;max-width:900px!important;min-width:900px!important;margin:0!important;padding:13px!important;
  border:1.4px solid #4aa68c!important;border-radius:13px!important;background:#fff!important;
  box-shadow:0 10px 28px rgba(22,83,64,.045)!important;box-sizing:border-box!important;
}
html body.efc-certificates-redesign-v35 .cert-history-v13 .section-head{
  min-height:48px!important;margin:0 0 11px!important;padding:0 14px!important;border:0!important;border-radius:10px!important;
  background:linear-gradient(135deg,#e8f9f3,#dff4ed)!important;display:flex!important;align-items:center!important;justify-content:space-between!important;gap:12px!important;
}
html body.efc-certificates-redesign-v35 .cert-history-v13 .section-head h2{margin:0!important;color:#124b40!important;font-size:18px!important;font-weight:850!important}
html body.efc-certificates-redesign-v35 .cert-history-v13 .section-head>span{
  height:30px!important;padding:0 10px!important;border:1px solid #75a9d6!important;border-radius:9px!important;
  background:#e6f2ff!important;color:#174a71!important;display:inline-flex!important;align-items:center!important;font-size:10.5px!important;font-weight:800!important;
}
html body.efc-certificates-redesign-v35 .cert-history-v13 .table-wrap{
  width:100%!important;overflow:auto!important;border:1.25px solid rgba(0,0,0,.86)!important;border-radius:10px!important;background:#fff!important;box-shadow:none!important;
}
html body.efc-certificates-redesign-v35 .cert-history-v13 table{
  width:100%!important;min-width:100%!important;border-collapse:collapse!important;table-layout:auto!important;color:#111!important;background:#fff!important;font-size:10px!important;
}
html body.efc-certificates-redesign-v35 .cert-history-v13 th{
  height:42px!important;padding:8px 7px!important;background:linear-gradient(180deg,#0a715b,#075846)!important;color:#fff!important;
  border:1.25px solid rgba(0,0,0,.86)!important;text-align:center!important;vertical-align:middle!important;font-size:10px!important;font-weight:850!important;
}
html body.efc-certificates-redesign-v35 .cert-history-v13 td{
  height:39px!important;padding:8px 7px!important;border:1.25px solid rgba(0,0,0,.86)!important;text-align:center!important;vertical-align:middle!important;background:#fff!important;font-size:10px!important;
}
html body.efc-certificates-redesign-v35 .cert-history-v13 tbody tr:nth-child(even) td{background:#fbfdfc!important}
html body.efc-certificates-redesign-v35 .cert-history-v13 tbody tr:hover td{background:#d7ebe4!important}
html body.efc-certificates-redesign-v35 .cert-history-v13 td small{display:block!important;margin-top:2px!important;color:#60766f!important;font-size:8.5px!important}

/* Make the weekly schedule label a real, prominent section title without touching the schedule table layout. */
html body.efc-registration-redesign-v15 .schedule-title-v13 h2{
  font-size:31px!important;font-weight:900!important;line-height:1.08!important;letter-spacing:-.35px!important;
  color:#0b201a!important;white-space:nowrap!important;flex:0 1 auto!important;
}
html body.efc-registration-redesign-v15 .schedule-title-v13 h2 span{font-size:inherit!important;font-weight:inherit!important;white-space:nowrap!important}
html body.efc-registration-redesign-v15 .schedule-title-v13 h2 svg{width:40px!important;height:40px!important;flex:0 0 40px!important;color:#075f4c!important}

@media(max-width:1180px){
  html body.efc-certificates-redesign-v35 .shell.shell-v13 main>.content{transform:scale(.92)!important;transform-origin:top right!important}
  html body.efc-registration-redesign-v15 .schedule-title-v13 h2{font-size:29px!important}
}
@media(max-width:1040px){html body.efc-certificates-redesign-v35 .shell.shell-v13 main>.content{transform:scale(.82)!important;transform-origin:top right!important}}
`;
document.head.appendChild(style);

window.EFC_CERTIFICATES_REDESIGN_V35=Object.freeze({
  ready:true,certificatePageRedesigned:true,certificateNotesRemoved:true,certificateLogicPreserved:true,
  registrationWeeklyScheduleTitleEmphasized:true,mainUntouched:true
});
})();
