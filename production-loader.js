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

  const readMetaTimestamp = () => {
    try {
      const meta = JSON.parse(localStorage.getItem(META_KEY) || 'null');
      return Math.max(0, Number(meta?.updatedAt || 0));
    } catch {
      return 0;
    }
  };

  const stateFromLocalStorage = () => ({
    version: 2,
    updatedAt: readMetaTimestamp(),
    students: parseArray(localStorage.getItem(KEYS.students)),
    specialties: parseArray(localStorage.getItem(KEYS.specialties)),
    paymentMethods: parseArray(localStorage.getItem(KEYS.methods), DEFAULT_METHODS)
  });

  const normalizeState = state => ({
    version: 2,
    updatedAt: Math.max(0, Number(state?.updatedAt || 0)),
    students: Array.isArray(state?.students) ? state.students : [],
    specialties: Array.isArray(state?.specialties) ? state.specialties : [],
    paymentMethods: Array.isArray(state?.paymentMethods) && state.paymentMethods.length
      ? state.paymentMethods.map(String).map(x => x.trim()).filter(Boolean)
      : [...DEFAULT_METHODS]
  });

  async function loadDesktopState() {
    if (!invoke) return null;
    try {
      const raw = await invoke('load_app_state');
      if (!raw) return null;
      const state = JSON.parse(raw);
      return state && typeof state === 'object' ? normalizeState(state) : null;
    } catch (error) {
      console.error('EFC SQLite load failed; using local cache.', error);
      return null;
    }
  }

  function applyState(state, { freshTimestamp = false } = {}) {
    const normalized = normalizeState(state);
    const updatedAt = freshTimestamp ? Date.now() : (normalized.updatedAt || Date.now());
    LEGACY_KEYS.forEach(key => nativeRemoveItem.call(localStorage, key));
    nativeSetItem.call(localStorage, KEYS.students, JSON.stringify(normalized.students));
    nativeSetItem.call(localStorage, KEYS.specialties, JSON.stringify(normalized.specialties));
    nativeSetItem.call(localStorage, KEYS.methods, JSON.stringify(normalized.paymentMethods));
    nativeSetItem.call(localStorage, META_KEY, JSON.stringify({ version: 2, updatedAt }));
    return { ...normalized, updatedAt };
  }

  async function persistNow(state = null) {
    if (!invoke) return;
    const payload = normalizeState(state || stateFromLocalStorage());
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
    nativeSetItem.call(localStorage, META_KEY, JSON.stringify({ version: 2, updatedAt: Date.now() }));
  }

  function installStorageMirror() {
    if (window.__EFC_STORAGE_MIRROR_INSTALLED__) return;
    window.__EFC_STORAGE_MIRROR_INSTALLED__ = true;

    Storage.prototype.setItem = function(key, value) {
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
      defaultMethods: [...DEFAULT_METHODS]
    });
    window.EFC_FORCE_PERSIST = async () => {
      const snapshot = stateFromLocalStorage();
      await writeChain.catch(() => undefined);
      await persistNow(snapshot);
      return snapshot;
    };
    window.EFC_APPLY_RESTORED_STATE = async state => {
      const restored = applyState(state, { freshTimestamp: true });
      await persistNow(restored);
      return restored;
    };

    for (const src of SCRIPT_ORDER) await loadScript(src);

    window.EFC_DIAGNOSTICS = Object.freeze({
      storage: invoke ? 'sqlite+newest-local-cache' : 'localStorage-fallback',
      stateUpdatedAt: activeState.updatedAt,
      demoSeedLoaded: false,
      receiptViewer: 'in-app-modal',
      backup: invoke ? 'native-json' : 'unavailable'
    });

    queuePersist();
  }

  start().catch(showStartupError);
})();
