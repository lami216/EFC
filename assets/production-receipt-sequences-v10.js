(()=>{
  const FLAG='__EFC_RECEIPT_SEQUENCES_V10__';
  if(window[FLAG])return;

  const GENERAL_MARKER='efc-general-receipt-sequence-v10';
  const CERT_MARKER='efc-certificate-receipt-sequence-v10';
  const CERT_STORAGE='efc-certificate-state-v1';
  const invoke=window.__TAURI__?.core?.invoke;

  function boot(){
    const ready=window.EFC_CERTIFICATES_V13?.ready&&typeof students!=='undefined'&&typeof saveStudents==='function'&&typeof receiptModelV4==='function'&&typeof allPayments==='function';
    if(!ready){setTimeout(boot,25);return;}
    if(window[FLAG])return;
    window[FLAG]=true;

    const baseReceiptModel=receiptModelV4;
    const baseAllPayments=allPayments;
    const int=value=>{const number=Number(value);return Number.isInteger(number)&&number>0?number:null;};
    const persistStudents=()=>{
      try{saveStudents();}catch(error){console.error('EFC receipt sequence student save failed.',error);}
      try{Promise.resolve(window.EFC_FORCE_PERSIST?.()).catch(error=>console.error('EFC receipt sequence native save failed.',error));}catch{}
    };

    function generalEvents(){
      const events=[];
      students.forEach((student,studentIndex)=>{
        const payments=Array.isArray(student.payments)?student.payments:[];
        if(!payments.length){events.push({kind:'registration',student,index:null,date:String(student.start||''),time:'00:00',stamp:Number(student.createdAt||0),tie:`${String(student.reg||0).padStart(8,'0')}:${studentIndex}:${student.id||''}`});return;}
        payments.forEach((payment,index)=>events.push({kind:'payment',student,payment,index,date:String(payment?.[0]||student.start||''),time:String(payment?.[3]||'00:00'),stamp:Number(payment?.[4]||0),tie:`${String(student.reg||0).padStart(8,'0')}:${studentIndex}:${String(index).padStart(6,'0')}:${student.id||''}`}));
      });
      return events.sort((a,b)=>a.date.localeCompare(b.date)||a.time.localeCompare(b.time)||a.stamp-b.stamp||a.tie.localeCompare(b.tie));
    }
    function eventNumber(event){return event.kind==='payment'?int(event.payment?.[8]):int(event.student?.registrationReceiptNo);}
    function setEventNumber(event,number){if(event.kind==='payment')event.payment[8]=number;else event.student.registrationReceiptNo=number;}
    function maxGeneralNumber(){let max=0;generalEvents().forEach(event=>{max=Math.max(max,eventNumber(event)||0);});return max;}
    function migrateGeneralSequence(){
      const events=generalEvents();
      if(localStorage.getItem(GENERAL_MARKER)!=='1'){
        events.forEach((event,index)=>setEventNumber(event,index+1));localStorage.setItem(GENERAL_MARKER,'1');if(events.length)persistStudents();return;
      }
      let next=maxGeneralNumber()+1,changed=false;const seen=new Set();
      events.forEach(event=>{const current=eventNumber(event);if(!current||seen.has(current)){setEventNumber(event,next++);changed=true;}else seen.add(current);});
      if(changed)persistStudents();
    }
    function ensurePaymentNumber(student,index){const payment=student?.payments?.[index];if(!payment)return ensureRegistrationNumber(student);let number=int(payment[8]);if(number)return number;number=maxGeneralNumber()+1;payment[8]=number;persistStudents();return number;}
    function ensureRegistrationNumber(student){if(student?.payments?.length)return ensurePaymentNumber(student,0);let number=int(student?.registrationReceiptNo);if(number)return number;number=maxGeneralNumber()+1;student.registrationReceiptNo=number;persistStudents();return number;}
    function modelReceiptNumber(student,paymentIndex,statement){const payments=student?.payments||[];if(statement){if(payments.length)return ensurePaymentNumber(student,payments.length-1);return ensureRegistrationNumber(student);}if(paymentIndex===null||paymentIndex===undefined)return payments.length?ensurePaymentNumber(student,0):ensureRegistrationNumber(student);return ensurePaymentNumber(student,Number(paymentIndex));}

    migrateGeneralSequence();
    receiptModelV4=function(student,paymentIndex=null,statement=false){const model=baseReceiptModel(student,paymentIndex,statement);if(model)model.receipt=String(modelReceiptNumber(student,paymentIndex,statement));return model;};
    allPayments=function(){const rows=baseAllPayments();rows.forEach(row=>{if(row?.sourceType==='certificate')return;const index=Number(row?.paymentIndex);if(row?.student&&Number.isInteger(index)&&index>=0)row.receipt=String(ensurePaymentNumber(row.student,index));});return rows;};

    function readCertificateState(){try{const raw=JSON.parse(localStorage.getItem(CERT_STORAGE)||'{}');return{certificateBranches:Array.isArray(raw?.certificateBranches)?raw.certificateBranches:[],certificateReceipts:Array.isArray(raw?.certificateReceipts)?raw.certificateReceipts:[]};}catch{return{certificateBranches:[],certificateReceipts:[]};}}
    function reindexCertificates(state){const ordered=state.certificateReceipts.map((receipt,index)=>({receipt,index,date:String(receipt?.date||''),time:String(receipt?.time||'00:00'),stamp:Number(receipt?.timestamp||receipt?.createdAt||0),id:String(receipt?.id||'')})).sort((a,b)=>a.date.localeCompare(b.date)||a.time.localeCompare(b.time)||a.stamp-b.stamp||a.id.localeCompare(b.id));let changed=false;ordered.forEach((entry,index)=>{const number=index+1;if(Number(entry.receipt.receiptNo)!==number){entry.receipt.receiptNo=number;changed=true;}});return changed;}
    async function persistCertificateState(state){localStorage.setItem(CERT_STORAGE,JSON.stringify(state));if(invoke){try{await invoke('save_certificate_state',{state:JSON.stringify(state)});}catch(error){console.error('EFC certificate sequence save failed.',error);}}}
    async function migrateCertificateSequence(){if(localStorage.getItem(CERT_MARKER)==='1')return;const state=readCertificateState(),changed=reindexCertificates(state);localStorage.setItem(CERT_MARKER,'1');if(changed)await persistCertificateState(state);}
    migrateCertificateSequence().catch(error=>console.error('EFC certificate sequence migration failed.',error));

    window.EFC_RECEIPT_SEQUENCES_V10=Object.freeze({
      generalReceiptsNumericOnly:true,
      generalReceiptsStartAtOne:true,
      certificateReceiptsStartAtOne:true,
      externalCertificateRegistrationNative:true,
      legacyReceiptPrefixesRemoved:true,
      noCertificateDomObserver:true,
      noCertificateReloadPatch:true
    });
  }

  boot();
})();