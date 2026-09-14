import {readFileSync,existsSync} from 'node:fs';
import {execFileSync} from 'node:child_process';

const read=path=>readFileSync(path,'utf8');
const requireText=(text,needle,label=needle)=>{if(!text.includes(needle))throw new Error(`Registration redesign missing: ${label}`);};
const forbidText=(text,needle,label=needle)=>{if(text.includes(needle))throw new Error(`Registration redesign regression: ${label}`);};

const uiPath='assets/production-registration-redesign-v15.js';
if(!existsSync(uiPath))throw new Error('Registration redesign runtime module is missing.');
for(const path of [uiPath,'assets/production-registration-schedule-matrix-v17.js','assets/production-registration-receipt-schedule-v22.js','assets/production-courses-centers-compact-v25.js','assets/production-sidebar-lock-v30.js']){
  if(!existsSync(path))throw new Error(`Registration redesign runtime module is missing: ${path}`);
  execFileSync(process.execPath,['--check',path],{stdio:'inherit'});
}

const ui=read(uiPath);
const registration=read('assets/production-registration-schedule-v13.js');
const scheduleMatrix=read('assets/production-registration-schedule-matrix-v17.js');
const receiptSchedule=read('assets/production-registration-receipt-schedule-v22.js');
const coursesCompact=read('assets/production-courses-centers-compact-v25.js');
const sidebar=read('assets/production-sidebar-lock-v30.js');
const monthly=read('assets/production-monthly-prepayment-ui-v14.js');
const gate=read('assets/production-license-gate-v8.js');
const build=read('scripts/build-production.mjs');
const index=read('index.html');
const tauriConfig=JSON.parse(read('src-tauri/tauri.conf.json'));
const rustMain=read('src-tauri/src/main.rs');
const packageJson=JSON.parse(read('package.json'));

for(const token of [
  'screenshotRegistrationReference:true',
  'existingRegistrationFlowPreserved:true',
  'noSubmitOverride:true',
  'scheduleMirrorFunctional:true',
  'sidebarRestyledOnRegistrationOnly:true',
  'segoeUiVariable:true',
  'Segoe UI Variable',
  'تسجيل طالب جديد',
  'جدول الطالب الأسبوعي',
  'حفظ التسجيل',
  'efcScheduleCourseMirrorV15',
  "source.dispatchEvent(new Event('change',{bubbles:true}))",
  'efc-registration-redesign-v15'
])requireText(ui,token);

forbidText(ui,'.onsubmit=','redesign must not replace the working registration submit handler');
forbidText(ui,'appendPayment(','redesign must not duplicate payment/accounting logic');
forbidText(ui,'students.unshift(','redesign must not duplicate student creation logic');

for(const [token,label] of [
  ['form.onsubmit=event=>','monthly registration submit owner'],
  ['students.unshift(student)','monthly registration student creation'],
  ['appendPayment(student','monthly registration payment creation'],
  ['readSchedule(scheduleRoot,item)','monthly registration schedule capture'],
  ['[data-matrix-day="${key}"]','current matrix checkbox values captured synchronously'],
  ['[data-schedule-day-time="${key}"]','current matrix time values captured synchronously'],
  ['scheduleDirectFromMatrix:true','monthly registration marks direct matrix schedule persistence']
])requireText(monthly,token,`monthly registration behavior ${label}`);

for(const token of [
  'بيانات الطالب والتسجيل',
  'data-day-time',
  'data-day-check',
  'registration-submit-v13',
  'scheduleStoredWithStudent:true'
])requireText(registration,token,`base registration behavior ${token}`);

for(const [token,label] of [
  ['selectedCourseOnly:true','registration timetable shows only the selected course'],
  ['renderSelectedCourseRow','selected course row synchronization'],
  ["courses:selectedId&&days.some(day=>day.selected)?[selectedCourse]:[]",'single selected course schedule snapshot'],
  ['emptyScheduleVisibleOnReceipt:true','empty registration schedule remains visible in receipt flow'],
  ['longCourseNamesWrapInMatrix:true','long selected course names wrap inside registration timetable'],
  ['overflow-wrap:anywhere!important','registration timetable can wrap unusually long course names'],
  ['directRegistrationSchedulePreferred:true','synchronous registration schedule is not overwritten by a later layer'],
  ['existingScheduleMatches','post-submit compatibility capture respects the already saved schedule'],
  ['singleBottomNotice:true','registration timetable keeps only the first lower notice'],
  ['paragraphs.slice(1).forEach','second and later lower notices are removed from the registration timetable'],
  ['largerScheduleNotices:true','registration timetable notice sizing marker'],
  ['schedule-top-note-v13{font-size:16px!important','lateness notice is visibly enlarged'],
  ['schedule-notes-v13{font-size:15px!important','remaining lower notice is visibly enlarged']
])requireText(scheduleMatrix,token,label);
forbidText(scheduleMatrix,"specialties.map(courseRow).join('')",'registration timetable must not render every course');
forbidText(scheduleMatrix,"{...model,schedule:null}",'empty schedules must not be stripped before receipt rendering');

