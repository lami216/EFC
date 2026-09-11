(()=>{
'use strict';
if(window.EFC_COURSES_CENTERS_COMPACT_V25?.ready)return;
const style=document.createElement('style');
style.id='efc-courses-centers-compact-style-v25';
style.textContent=`
/* Balanced fixed desktop canvas. Reference image defines styling, not scale. */
body.efc-specialties-redesign-v23 .content{
  width:760px!important;max-width:760px!important;min-width:760px!important;
  margin:0 auto!important;padding:9px 0 20px!important;box-sizing:border-box!important;overflow:visible!important;
}
body.efc-specialties-redesign-v23 .page-title{
  width:310px!important;max-width:310px!important;min-width:310px!important;
  height:46px!important;min-height:46px!important;max-height:46px!important;
  margin:0 auto 10px!important;padding:0 14px!important;border-radius:11px!important;box-sizing:border-box!important;flex:0 0 auto!important;
}
body.efc-specialties-redesign-v23 .page-title>div{gap:11px!important;flex:0 0 auto!important}
body.efc-specialties-redesign-v23 .page-title h1{font-size:21px!important;line-height:1!important;white-space:nowrap!important}
body.efc-specialties-redesign-v23 .efc-page-icon-v23 svg{width:26px!important;height:26px!important}

body.efc-specialties-redesign-v23 .efc-centers-panel-v23,
body.efc-specialties-redesign-v23 .efc-courses-panel-v23{
  width:760px!important;max-width:760px!important;min-width:760px!important;
  padding:9px 10px 11px!important;margin:0 0 10px!important;border-radius:11px!important;
  box-sizing:border-box!important;align-self:auto!important;flex:0 0 auto!important;
}
body.efc-specialties-redesign-v23 .centers-head-v13,
body.efc-specialties-redesign-v23 .efc-courses-head-v23{
  width:100%!important;min-height:40px!important;max-height:40px!important;gap:8px!important;margin:0 0 9px!important;
  flex:0 0 auto!important;align-items:center!important;
}
body.efc-specialties-redesign-v23 .efc-section-controls-v23{gap:7px!important;flex:0 0 auto!important;flex-wrap:nowrap!important}
body.efc-specialties-redesign-v23 .centers-head-v13 h2,
body.efc-specialties-redesign-v23 .efc-courses-head-v23 h2{
  width:150px!important;min-width:150px!important;max-width:150px!important;
  height:38px!important;min-height:38px!important;max-height:38px!important;
  padding:0 11px!important;border-radius:9px!important;gap:8px!important;font-size:17px!important;
  box-sizing:border-box!important;flex:0 0 150px!important;
}
body.efc-specialties-redesign-v23 .efc-section-icon-v23 svg{width:21px!important;height:21px!important}
body.efc-specialties-redesign-v23 .efc-add-v23,
body.efc-specialties-redesign-v23 .efc-view-all-v23{
  height:36px!important;min-height:36px!important;max-height:36px!important;
  width:auto!important;min-width:0!important;max-width:none!important;padding:0 13px!important;border-radius:8px!important;
  font-size:11.5px!important;gap:6px!important;flex:0 0 auto!important;white-space:nowrap!important;
}
body.efc-specialties-redesign-v23 .efc-view-all-v23 svg{width:16px!important;height:16px!important}

body.efc-specialties-redesign-v23 .centers-grid-v13,
body.efc-specialties-redesign-v23 .spec-grid{
  width:740px!important;max-width:740px!important;min-width:740px!important;
  grid-template-columns:repeat(3,241px)!important;grid-auto-columns:241px!important;gap:8px!important;
  justify-content:start!important;align-items:start!important;box-sizing:border-box!important;
}
.efc-limit-three-v23:not(.is-expanded-v23)>:nth-child(n+4){display:none!important}
body.efc-specialties-redesign-v23 .center-card-v13,
body.efc-specialties-redesign-v23 .spec-card{
  width:241px!important;max-width:241px!important;min-width:241px!important;
  padding:8px 9px!important;border-radius:9px!important;box-sizing:border-box!important;
  justify-self:start!important;align-self:start!important;flex:0 0 241px!important;overflow:hidden!important;
}
body.efc-specialties-redesign-v23 .center-card-v13{height:104px!important;min-height:104px!important;max-height:104px!important;gap:6px!important}
body.efc-specialties-redesign-v23 .center-card-v13 h3{
  height:34px!important;min-height:34px!important;max-height:34px!important;
  padding:0 9px!important;padding-left:74px!important;border-radius:7px!important;gap:6px!important;
  font-size:14px!important;line-height:1!important;overflow:hidden!important;white-space:nowrap!important;
}
body.efc-specialties-redesign-v23 .center-card-v13>div>span{
  height:48px!important;min-height:48px!important;max-height:48px!important;
  padding:6px 9px!important;border-radius:7px!important;font-size:14px!important;overflow:hidden!important;
}
body.efc-specialties-redesign-v23 .efc-card-count-label-v23{font-size:9px!important}
body.efc-specialties-redesign-v23 .efc-card-count-icon-v23 svg{width:23px!important;height:23px!important}
body.efc-specialties-redesign-v23 .efc-card-title-icon-v23 svg{width:20px!important;height:20px!important}
body.efc-specialties-redesign-v23 .center-card-v13 .edit-center-v13,
body.efc-specialties-redesign-v23 .spec-card .edit-spec-v13{
  top:8px!important;left:8px!important;height:29px!important;min-height:29px!important;max-height:29px!important;
  padding:0 8px!important;border-radius:7px!important;font-size:9.5px!important;line-height:1!important;white-space:nowrap!important;
}

body.efc-specialties-redesign-v23 .spec-card{height:122px!important;min-height:122px!important;max-height:122px!important}
body.efc-specialties-redesign-v23 .spec-top{
  height:35px!important;min-height:35px!important;max-height:35px!important;padding-left:72px!important;overflow:hidden!important;
}
body.efc-specialties-redesign-v23 .spec-top h3{
  height:34px!important;min-height:34px!important;max-height:34px!important;
  padding:0 9px!important;border-radius:7px!important;gap:6px!important;font-size:14px!important;line-height:1!important;
  overflow:hidden!important;white-space:nowrap!important;
}
body.efc-specialties-redesign-v23 .spec-top>div>span{font-size:7.5px!important;margin-top:1px!important;line-height:1!important}
body.efc-specialties-redesign-v23 .spec-facts{
  width:100%!important;grid-template-columns:repeat(2,107px)!important;gap:7px!important;margin-top:7px!important;justify-content:start!important;
}
body.efc-specialties-redesign-v23 .spec-facts>div:not(.efc-hidden-fact-v23){
  width:107px!important;max-width:107px!important;min-width:107px!important;
  height:52px!important;min-height:52px!important;max-height:52px!important;
  padding:5px 7px!important;border-radius:7px!important;box-sizing:border-box!important;overflow:hidden!important;
}
body.efc-specialties-redesign-v23 .spec-facts small{font-size:8px!important;line-height:1!important}
body.efc-specialties-redesign-v23 .spec-facts b{font-size:11px!important;margin-top:1px!important;line-height:1!important}
body.efc-specialties-redesign-v23 .efc-fact-icon-v23 svg{width:18px!important;height:18px!important}

/* Never stretch on larger windows. On genuinely narrow windows, shrink the whole fixed canvas as one unit. */
@media(max-width:990px){body.efc-specialties-redesign-v23 .content{transform:scale(.9)!important;transform-origin:top center!important}}
@media(max-width:840px){body.efc-specialties-redesign-v23 .content{transform:scale(.78)!important;transform-origin:top center!important}}
`;
document.head.appendChild(style);
window.EFC_COURSES_CENTERS_COMPACT_V25=Object.freeze({
  ready:true,fixedCanvas:true,balancedDesktopSize:true,noStretch:true,fixedCardWidths:true,fixedCardHeights:true,mainUntouched:true
});
})();
