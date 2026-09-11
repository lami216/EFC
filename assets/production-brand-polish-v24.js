(async()=>{
'use strict';
if(window.EFC_BRAND_POLISH_V24?.ready)return;
const waitUntil=async(check,timeout=15000)=>{const start=Date.now();while(!check()){if(Date.now()-start>timeout)throw new Error('Brand polish v24 timed out.');await new Promise(resolve=>setTimeout(resolve,20));}};
await waitUntil(()=>window.EFC_COURSES_CENTERS_REDESIGN_V23?.ready&&typeof window.shell==='function');
const baseShell=window.shell;
function apply(){
  const brand=document.querySelector('.shell-v13 .brand');if(!brand)return;
  const title=brand.querySelector('b');if(title)title.innerHTML='<span>مركز EFC</span><span>للمعلوماتية واللغات</span>';
  const logoBox=brand.querySelector('.logo');const img=logoBox?.querySelector('img');
  if(logoBox){logoBox.style.padding='3px';logoBox.style.width='52px';logoBox.style.height='52px';}
  if(img){img.style.padding='0';img.style.width='100%';img.style.height='100%';img.style.maxWidth='none';img.style.maxHeight='none';img.style.objectFit='contain';}
}
window.shell=function(content){const result=baseShell(content);apply();return result;};
apply();
const style=document.createElement('style');style.id='efc-brand-polish-style-v24';style.textContent=`
html body .shell-v13 aside .brand .logo{width:52px!important;height:52px!important;padding:3px!important;display:grid!important;place-items:center!important;overflow:hidden!important;flex:0 0 52px!important}
html body .shell-v13 aside .brand .logo img{width:100%!important;height:100%!important;max-width:none!important;max-height:none!important;padding:0!important;object-fit:contain!important;transform:none!important}
html body .shell-v13 aside .brand b{display:grid!important;gap:1px!important;line-height:1.18!important}
html body .shell-v13 aside .brand b span:first-child{font-size:15px!important;font-weight:850!important}
html body .shell-v13 aside .brand b span:last-child{font-size:13px!important;font-weight:800!important}
`;
document.head.appendChild(style);
window.EFC_BRAND_POLISH_V24=Object.freeze({ready:true,logoUsesSquare:true,logoArtworkLarge:true,brandLineOne:'مركز EFC',brandLineTwo:'للمعلوماتية واللغات',mainUntouched:true});
})();
