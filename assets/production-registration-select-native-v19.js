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

function installPlaceholder(select,label,{required=false,preserveValue=false}={}){
  if(!select)return;
  unwrapOldOverlay(select);
  const previous=preserveValue?String(select.value||''):'';
  [...select.options].filter(option=>String(option.value||'')==='').forEach(option=>option.remove());
  const placeholder=new Option(label,'',!previous,!previous);
  placeholder.disabled=true;
  placeholder.dataset.efcNativePlaceholder='1';
  select.insertBefore(placeholder,select.firstChild);
  if(previous&&[...select.options].some(option=>String(option.value)===previous)){select.value=previous;select.dataset.efcPlaceholderActive='0';}
  else{select.value='';select.selectedIndex=0;select.dataset.efcPlaceholderActive='1';}
  select.required=required;

  if(select.dataset.efcNativePlaceholderBound==='1')return;
  select.dataset.efcNativePlaceholderBound='1';
  const currentPlaceholder=()=>select.querySelector('option[data-efc-native-placeholder="1"]');
  const detach=()=>{
    const current=currentPlaceholder();
    if(select.value||!current)return;
    current.remove();
    select.selectedIndex=-1;
    select.dataset.efcPlaceholderActive='0';
  };
  const restore=()=>{
    if(select.value)return;
    let current=currentPlaceholder();
    if(!current){
      current=new Option(select.dataset.efcPlaceholderLabel||label,'',true,true);
      current.disabled=true;
      current.dataset.efcNativePlaceholder='1';
      select.insertBefore(current,select.firstChild);
    }
    current.selected=true;
    select.selectedIndex=0;
    select.dataset.efcPlaceholderActive='1';
  };
  const sync=()=>{if(select.value)select.dataset.efcPlaceholderActive='0';else restore();};
  select.dataset.efcPlaceholderLabel=label;
  select.addEventListener('pointerdown',detach);
  select.addEventListener('mousedown',detach);
  select.addEventListener('keydown',event=>{if(!select.value&&['ArrowDown','ArrowUp','Enter',' ','F4'].includes(event.key))detach();});
  select.addEventListener('change',sync);
  select.addEventListener('blur',()=>setTimeout(sync,0));
}

function restoreEditPaymentMethod(method){
  const session=window.EFC_REGISTRATION_EDIT_V17?.current?.();
  const payment=session?.paymentIndex===null||session?.paymentIndex===undefined?null:session.student?.payments?.[Number(session.paymentIndex)];
  const existing=String(payment?.[2]||'').trim();
  if(!method||!existing)return;
  if(![...method.options].some(option=>String(option.value)===existing))method.add(new Option(existing,existing));
  method.value=existing;
}

