// Actual packaged UI with an isolated browser profile and synthetic students.
import fs from 'node:fs';
import path from 'node:path';
import http from 'node:http';
import assert from 'node:assert/strict';
import {pathToFileURL} from 'node:url';
const moduleName=process.env.EFC_PLAYWRIGHT_MODULE||'playwright';
const {chromium}=await import(path.isAbsolute(moduleName)?pathToFileURL(moduleName).href:moduleName);
const root=path.resolve('dist'),output=process.env.EFC_QA_OUTPUT;if(output)fs.mkdirSync(output,{recursive:true});
const server=http.createServer((req,res)=>{const url=decodeURIComponent((req.url||'/').split('?')[0]),file=path.resolve(root,'.'+(url==='/'?'/index.html':url));if(!file.startsWith(root+path.sep))return res.writeHead(403).end();try{res.setHeader('Content-Type',file.endsWith('.js')?'application/javascript':file.endsWith('.css')?'text/css':file.endsWith('.svg')?'image/svg+xml':'text/html');res.end(fs.readFileSync(file));}catch{res.writeHead(404).end();}});
await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
const browser=await chromium.launch({headless:true,...(process.env.EFC_BROWSER_PATH?{executablePath:process.env.EFC_BROWSER_PATH}:{})});
try{
  const context=await browser.newContext({viewport:{width:1440,height:1000},timezoneId:'UTC'}),page=await context.newPage(),errors=[];
  page.on('pageerror',error=>errors.push(String(error)));page.on('dialog',dialog=>dialog.dismiss());await page.clock.setFixedTime(new Date('2026-11-24T12:00:00Z'));
  await page.addInitScript(()=>{
    localStorage.setItem('efc-branches-v13',JSON.stringify([{id:'a',name:'المركز الأول'},{id:'b',name:'المركز الثاني'}]));
    localStorage.setItem('efc-specialties-v1',JSON.stringify([{id:'q',name:'الفرنسية',courseType:'quick',billing:'one_time',durationValue:60,durationUnit:'day'},{id:'r',name:'المعلوماتية',courseType:'quick',billing:'one_time',durationValue:60,durationUnit:'day'},{id:'m',name:'شهري',courseType:'normal',billing:'monthly',durationValue:1,durationUnit:'month'}]));
    const quick=(id,reg,end,extra={})=>({id,recordCode:'status-record-'+id,name:'طالب '+id,phone:'2222000'+reg,branch:'a',specialty:'q',reg,start:'2026-10-24',end,required:500,paid:0,active:true,status:'active',payments:[],debtDueDates:{},snapshot:{centerOpsV13:true,billing:'one_time',courseType:'quick',fee:500,durationValue:60,durationUnit:'day'},...extra});
    const monthly=quick('monthly',8,'2026-11-23',{specialty:'m',paid:500,snapshot:{centerOpsV13:true,centerOpsMonthlyV13:true,dynamicMonthly:true,billing:'monthly',courseType:'normal',fee:500,durationValue:1,durationUnit:'month'},payments:[['2026-10-24',500,'نقداً','12:00',1,'دفعة تسجيل','status-monthly-tx',1,1,null,[{monthNumber:1,amount:500}],1]]});
    localStorage.setItem('efc-students-v1',JSON.stringify([quick('active-eight',1,'2026-12-02'),quick('near-today',2,'2026-11-24'),quick('near-seven',3,'2026-12-01',{branch:'b',specialty:'r'}),quick('ended',4,'2026-11-23'),quick('stopped-near',5,'2026-12-01',{active:false,status:'inactive'}),quick('stopped-ended',6,'2026-11-20',{branch:'b',specialty:'r',active:false,status:'inactive'}),quick('stopped-state',7,'2026-12-20',{branch:'b',active:true,status:'inactive'}),monthly,quick('no-end',9,'',{snapshot:{}})]));
  });
  await page.goto(`http://127.0.0.1:${server.address().port}/#students`);await page.waitForFunction(()=>window.EFC_SECURITY_UI_V13?.ready&&window.EFC_STUDENT_SEARCH_REDESIGN_V31?.ready);await page.locator('#studentStateV69').waitFor();
  const ids=()=>page.locator('#studentsTableV13 tbody tr[data-id]').evaluateAll(rows=>rows.map(row=>row.dataset.id).sort());
  const setStatus=async value=>{await page.locator('#studentStateV69').selectOption(value);return ids();};
  const all=await ids(),before=await page.evaluate(()=>JSON.stringify(students));assert.equal(all.length,9);
  const expected={active:['active-eight','monthly','no-end'],'near-end':['near-seven','near-today'],ended:['ended'],stopped:['stopped-ended','stopped-near','stopped-state']},labels={active:'نشطة','near-end':'ستنتهي قريباً',ended:'انتهت',stopped:'موقوف'},partitions=[];
  for(const [status,wanted] of Object.entries(expected)){
    const found=await setStatus(status);assert.deepEqual(found,wanted.sort(),status+' matches the canonical displayed course state');partitions.push(...found);assert((await page.locator('#studentsTableV13 tbody tr[data-id] td:last-child').allTextContents()).every(label=>label===labels[status]));
  }
  assert.equal(new Set(partitions).size,all.length,'status groups are disjoint');assert.deepEqual(partitions.sort(),all,'status groups cover all displayed students');
  await setStatus('near-end');await page.locator('#studentBranchV13').selectOption('b');assert.deepEqual(await ids(),['near-seven']);await page.locator('#studentSpecV13').selectOption('r');await page.locator('#studentSearchV13').fill('٠٠٠٣');assert.deepEqual(await ids(),['near-seven'],'Arabic registration digits intersect branch/course/status');await page.locator('#studentSearchV13').fill('طالب near-seven');assert.deepEqual(await ids(),['near-seven'],'name intersects all three filters');await page.locator('#studentSearchV13').fill('not-present');assert.deepEqual(await ids(),[]);
  await page.locator('#studentSearchV13').fill('');await page.locator('#studentSpecV13').selectOption('q');assert.deepEqual(await ids(),[],'incompatible course yields no results');await setStatus('stopped');assert.deepEqual(await ids(),['stopped-state'],'stopped status wins even if active flag is true');await page.locator('#studentBranchV13').selectOption('');await page.locator('#studentSpecV13').selectOption('');await page.locator('#studentSearchV13').fill('٢٢٢٢٠٠٠٦');assert.deepEqual(await ids(),['stopped-ended'],'Arabic phone search intersects stopped status');
  await page.locator('#studentSearchV13').fill('');await setStatus('');assert.deepEqual(await ids(),all);assert.equal(await page.evaluate(()=>JSON.stringify(students)),before,'search filtering never changes registrations, payments, stop flags or finances');
  await setStatus('near-end');await page.locator('#studentsTableV13 tr[data-id="near-today"]').click();await page.locator('.student-profile-v3').waitFor();assert((await page.locator('.modal-head h2').textContent()).includes('near-today'),'filtered rows retain profile navigation');await page.locator('.modal .modal-head>.x').click();assert.equal(await page.locator('#studentStateV69').inputValue(),'near-end');
  for(const width of [1440,1024,840]){
    await page.setViewportSize({width,height:1000});const geometry=await page.locator('.student-search-filters-v13').evaluate(element=>{const r=element.getBoundingClientRect();return{left:r.left,right:r.right,fit:element.scrollWidth<=element.clientWidth+1,controls:[...element.querySelectorAll('input,select')].map(control=>{const b=control.getBoundingClientRect();return{left:b.left,right:b.right,width:b.width};})};});assert(geometry.left>=0&&geometry.right<=width+1&&geometry.fit,'all status/search controls fit at '+width);assert.equal(geometry.controls.length,4);assert(geometry.controls.every(r=>r.left>=geometry.left&&r.right<=geometry.right+1&&r.width>=100),'each filter remains usable at '+width);if(output)await page.screenshot({path:path.join(output,`student-status-search-${width}-v69.png`)});
  }
  await page.clock.setFixedTime(new Date('2026-11-25T12:00:00Z'));await page.evaluate(()=>window.renderCurrentV13());assert.deepEqual(await setStatus('near-end'),['active-eight','near-seven'],'canonical seven-day threshold advances with the date');assert.deepEqual(await setStatus('ended'),['ended','near-today'],'yesterday endpoint becomes ended');assert.deepEqual(await setStatus('stopped'),expected.stopped,'date changes cannot relabel stopped students');assert.deepEqual(errors,[]);
  await context.close();console.log('PASS student status search v69: canonical status/date boundaries, monthly continuity, stopped priority, disjoint partitions, branch/course/name/phone/register intersections, profile navigation, immutable data and 840/1024/1440 layout.');
}finally{await browser.close();await new Promise(resolve=>server.close(resolve));}
