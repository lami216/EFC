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
    './production-runtime.js'
  ];

  const KEYS = {
    students: 'efc-students-v1',
    specialties: 'efc-specialties-v1',
    methods: 'efc-payment-methods-v1'
  };
  const LEGACY_KEYS = [
    'efc-demo-v2-students',
    'efc-demo-v2-specialties',
    'efc-demo-v8-payment-methods'
  ];
  const DEFAULT_METHODS = ['نقداً', 'Bankily', 'Masrvi', 'السداد'];
  const watched = new Set(Object.values(KEYS));
  const invoke = window.__TAURI__?.core?.invoke;
  let writeChain = Promise.resolve();

  const parseArray = (raw, fallback = []) => {
    try {
      const value = JSON.parse(raw ?? 'null');
      return Array.isArray(value) ? value : fallback;
    } catch {
      return fallback;
    }
  };

  const stateFromLocalStorage = () => ({
    version: 1,
    students: parseArray(localStorage.getItem(KEYS.students)),
    specialties: parseArray(localStorage.getItem(KEYS.specialties)),
    paymentMethods: parseArray(localStorage.getItem(KEYS.methods), DEFAULT_METHODS)
  });

  async function loadDesktopState() {
    if (!invoke) return null;
    try {
      const raw = await invoke('load_app_state');
      if (!raw) return null;
      const state = JSON.parse(raw);
      return state && typeof state === 'object' ? state : null;
    } catch (error) {
      console.error('EFC SQLite load failed; using local cache.', error);
      return null;
    }
  }

  async function persistNow() {
    if (!invoke) return;
    const state = JSON.stringify(stateFromLocalStorage());
    await invoke('save_app_state', { state });
  }

  function queuePersist() {
    writeChain = writeChain
      .catch(() => undefined)
      .then(() => persistNow())
      .catch(error => console.error('EFC SQLite save failed.', error));
  }

  function installStorageMirror() {
    if (window.__EFC_STORAGE_MIRROR_INSTALLED__) return;
    window.__EFC_STORAGE_MIRROR_INSTALLED__ = true;
    const originalSetItem = Storage.prototype.setItem;
    const originalRemoveItem = Storage.prototype.removeItem;

    Storage.prototype.setItem = function(key, value) {
      originalSetItem.call(this, key, value);
      if (this === localStorage && watched.has(String(key))) queuePersist();
    };

    Storage.prototype.removeItem = function(key) {
      originalRemoveItem.call(this, key);
      if (this === localStorage && watched.has(String(key))) queuePersist();
    };
  }

  function applyState(state) {
    LEGACY_KEYS.forEach(key => localStorage.removeItem(key));
    const students = Array.isArray(state?.students) ? state.students : [];
    const specialties = Array.isArray(state?.specialties) ? state.specialties : [];
    const methods = Array.isArray(state?.paymentMethods) && state.paymentMethods.length
      ? state.paymentMethods
      : DEFAULT_METHODS;
    localStorage.setItem(KEYS.students, JSON.stringify(students));
    localStorage.setItem(KEYS.specialties, JSON.stringify(specialties));
    localStorage.setItem(KEYS.methods, JSON.stringify(methods));
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
    const persisted = await loadDesktopState();
    applyState(persisted || { students: [], specialties: [], paymentMethods: DEFAULT_METHODS });
    installStorageMirror();

    for (const src of SCRIPT_ORDER) await loadScript(src);

    window.EFC_DIAGNOSTICS = Object.freeze({
      storage: invoke ? 'sqlite+local-cache' : 'localStorage-fallback',
      demoSeedLoaded: false,
      receiptViewer: 'in-app-modal'
    });

    queuePersist();
  }

  start().catch(showStartupError);
})();
