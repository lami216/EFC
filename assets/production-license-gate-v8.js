(()=>{
'use strict';
if(window.__EFC_LICENSE_GATE_V13__)return;
window.__EFC_LICENSE_GATE_V13__=true;

const RUNTIME=[
  './production-loader.js',
  './assets/production-foundation-v13.js',
  './assets/production-receipts-v13.js',
  './assets/production-certificates-v13.js',
  './assets/production-domain-v13.js',
  './assets/production-monthly-prepayment-domain-v14.js',
  './assets/production-receipt-sequences-v10.js',
  './assets/production-student-lifecycle-domain-v20.js',
  './assets/production-student-ui-v13.js',
  './assets/production-registration-schedule-v13.js',
  './assets/production-finance-ui-v13.js',
  './assets/production-monthly-prepayment-ui-v14.js',
  './assets/production-registration-redesign-v15.js',
  './assets/production-registration-responsive-v16.js',
  './assets/production-registration-schedule-matrix-v17.js',
  './assets/production-registration-select-native-v19.js',
  './assets/production-registration-receipt-schedule-v22.js',
  './assets/production-courses-centers-redesign-v23.js',
  './assets/production-courses-centers-compact-v25.js',
  './assets/production-courses-centers-detail-fix-v27.js',
  './assets/production-period-search-redesign-v28.js',
  './assets/production-sidebar-lock-v30.js',
  './assets/production-student-search-redesign-v31.js',
  './assets/production-search-detail-polish-v32.js',
  './assets/production-period-count-and-grid-polish-v33.js',
  './assets/production-search-title-grid-unify-v34.js',
  './assets/production-student-lifecycle-ui-v20.js',
  './assets/production-fiscal-year-v14.js',
  './assets/production-security-ui-v13.js',
  './assets/production-login-ui-v13.js'
];
const RUNTIME_VERSION='20260916-accounting-integrity-v21-2';
const invoke=window.__TAURI__?.core?.invoke;
const app=document.getElementById('app');
let startPromise=null,started=false,watchTimer=null,overlay=null,busy=false,deviceId='';

function loadScript(src){return new Promise((resolve,reject)=>{const script=document.createElement('script');script.src=`${src}${src.includes('?')?'&':'?'}v=${RUNTIME_VERSION}`;script.async=false;script.onload=resolve;script.onerror=()=>reject(new Error(`تعذر تحميل ${src}`));document.head.appendChild(script);});}
function waitUntil(check,label,timeout=15000){const startedAt=Date.now();return new Promise((resolve,reject)=>{const poll=()=>{try{if(check()){resolve();return;}}catch{}if(Date.now()-startedAt>=timeout){reject(new Error(`تعذر اكتمال تشغيل ${label}.`));return;}setTimeout(poll,20);};poll();});}
function reveal(){document.documentElement.classList.remove('efc-booting');}

async function startApplication(){
  if(started)return;
  if(startPromise)return startPromise;
  startPromise=(async()=>{
    await loadScript(RUNTIME[0]);
    if(window.EFC_CORE_STORAGE_READY)await window.EFC_CORE_STORAGE_READY;
    await waitUntil(()=>window.EFC_CORE_STORAGE_V13?.ready,'تخزين البيانات');

    await loadScript(RUNTIME[1]);
    await waitUntil(()=>window.EFC_FOUNDATION_V13?.ready&&typeof shell==='function','الواجهة الأساسية');

    await loadScript(RUNTIME[2]);
    await waitUntil(()=>window.EFC_RECEIPTS_V13?.ready&&typeof receiptModelV4==='function','خدمة الإيصالات');

    await loadScript(RUNTIME[3]);
    await waitUntil(()=>window.EFC_CERTIFICATES_V13?.ready,'الشهادات');

    await loadScript(RUNTIME[4]);
    if(window.EFC_DOMAIN_V13_READY)await window.EFC_DOMAIN_V13_READY;
    await waitUntil(()=>window.EFC_DOMAIN_V13?.ready,'نواة الحسابات');

    await loadScript(RUNTIME[5]);
    await waitUntil(()=>window.EFC_MONTHLY_PREPAYMENT_DOMAIN_V14?.ready&&window.EFC_DOMAIN_V13?.monthlyPrepayment,'توزيع الدفعات الشهرية');

    await loadScript(RUNTIME[6]);
    await waitUntil(()=>window.EFC_RECEIPT_SEQUENCES_V10,'ترقيم الإيصالات');

    await loadScript(RUNTIME[7]);
    await waitUntil(()=>window.EFC_STUDENT_LIFECYCLE_DOMAIN_V20?.ready&&window.EFC_DOMAIN_V13?.studentLifecycleV20,'سياسة أرقام وحذف الطلاب');

    await loadScript(RUNTIME[8]);
    await waitUntil(()=>window.EFC_STUDENT_UI_V13?.ready,'واجهة الطلاب');

    await loadScript(RUNTIME[9]);
    await waitUntil(()=>window.EFC_REGISTRATION_SCHEDULE_V13?.ready,'جدول تسجيل الطالب');

    await loadScript(RUNTIME[10]);
    await waitUntil(()=>window.EFC_FINANCE_UI_V13?.ready,'المالية');

    await loadScript(RUNTIME[11]);
    await waitUntil(()=>window.EFC_MONTHLY_PREPAYMENT_UI_V14?.ready,'واجهة الدفعات الشهرية');

    await loadScript(RUNTIME[12]);
    await waitUntil(()=>window.EFC_REGISTRATION_REDESIGN_V15?.ready,'التصميم الجديد لتسجيل الطالب');

    await loadScript(RUNTIME[13]);
    await waitUntil(()=>window.EFC_REGISTRATION_RESPONSIVE_V16?.ready,'استجابة التسجيل');

    await loadScript(RUNTIME[14]);
    await waitUntil(()=>window.EFC_REGISTRATION_SCHEDULE_MATRIX_V17?.ready,'مصفوفة جدول التسجيل');

    for(let index=15;index<RUNTIME.length;index+=1)await loadScript(RUNTIME[index]);
    await waitUntil(()=>window.EFC_REGISTRATION_SELECT_NATIVE_V19?.ready,'قوائم التسجيل الأصلية');
    await waitUntil(()=>window.EFC_REGISTRATION_RECEIPT_SCHEDULE_V22?.ready,'جدول وصل التسجيل');
    await waitUntil(()=>window.EFC_COURSES_CENTERS_REDESIGN_V23?.ready,'تصميم الدورات والمراكز');
    await waitUntil(()=>window.EFC_COURSES_CENTERS_COMPACT_V25?.ready,'تكثيف الدورات والمراكز');
    await waitUntil(()=>window.EFC_COURSES_CENTERS_DETAIL_FIX_V27?.ready,'تفاصيل الدورات والمراكز');
    await waitUntil(()=>window.EFC_PERIOD_SEARCH_REDESIGN_V28?.ready,'البحث الموحد');
    await waitUntil(()=>window.EFC_SIDEBAR_LOCK_V30?.ready,'القائمة الجانبية');
    await waitUntil(()=>window.EFC_STUDENT_SEARCH_REDESIGN_V31?.ready,'بحث الطلاب');
    await waitUntil(()=>window.EFC_SEARCH_DETAIL_POLISH_V32?.ready,'تفاصيل البحث');
    await waitUntil(()=>window.EFC_PERIOD_COUNT_GRID_POLISH_V33?.ready,'عدد نتائج البحث');
    await waitUntil(()=>window.EFC_SEARCH_TITLE_GRID_UNIFY_V34?.ready,'توحيد عناوين البحث');
    await waitUntil(()=>window.EFC_STUDENT_LIFECYCLE_UI_V20?.ready,'واجهة دورة حياة الطالب');
    await waitUntil(()=>window.EFC_FISCAL_V14?.ready,'السنة المالية');
    await waitUntil(()=>window.EFC_AUTH_V13?.ready,'الصلاحيات');
    await waitUntil(()=>window.EFC_LOGIN_UI_V13?.ready,'تسجيل الدخول');
    started=true;
  })();
  try{await startPromise;}catch(error){startPromise=null;throw error;}
}

function licenseStatus(){try{return invoke?invoke('license_status'):Promise.resolve({activated:true,device_id:'PREVIEW'});}catch{return Promise.resolve({activated:false,device_id:''});}}
function closeOverlay(){overlay?.remove();overlay=null;}
function showActivation(status={}){
  closeOverlay();deviceId=String(status.device_id||deviceId||'');overlay=document.createElement('div');overlay.className='license-gate-v8';overlay.innerHTML=`<div class="license-card-v8"><div class="license-brand-v8"><img src="./assets/efc-logo.svg" alt="EFC"><div><small>مركز EFC</small><h1>تفعيل الجهاز</h1><p>هذا الجهاز غير مفعّل. انسخ رمز الجهاز وأرسله للحصول على ملف التفعيل.</p></div></div><div class="license-device-v8"><span>رمز الجهاز</span><code>${deviceId||'—'}</code><button type="button" data-copy>نسخ الرمز</button></div><div class="license-actions-v8"><button class="button" type="button" data-activate>اختيار ملف التفعيل</button><button class="button secondary" type="button" data-refresh>تحقق من جديد</button></div><p class="license-message-v8" data-message></p></div>`;document.body.appendChild(overlay);
  const message=overlay.querySelector('[data-message]'),setMessage=value=>{message.textContent=String(value||'');};
  overlay.querySelector('[data-copy]').onclick=async()=>{try{await navigator.clipboard.writeText(deviceId);setMessage('تم نسخ رمز الجهاز.');}catch{setMessage('تعذر النسخ التلقائي. انسخ الرمز يدويًا.');}};
  overlay.querySelector('[data-refresh]').onclick=()=>checkLicense(true);
  overlay.querySelector('[data-activate]').onclick=async()=>{if(busy)return;busy=true;setMessage('جاري التحقق من ملف التفعيل...');try{const result=await invoke('select_and_install_license');if(result?.cancelled){setMessage('تم إلغاء اختيار الملف.');return;}if(result?.activated){setMessage('تم تفعيل الجهاز بنجاح.');await checkLicense(true);return;}setMessage(result?.message||'ملف التفعيل غير صالح.');}catch(error){setMessage(String(error?.message||error||'تعذر تثبيت ملف التفعيل.'));}finally{busy=false;}};
  reveal();
}
async function checkLicense(force=false){
  clearTimeout(watchTimer);watchTimer=null;
  try{
    const status=await licenseStatus();deviceId=String(status?.device_id||deviceId||'');
    if(status?.activated){closeOverlay();await startApplication();window.EFC_LOGIN_UI_V13?.renderLogin?.();return;}
    showActivation(status);
  }catch(error){console.error('EFC license gate status failed.',error);if(force)alert(String(error?.message||error||'تعذر التحقق من التفعيل.'));reveal();}
  watchTimer=setTimeout(()=>checkLicense(false),2500);
}
checkLicense(false);
})();