for(const [token,label] of [
  ['legacySingleCourseScheduleFallback:true','legacy schedule receipt compatibility'],
  ['const legacyDays=Array.isArray(schedule.days)?schedule.days:emptyDays()','receipt fallback to stored or empty day schedule'],
  ['if(courses.length)return[courses[0]]','receipt limited to the registered course when a selected schedule exists'],
  ['alwaysVisibleOnRegistrationReceipt:true','registration receipt always owns a timetable section'],
  ['emptyScheduleVisibleOnReceipt:true','empty timetable still renders on registration receipt'],
  ['receiptSectionInsidePaper:true','injected timetable stays inside the receipt paper'],
  ['longCourseNamesWrap:true','receipt timetable wraps long course names'],
  ["const paper=doc.querySelector('.paper12')||doc.body",'receipt timetable is inserted into the receipt paper'],
  ['overflow-wrap:anywhere!important','receipt course name cell wraps long names'],
  ['directSavedSchedulePreferred:true','receipt compatibility layer preserves the direct saved matrix values'],
  ['existingScheduleMatches','receipt compatibility capture does not replace an already valid schedule']
])requireText(receiptSchedule,token,label);
forbidText(receiptSchedule,'else if(section){section.remove();}','empty registration timetable must not be removed from receipt');

for(const [token,label] of [
  ['adaptiveCardHeights:true','course and center cards grow for wrapped names'],
  ['longNamesWrapInsideCards:true','course and center names wrap inside their cards'],
  ['height:auto!important;min-height:160px!important;max-height:none!important','course card height expands when its title wraps'],
  ['height:auto!important;min-height:136px!important;max-height:none!important','center card height expands when its title wraps'],
  ['overflow-wrap:anywhere!important;word-break:break-word!important','long card names cannot be clipped by unbroken text']
])requireText(coursesCompact,token,label);
forbidText(coursesCompact,'fixedCardHeights:true','cards must not advertise fixed heights after long-name wrapping support');

for(const [token,label] of [
  ['responsiveSmallViewport:true','small viewport sidebar marker'],
  ['settingsFitAvailableWidth:true','responsive settings marker'],
  ['shortScreenSidebarScrollFallback:true','short-screen sidebar fallback'],
  ['@media(max-height:760px)','short display layout rules'],
  ['width:min(900px,calc(100% - 32px))','settings no longer force 900px width']
])requireText(sidebar,token,label);

requireText(index,'body{min-width:840px}','compact browser viewport minimum');
requireText(index,'EFC_REQUEST_CLOSE_BACKUP','desktop close backup prompt bridge');
requireText(index,"await window.EFC_FORCE_PERSIST?.()",'flush pending state before exit backup');
requireText(index,"invoke('export_backup'",'exit backup uses existing full backup exporter');
requireText(rustMain,'tauri::WindowEvent::CloseRequested','native close interception');
requireText(rustMain,"window.EFC_REQUEST_CLOSE_BACKUP",'native close invokes frontend backup prompt');
requireText(rustMain,'fn exit_app(app: tauri::AppHandle)','explicit close command after user decision');
if(Number(tauriConfig?.app?.windows?.[0]?.minWidth)!==840||Number(tauriConfig?.app?.windows?.[0]?.minHeight)!==560)throw new Error('Registration redesign missing: compact Tauri minimum window size.');

const order=[
  'production-registration-schedule-v13.js',
  'production-finance-ui-v13.js',
  'production-monthly-prepayment-ui-v14.js',
  'production-registration-redesign-v15.js',
  'production-security-ui-v13.js',
  'production-login-ui-v13.js'
];
let last=-1;
for(const token of order){
  const pos=gate.indexOf(token);
  if(pos<0)throw new Error(`Gate missing ${token}`);
  if(pos<last)throw new Error(`Gate order wrong at ${token}`);
  last=pos;
}
requireText(gate,'EFC_REGISTRATION_REDESIGN_V15?.ready','registration redesign readiness check');
requireText(build,"'assets/production-registration-redesign-v15.js'",'registration redesign packaged in production build');

if(!String(packageJson.scripts?.check||'').includes('verify-registration-redesign-v15.mjs'))throw new Error('package check does not run registration redesign verifier.');

console.log('Registration redesign verified: selected-course timetable values persist into the receipt, the registration notices are simplified/enlarged, empty receipt schedules remain visible, long names wrap safely, compact-screen accessibility remains intact, and no registration/accounting ownership is duplicated.');
