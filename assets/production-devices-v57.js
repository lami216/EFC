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
function int(value){return Math.max(0,Math.floor(Number(value||0)));}
function courseOf(value){return typeof value==='object'&&value?value:window.spec?.(String(value||''));}
function requiresDevice(value){return courseOf(value)?.requiresDevice===true;}
function centerOf(id){return (window.branches||[]).find(item=>String(item.id)===String(id))||null;}
function deviceCountForCenter(id){return int(centerOf(id)?.deviceCount);}
function dayLabel(key){return DAYS.find(day=>day.key===key)?.ar||key||'—';}
function deviceLabel(value){return int(value)>0?'جهاز '+int(value):'غير محدد';}
function addDaysIso(value,days){
  const d=new Date(String(value||D.today())+'T12:00:00');
  if(Number.isNaN(d.getTime()))return'';
  d.setDate(d.getDate()+Number(days||0));
  return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0');
}
function candidateEnd(start,specialtyId){
  const item=courseOf(specialtyId);
  if(!item||D.courseTypeOf(item)==='normal')return'';
  return addDaysIso(start,Math.max(1,Number(item.quickDays||item.durationValue||1)));
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
    return Boolean(item?.selected&&String(item.time||'')===String(time)&&int(item.deviceNumber)===targetDevice);
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
function sameDayAlternatives(args){
  return ALLOWED_HOURS.filter(time=>time!==String(args.time||'')).map(time=>({time,devices:availableDevices({...args,time})})).filter(item=>item.devices.length);
}
function currentEditStudent(){return window.EFC_REGISTRATION_EDIT_V17?.current?.()?.student||null;}
function contextFor(form,student=null){
  const specialtyId=String(form?.elements?.specialty?.value||student?.specialty||'');
  const branch=String(form?.elements?.branch?.value||student?.branch||'');
  const start=String(form?.elements?.start?.value||student?.start||D.today());
  return{branch,specialtyId,start,end:candidateEnd(start,specialtyId),studentId:String(student?.id||'')};
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
  (Array.isArray(schedule.days)?schedule.days:[]).forEach(day=>{const device=int(day?.deviceNumber);if(device)assignments[String(day.key||'')]=device;});
  return{preferred:int(schedule.preferredDeviceNumber),assignments,lastBranch:String(student?.branch||''),lastSpecialty:String(student?.specialty||'')};
}
function registrationState(form){
  let state=formStates.get(form);if(state)return state;
  state=initialState(currentEditStudent());formStates.set(form,state);return state;
}
function availabilityArgs(ctx,row){return{branch:ctx.branch,day:row.key,time:row.time,start:ctx.start,end:ctx.end,excludeStudentId:ctx.studentId};}
function optionList(devices,current=0){
  const values=[...devices];if(current&&!values.includes(current))values.unshift(current);
  return values.map(device=>`<option value="${device}"${device===current?' selected':''}${!devices.includes(device)?' disabled':''}>${esc(deviceLabel(device))}${!devices.includes(device)?' · متعارض':''}</option>`).join('');
}
function renderRegistrationPanel(form,scheduleRoot){
  const panel=document.getElementById('deviceAssignmentV57');
  if(!panel||panel.dataset.formId!==form.dataset.deviceFormV57)return;
  const state=registrationState(form),student=currentEditStudent(),ctx=contextFor(form,student),course=courseOf(ctx.specialtyId);
  if(!requiresDevice(course)){panel.hidden=true;return;}
  panel.hidden=false;
  const count=deviceCountForCenter(ctx.branch),rows=selectedRows(form,scheduleRoot),center=centerOf(ctx.branch);
  if(!ctx.branch||!course){panel.innerHTML='<div class="device-empty-v57">اختر المركز والدورة أولًا لعرض الأجهزة.</div>';return;}
  if(!count){panel.innerHTML=`<div class="device-assignment-head-v57"><div><small>الأجهزة</small><h3>تخصيص جهاز الطالب</h3></div><span>${esc(center?.name||'المركز')}</span></div><div class="device-warning-v57">هذا المركز لا يحتوي أجهزة معرفة. أضف عدد الأجهزة من «الدورات و المراكز» أولًا.</div>`;return;}
  if(state.preferred>count){state.preferred=0;state.assignments={};}
  const preferredOptions=Array.from({length:count},(_,i)=>i+1).map(device=>`<option value="${device}"${state.preferred===device?' selected':''}>${esc(deviceLabel(device))}</option>`).join('');
  const rowHtml=rows.map(row=>{
    const args=availabilityArgs(ctx,row),available=availableDevices(args);
    if(state.preferred&&!state.assignments[row.key]&&available.includes(state.preferred))state.assignments[row.key]=state.preferred;
    const assigned=int(state.assignments[row.key]),assignedAvailable=assigned>0&&available.includes(assigned),preferredAvailable=state.preferred>0&&available.includes(state.preferred);
    const alternates=state.preferred?sameDeviceAlternateTimes({...args,deviceNumber:state.preferred}):[];
    const general=!available.length?sameDayAlternatives(args).slice(0,4):[];
    const status=assigned&&assignedAvailable?(assigned===state.preferred?'الجهاز الأساسي متاح':'جهاز بديل لهذا اليوم'):(assigned?'الجهاز المحدد أصبح متعارضًا':'لم يحدد جهاز لهذا اليوم');
    const deviceSelect=state.preferred?`<select data-device-day-v57="${row.key}"><option value="">اختر جهاز هذا اليوم</option>${optionList(available,assigned)}</select>`:'<select disabled><option>اختر الجهاز الأساسي أولًا</option></select>';
    const sameTime=state.preferred&&available.length?`<div class="device-hint-v57"><b>نفس الوقت:</b> ${available.map(device=>esc(deviceLabel(device))).join('، ')}</div>`:'';
    const sameDevice=state.preferred&&!preferredAvailable&&alternates.length?`<div class="device-suggestions-v57"><b>${esc(deviceLabel(state.preferred))} متاح في نفس اليوم:</b>${alternates.map(time=>`<button type="button" data-device-time-v57="${row.key}" data-time-v57="${time}">${time}</button>`).join('')}</div>`:'';
    const anyTime=!available.length&&general.length?`<div class="device-hint-v57 warning"><b>أوقات فيها أجهزة متاحة:</b> ${general.map(item=>`${item.time} (${item.devices.map(device=>esc(deviceLabel(device))).join('، ')})`).join(' · ')}</div>`:'';
    return`<article class="device-day-v57 ${assigned&&assignedAvailable?'ok':'needs'}"><div class="device-day-name-v57"><b>${row.ar}</b><span>${row.time}</span></div><div class="device-day-choice-v57">${deviceSelect}<small>${esc(status)}</small></div><div class="device-day-help-v57">${sameTime}${sameDevice}${anyTime}</div></article>`;
  }).join('');
  panel.innerHTML=`<div class="device-assignment-head-v57"><div><small>الأجهزة</small><h3>تخصيص جهاز الطالب</h3></div><span>${esc(center?.name||ctx.branch)} · ${count} جهاز</span></div><div class="device-preferred-v57"><label><span>الجهاز الأساسي المفضل</span><select id="devicePreferredV57"><option value="">اختر الجهاز</option>${preferredOptions}</select></label><p>اختيار الجهاز يدوي. يطبق الجهاز الذي تختاره على الأيام المتاحة فقط، ولا يختار النظام جهازًا بديلًا من نفسه.</p></div>${rows.length?`<div class="device-days-v57">${rowHtml}</div>`:'<div class="device-warning-v57">حدد أيام الطالب وساعاته أولًا، ثم اختر الجهاز.</div>'}`;
  const preferred=panel.querySelector('#devicePreferredV57');
  if(preferred)preferred.onchange=()=>{state.preferred=int(preferred.value);state.assignments={};renderRegistrationPanel(form,scheduleRoot);};
  panel.querySelectorAll('[data-device-day-v57]').forEach(select=>select.onchange=()=>{const key=String(select.dataset.deviceDayV57||''),value=int(select.value);if(value)state.assignments[key]=value;else delete state.assignments[key];renderRegistrationPanel(form,scheduleRoot);});
  panel.querySelectorAll('[data-device-time-v57]').forEach(button=>button.onclick=()=>{
    const key=String(button.dataset.deviceTimeV57||''),time=String(button.dataset.timeV57||''),timeSelect=scheduleRoot.querySelector(`[data-schedule-day-time="${key}"]`);
    if(!timeSelect)return;
    timeSelect.value=time;state.assignments[key]=state.preferred;timeSelect.dispatchEvent(new Event('change',{bubbles:true}));
  });
  window.EFC_SYNC_SELECTS_V19?.(panel);
}
function mountRegistration(form,scheduleRoot){
  if(!form||!scheduleRoot)return;
  if(!form.dataset.deviceFormV57)form.dataset.deviceFormV57='device-'+Date.now().toString(36);
  let panel=document.getElementById('deviceAssignmentV57');
  if(!panel){panel=document.createElement('section');panel.id='deviceAssignmentV57';panel.className='card device-assignment-v57';scheduleRoot.insertAdjacentElement('afterend',panel);}
  panel.dataset.formId=form.dataset.deviceFormV57;
  const state=registrationState(form),ctx=contextFor(form,currentEditStudent());state.lastBranch=ctx.branch;state.lastSpecialty=ctx.specialtyId;
  if(form.dataset.deviceBindingsV57!=='1'){
    form.dataset.deviceBindingsV57='1';
    ['branch','specialty'].forEach(name=>form.elements[name]?.addEventListener('change',()=>{
      const next=contextFor(form,currentEditStudent());
      if(next.branch!==state.lastBranch||next.specialtyId!==state.lastSpecialty){state.preferred=0;state.assignments={};state.lastBranch=next.branch;state.lastSpecialty=next.specialtyId;}
      renderRegistrationPanel(form,scheduleRoot);
    }));
    scheduleRoot.addEventListener('change',()=>renderRegistrationPanel(form,scheduleRoot));
    form.addEventListener('reset',()=>queueMicrotask(()=>{state.preferred=0;state.assignments={};state.lastBranch='';state.lastSpecialty='';renderRegistrationPanel(form,scheduleRoot);}));
  }
  renderRegistrationPanel(form,scheduleRoot);
}
function augmentScheduleSnapshot(snapshot,{form,student=null}={}){
  const item=courseOf(snapshot?.specialtyId),baseDays=Array.isArray(snapshot?.days)?snapshot.days:[];
  if(!requiresDevice(item))return{...snapshot,version:4,preferredDeviceNumber:null,days:baseDays.map(day=>({...day,deviceNumber:null}))};
  const state=form?registrationState(form):initialState(student),preferred=int(state.preferred);
  return{...snapshot,version:4,preferredDeviceNumber:preferred||null,days:baseDays.map(day=>({...day,deviceNumber:day.selected&&day.time?(int(state.assignments?.[day.key])||null):null}))};
}
function validateRegistration({form,snapshot,studentId=''}) {
  const specialtyId=String(form?.elements?.specialty?.value||snapshot?.specialtyId||''),course=courseOf(specialtyId);
  if(!requiresDevice(course))return{ok:true};
  const branch=String(form?.elements?.branch?.value||''),start=String(form?.elements?.start?.value||D.today()),end=candidateEnd(start,specialtyId),count=deviceCountForCenter(branch);
  if(!count)return{ok:false,message:'هذه الدورة تحتاج جهازًا، لكن المركز المحدد لا يحتوي أجهزة معرفة.'};
  const days=(Array.isArray(snapshot?.days)?snapshot.days:[]).filter(day=>day?.selected&&day?.time);
  if(!days.length)return{ok:false,message:'هذه الدورة تحتاج جهازًا. حدد يومًا ووقتًا واحدًا على الأقل في جدول الطالب.'};
  const preferred=int(snapshot?.preferredDeviceNumber);
  if(!preferred||preferred>count)return{ok:false,message:'اختر الجهاز الأساسي للطالب قبل حفظ التسجيل.'};
  for(const day of days){
    const device=int(day.deviceNumber);
    if(!device||device>count)return{ok:false,message:`حدد جهاز يوم ${dayLabel(day.key)} الساعة ${day.time} قبل الحفظ.`};
    if(!isDeviceAvailable({branch,day:day.key,time:day.time,deviceNumber:device,start,end,excludeStudentId:String(studentId||'')}))return{ok:false,message:`${deviceLabel(device)} لم يعد متاحًا يوم ${dayLabel(day.key)} الساعة ${day.time}. اختر جهازًا أو وقتًا آخر.`};
  }
  return{ok:true};
}
function missingDeviceDays(student){
  if(!studentActiveForDevices(student))return[];
  const count=deviceCountForCenter(student.branch),days=(Array.isArray(student.schedule?.days)?student.schedule.days:[]).filter(day=>day?.selected&&day?.time);
  if(!days.length)return[{key:'schedule',ar:'الجدول',time:'',deviceNumber:null}];
  return days.filter(day=>{const device=int(day.deviceNumber);return!device||device>count;});
}
function validateCenterDeviceCount(branchId,nextCount){
  const count=int(nextCount),affected=(window.students||[]).filter(student=>studentActiveForDevices(student)&&String(student.branch)===String(branchId)&&(Array.isArray(student.schedule?.days)?student.schedule.days:[]).some(day=>day?.selected&&int(day.deviceNumber)>count));
  if(!affected.length)return{ok:true};
  const names=affected.slice(0,5).map(student=>String(student.name||'طالب')).join('، '),more=affected.length>5?' و'+(affected.length-5)+' آخرين':'';
  return{ok:false,message:`لا يمكن تقليل الأجهزة إلى ${count} لأن هناك حجوزات على أجهزة أعلى من هذا الرقم للطلاب: ${names}${more}. عدّل أجهزة هؤلاء الطلاب أولًا.`,affected};
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
    const item=scheduleDay(student,day),device=int(item?.deviceNumber);
    if(item?.selected&&item.time&&device)rows.push({student,time:String(item.time),device,course:courseOf(student.specialty)});
  });
  return rows;
}
function renderDevicesPage(){
  window.currentPage='devices';
  if(!(window.branches||[]).length){window.shell(window.pageTitle('التشغيل','الأجهزة','إدارة أجهزة المراكز وجداول استخدامها.')+'<div class="card production-empty-config"><h2>لا توجد مراكز</h2><p>أضف مركزًا أولًا من صفحة الدورات و المراكز.</p></div>');return;}
  const today=D.today(),defaultBranch=String(window.branches[0]?.id||'');
  window.shell(`<section class="devices-hero-v57"><h1>الأجهزة</h1><p>اعرف المتاح والمشغول، ومن يستخدم كل جهاز، وحدد التاريخ والمركز.</p></section><div class="card devices-controls-v57"><label>المركز<select id="devicesBranchV57">${window.opts(window.branches,x=>x.id,x=>x.name)}</select></label><label>التاريخ<input class="input" id="devicesDateV57" type="date" value="${today}"></label><div id="devicesDayV57"></div></div><div id="devicesBodyV57"></div>`);
  const branchSelect=document.getElementById('devicesBranchV57'),dateInput=document.getElementById('devicesDateV57');branchSelect.value=defaultBranch;
  const draw=()=>{
    const branch=String(branchSelect.value||defaultBranch),date=String(dateInput.value||today),center=centerOf(branch),count=deviceCountForCenter(branch),bookings=bookingsForDate(branch,date),day=dayKeyForDate(date);
    const missing=(window.students||[]).filter(student=>studentActiveForDevices(student)&&String(student.branch)===branch&&missingDeviceDays(student).length),body=document.getElementById('devicesBodyV57');
    document.getElementById('devicesDayV57').textContent=dayLabel(day)+' · '+showDate(date);
    if(!count){body.innerHTML=`<div class="devices-kpis-v57"><div><small>عدد الأجهزة</small><b>0</b></div><div><small>حجوزات اليوم</small><b>0</b></div><div class="warn"><small>طلاب بحاجة لتحديد جهاز</small><b>${missing.length}</b></div></div><div class="card device-empty-page-v57">لا توجد أجهزة معرفة في ${esc(center?.name||'هذا المركز')}. عدّل المركز وأدخل عدد الأجهزة أولًا.</div>`;return;}
    const times=[...new Set([...ALLOWED_HOURS,...bookings.map(item=>item.time)])].sort((a,b)=>a.localeCompare(b)),cells=new Map();
    bookings.forEach(item=>{const key=item.time+'|'+item.device,list=cells.get(key)||[];list.push(item);cells.set(key,list);});
    const head=Array.from({length:count},(_,i)=>`<th>جهاز ${i+1}</th>`).join('');
    const rows=times.map(time=>`<tr><th>${time}</th>${Array.from({length:count},(_,i)=>{const device=i+1,list=cells.get(time+'|'+device)||[];if(!list.length)return'<td class="device-free-v57">متاح</td>';const first=list[0],collision=list.length>1;return`<td class="device-busy-v57 ${collision?'collision':''}" data-device-student-v57="${esc(String(first.student.id||''))}"><b>${esc(first.student.name||'طالب')}</b><small>${esc(first.course?.name||first.student.specialty||'الدورة')}</small>${collision?`<em>تعارض ${list.length}</em>`:''}</td>`;}).join('')}</tr>`).join('');
    const missingRows=missing.length?missing.map(student=>`<button type="button" data-device-open-student-v57="${esc(String(student.id||''))}"><span><b>${esc(student.name||'طالب')}</b><small>${esc(courseOf(student.specialty)?.name||student.specialty||'الدورة')}</small></span><em>${missingDeviceDays(student).length} موعد يحتاج جهاز</em></button>`).join(''):'<div class="devices-none-v57">كل الطلاب مربوطون بأجهزة صالحة.</div>';
    body.innerHTML=`<div class="devices-kpis-v57"><div><small>عدد الأجهزة</small><b>${count}</b></div><div><small>حجوزات اليوم</small><b>${bookings.length}</b></div><div class="${missing.length?'warn':''}"><small>طلاب بحاجة لتحديد جهاز</small><b>${missing.length}</b></div></div><section class="card devices-grid-card-v57"><div class="devices-grid-head-v57"><h2>جدول الأجهزة</h2><span>${esc(center?.name||branch)} · ${esc(dayLabel(day))}</span></div><div class="devices-table-wrap-v57"><table><thead><tr><th>الوقت</th>${head}</tr></thead><tbody>${rows}</tbody></table></div></section><section class="card devices-missing-v57"><div><h2>طلاب بحاجة لتحديد جهاز</h2><p>طلاب في دورات تحتاج أجهزة ولم يكتمل ربط مواعيدهم.</p></div><div class="devices-missing-list-v57">${missingRows}</div></section>`;
    body.querySelectorAll('[data-device-student-v57],[data-device-open-student-v57]').forEach(element=>element.onclick=()=>window.openStudent?.(element.dataset.deviceStudentV57||element.dataset.deviceOpenStudentV57,'profile'));
  };
  branchSelect.onchange=draw;dateInput.onchange=draw;draw();window.EFC_SYNC_SELECTS_V19?.(document);
}
const style=document.createElement('style');style.id='efc-devices-style-v57';style.textContent="\n.device-assignment-v57{grid-column:2;min-width:0;padding:16px;border:1.5px solid #9bcfc0;background:linear-gradient(180deg,#f8fffc,#eefaf5);border-radius:15px;box-shadow:0 10px 24px rgba(9,94,69,.06)}\n.device-assignment-v57[hidden]{display:none!important}.device-assignment-head-v57{display:flex;align-items:center;justify-content:space-between;gap:12px;margin-bottom:12px}.device-assignment-head-v57 small{display:block;color:#628078;font-size:9px;font-weight:800}.device-assignment-head-v57 h3{margin:2px 0 0;font-size:18px;color:#123e33}.device-assignment-head-v57>span{padding:7px 10px;border-radius:8px;background:#e1f3ec;color:#174f40;font-size:10px;font-weight:800}\n.device-preferred-v57{display:grid;grid-template-columns:minmax(210px,280px) 1fr;gap:12px;align-items:end;padding:11px;border:1px solid #c8e2d9;border-radius:11px;background:#fff}.device-preferred-v57 label{display:grid;gap:6px}.device-preferred-v57 label>span{font-size:10px;font-weight:850;color:#244a40}.device-preferred-v57 select{height:42px;border:1px solid #bfcfca;border-radius:9px;background:#fff;padding:0 10px}.device-preferred-v57 p{margin:0;color:#657a73;font-size:9.5px;line-height:1.65}\n.device-days-v57{display:grid;gap:8px;margin-top:10px}.device-day-v57{display:grid;grid-template-columns:105px 210px minmax(0,1fr);gap:10px;align-items:center;padding:9px 10px;border:1px solid #d7e5e0;border-radius:10px;background:#fff}.device-day-v57.needs{border-color:#e4c67e;background:#fffdf6}.device-day-name-v57,.device-day-choice-v57,.device-day-help-v57{display:grid;gap:4px}.device-day-name-v57 b{font-size:12px;color:#153f34}.device-day-name-v57 span{font-size:10px;color:#657a73}.device-day-choice-v57 select{height:38px;border:1px solid #c8d5d1;border-radius:8px;background:#fff;padding:0 8px}.device-day-choice-v57 small,.device-hint-v57,.device-suggestions-v57{font-size:8.8px;color:#5b716a;line-height:1.5}.device-hint-v57.warning{color:#8a5a17}.device-suggestions-v57{display:flex;align-items:center;gap:5px;flex-wrap:wrap}.device-suggestions-v57 button{border:1px solid #9dcbbd;border-radius:7px;background:#edf9f5;color:#145643;padding:5px 8px;font:750 9px inherit;cursor:pointer}.device-warning-v57,.device-empty-v57{padding:12px;border:1px solid #e1c985;border-radius:10px;background:#fff9e8;color:#795b1b;font-size:10px;line-height:1.7}\n.student-device-summary-v57{margin:14px 0;padding:14px;border:1px solid #b9dcd1;border-radius:12px;background:#f7fcfa}.student-device-summary-v57.needs{border-color:#e4c67e;background:#fffaf0}.student-device-summary-head-v57{display:flex;align-items:center;justify-content:space-between;gap:12px}.student-device-summary-head-v57 h3{margin:2px 0 0;font-size:13px}.student-device-summary-head-v57 small{font-size:8px;color:#6c817a}.student-device-summary-head-v57>b{font-size:12px;color:#0a654e}.student-device-days-v57{display:flex;flex-wrap:wrap;gap:6px;margin-top:10px}.student-device-days-v57 span{padding:6px 8px;border:1px solid #d5e5df;border-radius:8px;background:#fff;font-size:9px}.student-device-summary-v57 p{font-size:9px;color:#805e1d}.student-device-summary-v57 .edit-student-device-v57{margin-top:10px}\n.content:has(.devices-hero-v57){width:min(1120px,calc(100% - 32px));max-width:1120px;margin:0 auto;padding:18px 0 36px}.devices-hero-v57{width:min(520px,100%);margin:0 auto 16px;padding:15px 20px;border-radius:16px;background:linear-gradient(135deg,#e4f8f0,#d4efe5);text-align:center}.devices-hero-v57 h1{margin:0;font-size:30px;color:#073f35}.devices-hero-v57 p{margin:5px 0 0;font-size:9px;color:#58756c}\n.devices-controls-v57{display:grid;grid-template-columns:240px 190px 1fr;gap:12px;align-items:end;padding:14px;margin-bottom:12px}.devices-controls-v57 label{display:grid;gap:5px;font-size:10px;font-weight:800}.devices-controls-v57 select,.devices-controls-v57 input{height:40px}.devices-controls-v57>div{justify-self:end;padding:8px 11px;border-radius:8px;background:#edf7f3;color:#28564a;font-size:10px;font-weight:800}\n.devices-kpis-v57{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:10px;margin-bottom:12px}.devices-kpis-v57>div{min-height:72px;padding:12px 14px;border:1px solid #bedfd4;border-radius:11px;background:#f1faf7;display:flex;align-items:center;justify-content:space-between}.devices-kpis-v57 small{font-size:10px;color:#395d53;font-weight:800}.devices-kpis-v57 b{font-size:22px;color:#0b654f}.devices-kpis-v57 .warn{border-color:#e4c67e;background:#fff9ea}.devices-kpis-v57 .warn b{color:#9a6514}\n.devices-grid-card-v57{padding:14px}.devices-grid-head-v57{display:flex;align-items:center;justify-content:space-between;margin-bottom:10px}.devices-grid-head-v57 h2,.devices-missing-v57 h2{margin:0;font-size:15px}.devices-grid-head-v57 span{font-size:9px;color:#62766f}.devices-table-wrap-v57{overflow:auto;border:1px solid #cbdad5;border-radius:10px}.devices-table-wrap-v57 table{width:100%;min-width:760px;border-collapse:collapse}.devices-table-wrap-v57 th,.devices-table-wrap-v57 td{height:58px;padding:6px;border:1px solid #d5e1dd;text-align:center}.devices-table-wrap-v57 thead th{height:42px;background:#075d4c;color:#fff;font-size:10px}.devices-table-wrap-v57 tbody>tr>th{background:#eef4f1;font-size:10px}.device-free-v57{background:#effaf5;color:#22805f;font-size:9px;font-weight:800}.device-busy-v57{background:#fff4cf;cursor:pointer}.device-busy-v57 b,.device-busy-v57 small,.device-busy-v57 em{display:block}.device-busy-v57 b{font-size:9.5px}.device-busy-v57 small,.device-busy-v57 em{margin-top:3px;font-size:8px}.device-busy-v57.collision{background:#ffe7e3}\n.devices-missing-v57{display:grid;grid-template-columns:240px 1fr;gap:14px;margin-top:12px;padding:14px}.devices-missing-v57 p{margin:5px 0 0;font-size:9px;color:#667a73}.devices-missing-list-v57{display:grid;gap:6px}.devices-missing-list-v57 button{width:100%;min-height:47px;border:1px solid #d6e2de;border-radius:9px;background:#fff;display:flex;align-items:center;justify-content:space-between;text-align:right;padding:7px 10px;cursor:pointer}.devices-missing-list-v57 button b,.devices-missing-list-v57 button small{display:block}.devices-missing-list-v57 button b{font-size:10px}.devices-missing-list-v57 button small,.devices-missing-list-v57 button em{font-size:8px;color:#74867f}.devices-missing-list-v57 button em{font-style:normal;color:#9a6514}.devices-none-v57,.device-empty-page-v57{padding:22px;text-align:center;color:#667a73;font-size:10px}\n@media(max-width:1000px){.device-day-v57{grid-template-columns:90px 190px minmax(0,1fr)}.devices-missing-v57{grid-template-columns:1fr}.devices-controls-v57{grid-template-columns:1fr 1fr}.devices-controls-v57>div{grid-column:1/-1;justify-self:start}}\n@media(max-width:900px){.device-assignment-v57{grid-column:1}.device-day-v57,.device-preferred-v57{grid-template-columns:1fr}.devices-kpis-v57{grid-template-columns:1fr}.content:has(.devices-hero-v57){width:calc(100% - 20px)}}\n";document.head.appendChild(style);
window.EFC_RENDER_DEVICES_V57=renderDevicesPage;
window.EFC_DEVICES_V57=Object.freeze({ready:true,requiresDevice,deviceCountForCenter,isDeviceAvailable,availableDevices,sameDeviceAlternateTimes,sameDayAlternatives,mountRegistration,augmentScheduleSnapshot,validateRegistration,validateCenterDeviceCount,missingDeviceDays,studentDeviceSummaryHtml,bindStudentModal,renderDevicesPage,manualDeviceAssignmentOnly:true,noAutomaticDeviceSelection:true,preferredDeviceWithPerDayExceptions:true,sameDeviceDifferentTimeSuggestions:true,sameTimeDifferentDeviceSuggestions:true,crossCourseConflictProtection:true,existingStudentsRequireManualAssignment:true,devicePageDateAvailability:true,centerDeviceCountPersisted:true,courseDeviceOptInDefaultFalse:true,allAssignmentsEditable:true});
})();