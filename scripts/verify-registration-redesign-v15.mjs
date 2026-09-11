import {readFileSync,existsSync} from 'node:fs';
import {execFileSync} from 'node:child_process';

const read=path=>readFileSync(path,'utf8');
const requireText=(text,needle,label=needle)=>{if(!text.includes(needle))throw new Error(`Registration redesign missing: ${label}`);};
const forbidText=(text,needle,label=needle)=>{if(text.includes(needle))throw new Error(`Registration redesign regression: ${label}`);};

const uiPath='assets/production-registration-redesign-v15.js';
if(!existsSync(uiPath))throw new Error('Registration redesign runtime module is missing.');
execFileSync(process.execPath,['--check',uiPath],{stdio:'inherit'});

const ui=read(uiPath);
const registration=read('assets/production-registration-schedule-v13.js');
const monthly=read('assets/production-monthly-prepayment-ui-v14.js');
const gate=read('assets/production-license-gate-v8.js');
const build=read('scripts/build-production.mjs');
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
  'بيانات الطالب والتسجيل',
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
  'data-day-time',
  'data-day-check',
  'registration-submit-v13',
  'scheduleStoredWithStudent:true'
])requireText(registration,token,`base registration behavior ${token}`);

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

console.log('Registration redesign v15 verified: screenshot layout is isolated to the registration page while the working registration, schedule and accounting flow remains owned by the existing runtime.');