let activeBlueHost=null;
function closeBlueList(host=activeBlueHost){
  if(!host)return;
  host.classList.remove('is-open-v19');
  host.querySelector('.efc-blue-select-trigger-v19')?.setAttribute('aria-expanded','false');
  if(activeBlueHost===host)activeBlueHost=null;
}
function syncBlueList(select){
  const host=select?.closest?.('.efc-blue-select-v19');if(!host)return;
  const trigger=host.querySelector('.efc-blue-select-trigger-v19'),selected=select.selectedOptions?.[0],empty=!String(select.value||'');
  trigger.textContent=empty?String(select.dataset.efcPlaceholderLabel||'اختر'):String(selected?.textContent||select.value||'');
  trigger.classList.toggle('is-placeholder-v19',empty);
  trigger.disabled=Boolean(select.disabled);
  trigger.setAttribute('aria-expanded',host.classList.contains('is-open-v19')?'true':'false');
  if(!empty)trigger.classList.remove('is-invalid-v19');
}
function buildBlueList(select,host){
  const menu=host.querySelector('.efc-blue-select-menu-v19');menu.textContent='';
  [...select.options].filter(option=>!option.disabled&&!option.hidden&&String(option.value||'')).forEach(option=>{
    const item=document.createElement('button');item.type='button';item.className='efc-blue-select-option-v19';item.setAttribute('role','option');item.textContent=String(option.textContent||option.value);
    const selected=String(option.value)===String(select.value);item.classList.toggle('is-selected-v19',selected);item.setAttribute('aria-selected',selected?'true':'false');
    item.onclick=()=>{select.value=String(option.value);select.dataset.efcPlaceholderActive='0';select.setCustomValidity('');select.dispatchEvent(new Event('input',{bubbles:true}));select.dispatchEvent(new Event('change',{bubbles:true}));closeBlueList(host);syncBlueList(select);};
    menu.appendChild(item);
  });
}
function openBlueList(select,host){
  if(select.disabled)return;
  if(activeBlueHost&&activeBlueHost!==host)closeBlueList(activeBlueHost);
  buildBlueList(select,host);host.classList.add('is-open-v19');activeBlueHost=host;syncBlueList(select);
}
function installBlueList(select,label){
  if(!select)return;
  if(select.dataset.efcBlueListBound==='1'){syncBlueList(select);return;}
  select.dataset.efcBlueListBound='1';select.dataset.efcPlaceholderLabel=select.dataset.efcPlaceholderLabel||label;select.classList.add('efc-blue-list-native-v19');select.tabIndex=-1;
  const host=document.createElement('span');host.className='efc-blue-select-v19';select.parentNode.insertBefore(host,select);host.appendChild(select);
  const trigger=document.createElement('button');trigger.type='button';trigger.className='efc-blue-select-trigger-v19';trigger.setAttribute('aria-haspopup','listbox');trigger.setAttribute('aria-expanded','false');
  const menu=document.createElement('span');menu.className='efc-blue-select-menu-v19';menu.setAttribute('role','listbox');
  host.append(trigger,menu);
  trigger.onclick=event=>{event.preventDefault();host.classList.contains('is-open-v19')?closeBlueList(host):openBlueList(select,host);};
  trigger.onkeydown=event=>{if(['ArrowDown','ArrowUp','Enter',' '].includes(event.key)){event.preventDefault();openBlueList(select,host);queueMicrotask(()=>host.querySelector('.efc-blue-select-option-v19.is-selected-v19,.efc-blue-select-option-v19')?.focus());}};
  select.addEventListener('change',()=>syncBlueList(select));
  select.addEventListener('invalid',event=>{event.preventDefault();trigger.classList.add('is-invalid-v19');trigger.focus();});
  host.addEventListener('focusout',event=>{if(event.relatedTarget instanceof Node&&host.contains(event.relatedTarget))return;closeBlueList(host);});
  syncBlueList(select);
}
document.addEventListener('pointerdown',event=>{if(activeBlueHost&&event.target instanceof Node&&!activeBlueHost.contains(event.target))closeBlueList(activeBlueHost);},true);
document.addEventListener('keydown',event=>{if(event.key==='Escape')closeBlueList();},true);
window.EFC_SYNC_REGISTRATION_SELECTS_V19=()=>document.querySelectorAll('select.efc-blue-list-native-v19').forEach(syncBlueList);

