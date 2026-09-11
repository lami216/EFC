(()=>{
'use strict';
if(window.EFC_REGISTRATION_RESPONSIVE_V16?.ready)return;
if(!window.EFC_REGISTRATION_REDESIGN_V15?.ready)throw new Error('Registration responsive v16 loaded before redesign v15.');

const style=document.createElement('style');
style.id='efc-registration-responsive-style-v16';
style.textContent=`
body.efc-registration-redesign-v15{
  --efc-redesign-sidebar:clamp(230px,18vw,268px);
  overflow-x:hidden;
}
body.efc-registration-redesign-v15 .shell{min-width:0;overflow-x:hidden}
body.efc-registration-redesign-v15 .shell aside{
  width:var(--efc-redesign-sidebar)!important;
  padding:22px 16px 18px!important;
  box-sizing:border-box;
}
body.efc-registration-redesign-v15 .shell main{
  margin-right:var(--efc-redesign-sidebar)!important;
  width:calc(100% - var(--efc-redesign-sidebar))!important;
  min-width:0!important;
  overflow-x:hidden;
}
body.efc-registration-redesign-v15 .content{
  width:100%;
  min-width:0;
  max-width:none;
  box-sizing:border-box;
  padding:20px 22px 34px!important;
  overflow-x:hidden;
}
body.efc-registration-redesign-v15 .brand{gap:11px;padding:0 3px 18px!important}
body.efc-registration-redesign-v15 .brand .logo{width:50px!important;height:50px!important;padding:7px!important;border-radius:12px!important}
body.efc-registration-redesign-v15 .brand b{font-size:15.5px!important;line-height:1.3!important}
body.efc-registration-redesign-v15 .brand small{font-size:9px!important;margin-top:3px!important}
body.efc-registration-redesign-v15 .shell nav{gap:5px!important;padding-top:18px!important}
body.efc-registration-redesign-v15 .shell nav a{min-height:48px!important;padding:8px 13px!important;border-radius:11px!important;font-size:13.5px!important;gap:11px!important}
body.efc-registration-redesign-v15 .shell nav a i{width:24px!important;height:24px!important}
body.efc-registration-redesign-v15 .shell nav a i svg{width:23px!important;height:23px!important}
body.efc-registration-redesign-v15 .side-foot{padding-top:12px!important}
body.efc-registration-redesign-v15 .user-controls-v13{gap:7px!important}
body.efc-registration-redesign-v15 .user-controls-v13 small{font-size:10px!important}
body.efc-registration-redesign-v15 .user-controls-v13 button{min-height:42px!important;font-size:12.5px!important}
body.efc-registration-redesign-v15 .efc-bell-v13{top:34px!important;left:22px!important;width:48px!important;height:48px!important;border-radius:13px!important;font-size:18px!important}
body.efc-registration-redesign-v15 .efc-bell-v13>b{min-width:21px!important;height:21px!important;line-height:21px!important;font-size:10px!important}

body.efc-registration-redesign-v15 .efc-reg-page-head-v15{
  grid-template-columns:minmax(170px,.8fr) minmax(330px,470px) minmax(20px,.38fr)!important;
  min-width:0;
  min-height:78px!important;
  gap:14px!important;
  margin:0 0 18px!important;
}
body.efc-registration-redesign-v15 .efc-reg-welcome-v15{min-width:0;padding-left:58px!important;gap:3px!important}
body.efc-registration-redesign-v15 .efc-reg-welcome-v15 b{font-size:13px!important}
body.efc-registration-redesign-v15 .efc-reg-welcome-v15 span{font-size:10px!important}
body.efc-registration-redesign-v15 .efc-reg-hero-v15{height:76px!important;border-radius:17px!important;gap:18px!important;min-width:0}
body.efc-registration-redesign-v15 .efc-reg-hero-v15 svg{width:42px!important;height:42px!important}
body.efc-registration-redesign-v15 .efc-reg-hero-v15 h1{font-size:clamp(25px,2.2vw,31px)!important;white-space:nowrap}
body.efc-registration-redesign-v15 .efc-reg-hero-v15 i{bottom:9px!important;width:48px!important;height:3px!important}

body.efc-registration-redesign-v15 .registration-schedule-layout-v13{
  width:100%!important;
  min-width:0!important;
  max-width:100%!important;
  grid-template-columns:minmax(0,.86fr) minmax(0,1.14fr)!important;
  gap:14px!important;
  align-items:start!important;
  box-sizing:border-box;
}
body.efc-registration-redesign-v15 .registration-schedule-layout-v13>*{min-width:0!important;max-width:100%!important;box-sizing:border-box}
body.efc-registration-redesign-v15 .registration-form-compact-v13{
  width:100%!important;
  max-width:none!important;
  min-width:0!important;
  padding:13px 14px 14px!important;
  border-radius:13px!important;
  box-sizing:border-box;
}
body.efc-registration-redesign-v15 .registration-form-compact-v13 .section-head{
  height:54px!important;
  margin:-1px 0 12px!important;
  padding:0 16px!important;
  border-radius:11px!important;
  gap:12px!important;
}
body.efc-registration-redesign-v15 .registration-form-compact-v13 .section-head h2{font-size:20px!important}
body.efc-registration-redesign-v15 .efc-reg-form-icon-v15{width:29px!important;height:29px!important}
body.efc-registration-redesign-v15 .efc-reg-form-icon-v15 svg{width:27px!important;height:27px!important}
body.efc-registration-redesign-v15 .registration-fields-v13{grid-template-columns:repeat(2,minmax(0,1fr))!important;gap:10px 14px!important;min-width:0}
body.efc-registration-redesign-v15 .registration-fields-v13 label{font-size:12.5px!important;gap:6px!important;min-width:0!important}
body.efc-registration-redesign-v15 .registration-fields-v13 .input,
body.efc-registration-redesign-v15 .registration-fields-v13 select{
  width:100%!important;
  min-width:0!important;
  height:42px!important;
  padding:7px 10px!important;
  border-radius:9px!important;
  font-size:12.5px!important;
  box-sizing:border-box;
}
body.efc-registration-redesign-v15 .registration-fields-v13 label.efc-reg-has-icon-v15 .input{padding-left:36px!important}
body.efc-registration-redesign-v15 .efc-reg-field-icon-v15{left:10px!important;bottom:10px!important;width:19px!important;height:19px!important}
body.efc-registration-redesign-v15 .debt-slot-v13{min-height:60px!important}
body.efc-registration-redesign-v15 .registration-submit-v13{min-height:50px!important;margin-top:10px!important;border-radius:9px!important;font-size:16px!important;gap:9px!important}
body.efc-registration-redesign-v15 .registration-submit-v13 svg{width:21px!important;height:21px!important}

body.efc-registration-redesign-v15 .registration-schedule-card-v13{
  width:100%!important;
  max-width:none!important;
  min-width:0!important;
  padding:14px 12px 13px!important;
  border-radius:14px!important;
  box-sizing:border-box;
}
body.efc-registration-redesign-v15 .schedule-title-v13{gap:12px!important;margin:0 5px 10px!important;min-width:0}
body.efc-registration-redesign-v15 .schedule-title-v13 h2{font-size:21px!important;gap:9px!important;min-width:0}
body.efc-registration-redesign-v15 .schedule-title-v13 h2 svg{width:29px!important;height:29px!important}
body.efc-registration-redesign-v15 .efc-schedule-course-mirror-v15{min-width:138px!important;gap:8px!important;font-size:12px!important}
body.efc-registration-redesign-v15 .efc-schedule-course-mirror-v15 select{width:122px!important;max-width:122px!important;height:42px!important;padding:6px 9px!important;font-size:11.5px!important;border-radius:9px!important}
body.efc-registration-redesign-v15 .schedule-top-note-v13{margin:0 5px 10px!important;min-height:42px!important;padding:8px 11px!important;border-radius:9px!important;gap:8px!important;font-size:11px!important;line-height:1.45!important}
body.efc-registration-redesign-v15 .schedule-top-note-v13 svg{width:18px!important;height:18px!important}
body.efc-registration-redesign-v15 .schedule-table-wrap-v13{width:100%;min-width:0;max-width:100%;overflow:hidden!important;border-radius:10px!important}
body.efc-registration-redesign-v15 .schedule-table-v13{width:100%!important;min-width:0!important;max-width:100%!important;table-layout:fixed!important}
body.efc-registration-redesign-v15 .schedule-table-v13 th,
body.efc-registration-redesign-v15 .schedule-table-v13 td{height:56px!important;padding:5px 3px!important;min-width:0!important}
body.efc-registration-redesign-v15 .schedule-table-v13 thead th b{font-size:11.5px!important}
body.efc-registration-redesign-v15 .schedule-table-v13 thead th small{font-size:8.5px!important;margin-top:2px!important}
body.efc-registration-redesign-v15 .schedule-course-head-v13,
body.efc-registration-redesign-v15 .schedule-table-v13 tbody th{width:68px!important;min-width:68px!important}
body.efc-registration-redesign-v15 .schedule-time-row-v13 th,
body.efc-registration-redesign-v15 .schedule-course-row-v13 th{font-size:10.5px!important}
body.efc-registration-redesign-v15 .schedule-time-row-v13 input[type=time]{height:38px!important;padding:2px!important;font-size:10.5px!important;min-width:0!important}
body.efc-registration-redesign-v15 .schedule-check-v13 span{width:22px!important;height:22px!important}
body.efc-registration-redesign-v15 .schedule-notes-v13{margin:10px 0 0!important;padding:9px 14px 9px 42px!important;border-radius:9px!important;font-size:10px!important;line-height:1.65!important}
body.efc-registration-redesign-v15 .efc-reg-bottom-info-v15{left:12px!important;width:24px!important;height:24px!important}

@media(max-width:1260px){
  body.efc-registration-redesign-v15{--efc-redesign-sidebar:230px}
  body.efc-registration-redesign-v15 .content{padding-left:18px!important;padding-right:18px!important}
  body.efc-registration-redesign-v15 .efc-reg-page-head-v15{grid-template-columns:minmax(150px,.7fr) minmax(320px,430px) minmax(0,.25fr)!important}
  body.efc-registration-redesign-v15 .efc-reg-welcome-v15{padding-left:50px!important}
  body.efc-registration-redesign-v15 .registration-schedule-layout-v13{grid-template-columns:minmax(0,.9fr) minmax(0,1.1fr)!important;gap:12px!important}
  body.efc-registration-redesign-v15 .registration-fields-v13{gap:9px 11px!important}
  body.efc-registration-redesign-v15 .schedule-title-v13 h2{font-size:19px!important}
  body.efc-registration-redesign-v15 .efc-schedule-course-mirror-v15{min-width:126px!important}
  body.efc-registration-redesign-v15 .efc-schedule-course-mirror-v15 select{width:108px!important;max-width:108px!important}
}

@media(max-width:1080px){
  body.efc-registration-redesign-v15{--efc-redesign-sidebar:218px}
  body.efc-registration-redesign-v15 .content{padding:16px 14px 28px!important}
  body.efc-registration-redesign-v15 .efc-reg-page-head-v15{grid-template-columns:1fr minmax(300px,390px)!important;min-height:70px!important;margin-bottom:14px!important}
  body.efc-registration-redesign-v15 .efc-reg-page-head-v15>div[aria-hidden]{display:none!important}
  body.efc-registration-redesign-v15 .efc-reg-welcome-v15{grid-column:1!important;padding-left:46px!important}
  body.efc-registration-redesign-v15 .efc-reg-hero-v15{grid-column:2!important;height:68px!important}
  body.efc-registration-redesign-v15 .efc-reg-hero-v15 h1{font-size:24px!important}
  body.efc-registration-redesign-v15 .registration-schedule-layout-v13{grid-template-columns:minmax(0,.94fr) minmax(0,1.06fr)!important;gap:10px!important}
  body.efc-registration-redesign-v15 .registration-fields-v13 label{font-size:11.5px!important}
  body.efc-registration-redesign-v15 .registration-fields-v13 .input,
  body.efc-registration-redesign-v15 .registration-fields-v13 select{font-size:11.5px!important}
}

@media(max-width:980px){
  body.efc-registration-redesign-v15{--efc-redesign-sidebar:210px}
  body.efc-registration-redesign-v15 .registration-schedule-layout-v13{grid-template-columns:1fr!important}
  body.efc-registration-redesign-v15 .registration-form-compact-v13{max-width:680px!important;justify-self:center}
  body.efc-registration-redesign-v15 .registration-schedule-card-v13{order:2}
}

@media(max-height:760px){
  body.efc-registration-redesign-v15 .shell aside{padding-top:14px!important;padding-bottom:12px!important}
  body.efc-registration-redesign-v15 .brand{padding-bottom:12px!important}
  body.efc-registration-redesign-v15 .shell nav{padding-top:12px!important;gap:3px!important}
  body.efc-registration-redesign-v15 .shell nav a{min-height:43px!important;padding-top:6px!important;padding-bottom:6px!important}
  body.efc-registration-redesign-v15 .content{padding-top:12px!important}
  body.efc-registration-redesign-v15 .efc-reg-page-head-v15{min-height:62px!important;margin-bottom:12px!important}
  body.efc-registration-redesign-v15 .efc-reg-hero-v15{height:62px!important}
  body.efc-registration-redesign-v15 .efc-reg-hero-v15 h1{font-size:24px!important}
  body.efc-registration-redesign-v15 .efc-reg-hero-v15 svg{width:34px!important;height:34px!important}
  body.efc-registration-redesign-v15 .registration-form-compact-v13{padding-top:10px!important}
  body.efc-registration-redesign-v15 .registration-form-compact-v13 .section-head{height:47px!important;margin-bottom:8px!important}
  body.efc-registration-redesign-v15 .registration-fields-v13{gap-top:7px!important;gap-bottom:7px!important;row-gap:7px!important}
  body.efc-registration-redesign-v15 .registration-fields-v13 .input,
  body.efc-registration-redesign-v15 .registration-fields-v13 select{height:38px!important}
  body.efc-registration-redesign-v15 .debt-slot-v13{min-height:55px!important}
  body.efc-registration-redesign-v15 .registration-submit-v13{min-height:44px!important;margin-top:7px!important}
  body.efc-registration-redesign-v15 .registration-schedule-card-v13{padding-top:10px!important}
  body.efc-registration-redesign-v15 .schedule-title-v13{margin-bottom:7px!important}
  body.efc-registration-redesign-v15 .schedule-top-note-v13{min-height:36px!important;margin-bottom:7px!important;padding-top:6px!important;padding-bottom:6px!important}
  body.efc-registration-redesign-v15 .schedule-table-v13 th,
  body.efc-registration-redesign-v15 .schedule-table-v13 td{height:49px!important}
  body.efc-registration-redesign-v15 .schedule-notes-v13{margin-top:7px!important;padding-top:6px!important;padding-bottom:6px!important}
}
`;
document.head.appendChild(style);

window.EFC_REGISTRATION_RESPONSIVE_V16=Object.freeze({
  ready:true,
  realViewportSizing:true,
  tauriDefault1440x900:true,
  tauriMinimum1100x700:true,
  noHorizontalRegistrationOverflow:true,
  responsiveSidebar:true,
  compactRegistrationScale:true,
  mainUntouched:true
});
})();
