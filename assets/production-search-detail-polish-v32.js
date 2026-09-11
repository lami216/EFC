(async()=>{
'use strict';
if(window.EFC_SEARCH_DETAIL_POLISH_V32?.ready)return;
const waitUntil=async(check,timeout=15000)=>{const start=Date.now();while(!check()){if(Date.now()-start>timeout)throw new Error('Search detail polish v32 timed out.');await new Promise(resolve=>setTimeout(resolve,20));}};
await waitUntil(()=>window.EFC_STUDENT_SEARCH_REDESIGN_V31?.ready&&window.EFC_PERIOD_SEARCH_REDESIGN_V28?.ready&&typeof window.renderStudents==='function');

const icon=body=>`<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><g fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round">${body}</g></svg>`;
const ICONS={
  branch:icon('<path d="M6 20V8h12v12M9 8V5h6v3M4 20h16M9 12h2M13 12h2M9 16h2M13 16h2"/>'),
  course:icon('<rect x="5" y="4" width="14" height="16" rx="2"/><path d="M9 8h6M9 12h6M9 16h4"/>')
};

function wrapStudentSelect(control,kind){
  if(!control||control.parentElement?.classList.contains('efc-student-control-v32'))return;
  const wrap=document.createElement('div');
  wrap.className=`efc-student-control-v32 ${kind}`;
  const marker=document.createElement('span');
  marker.className='efc-student-control-icon-v32';
  marker.innerHTML=kind==='branch'?ICONS.branch:ICONS.course;
  control.parentNode.insertBefore(wrap,control);
  wrap.appendChild(control);
  wrap.appendChild(marker);
}
function enhanceStudentFilters(){
  if((location.hash.replace('#','')||window.currentPage)!=='students')return;
  wrapStudentSelect(document.getElementById('studentBranchV13'),'branch');
  wrapStudentSelect(document.getElementById('studentSpecV13'),'course');
}

const baseRenderStudents=window.renderStudents;
window.renderStudents=function(){
  baseRenderStudents();
  enhanceStudentFilters();
};
window.addEventListener('hashchange',()=>setTimeout(enhanceStudentFilters,40));
if((location.hash.replace('#','')||window.currentPage)==='students')setTimeout(enhanceStudentFilters,0);

const style=document.createElement('style');
style.id='efc-search-detail-polish-style-v32';
style.textContent=`
/* Decorative branch/course icons in Student Search, matching Period Search without changing controls. */
html body.efc-student-search-redesign-v31 .efc-student-control-v32{position:relative!important;min-width:0!important;width:100%!important}
html body.efc-student-search-redesign-v31 .efc-student-control-v32>select{width:100%!important;padding:8px 38px 8px 12px!important}
html body.efc-student-search-redesign-v31 .efc-student-control-icon-v32{
  position:absolute!important;right:11px!important;top:50%!important;transform:translateY(-50%)!important;
  width:20px!important;height:20px!important;display:grid!important;place-items:center!important;
  color:#0b5f4c!important;pointer-events:none!important;z-index:1!important;
}
html body.efc-student-search-redesign-v31 .efc-student-control-icon-v32 svg{width:19px!important;height:19px!important}

/* Stronger inner list/table lines on both search pages. */
html body.efc-period-redesign-v28 .efc-period-result-v28 .table-wrap,
html body.efc-student-search-redesign-v31 #studentsTableV13 .table-wrap{
  border-color:rgba(0,0,0,.78)!important;
}
html body.efc-period-redesign-v28 .efc-period-result-v28 th,
html body.efc-student-search-redesign-v31 #studentsTableV13 th{
  border-color:rgba(0,0,0,.80)!important;
}
html body.efc-period-redesign-v28 .efc-period-result-v28 td,
html body.efc-student-search-redesign-v31 #studentsTableV13 td{
  border-color:rgba(0,0,0,.58)!important;
  transition:background-color .12s ease!important;
}

/* Clearer row hover on both search pages. */
html body.efc-period-redesign-v28 .efc-period-result-v28 tbody tr:hover td,
html body.efc-student-search-redesign-v31 #studentsTableV13 tbody tr:hover td{
  background:#d7ebe4!important;
}
`;
document.head.appendChild(style);

window.EFC_SEARCH_DETAIL_POLISH_V32=Object.freeze({
  ready:true,studentBranchCourseIcons:true,darkerTableLines:true,strongerRowHover:true,
  noControlsAdded:true,noControlsRemoved:true,mainUntouched:true
});
})();
