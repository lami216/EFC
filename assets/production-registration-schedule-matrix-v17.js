(()=>{
'use strict';
if(window.EFC_REGISTRATION_SCHEDULE_MATRIX_V17?.ready)return;
if(!window.EFC_REGISTRATION_REDESIGN_V15?.ready||!window.EFC_REGISTRATION_REDESIGN_V15?.responsiveConsolidated||!window.EFC_MONTHLY_PREPAYMENT_UI_V14?.ready)throw new Error('Registration schedule matrix v17 loaded before consolidated redesign runtime.');

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
function requestDiscardEdit(){
  if(!editSession)return true;
  if(!confirmDiscardEdit())return false;
  clearEditSession();
  return true;
}
function beginRegistrationEdit(model){
  const studentId=String(model?.studentId||'');const student=students.find(value=>String(value.id)===studentId);
  if(!student){alert('تعذر العثور على ملف الطالب المرتبط بهذا الروسي.');return false;}
  const canEditStudents=window.EFC_AUTH_V13?.canEdit?.('students')??true,canEditRegister=window.EFC_AUTH_V13?.canEdit?.('register')??true;
  if(!canEditStudents||!canEditRegister){alert('لا تملك صلاحية تعديل ملف الطالب من صفحة التسجيل.');return false;}
  if(model?.statement||model?.editableReceipt===false){alert('هذا الروسي ناتج أو تجميعي ولا يملك معاملة مالية أصلية مستقلة. عدّل الروسي الأصلي من سجل الدفعات.');return false;}
  const registrationReceipt=Boolean(model?.registrationReceipt),rawIndex=model?.paymentIndex,transactionCode=String(model?.transactionCode||'').trim();
  let index=rawIndex===null||rawIndex===undefined||rawIndex===''?null:Number(rawIndex);
  if(transactionCode&&student.payments?.length){const resolved=student.payments.findIndex(payment=>String(payment?.[6]||'')===transactionCode);if(resolved<0){alert('تعذر مطابقة الروسي مع معاملته الأصلية. لم يتم فتح التعديل لحماية سجل الدفع.');return false;}index=resolved;}
  if(registrationReceipt&&!student.payments?.length)index=null;
  if(index!==null&&(!Number.isInteger(index)||index<0||!student.payments?.[index])){alert('تعذر العثور على الدفعة المرتبطة بهذا الروسي.');return false;}
  const returnHash=location.hash||'#students';
  editSession={studentId,paymentIndex:index,transactionCode,statement:Boolean(model?.statement),registrationReceipt,returnHash,receipt:String(model?.receipt||''),startedAt:Date.now()};
  document.querySelectorAll('.modal').forEach(modal=>modal.remove());
  document.body.classList.add('efc-registration-editing-v17');
  if(location.hash!=='#register')history.replaceState(null,'','#register');
  window.renderCurrentV13?.();
  return true;
}
window.EFC_BEGIN_REGISTRATION_EDIT_V17=beginRegistrationEdit;
window.EFC_REGISTRATION_EDIT_V17=Object.freeze({begin:beginRegistrationEdit,current:currentEditSession,cancel:restoreNormalRegistration,requestLeave:requestDiscardEdit,active:()=>Boolean(currentEditSession())});

document.addEventListener('click',event=>{
  if(!editSession)return;
  const element=event.target instanceof Element?event.target:null;if(!element)return;
  const logout=element.closest('.user-controls-v13 button');
  if(logout){if(requestDiscardEdit())return;event.preventDefault();event.stopImmediatePropagation();return;}
  const target=element.closest('a[href^="#"]');if(!target)return;
  const nextHash=String(target.getAttribute('href')||'');
  if(!nextHash||nextHash==='#register')return;
  event.preventDefault();event.stopPropagation();
  if(!requestDiscardEdit())return;
  location.hash=nextHash;
},true);
window.addEventListener('hashchange',()=>{
  if(!editSession||location.hash==='#register')return;
  if(requestDiscardEdit())return;
  history.replaceState(null,'','#register');
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

const ALLOWED_HOURS=[8,10,12,14,16,18,20];
function hourOptions(selected=''){
  const current=String(selected||'');
  return`<option value="">--</option>${ALLOWED_HOURS.map(hour=>{
    const hh=String(hour).padStart(2,'0'),value=`${hh}:00`;
    return`<option value="${value}"${value===current?' selected':''}>${value}</option>`;
  }).join('')}`;
}
function setScheduleTime(select,value){
  if(!select)return;
  const current=String(value||'');
  if(current&&![...select.options].some(option=>String(option.value)===current)){
    const legacy=new Option(`${current} · محفوظ سابقًا`,current);legacy.dataset.efcLegacyTime='1';select.add(legacy);
  }
  select.value=current;
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
  scheduleRoot.querySelectorAll('[data-schedule-day-time]').forEach(select=>{select.value='';select.querySelectorAll('[data-efc-legacy-time="1"]').forEach(option=>option.remove());});
  scheduleRoot.querySelectorAll('[data-matrix-course][data-matrix-day]').forEach(input=>{input.checked=false;});
}
function fillMatrix(scheduleRoot,form,schedule){
  const source=Array.isArray(schedule?.days)?schedule.days:[];const byKey=new Map(source.map(day=>[String(day?.key||''),day]));
  renderSelectedCourseRow(form,scheduleRoot);
  DAYS.forEach(day=>{
    const item=byKey.get(day.key)||{};const select=scheduleRoot.querySelector(`[data-schedule-day-time="${day.key}"]`);setScheduleTime(select,item.time||'');
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
  const student=session.student,payment=session.paymentIndex===null?null:student.payments?.[session.paymentIndex]||null,canCreatePayment=Boolean(session.registrationReceipt&&!session.statement&&session.paymentIndex===null&&!student.payments?.length),editablePayment=Boolean(payment||canCreatePayment),fields=form.querySelector('.registration-fields-v13');
  document.body.classList.add('efc-registration-editing-v17');
  const heroTitle=document.querySelector('.efc-reg-hero-v15 h1');if(heroTitle)heroTitle.textContent='تعديل تسجيل الطالب';
  const sectionTitle=form.querySelector('.section-head h2');if(sectionTitle)sectionTitle.textContent='بيانات الطالب والتسجيل';
  form.classList.add('registration-edit-mode-v17');
  form.elements.name.value=String(student.name||'');form.elements.phone.value=String(student.phone||'');form.elements.branch.value=String(student.branch||'');form.elements.specialty.value=String(student.specialty||'');form.elements.start.value=String(student.start||'');form.elements.price.value=String(student.snapshot?.fee||student.required||'');
  form.elements.paid.value=payment?String(payment[1]||0):canCreatePayment?'0':String(D.paymentTotal?.(student)||0);form.elements.method.value=payment?String(payment[2]||''):'';
  const targetKey=payment?.[7]?String(payment[7]):'course';form.elements.debtDate.value=String(payment?.[9]||student.debtDueDates?.[targetKey]||'');
  if(fields&&!fields.querySelector('[data-edit-extra-v17]')){
    fields.insertAdjacentHTML('beforeend',`<div class="registration-edit-meta-v17" data-edit-extra-v17><label>رقم السجل<span class="registration-reg-fixed-v17" aria-readonly="true">${esc(String(student.reg??'').padStart(4,'0'))}</span></label><label>تاريخ هذه الدفعة<input class="input" name="paymentDate" type="date" value="${esc(String(payment?.[0]||student.start||''))}" ${editablePayment?'required':'disabled'}></label><label class="registration-edit-description-v17">بيان هذه الدفعة<input class="input" name="paymentDescription" value="${esc(String(payment?.[5]||''))}" ${editablePayment?'':'disabled'} autocomplete="off"></label></div>`);
  }
  if(!editablePayment){form.elements.paid.readOnly=true;form.elements.method.disabled=true;const paidLabel=form.elements.paid.closest('label');if(paidLabel)paidLabel.childNodes[0].textContent='إجمالي المدفوع (محسوب)';}
  const submit=form.querySelector('.registration-submit-v13');if(submit){submit.textContent='حفظ التغييرات';submit.classList.add('registration-save-edit-v17');mountEditActions(form,submit);}
  renderSelectedCourseRow(form,scheduleRoot);fillMatrix(scheduleRoot,form,student.schedule||null);
  form.elements.specialty?.dispatchEvent(new Event('change',{bubbles:true}));renderSelectedCourseRow(form,scheduleRoot);fillMatrix(scheduleRoot,form,student.schedule||null);
  form.onsubmit=event=>{
    event.preventDefault();const active=currentEditSession();if(!active)return;const data=new FormData(form),item=spec(String(data.get('specialty')||''));if(!item)return alert('اختر الدورة.');
    const fee=Math.max(0,Number(data.get('price')||0));if(fee<=0)return alert('أدخل سعرًا صالحًا.');
    const paymentAmount=editablePayment?Math.max(0,Number(data.get('paid')||0)):null,debtDate=String(data.get('debtDate')||'');
    if(payment&&paymentAmount<=0)return alert('مبلغ الدفعة يجب أن يكون أكبر من صفر.');
    try{
      D.updateStudentRegistration(active.student,{name:String(data.get('name')||''),phone:String(data.get('phone')||''),branch:String(data.get('branch')||''),specialty:String(data.get('specialty')||''),start:String(data.get('start')||''),fee,schedule:scheduleSnapshot(form,scheduleRoot),paymentIndex:active.paymentIndex,createRegistrationPayment:canCreatePayment,registrationReceiptNo:active.receipt,paymentAmount,paymentMethod:editablePayment?String(data.get('method')||''):undefined,paymentDate:editablePayment?String(data.get('paymentDate')||student.start||''):undefined,paymentDescription:editablePayment?String(data.get('paymentDescription')||''):undefined,debtDueDate:editablePayment?debtDate:undefined});
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

body.efc-registration-editing-v17{overflow-y:auto!important}
body.efc-registration-editing-v17 .shell.shell-v13,
body.efc-registration-editing-v17 .shell.shell-v13 main,
body.efc-registration-editing-v17 .content{overflow-y:visible!important}
body.efc-registration-editing-v17 .registration-edit-mode-v17{border-color:#118063!important;box-shadow:0 10px 28px rgba(7,88,68,.10)!important;max-height:calc(100dvh - 118px)!important;overflow-y:auto!important;overscroll-behavior:contain!important;scrollbar-gutter:stable!important;scrollbar-width:thin!important}
body.efc-registration-editing-v17 .registration-edit-mode-v17 .debt-slot-v13.debt-slot-hidden{display:none!important;visibility:hidden!important}
body.efc-registration-editing-v17 .registration-edit-meta-v17{margin-top:0!important}
body.efc-registration-editing-v17 .registration-edit-meta-v17{grid-column:1/-1!important;display:grid!important;grid-template-columns:repeat(3,minmax(0,1fr))!important;gap:10px 12px!important;align-items:end!important;margin-top:1px!important}
body.efc-registration-editing-v17 .registration-edit-meta-v17 label{min-width:0!important}
body.efc-registration-editing-v17 .registration-edit-meta-v17 .input{min-width:0!important}
body.efc-registration-editing-v17 .registration-reg-fixed-v17{min-width:0;height:42px;display:flex;align-items:center;padding:0 11px;border:1px solid #d5dfdb;border-radius:9px;background:#eef3f1;color:#52665f;font:800 12.5px "Segoe UI Variable","Segoe UI",Tahoma,sans-serif;user-select:text;box-sizing:border-box}
body.efc-registration-editing-v17 .registration-edit-actions-v17{display:grid!important;grid-template-columns:minmax(0,1.35fr) minmax(0,.65fr)!important;gap:10px!important;margin-top:10px!important;position:sticky!important;bottom:0!important;z-index:4!important;padding-top:8px!important;padding-bottom:2px!important;background:linear-gradient(180deg,rgba(255,255,255,0),rgba(255,255,255,.96) 24%,#fff 100%)!important}
body.efc-registration-editing-v17 .registration-edit-actions-v17 .button{width:100%!important;min-width:0!important;margin:0!important;display:flex!important;align-items:center!important;justify-content:center!important}
body.efc-registration-editing-v17 .registration-save-edit-v17{background:linear-gradient(180deg,#08785d,#056149)!important;color:#fff!important}
body.efc-registration-editing-v17 .registration-cancel-edit-v17{background:#eef3f1!important;color:#17352d!important;border:1px solid #c9d8d2!important}

@media(max-width:1180px){
  body.efc-registration-redesign-v15 .schedule-table-v13 tbody th,body.efc-registration-redesign-v15 .schedule-table-v13 thead th:first-child{width:98px!important;min-width:98px!important}
  body.efc-registration-redesign-v15 .schedule-day-time-v17{font-size:10px!important;padding:1px!important}
  body.efc-registration-redesign-v15 .schedule-course-check-v17 span{width:20px;height:20px}
  body.efc-registration-editing-v17 .registration-edit-meta-v17{grid-template-columns:repeat(2,minmax(0,1fr))!important}
  body.efc-registration-editing-v17 .registration-edit-description-v17{grid-column:1/-1!important}
}
@media(max-width:900px){
  body.efc-registration-editing-v17 .registration-edit-meta-v17{grid-template-columns:1fr!important}
  body.efc-registration-editing-v17 .registration-edit-description-v17{grid-column:auto!important}
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
  restrictedScheduleHours:true,
  fixedMinuteZero:true,
  legacyNonHourTimesPreservedDuringEdit:true,
  directRegistrationSchedulePreferred:true,
  singleBottomNotice:true,
  largerScheduleNotices:true,
  lateNoteUpdated:true,
  receiptRenderingOwnedByBase:true,
  noReceiptWindowOverride:true,
  atomicEditMode:true,
  cancelEditDiscardsDraft:true,
  receiptEditReturnsToRegistration:true,
  sourceReceiptOnlyEdit:true,
  transactionCodeEditResolution:true,
  fixedRegistrationNumberDisplay:true,
  closesSourceModalsBeforeEdit:true,
  guardedEditNavigation:true,
  logoutAndCloseGuardAvailable:true,
  singleRouterRenderOnHashNavigation:true,
  zeroPaymentRegistrationEditable:true,
  editRequiresStudentAndRegistrationPermission:true,
  normalRegistrationRestoredAfterSave:true,
  responsiveEditWorkspace:true,
  editVerticalScroll:true,
  editActionsAlwaysReachable:true,
  editUsesHiddenDebtSpace:true,
  editRegisterFieldAligned:true,
  editKeepsRegistrationGeometry:true,
  mainUntouched:true
});
})();