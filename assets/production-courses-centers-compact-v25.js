(()=>{
'use strict';
if(window.EFC_COURSES_CENTERS_COMPACT_V25?.ready)return;
const style=document.createElement('style');
style.id='efc-courses-centers-compact-style-v25';
style.textContent=`
/* Reference artwork controls styling only; real EFC viewport controls scale. */
body.efc-specialties-redesign-v23 .content{
  width:min(820px,calc(100% - 28px))!important;
  max-width:820px!important;
  min-width:0!important;
  margin:0 auto!important;
  padding:8px 0 20px!important;
  overflow:visible!important;
}
body.efc-specialties-redesign-v23 .page-title{
  width:330px!important;
  max-width:46vw!important;
  min-height:46px!important;
  height:46px!important;
  margin:0 auto 9px!important;
  padding:0 13px!important;
  border-radius:12px!important;
}
body.efc-specialties-redesign-v23 .page-title>div{gap:11px!important}
body.efc-specialties-redesign-v23 .page-title h1{font-size:21px!important;line-height:1!important}
body.efc-specialties-redesign-v23 .efc-page-icon-v23 svg{width:27px!important;height:27px!important}

body.efc-specialties-redesign-v23 .efc-centers-panel-v23,
body.efc-specialties-redesign-v23 .efc-courses-panel-v23{
  width:100%!important;
  padding:7px 9px 9px!important;
  margin:0 0 8px!important;
  border-radius:11px!important;
}
body.efc-specialties-redesign-v23 .centers-head-v13,
body.efc-specialties-redesign-v23 .efc-courses-head-v23{
  min-height:36px!important;
  gap:7px!important;
  margin:0 0 7px!important;
}
body.efc-specialties-redesign-v23 .efc-section-controls-v23{gap:5px!important}
body.efc-specialties-redesign-v23 .centers-head-v13 h2,
body.efc-specialties-redesign-v23 .efc-courses-head-v23 h2{
  min-width:145px!important;
  min-height:34px!important;
  height:34px!important;
  padding:0 10px!important;
  border-radius:9px!important;
  gap:7px!important;
  font-size:16px!important;
}
body.efc-specialties-redesign-v23 .efc-section-icon-v23 svg{width:20px!important;height:20px!important}
body.efc-specialties-redesign-v23 .efc-add-v23,
body.efc-specialties-redesign-v23 .efc-view-all-v23{
  min-height:32px!important;
  height:32px!important;
  padding:0 10px!important;
  border-radius:8px!important;
  font-size:10px!important;
  gap:5px!important;
}
body.efc-specialties-redesign-v23 .efc-view-all-v23 svg{width:15px!important;height:15px!important}

body.efc-specialties-redesign-v23 .centers-grid-v13,
body.efc-specialties-redesign-v23 .spec-grid{
  grid-template-columns:repeat(3,minmax(0,1fr))!important;
  gap:7px!important;
  min-width:0!important;
}
.efc-limit-three-v23:not(.is-expanded-v23)>:nth-child(n+4){display:none!important}
body.efc-specialties-redesign-v23 .center-card-v13,
body.efc-specialties-redesign-v23 .spec-card{
  min-width:0!important;
  min-height:0!important;
  padding:7px 8px!important;
  border-radius:9px!important;
}
body.efc-specialties-redesign-v23 .center-card-v13{
  height:92px!important;
  gap:4px!important;
}
body.efc-specialties-redesign-v23 .center-card-v13 h3{
  min-height:29px!important;
  height:29px!important;
  padding:0 7px!important;
  padding-left:61px!important;
  border-radius:7px!important;
  gap:5px!important;
  font-size:11.5px!important;
}
body.efc-specialties-redesign-v23 .center-card-v13>div>span{
  min-height:38px!important;
  height:38px!important;
  padding:4px 7px!important;
  border-radius:7px!important;
  font-size:12px!important;
}
body.efc-specialties-redesign-v23 .efc-card-count-label-v23{font-size:7.5px!important}
body.efc-specialties-redesign-v23 .efc-card-count-icon-v23 svg{width:18px!important;height:18px!important}
body.efc-specialties-redesign-v23 .efc-card-title-icon-v23 svg{width:16px!important;height:16px!important}
body.efc-specialties-redesign-v23 .center-card-v13 .edit-center-v13,
body.efc-specialties-redesign-v23 .spec-card .edit-spec-v13{
  top:7px!important;
  left:7px!important;
  min-height:24px!important;
  height:24px!important;
  padding:0 6px!important;
  border-radius:6px!important;
  font-size:8px!important;
}

body.efc-specialties-redesign-v23 .spec-card{height:104px!important}
body.efc-specialties-redesign-v23 .spec-top{
  min-height:29px!important;
  height:29px!important;
  padding-left:58px!important;
}
body.efc-specialties-redesign-v23 .spec-top h3{
  min-height:29px!important;
  height:29px!important;
  padding:0 7px!important;
  border-radius:7px!important;
  gap:5px!important;
  font-size:11.5px!important;
}
body.efc-specialties-redesign-v23 .spec-top>div>span{font-size:6.5px!important;margin-top:1px!important}
body.efc-specialties-redesign-v23 .spec-facts{gap:4px!important;margin-top:4px!important}
body.efc-specialties-redesign-v23 .spec-facts>div:not(.efc-hidden-fact-v23){
  min-height:37px!important;
  height:37px!important;
  padding:3px 5px!important;
  border-radius:7px!important;
}
body.efc-specialties-redesign-v23 .spec-facts small{font-size:7px!important}
body.efc-specialties-redesign-v23 .spec-facts b{font-size:9px!important;margin-top:0!important}
body.efc-specialties-redesign-v23 .efc-fact-icon-v23 svg{width:15px!important;height:15px!important}

@media(max-width:1120px){
  body.efc-specialties-redesign-v23 .content{width:min(780px,calc(100% - 20px))!important}
  body.efc-specialties-redesign-v23 .page-title{width:305px!important;max-width:50vw!important}
}
@media(max-height:760px){
  body.efc-specialties-redesign-v23 .content{padding-top:5px!important;padding-bottom:12px!important}
  body.efc-specialties-redesign-v23 .page-title{height:42px!important;min-height:42px!important;margin-bottom:6px!important}
  body.efc-specialties-redesign-v23 .page-title h1{font-size:19px!important}
  body.efc-specialties-redesign-v23 .efc-page-icon-v23 svg{width:24px!important;height:24px!important}
  body.efc-specialties-redesign-v23 .efc-centers-panel-v23,
  body.efc-specialties-redesign-v23 .efc-courses-panel-v23{padding:6px 8px 7px!important;margin-bottom:6px!important}
  body.efc-specialties-redesign-v23 .center-card-v13{height:87px!important}
  body.efc-specialties-redesign-v23 .spec-card{height:98px!important}
}
`;
document.head.appendChild(style);
window.EFC_COURSES_CENTERS_COMPACT_V25=Object.freeze({
  ready:true,
  realViewportSizing:true,
  compactCards:true,
  compactHeaders:true,
  centeredWorkingCanvas:true,
  referenceImageNotUsedForScale:true,
  desktopDensity:true,
  mainUntouched:true
});
})();
