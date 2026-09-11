(()=>{
'use strict';
if(window.EFC_COURSES_CENTERS_COMPACT_V25?.ready)return;
const style=document.createElement('style');
style.id='efc-courses-centers-compact-style-v25';
style.textContent=`
/* Balanced fixed desktop canvas. Reference image defines styling, not scale. */
body.efc-specialties-redesign-v23 .content{
  width:835px!important;max-width:835px!important;min-width:835px!important;
  margin:0 auto!important;padding:10px 0 22px!important;box-sizing:border-box!important;overflow:visible!important;
}
body.efc-specialties-redesign-v23 .page-title{
  width:340px!important;max-width:340px!important;min-width:340px!important;
  height:50px!important;min-height:50px!important;max-height:50px!important;
  margin:0 auto 11px!important;padding:0 15px!important;border-radius:12px!important;box-sizing:border-box!important;flex:0 0 auto!important;
}
body.efc-specialties-redesign-v23 .page-title>div{gap:12px!important;flex:0 0 auto!important}
body.efc-specialties-redesign-v23 .page-title h1{font-size:23px!important;line-height:1!important;white-space:nowrap!important}
body.efc-specialties-redesign-v23 .efc-page-icon-v23 svg{width:28px!important;height:28px!important}

body.efc-specialties-redesign-v23 .efc-centers-panel-v23,
body.efc-specialties-redesign-v23 .efc-courses-panel-v23{
  width:835px!important;max-width:835px!important;min-width:835px!important;
  padding:10px 10px 12px!important;margin:0 0 11px!important;border-radius:12px!important;
  box-sizing:border-box!important;align-self:auto!important;flex:0 0 auto!important;
}
body.efc-specialties-redesign-v23 .centers-head-v13,
body.efc-specialties-redesign-v23 .efc-courses-head-v23{
  width:100%!important;min-height:44px!important;max-height:44px!important;gap:9px!important;margin:0 0 10px!important;
  flex:0 0 auto!important;align-items:center!important;
}
body.efc-specialties-redesign-v23 .efc-section-controls-v23{gap:8px!important;flex:0 0 auto!important;flex-wrap:nowrap!important}
body.efc-specialties-redesign-v23 .centers-head-v13 h2,
body.efc-specialties-redesign-v23 .efc-courses-head-v23 h2{
  width:165px!important;min-width:165px!important;max-width:165px!important;
  height:42px!important;min-height:42px!important;max-height:42px!important;
  padding:0 12px!important;border-radius:10px!important;gap:9px!important;font-size:18.5px!important;
  box-sizing:border-box!important;flex:0 0 165px!important;
}
body.efc-specialties-redesign-v23 .efc-section-icon-v23 svg{width:23px!important;height:23px!important}
body.efc-specialties-redesign-v23 .efc-add-v23,
body.efc-specialties-redesign-v23 .efc-view-all-v23{
  height:39px!important;min-height:39px!important;max-height:39px!important;
  width:auto!important;min-width:0!important;max-width:none!important;padding:0 14px!important;border-radius:9px!important;
  font-size:12.5px!important;gap:7px!important;flex:0 0 auto!important;white-space:nowrap!important;
}
body.efc-specialties-redesign-v23 .efc-view-all-v23 svg{width:17px!important;height:17px!important}

body.efc-specialties-redesign-v23 .centers-grid-v13,
body.efc-specialties-redesign-v23 .spec-grid{
  width:815px!important;max-width:815px!important;min-width:815px!important;
  grid-template-columns:repeat(3,265px)!important;grid-auto-columns:265px!important;gap:10px!important;
  justify-content:start!important;align-items:start!important;box-sizing:border-box!important;
}
.efc-limit-three-v23:not(.is-expanded-v23)>:nth-child(n+4){display:none!important}
body.efc-specialties-redesign-v23 .center-card-v13,
body.efc-specialties-redesign-v23 .spec-card{
  width:265px!important;max-width:265px!important;min-width:265px!important;
  padding:9px 10px!important;border-radius:10px!important;box-sizing:border-box!important;
  justify-self:start!important;align-self:start!important;flex:0 0 265px!important;overflow:hidden!important;
}
body.efc-specialties-redesign-v23 .center-card-v13{height:114px!important;min-height:114px!important;max-height:114px!important;gap:7px!important}
body.efc-specialties-redesign-v23 .center-card-v13 h3{
  height:37px!important;min-height:37px!important;max-height:37px!important;
  padding:0 10px!important;padding-left:80px!important;border-radius:8px!important;gap:7px!important;
  font-size:15px!important;line-height:1!important;overflow:hidden!important;white-space:nowrap!important;
}
body.efc-specialties-redesign-v23 .center-card-v13>div>span{
  height:52px!important;min-height:52px!important;max-height:52px!important;
  padding:7px 10px!important;border-radius:8px!important;font-size:15px!important;overflow:hidden!important;
}
body.efc-specialties-redesign-v23 .efc-card-count-label-v23{font-size:9.5px!important}
body.efc-specialties-redesign-v23 .efc-card-count-icon-v23 svg{width:25px!important;height:25px!important}
body.efc-specialties-redesign-v23 .efc-card-title-icon-v23 svg{width:22px!important;height:22px!important}
body.efc-specialties-redesign-v23 .center-card-v13 .edit-center-v13,
body.efc-specialties-redesign-v23 .spec-card .edit-spec-v13{
  top:9px!important;left:9px!important;height:32px!important;min-height:32px!important;max-height:32px!important;
  padding:0 9px!important;border-radius:8px!important;font-size:10px!important;line-height:1!important;white-space:nowrap!important;
}

body.efc-specialties-redesign-v23 .spec-card{height:134px!important;min-height:134px!important;max-height:134px!important}
body.efc-specialties-redesign-v23 .spec-top{
  height:38px!important;min-height:38px!important;max-height:38px!important;padding-left:78px!important;overflow:hidden!important;
}
body.efc-specialties-redesign-v23 .spec-top h3{
  height:37px!important;min-height:37px!important;max-height:37px!important;
  padding:0 10px!important;border-radius:8px!important;gap:7px!important;font-size:15px!important;line-height:1!important;
  overflow:hidden!important;white-space:nowrap!important;
}
body.efc-specialties-redesign-v23 .spec-top>div>span{font-size:8px!important;margin-top:1px!important;line-height:1!important}
body.efc-specialties-redesign-v23 .spec-facts{
  width:100%!important;grid-template-columns:repeat(2,118px)!important;gap:8px!important;margin-top:8px!important;justify-content:start!important;
}
body.efc-specialties-redesign-v23 .spec-facts>div:not(.efc-hidden-fact-v23){
  width:118px!important;max-width:118px!important;min-width:118px!important;
  height:57px!important;min-height:57px!important;max-height:57px!important;
  padding:6px 8px!important;border-radius:8px!important;box-sizing:border-box!important;overflow:hidden!important;
}
body.efc-specialties-redesign-v23 .spec-facts small{font-size:8.5px!important;line-height:1!important}
body.efc-specialties-redesign-v23 .spec-facts b{font-size:12px!important;margin-top:1px!important;line-height:1!important}
body.efc-specialties-redesign-v23 .efc-fact-icon-v23 svg{width:19px!important;height:19px!important}

/* Never stretch on larger windows. On genuinely narrow windows, shrink the whole fixed canvas as one unit. */
@media(max-width:1060px){body.efc-specialties-redesign-v23 .content{transform:scale(.92)!important;transform-origin:top center!important}}
@media(max-width:930px){body.efc-specialties-redesign-v23 .content{transform:scale(.82)!important;transform-origin:top center!important}}
`;
document.head.appendChild(style);
window.EFC_COURSES_CENTERS_COMPACT_V25=Object.freeze({
  ready:true,fixedCanvas:true,balancedDesktopSize:true,noStretch:true,fixedCardWidths:true,fixedCardHeights:true,mainUntouched:true
});
})();
