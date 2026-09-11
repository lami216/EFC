(()=>{
'use strict';
if(window.EFC_REGISTRATION_SELECT_PLACEHOLDERS_V18?.ready)return;
if(!window.EFC_REGISTRATION_SCHEDULE_MATRIX_V17?.ready)throw new Error('Registration select placeholders v18 loaded before schedule matrix v17.');

const baseRenderRegister=window.renderRegister;

function applyPlaceholder(select,label,{required=false}={}){
  if(!select)return;
  [...select.options].filter(option=>String(option.value||'')==='').forEach(option=>option.remove());
  const placeholder=new Option(label,'',true,true);
  placeholder.disabled=true;
  placeholder.hidden=true;
  placeholder.defaultSelected=true;
  placeholder.dataset.efcVisualPlaceholder='1';
  select.insertBefore(placeholder,select.firstChild);
  select.value='';
  select.selectedIndex=0;
  if(required)select.required=true;
  const sync=()=>select.classList.toggle('efc-select-placeholder-v18',!select.value);
  if(select.dataset.efcPlaceholderBound!=='1'){
    select.dataset.efcPlaceholderBound='1';
    select.addEventListener('change',sync);
  }
  sync();
}

function enhance(){
  const form=document.getElementById('regFormV13');
  if(!form)return;
  const branch=form.elements.branch;
  const specialty=form.elements.specialty;
  const method=form.elements.method;
  applyPlaceholder(branch,'اختر المركز',{required:true});
  applyPlaceholder(specialty,'اختر الدورة',{required:true});
  applyPlaceholder(method,'اختر وسيلة الدفع');

  if(form.dataset.efcVisualPlaceholdersReset!=='1'){
    form.dataset.efcVisualPlaceholdersReset='1';
    form.addEventListener('reset',()=>queueMicrotask(()=>{
      applyPlaceholder(branch,'اختر المركز',{required:true});
      applyPlaceholder(specialty,'اختر الدورة',{required:true});
      applyPlaceholder(method,'اختر وسيلة الدفع');
    }));
  }
}

window.renderRegister=function(){
  baseRenderRegister();
  enhance();
};

const style=document.createElement('style');
style.id='efc-registration-select-placeholders-style-v18';
style.textContent=`
body.efc-registration-redesign-v15 #regFormV13 select.efc-select-placeholder-v18{color:#9aa8a3!important;font-weight:600!important}
body.efc-registration-redesign-v15 #regFormV13 select:not(.efc-select-placeholder-v18){color:#17352d!important}
`;
document.head.appendChild(style);

window.EFC_REGISTRATION_SELECT_PLACEHOLDERS_V18=Object.freeze({
  ready:true,
  visiblePlaceholderText:true,
  placeholderHiddenFromOptions:true,
  noDefaultSelections:true,
  centerPlaceholder:true,
  coursePlaceholder:true,
  paymentMethodPlaceholder:true,
  mainUntouched:true
});
})();
