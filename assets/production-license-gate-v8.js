(()=>{
  const FLAG='__EFC_LICENSE_GATE_V8__';
  if(window[FLAG])return;
  window[FLAG]=true;

  const invoke=window.__TAURI__?.core?.invoke;
  if(!invoke){window.EFC_LICENSE_GATE_V8=Object.freeze({nativeOnly:true,bypassed:true});return;}

  const style=document.createElement('style');
  style.textContent=`
    .efc-license-lock-v8{position:fixed;inset:0;z-index:2147483647;background:#eef3f1;display:grid;place-items:center;padding:22px;direction:rtl;font-family:Tahoma,Arial,sans-serif;color:#17332b}.efc-license-card-v8{width:min(680px,96vw);background:#fff;border:1px solid #d7e1dd;border-radius:18px;box-shadow:0 18px 50px #143b2b1a;padding:26px}.efc-license-head-v8{display:flex;align-items:center;gap:15px;border-bottom:1px solid #e4ebe8;padding-bottom:18px;margin-bottom:18px}.efc-license-head-v8 img{width:76px;height:62px;object-fit:contain}.efc-license-head-v8 h1{margin:0 0 5px;font-size:24px}.efc-license-head-v8 p{margin:0;color:#70827b;font-size:12px;line-height:1.8}.efc-license-state-v8{margin-right:auto;border-radius:999px;padding:7px 11px;background:#fff1e9;color:#a44a1c;font-size:11px;font-weight:700}.efc-license-body-v8{display:grid;gap:15px}.efc-license-error-v8{background:#fff5f3;border:1px solid #f1d5cf;color:#8f3527;border-radius:10px;padding:11px 13px;font-size:12px;line-height:1.7}.efc-license-label-v8{display:grid;gap:7px;font-size:12px;font-weight:700}.efc-license-device-v8{display:grid;grid-template-columns:minmax(0,1fr) auto;gap:8px}.efc-license-device-v8 input{width:100%;height:42px;border:1px solid #ccd9d4;border-radius:9px;padding:0 11px;font:700 13px Consolas,monospace;direction:ltr;text-align:left;background:#f9fbfa;color:#17332b}.efc-license-actions-v8{display:flex;flex-wrap:wrap;gap:8px}.efc-license-actions-v8 button{border:0;border-radius:9px;padding:11px 16px;font:700 12px Tahoma,Arial;cursor:pointer}.efc-license-primary-v8{background:#1469ad;color:#fff}.efc-license-soft-v8{background:#edf2f0;color:#23443a}.efc-license-actions-v8 button:disabled{opacity:.55;cursor:not-allowed}.efc-license-note-v8{color:#71817c;font-size:11px;line-height:1.8;margin:0}.efc-license-success-v8{background:#ecf8f1;border:1px solid #c8e8d5;color:#17643b;border-radius:10px;padding:11px 13px;font-size:12px;font-weight:700}@media(max-width:620px){.efc-license-card-v8{padding:18px}.efc-license-head-v8{align-items:flex-start}.efc-license-state-v8{display:none}.efc-license-device-v8{grid-template-columns:1fr}.efc-license-actions-v8 button{flex:1}}
  `;
  document.head.appendChild(style);

  const overlay=document.createElement('div');
  overlay.className='efc-license-lock-v8';
  overlay.innerHTML=`<section class="efc-license-card-v8" role="dialog" aria-modal="true" aria-labelledby="efcLicenseTitle"><div class="efc-license-head-v8"><img src="./efc-logo.svg" alt="EFC"><div><h1 id="efcLicenseTitle">تفعيل نظام EFC</h1><p>هذا الجهاز يحتاج ملف تفعيل صالح قبل فتح بيانات المركز.</p></div><span class="efc-license-state-v8">غير مفعل</span></div><div class="efc-license-body-v8"><div class="efc-license-error-v8" id="efcLicenseReason">جاري التحقق من حالة التفعيل…</div><label class="efc-license-label-v8">رقم هذا الجهاز<div class="efc-license-device-v8"><input id="efcLicenseDevice" readonly value="جاري الاستخراج…"><button class="efc-license-soft-v8" id="efcLicenseCopy" type="button" disabled>نسخ</button></div></label><div class="efc-license-actions-v8"><button class="efc-license-primary-v8" id="efcLicenseInstall" type="button">اختيار ملف التفعيل</button><button class="efc-license-soft-v8" id="efcLicenseRefresh" type="button">إعادة التحقق</button></div><p class="efc-license-note-v8">أرسل رقم الجهاز إلى مسؤول التفعيل، ثم اختر ملف <b>.efc-license</b> الذي تم إنشاؤه لهذا الجهاز. لا يحتاج التفعيل إلى إنترنت.</p><div id="efcLicenseMessage"></div></div></section>`;
  document.body.appendChild(overlay);
  const app=document.getElementById('app');
  if(app)app.inert=true;

  const reason=overlay.querySelector('#efcLicenseReason');
  const deviceInput=overlay.querySelector('#efcLicenseDevice');
  const copyButton=overlay.querySelector('#efcLicenseCopy');
  const installButton=overlay.querySelector('#efcLicenseInstall');
  const refreshButton=overlay.querySelector('#efcLicenseRefresh');
  const message=overlay.querySelector('#efcLicenseMessage');
  let deviceId='';
  let busy=false;
  let watchTimer=null;

  function setBusy(value){busy=value;installButton.disabled=value;refreshButton.disabled=value;copyButton.disabled=value||!deviceId;}
  function setReason(text){reason.textContent=text||'يجب تفعيل هذا الجهاز قبل استخدام النظام.';}
  function setMessage(text,ok=false){message.className=text?(ok?'efc-license-success-v8':'efc-license-error-v8'):'';message.textContent=text||'';}
  function unlock(status){
    window.EFC_LICENSE_STATUS=status;
    if(app)app.inert=false;
    overlay.remove();
    if(watchTimer)clearInterval(watchTimer);
    watchTimer=setInterval(async()=>{
      try{const next=await invoke('get_license_status');window.EFC_LICENSE_STATUS=next;if(!next?.valid){clearInterval(watchTimer);location.reload();}}catch{location.reload();}
    },30000);
  }

  async function loadDevice(){
    try{deviceId=await invoke('get_license_device_id');deviceInput.value=deviceId;copyButton.disabled=busy||!deviceId;}
    catch(error){deviceInput.value='تعذر استخراج رقم الجهاز';setReason(String(error||'تعذر استخراج رقم الجهاز. تواصل مع الدعم.'));}
  }

  async function refresh(){
    setBusy(true);setMessage('');
    try{
      const status=await invoke('get_license_status');
      window.EFC_LICENSE_STATUS=status;
      if(status?.valid){unlock(status);return;}
      setReason(status?.reason||'يجب تفعيل هذا الجهاز قبل استخدام النظام.');
    }catch(error){setReason(String(error||'تعذر التحقق من التفعيل.'));}
    finally{setBusy(false);}
  }

  copyButton.onclick=async()=>{
    if(!deviceId)return;
    try{await navigator.clipboard.writeText(deviceId);}catch{deviceInput.select();document.execCommand('copy');}
    setMessage('تم نسخ رقم الجهاز.',true);
  };
  refreshButton.onclick=refresh;
  installButton.onclick=async()=>{
    if(busy)return;
    setBusy(true);setMessage('');
    try{
      const installed=await invoke('install_license_file');
      if(!installed)return;
      setMessage('تم تثبيت ملف التفعيل بنجاح. جاري فتح النظام…',true);
      const status=await invoke('get_license_status');
      if(!status?.valid)throw new Error(status?.reason||'تعذر اعتماد ملف التفعيل.');
      window.EFC_LICENSE_STATUS=status;
      setTimeout(()=>location.reload(),350);
    }catch(error){setMessage(String(error||'تعذر تثبيت ملف التفعيل.'));}
    finally{setBusy(false);}
  };

  loadDevice();
  refresh();
  window.EFC_LICENSE_GATE_V8=Object.freeze({offline:true,deviceBound:true,signedFiles:true,temporaryWatch:true});
})();
