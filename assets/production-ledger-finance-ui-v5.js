(()=>{
  const FLAG='__EFC_LEDGER_FINANCE_UI_V5__';
  if(window[FLAG]) return;

  function boot(){
    const ready=
      window.EFC_REGISTRATION_RECEIPT_V4 &&
      typeof renderFinance==='function' &&
      typeof renderLedger==='function' &&
      typeof allPayments==='function' &&
      typeof receiptModelV4==='function' &&
      typeof receiptWindowV4==='function' &&
      typeof navItems!=='undefined';
    if(!ready){setTimeout(boot,40);return;}
    window[FLAG]=true;

    const esc=value=>String(value??'').replace(/[&<>"']/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
    const pad2=value=>String(value).padStart(2,'0');
    const today=()=>typeof deviceTodayV3==='function'?deviceTodayV3():DEMO_TODAY;
    const cash=value=>typeof moneyV3==='function'?moneyV3(value):money(value);
    const showDate=value=>typeof fmtDateV3==='function'?fmtDateV3(value):fmtDate(value);
    const monthNames=['يناير','فبراير','مارس','أبريل','مايو','يونيو','يوليو','أغسطس','سبتمبر','أكتوبر','نوفمبر','ديسمبر'];

    const icon=body=>`<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><g fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">${body}</g></svg>`;
    const icons={
      register:icon('<circle cx="9" cy="8" r="3"/><path d="M3.8 19c.7-3.5 2.4-5.3 5.2-5.3 1.5 0 2.7.5 3.6 1.5M18 8v7M14.5 11.5h7"/>'),
      specialties:icon('<rect x="3.5" y="4" width="7" height="7" rx="1.2"/><rect x="13.5" y="4" width="7" height="7" rx="1.2"/><rect x="3.5" y="14" width="7" height="6" rx="1.2"/><rect x="13.5" y="14" width="7" height="6" rx="1.2"/>'),
      period:icon('<circle cx="10.5" cy="10.5" r="5.5"/><path d="m15 15 5 5M7.8 10.5h5.4M10.5 7.8v5.4"/>'),
      students:icon('<circle cx="9" cy="8" r="3"/><path d="M3.5 19c.8-3.6 2.6-5.4 5.5-5.4 2.1 0 3.6.9 4.6 2.7M16.5 14.5a3.5 3.5 0 1 0 0 7 3.5 3.5 0 0 0 0-7Zm2.6 6.1 2 2"/>'),
      finance:icon('<path d="M4 19V9M10 19V5M16 19v-7M22 19H2M3.5 7.5 9 3l5 5 6-5"/>'),
      ledger:icon('<rect x="4" y="3" width="16" height="18" rx="2"/><path d="M8 8h8M8 12h8M8 16h5"/>'),
      settings:icon('<path d="M4 7h10M18 7h2M4 12h3M11 12h9M4 17h8M16 17h4"/><circle cx="16" cy="7" r="2"/><circle cx="9" cy="12" r="2"/><circle cx="14" cy="17" r="2"/>')
    };

    const navConfig=[
      ['register',icons.register,'تسجيل طالب'],
      ['specialties',icons.specialties,'التخصصات'],
      ['period',icons.period,'آلية البحث'],
      ['students',icons.students,'البحث عن طالب'],
      ['finance',icons.finance,'المالية'],
      ['ledger',icons.ledger,'اليومية'],
      ['settings',icons.settings,'الإعدادات']
    ];
    navItems.splice(0,navItems.length,...navConfig);

    const style=document.createElement('style');
    style.textContent=`
      .shell nav i{width:34px!important;min-width:34px;height:34px;display:grid!important;place-items:center!important;color:currentColor}
      .shell nav i svg{width:24px;height:24px;display:block}
      .shell nav a{gap:10px}
      .finance-controls-v5{grid-template-columns:auto repeat(4,minmax(145px,1fr))!important;align-items:end}
      .finance-controls-v5 .segmented{margin-bottom:0}
      .ledger-open-v5{cursor:pointer;color:var(--primary);font-weight:800}
      .ledger-open-v5:hover{text-decoration:underline}
      .ledger-hint-v5{margin:9px 2px 0;color:var(--muted);font-size:8px}
      @media(max-width:1250px){.finance-controls-v5{grid-template-columns:repeat(2,minmax(170px,1fr))!important}.finance-controls-v5 .segmented{grid-column:1/-1}}
    `;
    document.head.appendChild(style);

    function refreshSidebar(){
      navConfig.forEach(([id,svg])=>{
        const node=document.querySelector(`.shell nav a[href="#${id}"] i`);
        if(node) node.innerHTML=svg;
      });
    }

    function yearOptions(){
      const current=Number(today().slice(0,4));
      const years=new Set(Array.from({length:10},(_,index)=>current-index));
      allPayments().forEach(payment=>{
        const year=Number(String(payment.date||'').slice(0,4));
        if(Number.isInteger(year)&&year>1900&&year<2200) years.add(year);
      });
      return [...years].sort((a,b)=>b-a);
    }

    function monthBounds(year,month){
      const last=new Date(Number(year),Number(month),0).getDate();
      return {from:`${year}-${pad2(month)}-01`,to:`${year}-${pad2(month)}-${pad2(last)}`};
    }
    function yearBounds(year){return {from:`${year}-01-01`,to:`${year}-12-31`};}
    function tenYearBounds(){
      const current=Number(today().slice(0,4));
      return {from:`${current-9}-01-01`,to:`${current}-12-31`,startYear:current-9,endYear:current};
    }

    function financeSeries(mode,year,month,payments){
      if(mode==='daily'){
        const days=new Date(Number(year),Number(month),0).getDate();
        return Array.from({length:days},(_,index)=>{
          const day=index+1,key=`${year}-${pad2(month)}-${pad2(day)}`;
          return {label:String(day),value:payments.filter(payment=>payment.date===key).reduce((sum,payment)=>sum+payment.amount,0)};
        });
      }
      if(mode==='monthly'){
        return monthNames.map((name,index)=>({
          label:name,
          value:payments.filter(payment=>Number(String(payment.date||'').slice(5,7))===index+1).reduce((sum,payment)=>sum+payment.amount,0)
        }));
      }
      const bounds=tenYearBounds();
      return Array.from({length:10},(_,index)=>bounds.startYear+index).map(itemYear=>({
        label:String(itemYear),
        value:payments.filter(payment=>Number(String(payment.date||'').slice(0,4))===itemYear).reduce((sum,payment)=>sum+payment.amount,0)
      }));
    }

    renderFinance=function(){
      const currentDate=today(),currentYear=Number(currentDate.slice(0,4)),currentMonth=Number(currentDate.slice(5,7));
      const years=yearOptions();
      shell(`${pageTitle('تحليل الإيرادات','المالية','اختر طريقة العرض والفترة المطلوبة؛ اليوم المحدد لم يعد أساس التحليل.')}<div class="card finance-controls finance-controls-v5"><div class="segmented" id="financeMode"><button data-mode="daily">يومي</button><button data-mode="monthly" class="active">شهري</button><button data-mode="yearly">سنوي</button></div><label id="financeMonthWrap">الشهر<select id="financeMonth">${monthNames.map((name,index)=>`<option value="${index+1}" ${index+1===currentMonth?'selected':''}>${name}</option>`).join('')}</select></label><label id="financeYearWrap">السنة<select id="financeYear">${years.map(year=>`<option value="${year}" ${year===currentYear?'selected':''}>${year}</option>`).join('')}</select></label><label>الفرع<select id="financeBranch">${opts(branches,x=>x.id,x=>x.name,'كل الفروع')}</select></label><label>التخصص<select id="financeSpec">${opts(specialties,x=>x.id,x=>x.name,'كل التخصصات')}</select></label></div><div id="financeBody"></div>`);
      let mode='monthly';
      const monthWrap=document.getElementById('financeMonthWrap'),yearWrap=document.getElementById('financeYearWrap');
      function updateControls(){
        monthWrap.hidden=mode!=='daily';
        yearWrap.hidden=mode==='yearly';
      }
      function draw(){
        const year=Number(document.getElementById('financeYear').value||currentYear),month=Number(document.getElementById('financeMonth').value||currentMonth),branch=document.getElementById('financeBranch').value,specialty=document.getElementById('financeSpec').value;
        const bounds=mode==='daily'?monthBounds(year,month):mode==='monthly'?yearBounds(year):tenYearBounds();
        const payments=allPayments().filter(payment=>payment.date>=bounds.from&&payment.date<=bounds.to&&(!branch||payment.student.branch===branch)&&(!specialty||payment.student.specialty===specialty));
        const series=financeSeries(mode,year,month,payments),total=payments.reduce((sum,payment)=>sum+payment.amount,0),average=payments.length?Math.round(total/payments.length):0;
        const relevantStudents=students.filter(student=>(!branch||student.branch===branch)&&(!specialty||student.specialty===specialty));
        const outstanding=relevantStudents.reduce((sum,student)=>sum+remainingOf(student),0);
        const byBranch=branches.map(item=>[item.name,payments.filter(payment=>payment.student.branch===item.id).reduce((sum,payment)=>sum+payment.amount,0)]).filter(item=>item[1]);
        const bySpec=specialties.map(item=>[item.name,payments.filter(payment=>payment.student.specialty===item.id).reduce((sum,payment)=>sum+payment.amount,0)]).filter(item=>item[1]);
        const byMethod=methods.map(item=>[item,payments.filter(payment=>payment.method===item).reduce((sum,payment)=>sum+payment.amount,0)]).filter(item=>item[1]);
        const title=mode==='daily'?`الدخل اليومي خلال ${monthNames[month-1]} ${year}`:mode==='monthly'?`الدخل الشهري خلال سنة ${year}`:'الدخل السنوي لآخر 10 سنوات';
        const period=mode==='daily'?`${monthNames[month-1]} ${year}`:mode==='monthly'?`سنة ${year}`:`${bounds.startYear} — ${bounds.endYear}`;
        document.getElementById('financeBody').innerHTML=`<div class="kpis"><div class="card"><small>دخل الفترة</small><b>${cash(total)}</b><span>${period}</span></div><div class="card"><small>عدد الدفعات</small><b>${payments.length}</b><span>عملية مالية</span></div><div class="card"><small>متوسط الدفعة</small><b>${cash(average)}</b><span>للفترة المختارة</span></div><div class="card"><small>مستحقات الطلاب</small><b>${cash(outstanding)}</b><span>حسب الفلاتر الحالية</span></div></div><div class="card chart-card"><div class="chart-head"><div><h2>${title}</h2><span>${branch?branchName(branch):'كل الفروع'} · ${specialty?spec(specialty)?.name:'كل التخصصات'}</span></div><b>${cash(total)}</b></div>${lineChart(series)}</div><div class="grid three breakdowns"><div class="card"><h3>حسب الفرع</h3>${breakdown(byBranch,total)}</div><div class="card"><h3>حسب التخصص</h3>${breakdown(bySpec,total)}</div><div class="card"><h3>حسب وسيلة الدفع</h3>${breakdown(byMethod,total)}</div></div>`;
        if(typeof convertDigitsInNodeV3==='function') convertDigitsInNodeV3(document.getElementById('financeBody'));
      }
      document.querySelectorAll('#financeMode button').forEach(button=>button.onclick=()=>{mode=button.dataset.mode;document.querySelectorAll('#financeMode button').forEach(item=>item.classList.toggle('active',item===button));updateControls();draw();});
      ['financeMonth','financeYear','financeBranch','financeSpec'].forEach(id=>document.getElementById(id).onchange=draw);
      updateControls();draw();refreshSidebar();
    };

    function resolvePaymentIndex(payment){
      const direct=Number(payment.paymentIndex);
      if(Number.isInteger(direct)&&direct>=0) return direct;
      const student=payment.student;
      if(!student) return -1;
      return (student.payments||[]).findIndex((entry,index)=>String(500+Number(student.reg||0)*7+index).padStart(5,'0')===String(payment.receipt||''));
    }

    renderLedger=function(){
      shell(`${pageTitle('الحركة اليومية','اليومية','اختر يومًا واحدًا لعرض دخل ذلك اليوم، واضغط اسم الطالب أو رقم الوصل لفتح الروسي الخاص بالمعاملة.')}<div class="card ledger-controls"><label>اليوم<input class="input" id="ledgerDate" type="date" value="${today()}"></label><label>الفرع<select id="ledgerBranch">${opts(branches,x=>x.id,x=>x.name,'كل الفروع')}</select></label><label>التخصص<select id="ledgerSpec">${opts(specialties,x=>x.id,x=>x.name,'كل التخصصات')}</select></label><label>وسيلة الدفع<select id="ledgerMethod"><option value="">كل وسائل الدفع</option>${methods.map(value=>`<option>${esc(value)}</option>`).join('')}</select></label></div><div id="ledgerBody"></div>`);
      ['ledgerDate','ledgerBranch','ledgerSpec','ledgerMethod'].forEach(id=>document.getElementById(id).onchange=draw);
      function draw(){
        const date=document.getElementById('ledgerDate').value,branch=document.getElementById('ledgerBranch').value,specialty=document.getElementById('ledgerSpec').value,method=document.getElementById('ledgerMethod').value;
        const payments=allPayments().filter(payment=>payment.date===date&&(!branch||payment.student.branch===branch)&&(!specialty||payment.student.specialty===specialty)&&(!method||payment.method===method)).sort((a,b)=>String(a.time).localeCompare(String(b.time)));
        const total=payments.reduce((sum,payment)=>sum+payment.amount,0);
        const rows=payments.map(payment=>{const index=resolvePaymentIndex(payment);return `<tr data-student="${esc(payment.student.id)}" data-payment="${index}"><td>${esc(payment.time)}</td><td class="ledger-open-v5">${esc(payment.receipt)}</td><td class="ledger-open-v5">${esc(payment.student.name)}</td><td>${esc(branchName(payment.student.branch))}</td><td>${esc(spec(payment.student.specialty)?.name||payment.student.specialty)}</td><td>${esc(payment.description||'دفعة طالب')}</td><td>${esc(payment.method)}</td><td><b>${cash(payment.amount)}</b></td></tr>`;}).join('');
        document.getElementById('ledgerBody').innerHTML=`<div class="ledger-summary"><div><small>التاريخ</small><b>${showDate(date)}</b></div><div><small>عدد العمليات</small><b>${payments.length}</b></div><div><small>إجمالي دخل اليوم</small><b>${cash(total)}</b></div></div>${table(['الوقت','رقم الوصل','الطالب','الفرع','التخصص','البيان','وسيلة الدفع','المبلغ'],rows)}<div class="ledger-hint-v5">اضغط على اسم الطالب أو رقم الوصل لفتح الروسي الخاص بهذه المعاملة.</div><div class="day-breakdown">${methods.map(value=>`<div><span>${esc(value)}</span><b>${cash(payments.filter(payment=>payment.method===value).reduce((sum,payment)=>sum+payment.amount,0))}</b></div>`).join('')}</div>`;
        document.querySelectorAll('#ledgerBody .ledger-open-v5').forEach(cell=>cell.onclick=event=>{event.stopPropagation();const row=cell.closest('tr'),student=students.find(item=>item.id===row?.dataset.student),index=Number(row?.dataset.payment);if(student&&Number.isInteger(index)&&index>=0) receiptWindowV4(receiptModelV4(student,index));});
        if(typeof convertDigitsInNodeV3==='function') convertDigitsInNodeV3(document.getElementById('ledgerBody'));
      }
      draw();refreshSidebar();
    };

    refreshSidebar();
    const page=location.hash.replace(/^#/,'');
    if(page==='finance') renderFinance();
    else if(page==='ledger') renderLedger();

    window.EFC_LEDGER_FINANCE_UI_V5=Object.freeze({
      ledgerTransactionReceiptOpen:true,
      financeDailyBySelectedMonth:true,
      financeMonthlyBySelectedYear:true,
      financeYearlyLastTenYears:true,
      weeklyFinanceRemoved:true,
      sidebarSvgIcons:true
    });
  }

  boot();
})();
