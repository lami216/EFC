(() => {
  const productStyle = document.createElement('style');
  productStyle.textContent = `
    .production-side-note{display:block;color:#9fc1b6;text-align:center;font-size:9px;line-height:1.6}
    .production-empty-config{max-width:760px;margin:20px auto;text-align:center;padding:34px}
    .production-empty-config h2{margin:0 0 10px;font-size:19px}
    .production-empty-config p{margin:0 auto 18px;color:var(--muted);font-size:10px;line-height:1.9;max-width:560px}
    .receipt-viewer-prod{padding:18px!important}
    .receipt-viewer-card-prod{width:min(1180px,97vw);height:min(880px,95vh);background:#fff;border-radius:16px;box-shadow:0 26px 90px #0006;overflow:hidden;display:grid;grid-template-rows:52px 1fr}
    .receipt-viewer-head-prod{display:flex;align-items:center;justify-content:space-between;padding:0 16px;border-bottom:1px solid var(--border);background:#fff;direction:rtl}
    .receipt-viewer-head-prod b{font-size:12px}
    .receipt-viewer-close-prod{width:34px;height:34px;border:1px solid var(--border);border-radius:8px;background:#fff;color:var(--muted);font-size:20px;cursor:pointer}
    .receipt-viewer-frame-prod{width:100%;height:100%;border:0;background:#eef1f0}

    .period-search-card-prod{display:grid;grid-template-columns:minmax(260px,2fr) repeat(3,minmax(135px,1fr));gap:10px;margin-bottom:14px}
    .period-toolbar-prod{grid-column:1/-1;display:flex;align-items:flex-end;justify-content:space-between;gap:16px;padding-top:2px;direction:rtl}
    .period-tabs-prod{display:flex;align-items:center;gap:6px;flex-wrap:wrap}
    .period-tabs-prod button{border:1px solid var(--border);background:#fff;color:var(--muted);border-radius:8px;padding:9px 13px;font:inherit;font-size:9px;cursor:pointer}
    .period-tabs-prod button.active{background:var(--primary);border-color:var(--primary);color:#fff;font-weight:800}
    .period-dates-prod{display:flex;align-items:flex-end;gap:8px;direction:rtl;margin-inline-start:auto}
    .period-dates-prod label{margin:0;min-width:142px;font-size:8px;color:var(--muted)}
    .period-dates-prod .input{min-width:142px}
    .period-help-prod{display:flex;align-items:center;justify-content:space-between;gap:12px;color:var(--muted);font-size:9px;margin:-2px 0 12px}
    .period-help-prod b{color:var(--primary)}
    .period-result-head-prod{display:flex;align-items:center;justify-content:space-between;margin:0 0 10px;font-size:9px;color:var(--muted)}
    .period-result-head-prod b{font-size:11px;color:var(--text)}
    .sortable-head-prod{cursor:pointer;user-select:none;white-space:nowrap;transition:background .15s ease}
    .sortable-head-prod:hover{background:var(--surface-2)}
    .sort-arrow-prod{display:inline-block;margin-inline-start:5px;color:var(--primary);font-size:11px;font-weight:900}
    .period-pay-prod{white-space:nowrap}

    .settings-grid-prod{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:16px;max-width:1040px}
    .settings-card-prod{padding:22px;display:flex;flex-direction:column;gap:13px;min-height:205px}
    .settings-card-prod h2{margin:0;font-size:15px}
    .settings-card-prod p{margin:0;color:var(--muted);font-size:9px;line-height:1.9}
    .settings-card-prod .button{margin-top:auto;align-self:flex-start}
    .settings-card-prod.restore-prod{border-color:#ead7a8}
    .settings-note-prod{grid-column:1/-1;padding:14px 16px;border:1px solid var(--border);border-radius:10px;background:var(--surface-2);color:var(--muted);font-size:9px;line-height:1.8}
    .settings-result-prod{grid-column:1/-1;min-height:20px;font-size:9px;color:var(--muted)}
    .settings-result-prod.good{color:#16724e}.settings-result-prod.bad{color:#b13b35}

    @media(max-width:1250px){
      .period-search-card-prod{grid-template-columns:repeat(2,minmax(0,1fr))}
      .period-toolbar-prod{align-items:stretch;flex-direction:column}
      .period-dates-prod{margin-inline-start:0;align-self:flex-start}
    }
    @media(max-width:900px){
      .settings-grid-prod{grid-template-columns:1fr}
      .period-dates-prod{width:100%}.period-dates-prod label{flex:1}.period-dates-prod .input{width:100%;min-width:0}
    }
  `;
  document.head.appendChild(productStyle);

  const invoke = window.__TAURI__?.core?.invoke;
  const escProd = value => String(value ?? '').replace(/[&<>"']/g, ch => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
  const todayProd = () => typeof deviceTodayV3 === 'function' ? deviceTodayV3() : DEMO_TODAY;
  const moneyProd = value => typeof moneyV3 === 'function' ? moneyV3(value) : money(value);
  const dateProd = value => typeof fmtDateV3 === 'function' ? fmtDateV3(value) : fmtDate(value);
  const logoHref = () => document.querySelector('link[rel="icon"]')?.href || './efc-logo.svg';

  navItems.splice(0, navItems.length,
    ['register','＋','تسجيل طالب'],
    ['specialties','▦','التخصصات'],
    ['period','◷','آلية البحث'],
    ['students','⌕','البحث عن طالب'],
    ['finance','⌁','المالية'],
    ['ledger','≡','اليومية'],
    ['settings','⚙','الإعدادات']
  );

  shell = function(content) {
    app.innerHTML = `<div class="shell shell-v8"><aside><div class="brand"><div class="logo logo-v8"><img src="${logoHref()}" alt="EFC"></div><div><b>مركز EFC للتدريب</b><small>نظام إدارة الطلاب والمالية</small></div></div><nav>${navItems.map(([id,ic,n])=>`<a href="#${id}" class="${currentPage===id?'active':''}"><i>${ic}</i><span>${n}</span></a>`).join('')}</nav><div class="side-foot"><small class="production-side-note">البيانات محفوظة محليًا على هذا الجهاز</small></div></aside><main><section class="content">${content}</section></main></div>`;
  };

  const registerBaseProd = renderRegister;
  renderRegister = function() {
    if (!specialties.length) {
      shell(`${pageTitle('الواجهة الرئيسية','تسجيل طالب جديد','ابدأ بإضافة تخصص واحد على الأقل قبل تسجيل الطلاب.')}<div class="card production-empty-config"><h2>لا توجد تخصصات بعد</h2><p>أضف التخصصات الفعلية للمركز وحدد المدة والسعر، وبعدها تصبح شاشة التسجيل جاهزة للاستخدام.</p><button class="button" id="goSpecialtiesProd">إضافة أول تخصص</button></div>`);
      document.getElementById('goSpecialtiesProd')?.addEventListener('click', () => { location.hash = '#specialties'; });
      return;
    }

    registerBaseProd();
    const start = document.getElementById('regStart');
    const form = document.getElementById('regForm');
    const today = todayProd();
    if (start) {
      start.value = today;
      start.dispatchEvent(new Event('change'));
    }
    form?.addEventListener('submit', () => setTimeout(() => {
      const input = document.getElementById('regStart');
      if (input) {
        input.value = today;
        input.dispatchEvent(new Event('change'));
      }
    }, 0));
  };

  const financialRankProd = new Map([
    ['مدفوع كامل', 1], ['لم يدفع', 2], ['دفع جزئي', 3], ['مستحق الآن', 4], ['متأخر', 5]
  ]);
  const courseRankProd = new Map([['نشطة', 1], ['ستنتهي قريباً', 2], ['انتهت', 3]]);
  const collatorProd = new Intl.Collator('ar', { numeric: true, sensitivity: 'base' });

  const sortValueProd = (record, key) => record.sort?.[key] ?? '';
  function compareProd(a, b, header, direction) {
    const av = sortValueProd(a, header.key);
    const bv = sortValueProd(b, header.key);
    let result = 0;
    if (header.type === 'number') result = Number(av || 0) - Number(bv || 0);
    else if (header.type === 'date') result = String(av || '').localeCompare(String(bv || ''));
    else if (header.type === 'financial') result = (financialRankProd.get(String(av)) || 0) - (financialRankProd.get(String(bv)) || 0);
    else if (header.type === 'course') result = (courseRankProd.get(String(av)) || 0) - (courseRankProd.get(String(bv)) || 0);
    else result = collatorProd.compare(String(av || ''), String(bv || ''));
    return direction === 'desc' ? -result : result;
  }

  function periodTableProd(headers, records, sortState, onSort) {
    const sorted = [...records];
    if (sortState?.key) {
      const header = headers.find(item => item.key === sortState.key);
      if (header) sorted.sort((a,b) => compareProd(a,b,header,sortState.direction));
    }
    const head = headers.map(header => {
      const active = sortState?.key === header.key;
      const arrow = active ? `<span class="sort-arrow-prod">${sortState.direction === 'desc' ? '↑' : '↓'}</span>` : '';
      return `<th class="sortable-head-prod" data-sort="${header.key}">${escProd(header.label)}${arrow}</th>`;
    }).join('');
    const body = sorted.length
      ? sorted.map(record => `<tr class="student-row" data-id="${escProd(record.studentId || '')}">${record.cells.join('')}</tr>`).join('')
      : `<tr><td colspan="${headers.length}"><div class="empty">لا توجد نتائج</div></td></tr>`;
    const wrapper = document.createElement('div');
    wrapper.innerHTML = `<div class="table-wrap"><table><thead><tr>${head}</tr></thead><tbody>${body}</tbody></table></div>`;
    wrapper.querySelectorAll('[data-sort]').forEach(cell => cell.addEventListener('click', () => onSort(cell.dataset.sort)));
    return wrapper.firstElementChild;
  }

  renderPeriod = function() {
    const today = todayProd();
    shell(`${pageTitle('بحث موحد','آلية البحث','ابحث بالطالب والفترة والفرع والتخصص والوضعية، ثم تنقّل بين المسجلين والدفعات والمستحقات ونهايات الدورات.')}
      <div class="card period-search-card-prod">
        <input class="input" id="periodSearch" placeholder="ابحث بالاسم أو الهاتف أو رقم السجل">
        <select id="periodBranch">${opts(branches,x=>x.id,x=>x.name,'كل الفروع')}</select>
        <select id="periodSpec">${opts(specialties,x=>x.id,x=>x.name,'كل التخصصات')}</select>
        <select id="periodState">
          <option value="">كل الحالات المالية</option>
          <option value="outstanding">كل المستحقات</option>
          <option value="متأخر">متأخر</option>
          <option value="مستحق الآن">مستحق الآن</option>
          <option value="دفع جزئي">دفع جزئي</option>
          <option value="لم يدفع">لم يدفع</option>
          <option value="مدفوع كامل">مدفوع كامل</option>
        </select>
        <div class="period-toolbar-prod">
          <div class="period-tabs-prod" id="periodTabsProd">
            <button class="active" data-tab="registrations">المسجلون</button>
            <button data-tab="payments">الدفعات</button>
            <button data-tab="dues">المستحقات</button>
            <button data-tab="ending">نهايات الدورات</button>
          </div>
          <div class="period-dates-prod">
            <label>من (الأقدم إذا ترك فارغًا)<input class="input" id="periodFrom" type="date" value=""></label>
            <label>إلى<input class="input" id="periodTo" type="date" value="${today}"></label>
          </div>
        </div>
      </div>
      <div class="period-help-prod"><span><b>الفترة:</b> ترك «من» فارغًا يعني البحث من أقدم بيانات موجودة.</span><span>اضغط عنوان أي عمود لترتيب النتائج.</span></div>
      <div id="periodResult"></div>`);

    let tab = 'registrations';
    const sortByTab = {
      registrations: null,
      payments: null,
      dues: null,
      ending: null
    };

    const identity = (student, q) => !q ||
      String(student.name || '').toLowerCase().includes(q) ||
      String(student.phone || '').includes(q) ||
      String(student.reg).padStart(4,'0').includes(q) ||
      String(student.reg) === q;
    const inRange = (date, from, to) => (!from || date >= from) && (!to || date <= to);
    const actionHtml = student => remainingOf(student) > 0
      ? `<button class="mini pay-now period-pay-prod" data-id="${student.id}">تسجيل دفعة</button>`
      : '<span class="badge good">مكتمل</span>';

    function draw() {
      const q = document.getElementById('periodSearch').value.trim().toLowerCase();
      const from = document.getElementById('periodFrom').value;
      const to = document.getElementById('periodTo').value || today;
      const br = document.getElementById('periodBranch').value;
      const sp = document.getElementById('periodSpec').value;
      const st = document.getElementById('periodState').value;
      const statusMatch = student => !st || (st === 'outstanding' ? remainingOf(student) > 0 : financialStatus(student) === st);
      const base = student => identity(student,q) && statusMatch(student) && (!br || student.branch === br) && (!sp || student.specialty === sp);

      let headers = [];
      let records = [];

      if (tab === 'registrations') {
        headers = [
          ['السجل','reg','number'],['الطالب','student','text'],['الفرع','branch','text'],['التخصص','specialty','text'],
          ['تاريخ التسجيل','start','date'],['النهاية','end','date'],['الإجمالي','required','number'],['المدفوع','paid','number'],
          ['المتبقي من الدورة','remaining','number'],['الوضعية','financial','financial'],['الإجراء','action','number']
        ].map(([label,key,type])=>({label,key,type}));
        records = students.filter(student => base(student) && inRange(student.start,from,to)).map(student => ({
          studentId: student.id,
          sort: {
            reg: student.reg, student: student.name, branch: branchName(student.branch), specialty: spec(student.specialty)?.name || student.specialty,
            start: student.start, end: student.end, required: student.required, paid: student.paid, remaining: remainingOf(student),
            financial: financialStatus(student), action: remainingOf(student) > 0 ? 1 : 0
          },
          cells: [
            `<td>${String(student.reg).padStart(4,'0')}</td>`, `<td><b>${escProd(student.name)}</b><small>${escProd(student.phone||'')}</small></td>`,
            `<td>${escProd(branchName(student.branch))}</td>`, `<td>${escProd(spec(student.specialty)?.name||student.specialty)}</td>`,
            `<td>${dateProd(student.start)}</td>`, `<td>${dateProd(student.end)}</td>`, `<td>${moneyProd(student.required)}</td>`,
            `<td>${moneyProd(student.paid)}</td>`, `<td>${moneyProd(remainingOf(student))}</td>`, `<td>${badge(financialStatus(student))}</td>`,
            `<td>${actionHtml(student)}</td>`
          ]
        }));
      }

      if (tab === 'payments') {
        headers = [
          ['التاريخ','date','date'],['الطالب','student','text'],['الفرع','branch','text'],['التخصص','specialty','text'],
          ['الوسيلة','method','text'],['المبلغ','amount','number'],['الإجراء','action','number']
        ].map(([label,key,type])=>({label,key,type}));
        records = allPayments().filter(payment => base(payment.student) && inRange(payment.date,from,to)).map(payment => ({
          studentId: payment.student.id,
          sort: {
            date: payment.date, student: payment.student.name, branch: branchName(payment.student.branch), specialty: spec(payment.student.specialty)?.name || payment.student.specialty,
            method: payment.method, amount: payment.amount, action: remainingOf(payment.student) > 0 ? 1 : 0
          },
          cells: [
            `<td>${dateProd(payment.date)}</td>`, `<td><b>${escProd(payment.student.name)}</b><small>${escProd(payment.student.phone||'')}</small></td>`,
            `<td>${escProd(branchName(payment.student.branch))}</td>`, `<td>${escProd(spec(payment.student.specialty)?.name||payment.student.specialty)}</td>`,
            `<td>${escProd(payment.method)}</td>`, `<td>${moneyProd(payment.amount)}</td>`, `<td>${actionHtml(payment.student)}</td>`
          ]
        }));
      }

      if (tab === 'dues') {
        headers = [
          ['السجل','reg','number'],['الطالب','student','text'],['الفرع','branch','text'],['التخصص','specialty','text'],
          ['البداية','start','date'],['النهاية','end','date'],['الإجمالي','required','number'],['المدفوع','paid','number'],
          ['المتبقي من الدورة','remaining','number'],['الوضعية','financial','financial'],['الإجراء','action','number']
        ].map(([label,key,type])=>({label,key,type}));
        records = students.filter(student => {
          if (!base(student) || remainingOf(student) <= 0) return false;
          if (to && student.start > to) return false;
          if (from && student.end < from) return false;
          return true;
        }).map(student => ({
          studentId: student.id,
          sort: {
            reg: student.reg, student: student.name, branch: branchName(student.branch), specialty: spec(student.specialty)?.name || student.specialty,
            start: student.start, end: student.end, required: student.required, paid: student.paid, remaining: remainingOf(student),
            financial: financialStatus(student), action: 1
          },
          cells: [
            `<td>${String(student.reg).padStart(4,'0')}</td>`, `<td><b>${escProd(student.name)}</b><small>${escProd(student.phone||'')}</small></td>`,
            `<td>${escProd(branchName(student.branch))}</td>`, `<td>${escProd(spec(student.specialty)?.name||student.specialty)}</td>`,
            `<td>${dateProd(student.start)}</td>`, `<td>${dateProd(student.end)}</td>`, `<td>${moneyProd(student.required)}</td>`,
            `<td>${moneyProd(student.paid)}</td>`, `<td>${moneyProd(remainingOf(student))}</td>`, `<td>${badge(financialStatus(student))}</td>`,
            `<td>${actionHtml(student)}</td>`
          ]
        }));
      }

      if (tab === 'ending') {
        headers = [
          ['السجل','reg','number'],['الطالب','student','text'],['الفرع','branch','text'],['التخصص','specialty','text'],
          ['النهاية','end','date'],['حالة الدورة','course','course'],['المتبقي من الدورة','remaining','number'],['الإجراء','action','number']
        ].map(([label,key,type])=>({label,key,type}));
        records = students.filter(student => base(student) && inRange(student.end,from,to)).map(student => ({
          studentId: student.id,
          sort: {
            reg: student.reg, student: student.name, branch: branchName(student.branch), specialty: spec(student.specialty)?.name || student.specialty,
            end: student.end, course: courseStatus(student), remaining: remainingOf(student), action: remainingOf(student) > 0 ? 1 : 0
          },
          cells: [
            `<td>${String(student.reg).padStart(4,'0')}</td>`, `<td><b>${escProd(student.name)}</b><small>${escProd(student.phone||'')}</small></td>`,
            `<td>${escProd(branchName(student.branch))}</td>`, `<td>${escProd(spec(student.specialty)?.name||student.specialty)}</td>`,
            `<td>${dateProd(student.end)}</td>`, `<td>${badge(courseStatus(student))}</td>`, `<td>${moneyProd(remainingOf(student))}</td>`,
            `<td>${actionHtml(student)}</td>`
          ]
        }));
      }

      const result = document.getElementById('periodResult');
      result.innerHTML = `<div class="period-result-head-prod"><b>${records.length} نتيجة</b><span>${from ? `${dateProd(from)} — ${dateProd(to)}` : `من أقدم البيانات — ${dateProd(to)}`}</span></div>`;
      const tableNode = periodTableProd(headers,records,sortByTab[tab], key => {
        const current = sortByTab[tab];
        sortByTab[tab] = current?.key === key
          ? { key, direction: current.direction === 'desc' ? 'asc' : 'desc' }
          : { key, direction: 'desc' };
        draw();
      });
      result.appendChild(tableNode);
      bindStudentRows();
    }

    document.querySelectorAll('#periodTabsProd button').forEach(button => button.addEventListener('click', () => {
      tab = button.dataset.tab;
      document.querySelectorAll('#periodTabsProd button').forEach(item => item.classList.toggle('active', item === button));
      draw();
    }));
    ['periodFrom','periodTo','periodBranch','periodSpec','periodState'].forEach(id => document.getElementById(id).addEventListener('change',draw));
    document.getElementById('periodSearch').addEventListener('input',draw);
    draw();
  };

  function renderSettingsProd() {
    shell(`${pageTitle('إدارة البرنامج','الإعدادات','إدارة النسخ الاحتياطية واستعادة بيانات المركز عند الحاجة.')}
      <div class="settings-grid-prod">
        <div class="card settings-card-prod">
          <h2>إنشاء نسخة بيانات</h2>
          <p>يحفظ نسخة كاملة من الطلاب والتخصصات والدفعات ووسائل الدفع في ملف JSON مستقل. احتفظ بالملف في مكان آمن أو على ذاكرة خارجية.</p>
          <button class="button" id="createBackupProd">إنشاء نسخة بيانات</button>
        </div>
        <div class="card settings-card-prod restore-prod">
          <h2>استعادة نسخة بيانات</h2>
          <p>اختر ملف نسخة EFC سابقًا. قبل الاستعادة ينشئ البرنامج نسخة أمان تلقائية من البيانات الحالية ثم يستبدلها بالنسخة المختارة.</p>
          <button class="button secondary" id="restoreBackupProd">استعادة نسخة بيانات</button>
        </div>
        <div class="settings-note-prod">النسخ الاحتياطي لا يغيّر بيانات البرنامج الحالية. الاستعادة فقط هي التي تستبدل البيانات، وبعد نجاحها يعاد تحميل الواجهة تلقائيًا.</div>
        <div class="settings-result-prod" id="settingsResultProd"></div>
      </div>`);

    const result = document.getElementById('settingsResultProd');
    const setResult = (text,ok=true) => { result.textContent=text; result.className=`settings-result-prod ${ok?'good':'bad'}`; };

    document.getElementById('createBackupProd').onclick = async event => {
      if (!invoke) return setResult('ميزة النسخ الاحتياطي متاحة داخل نسخة Windows المثبتة فقط.',false);
      const button = event.currentTarget;
      button.disabled = true;
      setResult('جاري تجهيز النسخة...',true);
      try {
        await window.EFC_FORCE_PERSIST?.();
        const path = await invoke('export_backup', { suggestedName: `EFC-Backup-${todayProd()}.json` });
        setResult(path ? `تم حفظ النسخة بنجاح: ${path}` : 'تم إلغاء إنشاء النسخة.',!!path);
      } catch (error) {
        setResult(String(error?.message || error),false);
      } finally {
        button.disabled = false;
      }
    };

    document.getElementById('restoreBackupProd').onclick = async event => {
      if (!invoke) return setResult('ميزة الاستعادة متاحة داخل نسخة Windows المثبتة فقط.',false);
      if (!confirm('سيتم استبدال البيانات الحالية بالنسخة المختارة بعد إنشاء نسخة أمان تلقائية. هل تريد المتابعة؟')) return;
      const button = event.currentTarget;
      button.disabled = true;
      setResult('اختر ملف النسخة...',true);
      try {
        await window.EFC_FORCE_PERSIST?.();
        const raw = await invoke('import_backup');
        if (!raw) {
          setResult('تم إلغاء الاستعادة.',false);
          return;
        }
        const state = JSON.parse(raw);
        if (!state || !Array.isArray(state.students) || !Array.isArray(state.specialties) || !Array.isArray(state.paymentMethods)) {
          throw new Error('ملف النسخة لا يحتوي بيانات EFC صالحة.');
        }
        await window.EFC_APPLY_RESTORED_STATE?.(state);
        setResult('تمت الاستعادة بنجاح. يعاد تحميل البرنامج الآن...',true);
        setTimeout(() => location.reload(),350);
      } catch (error) {
        setResult(String(error?.message || error),false);
      } finally {
        button.disabled = false;
      }
    };
  }

  function createInAppReceiptWindow() {
    let html = '';
    let closed = false;
    const modal = document.createElement('div');
    modal.className = 'modal receipt-viewer-prod';
    modal.innerHTML = `<div class="receipt-viewer-card-prod"><div class="receipt-viewer-head-prod"><b>عرض الروسي</b><button class="receipt-viewer-close-prod" title="إغلاق">×</button></div><iframe class="receipt-viewer-frame-prod" title="الروسي"></iframe></div>`;
    document.body.appendChild(modal);
    const frame = modal.querySelector('.receipt-viewer-frame-prod');
    const closeButton = modal.querySelector('.receipt-viewer-close-prod');

    const close = () => {
      if (closed) return;
      closed = true;
      modal.remove();
      document.removeEventListener('keydown', onKey);
    };
    const onKey = event => { if (event.key === 'Escape') close(); };
    document.addEventListener('keydown', onKey);
    closeButton.onclick = close;
    modal.addEventListener('click', event => { if (event.target === modal) close(); });

    return {
      get closed() { return closed; },
      close,
      focus() { frame?.focus(); },
      document: {
        write(chunk) { html += String(chunk ?? ''); },
        close() {
          const patched = html
            .replace(/<button class="download12"[^>]*>تحميل PDF<\/button>/g, '<button class="download12" onclick="print()">حفظ PDF</button>')
            .replaceAll('opener&&opener.downloadReceiptPdfV12(R12)', 'print()')
            .replaceAll('opener && opener.downloadReceiptPdfV12(R12)', 'print()');
          frame.srcdoc = patched;
        }
      }
    };
  }

  const nativeOpen = window.open.bind(window);
  window.open = function(url = '', target = '', features = '') {
    const blankReceipt = (url === '' || url === 'about:blank') && target === '_blank' && /width=|height=/.test(String(features));
    if (blankReceipt) return createInAppReceiptWindow();
    return nativeOpen(url, target, features);
  };

  if (typeof receiptActionsV4 === 'function') {
    receiptActionsV4 = function(r) {
      const key = 'offline-r-' + Date.now() + Math.random().toString(36).slice(2);
      setTimeout(() => {
        document.querySelector(`[data-open="${key}"]`)?.addEventListener('click',()=>receiptWindowV4(r));
        document.querySelector(`[data-print="${key}"]`)?.addEventListener('click',()=>receiptWindowV4(r,true));
      },0);
      return `<button class="button secondary" data-open="${key}">فتح الروسي</button><button class="button" data-print="${key}">طباعة / حفظ PDF</button>`;
    };
  }
  if (typeof receiptButtonsV4 === 'function') {
    receiptButtonsV4 = function(r) {
      const key = 'offline-rb-' + Date.now() + Math.random().toString(36).slice(2);
      setTimeout(() => document.querySelector(`[data-print="${key}"]`)?.addEventListener('click',()=>receiptWindowV4(r,true)),0);
      return `<button class="button" data-print="${key}">طباعة / حفظ PDF</button>`;
    };
  }
  window.downloadReceiptPdfV12 = r => receiptWindowV4(r,true);

  function renderCurrentProd() {
    currentPage = location.hash.replace('#','') || (specialties.length ? 'register' : 'specialties');
    if (currentPage === 'payments' || currentPage === 'status') {
      history.replaceState(null,'','#period');
      currentPage = 'period';
    }
    const pages = {
      register: renderRegister,
      specialties: renderSpecialties,
      period: renderPeriod,
      students: renderStudents,
      finance: renderFinance,
      ledger: renderLedger,
      settings: renderSettingsProd
    };
    (pages[currentPage] || renderRegister)();
  }

  window.addEventListener('hashchange', () => setTimeout(renderCurrentProd,0));
  try {
    renderCurrentProd();
  } catch (error) {
    console.error('EFC production render failed.', error);
  }
})();
