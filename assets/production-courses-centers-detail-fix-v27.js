(async()=>{
'use strict';
if(window.EFC_COURSES_CENTERS_DETAIL_FIX_V27?.ready)return;
const waitUntil=async(check,timeout=15000)=>{const start=Date.now();while(!check()){if(Date.now()-start>timeout)throw new Error('Courses/centers detail fix v27 timed out.');await new Promise(resolve=>setTimeout(resolve,20));}};
await waitUntil(()=>window.EFC_COURSES_CENTERS_ORDER_FIX_V26?.ready&&document.getElementById('efc-courses-centers-compact-style-v25'));
const style=document.createElement('style');
style.id='efc-courses-centers-detail-fix-style-v27';
style.textContent=`
/* Keep center title block on the opposite side of the edit button (right side in RTL). */
body.efc-specialties-redesign-v23 .center-card-v13 h3{
  margin:0 0 0 84px!important;
  padding:0 11px!important;
  direction:rtl!important;
  text-align:right!important;
  justify-content:flex-start!important;
  border:1px solid rgba(0,0,0,.48)!important;
}
/* Make the inner borders clearly visible without touching the large outer card/panel borders. */
body.efc-specialties-redesign-v23 .center-card-v13>div>span{
  border:1px solid rgba(0,0,0,.38)!important;
}
body.efc-specialties-redesign-v23 .spec-top h3{
  border:1px solid rgba(0,0,0,.48)!important;
}
body.efc-specialties-redesign-v23 .spec-facts>div:not(.efc-hidden-fact-v23){
  border:1px solid rgba(0,0,0,.38)!important;
}
`;
document.head.appendChild(style);
window.EFC_COURSES_CENTERS_DETAIL_FIX_V27=Object.freeze({ready:true,centerTitleOnRight:true,visibleInnerBorders:true,outerBordersUntouched:true,mainUntouched:true});
})();
