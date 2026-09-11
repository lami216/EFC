(()=>{
'use strict';
if(window.EFC_UNIFIED_LAYOUT_V29?.ready)return;
const style=document.createElement('style');
style.id='efc-unified-layout-style-v29';
style.textContent=`
/* One sidebar everywhere: match the registration page instead of letting each page redefine it. */
body .shell.shell-v13{min-width:0!important;min-height:100vh!important;overflow-x:hidden!important}
body .shell.shell-v13 aside{
  top:0!important;right:0!important;bottom:0!important;
  width:clamp(230px,18vw,268px)!important;
  padding:22px 16px 18px!important;
  background:linear-gradient(180deg,#075445 0%,#05473d 48%,#033d35 100%)!important;
  box-shadow:-10px 0 35px rgba(5,55,47,.08)!important;
  box-sizing:border-box!important;
}
body .shell.shell-v13 main{
  margin-right:clamp(230px,18vw,268px)!important;
  width:calc(100% - clamp(230px,18vw,268px))!important;
  min-width:0!important;
  overflow-x:hidden!important;
}
body .shell.shell-v13 .brand{gap:11px!important;padding:0 3px 18px!important;align-items:center!important}
body .shell.shell-v13 .brand .logo{
  width:52px!important;height:52px!important;flex:0 0 52px!important;
  padding:3px!important;border-radius:12px!important;background:#fff!important;
  display:grid!important;place-items:center!important;overflow:hidden!important;
}
body .shell.shell-v13 .brand .logo img{width:100%!important;height:100%!important;max-width:none!important;max-height:none!important;padding:0!important;object-fit:contain!important;transform:none!important}
body .shell.shell-v13 .brand b{display:grid!important;gap:1px!important;line-height:1.18!important;color:#fff!important}
body .shell.shell-v13 .brand b span:first-child{font-size:15px!important;font-weight:850!important}
body .shell.shell-v13 .brand b span:last-child{font-size:13px!important;font-weight:800!important}
body .shell.shell-v13 .brand small{font-size:9px!important;color:#b9d9cf!important;margin-top:3px!important}
body .shell.shell-v13 nav{gap:5px!important;padding-top:18px!important}
body .shell.shell-v13 nav a{
  min-height:48px!important;padding:8px 13px!important;border-radius:11px!important;
  font-size:13.5px!important;gap:11px!important;color:#e2f0eb!important;
  border:1px solid transparent!important;box-sizing:border-box!important;
}
body .shell.shell-v13 nav a i{width:24px!important;height:24px!important;display:grid!important;place-items:center!important}
body .shell.shell-v13 nav a i svg{width:23px!important;height:23px!important}
body .shell.shell-v13 nav a:hover{background:rgba(255,255,255,.08)!important;color:#fff!important}
body .shell.shell-v13 nav a.active{
  background:linear-gradient(90deg,rgba(38,181,139,.26),rgba(255,255,255,.06))!important;
  color:#fff!important;border-color:rgba(93,216,179,.44)!important;
  box-shadow:inset 6px 0 #35c99a,0 8px 20px rgba(0,0,0,.08)!important;
}
body .shell.shell-v13 .side-foot{border-top:1px solid rgba(255,255,255,.18)!important;padding-top:12px!important}
body .shell.shell-v13 .production-side-note{display:none!important}
body .shell.shell-v13 .user-controls-v13{gap:7px!important;border:0!important;padding:0!important}
body .shell.shell-v13 .user-controls-v13 small{font-size:10px!important;color:#d6eae3!important;text-align:center!important}
body .shell.shell-v13 .user-controls-v13 button{min-height:42px!important;border:1px solid rgba(255,255,255,.24)!important;border-radius:11px!important;background:rgba(255,255,255,.04)!important;font-size:12.5px!important;color:#fff!important}
body .efc-bell-v13{top:34px!important;left:22px!important;width:48px!important;height:48px!important;border-radius:13px!important;font-size:18px!important}
body .efc-bell-v13>b{min-width:21px!important;height:21px!important;line-height:21px!important;font-size:10px!important}

/* The two redesigned pages use the same right-side breathing room as registration (22px). */
body.efc-specialties-redesign-v23 .content,
body.efc-period-redesign-v28 .content{
  margin-right:22px!important;
  margin-left:0!important;
}

/* Put page titles in the same visual lane/size as the registration hero. */
body.efc-specialties-redesign-v23 .page-title,
body.efc-period-redesign-v28 .efc-period-hero-v28{
  width:470px!important;min-width:470px!important;max-width:470px!important;
  height:76px!important;min-height:76px!important;max-height:76px!important;
  margin:0 auto 18px!important;
  border-radius:17px!important;
  background:linear-gradient(135deg,#e4f8f0,#d4efe5)!important;
  box-sizing:border-box!important;
}
body.efc-specialties-redesign-v23 .page-title h1,
body.efc-period-redesign-v28 .efc-period-hero-v28 h1{
  font-size:31px!important;line-height:1!important;font-weight:850!important;white-space:nowrap!important;
}
body.efc-specialties-redesign-v23 .efc-page-icon-v23 svg,
body.efc-period-redesign-v28 .efc-period-hero-v28 svg{width:42px!important;height:42px!important}

@media(max-width:1260px){
  body .shell.shell-v13 aside{width:230px!important}
  body .shell.shell-v13 main{margin-right:230px!important;width:calc(100% - 230px)!important}
}
@media(max-width:1080px){
  body .shell.shell-v13 aside{width:218px!important}
  body .shell.shell-v13 main{margin-right:218px!important;width:calc(100% - 218px)!important}
}
`;
document.head.appendChild(style);
window.EFC_UNIFIED_LAYOUT_V29=Object.freeze({ready:true,registrationSidebarEverywhere:true,sharedSidebarGap:true,sharedTitleLane:true,mainUntouched:true});
})();
