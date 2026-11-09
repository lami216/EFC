import fs from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';
import {webcrypto} from 'node:crypto';
const read=file=>fs.readFileSync(file,'utf8');
const values=new Map();
const localStorage={getItem:key=>values.get(key)??null,setItem:(key,value)=>values.set(key,String(value)),removeItem:key=>values.delete(key)};
const stateContributors=new Map(),restoreContributors=new Map();
let failPersist=false;
const context={console,crypto:webcrypto,Date,URL,structuredClone,TextEncoder,TextDecoder,Uint8Array,setTimeout,clearTimeout,localStorage,sessionStorage:{getItem:()=>null,setItem(){}},location:{href:'http://localhost/',hash:'#students'},document:{title:'',createElement:()=>({}),head:{appendChild(){}},querySelector:()=>null,querySelectorAll:()=>[],getElementById:()=>null,addEventListener(){}},EFC_CORE_STORAGE_V13:{ready:true}};
context.window=context;
context.EFC_REGISTER_STATE_CONTRIBUTOR=(name,contribute)=>stateContributors.set(name,contribute);
context.EFC_REGISTER_RESTORE_CONTRIBUTOR=(name,restore)=>restoreContributors.set(name,restore);
context.EFC_FORCE_PERSIST=async()=>{if(failPersist)throw Error('isolated persistence failure');let state={students:context.students,specialties:context.specialties,paymentMethods:context.methods};for(const contribute of stateContributors.values())state=await contribute(state)||state;return state;};
context.EFC_APPLY_RESTORED_STATE=async state=>{for(const restore of restoreContributors.values())await restore(state);return state;};
vm.createContext(context);
vm.runInContext(read('assets/production-foundation-v13.js'),context);
vm.runInContext(read('assets/production-receipts-v13.js'),context);
let date='2026-11-09';context.deviceTodayV3=()=>date;
vm.runInContext(read('assets/production-domain-v13.js'),context);await context.EFC_DOMAIN_V13_READY;
vm.runInContext(read('assets/production-monthly-prepayment-domain-v14.js'),context);
const D=context.EFC_DOMAIN_V13;
context.specialties.push({id:'m',name:'الفرنسية',billing:'monthly',courseType:'normal',fee:500});
const make=id=>({id,recordCode:'record-'+id,name:'طالب '+id,branch:'a',specialty:'m',reg:1,start:'2026-10-12',end:'',required:500,paid:500,active:true,status:'active',debtDueDates:{},snapshot:{centerOpsV13:true,centerOpsMonthlyV13:true,dynamicMonthly:true,billing:'monthly',courseType:'normal',fee:500,durationValue:1,durationUnit:'month'},payments:[['2026-10-12',500,'cash','12:00',1,'دفعة تسجيل','registration-'+id,1,1,null,[{monthNumber:1,amount:500}],1]]});
const first=make('first'),second=make('second');context.students.push(first,second);
const stageNotes=[];
for(const [day,title]of [['2026-11-09','3 أيام'],['2026-11-10','يومان'],['2026-11-11','يوم واحد'],['2026-11-12','دين قائم']]){
  date=day;const notes=D.notificationsForStudent(first);assert.equal(notes.length,1);assert(notes[0].title.includes(title));assert.equal(notes[0].dueDate,'2026-11-12');assert.equal(notes[0].monthNumber,2);stageNotes.push(notes[0]);
}
date='2026-11-09';
// Visibility-state regressions below exercise the implementation's exported API
// using the canonical notification objects generated above.
const moduleSource=read('assets/production-reminder-state-v67.js');
vm.runInContext(moduleSource,context);await context.EFC_REMINDER_STATE_READY_V67;
let V=context.EFC_REMINDER_STATE_V67;
const firstNote=D.notificationsForStudent(first)[0],secondNote=D.notificationsForStudent(second)[0];
const firstKey=V.keyFor(firstNote),secondKey=V.keyFor(secondNote),before=JSON.stringify(context.students);
assert(firstKey.startsWith('reminder-v67:'));assert.notEqual(firstKey,secondKey,'same fee/date/registration number on another student has its own identity');
assert.deepEqual(stageNotes.map((note,i)=>V.stageFor(note,['2026-11-09','2026-11-10','2026-11-11','2026-11-12'][i])),['before:3','before:2','before:1','due']);
const stageKeys=stageNotes.map((note,i)=>V.keyFor(note,['2026-11-09','2026-11-10','2026-11-11','2026-11-12'][i]));assert.equal(new Set(stageKeys).size,4,'3/2/1/renewal reminder stages are distinct');
first.name='اسم مصحح';first.updatedAt=999;assert.equal(V.keyFor(firstNote),firstKey,'name/revision changes do not resurrect a dismissed reminder');first.name='طالب first';delete first.updatedAt;
for(const field of ['branch','specialty','start']){const original=first[field];first[field]=field==='start'?'2026-10-13':'different-'+field;assert.notEqual(V.keyFor(firstNote),firstKey,field+' is part of registration identity');first[field]=original;}
assert(!V.canHideProfile(firstNote));await assert.rejects(V.hideProfile(firstNote),/اعرض/);assert(!V.isProfileHidden(firstNote));
await V.hideBell(firstNote);assert(V.isBellHidden(firstNote));assert(!V.isBellHidden(secondNote));assert(!V.isProfileHidden(firstNote));assert(!V.canHideProfile(firstNote),'bell dismissal does not grant profile hiding');
await V.markPreviewViewed(firstKey);assert(V.canHideProfile(firstNote));assert(!V.canHideProfile(secondNote));await V.hideProfile(firstNote);assert(V.isProfileHidden(firstNote));assert(!V.isProfileHidden(secondNote));
await V.markPreviewViewed(secondKey);await V.hideProfile(secondKey);assert(!V.isBellHidden(secondKey),'profile hiding is independent from bell dismissal');
assert.equal(JSON.stringify(context.students),before,'visibility state never changes canonical student/payment data');
const backup=await context.EFC_FORCE_PERSIST();assert(backup.reminderVisibilityV67.bellHidden[firstKey]);assert(backup.reminderVisibilityV67.profileHidden[secondKey]);
vm.runInContext('delete window.EFC_REMINDER_STATE_V67;delete window.EFC_REMINDER_STATE_READY_V67;',context);vm.runInContext(moduleSource,context);await context.EFC_REMINDER_STATE_READY_V67;V=context.EFC_REMINDER_STATE_V67;
assert(V.isBellHidden(firstKey)&&V.isProfileHidden(firstKey)&&V.isProfileHidden(secondKey),'local restart retains each independent map');
values.delete('efc-reminder-visibility-v67');vm.runInContext('delete window.EFC_REMINDER_STATE_V67;delete window.EFC_REMINDER_STATE_READY_V67;',context);vm.runInContext(moduleSource,context);await context.EFC_REMINDER_STATE_READY_V67;V=context.EFC_REMINDER_STATE_V67;assert(!V.isBellHidden(firstKey));await context.EFC_APPLY_RESTORED_STATE(backup);assert(V.isBellHidden(firstKey)&&V.isProfileHidden(secondKey),'canonical restore contributor restores visibility');
// Restore is a union: an older backup cannot undo a more recent dismissal.
await V.hideBell(secondKey);await context.EFC_APPLY_RESTORED_STATE(backup);assert(V.isBellHidden(secondKey));
for(let i=1;i<stageNotes.length;i++){assert(!V.isBellHidden(stageKeys[i]));assert(!V.isProfileHidden(stageKeys[i]));assert(!V.canHideProfile(stageKeys[i]));}
date='2026-11-12';const due=D.notificationsForStudent(first)[0],dueKey=V.keyFor(due);await V.hideBell(due);await V.markPreviewViewed(due);await V.hideProfile(due);
date='2026-11-13';const late1=D.notificationsForStudent(first)[0],late1Key=V.keyFor(late1);assert.notEqual(late1Key,dueKey);assert.equal(V.stageFor(late1),'overdue:1');assert(!V.isBellHidden(late1)&&!V.isProfileHidden(late1));await V.hideBell(late1);await V.markPreviewViewed(late1);await V.hideProfile(late1);
date='2026-11-14';const late2=D.notificationsForStudent(first)[0];assert.equal(V.stageFor(late2),'overdue:2');assert.notEqual(V.keyFor(late2),late1Key);assert(!V.isBellHidden(late2)&&!V.isProfileHidden(late2),'yesterday hidden debt reappears on the next overdue day');
const beforeFailure=JSON.stringify(V.snapshot());failPersist=true;await assert.rejects(V.hideBell(late2),/isolated persistence failure/);await assert.rejects(V.markPreviewViewed(late2),/isolated persistence failure/);failPersist=false;assert.equal(JSON.stringify(V.snapshot()),beforeFailure,'failed visibility save rolls back its state');assert(!V.isBellHidden(late2));assert(!V.canHideProfile(late2),'failed preview-status persistence never grants hide eligibility');
// A restore must not be lost when an overlapping earlier visibility mutation
// fails and rolls back. Hold only the first real persistence boundary.
const persistNormally=context.EFC_FORCE_PERSIST;let rejectHeld,signalEntered,firstWrite=true;const entered=new Promise(resolve=>signalEntered=resolve);
context.EFC_FORCE_PERSIST=()=>{if(firstWrite){firstWrite=false;signalEntered();return new Promise((resolve,reject)=>rejectHeld=reject);}return persistNormally();};
const pendingHide=V.hideBell(late2);await entered;const restoredBKey=V.keyFor(D.notificationsForStudent(second)[0]),concurrentImport={reminderVisibilityV67:V.snapshot()};concurrentImport.reminderVisibilityV67.bellHidden[restoredBKey]=Date.now()+100;
// The imported fixture intentionally contains only B's visibility change;
// a failed local A action must not be resurrected by this incoming snapshot.
delete concurrentImport.reminderVisibilityV67.bellHidden[V.keyFor(late2)];
const pendingRestore=context.EFC_APPLY_RESTORED_STATE(concurrentImport);await new Promise(resolve=>setImmediate(resolve));rejectHeld(Error('overlapping visibility save failed'));await assert.rejects(pendingHide,/overlapping visibility save failed/);await pendingRestore;context.EFC_FORCE_PERSIST=persistNormally;
assert(V.isBellHidden(restoredBKey),'an incoming restored dismissal survives another notice failed-save rollback');assert(!V.isBellHidden(late2),'a failed local dismissal remains rolled back after the concurrent restore');
D.appendPayment(first,{amount:500,method:'نقداً',date,targetMonth:2,persist:false});assert.equal(D.notificationsForStudent(first).length,0,'canonical payment resolves the debt notice');D.stopStudent(second,'توقف تجريبي');assert.equal(D.notificationsForStudent(second).length,0,'canonical stop suppresses future reminders');assert.equal(second.status,'inactive');
date='2026-12-09';const nextMonth=D.notificationsForStudent(first)[0];assert.equal(nextMonth.monthNumber,3);assert.equal(nextMonth.dueDate,'2026-12-12');assert(!V.isBellHidden(nextMonth)&&!V.isProfileHidden(nextMonth),'a new month/due date never inherits old visibility');
context.specialties.push({id:'q',name:'دورة سريعة',billing:'one_time',courseType:'quick',fee:500});
const quick={...make('quick'),specialty:'q',end:'2027-01-01',paid:0,payments:[],debtDueDates:{course:'2026-11-14'},snapshot:{centerOpsV13:true,billing:'one_time',courseType:'quick',fee:500,durationValue:90,durationUnit:'day'}};context.students.push(quick);
date='2026-11-13';const oldDue=D.notificationsForStudent(quick)[0],oldDueKey=V.keyFor(oldDue);await V.hideBell(oldDue);quick.debtDueDates.course='2026-11-15';date='2026-11-14';const changedDue=D.notificationsForStudent(quick)[0];assert.equal(V.stageFor(oldDue,'2026-11-13'),V.stageFor(changedDue,'2026-11-14'));assert.notEqual(V.keyFor(changedDue),oldDueKey,'an edited canonical due date has its own identity even at the same reminder stage');assert(!V.isBellHidden(changedDue));
console.log('PASS v67 reminder visibility: canonical 3/2/1/day-0/daily-overdue schedule; stable registration identity; independent maps; preview eligibility; restart/restore union; failed-save rollback; payment/stop/new-month invariants.');
