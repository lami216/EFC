import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import {webcrypto} from 'node:crypto';

const read=path=>readFileSync(path,'utf8');
const json=value=>JSON.stringify(value);
const values=new Map(),saves=[];
const students=[],specialties=[{id:'a',name:'دورة أ',requiresDevice:true,courseType:'normal'},{id:'b',name:'دورة ب',requiresDevice:true,courseType:'normal'},{id:'plain',name:'عادية',requiresDevice:false,courseType:'normal'}];
const branches=[{id:'c',name:'مركز',deviceCount:3},{id:'other',name:'مركز آخر',deviceCount:3}];
const preferred={value:'',onchange:null},usePreferred={},panel={dataset:{formId:'f'},hidden:false,innerHTML:'',querySelector:selector=>selector==='#devicePreferredV57'?preferred:usePreferred,querySelectorAll:()=>[]};
const document={head:{appendChild(){}},createElement:()=>({}),getElementById:()=>panel,addEventListener(){}};
const localStorage={getItem:key=>values.get(key)??null,setItem:(key,value)=>values.set(key,String(value)),removeItem:key=>values.delete(key)};
const addDuration=(start,n,unit='day')=>{const date=new Date(start+'T12:00:00');if(unit==='month')date.setMonth(date.getMonth()+n);else date.setDate(date.getDate()+n);return date.toISOString().slice(0,10);};
const D={ready:true,esc:String,showDate:String,today:()=> '2026-10-08',uid:prefix=>prefix+'-new',courseTypeOf:course=>course?.courseType||'normal',addDuration,isInactive:student=>student?.active===false};
const window={__TAURI__:{core:{invoke:async(command,payload)=>{if(command==='load_app_state')return null;if(command==='save_app_state'){saves.push(JSON.parse(payload.state));return null;}throw new Error(command);}}},EFC_DOMAIN_V13:D,EFC_STUDENT_UI_V13:{ready:true},EFC_REGISTRATION_SCHEDULE_MATRIX_V17:{ready:true},EFC_COURSES_CENTERS_REDESIGN_V23:{ready:true},students,specialties,branches,spec:id=>specialties.find(course=>course.id===id)};
const context={window,document,localStorage,branches,students,specialties,methods:[],crypto:webcrypto,console,setTimeout,clearTimeout,setInterval,clearInterval,queueMicrotask,structuredClone,CSS:{escape:String},HTMLInputElement:class{},Event:class{},opts:()=>''};
vm.createContext(context);
vm.runInContext(read('production-loader.js'),context);await window.EFC_CORE_STORAGE_READY;
await vm.runInContext(read('assets/production-registration-schedule-v13.js'),context);
vm.runInContext(read('assets/production-devices-v57.js'),context);
const devices=window.EFC_DEVICES_V57,centers=window.EFC_REGISTRATION_SCHEDULE_V13;
branches.splice(0,branches.length,...centers.normalizeCenters([{id:'c',name:'مركز',deviceCount:3},{id:'other',name:'مركز آخر',deviceCount:3}]));
const schedule=(number=1,day='monday',time='08:00',branch='c')=>({version:4,specialtyId:'a',preferredDeviceNumber:number,preferredDeviceId:number?devices.deviceIdFor(branch,number):null,days:[{key:day,time,selected:true,deviceNumber:number,deviceId:number?devices.deviceIdFor(branch,number):null}]});
const student=(id,specialty='a',number=1)=>({id,name:id,branch:'c',specialty,start:'2026-10-01',end:'',active:true,schedule:schedule(number),payments:[]});
const first=student('first');students.push(first);
const args={branch:'c',day:'monday',time:'08:00',deviceNumber:1,start:'2026-10-08',end:''};
assert.equal(devices.isDeviceAvailable(args),false,'occupied device must be unavailable');
assert.equal(devices.validateStudentDraft(student('other','b')).ok,false,'different course must not bypass collision');
assert.equal(devices.isDeviceAvailable({...args,branch:'other'}),true,'centers have separate devices');
assert.equal(devices.isDeviceAvailable({...args,excludeStudentId:'first'}),true,'edit excludes its own old booking');
assert.equal(devices.sameDeviceAlternateTimes(args).includes('08:00'),false);
assert.equal(devices.sameDeviceAlternateTimes(args).includes('10:00'),true);
assert.deepEqual([...devices.availableDevices(args)],[2,3]);

const before=json(students),listeners={},selected={checked:true};
const form={dataset:{deviceFormV57:'f'},elements:{branch:{value:'c',addEventListener(){}},specialty:{value:'a',addEventListener(){}},start:{value:'2026-10-08',addEventListener(){}}},addEventListener:(event,callback)=>listeners[event]=callback};
const root={querySelector:selector=>selector.includes('monday')?(selector.includes('time')?{value:'10:00'}:selected):null,addEventListener(){}};
devices.mountRegistration(form,root);
preferred.value='2';preferred.onchange();
const base={specialtyId:'a',days:[{key:'monday',selected:true,time:'10:00'}]};
let draft=devices.augmentScheduleSnapshot(base,{form});
assert.equal(draft.days[0].deviceNumber,null,'choosing preferred must not assign any appointment');
assert.equal(devices.validateRegistration({form,snapshot:draft}).ok,false,'missing assignment prevents save');
assert.equal(json(students),before,'draft renders do not reserve devices');
usePreferred.onclick();draft=devices.augmentScheduleSnapshot(base,{form});
assert.equal(draft.days[0].deviceNumber,2,'explicit apply button assigns preferred device');
assert.equal(draft.days[0].deviceId,'c:device:2');
assert.equal(devices.validateRegistration({form,snapshot:draft}).ok,true);
assert.equal(json(students),before,'explicit draft assignment is not a saved reservation');
const invalid={...draft,days:[{...draft.days[0],deviceId:'other:device:2'}]};
assert.equal(devices.validateRegistration({form,snapshot:invalid}).ok,false,'wrong-center stable identity rejected');

