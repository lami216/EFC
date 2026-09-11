(async()=>{
'use strict';
if(window.EFC_REGISTRATION_RECEIPT_SCHEDULE_V22?.ready)return;
const waitUntil=async(check,timeout=15000)=>{const start=Date.now();while(!check()){if(Date.now()-start>timeout)throw new Error('Registration receipt schedule v22 timed out.');await new Promise(resolve=>setTimeout(resolve,20));}};
await waitUntil(()=>window.EFC_REGISTRATION_SCHEDULE_POLISH_V21?.ready&&window.EFC_DOMAIN_V13?.ready&&typeof window.renderRegister==='function'&&typeof window.receiptWindowV4==='function');

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

function selectedEntries(schedule){
  const courses=Array.isArray(schedule?.courses)?schedule.courses:[];
  const entries=[];
  courses.forEach(course=>{
    (Array.isArray(course?.days)?course.days:[]).forEach(day=>{
      if(!day?.selected)return;
      entries.push({course:String(course.specialtyName||'الدورة'),day:String(day.ar||''),time:String(day.time||'')});
    });
  });
  return entries;
}

function compactMarkup(entries){
  const rows=entries.map(item=>`<tr><td><b>${esc(item.course)}</b></td><td>${esc(item.day)}</td><td><b>${esc(item.time||'—')}</b></td></tr>`).join('');
  return`<h3>جدول الطالب الأسبوعي</h3><table class="scheduleTable12 efcScheduleCompact22"><thead><tr><th>الدورة</th><th>اليوم</th><th>الوقت</th></tr></thead><tbody>${rows}</tbody></table>`;
}

function patchReceipt(frame,entries,autoPrint){
  const apply=()=>{
    const doc=frame?.contentDocument;if(!doc)return;
    let section=doc.querySelector('.studentSchedule12');
    if(entries.length){
      if(!section){
        section=doc.createElement('section');
        section.className='studentSchedule12';
        const anchor=doc.querySelector('.receiptNotes12,.notes12,footer');
        if(anchor?.parentNode)anchor.parentNode.insertBefore(section,anchor);else doc.body.appendChild(section);
      }
      section.innerHTML=compactMarkup(entries);
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
  const entries=model?.registrationReceipt?selectedEntries(schedule):[];
  const viewer=baseReceiptWindow(normalized,false);
  if(model?.registrationReceipt&&viewer?.frame){patchReceipt(viewer.frame,entries,autoPrint);pendingSchedule=null;}
  else if(autoPrint&&viewer?.frame)setTimeout(()=>viewer.frame.contentWindow?.print?.(),100);
  return viewer;
};

window.renderRegister=function(){baseRenderRegister();installSubmitCapture();};
installSubmitCapture();

window.EFC_REGISTRATION_RECEIPT_SCHEDULE_V22=Object.freeze({
  ready:true,
  selectedCourseDaysOnly:true,
  compactReceiptSchedule:true,
  liveScheduleCapturedBeforeReceipt:true,
  savedScheduleMatchesBlackBoxes:true,
  checkboxSelectionPersistsWithoutTime:true,
  mainUntouched:true
});
})();
