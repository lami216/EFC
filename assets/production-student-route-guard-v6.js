(()=>{
  const FLAG='__EFC_STUDENT_ROUTE_GUARD_V6__';
  if(window[FLAG]) return;
  window[FLAG]=true;

  const isStudentRoute=()=>/^(student|enrollment)\//.test(location.hash.replace(/^#/,''));
  let retryTimer=null;

  function renderStudentRoute(){
    if(!isStudentRoute()) return;
    const ready=window.EFC_STUDENT_PAGES_RECEIPTS_V5?.pagesAreFinal&&typeof renderCurrent==='function';
    if(!ready){
      clearTimeout(retryTimer);
      retryTimer=setTimeout(renderStudentRoute,40);
      return;
    }
    renderCurrent();
  }

  window.addEventListener('hashchange',event=>{
    if(!isStudentRoute()) return;
    event.stopImmediatePropagation();
    renderStudentRoute();
  },true);

  if(isStudentRoute()) renderStudentRoute();
  window.EFC_STUDENT_ROUTE_GUARD_V6=Object.freeze({studentRoutesOwned:true,registrationFallbackBlocked:true,installedBeforeBaseRouter:true});
})();