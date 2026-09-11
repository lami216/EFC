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
const baseReceiptWindow=window.receiptWindowV4;

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

function matrixRow(course){
  return`<tr class="schedule-matrix-row-v17" data-course-id="${esc(course.id)}"><th><span>${esc(course.name)}</span></th>${DAYS.map(day=>`<td><input type="time" class="schedule-matrix-time-v17" data-matrix-course="${esc(course.id)}" data-matrix-day="${day.key}" aria-label="${esc(course.name)} - ${day.ar}" autocomplete="off"></td>`).join('')}</tr>`;
}

function installMatrix(form,scheduleRoot){
  scheduleRoot.querySelector('.efc-schedule-course-mirror-v15')?.remove();
  const note=scheduleRoot.querySelector('.schedule-top-note-v13');if(note)note.textContent=NOTE;
  const tbody=scheduleRoot.querySelector('.schedule-table-v13 tbody');if(!tbody)return;
  tbody.innerHTML=specialties.map(matrixRow).join('');
  const specialtySelect=form.elements.specialty;
  const syncHighlight=()=>{
    const selected=String(specialtySelect?.value||'');
    scheduleRoot.querySelectorAll('.schedule-matrix-row-v17').forEach(row=>row.classList.toggle('is-registration-course-v17',String(row.dataset.courseId)===selected));
  };
  specialtySelect?.addEventListener('change',syncHighlight);
  syncHighlight();
}

function scheduleSnapshot(form,scheduleRoot){
  const selectedId=String(form.elements.specialty?.value||'');
  const courses=specialties.map(course=>{
    const days=DAYS.map(day=>{
      const input=scheduleRoot.querySelector(`[data-matrix-course="${CSS.escape(String(course.id))}"][data-matrix-day="${day.key}"]`);
      const time=String(input?.value||'');
      return{key:day.key,ar:day.ar,fr:day.fr,selected:Boolean(time),time};
    });
    return{specialtyId:String(course.id),specialtyName:String(course.name||''),days};
  }).filter(course=>course.days.some(day=>day.selected||day.time));
  const selectedCourse=courses.find(course=>course.specialtyId===selectedId);
  const selectedItem=specialties.find(course=>String(course.id)===selectedId);
  return{
    version:2,
    specialtyId:selectedId,
    specialtyName:String(selectedItem?.name||''),
    days:DAYS.map(day=>{
      const existing=selectedCourse?.days.find(value=>value.key===day.key);
      return existing?{...existing}:{key:day.key,ar:day.ar,fr:day.fr,selected:false,time:''};
    }),
    courses
  };
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
      created.schedule=snapshot;
      try{D.saveStudents();}catch(error){console.error('EFC v17 schedule save failed.',error);}
      scheduleRoot.querySelectorAll('.schedule-matrix-time-v17').forEach(input=>{input.value='';});
      const selected=String(form.elements.specialty?.value||'');
      scheduleRoot.querySelectorAll('.schedule-matrix-row-v17').forEach(row=>row.classList.toggle('is-registration-course-v17',String(row.dataset.courseId)===selected));
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
    syncMethodRequired();
    specialtySelect?.dispatchEvent(new Event('change',{bubbles:true}));
  }));
  syncMethodRequired();
  specialtySelect?.dispatchEvent(new Event('change',{bubbles:true}));
  attachSubmitCapture(form,scheduleRoot);
}

window.renderRegister=function(){
  baseRenderRegister();
  enhanceRegister();
};

function activeCourses(schedule){
  if(!schedule)return[];
  if(Array.isArray(schedule.courses))return schedule.courses.map(course=>({
    specialtyId:String(course?.specialtyId||''),
    specialtyName:String(course?.specialtyName||''),
    days:Array.isArray(course?.days)?course.days:[]
  })).filter(course=>course.days.some(day=>Boolean(day?.selected||day?.time)));
  if(Array.isArray(schedule.days)&&schedule.days.some(day=>Boolean(day?.selected||day?.time)))return[{
    specialtyId:String(schedule.specialtyId||''),
    specialtyName:String(schedule.specialtyName||''),
    days:schedule.days
  }];
  return[];
}

