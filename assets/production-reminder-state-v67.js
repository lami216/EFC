(()=>{
'use strict';
if(window.EFC_REMINDER_STATE_V67)return;
const STORAGE_KEY='efc-reminder-visibility-v67',STATE_FIELD='reminderVisibilityV67',SOURCE='reminders-v67',PREFIX='reminder-v67:';
const FIELDS=['bellHidden','profileHidden','previewViewed'],invoke=window.__TAURI__?.core?.invoke;
const clone=value=>JSON.parse(JSON.stringify(value));
const own=(value,key)=>Object.prototype.hasOwnProperty.call(value,key);
const empty=()=>({version:67,updatedAt:0,bellHidden:Object.create(null),profileHidden:Object.create(null),previewViewed:Object.create(null)});
let state=empty(),nativeKnown=!invoke,readyComplete=false,readyPromise,mutationChain=Promise.resolve();
function normalize(raw){
  if(raw===null||raw===undefined)return empty();
  if(typeof raw!=='object'||Array.isArray(raw))throw new Error('حالة عرض التذكيرات غير صالحة. لم تتم الكتابة فوقها.');
  const next=empty(),revision=Number(raw.updatedAt||0);
  if(!Number.isFinite(revision)||revision<0)throw new Error('مراجعة حالة التذكيرات غير صالحة. لم تتم الكتابة فوق البيانات.');
  next.updatedAt=revision;
  for(const field of FIELDS){
    const values=raw[field];if(values===undefined)continue;
    if(!values||typeof values!=='object'||Array.isArray(values))throw new Error('حالة عرض التذكيرات غير صالحة. لم تتم الكتابة فوقها.');
    for(const [key,value] of Object.entries(values)){
      const stamp=Number(value);
      if(!key.startsWith(PREFIX)||!Number.isFinite(stamp)||stamp<0)throw new Error('مرجع حالة التذكير غير صالح. لم تتم الكتابة فوق البيانات.');
      next[field][key]=stamp;next.updatedAt=Math.max(next.updatedAt,stamp);
    }
  }
  return next;
}
function merge(a,b){
  const left=normalize(a),right=normalize(b),next=empty();next.updatedAt=Math.max(left.updatedAt,right.updatedAt);
  for(const field of FIELDS)for(const source of [left[field],right[field]])for(const [key,stamp] of Object.entries(source))next[field][key]=Math.max(next[field][key]||0,stamp);
  return next;
}
function readLocal(){return normalize(JSON.parse(localStorage.getItem(STORAGE_KEY)||'null'));}
function writeLocal(){localStorage.setItem(STORAGE_KEY,JSON.stringify(state));}
function notify(){if(typeof window.dispatchEvent==='function'&&typeof CustomEvent==='function')window.dispatchEvent(new CustomEvent('efc-reminder-visibility-v67'));}
function report(error,blocked=false){window.EFC_SET_STORAGE_ISSUE?.(SOURCE,error,{phase:blocked?'read':'write',blocked});}
function today(){return String(window.EFC_DOMAIN_V13?.today?.()||(typeof deviceTodayV3==='function'?deviceTodayV3():new Date().toISOString().slice(0,10)));}
function stageFor(note,asOf=note?.date||today()){
  const due=String(note?.dueDate||''),day=String(asOf||'');
  if(!/^\d{4}-\d{2}-\d{2}$/.test(due)||!/^\d{4}-\d{2}-\d{2}$/.test(day))return'';
  const delta=Math.round((Date.parse(`${due}T12:00:00Z`)-Date.parse(`${day}T12:00:00Z`))/86400000);
  return Number.isFinite(delta)?delta>0?`before:${delta}`:delta===0?'due':`overdue:${-delta}`:'';
}
function keyFor(note,asOf=note?.date||today()){
  if(!note||typeof note!=='object')return'';
  const student=(Array.isArray(window.students)?window.students:[]).find(item=>String(item.id)===String(note.studentId));
  const identity=student?.recordCode?`record:${student.recordCode}`:student?.id?`id:${student.id}`:'';
  const stage=stageFor(note,asOf),amount=Number(note.amount||0),fee=Number(note.fee||0);
  if(!identity||!stage||!Number.isFinite(amount)||!Number.isFinite(fee))return'';
  const month=Number(note.monthNumber)>0?Number(note.monthNumber):null;
  return PREFIX+JSON.stringify([identity,String(student.branch||''),String(student.specialty||''),String(student.start||''),String(note.kind||'reminder'),String(note.state||''),String(note.contextType||(month?'month':'course')),month,String(note.dueDate||''),stage,amount,fee]);
}
function resolveKey(noteOrKey){return typeof noteOrKey==='string'&&noteOrKey.startsWith(PREFIX)?noteOrKey:keyFor(noteOrKey);}
function has(field,noteOrKey){const key=resolveKey(noteOrKey);return Boolean(key&&own(state[field],key));}
async function hydrate(){
  const local=readLocal();
  if(!invoke){state=merge(state,local);nativeKnown=true;return;}
  const raw=await invoke('load_app_state'),main=raw?JSON.parse(raw):null;
  if(main&&(!Array.isArray(main.students)||!Array.isArray(main.specialties)||!Array.isArray(main.paymentMethods)))throw new Error('تعذر التحقق من البيانات المحفوظة لحالة التذكيرات. لم تتم الكتابة فوقها.');
  state=merge(merge(state,local),main?.[STATE_FIELD]);writeLocal();nativeKnown=true;
  window.EFC_CLEAR_STORAGE_ISSUE?.(SOURCE);
}
function mutate(field,noteOrKey){
  const key=resolveKey(noteOrKey);
  if(!key)return Promise.reject(new Error('تعذر تحديد التذكير المطلوب.'));
  const pending=mutationChain.then(async()=>{
    await readyPromise;
    if(!nativeKnown){try{await hydrate();}catch(error){report(error,true);throw error;}}
    if(window.EFC_STORAGE_HEALTH?.canWrite?.(SOURCE)===false)throw new Error('أعد التحقق من التخزين قبل تغيير حالة التذكير.');
    if(field==='profileHidden'&&!has('previewViewed',key))throw new Error('اعرض هذا التذكير وأغلق معاينته أولًا.');
    if(has(field,key))return key;
    const before=state,next=merge(state,null),stamp=Math.max(Date.now(),state.updatedAt+1);next[field][key]=stamp;next.updatedAt=stamp;state=next;
    try{
      writeLocal();window.EFC_CORE_CHANGED?.();
      // Await the core promise directly: rollback runs before a later queued
      // close snapshot can observe this failed presentation change.
      await window.EFC_FORCE_PERSIST?.();window.EFC_CLEAR_STORAGE_ISSUE?.(SOURCE);notify();return key;
    }catch(error){
      state=before;try{writeLocal();window.EFC_CORE_CHANGED?.();}catch(rollbackError){console.error('EFC reminder visibility cache rollback failed.',rollbackError);}
      report(error);throw error;
    }
  });
  mutationChain=pending.catch(()=>undefined);return pending;
}
window.EFC_REGISTER_FLUSH_CONTRIBUTOR?.(SOURCE,async()=>{
  await readyPromise;
  if(!nativeKnown){try{await hydrate();}catch(error){report(error,true);throw error;}}
  writeLocal();window.EFC_CLEAR_STORAGE_ISSUE?.(SOURCE);
});
window.EFC_REGISTER_STATE_CONTRIBUTOR?.(SOURCE,async snapshot=>{await readyPromise;return Object.assign(snapshot,{[STATE_FIELD]:clone(state)});});
const baseValidateRestore=window.EFC_VALIDATE_RESTORE_STATE;
window.EFC_VALIDATE_RESTORE_STATE=incoming=>{
  if(own(incoming||{},STATE_FIELD))normalize(incoming[STATE_FIELD]);
  return typeof baseValidateRestore==='function'?baseValidateRestore(incoming):incoming;
};
window.EFC_REGISTER_RESTORE_CONTRIBUTOR?.(SOURCE,incoming=>{
  if(!own(incoming||{},STATE_FIELD))return;
  const pending=mutationChain.then(async()=>{
    await readyPromise;if(!nativeKnown){try{await hydrate();}catch(error){report(error,true);throw error;}}
    const before=state;state=merge(state,incoming[STATE_FIELD]);
    try{writeLocal();await window.EFC_FORCE_PERSIST?.();window.EFC_CLEAR_STORAGE_ISSUE?.(SOURCE);notify();}
    catch(error){state=before;try{writeLocal();window.EFC_CORE_CHANGED?.();}catch(rollbackError){console.error('EFC reminder restore cache rollback failed.',rollbackError);}report(error);throw error;}
  });
  mutationChain=pending.catch(()=>undefined);return pending;
});
const api=Object.freeze({get ready(){return readyComplete;},keyFor,stageFor,snapshot:()=>clone(state),isBellHidden:note=>has('bellHidden',note),isProfileHidden:note=>has('profileHidden',note),canHideProfile:note=>has('previewViewed',note),hideBell:note=>mutate('bellHidden',note),hideProfile:note=>mutate('profileHidden',note),markPreviewViewed:note=>mutate('previewViewed',note)});
window.EFC_REMINDER_STATE_V67=api;
readyPromise=(async()=>{try{await hydrate();}catch(error){nativeKnown=false;report(error,true);console.error('EFC reminder visibility hydration failed; native writes paused.',error);}readyComplete=true;return api;})();
window.EFC_REMINDER_STATE_READY_V67=readyPromise;
})();
