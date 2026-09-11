(()=>{
'use strict';
if(window.EFC_MONTHLY_PREPAYMENT_DOMAIN_V14?.ready)return;
const B=window.EFC_DOMAIN_V13;
if(!B?.ready)throw new Error('Monthly prepayment v14 loaded before domain v13.');

const MAX_MONTHS=240;
const OPEN_LEAD_DAYS=3;
const DUE_GRACE_DAYS=3;
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

function visibleMonthCount(student,asOf=today()){
  if(!isDynamicMonthly(student))return 0;
  if(isInactive(student))return Math.max(0,Number(student.frozenMonths||0));
  if(!student.start)return 0;
  let count=1;
  for(let number=2;number<=MAX_MONTHS;number+=1){
    const monthStart=addDuration(student.start,number-1,'month');
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
  const fee=feeOf(student),count=allocationMonthCount(student,asOf,paidOverride,minCount),monthPaid=Array(count).fill(0),allocations=[];
  const place=(paymentIndex,monthIndex,amount)=>{
    if(monthIndex<0||monthIndex>=count||amount<=0||fee<=0)return 0;
    const before=Math.max(0,Number(monthPaid[monthIndex]||0)),room=Math.max(0,fee-before),used=Math.min(room,amount);
    if(used>0){const after=before+used;monthPaid[monthIndex]=after;allocations.push({paymentIndex,monthNumber:monthIndex+1,amount:used,before,after,fee});}
    return used;
  };
  if(paidOverride!==null&&paidOverride!==undefined){let left=Math.max(0,Number(paidOverride||0));for(let i=0;i<count&&left>0;i+=1)left-=place(-1,i,left);return{monthPaid,allocations,count};}
  (student.payments||[]).forEach((payment,index)=>{
    if(asOf&&paymentDate(payment,student)>asOf)return;
    let left=Math.max(0,Number(payment?.[1]||0));if(left<=0)return;
    const explicit=explicitOf(payment);
    if(explicit.length){
      for(const item of explicit){if(left<=0)break;left-=place(index,item.monthNumber-1,Math.min(left,item.amount));}
      if(left>0){const start=Math.max(0,(explicit.at(-1)?.monthNumber||targetOf(payment))-1);for(let i=start;i<count&&left>0;i+=1)left-=place(index,i,left);}
      return;
    }
    const start=Math.max(0,targetOf(payment)-1);
    for(let i=start;i<count&&left>0;i+=1)left-=place(index,i,left);
  });
  return{monthPaid,allocations,count};
}
function installmentPlan(student,asOf=today(),paidOverride=null,minCount=0){
  if(!isDynamicMonthly(student))return B.installmentPlan(student,asOf,paidOverride);
  const fee=feeOf(student),count=allocationMonthCount(student,asOf,paidOverride,minCount),{monthPaid}=dynamicAllocation(student,asOf,paidOverride,count);
  return Array.from({length:count},(_,index)=>{
    const number=index+1,monthStart=addDuration(student.start,index,'month'),openDate=number===1?monthStart:addDays(monthStart,-OPEN_LEAD_DAYS),dueFrom=number===1?monthStart:addDays(monthStart,DUE_GRACE_DAYS),overdueFrom=addDuration(monthStart,1,'month'),paid=Math.min(fee,Number(monthPaid[index]||0)),remaining=Math.max(0,fee-paid),prepaid=paid>0&&asOf<monthStart;
    let state='upcoming';
    if(!remaining)state='paid';
    else if(paid>0)state='partial';
    else if(asOf>=overdueFrom)state='overdue';
    else if(asOf>=dueFrom)state='due';
    return{number,dueDate:monthStart,monthStart,openDate,dueFrom,overdueFrom,fee,paid,remaining,state,prepaid,partialPrepaid:prepaid&&remaining>0};
  });
}
function requiredAmount(student,asOf=today()){
  if(!isNewModel(student))return B.requiredAmount(student,asOf);
  if(isDynamicMonthly(student))return installmentPlan(student,asOf).reduce((sum,month)=>sum+Number(month.fee||0),0);
  return Math.max(0,Number(student.snapshot?.fee||student.required||0));
}
function remainingAmount(student,asOf=today()){
  if(!isNewModel(student))return B.remainingAmount(student,asOf);
  if(isDynamicMonthly(student))return installmentPlan(student,asOf).reduce((sum,month)=>sum+Number(month.remaining||0),0);
  return Math.max(0,requiredAmount(student,asOf)-paymentTotal(student));
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
  return Math.max(0,fee-Number(monthPaid[monthNumber-1]||0));
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
function appendPayment(student,{amount,method,date=today(),time=nowTime(),description='',targetMonth=null,debtDueDate=null,persist=true}={}){
  if(!student)throw new Error('الطالب غير موجود.');
  if(!isDynamicMonthly(student))return B.appendPayment(student,{amount,method,date,time,description,targetMonth,debtDueDate,persist});
  reconcileStudent(student);
  const value=Math.max(0,Number(amount||0)),fee=feeOf(student);if(value<=0||fee<=0)throw new Error('المبلغ غير صالح.');
  const selected=String(method||'').trim();if(!selected)throw new Error('اختر وسيلة الدفع.');
  const plan=installmentPlan(student,String(date||today())),firstOpen=plan.find(month=>month.remaining>0),fallback=(plan.at(-1)?.number||0)+1,monthNumber=clampMonth(Number(targetMonth)||firstOpen?.number||fallback||1),span=Math.max(1,Math.ceil(value/fee));
  if(monthNumber+span-1>MAX_MONTHS)throw new Error('قيمة الدفعة تتجاوز الحد المدعوم للأشهر المقدمة.');
  const index=student.payments.length,transactionCode=window.EFC_CODES?.newTransactionCode?.(student)||uid('tx');
  student.payments.push([String(date),value,selected,String(time||nowTime()),Date.now(),String(description||'').trim(),transactionCode,monthNumber,null,debtDueDate?String(debtDueDate):null,null]);
  const allocations=paymentAllocations(student,index,String(date||today()));
  if(!allocations.length||Math.round(allocations.reduce((sum,item)=>sum+item.amount,0)*100)!==Math.round(value*100)){student.payments.pop();throw new Error('تعذر توزيع الدفعة على الأشهر.');}
  student.payments[index][10]=allocations.map(item=>({monthNumber:item.monthNumber,amount:item.amount}));
  const summary=allocationSummary(student,index,String(date||today())),original=String(description||'').trim();
  student.payments[index][5]=defaultDescription(original)?summary:`${summary} — ${original}`;
  reconcileStudent(student,String(date||today()));
  const remaining=targetRemaining(student,monthNumber,String(date||today()));
  B.setDebtDate(student,String(monthNumber),remaining>0&&debtDueDate?debtDueDate:null);
  if(persist)saveStudentsClean();
  return index;
}
function monthlyFocus(student,asOf=today(),paidOverride=null){
  if(!isDynamicMonthly(student))return baseMonthlyFocus?baseMonthlyFocus(student,asOf,paidOverride):null;
  const plan=installmentPlan(student,asOf,paidOverride),first=plan.find(month=>month.remaining>0);if(!plan.length)return null;
  if(!first){const last=plan.at(-1);return{state:'complete',number:last.number,label:`الشهر ${last.number} مدفوع كامل`,dueAmount:0,dueDate:last.dueDate,plan,prepaid:Boolean(last.prepaid)};}
  const labels={partial:first.prepaid?'دفع جزئي مقدمًا':'دفع جزئي',overdue:'متأخر',due:'مستحق الآن',upcoming:'لم يحن'};
  return{state:first.state,number:first.number,label:`الشهر ${first.number} ${labels[first.state]||'مستحق'}`,dueAmount:['partial','overdue','due'].includes(first.state)&&!first.prepaid?first.remaining:0,dueDate:first.dueDate,plan,prepaid:Boolean(first.prepaid)};
}
function financialStatusV14(student){
  if(!isDynamicMonthly(student))return baseFinancialStatus?baseFinancialStatus(student):B.remainingAmount(student)===0?'مدفوع كامل':paymentTotal(student)===0?'لم يدفع':'دفع جزئي';
  const focus=monthlyFocus(student);if(!focus)return remainingAmount(student)>0?'لم يدفع':'مدفوع كامل';
  if(focus.state==='complete')return'مدفوع كامل';if(focus.prepaid&&focus.state==='partial')return'دفع جزئي مقدمًا';if(focus.state==='partial')return'دفع جزئي';if(focus.state==='overdue')return'متأخر';if(focus.state==='due')return'مستحق الآن';return paymentTotal(student)>0?'مدفوع كامل':'لم يدفع';
}
function stopStudent(student,reason=''){
  if(!student)return;
  if(isDynamicMonthly(student)){const plan=installmentPlan(student,today());student.frozenMonths=plan.filter(month=>month.dueDate<=today()||month.paid>0).length;}
  student.active=false;student.status='inactive';student.stoppedAt=today();student.stopReason=String(reason||'').trim();reconcileStudent(student);saveStudentsClean();
}
function notificationsForStudent(student){
  if(!student||isInactive(student))return[];
  const out=[],asOf=today();
  if(isDynamicMonthly(student)){
    installmentPlan(student,asOf).forEach(month=>{
      if(month.remaining<=0)return;
      const custom=student.debtDueDates?.[String(month.number)];
      if(custom&&asOf>=addDays(custom,-1)){out.push({studentId:student.id,studentName:student.name,message:asOf>custom?`عزيزي الطالب ${student.name}، نذكرك بأن عليك مبلغًا متبقيًا قدره ${cash(month.remaining)}، وقد كان موعد سداده بتاريخ ${showDate(custom)}. يرجى تسديده في أقرب وقت.`:`عزيزي الطالب ${student.name}، نذكرك بأن عليك مبلغًا متبقيًا قدره ${cash(month.remaining)}، وموعد سداده ${custom===addDays(asOf,1)?'غدًا ':''}${showDate(custom)}.`});return;}
      if(month.number>1&&asOf>=month.openDate&&asOf<month.monthStart){out.push({studentId:student.id,studentName:student.name,message:`عزيزي الطالب ${student.name}، الشهر ${month.number} سيبدأ بتاريخ ${showDate(month.monthStart)}، وقيمته ${cash(month.fee)}. يمكنك الدفع مقدمًا قبل بدايته.`});return;}
      if(asOf>=month.overdueFrom){out.push({studentId:student.id,studentName:student.name,message:`عزيزي الطالب ${student.name}، مبلغ الشهر ${month.number} وقدره ${cash(month.remaining)} متأخر عن السداد.`});return;}
      if(asOf>=month.dueFrom){out.push({studentId:student.id,studentName:student.name,message:`عزيزي الطالب ${student.name}، مبلغ الشهر ${month.number} وقدره ${cash(month.remaining)} مستحق للسداد.`});}
    });
  }else return B.notificationsForStudent(student);
  return out;
}
function currentNotifications(){return students.flatMap(notificationsForStudent);}

const baseReceiptModel=receiptModelV4;
receiptModelV4=function(student,paymentIndex=null,statement=false){
  reconcileStudent(student);
  const model=baseReceiptModel(student,paymentIndex,statement);if(!model||!isDynamicMonthly(student))return model;
  if(statement){model.paid=paymentTotal(student);model.remaining=remainingAmount(student);model.plan=installmentPlan(student);return model;}
  const index=paymentIndex===null||paymentIndex===undefined?0:Number(paymentIndex);
  const allocations=paymentAllocations(student,index);if(allocations.length){model.month=allocationMonthLabel(student,index);model.desc=allocationSummary(student,index);model.remaining=remainingAmount(student);model.monthAllocations=allocations.map(item=>({monthNumber:item.monthNumber,amount:item.amount,fee:item.fee,before:item.before,after:item.after}));}
  return model;
};

remainingOf=remainingAmount;
installmentPlanV3=installmentPlan;
monthlyFocusV3=monthlyFocus;
dueNowV3=student=>{if(!isDynamicMonthly(student))return baseDueNow?baseDueNow(student):B.remainingAmount(student);const focus=monthlyFocus(student);return Number(focus?.dueAmount||0);};
suggestedPaymentV3=student=>{if(!isDynamicMonthly(student))return baseSuggested?baseSuggested(student):remainingAmount(student);const plan=installmentPlan(student),first=plan.find(month=>month.remaining>0);return Number(first?.remaining||feeOf(student));};
allocV4=function(student,paymentIndex){
  if(!isDynamicMonthly(student))return baseAlloc?baseAlloc(student,paymentIndex):{desc:'',before:0,after:0,months:[]};
  const payment=student.payments?.[paymentIndex];if(!payment)return{desc:'',before:0,after:0,months:[]};
  let before=0;for(let i=0;i<paymentIndex;i+=1)before+=Number(student.payments?.[i]?.[1]||0);const amount=Number(payment[1]||0),months=paymentAllocations(student,paymentIndex).map(item=>({n:item.monthNumber,amount:item.amount,before:item.before,after:item.after,fee:item.fee}));
  return{desc:allocationSummary(student,paymentIndex),monthLabel:allocationMonthLabel(student,paymentIndex),before,after:before+amount,months};
};
financialStatus=financialStatusV14;
monthBadgeV3=function(student,asOf=today(),paidOverride=null){const focus=monthlyFocus(student,asOf,paidOverride);if(!focus)return'';const cls=focus.state==='complete'?'good':focus.state==='overdue'?'bad':focus.state==='upcoming'?'neutral':'warn';return`<span class="badge ${cls}">${B.esc(focus.label)}</span>`;};

const next=Object.freeze({...B,requiredAmount,remainingAmount,reconcileStudent,reconcileAllStudents,installmentPlan,dynamicAllocation,targetRemaining,appendPayment,stopStudent,notificationsForStudent,currentNotifications,saveStudents:saveStudentsClean,paymentAllocations,allocationSummary,allocationMonthLabel,visibleMonthCount,monthlyFocus,monthlyPrepayment:true,monthlyOpenLeadDays:OPEN_LEAD_DAYS,monthlyDueGraceDays:DUE_GRACE_DAYS});
window.EFC_DOMAIN_V13=next;
window.EFC_DOMAIN_V13_READY=Promise.resolve(next);
reconcileAllStudents();
window.EFC_MONTHLY_PREPAYMENT_DOMAIN_V14=Object.freeze({ready:true,maxMonths:MAX_MONTHS,prepayAcrossMonths:true,allocationPersisted:true,nextMonthVisibleBeforeRenewal:true,renewalReminderBeforeStart:true,dueAfterMonthStarts:true,dueGraceDays:DUE_GRACE_DAYS});
})();
