(() => {
  const SCRIPT_ORDER = [
    './demo-app.js',
    './demo-period-merge.js',
    './demo-monthly-finance-v3.js',
    './demo-receipts-v4.js',
    './demo-v5-runtime-guard.js',
    './demo-brand-receipt-v5.js',
    './demo-repair-v6.js',
    './demo-receipt-layout-v7.js',
    './demo-fix-v8.js',
    './demo-receipt-logo-v9.js',
    './demo-receipt-compact-v10.js',
    './demo-receipt-paper-v11.js',
    './demo-receipt-clean-v12.js',
    './production-runtime.js',
    './production-monthly-merge-v2.js'
  ];

  const KEYS = {
    students: 'efc-students-v1',
    specialties: 'efc-specialties-v1',
    methods: 'efc-payment-methods-v1'
  };
  const META_KEY = 'efc-state-meta-v1';
  const LEGACY_KEYS = [
    'efc-demo-v2-students',
    'efc-demo-v2-specialties',
    'efc-demo-v8-payment-methods'
  ];
  const DEFAULT_METHODS = ['نقداً', 'Bankily', 'Masrvi', 'السداد'];
  const watched = new Set(Object.values(KEYS));
  const invoke = window.__TAURI__?.core?.invoke;
  const nativeSetItem = Storage.prototype.setItem;
  const nativeRemoveItem = Storage.prototype.removeItem;
  let writeChain = Promise.resolve();

  const parseArray = (raw, fallback = []) => {
    try {
      const value = JSON.parse(raw ?? 'null');
      return Array.isArray(value) ? value : fallback;
    } catch {
      return fallback;
    }
  };

  const safeClone = value => JSON.parse(JSON.stringify(value ?? null));

  function stableHash(value) {
    const text = String(value ?? '');
    let hash = 2166136261;
    for (let i = 0; i < text.length; i += 1) {
      hash ^= text.charCodeAt(i);
      hash = Math.imul(hash, 16777619);
    }
    return (hash >>> 0).toString(36);
  }

  function randomId(prefix) {
    const uuid = globalThis.crypto?.randomUUID?.().replaceAll('-', '');
    return `${prefix}-${Date.now().toString(36)}-${uuid ? uuid.slice(0, 14) : Math.random().toString(36).slice(2, 16)}`;
  }

  function readMeta() {
    try {
      const meta = JSON.parse(localStorage.getItem(META_KEY) || 'null');
      return meta && typeof meta === 'object' ? meta : {};
    } catch {
      return {};
    }
  }

  function ensureLocalInstallationId() {
    const meta = readMeta();
    if (typeof meta.installationId === 'string' && meta.installationId.trim()) return meta.installationId.trim();
    const installationId = randomId('center');
    nativeSetItem.call(localStorage, META_KEY, JSON.stringify({
      version: 3,
      updatedAt: Math.max(0, Number(meta.updatedAt || 0)),
      installationId
    }));
    return installationId;
  }

  function legacySourceId(state) {
    const students = Array.isArray(state?.students) ? state.students : [];
    const specialties = Array.isArray(state?.specialties) ? state.specialties : [];
    const studentAnchor = students
      .map(student => String(student?.recordCode || student?.id || ''))
      .filter(Boolean)
      .sort()[0];
    const specialtyAnchor = specialties
      .map(item => String(item?.recordCode || item?.id || ''))
      .filter(Boolean)
      .sort()[0];
    const anchor = studentAnchor || specialtyAnchor || JSON.stringify({
      specialties: specialties.map(item => [item?.name, item?.durationValue, item?.durationUnit, item?.billing, item?.fee]),
      methods: Array.isArray(state?.paymentMethods) ? state.paymentMethods : []
    });
    return `legacy-${stableHash(anchor)}`;
  }

  function specialtySignature(item) {
    return JSON.stringify([
      String(item?.name || '').trim(),
      Number(item?.durationValue || 0),
      String(item?.durationUnit || ''),
      String(item?.billing || ''),
      Number(item?.fee || 0)
    ]);
  }

  function normalizeSpecialty(item, sourceId) {
    const specialty = { ...(item || {}) };
    const originalId = String(specialty.id || randomId('sp'));
    specialty.id = originalId;
    specialty.recordCode = String(specialty.recordCode || `spec-${stableHash(`${sourceId}|${originalId}|${specialtySignature(specialty)}`)}`);
    specialty.sourceCenterId = String(specialty.sourceCenterId || sourceId);
    return specialty;
  }

  function ensurePaymentCode(payment, studentRecordCode, index) {
    const value = Array.isArray(payment) ? [...payment] : [];
    const existing = typeof value[6] === 'string' ? value[6].trim() : '';
    if (!existing) {
      const fingerprint = JSON.stringify([
        studentRecordCode,
        value[0] || '',
        Number(value[1] || 0),
        value[2] || '',
        value[3] || '',
        value[4] || '',
        value[5] || '',
        index
      ]);
      value[6] = `tx-${stableHash(fingerprint)}`;
    } else {
      value[6] = existing;
    }
    if (value.length > 7 && value[7] !== null && value[7] !== undefined && value[7] !== '') {
      const month = Number(value[7]);
      value[7] = Number.isInteger(month) && month > 0 ? month : null;
    }
    return value;
  }

  function normalizeStudent(item, sourceId) {
    const student = { ...(item || {}) };
    const originalId = String(student.id || randomId('student'));
    student.id = originalId;
    student.sourceCenterId = String(student.sourceCenterId || sourceId);
    student.recordCode = String(student.recordCode || `reg-${stableHash([
      student.sourceCenterId,
      originalId,
      student.branch || '',
      student.specialty || '',
      student.reg || '',
      student.start || ''
    ].join('|'))}`);

    const seen = new Set();
    const payments = [];
    (Array.isArray(student.payments) ? student.payments : []).forEach((payment, index) => {
      const normalized = ensurePaymentCode(payment, student.recordCode, index);
      const code = normalized[6];
      if (seen.has(code)) return;
      seen.add(code);
      payments.push(normalized);
    });
    student.payments = payments;
    if (payments.length) student.paid = payments.reduce((sum, payment) => sum + Number(payment[1] || 0), 0);
    else student.paid = Number(student.paid || 0);
    student.required = Number(student.required || 0);
    return student;
  }

  function normalizeState(state, fallbackInstallationId = null, imported = false) {
    const raw = state && typeof state === 'object' ? state : {};
    let installationId = typeof raw.installationId === 'string' && raw.installationId.trim()
      ? raw.installationId.trim()
      : null;
    if (!installationId) {
      installationId = imported ? legacySourceId(raw) : (fallbackInstallationId || legacySourceId(raw));
    }

    const rawSpecialties = Array.isArray(raw.specialties) ? raw.specialties : [];
    const rawStudents = Array.isArray(raw.students) ? raw.students : [];
    const hasExistingCodes = [...rawSpecialties, ...rawStudents].some(item =>
      (typeof item?.recordCode === 'string' && item.recordCode.trim()) ||
      (typeof item?.sourceCenterId === 'string' && item.sourceCenterId.trim())
    );
    const dataSourceId = hasExistingCodes || (!rawSpecialties.length && !rawStudents.length)
      ? installationId
      : legacySourceId(raw);

    const specialties = rawSpecialties
      .map(item => normalizeSpecialty(item, item?.sourceCenterId || dataSourceId));
    const students = rawStudents
      .map(item => normalizeStudent(item, item?.sourceCenterId || dataSourceId));
    const paymentMethods = (Array.isArray(raw.paymentMethods) && raw.paymentMethods.length
      ? raw.paymentMethods
      : DEFAULT_METHODS)
      .map(String)
      .map(value => value.trim())
      .filter(Boolean);

    const sourceCenters = new Set(
      Array.isArray(raw.sourceCenters) ? raw.sourceCenters.map(String).filter(Boolean) : []
    );
    sourceCenters.add(installationId);
    specialties.forEach(item => sourceCenters.add(String(item.sourceCenterId || installationId)));
    students.forEach(item => sourceCenters.add(String(item.sourceCenterId || installationId)));

    return {
      version: 3,
      updatedAt: Math.max(0, Number(raw.updatedAt || 0)),
      installationId,
      sourceCenters: [...sourceCenters],
      students,
      specialties,
      paymentMethods: [...new Set(paymentMethods)]
    };
  }

  function stateFromLocalStorage() {
    const meta = readMeta();
    const installationId = typeof meta.installationId === 'string' && meta.installationId.trim()
      ? meta.installationId.trim()
      : ensureLocalInstallationId();
    return normalizeState({
      version: 3,
      updatedAt: Math.max(0, Number(meta.updatedAt || 0)),
      installationId,
      students: parseArray(localStorage.getItem(KEYS.students)),
      specialties: parseArray(localStorage.getItem(KEYS.specialties)),
      paymentMethods: parseArray(localStorage.getItem(KEYS.methods), DEFAULT_METHODS)
    }, installationId);
  }

  function mergePayments(currentPayments, incomingPayments, studentRecordCode) {
    const merged = [];
    const seen = new Set();
    [...(currentPayments || []), ...(incomingPayments || [])].forEach((payment, index) => {
      const normalized = ensurePaymentCode(payment, studentRecordCode, index);
      const code = normalized[6];
      if (seen.has(code)) return;
      seen.add(code);
      merged.push(normalized);
    });
    return merged;
  }

  function mergeStates(currentRaw, incomingRaw) {
    const current = normalizeState(currentRaw, ensureLocalInstallationId());
    const incoming = normalizeState(incomingRaw, null, true);
    const specialties = current.specialties.map(item => safeClone(item));
    const byRecordCode = new Map(specialties.map(item => [item.recordCode, item]));
    const bySignature = new Map(specialties.map(item => [specialtySignature(item), item]));
    const usedSpecialtyIds = new Set(specialties.map(item => item.id));
    const specialtyRemap = new Map();

    incoming.specialties.forEach(item => {
      const same = byRecordCode.get(item.recordCode) || bySignature.get(specialtySignature(item));
      if (same) {
        specialtyRemap.set(item.id, same.id);
        return;
      }
      const copy = safeClone(item);
      if (usedSpecialtyIds.has(copy.id)) copy.id = `${copy.id}-${stableHash(copy.recordCode).slice(0, 6)}`;
      usedSpecialtyIds.add(copy.id);
      specialties.push(copy);
      byRecordCode.set(copy.recordCode, copy);
      bySignature.set(specialtySignature(copy), copy);
      specialtyRemap.set(item.id, copy.id);
    });

    const students = current.students.map(item => safeClone(item));
    const byStudentCode = new Map(students.map(item => [item.recordCode, item]));
    const usedStudentIds = new Set(students.map(item => item.id));
    let addedStudents = 0;
    let mergedStudents = 0;
    let addedPayments = 0;
    let skippedDuplicatePayments = 0;

    incoming.students.forEach(rawStudent => {
      const imported = safeClone(rawStudent);
      if (specialtyRemap.has(imported.specialty)) imported.specialty = specialtyRemap.get(imported.specialty);
      const existing = byStudentCode.get(imported.recordCode);
      if (existing) {
        const before = (existing.payments || []).length;
        existing.payments = mergePayments(existing.payments, imported.payments, existing.recordCode);
        const after = existing.payments.length;
        addedPayments += Math.max(0, after - before);
        skippedDuplicatePayments += Math.max(0, (imported.payments || []).length - (after - before));
        if (existing.payments.length) {
          existing.paid = existing.payments.reduce((sum, payment) => sum + Number(payment[1] || 0), 0);
        }
        mergedStudents += 1;
        return;
      }

      if (usedStudentIds.has(imported.id)) imported.id = `student-${stableHash(imported.recordCode)}`;
      while (usedStudentIds.has(imported.id)) imported.id = `${imported.id}-x`;
      usedStudentIds.add(imported.id);
      imported.payments = mergePayments([], imported.payments, imported.recordCode);
      if (imported.payments.length) imported.paid = imported.payments.reduce((sum, payment) => sum + Number(payment[1] || 0), 0);
      students.push(imported);
      byStudentCode.set(imported.recordCode, imported);
      addedStudents += 1;
      addedPayments += imported.payments.length;
    });

    const sourceCenters = new Set([
      ...(current.sourceCenters || []),
      ...(incoming.sourceCenters || []),
      current.installationId,
      incoming.installationId
    ].filter(Boolean));

    const paymentMethods = [...new Set([
      ...(current.paymentMethods || []),
      ...(incoming.paymentMethods || [])
    ].map(String).map(value => value.trim()).filter(Boolean))];

    return {
      state: {
        version: 3,
        updatedAt: Date.now(),
        installationId: current.installationId,
        sourceCenters: [...sourceCenters],
        students,
        specialties,
        paymentMethods
      },
      stats: {
        addedStudents,
        mergedStudents,
        addedPayments,
        skippedDuplicatePayments,
        sourceCenters: sourceCenters.size
      }
    };
  }

  async function loadDesktopState() {
    if (!invoke) return null;
    try {
      const raw = await invoke('load_app_state');
      if (!raw) return null;
      const state = JSON.parse(raw);
      return state && typeof state === 'object'
        ? normalizeState(state, ensureLocalInstallationId())
        : null;
    } catch (error) {
      console.error('EFC SQLite load failed; using local cache.', error);
      return null;
    }
  }

  function applyState(state, { freshTimestamp = false } = {}) {
    const localInstallationId = ensureLocalInstallationId();
    const normalized = normalizeState(state, localInstallationId);
    normalized.installationId = localInstallationId;
    if (!normalized.sourceCenters.includes(localInstallationId)) normalized.sourceCenters.push(localInstallationId);
    const updatedAt = freshTimestamp ? Date.now() : (normalized.updatedAt || Date.now());

    LEGACY_KEYS.forEach(key => nativeRemoveItem.call(localStorage, key));
    nativeSetItem.call(localStorage, KEYS.students, JSON.stringify(normalized.students));
    nativeSetItem.call(localStorage, KEYS.specialties, JSON.stringify(normalized.specialties));
    nativeSetItem.call(localStorage, KEYS.methods, JSON.stringify(normalized.paymentMethods));
    nativeSetItem.call(localStorage, META_KEY, JSON.stringify({
      version: 3,
      updatedAt,
      installationId: localInstallationId,
      sourceCenters: normalized.sourceCenters
    }));
    return { ...normalized, updatedAt, installationId: localInstallationId };
  }

  async function persistNow(state = null) {
    if (!invoke) return;
    const payload = normalizeState(state || stateFromLocalStorage(), ensureLocalInstallationId());
    payload.installationId = ensureLocalInstallationId();
    if (!payload.updatedAt) payload.updatedAt = Date.now();
    await invoke('save_app_state', { state: JSON.stringify(payload) });
  }

  function queuePersist() {
    const snapshot = stateFromLocalStorage();
    writeChain = writeChain
      .catch(() => undefined)
      .then(() => persistNow(snapshot))
      .catch(error => console.error('EFC SQLite save failed.', error));
    return writeChain;
  }

  function markLocalChange() {
    const meta = readMeta();
    nativeSetItem.call(localStorage, META_KEY, JSON.stringify({
      version: 3,
      updatedAt: Date.now(),
      installationId: ensureLocalInstallationId(),
      sourceCenters: Array.isArray(meta.sourceCenters) ? meta.sourceCenters : [ensureLocalInstallationId()]
    }));
  }

  function installStorageMirror() {
    if (window.__EFC_STORAGE_MIRROR_INSTALLED__) return;
    window.__EFC_STORAGE_MIRROR_INSTALLED__ = true;

    Storage.prototype.setItem = function(key, rawValue) {
      let value = rawValue;
      if (this === localStorage && key === KEYS.students) {
        const installationId = ensureLocalInstallationId();
        value = JSON.stringify(parseArray(rawValue).map(item => normalizeStudent(item, item?.sourceCenterId || installationId)));
      } else if (this === localStorage && key === KEYS.specialties) {
        const installationId = ensureLocalInstallationId();
        value = JSON.stringify(parseArray(rawValue).map(item => normalizeSpecialty(item, item?.sourceCenterId || installationId)));
      }
      nativeSetItem.call(this, key, value);
      if (this === localStorage && watched.has(String(key))) {
        markLocalChange();
        queuePersist();
      }
    };

    Storage.prototype.removeItem = function(key) {
      nativeRemoveItem.call(this, key);
      if (this === localStorage && watched.has(String(key))) {
        markLocalChange();
        queuePersist();
      }
    };
  }

  function chooseNewestState(localState, desktopState) {
    if (!desktopState) return localState;
    const localUpdated = Number(localState?.updatedAt || 0);
    const desktopUpdated = Number(desktopState?.updatedAt || 0);
    if (desktopUpdated > localUpdated) return desktopState;
    if (localUpdated > desktopUpdated) return localState;

    const hasLocalProductionState = Object.values(KEYS).some(key => localStorage.getItem(key) !== null);
    return hasLocalProductionState ? localState : desktopState;
  }

  function loadScript(src) {
    return new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = src;
      script.async = false;
      script.onload = () => resolve();
      script.onerror = () => reject(new Error(`تعذر تحميل ${src}`));
      document.head.appendChild(script);
    });
  }

  function showStartupError(error) {
    console.error(error);
    const root = document.getElementById('app');
    if (!root) return;
    root.innerHTML = `<div style="max-width:760px;margin:80px auto;background:#fff;border:1px solid #ddd;border-radius:14px;padding:28px;font-family:Tahoma,Arial;direction:rtl"><h2 style="margin-top:0">تعذر تشغيل مركز EFC</h2><p>حدث خطأ أثناء تحميل ملفات التطبيق. أعد تشغيل البرنامج، وإذا استمرت المشكلة استخدم النسخة الأحدث.</p><pre style="direction:ltr;white-space:pre-wrap;background:#f5f5f5;padding:12px;border-radius:8px">${String(error?.message || error)}</pre></div>`;
  }

  async function start() {
    const localState = stateFromLocalStorage();
    const persisted = await loadDesktopState();
    const chosen = chooseNewestState(localState, persisted);
    const activeState = applyState(chosen);
    installStorageMirror();

    window.EFC_STATE = Object.freeze({
      keys: { ...KEYS },
      metaKey: META_KEY,
      defaultMethods: [...DEFAULT_METHODS],
      installationId: activeState.installationId
    });
    window.EFC_CODES = Object.freeze({
      ensureStudentRecord(student) {
        const normalized = normalizeStudent(student, student?.sourceCenterId || activeState.installationId);
        Object.assign(student, normalized);
        return student.recordCode;
      },
      ensurePaymentCode(student, payment, index) {
        const recordCode = this.ensureStudentRecord(student);
        const normalized = ensurePaymentCode(payment, recordCode, index);
        payment.splice(0, payment.length, ...normalized);
        return payment[6];
      },
      newTransactionCode(student) {
        const recordCode = this.ensureStudentRecord(student);
        return `tx-${stableHash(recordCode)}-${Date.now().toString(36)}-${globalThis.crypto?.randomUUID?.().slice(0, 8) || Math.random().toString(36).slice(2, 10)}`;
      }
    });

    window.EFC_FORCE_PERSIST = async () => {
      const snapshot = stateFromLocalStorage();
      await writeChain.catch(() => undefined);
      await persistNow(snapshot);
      return snapshot;
    };

    window.EFC_MERGE_IMPORTED_STATE = async state => {
      const current = stateFromLocalStorage();
      const { state: merged, stats } = mergeStates(current, state);
      const applied = applyState(merged, { freshTimestamp: true });
      await persistNow(applied);
      return { state: applied, stats };
    };

    window.EFC_APPLY_RESTORED_STATE = window.EFC_MERGE_IMPORTED_STATE;

    for (const src of SCRIPT_ORDER) await loadScript(src);

    window.EFC_DIAGNOSTICS = Object.freeze({
      storage: invoke ? 'sqlite+newest-local-cache' : 'localStorage-fallback',
      stateUpdatedAt: activeState.updatedAt,
      installationId: activeState.installationId,
      sourceCenters: activeState.sourceCenters?.length || 1,
      transactionCodes: 'hidden+deduplicated',
      demoSeedLoaded: false,
      receiptViewer: 'in-app-modal',
      backup: invoke ? 'native-json-merge' : 'unavailable'
    });

    queuePersist();
  }

  start().catch(showStartupError);
})();