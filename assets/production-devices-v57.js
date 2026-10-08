(()=>{
'use strict';
if(window.EFC_DEVICES_V57?.ready)return;
if(!window.EFC_REGISTRATION_SCHEDULE_MATRIX_V17?.ready||!window.EFC_COURSES_CENTERS_REDESIGN_V23?.ready)throw new Error('Devices v57 loaded before registration/courses runtime.');
const D=window.EFC_DOMAIN_V13;
const {esc,showDate}=D;
const DAYS=[{key:'monday',ar:'الاثنين'},{key:'tuesday',ar:'الثلاثاء'},{key:'wednesday',ar:'الأربعاء'},{key:'thursday',ar:'الخميس'},{key:'friday',ar:'الجمعة'},{key:'saturday',ar:'السبت'},{key:'sunday',ar:'الأحد'}];
const DAY_BY_JS=['sunday','monday','tuesday','wednesday','thursday','friday','saturday'];
const ALLOWED_HOURS=[8,10,12,14,16,17,18,19,20].map(hour=>String(hour).padStart(2,'0')+':00');
const formStates=new WeakMap();
function int(value){const number=Number(value||0);return Number.isSafeInteger(number)&&number>0?number:0;}
function courseOf(value){return typeof value==='object'&&value?value:window.spec?.(String(value||''));}
function requiresDevice(value){return courseOf(value)?.requiresDevice===true;}
function centerOf(id){return (window.branches||[]).find(item=>String(item.id)===String(id))||null;}
function deviceCountForCenter(id){return int(centerOf(id)?.deviceCount);}
function deviceIdFor(branch,number){return centerOf(branch)?.devices?.find(device=>device.number===int(number))?.id||`${branch}:device:${int(number)}`;}
function deviceNumberFor(branch,item){
  const number=int(item?.deviceNumber),id=String(item?.deviceId||'');
  if(!number||number>deviceCountForCenter(branch))return 0;
  return !id||id===deviceIdFor(branch,number)?number:0;
}
function dayLabel(key){return DAYS.find(day=>day.key===key)?.ar||key||'—';}
function deviceLabel(value){return int(value)>0?'جهاز '+int(value):'غير محدد';}
function addDaysIso(value,days){
  const d=new Date(String(value||D.today())+'T12:00:00');
  if(Number.isNaN(d.getTime()))return'';
  d.setDate(d.getDate()+Number(days||0));
  return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0');
}
function candidateEnd(start,specialtyId,student=null){
  const item=courseOf(specialtyId);
  const historical=student&&String(student.specialty)===String(specialtyId)?student.snapshot:null;
  const historicalType=historical?.courseType|| (historical?.billing==='monthly'?'normal':historical?.billing==='one_time'?'quick':'');
  const monthly=(historicalType||D.courseTypeOf(item))==='normal';
  if(!item||monthly)return'';
  return D.addDuration(start,Math.max(1,Number(historical?.durationValue||item.quickDays||item.durationValue||1)),historical?.durationUnit||'day');
}
function periodsOverlap(aStart,aEnd,bStart,bEnd){
  const as=String(aStart||''),ae=String(aEnd||''),bs=String(bStart||''),be=String(bEnd||'');
  if(!as||!bs)return true;
  if(ae&&bs>ae)return false;
  if(be&&as>be)return false;
  return true;
}
function studentActiveForDevices(student){
  return Boolean(student&&!D.isInactive?.(student)&&requiresDevice(student.specialty));
}
function scheduleDay(student,key){
  return Array.isArray(student?.schedule?.days)?student.schedule.days.find(day=>String(day?.key||'')===String(key||'')):null;
}
function slotBookings({branch,day,time,deviceNumber,start,end,excludeStudentId='',date=''}) {
  const targetDevice=int(deviceNumber);
  if(!branch||!day||!time||!targetDevice)return[];
  return (window.students||[]).filter(student=>{
    if(!studentActiveForDevices(student)||String(student.branch)!==String(branch)||String(student.id)===String(excludeStudentId||''))return false;
    if(date){
      const d=String(date);
      if(String(student.start||'')&&d<String(student.start))return false;
      if(String(student.end||'')&&d>String(student.end))return false;
    }else if(!periodsOverlap(start,end,student.start,student.end))return false;
    const item=scheduleDay(student,day);
    return Boolean(item?.selected&&String(item.time||'')===String(time)&&deviceNumberFor(branch,item)===targetDevice);
  });
}
function isDeviceAvailable(args){return slotBookings(args).length===0;}
function availableDevices(args){
  const count=deviceCountForCenter(args.branch),out=[];
  for(let device=1;device<=count;device+=1)if(isDeviceAvailable({...args,deviceNumber:device}))out.push(device);
  return out;
}
function sameDeviceAlternateTimes(args){
  const device=int(args.deviceNumber);
  if(!device)return[];
  return ALLOWED_HOURS.filter(time=>time!==String(args.time||'')&&isDeviceAvailable({...args,time,deviceNumber:device}));
}
function currentEditStudent(){return window.EFC_REGISTRATION_EDIT_V17?.current?.()?.student||null;}
function contextFor(form,student=null){
  const specialtyId=String(form?.elements?.specialty?.value??student?.specialty??'');
  const branch=String(form?.elements?.branch?.value??student?.branch??'');
  const start=String(form?.elements?.start?.value||student?.start||D.today());
  return{branch,specialtyId,start,end:candidateEnd(start,specialtyId,student),studentId:String(student?.id||'')};
}
function selectedRows(form,scheduleRoot){
  const specialtyId=String(form?.elements?.specialty?.value||'');
  if(!specialtyId||!scheduleRoot)return[];
  return DAYS.map(day=>{
    const check=scheduleRoot.querySelector(`[data-matrix-course="${CSS.escape(specialtyId)}"][data-matrix-day="${day.key}"]`);
    const time=String(scheduleRoot.querySelector(`[data-schedule-day-time="${day.key}"]`)?.value||'');
    return{...day,selected:Boolean(check?.checked),time};
  }).filter(day=>day.selected&&day.time);
}
function initialState(student){
  const schedule=student?.schedule||{},assignments={};
  (Array.isArray(schedule.days)?schedule.days:[]).forEach(day=>{const device=deviceNumberFor(student?.branch,day);if(device)assignments[String(day.key||'')]=device;});
  return{preferred:deviceNumberFor(student?.branch,{deviceNumber:schedule.preferredDeviceNumber,deviceId:schedule.preferredDeviceId}),assignments,choices:{},lastBranch:String(student?.branch||''),lastSpecialty:String(student?.specialty||'')};
}
function registrationState(form){
  let state=formStates.get(form);if(state)return state;
  state=initialState(currentEditStudent());formStates.set(form,state);return state;
}
function availabilityArgs(ctx,row){return{branch:ctx.branch,day:row.key,time:row.time,start:ctx.start,end:ctx.end,excludeStudentId:ctx.studentId};}
function renderRegistrationPanel(form,scheduleRoot){
  const panel=document.getElementById('deviceAssignmentV57');
  if(!panel||panel.dataset.formId!==form.dataset.deviceFormV57)return;
  const state=registrationState(form),student=currentEditStudent(),ctx=contextFor(form,student),course=courseOf(ctx.specialtyId);
  scheduleRoot.querySelectorAll?.('[data-device-schedule-badge-v57]').forEach(badge=>badge.remove());
  if(!requiresDevice(course)){panel.hidden=true;return;}
  const count=deviceCountForCenter(ctx.branch),rows=selectedRows(form,scheduleRoot),center=centerOf(ctx.branch);
  panel.hidden=!rows.length;
  if(panel.hidden)return;
  if(!ctx.branch||!course){panel.innerHTML='<div class="device-empty-v57">اختر المركز والدورة أولًا لعرض الأجهزة.</div>';return;}
  if(!count){panel.innerHTML=`<div class="device-assignment-head-v57"><div><small>الأجهزة</small><h3>تخصيص جهاز الطالب</h3></div><span>${esc(center?.name||'المركز')}</span></div><div class="device-warning-v57">هذا المركز لا يحتوي أجهزة معرفة. أضف عدد الأجهزة من «الدورات و المراكز» أولًا.</div>`;return;}
  if(state.preferred>count){state.preferred=0;state.assignments={};}
  rows.forEach(row=>{
    const cell=scheduleRoot.querySelector('[data-matrix-day="'+row.key+'"]')?.closest?.('td'),number=int(state.assignments[row.key])||state.preferred;
    if(!cell||!number)return;
    const badge=document.createElement('small');badge.dataset.deviceScheduleBadgeV57=row.key;badge.className='device-schedule-badge-v57';badge.textContent=deviceLabel(number);cell.appendChild(badge);
  });
  const preferredOptions=Array.from({length:count},(_,i)=>i+1).map(device=>`<option value="${device}"${state.preferred===device?' selected':''}>${esc(deviceLabel(device))}</option>`).join('');
  const rowHtml=rows.filter(row=>state.preferred&&(!isDeviceAvailable({...availabilityArgs(ctx,row),deviceNumber:state.preferred})||!isDeviceAvailable({...availabilityArgs(ctx,row),deviceNumber:int(state.assignments[row.key])||state.preferred}))).map(row=>{
    const args=availabilityArgs(ctx,row),available=availableDevices(args);
    const assigned=int(state.assignments[row.key]),conflictDevice=available.includes(state.preferred)?assigned:state.preferred,resolved=assigned&&available.includes(assigned);
    const canOpen=window.EFC_AUTH_V13?.canView?.('students')??true;
    const occupants=slotBookings({...args,deviceNumber:conflictDevice});
    const names=occupants.map(occupant=>`<span>${esc(occupant.name||'طالب')} <button type="button" data-device-conflict-student-v57="${esc(String(occupant.id))}" ${canOpen?'':'disabled'}>ملف الطالب</button></span>`).join('، ');
    const choice=state.choices[row.key]||{},mode=choice.mode;
    const action=(day,time,number)=>`<button type="button" data-device-resolve-v57="${row.key}" data-day-v57="${day}" data-time-v57="${time}" data-number-v57="${number}">${esc(time)} · ${esc(deviceLabel(number))}</button>`;
    let suggestions='';
    if(mode==='device'){
      const ordered=DAYS.slice(DAYS.findIndex(day=>day.key===row.key)).concat(DAYS.slice(0,DAYS.findIndex(day=>day.key===row.key))).filter(day=>day.key!=='sunday'&&(day.key===row.key||!rows.some(selected=>selected.key===day.key)));
      const startIndex=Math.max(0,Number(choice.offset)||0);
      let index=startIndex,times=[];
      for(;index<ordered.length;index++){times=sameDeviceAlternateTimes({...args,day:ordered[index].key,time:ordered[index].key===row.key?row.time:'',deviceNumber:conflictDevice});if(times.length)break;}
      suggestions=index<ordered.length?`<div class="device-suggestions-v57"><b>${esc(ordered[index].ar)} — ${esc(deviceLabel(conflictDevice))}:</b>${times.map(time=>action(ordered[index].key,time,conflictDevice)).join('')}</div>${index+1<ordered.length?`<button type="button" data-device-next-v57="${row.key}" data-offset-v57="${index+1}">اليوم التالي</button>`:''}`:'<span>لا توجد أوقات متاحة لهذا الجهاز في بقية الأيام غير المحددة في الجدول.</span>';
    }else if(mode==='day'){
      const minutes=time=>Number(time.slice(0,2))*60+Number(time.slice(3)),ordered=[row.time,...ALLOWED_HOURS.filter(time=>time!==row.time).sort((a,b)=>Math.abs(minutes(a)-minutes(row.time))-Math.abs(minutes(b)-minutes(row.time))||minutes(a)-minutes(b))];
      suggestions=ordered.map(time=>{const devices=availableDevices({...args,time});return devices.length?`<div class="device-suggestions-v57"><b>${time===row.time?'الوقت المختار':minutes(time)<minutes(row.time)?'قبل الوقت المختار':'بعد الوقت المختار'} · ${esc(time)}:</b>${devices.map(number=>action(row.key,time,number)).join('')}</div>`:'';}).join('')||'<span>لا توجد أجهزة متاحة في هذا اليوم.</span>';
    }
    return`<article class="device-day-v57 ${resolved?'ok':'needs'}" data-device-conflict-day-v57="${row.key}"><div class="device-conflict-title-v57"><b>${esc(row.ar)} · ${esc(row.time)} — ${esc(deviceLabel(conflictDevice))} غير متاح</b>${resolved?`<span class="device-resolved-v57">تم اختيار ${esc(deviceLabel(assigned))} لهذا الموعد</span>`:''}</div><div class="device-occupants-v57">يستخدمه: ${names}</div><div class="device-suggestions-v57"><b>ماذا تريد الاحتفاظ به؟</b><button type="button" data-device-mode-v57="${row.key}" data-mode-v57="device" class="${mode==='device'?'selected':''}">نفس الجهاز</button><button type="button" data-device-mode-v57="${row.key}" data-mode-v57="day" class="${mode==='day'?'selected':''}">نفس اليوم</button></div>${suggestions}</article>`;

  }).join('');
  panel.innerHTML=`<div class="device-assignment-head-v57"><h3>تخصيص جهاز الطالب</h3><span>${esc(center?.name||ctx.branch)}</span></div><div class="device-preferred-v57"><label><span>الجهاز المختار لكل الأيام</span><select id="devicePreferredV57"><option value="">اختر الجهاز</option>${preferredOptions}</select></label></div>${rowHtml?`<div class="device-days-v57">${rowHtml}</div>`:''}`;
  const preferred=panel.querySelector('#devicePreferredV57');
  if(preferred)preferred.onchange=()=>{state.preferred=int(preferred.value);state.assignments={};state.choices={};renderRegistrationPanel(form,scheduleRoot);};
  panel.querySelectorAll('[data-device-conflict-student-v57]').forEach(button=>button.onclick=()=>window.openStudent?.(button.dataset.deviceConflictStudentV57,'profile'));
  panel.querySelectorAll('[data-device-mode-v57]').forEach(button=>button.onclick=()=>{state.choices[button.dataset.deviceModeV57]={mode:button.dataset.modeV57,offset:0};renderRegistrationPanel(form,scheduleRoot);});
  panel.querySelectorAll('[data-device-next-v57]').forEach(button=>button.onclick=()=>{state.choices[button.dataset.deviceNextV57]={mode:'device',offset:Number(button.dataset.offsetV57)};renderRegistrationPanel(form,scheduleRoot);});
  panel.querySelectorAll('[data-device-resolve-v57]').forEach(button=>button.onclick=()=>{
    const oldKey=button.dataset.deviceResolveV57,key=button.dataset.dayV57,time=button.dataset.timeV57,number=int(button.dataset.numberV57),row=rows.find(item=>item.key===oldKey);
    const timeSelect=scheduleRoot.querySelector(`[data-schedule-day-time="${key}"]`),check=scheduleRoot.querySelector(`[data-matrix-course="${CSS.escape(ctx.specialtyId)}"][data-matrix-day="${key}"]`);
    if(!timeSelect||!check||check.disabled||!row)return;
    if(!isDeviceAvailable({...availabilityArgs(ctx,{...row,key,time}),deviceNumber:number})){renderRegistrationPanel(form,scheduleRoot);return;}
    if(key!==oldKey){if(rows.some(item=>item.key===key))return;const oldCheck=scheduleRoot.querySelector(`[data-matrix-course="${CSS.escape(ctx.specialtyId)}"][data-matrix-day="${oldKey}"]`);if(oldCheck)oldCheck.checked=false;delete state.assignments[oldKey];}
    timeSelect.value=time;check.checked=true;state.assignments[key]=number;delete state.choices[oldKey];timeSelect.dispatchEvent(new Event('change',{bubbles:true}));
  });
  window.EFC_SYNC_SELECTS_V19?.(panel);
}
function mountRegistration(form,scheduleRoot){
  if(!form||!scheduleRoot)return;
  if(!form.dataset.deviceFormV57)form.dataset.deviceFormV57='device-'+Date.now().toString(36);
  let panel=document.getElementById('deviceAssignmentV57');
  if(!panel){panel=document.createElement('section');panel.id='deviceAssignmentV57';panel.className='card device-assignment-v57';scheduleRoot.insertAdjacentElement('afterend',panel);}
  if(scheduleRoot.parentElement&&!scheduleRoot.parentElement.classList.contains('device-schedule-stack-v57')){
    const stack=document.createElement('div');stack.className='device-schedule-stack-v57';scheduleRoot.parentElement.insertBefore(stack,scheduleRoot);stack.appendChild(scheduleRoot);stack.appendChild(panel);
  }
  panel.dataset.formId=form.dataset.deviceFormV57;
  const state=registrationState(form),ctx=contextFor(form,currentEditStudent());state.lastBranch=ctx.branch;state.lastSpecialty=ctx.specialtyId;
  if(form.dataset.deviceBindingsV57!=='1'){
    form.dataset.deviceBindingsV57='1';
    ['branch','specialty','start'].forEach(name=>form.elements[name]?.addEventListener('change',()=>{
      const next=contextFor(form,currentEditStudent());
      if(next.branch!==state.lastBranch||next.specialtyId!==state.lastSpecialty){state.preferred=0;state.assignments={};state.choices={};state.lastBranch=next.branch;state.lastSpecialty=next.specialtyId;}
      renderRegistrationPanel(form,scheduleRoot);
    }));
    scheduleRoot.addEventListener('change',()=>renderRegistrationPanel(form,scheduleRoot));
    form.addEventListener('reset',()=>queueMicrotask(()=>{state.preferred=0;state.assignments={};state.lastBranch='';state.lastSpecialty='';renderRegistrationPanel(form,scheduleRoot);}));
  }
  renderRegistrationPanel(form,scheduleRoot);
}
function augmentScheduleSnapshot(snapshot,{form,student=null}={}){
  const item=courseOf(snapshot?.specialtyId),baseDays=Array.isArray(snapshot?.days)?snapshot.days:[];
  if(!requiresDevice(item))return clearScheduleDevices(snapshot);
  const state=form?registrationState(form):initialState(student),preferred=int(state.preferred);
  const branch=String(form?.elements?.branch?.value||student?.branch||'');
  return{...snapshot,version:4,preferredDeviceNumber:preferred||null,preferredDeviceId:preferred?deviceIdFor(branch,preferred):null,days:baseDays.map(day=>{
    const number=day.selected&&day.time?(int(state.assignments?.[day.key])||preferred):0;
    return{...day,deviceNumber:number||null,deviceId:number?deviceIdFor(branch,number):null};
  })};
}
function clearScheduleDevices(snapshot){return{...snapshot,version:4,preferredDeviceNumber:null,preferredDeviceId:null,days:(snapshot?.days||[]).map(day=>({...day,deviceNumber:null,deviceId:null}))};}
function validateRegistration({form,snapshot,studentId=''}) {
  const specialty=String(form?.elements?.specialty?.value||snapshot?.specialtyId||''),start=String(form?.elements?.start?.value||D.today());
  const student=(window.students||[]).find(item=>String(item.id)===String(studentId));
  return validateStudentDraft({specialty,branch:String(form?.elements?.branch?.value||''),start,end:candidateEnd(start,specialty,student),schedule:snapshot},{excludeStudentId:studentId});
}
function validateStudentDraft(student,{excludeStudentId='',requireComplete=true}={}){
  if(!requiresDevice(student.specialty)||D.isInactive?.(student))return{ok:true};
  const {branch,start,end}=student,snapshot=student.schedule,count=deviceCountForCenter(branch);
  if(!count)return{ok:false,message:'هذه الدورة تحتاج جهازًا، لكن المركز المحدد لا يحتوي أجهزة معرفة.'};
  const days=(Array.isArray(snapshot?.days)?snapshot.days:[]).filter(day=>day?.selected&&day?.time);
  if(!days.length)return requireComplete?{ok:false,message:'هذه الدورة تحتاج جهازًا. حدد يومًا ووقتًا واحدًا على الأقل في جدول الطالب.'}:{ok:true};
  const preferred=deviceNumberFor(branch,{deviceNumber:snapshot?.preferredDeviceNumber,deviceId:snapshot?.preferredDeviceId});
  if(requireComplete&&!preferred)return{ok:false,message:'اختر الجهاز الأساسي للطالب قبل حفظ التسجيل.'};
  const seen=new Set();
  for(const day of days){
    if(!DAYS.some(item=>item.key===day.key)||!/^([01]\d|2[0-3]):[0-5]\d$/.test(day.time)||seen.has(day.key))return{ok:false,message:'جدول الطالب يحتوي يومًا مكررًا أو موعدًا غير صالح.'};
    seen.add(day.key);
    const device=deviceNumberFor(branch,day);
    if(!device){if(!requireComplete&&!day.deviceNumber&&!day.deviceId)continue;return{ok:false,message:`حدد جهاز يوم ${dayLabel(day.key)} الساعة ${day.time} قبل الحفظ.`};}
    if(!isDeviceAvailable({branch,day:day.key,time:day.time,deviceNumber:device,start,end,excludeStudentId:String(excludeStudentId||'')}))return{ok:false,message:`${deviceLabel(device)} لم يعد متاحًا يوم ${dayLabel(day.key)} الساعة ${day.time}. اختر جهازًا أو وقتًا آخر.`};
  }
  return{ok:true};
}
function missingDeviceDays(student){
  if(!studentActiveForDevices(student))return[];
  const days=(Array.isArray(student.schedule?.days)?student.schedule.days:[]).filter(day=>day?.selected&&day?.time);
  if(!days.length)return[{key:'schedule',ar:'الجدول',time:'',deviceNumber:null}];
  return days.filter(day=>!deviceNumberFor(student.branch,day));
}
function validateCenterDeviceCount(branchId,nextCount){
  const count=int(nextCount),affected=(window.students||[]).filter(student=>studentActiveForDevices(student)&&String(student.branch)===String(branchId)&&(Array.isArray(student.schedule?.days)?student.schedule.days:[]).some(day=>day?.selected&&int(day.deviceNumber)>count));
  if(!affected.length)return{ok:true};
  const names=affected.slice(0,5).map(student=>String(student.name||'طالب')).join('، '),more=affected.length>5?' و'+(affected.length-5)+' آخرين':'';
  return{ok:false,message:`لا يمكن تقليل الأجهزة إلى ${count} لأن هناك حجوزات على أجهزة أعلى من هذا الرقم للطلاب: ${names}${more}. عدّل أجهزة هؤلاء الطلاب أولًا.`,affected};
}
function validateRestoredState(state){
  const centers=window.EFC_REGISTRATION_SCHEDULE_V13.centersForRestore(state.branches||[]),byCenter=new Map(centers.map(center=>[String(center.id),center]));
  const courses=new Map((state.specialties||[]).map(course=>[String(course.id),course])),slots=new Map();
  for(const student of state.students||[]){
    if(D.isInactive?.(student)||courses.get(String(student.specialty))?.requiresDevice!==true)continue;
    const center=byCenter.get(String(student.branch)),seenDays=new Set();
    for(const day of student.schedule?.days||[]){
      if(!day.selected||!day.time||(!day.deviceNumber&&!day.deviceId))continue;
      if(seenDays.has(day.key)||!DAYS.some(item=>item.key===day.key)||!/^([01]\d|2[0-3]):[0-5]\d$/.test(day.time))throw new Error(`تعذر استعادة النسخة: جدول غير صالح للطالب ${student.name||''}.`);
      seenDays.add(day.key);
      const number=int(day.deviceNumber),record=center?.devices.find(device=>device.number===number);
      if(!record||number>center.deviceCount||(day.deviceId&&day.deviceId!==record.id))throw new Error(`تعذر استعادة النسخة: جهاز غير صالح للطالب ${student.name||''}. راجع أجهزة المركز في النسخة.`);
      const key=JSON.stringify([student.branch,day.key,day.time,record.id]),previous=slots.get(key)||[];
      const conflict=previous.find(other=>periodsOverlap(student.start,student.end,other.start,other.end));
      if(conflict)throw new Error(`تعذر دمج النسخة: ${deviceLabel(number)} يوم ${dayLabel(day.key)} ${day.time} محجوز للطالبين ${conflict.name||''} و${student.name||''}. لم تحفظ أي تغييرات؛ عدّل الحجوزات قبل الاستعادة.`);
      previous.push(student);slots.set(key,previous);
    }
  }
  return true;
}
function studentDeviceSummaryHtml(student){
  const course=courseOf(student?.specialty);if(!requiresDevice(course))return'';
  const schedule=student?.schedule||{},days=(Array.isArray(schedule.days)?schedule.days:[]).filter(day=>day?.selected&&day?.time),missing=missingDeviceDays(student),preferred=int(schedule.preferredDeviceNumber);
  const editable=!D.isInactive?.(student)&&(window.EFC_AUTH_V13?.canEdit?.('students')??true)&&(window.EFC_AUTH_V13?.canEdit?.('register')??true);
  const rows=days.length?days.map(day=>`<span><b>${esc(dayLabel(day.key))}</b> ${esc(String(day.time||'—'))} · ${esc(deviceLabel(day.deviceNumber))}</span>`).join(''):'<span>لا يوجد جدول محدد لهذا الطالب.</span>';
  return`<section class="student-device-summary-v57 ${missing.length?'needs':''}"><div class="student-device-summary-head-v57"><div><small>الأجهزة</small><h3>${missing.length?'يحتاج تحديد جهاز':'تخصيص الجهاز'}</h3></div><b>${esc(deviceLabel(preferred))}</b></div><div class="student-device-days-v57">${rows}</div>${missing.length?`<p>يوجد ${missing.length} موعد غير مربوط بجهاز صالح. حدده يدويًا من تعديل الجدول.</p>`:''}${editable?'<button class="button secondary edit-student-device-v57" type="button">تعديل الجدول والجهاز</button>':''}</section>`;
}
function bindStudentModal(modal,student){
  modal?.querySelector('.edit-student-device-v57')?.addEventListener('click',()=>{modal.remove();window.EFC_BEGIN_REGISTRATION_EDIT_V17?.({studentId:String(student.id||''),registrationReceipt:true,paymentIndex:null,receipt:''});});
}
function dayKeyForDate(value){const date=new Date(String(value)+'T12:00:00');return DAY_BY_JS[date.getDay()]||'monday';}
function bookingsForDate(branch,date){
  const day=dayKeyForDate(date),rows=[];
  (window.students||[]).forEach(student=>{
    if(!studentActiveForDevices(student)||String(student.branch)!==String(branch))return;
    if(String(student.start||'')&&date<String(student.start))return;
    if(String(student.end||'')&&date>String(student.end))return;
    const item=scheduleDay(student,day),device=deviceNumberFor(branch,item);
    if(item?.selected&&item.time&&device)rows.push({student,time:String(item.time),device,course:courseOf(student.specialty)});
  });
  return rows;
}
function liveAvailability(branch,now=new Date()){
  const date=now.getFullYear()+'-'+String(now.getMonth()+1).padStart(2,'0')+'-'+String(now.getDate()).padStart(2,'0');
  const minutes=now.getHours()*60+now.getMinutes();
  // The existing timetable defines start slots, with the last slot ending at 21:00.
  const time=ALLOWED_HOURS.find((value,index)=>{
    const start=Number(value.slice(0,2))*60,end=index+1<ALLOWED_HOURS.length?Number(ALLOWED_HOURS[index+1].slice(0,2))*60:21*60;
    return minutes>=start&&minutes<end;
  })||'';
  const busy=new Set(bookingsForDate(branch,date).filter(item=>item.time===time).map(item=>item.device)).size;
  return{date,time,total:deviceCountForCenter(branch),busy,free:Math.max(0,deviceCountForCenter(branch)-busy)};
}
function weekDates(date){
  const index=DAYS.findIndex(day=>day.key===dayKeyForDate(date));
  const start=addDaysIso(date,-Math.max(0,index));
  return DAYS.map((day,offset)=>({...day,date:addDaysIso(start,offset)}));
}
let deviceRefreshTimer=null;
function renderDevicesPage(){
  clearInterval(deviceRefreshTimer);window.currentPage='devices';
  if(!(window.branches||[]).length){window.shell(window.pageTitle('التشغيل','الأجهزة','')+'<div class="card device-empty-page-v57">أضف مركزًا من صفحة الدورات و المراكز.</div>');return;}
  const today=D.today(),defaultBranch=String(window.branches[0]?.id||'');
  window.shell(`<section class="devices-hero-v57"><h1>الأجهزة</h1></section><div class="card devices-controls-v57"><label>المركز<select id="devicesBranchV57">${window.opts(window.branches,x=>x.id,x=>x.name)}</select></label><label>الجهاز<select id="devicesDeviceV57"></select></label><label>الأسبوع<input class="input" id="devicesDateV57" type="date" value="${today}"></label><div id="devicesDayV57"></div></div><div id="devicesBodyV57"></div>`);
  const branchSelect=document.getElementById('devicesBranchV57'),deviceSelect=document.getElementById('devicesDeviceV57'),dateInput=document.getElementById('devicesDateV57');branchSelect.value=defaultBranch;
  let selectedDevice=1;
  const draw=()=>{
    const body=document.getElementById('devicesBodyV57');if(!body||!branchSelect.isConnected){clearInterval(deviceRefreshTimer);return;}
    const branch=String(branchSelect.value||defaultBranch),date=String(dateInput.value||today),center=centerOf(branch),count=deviceCountForCenter(branch),week=weekDates(date),live=liveAvailability(branch);
    selectedDevice=count?Math.min(Math.max(1,selectedDevice),count):0;
    deviceSelect.innerHTML=count?Array.from({length:count},(_,i)=>`<option value="${i+1}"${selectedDevice===i+1?' selected':''}>${esc(deviceLabel(i+1))}</option>`).join(''):'<option>لا توجد أجهزة</option>';deviceSelect.disabled=!count;
    const canOpen=window.EFC_AUTH_V13?.canView?.('students')??true,bookings=week.flatMap(day=>bookingsForDate(branch,day.date).map(item=>({...item,day:day.key}))),missing=(window.students||[]).filter(student=>studentActiveForDevices(student)&&String(student.branch)===branch&&missingDeviceDays(student).length);
    document.getElementById('devicesDayV57').textContent=showDate(week[0].date)+' — '+showDate(week[6].date);
    const times=[...new Set([...ALLOWED_HOURS,...bookings.filter(item=>item.device===selectedDevice).map(item=>item.time)])].sort(),cells=new Map();
    bookings.filter(item=>item.device===selectedDevice).forEach(item=>{const key=item.day+'|'+item.time,list=cells.get(key)||[];list.push(item);cells.set(key,list);});
    const head=week.map(day=>`<th>${esc(day.ar)}<small>${esc(showDate(day.date))}</small></th>`).join('');
    const rows=times.map(time=>`<tr><th>${esc(time)}</th>${week.map(day=>{const list=cells.get(day.key+'|'+time)||[];return list.length?`<td class="device-busy-v57 ${list.length>1?'collision':''}">${list.map(item=>`<button type="button" class="device-booking-v57" data-device-student-v57="${esc(String(item.student.id||''))}" ${canOpen?'':'disabled'} title="فتح ملف الطالب"><b>${esc(item.student.name||'طالب')}</b><small>${esc(item.course?.name||item.student.specialty||'الدورة')}</small></button>`).join('')}</td>`:'<td class="device-free-v57">متاح</td>';}).join('')}</tr>`).join('');
    body.innerHTML=`<div class="devices-kpis-v57"><div><small>إجمالي الأجهزة</small><b>${count}</b></div><div><small>المتاح الآن</small><b>${live.free}</b></div><div><small>المشغول الآن</small><b>${live.busy}</b></div><button type="button" id="devicesMissingV57" class="${missing.length?'warn':''}"><small>بحاجة لتحديد جهاز</small><b>${missing.length}</b></button></div>${count?`<section class="card devices-grid-card-v57"><div class="devices-grid-head-v57"><h2>${esc(deviceLabel(selectedDevice))} — الجدول الأسبوعي</h2><span>${esc(center?.name||branch)}</span></div><div class="devices-table-wrap-v57"><table><thead><tr><th>الوقت</th>${head}</tr></thead><tbody>${rows}</tbody></table></div></section>`:'<div class="card device-empty-page-v57">أضف أجهزة لهذا المركز من الدورات و المراكز.</div>'}`;
    body.querySelectorAll('[data-device-student-v57]').forEach(button=>button.onclick=()=>window.openStudent?.(button.dataset.deviceStudentV57,'profile'));
    body.querySelector('#devicesMissingV57').onclick=()=>{
      const modal=document.createElement('div');modal.className='modal devices-missing-modal-v57';
      modal.innerHTML=`<div class="modal-content card"><div class="devices-grid-head-v57"><h2>طلاب بحاجة لتحديد جهاز</h2><button type="button" class="button secondary" data-device-close-v57>إغلاق</button></div><div class="devices-missing-list-v57">${missing.length?missing.map(student=>`<button type="button" data-device-open-student-v57="${esc(String(student.id||''))}" ${canOpen?'':'disabled'}><span><b>${esc(student.name||'طالب')}</b><small>${esc(courseOf(student.specialty)?.name||'الدورة')}</small><small>${missingDeviceDays(student).map(day=>esc(dayLabel(day.key))+(day.time?' '+esc(day.time):'')).join('، ')}</small></span><em>فتح الملف</em></button>`).join(''):'<p>لا يوجد طلاب بحاجة لتحديد جهاز.</p>'}</div></div>`;
      modal.querySelector('[data-device-close-v57]').onclick=()=>modal.remove();modal.onclick=event=>{if(event.target===modal)modal.remove();};
      modal.querySelectorAll('[data-device-open-student-v57]').forEach(button=>button.onclick=()=>{modal.remove();window.openStudent?.(button.dataset.deviceOpenStudentV57,'profile');});document.body.appendChild(modal);
    };
    window.EFC_SYNC_SELECTS_V19?.(document);
  };
  branchSelect.onchange=()=>{selectedDevice=1;draw();};deviceSelect.onchange=()=>{selectedDevice=int(deviceSelect.value);draw();};dateInput.onchange=draw;draw();deviceRefreshTimer=setInterval(draw,60000);
}
const style=document.createElement('style');style.id='efc-devices-style-v57';style.textContent="\n.device-schedule-stack-v57{grid-column:2;min-width:0;display:grid;gap:12px;align-content:start}.device-assignment-v57{min-width:0;padding:14px;border:1px solid #9bcfc0;background:#f3fcf8;border-radius:14px}.device-assignment-v57[hidden]{display:none!important}.device-assignment-head-v57,.devices-grid-head-v57{display:flex;align-items:center;justify-content:space-between;gap:10px;margin-bottom:10px}.device-assignment-head-v57 h3{margin:0;font-size:16px}.device-assignment-head-v57>span{font-size:10px;color:#52766a}.device-preferred-v57 label{display:grid;gap:6px;font-size:11px;font-weight:800}.device-preferred-v57 select{height:40px;border:1px solid #bfcfca;border-radius:9px;background:white;padding:0 10px}.device-days-v57{display:grid;gap:8px;margin-top:10px}.device-day-v57{display:grid;gap:8px;padding:12px;border:1px solid #e4c67e;border-radius:10px;background:#fffaf0;font-size:11px}.device-day-v57.ok{border-color:#9bcfc0}.device-conflict-title-v57{display:grid;gap:5px}.device-resolved-v57{color:#0a7053}.device-occupants-v57 button,.device-suggestions-v57 button{border:1px solid #9dcbbd;border-radius:7px;background:#edf9f5;color:#145643;padding:5px 8px;font:inherit;cursor:pointer}.device-suggestions-v57{display:flex;align-items:center;gap:5px;flex-wrap:wrap}.device-suggestions-v57 .selected{background:#0a7053;color:white}.device-schedule-badge-v57{display:block;color:#087154;font-size:9px;font-weight:800;margin-top:3px}.device-warning-v57,.device-empty-v57{padding:12px;background:#fff9e8;color:#795b1b;font-size:11px;border-radius:10px}\n.student-device-summary-v57{margin:14px 0;padding:14px;border:1px solid #b9dcd1;border-radius:12px;background:#f7fcfa}.student-device-summary-v57.needs{border-color:#e4c67e;background:#fffaf0}.student-device-summary-head-v57{display:flex;align-items:center;justify-content:space-between;gap:12px}.student-device-summary-head-v57 h3{margin:2px 0 0;font-size:13px}.student-device-summary-head-v57 small{font-size:8px;color:#6c817a}.student-device-summary-head-v57>b{font-size:12px;color:#0a654e}.student-device-days-v57{display:flex;flex-wrap:wrap;gap:6px;margin-top:10px}.student-device-days-v57 span{padding:6px 8px;border:1px solid #d5e5df;border-radius:8px;background:#fff;font-size:9px}.student-device-summary-v57 p{font-size:9px;color:#805e1d}.student-device-summary-v57 .edit-student-device-v57{margin-top:10px}\n.content:has(.devices-hero-v57){width:min(1120px,calc(100% - 28px));max-width:1120px;margin:0 auto;padding:10px 0 16px}.devices-hero-v57{text-align:center;margin-bottom:10px}.devices-hero-v57 h1{margin:0;font-size:26px;color:#073f35}.devices-controls-v57{display:grid;grid-template-columns:minmax(120px,1fr) minmax(110px,.7fr) 165px auto;gap:10px;align-items:end;padding:10px 14px;margin-bottom:10px}.devices-controls-v57 label{display:grid;gap:4px;font-size:10px;font-weight:800}.devices-controls-v57 select,.devices-controls-v57 input{height:36px}.devices-controls-v57>div{padding:8px;border-radius:8px;background:#edf7f3;color:#28564a;font-size:10px;font-weight:800;white-space:nowrap}.devices-kpis-v57{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:8px;margin-bottom:10px}.devices-kpis-v57>div,.devices-kpis-v57>button{min-height:52px;padding:8px 12px;border:1px solid #bedfd4;border-radius:10px;background:#f1faf7;display:flex;align-items:center;justify-content:space-between;gap:8px;font:inherit}.devices-kpis-v57>button{cursor:pointer}.devices-kpis-v57 small{font-size:10px;color:#395d53;font-weight:800}.devices-kpis-v57 b{font-size:21px;color:#0b654f}.devices-kpis-v57 .warn{border-color:#e4c67e;background:#fff9ea}.devices-kpis-v57 .warn b{color:#9a6514}\n.devices-grid-card-v57{padding:12px;margin:0}.devices-grid-head-v57 h2{margin:0;font-size:15px}.devices-grid-head-v57 span{font-size:10px;color:#62766f}.devices-table-wrap-v57{border:1px solid #cbdad5;border-radius:10px;overflow:hidden}.devices-table-wrap-v57 table{width:100%;table-layout:fixed;border-collapse:collapse}.devices-table-wrap-v57 th,.devices-table-wrap-v57 td{height:clamp(30px,4.7vh,43px);padding:3px;border:1px solid #d5e1dd;text-align:center}.devices-table-wrap-v57 thead th{height:38px;background:#075d4c;color:white;font-size:10px}.devices-table-wrap-v57 thead th:first-child{width:60px}.devices-table-wrap-v57 thead small{display:block;font-size:9px;margin-top:2px}.devices-table-wrap-v57 tbody>tr>th{background:#eef4f1;font-size:10px}.device-free-v57{background:#effaf5;color:#22805f;font-size:10px;font-weight:800}.device-busy-v57{background:#fff4cf}.device-busy-v57.collision{background:#ffe7e3}.device-booking-v57{display:block;width:100%;border:0;background:transparent;color:inherit;padding:2px;cursor:pointer;font:inherit}.device-booking-v57:disabled{cursor:default}.device-booking-v57 b,.device-booking-v57 small{display:block;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.device-booking-v57 b{font-size:10px}.device-booking-v57 small{font-size:9px;margin-top:2px}.devices-missing-modal-v57 .modal-content{width:min(600px,90vw);max-height:85vh;overflow:auto;padding:20px}.devices-missing-list-v57{display:grid;gap:7px}.devices-missing-list-v57 button{width:100%;border:1px solid #d6e2de;border-radius:9px;background:white;display:flex;align-items:center;justify-content:space-between;text-align:right;padding:10px;cursor:pointer}.devices-missing-list-v57 button b,.devices-missing-list-v57 button small{display:block}.devices-missing-list-v57 button b{font-size:12px}.devices-missing-list-v57 button small,.devices-missing-list-v57 button em{font-size:10px;color:#74867f}.devices-missing-list-v57 button em{font-style:normal;color:#9a6514}.device-empty-page-v57{padding:22px;text-align:center;color:#667a73;font-size:12px}\n@media(max-width:1100px){.devices-controls-v57{grid-template-columns:1fr 1fr 150px}.devices-controls-v57>div{display:none}}@media(max-width:900px){.device-schedule-stack-v57{grid-column:1}.devices-kpis-v57 small{font-size:9px}.devices-kpis-v57>div,.devices-kpis-v57>button{padding:6px}.devices-table-wrap-v57 thead small{font-size:8px}.devices-table-wrap-v57 thead th:first-child{width:46px}}@media(max-width:650px){.devices-controls-v57{grid-template-columns:1fr 1fr}.devices-controls-v57 label:last-of-type{grid-column:1/-1}.devices-kpis-v57{grid-template-columns:repeat(2,minmax(0,1fr))}.devices-table-wrap-v57 th,.devices-table-wrap-v57 td{padding:2px}.devices-table-wrap-v57 thead small{font-size:7px}.devices-table-wrap-v57 thead th{font-size:8px}}\n";document.head.appendChild(style);
window.EFC_RENDER_DEVICES_V57=renderDevicesPage;
window.EFC_DEVICES_V57=Object.freeze({ready:true,requiresDevice,deviceCountForCenter,deviceIdFor,deviceNumberFor,clearScheduleDevices,validateStudentDraft,validateRestoredState,liveAvailability,weekDates,isDeviceAvailable,availableDevices,sameDeviceAlternateTimes,mountRegistration,augmentScheduleSnapshot,validateRegistration,validateCenterDeviceCount,missingDeviceDays,studentDeviceSummaryHtml,bindStudentModal,renderDevicesPage,guidedConflictChoices:true,chosenDeviceAppliesToSchedule:true,singleSelectedDeviceGrid:true,conflictOnlyAssignmentDetails:true,manualDeviceAssignmentOnly:true,noAutomaticDeviceSelection:true,preferredDeviceWithPerDayExceptions:true,sameDeviceDifferentTimeSuggestions:true,sameTimeDifferentDeviceSuggestions:true,crossCourseConflictProtection:true,existingStudentsRequireManualAssignment:true,devicePageDateAvailability:true,weeklyDeviceSchedule:true,stableDeviceIdentities:true,atomicSchedulePersistence:true,centerDeviceCountPersisted:true,courseDeviceOptInDefaultFalse:true,allAssignmentsEditable:true});
})();
