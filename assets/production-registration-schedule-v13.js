(()=>{
'use strict';
if(window.EFC_REGISTRATION_SCHEDULE_V13?.ready)return;
const D=window.EFC_DOMAIN_V13;
if(!D?.ready||!window.EFC_STUDENT_UI_V13?.ready)throw new Error('Registration schedule v13 loaded before domain/student UI.');

const {esc,today,nowTime,cash,courseTypeOf,appendPayment}=D;
const DAYS=[
  {key:'monday',ar:'الاثنين',fr:'Lundi'},
  {key:'tuesday',ar:'الثلاثاء',fr:'Mardi'},
  {key:'wednesday',ar:'الأربعاء',fr:'Mercredi'},
  {key:'thursday',ar:'الخميس',fr:'Jeudi'},
  {key:'friday',ar:'الجمعة',fr:'Vendredi'},
  {key:'saturday',ar:'السبت',fr:'Samedi'},
  {key:'sunday',ar:'الأحد',fr:'Dimanche'}
];
const noteTop='ملاحظة: لا يسمح تأخر طالب عن 20 دقيقة.';
const noteOne='ملاحظة 1: لا يمكن استرجاع المبلغ المدفوع للمركز في أي حال من الأحوال.';
const noteTwo='ملاحظة 2: لا يمكن تسليم بطاقة تعريف الأصلية حتى تسديد المبلغ كلياً.';
const paymentOptions=()=>methods.map(value=>`<option>${esc(value)}</option>`).join('');
const branchOptions=()=>`<option value="">اختر الفرع</option>${opts(branches)}`;
const specialtyOptions=()=>`<option value="">اختر الدورة</option>${opts(specialties)}`;

function courseTerms(value){
  return String(value??'')
    .replaceAll('كل التخصصات','كل الدورات')
    .replaceAll('التخصصات','الدورات')
    .replaceAll('تخصصات','دورات')
    .replaceAll('أضف تخصصًا','أضف دورة')
    .replaceAll('لا توجد تخصصات','لا توجد دورات')
    .replaceAll('إضافة تخصص','إضافة دورة')
    .replaceAll('تعديل تخصص','تعديل دورة')
    .replaceAll('اسم التخصص','اسم الدورة')
    .replaceAll('اختر التخصص','اختر الدورة')
    .replaceAll('حسب التخصص','حسب الدورة')
    .replaceAll('ربحية التخصصات','ربحية الدورات')
    .replaceAll('التخصص / الدورة','الدورة')
    .replaceAll('التخصص','الدورة');
}
if(!window.EFC_COURSE_TERMS_V13?.ready){
  const baseShell=window.shell;
  window.shell=content=>baseShell(courseTerms(content));
  const nav=window.navItems?.find?.(item=>item?.[0]==='specialties');if(nav)nav[2]='الدورات';
  window.EFC_COURSE_TERMS_V13=Object.freeze({ready:true,apply:courseTerms});
}
function openPicker(input){if(!input||input.disabled||input.readOnly)return;try{input.showPicker?.();}catch{}}
document.addEventListener('click',event=>{const input=event.target instanceof HTMLInputElement?event.target:null;if(input&&(input.type==='date'||input.type==='time'))openPicker(input);},true);

function emptySchedule(){return{version:1,specialtyId:'',specialtyName:'',days:DAYS.map(day=>({...day,selected:false,time:''}))};}
function readSchedule(root,item){return{version:1,specialtyId:String(item?.id||''),specialtyName:String(item?.name||''),days:DAYS.map(day=>({key:day.key,ar:day.ar,fr:day.fr,selected:Boolean(root.querySelector(`[data-day-check="${day.key}"]`)?.checked),time:String(root.querySelector(`[data-day-time="${day.key}"]`)?.value||'')}))};}
function scheduleMarkup(){return`<section class="registration-schedule-card-v13" aria-label="جدول الطالب"><div class="schedule-title-v13"><div><small>تنظيم الحصص</small><h2>جدول الطالب الأسبوعي</h2></div><span>الأيام والوقت</span></div><p class="schedule-top-note-v13">${esc(noteTop)}</p><div class="schedule-table-wrap-v13"><table class="schedule-table-v13"><thead><tr><th class="schedule-course-head-v13">الدورة</th>${DAYS.map(day=>`<th><b>${day.ar}</b><small>${day.fr}</small></th>`).join('')}</tr></thead><tbody><tr class="schedule-time-row-v13"><th>الوقت</th>${DAYS.map(day=>`<td><input type="time" data-day-time="${day.key}" aria-label="وقت ${day.ar}" autocomplete="off"></td>`).join('')}</tr><tr class="schedule-course-row-v13"><th id="scheduleCourseNameV13">اختر الدورة</th>${DAYS.map(day=>`<td><label class="schedule-check-v13" title="${day.ar}"><input type="checkbox" data-day-check="${day.key}" disabled><span></span></label></td>`).join('')}</tr></tbody></table></div><div class="schedule-notes-v13"><p>${esc(noteOne)}</p><p>${esc(noteTwo)}</p></div></section>`;}

window.renderRegister=function(){
  currentPage='register';
  if(!specialties.length){shell(`${pageTitle('الواجهة الرئيسية','تسجيل طالب جديد','أضف دورة واحدة على الأقل قبل تسجيل الطلاب.')}<div class="card production-empty-config"><h2>لا توجد دورات بعد</h2><button class="button" id="goSpecsV13">إضافة دورة</button></div>`);document.getElementById('goSpecsV13').onclick=()=>{location.hash='#specialties';};return;}
  shell(`${pageTitle('الواجهة الرئيسية','تسجيل طالب جديد','حدد بيانات الطالب وجدوله الأسبوعي ثم احفظ التسجيل.')}<div class="registration-schedule-layout-v13"><form id="regFormV13" class="card form-card registration-form-compact-v13" autocomplete="off"><div class="section-head"><h2>بيانات الطالب والتسجيل</h2><span>التسعير عند التسجيل</span></div><div class="registration-fields-v13"><label>اسم الطالب<input class="input" name="name" autocomplete="off" required></label><label>رقم الهاتف<input class="input" name="phone" autocomplete="off"></label><label>الفرع<select name="branch" required>${branchOptions()}</select></label><label>الدورة<select name="specialty" required>${specialtyOptions()}</select></label><label>تاريخ البداية<input class="input" name="start" type="date" value="${today()}" required></label><label id="priceLabelV13">السعر<input class="input" name="price" type="number" min="1" autocomplete="off" required></label><label>المبلغ المدفوع الآن<input class="input" name="paid" type="number" min="0" value="0" autocomplete="off" required></label><label>وسيلة الدفع<select name="method">${paymentOptions()}</select></label><label class="debt-date-v13 debt-slot-v13" id="regDebtWrapV13">موعد سداد المتبقي<input class="input" name="debtDate" type="date" autocomplete="off"></label></div><div class="summary-inline registration-inline-summary-v13" id="regSummaryV13"></div><button class="button registration-submit-v13" type="submit">حفظ التسجيل</button></form>${scheduleMarkup()}</div>`);

  const form=document.getElementById('regFormV13'),scheduleRoot=document.querySelector('.registration-schedule-card-v13'),spEl=form.elements.specialty,priceEl=form.elements.price,paidEl=form.elements.paid,debtWrap=document.getElementById('regDebtWrapV13'),label=document.getElementById('priceLabelV13'),courseName=document.getElementById('scheduleCourseNameV13');
  let paidTouched=false;
  function values(){const item=spec(spEl.value),type=courseTypeOf(item||{}),price=Math.max(0,Number(priceEl.value||0)),paid=Math.max(0,Number(paidEl.value||0));return{item,type,price,paid,remaining:Math.max(0,price-paid)};}
  function syncScheduleCourse(){const item=spec(spEl.value),enabled=Boolean(item);courseName.textContent=item?.name||'اختر الدورة';scheduleRoot.querySelectorAll('[data-day-check]').forEach(input=>{input.disabled=!enabled;if(!enabled)input.checked=false;});if(!enabled)scheduleRoot.querySelectorAll('[data-day-time]').forEach(input=>{input.value='';});}
  function setDebtVisibility(){const {price,paid}=values(),partial=paidTouched&&paid>0&&price>0&&paid<price,full=price>0&&paid>=price;debtWrap.classList.toggle('debt-slot-hidden',full);form.elements.debtDate.required=partial;}
  function updateSummary(){const {item,type,price,paid,remaining}=values();label.childNodes[0].textContent=type==='normal'?'سعر الشهر':'سعر الدورة كاملة';document.getElementById('regSummaryV13').innerHTML=item?`<div><span>نوع الدورة</span><b>${type==='normal'?'عادية شهرية':'سريعة'}</b></div><div><span>السعر</span><b>${cash(price)}</b></div><div><span>المدفوع</span><b>${cash(Math.min(paid,price||paid))}</b></div><div><span>المتبقي</span><b>${cash(remaining)}</b></div>`:'';}
  scheduleRoot.querySelectorAll('[data-day-time]').forEach(input=>input.addEventListener('change',()=>{const key=input.dataset.dayTime,check=scheduleRoot.querySelector(`[data-day-check="${key}"]`);if(input.value&&check&&!check.disabled)check.checked=true;}));
  spEl.onchange=()=>{syncScheduleCourse();updateSummary();setDebtVisibility();};priceEl.oninput=()=>{updateSummary();setDebtVisibility();};paidEl.oninput=()=>{paidTouched=true;updateSummary();setDebtVisibility();};paidEl.onblur=setDebtVisibility;
  syncScheduleCourse();updateSummary();setDebtVisibility();window.EFC_AUTOCOMPLETE_OFF_V13?.(form);

  form.onsubmit=event=>{
    event.preventDefault();setDebtVisibility();const data=new FormData(form),item=spec(data.get('specialty'));if(!item)return;
    const type=courseTypeOf(item),fee=Math.max(1,Number(data.get('price')||0)),paidNow=Math.max(0,Math.min(fee,Number(data.get('paid')||0))),debtDate=String(data.get('debtDate')||'');
    if(paidNow>0&&paidNow<fee&&!debtDate)return alert('حدد موعد سداد المتبقي.');
    const branch=String(data.get('branch')),related=students.filter(student=>student.branch===branch&&student.specialty===item.id),reg=Math.max(0,...related.map(student=>Number(student.reg||0)))+1,start=String(data.get('start')),monthly=type==='normal',days=Math.max(1,Number(item.quickDays||item.durationValue||1)),schedule=readSchedule(scheduleRoot,item);
    const student={id:D.uid('student'),name:String(data.get('name')||'').trim(),phone:String(data.get('phone')||''),branch,specialty:item.id,reg,start,end:monthly?'':addDuration(start,days,'day'),required:fee,paid:0,active:true,status:'active',debtDueDates:{},schedule,snapshot:{centerOpsV13:true,centerOpsMonthlyV13:monthly,dynamicMonthly:monthly,courseType:type,billing:monthly?'monthly':'one_time',fee,durationValue:monthly?1:days,durationUnit:monthly?'month':'day'},payments:[]};
    students.unshift(student);window.EFC_CODES?.ensureStudentRecord?.(student);let paymentIndex=null;
    try{if(paidNow>0)paymentIndex=appendPayment(student,{amount:paidNow,method:String(data.get('method')||''),date:start,time:nowTime(),description:monthly?'دفعة الشهر 1':'دفعة تسجيل',targetMonth:monthly?1:null,debtDueDate:paidNow<fee?debtDate:null,persist:false});D.saveStudents();}
    catch(error){students=students.filter(value=>value!==student);return alert(String(error?.message||error));}
    form.reset();form.elements.start.value=today();form.elements.paid.value=0;paidTouched=false;scheduleRoot.querySelectorAll('[data-day-check]').forEach(input=>input.checked=false);scheduleRoot.querySelectorAll('[data-day-time]').forEach(input=>input.value='');syncScheduleCourse();updateSummary();setDebtVisibility();setTimeout(()=>window.EFC_SHOW_RECEIPT_V13?.(student,paymentIndex,'reg'),30);
  };
};

const style=document.createElement('style');style.textContent=`
.registration-schedule-layout-v13{display:grid;grid-template-columns:minmax(0,500px) minmax(0,500px);gap:14px;align-items:start;justify-content:start;direction:rtl;max-width:1014px}.registration-form-compact-v13{width:100%;max-width:500px;padding:18px;border-radius:16px}.registration-fields-v13{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px 10px}.registration-fields-v13 label{margin:0;min-width:0}.registration-fields-v13 .input,.registration-fields-v13 select{width:100%;min-width:0;height:36px}.registration-inline-summary-v13{margin-top:10px;grid-template-columns:repeat(4,minmax(0,1fr));padding:9px;gap:6px}.registration-submit-v13{width:100%;margin-top:10px}.registration-schedule-card-v13{background:#fff1a8;border:1.5px solid #18201d;border-radius:16px;padding:10px 11px;box-shadow:0 8px 24px #18231f12;min-width:0;max-width:500px;width:100%}.schedule-title-v13{display:flex;justify-content:space-between;align-items:end;gap:10px;margin-bottom:5px}.schedule-title-v13 h2{margin:2px 0 0;font-size:14px;line-height:1.25}.schedule-title-v13 h2:before{content:'▦';color:var(--primary);font-size:16px;margin-inline-end:6px}.schedule-title-v13 small,.schedule-title-v13 span{font-size:7px;color:#4d5a55}.schedule-top-note-v13{margin:0 0 7px;text-align:center;font-size:8px;font-weight:800}.schedule-table-wrap-v13{overflow:hidden;border:1px solid #18201d;border-radius:8px;background:#fff0a0}.schedule-table-v13{width:100%;min-width:0;border-collapse:collapse;table-layout:fixed;direction:rtl}.schedule-table-v13 th,.schedule-table-v13 td{border:1px solid #18201d;text-align:center;padding:3px 2px;height:34px}.schedule-table-v13 thead th{background:#f7e58a}.schedule-table-v13 thead th b,.schedule-table-v13 thead th small{display:block;white-space:nowrap}.schedule-table-v13 thead th b{font-size:8px}.schedule-table-v13 thead th small{font-size:7px;margin-top:1px}.schedule-course-head-v13,.schedule-table-v13 tbody th{width:70px;min-width:70px}.schedule-time-row-v13 th{font-size:8px;background:#fbefaa}.schedule-time-row-v13 input[type=time]{width:100%;min-width:0;height:28px;border:1px solid #7c817f;border-radius:5px;background:#fff;padding:1px;font:700 8px Tahoma;text-align:center;direction:ltr;cursor:pointer}.schedule-course-row-v13 th{font-size:8px;background:#f7e58a;white-space:normal;line-height:1.25}.schedule-check-v13{display:inline-grid;place-items:center;cursor:pointer}.schedule-check-v13 input{position:absolute;opacity:0;pointer-events:none}.schedule-check-v13 span{width:20px;height:20px;border:2px solid #18201d;border-radius:4px;background:#fff;display:block}.schedule-check-v13 input:checked+span{background:#111}.schedule-check-v13 input:disabled+span{opacity:.38;cursor:not-allowed}.schedule-notes-v13{border-top:1px solid #18201d;margin-top:8px;padding-top:6px;font-size:7px;line-height:1.7}.schedule-notes-v13 p{margin:1px 0}.debt-slot-v13{min-height:57px}.debt-slot-v13.debt-slot-hidden{visibility:hidden;pointer-events:none}input[type=date],input[type=time]{cursor:pointer}input[type=date]::-webkit-calendar-picker-indicator,input[type=time]::-webkit-calendar-picker-indicator{opacity:0;width:0;height:0;margin:0;padding:0;pointer-events:none}@media(max-width:1120px){.registration-schedule-layout-v13{grid-template-columns:minmax(0,470px) minmax(0,1fr);max-width:none}.registration-schedule-card-v13{max-width:none}}@media(max-width:900px){.registration-schedule-layout-v13{grid-template-columns:1fr}.registration-form-compact-v13{max-width:none}.registration-schedule-card-v13{order:2;max-width:none}.registration-fields-v13{grid-template-columns:repeat(2,minmax(0,1fr))}}
`;document.head.appendChild(style);
window.EFC_REGISTRATION_SCHEDULE_V13=Object.freeze({ready:true,authoritativeRegistrationRenderer:true,scheduleStoredWithStudent:true,receiptScheduleData:true,compactRegistrationCard:true,twoColumnRegistration:true,compactTimetable:true,noHorizontalTimetableOverflow:true,wholeInputDateTimePicker:true,courseTerminology:true,noSideSummary:true,notesFromPaper:true});
})();