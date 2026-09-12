(async()=>{
'use strict';
if(window.EFC_CERTIFICATES_STUDENT_LAYOUT_V40?.ready)return;
const waitUntil=async(check,timeout=15000)=>{const start=Date.now();while(!check()){if(Date.now()-start>timeout)throw new Error('Certificates student layout v40 timed out.');await new Promise(resolve=>setTimeout(resolve,20));}};
await waitUntil(()=>window.EFC_CERTIFICATES_STUDENT_RESULTS_PANEL_V39?.ready&&window.EFC_CERTIFICATES_STUDENT_PICKER_V38?.ready&&window.EFC_CERTIFICATES_WORKSPACE_V36?.ready);

let scheduled=false;
function currentPage(){return location.hash.replace('#','')||window.currentPage||'';}
function isInternalMode(form){return form?.querySelector('.cert-mode-v13 button[data-mode="internal"]')?.classList.contains('active');}

function ensureAnchor(form,payment){
  let anchor=form.querySelector('.efc-cert-payment-anchor-v40');
  if(anchor)return anchor;
  anchor=document.createElement('span');
  anchor.className='efc-cert-payment-anchor-v40';
  anchor.hidden=true;
  payment.parentNode.insertBefore(anchor,payment);
  return anchor;
}

function syncPaymentPlacement(form,pane,payment,issue){
  if(!form||!pane||!payment||!issue)return;
  const anchor=ensureAnchor(form,payment);
  if(isInternalMode(form)){
    payment.classList.add('efc-cert-internal-payment-v40');
    issue.classList.add('efc-cert-internal-issue-v40');
    if(payment.parentElement!==pane)pane.appendChild(payment);
    if(issue.parentElement!==pane)pane.appendChild(issue);
  }else{
    payment.classList.remove('efc-cert-internal-payment-v40');
    issue.classList.remove('efc-cert-internal-issue-v40');
    if(payment.parentElement!==form)anchor.after(payment);
    if(issue.parentElement!==form)payment.after(issue);
  }
}

function ensureSelectedHost(pane,results){
  let host=pane.querySelector('.efc-cert-selected-host-v40');
  if(!host){
    host=document.createElement('div');
    host.className='efc-cert-selected-host-v40';
    host.hidden=true;
    pane.appendChild(host);
  }
  const source=results.querySelector('.cert-selected-v13');
  if(!source){
    host.hidden=true;
    host.innerHTML='';
    results.classList.remove('efc-cert-results-selected-v40');
    return;
  }
  source.classList.add('efc-cert-selected-source-v40');
  results.classList.add('efc-cert-results-selected-v40');
  host.hidden=false;
  host.innerHTML=source.innerHTML;
  const clonedCancel=host.querySelector('.efc-cert-cancel-student-v38');
  if(clonedCancel){
    clonedCancel.addEventListener('click',event=>{
      event.preventDefault();
      event.stopPropagation();
      source.querySelector('.efc-cert-cancel-student-v38')?.click();
      setTimeout(scheduleEnhance,0);
    });
  }
}

function bindModeButtons(form){
  form.querySelectorAll('.cert-mode-v13 button').forEach(button=>{
    if(button.dataset.efcLayoutBoundV40==='1')return;
    button.dataset.efcLayoutBoundV40='1';
    button.addEventListener('click',()=>setTimeout(scheduleEnhance,0));
  });
}

function enhance(){
  scheduled=false;
  if(currentPage()!=='certificates')return;
  const form=document.querySelector('.cert-form-v13');
  const pane=document.getElementById('certInternalPaneV13');
  const results=document.getElementById('certStudentResultsV13');
  const payment=document.querySelector('.cert-payment-v13');
  const issue=document.getElementById('certIssueV13');
  if(!form||!pane||!results||!payment||!issue)return;
  bindModeButtons(form);
  syncPaymentPlacement(form,pane,payment,issue);
  ensureSelectedHost(pane,results);
}
function scheduleEnhance(){if(scheduled)return;scheduled=true;requestAnimationFrame(enhance);}

window.addEventListener('hashchange',()=>{if(currentPage()==='certificates')setTimeout(scheduleEnhance,40);});
const app=document.getElementById('app');
if(app){
  const observer=new MutationObserver(mutations=>{
    if(currentPage()!=='certificates')return;
    if(mutations.some(m=>m.type==='childList'&&(m.addedNodes.length||m.removedNodes.length)))scheduleEnhance();
  });
  observer.observe(app,{childList:true,subtree:true});
}
if(currentPage()==='certificates')scheduleEnhance();

const style=document.createElement('style');
style.id='efc-certificates-student-layout-style-v40';
style.textContent=`
/* Give the results list more vertical room while keeping every internal control in the right half. */
html body.efc-certificates-workspace-v36 #certInternalPaneV13{
  grid-template-columns:minmax(0,1fr) minmax(0,1fr)!important;
  grid-template-rows:auto minmax(78px,auto) auto auto!important;
  column-gap:14px!important;row-gap:10px!important;min-height:356px!important;
}
html body.efc-certificates-workspace-v36 .efc-cert-student-search-v38{grid-column:2!important;grid-row:1!important}
html body.efc-certificates-workspace-v36 .efc-cert-student-filters-v38{grid-column:2!important;grid-row:2!important}
html body.efc-certificates-workspace-v36 .efc-cert-selected-host-v40{
  grid-column:2!important;grid-row:2!important;width:100%!important;min-width:0!important;margin:0!important;direction:rtl!important;
}
html body.efc-certificates-workspace-v36 .efc-cert-selected-host-v40[hidden]{display:none!important}
html body.efc-certificates-workspace-v36 .efc-cert-selected-host-v40 .efc-cert-selected-main-v38{display:grid!important;gap:8px!important;min-width:0!important}
html body.efc-certificates-workspace-v36 .efc-cert-selected-host-v40 .efc-cert-selected-card-v38,
html body.efc-certificates-workspace-v36 .efc-cert-selected-host-v40{
  min-height:124px!important;padding:15px 16px!important;border:1.4px solid #4b9f87!important;border-radius:11px!important;
  background:linear-gradient(135deg,#e9f8f3,#dff2ec)!important;color:#122d26!important;box-sizing:border-box!important;
}
html body.efc-certificates-workspace-v36 .efc-cert-selected-host-v40 .efc-cert-selected-main-v38>strong{font-size:20px!important;font-weight:900!important;color:#073f35!important}
html body.efc-certificates-workspace-v36 .efc-cert-selected-host-v40 .efc-cert-selected-facts-v38{display:grid!important;grid-template-columns:repeat(2,minmax(0,1fr))!important;gap:7px!important;margin-top:7px!important}
html body.efc-certificates-workspace-v36 .efc-cert-selected-host-v40 .efc-cert-selected-facts-v38>span{min-height:43px!important;padding:6px 8px!important;border:1px solid #bdd8cf!important;border-radius:8px!important;background:rgba(255,255,255,.78)!important;display:flex!important;flex-direction:column!important;justify-content:center!important;gap:3px!important}
html body.efc-certificates-workspace-v36 .efc-cert-selected-host-v40 .efc-cert-cancel-student-v38{margin-top:9px!important;height:38px!important;min-width:118px!important}

/* Keep the original selected node only as state/source; the visible summary lives below search where filters were. */
html body.efc-certificates-workspace-v36 #certStudentResultsV13 .efc-cert-selected-source-v40{display:none!important}
html body.efc-certificates-workspace-v36 #certStudentResultsV13{
  grid-column:1!important;grid-row:1 / 5!important;height:356px!important;min-height:356px!important;max-height:356px!important;
}
html body.efc-certificates-workspace-v36 #certStudentResultsV13.efc-cert-results-selected-v40{background:rgba(255,255,255,.82)!important}

/* Payment becomes compact like the filters above it and occupies only the right half. */
html body.efc-certificates-workspace-v36 #certInternalPaneV13>.cert-payment-v13.efc-cert-internal-payment-v40{
  grid-column:2!important;grid-row:3!important;width:100%!important;min-width:0!important;max-width:100%!important;margin:0!important;padding:0!important;
  border-top:0!important;display:grid!important;grid-template-columns:repeat(2,minmax(0,1fr))!important;gap:10px!important;align-self:start!important;direction:rtl!important;
}
html body.efc-certificates-workspace-v36 #certInternalPaneV13>.cert-payment-v13.efc-cert-internal-payment-v40 label{min-width:0!important;margin:0!important}
html body.efc-certificates-workspace-v36 #certInternalPaneV13>.cert-payment-v13.efc-cert-internal-payment-v40 input,
html body.efc-certificates-workspace-v36 #certInternalPaneV13>.cert-payment-v13.efc-cert-internal-payment-v40 select{width:100%!important;min-width:0!important;height:46px!important;min-height:46px!important}
html body.efc-certificates-workspace-v36 #certInternalPaneV13>#certIssueV13.efc-cert-internal-issue-v40{
  grid-column:2!important;grid-row:4!important;width:100%!important;min-width:0!important;max-width:100%!important;margin:0!important;min-height:46px!important;height:46px!important;align-self:start!important;
}

/* Do not let v39 move the selected summary back into the left results panel. */
html body.efc-certificates-workspace-v36 #certInternalPaneV13.efc-cert-has-selected-v38 #certStudentResultsV13{grid-column:1!important;grid-row:1 / 5!important}
html body.efc-certificates-workspace-v36 #certInternalPaneV13.efc-cert-has-selected-v38 .efc-cert-student-search-v38{grid-column:2!important;grid-row:1!important}

@media(max-width:1180px){
  html body.efc-certificates-workspace-v36 #certInternalPaneV13{min-height:330px!important}
  html body.efc-certificates-workspace-v36 #certStudentResultsV13{height:330px!important;min-height:330px!important;max-height:330px!important}
}
`;
document.head.appendChild(style);
window.EFC_CERTIFICATES_STUDENT_LAYOUT_V40=Object.freeze({ready:true,paymentCompactRightHalf:true,resultsPanelTaller:true,selectedStudentUnderSearch:true,filtersRestoreOnCancel:true,certificateLogicUntouched:true,mainUntouched:true});
})();
