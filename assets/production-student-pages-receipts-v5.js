(()=>{
  const FLAG='__EFC_STUDENT_PAGES_RECEIPTS_V5__';
  if(window[FLAG]) return;

  function boot(){
    const ready =
      typeof students !== 'undefined' &&
      typeof specialties !== 'undefined' &&
      typeof renderStudents === 'function' &&
      typeof renderRegister === 'function' &&
      typeof renderLedger === 'function' &&
      typeof renderCurrent === 'function' &&
      typeof openPayment === 'function' &&
      typeof receiptModelV4 === 'function' &&
      typeof receiptWindowV4 === 'function' &&
      typeof installmentPlanV3 === 'function' &&
      typeof allocV4 === 'function' &&
      window.__EFC_STUDENT_PROFILE_V3__ &&
      window.__EFC_MULTI_COURSE_V4__;
    if(!ready){ setTimeout(boot,40); return; }
    window[FLAG]=true;

    const baseRegister=renderRegister;
    const baseRenderCurrent=renderCurrent;
    const baseRenderCurrentMerged=typeof renderCurrentMerged==='function'?renderCurrentMerged:null;
    const baseReceiptModel=receiptModelV4;

    const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
    const today=()=>typeof deviceTodayV3==='function'?deviceTodayV3():DEMO_TODAY;
    const timeNow=()=>typeof deviceTimeV3==='function'?deviceTimeV3():`${String(new Date().getHours()).padStart(2,'0')}:${String(new Date().getMinutes()).padStart(2,'0')}`;
    const fmt=v=>typeof fmtDateV3==='function'?fmtDateV3(v):fmtDate(v);
    const cash=v=>typeof moneyV3==='function'?moneyV3(v):money(v);
    const own=(o,k)=>Object.prototype.hasOwnProperty.call(o,k);
    const receiptText=n=>String(Math.max(0,Number(n||0))).padStart(5,'0');
    const receiptValue=v=>/^\d+$/.test(String(v??''))?Number(v):0;

    const style=document.createElement('style');
    style.textContent=`
      .spv5-actions{display:flex;align-items:center;justify-content:space-between;gap:10px;flex-wrap:wrap;margin-bottom:16px}
      .spv5-actions>div{display:flex;align-items:center;gap:8px;flex-wrap:wrap}
      .spv5-back{border:1px solid var(--border);background:#fff;color:var(--primary);border-radius:8px;padding:9px 13px;font:inherit;font-size:9px;cursor:pointer}
      .spv5-card{padding:18px}.spv5-grid{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:10px}
      .spv5-field{background:var(--surface2);border:1px solid var(--border);border-radius:9px;padding:12px;min-height:62px}
      .spv5-field small{display:block;color:var(--muted);font-size:8px;margin-bottom:6px}.spv5-course-row,.spv5-ledger-row,.spv5-payment-row{cursor:pointer}
      .spv5-course-row:hover td,.spv5-ledger-row:hover td,.spv5-payment-row:hover td{background:var(--surface2)}
      .spv5-note{padding:12px 14px;border:1px solid var(--border);border-radius:10px;background:var(--surface2);color:var(--muted);font-size:9px;line-height:1.8;margin-bottom:14px}
      .spv5-section-title{display:flex;align-items:center;justify-content:space-between;gap:10px;margin:22px 0 10px}.spv5-section-title h3{margin:0}
      .spv5-month-actions{display:flex;align-items:center;gap:6px;min-width:170px}.spv5-month-actions .mini{white-space:nowrap}
      .spv5-ledger-hint{margin:8px 0 0;color:var(--muted);font-size:8px}
      @media(max-width:1100px){.spv5-grid{grid-template-columns:repeat(2,minmax(0,1fr))}}
    `;
    document.head.appendChild(style);

    function personIdOf(s){ return String(s?.personId||`person-${s?.recordCode||s?.id||''}`); }
    function coursesFor(personId){ return students.filter(s=>personIdOf(s)===personId).slice().sort((a,b)=>String(b.start||'').localeCompare(String(a.start||''))); }
    function profileFor(personId){ const a=coursesFor(personId); return a.find(s=>s.profileOwner)||(a.length?a[a.length-1]:null); }
    function linkIdentity(s,o){
      if(!s||!o||s===o) return;
      for(const key of ['name','phone']){
        if(own(s,key)) delete s[key];
        Object.defineProperty(s,key,{configurable:true,enumerable:false,get:()=>o[key]??'',set:v=>{o[key]=String(v??'')}});
      }
    }
    function syncPeople(save=true){
      let changed=false;
      students.forEach(s=>{ if(!s.personId){ s.personId=`person-${s.recordCode||s.id}`; changed=true; } });
      const ids=[...new Set(students.map(personIdOf))];
      ids.forEach(id=>{
        const group=coursesFor(id);
        let owner=group.find(s=>s.profileOwner&&(own(s,'name')||own(s,'phone')))||group.find(s=>own(s,'name')||own(s,'phone'))||group.at(-1);
        if(!owner) return;
        if(!owner.profileOwner){ owner.profileOwner=true; changed=true; }
        group.forEach(s=>{
          if(s===owner) return;
          if(s.profileOwner){ s.profileOwner=false; changed=true; }
          if(own(s,'name')&&!String(owner.name||'').trim()){ owner.name=s.name; changed=true; }
          if(own(s,'phone')&&!String(owner.phone||'').trim()){ owner.phone=s.phone; changed=true; }
          if(own(s,'name')||own(s,'phone')) changed=true;
          linkIdentity(s,owner);
        });
      });
      if(changed&&save) saveStudents();
      return changed;
    }

    function receiptNumbersInUse(){
      const out=[];
      students.forEach(s=>{
        for(const p of s.payments||[]){ const n=receiptValue(p?.[8]); if(n) out.push(n); }
        for(const key of ['registrationReceiptNo','statementReceiptNo']){ const n=receiptValue(s?.[key]); if(n) out.push(n); }
        Object.values(s?.monthReceiptNumbers||{}).forEach(v=>{ const n=receiptValue(v); if(n) out.push(n); });
      });
      return out;
    }
    function nextReceiptNo(){
      const nums=receiptNumbersInUse();
      return (nums.length?Math.max(...nums):0)+1;
    }
    function migratePaymentReceipts(){
      const used=new Set(receiptNumbersInUse());
      let max=used.size?Math.max(...used):0;
      const refs=[];
      students.forEach((s,si)=>(s.payments||[]).forEach((p,i)=>refs.push({s,p,i,si,date:String(p?.[0]||''),order:Number(p?.[4]||0)||si/1000+i/100000})));
      refs.sort((a,b)=>a.date.localeCompare(b.date)||a.order-b.order);
      let changed=false;
      for(const r of refs){
        if(receiptValue(r.p?.[8])) continue;
        let candidate=500+Math.max(0,Number(r.s.reg||0))*7+r.i;
        if(!candidate||used.has(candidate)){
          do{ max+=1; candidate=max; }while(used.has(candidate));
        }
        used.add(candidate); max=Math.max(max,candidate); r.p[8]=candidate; changed=true;
      }
      if(changed) saveStudents();
    }
    function paymentReceiptNo(s,i){
      const p=s?.payments?.[i]; if(!p) return 0;
      let n=receiptValue(p[8]);
      if(!n){ n=nextReceiptNo(); p[8]=n; saveStudents(); }
      return n;
    }
    function registrationReceiptNo(s){
      if(s?.payments?.length) return paymentReceiptNo(s,0);
      let n=receiptValue(s?.registrationReceiptNo);
      if(!n){ n=nextReceiptNo(); s.registrationReceiptNo=n; saveStudents(); }
      return n;
    }
    function statementReceiptNo(s){
      let n=receiptValue(s?.statementReceiptNo);
      if(!n){ n=nextReceiptNo(); s.statementReceiptNo=n; saveStudents(); }
      return n;
    }
    function monthReceiptNo(s,monthNumber){
      if(!s.monthReceiptNumbers||typeof s.monthReceiptNumbers!=='object') s.monthReceiptNumbers={};
      let n=receiptValue(s.monthReceiptNumbers[monthNumber]);
      if(!n){ n=nextReceiptNo(); s.monthReceiptNumbers[monthNumber]=n; saveStudents(); }
      return n;
    }

    migratePaymentReceipts();

    receiptModelV4=function(s,i=null,statement=false){
      const model=baseReceiptModel(s,i,statement);
      if(!model) return model;
      if(statement) model.receipt=receiptText(statementReceiptNo(s));
      else if(i===null) model.receipt=receiptText(registrationReceiptNo(s));
      else model.receipt=receiptText(paymentReceiptNo(s,i));
      return model;
    };

    allPayments=function(){
      const out=[];
      students.forEach((s,si)=>(s.payments||[]).forEach((p,i)=>{
        const t=String(p?.[3]||'00:00');
        const order=Number(p?.[4]||0)||Number(t.slice(0,2))*60+Number(t.slice(3,5))+si/1000+i/100000;
        out.push({student:s,date:p?.[0],amount:Number(p?.[1]||0),method:p?.[2]||'',time:t,order,description:typeof payDescV4==='function'?payDescV4(s,i):String(p?.[5]||''),paymentIndex:i,receipt:receiptText(paymentReceiptNo(s,i))});
      }));
      return out.sort((a,b)=>String(b.date||'').localeCompare(String(a.date||''))||b.order-a.order);
    };

    function monthStateText(month){ return month.state==='paid'?'مدفوع كامل':month.state==='partial'?'دفع جزئي':month.state==='overdue'?'متأخر':month.state==='due'?'مستحق الآن':'لم يحن'; }
    function monthStateBadge(month){ const cls=month.state==='paid'?'good':month.state==='overdue'?'bad':month.state==='upcoming'?'neutral':'warn'; return `<span class="badge ${cls}">${monthStateText(month)}</span>`; }
    function monthReceiptModel(s,monthNumber){
      const plan=installmentPlanV3(s),month=plan[monthNumber-1]; if(!month||month.paid<=0) return null;
      const related=(s.payments||[]).map((p,i)=>({p,i,months:allocV4(s,i).months||[]})).filter(x=>x.months.some(m=>Number(m.n)===monthNumber));
      const latest=related.slice().sort((a,b)=>String(b.p?.[0]||'').localeCompare(String(a.p?.[0]||''))||Number(b.p?.[4]||0)-Number(a.p?.[4]||0))[0]?.p;
      const methods=[...new Set(related.map(x=>String(x.p?.[2]||'')).filter(Boolean))];
      return {student:s.name,phone:s.phone||'',branch:branchName(s.branch),specialty:spec(s.specialty)?.name||s.specialty,reg:String(s.reg??'').padStart(4,'0'),date:latest?.[0]||month.dueDate,receipt:receiptText(monthReceiptNo(s,monthNumber)),amount:month.paid,remaining:month.remaining,method:methods.length?methods.join(' + '):'—',month:`الشهر ${monthNumber}`,desc:`إجمالي مدفوع الشهر ${monthNumber}: ${cash(month.paid)} · المتبقي من الشهر: ${cash(month.remaining)}`};
    }

    function hrefPerson(id){ location.hash=`#student/${encodeURIComponent(id)}`; }
    function hrefCourse(id){ location.hash=`#enrollment/${encodeURIComponent(id)}`; }
    function hrefNewCourse(id){ location.hash=`#student/${encodeURIComponent(id)}/new-course`; }
    function route(){
      const parts=location.hash.slice(1).split('/').filter(Boolean).map(v=>{try{return decodeURIComponent(v)}catch{return v}});
      if(parts[0]==='student'&&parts[1]&&parts[2]==='new-course') return ['new',parts[1]];
      if(parts[0]==='student'&&parts[1]) return ['person',parts[1]];
      if(parts[0]==='enrollment'&&parts[1]) return ['course',parts[1]];
      return null;
    }

    function identityFields(owner,course=null){
      if(!course) return `<div class="spv5-grid"><div class="spv5-field"><small>اسم الطالب</small><b>${esc(owner.name)}</b></div><div class="spv5-field"><small>رقم الهاتف</small><b dir="ltr">${esc(String(owner.phone||'').trim()||'غير مسجل')}</b></div></div>`;
      const snap=course.snapshot||{},duration=snap.durationValue?`${snap.durationValue} ${unitLabel(snap.durationUnit)}`:'—';
      return `<div class="spv5-grid"><div class="spv5-field"><small>اسم الطالب</small><b>${esc(owner.name)}</b></div><div class="spv5-field"><small>رقم الهاتف</small><b dir="ltr">${esc(String(owner.phone||'').trim()||'غير مسجل')}</b></div><div class="spv5-field"><small>رقم السجل</small><b>${String(course.reg??'').padStart(4,'0')}</b></div><div class="spv5-field"><small>الفرع</small><b>${esc(branchName(course.branch))}</b></div><div class="spv5-field"><small>التخصص</small><b>${esc(spec(course.specialty)?.name||course.specialty)}</b></div><div class="spv5-field"><small>مدة الدورة</small><b>${esc(duration)}</b></div><div class="spv5-field"><small>بداية الدورة</small><b>${fmt(course.start)}</b></div><div class="spv5-field"><small>نهاية الدورة</small><b>${fmt(course.end)}</b></div></div>`;
    }

    function renderPersonPage(personId){
      syncPeople(false);
      const group=coursesFor(personId),owner=profileFor(personId);
      if(!owner||!group.length){ location.hash='#students'; return true; }
      currentPage='students';
      const only=group.length===1?group[0]:null;
      shell(`${pageTitle('ملف الطالب',esc(owner.name),only?'بيانات الطالب الأساسية والدورة المسجل فيها.':`بيانات الطالب ودوراته المسجلة (${group.length}).`)}
        <div class="spv5-actions"><button class="spv5-back" id="spv5Back">← رجوع</button><div><button class="button secondary" id="spv5Courses">${only?'الدورة والدفع':'الدورات والدفع'}</button><button class="button" id="spv5New">＋ تسجيل في دورة جديدة</button></div></div>
        <section class="card spv5-card"><div class="section-head"><h2>بيانات الطالب</h2><span>المعلومات الأساسية</span></div>${identityFields(owner,only)}</section>
        ${only?`<section class="card spv5-card" style="margin-top:16px"><div class="section-head"><h2>حالة التسجيل</h2><span>${esc(spec(only.specialty)?.name||'')}</span></div><div class="spv5-grid"><div class="spv5-field"><small>حالة الدورة</small>${badge(courseStatus(only))}</div><div class="spv5-field"><small>نوع التسجيل</small><b>${(only.snapshot||{}).billing==='monthly'?'دورة بدفع شهري':'دورة بدفعة واحدة'}</b></div><div class="spv5-field"><small>تاريخ البداية المعتمد</small><b>${fmt(only.start)}</b></div><div class="spv5-field"><small>تاريخ النهاية المعتمد</small><b>${fmt(only.end)}</b></div></div></section>`:`<section class="card spv5-card" id="spv5CourseList" style="margin-top:16px"><div class="section-head"><h2>دورات الطالب</h2><span>${group.length} دورات</span></div>${table(['السجل','التخصص','الفرع','البداية','النهاية','حالة الدورة','الوضع المالي'],group.map(s=>`<tr class="spv5-course-row" data-course="${esc(s.id)}"><td>${String(s.reg??'').padStart(4,'0')}</td><td><b>${esc(spec(s.specialty)?.name||s.specialty)}</b></td><td>${esc(branchName(s.branch))}</td><td>${fmt(s.start)}</td><td>${fmt(s.end)}</td><td>${badge(courseStatus(s))}</td><td>${financialCellV3(s)}</td></tr>`).join(''))}</section>`}`);
      document.getElementById('spv5Back').onclick=()=>location.hash='#students';
      document.getElementById('spv5New').onclick=()=>hrefNewCourse(personId);
      document.getElementById('spv5Courses').onclick=()=>only?hrefCourse(only.id):document.getElementById('spv5CourseList')?.scrollIntoView({behavior:'smooth'});
      document.querySelectorAll('[data-course]').forEach(row=>row.onclick=()=>hrefCourse(row.dataset.course));
      if(typeof convertDigitsInNodeV3==='function') convertDigitsInNodeV3(app);
      return true;
    }

    function renderCoursePage(courseId){
      syncPeople(false);
      const s=students.find(x=>x.id===courseId);
      if(!s){ location.hash='#students'; return true; }
      const personId=personIdOf(s),owner=profileFor(personId)||s,monthly=(s.snapshot||{}).billing==='monthly',plan=monthly?installmentPlanV3(s):[];
      const monthRows=monthly?plan.map(month=>{
        const receipt=month.paid>0?`<button class="mini spv5-month-receipt" data-month="${month.number}">فتح الروسي</button>`:'<span>—</span>';
        const pay=month.remaining>0?`<button class="mini spv5-month-pay" data-month="${month.number}">تسجيل الدفع</button>`:'';
        return `<tr><td>الشهر ${month.number}</td><td>${fmt(month.dueDate)}</td><td>${cash(month.fee)}</td><td>${cash(month.paid)}</td><td>${cash(month.remaining)}</td><td>${monthStateBadge(month)}</td><td><div class="spv5-month-actions">${receipt}${pay}</div></td></tr>`;
      }).join(''):'';
      const paymentRows=(s.payments||[]).map((p,i)=>({p,i})).reverse().map(({p,i})=>`<tr class="spv5-payment-row" data-payment="${i}"><td>${receiptText(paymentReceiptNo(s,i))}</td><td>${fmt(p[0])}</td><td>${esc(p[2]||'')}</td><td>${cash(p[1])}</td><td>${esc(typeof payDescV4==='function'?payDescV4(s,i):p[5]||'')}</td><td><button class="mini spv5-payment-receipt" data-payment="${i}">فتح الروسي</button></td></tr>`).join('');
      currentPage='students';
      shell(`${pageTitle('الدورة والدفع',esc(owner.name),`${esc(spec(s.specialty)?.name||s.specialty)} · ${esc(branchName(s.branch))}`)}
        <div class="spv5-actions"><button class="spv5-back" id="spv5Person">← ملف الطالب</button><div><button class="button secondary" id="spv5New2">＋ تسجيل في دورة جديدة</button></div></div>
        <section class="card spv5-card"><div class="student-kpis"><div><small>البداية</small><b>${fmt(s.start)}</b></div><div><small>النهاية</small><b>${fmt(s.end)}</b></div><div><small>حالة الدورة</small>${badge(courseStatus(s))}</div><div><small>${monthly?'وضع الشهر':'الوضع المالي'}</small>${monthly?monthBadgeV3(s):badge(financialStatus(s))}</div><div><small>المدفوع</small><b>${cash(s.paid)}</b></div><div><small>المتبقي من الدورة</small><b>${cash(remainingOf(s))}</b></div></div></section>
        ${monthly?`<div class="spv5-section-title"><h3>أشهر الدورة</h3><button class="mini" id="spv5Statement">روسي شامل للأشهر</button></div>${table(['الشهر','موعده','المبلغ','المدفوع','المتبقي','الحالة','الخيارات'],monthRows)}`:''}
        <div class="spv5-section-title"><h3>سجل الدفعات</h3><button class="mini" id="spv5RegistrationReceipt">روسي التسجيل</button></div>
        ${table(['رقم الوصل','التاريخ','الوسيلة','المبلغ','البيان',''],paymentRows)}
        ${!monthly&&remainingOf(s)>0?'<div class="spv5-actions" style="margin-top:14px"><span></span><div><button class="button" id="spv5OnePay">تسجيل دفعة جديدة</button></div></div>':''}`);
      document.getElementById('spv5Person').onclick=()=>hrefPerson(personId);
      document.getElementById('spv5New2').onclick=()=>hrefNewCourse(personId);
      document.getElementById('spv5OnePay')?.addEventListener('click',()=>openPayment(s.id));
      document.getElementById('spv5RegistrationReceipt').onclick=()=>receiptWindowV4(receiptModelV4(s));
      document.getElementById('spv5Statement')?.addEventListener('click',()=>receiptWindowV4(receiptModelV4(s,null,true)));
      document.querySelectorAll('.spv5-payment-receipt').forEach(button=>button.onclick=e=>{e.stopPropagation();receiptWindowV4(receiptModelV4(s,Number(button.dataset.payment)))});
      document.querySelectorAll('.spv5-payment-row').forEach(row=>row.onclick=()=>receiptWindowV4(receiptModelV4(s,Number(row.dataset.payment))));
      document.querySelectorAll('.spv5-month-receipt').forEach(button=>button.onclick=e=>{e.stopPropagation();const r=monthReceiptModel(s,Number(button.dataset.month));if(r)receiptWindowV4(r)});
      document.querySelectorAll('.spv5-month-pay').forEach(button=>button.onclick=e=>{e.stopPropagation();openPayment(s.id,Number(button.dataset.month))});
      if(typeof convertDigitsInNodeV3==='function') convertDigitsInNodeV3(app);
      return true;
    }

    function renderNewCoursePage(personId){
      syncPeople(false);
      const owner=profileFor(personId);
      if(!owner){ location.hash='#students'; return true; }
      if(!specialties.length){ location.hash='#specialties'; return true; }
      const first=specialties[0],date=today();
      currentPage='students';
      shell(`${pageTitle('تسجيل دورة جديدة',esc(owner.name),'نفس خطوات التسجيل المعتادة بدون إعادة إدخال الاسم أو رقم الهاتف.')}
        <div class="spv5-actions"><button class="spv5-back" id="spv5Person">← ملف الطالب</button></div>
        <div class="spv5-note"><b>${esc(owner.name)}</b>${String(owner.phone||'').trim()?` · <span dir="ltr">${esc(owner.phone)}</span>`:''}<br>سيتم ربط التسجيل الجديد بنفس ملف الطالب، وتبقى مالية كل دورة مستقلة.</div>
        <div class="registration"><form id="spv5Form" class="card form-card"><div class="section-head"><h2>بيانات الدورة والتسجيل</h2><span>الحقول الأساسية</span></div><div class="grid two"><label>الفرع<select name="branch" required>${opts(branches)}</select></label><label>التخصص<select name="specialty" id="spv5Spec" required>${opts(specialties)}</select></label><label>تاريخ البداية<input class="input" name="start" id="spv5Start" type="date" value="${date}" required></label><label>المبلغ المدفوع الآن<input class="input" name="paid" id="spv5Paid" type="number" min="0" value="0"></label><label>وسيلة الدفع<select name="method">${methods.map(x=>`<option>${esc(x)}</option>`).join('')}</select></label><label>الوقت<input class="input" name="time" type="time" value="${timeNow()}" required></label></div><div class="summary-inline" id="spv5Summary"></div><button class="button" type="submit">حفظ التسجيل</button></form><div class="card side-summary"><h3>ملخص التسجيل</h3><div id="spv5Side"></div><small>هذه الدورة ودفعاتها وإيصالاتها مستقلة عن دورات الطالب الأخرى.</small></div></div>`);
      document.getElementById('spv5Person').onclick=()=>hrefPerson(personId);
      const form=document.getElementById('spv5Form'),specEl=document.getElementById('spv5Spec'),startEl=document.getElementById('spv5Start'),paidEl=document.getElementById('spv5Paid');
      function summary(){
        const sp=spec(specEl.value)||first,required=requiredFor(sp),paid=Math.max(0,Math.min(required,Number(paidEl.value||0))),end=addDuration(startEl.value||date,sp.durationValue,sp.durationUnit);
        document.getElementById('spv5Summary').innerHTML=`<div><span>مدة الدورة</span><b>${sp.durationValue} ${unitLabel(sp.durationUnit)}</b></div><div><span>نظام الدفع</span><b>${billingLabel(sp.billing)}</b></div><div><span>${sp.billing==='monthly'?'القسط الشهري':'سعر الدورة'}</span><b>${cash(sp.fee)}</b></div><div><span>إجمالي الالتزام</span><b>${cash(required)}</b></div><div><span>تاريخ الانتهاء</span><b>${fmt(end)}</b></div><div><span>المتبقي بعد التسجيل</span><b>${cash(required-paid)}</b></div>`;
        document.getElementById('spv5Side').innerHTML=`<div class="big-money">${cash(required)}</div><p>إجمالي الدورة</p><hr><div class="sum-line"><span>المدفوع الآن</span><b>${cash(paid)}</b></div><div class="sum-line"><span>المتبقي</span><b>${cash(required-paid)}</b></div>`;
      }
      specEl.onchange=summary; startEl.onchange=summary; paidEl.oninput=summary; summary();
      form.onsubmit=e=>{
        e.preventDefault();
        const data=new FormData(form),sp=spec(String(data.get('specialty'))); if(!sp) return;
        const branch=String(data.get('branch')),start=String(data.get('start')),required=requiredFor(sp),paid=Math.max(0,Math.min(required,Number(data.get('paid')||0))),reg=Math.max(0,...students.filter(s=>s.branch===branch&&s.specialty===sp.id).map(s=>Number(s.reg||0)))+1;
        const course={id:`student-${Date.now()}-${Math.random().toString(36).slice(2,8)}`,personId,profileOwner:false,branch,specialty:sp.id,reg,start,end:addDuration(start,sp.durationValue,sp.durationUnit),required,paid:0,snapshot:{durationValue:sp.durationValue,durationUnit:sp.durationUnit,billing:sp.billing,fee:sp.fee},payments:[]};
        linkIdentity(course,owner); window.EFC_CODES?.ensureStudentRecord?.(course);
        if(paid>0){ const tx=window.EFC_CODES?.newTransactionCode?.(course)||`tx-${Date.now()}-${Math.random()}`; course.payments.push([start,paid,String(data.get('method')),String(data.get('time')||timeNow()),Date.now(),`دفعة تسجيل دورة ${sp.name||''}`.trim(),tx,null]); course.paid=paid; }
        students.unshift(course); saveStudents(); syncPeople(false); if(course.payments.length) paymentReceiptNo(course,0);
        alert(`تم تسجيل ${owner.name} في دورة ${sp.name}\nرقم السجل: ${String(reg).padStart(4,'0')}\nالمتبقي: ${cash(remainingOf(course))}`);
        hrefCourse(course.id);
      };
      return true;
    }

    function renderRoute(){ const r=route(); if(!r) return false; return r[0]==='person'?renderPersonPage(r[1]):r[0]==='course'?renderCoursePage(r[1]):renderNewCoursePage(r[1]); }

    renderStudents=function(){
      syncPeople(false); currentPage='students';
      shell(`${pageTitle('الملفات','البحث عن طالب','ابحث عن الطالب واعرض ملفه ودوراته دون تكرار بياناته الشخصية.')}<div class="card filters"><input class="input" id="studentSearch" placeholder="الاسم، الهاتف أو رقم السجل"><select id="studentBranch">${opts(branches,x=>x.id,x=>x.name,'كل الفروع')}</select><select id="studentSpec">${opts(specialties,x=>x.id,x=>x.name,'كل التخصصات')}</select></div><div id="studentsTable"></div>`);
      function draw(){
        const q=document.getElementById('studentSearch').value.trim().toLowerCase(),branch=document.getElementById('studentBranch').value,specialty=document.getElementById('studentSpec').value,ids=[...new Set(students.map(personIdOf))];
        const rows=ids.map(id=>({id,owner:profileFor(id),courses:coursesFor(id)})).filter(g=>g.owner&&(!q||String(g.owner.name||'').toLowerCase().includes(q)||String(g.owner.phone||'').includes(q)||g.courses.some(s=>String(s.reg??'').includes(q)))&&(!branch||g.courses.some(s=>s.branch===branch))&&(!specialty||g.courses.some(s=>s.specialty===specialty))).map(g=>{const course=g.courses.find(s=>courseStatus(s)!=='انتهت')||g.courses[0];return `<tr class="student-row" data-person="${esc(g.id)}"><td>${String(course.reg??'').padStart(4,'0')}</td><td><b>${esc(g.owner.name)}</b></td><td>${esc(String(g.owner.phone||'').trim()||'—')}</td><td>${g.courses.length}</td><td>${esc(spec(course.specialty)?.name||course.specialty)}</td><td>${esc(branchName(course.branch))}</td><td>${fmt(course.start)}</td><td>${badge(courseStatus(course))}</td></tr>`}).join('');
        document.getElementById('studentsTable').innerHTML=table(['السجل','الطالب','الهاتف','الدورات','التخصص الحالي/الأخير','الفرع','البداية','حالة الدورة'],rows);
        document.querySelectorAll('[data-person]').forEach(row=>row.onclick=()=>hrefPerson(row.dataset.person));
        if(typeof convertDigitsInNodeV3==='function') convertDigitsInNodeV3(document.getElementById('studentsTable'));
      }
      ['studentSearch','studentBranch','studentSpec'].forEach(id=>document.getElementById(id).addEventListener(id==='studentSearch'?'input':'change',draw)); draw();
    };

    renderRegister=function(){
      baseRegister();
      const form=document.getElementById('regForm');
      if(form&&!form.dataset.spv5){
        form.dataset.spv5='1';
        form.addEventListener('submit',()=>setTimeout(()=>{ syncPeople(true); migratePaymentReceipts(); },0));
      }
    };

    openStudent=function(id,mode='finance'){
      const s=students.find(x=>x.id===id); if(!s) return;
      mode==='profile'?hrefPerson(personIdOf(s)):hrefCourse(id);
    };

    renderLedger=function(){
      const current=today();
      shell(`${pageTitle('الحركة اليومية','اليومية','اختر التاريخ؛ آخر عملية مسجلة تظهر في الأعلى.')}<div class="card ledger-controls"><label>اليوم<input class="input" id="ledgerDate" type="date" value="${current}"></label><label>الفرع<select id="ledgerBranch">${opts(branches,x=>x.id,x=>x.name,'كل الفروع')}</select></label><label>التخصص<select id="ledgerSpec">${opts(specialties,x=>x.id,x=>x.name,'كل التخصصات')}</select></label><label>وسيلة الدفع<select id="ledgerMethod"><option value="">كل وسائل الدفع</option>${methods.map(x=>`<option>${esc(x)}</option>`).join('')}</select></label></div><div id="ledgerBody"></div>`);
      ['ledgerDate','ledgerBranch','ledgerSpec','ledgerMethod'].forEach(id=>document.getElementById(id).onchange=draw);
      function draw(){
        const date=document.getElementById('ledgerDate').value,branch=document.getElementById('ledgerBranch').value,specialty=document.getElementById('ledgerSpec').value,method=document.getElementById('ledgerMethod').value,transactions=allPayments().filter(p=>p.date===date&&(!branch||p.student.branch===branch)&&(!specialty||p.student.specialty===specialty)&&(!method||p.method===method)),total=transactions.reduce((sum,p)=>sum+p.amount,0);
        document.getElementById('ledgerBody').innerHTML=`<div class="ledger-summary"><div><small>التاريخ</small><b>${fmt(date)}</b></div><div><small>عدد العمليات</small><b>${transactions.length}</b></div><div><small>إجمالي دخل اليوم</small><b>${cash(total)}</b></div></div>${table(['رقم الوصل','الطالب','الفرع','التخصص','البيان','وسيلة الدفع','المبلغ'],transactions.map(p=>`<tr class="spv5-ledger-row" data-student="${esc(p.student.id)}" data-payment="${p.paymentIndex}"><td>${p.receipt}</td><td>${esc(p.student.name)}</td><td>${esc(branchName(p.student.branch))}</td><td>${esc(spec(p.student.specialty)?.name||p.student.specialty)}</td><td>${esc(p.description)}</td><td>${esc(p.method)}</td><td><b>${cash(p.amount)}</b></td></tr>`).join(''))}<div class="spv5-ledger-hint">اضغط على أي معاملة لفتح الروسي الخاص بها.</div>`;
        document.querySelectorAll('.spv5-ledger-row').forEach(row=>row.onclick=()=>{const s=students.find(x=>x.id===row.dataset.student);if(s)receiptWindowV4(receiptModelV4(s,Number(row.dataset.payment)))});
        if(typeof convertDigitsInNodeV3==='function') convertDigitsInNodeV3(document.getElementById('ledgerBody'));
      }
      draw();
    };

    renderCurrent=function(){ if(renderRoute()) return; return baseRenderCurrent(); };
    if(baseRenderCurrentMerged) renderCurrentMerged=function(){ if(renderRoute()) return; return baseRenderCurrentMerged(); };
    window.addEventListener('hashchange',()=>setTimeout(renderRoute,0));
    syncPeople(true);
    window.EFC_STUDENT_PAGES_RECEIPTS_V5=Object.freeze({pagesAreFinal:true,multiCourse:true,numericSequentialReceipts:true,ledgerReceiptOpen:true});
    if(route()) renderRoute(); else if(currentPage==='students') renderStudents(); else if(currentPage==='ledger') renderLedger();
  }

  boot();
})();