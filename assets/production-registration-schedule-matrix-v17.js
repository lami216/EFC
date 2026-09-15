(()=>{
'use strict';
if(window.EFC_REGISTRATION_SCHEDULE_MATRIX_V17?.ready)return;
if(!window.EFC_REGISTRATION_RESPONSIVE_V16?.ready||!window.EFC_MONTHLY_PREPAYMENT_UI_V14?.ready)throw new Error('Registration schedule matrix v17 loaded before redesign runtime.');

const D=window.EFC_DOMAIN_V13;
const {esc}=D;
const DAYS=[
  {key:'monday',ar:'الاثنين',fr:'Lundi'},
  {key:'tuesday',ar:'الثلاثاء',fr:'Mardi'},
  {key:'wednesday',ar:'الأربعاء',fr:'Mercredi'},
  {key:'thursday',ar:'الخميس',fr:'Jeudi'},
  {key:'friday',ar:'الجمعة',fr:'Vendredi'},
  {key:'saturday',ar:'السبت',fr:'Samedi'},
  {key:'sunday',ar:'الأحد',fr:'Dimanche'}
];
const NOTE='ملاحظة: لا يسمح بتأخر الطالب عن 20 دقيقة.';
const baseRenderRegister=window.renderRegister;

function installBlankSelection(select,label,{required=false}={}){
  if(!select)return;
  [...select.options].filter(option=>String(option.value||'')==='').forEach(option=>option.remove());
  const blank=new Option(label,'',true,true);
  blank.disabled=true;
  blank.hidden=true;
  blank.dataset.efcBlankChoice='1';
  select.insertBefore(blank,select.firstChild);
  [...select.options].forEach(option=>{
    const isBlank=option===blank;
    option.selected=isBlank;
    option.defaultSelected=isBlank;
  });
  select.selectedIndex=0;
  select.required=required;
  const sync=()=>select.classList.toggle('efc-select-placeholder-v17',!select.value);
  if(select.dataset.efcPlaceholderBound!=='1'){
    select.dataset.efcPlaceholderBound='1';
    select.addEventListener('change',sync);
  }
  sync();
}

function hourOptions(selected=''){
  const current=String(selected||'');
  return`<option value="">--</option>${Array.from({length:24},(_,hour)=>{
    const hh=String(hour).padStart(2,'0'),value=`${hh}:00`;
    return`<option value="${value}"${value===current?' selected':''}>${value}</option>`;
  }).join('')}`;
}

function timeRow(){
  return`<tr class="schedule-time-row-v17"><th>الوقت</th>${DAYS.map(day=>`<td><select class="schedule-day-time-v17" data-schedule-day-time="${day.key}" aria-label="ساعة ${day.ar}">${hourOptions()}</select></td>`).join('')}</tr>`;
}

function courseRow(course){
  if(!course)return`<tr class="schedule-matrix-row-v17 is-empty-course-v17" data-course-id=""><th><span>اختر الدورة</span></th>${DAYS.map(day=>`<td><label class="schedule-course-check-v17 is-disabled-v17" title="اختر الدورة أولاً"><input type="checkbox" data-matrix-course="" data-matrix-day="${day.key}" aria-label="${day.ar}" disabled><span></span></label></td>`).join('')}</tr>`;
  return`<tr class="schedule-matrix-row-v17 is-registration-course-v17" data-course-id="${esc(course.id)}"><th><span>${esc(course.name)}</span></th>${DAYS.map(day=>`<td><label class="schedule-course-check-v17" title="${esc(course.name)} - ${day.ar}"><input type="checkbox" data-matrix-course="${esc(course.id)}" data-matrix-day="${day.key}" aria-label="${esc(course.name)} - ${day.ar}"><span></span></label></td>`).join('')}</tr>`;
}

function bindMatrixBehavior(scheduleRoot){
  scheduleRoot.querySelectorAll('[data-schedule-day-time]').forEach(select=>{
    select.addEventListener('change',()=>{
      if(select.value)return;
      const day=String(select.dataset.scheduleDayTime||'');
      scheduleRoot.querySelectorAll(`[data-matrix-day="${CSS.escape(day)}"]`).forEach(check=>{check.checked=false;});
    });
  });
}

function renderSelectedCourseRow(form,scheduleRoot,{clearChecks=false}={}){
  const tbody=scheduleRoot.querySelector('.schedule-table-v13 tbody');if(!tbody)return;
  const selectedId=String(form.elements.specialty?.value||'');
  const selectedCourse=specialties.find(course=>String(course.id)===selectedId)||null;
  const previousRow=tbody.querySelector('.schedule-matrix-row-v17');
  const previousId=String(previousRow?.dataset.courseId||'');
  if(previousId===selectedId&&previousRow)return;
  previousRow?.remove();
  tbody.insertAdjacentHTML('beforeend',courseRow(selectedCourse));
  if(clearChecks)scheduleRoot.querySelectorAll('[data-matrix-course][data-matrix-day]').forEach(input=>{input.checked=false;});
}

function installMatrix(form,scheduleRoot){
  scheduleRoot.querySelector('.efc-schedule-course-mirror-v15')?.remove();
  const note=scheduleRoot.querySelector('.schedule-top-note-v13');if(note)note.textContent=NOTE;
  const notes=scheduleRoot.querySelector('.schedule-notes-v13');
  if(notes){
    const paragraphs=[...notes.querySelectorAll('p')];
    paragraphs.slice(1).forEach(paragraph=>paragraph.remove());
  }
  const tbody=scheduleRoot.querySelector('.schedule-table-v13 tbody');if(!tbody)return;
  tbody.innerHTML=timeRow()+courseRow(null);
  bindMatrixBehavior(scheduleRoot);
  const specialtySelect=form.elements.specialty;
  specialtySelect?.addEventListener('change',()=>renderSelectedCourseRow(form,scheduleRoot,{clearChecks:true}));
  renderSelectedCourseRow(form,scheduleRoot);
}

function scheduleSnapshot(form,scheduleRoot){
  const selectedId=String(form.elements.specialty?.value||'');
  const selectedItem=specialties.find(course=>String(course.id)===selectedId)||null;
  const dayTimes=Object.fromEntries(DAYS.map(day=>[day.key,String(scheduleRoot.querySelector(`[data-schedule-day-time="${day.key}"]`)?.value||'')]));
  const days=DAYS.map(day=>{
    const check=scheduleRoot.querySelector(`[data-matrix-course="${CSS.escape(selectedId)}"][data-matrix-day="${day.key}"]`);
    const selected=Boolean(check?.checked&&dayTimes[day.key]);
    return{key:day.key,ar:day.ar,fr:day.fr,selected,time:selected?dayTimes[day.key]:''};
  });
  const selectedCourse={specialtyId:selectedId,specialtyName:String(selectedItem?.name||''),days};
  return{
    version:3,
    specialtyId:selectedId,
    specialtyName:String(selectedItem?.name||''),
    dailyTimes:DAYS.map(day=>({key:day.key,ar:day.ar,fr:day.fr,time:dayTimes[day.key]})),
    days,
    courses:selectedId&&days.some(day=>day.selected)?[selectedCourse]:[]
  };
}

function resetMatrix(scheduleRoot){
  scheduleRoot.querySelectorAll('[data-schedule-day-time]').forEach(select=>{select.value='';});
  scheduleRoot.querySelectorAll('[data-matrix-course][data-matrix-day]').forEach(input=>{input.checked=false;});
}

function existingScheduleMatches(schedule,snapshot){
  return Boolean(
    schedule&&snapshot&&
    String(schedule.specialtyId||'')===String(snapshot.specialtyId||'')&&
    Array.isArray(schedule.days)&&schedule.days.length===DAYS.length
  );
}

function attachSubmitCapture(form,scheduleRoot){
  if(form.dataset.efcScheduleMatrixV17==='1')return;
  form.dataset.efcScheduleMatrixV17='1';
  form.addEventListener('submit',()=>{
    const before=new Set(students.map(student=>String(student.id)));
    const snapshot=scheduleSnapshot(form,scheduleRoot);
    queueMicrotask(()=>{
      const created=students.find(student=>!before.has(String(student.id)));
      if(!created)return;
      if(!existingScheduleMatches(created.schedule,snapshot)){
        created.schedule=snapshot;
        try{D.saveStudents();}catch(error){console.error('EFC v17 schedule save failed.',error);}
      }
      resetMatrix(scheduleRoot);
      renderSelectedCourseRow(form,scheduleRoot,{clearChecks:true});
    });
  },true);
}

function enhanceRegister(){
  const form=document.getElementById('regFormV13');
  const scheduleRoot=document.querySelector('.registration-schedule-card-v13');
  if(!form||!scheduleRoot)return;
  const branchSelect=form.elements.branch;
  const specialtySelect=form.elements.specialty;
  const methodSelect=form.elements.method;
  const paidInput=form.elements.paid;
  installBlankSelection(branchSelect,'اختر المركز',{required:true});
  installBlankSelection(specialtySelect,'اختر الدورة',{required:true});
  installBlankSelection(methodSelect,'اختر وسيلة الدفع');
  installMatrix(form,scheduleRoot);
  const syncMethodRequired=()=>{if(methodSelect)methodSelect.required=Number(paidInput?.value||0)>0;};
  paidInput?.addEventListener('input',syncMethodRequired);
  form.addEventListener('reset',()=>queueMicrotask(()=>{
    installBlankSelection(branchSelect,'اختر المركز',{required:true});
    installBlankSelection(specialtySelect,'اختر الدورة',{required:true});
    installBlankSelection(methodSelect,'اختر وسيلة الدفع');
    resetMatrix(scheduleRoot);
    renderSelectedCourseRow(form,scheduleRoot,{clearChecks:true});
    syncMethodRequired();
  }));
  syncMethodRequired();
  renderSelectedCourseRow(form,scheduleRoot);
  attachSubmitCapture(form,scheduleRoot);
}

window.renderRegister=function(){
  baseRenderRegister();
  enhanceRegister();
};

const style=document.createElement('style');
style.id='efc-registration-schedule-matrix-style-v17';
style.textContent=`
body.efc-registration-redesign-v15 #regFormV13 select.efc-select-placeholder-v17{color:#9aa8a3!important;font-weight:600!important}
body.efc-registration-redesign-v15 #regFormV13 select:not(.efc-select-placeholder-v17){color:#17352d!important}
body.efc-registration-redesign-v15 .schedule-title-v13{justify-content:flex-start!important}
body.efc-registration-redesign-v15 .schedule-title-v13 .efc-schedule-course-mirror-v15{display:none!important}
body.efc-registration-redesign-v15 .schedule-top-note-v13{font-size:16px!important;font-weight:850!important;line-height:1.55!important;min-height:54px!important;padding:12px 16px!important}
body.efc-registration-redesign-v15 .schedule-notes-v13{font-size:15px!important;font-weight:800!important;line-height:1.65!important;padding-top:11px!important;padding-bottom:11px!important}
body.efc-registration-redesign-v15 .schedule-notes-v13 p{margin:0!important}
body.efc-registration-redesign-v15 .schedule-table-v13 tbody th{width:112px!important;min-width:112px!important;padding:6px 7px!important;background:#eef3ef!important;font-size:11px!important;line-height:1.3!important}
body.efc-registration-redesign-v15 .schedule-time-row-v17 th{font-weight:800!important;background:#e7eee9!important}
body.efc-registration-redesign-v15 .schedule-time-row-v17 td{height:47px!important;padding:4px!important;background:#fffdf3}
body.efc-registration-redesign-v15 .schedule-day-time-v17{width:100%;min-width:0;height:34px;border:1px solid #c7d3cf;border-radius:7px;background:#fff;padding:2px 3px;font:700 11px "Segoe UI Variable","Segoe UI",Tahoma,sans-serif;text-align:center;color:#17352d;cursor:pointer}
body.efc-registration-redesign-v15 .schedule-day-time-v17:focus{outline:0;border-color:#118063;box-shadow:0 0 0 2px rgba(17,128,99,.10)}
body.efc-registration-redesign-v15 .schedule-matrix-row-v17 td{height:45px!important;padding:4px!important;background:#fffdf3}
body.efc-registration-redesign-v15 .schedule-matrix-row-v17 th{height:auto!important;min-height:45px!important;white-space:normal!important;overflow:visible!important;overflow-wrap:anywhere!important;word-break:break-word!important;vertical-align:middle!important}
body.efc-registration-redesign-v15 .schedule-matrix-row-v17 th span{display:block!important;width:100%!important;white-space:normal!important;overflow-wrap:anywhere!important;word-break:break-word!important;line-height:1.25!important;text-align:center!important}
body.efc-registration-redesign-v15 .schedule-matrix-row-v17.is-registration-course-v17 th{background:#dff3ea!important;color:#075844!important;box-shadow:inset -4px 0 #19a47d}
body.efc-registration-redesign-v15 .schedule-matrix-row-v17.is-empty-course-v17 th{color:#83928d!important;font-weight:700!important}
body.efc-registration-redesign-v15 .schedule-course-check-v17{display:inline-grid;place-items:center;cursor:pointer;margin:0!important}
body.efc-registration-redesign-v15 .schedule-course-check-v17.is-disabled-v17{cursor:not-allowed;opacity:.42}
body.efc-registration-redesign-v15 .schedule-course-check-v17 input{position:absolute;opacity:0;pointer-events:none}
body.efc-registration-redesign-v15 .schedule-course-check-v17 span{display:block;width:22px;height:22px;border:2px solid #50625b;border-radius:5px;background:#fff;box-shadow:inset 0 0 0 2px #fff;transition:.12s ease}
body.efc-registration-redesign-v15 .schedule-course-check-v17 input:checked+span{background:#111;border-color:#111;box-shadow:inset 0 0 0 3px #111}
body.efc-registration-redesign-v15 .schedule-course-check-v17 input:focus-visible+span{outline:2px solid #118063;outline-offset:2px}
body.efc-registration-redesign-v15 .schedule-table-v13 tbody th,
body.efc-registration-redesign-v15 .schedule-table-v13 tbody th span,
body.efc-registration-redesign-v15 .schedule-time-row-v17 th{color:#111!important;opacity:1!important;font-weight:800!important}
body.efc-registration-redesign-v15 .schedule-table-v13 thead th:first-child{width:112px!important;min-width:112px!important}
@media(max-width:1180px){
  body.efc-registration-redesign-v15 .schedule-table-v13 tbody th,body.efc-registration-redesign-v15 .schedule-table-v13 thead th:first-child{width:98px!important;min-width:98px!important}
  body.efc-registration-redesign-v15 .schedule-day-time-v17{font-size:10px!important;padding:1px!important}
  body.efc-registration-redesign-v15 .schedule-course-check-v17 span{width:20px;height:20px}
}
`;
document.head.appendChild(style);

window.EFC_REGISTRATION_SCHEDULE_MATRIX_V17=Object.freeze({
  ready:true,
  noPromptOptions:true,
  noDefaultSelections:true,
  visualPlaceholders:true,
  placeholdersHiddenFromOptionLists:true,
  checkboxCanBeSelectedBeforeTime:true,
  paymentMethodStartsBlank:true,
  paymentMethodRequiredWhenPaid:true,
  registrationCourseIsSource:true,
  noIndependentScheduleCoursePicker:true,
  sharedDayTimes:true,
  courseDayCheckboxes:true,
  checkedCourseSquaresAreBlack:true,
  selectedCourseOnly:true,
  longCourseNamesWrapInMatrix:true,
  hourOnlyTimes:true,
  fixedMinuteZero:true,
  directRegistrationSchedulePreferred:true,
  singleBottomNotice:true,
  largerScheduleNotices:true,
  lateNoteUpdated:true,
  receiptRenderingOwnedByBase:true,
  noReceiptWindowOverride:true,
  mainUntouched:true
});
})();
