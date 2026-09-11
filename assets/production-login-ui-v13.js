(()=>{
'use strict';
if(window.EFC_LOGIN_UI_V13?.ready)return;
if(!window.EFC_SECURITY_UI_V13?.ready)throw new Error('Login UI v13 loaded before security UI.');

const PIN_SELECTOR='.login-overlay-v13 input[name="pin"]';
const APP_VERSION='1.1.0';
const icon=(body,viewBox='0 0 24 24')=>`<svg viewBox="${viewBox}" aria-hidden="true" focusable="false"><g fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">${body}</g></svg>`;
const ICONS={
  user:icon('<circle cx="12" cy="8" r="3.5"/><path d="M5 20c.8-4.1 3.1-6.2 7-6.2s6.2 2.1 7 6.2"/>'),
  lock:icon('<rect x="5" y="10" width="14" height="10" rx="2"/><path d="M8.5 10V7.5a3.5 3.5 0 0 1 7 0V10M12 14v2"/>'),
  eye:icon('<path d="M2.8 12s3.4-5.2 9.2-5.2S21.2 12 21.2 12 17.8 17.2 12 17.2 2.8 12 2.8 12Z"/><circle cx="12" cy="12" r="2.2"/>'),
  eyeOff:icon('<path d="m4 4 16 16M9.9 7a9 9 0 0 1 2.1-.2c5.8 0 9.2 5.2 9.2 5.2a15.7 15.7 0 0 1-3 3.5M14.1 17a9 9 0 0 1-2.1.2C6.2 17.2 2.8 12 2.8 12a15.5 15.5 0 0 1 3-3.5M10.4 10.4a2.2 2.2 0 0 0 3.2 3.2"/>'),
  enter:icon('<path d="M10 7 5 12l5 5M5 12h12M15 5h3a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2h-3"/>'),
  recovery:icon('<path d="M20 6v5h-5M19 11a7 7 0 1 0 1 4"/>'),
  key:icon('<rect x="5" y="10" width="14" height="10" rx="2"/><path d="M8.5 10V7.5a3.5 3.5 0 0 1 7 0V10M12 14v2"/>'),
  info:icon('<circle cx="12" cy="12" r="9"/><path d="M12 11v5M12 8h.01"/>')
};

function isRevealed(input){return input?.dataset.revealPinV15==='1';}
function renderPin(input){
  const value=String(input.dataset.realPin||'').slice(0,4);
  input.dataset.realPin=value;
  input.value=isRevealed(input)?value:'*'.repeat(value.length);
  try{input.setSelectionRange(input.value.length,input.value.length);}catch{}
}
function prepare(input){
  if(!(input instanceof HTMLInputElement)||!input.matches(PIN_SELECTOR)||input.dataset.starMaskV13==='1')return;
  const initial=String(input.value||'').replace(/\D/g,'').slice(0,4);
  input.dataset.starMaskV13='1';input.dataset.realPin=initial;input.type='text';input.inputMode='numeric';input.autocomplete='off';renderPin(input);
  const form=input.form;if(form&&form.dataset.starPinFormV13!=='1'){form.dataset.starPinFormV13='1';form.addEventListener('formdata',event=>{const pin=form.querySelector(PIN_SELECTOR);if(pin?.dataset.starMaskV13==='1')event.formData.set('pin',String(pin.dataset.realPin||''));});}
}
function targetInput(event){const input=event.target instanceof HTMLInputElement?event.target:null;if(input?.matches(PIN_SELECTOR)){prepare(input);return input;}return null;}

document.addEventListener('focusin',event=>{targetInput(event);},true);
document.addEventListener('keydown',event=>{
  const input=targetInput(event);if(!input)return;
  const current=String(input.dataset.realPin||'');
  if(/^\d$/.test(event.key)){event.preventDefault();if(current.length<4){input.dataset.realPin=current+event.key;renderPin(input);}return;}
  if(event.key==='Backspace'||event.key==='Delete'){event.preventDefault();input.dataset.realPin=current.slice(0,-1);renderPin(input);return;}
  if(['Tab','Shift','Control','Alt','Meta','ArrowLeft','ArrowRight','Home','End','Enter'].includes(event.key))return;
  event.preventDefault();
},true);
document.addEventListener('paste',event=>{const input=targetInput(event);if(!input)return;event.preventDefault();const digits=String(event.clipboardData?.getData('text')||'').replace(/\D/g,'').slice(0,4);input.dataset.realPin=digits;renderPin(input);},true);
document.addEventListener('drop',event=>{if(targetInput(event))event.preventDefault();},true);

function ensureOverlayShell(overlay){
  if(overlay.dataset.efcRedesignShellV15==='1')return;
  overlay.dataset.efcRedesignShellV15='1';
  overlay.classList.add('efc-login-redesign-v15');
  const geometry=document.createElement('div');geometry.className='efc-login-geometry-v15';geometry.setAttribute('aria-hidden','true');geometry.innerHTML='<i></i><i></i><i></i><i></i>';overlay.prepend(geometry);
  const brand=document.createElement('div');brand.className='efc-login-top-brand-v15';brand.innerHTML='<span>مركز EFC للغات والمعلوماتية</span><img src="./efc-logo.svg" alt="">';overlay.appendChild(brand);
  const slogan=document.createElement('aside');slogan.className='efc-login-slogan-v15';slogan.innerHTML='<strong>معرفة<br>تبني<br>المستقبل</strong><span></span>';overlay.appendChild(slogan);
  const copyright=document.createElement('div');copyright.className='efc-login-copyright-v15';copyright.textContent=`جميع الحقوق محفوظة © ${new Date().getFullYear()} EFC`;overlay.appendChild(copyright);
  const version=document.createElement('div');version.className='efc-login-version-v15';version.innerHTML=`${ICONS.info}<span>إصدار النظام ${APP_VERSION}</span>`;overlay.appendChild(version);
}

function labelField(label,input,type){
  if(label.dataset.efcLoginFieldV15==='1')return;
  label.dataset.efcLoginFieldV15='1';label.classList.add('efc-login-field-v15');label.dataset.fieldLabel=type==='username'?'اسم المستخدم *':'PIN *';
  input.placeholder=type==='username'?'اسم المستخدم':'••••';
  const fieldIcon=document.createElement('span');fieldIcon.className='efc-login-field-icon-v15';fieldIcon.innerHTML=type==='username'?ICONS.user:ICONS.lock;label.appendChild(fieldIcon);
  if(type==='pin'){
    const toggle=document.createElement('button');toggle.type='button';toggle.className='efc-login-pin-toggle-v15';toggle.setAttribute('aria-label','إظهار أو إخفاء رمز PIN');toggle.setAttribute('aria-pressed','false');toggle.innerHTML=ICONS.eyeOff;
    toggle.onclick=()=>{const next=!isRevealed(input);input.dataset.revealPinV15=next?'1':'0';toggle.setAttribute('aria-pressed',next?'true':'false');toggle.innerHTML=next?ICONS.eye:ICONS.eyeOff;renderPin(input);input.focus();};
    label.appendChild(toggle);
  }
}

function enhanceMainLogin(card){
  const form=card.querySelector('form'),username=form?.querySelector('input[name="username"]'),pin=form?.querySelector('input[name="pin"]'),links=card.querySelector('.login-links-v13');
  if(!form||!username||!pin||!links)return false;
  card.classList.add('efc-login-main-v15');
  const logo=card.querySelector(':scope>img');if(logo)logo.classList.add('efc-login-logo-v15');
  const h1=card.querySelector(':scope>h1');if(h1){h1.classList.add('efc-login-title-v15');h1.textContent='مركز EFC للغات والمعلوماتية';}
  const intro=card.querySelector(':scope>p');if(intro&&!intro.dataset.efcLoginIntroV15){intro.dataset.efcLoginIntroV15='1';intro.className='efc-login-intro-v15';intro.innerHTML='<strong>منصة الإدارة الموحدة لنظام المركز</strong><span>يرجى تسجيل الدخول للمتابعة إلى النظام</span>';}
  if(form.dataset.efcLoginFormV15!=='1'){
    form.dataset.efcLoginFormV15='1';form.classList.add('efc-login-form-v15');
    const labels=[...form.querySelectorAll(':scope>label')];labels.forEach(label=>{const input=label.querySelector('input');if(input===username)labelField(label,input,'username');else if(input===pin)labelField(label,input,'pin');});
    prepare(pin);
    const submit=form.querySelector('button[type="submit"],button:not([type])');if(submit){submit.classList.add('efc-login-submit-v15');submit.innerHTML=`<span>دخول</span>${ICONS.enter}`;}
  }
  if(!card.querySelector('.efc-login-divider-v15')){const divider=document.createElement('div');divider.className='efc-login-divider-v15';divider.innerHTML='<span></span><b>أو</b><span></span>';links.before(divider);}
  links.classList.add('efc-login-links-redesign-v15');
  const forgot=links.querySelector('#forgotV13'),reset=links.querySelector('#resetV13');
  if(forgot&&forgot.dataset.efcLoginLinkV15!=='1'){forgot.dataset.efcLoginLinkV15='1';forgot.innerHTML=`${ICONS.key}<span>نسيت رمز Admin ؟</span>`;}
  if(reset&&reset.dataset.efcLoginLinkV15!=='1'){reset.dataset.efcLoginLinkV15='1';reset.innerHTML=`${ICONS.recovery}<span>لدي كود إعادة التعيين</span>`;}
  return true;
}

function enhanceRecoveryCard(card){
  card.classList.add('efc-login-recovery-v15');
  const logo=card.querySelector(':scope>img');if(logo)logo.classList.add('efc-login-logo-v15');
  card.querySelectorAll('.button').forEach(button=>button.classList.add('efc-login-recovery-button-v15'));
}
function enhanceOverlay(overlay){
  if(!(overlay instanceof HTMLElement))return;
  ensureOverlayShell(overlay);
  const card=overlay.querySelector('.login-card-v13');if(!card)return;
  card.classList.add('efc-login-card-redesign-v15');
  if(!enhanceMainLogin(card))enhanceRecoveryCard(card);
}
function enhanceAll(){document.querySelectorAll('.login-overlay-v13').forEach(enhanceOverlay);document.querySelectorAll(PIN_SELECTOR).forEach(prepare);}
let enhanceQueued=false;
function queueEnhance(){if(enhanceQueued)return;enhanceQueued=true;requestAnimationFrame(()=>{enhanceQueued=false;enhanceAll();});}
const observer=new MutationObserver(queueEnhance);observer.observe(document.body,{childList:true,subtree:true});
enhanceAll();

const style=document.createElement('style');style.id='efc-login-redesign-style-v15';style.textContent=`
.login-overlay-v13.efc-login-redesign-v15{position:fixed;inset:0;z-index:2147483600;display:grid!important;grid-template-columns:minmax(120px,1fr) minmax(520px,640px) minmax(210px,1fr);align-items:center;justify-items:center;padding:76px 34px 68px!important;direction:rtl;font-family:Tahoma,Arial,sans-serif;overflow:hidden!important;background:radial-gradient(circle at 52% 36%,#effaf6 0,#f7fbf9 35%,#edf7f3 70%,#f7faf9 100%)!important;color:#0b4f3c}.efc-login-redesign-v15::before{content:"";position:absolute;inset:0;background:linear-gradient(130deg,transparent 0 12%,rgba(116,198,170,.08) 12% 26%,transparent 26% 60%,rgba(111,195,166,.07) 60% 76%,transparent 76%);pointer-events:none}.efc-login-redesign-v15::after{content:"";position:absolute;top:-110px;right:72px;width:360px;height:420px;border-radius:0 0 68px 68px;background:linear-gradient(160deg,rgba(157,222,200,.35),rgba(98,181,151,.18));transform:skewX(-20deg);pointer-events:none}.efc-login-geometry-v15{position:absolute;inset:0;pointer-events:none;overflow:hidden;z-index:0}.efc-login-geometry-v15 i{position:absolute;display:block;border-radius:42px;transform:rotate(35deg)}.efc-login-geometry-v15 i:nth-child(1){width:340px;height:540px;left:-176px;bottom:-86px;background:linear-gradient(180deg,rgba(28,143,107,.70),rgba(93,190,157,.33))}.efc-login-geometry-v15 i:nth-child(2){width:210px;height:420px;left:42px;bottom:-188px;background:rgba(87,178,147,.26)}.efc-login-geometry-v15 i:nth-child(3){width:160px;height:290px;right:315px;bottom:-132px;background:rgba(90,184,151,.20)}.efc-login-geometry-v15 i:nth-child(4){width:230px;height:390px;right:-126px;bottom:-140px;border:1.5px solid #e7b60d;background:rgba(255,255,255,.46)}.efc-login-top-brand-v15{position:absolute;top:16px;right:26px;z-index:2;display:flex;align-items:center;gap:9px;font-size:12px;font-weight:800;color:#173c31}.efc-login-top-brand-v15 img{width:26px;height:26px;object-fit:contain}.login-card-v13.efc-login-card-redesign-v15{grid-column:2;position:relative;z-index:3;width:min(632px,100%)!important;max-height:calc(100vh - 138px);overflow:auto;background:rgba(255,255,255,.92)!important;border:1px solid rgba(255,255,255,.88)!important;border-radius:24px!important;padding:24px 44px 30px!important;text-align:center!important;transform:none!important;box-shadow:0 24px 72px rgba(18,91,68,.11)!important;backdrop-filter:blur(12px);scrollbar-width:thin}.login-card-v13.efc-login-card-redesign-v15::-webkit-scrollbar{width:6px}.login-card-v13.efc-login-card-redesign-v15::-webkit-scrollbar-thumb{background:#c7ded5;border-radius:10px}.efc-login-logo-v15{display:block!important;width:112px!important;height:92px!important;object-fit:contain!important;margin:0 auto 8px!important}.login-card-v13 .efc-login-title-v15{position:relative;margin:0 0 20px!important;padding:13px 20px 17px!important;border:2px solid #13634d;border-radius:13px;background:linear-gradient(180deg,#f5fff9,#e7f8ee);box-shadow:0 7px 16px rgba(14,84,62,.14);font-size:29px!important;line-height:1.25!important;font-weight:900;color:#0a503c}.login-card-v13 .efc-login-title-v15::after{content:"";position:absolute;left:32%;right:32%;bottom:-3px;height:8px;border-radius:9px;background:#efc313;box-shadow:0 2px 8px rgba(215,169,0,.25)}.login-card-v13 .efc-login-intro-v15{display:grid!important;gap:8px;margin:0 0 19px!important;line-height:1.5}.efc-login-intro-v15 strong{font-size:17px;color:#173f34}.efc-login-intro-v15 span{font-size:14px;color:#70827d;font-weight:700}.login-card-v13 .efc-login-form-v15{display:grid!important;gap:13px!important;text-align:right!important}.efc-login-field-v15{position:relative;display:block!important;height:66px;gap:0!important;font-size:0!important}.efc-login-field-v15::before{content:attr(data-field-label);position:absolute;z-index:2;top:8px;right:58px;font-size:12px;line-height:1;color:#536b64;font-weight:800;pointer-events:none}.efc-login-field-v15 .input{height:66px!important;min-height:66px!important;border:1.5px solid #ccd9d4!important;border-radius:11px!important;background:rgba(255,255,255,.84)!important;padding:27px 58px 9px 52px!important;font-size:17px!important;font-weight:800!important;color:#0c4939!important;text-align:right;outline:none!important;box-shadow:inset 0 0 0 1px rgba(255,255,255,.6)}.efc-login-field-v15 .input:focus{border-color:#16745a!important;box-shadow:0 0 0 3px rgba(22,116,90,.10)!important}.efc-login-field-v15 .input::placeholder{color:#8a9994;font-size:14px;font-weight:600;opacity:.72}.efc-login-field-icon-v15{position:absolute;z-index:3;right:17px;top:50%;transform:translateY(-50%);width:25px;height:25px;color:#0c6049;pointer-events:none}.efc-login-field-icon-v15 svg,.efc-login-pin-toggle-v15 svg,.efc-login-submit-v15 svg,.efc-login-links-redesign-v15 svg,.efc-login-version-v15 svg{width:100%;height:100%;display:block}.login-card-v13 .pin-v13{font-size:25px!important;letter-spacing:7px!important;text-align:right!important;direction:ltr!important;font-family:Tahoma,Arial,sans-serif!important}.efc-login-pin-toggle-v15{position:absolute;z-index:4;left:14px;top:50%;transform:translateY(-50%);width:32px;height:32px;border:0;background:transparent;color:#60756f;cursor:pointer;padding:4px;border-radius:8px}.efc-login-pin-toggle-v15:hover{background:#ecf6f2;color:#0a5e47}.login-card-v13 .efc-login-submit-v15{min-height:62px!important;margin-top:2px!important;border:1px solid #e5b600!important;border-radius:11px!important;background:linear-gradient(180deg,#087357,#04523f)!important;color:#fff!important;font-size:22px!important;font-weight:900!important;box-shadow:0 8px 18px rgba(5,82,63,.14);display:flex!important;align-items:center;justify-content:center;gap:14px;cursor:pointer}.login-card-v13 .efc-login-submit-v15:hover{background:linear-gradient(180deg,#0a7e60,#065945)!important}.efc-login-submit-v15 svg{width:28px;height:28px}.efc-login-divider-v15{display:grid;grid-template-columns:1fr auto 1fr;align-items:center;gap:16px;margin:18px 0 12px;color:#71837d}.efc-login-divider-v15 span{height:1px;background:#d4ddda}.efc-login-divider-v15 b{font-size:15px}.login-links-v13.efc-login-links-redesign-v15{display:flex!important;align-items:center;justify-content:space-between!important;gap:18px!important;margin-top:0!important}.efc-login-links-redesign-v15 button{display:inline-flex!important;align-items:center;gap:7px;border:0!important;background:transparent!important;color:#0b5a45!important;font-size:12px!important;font-weight:800!important;padding:7px 2px!important;cursor:pointer}.efc-login-links-redesign-v15 button:hover{color:#d39e00!important}.efc-login-links-redesign-v15 svg{width:24px;height:24px}.login-card-v13 #loginMsgV13,.login-card-v13 #resetMsgV13{min-height:18px;margin-top:8px;color:#a23434;font-size:11px;font-weight:700}.efc-login-slogan-v15{grid-column:3;position:relative;z-index:2;justify-self:center;align-self:center;text-align:center;color:#0e674e;line-height:1.35}.efc-login-slogan-v15 strong{display:block;font-size:clamp(30px,2.4vw,45px);font-weight:500}.efc-login-slogan-v15 span{display:block;width:64px;height:5px;border-radius:6px;background:#198f6a;margin:28px auto 0;box-shadow:0 4px 12px rgba(25,143,106,.22)}.efc-login-copyright-v15,.efc-login-version-v15{position:absolute;bottom:22px;z-index:2;font-size:12px;color:#526963;font-weight:700}.efc-login-copyright-v15{left:32px}.efc-login-version-v15{right:32px;display:flex;align-items:center;gap:8px}.efc-login-version-v15 svg{width:20px;height:20px}.efc-login-recovery-v15{width:min(660px,92vw)!important}.efc-login-recovery-v15 h1{color:#0b553f}.efc-login-recovery-v15 .input{border-color:#c9d8d2!important}.efc-login-recovery-v15 .efc-login-recovery-button-v15{min-height:45px!important;font-size:12px!important}.recovery-code-v13{min-height:130px!important}.login-card-v13 img{object-fit:contain}.login-card-v13 form label{font-size:12px}.login-card-v13 form>.button{min-height:46px}.login-links-v13 button{font-family:inherit}
@media(max-width:1240px){.login-overlay-v13.efc-login-redesign-v15{grid-template-columns:minmax(40px,1fr) minmax(500px,620px) minmax(150px,220px);padding-left:22px;padding-right:22px}.efc-login-slogan-v15 strong{font-size:30px}.efc-login-slogan-v15 span{width:52px}.login-card-v13.efc-login-card-redesign-v15{padding-left:34px!important;padding-right:34px!important}}
@media(max-width:1040px){.login-overlay-v13.efc-login-redesign-v15{grid-template-columns:1fr;place-items:center;padding:70px 22px 66px!important}.login-card-v13.efc-login-card-redesign-v15{grid-column:1;width:min(610px,94vw)!important}.efc-login-slogan-v15{display:none}.efc-login-redesign-v15::after{right:-30px}.efc-login-geometry-v15 i:nth-child(3){display:none}}
@media(max-height:760px){.login-overlay-v13.efc-login-redesign-v15{padding-top:54px!important;padding-bottom:52px!important}.login-card-v13.efc-login-card-redesign-v15{max-height:calc(100vh - 104px);padding-top:18px!important;padding-bottom:20px!important}.efc-login-logo-v15{width:82px!important;height:64px!important}.login-card-v13 .efc-login-title-v15{font-size:23px!important;margin-bottom:13px!important;padding:10px 16px 13px!important}.login-card-v13 .efc-login-intro-v15{margin-bottom:12px!important;gap:4px}.efc-login-intro-v15 strong{font-size:14px}.efc-login-intro-v15 span{font-size:11px}.efc-login-field-v15,.efc-login-field-v15 .input{height:56px!important;min-height:56px!important}.efc-login-field-v15 .input{padding-top:23px!important}.login-card-v13 .efc-login-submit-v15{min-height:52px!important;font-size:18px!important}.efc-login-divider-v15{margin:12px 0 8px}}
`;document.head.appendChild(style);

window.EFC_LOGIN_UI_V13=Object.freeze({ready:true,normalReadableSize:true,largerLoginCard:true,oldHalfScaleOverridden:true,pinStars:true,pinDigitsNotDisplayed:true,noBackgroundImage:true,referenceRedesignV15:true,existingLogoReused:true,functionalRecoveryLinks:true,functionalPinReveal:true,responsiveLogin:true,mainUntouched:true});
})();