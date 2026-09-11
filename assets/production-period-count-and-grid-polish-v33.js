(async()=>{
'use strict';
if(window.EFC_PERIOD_COUNT_GRID_POLISH_V33?.ready)return;
const waitUntil=async(check,timeout=15000)=>{const start=Date.now();while(!check()){if(Date.now()-start>timeout)throw new Error('Period count/grid polish v33 timed out.');await new Promise(resolve=>setTimeout(resolve,20));}};
await waitUntil(()=>window.EFC_SEARCH_DETAIL_POLISH_V32?.ready&&window.EFC_PERIOD_SEARCH_REDESIGN_V28?.ready&&typeof window.renderPeriod==='function');

const PERIOD_INPUT_IDS=new Set(['periodSearchV13','periodFromV13','periodToV13','periodBranchV13','periodSpecV13','periodStateV13']);
const tabUnit={registrations:'طلاب',payments:'عمليات',dues:'مستحقات',ending:'دورات'};
let syncTimer=0;

function currentPage(){return location.hash.replace('#','')||window.currentPage||'';}
function scheduleSync(){clearTimeout(syncTimer);syncTimer=setTimeout(syncPeriodCount,0);}
function syncPeriodCount(){
  if(currentPage()!=='period')return;
  const toolbar=document.querySelector('.period-toolbar-prod');
  const tabs=toolbar?.querySelector('.period-tabs-prod');
  const result=document.getElementById('periodResultV13');
  if(!toolbar||!tabs||!result)return;

  let badge=toolbar.querySelector('.efc-period-count-v33');
  const freshHead=result.querySelector('.period-result-head-prod');
  const sourceText=freshHead?.querySelector('b')?.textContent||badge?.dataset.count||'0';
  const match=String(sourceText).match(/\d+/);
  const count=match?Number(match[0]):0;
  freshHead?.remove();

  if(!badge){
    badge=document.createElement('div');
    badge.className='efc-period-count-v33';
    badge.setAttribute('aria-live','polite');
    tabs.insertAdjacentElement('afterend',badge);
  }
  const tab=tabs.querySelector('button.active')?.dataset.tab||'registrations';
  const unit=tabUnit[tab]||'نتائج';
  badge.dataset.count=String(count);
  badge.dataset.tab=tab;
  badge.innerHTML=`<b>${count}</b><span>${unit}</span>`;
}

const baseRenderPeriod=window.renderPeriod;
window.renderPeriod=function(){
  baseRenderPeriod();
  scheduleSync();
};

document.addEventListener('input',event=>{if(currentPage()==='period'&&PERIOD_INPUT_IDS.has(event.target?.id))scheduleSync();});
document.addEventListener('change',event=>{if(currentPage()==='period'&&PERIOD_INPUT_IDS.has(event.target?.id))scheduleSync();});
document.addEventListener('click',event=>{
  if(currentPage()!=='period')return;
  if(event.target?.closest?.('.period-tabs-prod button,.sortable-head-prod'))scheduleSync();
});
window.addEventListener('hashchange',()=>{if((location.hash.replace('#','')||window.currentPage)==='period')setTimeout(syncPeriodCount,40);});
if(currentPage()==='period')scheduleSync();

const style=document.createElement('style');
style.id='efc-period-count-grid-polish-style-v33';
style.textContent=`
/* Move the existing result count into the period toolbar, with a tab-aware unit. */
html body.efc-period-redesign-v28 .period-toolbar-prod.efc-period-toolbar-v28{
  justify-content:flex-start!important;
}
html body.efc-period-redesign-v28 .efc-period-count-v33{
  direction:rtl!important;display:inline-flex!important;align-items:center!important;justify-content:center!important;
  gap:5px!important;height:34px!important;min-width:92px!important;padding:0 12px!important;
  margin-inline-start:16px!important;margin-inline-end:2px!important;
  border:1.2px solid #75a9d6!important;border-radius:10px!important;
  background:#e6f2ff!important;color:#174a71!important;box-sizing:border-box!important;
  font-size:11px!important;font-weight:750!important;white-space:nowrap!important;
}
html body.efc-period-redesign-v28 .efc-period-count-v33::before{
  content:'☷'!important;font-size:17px!important;line-height:1!important;font-weight:800!important;
}
html body.efc-period-redesign-v28 .efc-period-count-v33 b{font-size:12px!important;font-weight:900!important;line-height:1!important}
html body.efc-period-redesign-v28 .efc-period-count-v33 span{font-size:11px!important;font-weight:800!important;line-height:1!important}
html body.efc-period-redesign-v28 .period-dates-prod{margin-inline-start:auto!important}
html body.efc-period-redesign-v28 .period-result-head-prod{display:none!important}

/* Slightly thicker, darker grid lines on both search tables. */
html body.efc-period-redesign-v28 .efc-period-result-v28 .table-wrap,
html body.efc-student-search-redesign-v31 #studentsTableV13 .table-wrap{
  border:1.35px solid rgba(0,0,0,.86)!important;
}
html body.efc-period-redesign-v28 .efc-period-result-v28 th,
html body.efc-student-search-redesign-v31 #studentsTableV13 th{
  border:1.25px solid rgba(0,0,0,.90)!important;
}
html body.efc-period-redesign-v28 .efc-period-result-v28 td,
html body.efc-student-search-redesign-v31 #studentsTableV13 td{
  border:1.2px solid rgba(0,0,0,.72)!important;
}

@media(max-width:1250px){
  html body.efc-period-redesign-v28 .efc-period-count-v33{margin-inline-start:10px!important}
}
`;
document.head.appendChild(style);

window.EFC_PERIOD_COUNT_GRID_POLISH_V33=Object.freeze({
  ready:true,movedPeriodCountIntoToolbar:true,dynamicCountUnit:true,
  registrationsStudents:true,paymentsOperations:true,duesCount:true,endingCourses:true,
  darkerThickerSearchGridLines:true,noSearchLogicChanged:true,mainUntouched:true
});
})();
