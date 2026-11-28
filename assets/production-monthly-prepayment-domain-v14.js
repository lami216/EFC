(()=>{
'use strict';
if(window.EFC_MONTHLY_PREPAYMENT_DOMAIN_V14?.ready)return;
const B=window.EFC_DOMAIN_V13;
if(!B?.ready)throw new Error('Monthly prepayment v14 loaded before domain v13.');

const MAX_MONTHS=240;
const OPEN_LEAD_DAYS=3;
const RENEWAL_WARNING_DAYS=3;
const {today,nowTime,cash,showDate,addDays,isDynamicMonthly,isNewModel,isInactive,paymentTotal,uid}=B;
const baseMonthlyFocus=typeof monthlyFocusV3==='function'?monthlyFocusV3:null;
const baseDueNow=typeof dueNowV3==='function'?dueNowV3:null;
const baseSuggested=typeof suggestedPaymentV3==='function'?suggestedPaymentV3:null;
const baseAlloc=typeof allocV4==='function'?allocV4:null;
const baseFinancialStatus=typeof financialStatus==='function'?financialStatus:null;

const feeOf=student=>Math.max(0,Number(student?.snapshot?.fee||0));
const paymentDate=(payment,student)=>String(payment?.[0]||student?.start||'');
const targetOf=payment=>{const value=Number(payment?.[7]||0);return Number.isInteger(value)&&value>0?value:1;};
const clampMonth=value=>Math.max(1,Math.min(MAX_MONTHS,Number(value||1)));
const explicitOf=payment=>Array.isArray(payment?.[10])?payment[10].map(item=>({monthNumber:clampMonth(item?.monthNumber??item?.n),amount:Math.max(0,Number(item?.amount||0))})).filter(item=>item.amount>0):[];
const clone=value=>{try{return structuredClone(value);}catch{return JSON.parse(JSON.stringify(value));}};
const lifecycleWritesV71=new WeakSet();
function assertStudentLifecycleWriteIdleV71(student){if(student&&lifecycleWritesV71.has(student))throw new Error('جارٍ حفظ حالة الطالب. انتظر اكتمال العملية ثم أعد المحاولة.');return true;}
const lifecycleOf=student=>student?.billingLifecycleV71&&typeof student.billingLifecycleV71==='object'?student.billingLifecycleV71:{version:1,revision:0,pauses:[],waivers:[]};
const pausesOf=student=>Array.isArray(lifecycleOf(student).pauses)?lifecycleOf(student).pauses:[];
const waiversOf=student=>Array.isArray(lifecycleOf(student).waivers)?lifecycleOf(student).waivers:[];
function cycleSchedule(student,number,asOf='9999-12-31'){
  let anchor=String(student.start||''),first=1;
  pausesOf(student).forEach(pause=>{const after=Number(pause.afterMonthNumber);if(pause.resumedAt&&pause.resumedAt<=asOf&&Number.isInteger(after)&&after>=first-1&&after<number&&pause.nextCycleStart){anchor=String(pause.nextCycleStart);first=after+1;}});
  return{anchor,first,start:addDuration(anchor,number-first,'month'),end:addDays(addDuration(anchor,number-first+1,'month'),-1)};
}
function frozenAtDate(student,asOf=today()){
  const pause=[...pausesOf(student)].reverse().find(item=>item.stoppedAt<=asOf&&(!item.resumedAt||asOf<item.resumedAt));
  if(pause&&Number.isInteger(Number(pause.afterMonthNumber)))return Math.max(0,Number(pause.afterMonthNumber));
  if(isInactive(student)&&(!student.stoppedAt||String(student.stoppedAt)<=asOf)){
    const frozen=student.frozenMonths;if(frozen!==undefined&&frozen!==null&&frozen!==''&&Number.isInteger(Number(frozen))&&Number(frozen)>=0)return Number(frozen);
    return -1;
  }
  return null;
}
function waiverAmountFor(student,monthNumber,asOf=today()){
  return waiversOf(student).filter(entry=>entry.date<=asOf&&(!entry.reversedDate||asOf<entry.reversedDate)).reduce((sum,entry)=>sum+(Array.isArray(entry.parts)?entry.parts:[]).filter(part=>monthNumber===null?part.monthNumber===null:Number(part.monthNumber)===Number(monthNumber)).reduce((amount,part)=>amount+Math.max(0,Number(part.amount||0)),0),0);
}

function visibleMonthCount(student,asOf=today()){
  if(!isDynamicMonthly(student))return 0;
  const frozen=frozenAtDate(student,asOf);if(frozen!==null)return Math.max(0,frozen);
  if(!student.start)return 0;
  let count=1;
  for(let number=2;number<=MAX_MONTHS;number+=1){
    const monthStart=cycleSchedule(student,number,asOf).start;
    if(asOf>=addDays(monthStart,-OPEN_LEAD_DAYS))count=number;else break;
  }
  return count;
}
function allocationMonthCount(student,asOf=today(),paidOverride=null,minCount=0){
  const fee=feeOf(student);if(!fee)return Math.max(visibleMonthCount(student,asOf),Number(minCount||0));
  let count=Math.max(1,visibleMonthCount(student,asOf),Number(minCount||0));
  if(paidOverride!==null&&paidOverride!==undefined)return Math.min(MAX_MONTHS,Math.max(count,Math.ceil(Math.max(0,Number(paidOverride||0))/fee)));
  (student.payments||[]).forEach(payment=>{
    if(asOf&&paymentDate(payment,student)>asOf)return;
    const explicit=explicitOf(payment);
    if(explicit.length){count=Math.max(count,...explicit.map(item=>item.monthNumber));return;}
    const amount=Math.max(0,Number(payment?.[1]||0)),target=targetOf(payment),span=Math.max(1,Math.ceil(amount/fee));
    count=Math.max(count,target+span-1);
  });
  return Math.min(MAX_MONTHS,count);
}
function dynamicAllocation(student,asOf=today(),paidOverride=null,minCount=0){
  // Older stopped records may not have a frozen-month count. Preserve their
  // previous payment-derived obligations instead of treating missing as zero.
  const frozen=frozenAtDate(student,asOf),fee=feeOf(student),limit=frozen===null?MAX_MONTHS:Math.min(MAX_MONTHS,frozen>=0?frozen:allocationMonthCount(student,asOf,paidOverride,0)),initialCount=Math.min(limit,allocationMonthCount(student,asOf,paidOverride,minCount)),monthPaid=Array(initialCount).fill(0),allocations=[],unallocated=[];
  const place=(paymentIndex,monthIndex,amount)=>{
    if(monthIndex<0||monthIndex>=limit||amount<=0||fee<=0)return 0;
    while(monthPaid.length<=monthIndex)monthPaid.push(0);
    const before=Math.max(0,Number(monthPaid[monthIndex]||0)),room=Math.max(0,fee-Math.min(fee,waiverAmountFor(student,monthIndex+1,asOf))-before),used=Math.min(room,amount);
    if(used>0){const after=before+used;monthPaid[monthIndex]=after;allocations.push({paymentIndex,monthNumber:monthIndex+1,amount:used,before,after,fee});}
    return used;
  };
  if(paidOverride!==null&&paidOverride!==undefined){let left=Math.max(0,Number(paidOverride||0));for(let i=0;i<limit&&left>0;i+=1)left-=place(-1,i,left);if(left>0)unallocated.push({paymentIndex:-1,amount:left});return{monthPaid,allocations,count:monthPaid.length,unallocated};}
  (student.payments||[]).forEach((payment,index)=>{
    if(asOf&&paymentDate(payment,student)>asOf)return;
    let left=Math.max(0,Number(payment?.[1]||0));if(left<=0)return;
    const explicit=explicitOf(payment);
    if(explicit.length){
      for(const item of explicit){if(left<=0)break;left-=place(index,item.monthNumber-1,Math.min(left,item.amount));}
      if(left>0){const start=Math.max(0,(explicit.at(-1)?.monthNumber||targetOf(payment))-1);for(let i=start;i<limit&&left>0;i+=1)left-=place(index,i,left);}
      if(left>0)unallocated.push({paymentIndex:index,amount:left});
      return;
    }
    const start=Math.max(0,targetOf(payment)-1);
    for(let i=start;i<limit&&left>0;i+=1)left-=place(index,i,left);
    if(left>0)unallocated.push({paymentIndex:index,amount:left});
  });
  return{monthPaid,allocations,count:monthPaid.length,unallocated};
}
function installmentPlan(student,asOf=today(),paidOverride=null,minCount=0){
  if(!isDynamicMonthly(student))return B.installmentPlan(student,asOf,paidOverride);
  const fee=feeOf(student),{monthPaid,count}=dynamicAllocation(student,asOf,paidOverride,minCount);
  return Array.from({length:count},(_,index)=>{
    const number=index+1,schedule=cycleSchedule(student,number,asOf),monthStart=schedule.start,openDate=number===1?monthStart:addDays(monthStart,-OPEN_LEAD_DAYS),renewalDate=number===1?addDays(schedule.end,1):monthStart,dueFrom=addDays(renewalDate,-RENEWAL_WARNING_DAYS),overdueFrom=renewalDate,paid=Math.min(fee,Number(monthPaid[index]||0)),grossRemaining=Math.max(0,fee-paid),waived=Math.min(grossRemaining,waiverAmountFor(student,number,asOf)),remaining=Math.max(0,grossRemaining-waived),prepaid=paid>0&&asOf<monthStart;
    let state='upcoming';
    if(!remaining)state=waived>0?'waived':'paid';
    else if(asOf>=overdueFrom)state='overdue';
    else if(asOf>=dueFrom)state='due';
    else if(paid>0)state='partial';
    return{number,dueDate:monthStart,monthStart,monthEnd:schedule.end,openDate,renewalDate,dueFrom,overdueFrom,fee,paid,waived,grossRemaining,remaining,state,prepaid,partialPrepaid:prepaid&&remaining>0};
  });
}
function requiredAmount(student,asOf=today()){
  if(!isNewModel(student))return B.requiredAmount(student,asOf);
  if(isDynamicMonthly(student))return installmentPlan(student,asOf).reduce((sum,month)=>sum+Number(month.fee||0),0);
  return Math.max(0,Number(student.snapshot?.fee||student.required||0));
}
function remainingAmount(student,asOf=today()){
  if(isDynamicMonthly(student))return installmentPlan(student,asOf).reduce((sum,month)=>sum+Number(month.remaining||0),0);
  return Math.max(0,remainingAmountBeforeWaiver(student,asOf)-waiverAmountFor(student,null,asOf));
}
function remainingAmountBeforeWaiver(student,asOf=today()){
  if(isDynamicMonthly(student))return installmentPlan(student,asOf).reduce((sum,month)=>sum+Number(month.grossRemaining||0),0);
  if(!isNewModel(student))return Math.max(0,Number(B.remainingAmount(student,asOf)||0));
  return Math.max(0,requiredAmount(student,asOf)-paymentTotal(student));
}
function studentDebtWaiverSummaryV71(student,asOf=today()){
  const entries=waiversOf(student).filter(entry=>entry.date<=asOf),originalAmount=entries.reduce((sum,entry)=>sum+(entry.parts||[]).reduce((value,part)=>value+Math.max(0,Number(part.amount||0)),0),0),reversedAmount=entries.filter(entry=>entry.reversedDate&&entry.reversedDate<=asOf).reduce((sum,entry)=>sum+(entry.parts||[]).reduce((value,part)=>value+Math.max(0,Number(part.amount||0)),0),0);
  return{activeAmount:Math.max(0,remainingAmountBeforeWaiver(student,asOf)-remainingAmount(student,asOf)),originalAmount,reversedAmount,entries:clone(entries)};
}
function reconcileStudent(student,asOf=today()){
  if(!student)return student;
  if(isNewModel(student)){student.paid=paymentTotal(student);student.required=requiredAmount(student,asOf);}
  return student;
}
function reconcileAllStudents(asOf=today()){students.forEach(student=>reconcileStudent(student,asOf));}
function saveStudentsClean(){reconcileAllStudents();saveStudents();B.persistExtrasSoon?.();}
function targetRemaining(student,targetMonth=null,asOf=today()){
  if(!isDynamicMonthly(student))return remainingAmount(student,asOf);
  const monthNumber=clampMonth(targetMonth||1),fee=feeOf(student),{monthPaid}=dynamicAllocation(student,asOf,null,monthNumber);
  return Math.max(0,fee-Number(monthPaid[monthNumber-1]||0)-waiverAmountFor(student,monthNumber,asOf));
}
function paymentAllocations(student,paymentIndex,asOf=today()){
  if(!isDynamicMonthly(student))return[];
  const index=Number(paymentIndex);if(!Number.isInteger(index)||index<0)return[];
  const payment=student.payments?.[index];if(!payment)return[];
  const explicit=explicitOf(payment),minCount=Math.max(targetOf(payment),...explicit.map(item=>item.monthNumber),1);
  return dynamicAllocation(student,asOf,null,minCount).allocations.filter(item=>item.paymentIndex===index);
}
function allocationSummary(student,paymentIndex,asOf=today()){
  const parts=paymentAllocations(student,paymentIndex,asOf).map(item=>{
    if(item.after>=item.fee){if(item.before>0)return`إكمال الشهر ${item.monthNumber} (${cash(item.amount)})`;return`الشهر ${item.monthNumber} كامل`;}
    return`جزء من الشهر ${item.monthNumber} (${cash(item.after)} من ${cash(item.fee)})`;
  });
  return parts.join(' + ')||'دفعة شهرية';
}
function allocationMonthLabel(student,paymentIndex,asOf=today()){
  const numbers=[...new Set(paymentAllocations(student,paymentIndex,asOf).map(item=>item.monthNumber))];
  return numbers.join('، ')||String(targetOf(student.payments?.[paymentIndex]));
}
function defaultDescription(value){const text=String(value||'').trim();return !text||/^دفعة(?:\s+الشهر|\s+تسجيل|\s+مستحقات)/.test(text);}
// Preview and commit share the source-order allocator and selected receipt date.
// No student, payment, identity or persisted state is changed by the preview.
function previewMonthlyPaymentAllocation(student,{amount,date=today(),targetMonth=null}={}){
  const value=Number(amount||0),fee=feeOf(student),asOf=String(date||today());
  if(!Number.isFinite(value)||!Number.isFinite(fee)||value<=0||fee<=0)throw new Error('المبلغ غير صالح.');
  const plan=installmentPlan(student,asOf),firstOpen=plan.find(month=>month.remaining>0),fallback=(plan.at(-1)?.number||0)+1,monthNumber=clampMonth(Number(targetMonth)||firstOpen?.number||fallback||1);
  const payments=[...(student.payments||[]),[asOf,value,'','',0,'','',monthNumber]],index=payments.length-1,draft={...student,payments};
  const allocations=paymentAllocations(draft,index,asOf),allocated=allocations.reduce((sum,item)=>sum+item.amount,0);
  if(!allocations.length||Math.round(allocated*100)!==Math.round(value*100))throw new Error('قيمة الدفعة تتجاوز الحد المدعوم للأشهر المقدمة.');
  // A backdated addition must also fit when later receipts become visible.
  // It must not create missing coverage past MAX_MONTHS or frozen obligations.
  const eventual=dynamicAllocation(draft,'9999-12-31');
  if(eventual.unallocated.some(item=>item.paymentIndex===index&&item.amount>0))throw new Error('قيمة الدفعة تتجاوز الحد المدعوم للأشهر المقدمة.');
  return{monthNumber,allocations,summary:allocationSummary(draft,index,asOf),remaining:targetRemaining(draft,monthNumber,asOf)};
}
function appendPayment(student,{amount,method,date=today(),time=nowTime(),description='',targetMonth=null,debtDueDate=null,persist=true}={}){
  if(!student)throw new Error('الطالب غير موجود.');
  assertStudentLifecycleWriteIdleV71(student);
  window.EFC_FISCAL_V14?.assertDateOpen?.(String(date||today()),'تاريخ الدفعة');
  const before=clone(student),firstRegistration=!(student.payments||[]).some(payment=>Number(payment?.[1]||0)>0);
  const markRegistration=index=>{if(firstRegistration){student.registrationPaymentCode=String(student.payments?.[index]?.[6]||'');student.registrationPaymentInferred=false;}};
  const rollback=error=>{Object.keys(student).forEach(key=>delete student[key]);Object.assign(student,before);throw error;};
  if(!isDynamicMonthly(student)){
    if(Number(amount||0)>remainingAmount(student,String(date||today())))throw new Error('المبلغ أكبر من المتبقي بعد الإعفاء. يجب إلغاء الإعفاء قبل تحصيل المبلغ المعفى.');
    try{
    const index=B.appendPayment(student,{amount,method,date,time,description,targetMonth,debtDueDate,persist:false}),stamp=Date.now();
    if(student.payments?.[index])student.payments[index][11]=stamp;
    markRegistration(index);
    student.updatedAt=Math.max(stamp,Number(student.updatedAt||0)+1);
    if(persist)saveStudentsClean();
    return index;
    }catch(error){return rollback(error);}
  }
  const value=Number(amount||0),selected=String(method||'').trim();if(!selected)throw new Error('اختر وسيلة الدفع.');
  const preview=previewMonthlyPaymentAllocation(student,{amount:value,date,targetMonth}),monthNumber=preview.monthNumber;
  try{
  const index=student.payments.length,transactionCode=window.EFC_CODES?.newTransactionCode?.(student)||uid('tx'),stamp=Date.now(),original=String(description||'').trim();
  student.payments.push([String(date),value,selected,String(time||nowTime()),stamp,defaultDescription(original)?preview.summary:`${preview.summary} — ${original}`,transactionCode,monthNumber,null,debtDueDate?String(debtDueDate):null,preview.allocations.map(item=>({monthNumber:item.monthNumber,amount:item.amount})),stamp]);
  markRegistration(index);
  student.updatedAt=Math.max(stamp,Number(student.updatedAt||0)+1);
  reconcileStudent(student,String(date||today()));
  const remaining=targetRemaining(student,monthNumber,String(date||today()));
  B.setDebtDate(student,String(monthNumber),remaining>0&&debtDueDate?debtDueDate:null);
  if(persist)saveStudentsClean();
  return index;
  }catch(error){return rollback(error);}
}

function customDescription(value){
  const text=String(value||'').trim();if(!text)return'';
  const marker=' — ';if(text.includes(marker))return text.split(marker).slice(1).join(marker).trim();
  if(/^(?:الشهر\s+\d|جزء من الشهر|إكمال الشهر|دفعة شهرية|دفعة تسجيل|دفعة مستحقات|دفعة طالب)/.test(text))return'';
  return text;
}
function historicalCourseShape(student,item,specialtyChanged){
  const snapshot=student?.snapshot||{};
  if(specialtyChanged){const type=B.courseTypeOf(item),monthly=type==='normal',durationValue=monthly?1:Math.max(1,Number(item.quickDays||item.durationValue||1));return{type,monthly,durationValue,durationUnit:monthly?'month':String(item.durationUnit||'day')};}
  let type=String(snapshot.courseType||'');
  if(type!=='normal'&&type!=='quick')type=snapshot.billing==='monthly'?'normal':snapshot.billing==='one_time'?'quick':B.courseTypeOf(item);
  const monthly=type==='normal',durationValue=monthly?1:Math.max(1,Number(snapshot.durationValue||item.quickDays||item.durationValue||1)),durationUnit=monthly?'month':String(snapshot.durationUnit||item.durationUnit||'day');
  return{type,monthly,durationValue,durationUnit};
}
function updateStudentRegistration(student,changes={}){
  if(!student)throw new Error('الطالب غير موجود.');
  assertStudentLifecycleWriteIdleV71(student);
  const protectedLifecycle=pausesOf(student).length>0||waiversOf(student).length>0;
  if(protectedLifecycle&&((changes.start!==undefined&&String(changes.start)!==String(student.start))||(changes.fee!==undefined&&Number(changes.fee)!==Number(student.snapshot?.fee||student.required||0))||(changes.branch!==undefined&&String(changes.branch)!==String(student.branch))||(changes.specialty!==undefined&&String(changes.specialty)!==String(student.specialty))))throw new Error('لا يمكن تغيير بداية الدورة أو سعرها أو مركزها أو نوعها بعد تسجيل توقف أو استئناف أو إعفاء. تبقى تعديلات الاسم والهاتف والروسيات الآمنة متاحة.');
  if(changes.reg!==undefined&&Number(changes.reg)!==Number(student.reg))throw new Error('رقم السجل ثابت ولا يمكن تغييره بعد إنشاء ملف الطالب.');
  const requestedSpecialty=String(changes.specialty??student.specialty),item=typeof spec==='function'?spec(requestedSpecialty):null;if(!item)throw new Error('الدورة المحددة غير موجودة.');
  const draft=clone(student),wasMonthly=isDynamicMonthly(student),specialtyChanged=String(item.id)!==String(student.specialty),shape=historicalCourseShape(student,item,specialtyChanged),type=shape.type,monthly=shape.monthly;
  const name=String(changes.name??draft.name??'').trim();if(!name)throw new Error('اسم الطالب مطلوب.');
  const branch=String(changes.branch??draft.branch??'').trim();if(!branch)throw new Error('المركز مطلوب.');
  const start=String(changes.start??draft.start??'').trim();if(!start)throw new Error('تاريخ البداية مطلوب.');
  const datedStop=isInactive(student)&&student.stopEndBasis==='effective-date';
  if(datedStop&&(!isCalendarDate(start)||start>student.stoppedAt))throw new Error('تاريخ بداية الدورة يجب أن يكون في تاريخ الإيقاف أو قبله.');
  const fee=Math.max(0,Number(changes.fee??draft.snapshot?.fee??draft.required??0));if(fee<=0)throw new Error('سعر الدورة غير صالح.');
  const scopeChanged=String(branch)!==String(student.branch||'')||String(item.id)!==String(student.specialty||'');
  if(scopeChanged){const duplicate=students.find(other=>other!==student&&(!student.id||!other?.id||String(other.id)!==String(student.id))&&String(other?.branch||'')===branch&&String(other?.specialty||'')===String(item.id)&&Number(other?.reg)===Number(draft.reg));if(duplicate)throw new Error(`رقم السجل ${String(draft.reg??'').padStart(4,'0')} مستخدم مسبقًا لطالب آخر في المركز والدورة المحددين.`);}
  draft.name=name;draft.phone=String(changes.phone??draft.phone??'').trim();draft.branch=branch;draft.specialty=String(item.id);draft.start=start;draft.end=protectedLifecycle?String(student.end||''):datedStop?student.stoppedAt:monthly?'':addDuration(start,shape.durationValue,shape.durationUnit);
  draft.snapshot={...(draft.snapshot||{}),centerOpsV13:true,centerOpsMonthlyV13:monthly,dynamicMonthly:monthly,courseType:type,billing:monthly?'monthly':'one_time',fee,durationValue:shape.durationValue,durationUnit:shape.durationUnit};
  if(changes.schedule){draft.schedule=clone(changes.schedule);draft.schedule.specialtyId=String(item.id);draft.schedule.specialtyName=String(item.name||'');}
  draft.payments=Array.isArray(draft.payments)?draft.payments.map(payment=>Array.isArray(payment)?[...payment]:[]):[];
  const rawIndex=changes.paymentIndex,index=rawIndex===null||rawIndex===undefined||rawIndex===''?null:Number(rawIndex);
  if(index!==null&&(!Number.isInteger(index)||index<0||!draft.payments[index]))throw new Error('الدفعة المرتبطة بالروسي غير موجودة.');
  const notes=draft.payments.map(payment=>customDescription(payment?.[5]));
  let effectiveIndex=index;
  if(effectiveIndex===null&&changes.createRegistrationPayment===true&&Math.max(0,Number(changes.paymentAmount||0))>0){
    const amount=Math.max(0,Number(changes.paymentAmount||0)),method=String(changes.paymentMethod||'').trim();if(!method)throw new Error('اختر وسيلة الدفع.');
    const stamp=Date.now(),transactionCode=window.EFC_CODES?.newTransactionCode?.(draft)||uid('tx'),description=String(changes.paymentDescription||'').trim(),receipt=String(changes.registrationReceiptNo??draft.registrationReceiptNo??'').trim();
    draft.payments.push([String(changes.paymentDate||start),amount,method,String(changes.paymentTime||nowTime()),stamp,description,transactionCode,monthly?1:null,receipt||null,changes.debtDueDate?String(changes.debtDueDate):null,null,stamp]);
    effectiveIndex=draft.payments.length-1;notes.push(description);
    if(!(student.payments||[]).some(payment=>Number(payment?.[1]||0)>0)){draft.registrationPaymentCode=transactionCode;draft.registrationPaymentInferred=false;}
  }
  const editStamp=Math.max(Date.now(),Number(student.updatedAt||0)+1);
  if(effectiveIndex!==null){
    const existingPayment=draft.payments[effectiveIndex],candidatePaymentDate=String(changes.paymentDate??existingPayment?.[0]??start);window.EFC_FISCAL_V14?.assertDateOpen?.(candidatePaymentDate,'تاريخ الدفعة');
    const payment=draft.payments[effectiveIndex],amount=Math.max(0,Number(changes.paymentAmount??payment[1]??0));if(amount<=0)throw new Error('مبلغ الدفعة يجب أن يكون أكبر من صفر.');
    const method=String(changes.paymentMethod??payment[2]??'').trim();if(!method)throw new Error('اختر وسيلة الدفع.');
    payment[0]=String(changes.paymentDate??payment[0]??start);payment[1]=amount;payment[2]=method;
    if(changes.paymentTime!==undefined)payment[3]=String(changes.paymentTime||payment[3]||nowTime());
    if(changes.paymentDescription!==undefined)notes[effectiveIndex]=String(changes.paymentDescription||'').trim();
    payment[9]=changes.debtDueDate?String(changes.debtDueDate):null;payment[11]=editStamp;
  }
  if(monthly&&(datedStop||protectedLifecycle)){
    // Keep the original payment allocation hints. Amounts beyond the dated
    // cutoff are credit, so a later name or receipt edit must not reject them.
    if(datedStop)draft.frozenMonths=monthsStartedThrough(draft,draft.stoppedAt);
  }else if(monthly){
    draft.debtDueDates={};
    draft.payments.forEach(payment=>{if(!wasMonthly||!Number.isInteger(Number(payment?.[7]))||Number(payment?.[7])<1)payment[7]=1;payment[10]=null;});
    const farFuture='9999-12-31',allocation=dynamicAllocation(draft,farFuture,null,MAX_MONTHS);
    draft.payments.forEach((payment,paymentIndex)=>{
      const value=Math.max(0,Number(payment?.[1]||0));if(!value)return;
      const parts=allocation.allocations.filter(entry=>entry.paymentIndex===paymentIndex),allocated=parts.reduce((sum,entry)=>sum+Number(entry.amount||0),0);
      if(Math.round(allocated*100)!==Math.round(value*100))throw new Error('تعذر توزيع الدفعات بعد التعديل ضمن الحد المدعوم للأشهر.');
      payment[10]=parts.map(entry=>({monthNumber:entry.monthNumber,amount:entry.amount}));
      payment[7]=parts[0]?.monthNumber||clampMonth(payment[7]||1);
    });
    draft.payments.forEach((payment,paymentIndex)=>{if(Number(payment?.[1]||0)<=0)return;const summary=allocationSummary(draft,paymentIndex,farFuture),note=notes[paymentIndex];payment[5]=note?`${summary} — ${note}`:summary;});
    draft.payments.forEach(payment=>{
      if(!payment?.[9])return;
      const month=clampMonth(payment[7]||1),remaining=targetRemaining(draft,month,farFuture);
      if(remaining>0)draft.debtDueDates[String(month)]=String(payment[9]);else payment[9]=null;
    });
  }else{
    const total=paymentTotal(draft);if(total>fee)throw new Error(`إجمالي دفعات هذا الطالب (${cash(total)}) أكبر من سعر الدورة الجديد (${cash(fee)}). خفّض الدفعة أو ارفع سعر الدورة قبل الحفظ.`);
    if(!protectedLifecycle)draft.payments.forEach((payment,paymentIndex)=>{payment[7]=null;payment[10]=null;if(notes[paymentIndex])payment[5]=notes[paymentIndex];else if(!String(payment[5]||'').trim()||wasMonthly)payment[5]=paymentIndex===0?'دفعة تسجيل':'دفعة مستحقات';});
    const remaining=Math.max(0,fee-total),due=[...draft.payments].reverse().find(payment=>String(payment?.[9]||'').trim())?.[9]||String(changes.debtDueDate||'');
    draft.debtDueDates=remaining>0&&due?{course:String(due)}:{};
    if(!remaining&&!protectedLifecycle)draft.payments.forEach(payment=>{payment[9]=null;});
  }
  const scopeRetarget=scopeChanged&&typeof window.EFC_ACCOUNTING_INTEGRITY_V21?.retargetStudentPaymentScopes==='function'?window.EFC_ACCOUNTING_INTEGRITY_V21.retargetStudentPaymentScopes(draft):{updated:0,skippedClosed:0};
  reconcileStudent(draft);draft.updatedAt=editStamp;
  const history=Array.isArray(draft.registrationEditHistory)?draft.registrationEditHistory:[];
  history.push({at:editStamp,paymentIndex:effectiveIndex,transactionCode:effectiveIndex!==null?String(draft.payments[effectiveIndex]?.[6]||''):null,receipt:effectiveIndex!==null?String(draft.payments[effectiveIndex]?.[8]||draft.registrationReceiptNo||''):String(draft.registrationReceiptNo||''),fromBranch:String(student.branch||''),toBranch:String(draft.branch||''),fromSpecialty:String(student.specialty||''),toSpecialty:String(draft.specialty||''),retargetedPaymentScopes:Number(scopeRetarget?.updated||0),preservedClosedPaymentScopes:Number(scopeRetarget?.skippedClosed||0)});
  draft.registrationEditHistory=history.slice(-50);
  const before=clone(student);Object.assign(student,draft);reconcileStudent(student);
  try{saveStudentsClean();}catch(error){Object.keys(student).forEach(key=>delete student[key]);Object.assign(student,before);reconcileStudent(student);throw error;}
  return{student,paymentIndex:effectiveIndex};
}

function monthlyCoverageEnd(student,asOf=today()){
  if(!isDynamicMonthly(student))return String(student?.end||'');
  if(isInactive(student))return String(student?.end||'');
  if(!student?.start)return'';
  const plan=installmentPlan(student,asOf);
  if(!plan.length)return addDays(cycleSchedule(student,1,asOf).end,1);
  const firstOutstanding=plan.find(month=>Number(month?.remaining||0)>0);
  if(firstOutstanding)return String(firstOutstanding.renewalDate||firstOutstanding.dueDate||addDuration(student.start,Number(firstOutstanding.number||1),'month'));
  const last=plan.at(-1);
  return addDays(cycleSchedule(student,Math.max(1,Number(last?.number||1)),asOf).end,1);
}

function monthlyFocus(student,asOf=today(),paidOverride=null){
  if(!isDynamicMonthly(student))return baseMonthlyFocus?baseMonthlyFocus(student,asOf,paidOverride):null;
  const plan=installmentPlan(student,asOf,paidOverride),first=plan.find(month=>month.remaining>0);if(!plan.length)return null;
  if(!first){const last=plan.at(-1),waived=plan.some(month=>month.waived>0);return{state:'complete',number:last.number,label:`الشهر ${last.number} ${waived?'مسوّى بإعفاء':'مدفوع كامل'}`,dueAmount:0,dueDate:last.renewalDate||last.dueDate,renewalDate:last.renewalDate||last.dueDate,plan,prepaid:Boolean(last.prepaid)};}
  const labels={partial:'دفع جزئي',overdue:'دين',due:'مستحق',upcoming:'لم يحن'};
  return{state:first.state,number:first.number,label:`الشهر ${first.number} ${labels[first.state]||'مستحق'}`,dueAmount:['partial','overdue','due'].includes(first.state)?first.remaining:0,dueDate:first.renewalDate||first.dueDate,renewalDate:first.renewalDate||first.dueDate,plan,prepaid:Boolean(first.prepaid)};
}
function financialStatusV14(student){
  if(remainingAmount(student)===0&&remainingAmountBeforeWaiver(student)>0)return'مسوّى بإعفاء';
  if(!isDynamicMonthly(student))return baseFinancialStatus?baseFinancialStatus(student):B.remainingAmount(student)===0?'مدفوع كامل':paymentTotal(student)===0?'لم يدفع':'دفع جزئي';
  const focus=monthlyFocus(student);if(!focus)return remainingAmount(student)>0?'لم يدفع':'مدفوع كامل';
  if(focus.state==='complete')return'مدفوع كامل';if(focus.state==='partial')return'دفع جزئي';if(focus.state==='overdue')return'دين';if(focus.state==='due')return'مستحق';return paymentTotal(student)>0?'مدفوع كامل':'لم يدفع';
}
function stoppedStudentEndDate(student,stopDate=today()){
  const stopped=String(stopDate||today()),previous=String(student?.end||'').trim();
  if(!isDynamicMonthly(student))return previous&&previous<stopped?previous:stopped;
  const paidPlan=installmentPlan(student,stopped),lastFullyPaid=[...paidPlan].reverse().find(month=>Number(month?.fee||0)>0&&Number(month?.paid||0)>=Number(month?.fee||0));
  if(!lastFullyPaid)return stopped;
  const paidThrough=cycleSchedule(student,Number(lastFullyPaid.number||1),stopped).end;
  return paidThrough>stopped?paidThrough:stopped;
}
function isCalendarDate(value){
  if(!/^\d{4}-\d{2}-\d{2}$/.test(value))return false;
  const date=new Date(`${value}T00:00:00Z`);
  return Number.isFinite(date.getTime())&&date.toISOString().slice(0,10)===value;
}
function monthsStartedThrough(student,date){
  let count=0;
  while(count<MAX_MONTHS&&cycleSchedule(student,count+1,date).start<=date)count+=1;
  return count;
}
function stopStudent(student,reason='',effectiveDate,persist=true){
  if(!student)return;
  assertStudentLifecycleWriteIdleV71(student);
  const auth=window.EFC_AUTH_V13;
  if(auth?.canEdit?.('students')===false)throw new Error('الحساب الحالي لا يملك صلاحية إيقاف الطالب.');
  if(isInactive(student))throw new Error('الطالب موقوف بالفعل.');
  const current=today(),dated=effectiveDate!==undefined;
  const stopped=dated?String(effectiveDate??'').trim():current;
  const monthly=isDynamicMonthly(student),start=String(student.start||'');
  if(dated){
    if(!isCalendarDate(stopped))throw new Error('اختر تاريخ إيقاف صالحًا.');
    if(stopped>current)throw new Error('تاريخ الإيقاف لا يمكن أن يكون بعد اليوم.');
    if(monthly&&!isCalendarDate(start))throw new Error('تاريخ بداية الدورة غير صالح.');
    if(isCalendarDate(start)&&stopped<start)throw new Error('تاريخ الإيقاف لا يمكن أن يكون قبل بداية الدورة.');
    if(stopped<current&&auth&&auth.currentUser?.()?.role!=='admin')throw new Error('اختيار تاريخ إيقاف سابق متاح للمسؤول فقط.');
  }
  window.EFC_FISCAL_V14?.assertDateOpen?.(stopped,'تاريخ الإيقاف');
  const previousPause=pausesOf(student).at(-1);if(previousPause?.resumedAt&&stopped<previousPause.resumedAt)throw new Error('تاريخ الإيقاف لا يمكن أن يسبق آخر استئناف مسجل.');

  const before={...student},previousEnd=String(student.end||'').trim();
  const end=dated&&monthly?stopped:stoppedStudentEndDate(student,stopped);
  const frozenMonths=monthly?(dated?monthsStartedThrough(student,stopped):installmentPlan(student,stopped).filter(month=>month.dueDate<=stopped||month.paid>0).length):null;
  try{
    if(previousEnd&&!student.scheduledEndBeforeStop)student.scheduledEndBeforeStop=previousEnd;
    if(monthly)student.frozenMonths=frozenMonths;
    student.end=end;
    student.stopEndBasis=dated&&monthly?'effective-date':end>stopped?'paid-through':'stopped-at';
    student.active=false;
    student.status='inactive';
    student.stoppedAt=stopped;
    student.stopReason=String(reason||'').trim();
    student.updatedAt=Math.max(Date.now(),Number(student.updatedAt||0)+1,Number(student.lifecycleStateUpdatedAt||0)+1);
    student.lifecycleStateUpdatedAt=student.updatedAt;
    const lifecycle=clone(lifecycleOf(student));lifecycle.version=1;lifecycle.revision=student.updatedAt;lifecycle.pauses=Array.isArray(lifecycle.pauses)?lifecycle.pauses:[];lifecycle.waivers=Array.isArray(lifecycle.waivers)?lifecycle.waivers:[];
    lifecycle.pauses.push({id:`${uid('pause')}-${student.updatedAt}`,stoppedAt:stopped,afterMonthNumber:monthly?frozenMonths:null,reason:String(reason||'').trim(),stoppedBy:String(auth?.currentUser?.()?.username||''),coveredThrough:monthly?cycleSchedule(student,Math.max(1,frozenMonths),stopped).end:String(previousEnd||stopped)});student.billingLifecycleV71=lifecycle;
    reconcileStudent(student,current);
    if(persist)saveStudentsClean();
  }catch(error){
    Object.keys(student).forEach(key=>delete student[key]);
    Object.assign(student,before);
    throw error;
  }
}
function reactivationDraft(student){
  if(!student)throw new Error('الطالب غير موجود.');
  assertStudentLifecycleWriteIdleV71(student);
  if(pausesOf(student).some(pause=>pause.resumedAt)||waiversOf(student).length)throw new Error('هذا الملف يحتوي استئنافًا أو إعفاءً محفوظًا. استخدم استئناف الدراسة للحفاظ على الفترات والديون.');
  const auth=window.EFC_AUTH_V13,current=today(),stopped=String(student.stoppedAt||'');
  if(auth?.currentUser?.()?.role!=='admin'||auth?.canEdit?.('students')===false)throw new Error('إلغاء الإيقاف متاح للمسؤول فقط.');
  if(!students.includes(student))throw new Error('ملف الطالب لم يعد موجودًا.');
  if(!isInactive(student))throw new Error('الطالب غير موقوف.');
  if(!isCalendarDate(student.start)||!isCalendarDate(stopped)||stopped<student.start||stopped>current)throw new Error('لا يمكن إلغاء الإيقاف لأن تاريخ البداية أو الإيقاف غير واضح. راجع بيانات الطالب أولًا.');
  const fiscal=window.EFC_FISCAL_V14;
  if(typeof fiscal?.assertDateOpen!=='function')throw new Error('التحقق من السنة المالية لم يجهز بعد. أعد المحاولة بعد اكتمال تحميل البرنامج.');
  fiscal.assertDateOpen(stopped,'تاريخ الإيقاف المراد إلغاؤه');
  const draft=clone(student),monthly=isDynamicMonthly(student);
  draft.active=true;draft.status='active';
  if(monthly)draft.end='';
  else{
    let end=String(student.scheduledEndBeforeStop||'');
    if(!end){
      const duration=Number(student.snapshot?.durationValue||0),unit=String(student.snapshot?.durationUnit||'');
      if(!Number.isInteger(duration)||duration<=0||!['day','week','month'].includes(unit))throw new Error('نهاية الدورة الأصلية غير محفوظة؛ لا يمكن إلغاء الإيقاف تلقائيًا دون تحديدها.');
      end=addDuration(student.start,duration,unit);
    }
    if(!isCalendarDate(end)||end<student.start)throw new Error('نهاية الدورة الأصلية غير صالحة.');
    draft.end=end;
  }
  for(const key of ['stoppedAt','stopReason','stopEndBasis','frozenMonths','scheduledEndBeforeStop'])delete draft[key];
  if(draft.billingLifecycleV71){draft.billingLifecycleV71.pauses=[];}
  const beforePlan=monthly?installmentPlan(student,current):[],afterPlan=monthly?installmentPlan(draft,current):[];
  afterPlan.filter(month=>month.number>beforePlan.length).forEach(month=>fiscal.assertDateOpen(month.monthStart||month.dueDate,'شهر يُعاد احتسابه بعد إلغاء الإيقاف'));
  const unallocated=value=>monthly?dynamicAllocation(value,current).unallocated.reduce((sum,item)=>sum+Number(item.amount||0),0):0;
  const preview={asOf:current,stoppedAt:stopped,monthly,beforeRequired:requiredAmount(student,current),afterRequired:requiredAmount(draft,current),beforeRemaining:remainingAmount(student,current),afterRemaining:remainingAmount(draft,current),beforeUnallocated:unallocated(student),afterUnallocated:unallocated(draft),beforeMonths:beforePlan.length,afterMonths:afterPlan.length,restoredMonths:Math.max(0,afterPlan.length-beforePlan.length),restoredEnd:draft.end};
  reconcileStudent(draft,current);return{draft,preview};
}
function previewStudentReactivation(student){return reactivationDraft(student).preview;}
async function reactivateStudent(student){
  const {draft,preview}=reactivationDraft(student);
  if(typeof window.EFC_FORCE_PERSIST!=='function')throw new Error('خدمة الحفظ لم تجهز بعد. أعد المحاولة بعد اكتمال تحميل البرنامج.');
  const stamp=Math.max(Date.now(),Number(student.updatedAt||0)+1,Number(student.lifecycleStateUpdatedAt||0)+1);
  const history=Array.isArray(draft.stopCorrectionHistory)?draft.stopCorrectionHistory:[];
  history.push({at:stamp,by:String(window.EFC_AUTH_V13?.currentUser?.()?.username||''),stoppedAt:String(student.stoppedAt||''),stopReason:String(student.stopReason||''),stopEndBasis:String(student.stopEndBasis||''),frozenMonths:student.frozenMonths??null,end:String(student.end||''),restoredEnd:String(draft.end||'')});
  draft.stopCorrectionHistory=history.slice(-20);draft.updatedAt=stamp;draft.lifecycleStateUpdatedAt=stamp;
  return commitLifecycleV71(student,draft,preview);
}
function billingCycleStartV71(student,number,asOf=today()){return cycleSchedule(student,Math.max(1,Number(number)||1),asOf).start;}
function billingCycleEndV71(student,number,asOf=today()){return cycleSchedule(student,Math.max(1,Number(number)||1),asOf).end;}
function lifecycleGuardV71(student,{admin=true,date=today()}={}){
  assertStudentLifecycleWriteIdleV71(student);
  if(!student||!students.includes(student))throw new Error('ملف الطالب غير موجود.');
  const auth=window.EFC_AUTH_V13;
  if(auth?.canEdit?.('students')===false||(admin&&auth?.currentUser?.()?.role!=='admin'))throw new Error(admin?'هذا الإجراء متاح للمسؤول فقط.':'الحساب الحالي لا يملك صلاحية تعديل الطلاب.');
  if(!isCalendarDate(String(date))||date>today()||!isCalendarDate(String(student.start))||date<student.start)throw new Error('اختر تاريخًا صالحًا بين بداية الدورة واليوم.');
  const fiscal=window.EFC_FISCAL_V14;if(typeof fiscal?.assertDateOpen!=='function')throw new Error('التحقق من السنة المالية لم يجهز بعد.');fiscal.assertDateOpen(date,'تاريخ الإجراء');
  return String(date);
}
function lifecycleDraftV71(student){
  const draft=clone(student),state=clone(lifecycleOf(student));state.version=1;state.pauses=Array.isArray(state.pauses)?state.pauses:[];state.waivers=Array.isArray(state.waivers)?state.waivers:[];draft.billingLifecycleV71=state;return draft;
}
function ensureOpenPauseV71(draft){
  if(!isInactive(draft)||!isCalendarDate(String(draft.stoppedAt||''))||draft.stoppedAt<draft.start)throw new Error('تاريخ إيقاف الطالب غير واضح؛ لا يمكن إنشاء استئناف أو إعفاء تلقائيًا.');
  const state=draft.billingLifecycleV71,existing=state.pauses.at(-1);if(existing&&!existing.resumedAt)return existing;
  const monthly=isDynamicMonthly(draft),months=monthly?installmentPlan(draft,today()).length:null;
  if(monthly&&(!Number.isInteger(months)||months<1||months>MAX_MONTHS))throw new Error('أشهر الالتزام قبل الإيقاف غير واضحة.');
  const pause={id:`${uid('pause')}-legacy-${Math.max(1,Number(draft.lifecycleStateUpdatedAt||draft.updatedAt||Date.now()))}`,stoppedAt:String(draft.stoppedAt),afterMonthNumber:months,reason:String(draft.stopReason||''),stoppedBy:'',coveredThrough:monthly?cycleSchedule(draft,months,draft.stoppedAt).end:String(draft.scheduledEndBeforeStop||draft.end||draft.stoppedAt)};state.pauses.push(pause);return pause;
}
function lifecyclePreviewV71(student,draft,{date=today(),waivedNow=0,restoredDebt=0,nextCycleStart='',coveredThrough=''}={}){
  const monthly=isDynamicMonthly(student);return{date,monthly,beforeRemaining:remainingAmount(student),afterRemaining:remainingAmount(draft),beforeWaived:studentDebtWaiverSummaryV71(student).activeAmount,afterWaived:studentDebtWaiverSummaryV71(draft).activeAmount,waivedNow,restoredDebt,nextCycleStart,coveredThrough,beforeMonths:monthly?installmentPlan(student).length:0,afterMonths:monthly?installmentPlan(draft).length:0,afterRequired:requiredAmount(draft)};
}
function addWaiverV71(draft,{date=today(),reason=''}={}){
  const parts=isDynamicMonthly(draft)?installmentPlan(draft).filter(month=>month.remaining>0).map(month=>({monthNumber:month.number,amount:month.remaining})):[{monthNumber:null,amount:remainingAmount(draft)}].filter(part=>part.amount>0),amount=parts.reduce((sum,part)=>sum+part.amount,0);
  if(amount>0){const at=Math.max(Date.now(),Number(draft.lifecycleStateUpdatedAt||0)+1,Number(draft.updatedAt||0)+1);draft.billingLifecycleV71.waivers.push({id:`${uid('waiver')}-${at}`,at,date:String(date),reason:String(reason||'').trim(),by:String(window.EFC_AUTH_V13?.currentUser?.()?.username||''),parts});}
  return amount;
}
function prepareStopV71(student,{date=today(),reason='',waiveDebt=false}={}){
  date=lifecycleGuardV71(student,{admin:Boolean(waiveDebt),date:String(date)});if(waiveDebt&&window.EFC_AUTH_V13?.currentUser?.()?.role!=='admin')throw new Error('الإعفاء متاح للمسؤول فقط.');
  const draft=lifecycleDraftV71(student);stopStudent(draft,reason,date,false);const adjustmentDate=today();if(waiveDebt)window.EFC_FISCAL_V14.assertDateOpen(adjustmentDate,'تاريخ الإعفاء');const waivedNow=waiveDebt?addWaiverV71(draft,{date:adjustmentDate,reason}):0;reconcileStudent(draft);return{draft,preview:{...lifecyclePreviewV71(student,draft,{date,waivedNow}),adjustmentDate}};
}
function previewStudentStopV71(student,options={}){return prepareStopV71(student,options).preview;}
async function stopStudentWithOptionsV71(student,options={}){const {draft,preview}=prepareStopV71(student,options);return commitLifecycleV71(student,draft,preview);}
function prepareWaiverV71(student,{date=today(),reason=''}={}){
  date=lifecycleGuardV71(student,{date:String(date)});const draft=lifecycleDraftV71(student);ensureOpenPauseV71(draft);if(date<draft.stoppedAt)throw new Error('تاريخ الإعفاء لا يمكن أن يسبق الإيقاف.');const waivedNow=addWaiverV71(draft,{date,reason});if(!waivedNow)throw new Error('لا يوجد متبقٍ قابل للإعفاء.');reconcileStudent(draft);return{draft,preview:lifecyclePreviewV71(student,draft,{date,waivedNow})};
}
function previewStudentDebtWaiverV71(student,options={}){return prepareWaiverV71(student,options).preview;}
async function waiveStudentDebtV71(student,options={}){const {draft,preview}=prepareWaiverV71(student,options);return commitLifecycleV71(student,draft,preview);}
function prepareResumptionV71(student,{date=today(),restoreWaivedDebt=false}={}){
  date=lifecycleGuardV71(student,{date:String(date)});const draft=lifecycleDraftV71(student),pause=ensureOpenPauseV71(draft);if(date<pause.stoppedAt)throw new Error('تاريخ الاستئناف لا يمكن أن يسبق الإيقاف.');
  let restoredDebt=0;
  if(restoreWaivedDebt){
    const before=remainingAmount(draft),adjustmentDate=today();window.EFC_FISCAL_V14.assertDateOpen(adjustmentDate,'تاريخ استعادة الدين');draft.billingLifecycleV71.waivers.filter(entry=>!entry.reversedDate).forEach(entry=>{entry.reversedAt=Math.max(Date.now(),Number(draft.lifecycleStateUpdatedAt||0)+1);entry.reversedDate=adjustmentDate;entry.reversedBy=String(window.EFC_AUTH_V13?.currentUser?.()?.username||'');});restoredDebt=Math.max(0,remainingAmount(draft)-before);
  }
  const monthly=isDynamicMonthly(draft);let nextCycleStart=date,coveredThrough=String(pause.coveredThrough||'');
  if(monthly){
    const after=Number(pause.afterMonthNumber);if(!Number.isInteger(after)||after<1||after>=MAX_MONTHS)throw new Error('وصل الطالب إلى الحد المدعوم للأشهر أو تعذر تحديد الأشهر السابقة.');
    coveredThrough=cycleSchedule(draft,after,pause.stoppedAt).end;nextCycleStart=date>coveredThrough?date:addDays(coveredThrough,1);
    draft.end='';
  }else{
    let originalEnd=String(draft.scheduledEndBeforeStop||pause.coveredThrough||'');
    if(!isCalendarDate(originalEnd)||originalEnd<=pause.stoppedAt){const duration=Number(draft.snapshot?.durationValue||0),unit=String(draft.snapshot?.durationUnit||'');if(Number.isInteger(duration)&&duration>0&&['day','week','month'].includes(unit))originalEnd=addDuration(draft.start,duration,unit);}
    if(!isCalendarDate(originalEnd)||originalEnd<=pause.stoppedAt)throw new Error('المدة المتبقية من الدورة غير واضحة أو انتهت قبل الإيقاف؛ يلزم تسجيل مستقل.');
    const remainingDays=Math.round((new Date(`${originalEnd}T12:00:00Z`)-new Date(`${pause.stoppedAt}T12:00:00Z`))/86400000);draft.end=addDays(date,remainingDays);pause.resumedEnd=draft.end;coveredThrough=originalEnd;
  }
  pause.coveredThrough=coveredThrough;pause.resumedAt=date;pause.nextCycleStart=nextCycleStart;pause.resumedBy=String(window.EFC_AUTH_V13?.currentUser?.()?.username||'');
  draft.active=true;draft.status='active';for(const key of ['stoppedAt','stopReason','stopEndBasis','frozenMonths','scheduledEndBeforeStop'])delete draft[key];reconcileStudent(draft);
  return{draft,preview:{...lifecyclePreviewV71(student,draft,{date,restoredDebt,nextCycleStart,coveredThrough}),adjustmentDate:today()}};
}
function previewStudentResumptionV71(student,options={}){return prepareResumptionV71(student,options).preview;}
async function resumeStudentV71(student,options={}){const {draft,preview}=prepareResumptionV71(student,options);return commitLifecycleV71(student,draft,preview);}
async function commitLifecycleV71(student,draft,preview){
  assertStudentLifecycleWriteIdleV71(student);if(!students.includes(student))throw new Error('ملف الطالب لم يعد موجودًا.');if(typeof window.EFC_FORCE_PERSIST!=='function')throw new Error('خدمة الحفظ لم تجهز بعد.');
  const before=clone(student),stamp=Math.max(Date.now(),Number(student.updatedAt||0)+1,Number(student.lifecycleStateUpdatedAt||0)+1,Number(draft.updatedAt||0)+1);draft.updatedAt=stamp;draft.lifecycleStateUpdatedAt=stamp;
  if(draft.billingLifecycleV71){draft.billingLifecycleV71.version=1;draft.billingLifecycleV71.revision=stamp;}
  lifecycleWritesV71.add(student);Object.keys(student).forEach(key=>delete student[key]);Object.assign(student,draft);
  try{saveStudentsClean();await window.EFC_FORCE_PERSIST();return{student,...preview};}
  catch(error){Object.keys(student).forEach(key=>delete student[key]);Object.assign(student,before);try{saveStudentsClean();await window.EFC_FORCE_PERSIST();}catch(rollbackError){console.error('EFC student lifecycle rollback persistence failed.',rollbackError);}throw error;}
  finally{lifecycleWritesV71.delete(student);}
}
function daysUntil(from,to){const a=new Date(`${String(from)}T12:00:00`),b=new Date(`${String(to)}T12:00:00`);return Math.max(0,Math.round((b-a)/86400000));}
function notificationsForStudent(student){
  if(!student||isInactive(student))return[];
  const asOf=today();
  if(!isDynamicMonthly(student)){
    const remaining=remainingAmount(student,asOf);if(!remaining)return[];
    const notes=B.notificationsForStudent(student);if(!waiversOf(student).length)return notes;
    return notes.map(note=>({...note,amount:remaining,message:`عزيزي الطالب/ة ${student.name}، المتبقي بعد الإعفاء ${cash(remaining)}. موعد السداد ${showDate(note.dueDate)}.`}));
  }
  const focus=monthlyFocus(student,asOf);if(!focus||focus.state==='complete'||focus.state==='upcoming'||focus.state==='partial')return[];
  const course=typeof spec==='function'?(spec(student.specialty)?.name||student.specialty||'الدورة'):(student.specialty||'الدورة'),renewalDate=String(focus.renewalDate||focus.dueDate||''),amount=Math.max(0,Number(focus.dueAmount||0));
  if(focus.state==='due'){
    const days=Math.max(1,daysUntil(asOf,renewalDate)),dayText=days===1?'يوم واحد':days===2?'يومان':`${days} أيام`;
    return[{studentId:student.id,studentName:student.name,kind:'monthly-renewal-warning',title:`تنبيه التجديد — متبقي ${dayText}`,message:`عزيزي الطالب/ة ${student.name}، متبقي ${dayText} على موعد التجديد بتاريخ ${showDate(renewalDate)} لدورة ${course}. المبلغ المطلوب ${cash(amount)}. يمكنك تسويته قبل الموعد حتى يبقى الحساب منتظمًا ولا يتحول الرصيد إلى دين.`,amount,dueDate:renewalDate,monthNumber:focus.number,fee:Number(focus.plan?.find(month=>month.number===focus.number)?.fee||0),state:'due',contextType:'month'}];
  }
  return[{studentId:student.id,studentName:student.name,kind:'monthly-debt',title:`دين قائم — الشهر ${focus.number}`,message:`عزيزي الطالب/ة ${student.name}، بدأ موعد التجديد بتاريخ ${showDate(renewalDate)} وما زال على الحساب دين بقيمة ${cash(amount)} لدورة ${course}. يرجى تسوية الدين لتحديث الحالة المالية.`,amount,dueDate:renewalDate,monthNumber:focus.number,fee:Number(focus.plan?.find(month=>month.number===focus.number)?.fee||0),state:'overdue',contextType:'month'}];
}
function currentNotifications(){return students.flatMap(notificationsForStudent);}

const baseReceiptModel=receiptModelV4;
receiptModelV4=function(student,paymentIndex=null,statement=false){
  reconcileStudent(student);
  const model=baseReceiptModel(student,paymentIndex,statement);if(!model)return model;
  if(statement){model.paid=paymentTotal(student);model.remaining=remainingAmount(student);model.waived=Math.max(0,remainingAmountBeforeWaiver(student)-model.remaining);if(isDynamicMonthly(student))model.plan=installmentPlan(student);return model;}
  if(!isDynamicMonthly(student))return model;
  const index=paymentIndex===null||paymentIndex===undefined?0:Number(paymentIndex);
  const allocations=paymentAllocations(student,index);if(allocations.length){model.month=allocationMonthLabel(student,index);model.desc=allocationSummary(student,index);model.remaining=remainingAmount(student);model.monthAllocations=allocations.map(item=>({monthNumber:item.monthNumber,amount:item.amount,fee:item.fee,before:item.before,after:item.after}));}
  return model;
};

remainingOf=remainingAmount;
installmentPlanV3=installmentPlan;
monthlyFocusV3=monthlyFocus;
dueNowV3=student=>{if(!isDynamicMonthly(student))return waiversOf(student).length?remainingAmount(student):baseDueNow?baseDueNow(student):B.remainingAmount(student);const focus=monthlyFocus(student);return Number(focus?.dueAmount||0);};
suggestedPaymentV3=student=>{if(!isDynamicMonthly(student))return waiversOf(student).length?remainingAmount(student):baseSuggested?baseSuggested(student):remainingAmount(student);const plan=installmentPlan(student),first=plan.find(month=>month.remaining>0);return Number(first?.remaining||feeOf(student));};
allocV4=function(student,paymentIndex){
  if(!isDynamicMonthly(student))return baseAlloc?baseAlloc(student,paymentIndex):{desc:'',before:0,after:0,months:[]};
  const payment=student.payments?.[paymentIndex];if(!payment)return{desc:'',before:0,after:0,months:[]};
  let before=0;for(let i=0;i<paymentIndex;i+=1)before+=Number(student.payments?.[i]?.[1]||0);const amount=Number(payment[1]||0),months=paymentAllocations(student,paymentIndex).map(item=>({n:item.monthNumber,amount:item.amount,before:item.before,after:item.after,fee:item.fee}));
  return{desc:allocationSummary(student,paymentIndex),monthLabel:allocationMonthLabel(student,paymentIndex),before,after:before+amount,months};
};
financialStatus=financialStatusV14;
monthBadgeV3=function(student,asOf=today(),paidOverride=null){const focus=monthlyFocus(student,asOf,paidOverride);if(!focus)return'';const cls=focus.state==='complete'?'good':focus.state==='overdue'?'bad':focus.state==='upcoming'?'neutral':'warn';return`<span class="badge ${cls}">${B.esc(focus.label)}</span>`;};

const next=Object.freeze({...B,requiredAmount,remainingAmount,reconcileStudent,reconcileAllStudents,installmentPlan,dynamicAllocation,targetRemaining,previewMonthlyPaymentAllocation,appendPayment,updateStudentRegistration,stopStudent,previewStudentReactivation,reactivateStudent,previewStudentStopV71,stopStudentWithOptionsV71,previewStudentDebtWaiverV71,waiveStudentDebtV71,previewStudentResumptionV71,resumeStudentV71,remainingAmountBeforeWaiver,studentDebtWaiverSummaryV71,billingCycleStartV71,billingCycleEndV71,assertStudentLifecycleWriteIdleV71,notificationsForStudent,currentNotifications,saveStudents:saveStudentsClean,paymentAllocations,allocationSummary,allocationMonthLabel,visibleMonthCount,monthlyFocus,monthlyCoverageEnd,monthlyPrepayment:true,monthlyCoverageEndForSearch:true,registrationEditAtomic:true,registrationEditStudentScoped:true,monthlyReallocationOnEdit:true,historicalCourseSnapshotPreservedOnEdit:true,registrationScopeEditRetargetsFinance:true,registrationScopeEditRetargetsDailyLedger:true,closedPaymentScopeHistoryPreserved:true,registrationNumberCollisionGuard:true,registrationNumberImmutable:true,registrationCollisionOnlyOnScopeChange:true,zeroPaymentRegistrationCanCreateTransaction:true,rollbackOnLocalSaveFailure:true,revisionStampedPayments:true,stoppedStudentHasEndDate:true,stoppedMonthlyPaidThroughProtected:true,monthlyOpenLeadDays:OPEN_LEAD_DAYS,monthlyRenewalWarningDays:RENEWAL_WARNING_DAYS});
window.EFC_DOMAIN_V13=next;
window.EFC_DOMAIN_V13_READY=Promise.resolve(next);
reconcileAllStudents();
window.EFC_MONTHLY_PREPAYMENT_DOMAIN_V14=Object.freeze({ready:true,maxMonths:MAX_MONTHS,prepayAcrossMonths:true,allocationPersisted:true,nextMonthVisibleBeforeRenewal:true,renewalReminderBeforeStart:true,renewalWarningBeforeMonth:true,renewalWarningDays:RENEWAL_WARNING_DAYS,debtStartsWithUnpaidRenewal:true,inclusiveReminderSalutation:true,atomicRegistrationEdit:true,studentScopedEdits:true,historicalCourseSnapshotPreserved:true,registrationCollisionGuard:true,zeroPaymentRegistrationEdit:true,revisionAwareEdits:true});
})();
