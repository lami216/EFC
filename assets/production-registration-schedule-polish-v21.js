(async()=>{
'use strict';
if(window.EFC_REGISTRATION_SCHEDULE_POLISH_V21?.ready)return;
const waitUntil=async(check,timeout=15000)=>{const start=Date.now();while(!check()){if(Date.now()-start>timeout)throw new Error('Registration schedule polish v21 timed out.');await new Promise(resolve=>setTimeout(resolve,20));}};
await waitUntil(()=>window.EFC_REGISTRATION_SCHEDULE_MATRIX_V17?.ready&&window.EFC_REGISTRATION_SCHEDULE_COMPAT_V20?.ready&&typeof window.renderRegister==='function');

const baseRenderRegister=window.renderRegister;

function freeCurrentCheckboxes(root){
  root.querySelectorAll('.schedule-course-check-v17 input[data-matrix-course][data-matrix-day]').forEach(input=>{
    if(input.dataset.efcFreeOrderV21==='1')return;
    const clone=input.cloneNode(true);
    clone.checked=input.checked;
    clone.dataset.efcFreeOrderV21='1';
    input.replaceWith(clone);
  });
}

function freeCompatCheckboxes(root){
  root.querySelectorAll('.schedule-course-check-v20 input').forEach(input=>{
    if(input.dataset.efcFreeOrderV21==='1')return;
    const cell=input.closest('td');
    const hidden=cell?.querySelector('[data-matrix-course][data-matrix-day]');
    const day=String(hidden?.dataset.matrixDay||'');
    const clone=input.cloneNode(true);
    clone.checked=input.checked;
    clone.dataset.efcFreeOrderV21='1';
    clone.addEventListener('change',()=>{
      if(!hidden)return;
      const time=root.querySelector(`[data-shared-day="${CSS.escape(day)}"]`);
      hidden.value=clone.checked&&time?.value?String(time.value):'';
      hidden.dispatchEvent(new Event('change',{bubbles:true}));
    });
    input.replaceWith(clone);
  });
}

function enhance(){
  const root=document.querySelector('.registration-schedule-card-v13');
  if(!root)return;
  freeCurrentCheckboxes(root);
  freeCompatCheckboxes(root);
}

window.renderRegister=function(){baseRenderRegister();enhance();};
enhance();

const style=document.createElement('style');
style.id='efc-registration-schedule-polish-style-v21';
style.textContent=`
body.efc-registration-redesign-v15 .schedule-table-v13 tbody th,
body.efc-registration-redesign-v15 .schedule-table-v13 tbody th span,
body.efc-registration-redesign-v15 .schedule-time-row-v17 th,
body.efc-registration-redesign-v15 .schedule-time-row-v20 th{color:#111!important;opacity:1!important;font-weight:800!important}
body.efc-registration-redesign-v15 .schedule-day-time-v17,
body.efc-registration-redesign-v15 .schedule-day-time-v20{color:#111!important;opacity:1!important;font-weight:800!important;-webkit-text-fill-color:#111!important}
body.efc-registration-redesign-v15 .schedule-day-time-v17::-webkit-datetime-edit,
body.efc-registration-redesign-v15 .schedule-day-time-v17::-webkit-datetime-edit-fields-wrapper,
body.efc-registration-redesign-v15 .schedule-day-time-v17::-webkit-datetime-edit-hour-field,
body.efc-registration-redesign-v15 .schedule-day-time-v17::-webkit-datetime-edit-minute-field,
body.efc-registration-redesign-v15 .schedule-day-time-v20::-webkit-datetime-edit,
body.efc-registration-redesign-v15 .schedule-day-time-v20::-webkit-datetime-edit-fields-wrapper,
body.efc-registration-redesign-v15 .schedule-day-time-v20::-webkit-datetime-edit-hour-field,
body.efc-registration-redesign-v15 .schedule-day-time-v20::-webkit-datetime-edit-minute-field{color:#111!important;opacity:1!important;-webkit-text-fill-color:#111!important}
`;
document.head.appendChild(style);

window.EFC_REGISTRATION_SCHEDULE_POLISH_V21=Object.freeze({
  ready:true,
  darkCourseNames:true,
  darkDayTimes:true,
  checkboxCanBeSelectedBeforeTime:true,
  mainUntouched:true
});
})();
