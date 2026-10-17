(()=>{
'use strict';
if(window.EFC_STUDENT_LIFECYCLE_UI_V20?.ready)return;
const D=window.EFC_DOMAIN_V13,sequence=window.EFC_RECEIPT_SEQUENCES_V10;
if(!D?.studentLifecycleV20||!window.EFC_STUDENT_UI_V13?.ready||!window.EFC_REGISTRATION_SCHEDULE_MATRIX_V17?.ready)throw new Error('Student lifecycle UI v20 loaded before lifecycle/student/registration UI.');

const baseOpenStudent=window.openStudent;
const canEditStudents=()=>window.EFC_AUTH_V13?.canEdit?.('students')??true;
const canReactivate=()=>canEditStudents()&&(window.EFC_AUTH_V13?.canEdit?.('register')??true);
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


function methodChoices(){
  const choices=Array.isArray(window.methods)?window.methods:[];
  return choices.filter(Boolean).map(method=>'<option value="'+D.esc(method)+'">'+D.esc(method)+'</option>').join('');
}
function openPastDebtPayment(student,cycleId,oldModal){
  if(!canReactivate())return alert('ليست لديك صلاحية تسجيل الدفعات.');
  const cycle=(student.enrollmentHistory||[]).find(item=>String(item.archivedCycleId||'')===String(cycleId));
  if(!cycle)return alert('لا توجد فترة مطابقة.');
  const remaining=D.cycleRemainingDebt(cycle);
  if(remaining<=0)return alert('لا يوجد دين متبقٍ لهذه الفترة.');
  const modal=document.createElement('div');modal.className='modal efc-old-debt-modal-v59';
  modal.innerHTML=`<div class="modal-card narrow"><div class="modal-head"><div><p>سداد دين سابق</p><h2>تحصيل مستحقات فترة سابقة</h2><span>${D.esc(student.name)}</span></div><button class="x" type="button">×</button></div>
    <p class="efc-reactivation-note-v58">المبلغ المسدد يسجل كدخل حقيقي بتاريخ السداد، ويبقى مرتبطًا بفترة الدراسة السابقة وبإيصالاتها، ولا يضاف إلى رسوم الدورة الحالية.</p>
    <form class="grid two" autocomplete="off">
    <label class="wide">المديونية المتبقية <b>${D.cash(remaining)}</b></label>
    <label>المبلغ<input type="number" name="amount" min="0.01" step="any" max="${remaining}" value="${remaining}" required></label>
    <label>وسيلة الدفع<select name="method" required>${methodChoices()}</select></label>
    <label class="wide">تاريخ الدفع<input name="date" type="date" value="${D.today()}" max="${D.today()}" required></label>
    <div class="wide modal-actions"><button type="button" class="button secondary cancel">إلغاء</button><button class="button" type="submit">حفظ الدفعة الحقيقية</button></div></form></div>`;
  document.body.appendChild(modal);
  const close=()=>modal.remove();
  modal.querySelector('.x').onclick=close;modal.querySelector('.cancel').onclick=close;
  modal.querySelector('form').onsubmit=e=>{
    e.preventDefault();
    const form=e.currentTarget,amount=Number(form.elements.amount.value),method=form.elements.method.value,date=form.elements.date.value;
    try{
      D.payHistoricalDebt(student,cycleId,{amount,method,date});
      close();oldModal?.remove();window.openStudent(student.id,'finance');
      window.renderCurrentV13?.();
    }catch(error){alert(String(error?.message||error));}
  };
}
function showStudentReactivation(student,oldModal){
  if(!canReactivate())return alert('ليست لديك صلاحيات تسجيل الطلاب.');
  const oldDebt=D.cycleRemainingDebt(student);
  const earlierDebt=D.historicalDebtRemaining(student);
  const stopped=String(student.stoppedAt||(student.active===false?'':student.end)||'');
  const minDate=[D.addDays(student.start,1),stopped].filter(Boolean).sort().at(-1)||D.today();
  const proposed=minDate>D.today()?minDate:D.today();
  const overlay=document.createElement('div');
  overlay.className='modal efc-student-reactivation-v58';
  overlay.innerHTML=`<div class="modal-card narrow"><div class="modal-head"><div><p>استئناف الدراسة</p><h2>إعادة تنشيط ملف الطالب</h2><span>${D.esc(student.name)}</span></div><button type="button" class="x">×</button></div>
  <p class="efc-reactivation-note-v58">سيبقى رقم ملف الطالب كما هو، مع حفظ الفترة السابقة ودفعاتها وإيصالاتها. إذا اخترت تاريخًا مستقبليًا، ستظهر الدراسة بحالة «لم تبدأ بعد» حتى يحين موعد البداية.</p>
  <form class="grid two" autocomplete="off"><label class="wide">بداية الفترة الجديدة<input class="input" type="date" name="newStart" value="${proposed}" min="${minDate}" required></label>
  ${oldDebt>0?`<div class="wide efc-reactivation-debt-v59"><strong>دين الفترة التي ستُغلق: ${D.cash(oldDebt)}</strong><small>اختر كيف تتعامل مع هذا الدين. لن تُسجل أي إيرادات تلقائية عند ترحيله أو إسقاطه.</small></div>
  <label class="wide">التعامل مع الدين السابق<select name="debtAction" id="reactivationDebtActionV59"><option value="keep">الاحتفاظ بالدين وتحويله إلى سجل المستحقات السابقة</option>${window.EFC_AUTH_V13?.currentUser?.()?.role==='admin'?'<option value="waive">إسقاط الدين دون تسجيل دخل</option>':''}<option value="pay">سداد الدين الآن وتسجيل دفعة حقيقية</option></select></label>
  <label class="wide efc-reactivation-waive-v59" hidden>سبب إسقاط الدين<input class="input" name="waiverReason" placeholder="سبب الإعفاء — يحفظ للمراجعة"></label>
  <div class="wide efc-reactivation-pay-v59" hidden>
  <label>وسيلة الدفع<select name="paymentMethod">${methodChoices()}</select></label>
  <label>تاريخ الدفعة<input class="input" name="paymentDate" type="date" value="${D.today()}" max="${D.today()}"></label>
  <small>المبلغ الذي سيدفعه الطالب: ${D.cash(oldDebt)}. إذا أردت دفعة جزئية، استخدم تسديد دين سابق من الملف بعد الترحيل.</small></div>`:'<p class="wide efc-reactivation-note-v58">ليس على الفترة الحالية دين مستحق.</p>'}
  ${earlierDebt>0?`<div class="wide efc-reactivation-debt-v59">توجد ديون من فترات أقدم بقيمة ${D.cash(earlierDebt)}، وستظل محفوظة دون تغيير. يمكن سدادها من سجل الفترات السابقة.</div>`:''}
  <div class="wide modal-actions"><button type="button" class="button secondary cancel">إلغاء</button><button class="button" type="submit">تأكيد إعادة التنشيط</button></div></form></div>`;
  document.body.appendChild(overlay);
  const close=()=>overlay.remove();
  overlay.querySelector('.x').onclick=close;overlay.querySelector('.cancel').onclick=close;
  const actionSelect=overlay.querySelector('[name="debtAction"]');
  const sync=()=>{
    const action=actionSelect?.value||'keep';
    const waive=overlay.querySelector('.efc-reactivation-waive-v59'),pay=overlay.querySelector('.efc-reactivation-pay-v59');
    if(waive)waive.hidden=action!=='waive';
    if(pay)pay.hidden=action!=='pay';
    const reason=overlay.querySelector('[name="waiverReason"]');
    if(reason)reason.required=action==='waive';
  };
  if(actionSelect)actionSelect.onchange=sync;sync();
  overlay.querySelector('form').onsubmit=event=>{
    event.preventDefault();
    const form=event.currentTarget,date=form.elements.newStart.value;
    try{
      const action=form.elements.debtAction?.value||'keep',opts={
        debtAction:action,waiverReason:form.elements.waiverReason?.value||'',
        paymentMethod:form.elements.paymentMethod?.value||'',
        paymentDate:form.elements.paymentDate?.value||D.today()
      };
      if(action==='waive'&&!confirm('تأكيد إسقاط دين الفترة السابقة بقيمة '+D.cash(oldDebt)+' دون تسجيل دخل؟ ستبقى العملية موثقة في ملف الطالب.'))return;
      D.reactivateStudent(student,date,opts);
      close();oldModal?.remove();window.openStudent(student.id,'profile');window.renderCurrentV13?.();
    }catch(error){alert(String(error?.message||error));}
  };
}
function addEnrollmentHistory(modal,student){
  const history=Array.isArray(student?.enrollmentHistory)?student.enrollmentHistory:[];
  const oldDebt=D.historicalDebtRemaining(student);
  if(oldDebt>0){
    const summary=document.createElement('div');summary.className='efc-reactivation-debt-v59 efc-prior-debt-summary-v59';
    summary.textContent='ديون الفترات السابقة: '+D.cash(oldDebt)+' — محفوظة منفصلة عن رسوم الدورة الحالية';
    const target=modal.querySelector('.student-profile-actions-v3,.student-actions-v13');
    if(target)target.parentNode.insertBefore(summary,target);else modal.querySelector('.modal-card')?.appendChild(summary);
  }
  if(!history.length)return;
  const panel=document.createElement('section');panel.className='student-profile-section-v3 efc-enrollment-history-v58';
  const title=document.createElement('h3');title.textContent='فترات دراسة سابقة ('+history.length+')';panel.appendChild(title);
  history.slice().reverse().forEach(old=>{
    const card=document.createElement('div');card.className='efc-enrollment-history-item-v58';
    const label=document.createElement('b');label.textContent='من '+D.showDate(old.start)+' إلى '+D.showDate(old.stoppedAt||old.end)+' — '+String(old.name||student.name);card.appendChild(label);
    const debt=D.cycleRemainingDebt(old),waiver=Number(old.debtWaiver?.amount||0);
    const summary=document.createElement('div');
    summary.textContent='المركز: '+String(branchName(old.branch))+' | الدورة: '+String(spec(old.specialty)?.name||old.specialty||'—')+
      ' | المدفوع: '+D.cash(D.paymentTotal(old))+' | المتبقي: '+D.cash(debt)+(waiver>0?' | دين مُسقط: '+D.cash(waiver):'');
    card.appendChild(summary);
    if(waiver>0){const reason=document.createElement('small');reason.textContent='سبب إسقاط الدين: '+String(old.debtWaiver?.reason||'—')+' — '+D.showDate(old.debtWaiver?.date);card.appendChild(reason);}
    const payments=document.createElement('div');payments.className='efc-enrollment-history-payments-v58';
    (old.payments||[]).forEach((payment,index)=>{
      const button=document.createElement('button');button.type='button';button.className='mini';
      button.textContent='روسي '+String(payment?.[8]||index+1)+' ('+D.showDate(payment?.[0])+')';
      button.onclick=()=>{const archived={...old,enrollmentHistory:[]};const model=window.receiptModelV4?.(archived,index,false);if(model)window.receiptWindowV4?.({...model,editableReceipt:false,sourceEquivalent:false,receiptSource:'archived-enrollment'});};
      payments.appendChild(button);
    });
    if(debt>0&&canReactivate()){
      const pay=document.createElement('button');pay.type='button';pay.className='mini efc-historical-pay-v59';pay.textContent='سداد الدين السابق';
      pay.onclick=()=>openPastDebtPayment(student,old.archivedCycleId,modal);payments.appendChild(pay);
    }
    card.appendChild(payments);panel.appendChild(card);
  });
  const target=modal.querySelector('.student-profile-actions-v3,.student-actions-v13');
  if(target)target.parentNode.insertBefore(panel,target);else modal.querySelector('.modal-card')?.appendChild(panel);
}
function addLifecycleActions(modal,student){
  if(!modal||!student||!canEditStudents())return;
  const actions=modal.querySelector('.student-profile-actions-v3,.student-actions-v13');if(!actions||actions.querySelector('.student-edit-info-v20'))return;
  const edit=document.createElement('button');edit.type='button';edit.className='button secondary student-edit-info-v20';edit.textContent='تعديل بيانات الطالب';edit.onclick=()=>beginStudentInfoEdit(student,modal);
  if(D.mayReactivateStudent?.(student)&&canReactivate()){const reopen=document.createElement('button');reopen.type='button';reopen.className='button efc-reactivate-student-v58';reopen.textContent='إعادة تنشيط الطالب';reopen.onclick=()=>showStudentReactivation(student,modal);actions.appendChild(reopen);}
  const del=document.createElement('button');del.type='button';del.className='button student-delete-v20';del.textContent='حذف الطالب نهائيًا';del.onclick=()=>deleteStudent(student,modal);
  const close=actions.querySelector('.close');if(close){actions.insertBefore(edit,close);actions.insertBefore(del,close);}else actions.append(edit,del);
}
window.openStudent=function(id,mode='finance'){
  const result=baseOpenStudent(id,mode),student=studentById(id),modal=[...document.querySelectorAll('.modal')].at(-1);if(!student||!modal)return result;
  patchMonthlyEnd(modal,student);addEnrollmentHistory(modal,student);addLifecycleActions(modal,student);return result;
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
.student-profile-actions-v3 .button,.student-actions-v13 .button{border:1.3px solid #17211e!important;box-shadow:0 4px 10px rgba(20,40,34,.06)!important}.student-profile-actions-v3 .close,.student-actions-v13 .close{background:#e7ecea!important;color:#263b35!important}.student-profile-actions-v3 .stop-student-v13,.student-actions-v13 .stop-student-v13{background:#ffe7af!important;color:#704d00!important}.student-profile-actions-v3 .open-finance-v13,.student-actions-v13 .pay-student-v13,.student-actions-v13 .prepay-next-v14{background:#0b705a!important;color:#fff!important} .efc-reactivate-student-v58{background:#d9f6e5!important;color:#0b6344!important;border-color:#76b89e!important}.efc-reactivation-note-v58{font-size:13px;line-height:1.9;background:#f5faf8;padding:12px;border-radius:10px}.efc-enrollment-history-v58{margin:12px 0}.efc-enrollment-history-item-v58{display:grid;gap:8px;padding:12px;border:1px solid #d5e2dc;border-radius:10px;margin:8px 0;background:#fafdfb}.efc-enrollment-history-item-v58>div{font-size:12px;line-height:1.7}.efc-enrollment-history-payments-v58{display:flex;flex-wrap:wrap;gap:8px}.efc-reactivation-debt-v59{display:grid;gap:5px;margin:10px 0;padding:11px 13px;background:#fff7e6;border:1px solid #f3d08b;border-radius:10px;color:#654600;font-size:13px;line-height:1.7}.efc-reactivation-pay-v59{display:grid;grid-template-columns:1fr 1fr;gap:10px}.efc-reactivation-pay-v59 small{grid-column:1/-1}.efc-reactivation-waive-v59[hidden],.efc-reactivation-pay-v59[hidden]{display:none!important}.efc-historical-pay-v59{background:#e4f3ff!important;color:#194d77!important}.student-delete-v20{background:#b63b3b!important;color:#fff!important;border-color:#17211e!important}.student-delete-v20:hover{background:#963030!important}.student-edit-info-v20{margin-inline-start:auto;background:#dbeeff!important;color:#174a71!important;border-color:#17211e!important}.registration-reg-fixed-v17.is-auto-target-v20{border-color:#17856b!important;background:#eefaf6!important;color:#075844!important}.registration-scope-warning-v20{margin:10px 0;padding:9px 11px;border:1px solid #e5c97a;border-radius:9px;background:#fff9e9;color:#70551f;font-size:9px;line-height:1.8}.registration-scope-warning-v20[hidden]{display:none!important}
`;document.head.appendChild(style);
window.EFC_STUDENT_LIFECYCLE_UI_V20=Object.freeze({ready:true,enhanceRegistration:enhanceRegistrationLifecycleV20,canonicalRegistrationEnhancer:true,monthlyEndShownInStudentFile:true,monthlyEndTracksLatestPaidCycle:true,studentInfoEditAction:true,studentPermanentDeleteAction:true,registrationNumberPreviewOnScopeChange:true,registrationNumberHintRemoved:true,scopeChangeExplainedAsCorrection:true,studentActionButtonsColored:true,studentActionButtonsDarkBorder:true});
})();