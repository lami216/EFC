(()=>{
'use strict';
if(window.EFC_STUDENT_LIFECYCLE_UI_V20?.ready)return;
const D=window.EFC_DOMAIN_V13,sequence=window.EFC_RECEIPT_SEQUENCES_V10;
if(!D?.studentLifecycleV20||!window.EFC_STUDENT_UI_V13?.ready||!window.EFC_REGISTRATION_SCHEDULE_MATRIX_V17?.ready)throw new Error('Student lifecycle UI v20 loaded before lifecycle/student/registration UI.');

const baseOpenStudent=window.openStudent;
const canEditStudents=()=>window.EFC_AUTH_V13?.canEdit?.('students')??true;
const canReactivateStudents=()=>canEditStudents()&&window.EFC_AUTH_V13?.currentUser?.()?.role==='admin';
const isMonthly=student=>Boolean(D.isDynamicMonthly?.(student)||student?.snapshot?.billing==='monthly');
const studentById=id=>students.find(item=>String(item?.id||'')===String(id||''));
const fieldByLabel=(root,label)=>[...root.querySelectorAll('.student-profile-field-v3')].find(field=>String(field.querySelector('small')?.textContent||'').trim()===label)||null;

function patchMonthlyEnd(modal,student){
  if(!modal||!isMonthly(student))return;const end=D.monthlyCoverageEnd?.(student)||'';
  const primary=fieldByLabel(modal,'نهاية الدورة');if(primary){const label=primary.querySelector('small'),value=primary.querySelector('b');if(label)label.textContent='نهاية الشهر';if(value)value.textContent=D.showDate(end);}
  const approved=fieldByLabel(modal,'تاريخ النهاية المعتمد');if(approved){const label=approved.querySelector('small'),value=approved.querySelector('b');if(label)label.textContent='نهاية الشهر المعتمد';if(value)value.textContent=D.showDate(end);}
  const kpis=modal.querySelector('.student-kpis');if(kpis){const endCard=[...kpis.children].find(card=>String(card.querySelector('small')?.textContent||'').trim()==='النهاية');if(endCard){const label=endCard.querySelector('small'),value=endCard.querySelector('b');if(label)label.textContent='نهاية الشهر';if(value)value.textContent=D.showDate(end);}}
}
function beginStudentInfoEdit(student,modal){
  if(!student)return;if(!canEditStudents())return alert('الحساب الحالي لا يملك صلاحية تعديل بيانات الطلاب.');
  const api=window.EFC_BEGIN_REGISTRATION_EDIT_V17;if(typeof api!=='function')return alert('تعذر فتح تعديل بيانات الطالب.');
  modal?.remove();api({studentId:String(student.id||''),paymentIndex:null,registrationReceipt:false,statement:false,editableReceipt:true,receipt:''});
}
async function deleteStudent(student,modal){
  if(!student)return;if(!canEditStudents())return alert('الحساب الحالي لا يملك صلاحية حذف الطلاب.');
  const payments=Array.isArray(student.payments)?student.payments:[],total=D.paymentTotal?.(student)||0,reusable=D.registrationNumberWillBeReusable?.(student)===true,reg=String(student.reg??'').padStart(4,'0');
  const numberMessage=reusable?`رقم السجل ${reg} هو آخر رقم في هذا المركز والدورة، لذلك يمكن أن يأخذه التسجيل القادم إذا لم يصدر رقم بعده.`:`رقم السجل ${reg} سيبقى محجوزًا ولن يؤثر الحذف في الأرقام التي صدرت بعده.`;
  const message=`حذف الطالب نهائيًا سيحذف ملفه ودفعاته من البيانات الحالية.\nعدد الدفعات: ${payments.length} · إجمالي المدفوع: ${D.cash(total)}\n${numberMessage}\nالنسخ الاحتياطية القديمة لن تعيد الطالب بعد هذا الحذف.\n\nهل تريد المتابعة؟`;
  if(!window.confirm(message))return;
  try{await D.deleteStudentPermanently(student);modal?.remove();window.renderCurrentV13?.();}
  catch(error){alert(String(error?.message||error));}
}
function openLifecycleDialogV71(student,kind,{onSaved}={}){
  if(!student||!canReactivateStudents())return alert('هذه العملية متاحة للمسؤول صاحب صلاحية تعديل الطلاب فقط.');
  const resume=kind==='resume',title=resume?'استئناف الدراسة':'إعفاء المتبقي',current=D.today(),waived=Number(D.studentDebtWaiverSummaryV71?.(student)?.activeAmount||0),esc=D.esc;
  const modal=document.createElement('div');modal.className='modal student-lifecycle-dialog-v71';
  modal.innerHTML=`<div class="modal-card narrow"><div class="modal-head"><div><p>${title}</p><h2>${esc(student.name)}</h2></div><button class="x" type="button" aria-label="إغلاق">×</button></div><form class="grid two" autocomplete="off"><label class="wide">${resume?'تاريخ العودة للدراسة':'تاريخ الإعفاء'}<input class="input" name="effectiveDate" type="date" min="${esc(student.stoppedAt||student.start||'')}" max="${esc(current)}" value="${esc(current)}" ${resume?'':'readonly'} required></label>${resume?(waived>0?`<fieldset class="wide student-waiver-choice-v71"><legend>الإعفاء السابق: ${D.cash(waived)}</legend><label><input type="radio" name="waiverChoice" value="keep" checked> إبقاء الإعفاء؛ لا يعود المتبقي المعفى</label><label><input type="radio" name="waiverChoice" value="restore"> إعادة المبلغ المعفى إلى المستحقات</label></fieldset>`:''):'<label class="wide">سبب الإعفاء (اختياري)<input class="input" name="waiverReason" type="text"></label>'}<div class="wide course-note-v13">${resume?'الاستئناف عودة فعلية بتاريخ جديد، ولا يحتسب فترة الانقطاع. يختلف عن تصحيح إيقاف بالخطأ.':'سيُعفى المتبقي المستحق فقط. تبقى الدفعات النقدية والروسيات محفوظة، ولا يسجل الإعفاء دخلًا.'}</div><div class="wide student-debt-preview-v71" aria-live="polite"></div><p class="wide lifecycle-error-v71" role="alert" hidden></p><div class="wide modal-actions"><button class="button secondary cancel" type="button">إلغاء</button><button class="button confirm-lifecycle-v71" type="submit">${resume?'تأكيد الاستئناف':'تأكيد الإعفاء'}</button></div></form></div>`;
  document.body.appendChild(modal);
  const form=modal.querySelector('form'),date=form.elements.effectiveDate,reason=form.elements.waiverReason,summary=modal.querySelector('.student-debt-preview-v71'),error=modal.querySelector('.lifecycle-error-v71'),confirm=modal.querySelector('.confirm-lifecycle-v71'),confirmText=confirm.textContent;
  const options=()=>resume?{date:date.value,restoreWaivedDebt:form.elements.waiverChoice?.value==='restore'}:{date:date.value,reason:String(reason?.value||'').trim()};
  const preview=()=>{
    error.hidden=true;
    try{
      const api=resume?D.previewStudentResumptionV71:D.previewStudentDebtWaiverV71;
      if(typeof api!=='function')throw Error('انتظر اكتمال بدء التطبيق ثم أعد المحاولة.');
      const result=api(student,options());
      const item=(label,value)=>`<div><span>${label}</span><b>${D.cash(value)}</b></div>`;
      summary.innerHTML=item('المتبقي قبل العملية',result.beforeRemaining)+item(resume?'إعفاء سابق':'إعفاء جديد',resume?result.beforeWaived:result.waivedNow)+(resume?item('المعاد إلى المستحقات',result.restoredDebt):'')+item('المتبقي بعد العملية',result.afterRemaining)+(resume&&result.monthly?`<small>بداية الاحتساب بعد العودة: ${D.showDate(result.nextCycleStart)}${result.coveredThrough?` · آخر فترة محتسبة سابقًا حتى ${D.showDate(result.coveredThrough)}`:''}</small>`:'')+(Number(resume?result.restoredDebt:result.waivedNow)>0?`<small>تاريخ ${resume?'إعادة المستحقات':'الإعفاء'}: ${D.showDate(result.adjustmentDate||current)}</small>`:'')+'<small>لا تتغير المبالغ المقبوضة أو الدفعات السابقة.</small>';
      return result;
    }catch(failure){summary.textContent='';error.textContent=String(failure?.message||failure);error.hidden=false;return null;}
  };
  modal.querySelector('.x').onclick=modal.querySelector('.cancel').onclick=()=>modal.remove();
  form.oninput=preview;form.onchange=preview;preview();
  form.onsubmit=async event=>{
    event.preventDefault();if(!form.reportValidity()||!preview())return;
    const controls=[...modal.querySelectorAll('button,input,select')],disabled=controls.map(control=>control.disabled),selected=options();controls.forEach(control=>control.disabled=true);confirm.textContent='جارٍ الحفظ…';
    try{await(resume?D.resumeStudentV71(student,selected):D.waiveStudentDebtV71(student,selected));}
    catch(failure){controls.forEach((control,index)=>control.disabled=disabled[index]);confirm.textContent=confirmText;error.textContent=`تعذر حفظ العملية: ${String(failure?.message||failure)}`;error.hidden=false;return;}
    modal.remove();if(onSaved)onSaved();else window.renderCurrentV13?.();
  };
  return modal;
}
const openResumption=(student,options)=>openLifecycleDialogV71(student,'resume',options);
const openDebtWaiver=(student,options)=>openLifecycleDialogV71(student,'waiver',options);
function addLifecycleActions(modal,student){
  if(!modal||!student||!canEditStudents())return;
  const actions=modal.querySelector('.student-profile-actions-v3,.student-actions-v13');if(!actions||actions.querySelector('.student-edit-info-v20'))return;
  const edit=document.createElement('button');edit.type='button';edit.className='button secondary student-edit-info-v20';edit.textContent='تعديل بيانات الطالب';edit.onclick=()=>beginStudentInfoEdit(student,modal);
  const del=document.createElement('button');del.type='button';del.className='button student-delete-v20';del.textContent='حذف الطالب نهائيًا';del.onclick=()=>deleteStudent(student,modal);
  const close=actions.querySelector('.close');if(close){actions.insertBefore(edit,close);actions.insertBefore(del,close);}else actions.append(edit,del);
  if(D.isInactive?.(student)&&canReactivateStudents()){
    const onSaved=()=>{const mode=modal.querySelector('[data-tab].active')?.dataset.tab||'profile';modal.remove();window.renderCurrentV13?.();window.openStudent?.(student.id,mode);};
    const resume=document.createElement('button');resume.type='button';resume.className='button student-resume-v71';resume.textContent='استئناف الدراسة';resume.onclick=()=>openResumption(student,{onSaved});if(close)actions.insertBefore(resume,close);else actions.append(resume);
    if(Number(D.remainingAmount(student))>0){const waive=document.createElement('button');waive.type='button';waive.className='button secondary student-waive-v71';waive.textContent='إعفاء المتبقي';waive.onclick=()=>openDebtWaiver(student,{onSaved});if(close)actions.insertBefore(waive,close);else actions.append(waive);}
    const undo=document.createElement('button');undo.type='button';undo.className='button student-reactivate-v69';undo.textContent='إلغاء إيقاف بالخطأ';
    undo.onclick=async()=>{
      let preview;try{preview=D.previewStudentReactivation(student);}catch(error){return alert(String(error?.message||error));}
      const effect=preview.monthly?`سيعود احتساب الدورة من تاريخ بدايتها دون إعفاء فترة الإيقاف.\nالأشهر المحتسبة قبل: ${preview.beforeMonths}؛ بعد: ${preview.afterMonths}\nالرسوم قبل: ${D.cash(preview.beforeRequired)}؛ بعد: ${D.cash(preview.afterRequired)}`:`ستعود نهاية الدورة الأصلية: ${D.showDate(preview.restoredEnd)}\nتبقى رسوم الدورة ودفعاتها كما هي.`;
      const credit=preview.beforeUnallocated||preview.afterUnallocated?`\nالرصيد غير الموزع قبل: ${D.cash(preview.beforeUnallocated)}؛ بعد: ${D.cash(preview.afterUnallocated)}`:'';
      if(!window.confirm(`إلغاء إيقاف ${student.name} المسجل بتاريخ ${D.showDate(student.start)}؟\nهذا الإجراء لتصحيح إيقاف بالخطأ.\n${effect}\nالمتبقي قبل: ${D.cash(preview.beforeRemaining)}؛ بعد: ${D.cash(preview.afterRemaining)}${credit}\nتبقى هوية الطالب وكل الدفعات والروسيات محفوظة.\n\nهل تريد تأكيد إلغاء الإيقاف؟`))return;
      const buttons=[...modal.querySelectorAll('button')],disabled=buttons.map(button=>button.disabled);buttons.forEach(button=>{button.disabled=true;});
      try{await D.reactivateStudent(student);modal.remove();window.renderCurrentV13?.();window.openStudent?.(student.id,'profile');}
      catch(error){buttons.forEach((button,index)=>{button.disabled=disabled[index];});alert(`تعذر إلغاء الإيقاف: ${String(error?.message||error)}`);}
    };
    if(close)actions.insertBefore(undo,close);else actions.append(undo);
  }
}
window.openStudent=function(id,mode='finance'){
  const result=baseOpenStudent(id,mode),student=studentById(id),modal=[...document.querySelectorAll('.modal')].at(-1);if(!student||!modal)return result;
  patchMonthlyEnd(modal,student);addLifecycleActions(modal,student);return result;
};

function installRegistrationNumberPreview(){
  const session=window.EFC_REGISTRATION_EDIT_V17?.current?.();if(!session?.student)return;
  const form=document.getElementById('regFormV13'),fixed=document.querySelector('.registration-reg-fixed-v17');if(!form||!fixed)return;
  let warning=form.querySelector('.registration-scope-warning-v20');if(!warning){warning=document.createElement('div');warning.className='registration-scope-warning-v20';warning.hidden=true;warning.textContent='تغيير المركز أو الدورة هنا يُعامل كتصحيح لنفس ملف الطالب؛ تبقى دفعاته مرتبطة بالملف بعد التصحيح. النقل الحقيقي إلى دورة جديدة يجب تسجيله كعملية مستقلة. ولا يسمح النظام بإعادة تصنيف حركات سنة مالية مقفلة.';form.querySelector('.registration-edit-actions-v17')?.insertAdjacentElement('beforebegin',warning);}
  const sync=()=>{
    const branch=String(form.elements.branch?.value||''),specialty=String(form.elements.specialty?.value||''),same=branch===String(session.student.branch||'')&&specialty===String(session.student.specialty||'');
    const number=same?Number(session.student.reg||0):Number(sequence.previewRegistrationNumber?.(branch,specialty)||0);fixed.textContent=number?String(number).padStart(4,'0'):'—';fixed.classList.toggle('is-auto-target-v20',!same);
    if(warning)warning.hidden=same;
  };
  form.elements.branch?.addEventListener('change',sync);form.elements.specialty?.addEventListener('change',sync);sync();
}
function enhanceRegistrationLifecycleV20(){installRegistrationNumberPreview();}

const style=document.createElement('style');style.textContent=`
.student-stop-preview-v71,.student-debt-preview-v71{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px;padding:10px;border:1px solid #c7ddd5;border-radius:9px;background:#f4faf7}.student-stop-preview-v71>div,.student-debt-preview-v71>div{display:grid;gap:5px;min-width:0}.student-stop-preview-v71 span,.student-debt-preview-v71 span{font-size:10px;color:#49645a}.student-stop-preview-v71 b,.student-debt-preview-v71 b{font-size:13px}.student-stop-preview-v71 small,.student-debt-preview-v71 small{grid-column:1/-1;font-size:10px;line-height:1.7}.student-waiver-option-v71,.student-waiver-choice-v71 label{display:flex!important;flex-direction:row!important;align-items:center;justify-content:flex-start;text-align:right;gap:8px;font-size:11px!important;line-height:1.8}.student-waiver-option-v71 input,.student-waiver-choice-v71 input{width:14px!important;height:14px!important;min-height:0!important;flex:0 0 14px;margin:0!important}.student-waiver-choice-v71{margin:0;padding:10px;border:1px solid #d7c59c;border-radius:9px}.student-waiver-choice-v71 legend{padding:0 6px;font-size:11px;font-weight:800}.student-waiver-choice-v71 label+label{margin-top:7px}.student-waiver-state-v71{display:flex;align-items:center;flex-wrap:wrap;gap:8px 18px;padding:10px 12px;margin:0 0 14px;background:#fff8e8;border:1px solid #e2cf9f;border-radius:9px;font-size:11px}.student-waiver-state-v71 small{flex-basis:100%;color:#725d2b}.student-profile-actions-v3{flex-wrap:wrap}.student-resume-v71{background:#0b705a!important;color:#fff!important}.student-waive-v71{background:#fff2ce!important;color:#795610!important}.lifecycle-error-v71,.stop-date-error-v64{color:#a42323;font-size:11px;line-height:1.8;margin:0}.student-lifecycle-dialog-v71 .modal-card{max-height:calc(100dvh - 40px);overflow:auto}
.student-reactivate-v69{background:#d7f3e4!important;color:#075a39!important;border-color:#17211e!important}.student-reactivate-v69:hover{background:#bfe8d1!important}
.student-profile-actions-v3 .button,.student-actions-v13 .button{border:1.3px solid #17211e!important;box-shadow:0 4px 10px rgba(20,40,34,.06)!important}.student-profile-actions-v3 .close,.student-actions-v13 .close{background:#e7ecea!important;color:#263b35!important}.student-profile-actions-v3 .stop-student-v13,.student-actions-v13 .stop-student-v13{background:#ffe7af!important;color:#704d00!important}.student-profile-actions-v3 .open-finance-v13,.student-actions-v13 .pay-student-v13,.student-actions-v13 .prepay-next-v14{background:#0b705a!important;color:#fff!important}.student-delete-v20{background:#b63b3b!important;color:#fff!important;border-color:#17211e!important}.student-delete-v20:hover{background:#963030!important}.student-edit-info-v20{margin-inline-start:auto;background:#dbeeff!important;color:#174a71!important;border-color:#17211e!important}.registration-reg-fixed-v17.is-auto-target-v20{border-color:#17856b!important;background:#eefaf6!important;color:#075844!important}.registration-scope-warning-v20{margin:10px 0;padding:9px 11px;border:1px solid #e5c97a;border-radius:9px;background:#fff9e9;color:#70551f;font-size:9px;line-height:1.8}.registration-scope-warning-v20[hidden]{display:none!important}
`;document.head.appendChild(style);
window.EFC_STUDENT_LIFECYCLE_UI_V20=Object.freeze({ready:true,openResumption,openDebtWaiver,enhanceRegistration:enhanceRegistrationLifecycleV20,canonicalRegistrationEnhancer:true,monthlyEndShownInStudentFile:true,monthlyEndTracksLatestPaidCycle:true,studentInfoEditAction:true,studentPermanentDeleteAction:true,registrationNumberPreviewOnScopeChange:true,registrationNumberHintRemoved:true,scopeChangeExplainedAsCorrection:true,studentActionButtonsColored:true,studentActionButtonsDarkBorder:true});
})();
