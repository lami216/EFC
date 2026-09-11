(async()=>{
'use strict';
if(window.EFC_COURSES_CENTERS_ORDER_FIX_V26?.ready)return;
const waitUntil=async(check,timeout=15000)=>{const start=Date.now();while(!check()){if(Date.now()-start>timeout)throw new Error('Courses/centers order fix v26 timed out.');await new Promise(resolve=>setTimeout(resolve,20));}};
await waitUntil(()=>window.EFC_COURSES_CENTERS_REDESIGN_V23?.ready&&document.getElementById('efc-courses-centers-compact-style-v25'));
const compactStyle=document.getElementById('efc-courses-centers-compact-style-v25');
if(compactStyle)document.head.appendChild(compactStyle);
window.EFC_COURSES_CENTERS_ORDER_FIX_V26=Object.freeze({ready:true,compactStyleRunsAfterRedesign:true,preventsLateV23Override:true,mainUntouched:true});
})();
