(()=>{
  const FLAG='__EFC_LEDGER_PDF_V6__';
  if(window[FLAG]) return;

  function boot(){
    const ready=
      window.EFC_LEDGER_FINANCE_UI_V5 &&
      typeof receiptWindowV4==='function' &&
      typeof receiptModelV4==='function' &&
      typeof allPayments==='function';
    if(!ready){setTimeout(boot,40);return;}
    window[FLAG]=true;

    const style=document.createElement('style');
    style.textContent=`
      #ledgerBody tbody tr[data-student][data-payment]{cursor:pointer;transition:background .12s ease}
      #ledgerBody tbody tr[data-student][data-payment]:hover{background:#f1f8f5}
      #ledgerBody .ledger-open-v5{color:inherit!important;font-weight:inherit!important;cursor:inherit!important;text-decoration:none!important}
      #ledgerBody .ledger-open-v5:hover{text-decoration:none!important}
    `;
    document.head.appendChild(style);

    document.addEventListener('click',event=>{
      const target=event.target instanceof Element?event.target:null;
      const row=target?.closest('#ledgerBody tbody tr[data-student][data-payment]');
      if(!row) return;
      const student=students.find(item=>item.id===row.dataset.student);
      const paymentIndex=Number(row.dataset.payment);
      if(!student||!Number.isInteger(paymentIndex)||paymentIndex<0) return;
      event.preventDefault();
      event.stopImmediatePropagation();
      receiptWindowV4(receiptModelV4(student,paymentIndex));
    },true);

    let captureRequest=null;
    const previousOpen=window.open.bind(window);

    function wrapReceiptWindow(result){
      if(!result?.document?.write||!result?.document?.close) return result;
      const write=result.document.write.bind(result.document);
      const close=result.document.close.bind(result.document);
      return {
        get closed(){return Boolean(result.closed);},
        close(){return result.close?.();},
        focus(){return result.focus?.();},
        document:{
          write(chunk){
            const patched=String(chunk??'')
              .replaceAll('class="download12"','class="download12 native-save12"')
              .replaceAll('opener&&opener.downloadReceiptPdfV12(R12)','parent.EFC_SAVE_RECEIPT_PDF(R12)')
              .replaceAll('opener && opener.downloadReceiptPdfV12(R12)','parent.EFC_SAVE_RECEIPT_PDF(R12)')
              .replaceAll('>تحميل PDF</button>','>حفظ PDF</button>');
            write(patched);
          },
          close(){return close();}
        }
      };
    }

    window.open=function(url='',target='',features=''){
      if(captureRequest){
        const state=captureRequest;
        captureRequest=null;
        return {
          closed:false,
          close(){},
          focus(){},
          document:{
            write(chunk){state.html+=String(chunk??'');},
            close(){state.resolve(state.html);}
          }
        };
      }
      return wrapReceiptWindow(previousOpen(url,target,features));
    };

    function captureReceiptHtml(receipt){
      return new Promise((resolve,reject)=>{
        const state={html:'',resolve};
        captureRequest=state;
        const timeout=setTimeout(()=>{
          if(captureRequest===state) captureRequest=null;
          reject(new Error('تعذر تجهيز الروسي للحفظ.'));
        },3000);
        state.resolve=html=>{clearTimeout(timeout);resolve(html);};
        try{receiptWindowV4(receipt,false);}catch(error){
          clearTimeout(timeout);
          if(captureRequest===state) captureRequest=null;
          reject(error);
        }
      });
    }

    function loadLocalScript(src,key){
      if(window[key]) return Promise.resolve();
      return new Promise((resolve,reject)=>{
        const script=document.createElement('script');
        script.src=src;
        script.onload=()=>resolve();
        script.onerror=()=>reject(new Error(`تعذر تحميل ${src} محليًا.`));
        document.head.appendChild(script);
      });
    }

    function waitFrame(frame){
      return new Promise((resolve,reject)=>{
        const timer=setTimeout(()=>reject(new Error('تأخر تجهيز الروسي للحفظ.')),4000);
        frame.onload=()=>{clearTimeout(timer);resolve();};
      });
    }

    async function waitImages(root){
      const images=[...root.querySelectorAll('img')];
      await Promise.all(images.map(image=>image.complete?Promise.resolve():new Promise(resolve=>{
        image.onload=resolve;
        image.onerror=resolve;
        setTimeout(resolve,1200);
      })));
      try{await root.ownerDocument.fonts?.ready;}catch{}
    }

    function arrayBufferToBase64(buffer){
      const bytes=new Uint8Array(buffer);
      const size=0x8000;
      let binary='';
      for(let offset=0;offset<bytes.length;offset+=size){
        binary+=String.fromCharCode(...bytes.subarray(offset,Math.min(offset+size,bytes.length)));
      }
      return btoa(binary);
    }

    async function saveReceiptPdf(receipt){
      let frame;
      try{
        await Promise.all([
          loadLocalScript('./vendor/html2canvas.min.js','html2canvas'),
          loadLocalScript('./vendor/jspdf.umd.min.js','jspdf')
        ]);
        const html=await captureReceiptHtml(receipt);
        frame=document.createElement('iframe');
        frame.setAttribute('aria-hidden','true');
        frame.style.cssText='position:fixed;left:-16000px;top:0;width:1120px;height:760px;border:0;opacity:0;pointer-events:none';
        document.body.appendChild(frame);
        const loaded=waitFrame(frame);
        frame.srcdoc=html;
        await loaded;
        const paper=frame.contentDocument?.querySelector('.paper12');
        if(!paper) throw new Error('تعذر العثور على محتوى الروسي.');
        await waitImages(paper);
        const canvas=await window.html2canvas(paper,{scale:2,backgroundColor:'#fff',useCORS:false,allowTaint:false,logging:false});
        const {jsPDF}=window.jspdf;
        const pdf=new jsPDF({orientation:'landscape',unit:'mm',format:'a4'});
        const pageWidth=pdf.internal.pageSize.getWidth();
        const pageHeight=pdf.internal.pageSize.getHeight();
        const ratio=Math.min(pageWidth/canvas.width,pageHeight/canvas.height);
        const width=canvas.width*ratio;
        const height=canvas.height*ratio;
        pdf.addImage(canvas.toDataURL('image/jpeg',.96),'JPEG',(pageWidth-width)/2,(pageHeight-height)/2,width,height);
        const receiptNo=typeof westernDigitsV3==='function'?westernDigitsV3(receipt.receipt||receipt.reg||'EFC'):String(receipt.receipt||receipt.reg||'EFC');
        const fileName=`وصل-${receiptNo}.pdf`;
        const buffer=pdf.output('arraybuffer');
        const invoke=window.__TAURI__?.core?.invoke;
        if(!invoke){
          pdf.save(fileName);
          return fileName;
        }
        const savedPath=await invoke('save_receipt_pdf',{fileName,dataBase64:arrayBufferToBase64(buffer)});
        alert(`تم حفظ ملف PDF مباشرة في التنزيلات:\n${savedPath}`);
        return savedPath;
      }catch(error){
        console.error('EFC native PDF save failed.',error);
        alert(String(error?.message||error||'تعذر حفظ PDF.'));
        return null;
      }finally{
        frame?.remove();
      }
    }

    window.EFC_SAVE_RECEIPT_PDF=saveReceiptPdf;
    window.downloadReceiptPdfV12=saveReceiptPdf;

    if(typeof receiptActionsV4==='function'){
      receiptActionsV4=function(receipt){
        const key='native-r-'+Date.now()+Math.random().toString(36).slice(2);
        setTimeout(()=>{
          document.querySelector(`[data-open="${key}"]`)?.addEventListener('click',()=>receiptWindowV4(receipt));
          document.querySelector(`[data-print="${key}"]`)?.addEventListener('click',()=>receiptWindowV4(receipt,true));
          document.querySelector(`[data-save="${key}"]`)?.addEventListener('click',()=>saveReceiptPdf(receipt));
        },0);
        return `<button class="button secondary" data-open="${key}">فتح الروسي</button><button class="button secondary" data-print="${key}">طباعة</button><button class="button" data-save="${key}">حفظ PDF</button>`;
      };
    }

    if(typeof receiptButtonsV4==='function'){
      receiptButtonsV4=function(receipt){
        const key='native-rb-'+Date.now()+Math.random().toString(36).slice(2);
        setTimeout(()=>{
          document.querySelector(`[data-print="${key}"]`)?.addEventListener('click',()=>receiptWindowV4(receipt,true));
          document.querySelector(`[data-save="${key}"]`)?.addEventListener('click',()=>saveReceiptPdf(receipt));
        },0);
        return `<button class="button secondary" data-print="${key}">طباعة</button><button class="button" data-save="${key}">حفظ PDF</button>`;
      };
    }

    window.EFC_LEDGER_PDF_V6=Object.freeze({
      ledgerWholeRowOpensExactReceipt:true,
      ledgerLinksNeutral:true,
      offlinePdfLibraries:true,
      directDownloadsFolderSave:true,
      printAndPdfSeparated:true
    });
  }

  boot();
})();