function enhance(){
  const form=document.getElementById('regFormV13');
  if(!form)return;
  const branch=form.elements.branch;
  const specialty=form.elements.specialty;
  const method=form.elements.method;
  const paid=form.elements.paid;
  const editing=Boolean(window.EFC_REGISTRATION_EDIT_V17?.active?.());
  if(editing)restoreEditPaymentMethod(method);
  installPlaceholder(branch,'اختر المركز',{required:true,preserveValue:editing});
  installPlaceholder(specialty,'اختر الدورة',{required:true,preserveValue:editing});
  installPlaceholder(method,'اختر وسيلة الدفع',{preserveValue:editing});
  installBlueList(branch,'اختر المركز');
  installBlueList(specialty,'اختر الدورة');
  installBlueList(method,'اختر وسيلة الدفع');
  const mirror=document.getElementById('efcScheduleCourseMirrorV15');
  installBlueList(mirror,'اختر الدورة');
  if(mirror&&form.dataset.efcBlueMirrorSync!=='1'){
    form.dataset.efcBlueMirrorSync='1';
    specialty?.addEventListener('change',()=>syncBlueList(mirror));
    mirror.addEventListener('change',()=>syncBlueList(specialty));
  }

  const syncMethodRequired=()=>{if(method&&!method.disabled)method.required=Number(paid?.value||0)>0;};
  paid?.addEventListener('input',syncMethodRequired);
  syncMethodRequired();

  if(form.dataset.efcNativePlaceholderReset!=='1'){
    form.dataset.efcNativePlaceholderReset='1';
    form.addEventListener('reset',()=>queueMicrotask(()=>{
      if(window.EFC_REGISTRATION_EDIT_V17?.active?.())return;
      installPlaceholder(branch,'اختر المركز',{required:true});
      installPlaceholder(specialty,'اختر الدورة',{required:true});
      installPlaceholder(method,'اختر وسيلة الدفع');
      window.EFC_SYNC_REGISTRATION_SELECTS_V19?.();
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
body.efc-registration-redesign-v15 .efc-blue-select-v19{position:relative;display:block;width:100%;min-width:0;height:48px;z-index:2}
body.efc-registration-redesign-v15 .efc-blue-select-v19.is-open-v19{z-index:120}
body.efc-registration-redesign-v15 .efc-blue-select-v19>.efc-blue-list-native-v19{position:absolute!important;inset:0!important;width:100%!important;height:100%!important;opacity:0!important;pointer-events:none!important;margin:0!important}
body.efc-registration-redesign-v15 .efc-blue-select-trigger-v19{width:100%;height:100%;border:1px solid #cbd9d4;border-radius:10px;background:#fff;color:#17352d;padding:8px 13px;font:600 14px "Segoe UI Variable","Segoe UI",Tahoma,Arial,sans-serif;text-align:right;cursor:pointer;box-shadow:0 2px 8px rgba(11,71,54,.03)}
body.efc-registration-redesign-v15 .efc-blue-select-trigger-v19::after{content:"⌄";float:left;color:#45665c;font-size:14px}
body.efc-registration-redesign-v15 .efc-blue-select-trigger-v19.is-placeholder-v19{color:#9aa8a3}
body.efc-registration-redesign-v15 .efc-blue-select-trigger-v19:focus{outline:0;border-color:#128264;box-shadow:0 0 0 3px rgba(18,130,100,.10)}
body.efc-registration-redesign-v15 .efc-blue-select-trigger-v19.is-invalid-v19{border-color:#c61a1a;box-shadow:0 0 0 3px rgba(198,26,26,.10)}
body.efc-registration-redesign-v15 .efc-blue-select-trigger-v19:disabled{cursor:not-allowed;opacity:.55;background:#f3f5f4}
body.efc-registration-redesign-v15 .efc-blue-select-menu-v19{display:none;position:absolute;top:calc(100% + 4px);right:0;left:0;max-height:240px;overflow:auto;padding:4px;background:#fff;border:1px solid #bed0c9;border-radius:9px;box-shadow:0 14px 34px rgba(11,58,45,.20)}
body.efc-registration-redesign-v15 .efc-blue-select-v19.is-open-v19 .efc-blue-select-menu-v19{display:block}
body.efc-registration-redesign-v15 .efc-blue-select-option-v19{display:block;width:100%;min-height:36px;border:0;border-radius:6px;background:#fff;color:#17352d;padding:7px 10px;font:600 12px "Segoe UI Variable","Segoe UI",Tahoma,Arial,sans-serif;text-align:right;cursor:pointer}
body.efc-registration-redesign-v15 .efc-blue-select-option-v19:hover,
body.efc-registration-redesign-v15 .efc-blue-select-option-v19:focus,
body.efc-registration-redesign-v15 .efc-blue-select-option-v19.is-selected-v19{outline:0;background:#1469ad!important;color:#fff!important}
body.efc-registration-redesign-v15 .efc-schedule-course-mirror-v15 .efc-blue-select-v19{width:122px;height:42px}
@media(max-width:1260px){body.efc-registration-redesign-v15 .registration-fields-v13 .efc-blue-select-v19{height:42px}body.efc-registration-redesign-v15 .efc-schedule-course-mirror-v15 .efc-blue-select-v19{width:108px}}
@media(max-height:760px){body.efc-registration-redesign-v15 .registration-fields-v13 .efc-blue-select-v19{height:38px}}
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
  preservesReceiptEditSelections:true,
  preservesInactiveReceiptPaymentMethod:true,
  consistentBlueOptionHover:true,
  nativePopupAvoidedForRegistrationLists:true,
  mainUntouched:true
});
})();
