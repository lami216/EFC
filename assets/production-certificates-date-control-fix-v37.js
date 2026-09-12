(async()=>{
'use strict';
if(window.EFC_CERTIFICATES_DATE_CONTROL_FIX_V37?.ready)return;
const waitUntil=async(check,timeout=15000)=>{const start=Date.now();while(!check()){if(Date.now()-start>timeout)throw new Error('Certificate date control fix v37 timed out.');await new Promise(resolve=>setTimeout(resolve,20));}};
await waitUntil(()=>window.EFC_CERTIFICATES_WORKSPACE_V36?.ready);

let scheduled=false;
function currentPage(){return location.hash.replace('#','')||window.currentPage||'';}
function formatDate(value){
  const match=String(value||'').match(/^(\d{4})-(\d{2})-(\d{2})$/);
  return match?`${match[3]}/${match[2]}/${match[1]}`:'';
}
function enhanceDateControls(){
  scheduled=false;
  if(currentPage()!=='certificates')return;
  document.querySelectorAll('.efc-cert-history-date-v36').forEach(label=>{
    const input=label.querySelector('input[type="date"]');
    const caption=label.querySelector(':scope>span:not(.efc-cert-history-date-value-v37)');
    if(!input||!caption)return;
    caption.classList.add('efc-cert-history-date-caption-v37');
    let value=label.querySelector('.efc-cert-history-date-value-v37');
    if(!value){
      value=document.createElement('span');
      value.className='efc-cert-history-date-value-v37';
      caption.insertAdjacentElement('afterend',value);
    }
    const sync=()=>{value.textContent=formatDate(input.value)||'اختر التاريخ';};
    sync();
    if(input.dataset.efcDateVisualV37!=='1'){
      input.dataset.efcDateVisualV37='1';
      input.addEventListener('input',sync);
      input.addEventListener('change',sync);
    }
  });
}
function schedule(){if(scheduled)return;scheduled=true;requestAnimationFrame(enhanceDateControls);}
window.addEventListener('hashchange',()=>{if(currentPage()==='certificates')setTimeout(schedule,30);});
const app=document.getElementById('app');
if(app){
  new MutationObserver(mutations=>{
    if(currentPage()!=='certificates')return;
    if(mutations.some(m=>m.type==='childList'&&(m.addedNodes.length||m.removedNodes.length)))schedule();
  }).observe(app,{childList:true,subtree:true});
}
if(currentPage()==='certificates')schedule();

const style=document.createElement('style');
style.id='efc-certificates-date-control-fix-style-v37';
style.textContent=`
/* Render certificate history dates as compact button-like controls instead of relying on browser-native date text layout. */
html body.efc-certificates-workspace-v36 .efc-cert-history-date-v36{
  position:relative!important;width:145px!important;height:40px!important;min-height:40px!important;
  display:flex!important;flex-direction:row!important;align-items:center!important;justify-content:center!important;gap:7px!important;
  padding:0 11px!important;overflow:hidden!important;isolation:isolate!important;
  border:1px solid #a8c8be!important;border-radius:8px!important;background:#fff!important;box-sizing:border-box!important;
}
html body.efc-certificates-workspace-v36 .efc-cert-history-date-v36 .efc-cert-history-date-caption-v37{
  position:static!important;display:inline!important;flex:0 0 auto!important;margin:0!important;padding:0!important;
  color:#49665e!important;font-size:10px!important;font-weight:850!important;line-height:1!important;white-space:nowrap!important;pointer-events:none!important;
}
html body.efc-certificates-workspace-v36 .efc-cert-history-date-v36 .efc-cert-history-date-value-v37{
  position:static!important;display:inline!important;flex:0 0 auto!important;margin:0!important;padding:0!important;
  color:#173d33!important;font-size:11px!important;font-weight:800!important;line-height:1!important;white-space:nowrap!important;direction:ltr!important;pointer-events:none!important;
}
html body.efc-certificates-workspace-v36 .efc-cert-history-date-v36>input[type="date"]{
  position:absolute!important;inset:0!important;z-index:3!important;width:100%!important;height:100%!important;min-height:0!important;
  margin:0!important;padding:0!important;border:0!important;border-radius:8px!important;background:transparent!important;
  opacity:0!important;cursor:pointer!important;appearance:auto!important;-webkit-appearance:auto!important;
}
html body.efc-certificates-workspace-v36 .efc-cert-history-date-v36:focus-within{
  border-color:#128264!important;box-shadow:0 0 0 3px rgba(18,130,100,.10)!important;
}
`;
document.head.appendChild(style);
window.EFC_CERTIFICATES_DATE_CONTROL_FIX_V37=Object.freeze({ready:true,compactNativeDateOverlay:true,stableVisibleDateText:true,wholeControlClickable:true,mainUntouched:true});
})();
