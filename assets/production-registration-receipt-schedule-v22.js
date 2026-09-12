(async()=>{
'use strict';
if(window.EFC_REGISTRATION_RECEIPT_SCHEDULE_V22?.ready)return;
const waitUntil=async(check,timeout=15000)=>{const start=Date.now();while(!check()){if(Date.now()-start>timeout)throw new Error('Registration receipt schedule v22 timed out.');await new Promise(resolve=>setTimeout(resolve,20));}};
await waitUntil(()=>window.EFC_REGISTRATION_SCHEDULE_MATRIX_V17?.ready&&window.EFC_REGISTRATION_SELECT_NATIVE_V19?.ready&&window.EFC_DOMAIN_V13?.ready&&typeof window.renderRegister==='function'&&typeof window.receiptWindowV4==='function');

const D=window.EFC_DOMAIN_V13;
const esc=D.esc;
const DAYS=[
  {key:'monday',ar:'الاثنين',fr:'Lundi'},
  {key:'tuesday',ar:'الثلاثاء',fr:'Mardi'},
  {key:'wednesday',ar:'الأربعاء',fr:'Mercredi'},
  {key:'thursday',ar:'الخميس',fr:'Jeudi'},
  {key:'friday',ar:'الجمعة',fr:'Vendredi'},
  {key:'saturday',ar:'السبت',fr:'Samedi'},
  {key:'sunday',ar:'الأحد',fr:'Dimanche'}
];
const baseRenderRegister=window.renderRegister;
const baseReceiptWindow=window.receiptWindowV4;
let pendingSchedule=null;
const studentList=()=>typeof students!=='undefined'&&Array.isArray(students)?students:[];

function sharedTime(root,day){
  return String(
    root.querySelector(`[data-schedule-day-time="${CSS.escape(day)}"]`)?.value||
    root.querySelector(`[data-shared-day="${CSS.escape(day)}"]`)?.value||
    root.querySelector(`[data-day-time="${CSS.escape(day)}"]`)?.value||''
  );
}

function checkedForDay(row,day){
  const matrix=row.querySelector(`[data-matrix-day="${CSS.escape(day)}"]`);
  if(matrix?.type==='checkbox')return Boolean(matrix.checked);
  if(matrix){
    const visual=matrix.closest('td')?.querySelector('.schedule-course-check-v20 input[type="checkbox"]');
    if(visual)return Boolean(visual.checked);
  }
  return false;
}

function captureSchedule(){
  const root=document.querySelector('.registration-schedule-card-v13');
  const form=document.getElementById('regFormV13');
  if(!root)return null;
  const selectedId=String(form?.elements?.specialty?.value||'');
  const times=Object.fromEntries(DAYS.map(day=>[day.key,sharedTime(root,day.key)]));
  const courses=[...root.querySelectorAll('.schedule-matrix-row-v17')].map(row=>{
    const specialtyId=String(row.dataset.courseId||'');
    const specialtyName=String(row.querySelector('th')?.textContent||'').trim();
    const days=DAYS.map(day=>{
      const selected=checkedForDay(row,day.key);
      return{key:day.key,ar:day.ar,fr:day.fr,selected,time:selected?times[day.key]:''};
    });
    return{specialtyId,specialtyName,days};
  }).filter(course=>course.days.some(day=>day.selected));
  if(!courses.length)return{version:4,specialtyId:selectedId,specialtyName:'',dailyTimes:DAYS.map(day=>({key:day.key,ar:day.ar,fr:day.fr,time:times[day.key]})),days:[],courses:[]};
  const selectedCourse=courses.find(course=>course.specialtyId===selectedId)||courses[0];
  return{
    version:4,
    specialtyId:selectedId,
    specialtyName:String(selectedCourse?.specialtyName||''),
    dailyTimes:DAYS.map(day=>({key:day.key,ar:day.ar,fr:day.fr,time:times[day.key]})),
    days:Array.isArray(selectedCourse?.days)?selectedCourse.days:[],
    courses
  };
}

function installSubmitCapture(){
  const form=document.getElementById('regFormV13');
  if(!form||form.dataset.efcReceiptScheduleV22==='1')return;
  form.dataset.efcReceiptScheduleV22='1';
  form.addEventListener('submit',()=>{
    const snapshot=captureSchedule();
    pendingSchedule=snapshot;
    const before=new Set(studentList().map(student=>String(student.id)));
    queueMicrotask(()=>{
      const created=studentList().find(student=>!before.has(String(student.id)));
      if(!created||!snapshot)return;
      created.schedule=snapshot;
      try{D.saveStudents();}catch(error){console.error('EFC v22 schedule save failed.',error);}
    });
  },true);
}

function selectedCourses(schedule){
  const courses=Array.isArray(schedule?.courses)?schedule.courses:[];
  return courses.map(course=>({
    specialtyId:String(course?.specialtyId||''),
    specialtyName:String(course?.specialtyName||'الدورة'),
    days:Array.isArray(course?.days)?course.days:[]
  })).filter(course=>course.days.some(day=>Boolean(day?.selected)));
}

function usedTimes(courses){
  const result={};
  DAYS.forEach(day=>{
    const selectedDay=courses.map(course=>course.days.find(item=>String(item?.key||'')===day.key)).find(item=>Boolean(item?.selected));
    result[day.key]=String(selectedDay?.time||'');
  });
  return result;
}

function gridMarkup(courses){
  const times=usedTimes(courses);
  const header=DAYS.map(day=>`<th><b>${day.ar}</b><small>${day.fr}</small></th>`).join('');
  const timeCells=DAYS.map(day=>`<td>${times[day.key]?`<b>${esc(times[day.key])}</b>`:'<span class="efcScheduleDash22">—</span>'}</td>`).join('');
  const rows=courses.map(course=>{
    const byKey=new Map(course.days.map(day=>[String(day?.key||''),day]));
    const cells=DAYS.map(day=>{
      const item=byKey.get(day.key)||{};
      return`<td>${item.selected?'<span class="efcScheduleBox22 is-checked"></span>':'<span class="efcScheduleBox22"></span>'}</td>`;
    }).join('');
    return`<tr class="efcScheduleCourseRow22"><th>${esc(course.specialtyName||'الدورة')}</th>${cells}</tr>`;
  }).join('');
  return`<h3 class="efcScheduleTitle22">جدول الطالب الأسبوعي</h3><table class="efcScheduleGrid22"><thead><tr><th>الدورة</th>${header}</tr></thead><tbody><tr class="efcScheduleTimeRow22"><th>الوقت</th>${timeCells}</tr>${rows}</tbody></table>`;
}

function installReceiptStyle(doc){
  if(!doc||doc.getElementById('efc-registration-receipt-schedule-style-v22'))return;
  const style=doc.createElement('style');
  style.id='efc-registration-receipt-schedule-style-v22';
  style.textContent=`
    .efcScheduleTitle22{margin:8px 0 5px!important;text-align:center!important;font-size:12px!important;font-weight:900!important;color:#111!important}
    .efcScheduleGrid22{width:100%!important;border-collapse:collapse!important;table-layout:fixed!important;direction:rtl!important;background:#fff7bf!important;border:1.4px solid #17352d!important;font-family:Arial,Tahoma,sans-serif!important}
    .efcScheduleGrid22 th,.efcScheduleGrid22 td{border:1px solid #17352d!important;text-align:center!important;padding:3px 2px!important;height:26px!important;color:#111!important;font-size:8px!important;vertical-align:middle!important}
    .efcScheduleGrid22 thead th{background:#006a58!important;color:#fff!important;font-weight:900!important}
    .efcScheduleGrid22 thead th b,.efcScheduleGrid22 thead th small{display:block!important;color:#fff!important;line-height:1.15!important;white-space:nowrap!important}
    .efcScheduleGrid22 thead th b{font-size:8px!important}.efcScheduleGrid22 thead th small{font-size:6px!important;margin-top:1px!important}
    .efcScheduleGrid22 thead th:first-child,.efcScheduleGrid22 tbody th{width:76px!important;min-width:76px!important}
    .efcScheduleGrid22 tbody th{background:#eef2ef!important;color:#111!important;font-weight:900!important}
    .efcScheduleTimeRow22 td{background:#fffdf0!important;font-weight:900!important;color:#111!important}
    .efcScheduleCourseRow22 td{background:#fffdf0!important}
    .efcScheduleBox22{display:inline-block!important;width:14px!important;height:14px!important;border:1.7px solid #394a44!important;border-radius:3px!important;background:#fff!important;vertical-align:middle!important}
    .efcScheduleBox22.is-checked{background:#111!important;border-color:#111!important}
    .efcScheduleDash22{color:#8b9692!important;font-weight:600!important}
  `;
  doc.head?.appendChild(style);
}

function patchReceipt(frame,courses,autoPrint){
  const apply=()=>{
    const doc=frame?.contentDocument;if(!doc)return;
    installReceiptStyle(doc);
    let section=doc.querySelector('.studentSchedule12');
    if(courses.length){
      if(!section){
        section=doc.createElement('section');
        section.className='studentSchedule12';
        const anchor=doc.querySelector('.receiptNotes12,.notes12,footer');
        if(anchor?.parentNode)anchor.parentNode.insertBefore(section,anchor);else doc.body.appendChild(section);
      }
      section.innerHTML=gridMarkup(courses);
    }else if(section){section.remove();}
    if(autoPrint)setTimeout(()=>frame.contentWindow?.print?.(),100);
  };
  frame?.addEventListener('load',()=>setTimeout(apply,0),{once:true});
  if(frame?.contentDocument?.readyState==='complete')setTimeout(apply,0);
}

window.receiptWindowV4=function(model,autoPrint=false){
  let normalized=model;
  let schedule=model?.schedule||null;
  if(model?.registrationReceipt&&pendingSchedule){schedule=pendingSchedule;normalized={...model,schedule};}
  const courses=model?.registrationReceipt?selectedCourses(schedule):[];
  const viewer=baseReceiptWindow(normalized,false);
  if(model?.registrationReceipt&&viewer?.frame){patchReceipt(viewer.frame,courses,autoPrint);pendingSchedule=null;}
  else if(autoPrint&&viewer?.frame)setTimeout(()=>viewer.frame.contentWindow?.print?.(),100);
  return viewer;
};

window.renderRegister=function(){baseRenderRegister();installSubmitCapture();};
installSubmitCapture();

window.EFC_REGISTRATION_RECEIPT_SCHEDULE_V22=Object.freeze({
  ready:true,
  selectedCourseRowsOnly:true,
  registrationMatrixLayout:true,
  sharedDayTimeRow:true,
  selectedCellsRenderedBlack:true,
  liveScheduleCapturedBeforeReceipt:true,
  savedScheduleMatchesBlackBoxes:true,
  checkboxSelectionPersistsWithoutTime:true,
  mainUntouched:true
});
})();
