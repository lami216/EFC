import {readFileSync,writeFileSync} from 'node:fs';

const read=path=>readFileSync(path,'utf8');
const write=(path,text)=>writeFileSync(path,text,'utf8');

function replaceRequired(path,search,replacement,label){
  const source=read(path);
  if(!source.includes(search))throw new Error(`Missing ${label} in ${path}`);
  write(path,source.replace(search,replacement));
}

function replaceRegexRequired(path,pattern,replacement,label){
  const source=read(path);
  if(!pattern.test(source))throw new Error(`Missing ${label} in ${path}`);
  pattern.lastIndex=0;
  write(path,source.replace(pattern,replacement));
}

const RECEIPTS='assets/production-receipts-v13.js';
replaceRequired(
  RECEIPTS,
  '<div class="official12">${OFFICIAL_NAME}</div>',
  '<div class="official12">للغات والمعلوماتية</div>',
  'receipt secondary center name'
);

const DOMAIN='assets/production-domain-v13.js';
const reminderDomainBlock=String.raw`function reminderNote(student,{kind,title,message,amount=0,dueDate='',monthNumber=null,fee=0,state='',contextType='',contextLabel='',contextValue=''}={}){
  const specialtyName=String(spec(student.specialty)?.name||student.specialty||'الدورة');
  const resolvedContextType=contextType||(monthNumber?'month':'course');
  const resolvedContextLabel=contextLabel||(resolvedContextType==='month'?'الشهر':'الدورة');
  const resolvedContextValue=contextValue||(resolvedContextType==='month'&&monthNumber?\`الشهر \${monthNumber}\`:specialtyName);
  return{
    studentId:String(student.id),studentName:String(student.name||''),phone:String(student.phone||''),reg:String(student.reg??''),
    branchName:String(typeof branchName==='function'?branchName(student.branch):student.branch||''),specialtyName,
    kind:String(kind||'reminder'),title:String(title||'تذكير مستحقات'),message:String(message||''),
    amount:Math.max(0,Number(amount||0)),fee:Math.max(0,Number(fee||0)),dueDate:String(dueDate||''),
    monthNumber:monthNumber===null||monthNumber===undefined?null:Number(monthNumber),state:String(state||''),date:today(),
    contextType:resolvedContextType,contextLabel:resolvedContextLabel,contextValue:String(resolvedContextValue||'')
  };
}
function debtMessage(student,amount,due,overdue=false,{monthNumber=null,fee=0}={}){
  const course=spec(student.specialty)?.name||'الدورة';
  const scope=monthNumber?\`الشهر \${monthNumber} من دورة \${course}\`:\`دورة \${course}\`;
  const total=fee>0&&Number(fee)!==Number(amount)?\` من أصل \${cash(fee)}\`:'';
  const timing=overdue?\`وقد تجاوز موعد الاستحقاق المحدد بتاريخ \${showDate(due)}\`:\`وموعد الاستحقاق هو \${due===addDays(today(),1)?'غدًا، الموافق ':''}\${showDate(due)}\`;
  return \`عزيزي الطالب \${student.name}، نحيطكم علمًا بأن المبلغ المتبقي على \${scope} هو \${cash(amount)}\${total}، \${timing}. نرجو تسوية المبلغ في الموعد المحدد حتى يبقى ملفكم المالي محدثًا. إذا سبق لكم السداد، يرجى تجاهل هذا التذكير أو التواصل مع إدارة المركز لتأكيد العملية.\`;
}
function notificationsForStudent(student){
  if(!student||isInactive(student))return[];
  const out=[],asOf=today();
  if(isDynamicMonthly(student)){
    installmentPlan(student,asOf).forEach(month=>{
      if(month.remaining<=0)return;
      const custom=student.debtDueDates?.[String(month.number)],course=spec(student.specialty)?.name||'الدورة';
      if(custom&&asOf>=addDays(custom,-1)){
        const overdue=asOf>custom,message=debtMessage(student,month.remaining,custom,overdue,{monthNumber:month.number,fee:month.fee});
        out.push(reminderNote(student,{kind:overdue?'debt-overdue':'debt-due',title:overdue?\`متبقي متأخر — الشهر \${month.number}\`:\`موعد سداد المتبقي — الشهر \${month.number}\`,message,amount:month.remaining,dueDate:custom,monthNumber:month.number,fee:month.fee,state:overdue?'overdue':'due',contextType:'month'}));
        return;
      }
      const opens=addDays(month.dueDate,-3);
      if(month.number>1&&asOf>=opens&&asOf<month.dueDate){
        const message=\`عزيزي الطالب \${student.name}، هذا تذكير بتجديد الشهر القادم: الشهر \${month.number} من دورة \${course}. قيمة الرسوم \${cash(month.fee)}، وموعد الاستحقاق \${showDate(month.dueDate)}. يمكنكم السداد من الآن، ونرجو إتمامه في الموعد المحدد حتى يبقى ملفكم المالي منتظمًا دون مستحقات متأخرة. إذا تم السداد بالفعل، يرجى تجاهل التذكير أو التواصل مع إدارة المركز لتحديث الحالة.\`;
        out.push(reminderNote(student,{kind:'monthly-upcoming',title:\`تذكير بتجديد الشهر \${month.number}\`,message,amount:month.fee,dueDate:month.dueDate,monthNumber:month.number,fee:month.fee,state:'upcoming',contextType:'month'}));
      }else if(asOf>=month.dueDate){
        const partial=month.remaining<month.fee,overdue=asOf>month.dueDate;
        let message='';
        if(partial)message=\`عزيزي الطالب \${student.name}، تم تسجيل دفعة جزئية للشهر \${month.number} من دورة \${course}، وما زال المبلغ المطلوب \${cash(month.remaining)} من أصل \${cash(month.fee)}. موعد الاستحقاق \${showDate(month.dueDate)}. نرجو استكمال المتبقي في أقرب وقت حتى يصبح الشهر مسددًا بالكامل. إذا سبق لكم استكمال السداد، يرجى التواصل مع إدارة المركز لتحديث الملف.\`;
        else if(overdue)message=\`عزيزي الطالب \${student.name}، نذكركم بأن رسوم الشهر \${month.number} من دورة \${course} ما زالت مستحقة بقيمة \${cash(month.remaining)}، وقد تجاوز موعد الاستحقاق بتاريخ \${showDate(month.dueDate)}. نرجو تسوية المبلغ في أقرب فرصة لتفادي تراكم المستحقات والمحافظة على انتظام الملف المالي. إذا سبق السداد، يرجى تجاهل هذا التذكير أو تأكيد العملية مع الإدارة.\`;
        else message=\`عزيزي الطالب \${student.name}، أصبحت رسوم الشهر \${month.number} من دورة \${course} مستحقة اليوم بقيمة \${cash(month.remaining)}. موعد الاستحقاق \${showDate(month.dueDate)}. نرجو إتمام السداد في الموعد المحدد حتى يبقى ملفكم المالي محدثًا. إذا تم السداد بالفعل، يرجى تجاهل التذكير أو التواصل مع الإدارة لتأكيد العملية.\`;
        out.push(reminderNote(student,{kind:partial?'monthly-partial':overdue?'monthly-overdue':'monthly-due',title:partial?\`متبقي الشهر \${month.number}\`:overdue?\`استحقاق متأخر — الشهر \${month.number}\`:\`استحقاق الشهر \${month.number}\`,message,amount:month.remaining,dueDate:month.dueDate,monthNumber:month.number,fee:month.fee,state:partial?'partial':overdue?'overdue':'due',contextType:'month'}));
      }
    });
  }else if(isNewModel(student)&&remainingAmount(student)>0){
    const due=student.debtDueDates?.course;
    if(due&&asOf>=addDays(due,-1)){
      const amount=remainingAmount(student),overdue=asOf>due,message=debtMessage(student,amount,due,overdue);
      out.push(reminderNote(student,{kind:overdue?'debt-overdue':'debt-due',title:overdue?'تذكير بمبلغ متبقٍ متأخر':'تذكير بموعد سداد المتبقي',message,amount,dueDate:due,state:overdue?'overdue':'due',contextType:'course',contextLabel:'الدورة',contextValue:spec(student.specialty)?.name||student.specialty||'الدورة'}));
    }
  }
  return out;
}
function currentNotifications(){return students.flatMap(notificationsForStudent);}`;
replaceRegexRequired(
  DOMAIN,
  /function reminderNote\(student,[\s\S]*?function currentNotifications\(\)\{return students\.flatMap\(notificationsForStudent\);\}/,
  reminderDomainBlock,
  'reminder domain controller'
);

const SECURITY='assets/production-security-ui-v13.js';
const reminderModelBlock=String.raw`function reminderModel(note){
  const student=students.find(value=>String(value.id)===String(note?.studentId));
  let monthNumber=note?.monthNumber===null||note?.monthNumber===undefined?null:Number(note.monthNumber),amount=Math.max(0,Number(note?.amount||0)),fee=Math.max(0,Number(note?.fee||0)),dueDate=String(note?.dueDate||'');
  const specialtyName=String(note?.specialtyName||(student?(spec(student.specialty)?.name||student.specialty):'')||'—');
  if(student&&D.isDynamicMonthly?.(student)){
    const plan=D.installmentPlan?.(student)||[];
    let month=monthNumber?plan.find(item=>Number(item.number)===Number(monthNumber)):null;
    if(!month)month=plan.find(item=>Number(item.remaining||0)>0&&item.state!=='upcoming')||plan.find(item=>Number(item.remaining||0)>0)||null;
    if(month){
      monthNumber=monthNumber||Number(month.number);
      const custom=student.debtDueDates?.[String(month.number)];
      dueDate=dueDate||String(custom||month.dueDate||'');
      fee=fee||Math.max(0,Number(month.fee||0));
      if(!amount)amount=String(note?.kind||'')==='monthly-upcoming'?fee:Math.max(0,Number(month.remaining||0))||fee;
    }
  }else if(student){
    amount=amount||Math.max(0,Number(D.remainingAmount?.(student)||0));
    dueDate=dueDate||String(student.debtDueDates?.course||'');
  }
  const contextType=String(note?.contextType||(monthNumber?'month':'course'));
  const contextLabel=String(note?.contextLabel||(contextType==='month'?'الشهر':'الدورة'));
  const contextValue=String(note?.contextValue||(contextType==='month'&&monthNumber?\`الشهر \${monthNumber}\`:specialtyName)||'—');
  return{
    ...note,
    studentId:String(note?.studentId||student?.id||''),studentName:String(note?.studentName||student?.name||''),phone:String(note?.phone||student?.phone||''),
    reg:String(note?.reg??student?.reg??''),branchName:String(note?.branchName||(student?branchName(student.branch):'')||'—'),specialtyName,
    title:String(note?.title||'تذكير مستحقات'),message:String(note?.message||''),amount,fee,dueDate,monthNumber,date:String(note?.date||today()),
    contextType,contextLabel,contextValue
  };
}`;
replaceRegexRequired(
  SECURITY,
  /function reminderModel\(note\)\{[\s\S]*?\n\}\nfunction reminderCss\(\)/,
  `${reminderModelBlock}\nfunction reminderCss()`,
  'reminder preview model'
);

const reminderCssBlock=String.raw`function reminderCss(){return\`
*{box-sizing:border-box}body{font-family:Tahoma,Arial,sans-serif;margin:0;background:#eef1f0;color:#111715}.reminder-paper-v13{width:1040px;max-width:96vw;min-height:430px;margin:18px auto;background:#fff;border:2px solid #293631;padding:12px 18px 16px;direction:ltr}
.head12{display:grid;grid-template-columns:240px 1fr 150px;gap:14px;align-items:center;border-bottom:1px solid #b2b8b5;padding-bottom:6px}.contact12{display:grid;grid-template-columns:92px 1fr;gap:8px;align-items:center;direction:ltr;text-align:left}.contact12 img,.logoOnly12 img{width:82px;height:62px;object-fit:contain;object-position:center;display:block}.contactText12{display:grid;gap:1px;align-content:center}.contactText12>b{display:block;font-size:13px;line-height:1.35;white-space:nowrap;direction:ltr;text-align:left}.socialLine12{display:flex;align-items:center;gap:5px;font-size:13px;line-height:1.35;white-space:nowrap;direction:ltr;text-align:left;font-weight:700;justify-content:flex-start}.socialLine12.teacher12{font-size:10px;font-weight:700;margin-top:2px;direction:ltr;justify-content:flex-start}.socialLine12.teacher12 span:last-child{font-weight:700;direction:rtl;unicode-bidi:isolate}.socialIcon12{width:14px;height:14px;display:inline-block;flex:0 0 14px;color:#111715}.socialIcon12 svg{width:100%;height:100%;display:block;fill:currentColor}.center12{text-align:center;direction:rtl}.center12 h1{margin:0;font-size:27px;line-height:1}.title12{display:flex;direction:ltr;justify-content:center;align-items:baseline;gap:12px;white-space:nowrap}.title12 .enTitle12{direction:ltr}.title12 .arTitle12{direction:rtl}.center12 .official12{font-size:11px;font-weight:900;margin-top:3px}.center12 .tag12{font-size:11px;font-weight:700;margin-top:3px}.logoOnly12{height:66px;display:grid;place-items:center}
.reminder-meta12{display:flex;justify-content:space-between;align-items:center;gap:24px;direction:ltr;padding:7px 0 4px;font-size:10px;border-bottom:1px solid #e2e5e4}.reminder-meta12>span{direction:rtl}.reminder-title12{text-align:center;direction:rtl;margin:9px 0 8px}.reminder-title12 h2{margin:0;font-size:20px}.reminder-title12 p{margin:3px 0 0;color:#65736e;font-size:9px}.reminder-facts12{display:grid;grid-template-columns:repeat(8,minmax(0,1fr));gap:6px;direction:rtl;margin-bottom:9px}.reminder-facts12>div{border:1px solid #d6dcda;border-radius:7px;padding:6px 7px;min-height:40px;overflow:hidden}.reminder-facts12>div.identity{background:#eef5ff;border-color:#cfdef1}.reminder-facts12>div.academic{background:#eef8f4;border-color:#cfe4da}.reminder-facts12>div.finance{background:#fff7e8;border-color:#ead7ae}.reminder-facts12 small{display:block;color:#6f7b77;font-size:7px;margin-bottom:3px;white-space:nowrap}.reminder-facts12 b{display:block;font-size:9.5px;line-height:1.35;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.reminder-message12{direction:rtl;text-align:right;border:1px solid #d5dfdb;background:#f6faf8;border-radius:8px;padding:11px 15px;font-size:13px;line-height:1.9;font-weight:700;min-height:82px;display:flex;align-items:center}.reminder-note12{direction:rtl;text-align:center;color:#61716b;font-size:8px;margin:8px 0 0}.reminder-actions12{width:1040px;max-width:96vw;margin:0 auto 18px;display:flex;direction:rtl;gap:8px}.reminder-actions12 button{border:0;border-radius:7px;padding:10px 17px;font:700 13px Tahoma;cursor:pointer}.reminder-print12{background:#155ea8;color:#fff}.reminder-save12{background:#159a55;color:#fff}@media(max-width:900px){.reminder-facts12{grid-template-columns:repeat(4,minmax(0,1fr))}}@media(max-width:620px){.reminder-facts12{grid-template-columns:repeat(2,minmax(0,1fr))}}@media print{body{background:#fff}.reminder-paper-v13{width:100%;max-width:none;margin:0;border:1px solid #222}.reminder-actions12{display:none}@page{size:landscape;margin:8mm}}
\`;}`;
replaceRegexRequired(
  SECURITY,
  /function reminderCss\(\)\{return`[\s\S]*?`;\}/,
  reminderCssBlock,
  'reminder document CSS'
);

const reminderHeaderBlock=String.raw`function reminderHeader(model){const img=\`<img src="\${reminderLogo()}" alt="EFC">\`;return\`<div class="head12"><div class="contact12">\${img}<div class="contactText12"><b>Tél: 48 02 84 84</b><div class="socialLine12">\${reminderWhatsappIcon()}<span>32 09 86 89</span></div><div class="socialLine12 teacher12">\${reminderFacebookIcon()}<span>الأستاذ محمد ديدي</span></div></div></div><div class="center12"><h1 class="title12"><span class="enTitle12">Centre EFC</span><span class="arTitle12">مركز</span></h1><div class="official12">للغات والمعلوماتية</div><div class="tag12">جميع الشهادات معترف بها من طرف الدولة</div></div><div class="logoOnly12">\${img}</div></div>\`;}`;
replaceRegexRequired(
  SECURITY,
  /function reminderHeader\(model\)\{[\s\S]*?\nfunction reminderBody/,
  `${reminderHeaderBlock}\nfunction reminderBody`,
  'reminder receipt-style header'
);

const reminderBodyBlock=String.raw`function reminderBody(note){
  const model=reminderModel(note),facts=[
    {label:'اسم الطالب',value:model.studentName,group:'identity'},
    {label:'رقم الهاتف',value:model.phone||'—',group:'identity'},
    {label:'رقم السجل',value:model.reg?String(model.reg).padStart(4,'0'):'—',group:'academic'},
    {label:'الفرع',value:model.branchName,group:'academic'},
    {label:'التخصص',value:model.specialtyName,group:'academic'},
    {label:model.contextLabel||'الشهر',value:model.contextValue||'—',group:'academic'},
    {label:'المبلغ المطلوب',value:model.amount?cash(model.amount):'—',group:'finance'},
    {label:'موعد الاستحقاق',value:model.dueDate?showDate(model.dueDate):'—',group:'finance'}
  ];
  return\`\${reminderHeader(model)}<div class="reminder-meta12"><span>تاريخ التذكير: <b>\${showDate(model.date)}</b></span><span>الفرع: <b>\${esc(model.branchName)}</b></span></div><div class="reminder-title12"><h2>\${esc(model.title)}</h2><p>إشعار مالي صادر من مركز EFC للغات والمعلوماتية</p></div><div class="reminder-facts12">\${facts.map(item=>\`<div class="\${item.group}"><small>\${esc(item.label)}</small><b>\${esc(item.value)}</b></div>\`).join('')}</div><div class="reminder-message12">\${esc(model.message)}</div><p class="reminder-note12">يرجى التواصل مع إدارة المركز عند الحاجة إلى مراجعة تفاصيل الرصيد أو تأكيد عملية السداد.</p>\`;
}`;
replaceRegexRequired(
  SECURITY,
  /function reminderBody\(note\)\{[\s\S]*?\n\}\nfunction reminderDocument\(/,
  `${reminderBodyBlock}\nfunction reminderDocument(`,
  'reminder compact fact row'
);

const TEST='scripts/verify-critical-runtime.mjs';
const testAnchor="const certificates=read('assets/production-certificates-v13.js');";
const reminderChecks=String.raw`const domain=read('assets/production-domain-v13.js');
for(const token of ['contextLabel','contextValue','هذا تذكير بتجديد الشهر القادم','موعد الاستحقاق'])requireText(domain,token,\`structured reminder domain \${token}\`);
const securityUi=read('assets/production-security-ui-v13.js');
for(const token of ['reminder-facts12','grid-template-columns:repeat(8','class="official12">للغات والمعلوماتية','contextValue'])requireText(securityUi,token,\`compact reminder document \${token}\`);
forbidText(securityUi,'<span>Rappel</span>','duplicate reminder title in receipt-style header');
const receiptsUi=read('assets/production-receipts-v13.js');
requireText(receiptsUi,'class="official12">للغات والمعلوماتية','receipt header secondary line without duplicated center name');

`;
replaceRequired(TEST,testAnchor,`${reminderChecks}${testAnchor}`,'critical reminder verification anchor');

for(const path of ['index.html','assets/production-license-gate-v8.js']){
  const source=read(path);
  if(!source.includes('20260912-reminder-docs'))throw new Error(`Cache token not found in ${path}`);
  write(path,source.replaceAll('20260912-reminder-docs','20260912-reminder-polish-2'));
}

console.log('Applied reminder document polish to canonical v13 sources.');