assert.equal(devices.validateCenterDeviceCount('c',0).ok,false,'reserved devices cannot be removed');
assert.equal(devices.validateCenterDeviceCount('c',1).ok,true,'unreserved tail can be retired');
const identity=branches[0].devices[1].id;
let resized=centers.normalizeCenters([{...branches[0],deviceCount:1}])[0];
resized=centers.normalizeCenters([{...resized,deviceCount:3,name:'اسم جديد'}])[0];
assert.equal(resized.devices[1].id,identity,'shrink, grow and rename preserve device identity');
const legacy=student('legacy','a',null);assert.equal(devices.missingDeviceDays(legacy).length,1);
devices.augmentScheduleSnapshot(legacy.schedule,{student:legacy});
assert.equal(legacy.schedule.days[0].deviceNumber,null,'existing students stay unassigned');
first.active=false;assert.equal(devices.isDeviceAvailable(args),true,'stopping releases occupancy');first.active=true;
first.branch='other';assert.equal(devices.isDeviceAvailable(args),true,'center change releases old center');first.branch='c';
first.specialty='plain';assert.equal(devices.isDeviceAvailable(args),true,'non-device course releases occupancy');first.specialty='a';
first.schedule=devices.clearScheduleDevices(first.schedule);assert.equal(devices.isDeviceAvailable(args),true,'cleared schedule releases occupancy');first.schedule=schedule();
first.end='2026-10-05';assert.equal(devices.isDeviceAvailable(args),true,'nonoverlapping date ranges can reuse device');first.end='';

const live=devices.liveAvailability('c',new Date('2026-10-12T09:30:00'));
assert.equal(live.busy,1);assert.equal(live.free,2);assert.equal(live.time,'08:00');
assert.equal(devices.liveAvailability('c',new Date('2026-10-12T21:00:00')).busy,0);
assert.equal(devices.weekDates('2026-10-08')[0].date,'2026-10-05');
assert.equal(devices.weekDates('2026-10-08')[6].date,'2026-10-11');

const conflict=student('imported','b');
assert.throws(()=>devices.validateRestoredState({students:[first,conflict],specialties,branches}),/تعذر دمج النسخة/);
assert.throws(()=>devices.validateRestoredState({students:[first],specialties,branches:[{...branches[0],deviceCount:0}]}),/جهاز غير صالح/);
assert.equal(devices.validateRestoredState({students:[first,legacy],specialties,branches}),true,'legacy missing assignments may be restored');
values.set('efc-students-v1',json([first]));values.set('efc-specialties-v1',json(specialties));
const snapshot=await window.EFC_FORCE_PERSIST();
assert.equal(snapshot.branches[0].devices[1].id,identity);
assert.equal(snapshot.students[0].schedule.days[0].deviceId,'c:device:1');
const storedBefore=json([...values]);
await assert.rejects(()=>window.EFC_APPLY_RESTORED_STATE({students:[conflict],specialties,branches,paymentMethods:[]}),/تعذر دمج النسخة/);
assert.equal(json([...values]),storedBefore,'rejected restore changes no local state');
const saveCount=saves.length;
await window.EFC_APPLY_RESTORED_STATE({students:[first,legacy],specialties,branches,paymentMethods:[]});
assert.ok(saves.length>saveCount);
for(const saved of saves.slice(saveCount)){
  assert.equal(saved.branches[0].devices[1].id,identity,'native restore never drops center/device records');
  assert.equal(saved.students.find(student=>student.id==='first').schedule.days[0].deviceId,'c:device:1');
  assert.equal(saved.students.find(student=>student.id==='legacy').schedule.days[0].deviceNumber,null);
}
clearTimeout(context.centerPersistTimer);

// Verify that the owning save paths capture device data before the first student write.
for(const file of ['assets/production-registration-schedule-v13.js','assets/production-monthly-prepayment-ui-v14.js']){
  const source=read(file);
  assert.ok(source.includes('captureSchedule(form,root)'));
  assert.ok(source.indexOf('validateRegistration?.({form,snapshot:schedule})')<source.indexOf('students.unshift(student)'));
}
assert.equal(read('assets/production-registration-schedule-matrix-v17.js').includes('created.schedule=snapshot'),false,'no post-save device patch');
assert.ok(read('assets/production-monthly-prepayment-domain-v14.js').includes('validateStudentDraft(draft'));
console.log('Device behaviors passed: manual drafts, cross-course conflicts, stable identities, release, weekly/live availability, full persistence and atomic restore rejection.');
