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
let editSession=null;
let navigationBypass=false;

function clone(value){try{return structuredClone(value);}catch{return JSON.parse(JSON.stringify(value));}}
function currentEditSession(){
  if(!editSession)return null;
  const student=students.find(value=>String(value.id)===String(editSession.studentId));
  if(!student){clearEditSession();return null;}
  return{...editSession,student};
}
function clearEditSession(){
  editSession=null;
  document.body.classList.remove('efc-registration-editing-v17');
}
function receiptModelForSession(session){
  const student=students.find(value=>String(value.id)===String(session?.studentId));if(!student)return null;
  if(session.statement)return typeof receiptModelV4==='function'?receiptModelV4(student,null,true):null;
  return typeof receiptModelV4==='function'?receiptModelV4(student,session.paymentIndex,false):null;
}
function restoreNormalRegistration(){
  clearEditSession();
  if(location.hash!=='#register')history.replaceState(null,'','#register');
  window.renderCurrentV13?.();
}
function returnFromEdit({reopenReceipt=false}={}){
  const session=editSession;if(!session)return;
  clearEditSession();
  const target=session.returnHash&&session.returnHash!=='#register'?session.returnHash:'#register';
  if(location.hash!==target)history.replaceState(null,'',target);
  window.renderCurrentV13?.();
  if(reopenReceipt)setTimeout(()=>{const model=receiptModelForSession(session);if(model)window.receiptWindowV4?.(model);},40);
}
function confirmDiscardEdit(){
  if(!editSession)return true;
  return window.confirm('لديك تعديلات غير محفوظة. مغادرة صفحة التعديل ستلغي التغييرات الحالية فقط. هل تريد المتابعة؟');
}
function beginRegistrationEdit(model){
  const studentId=String(model?.studentId||'');const student=students.find(value=>String(value.id)===studentId);
  if(!student){alert('تعذر العثور على ملف الطالب المرتبط بهذا الروسي.');return false;}
  if(!(window.EFC_AUTH_V13?.canEdit?.('students')??true)){alert('لا تملك صلاحية تعديل ملف الطالب.');return false;}
  const rawIndex=model?.paymentIndex,index=rawIndex===null||rawIndex===undefined||rawIndex===''?null:Number(rawIndex);
  if(index!==null&&(!Number.isInteger(index)||index<0||!student.payments?.[index])){alert('تعذر العثور على الدفعة المرتبطة بهذا الروسي.');return false;}
  const returnHash=location.hash||'#students';
  editSession={studentId,paymentIndex:index,statement:Boolean(model?.statement),returnHash,receipt:String(model?.receipt||''),startedAt:Date.now()};
  document.querySelectorAll('.modal').forEach(modal=>modal.remove());
  document.body.classList.add('efc-registration-editing-v17');
  if(location.hash!=='#register')history.replaceState(null,'','#register');
  window.renderCurrentV13?.();
  return true;
}
window.EFC_BEGIN_REGISTRATION_EDIT_V17=beginRegistrationEdit;
window.EFC_REGISTRATION_EDIT_V17=Object.freeze({begin:beginRegistrationEdit,current:currentEditSession,cancel:restoreNormalRegistration,active:()=>Boolean(currentEditSession())});

document.addEventListener('click',event=>{
  if(!editSession)return;
  const target=event.target instanceof Element?event.target.closest('a[href^="#"]'):null;
  if(!target)return;
  const nextHash=String(target.getAttribute('href')||'');
  if(!nextHash||nextHash==='#register')return;
  event.preventDefault();event.stopPropagation();
  if(!confirmDiscardEdit())return;
  clearEditSession();navigationBypass=true;location.hash=nextHash;
},true);
window.addEventListener('hashchange',()=>{
  if(navigationBypass){navigationBypass=false;return;}
  if(!editSession||location.hash==='#register')return;
  if(confirmDiscardEdit()){
    clearEditSession();
    window.renderCurrentV13?.();
    return;
  }
  history.replaceState(null,'','#register');
  window.renderCurrentV13?.();
});

