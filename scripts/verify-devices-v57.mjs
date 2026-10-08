import { readFileSync } from 'node:fs';
import {execFileSync} from 'node:child_process';

const read=path=>readFileSync(path,'utf8');
const need=(text,token,label)=>{if(!text.includes(token))throw new Error(`Devices v57 missing: ${label}`);};
const forbid=(text,token,label)=>{if(text.includes(token))throw new Error(`Devices v57 forbidden: ${label}`);};

const devices=read('assets/production-devices-v57.js');
const centers=read('assets/production-registration-schedule-v13.js');
const students=read('assets/production-student-ui-v13.js');
const matrix=read('assets/production-registration-schedule-matrix-v17.js');
const foundation=read('assets/production-foundation-v13.js');
const auth=read('assets/production-auth-bootstrap-v13.js');
const security=read('assets/production-security-ui-v13.js');
const gate=read('assets/production-license-gate-v8.js');
const build=read('scripts/build-production.mjs');
execFileSync(process.execPath,['scripts/verify-devices-behavior-v57.mjs'],{stdio:'inherit'});

for(const [token,label] of [
  ['chosenDeviceAppliesToSchedule:true','chosen device applies to all selected days'],
  ['singleSelectedDeviceGrid:true','one device grid at a time'],
  ['conflictOnlyAssignmentDetails:true','only conflicts show detailed controls'],
  ['manualDeviceAssignmentOnly:true','device choice stays manual'],
  ['noAutomaticDeviceSelection:true','no automatic device picker'],
  ['preferredDeviceWithPerDayExceptions:true','preferred device allows per-day exceptions'],
  ['sameDeviceDifferentTimeSuggestions:true','same device alternate-time suggestions'],
  ['sameTimeDifferentDeviceSuggestions:true','same-time alternate device suggestions'],
  ['crossCourseConflictProtection:true','device collision guard works across courses'],
  ['existingStudentsRequireManualAssignment:true','old students are flagged instead of auto-migrated'],
  ['devicePageDateAvailability:true','devices page shows date-specific availability'],
  ['stableDeviceIdentities:true','device identities survive center edits and restore'],
  ['weeklyDeviceSchedule:true','seven-day device grid'],
  ['atomicSchedulePersistence:true','devices saved within canonical schedule'],
  ['المتاح الآن','live available-device count'],
  ['المشغول الآن','live occupied-device count'],
  ['function validateRegistration','registration validation is centralized'],
  ['function validateCenterDeviceCount','center capacity cannot orphan assignments'],
  ['studentDeviceSummaryHtml','student file exposes device status'],
  ['EFC_BEGIN_REGISTRATION_EDIT_V17','student device edit reuses canonical registration editor']
])need(devices,token,label);

for(const [token,label] of [
  ['deviceCount:Math.max(0,Math.floor(Number(item?.deviceCount||0)))','old centers default to zero devices'],
  ['name="deviceCount"','center editor captures device count'],
  ['validateCenterDeviceCount','center reductions are guarded']
])need(centers,token,label);

for(const [token,label] of [
  ['name="requiresDevice"','course editor exposes device requirement'],
  ["requiresDevice:String(data.get('requiresDevice')||'no')==='yes'",'course device requirement defaults to no'],
  ['studentDeviceSummaryHtml','student file renders device status'],
  ['bindStudentModal','student file binds device editing']
])need(students,token,label);

for(const [token,label] of [
  ['augmentScheduleSnapshot','schedule capture stores devices'],
  ['validateRegistration','new/edit registration validate device conflicts'],
  ['mountRegistration','device selector is mounted under the weekly schedule'],
  ['deviceScheduleV4:true','device-aware schedule version marker']
])need(matrix,token,label);

need(foundation,"['devices'",'devices sidebar item');
need(auth,"'specialties','devices','period'",'devices auth section');
need(security,"['devices','الأجهزة']", 'devices permissions row');
need(security,"page==='devices'",'devices final route');
need(gate,'production-devices-v57.js','devices deterministic runtime load');
need(build,'production-devices-v57.js','devices included in production build');
forbid(devices,'Math.random()*deviceCount','random device selection');
forbid(devices,'if(state.preferred&&!state.assignments[row.key]','preferred device must not assign on render');
forbid(devices,'sameDayAlternatives','only the two requested suggestion types');

console.log('Devices v57 verification passed: manual device assignment, preferred-device exceptions, conflict protection, legacy student handling, and date-specific scheduling are integrated.');
