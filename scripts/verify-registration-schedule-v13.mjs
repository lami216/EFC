import {readFileSync,existsSync} from 'node:fs';
import {execFileSync} from 'node:child_process';

const read=path=>readFileSync(path,'utf8');
const requireText=(text,needle,label=needle)=>{if(!text.includes(needle))throw new Error(`Registration/login v13 missing: ${label}`);};
const forbidText=(text,needle,label=needle)=>{if(text.includes(needle))throw new Error(`Registration/login v13 regression: ${label}`);};

for(const path of ['assets/production-registration-schedule-v13.js','assets/production-login-ui-v13.js']){
  if(!existsSync(path))throw new Error(`Missing runtime module: ${path}`);
  execFileSync(process.execPath,['--check',path],{stdio:'inherit'});
}
const registration=read('assets/production-registration-schedule-v13.js');
const login=read('assets/production-login-ui-v13.js');
const receipts=read('assets/production-receipts-v13.js');
const gate=read('assets/production-license-gate-v8.js');
const build=read('scripts/build-production.mjs');

for(const [token,label] of [
  ['authoritativeRegistrationRenderer:true','registration renderer ownership'],
  ['registration-schedule-layout-v13','side-by-side registration and schedule layout'],
  ['schedule-table-v13','weekly schedule table'],
  ['type="time"','clickable time fields'],
  ['data-day-check','day selection boxes'],
  ['scheduleStoredWithStudent:true','schedule persisted with student'],
  ['schedule=readSchedule(scheduleRoot,item)','schedule captured from registration table'],
  ['debtDueDates:{},schedule,snapshot:{','student schedule stored on new student'],
  ['compactTimetable:true','compact timetable visual marker'],
  ['noHorizontalTimetableOverflow:true','timetable must fit without forced horizontal width'],
  ['twoColumnRegistration:true','two-column compact registration form'],
  ['grid-template-columns:repeat(2,minmax(0,1fr))','paired registration fields'],
  ['wholeInputDateTimePicker:true','whole-field date/time picker marker'],
  ['input.showPicker?.()','native picker opens from field click'],
  ['::-webkit-calendar-picker-indicator','native picker icon hidden'],
  ['courseTerminology:true','course terminology marker'],
  ['<th class="schedule-course-head-v13">الدورة</th>','schedule course header'],
  ["nav[2]='الدورات'",'courses navigation label'],
  ['noSideSummary:true','redundant side summary removed'],
  ['ملاحظة: لا يسمح تأخر طالب عن 20 دقيقة.','20 minute lateness note'],
  ['ملاحظة 1: لا يمكن استرجاع المبلغ المدفوع للمركز في أي حال من الأحوال.','refund note'],
  ['ملاحظة 2: لا يمكن تسليم بطاقة تعريف الأصلية حتى تسديد المبلغ كلياً.','ID note']
])requireText(registration,token,label);
forbidText(registration,'side-summary','old side summary card');
forbidText(registration,'min-width:720px','oversized forced timetable width');
forbidText(registration,'التخصص / الدورة','mixed specialty/course schedule heading');
forbidText(registration,'width:102px;min-width:102px','oversized schedule course column');
forbidText(registration,'grid-template-columns:1fr;gap:8px','single-column registration fields');

for(const [token,label] of [
  ["'*'.repeat",'visible PIN star mask'],
  ['pinStars:true','PIN star marker'],
  ['normalReadableSize:true','normal login size marker'],
  ['largerLoginCard:true','larger login card marker'],
  ['oldHalfScaleOverridden:true','old half scale override marker'],
  ['transform:none!important','old half-scale visually disabled'],
  ['width:min(560px,92vw)','larger login card width'],
  ['noBackgroundImage:true','no login background image marker']
])requireText(login,token,label);
forbidText(login,'transform:scale(.5)','half-size login scaling inside login override');
forbidText(login,'background-image','login photo background');

for(const [token,label] of [
  ['studentSchedule12','schedule printed on registration receipt'],
  ['studentScheduleOnRegistrationReceipt:true','receipt schedule marker'],
  ['debtDueDateOnReceipt:true','debt due date receipt marker'],
  ['موعد سداد المبلغ المتبقي','debt due date note'],
  ['schedule:student.schedule||null','receipt model schedule data'],
  ['debtDueDate','receipt model debt date']
])requireText(receipts,token,label);

const order=['production-student-ui-v13.js','production-registration-schedule-v13.js','production-finance-ui-v13.js','production-security-ui-v13.js','production-login-ui-v13.js'];
let last=-1;for(const token of order){const pos=gate.indexOf(token);if(pos<0)throw new Error(`Gate missing ${token}`);if(pos<last)throw new Error(`Gate order wrong at ${token}`);last=pos;}
for(const token of ['assets/production-registration-schedule-v13.js','assets/production-login-ui-v13.js'])requireText(build,token,`production build includes ${token}`);

console.log('Registration schedule and login v13 verified: paired registration fields, compact timetable, course terminology, whole-field date/time pickers, receipt schedule/debt note, larger login and star-masked PIN.');