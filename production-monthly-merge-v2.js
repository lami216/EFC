(() => {
  const style = document.createElement('style');
  style.textContent = `
    .month-actions-mm{display:flex;align-items:center;justify-content:flex-start;gap:7px;min-width:205px}
    .month-actions-mm .month-action-mm,.month-actions-mm .month-placeholder-mm{width:96px;height:30px;box-sizing:border-box;display:inline-flex;align-items:center;justify-content:center;border-radius:7px;font-size:9px;white-space:nowrap}
    .month-actions-mm .month-action-mm{border:1px solid var(--border);background:#fff;color:var(--primary);cursor:pointer;font-family:inherit}
    .month-actions-mm .month-pay-mm{background:var(--primary);border-color:var(--primary);color:#fff;font-weight:800}
    .month-actions-mm .month-placeholder-mm{color:#9aa7a3}
    .monthly-table-mm td:last-child,.monthly-table-mm th:last-child{min-width:215px}
    .period-tabs-mm{display:flex;align-items:center;gap:6px;flex-wrap:wrap}
    .period-tabs-mm button{border:1px solid var(--border);background:#fff;color:var(--muted);border-radius:8px;padding:9px 13px;font:inherit;font-size:9px;cursor:pointer}
    .period-tabs-mm button.active{background:var(--primary);border-color:var(--primary);color:#fff;font-weight:800}
    .sortable-mm{cursor:pointer;user-select:none;white-space:nowrap}
    .sortable-mm:hover{background:var(--surface-2)}
    .sort-mm{display:inline-block;margin-inline-start:5px;color:var(--primary);font-weight:900}
    .merge-info-mm{margin-top:6px;color:var(--muted);font-size:9px;line-height:1.8}
  `;
  document.head.appendChild(style);

  const escMM = value => String(value ?? '').replace(/[&<>"']/g, ch => ({
    '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'
  }[ch]));
  const todayMM = () => typeof deviceTodayV3 === 'function' ? deviceTodayV3() : DEMO_TODAY;
  const moneyMM = value => typeof moneyV3 === 'function' ? moneyV3(value) : money(value);
  const dateMM = value => typeof fmtDateV3 === 'function' ? fmtDateV3(value) : fmtDate(value);
  const collatorMM = new Intl.Collator('ar', { numeric: true, sensitivity: 'base' });

  function ensureCodesMM(student) {
    window.EFC_CODES?.ensureStudentRecord?.(student);
    (student.payments || []).forEach((payment, index) => window.EFC_CODES?.ensurePaymentCode?.(student, payment, index));
  }

  function rawAllocationsMM(student, asOf = null, paidOverride = null) {
    const snap = student.snapshot || {};
    if (snap.billing !== 'monthly') return { monthPaid: [], allocations: [] };
    const fee = Math.max(0, Number(snap.fee || 0));
    const count = Math.max(0, Number(snap.durationValue || 0));
    const monthPaid = Array(count).fill(0);
    const allocations = [];

    const place = (paymentIndex, monthIndex, amount) => {
      if (monthIndex < 0 || monthIndex >= count || amount <= 0) return 0;
      const room = Math.max(0, fee - monthPaid[monthIndex]);
      const used = Math.min(room, amount);
      if (used > 0) {
        monthPaid[monthIndex] += used;
        allocations.push({ paymentIndex, monthNumber: monthIndex + 1, amount: used });
      }
      return used;
    };

    if (paidOverride !== null && paidOverride !== undefined) {
      let left = Math.max(0, Number(paidOverride || 0));
      for (let monthIndex = 0; monthIndex < count && left > 0; monthIndex += 1) {
        left -= place(-1, monthIndex, left);
      }
      return { monthPaid, allocations };
    }

    ensureCodesMM(student);
    (student.payments || []).forEach((payment, paymentIndex) => {
      if (asOf && String(payment[0] || '') > asOf) return;
      let left = Math.max(0, Number(payment[1] || 0));
      const target = Number(payment[7] || 0);

      if (Number.isInteger(target) && target >= 1 && target <= count) {
        const used = place(paymentIndex, target - 1, left);
        left -= used;
      }

      if (!(Number.isInteger(target) && target >= 1 && target <= count) || left > 0) {
        for (let monthIndex = 0; monthIndex < count && left > 0; monthIndex += 1) {
          left -= place(paymentIndex, monthIndex, left);
        }
      }
    });

    return { monthPaid, allocations };
  }

  installmentPlanV3 = function(student, asOf = todayMM(), paidOverride = null) {
    const snap = student.snapshot || {};
    if (snap.billing !== 'monthly') return [];
    const fee = Math.max(0, Number(snap.fee || 0));
    const count = Math.max(0, Number(snap.durationValue || 0));
    const { monthPaid } = rawAllocationsMM(student, asOf, paidOverride);
    return Array.from({ length: count }, (_, index) => {
      const number = index + 1;
      const dueDate = addDuration(student.start, index, 'month');
      const paid = Math.min(fee, Number(monthPaid[index] || 0));
      const remaining = Math.max(0, fee - paid);
      const until = daysDiffV3(asOf, dueDate);
      let state = 'upcoming';
      if (remaining === 0) state = 'paid';
      else if (paid > 0) state = 'partial';
      else if (dueDate < asOf) state = 'overdue';
      else if (until >= 0 && until <= V3_DUE_SOON_DAYS) state = 'due';
      return { number, dueDate, fee, paid, remaining, state };
    });
  };

  monthlyFocusV3 = function(student, asOf = todayMM(), paidOverride = null) {
    const plan = installmentPlanV3(student, asOf, paidOverride);
    if (!plan.length) return null;
    const firstOpen = plan.find(month => month.remaining > 0);
    if (!firstOpen) {
      const last = plan[plan.length - 1];
      return {
        state: 'complete',
        number: last.number,
        label: `الشهر ${last.number} مدفوع كامل`,
        dueAmount: 0,
        dueDate: last.dueDate,
        plan
      };
    }
    if (firstOpen.state === 'partial') return {
      state: 'partial', number: firstOpen.number, label: `الشهر ${firstOpen.number} دفع جزئي`,
      dueAmount: firstOpen.remaining, dueDate: firstOpen.dueDate, plan
    };
    if (firstOpen.state === 'overdue') return {
      state: 'overdue', number: firstOpen.number, label: `الشهر ${firstOpen.number} متأخر`,
      dueAmount: firstOpen.remaining, dueDate: firstOpen.dueDate, plan
    };
    if (firstOpen.state === 'due') return {
      state: 'due', number: firstOpen.number, label: `الشهر ${firstOpen.number} مستحق الآن`,
      dueAmount: firstOpen.remaining, dueDate: firstOpen.dueDate, plan
    };
    const previous = plan[firstOpen.number - 2];
    if (previous?.state === 'paid') return {
      state: 'paid', number: previous.number, label: `الشهر ${previous.number} مدفوع كامل`,
      dueAmount: 0, dueDate: firstOpen.dueDate, nextNumber: firstOpen.number, plan
    };
    return {
      state: 'upcoming', number: firstOpen.number, label: `الشهر ${firstOpen.number} لم يحن`,
      dueAmount: 0, dueDate: firstOpen.dueDate, plan
    };
  };

  currentMonthStatus = student => monthlyFocusV3(student)?.label || '—';

  financialStatus = function(student) {
    if ((student.snapshot || {}).billing === 'monthly') {
      const focus = monthlyFocusV3(student);
      if (!focus) return 'لم يدفع';
      if (focus.state === 'complete' || focus.state === 'paid') return 'مدفوع كامل';
      if (focus.state === 'partial') return 'دفع جزئي';
      if (focus.state === 'due') return 'مستحق الآن';
      if (focus.state === 'overdue') return 'متأخر';
      return 'لم يدفع';
    }
    const rem = remainingOf(student);
    if (rem === 0) return 'مدفوع كامل';
    if (Number(student.paid || 0) === 0) return 'لم يدفع';
    if (student.end < todayMM()) return 'متأخر';
    return 'دفع جزئي';
  };

  monthBadgeV3 = function(student, asOf = todayMM(), paidOverride = null) {
    const focus = monthlyFocusV3(student, asOf, paidOverride);
    if (!focus) return '';
    const cls = focus.state === 'paid' || focus.state === 'complete'
      ? 'good'
      : focus.state === 'overdue'
        ? 'bad'
        : focus.state === 'upcoming'
          ? 'neutral'
          : 'warn';
    return `<span class="badge ${cls} month-badge">${westernDigitsV3(focus.label)}</span>`;
  };

  financialCellV3 = student => (student.snapshot || {}).billing === 'monthly'
    ? monthBadgeV3(student)
    : badge(financialStatus(student));

  dueNowV3 = function(student) {
    if ((student.snapshot || {}).billing !== 'monthly') return remainingOf(student);
    const focus = monthlyFocusV3(student);
    return ['partial','due','overdue'].includes(focus?.state) ? Number(focus.dueAmount || 0) : 0;
  };

  suggestedPaymentV3 = function(student) {
    if ((student.snapshot || {}).billing !== 'monthly') return remainingOf(student);
    const firstOpen = installmentPlanV3(student).find(month => month.remaining > 0);
    return Number(firstOpen?.remaining || 0);
  };

  allocV4 = function(student, paymentIndex) {
    const payment = (student.payments || [])[paymentIndex];
    if (!payment) return { desc: '', before: 0, after: 0, months: [] };
    let before = 0;
    for (let index = 0; index < paymentIndex; index += 1) before += Number(student.payments[index]?.[1] || 0);
    const amount = Number(payment[1] || 0);
    const after = before + amount;
    const name = spec(student.specialty)?.name || 'الدورة';
    if ((student.snapshot || {}).billing !== 'monthly') {
      return {
        desc: after >= student.required ? `مدفوع كامل لدورة ${name}` : `مدفوع جزئي لدورة ${name}`,
        before,
        after,
        months: []
      };
    }
    const { allocations } = rawAllocationsMM(student);
    const months = allocations
      .filter(item => item.paymentIndex === paymentIndex)
      .map(item => ({ n: item.monthNumber, amount: item.amount }));
    const numbers = [...new Set(months.map(item => item.n))];
    const desc = numbers.length
      ? `دفعة للشهر ${numbers.join('، ')} لدورة ${name}`
      : `دفعة لدورة ${name}`;
    return { desc, before, after, months };
  };

  function monthStateTextMM(month) {
    return month.state === 'paid' ? 'مدفوع كامل'
      : month.state === 'partial' ? 'دفع جزئي'
        : month.state === 'overdue' ? 'متأخر'
          : month.state === 'due' ? 'مستحق الآن'
            : 'لم يحن';
  }

  function monthStateBadgeMM(month) {
    const cls = month.state === 'paid' ? 'good'
      : month.state === 'overdue' ? 'bad'
        : month.state === 'upcoming' ? 'neutral'
          : 'warn';
    return `<span class="badge ${cls}">${monthStateTextMM(month)}</span>`;
  }

  function monthReceiptModelMM(student, monthNumber) {
    const plan = installmentPlanV3(student);
    const month = plan[monthNumber - 1];
    if (!month || month.paid <= 0) return null;
    const { allocations } = rawAllocationsMM(student);
    const related = allocations.filter(item => item.monthNumber === monthNumber && item.paymentIndex >= 0);
    const paymentIndexes = [...new Set(related.map(item => item.paymentIndex))];
    const payments = paymentIndexes.map(index => student.payments[index]).filter(Boolean);
    const latest = payments.slice().sort((a,b) =>
      String(b[0] || '').localeCompare(String(a[0] || '')) ||
      Number(b[4] || 0) - Number(a[4] || 0)
    )[0];
    const methodsUsed = [...new Set(payments.map(payment => String(payment[2] || '')).filter(Boolean))];
    return {
      student: student.name,
      phone: student.phone || '',
      branch: branchName(student.branch),
      specialty: spec(student.specialty)?.name || student.specialty,
      reg: String(student.reg).padStart(4,'0'),
      date: latest?.[0] || month.dueDate,
      receipt: `M-${String(student.reg).padStart(4,'0')}-${monthNumber}`,
      amount: month.paid,
      remaining: month.remaining,
      method: methodsUsed.length ? methodsUsed.join(' + ') : '—',
      month: `الشهر ${monthNumber}`,
      desc: `إجمالي مدفوع الشهر ${monthNumber}: ${moneyMM(month.paid)} · المتبقي من الشهر: ${moneyMM(month.remaining)}`
    };
  }

  openPayment = function(id, targetMonth = null) {
    const student = students.find(item => item.id === id);
    if (!student || remainingOf(student) <= 0) return;
    ensureCodesMM(student);

    const monthly = (student.snapshot || {}).billing === 'monthly';
    const courseRemaining = remainingOf(student);
    let month = null;
    let monthNumber = null;
    let maxAmount = courseRemaining;

    if (monthly) {
      const plan = installmentPlanV3(student);
      monthNumber = Number(targetMonth || 0);
      if (!Number.isInteger(monthNumber) || monthNumber < 1 || monthNumber > plan.length) {
        monthNumber = plan.find(item => item.remaining > 0)?.number || null;
      }
      month = monthNumber ? plan[monthNumber - 1] : null;
      if (!month || month.remaining <= 0) return;
      maxAmount = month.remaining;
    }

    const suggested = Math.max(1, maxAmount);
    const modal = document.createElement('div');
    modal.className = 'modal';
    modal.innerHTML = `<div class="modal-card narrow">
      <div class="modal-head"><div>
        <p>${monthly ? `تسجيل دفعة للشهر ${monthNumber}` : 'تسجيل دفعة'}</p>
        <h2>${escMM(student.name)}</h2>
        <span>${escMM(spec(student.specialty)?.name)} · ${escMM(branchName(student.branch))}</span>
      </div><button class="x">×</button></div>
      <div class="payment-balance">
        ${monthly
          ? `<div><small>قيمة الشهر ${monthNumber}</small><b>${moneyMM(month.fee)}</b></div>
             <div><small>المدفوع لهذا الشهر</small><b>${moneyMM(month.paid)}</b></div>
             <div><small>المتبقي لهذا الشهر</small><b>${moneyMM(month.remaining)}</b></div>`
          : `<div><small>إجمالي الدورة</small><b>${moneyMM(student.required)}</b></div>
             <div><small>المدفوع</small><b>${moneyMM(student.paid)}</b></div>
             <div><small>المتبقي</small><b>${moneyMM(courseRemaining)}</b></div>`}
      </div>
      ${monthly ? `<div class="month-payment-focus"><span>حالة الشهر ${monthNumber}</span>${monthStateBadgeMM(month)}<small>المتبقي من الدورة كاملة: ${moneyMM(courseRemaining)}</small></div>` : ''}
      <form id="paymentMM" class="grid two">
        <label>المبلغ<input class="input" name="amount" type="number" min="1" max="${maxAmount}" value="${suggested}" required></label>
        <label>وسيلة الدفع<select name="method">${methods.map(value => `<option>${escMM(value)}</option>`).join('')}</select></label>
        <label class="wide">تاريخ العملية<input class="input" name="date" type="date" value="${todayMM()}" required></label>
        <label class="wide">البيان<input class="input" name="description" value="${escMM(monthly ? `دفعة الشهر ${monthNumber} لدورة ${spec(student.specialty)?.name || ''}` : `دفعة لدورة ${spec(student.specialty)?.name || ''}`)}"></label>
        <div class="wide modal-actions"><button type="button" class="button secondary cancel">إلغاء</button><button class="button" type="submit">حفظ الدفعة</button></div>
      </form>
    </div>`;
    document.body.appendChild(modal);
    const close = () => modal.remove();
    modal.querySelector('.x').onclick = close;
    modal.querySelector('.cancel').onclick = close;

    modal.querySelector('#paymentMM').onsubmit = event => {
      event.preventDefault();
      const form = new FormData(event.target);
      const amount = Number(form.get('amount'));
      if (amount <= 0 || amount > maxAmount) return alert('المبلغ غير صالح.');
      const index = student.payments.length;
      const transactionCode = window.EFC_CODES?.newTransactionCode?.(student) || `tx-${Date.now()}-${Math.random()}`;
      student.payments.push([
        String(form.get('date')),
        amount,
        String(form.get('method')),
        deviceTimeV3(),
        Date.now(),
        String(form.get('description') || '').trim(),
        transactionCode,
        monthly ? monthNumber : null
      ]);
      student.paid = Number(student.paid || 0) + amount;
      saveStudents();
      close();
      try { renderCurrentMerged(); } catch { try { renderCurrent(); } catch {} }
      setTimeout(() => successReceiptV4(student, index, 'pay'), 30);
    };
    convertDigitsInNodeV3(modal);
  };

  openStudent = function(id) {
    const student = students.find(item => item.id === id);
    if (!student) return;
    ensureCodesMM(student);
    const monthly = (student.snapshot || {}).billing === 'monthly';
    const plan = monthly ? installmentPlanV3(student) : [];

    const monthsRows = monthly ? plan.map(month => {
      const receipt = month.paid > 0
        ? `<button class="month-action-mm month-receipt-mm" data-month="${month.number}">فتح الروسي</button>`
        : `<span class="month-placeholder-mm">—</span>`;
      const pay = month.remaining > 0
        ? `<button class="month-action-mm month-pay-mm" data-month="${month.number}">تسجيل الدفع</button>`
        : '';
      return `<tr>
        <td>الشهر ${month.number}</td>
        <td>${dateMM(month.dueDate)}</td>
        <td>${moneyMM(month.fee)}</td>
        <td>${moneyMM(month.paid)}</td>
        <td>${moneyMM(month.remaining)}</td>
        <td>${monthStateBadgeMM(month)}</td>
        <td><div class="month-actions-mm">${receipt}${pay}</div></td>
      </tr>`;
    }).join('') : '';

    const paymentsRows = (student.payments || []).map((payment,index) => ({ payment,index })).reverse().map(({payment,index}) =>
      `<tr>
        <td>${dateMM(payment[0])}</td>
        <td>${escMM(payment[2])}</td>
        <td>${moneyMM(payment[1])}</td>
        <td>${escMM(typeof payDescV4 === 'function' ? payDescV4(student,index) : payment[5] || '')}</td>
        <td><button class="mini payment-receipt-mm" data-i="${index}">فتح الروسي</button></td>
      </tr>`
    ).join('');

    const modal = document.createElement('div');
    modal.className = 'modal';
    modal.innerHTML = `<div class="modal-card wide-modal">
      <div class="modal-head"><div>
        <p>ملف الطالب</p><h2>${escMM(student.name)}</h2>
        <span>${escMM(branchName(student.branch))} · ${escMM(spec(student.specialty)?.name)} · سجل ${String(student.reg).padStart(4,'0')}</span>
      </div><button class="x">×</button></div>
      <div class="student-kpis">
        <div><small>البداية</small><b>${dateMM(student.start)}</b></div>
        <div><small>النهاية</small><b>${dateMM(student.end)}</b></div>
        <div><small>حالة الدورة</small>${badge(courseStatus(student))}</div>
        <div><small>${monthly ? 'وضع الشهر' : 'الوضع المالي'}</small>${monthly ? monthBadgeV3(student) : badge(financialStatus(student))}</div>
        <div><small>المدفوع</small><b>${moneyMM(student.paid)}</b></div>
        <div><small>المتبقي من الدورة</small><b>${moneyMM(remainingOf(student))}</b></div>
      </div>
      ${monthly ? `<div class="sub-title-row-v4"><h3>أشهر الدورة</h3><button class="mini all-months-receipt-mm">روسي شامل للأشهر</button></div>
        <div class="monthly-table-mm">${table(['الشهر','موعده','المبلغ','المدفوع','المتبقي','الحالة','الخيارات'], monthsRows)}</div>` : ''}
      <div class="sub-title-row-v4"><h3>سجل الدفعات</h3><button class="mini registration-receipt-mm">روسي التسجيل</button></div>
      ${table(['التاريخ','الوسيلة','المبلغ','البيان',''], paymentsRows)}
      <div class="modal-actions">
        <button class="button secondary close">إغلاق</button>
        ${!monthly && remainingOf(student) > 0 ? '<button class="button one-time-pay-mm">تسجيل دفعة جديدة</button>' : ''}
      </div>
    </div>`;
    document.body.appendChild(modal);

    const close = () => modal.remove();
    modal.querySelector('.x').onclick = close;
    modal.querySelector('.close').onclick = close;
    modal.querySelector('.one-time-pay-mm')?.addEventListener('click', event => {
      event.stopPropagation();
      close();
      openPayment(id);
    });
    modal.querySelector('.registration-receipt-mm').onclick = event => {
      event.stopPropagation();
      receiptWindowV4(receiptModelV4(student));
    };
    modal.querySelector('.all-months-receipt-mm')?.addEventListener('click', event => {
      event.stopPropagation();
      receiptWindowV4(receiptModelV4(student, null, true));
    });
    modal.querySelectorAll('.payment-receipt-mm').forEach(button => button.onclick = event => {
      event.stopPropagation();
      receiptWindowV4(receiptModelV4(student, Number(button.dataset.i)));
    });
    modal.querySelectorAll('.month-receipt-mm').forEach(button => button.onclick = event => {
      event.stopPropagation();
      const receipt = monthReceiptModelMM(student, Number(button.dataset.month));
      if (receipt) receiptWindowV4(receipt);
    });
    modal.querySelectorAll('.month-pay-mm').forEach(button => button.onclick = event => {
      event.stopPropagation();
      const monthNumber = Number(button.dataset.month);
      close();
      openPayment(id, monthNumber);
    });
    convertDigitsInNodeV3(modal);
  };

  const financialRankMM = new Map([
    ['مدفوع كامل',1],['لم يدفع',2],['دفع جزئي',3],['مستحق الآن',4],['متأخر',5]
  ]);
  const courseRankMM = new Map([['نشطة',1],['ستنتهي قريباً',2],['انتهت',3]]);

  function compareMM(a,b,header,direction) {
    const av = a.sort?.[header.key] ?? '';
    const bv = b.sort?.[header.key] ?? '';
    let result = 0;
    if (header.type === 'number') result = Number(av || 0) - Number(bv || 0);
    else if (header.type === 'date') result = String(av || '').localeCompare(String(bv || ''));
    else if (header.type === 'financial') result = (financialRankMM.get(String(av)) || 0) - (financialRankMM.get(String(bv)) || 0);
    else if (header.type === 'course') result = (courseRankMM.get(String(av)) || 0) - (courseRankMM.get(String(bv)) || 0);
    else result = collatorMM.compare(String(av || ''),String(bv || ''));
    return direction === 'desc' ? -result : result;
  }

  function tableNodeMM(headers,records,sortState,onSort) {
    const sorted = [...records];
    const activeHeader = headers.find(header => header.key === sortState?.key);
    if (activeHeader) sorted.sort((a,b) => compareMM(a,b,activeHeader,sortState.direction));
    const head = headers.map(header => {
      const active = sortState?.key === header.key;
      const arrow = active ? `<span class="sort-mm">${sortState.direction === 'desc' ? '↑' : '↓'}</span>` : '';
      return `<th class="sortable-mm" data-sort="${header.key}">${escMM(header.label)}${arrow}</th>`;
    }).join('');
    const body = sorted.length
      ? sorted.map(record => `<tr class="student-row" data-id="${escMM(record.studentId)}">${record.cells.join('')}</tr>`).join('')
      : `<tr><td colspan="${headers.length}"><div class="empty">لا توجد نتائج</div></td></tr>`;
    const wrapper = document.createElement('div');
    wrapper.innerHTML = `<div class="table-wrap"><table><thead><tr>${head}</tr></thead><tbody>${body}</tbody></table></div>`;
    wrapper.querySelectorAll('[data-sort]').forEach(cell => cell.addEventListener('click', () => onSort(cell.dataset.sort)));
    return wrapper.firstElementChild;
  }

  function monthlyDueMM(student) {
    if ((student.snapshot || {}).billing !== 'monthly') return remainingOf(student) > 0;
    const focus = monthlyFocusV3(student);
    return ['partial','due','overdue'].includes(focus?.state);
  }

  function statusCellMM(student) {
    return (student.snapshot || {}).billing === 'monthly'
      ? monthBadgeV3(student)
      : badge(financialStatus(student));
  }

  renderPeriod = function() {
    const today = todayMM();
    shell(`${pageTitle('بحث موحد','آلية البحث','ابحث بالطالب والفترة والفرع والتخصص والوضعية، ثم تنقّل بين المسجلين والمستحقات ونهايات الدورات.') }
      <div class="card period-search-card-prod">
        <input class="input" id="periodSearch" placeholder="ابحث بالاسم أو الهاتف أو رقم السجل">
        <select id="periodBranch">${opts(branches,x=>x.id,x=>x.name,'كل الفروع')}</select>
        <select id="periodSpec">${opts(specialties,x=>x.id,x=>x.name,'كل التخصصات')}</select>
        <select id="periodState">
          <option value="">كل الحالات المالية</option>
          <option value="outstanding">المستحق فعليًا الآن</option>
          <option value="متأخر">متأخر</option>
          <option value="مستحق الآن">مستحق الآن</option>
          <option value="دفع جزئي">دفع جزئي</option>
          <option value="لم يدفع">لم يدفع</option>
          <option value="مدفوع كامل">الشهر/الدورة مدفوع</option>
        </select>
        <div class="period-toolbar-prod">
          <div class="period-tabs-mm" id="periodTabsMM">
            <button class="active" data-tab="registrations">المسجلون</button>
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
    const sortByTab = { registrations: null, dues: null, ending: null };
    const identity = (student,q) => !q ||
      String(student.name || '').toLowerCase().includes(q) ||
      String(student.phone || '').includes(q) ||
      String(student.reg).padStart(4,'0').includes(q) ||
      String(student.reg) === q;
    const inRange = (date,from,to) => (!from || date >= from) && (!to || date <= to);

    function category(student) {
      return financialStatus(student);
    }

    function draw() {
      const q = document.getElementById('periodSearch').value.trim().toLowerCase();
      const from = document.getElementById('periodFrom').value;
      const to = document.getElementById('periodTo').value || today;
      const br = document.getElementById('periodBranch').value;
      const sp = document.getElementById('periodSpec').value;
      const st = document.getElementById('periodState').value;
      const statusMatch = student => !st ||
        (st === 'outstanding' ? monthlyDueMM(student) : category(student) === st);
      const base = student => identity(student,q) && statusMatch(student) &&
        (!br || student.branch === br) && (!sp || student.specialty === sp);

      let headers = [];
      let records = [];

      if (tab === 'registrations') {
        headers = [
          ['السجل','reg','number'],['الطالب','student','text'],['الفرع','branch','text'],['التخصص','specialty','text'],
          ['تاريخ التسجيل','start','date'],['النهاية','end','date'],['الإجمالي','required','number'],['المدفوع','paid','number'],
          ['المتبقي من الدورة','remaining','number'],['الوضعية','financial','financial']
        ].map(([label,key,type]) => ({label,key,type}));
        records = students.filter(student => base(student) && inRange(student.start,from,to)).map(student => ({
          studentId: student.id,
          sort: {
            reg:student.reg,student:student.name,branch:branchName(student.branch),specialty:spec(student.specialty)?.name || student.specialty,
            start:student.start,end:student.end,required:student.required,paid:student.paid,remaining:remainingOf(student),financial:category(student)
          },
          cells: [
            `<td>${String(student.reg).padStart(4,'0')}</td>`,
            `<td><b>${escMM(student.name)}</b><small>${escMM(student.phone || '')}</small></td>`,
            `<td>${escMM(branchName(student.branch))}</td>`,
            `<td>${escMM(spec(student.specialty)?.name || student.specialty)}</td>`,
            `<td>${dateMM(student.start)}</td>`,`<td>${dateMM(student.end)}</td>`,
            `<td>${moneyMM(student.required)}</td>`,`<td>${moneyMM(student.paid)}</td>`,
            `<td>${moneyMM(remainingOf(student))}</td>`,`<td>${statusCellMM(student)}</td>`
          ]
        }));
      }

      if (tab === 'dues') {
        headers = [
          ['السجل','reg','number'],['الطالب','student','text'],['الفرع','branch','text'],['التخصص','specialty','text'],
          ['موعد الاستحقاق','dueDate','date'],['النهاية','end','date'],['الإجمالي','required','number'],['المدفوع','paid','number'],
          ['المتبقي من الدورة','remaining','number'],['الوضعية','financial','financial']
        ].map(([label,key,type]) => ({label,key,type}));
        records = students.filter(student => {
          if (!base(student) || !monthlyDueMM(student)) return false;
          const dueDate = (student.snapshot || {}).billing === 'monthly'
            ? monthlyFocusV3(student)?.dueDate
            : student.start;
          return dueDate ? inRange(dueDate,from,to) : true;
        }).map(student => {
          const dueDate = (student.snapshot || {}).billing === 'monthly'
            ? monthlyFocusV3(student)?.dueDate || student.start
            : student.start;
          return {
            studentId: student.id,
            sort: {
              reg:student.reg,student:student.name,branch:branchName(student.branch),specialty:spec(student.specialty)?.name || student.specialty,
              dueDate,end:student.end,required:student.required,paid:student.paid,remaining:remainingOf(student),financial:category(student)
            },
            cells: [
              `<td>${String(student.reg).padStart(4,'0')}</td>`,
              `<td><b>${escMM(student.name)}</b><small>${escMM(student.phone || '')}</small></td>`,
              `<td>${escMM(branchName(student.branch))}</td>`,
              `<td>${escMM(spec(student.specialty)?.name || student.specialty)}</td>`,
              `<td>${dateMM(dueDate)}</td>`,`<td>${dateMM(student.end)}</td>`,
              `<td>${moneyMM(student.required)}</td>`,`<td>${moneyMM(student.paid)}</td>`,
              `<td>${moneyMM(remainingOf(student))}</td>`,`<td>${statusCellMM(student)}</td>`
            ]
          };
        });
      }

      if (tab === 'ending') {
        headers = [
          ['السجل','reg','number'],['الطالب','student','text'],['الفرع','branch','text'],['التخصص','specialty','text'],
          ['النهاية','end','date'],['حالة الدورة','course','course'],['المتبقي من الدورة','remaining','number']
        ].map(([label,key,type]) => ({label,key,type}));
        records = students.filter(student => base(student) && inRange(student.end,from,to)).map(student => ({
          studentId:student.id,
          sort:{
            reg:student.reg,student:student.name,branch:branchName(student.branch),specialty:spec(student.specialty)?.name || student.specialty,
            end:student.end,course:courseStatus(student),remaining:remainingOf(student)
          },
          cells:[
            `<td>${String(student.reg).padStart(4,'0')}</td>`,
            `<td><b>${escMM(student.name)}</b><small>${escMM(student.phone || '')}</small></td>`,
            `<td>${escMM(branchName(student.branch))}</td>`,
            `<td>${escMM(spec(student.specialty)?.name || student.specialty)}</td>`,
            `<td>${dateMM(student.end)}</td>`,`<td>${badge(courseStatus(student))}</td>`,
            `<td>${moneyMM(remainingOf(student))}</td>`
          ]
        }));
      }

      const result = document.getElementById('periodResult');
      result.innerHTML = `<div class="period-result-head-prod"><b>${records.length} نتيجة</b><span>${from ? `${dateMM(from)} — ${dateMM(to)}` : `من أقدم البيانات — ${dateMM(to)}`}</span></div>`;
      result.appendChild(tableNodeMM(headers,records,sortByTab[tab],key => {
        const current = sortByTab[tab];
        sortByTab[tab] = current?.key === key
          ? {key,direction:current.direction === 'desc' ? 'asc' : 'desc'}
          : {key,direction:'desc'};
        draw();
      }));
      bindStudentRows();
    }

    document.querySelectorAll('#periodTabsMM button').forEach(button => button.addEventListener('click', () => {
      tab = button.dataset.tab;
      document.querySelectorAll('#periodTabsMM button').forEach(item => item.classList.toggle('active',item === button));
      draw();
    }));
    ['periodFrom','periodTo','periodBranch','periodSpec','periodState'].forEach(id =>
      document.getElementById(id).addEventListener('change',draw)
    );
    document.getElementById('periodSearch').addEventListener('input',draw);
    draw();
  };

  function patchSettingsMergeMM() {
    if (location.hash.replace('#','') !== 'settings') return;
    const restore = document.getElementById('restoreBackupProd');
    if (!restore || restore.dataset.mergeMode === '1') return;

    const card = restore.closest('.settings-card-prod');
    const paragraph = card?.querySelector('p');
    if (paragraph) paragraph.textContent = 'اختر ملف نسخة EFC سابقًا. سيُدمج مع البيانات الموجودة بدل حذفها، وتُزال المعاملات المكررة تلقائيًا بواسطة كود داخلي مخفي لكل معاملة.';
    restore.textContent = 'استعادة ودمج نسخة بيانات';

    const note = document.querySelector('.settings-note-prod');
    if (note) note.textContent = 'الاستعادة لا تحذف البيانات الحالية. يحتفظ البرنامج بها ويضيف البيانات الجديدة من النسخة، وإذا وجد نفس الطالب أو نفس المعاملة بكودها الداخلي فلن يكررها. كما ينشئ نسخة أمان تلقائية قبل كل عملية دمج.';

    const replacement = restore.cloneNode(true);
    replacement.dataset.mergeMode = '1';
    restore.replaceWith(replacement);
    const result = document.getElementById('settingsResultProd');
    const setResult = (text,ok=true) => {
      if (!result) return;
      result.textContent = text;
      result.className = `settings-result-prod ${ok ? 'good' : 'bad'}`;
    };

    replacement.onclick = async event => {
      const invoke = window.__TAURI__?.core?.invoke;
      if (!invoke) return setResult('ميزة الاستعادة متاحة داخل نسخة Windows المثبتة فقط.',false);
      if (!confirm('سيتم دمج النسخة مع البيانات الحالية دون حذفها، مع إزالة المعاملات المكررة تلقائيًا. هل تريد المتابعة؟')) return;
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
        const imported = JSON.parse(raw);
        if (!imported || !Array.isArray(imported.students) || !Array.isArray(imported.specialties) || !Array.isArray(imported.paymentMethods)) {
          throw new Error('ملف النسخة لا يحتوي بيانات EFC صالحة.');
        }
        const merged = await window.EFC_MERGE_IMPORTED_STATE?.(imported);
        const stats = merged?.stats || {};
        setResult(
          `تم الدمج: ${Number(stats.addedStudents || 0)} طالب جديد، ${Number(stats.addedPayments || 0)} معاملة جديدة، وتجاهل ${Number(stats.skippedDuplicatePayments || 0)} معاملة مكررة. البيانات المجمعة تشمل ${Number(stats.sourceCenters || 1)} مصدر/مركز.`,
          true
        );
        setTimeout(() => location.reload(),700);
      } catch (error) {
        setResult(String(error?.message || error),false);
      } finally {
        button.disabled = false;
      }
    };
  }

  try {
    students.forEach(ensureCodesMM);
    saveStudents();
  } catch (error) {
    console.warn('EFC code migration postponed.', error);
  }

  window.addEventListener('hashchange', () => setTimeout(patchSettingsMergeMM, 25));
  setTimeout(patchSettingsMergeMM, 25);

  try {
    if (location.hash.replace('#','') === 'period') renderPeriod();
  } catch (error) {
    console.error('EFC monthly/search refinement render failed.', error);
  }
})();