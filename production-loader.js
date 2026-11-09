(()=>{
'use strict';
if(window.EFC_CORE_STORAGE_V13?.ready)return;

const KEYS={
  students:'efc-students-v1',
  specialties:'efc-specialties-v1',
  methods:'efc-payment-methods-v1'
};
const META_KEY='efc-state-meta-v1';
const LEGACY_KEYS=['efc-demo-v2-students','efc-demo-v2-specialties','efc-demo-v8-payment-methods'];
const DEFAULT_METHODS=['نقداً','Bankily','Masrvi','السداد'];
const invoke=window.__TAURI__?.core?.invoke;
let writeChain=Promise.resolve();
let persistTimer=null;
const stateContributors=new Map();
const restoreContributors=new Map();
const flushContributors=new Map();
const storageIssues=new Map();
let coreReadBlocked=false,storageInert=false,retryInFlight=null;
// An inline status survives page changes and stays usable while an unknown
// database pauses the app. It never covers the interface or dismisses an error.
let storageRetryBusyV66=false,storageStatusObserverV66=null;
function renderStorageStatusV66(){
  if(typeof document!=='object'||!document.body||typeof document.createElement!=='function')return;
  const health=storageHealth(),existing=document.getElementById('efcStorageStatusV66');
  if(!health||health.status==='ok'){existing?.remove();storageStatusObserverV66?.disconnect();storageStatusObserverV66=null;document.documentElement?.style?.removeProperty('--efc-storage-status-height-v66');return;}
  if(!document.getElementById('efcStorageStatusStyleV66')){
    const style=document.createElement('style');style.id='efcStorageStatusStyleV66';style.textContent='.efc-storage-status-v66{box-sizing:border-box;position:relative;z-index:6;display:flex;align-items:center;gap:14px;width:calc(100% - 24px);max-width:1120px;margin:10px auto;padding:11px 14px;border:1px solid #c46959;border-radius:10px;background:#fff2ed;color:#7f2d20;direction:rtl;font:12px Tahoma,Arial;line-height:1.7}.efc-storage-status-v66>div{flex:1;min-width:0}.efc-storage-status-v66 strong,.efc-storage-status-v66 small{display:block}.efc-storage-status-v66 small{overflow-wrap:anywhere;font-size:10px}.efc-storage-status-v66 button{flex:0 0 auto;border:1px solid #a94a37;border-radius:7px;background:#fff;color:#7f2d20;padding:8px 12px;font:700 11px Tahoma;cursor:pointer}.efc-storage-status-v66 button:disabled{opacity:.6;cursor:wait}body:has(>.efc-storage-status-v66) .shell.shell-v13{min-height:calc(100dvh - var(--efc-storage-status-height-v66,100px))!important}body:has(>.efc-storage-status-v66) .shell.shell-v13 main{height:calc(100dvh - var(--efc-storage-status-height-v66,100px))!important;max-height:calc(100dvh - var(--efc-storage-status-height-v66,100px))!important}body:has(.shell-v13 aside){--efc-storage-sidebar-width-v66:clamp(230px,18vw,268px)}body:has(.shell-v13 aside)>.efc-storage-status-v66{width:min(1120px,calc(100% - var(--efc-storage-sidebar-width-v66) - 106px));margin-right:calc(var(--efc-storage-sidebar-width-v66) + 24px);margin-left:auto}@media(max-width:1260px){body:has(.shell-v13 aside){--efc-storage-sidebar-width-v66:230px}}@media(max-width:1080px){body:has(.shell-v13 aside){--efc-storage-sidebar-width-v66:205px}}@media(max-width:900px){body:has(.shell-v13 aside){--efc-storage-sidebar-width-v66:190px}}body:has(>.efc-storage-status-v66) .login-overlay-v13{inset-block-start:var(--efc-storage-status-height-v66,100px)!important}';document.head.appendChild(style);
  }
  const banner=existing||document.createElement('section');banner.id='efcStorageStatusV66';banner.className='efc-storage-status-v66';banner.setAttribute('role','status');banner.setAttribute('aria-live','polite');
  banner.innerHTML='<div><strong></strong><small></small></div><button id="efcStorageRetryV66" type="button"></button>';
  banner.querySelector('strong').textContent=health.blocked?'تعذر التحقق من البيانات المحفوظة. أُوقف التعديل مؤقتًا؛ اترك البرنامج مفتوحًا.':'لم يكتمل حفظ البيانات على الجهاز. اترك البرنامج مفتوحًا وأعد محاولة الحفظ.';
  const labels={'core-read':'قراءة البيانات','core-write':'حفظ البيانات',certificates:'الشهادات','bank-v22':'البنك','reminders-v67':'التذكيرات'};
  banner.querySelector('small').textContent=health.issues.map(item=>`${labels[item.source]||'البيانات'}: ${item.message}`).join(' · ');
  const retry=banner.querySelector('button');retry.textContent=storageRetryBusyV66?'جاري التحقق…':health.blocked?'إعادة التحقق':'إعادة محاولة الحفظ';retry.disabled=storageRetryBusyV66;
  retry.onclick=async()=>{
    if(storageRetryBusyV66)return;storageRetryBusyV66=true;renderStorageStatusV66();
    try{const result=await window.EFC_RETRY_STORAGE?.();if(result?.reloadRequired)location.reload();}catch(error){console.error('EFC storage retry failed; application remains open.',error);}finally{storageRetryBusyV66=false;renderStorageStatusV66();}
  };
  if(!existing)document.body.insertBefore(banner,document.getElementById('app'));
  const measure=()=>document.documentElement?.style?.setProperty('--efc-storage-status-height-v66',`${Math.ceil(banner.getBoundingClientRect().height)+20}px`);
  measure();if(!storageStatusObserverV66&&typeof ResizeObserver==='function'){storageStatusObserverV66=new ResizeObserver(measure);storageStatusObserverV66.observe(banner);}
}
function storageHealth(){return{status:[...storageIssues.values()].some(item=>item.blocked)?'blocked':storageIssues.size?'error':'ok',blocked:[...storageIssues.values()].some(item=>item.blocked),issues:[...storageIssues.values()].map(item=>({...item}))};}
function publishStorageHealth(){
  const health=storageHealth(),app=typeof document==='object'?document.getElementById?.('app'):null;
  if(health.blocked&&app){app.inert=true;storageInert=true;}else if(storageInert&&app){app.inert=false;storageInert=false;}
  renderStorageStatusV66();
  if(typeof window.dispatchEvent==='function'&&typeof CustomEvent==='function')window.dispatchEvent(new CustomEvent('efc-storage-health-v66',{detail:health}));
}
function reportStorageIssue(source,error,{phase='write',blocked=false}={}){storageIssues.set(String(source),{source:String(source),phase,message:String(error?.message||error||'تعذر الوصول إلى بيانات التطبيق.'),blocked:Boolean(blocked)});publishStorageHealth();}
function clearStorageIssue(source){if(storageIssues.delete(String(source)))publishStorageHealth();}
function assertStorageWritable(){if(coreReadBlocked||storageHealth().blocked)throw new Error('تعذر التحقق من البيانات المحفوظة. أعد التحقق من التخزين قبل الحفظ أو الإغلاق.');}
window.EFC_STORAGE_HEALTH=Object.freeze({snapshot:storageHealth,canWrite:source=>!coreReadBlocked&&(source?!storageIssues.get(String(source))?.blocked:!storageHealth().blocked)});
window.EFC_SET_STORAGE_ISSUE=reportStorageIssue;
window.EFC_CLEAR_STORAGE_ISSUE=clearStorageIssue;
window.EFC_REGISTER_FLUSH_CONTRIBUTOR=(name,flush)=>{if(typeof flush!=='function')throw new TypeError('EFC flush contributor must be a function.');flushContributors.set(String(name),flush);};

const parseArray=(raw,fallback=[])=>{try{const value=JSON.parse(raw??'null');return Array.isArray(value)?value:fallback;}catch{return fallback;}};
const safeClone=value=>JSON.parse(JSON.stringify(value??null));
function stableHash(value){const text=String(value??'');let hash=2166136261;for(let i=0;i<text.length;i+=1){hash^=text.charCodeAt(i);hash=Math.imul(hash,16777619);}return(hash>>>0).toString(36);}
function randomId(prefix){const uuid=globalThis.crypto?.randomUUID?.().replaceAll('-','');return`${prefix}-${Date.now().toString(36)}-${uuid?uuid.slice(0,14):Math.random().toString(36).slice(2,16)}`;}
function readMeta(){try{const value=JSON.parse(localStorage.getItem(META_KEY)||'null');return value&&typeof value==='object'?value:{};}catch{return{};}}
function writeMeta(value){localStorage.setItem(META_KEY,JSON.stringify(value));}
function ensureLocalInstallationId(){const meta=readMeta();if(typeof meta.installationId==='string'&&meta.installationId.trim())return meta.installationId.trim();const installationId=randomId('center');writeMeta({version:3,updatedAt:Math.max(0,Number(meta.updatedAt||0)),installationId,sourceCenters:[installationId]});return installationId;}
function legacySourceId(state){const students=Array.isArray(state?.students)?state.students:[],specialties=Array.isArray(state?.specialties)?state.specialties:[];const studentAnchor=students.map(item=>String(item?.recordCode||item?.id||'')).filter(Boolean).sort()[0],specialtyAnchor=specialties.map(item=>String(item?.recordCode||item?.id||'')).filter(Boolean).sort()[0];const anchor=studentAnchor||specialtyAnchor||JSON.stringify({specialties:specialties.map(item=>[item?.name,item?.durationValue,item?.durationUnit,item?.billing,item?.fee]),methods:Array.isArray(state?.paymentMethods)?state.paymentMethods:[]});return`legacy-${stableHash(anchor)}`;}
function specialtySignature(item){return JSON.stringify([String(item?.name||'').trim(),Number(item?.durationValue||0),String(item?.durationUnit||''),String(item?.billing||''),Number(item?.fee||0)]);}
function normalizeSpecialty(item,sourceId){const specialty={...(item||{})},originalId=String(specialty.id||randomId('sp'));specialty.id=originalId;specialty.recordCode=String(specialty.recordCode||`spec-${stableHash(`${sourceId}|${originalId}|${specialtySignature(specialty)}`)}`);specialty.sourceCenterId=String(specialty.sourceCenterId||sourceId);return specialty;}
function ensurePaymentCode(payment,studentRecordCode,index){const value=Array.isArray(payment)?[...payment]:[],existing=typeof value[6]==='string'?value[6].trim():'';if(!existing){const fingerprint=JSON.stringify([studentRecordCode,value[0]||'',Number(value[1]||0),value[2]||'',value[3]||'',value[4]||'',value[5]||'',index]);value[6]=`tx-${stableHash(fingerprint)}`;}else value[6]=existing;if(value.length>7&&value[7]!==null&&value[7]!==undefined&&value[7]!==''){const month=Number(value[7]);value[7]=Number.isInteger(month)&&month>0?month:null;}return value;}
function paymentRevision(payment){return Math.max(0,Number(payment?.[11]||0),Number(payment?.[4]||0));}
function legacyStudentId(student,sourceId){
  if(student.recordCode)return 'legacy-student-'+encodeURIComponent(String(student.recordCode));
  const {branch,specialty,reg,start}=student;
  if(!branch||!specialty||!Number.isInteger(Number(reg))||Number(reg)<=0||!/^\d{4}-\d{2}-\d{2}$/.test(String(start||'')))throw new Error('تعذر استعادة طالب قديم بلا هوية موثوقة. يلزم رقم السجل والمركز والدورة وتاريخ البداية؛ لم تتم إضافة سجل عشوائي.');
  return 'legacy-student-'+encodeURIComponent(JSON.stringify([sourceId,String(branch),String(specialty),Number(reg),String(start)]));
}
function sourceRegistrationCode(student){return String((student.payments||[]).find(p=>Number(p?.[1]||0)>0)?.[6]||'');}
function reportRestoreConflict(type,id,reason,local,incoming){window.EFC_REPORT_RESTORE_CONFLICT?.({type,id:String(id||''),reason,local:safeClone(local),incoming:safeClone(incoming)});}
function chooseRevision(local,incoming,type,id,fields){
  const a=Number(local.updatedAt||0),b=Number(incoming.updatedAt||0);
  if(fields.every(key=>JSON.stringify(local?.[key]??null)===JSON.stringify(incoming?.[key]??null)))return b>a?incoming:local;
  if(b>a)return incoming;if(a>b)return local;
  reportRestoreConflict(type,id,'نسختان مختلفتان بلا مراجعة تعديل حاسمة؛ احتُفظ بالمحلي للمراجعة.',local,incoming);return local;
}
function registrationCodeAfterMerge(current,incoming){
  const a=current.registrationPaymentCode,b=incoming.registrationPaymentCode;
  if(!a)return {code:b,inferred:incoming.registrationPaymentInferred};if(!b||a===b)return {code:a,inferred:current.registrationPaymentInferred&&incoming.registrationPaymentInferred};
  if(!current.registrationPaymentInferred&&!incoming.registrationPaymentInferred){reportRestoreConflict('registration-payment',current.recordCode,'تعارض هوية دفعة التسجيل الأصلية؛ احتُفظ بالهوية المحلية.',current,incoming);return {code:a,inferred:false};}
  if(!current.registrationPaymentInferred)return {code:a,inferred:false};if(!incoming.registrationPaymentInferred)return {code:b,inferred:false};
  const index=(s,code)=>(s.payments||[]).findIndex(p=>String(p?.[6]||'')===code);
  if(index(current,b)<0&&index(incoming,a)>index(incoming,b)&&index(incoming,b)>=0)return {code:b,inferred:true};
  if(index(incoming,a)<0&&index(current,b)>index(current,a)&&index(current,a)>=0)return {code:a,inferred:true};
  reportRestoreConflict('registration-payment',current.recordCode,'دفعات قديمة لا تحدد تسجيلًا أصليًا مؤكدًا؛ احتُفظ بالمرجع المحلي.',current,incoming);return {code:a,inferred:true};
}
function normalizeStudent(item,sourceId){
  const student={...(item||{})},originalId=String(student.id||legacyStudentId(student,sourceId));
  student.id=originalId;student.sourceCenterId=String(student.sourceCenterId||sourceId);
  student.recordCode=String(student.recordCode||(originalId.startsWith('legacy-student-')?'legacy-reg-'+encodeURIComponent(originalId):`reg-${stableHash([student.sourceCenterId,originalId,student.branch||'',student.specialty||'',student.reg||'',student.start||''].join('|'))}`));
  student.updatedAt=Math.max(0,Number(student.updatedAt||0));
  const seen=new Set(),payments=[];(Array.isArray(student.payments)?student.payments:[]).forEach((payment,index)=>{const normalized=ensurePaymentCode(payment,student.recordCode,index),code=normalized[6];if(seen.has(code))return;seen.add(code);payments.push(normalized);});student.payments=payments;
  const anchor=String(student.registrationPaymentCode||''),valid=payments.some(p=>String(p[6])===anchor&&Number(p[1])>0);
  student.registrationPaymentCode=valid?anchor:sourceRegistrationCode(student);student.registrationPaymentInferred=valid?student.registrationPaymentInferred===true:true;
  student.paid=payments.length?payments.reduce((sum,payment)=>sum+Number(payment[1]||0),0):Number(student.paid||0);student.required=Number(student.required||0);return student;
}
function normalizeStudents(items,sourceId){
  const legacy=new Set();return items.map(item=>{const student=normalizeStudent(item,item?.sourceCenterId||sourceId);if(!item?.id&&!item?.recordCode){if(legacy.has(student.id))throw new Error('توجد تسجيلات قديمة بلا هوية تحمل رقم السجل والمركز والدورة والبداية نفسها. يلزم مطابقتها قبل الاستعادة.');legacy.add(student.id);}return student;});
}
function normalizeState(state,fallbackInstallationId=null,imported=false){const raw=state&&typeof state==='object'?state:{};let installationId=typeof raw.installationId==='string'&&raw.installationId.trim()?raw.installationId.trim():null;if(!installationId)installationId=imported?legacySourceId(raw):(fallbackInstallationId||legacySourceId(raw));const rawSpecialties=Array.isArray(raw.specialties)?raw.specialties:[],rawStudents=Array.isArray(raw.students)?raw.students:[],hasExistingCodes=[...rawSpecialties,...rawStudents].some(item=>(typeof item?.recordCode==='string'&&item.recordCode.trim())||(typeof item?.sourceCenterId==='string'&&item.sourceCenterId.trim())),dataSourceId=hasExistingCodes||(!rawSpecialties.length&&!rawStudents.length)?installationId:legacySourceId(raw),specialties=rawSpecialties.map(item=>normalizeSpecialty(item,item?.sourceCenterId||dataSourceId)),students=normalizeStudents(rawStudents,dataSourceId),paymentMethods=(Array.isArray(raw.paymentMethods)&&raw.paymentMethods.length?raw.paymentMethods:DEFAULT_METHODS).map(String).map(value=>value.trim()).filter(Boolean),sourceCenters=new Set(Array.isArray(raw.sourceCenters)?raw.sourceCenters.map(String).filter(Boolean):[]);sourceCenters.add(installationId);specialties.forEach(item=>sourceCenters.add(String(item.sourceCenterId||installationId)));students.forEach(item=>sourceCenters.add(String(item.sourceCenterId||installationId)));return{version:3,updatedAt:Math.max(0,Number(raw.updatedAt||0)),installationId,sourceCenters:[...sourceCenters],students,specialties,paymentMethods:[...new Set(paymentMethods)]};}
function stateFromLocalStorage(){const meta=readMeta(),installationId=typeof meta.installationId==='string'&&meta.installationId.trim()?meta.installationId.trim():ensureLocalInstallationId();return normalizeState({version:3,updatedAt:Math.max(0,Number(meta.updatedAt||0)),installationId,sourceCenters:Array.isArray(meta.sourceCenters)?meta.sourceCenters:[],students:parseArray(localStorage.getItem(KEYS.students)),specialties:parseArray(localStorage.getItem(KEYS.specialties)),paymentMethods:parseArray(localStorage.getItem(KEYS.methods),DEFAULT_METHODS)},installationId);}
function mergePayments(currentPayments,incomingPayments,studentRecordCode){const merged=[],byCode=new Map();const add=(payment,index)=>{const normalized=ensurePaymentCode(payment,studentRecordCode,index),code=normalized[6],position=byCode.get(code);if(position===undefined){byCode.set(code,merged.length);merged.push(normalized);return;}if(paymentRevision(normalized)>paymentRevision(merged[position]))merged[position]=normalized;};(currentPayments||[]).forEach(add);(incomingPayments||[]).forEach((payment,index)=>add(payment,(currentPayments||[]).length+index));return merged;}
function mergeStates(currentRaw,incomingRaw){const current=normalizeState(currentRaw,ensureLocalInstallationId()),incoming=normalizeState(incomingRaw,null,true),specialties=current.specialties.map(safeClone),byRecordCode=new Map(specialties.map(item=>[item.recordCode,item])),bySignature=new Map(specialties.map(item=>[specialtySignature(item),item])),usedSpecialtyIds=new Set(specialties.map(item=>item.id)),specialtyRemap=new Map();incoming.specialties.forEach(item=>{const same=byRecordCode.get(item.recordCode)||bySignature.get(specialtySignature(item));if(same){const selected=chooseRevision(same,item,'course',same.recordCode||same.id,['name','courseType','billing','fee','durationUnit','durationValue','quickDays']);if(selected===item){const identity={id:same.id,recordCode:same.recordCode,sourceCenterId:same.sourceCenterId};Object.assign(same,item,identity);}specialtyRemap.set(item.id,same.id);return;}const copy=safeClone(item);if(usedSpecialtyIds.has(copy.id))copy.id=`${copy.id}-${stableHash(copy.recordCode).slice(0,6)}`;usedSpecialtyIds.add(copy.id);specialties.push(copy);byRecordCode.set(copy.recordCode,copy);bySignature.set(specialtySignature(copy),copy);specialtyRemap.set(item.id,copy.id);});const students=current.students.map(safeClone),byStudentCode=new Map(students.map(item=>[item.recordCode,item])),usedStudentIds=new Set(students.map(item=>item.id));let addedStudents=0,mergedStudents=0,addedPayments=0,skippedDuplicatePayments=0;incoming.students.forEach(rawStudent=>{const imported=safeClone(rawStudent);if(specialtyRemap.has(imported.specialty))imported.specialty=specialtyRemap.get(imported.specialty);const existing=byStudentCode.get(imported.recordCode);if(existing){if(imported.recordCode.startsWith('legacy-reg-')&&['name','phone'].some(key=>String(existing[key]||'').trim()!==String(imported[key]||'').trim()))throw new Error('تعذر مطابقة هوية تسجيل قديم تغير اسمه أو هاتفه دون معرف أصلي؛ لم تتم الاستعادة. يلزم ربط السجل الصحيح.');const registration=registrationCodeAfterMerge(existing,imported);const before=(existing.payments||[]).length,mergedPayments=mergePayments(existing.payments,imported.payments,existing.recordCode),after=mergedPayments.length,localUpdated=Math.max(0,Number(existing.updatedAt||0)),incomingUpdated=Math.max(0,Number(imported.updatedAt||0));addedPayments+=Math.max(0,after-before);skippedDuplicatePayments+=Math.max(0,(imported.payments||[]).length-(after-before));if(incomingUpdated>localUpdated){const stableId=existing.id,stableRecord=existing.recordCode,stableSource=existing.sourceCenterId;Object.keys(existing).forEach(key=>delete existing[key]);Object.assign(existing,imported,{id:stableId,recordCode:stableRecord,sourceCenterId:stableSource,payments:mergedPayments});}else existing.payments=mergedPayments;existing.registrationPaymentCode=registration.code;existing.registrationPaymentInferred=registration.inferred===true;if(existing.payments.length)existing.paid=existing.payments.reduce((sum,payment)=>sum+Number(payment[1]||0),0);mergedStudents+=1;return;}if(usedStudentIds.has(imported.id))imported.id=`student-${stableHash(imported.recordCode)}`;while(usedStudentIds.has(imported.id))imported.id=`${imported.id}-x`;usedStudentIds.add(imported.id);imported.payments=mergePayments([],imported.payments,imported.recordCode);if(imported.payments.length)imported.paid=imported.payments.reduce((sum,payment)=>sum+Number(payment[1]||0),0);students.push(imported);byStudentCode.set(imported.recordCode,imported);addedStudents+=1;addedPayments+=imported.payments.length;});const sourceCenters=new Set([...(current.sourceCenters||[]),...(incoming.sourceCenters||[]),current.installationId,incoming.installationId].filter(Boolean)),paymentMethods=[...new Set([...(current.paymentMethods||[]),...(incoming.paymentMethods||[])].map(String).map(value=>value.trim()).filter(Boolean))];return{state:{version:3,updatedAt:Date.now(),installationId:current.installationId,sourceCenters:[...sourceCenters],students,specialties,paymentMethods},stats:{addedStudents,mergedStudents,addedPayments,skippedDuplicatePayments,sourceCenters:sourceCenters.size}};}
async function readDesktopState(){
  if(!invoke)return null;
  const raw=await invoke('load_app_state');if(!raw)return null;
  const state=JSON.parse(raw);
  if(!state||!Array.isArray(state.students)||!Array.isArray(state.specialties)||!Array.isArray(state.paymentMethods))throw new Error('تعذر التحقق من بنية البيانات المحفوظة. لم تتم الكتابة فوقها.');
  return normalizeState(state,ensureLocalInstallationId());
}
async function loadDesktopState(){try{return await readDesktopState();}catch(error){coreReadBlocked=true;reportStorageIssue('core-read',error,{phase:'read',blocked:true});console.error('EFC SQLite load failed; native writes paused and local cache retained.',error);return null;}}
function chooseNewestState(localState,desktopState){if(!desktopState)return localState;const localUpdated=Number(localState?.updatedAt||0),desktopUpdated=Number(desktopState?.updatedAt||0);if(desktopUpdated>localUpdated)return desktopState;if(localUpdated>desktopUpdated)return localState;const hasLocal=Object.values(KEYS).some(key=>localStorage.getItem(key)!==null);return hasLocal?localState:desktopState;}
function synchronizeLiveCore(normalized){
  for(const [key,value]of [['students',normalized.students],['specialties',normalized.specialties],['methods',normalized.paymentMethods]])if(Array.isArray(window[key]))window[key].splice(0,window[key].length,...safeClone(value));
}
function applyState(state,{freshTimestamp=false}={}){const localInstallationId=ensureLocalInstallationId(),normalized=normalizeState(state,localInstallationId);normalized.installationId=localInstallationId;if(!normalized.sourceCenters.includes(localInstallationId))normalized.sourceCenters.push(localInstallationId);const updatedAt=freshTimestamp?Date.now():(normalized.updatedAt||Date.now());LEGACY_KEYS.forEach(key=>localStorage.removeItem(key));localStorage.setItem(KEYS.students,JSON.stringify(normalized.students));localStorage.setItem(KEYS.specialties,JSON.stringify(normalized.specialties));localStorage.setItem(KEYS.methods,JSON.stringify(normalized.paymentMethods));writeMeta({version:3,updatedAt,installationId:localInstallationId,sourceCenters:normalized.sourceCenters});synchronizeLiveCore(normalized);return{...normalized,updatedAt,installationId:localInstallationId};}
function persistencePayload(state=null){const source=state&&typeof state==='object'?state:stateFromLocalStorage(),normalized=normalizeState(source,ensureLocalInstallationId()),payload={...safeClone(source),...normalized};payload.installationId=ensureLocalInstallationId();if(!payload.updatedAt)payload.updatedAt=Date.now();return payload;}
async function persistCoreNow(state=null){const payload=persistencePayload(state);if(!invoke)return payload;assertStorageWritable();try{await invoke('save_app_state',{state:JSON.stringify(payload)});clearStorageIssue('core-write');return payload;}catch(error){reportStorageIssue('core-write',error);throw error;}}
function markLocalChange(){if(coreReadBlocked)return;const meta=readMeta(),installationId=ensureLocalInstallationId();writeMeta({version:3,updatedAt:Date.now(),installationId,sourceCenters:Array.isArray(meta.sourceCenters)&&meta.sourceCenters.length?meta.sourceCenters:[installationId]});}
async function currentSnapshot(){
  let snapshot=stateFromLocalStorage();
  for(const contribute of stateContributors.values())snapshot=await contribute(snapshot)||snapshot;
  return snapshot;
}
function enqueueCurrentPersist({flush=false}={}){
  const pending=writeChain.then(async()=>{
    if(coreReadBlocked)assertStorageWritable();
    if(flush)for(const contribute of flushContributors.values())await contribute();
    assertStorageWritable();
    return persistCoreNow(await currentSnapshot());
  });
  // The returned promise rejects to the explicit caller; the queue tail is always
  // handled so a failed background write neither poisons later retries nor leaks.
  writeChain=pending.catch(error=>{if(!storageHealth().issues.length)reportStorageIssue('core-write',error);console.error('EFC state save failed.',error);});
  return pending;
}
function scheduleCurrentPersist(){
  clearTimeout(persistTimer);
  persistTimer=setTimeout(()=>{persistTimer=null;enqueueCurrentPersist().catch(()=>undefined);},120);
}

const ready=(async()=>{
  const localState=stateFromLocalStorage(),desktopState=await loadDesktopState(),activeState=coreReadBlocked?localState:applyState(chooseNewestState(localState,desktopState));
  window.EFC_STATE=Object.freeze({keys:{...KEYS},metaKey:META_KEY,defaultMethods:[...DEFAULT_METHODS],installationId:activeState.installationId});
  window.EFC_CODES=Object.freeze({
    ensureStudentRecord(student){const normalized=normalizeStudent(student,student?.sourceCenterId||activeState.installationId);Object.assign(student,normalized);return student.recordCode;},
    ensurePaymentCode(student,payment,index){const recordCode=this.ensureStudentRecord(student),normalized=ensurePaymentCode(payment,recordCode,index);payment.splice(0,payment.length,...normalized);return payment[6];},
    newTransactionCode(student){const recordCode=this.ensureStudentRecord(student);return`tx-${stableHash(recordCode)}-${Date.now().toString(36)}-${globalThis.crypto?.randomUUID?.().slice(0,8)||Math.random().toString(36).slice(2,10)}`;}
  });
  window.EFC_VALIDATE_RESTORE_STATE=state=>normalizeState(state,null,true);
  window.EFC_RESTORE_CONFLICTS_V63=[];
  window.EFC_REPORT_RESTORE_CONFLICT=entry=>{const list=window.EFC_RESTORE_CONFLICTS_V63;if(!list.some(x=>x.type===entry.type&&x.id===entry.id&&x.reason===entry.reason))list.push(safeClone(entry));};
  window.EFC_REGISTER_STATE_CONTRIBUTOR=(name,contribute)=>{
    if(typeof contribute!=='function')throw new TypeError('EFC state contributor must be a function.');
    stateContributors.set(String(name||`contributor-${stateContributors.size+1}`),contribute);
  };
  window.EFC_REGISTER_RESTORE_CONTRIBUTOR=(name,restore)=>{
    if(typeof restore!=='function')throw new TypeError('EFC restore contributor must be a function.');
    restoreContributors.set(String(name||`restore-${restoreContributors.size+1}`),restore);
  };
  window.EFC_FORCE_PERSIST=()=>{clearTimeout(persistTimer);persistTimer=null;return enqueueCurrentPersist({flush:true});};
  window.EFC_RETRY_STORAGE=()=>{
    if(retryInFlight)return retryInFlight;
    const pending=(async()=>{
      if(coreReadBlocked){
        // Never write the fallback cache into a database whose contents were
        // unknown. A fresh bootstrap must select the newest verified core state.
        try{await readDesktopState();return{reloadRequired:true};}catch(error){reportStorageIssue('core-read',error,{phase:'read',blocked:true});throw error;}
      }
      await window.EFC_FORCE_PERSIST();return{reloadRequired:false};
    })();
    retryInFlight=pending;pending.then(()=>{retryInFlight=null;},()=>{retryInFlight=null;});return pending;
  };
  window.EFC_CORE_CHANGED=()=>{markLocalChange();scheduleCurrentPersist();};
  window.EFC_MERGE_IMPORTED_STATE=async incoming=>{const current=stateFromLocalStorage(),{state:merged,stats}=mergeStates(current,incoming),applied=applyState(merged,{freshTimestamp:true});await persistCoreNow(applied);for(const restore of restoreContributors.values())await restore(incoming);return{state:applied,stats};};
  window.EFC_APPLY_RESTORED_STATE=window.EFC_MERGE_IMPORTED_STATE;
  window.EFC_CORE_STORAGE_V13=Object.freeze({ready:true,explicitPersistence:true,serializedNativeWrites:true,stateContributors:true,restoreContributors:true,noStoragePrototypePatch:true,noRuntimeScriptChain:true,revisionAwareStudentMerge:true,revisionAwarePaymentMerge:true,installationId:activeState.installationId,sourceCenters:activeState.sourceCenters?.length||1});
  return window.EFC_CORE_STORAGE_V13;
})().catch(error=>{console.error('EFC core storage bootstrap failed.',error);throw error;});
window.EFC_CORE_STORAGE_READY=ready;
})();
