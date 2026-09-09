(()=>{
'use strict';
if(window.EFC_FISCAL_V13?.ready)return;
const D=window.EFC_DOMAIN_V13;
if(!D?.ready||!window.EFC_SECURITY_UI_V13?.ready||!window.EFC_CERTIFICATES_V13?.ready)throw new Error('Fiscal v13 loaded before the v13 runtime was ready.');

const invoke=window.__TAURI__?.core?.invoke;
const STORAGE_KEY='efc-fiscal-state-v13';
const CERTIFICATE_STORAGE='efc-certificate-state-v1';
const VERSION=13;
const {esc,today,cash,showDate,isInactive,remainingAmount,expenseSpecialtyName}=D;
const baseForcePersist=window.EFC_FORCE_PERSIST;
const baseApplyRestored=window.EFC_APPLY_RESTORED_STATE;
let state={version:VERSION,config:null,archives:[],pendingClose:null,updatedAt:0};
let saving=false;

const pad2=value=>String(value).padStart(2,'0');
const readJson=(key,fallback)=>{try{return JSON.parse(localStorage.getItem(key)||'null')??fallback;}catch{return fallback;}};
const safeDate=value=>/^\d{4}-\d{2}-\d{2}$/.test(String(value||''))?String(value):'';
const dateOnly=value=>new Date(`${value}T12:00:00`);
const iso=date=>`${date.getFullYear()}-${pad2(date.getMonth()+1)}-${pad2(date.getDate())}`;
function addDays(value,days){const date=dateOnly(value);date.setDate(date.getDate()+Number(days||0));return iso(date);}
function addYearsClamped(value,years){const source=dateOnly(value),month=source.getMonth(),day=source.getDate(),targetYear=source.getFullYear()+Number(years||0),last=new Date(targetYear,month+1,0).getDate();return `${targetYear}-${pad2(month+1)}-${pad2(Math.min(day,last))}`;}
function inPeriod(value,start,end){const date=safeDate(value);return Boolean(date&&(!start||date>=start)&&date<=end);}
function clone(value){return JSON.parse(JSON.stringify(value));}
function money(value){return Math.max(0,Number(value||0));}
function currentAdmin(){const user=window.EFC_AUTH_V13?.currentUser?.();return user?.role==='admin'?user:null;}

function normalizeArchive(item,index){
  if(!item||typeof item!=='object')return null;
  const boundary=safeDate(item.boundary),periodEnd=safeDate(item.periodEnd);
  if(!boundary||!periodEnd)return null;
  return{
    ...item,
    id:String(item.id||`fiscal-${boundary}`),
    number:Math.max(1,Number(item.number||index+1)),
    first:Boolean(item.first),
    periodStart:item.periodStart?safeDate(item.periodStart):null,
    periodEnd,
    boundary,
    closedAt:Number(item.closedAt||0),
    closedBy:String(item.closedBy||''),
    totals:item.totals&&typeof item.totals==='object'?item.totals:{},
    byMonth:Array.isArray(item.byMonth)?item.byMonth:[],
    byBranch:Array.isArray(item.byBranch)?item.byBranch:[],
    bySpecialty:Array.isArray(item.bySpecialty)?item.bySpecialty:[],
    byMethod:Array.isArray(item.byMethod)?item.byMethod:[],
    expensePurposes:Array.isArray(item.expensePurposes)?item.expensePurposes:[],
    certificateCenters:Array.isArray(item.certificateCenters)?item.certificateCenters:[],
    cleanup:item.cleanup&&typeof item.cleanup==='object'?item.cleanup:{}
  };
}
function normalizeState(raw){
  const source=raw&&typeof raw==='object'?raw:{};
  const config=source.config&&safeDate(source.config.anchorDate)?{
    anchorDate:safeDate(source.config.anchorDate),
    configuredAt:safeDate(source.config.configuredAt)||safeDate(source.config.anchorDate),
    configuredBy:String(source.config.configuredBy||''),
    createdAt:Number(source.config.createdAt||0)
  }:null;
  const archives=(Array.isArray(source.archives)?source.archives:[]).map(normalizeArchive).filter(Boolean).sort((a,b)=>a.number-b.number);
  const pending=source.pendingClose&&typeof source.pendingClose==='object'&&source.pendingClose.archive?{
    archive:normalizeArchive(source.pendingClose.archive,archives.length),
    cleanupPlan:source.pendingClose.cleanupPlan&&typeof source.pendingClose.cleanupPlan==='object'?source.pendingClose.cleanupPlan:{studentIds:[],expenses:0,certificates:0},
    startedAt:Number(source.pendingClose.startedAt||Date.now()),
    backupPath:String(source.pendingClose.backupPath||'')
  }:null;
  return{version:VERSION,config,archives,pendingClose:pending?.archive?pending:null,updatedAt:Math.max(0,Number(source.updatedAt||0))};
}
function writeLocal(touch=true){if(touch)state.updatedAt=Date.now();localStorage.setItem(STORAGE_KEY,JSON.stringify(state));}

async function hydrate(){
  const local=normalizeState(readJson(STORAGE_KEY,{}));
  if(!invoke){state=local;writeLocal(false);return;}
  try{
    const raw=await invoke('load_app_state'),native=raw?normalizeState(JSON.parse(raw)?.fiscalState||{}):normalizeState({});
    state=native.updatedAt>local.updatedAt?native:local;
  }catch(error){console.error('EFC fiscal state load failed; local fiscal state kept.',error);state=local;}
  writeLocal(false);
}
async function persistFiscal(){
  writeLocal();
  if(typeof baseForcePersist!=='function')return null;
  const appState=await baseForcePersist();
  appState.fiscalState=clone(state);
  if(invoke)await invoke('save_app_state',{state:JSON.stringify(appState)});
  return appState;
}
if(typeof baseForcePersist==='function')window.EFC_FORCE_PERSIST=async()=>await persistFiscal();
if(typeof baseApplyRestored==='function')window.EFC_APPLY_RESTORED_STATE=async incoming=>{
  const result=await baseApplyRestored(incoming);
  const imported=incoming?.fiscalState?normalizeState(incoming.fiscalState):null;
  if(imported?.config){
    if(!state.config)state=imported;
    else if(imported.config.anchorDate===state.config.anchorDate){
      const byBoundary=new Map(state.archives.map(item=>[item.boundary,item]));
      imported.archives.forEach(item=>{if(!byBoundary.has(item.boundary))byBoundary.set(item.boundary,item);});
      state.archives=[...byBoundary.values()].sort((a,b)=>a.number-b.number);
      state.updatedAt=Math.max(state.updatedAt,imported.updatedAt);
    }else console.warn('EFC fiscal restore ignored an archive with a different fiscal anchor.');
    await persistFiscal();
  }
  return result;
};

function nextPlan(){
  if(!state.config)return null;
  const number=state.archives.length+1,boundary=addYearsClamped(state.config.anchorDate,number),periodStart=number===1?null:addYearsClamped(state.config.anchorDate,number-1),periodEnd=addDays(boundary,-1);
  return{number,boundary,periodStart,periodEnd,first:number===1,due:today()>=boundary};
}
function periodLabel(plan){return plan.first?`من بداية السجلات حتى ${showDate(plan.periodEnd)}`:`${showDate(plan.periodStart)} — ${showDate(plan.periodEnd)}`;}
function monthKey(date){return String(date||'').slice(0,7);}
function studentBranchLabel(row){return typeof branchName==='function'?branchName(row?.student?.branch):String(row?.student?.branch||'—');}
function studentSpecialtyLabel(row){return typeof spec==='function'?(spec(row?.student?.specialty)?.name||row?.student?.specialty||'—'):String(row?.student?.specialty||'—');}
function certificateStateFromLocal(){const raw=readJson(CERTIFICATE_STORAGE,{});return{certificateBranches:Array.isArray(raw?.certificateBranches)?raw.certificateBranches:[],certificateReceipts:Array.isArray(raw?.certificateReceipts)?raw.certificateReceipts:[]};}
function mergeCertificateStates(a,b){
  const branches=[],receipts=[],branchSeen=new Set(),receiptSeen=new Set();
  for(const source of [a,b]){
    (source?.certificateBranches||[]).forEach(item=>{const key=String(item?.recordCode||item?.id||item?.name||'');if(!key||branchSeen.has(key))return;branchSeen.add(key);branches.push(item);});
    (source?.certificateReceipts||[]).forEach(item=>{const key=String(item?.recordCode||item?.transactionCode||item?.id||'');if(!key||receiptSeen.has(key))return;receiptSeen.add(key);receipts.push(item);});
  }
  return{certificateBranches:branches,certificateReceipts:receipts};
}
async function readCertificateState(){
  const local=certificateStateFromLocal();
  if(!invoke)return local;
  try{const raw=await invoke('load_certificate_state');return raw?mergeCertificateStates(local,JSON.parse(raw)):local;}catch(error){console.error('EFC fiscal certificate read failed; local certificate state used.',error);return local;}
}
async function writeCertificateState(next){localStorage.setItem(CERTIFICATE_STORAGE,JSON.stringify(next));if(invoke)await invoke('save_certificate_state',{state:JSON.stringify(next)});}

function newMetric(key,label){return{key:String(key||'—'),label:String(label||key||'—'),studentIncome:0,certificateIncome:0,income:0,expenses:0,profit:0,studentPayments:0,certificates:0,expenseCount:0};}
function metric(map,key,label){const id=String(key||'—');if(!map.has(id))map.set(id,newMetric(id,label));return map.get(id);}
function finishMetrics(map){return[...map.values()].map(item=>({...item,income:item.studentIncome+item.certificateIncome,profit:item.studentIncome+item.certificateIncome-item.expenses})).sort((a,b)=>b.income-a.income||b.expenses-a.expenses||a.label.localeCompare(b.label,'ar'));}
function aggregateSnapshot(plan,certificateState){
  const studentPayments=allPayments().filter(row=>row?.sourceType!=='certificate'&&inPeriod(row?.date,plan.periodStart,plan.periodEnd));
  const certificates=(certificateState.certificateReceipts||[]).filter(row=>inPeriod(row?.date,plan.periodStart,plan.periodEnd));
  const expenses=D.getExpenses().filter(row=>inPeriod(row?.date,plan.periodStart,plan.periodEnd));
  const months=new Map(),branchesMap=new Map(),specialtiesMap=new Map(),methodsMap=new Map(),purposeMap=new Map(),centerMap=new Map();
  const addIncome=(row,kind,branchLabel,specialtyLabel)=>{
    const amount=money(row.amount),method=String(row.method||'—'),month=monthKey(row.date);
    for(const [map,key,label] of [[months,month,month],[branchesMap,branchLabel,branchLabel],[specialtiesMap,specialtyLabel,specialtyLabel],[methodsMap,method,method]]){
      const item=metric(map,key,label);if(kind==='certificate'){item.certificateIncome+=amount;item.certificates+=1;}else{item.studentIncome+=amount;item.studentPayments+=1;}
    }
  };
  studentPayments.forEach(row=>addIncome(row,'student',studentBranchLabel(row),studentSpecialtyLabel(row)));
  certificates.forEach(row=>{
    const branch=String(row.branchName||'—'),specialty=String(row.specialtyName||'—');addIncome(row,'certificate',branch,specialty);
    const centerKey=[branch,specialty,String(row.method||'—'),monthKey(row.date)].join('|'),center=metric(centerMap,centerKey,branch);center.certificateIncome+=money(row.amount);center.certificates+=1;center.center=branch;center.specialty=specialty;center.method=String(row.method||'—');center.month=monthKey(row.date);
  });
  expenses.forEach(row=>{
    const amount=money(row.amount),branch=typeof branchName==='function'?branchName(row.branch):String(row.branch||'—'),specialty=expenseSpecialtyName(row.specialty),method=String(row.method||'—'),month=monthKey(row.date);
    for(const [map,key,label] of [[months,month,month],[branchesMap,branch,branch],[specialtiesMap,specialty,specialty],[methodsMap,method,method]]){const item=metric(map,key,label);item.expenses+=amount;item.expenseCount+=1;}
    const purposeKey=[String(row.name||'مصروف'),branch,specialty,method,month].join('|'),purpose=metric(purposeMap,purposeKey,String(row.name||'مصروف'));purpose.expenses+=amount;purpose.expenseCount+=1;purpose.name=String(row.name||'مصروف');purpose.branch=branch;purpose.specialty=specialty;purpose.method=method;purpose.month=month;
  });
  const studentIncome=studentPayments.reduce((sum,row)=>sum+money(row.amount),0),certificateIncome=certificates.reduce((sum,row)=>sum+money(row.amount),0),expenseTotal=expenses.reduce((sum,row)=>sum+money(row.amount),0),income=studentIncome+certificateIncome;
  return{
    id:`fiscal-${plan.boundary}`,
    number:plan.number,first:plan.first,periodStart:plan.periodStart,periodEnd:plan.periodEnd,boundary:plan.boundary,closedAt:0,closedBy:'',
    totals:{studentIncome,certificateIncome,income,expenses:expenseTotal,profit:income-expenseTotal,studentPaymentCount:studentPayments.length,certificateCount:certificates.length,expenseCount:expenses.length},
    byMonth:finishMetrics(months),byBranch:finishMetrics(branchesMap),bySpecialty:finishMetrics(specialtiesMap),byMethod:finishMetrics(methodsMap),
    expensePurposes:finishMetrics(purposeMap).map(item=>({name:item.name,branch:item.branch,specialty:item.specialty,method:item.method,month:item.month,amount:item.expenses,count:item.expenseCount})),
    certificateCenters:finishMetrics(centerMap).map(item=>({center:item.center,specialty:item.specialty,method:item.method,month:item.month,amount:item.certificateIncome,count:item.certificates})),
    cleanup:{}
  };
}
function latestStudentActivity(student){const values=[student?.start,student?.stoppedAt,...(student?.payments||[]).map(payment=>payment?.[0])];if(!student?.stoppedAt)values.push(student?.end);return values.map(safeDate).filter(Boolean).sort().at(-1)||'';}
function eligibleStudentIds(plan){return students.filter(student=>isInactive(student)&&remainingAmount(student)<=0&&latestStudentActivity(student)&&latestStudentActivity(student)<=plan.periodEnd).map(student=>String(student.id));}
function cleanupPlan(plan,certificateState){return{studentIds:eligibleStudentIds(plan),expenses:D.getExpenses().filter(row=>inPeriod(row?.date,plan.periodStart,plan.periodEnd)).length,certificates:(certificateState.certificateReceipts||[]).filter(row=>inPeriod(row?.date,plan.periodStart,plan.periodEnd)).length};}

async function ensureSafetyBackup(plan){
  if(!invoke)return'';
  await window.EFC_FORCE_PERSIST?.();
  const path=await invoke('export_backup',{suggestedName:`EFC-Before-Fiscal-Close-${plan.boundary}.json`});
  if(!path)throw new Error('تم إلغاء نسخة الأمان، لذلك لم يتم إقفال السنة المالية.');
  return String(path);
}
async function applyCleanup(pending){
  const {archive,cleanupPlan:planned}=pending,plan={periodStart:archive.periodStart,periodEnd:archive.periodEnd};
  const studentIds=new Set((planned.studentIds||[]).map(String));
  const keptStudents=students.filter(student=>{
    if(!studentIds.has(String(student.id)))return true;
    if(!isInactive(student)||remainingAmount(student)>0)return true;
    const last=latestStudentActivity(student);return !last||last>archive.periodEnd;
  });
  if(keptStudents.length!==students.length){students.splice(0,students.length,...keptStudents);D.saveStudents();}
  const currentExpenses=D.getExpenses(),keptExpenses=currentExpenses.filter(row=>!inPeriod(row?.date,plan.periodStart,plan.periodEnd));
  if(keptExpenses.length!==currentExpenses.length)D.saveExpenses(keptExpenses);
  const certificates=await readCertificateState(),keptReceipts=certificates.certificateReceipts.filter(row=>!inPeriod(row?.date,plan.periodStart,plan.periodEnd));
  if(keptReceipts.length!==certificates.certificateReceipts.length)await writeCertificateState({...certificates,certificateReceipts:keptReceipts});
}
async function finalizePending(){
  if(!state.pendingClose||saving)return null;
  saving=true;
  try{
    const pending=state.pendingClose;
    await applyCleanup(pending);
    const archive={...pending.archive,closedAt:Date.now(),closedBy:String(currentAdmin()?.username||pending.archive.closedBy||'Admin'),cleanup:{studentsDeleted:(pending.cleanupPlan.studentIds||[]).length,expensesDeleted:Number(pending.cleanupPlan.expenses||0),certificatesDeleted:Number(pending.cleanupPlan.certificates||0)}};
    if(!state.archives.some(item=>item.boundary===archive.boundary))state.archives.push(archive);
    state.archives.sort((a,b)=>a.number-b.number);state.pendingClose=null;await persistFiscal();return archive;
  }finally{saving=false;}
}
async function closeCurrentYear(){
  if(!currentAdmin())throw new Error('إقفال السنة المالية متاح للـ Admin فقط.');
  if(state.pendingClose)return await finalizePending();
  const plan=nextPlan();if(!plan)throw new Error('حدد بداية السنة المالية أولًا.');if(!plan.due)throw new Error(`موعد الإقفال القادم هو ${showDate(plan.boundary)}.`);
  const certificates=await readCertificateState(),archive=aggregateSnapshot(plan,certificates),planned=cleanupPlan(plan,certificates);
  const ok=confirm(`سيتم إقفال السنة المالية ${plan.number}.\n${periodLabel(plan)}\n\nالدخل: ${cash(archive.totals.income)}\nالمصاريف: ${cash(archive.totals.expenses)}\nصافي الربح: ${cash(archive.totals.profit)}\n\nسيتم تنظيف ${planned.studentIds.length} ملف طالب غير نشط ومسدّد بالكامل، و${planned.expenses} سجل مصروف، و${planned.certificates} روسي شهادة فردي.\nالطلاب النشطون وأي طالب عليه دين لن يُحذفوا.\n\nمتابعة؟`);
  if(!ok)return null;
  const backupPath=await ensureSafetyBackup(plan);
  state.pendingClose={archive,cleanupPlan:planned,startedAt:Date.now(),backupPath};await persistFiscal();
  return await finalizePending();
}
async function configure(anchorDate){
  if(!currentAdmin())throw new Error('إعداد السنة المالية متاح للـ Admin فقط.');
  if(state.config)throw new Error('تم تحديد بداية السنة المالية مسبقًا ولا تحتاج إلى إعادة إنشائها كل عام.');
  const anchor=safeDate(anchorDate);if(!anchor)throw new Error('اختر تاريخ بداية صالحًا.');if(anchor<today())throw new Error('تاريخ البداية الأول لا يمكن أن يكون قبل اليوم.');
  state.config={anchorDate:anchor,configuredAt:today(),configuredBy:String(currentAdmin()?.username||'Admin'),createdAt:Date.now()};await persistFiscal();return state.config;
}

function metricTable(items,label='الاسم'){
  return `<div class="fiscal-table-wrap-v13"><table><thead><tr><th>${esc(label)}</th><th>دخل الطلاب</th><th>الشهادات</th><th>المصاريف</th><th>الصافي</th></tr></thead><tbody>${items.length?items.map(item=>`<tr><td>${esc(item.label)}</td><td>${cash(item.studentIncome)}</td><td>${cash(item.certificateIncome)}</td><td>${cash(item.expenses)}</td><td><b>${cash(item.profit)}</b></td></tr>`).join(''):'<tr><td colspan="5">لا توجد بيانات</td></tr>'}</tbody></table></div>`;
}
function archiveHtml(archive){
  const period=archive.first?`من بداية السجلات حتى ${showDate(archive.periodEnd)}`:`${showDate(archive.periodStart)} — ${showDate(archive.periodEnd)}`;
  return `<details class="fiscal-archive-v13"><summary><span><b>السنة المالية ${archive.number}</b><small>${period}</small></span><strong>${cash(archive.totals?.profit||0)}</strong></summary><div class="fiscal-archive-body-v13"><div class="kpis"><div class="card"><small>المداخيل</small><b>${cash(archive.totals?.income||0)}</b></div><div class="card"><small>المصاريف</small><b>${cash(archive.totals?.expenses||0)}</b></div><div class="card"><small>صافي الربح</small><b>${cash(archive.totals?.profit||0)}</b></div><div class="card"><small>عمليات الدخل</small><b>${Number(archive.totals?.studentPaymentCount||0)+Number(archive.totals?.certificateCount||0)}</b></div></div><h4>حسب الشهر</h4>${metricTable(archive.byMonth||[],'الشهر')}<h4>حسب الفرع / المركز</h4>${metricTable(archive.byBranch||[],'الفرع')}<h4>حسب التخصص</h4>${metricTable(archive.bySpecialty||[],'التخصص')}<h4>حسب وسيلة الدفع</h4>${metricTable(archive.byMethod||[],'الوسيلة')}<h4>المصاريف المحفوظة — أين صُرفت</h4><div class="fiscal-table-wrap-v13"><table><thead><tr><th>البيان</th><th>الفرع</th><th>التخصص</th><th>الوسيلة</th><th>الشهر</th><th>المبلغ</th></tr></thead><tbody>${(archive.expensePurposes||[]).length?archive.expensePurposes.map(item=>`<tr><td>${esc(item.name)}</td><td>${esc(item.branch)}</td><td>${esc(item.specialty)}</td><td>${esc(item.method)}</td><td>${esc(item.month)}</td><td>${cash(item.amount)}</td></tr>`).join(''):'<tr><td colspan="6">لا توجد مصاريف</td></tr>'}</tbody></table></div><h4>الشهادات بعد إزالة بيانات الطلاب</h4><div class="fiscal-table-wrap-v13"><table><thead><tr><th>المركز / الفرع</th><th>الدورة</th><th>الوسيلة</th><th>الشهر</th><th>العدد</th><th>المبلغ</th></tr></thead><tbody>${(archive.certificateCenters||[]).length?archive.certificateCenters.map(item=>`<tr><td>${esc(item.center)}</td><td>${esc(item.specialty)}</td><td>${esc(item.method)}</td><td>${esc(item.month)}</td><td>${Number(item.count||0)}</td><td>${cash(item.amount)}</td></tr>`).join(''):'<tr><td colspan="6">لا توجد شهادات</td></tr>'}</tbody></table></div><p class="fiscal-cleanup-v13">تم تنظيف: ${Number(archive.cleanup?.studentsDeleted||0)} ملف طالب منتهٍ · ${Number(archive.cleanup?.expensesDeleted||0)} سجل مصروف · ${Number(archive.cleanup?.certificatesDeleted||0)} روسي شهادة فردي. هذا الأرشيف للقراءة فقط.</p></div></details>`;
}
function settingsCardHtml(){
  if(!state.config)return `<div class="card settings-card-prod fiscal-settings-v13"><h2>السنة المالية</h2><p>يحدد الـ Admin تاريخ البداية مرة واحدة. لا يتم نقل أو حذف أي بيانات عند الإعداد. أول إقفال يكون بعد سنة من التاريخ المحدد ويضم كل التاريخ الأقدم أيضًا.</p><label>تاريخ بداية الدورة المالية الأولى<input class="input" id="fiscalAnchorV13" type="date" min="${today()}" value="${today()}"></label><button class="button" id="configureFiscalV13">اعتماد بداية السنة المالية</button></div>`;
  const plan=nextPlan(),pending=state.pendingClose,due=Boolean(plan?.due),archives=state.archives.map(archiveHtml).join('');
  return `<div class="card settings-card-prod fiscal-settings-v13"><h2>السنة المالية</h2><p>بداية الدورة: <b>${showDate(state.config.anchorDate)}</b>. الإعداد ثابت ويتكرر تلقائيًا كل سنة.</p><div class="fiscal-next-v13"><small>${pending?'يوجد إقفال غير مكتمل':due?'السنة جاهزة للإقفال':'موعد الإقفال القادم'}</small><b>${showDate(pending?.archive?.boundary||plan?.boundary)}</b><span>${pending?'يمكن استكمال الإقفال بأمان؛ لقطة الأرقام محفوظة قبل التنظيف.':periodLabel(plan)}</span></div>${pending?'<button class="button" id="resumeFiscalV13">استكمال الإقفال</button>':due?'<button class="button" id="closeFiscalV13">إقفال السنة المالية</button>':''}</div>${state.archives.length?`<div class="fiscal-archives-v13"><h3>السنوات المالية المقفلة</h3>${archives}</div>`:''}`;
}
function enhanceSettings(){
  if(location.hash!=='#settings')return;
  const grid=document.querySelector('.settings-grid-prod');if(!grid||grid.querySelector('.fiscal-settings-v13'))return;
  if(!currentAdmin())return;
  grid.insertAdjacentHTML('beforeend',settingsCardHtml());
  document.getElementById('configureFiscalV13')?.addEventListener('click',async event=>{const button=event.currentTarget;button.disabled=true;try{await configure(document.getElementById('fiscalAnchorV13')?.value);refreshSettingsFiscal();}catch(error){alert(String(error?.message||error));button.disabled=false;}});
  document.getElementById('closeFiscalV13')?.addEventListener('click',async event=>{const button=event.currentTarget;button.disabled=true;try{const archive=await closeCurrentYear();if(archive){alert('تم إقفال السنة المالية وحفظ أرشيفها وتنظيف البيانات المؤهلة.');location.reload();}else button.disabled=false;}catch(error){alert(String(error?.message||error));button.disabled=false;}});
  document.getElementById('resumeFiscalV13')?.addEventListener('click',async event=>{const button=event.currentTarget;button.disabled=true;try{await finalizePending();alert('تم استكمال إقفال السنة المالية.');location.reload();}catch(error){alert(String(error?.message||error));button.disabled=false;}});
}
function refreshSettingsFiscal(){document.querySelector('.fiscal-settings-v13')?.remove();document.querySelector('.fiscal-archives-v13')?.remove();enhanceSettings();}
function dueBanner(){
  document.querySelector('.fiscal-due-v13')?.remove();
  if(!currentAdmin()||!state.config)return;
  const plan=nextPlan();if(!state.pendingClose&&!plan?.due)return;
  const content=document.querySelector('.content');if(!content||location.hash==='#settings')return;
  const banner=document.createElement('button');banner.type='button';banner.className='fiscal-due-v13';banner.textContent=state.pendingClose?'السنة المالية: يوجد إقفال غير مكتمل':'السنة المالية جاهزة للإقفال';banner.onclick=()=>{location.hash='#settings';};content.prepend(banner);
}
function enhance(){setTimeout(()=>{enhanceSettings();dueBanner();},25);}
window.addEventListener('hashchange',enhance);

const style=document.createElement('style');style.textContent=`
.fiscal-settings-v13{grid-column:1/-1;min-height:auto!important}.fiscal-settings-v13 label{display:grid;gap:6px;font-size:9px}.fiscal-next-v13{display:grid;gap:4px;padding:12px;border:1px solid var(--border);border-radius:9px;background:var(--surface-2)}.fiscal-next-v13 small,.fiscal-next-v13 span{color:var(--muted);font-size:9px}.fiscal-next-v13 b{font-size:14px}.fiscal-archives-v13{grid-column:1/-1;display:grid;gap:9px}.fiscal-archives-v13>h3{margin:8px 0 2px}.fiscal-archive-v13{border:1px solid var(--border);border-radius:10px;background:#fff;overflow:hidden}.fiscal-archive-v13>summary{display:flex;justify-content:space-between;align-items:center;padding:13px 15px;cursor:pointer}.fiscal-archive-v13>summary span{display:grid;gap:3px}.fiscal-archive-v13>summary small{color:var(--muted);font-size:8px}.fiscal-archive-v13>summary strong{font-size:12px}.fiscal-archive-body-v13{padding:0 15px 15px}.fiscal-archive-body-v13 h4{margin:16px 0 7px}.fiscal-table-wrap-v13{overflow:auto;max-height:360px;border:1px solid var(--border);border-radius:8px}.fiscal-table-wrap-v13 table{width:100%;border-collapse:collapse}.fiscal-table-wrap-v13 th,.fiscal-table-wrap-v13 td{padding:8px;border-bottom:1px solid var(--border);font-size:8px;text-align:right;white-space:nowrap}.fiscal-table-wrap-v13 th{position:sticky;top:0;background:#f6f8f7}.fiscal-cleanup-v13{font-size:8px;color:var(--muted);line-height:1.8}.fiscal-due-v13{width:100%;border:1px solid #dfc980;background:#fff8dc;color:#6d5310;border-radius:9px;padding:9px 12px;margin-bottom:12px;text-align:right;font:700 9px Tahoma;cursor:pointer}
`;document.head.appendChild(style);

(async()=>{
  await hydrate();
  window.EFC_FISCAL_V13=Object.freeze({
    ready:true,storageKey:STORAGE_KEY,firstArchiveIncludesAllPriorHistory:true,annualAutomaticBoundaries:true,activeStudentsNeverPurged:true,unpaidInactiveStudentsNeverPurged:true,certificatePiiPurgedAfterClose:true,expenseDetailsCompacted:true,closedArchivesReadOnly:true,pendingCloseJournal:true,
    getState:()=>clone(state),nextPlan,addYearsClamped,inPeriod,latestStudentActivity,eligibleStudentIds,
    previewArchive:async()=>{const plan=nextPlan();return plan?aggregateSnapshot(plan,await readCertificateState()):null;},
    configure,closeCurrentYear,finalizePending
  });
  enhance();
})().catch(error=>{console.error('EFC fiscal v13 failed to initialize.',error);throw error;});
})();
