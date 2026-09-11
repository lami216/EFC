(async()=>{
'use strict';
if(window.EFC_REGISTRATION_SELECT_NATIVE_V19?.ready)return;
const waitUntil=async(check,timeout=15000)=>{const start=Date.now();while(!check()){if(Date.now()-start>timeout)throw new Error('Registration select native placeholder v19 timed out waiting for schedule matrix v17.');await new Promise(resolve=>setTimeout(resolve,20));}};
await waitUntil(()=>window.EFC_REGISTRATION_SCHEDULE_MATRIX_V17?.ready&&typeof window.renderRegister==='function');

const baseRenderRegister=window.renderRegister;

function unwrapOldOverlay(select){
  const wrap=select?.closest?.('.efc-select-wrap-v18');
  if(!wrap)return;
  wrap.parentNode.insertBefore(select,wrap);
  wrap.remove();
}

function installPlaceholder(select,label,{required=false}={}){
  if(!select)return;
  unwrapOldOverlay(select);
  [...select.options].filter(option=>String(option.value||'')==='').forEach(option=>option.remove());
  const placeholder=new Option(label,'',true,true);
  placeholder.disabled=true;
  placeholder.dataset.efcNativePlaceholder='1';
  select.insertBefore(placeholder,select.firstChild);
  select.value='';
  select.selectedIndex=0;
  select.required=required;
  select.dataset.efcPlaceholderActive='1';

  const detach=()=>{
    if(select.value||!placeholder.isConnected)return;
    placeholder.remove();
    select.selectedIndex=-1;
    select.dataset.efcPlaceholderActive='0';
  };
  const restore=()=>{
    if(select.value)return;
    if(!placeholder.isConnected)select.insertBefore(placeholder,select.firstChild);
    placeholder.selected=true;
    select.selectedIndex=0;
    select.dataset.efcPlaceholderActive='1';
  };
  const sync=()=>{
    if(select.value)select.dataset.efcPlaceholderActive='0';
    else restore();
  };

  select.onpointerdown=detach;
  select.onmousedown=detach;
  select.onkeydown=event=>{
    if(!select.value&&['ArrowDown','ArrowUp','Enter',' ','F4'].includes(event.key))detach();
  };
  select.onchange=sync;
  select.onblur=()=>setTimeout(sync,0);
}

function enhance(){
  const form=document.getElementById('regFormV13');
  if(!form)return;
  const branch=form.elements.branch;
  const specialty=form.elements.specialty;
  const method=form.elements.method;
  const paid=form.elements.paid;
  installPlaceholder(branch,'اختر المركز',{required:true});
  installPlaceholder(specialty,'اختر الدورة',{required:true});
  installPlaceholder(method,'اختر وسيلة الدفع');

  const syncMethodRequired=()=>{if(method)method.required=Number(paid?.value||0)>0;};
  paid?.addEventListener('input',syncMethodRequired);
  syncMethodRequired();

  if(form.dataset.efcNativePlaceholderReset!=='1'){
    form.dataset.efcNativePlaceholderReset='1';
    form.addEventListener('reset',()=>queueMicrotask(()=>{
      installPlaceholder(branch,'اختر المركز',{required:true});
      installPlaceholder(specialty,'اختر الدورة',{required:true});
      installPlaceholder(method,'اختر وسيلة الدفع');
      syncMethodRequired();
      specialty?.dispatchEvent(new Event('change',{bubbles:true}));
    }));
  }
}

window.renderRegister=function(){
  baseRenderRegister();
  enhance();
};

enhance();

const style=document.createElement('style');
style.id='efc-registration-select-native-style-v19';
style.textContent=`
body.efc-registration-redesign-v15 #regFormV13 select[data-efc-placeholder-active="1"]{color:#9aa8a3!important;font-weight:600!important}
body.efc-registration-redesign-v15 #regFormV13 select[data-efc-placeholder-active="0"]{color:#17352d!important}
`;
document.head.appendChild(style);

window.EFC_REGISTRATION_SELECT_NATIVE_V19=Object.freeze({
  ready:true,
  visibleClosedPlaceholder:true,
  placeholderRemovedBeforeOptionList:true,
  noDefaultSelection:true,
  center:true,
  course:true,
  paymentMethod:true,
  mainUntouched:true
});
})();
