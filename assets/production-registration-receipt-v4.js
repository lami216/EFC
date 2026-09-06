(()=>{
  const FLAG='__EFC_REGISTRATION_RECEIPT_V4__';
  if(window[FLAG]) return;

  function boot(){
    const ready=
      window.EFC_STUDENT_FILE_V3 &&
      typeof renderRegister==='function' &&
      typeof receiptModelV4==='function' &&
      typeof installmentPlanV3==='function' &&
      typeof allocV4==='function';
    if(!ready){setTimeout(boot,40);return;}
    window[FLAG]=true;

    const baseRegister=renderRegister;
    const baseReceiptModel=receiptModelV4;

    function ensureBlankChoice(select,label){
      if(!select) return;
      let option=select.querySelector('option[value=""]');
      if(!option){
        option=document.createElement('option');
        option.value='';
        option.textContent=label;
        option.disabled=true;
        option.hidden=true;
        select.prepend(option);
      }
      select.value='';
    }

    function prepareRegistrationChoices(){
      const form=document.getElementById('regForm');
      if(!form) return;
      ensureBlankChoice(form.elements?.branch,'اختر الفرع');
      ensureBlankChoice(form.elements?.specialty,'اختر التخصص');
      const inline=document.getElementById('regSummary');
      const side=document.getElementById('regSummarySide');
      if(inline) inline.innerHTML='';
      if(side) side.innerHTML='<div class="empty small">اختر التخصص لعرض ملخص التسجيل.</div>';
    }

    renderRegister=function(){
      baseRegister();
      prepareRegistrationChoices();
      const form=document.getElementById('regForm');
      if(!form||form.dataset.manualChoicesV4==='1') return;
      form.dataset.manualChoicesV4='1';
      form.addEventListener('submit',()=>setTimeout(prepareRegistrationChoices,0));
    };

    function receiptScope(student,paymentIndex){
      if(paymentIndex===null||paymentIndex===undefined){
        if(student.payments?.length) paymentIndex=0;
        else return {student:{...student,payments:[],paid:0},paymentIndex:null,monthNumber:1};
      }
      const payments=(student.payments||[]).slice(0,paymentIndex+1);
      const scoped={...student,payments,paid:payments.reduce((sum,payment)=>sum+Number(payment?.[1]||0),0)};
      const count=Math.max(0,Number((student.snapshot||{}).durationValue||0));
      const target=Number(payments[paymentIndex]?.[7]||0);
      if(Number.isInteger(target)&&target>=1&&target<=count){
        return {student:scoped,paymentIndex,monthNumber:target};
      }
      const months=allocV4(scoped,paymentIndex)?.months||[];
      const monthNumber=Number(months.at(-1)?.n||1);
      return {student:scoped,paymentIndex,monthNumber};
    }

    receiptModelV4=function(student,paymentIndex=null,statement=false){
      const model=baseReceiptModel(student,paymentIndex,statement);
      if(!model||statement||(student.snapshot||{}).billing!=='monthly') return model;
      const scoped=receiptScope(student,paymentIndex);
      const month=installmentPlanV3(scoped.student)[scoped.monthNumber-1];
      if(month) model.remaining=Math.max(0,Number(month.remaining||0));
      return model;
    };

    window.EFC_REGISTRATION_RECEIPT_V4=Object.freeze({
      manualBranchAndSpecialty:true,
      monthlyReceiptUsesMonthRemaining:true,
      nonMonthlyReceiptUsesCourseRemaining:true
    });

    if(typeof currentPage!=='undefined'&&currentPage==='register'){
      try{renderRegister();}catch(error){console.error('EFC registration choice refresh failed.',error);}
    }
  }

  boot();
})();
