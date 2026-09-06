(()=>{
  const FLAG='__EFC_CERTIFICATE_FILTERS_V8__';
  if(window[FLAG])return;

  function install(){
    const ready=window.EFC_CERTIFICATES_V7&&typeof students!=='undefined'&&typeof specialties!=='undefined'&&typeof branches!=='undefined'&&typeof spec==='function'&&typeof branchName==='function';
    if(!ready){setTimeout(install,40);return;}
    window[FLAG]=true;

    const style=document.createElement('style');
    style.textContent=`.cert-internal-filters-v8{display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:10px}.cert-filter-hint-v8{display:block;color:var(--muted);font-size:8px;margin:-2px 0 8px}@media(max-width:760px){.cert-internal-filters-v8{grid-template-columns:1fr}}`;
    document.head.appendChild(style);

    function enhance(){
      const pane=document.getElementById('certInternalPane');
      const search=document.getElementById('certStudentSearch');
      const results=document.getElementById('certStudentResults');
      const selected=document.getElementById('certSelectedStudent');
      const issue=document.getElementById('certIssue');
      if(!pane||!search||!results||!selected||!issue||pane.dataset.filtersV8==='1')return;
      pane.dataset.filtersV8='1';

      const originalSearch=search.oninput;
      const filterBox=document.createElement('div');
      filterBox.className='cert-internal-filters-v8';
      filterBox.innerHTML=`<label>الفرع<select id="certInternalBranch"><option value="">اختر الفرع أولًا</option>${branches.map(item=>`<option value="${String(item.id).replace(/"/g,'&quot;')}">${String(item.name).replace(/[&<>]/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;'}[ch]))}</option>`).join('')}</select></label><label>التخصص<select id="certInternalSpec" disabled><option value="">اختر التخصص</option></select></label>`;
      pane.insertBefore(filterBox,search.closest('label'));
      const hint=document.createElement('small');
      hint.className='cert-filter-hint-v8';
      hint.textContent='اختر الفرع والتخصص ثم ابحث عن الطالب داخل هذا التسجيل فقط.';
      filterBox.after(hint);

      const branchSelect=filterBox.querySelector('#certInternalBranch');
      const specSelect=filterBox.querySelector('#certInternalSpec');
      let activeSelectedId=null;

      function escapeHtml(value){return String(value??'').replace(/[&<>"']/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));}
      function resetSelection(){
        activeSelectedId=null;
        issue.disabled=true;
        selected.innerHTML='<div class="cert-empty-v7">اختر طالبًا من نتائج الفرع والتخصص المحددين.</div>';
        results.innerHTML='';
      }
      function refreshSpecialties(){
        const branch=branchSelect.value;
        const allowed=new Set(students.filter(student=>student.branch===branch).map(student=>student.specialty));
        specSelect.innerHTML=`<option value="">اختر التخصص</option>${specialties.filter(item=>allowed.has(item.id)).map(item=>`<option value="${escapeHtml(item.id)}">${escapeHtml(item.name)}</option>`).join('')}`;
        specSelect.disabled=!branch;
        specSelect.value='';
        search.value='';
        resetSelection();
      }
      function drawFiltered(){
        resetSelection();
        const branch=branchSelect.value,specialty=specSelect.value,q=search.value.trim().toLowerCase();
        if(!branch||!specialty){results.innerHTML='<div class="cert-search-empty-v7">اختر الفرع والتخصص قبل البحث.</div>';return;}
        if(!q){results.innerHTML='';return;}
        const matches=students.filter(student=>student.branch===branch&&student.specialty===specialty&&(String(student.name||'').toLowerCase().includes(q)||String(student.phone||'').includes(q)||String(student.reg||'').includes(q)||String(student.recordCode||'').toLowerCase().includes(q))).slice(0,20);
        results.innerHTML=matches.length?matches.map(student=>`<button type="button" class="cert-student-option-v7" data-filtered-student="${escapeHtml(student.id)}"><b>${escapeHtml(student.name)}</b><span>${escapeHtml(student.phone||'—')} · ${String(student.reg).padStart(4,'0')} · ${escapeHtml(branchName(student.branch))} · ${escapeHtml(spec(student.specialty)?.name||student.specialty)}</span></button>`).join(''):'<div class="cert-search-empty-v7">لا يوجد طالب مطابق داخل هذا الفرع والتخصص.</div>';
        results.querySelectorAll('[data-filtered-student]').forEach(button=>button.onclick=()=>{
          const student=students.find(item=>item.id===button.dataset.filteredStudent);if(!student)return;
          const token=String(student.recordCode||'').trim();
          if(!token||typeof originalSearch!=='function'){results.innerHTML='<div class="cert-search-empty-v7">تعذر تثبيت اختيار الطالب. أعد فتح صفحة الشهادات.</div>';return;}
          search.value=token;
          originalSearch.call(search,new Event('input'));
          const nativeButton=results.querySelector(`[data-student="${CSS.escape(student.id)}"]`);
          if(!nativeButton){search.value='';results.innerHTML='<div class="cert-search-empty-v7">تعذر تثبيت اختيار الطالب. أعد البحث.</div>';return;}
          nativeButton.click();
          activeSelectedId=student.id;
          issue.disabled=false;
        });
      }

      branchSelect.onchange=refreshSpecialties;
      specSelect.onchange=()=>{search.value='';resetSelection();};
      search.oninput=drawFiltered;
      search.placeholder='الاسم أو الهاتف أو رقم السجل داخل الفرع والتخصص';
      issue.disabled=true;
      resetSelection();

      document.querySelectorAll('.cert-mode-v7 button').forEach(button=>button.addEventListener('click',()=>{
        if(button.dataset.mode==='external')issue.disabled=false;
        else issue.disabled=!activeSelectedId;
      }));
    }

    const observer=new MutationObserver(enhance);
    observer.observe(document.getElementById('app')||document.body,{childList:true,subtree:true});
    enhance();
    window.EFC_CERTIFICATE_FILTERS_V8=Object.freeze({branchRequired:true,specialtyRequired:true,staleSelectionBlocked:true});
  }

  install();
})();
