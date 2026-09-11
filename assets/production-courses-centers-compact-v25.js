(()=>{
'use strict';
if(window.EFC_COURSES_CENTERS_COMPACT_V25?.ready)return;
const style=document.createElement('style');
style.id='efc-courses-centers-compact-style-v25';
style.textContent=`
/* Fixed compact canvas: 25% smaller than the previous v25 sizing. No page/card stretching. */
body.efc-specialties-redesign-v23 .content{
  width:615px!important;
  max-width:615px!important;
  min-width:615px!important;
  margin:0 auto!important;
  padding:6px 0 14px!important;
  box-sizing:border-box!important;
  overflow:visible!important;
}
body.efc-specialties-redesign-v23 .page-title{
  width:248px!important;
  max-width:248px!important;
  min-width:248px!important;
  height:35px!important;
  min-height:35px!important;
  max-height:35px!important;
  margin:0 auto 7px!important;
  padding:0 10px!important;
  border-radius:9px!important;
  box-sizing:border-box!important;
  flex:0 0 auto!important;
}
body.efc-specialties-redesign-v23 .page-title>div{gap:8px!important;flex:0 0 auto!important}
body.efc-specialties-redesign-v23 .page-title h1{font-size:16px!important;line-height:1!important;white-space:nowrap!important}
body.efc-specialties-redesign-v23 .efc-page-icon-v23 svg{width:20px!important;height:20px!important}

body.efc-specialties-redesign-v23 .efc-centers-panel-v23,
body.efc-specialties-redesign-v23 .efc-courses-panel-v23{
  width:615px!important;
  max-width:615px!important;
  min-width:615px!important;
  padding:5px 7px 7px!important;
  margin:0 0 6px!important;
  border-radius:8px!important;
  box-sizing:border-box!important;
  align-self:auto!important;
  flex:0 0 auto!important;
}
body.efc-specialties-redesign-v23 .centers-head-v13,
body.efc-specialties-redesign-v23 .efc-courses-head-v23{
  width:100%!important;
  min-height:27px!important;
  max-height:27px!important;
  gap:5px!important;
  margin:0 0 5px!important;
  flex:0 0 auto!important;
  align-items:center!important;
}
body.efc-specialties-redesign-v23 .efc-section-controls-v23{gap:4px!important;flex:0 0 auto!important;flex-wrap:nowrap!important}
body.efc-specialties-redesign-v23 .centers-head-v13 h2,
body.efc-specialties-redesign-v23 .efc-courses-head-v23 h2{
  width:109px!important;
  min-width:109px!important;
  max-width:109px!important;
  height:26px!important;
  min-height:26px!important;
  max-height:26px!important;
  padding:0 7px!important;
  border-radius:7px!important;
  gap:5px!important;
  font-size:12px!important;
  box-sizing:border-box!important;
  flex:0 0 109px!important;
}
body.efc-specialties-redesign-v23 .efc-section-icon-v23 svg{width:15px!important;height:15px!important}
body.efc-specialties-redesign-v23 .efc-add-v23,
body.efc-specialties-redesign-v23 .efc-view-all-v23{
  height:24px!important;
  min-height:24px!important;
  max-height:24px!important;
  width:auto!important;
  min-width:0!important;
  max-width:none!important;
  padding:0 8px!important;
  border-radius:6px!important;
  font-size:8px!important;
  gap:4px!important;
  flex:0 0 auto!important;
  white-space:nowrap!important;
}
body.efc-specialties-redesign-v23 .efc-view-all-v23 svg{width:11px!important;height:11px!important}

body.efc-specialties-redesign-v23 .centers-grid-v13,
body.efc-specialties-redesign-v23 .spec-grid{
  width:599px!important;
  max-width:599px!important;
  min-width:599px!important;
  grid-template-columns:repeat(3,195px)!important;
  grid-auto-columns:195px!important;
  gap:7px!important;
  justify-content:start!important;
  align-items:start!important;
  box-sizing:border-box!important;
}
.efc-limit-three-v23:not(.is-expanded-v23)>:nth-child(n+4){display:none!important}
body.efc-specialties-redesign-v23 .center-card-v13,
body.efc-specialties-redesign-v23 .spec-card{
  width:195px!important;
  max-width:195px!important;
  min-width:195px!important;
  padding:5px 6px!important;
  border-radius:7px!important;
  box-sizing:border-box!important;
  justify-self:start!important;
  align-self:start!important;
  flex:0 0 195px!important;
  overflow:hidden!important;
}
body.efc-specialties-redesign-v23 .center-card-v13{
  height:69px!important;
  min-height:69px!important;
  max-height:69px!important;
  gap:3px!important;
}
body.efc-specialties-redesign-v23 .center-card-v13 h3{
  height:22px!important;
  min-height:22px!important;
  max-height:22px!important;
  padding:0 5px!important;
  padding-left:46px!important;
  border-radius:5px!important;
  gap:4px!important;
  font-size:9px!important;
  line-height:1!important;
  overflow:hidden!important;
  white-space:nowrap!important;
}
body.efc-specialties-redesign-v23 .center-card-v13>div>span{
  height:29px!important;
  min-height:29px!important;
  max-height:29px!important;
  padding:3px 5px!important;
  border-radius:5px!important;
  font-size:9px!important;
  overflow:hidden!important;
}
body.efc-specialties-redesign-v23 .efc-card-count-label-v23{font-size:6px!important}
body.efc-specialties-redesign-v23 .efc-card-count-icon-v23 svg{width:14px!important;height:14px!important}
body.efc-specialties-redesign-v23 .efc-card-title-icon-v23 svg{width:12px!important;height:12px!important}
body.efc-specialties-redesign-v23 .center-card-v13 .edit-center-v13,
body.efc-specialties-redesign-v23 .spec-card .edit-spec-v13{
  top:5px!important;
  left:5px!important;
  height:18px!important;
  min-height:18px!important;
  max-height:18px!important;
  padding:0 5px!important;
  border-radius:5px!important;
  font-size:6px!important;
  line-height:1!important;
  white-space:nowrap!important;
}

body.efc-specialties-redesign-v23 .spec-card{
  height:78px!important;
  min-height:78px!important;
  max-height:78px!important;
}
body.efc-specialties-redesign-v23 .spec-top{
  height:22px!important;
  min-height:22px!important;
  max-height:22px!important;
  padding-left:44px!important;
  overflow:hidden!important;
}
body.efc-specialties-redesign-v23 .spec-top h3{
  height:22px!important;
  min-height:22px!important;
  max-height:22px!important;
  padding:0 5px!important;
  border-radius:5px!important;
  gap:4px!important;
  font-size:9px!important;
  line-height:1!important;
  overflow:hidden!important;
  white-space:nowrap!important;
}
body.efc-specialties-redesign-v23 .spec-top>div>span{font-size:5px!important;margin-top:0!important;line-height:1!important}
body.efc-specialties-redesign-v23 .spec-facts{
  width:100%!important;
  grid-template-columns:repeat(2,89px)!important;
  gap:5px!important;
  margin-top:3px!important;
  justify-content:start!important;
}
body.efc-specialties-redesign-v23 .spec-facts>div:not(.efc-hidden-fact-v23){
  width:89px!important;
  max-width:89px!important;
  min-width:89px!important;
  height:28px!important;
  min-height:28px!important;
  max-height:28px!important;
  padding:2px 4px!important;
  border-radius:5px!important;
  box-sizing:border-box!important;
  overflow:hidden!important;
}
body.efc-specialties-redesign-v23 .spec-facts small{font-size:5.5px!important;line-height:1!important}
body.efc-specialties-redesign-v23 .spec-facts b{font-size:7px!important;margin-top:0!important;line-height:1!important}
body.efc-specialties-redesign-v23 .efc-fact-icon-v23 svg{width:11px!important;height:11px!important}

/* Do not stretch the canvas or cards on wider windows. Only shrink the whole canvas if the viewport becomes narrower than it. */
@media(max-width:900px){
  body.efc-specialties-redesign-v23 .content{
    transform:scale(.9)!important;
    transform-origin:top center!important;
  }
}
@media(max-width:760px){
  body.efc-specialties-redesign-v23 .content{
    transform:scale(.78)!important;
    transform-origin:top center!important;
  }
}
`;
document.head.appendChild(style);
window.EFC_COURSES_CENTERS_COMPACT_V25=Object.freeze({
  ready:true,
  fixedCanvas:true,
  reducedTwentyFivePercent:true,
  noStretch:true,
  fixedCardWidths:true,
  fixedCardHeights:true,
  mainUntouched:true
});
})();
