(async()=>{
'use strict';
if(window.EFC_SEARCH_TITLE_GRID_UNIFY_V34?.ready)return;
const waitUntil=async(check,timeout=15000)=>{const start=Date.now();while(!check()){if(Date.now()-start>timeout)throw new Error('Search title/grid unify v34 timed out.');await new Promise(resolve=>setTimeout(resolve,20));}};
await waitUntil(()=>window.EFC_PERIOD_COUNT_GRID_POLISH_V33?.ready&&window.EFC_STUDENT_SEARCH_REDESIGN_V31?.ready);

const style=document.createElement('style');
style.id='efc-search-title-grid-unify-style-v34';
style.textContent=`
/* Make the outer table border exactly the same visual weight as the inner grid on both search pages. */
html body.efc-period-redesign-v28 .efc-period-result-v28 .table-wrap,
html body.efc-student-search-redesign-v31 #studentsTableV13 .table-wrap{
  border:1.2px solid rgba(0,0,0,.78)!important;
}
html body.efc-period-redesign-v28 .efc-period-result-v28 th,
html body.efc-period-redesign-v28 .efc-period-result-v28 td,
html body.efc-student-search-redesign-v31 #studentsTableV13 th,
html body.efc-student-search-redesign-v31 #studentsTableV13 td{
  border-width:1.2px!important;
  border-style:solid!important;
}
html body.efc-period-redesign-v28 .efc-period-result-v28 th,
html body.efc-student-search-redesign-v31 #studentsTableV13 th{border-color:rgba(0,0,0,.82)!important}
html body.efc-period-redesign-v28 .efc-period-result-v28 td,
html body.efc-student-search-redesign-v31 #studentsTableV13 td{border-color:rgba(0,0,0,.78)!important}

/* Student Search title: only the page name plus the same short underline used by the redesigned pages. */
html body.efc-student-search-redesign-v31 .page-title{
  position:relative!important;
  height:76px!important;min-height:76px!important;max-height:76px!important;
  padding:0 22px!important;
}
html body.efc-student-search-redesign-v31 .page-title>div{
  height:100%!important;display:flex!important;align-items:center!important;justify-content:center!important;
}
html body.efc-student-search-redesign-v31 .page-title p,
html body.efc-student-search-redesign-v31 .page-title span{display:none!important}
html body.efc-student-search-redesign-v31 .page-title h1{
  margin:0!important;font-size:31px!important;line-height:1!important;font-weight:850!important;color:#073f35!important;
}
html body.efc-student-search-redesign-v31 .page-title::after{
  content:''!important;position:absolute!important;bottom:9px!important;left:50%!important;
  transform:translateX(-50%)!important;width:48px!important;height:3px!important;
  border-radius:6px!important;background:#0a7f62!important;
}
`;
document.head.appendChild(style);
window.EFC_SEARCH_TITLE_GRID_UNIFY_V34=Object.freeze({
  ready:true,equalOuterInnerGridWeight:true,studentTitleOnly:true,studentTitleUnderline:true,
  periodSearchLogicUntouched:true,studentSearchLogicUntouched:true,mainUntouched:true
});
})();