function installBlankSelection(select,label,{required=false,preserveValue=false}={}){
  if(!select)return;
  const previous=preserveValue?String(select.value||''):'';
  [...select.options].filter(option=>String(option.value||'')==='').forEach(option=>option.remove());
  const blank=new Option(label,'',!previous,!previous);
  blank.disabled=true;
  blank.hidden=true;
  blank.dataset.efcBlankChoice='1';
  select.insertBefore(blank,select.firstChild);
  if(previous&&[...select.options].some(option=>String(option.value)===previous))select.value=previous;else{select.value='';select.selectedIndex=0;}
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
function fillMatrix(scheduleRoot,form,schedule){
  const source=Array.isArray(schedule?.days)?schedule.days:[];const byKey=new Map(source.map(day=>[String(day?.key||''),day]));
  renderSelectedCourseRow(form,scheduleRoot);
  DAYS.forEach(day=>{
    const item=byKey.get(day.key)||{};const select=scheduleRoot.querySelector(`[data-schedule-day-time="${day.key}"]`);if(select)select.value=String(item.time||'');
    const check=scheduleRoot.querySelector(`[data-matrix-course="${CSS.escape(String(form.elements.specialty?.value||''))}"][data-matrix-day="${day.key}"]`);if(check)check.checked=Boolean(item.selected&&item.time);
  });
}

function existingScheduleMatches(schedule,snapshot){
  return Boolean(
    schedule&&snapshot&&
    String(schedule.specialtyId||'')===String(snapshot.specialtyId||'')&&
    Array.isArray(schedule.days)&&schedule.days.length===DAYS.length
  );
}

function attachSubmitCapture(form,scheduleRoot){
  if(form.dataset.efcScheduleMatrixV17==='1'||currentEditSession())return;
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

function mountEditActions(form,submit){
  let actions=form.querySelector('.registration-edit-actions-v17');
  if(!actions){
    actions=document.createElement('div');actions.className='registration-edit-actions-v17';
    submit.parentNode.insertBefore(actions,submit);actions.appendChild(submit);
    const cancel=document.createElement('button');cancel.className='button secondary registration-cancel-edit-v17';cancel.type='button';cancel.textContent='إلغاء التعديل';actions.appendChild(cancel);
  }
  actions.querySelector('.registration-cancel-edit-v17').onclick=restoreNormalRegistration;
}

function installEditMode(form,scheduleRoot){
  const session=currentEditSession();if(!session)return false;
  const student=session.student,payment=session.paymentIndex===null?null:student.payments?.[session.paymentIndex]||null,fields=form.querySelector('.registration-fields-v13');
  document.body.classList.add('efc-registration-editing-v17');
  const heroTitle=document.querySelector('.efc-reg-hero-v15 h1');if(heroTitle)heroTitle.textContent='تعديل تسجيل الطالب';
  const sectionTitle=form.querySelector('.section-head h2');if(sectionTitle)sectionTitle.textContent='بيانات الطالب والتسجيل';
  form.classList.add('registration-edit-mode-v17');
  form.elements.name.value=String(student.name||'');form.elements.phone.value=String(student.phone||'');form.elements.branch.value=String(student.branch||'');form.elements.specialty.value=String(student.specialty||'');form.elements.start.value=String(student.start||'');form.elements.price.value=String(student.snapshot?.fee||student.required||'');
  form.elements.paid.value=payment?String(payment[1]||0):String(D.paymentTotal?.(student)||0);form.elements.method.value=payment?String(payment[2]||''):'';
  const targetKey=payment?.[7]?String(payment[7]):'course';form.elements.debtDate.value=String(payment?.[9]||student.debtDueDates?.[targetKey]||'');
  if(fields&&!fields.querySelector('[data-edit-extra-v17]')){
    fields.insertAdjacentHTML('beforeend',`<label data-edit-extra-v17>رقم السجل<input class="input" value="${esc(String(student.reg??'').padStart(4,'0'))}" readonly></label><label data-edit-extra-v17>تاريخ هذه الدفعة<input class="input" name="paymentDate" type="date" value="${esc(String(payment?.[0]||student.start||''))}" ${payment?'required':'disabled'}></label><label data-edit-extra-v17 class="wide-edit-field-v17">بيان هذه الدفعة<input class="input" name="paymentDescription" value="${esc(String(payment?.[5]||''))}" ${payment?'':'disabled'} autocomplete="off"></label>`);
  }
  if(!payment){form.elements.paid.readOnly=true;form.elements.method.disabled=true;const paidLabel=form.elements.paid.closest('label');if(paidLabel)paidLabel.childNodes[0].textContent='إجمالي المدفوع (محسوب)';}
  const submit=form.querySelector('.registration-submit-v13');if(submit){submit.textContent='حفظ التغييرات';submit.classList.add('registration-save-edit-v17');mountEditActions(form,submit);}
  renderSelectedCourseRow(form,scheduleRoot);fillMatrix(scheduleRoot,form,student.schedule||null);
  form.elements.specialty?.dispatchEvent(new Event('change',{bubbles:true}));renderSelectedCourseRow(form,scheduleRoot);fillMatrix(scheduleRoot,form,student.schedule||null);
  form.onsubmit=event=>{
    event.preventDefault();const active=currentEditSession();if(!active)return;const data=new FormData(form),item=spec(String(data.get('specialty')||''));if(!item)return alert('اختر الدورة.');
    const fee=Math.max(0,Number(data.get('price')||0));if(fee<=0)return alert('أدخل سعرًا صالحًا.');
    const paymentAmount=payment?Math.max(0,Number(data.get('paid')||0)):null,debtDate=String(data.get('debtDate')||'');
    if(payment&&paymentAmount<=0)return alert('مبلغ الدفعة يجب أن يكون أكبر من صفر.');
    try{
      D.updateStudentRegistration(active.student,{name:String(data.get('name')||''),phone:String(data.get('phone')||''),branch:String(data.get('branch')||''),specialty:String(data.get('specialty')||''),start:String(data.get('start')||''),fee,schedule:scheduleSnapshot(form,scheduleRoot),paymentIndex:active.paymentIndex,paymentAmount,paymentMethod:payment?String(data.get('method')||''):undefined,paymentDate:payment?String(data.get('paymentDate')||payment[0]||''):undefined,paymentDescription:payment?String(data.get('paymentDescription')||''):undefined,debtDueDate:payment?debtDate:undefined});
    }catch(error){alert(String(error?.message||error));return;}
    restoreNormalRegistration();
  };
  return true;
}

function enhanceRegister(){
  const form=document.getElementById('regFormV13');
  const scheduleRoot=document.querySelector('.registration-schedule-card-v13');
  if(!form||!scheduleRoot)return;
  const editing=Boolean(currentEditSession()),branchSelect=form.elements.branch,specialtySelect=form.elements.specialty,methodSelect=form.elements.method,paidInput=form.elements.paid;
  if(!editing)document.body.classList.remove('efc-registration-editing-v17');
  installBlankSelection(branchSelect,'اختر المركز',{required:true,preserveValue:editing});
  installBlankSelection(specialtySelect,'اختر الدورة',{required:true,preserveValue:editing});
  installBlankSelection(methodSelect,'اختر وسيلة الدفع',{preserveValue:editing});
  installMatrix(form,scheduleRoot);
  if(editing)installEditMode(form,scheduleRoot);
  const syncMethodRequired=()=>{if(methodSelect&&!methodSelect.disabled)methodSelect.required=Number(paidInput?.value||0)>0;};
  paidInput?.addEventListener('input',syncMethodRequired);
  form.addEventListener('reset',()=>queueMicrotask(()=>{
    if(currentEditSession())return;
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

body.efc-registration-editing-v17 .efc-reg-page-head-v15{display:flex!important;justify-content:center!important;min-height:52px!important;margin:0 0 8px!important}
body.efc-registration-editing-v17 .efc-reg-welcome-v15,body.efc-registration-editing-v17 .efc-reg-page-head-v15>div[aria-hidden]{display:none!important}
body.efc-registration-editing-v17 .efc-reg-hero-v15{width:min(520px,100%)!important;height:52px!important;border-radius:14px!important;gap:12px!important}
body.efc-registration-editing-v17 .efc-reg-hero-v15 h1{font-size:22px!important;white-space:nowrap!important}
body.efc-registration-editing-v17 .efc-reg-hero-v15 svg{width:31px!important;height:31px!important}
body.efc-registration-editing-v17 .efc-reg-hero-v15 i{bottom:6px!important;width:42px!important;height:3px!important}
body.efc-registration-editing-v17 .registration-schedule-layout-v13{grid-template-columns:minmax(0,1.08fr) minmax(0,.92fr)!important;gap:10px!important}
body.efc-registration-editing-v17 .registration-edit-mode-v17{border-color:#118063!important;box-shadow:0 10px 28px rgba(7,88,68,.12)!important;padding:9px 10px 10px!important}
body.efc-registration-editing-v17 .registration-edit-mode-v17 .section-head{height:40px!important;margin:0 0 7px!important;padding:0 10px!important;border-radius:9px!important}
body.efc-registration-editing-v17 .registration-edit-mode-v17 .section-head h2{font-size:16px!important;line-height:1.2!important}
body.efc-registration-editing-v17 .registration-edit-mode-v17 .efc-reg-form-icon-v15{width:24px!important;height:24px!important}
body.efc-registration-editing-v17 .registration-edit-mode-v17 .efc-reg-form-icon-v15 svg{width:22px!important;height:22px!important}
body.efc-registration-editing-v17 .registration-edit-mode-v17 .registration-fields-v13{grid-template-columns:repeat(3,minmax(0,1fr))!important;gap:5px 8px!important;align-items:end!important}
body.efc-registration-editing-v17 .registration-edit-mode-v17 .registration-fields-v13 label{font-size:10.5px!important;gap:3px!important;line-height:1.25!important;min-width:0!important}
body.efc-registration-editing-v17 .registration-edit-mode-v17 .registration-fields-v13 .input,
body.efc-registration-editing-v17 .registration-edit-mode-v17 .registration-fields-v13 select{height:34px!important;padding:4px 8px!important;border-radius:7px!important;font-size:11px!important;min-width:0!important}
body.efc-registration-editing-v17 .registration-edit-mode-v17 .registration-fields-v13 label.efc-reg-has-icon-v15 .input{padding-left:31px!important}
body.efc-registration-editing-v17 .registration-edit-mode-v17 .efc-reg-field-icon-v15{left:8px!important;bottom:7px!important;width:17px!important;height:17px!important}
body.efc-registration-editing-v17 .registration-edit-mode-v17 .debt-slot-v13{min-height:0!important}
body.efc-registration-editing-v17 .registration-edit-mode-v17 .wide-edit-field-v17{grid-column:span 2!important}
body.efc-registration-editing-v17 .registration-edit-actions-v17{display:grid!important;grid-template-columns:minmax(0,1.35fr) minmax(0,.65fr)!important;gap:8px!important;margin-top:7px!important;position:relative;z-index:2}
body.efc-registration-editing-v17 .registration-edit-actions-v17 .button{width:100%!important;min-width:0!important;min-height:38px!important;height:38px!important;margin:0!important;border-radius:8px!important;font-size:13px!important;display:flex!important;align-items:center!important;justify-content:center!important}
body.efc-registration-editing-v17 .registration-save-edit-v17{background:linear-gradient(180deg,#08785d,#056149)!important;color:#fff!important}
body.efc-registration-editing-v17 .registration-cancel-edit-v17{background:#eef3f1!important;color:#17352d!important;border:1px solid #c9d8d2!important}
body.efc-registration-editing-v17 .registration-schedule-card-v13{padding:10px 10px 9px!important}
body.efc-registration-editing-v17 .schedule-title-v13{margin-bottom:6px!important}
body.efc-registration-editing-v17 .schedule-title-v13 h2{font-size:18px!important}
body.efc-registration-editing-v17 .schedule-top-note-v13{min-height:40px!important;margin-bottom:6px!important;padding:6px 9px!important;font-size:12px!important}
body.efc-registration-editing-v17 .schedule-time-row-v17 td,body.efc-registration-editing-v17 .schedule-matrix-row-v17 td{height:40px!important}
body.efc-registration-editing-v17 .schedule-day-time-v17{height:30px!important;font-size:10px!important}
body.efc-registration-editing-v17 .schedule-notes-v13{margin-top:6px!important;padding-top:7px!important;padding-bottom:7px!important;font-size:11px!important}

@media(max-width:1180px){
  body.efc-registration-redesign-v15 .schedule-table-v13 tbody th,body.efc-registration-redesign-v15 .schedule-table-v13 thead th:first-child{width:98px!important;min-width:98px!important}
  body.efc-registration-redesign-v15 .schedule-day-time-v17{font-size:10px!important;padding:1px!important}
  body.efc-registration-redesign-v15 .schedule-course-check-v17 span{width:20px;height:20px}
  body.efc-registration-editing-v17 .registration-edit-mode-v17 .registration-fields-v13{grid-template-columns:repeat(2,minmax(0,1fr))!important}
  body.efc-registration-editing-v17 .registration-edit-mode-v17 .wide-edit-field-v17{grid-column:1/-1!important}
}
@media(max-width:980px){
  body.efc-registration-editing-v17 .registration-schedule-layout-v13{grid-template-columns:1fr!important}
  body.efc-registration-editing-v17 .registration-edit-mode-v17{max-width:760px!important;justify-self:center!important}
}
@media(max-height:720px) and (min-width:981px){
  body.efc-registration-editing-v17 .content{padding-top:8px!important;padding-bottom:12px!important}
  body.efc-registration-editing-v17 .efc-reg-page-head-v15{min-height:44px!important;margin-bottom:6px!important}
  body.efc-registration-editing-v17 .efc-reg-hero-v15{height:44px!important}
  body.efc-registration-editing-v17 .efc-reg-hero-v15 h1{font-size:19px!important}
  body.efc-registration-editing-v17 .registration-edit-mode-v17 .section-head{height:36px!important;margin-bottom:5px!important}
  body.efc-registration-editing-v17 .registration-edit-mode-v17 .registration-fields-v13{gap:4px 7px!important}
  body.efc-registration-editing-v17 .registration-edit-mode-v17 .registration-fields-v13 .input,
  body.efc-registration-editing-v17 .registration-edit-mode-v17 .registration-fields-v13 select{height:31px!important;font-size:10.5px!important}
  body.efc-registration-editing-v17 .registration-edit-actions-v17 .button{height:34px!important;min-height:34px!important;font-size:12px!important}
  body.efc-registration-editing-v17 .schedule-top-note-v13{min-height:34px!important;font-size:11px!important}
  body.efc-registration-editing-v17 .schedule-time-row-v17 td,body.efc-registration-editing-v17 .schedule-matrix-row-v17 td{height:36px!important}
  body.efc-registration-editing-v17 .schedule-notes-v13{font-size:10px!important;line-height:1.4!important}
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
  atomicEditMode:true,
  cancelEditDiscardsDraft:true,
  receiptEditReturnsToRegistration:true,
  closesSourceModalsBeforeEdit:true,
  guardedEditNavigation:true,
  normalRegistrationRestoredAfterSave:true,
  responsiveEditWorkspace:true,
  mainUntouched:true
});
})();