function receiptScheduleMarkup(courses){
  const rows=courses.map(course=>{
    const byKey=new Map((course.days||[]).map(day=>[String(day.key),day]));
    return`<tr><th class="courseCell12">${esc(course.specialtyName||'الدورة')}</th>${DAYS.map(day=>{const item=byKey.get(day.key)||{};return`<td>${item.selected||item.time?esc(item.time||'✓'):'<span class="scheduleEmpty12">—</span>'}</td>`;}).join('')}</tr>`;
  }).join('');
  return`<h3>جدول الطالب الأسبوعي</h3><p class="late12">${NOTE}</p><table class="scheduleTable12"><thead><tr><th class="courseCell12">الدورة</th>${DAYS.map(day=>`<th>${day.ar}<small>${day.fr}</small></th>`).join('')}</tr></thead><tbody>${rows}</tbody></table><div class="scheduleNotes12"><p>ملاحظة 1: لا يمكن استرجاع المبلغ المدفوع للمركز في أي حال من الأحوال.</p><p>ملاحظة 2: لا يمكن تسليم بطاقة تعريف الأصلية حتى تسديد المبلغ كلياً.</p></div>`;
}

function patchReceiptFrame(frame,model,courses,autoPrint){
  const apply=()=>{
    const doc=frame.contentDocument;if(!doc)return;
    const section=doc.querySelector('.studentSchedule12');
    if(section&&courses.length)section.innerHTML=receiptScheduleMarkup(courses);
    if(section&&!courses.length)section.remove();
    const late=doc.querySelector('.late12');if(late)late.textContent=NOTE;
    if(autoPrint)setTimeout(()=>frame.contentWindow?.print?.(),80);
  };
  frame.addEventListener('load',apply,{once:true});
  if(frame.contentDocument?.readyState==='complete')setTimeout(apply,0);
}

window.receiptWindowV4=function(model,autoPrint=false){
  const courses=model?.registrationReceipt?activeCourses(model?.schedule):[];
  const normalized=model?.registrationReceipt&&!courses.length?{...model,schedule:null}:model;
  const viewer=baseReceiptWindow(normalized,false);
  if(viewer?.frame&&model?.registrationReceipt)patchReceiptFrame(viewer.frame,model,courses,autoPrint);
  else if(autoPrint&&viewer?.frame)setTimeout(()=>viewer.frame.contentWindow?.print?.(),80);
  return viewer;
};

const style=document.createElement('style');
style.id='efc-registration-schedule-matrix-style-v17';
style.textContent=`
body.efc-registration-redesign-v15 #regFormV13 select.efc-select-placeholder-v17{color:#9aa8a3!important;font-weight:600!important}
body.efc-registration-redesign-v15 #regFormV13 select:not(.efc-select-placeholder-v17){color:#17352d!important}
body.efc-registration-redesign-v15 .schedule-title-v13{justify-content:flex-start!important}
body.efc-registration-redesign-v15 .schedule-title-v13 .efc-schedule-course-mirror-v15{display:none!important}
body.efc-registration-redesign-v15 .schedule-table-v13 tbody th{width:112px!important;min-width:112px!important;padding:6px 7px!important;background:#eef3ef!important;font-size:11px!important;line-height:1.3!important}
body.efc-registration-redesign-v15 .schedule-matrix-row-v17 td{height:47px!important;padding:4px!important;background:#fffdf3}
body.efc-registration-redesign-v15 .schedule-matrix-row-v17.is-registration-course-v17 th{background:#dff3ea!important;color:#075844!important;box-shadow:inset -4px 0 #19a47d}
body.efc-registration-redesign-v15 .schedule-matrix-time-v17{width:100%;min-width:0;height:34px;border:1px solid #c7d3cf;border-radius:7px;background:#fff;padding:2px 3px;font:700 11px "Segoe UI Variable","Segoe UI",Tahoma,sans-serif;text-align:center;color:#17352d}
body.efc-registration-redesign-v15 .schedule-matrix-time-v17:focus{outline:0;border-color:#118063;box-shadow:0 0 0 2px rgba(17,128,99,.10)}
body.efc-registration-redesign-v15 .schedule-table-v13 thead th:first-child{width:112px!important;min-width:112px!important}
@media(max-width:1180px){
  body.efc-registration-redesign-v15 .schedule-table-v13 tbody th,body.efc-registration-redesign-v15 .schedule-table-v13 thead th:first-child{width:98px!important;min-width:98px!important}
  body.efc-registration-redesign-v15 .schedule-matrix-time-v17{font-size:10px!important;padding:1px!important}
}
`;
document.head.appendChild(style);

window.EFC_REGISTRATION_SCHEDULE_MATRIX_V17=Object.freeze({
  ready:true,
  noPromptOptions:true,
  noDefaultSelections:true,
  visualPlaceholders:true,
  placeholdersHiddenFromOptionLists:true,
  paymentMethodStartsBlank:true,
  paymentMethodRequiredWhenPaid:true,
  registrationCourseIsSource:true,
  noIndependentScheduleCoursePicker:true,
  allCoursesVisible:true,
  receiptOnlyShowsScheduledCourses:true,
  emptyScheduleHiddenOnReceipt:true,
  lateNoteUpdated:true,
  mainUntouched:true
});
})();
