(()=>{
'use strict';
if(window.EFC_REGISTRATION_SELECT_OVERLAY_V18?.ready)return;
if(!window.EFC_REGISTRATION_SCHEDULE_MATRIX_V17?.ready)throw new Error('Registration select overlay v18 loaded before schedule matrix v17.');

const baseRenderRegister=window.renderRegister;

function ensureBlank(select){
  let blank=[...select.options].find(option=>String(option.value||'')==='');
  if(!blank){
    blank=new Option('','',true,true);
    select.insertBefore(blank,select.firstChild);
  }
  blank.textContent='';
  blank.disabled=true;
  blank.hidden=true;
  blank.selected=!select.value;
  blank.defaultSelected=true;
  return blank;
}

function enhanceSelect(select,text){
  if(!select)return;
  ensureBlank(select);

  let wrap=select.closest('.efc-select-wrap-v18');
  if(!wrap){
    wrap=document.createElement('span');
    wrap.className='efc-select-wrap-v18';
    select.parentNode.insertBefore(wrap,select);
    wrap.appendChild(select);
  }

  let placeholder=wrap.querySelector('.efc-select-overlay-v18');
  if(!placeholder){
    placeholder=document.createElement('span');
    placeholder.className='efc-select-overlay-v18';
    placeholder.setAttribute('aria-hidden','true');
    wrap.appendChild(placeholder);
  }
  placeholder.textContent=text;

  const sync=()=>{
    const empty=!String(select.value||'');
    wrap.classList.toggle('is-empty-v18',empty);
    placeholder.hidden=!empty;
  };

  if(select.dataset.efcOverlayPlaceholderBound!=='1'){
    select.dataset.efcOverlayPlaceholderBound='1';
    select.addEventListener('change',sync);
  }
  sync();
}

function enhance(){
  const form=document.getElementById('regFormV13');
  if(!form)return;
  enhanceSelect(form.elements.branch,'اختر المركز');
  enhanceSelect(form.elements.specialty,'اختر الدورة');
  enhanceSelect(form.elements.method,'اختر وسيلة الدفع');

  if(form.dataset.efcOverlayResetBound!=='1'){
    form.dataset.efcOverlayResetBound='1';
    form.addEventListener('reset',()=>queueMicrotask(()=>{
      enhanceSelect(form.elements.branch,'اختر المركز');
      enhanceSelect(form.elements.specialty,'اختر الدورة');
      enhanceSelect(form.elements.method,'اختر وسيلة الدفع');
    }));
  }
}

window.renderRegister=function(){
  baseRenderRegister();
  enhance();
};

const style=document.createElement('style');
style.id='efc-registration-select-overlay-style-v18';
style.textContent=`
body.efc-registration-redesign-v15 #regFormV13 .efc-select-wrap-v18{position:relative;display:block;width:100%}
body.efc-registration-redesign-v15 #regFormV13 .efc-select-wrap-v18>select{width:100%;color:#17352d!important}
body.efc-registration-redesign-v15 #regFormV13 .efc-select-overlay-v18{position:absolute;inset-inline-start:14px;inset-inline-end:34px;top:50%;transform:translateY(-50%);pointer-events:none;color:#9aa8a3;font-weight:600;font-size:inherit;line-height:1.2;text-align:right;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;z-index:2}
body.efc-registration-redesign-v15 #regFormV13 .efc-select-wrap-v18.is-empty-v18>select{color:transparent!important}
`;
document.head.appendChild(style);

window.EFC_REGISTRATION_SELECT_OVERLAY_V18=Object.freeze({
  ready:true,
  visiblePlaceholderOverlay:true,
  placeholderNotInOptionList:true,
  center:true,
  course:true,
  paymentMethod:true,
  mainUntouched:true
});
})();
