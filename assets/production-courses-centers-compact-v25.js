(()=>{
'use strict';
if(window.EFC_COURSES_CENTERS_COMPACT_V25?.ready)return;
const style=document.createElement('style');
style.id='efc-courses-centers-compact-style-v25';
style.textContent=`
/* Fixed desktop canvas: slightly larger, anchored to the sidebar edge, never stretched. */
body.efc-specialties-redesign-v23 .content{
  width:900px!important;max-width:900px!important;min-width:900px!important;
  margin:0 0 0 auto!important;padding:10px 0 22px!important;box-sizing:border-box!important;overflow:visible!important;
}
body.efc-specialties-redesign-v23 .page-title{
  width:365px!important;max-width:365px!important;min-width:365px!important;
  height:54px!important;min-height:54px!important;max-height:54px!important;
  margin:0 0 12px auto!important;padding:0 16px!important;border-radius:13px!important;box-sizing:border-box!important;flex:0 0 auto!important;
}
body.efc-specialties-redesign-v23 .page-title>div{gap:13px!important;flex:0 0 auto!important}
body.efc-specialties-redesign-v23 .page-title h1{font-size:25px!important;line-height:1!important;white-space:nowrap!important}
body.efc-specialties-redesign-v23 .efc-page-icon-v23 svg{width:30px!important;height:30px!important}

body.efc-specialties-redesign-v23 .efc-centers-panel-v23,
body.efc-specialties-redesign-v23 .efc-courses-panel-v23{
  width:900px!important;max-width:900px!important;min-width:900px!important;
  padding:10px 11px 18px!important;margin:0 0 12px!important;border-radius:13px!important;
  box-sizing:border-box!important;align-self:auto!important;flex:0 0 auto!important;
}
body.efc-specialties-redesign-v23 .centers-head-v13,
body.efc-specialties-redesign-v23 .efc-courses-head-v23{
  width:100%!important;min-height:47px!important;max-height:47px!important;gap:10px!important;margin:0 0 11px!important;
  flex:0 0 auto!important;align-items:center!important;
}
body.efc-specialties-redesign-v23 .efc-section-controls-v23{gap:8px!important;flex:0 0 auto!important;flex-wrap:nowrap!important}
body.efc-specialties-redesign-v23 .centers-head-v13 h2,
body.efc-specialties-redesign-v23 .efc-courses-head-v23 h2{
  width:178px!important;min-width:178px!important;max-width:178px!important;
  height:45px!important;min-height:45px!important;max-height:45px!important;
  padding:0 13px!important;border-radius:11px!important;gap:9px!important;font-size:20px!important;
  box-sizing:border-box!important;flex:0 0 178px!important;
}
body.efc-specialties-redesign-v23 .efc-section-icon-v23 svg{width:25px!important;height:25px!important}
body.efc-specialties-redesign-v23 .efc-add-v23,
body.efc-specialties-redesign-v23 .efc-view-all-v23{
  height:42px!important;min-height:42px!important;max-height:42px!important;
  width:auto!important;min-width:0!important;max-width:none!important;padding:0 15px!important;border-radius:10px!important;
  font-size:13.5px!important;gap:7px!important;flex:0 0 auto!important;white-space:nowrap!important;
}
body.efc-specialties-redesign-v23 .efc-view-all-v23 svg{width:18px!important;height:18px!important}

body.efc-specialties-redesign-v23 .centers-grid-v13,
body.efc-specialties-redesign-v23 .spec-grid{
  width:878px!important;max-width:878px!important;min-width:878px!important;
  grid-template-columns:repeat(3,286px)!important;grid-auto-columns:286px!important;gap:10px!important;
  justify-content:start!important;align-items:start!important;box-sizing:border-box!important;
}
.efc-limit-three-v23:not(.is-expanded-v23)>:nth-child(n+4){display:none!important}
body.efc-specialties-redesign-v23 .center-card-v13,
body.efc-specialties-redesign-v23 .spec-card{
  width:286px!important;max-width:286px!important;min-width:286px!important;
  padding:10px 11px!important;border-radius:11px!important;box-sizing:border-box!important;
  justify-self:start!important;align-self:start!important;flex:0 0 286px!important;overflow:hidden!important;
}
body.efc-specialties-redesign-v23 .center-card-v13{height:136px!important;min-height:136px!important;max-height:136px!important;gap:7px!important}
body.efc-specialties-redesign-v23 .center-card-v13 h3{
  height:40px!important;min-height:40px!important;max-height:40px!important;
  padding:0 11px!important;padding-left:86px!important;border-radius:8px!important;gap:7px!important;
  font-size:16px!important;line-height:1!important;overflow:hidden!important;white-space:nowrap!important;
}
body.efc-specialties-redesign-v23 .center-card-v13>div>span{
  height:70px!important;min-height:70px!important;max-height:70px!important;
  padding:7px 11px!important;border-radius:8px!important;font-size:16px!important;overflow:hidden!important;
}
body.efc-specialties-redesign-v23 .efc-card-count-label-v23{font-size:10px!important}
body.efc-specialties-redesign-v23 .efc-card-count-icon-v23 svg{width:27px!important;height:27px!important}
body.efc-specialties-redesign-v23 .efc-card-title-icon-v23 svg{width:23px!important;height:23px!important}
body.efc-specialties-redesign-v23 .center-card-v13 .edit-center-v13,
body.efc-specialties-redesign-v23 .spec-card .edit-spec-v13{
  top:10px!important;left:10px!important;height:34px!important;min-height:34px!important;max-height:34px!important;
  padding:0 10px!important;border-radius:8px!important;font-size:11px!important;line-height:1!important;white-space:nowrap!important;
}

body.efc-specialties-redesign-v23 .spec-card{height:160px!important;min-height:160px!important;max-height:160px!important}
body.efc-specialties-redesign-v23 .spec-top{
  height:41px!important;min-height:41px!important;max-height:41px!important;padding-left:84px!important;overflow:hidden!important;
}
body.efc-specialties-redesign-v23 .spec-top h3{
  height:40px!important;min-height:40px!important;max-height:40px!important;
  padding:0 11px!important;border-radius:8px!important;gap:7px!important;font-size:16px!important;line-height:1!important;
  overflow:hidden!important;white-space:nowrap!important;
}
body.efc-specialties-redesign-v23 .spec-top>div>span{font-size:8.5px!important;margin-top:1px!important;line-height:1!important}
body.efc-specialties-redesign-v23 .spec-facts{
  width:100%!important;grid-template-columns:repeat(2,128px)!important;gap:8px!important;margin-top:8px!important;justify-content:start!important;
}
body.efc-specialties-redesign-v23 .spec-facts>div:not(.efc-hidden-fact-v23){
  width:128px!important;max-width:128px!important;min-width:128px!important;
  height:77px!important;min-height:77px!important;max-height:77px!important;
  padding:8px 8px!important;border-radius:8px!important;box-sizing:border-box!important;overflow:hidden!important;
}
body.efc-specialties-redesign-v23 .spec-facts small{font-size:9px!important;line-height:1!important}
body.efc-specialties-redesign-v23 .spec-facts b{font-size:13px!important;margin-top:1px!important;line-height:1!important}
body.efc-specialties-redesign-v23 .efc-fact-icon-v23 svg{width:20px!important;height:20px!important}

/* Keep the right edge attached to the sidebar. Only shrink the whole fixed canvas on narrower windows. */
@media(max-width:1180px){body.efc-specialties-redesign-v23 .content{transform:scale(.92)!important;transform-origin:top right!important}}
@media(max-width:1040px){body.efc-specialties-redesign-v23 .content{transform:scale(.82)!important;transform-origin:top right!important}}
`;
document.head.appendChild(style);
window.EFC_COURSES_CENTERS_COMPACT_V25=Object.freeze({
  ready:true,fixedCanvas:true,slightlyLarger:true,anchoredToSidebar:true,rightAlignedTitle:true,tallerPanels:true,noStretch:true,fixedCardWidths:true,fixedCardHeights:true,mainUntouched:true
});
})();
