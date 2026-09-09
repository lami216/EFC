(()=>{
'use strict';
if(window.__EFC_LICENSE_GATE_V13__)return;
window.__EFC_LICENSE_GATE_V13__=true;

const BASE_RUNTIME='./production-loader.js';
const REFINEMENTS=[
  './assets/production-student-profile-v3.js',
  './assets/production-registration-receipt-v4.js',
  './assets/production-ledger-finance-ui-v5.js',
  './assets/production-ledger-pdf-v6.js',
  './assets/production-certificates-v13.js',
  './assets/production-receipt-sequences-v10.js'
];
const CENTER_LAYERS=[
  './assets/production-domain-v13.js',
  './assets/production-student-ui-v13.js',
  './assets/production-finance-ui-v13.js',
  './assets/production-security-ui-v13.js'
];
const invoke=window.__TAURI__?.core?.invoke;
const app=document.getElementById('app');
let startPromise=null,started=false,watchTimer=null,overlay=null,busy=false,deviceId='';

function loadScript(src){return new Promise((resolve,reject)=>{const script=document.createElement('script');script.src=src;script.async=false;script.onload=resolve;script.onerror=()=>reject(new Error(`تعذر تحميل ${src}`));document.head.appendChild(script);});}
function waitUntil(check,label,timeout=15000){const startedAt=Date.now();return new Promise((resolve,reject)=>{const poll=()=>{try{if(check()){resolve();return;}}catch{}if(Date.now()-startedAt>=timeout){reject(new Error(`تعذر اكتمال تشغيل ${label}.`));return;}setTimeout(poll,25);};poll();});}
function reveal(){document.documentElement.classList.remove('efc-booting');}

async function startApplication(){
  if(started)return;
  if(startPromise)return startPromise;
  startPromise=(async()=>{
    await loadScript(BASE_RUNTIME);
    await waitUntil(()=>window.EFC_DIAGNOSTICS&&typeof shell==='function'&&typeof renderRegister==='function','الواجهة الأساسية');
    for(const src of REFINEMENTS)await loadScript(src);
    await waitUntil(()=>window.EFC_CERTIFICATES_V13?.ready&&window.EFC_RECEIPT_SEQUENCES_V10,'طبقات الإنتاج');
    await loadScript(CENTER_LAYERS[0]);
    if(window.EFC_DOMAIN_V13_READY)await window.EFC_DOMAIN_V13_READY;
    await waitUntil(()=>window.EFC_DOMAIN_V13?.ready,'نواة الحسابات');
    await loadScript(CENTER_LAYERS[1]);
    await waitUntil(()=>window.EFC_STUDENT_UI_V13?.ready,'واجهة الطلاب');
    await loadScript(CENTER_LAYERS[2]);
    await waitUntil(()=>window.EFC_FINANCE_UI_V13?.ready,'المالية');
    await loadScript(CENTER_LAYERS[3]);
    await waitUntil(()=>window.EFC_CENTER_OPS_V13?.ready,'النظام النهائي');
    window.renderCurrentV13?.();
    await new Promise(resolve=>setTimeout(resolve,20));
    if(!document.querySelector('.shell')&&!document.querySelector('.login-overlay-v13'))throw new Error('لم تجهز واجهة النظام النهائية.');
    started=true;reveal();
  })();
  try{return await startPromise;}catch(error){startPromise=null;reveal();throw error;}
}

function styleActivation(){if(document.getElementById('efc-license-style-v13'))return;const style=document.createElement('style');style.id='efc-license-style-v13';style.textContent=`.efc-license-lock{position:fixed;inset:0;z-index:2147483647;background:#eef3f1;display:grid;place-items:center;padding:22px;direction:rtl;font-family:Tahoma,Arial;color:#17332b}.efc-license-card{width:min(650px,96vw);background:#fff;border:1px solid #d7e1dd;border-radius:18px;box-shadow:0 18px 50px #143b2b1a;padding:26px}.efc-license-head{display:flex;align-items:center;gap:15px;border-bottom:1px solid #e4ebe8;padding-bottom:16px;margin-bottom:16px}.efc-license-head img{width:76px;height:62px;object-fit:contain}.efc-license-head h1{margin:0 0 4px;font-size:23px}.efc-license-head p,.efc-license-note{margin:0;color:#70827b;font-size:11px;line-height:1.8}.efc-license-body{display:grid;gap:13px}.efc-license-error{background:#fff5f3;border:1px solid #f1d5cf;color:#8f3527;border-radius:10px;padding:10px 12px;font-size:11px}.efc-license-device{display:grid;grid-template-columns:minmax(0,1fr) auto;gap:8px}.efc-license-device input{height:42px;border:1px solid #ccd9d4;border-radius:9px;padding:0 11px;font:700 13px Consolas;direction:ltr}.efc-license-actions{display:flex;gap:8px;flex-wrap:wrap}.efc-license-actions button{border:0;border-radius:9px;padding:11px 16px;font:700 12px Tahoma;cursor:pointer}.efc-license-primary{background:#1469ad;color:#fff}.efc-license-soft{background:#edf2f0;color:#23443a}.efc-license-actions button:disabled{opacity:.55}.efc-license-ok{background:#ecf8f1;border:1px solid #c8e8d5;color:#17643b;border-radius:10px;padding:10px 12px;font-size:11px;font-weight:700}@media(max-width:620px){.efc-license-card{padding:18px}.efc-license-device{grid-template-columns:1fr}.efc-license-actions button{flex:1}}`;document.head.appendChild(style);}
function ensureActivationUi(reasonText='يجب تفعيل هذا الجهاز قبل استخدام النظام.'){
  if(overlay){overlay.querySelector('#efcLicenseReason').textContent=reasonText;return overlay;}
  styleActivation();overlay=document.createElement('div');overlay.className='efc-license-lock';overlay.innerHTML=`<section class="efc-license-card"><div class="efc-license-head"><img src="./efc-logo.svg" alt="EFC"><div><h1>تفعيل نظام EFC</h1><p>هذا الجهاز يحتاج ملف تفعيل صالح قبل فتح بيانات المركز.</p></div></div><div class="efc-license-body"><div class="efc-license-error" id="efcLicenseReason">${String(reasonText)}</div><label>رقم هذا الجهاز<div class="efc-license-device"><input id="efcLicenseDevice" readonly autocomplete="off" value="جاري الاستخراج…"><button class="efc-license-soft" id="efcLicenseCopy" type="button">نسخ</button></div></label><div class="efc-license-actions"><button class="efc-license-primary" id="efcLicenseInstall" type="button">اختيار ملف التفعيل</button><button class="efc-license-soft" id="efcLicenseRefresh" type="button">إعادة التحقق</button></div><p class="efc-license-note">أرسل رقم الجهاز إلى مسؤول التفعيل ثم اختر ملف .efc-license الخاص بهذا الجهاز.</p><div id="efcLicenseMessage"></div></div></section>`;document.body.appendChild(overlay);if(app)app.inert=true;
  const install=overlay.querySelector('#efcLicenseInstall'),refresh=overlay.querySelector('#efcLicenseRefresh'),copy=overlay.querySelector('#efcLicenseCopy'),device=overlay.querySelector('#efcLicenseDevice'),message=overlay.querySelector('#efcLicenseMessage');
  const setBusy=value=>{busy=value;install.disabled=value;refresh.disabled=value;copy.disabled=value||!deviceId;};
  const setMessage=(text,ok=false)=>{message.className=text?(ok?'efc-license-ok':'efc-license-error'):'';message.textContent=text||'';};
  async function loadDevice(){try{if(!deviceId)deviceId=await invoke('get_license_device_id');device.value=deviceId;copy.disabled=busy||!deviceId;}catch(error){device.value='تعذر استخراج رقم الجهاز';setMessage(String(error));}}
  copy.onclick=async()=>{if(!deviceId)return;try{await navigator.clipboard.writeText(deviceId);}catch{device.select();document.execCommand('copy');}setMessage('تم نسخ رقم الجهاز.',true);};
  refresh.onclick=async()=>{if(busy)return;setBusy(true);try{const status=await invoke('get_license_status');if(status?.valid){await unlock(status);return;}overlay.querySelector('#efcLicenseReason').textContent=status?.reason||'ملف التفعيل غير صالح.';await loadDevice();}catch(error){setMessage(String(error));}finally{setBusy(false);}};
  install.onclick=async()=>{if(busy)return;setBusy(true);setMessage('');try{const installed=await invoke('install_license_file');if(!installed)return;const status=await invoke('get_license_status');if(!status?.valid)throw new Error(status?.reason||'تعذر اعتماد ملف التفعيل.');setMessage('تم التفعيل بنجاح.',true);await unlock(status);}catch(error){setMessage(String(error?.message||error));}finally{setBusy(false);}};
  loadDevice();setBusy(false);return overlay;
}

async function unlock(status){window.EFC_LICENSE_STATUS=status;await startApplication();if(app)app.inert=false;if(overlay){overlay.remove();overlay=null;}if(watchTimer)clearInterval(watchTimer);watchTimer=setInterval(async()=>{try{const next=await invoke('get_license_status');window.EFC_LICENSE_STATUS=next;if(!next?.valid){clearInterval(watchTimer);location.reload();}}catch{location.reload();}},30000);}
async function silentStartup(){try{const status=await invoke('get_license_status');window.EFC_LICENSE_STATUS=status;if(status?.valid){await unlock(status);return;}ensureActivationUi(status?.reason||'يجب تفعيل هذا الجهاز قبل استخدام النظام.');}catch(error){ensureActivationUi(String(error?.message||error||'تعذر التحقق من التفعيل.'));}}

if(!invoke){startApplication().catch(error=>{console.error('EFC browser bootstrap failed.',error);reveal();if(app)app.innerHTML=`<div style="max-width:720px;margin:90px auto;text-align:center;color:#8f3527"><b>تعذر تشغيل نظام EFC.</b><br><small>${String(error?.message||error)}</small></div>`;});}
else silentStartup();

window.EFC_LICENSE_GATE_V8=Object.freeze({offline:true,deviceBound:true,signedFiles:true,temporaryWatch:true,runtimeBlockedUntilValid:true,silentValidStartup:true,activationUiOnlyWhenInvalid:true,noReloadAfterInstall:true,noStartupSplash:true,deterministicRuntimeOrder:true,certificateV13Native:true,centerOpsV13:true});
})();