(()=>{
'use strict';
if(window.EFC_COURSES_CENTERS_COMPACT_V25?.ready)return;
const style=document.createElement('style');
style.id='efc-courses-centers-compact-style-v25';
style.textContent=`
body.efc-specialties-redesign-v23 .content{padding:14px 18px 26px!important}
body.efc-specialties-redesign-v23 .page-title{width:min(430px,46vw)!important;min-height:62px!important;margin:0 auto 12px!important;border-radius:15px!important;padding:0 18px!important}
body.efc-specialties-redesign-v23 .page-title>div{gap:16px!important}
body.efc-specialties-redesign-v23 .page-title h1{font-size:clamp(25px,2.2vw,31px)!important}
body.efc-specialties-redesign-v23 .efc-page-icon-v23 svg{width:36px!important;height:36px!important}

body.efc-specialties-redesign-v23 .efc-centers-panel-v23,
body.efc-specialties-redesign-v23 .efc-courses-panel-v23{padding:11px 13px 13px!important;margin-bottom:12px!important;border-radius:13px!important}
body.efc-specialties-redesign-v23 .centers-head-v13,
body.efc-specialties-redesign-v23 .efc-courses-head-v23{gap:10px!important;margin-bottom:10px!important}
body.efc-specialties-redesign-v23 .efc-section-controls-v23{gap:7px!important}
body.efc-specialties-redesign-v23 .centers-head-v13 h2,
body.efc-specialties-redesign-v23 .efc-courses-head-v23 h2{min-width:195px!important;min-height:46px!important;padding:0 16px!important;border-radius:12px!important;gap:12px!important;font-size:22px!important}
body.efc-specialties-redesign-v23 .efc-section-icon-v23 svg{width:27px!important;height:27px!important}
body.efc-specialties-redesign-v23 .efc-add-v23,
body.efc-specialties-redesign-v23 .efc-view-all-v23{min-height:42px!important;height:42px!important;padding:0 15px!important;border-radius:10px!important;font-size:12.5px!important;gap:7px!important}
body.efc-specialties-redesign-v23 .efc-view-all-v23 svg{width:19px!important;height:19px!important}

body.efc-specialties-redesign-v23 .centers-grid-v13,
body.efc-specialties-redesign-v23 .spec-grid{gap:10px!important}
body.efc-specialties-redesign-v23 .center-card-v13,
body.efc-specialties-redesign-v23 .spec-card{min-height:0!important;padding:11px 12px!important;border-radius:11px!important}
body.efc-specialties-redesign-v23 .center-card-v13{height:136px!important;gap:8px!important}
body.efc-specialties-redesign-v23 .center-card-v13 h3{min-height:42px!important;padding:0 12px!important;padding-left:88px!important;border-radius:8px!important;gap:8px!important;font-size:15.5px!important}
body.efc-specialties-redesign-v23 .center-card-v13>div>span{min-height:52px!important;padding:8px 12px!important;border-radius:8px!important;font-size:15.5px!important}
body.efc-specialties-redesign-v23 .efc-card-count-label-v23{font-size:10px!important}
body.efc-specialties-redesign-v23 .efc-card-count-icon-v23 svg{width:27px!important;height:27px!important}
body.efc-specialties-redesign-v23 .efc-card-title-icon-v23 svg{width:24px!important;height:24px!important}
body.efc-specialties-redesign-v23 .center-card-v13 .edit-center-v13,
body.efc-specialties-redesign-v23 .spec-card .edit-spec-v13{top:11px!important;left:11px!important;min-height:34px!important;height:34px!important;padding:0 10px!important;border-radius:8px!important;font-size:11px!important}

body.efc-specialties-redesign-v23 .spec-card{height:150px!important}
body.efc-specialties-redesign-v23 .spec-top{min-height:42px!important;padding-left:82px!important}
body.efc-specialties-redesign-v23 .spec-top h3{min-height:42px!important;padding:0 11px!important;border-radius:8px!important;gap:8px!important;font-size:15.5px!important}
body.efc-specialties-redesign-v23 .spec-facts{gap:8px!important;margin-top:8px!important}
body.efc-specialties-redesign-v23 .spec-facts>div:not(.efc-hidden-fact-v23){min-height:55px!important;padding:7px 9px!important;border-radius:8px!important}
body.efc-specialties-redesign-v23 .spec-facts small{font-size:9.5px!important}
body.efc-specialties-redesign-v23 .spec-facts b{font-size:14px!important;margin-top:1px!important}
body.efc-specialties-redesign-v23 .efc-fact-icon-v23 svg{width:24px!important;height:24px!important}

@media(max-width:1240px){
 body.efc-specialties-redesign-v23 .page-title{width:min(400px,50vw)!important}
 body.efc-specialties-redesign-v23 .centers-grid-v13,
 body.efc-specialties-redesign-v23 .spec-grid{grid-template-columns:repeat(3,minmax(0,1fr))!important}
 body.efc-specialties-redesign-v23 .centers-head-v13 h2,
 body.efc-specialties-redesign-v23 .efc-courses-head-v23 h2{min-width:180px!important;font-size:20px!important}
 .efc-limit-three-v23:not(.is-expanded-v23)>:nth-child(n+4){display:none!important}
}
@media(max-width:1100px){
 body.efc-specialties-redesign-v23 .centers-grid-v13,
 body.efc-specialties-redesign-v23 .spec-grid{grid-template-columns:repeat(2,minmax(0,1fr))!important}
 body.efc-specialties-redesign-v23 .page-title{width:min(370px,55vw)!important;min-height:58px!important}
 body.efc-specialties-redesign-v23 .page-title h1{font-size:24px!important}
}
@media(max-height:760px){
 body.efc-specialties-redesign-v23 .content{padding-top:9px!important;padding-bottom:18px!important}
 body.efc-specialties-redesign-v23 .page-title{min-height:54px!important;margin-bottom:9px!important}
 body.efc-specialties-redesign-v23 .page-title h1{font-size:23px!important}
 body.efc-specialties-redesign-v23 .efc-page-icon-v23 svg{width:31px!important;height:31px!important}
 body.efc-specialties-redesign-v23 .efc-centers-panel-v23,
 body.efc-specialties-redesign-v23 .efc-courses-panel-v23{padding:9px 11px 10px!important;margin-bottom:9px!important}
 body.efc-specialties-redesign-v23 .centers-head-v13,
 body.efc-specialties-redesign-v23 .efc-courses-head-v23{margin-bottom:8px!important}
 body.efc-specialties-redesign-v23 .centers-head-v13 h2,
 body.efc-specialties-redesign-v23 .efc-courses-head-v23 h2{min-height:40px!important;font-size:19px!important}
 body.efc-specialties-redesign-v23 .efc-add-v23,
 body.efc-specialties-redesign-v23 .efc-view-all-v23{height:38px!important;min-height:38px!important;font-size:11.5px!important}
 body.efc-specialties-redesign-v23 .center-card-v13{height:118px!important;padding:9px 10px!important}
 body.efc-specialties-redesign-v23 .center-card-v13 h3{min-height:36px!important;font-size:14px!important;padding-left:78px!important}
 body.efc-specialties-redesign-v23 .center-card-v13>div>span{min-height:43px!important;font-size:14px!important;padding-top:6px!important;padding-bottom:6px!important}
 body.efc-specialties-redesign-v23 .center-card-v13 .edit-center-v13,
 body.efc-specialties-redesign-v23 .spec-card .edit-spec-v13{top:9px!important;left:9px!important;height:30px!important;min-height:30px!important;font-size:10.5px!important}
 body.efc-specialties-redesign-v23 .spec-card{height:132px!important;padding:9px 10px!important}
 body.efc-specialties-redesign-v23 .spec-top{min-height:36px!important;padding-left:76px!important}
 body.efc-specialties-redesign-v23 .spec-top h3{min-height:36px!important;font-size:14px!important}
 body.efc-specialties-redesign-v23 .spec-facts{margin-top:6px!important;gap:6px!important}
 body.efc-specialties-redesign-v23 .spec-facts>div:not(.efc-hidden-fact-v23){min-height:45px!important;padding:5px 7px!important}
 body.efc-specialties-redesign-v23 .spec-facts small{font-size:8.5px!important}
 body.efc-specialties-redesign-v23 .spec-facts b{font-size:12.5px!important}
 body.efc-specialties-redesign-v23 .efc-fact-icon-v23 svg{width:21px!important;height:21px!important}
}
`;
document.head.appendChild(style);
window.EFC_COURSES_CENTERS_COMPACT_V25=Object.freeze({ready:true,realViewportSizing:true,compactCards:true,compactHeaders:true,mainUntouched:true});
})();
