(()=>{
'use strict';
if(window.EFC_COURSES_CENTERS_COMPACT_V25?.ready)return;
const style=document.createElement('style');
style.id='efc-courses-centers-compact-style-v25';
style.textContent=`
body.efc-specialties-redesign-v23 .content{width:min(920px,calc(100% - 24px))!important;max-width:920px!important;margin:0 auto!important;padding:8px 0 18px!important}
body.efc-specialties-redesign-v23 .page-title{width:min(370px,44vw)!important;min-height:44px!important;height:44px!important;margin:0 auto 8px!important;border-radius:12px!important;padding:0 14px!important}
body.efc-specialties-redesign-v23 .page-title>div{gap:12px!important}
body.efc-specialties-redesign-v23 .page-title h1{font-size:24px!important;line-height:1!important}
body.efc-specialties-redesign-v23 .efc-page-icon-v23 svg{width:28px!important;height:28px!important}

body.efc-specialties-redesign-v23 .efc-centers-panel-v23,
body.efc-specialties-redesign-v23 .efc-courses-panel-v23{padding:7px 9px 9px!important;margin:0 0 8px!important;border-radius:11px!important}
body.efc-specialties-redesign-v23 .centers-head-v13,
body.efc-specialties-redesign-v23 .efc-courses-head-v23{gap:8px!important;margin:0 0 7px!important;min-height:36px!important}
body.efc-specialties-redesign-v23 .efc-section-controls-v23{gap:6px!important}
body.efc-specialties-redesign-v23 .centers-head-v13 h2,
body.efc-specialties-redesign-v23 .efc-courses-head-v23 h2{min-width:160px!important;min-height:36px!important;height:36px!important;padding:0 12px!important;border-radius:10px!important;gap:9px!important;font-size:17px!important}
body.efc-specialties-redesign-v23 .efc-section-icon-v23 svg{width:22px!important;height:22px!important}
body.efc-specialties-redesign-v23 .efc-add-v23,
body.efc-specialties-redesign-v23 .efc-view-all-v23{min-height:34px!important;height:34px!important;padding:0 12px!important;border-radius:8px!important;font-size:11px!important;gap:6px!important}
body.efc-specialties-redesign-v23 .efc-view-all-v23 svg{width:16px!important;height:16px!important}

body.efc-specialties-redesign-v23 .centers-grid-v13,
body.efc-specialties-redesign-v23 .spec-grid{grid-template-columns:repeat(3,minmax(0,1fr))!important;gap:8px!important}
.efc-limit-three-v23:not(.is-expanded-v23)>:nth-child(n+4){display:none!important}
body.efc-specialties-redesign-v23 .center-card-v13,
body.efc-specialties-redesign-v23 .spec-card{min-height:0!important;padding:7px 8px!important;border-radius:9px!important}
body.efc-specialties-redesign-v23 .center-card-v13{height:100px!important;gap:5px!important}
body.efc-specialties-redesign-v23 .center-card-v13 h3{min-height:32px!important;height:32px!important;padding:0 9px!important;padding-left:68px!important;border-radius:7px!important;gap:6px!important;font-size:13px!important}
body.efc-specialties-redesign-v23 .center-card-v13>div>span{min-height:42px!important;height:42px!important;padding:5px 9px!important;border-radius:7px!important;font-size:13px!important}
body.efc-specialties-redesign-v23 .efc-card-count-label-v23{font-size:8.5px!important}
body.efc-specialties-redesign-v23 .efc-card-count-icon-v23 svg{width:21px!important;height:21px!important}
body.efc-specialties-redesign-v23 .efc-card-title-icon-v23 svg{width:19px!important;height:19px!important}
body.efc-specialties-redesign-v23 .center-card-v13 .edit-center-v13,
body.efc-specialties-redesign-v23 .spec-card .edit-spec-v13{top:7px!important;left:7px!important;min-height:27px!important;height:27px!important;padding:0 7px!important;border-radius:7px!important;font-size:9px!important}

body.efc-specialties-redesign-v23 .spec-card{height:112px!important}
body.efc-specialties-redesign-v23 .spec-top{min-height:32px!important;height:32px!important;padding-left:64px!important}
body.efc-specialties-redesign-v23 .spec-top h3{min-height:32px!important;height:32px!important;padding:0 9px!important;border-radius:7px!important;gap:6px!important;font-size:13px!important}
body.efc-specialties-redesign-v23 .spec-facts{gap:6px!important;margin-top:6px!important}
body.efc-specialties-redesign-v23 .spec-facts>div:not(.efc-hidden-fact-v23){min-height:42px!important;height:42px!important;padding:4px 7px!important;border-radius:7px!important}
body.efc-specialties-redesign-v23 .spec-facts small{font-size:8px!important}
body.efc-specialties-redesign-v23 .spec-facts b{font-size:11px!important;margin-top:0!important}
body.efc-specialties-redesign-v23 .efc-fact-icon-v23 svg{width:18px!important;height:18px!important}

@media(max-width:1180px){
 body.efc-specialties-redesign-v23 .content{width:min(860px,calc(100% - 18px))!important}
 body.efc-specialties-redesign-v23 .page-title{width:min(340px,46vw)!important}
}
@media(max-width:1040px){
 body.efc-specialties-redesign-v23 .centers-grid-v13,
 body.efc-specialties-redesign-v23 .spec-grid{grid-template-columns:repeat(2,minmax(0,1fr))!important}
 body.efc-specialties-redesign-v23 .content{width:calc(100% - 14px)!important}
 body.efc-specialties-redesign-v23 .page-title{width:min(330px,56vw)!important}
}
`;
document.head.appendChild(style);
window.EFC_COURSES_CENTERS_COMPACT_V25=Object.freeze({ready:true,realViewportSizing:true,compactCards:true,compactHeaders:true,desktopDensity:true,mainUntouched:true});
})();
