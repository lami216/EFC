(()=>{
  const FLAG='__EFC_STUDENT_ROUTE_GUARD_V6__';
  if(window[FLAG]) return;

  const isStudentRoute=()=>/^(student|enrollment)\//.test(location.hash.replace(/^#/,''));

  function install(){
    const ready=window.EFC_STUDENT_PAGES_RECEIPTS_V5?.pagesAreFinal&&typeof renderCurrent==='function';
    if(!ready){setTimeout(install,40);return;}
    window[FLAG]=true;

    window.addEventListener('hashchange',event=>{
      if(!isStudentRoute()) return;
      event.stopImmediatePropagation();
      renderCurrent();
    },true);

    if(isStudentRoute()) renderCurrent();
    window.EFC_STUDENT_ROUTE_GUARD_V6=Object.freeze({studentRoutesOwned:true,registrationFallbackBlocked:true});
  }

  install();
})();