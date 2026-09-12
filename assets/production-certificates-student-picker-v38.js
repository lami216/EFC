(async()=>{
'use strict';
if(window.EFC_CERTIFICATES_STUDENT_PICKER_V38?.ready)return;
const waitUntil=async(check,timeout=15000)=>{const start=Date.now();while(!check()){if(Date.now()-start>timeout)throw new Error('Certificates student picker v38 timed out.');await new Promise(resolve=>setTimeout(resolve,20));}};
await waitUntil(()=>window.EFC_CERTIFICATES_WORKSPACE_V36?.ready&&window.EFC_CERTIFICATES_V13?.ready);

const esc=value=>String(value??'').replace(/[&<>"']/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
const X_ICON='<svg viewBox="0 0 24 24" aria-hidden="true"><g fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M6 6l12 12M18 6 6 18"/></g></svg>';
let scheduled=false;
let activeStudentId='';

function currentPage(){return location.hash.replace('#','')||window.currentPage||'';}
function studentById(id){return (window.students||[]).find(item=>String(item?.id)===String(id))||null;}
function courseName(student){return typeof window.spec==='function'?(window.spec(student?.specialty)?.name||student?.specialty||'—'):(student?.specialty||'—');}
function centerName(student){return typeof window.branchName==='function'?window.branchName(student?.branch):(student?.branch||'—');}

function reorderInternalPane(pane){
  const search=document.getElementById('certStudentSearchV13')?.closest('label');
  const filters=document.getElementById('certInternalBranchV13')?.closest('.grid.two');
  if(!pane||!search||!filters)return;
  search.classList.add('efc-cert-student-search-v38');
  filters.classList.add('efc-cert-student-filters-v38');
  if(search.nextElementSibling!==filters)pane.insertBefore(search,filters);
}

function renderSelectedCard(root,student){
  if(!root||!student)return;
  const selected=root.querySelector('.cert-selected-v13');
  if(!selected)return;
  selected.classList.add('efc-cert-selected-card-v38');
  if(selected.dataset.efcEnhancedV38==='1')return;
  selected.dataset.efcEnhancedV38='1';
  const reg=String(student.reg??'').padStart(4,'0');
  selected.innerHTML=`
    <div class="efc-cert-selected-main-v38">
      <span class="efc-cert-selected-kicker-v38">الطالب المختار</span>
      <strong>${esc(student.name||'—')}</strong>
      <div class="efc-cert-selected-facts-v38">
        <span><small>الهاتف</small><b>${esc(student.phone||'—')}</b></span>
        <span><small>رقم السجل</small><b>${esc(reg)}</b></span>
        <span><small>الفرع</small><b>${esc(centerName(student))}</b></span>
        <span><small>الدورة</small><b>${esc(courseName(student))}</b></span>
      </div>
    </div>
    <button type="button" class="efc-cert-cancel-student-v38" aria-label="إلغاء اختيار الطالب">${X_ICON}<span>إلغاء الاختيار</span></button>`;
  const cancel=selected.querySelector('.efc-cert-cancel-student-v38');
  cancel?.addEventListener('click',event=>{
    event.preventDefault();
    event.stopPropagation();
    activeStudentId='';
    const branch=document.getElementById('certInternalBranchV13');
    if(branch){
      branch.dispatchEvent(new Event('change',{bubbles:true}));
    }else{
      const input=document.getElementById('certStudentSearchV13');
      if(input){input.value='';input.dispatchEvent(new Event('input',{bubbles:true}));}
    }
    scheduleEnhance();
  });
}

function syncSelectionState(){
  if(currentPage()!=='certificates')return;
  const pane=document.getElementById('certInternalPaneV13');
  const root=document.getElementById('certStudentResultsV13');
  const filters=document.querySelector('.efc-cert-student-filters-v38');
  if(!pane||!root||!filters)return;
  const selected=root.querySelector('.cert-selected-v13');
  const isSelected=Boolean(selected);
  pane.classList.toggle('efc-cert-has-selected-v38',isSelected);
  filters.hidden=isSelected;
  if(isSelected){
    const student=studentById(activeStudentId);
    if(student)renderSelectedCard(root,student);
  }else{
    activeStudentId='';
  }
}

function bindPicker(root){
  if(!root||root.dataset.efcPickerBoundV38==='1')return;
  root.dataset.efcPickerBoundV38='1';
  root.addEventListener('click',event=>{
    const option=event.target?.closest?.('[data-student]');
    if(!option)return;
    activeStudentId=String(option.dataset.student||'');
    setTimeout(()=>{reorderInternalPane(document.getElementById('certInternalPaneV13'));syncSelectionState();},0);
  },true);
  const observer=new MutationObserver(()=>scheduleEnhance());
  observer.observe(root,{childList:true,subtree:true});
}

function enhance(){
  scheduled=false;
  if(currentPage()!=='certificates')return;
  const pane=document.getElementById('certInternalPaneV13');
  const root=document.getElementById('certStudentResultsV13');
  if(!pane||!root)return;
  reorderInternalPane(pane);
  bindPicker(root);
  syncSelectionState();
  const search=document.getElementById('certStudentSearchV13');
  if(search&&search.dataset.efcPickerInputBoundV38!=='1'){
    search.dataset.efcPickerInputBoundV38='1';
    search.addEventListener('input',()=>setTimeout(syncSelectionState,0));
  }
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
style.id='efc-certificates-student-picker-style-v38';
style.textContent=`
/* Search always comes first in the internal-student workflow. */
html body.efc-certificates-workspace-v36 #certInternalPaneV13{display:flex!important;flex-direction:column!important;gap:12px!important}
html body.efc-certificates-workspace-v36 #certInternalPaneV13[hidden]{display:none!important}
html body.efc-certificates-workspace-v36 .efc-cert-student-search-v38{order:1!important;margin:0!important}
html body.efc-certificates-workspace-v36 .efc-cert-student-filters-v38{order:2!important;margin:0!important}
html body.efc-certificates-workspace-v36 #certStudentResultsV13{order:3!important;margin:0!important}
html body.efc-certificates-workspace-v36 .efc-cert-student-filters-v38[hidden]{display:none!important}
html body.efc-certificates-workspace-v36 .efc-cert-student-search-v38 input{height:50px!important;font-size:13px!important}

/* Selected student becomes a clear, larger summary instead of a thin result strip. */
html body.efc-certificates-workspace-v36 .efc-cert-selected-card-v38{
  position:relative!important;display:grid!important;grid-template-columns:minmax(0,1fr) auto!important;align-items:center!important;gap:18px!important;
  min-height:128px!important;padding:18px 20px!important;border:1.4px solid #4b9f87!important;border-radius:12px!important;
  background:linear-gradient(135deg,#e9f8f3,#dff2ec)!important;color:#122d26!important;box-sizing:border-box!important;
}
html body.efc-certificates-workspace-v36 .efc-cert-selected-main-v38{display:grid!important;gap:9px!important;min-width:0!important}
html body.efc-certificates-workspace-v36 .efc-cert-selected-kicker-v38{font-size:10px!important;font-weight:800!important;color:#5d756e!important;line-height:1!important}
html body.efc-certificates-workspace-v36 .efc-cert-selected-main-v38>strong{font-size:22px!important;font-weight:900!important;color:#073f35!important;line-height:1.15!important}
html body.efc-certificates-workspace-v36 .efc-cert-selected-facts-v38{display:grid!important;grid-template-columns:repeat(4,minmax(0,1fr))!important;gap:8px!important}
html body.efc-certificates-workspace-v36 .efc-cert-selected-facts-v38>span{
  min-height:50px!important;padding:7px 9px!important;border:1px solid #bdd8cf!important;border-radius:9px!important;background:rgba(255,255,255,.78)!important;
  display:flex!important;flex-direction:column!important;justify-content:center!important;gap:3px!important;min-width:0!important;
}
html body.efc-certificates-workspace-v36 .efc-cert-selected-facts-v38 small{font-size:9px!important;font-weight:750!important;color:#72877f!important;line-height:1!important}
html body.efc-certificates-workspace-v36 .efc-cert-selected-facts-v38 b{font-size:11.5px!important;font-weight:850!important;color:#172f29!important;line-height:1.25!important;white-space:nowrap!important;overflow:hidden!important;text-overflow:ellipsis!important}
html body.efc-certificates-workspace-v36 .efc-cert-cancel-student-v38{
  height:42px!important;min-width:126px!important;padding:0 13px!important;border:1px solid #a46262!important;border-radius:9px!important;background:#fff!important;color:#8b3030!important;
  display:inline-flex!important;align-items:center!important;justify-content:center!important;gap:7px!important;font-family:inherit!important;font-size:11.5px!important;font-weight:850!important;cursor:pointer!important;
}
html body.efc-certificates-workspace-v36 .efc-cert-cancel-student-v38:hover{background:#fff1f1!important;border-color:#8c3a3a!important}
html body.efc-certificates-workspace-v36 .efc-cert-cancel-student-v38 svg{width:17px!important;height:17px!important;flex:0 0 17px!important}

@media(max-width:1180px){
  html body.efc-certificates-workspace-v36 .efc-cert-selected-facts-v38{grid-template-columns:repeat(2,minmax(0,1fr))!important}
}
`;
document.head.appendChild(style);

window.EFC_CERTIFICATES_STUDENT_PICKER_V38=Object.freeze({
  ready:true,searchFirst:true,filtersHideAfterSelection:true,selectedStudentExpanded:true,
  cancelSelectionRestoresFilters:true,certificateSelectionLogicPreserved:true,mainUntouched:true
});
})();
