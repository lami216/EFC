(async()=>{
'use strict';
if(window.EFC_SIDEBAR_LOCK_V30?.ready)return;
const waitUntil=async(check,timeout=15000)=>{const start=Date.now();while(!check()){if(Date.now()-start>timeout)throw new Error('Sidebar lock v30 timed out.');await new Promise(resolve=>setTimeout(resolve,20));}};
await waitUntil(()=>window.EFC_UNIFIED_LAYOUT_V29?.ready&&window.EFC_COURSES_CENTERS_DETAIL_FIX_V27?.ready&&window.EFC_PERIOD_SEARCH_REDESIGN_V28?.ready&&typeof window.shell==='function');

const BRAND_HTML='<span>مركز EFC</span><span>للغات و المعلوماتية</span>';
function normalizeBrand(){
  const brand=document.querySelector('.shell.shell-v13 aside .brand');
  if(!brand)return;
  const title=brand.querySelector('b');
  if(title&&title.innerHTML!==BRAND_HTML)title.innerHTML=BRAND_HTML;
  const logo=brand.querySelector('.logo img');
  if(logo){
    if(logo.style.objectPosition!=='center center')logo.style.objectPosition='center center';
    if(logo.style.margin!=='auto')logo.style.margin='auto';
  }
}
const baseShell=window.shell;
window.shell=function(content){const result=baseShell(content);normalizeBrand();return result;};
normalizeBrand();

const style=document.createElement('style');
style.id='efc-sidebar-lock-style-v30';
style.textContent=`
/* Registration sidebar is the single source of truth on every page. */
html body .shell.shell-v13{min-width:0!important;min-height:100vh!important;overflow-x:hidden!important}
html body .shell.shell-v13 aside{
  position:fixed!important;top:0!important;right:0!important;bottom:0!important;
  width:clamp(230px,18vw,268px)!important;padding:22px 16px 18px!important;
  display:flex!important;flex-direction:column!important;box-sizing:border-box!important;
  background:linear-gradient(180deg,#075445 0%,#05473d 48%,#033d35 100%)!important;
  color:#fff!important;box-shadow:-10px 0 35px rgba(5,55,47,.08)!important;
  font-family:"Segoe UI Variable","Segoe UI",Tahoma,Arial,sans-serif!important;
}
html body .shell.shell-v13 main{
  margin-right:clamp(230px,18vw,268px)!important;width:calc(100% - clamp(230px,18vw,268px))!important;
  min-width:0!important;overflow-x:hidden!important;
}
html body .shell.shell-v13 aside .brand{
  display:flex!important;align-items:center!important;gap:11px!important;
  padding:0 3px 18px!important;border-bottom:1px solid rgba(255,255,255,.18)!important;box-sizing:border-box!important;
}
html body .shell.shell-v13 aside .brand .logo{
  width:50px!important;height:50px!important;min-width:50px!important;max-width:50px!important;flex:0 0 50px!important;
  padding:4px!important;border-radius:12px!important;background:#fff!important;display:grid!important;place-items:center!important;
  overflow:hidden!important;box-sizing:border-box!important;
}
html body .shell.shell-v13 aside .brand .logo img{
  width:42px!important;height:42px!important;max-width:42px!important;max-height:42px!important;
  padding:0!important;margin:auto!important;object-fit:contain!important;object-position:center center!important;transform:none!important;place-self:center!important;
}
html body .shell.shell-v13 aside .brand>div:last-child{min-width:0!important;display:block!important}
html body .shell.shell-v13 aside .brand b{
  display:grid!important;gap:1px!important;margin:0!important;line-height:1.22!important;color:#fff!important;text-align:right!important;
}
html body .shell.shell-v13 aside .brand b span:first-child{font-size:15.5px!important;font-weight:850!important}
html body .shell.shell-v13 aside .brand b span:last-child{font-size:13px!important;font-weight:800!important;white-space:nowrap!important}
html body .shell.shell-v13 aside .brand small{display:block!important;margin-top:3px!important;color:#b9d9cf!important;font-size:9px!important;line-height:1.3!important}
html body .shell.shell-v13 aside nav{display:grid!important;gap:5px!important;padding-top:18px!important;font-family:inherit!important}
html body .shell.shell-v13 aside nav a{
  display:flex!important;align-items:center!important;min-height:48px!important;padding:8px 13px!important;
  border:1px solid transparent!important;border-radius:11px!important;color:#e2f0eb!important;text-decoration:none!important;
  font-size:13.5px!important;font-weight:650!important;line-height:1.25!important;gap:11px!important;box-sizing:border-box!important;
}
html body .shell.shell-v13 aside nav a i{width:24px!important;height:24px!important;min-width:24px!important;max-width:24px!important;display:grid!important;place-items:center!important;font-style:normal!important;text-align:center!important}
html body .shell.shell-v13 aside nav a i svg{width:23px!important;height:23px!important}
html body .shell.shell-v13 aside nav a:hover{background:rgba(255,255,255,.08)!important;color:#fff!important}
html body .shell.shell-v13 aside nav a.active{background:linear-gradient(90deg,rgba(38,181,139,.26),rgba(255,255,255,.06))!important;color:#fff!important;border-color:rgba(93,216,179,.44)!important;box-shadow:inset 6px 0 #35c99a,0 8px 20px rgba(0,0,0,.08)!important}
html body .shell.shell-v13 aside .side-foot{margin-top:auto!important;border-top:1px solid rgba(255,255,255,.18)!important;padding-top:12px!important;display:grid!important;gap:7px!important}
html body .shell.shell-v13 aside .production-side-note{display:none!important}
html body .shell.shell-v13 aside .user-controls-v13{gap:7px!important;border:0!important;padding:0!important}
html body .shell.shell-v13 aside .user-controls-v13 small{font-size:10px!important;color:#d6eae3!important;text-align:center!important}
html body .shell.shell-v13 aside .user-controls-v13 button{min-height:42px!important;border:1px solid rgba(255,255,255,.24)!important;border-radius:11px!important;background:rgba(255,255,255,.04)!important;color:#fff!important;font-family:inherit!important;font-size:12.5px!important}
html body .efc-bell-v13{top:34px!important;left:22px!important;width:48px!important;height:48px!important;border-radius:13px!important;font-size:18px!important}
html body .efc-bell-v13>b{min-width:21px!important;height:21px!important;line-height:21px!important;font-size:10px!important}

/* Registration's sidebar-to-content breathing room, only on pages already redesigned. */
html body.efc-specialties-redesign-v23 .shell.shell-v13 main>.content,
html body.efc-period-redesign-v28 .shell.shell-v13 main>.content{margin-right:22px!important;margin-left:0!important}

/* Exact registration hero card treatment for the two redesigned pages; only icon/title content changes. */
html body.efc-specialties-redesign-v23 .page-title,
html body.efc-period-redesign-v28 .efc-period-hero-v28{
  position:relative!important;display:flex!important;align-items:center!important;justify-content:center!important;
  width:470px!important;min-width:470px!important;max-width:470px!important;
  height:76px!important;min-height:76px!important;max-height:76px!important;
  margin:0 auto 18px!important;padding:0!important;border:0!important;border-radius:17px!important;
  background:linear-gradient(135deg,#e4f8f0,#d4efe5)!important;
  box-shadow:0 10px 30px rgba(20,102,76,.05)!important;color:#073f35!important;box-sizing:border-box!important;
}
html body.efc-specialties-redesign-v23 .page-title>div{width:auto!important;display:flex!important;align-items:center!important;justify-content:center!important;gap:18px!important}
html body.efc-specialties-redesign-v23 .page-title h1,
html body.efc-period-redesign-v28 .efc-period-hero-v28 h1{margin:0!important;font-size:31px!important;line-height:1!important;font-weight:850!important;white-space:nowrap!important;letter-spacing:-.3px!important;color:#073f35!important}
html body.efc-specialties-redesign-v23 .efc-page-icon-v23,
html body.efc-period-redesign-v28 .efc-period-hero-v28>svg{display:grid!important;place-items:center!important;flex:0 0 42px!important;width:42px!important;height:42px!important;color:#073f35!important}
html body.efc-specialties-redesign-v23 .efc-page-icon-v23 svg,
html body.efc-period-redesign-v28 .efc-period-hero-v28>svg{width:42px!important;height:42px!important}
html body.efc-specialties-redesign-v23 .page-title::after,
html body.efc-period-redesign-v28 .efc-period-hero-v28::after{content:''!important;position:absolute!important;bottom:9px!important;left:50%!important;transform:translateX(-50%)!important;width:48px!important;height:3px!important;border-radius:6px!important;background:#0a7f62!important}

@media(max-width:1260px){html body .shell.shell-v13 aside{width:230px!important}html body .shell.shell-v13 main{margin-right:230px!important;width:calc(100% - 230px)!important}}
@media(max-width:1080px){html body .shell.shell-v13 aside{width:218px!important}html body .shell.shell-v13 main{margin-right:218px!important;width:calc(100% - 218px)!important}}
`;
document.head.appendChild(style);

const keepLast=()=>{const node=document.getElementById('efc-sidebar-lock-style-v30');if(node&&node!==document.head.lastElementChild)document.head.appendChild(node);normalizeBrand();};
window.addEventListener('hashchange',()=>setTimeout(keepLast,40));
window.addEventListener('load',()=>setTimeout(keepLast,80));

window.EFC_SIDEBAR_LOCK_V30=Object.freeze({
  ready:true,registrationSidebarLockedGlobally:true,unfinishedPagesSidebarOnly:true,
  redesignedPagesUseRegistrationGap:true,redesignedTitlesMatchRegistrationHero:true,
  centeredBrandLogo:true,normalizedBrandCopy:true,noMutationObserverLoop:true,mainUntouched:true
});
})();
