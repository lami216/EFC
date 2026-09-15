(async()=>{
'use strict';
if(window.EFC_REGISTRATION_RECEIPT_SCHEDULE_V22?.ready)return;
const waitUntil=async(check,timeout=15000)=>{const start=Date.now();while(!check()){if(Date.now()-start>timeout)throw new Error('Registration receipt schedule v22 timed out.');await new Promise(resolve=>setTimeout(resolve,20));}};
await waitUntil(()=>window.EFC_REGISTRATION_SCHEDULE_MATRIX_V17?.ready&&window.EFC_REGISTRATION_SELECT_NATIVE_V19?.ready&&window.EFC_DOMAIN_V13?.ready&&typeof window.renderRegister==='function'&&typeof window.receiptWindowV4==='function');

const D=window.EFC_DOMAIN_V13;
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
const studentList=()=>typeof students!=='undefined'&&Array.isArray(students)?students:[];
const emptyDays=()=>DAYS.map(day=>({key:day.key,ar:day.ar,fr:day.fr,selected:false,time:''}));

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
  const selectedItem=(typeof specialties!=='undefined'&&Array.isArray(specialties))?specialties.find(item=>String(item?.id||'')===selectedId):null;
  const times=Object.fromEntries(DAYS.map(day=>[day.key,sharedTime(root,day.key)]));
  const courses=[...root.querySelectorAll('.schedule-matrix-row-v17')].map(row=>{
    const specialtyId=String(row.dataset.courseId||'');
    const specialtyName=String(row.querySelector('th')?.textContent||'').trim();
    const days=DAYS.map(day=>{
      const selected=checkedForDay(row,day.key);
      return{key:day.key,ar:day.ar,fr:day.fr,selected,time:selected?times[day.key]:''};
    });
    return{specialtyId,specialtyName,days};
  }).filter(course=>course.specialtyId&&course.specialtyId===selectedId&&course.days.some(day=>day.selected));
  const selectedCourse=courses[0]||null;
  const days=selectedCourse?.days||emptyDays();
  return{
    version:4,
    specialtyId:selectedId,
    specialtyName:String(selectedCourse?.specialtyName||selectedItem?.name||''),
    dailyTimes:DAYS.map(day=>({key:day.key,ar:day.ar,fr:day.fr,time:times[day.key]})),
    days,
    courses:selectedCourse?[selectedCourse]:[]
  };
}

function existingScheduleMatches(schedule,snapshot){
  return Boolean(
    schedule&&snapshot&&
    String(schedule.specialtyId||'')===String(snapshot.specialtyId||'')&&
    Array.isArray(schedule.days)&&schedule.days.length===DAYS.length
  );
}

function installSubmitCapture(){
  const form=document.getElementById('regFormV13');
  if(!form||form.dataset.efcReceiptScheduleV22==='1')return;
  form.dataset.efcReceiptScheduleV22='1';
  form.addEventListener('submit',()=>{
    const snapshot=captureSchedule();
    const before=new Set(studentList().map(student=>String(student.id)));
    queueMicrotask(()=>{
      const created=studentList().find(student=>!before.has(String(student.id)));
      if(!created||!snapshot||existingScheduleMatches(created.schedule,snapshot))return;
      created.schedule=snapshot;
      try{D.saveStudents();}catch(error){console.error('EFC v22 schedule save failed.',error);}
    });
  },true);
}

window.renderRegister=function(){baseRenderRegister();installSubmitCapture();};
installSubmitCapture();

window.EFC_REGISTRATION_RECEIPT_SCHEDULE_V22=Object.freeze({
  ready:true,
  registrationMatrixCapture:true,
  sharedDayTimeCapture:true,
  liveScheduleCapturedBeforeReceipt:true,
  savedScheduleMatchesBlackBoxes:true,
  directSavedSchedulePreferred:true,
  checkboxSelectionPersistsWithoutTime:true,
  hourOnlyTimeValues:true,
  receiptRenderingOwnedByBase:true,
  noReceiptWindowOverride:true,
  noReceiptDomPatch:true,
  noCrossRegistrationPendingState:true,
  mainUntouched:true
});
})();
