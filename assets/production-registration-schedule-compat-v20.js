(async()=>{
'use strict';
if(window.EFC_REGISTRATION_SCHEDULE_COMPAT_V20?.ready)return;
const waitUntil=async(check,timeout=15000)=>{const start=Date.now();while(!check()){if(Date.now()-start>timeout)throw new Error('Registration schedule compat v20 timed out.');await new Promise(resolve=>setTimeout(resolve,20));}};
await waitUntil(()=>window.EFC_REGISTRATION_SCHEDULE_MATRIX_V17?.ready&&window.EFC_REGISTRATION_SELECT_NATIVE_V19?.ready&&typeof window.renderRegister==='function');

const DAYS=[
  {key:'monday',ar:'الاثنين'},
  {key:'tuesday',ar:'الثلاثاء'},
  {key:'wednesday',ar:'الأربعاء'},
  {key:'thursday',ar:'الخميس'},
  {key:'friday',ar:'الجمعة'},
  {key:'saturday',ar:'السبت'},
  {key:'sunday',ar:'الأحد'}
];
const baseRenderRegister=window.renderRegister;

function sharedRow(){
  return`<tr class="schedule-time-row-v20"><th>الوقت</th>${DAYS.map(day=>`<td><input type="time" class="schedule-day-time-v20" data-shared-day="${day.key}" aria-label="وقت ${day.ar}" autocomplete="off"></td>`).join('')}</tr>`;
}

function enhanceSchedule(){
  const form=document.getElementById('regFormV13');
  const root=document.querySelector('.registration-schedule-card-v13');
  const tbody=root?.querySelector('.schedule-table-v13 tbody');
  if(!form||!root||!tbody)return;

  if(tbody.querySelector('.schedule-time-row-v17')&&tbody.querySelector('.schedule-course-check-v17'))return;
  if(tbody.querySelector('.schedule-time-row-v20'))return;

  const rows=[...tbody.querySelectorAll('.schedule-matrix-row-v17')];
  if(!rows.length)return;
  const firstOld=rows[0].querySelector('[data-matrix-course][data-matrix-day]');
  if(!firstOld||firstOld.type!=='time')return;

  tbody.insertAdjacentHTML('afterbegin',sharedRow());
  const shared=Object.fromEntries(DAYS.map(day=>[day.key,tbody.querySelector(`[data-shared-day="${day.key}"]`)]));

  rows.forEach(row=>{
    row.querySelectorAll('[data-matrix-course][data-matrix-day]').forEach(oldInput=>{
      const day=String(oldInput.dataset.matrixDay||'');
      const cell=oldInput.closest('td');
      oldInput.classList.add('efc-hidden-course-time-v20');
      if(oldInput.value&&!shared[day]?.value)shared[day].value=oldInput.value;
      const label=document.createElement('label');
      label.className='schedule-course-check-v20';
      label.innerHTML='<input type="checkbox"><span></span>';
      const check=label.querySelector('input');
      check.checked=Boolean(oldInput.value);
      check.addEventListener('change',()=>{
        const time=shared[day];
        if(check.checked&&!time?.value){
          check.checked=false;
          alert(`حدد وقت ${DAYS.find(item=>item.key===day)?.ar||'اليوم'} أولًا، ثم اختر الدورة.`);
          time?.focus();
          return;
        }
        oldInput.value=check.checked?String(time?.value||''):'';
        oldInput.dispatchEvent(new Event('change',{bubbles:true}));
      });
      cell.appendChild(label);
    });
  });

  Object.entries(shared).forEach(([day,input])=>input?.addEventListener('change',()=>{
    rows.forEach(row=>{
      const oldInput=row.querySelector(`[data-matrix-day="${day}"]`);
      const check=oldInput?.closest('td')?.querySelector('.schedule-course-check-v20 input');
      if(!oldInput||!check)return;
      if(!input.value){check.checked=false;oldInput.value='';}
      else if(check.checked)oldInput.value=input.value;
      oldInput.dispatchEvent(new Event('change',{bubbles:true}));
    });
  }));

  form.addEventListener('reset',()=>queueMicrotask(()=>{
    tbody.querySelectorAll('[data-shared-day]').forEach(input=>input.value='');
    tbody.querySelectorAll('.schedule-course-check-v20 input').forEach(input=>input.checked=false);
  }));
}

window.renderRegister=function(){baseRenderRegister();enhanceSchedule();};
enhanceSchedule();

const style=document.createElement('style');
style.id='efc-registration-schedule-compat-style-v20';
style.textContent=`
body.efc-registration-redesign-v15 .efc-hidden-course-time-v20{display:none!important}
body.efc-registration-redesign-v15 .schedule-time-row-v20 th{font-weight:800!important;background:#e7eee9!important}
body.efc-registration-redesign-v15 .schedule-time-row-v20 td{height:47px!important;padding:4px!important;background:#fffdf3}
body.efc-registration-redesign-v15 .schedule-day-time-v20{width:100%;min-width:0;height:34px;border:1px solid #c7d3cf;border-radius:7px;background:#fff;padding:2px 3px;font:700 11px "Segoe UI Variable","Segoe UI",Tahoma,sans-serif;text-align:center;color:#17352d}
body.efc-registration-redesign-v15 .schedule-course-check-v20{display:inline-grid!important;place-items:center!important;margin:0!important;cursor:pointer}
body.efc-registration-redesign-v15 .schedule-course-check-v20 input{position:absolute;opacity:0;pointer-events:none}
body.efc-registration-redesign-v15 .schedule-course-check-v20 span{display:block;width:22px;height:22px;border:2px solid #50625b;border-radius:5px;background:#fff;transition:.12s ease}
body.efc-registration-redesign-v15 .schedule-course-check-v20 input:checked+span{background:#111;border-color:#111}
`;
document.head.appendChild(style);

window.EFC_REGISTRATION_SCHEDULE_COMPAT_V20=Object.freeze({ready:true,sharedDayTimes:true,courseCheckboxes:true,cacheSafe:true,mainUntouched:true});
})();
