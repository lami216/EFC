(async()=>{
'use strict';
if(window.EFC_CERTIFICATES_STUDENT_RESULTS_PANEL_V39?.ready)return;
const waitUntil=async(check,timeout=15000)=>{const start=Date.now();while(!check()){if(Date.now()-start>timeout)throw new Error('Certificates student results panel v39 timed out.');await new Promise(resolve=>setTimeout(resolve,20));}};
await waitUntil(()=>window.EFC_CERTIFICATES_STUDENT_PICKER_V38?.ready&&window.EFC_CERTIFICATES_WORKSPACE_V36?.ready);

const style=document.createElement('style');
style.id='efc-certificates-student-results-panel-style-v39';
style.textContent=`
/* Internal certificate chooser: controls stay on the right half, results get a fixed left workspace. */
html body.efc-certificates-workspace-v36 #certInternalPaneV13{
  display:grid!important;
  grid-template-columns:minmax(0,1fr) minmax(0,1fr)!important;
  grid-template-rows:auto auto!important;
  column-gap:14px!important;
  row-gap:10px!important;
  align-items:start!important;
  direction:ltr!important;
  min-height:244px!important;
}
html body.efc-certificates-workspace-v36 #certInternalPaneV13[hidden]{display:none!important}
html body.efc-certificates-workspace-v36 .efc-cert-student-search-v38{
  grid-column:2!important;grid-row:1!important;order:unset!important;width:100%!important;min-width:0!important;margin:0!important;direction:rtl!important;
}
html body.efc-certificates-workspace-v36 .efc-cert-student-filters-v38{
  grid-column:2!important;grid-row:2!important;order:unset!important;width:100%!important;min-width:0!important;margin:0!important;direction:rtl!important;
  grid-template-columns:repeat(2,minmax(0,1fr))!important;gap:10px!important;align-self:start!important;
}
html body.efc-certificates-workspace-v36 .efc-cert-student-filters-v38[hidden]{display:none!important}
html body.efc-certificates-workspace-v36 #certStudentResultsV13{
  grid-column:1!important;grid-row:1 / 3!important;order:unset!important;
  width:100%!important;min-width:0!important;height:244px!important;min-height:244px!important;max-height:244px!important;
  margin:0!important;padding:8px!important;border:1.2px solid #b7d1c8!important;border-radius:11px!important;
  background:rgba(255,255,255,.82)!important;box-sizing:border-box!important;
  overflow-y:auto!important;overflow-x:hidden!important;overscroll-behavior:contain!important;
  display:grid!important;grid-auto-rows:max-content!important;align-content:start!important;gap:7px!important;direction:rtl!important;
  scrollbar-gutter:stable!important;
}
html body.efc-certificates-workspace-v36 #certStudentResultsV13 .cert-empty-v13{
  min-height:100%!important;display:flex!important;align-items:center!important;justify-content:center!important;text-align:center!important;
  padding:18px!important;border:1px dashed #c9d9d4!important;background:#f8fcfa!important;color:#7b8d87!important;box-sizing:border-box!important;
}
html body.efc-certificates-workspace-v36 #certStudentResultsV13 .cert-student-option-v13{
  width:100%!important;min-height:54px!important;flex:0 0 auto!important;
}
html body.efc-certificates-workspace-v36 #certStudentResultsV13 .efc-cert-selected-card-v38{
  width:100%!important;height:100%!important;min-height:100%!important;max-height:100%!important;margin:0!important;
  align-self:stretch!important;box-sizing:border-box!important;overflow:hidden!important;
}
html body.efc-certificates-workspace-v36 #certStudentResultsV13 .efc-cert-selected-main-v38{align-content:center!important}
html body.efc-certificates-workspace-v36 #certStudentResultsV13 .efc-cert-selected-facts-v38{grid-template-columns:repeat(2,minmax(0,1fr))!important}

/* After selection the filter area disappears, while search remains in the same right-hand position. */
html body.efc-certificates-workspace-v36 #certInternalPaneV13.efc-cert-has-selected-v38{
  grid-template-rows:auto 1fr!important;
}
html body.efc-certificates-workspace-v36 #certInternalPaneV13.efc-cert-has-selected-v38 .efc-cert-student-search-v38{
  grid-column:2!important;grid-row:1!important;
}
html body.efc-certificates-workspace-v36 #certInternalPaneV13.efc-cert-has-selected-v38 #certStudentResultsV13{
  grid-column:1!important;grid-row:1 / 3!important;
}

@media(max-width:1180px){
  html body.efc-certificates-workspace-v36 #certStudentResultsV13{height:224px!important;min-height:224px!important;max-height:224px!important}
  html body.efc-certificates-workspace-v36 #certInternalPaneV13{min-height:224px!important}
}
`;
document.head.appendChild(style);

window.EFC_CERTIFICATES_STUDENT_RESULTS_PANEL_V39=Object.freeze({
  ready:true,rightHalfControls:true,leftFixedResultsPanel:true,fixedResultsHeight:true,
  scrollLongResults:true,keepsEmptySpaceForShortResults:true,selectedStudentUsesSamePanel:true,
  certificateLogicUntouched:true,mainUntouched:true
});
})();
