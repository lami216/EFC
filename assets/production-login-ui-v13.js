(()=>{
'use strict';
if(window.EFC_LOGIN_UI_V13?.ready)return;
if(!window.EFC_SECURITY_UI_V13?.ready)throw new Error('Login UI v13 loaded before security UI.');

const PIN_SELECTOR='.login-overlay-v13 input[name="pin"]';
function renderMask(input){const value=String(input.dataset.realPin||'').slice(0,4);input.dataset.realPin=value;input.value='*'.repeat(value.length);try{input.setSelectionRange(input.value.length,input.value.length);}catch{}}
function prepare(input){
  if(!(input instanceof HTMLInputElement)||!input.matches(PIN_SELECTOR)||input.dataset.starMaskV13==='1')return;
  const initial=String(input.value||'').replace(/\D/g,'').slice(0,4);
  input.dataset.starMaskV13='1';input.dataset.realPin=initial;input.type='text';input.inputMode='numeric';input.autocomplete='off';renderMask(input);
  const form=input.form;if(form&&form.dataset.starPinFormV13!=='1'){form.dataset.starPinFormV13='1';form.addEventListener('formdata',event=>{const pin=form.querySelector(PIN_SELECTOR);if(pin?.dataset.starMaskV13==='1')event.formData.set('pin',String(pin.dataset.realPin||''));});}
}
function targetInput(event){const input=event.target instanceof HTMLInputElement?event.target:null;if(input?.matches(PIN_SELECTOR)){prepare(input);return input;}return null;}

document.addEventListener('focusin',event=>{targetInput(event);},true);
document.addEventListener('keydown',event=>{
  const input=targetInput(event);if(!input)return;
  const current=String(input.dataset.realPin||'');
  if(/^\d$/.test(event.key)){event.preventDefault();if(current.length<4){input.dataset.realPin=current+event.key;renderMask(input);}return;}
  if(event.key==='Backspace'||event.key==='Delete'){event.preventDefault();input.dataset.realPin=current.slice(0,-1);renderMask(input);return;}
  if(['Tab','Shift','Control','Alt','Meta','ArrowLeft','ArrowRight','Home','End','Enter'].includes(event.key))return;
  event.preventDefault();
},true);
document.addEventListener('paste',event=>{const input=targetInput(event);if(!input)return;event.preventDefault();const digits=String(event.clipboardData?.getData('text')||'').replace(/\D/g,'').slice(0,4);input.dataset.realPin=digits;renderMask(input);},true);
document.addEventListener('drop',event=>{if(targetInput(event))event.preventDefault();},true);
document.querySelectorAll(PIN_SELECTOR).forEach(prepare);

const style=document.createElement('style');style.textContent=`
.login-card-v13{transform:none!important;transform-origin:center!important;width:min(560px,92vw)!important;padding:34px 36px!important;border-radius:20px!important;box-shadow:0 18px 58px #17332b24!important}.login-card-v13 img{width:92px!important;height:72px!important}.login-card-v13 h1{font-size:27px!important;line-height:1.35!important;margin:11px 0 7px!important}.login-card-v13>p{font-size:13px!important;margin:0 0 18px!important}.login-card-v13 form{gap:13px!important}.login-card-v13 form label{font-size:12px!important;gap:8px!important}.login-card-v13 .input,.login-card-v13 select{min-height:48px!important;font-size:14px!important;padding:10px 12px!important}.login-card-v13 .pin-v13{font-size:32px!important;letter-spacing:10px!important;font-weight:900!important;text-align:center!important;direction:ltr!important;font-family:Tahoma,Arial,sans-serif!important}.login-card-v13 form>.button{min-height:46px!important;font-size:13px!important}.login-links-v13{margin-top:13px!important;gap:16px!important}.login-links-v13 button{font-size:11px!important;padding:4px 6px!important}@media(max-width:620px){.login-card-v13{width:min(520px,94vw)!important;padding:26px!important}.login-card-v13 h1{font-size:23px!important}}
`;document.head.appendChild(style);
window.EFC_LOGIN_UI_V13=Object.freeze({ready:true,normalReadableSize:true,largerLoginCard:true,oldHalfScaleOverridden:true,pinStars:true,pinDigitsNotDisplayed:true,noBackgroundImage:true});
})();