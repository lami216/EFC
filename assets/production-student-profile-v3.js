(() => {
  const READY_CLASS = 'month-actions-mm';
  const INSTALL_FLAG = '__EFC_STUDENT_PROFILE_V3__';

  function isMonthlyLayerReady() {
    if (window[INSTALL_FLAG]) return true;
    if (typeof openStudent !== 'function' || typeof renderStudents !== 'function') return false;
    if (typeof installmentPlanV3 !== 'function' || typeof courseStatus !== 'function') return false;
    return [...document.querySelectorAll('style')].some(node => String(node.textContent || '').includes(`.${READY_CLASS}`));
  }

  function install() {
    if (window[INSTALL_FLAG]) return;
    if (!isMonthlyLayerReady()) {
      setTimeout(install, 40);
      return;
    }
    window[INSTALL_FLAG] = true;

    const financeOpenStudentV3 = openStudent;
    const escProfileV3 = value => String(value ?? '').replace(/[&<>"']/g, ch => ({
      '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'
    }[ch]));
    const dateProfileV3 = value => typeof fmtDateV3 === 'function' ? fmtDateV3(value) : fmtDate(value);

    const style = document.createElement('style');
    style.textContent = `
      /* Keep the original student-file rhythm. Only reuse the old empty action space. */
      .student-file-finance-v3 .month-actions-mm{min-width:0!important;width:168px!important;gap:6px!important}
      .student-file-finance-v3 .month-actions-mm .month-action-mm,
      .student-file-finance-v3 .month-actions-mm .month-placeholder-mm{width:81px!important;min-width:81px!important;height:30px!important}
      .student-file-finance-v3 .monthly-table-mm td:last-child,
      .student-file-finance-v3 .monthly-table-mm th:last-child{min-width:184px!important;width:184px!important}

      .student-file-tabs-v3{display:flex;align-items:center;gap:7px;margin:0 0 18px;padding-bottom:14px;border-bottom:1px solid var(--border)}
      .student-file-tabs-v3 button{border:1px solid var(--border);background:#fff;color:var(--muted);border-radius:8px;padding:8px 14px;font:inherit;font-size:9px;cursor:pointer}
      .student-file-tabs-v3 button.active{background:var(--primary);border-color:var(--primary);color:#fff;font-weight:800}
      .student-file-tabs-v3 button:hover:not(.active){background:var(--soft);color:var(--primary)}

      .student-profile-v3{display:grid;gap:22px}
      .student-profile-section-v3{border:1px solid var(--border);border-radius:12px;background:#fff;padding:17px}
      .student-profile-section-v3 h3{margin:0 0 14px;font-size:13px}
      .student-profile-grid-v3{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:10px}
      .student-profile-field-v3{background:var(--surface2);border:1px solid var(--border);border-radius:9px;padding:12px;min-height:62px}
      .student-profile-field-v3 small{display:block;color:var(--muted);font-size:8px;margin-bottom:6px}
      .student-profile-field-v3 b{font-size:11px;line-height:1.6;white-space:normal;word-break:break-word}
      .student-profile-actions-v3{display:flex;justify-content:flex-end;gap:8px;margin-top:18px}
      .student-info-row-v3 td{vertical-align:middle}
      .student-info-row-v3 .student-name-v3{font-weight:800}
      .student-info-row-v3 .student-phone-v3{direction:ltr;text-align:right}
      @media(max-width:1250px){.student-profile-grid-v3{grid-template-columns:repeat(2,minmax(0,1fr))}}
    `;
    document.head.appendChild(style);

    function studentTabsV3(studentId, active) {
      return `<div class="student-file-tabs-v3" role="tablist" aria-label="ملف الطالب">
        <button type="button" class="${active === 'profile' ? 'active' : ''}" data-student-tab-v3="profile">بيانات الطالب</button>
        <button type="button" class="${active === 'finance' ? 'active' : ''}" data-student-tab-v3="finance">الدورة والدفع</button>
      </div>`;
    }

    function bindTabsV3(modal, studentId, active) {
      modal.querySelectorAll('[data-student-tab-v3]').forEach(button => {
        button.onclick = event => {
          event.stopPropagation();
          const target = button.dataset.studentTabV3;
          if (target === active) return;
          modal.remove();
          openStudent(studentId, target);
        };
      });
    }

    function addPaidMonthPlaceholderV3(modal) {
      modal.querySelectorAll('.month-actions-mm').forEach(group => {
        const hasReceipt = Boolean(group.querySelector('.month-receipt-mm'));
        const hasPay = Boolean(group.querySelector('.month-pay-mm'));
        if (hasReceipt && !hasPay && !group.querySelector('.month-paid-placeholder-v3')) {
          const placeholder = document.createElement('span');
          placeholder.className = 'month-placeholder-mm month-paid-placeholder-v3';
          placeholder.textContent = '—';
          group.appendChild(placeholder);
        }
      });
    }

    function enhanceFinanceModalV3(studentId) {
      const modals = [...document.querySelectorAll('.modal')];
      const modal = modals.at(-1);
      if (!modal) return;
      const card = modal.querySelector('.modal-card.wide-modal');
      const head = modal.querySelector('.modal-head');
      if (!card || !head) return;
      card.classList.add('student-file-finance-v3');
      if (!modal.querySelector('.student-file-tabs-v3')) {
        head.insertAdjacentHTML('afterend', studentTabsV3(studentId, 'finance'));
      }
      bindTabsV3(modal, studentId, 'finance');
      addPaidMonthPlaceholderV3(modal);
    }

    function openProfileV3(studentId) {
      const student = students.find(item => item.id === studentId);
      if (!student) return;
      const snapshot = student.snapshot || {};
      const duration = snapshot.durationValue
        ? `${snapshot.durationValue} ${typeof unitLabel === 'function' ? unitLabel(snapshot.durationUnit) : snapshot.durationUnit || ''}`
        : '—';
      const specialtyName = spec(student.specialty)?.name || student.specialty || '—';
      const phone = String(student.phone || '').trim() || 'غير مسجل';
      const record = String(student.reg ?? '').padStart(4, '0');

      const modal = document.createElement('div');
      modal.className = 'modal';
      modal.innerHTML = `<div class="modal-card wide-modal student-file-profile-v3">
        <div class="modal-head">
          <div><p>ملف الطالب</p><h2>${escProfileV3(student.name)}</h2><span>${escProfileV3(branchName(student.branch))} · ${escProfileV3(specialtyName)} · سجل ${record}</span></div>
          <button class="x">×</button>
        </div>
        ${studentTabsV3(studentId, 'profile')}
        <div class="student-profile-v3">
          <section class="student-profile-section-v3">
            <h3>المعلومات الأساسية</h3>
            <div class="student-profile-grid-v3">
              <div class="student-profile-field-v3"><small>اسم الطالب</small><b>${escProfileV3(student.name)}</b></div>
              <div class="student-profile-field-v3"><small>رقم الهاتف</small><b dir="ltr">${escProfileV3(phone)}</b></div>
              <div class="student-profile-field-v3"><small>رقم السجل</small><b>${record}</b></div>
              <div class="student-profile-field-v3"><small>الفرع</small><b>${escProfileV3(branchName(student.branch))}</b></div>
              <div class="student-profile-field-v3"><small>التخصص</small><b>${escProfileV3(specialtyName)}</b></div>
              <div class="student-profile-field-v3"><small>مدة الدورة</small><b>${escProfileV3(duration)}</b></div>
              <div class="student-profile-field-v3"><small>بداية الدورة</small><b>${dateProfileV3(student.start)}</b></div>
              <div class="student-profile-field-v3"><small>نهاية الدورة</small><b>${dateProfileV3(student.end)}</b></div>
            </div>
          </section>
          <section class="student-profile-section-v3">
            <h3>حالة التسجيل</h3>
            <div class="student-profile-grid-v3">
              <div class="student-profile-field-v3"><small>حالة الدورة</small>${badge(courseStatus(student))}</div>
              <div class="student-profile-field-v3"><small>نوع التسجيل</small><b>${snapshot.billing === 'monthly' ? 'دورة بدفع شهري' : 'دورة بدفعة واحدة'}</b></div>
              <div class="student-profile-field-v3"><small>تاريخ البداية المعتمد</small><b>${dateProfileV3(student.start)}</b></div>
              <div class="student-profile-field-v3"><small>تاريخ النهاية المعتمد</small><b>${dateProfileV3(student.end)}</b></div>
            </div>
          </section>
        </div>
        <div class="student-profile-actions-v3">
          <button class="button secondary close-profile-v3">إغلاق</button>
          <button class="button open-finance-v3">الدورة والدفع</button>
        </div>
      </div>`;
      document.body.appendChild(modal);
      const close = () => modal.remove();
      modal.querySelector('.x').onclick = close;
      modal.querySelector('.close-profile-v3').onclick = close;
      modal.querySelector('.open-finance-v3').onclick = event => {
        event.stopPropagation();
        close();
        openStudent(studentId, 'finance');
      };
      bindTabsV3(modal, studentId, 'profile');
      if (typeof convertDigitsInNodeV3 === 'function') convertDigitsInNodeV3(modal);
    }

    openStudent = function(studentId, mode = 'finance') {
      if (mode === 'profile') {
        openProfileV3(studentId);
        return;
      }
      financeOpenStudentV3(studentId);
      enhanceFinanceModalV3(studentId);
    };

    renderStudents = function() {
      shell(`${pageTitle('الملفات','البحث عن طالب','ابحث عن الطالب واعرض معلوماته الأساسية والدورة دون إقحام التفاصيل المالية في قائمة البحث.')}
        <div class="card filters">
          <input class="input" id="studentSearch" placeholder="الاسم، الهاتف أو رقم السجل">
          <select id="studentBranch">${opts(branches,x=>x.id,x=>x.name,'كل الفروع')}</select>
          <select id="studentSpec">${opts(specialties,x=>x.id,x=>x.name,'كل التخصصات')}</select>
        </div>
        <div id="studentsTable"></div>`);

      const draw = () => {
        const query = document.getElementById('studentSearch').value.trim();
        const branch = document.getElementById('studentBranch').value;
        const specialty = document.getElementById('studentSpec').value;
        const list = students.filter(student =>
          (!query || String(student.name || '').includes(query) || String(student.phone || '').includes(query) || String(student.reg) === query) &&
          (!branch || student.branch === branch) &&
          (!specialty || student.specialty === specialty)
        );
        const rows = list.map(student => `<tr class="student-row student-info-row-v3" data-id="${escProfileV3(student.id)}">
          <td>${String(student.reg ?? '').padStart(4,'0')}</td>
          <td><span class="student-name-v3">${escProfileV3(student.name)}</span></td>
          <td class="student-phone-v3">${escProfileV3(String(student.phone || '').trim() || '—')}</td>
          <td>${escProfileV3(branchName(student.branch))}</td>
          <td>${escProfileV3(spec(student.specialty)?.name || student.specialty || '—')}</td>
          <td>${dateProfileV3(student.start)}</td>
          <td>${dateProfileV3(student.end)}</td>
          <td>${badge(courseStatus(student))}</td>
        </tr>`).join('');
        document.getElementById('studentsTable').innerHTML = table(
          ['السجل','الطالب','الهاتف','الفرع','التخصص','البداية','النهاية','حالة الدورة'],
          rows
        );
        document.querySelectorAll('#studentsTable .student-row').forEach(row => {
          row.onclick = () => openStudent(row.dataset.id, 'profile');
        });
        if (typeof convertDigitsInNodeV3 === 'function') convertDigitsInNodeV3(document.getElementById('studentsTable'));
      };

      ['studentSearch','studentBranch','studentSpec'].forEach(id => {
        const element = document.getElementById(id);
        element.addEventListener(id === 'studentSearch' ? 'input' : 'change', draw);
      });
      draw();
    };

    window.EFC_STUDENT_FILE_V3 = Object.freeze({
      profileFirstFromStudentSearch: true,
      financeFirstFromUnifiedSearch: true,
      fullPaidMonthHasPaymentPlaceholder: true,
      compactMonthActionsUseExistingSpace: true
    });

    if (typeof currentPage !== 'undefined' && currentPage === 'students') {
      try { renderStudents(); } catch (error) { console.error('EFC student profile refresh failed.', error); }
    }
  }

  install();
})();
