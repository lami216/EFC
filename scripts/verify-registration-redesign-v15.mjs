import {readFileSync,existsSync} from 'node:fs';
import {execFileSync} from 'node:child_process';

const read=path=>readFileSync(path,'utf8');
const requireText=(text,needle,label=needle)=>{if(!text.includes(needle))throw new Error(`Registration redesign missing: ${label}`);};
const forbidText=(text,needle,label=needle)=>{if(text.includes(needle))throw new Error(`Registration redesign regression: ${label}`);};

const uiPath='assets/production-registration-redesign-v15.js';
if(!existsSync(uiPath))throw new Error('Registration redesign runtime module is missing.');
for(const path of [uiPath,'assets/production-registration-schedule-matrix-v17.js','assets/production-registration-receipt-schedule-v22.js','assets/production-sidebar-lock-v30.js']){
  if(!existsSync(path))throw new Error(`Registration redesign runtime module is missing: ${path}`);
  execFileSync(process.execPath,['--check',path],{stdio:'inherit'});
}

const ui=read(uiPath);
const registration=read('assets/production-registration-schedule-v13.js');
const scheduleMatrix=read('assets/production-registration-schedule-matrix-v17.js');
const receiptSchedule=read('assets/production-registration-receipt-schedule-v22.js');
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

for(const token of [
  'form.onsubmit=event=>',
  'students.unshift(student)',
  'appendPayment(student',
  'readSchedule(scheduleRoot,item)'
])requireText(monthly,token,`monthly registration behavior ${token}`);

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
  ["courses:selectedId&&days.some(day=>day.selected)?[selectedCourse]:[]",'single selected course schedule snapshot']
])requireText(scheduleMatrix,token,label);
forbidText(scheduleMatrix,"specialties.map(courseRow).join('')",'registration timetable must not render every course');

for(const [token,label] of [
  ['legacySingleCourseScheduleFallback:true','legacy schedule receipt compatibility'],
  ['const legacyDays=Array.isArray(schedule.days)?schedule.days:[]','receipt fallback to stored day schedule'],
  ['if(courses.length)return[courses[0]]','receipt limited to the registered course']
])requireText(receiptSchedule,token,label);

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

console.log('Registration redesign verified: selected-course timetable, receipt schedule compatibility, compact-screen accessibility and backup-on-exit safeguards are present without duplicating registration/accounting ownership.');
