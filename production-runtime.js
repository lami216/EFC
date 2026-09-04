(() => {
  const productStyle = document.createElement('style');
  productStyle.textContent = `
    .production-side-note{display:block;color:#9fc1b6;text-align:center;font-size:9px;line-height:1.6}
    .production-empty-config{max-width:760px;margin:20px auto;text-align:center;padding:34px}
    .production-empty-config h2{margin:0 0 10px;font-size:19px}
    .production-empty-config p{margin:0 auto 18px;color:var(--muted);font-size:10px;line-height:1.9;max-width:560px}
    .receipt-viewer-prod{padding:18px!important}
    .receipt-viewer-card-prod{width:min(1180px,97vw);height:min(880px,95vh);background:#fff;border-radius:16px;box-shadow:0 26px 90px #0006;overflow:hidden;display:grid;grid-template-rows:52px 1fr}
    .receipt-viewer-head-prod{display:flex;align-items:center;justify-content:space-between;padding:0 16px;border-bottom:1px solid var(--border);background:#fff;direction:rtl}
    .receipt-viewer-head-prod b{font-size:12px}
    .receipt-viewer-close-prod{width:34px;height:34px;border:1px solid var(--border);border-radius:8px;background:#fff;color:var(--muted);font-size:20px;cursor:pointer}
    .receipt-viewer-frame-prod{width:100%;height:100%;border:0;background:#eef1f0}
  `;
  document.head.appendChild(productStyle);

  const logoHref = () => document.querySelector('link[rel="icon"]')?.href || './efc-logo.svg';

  shell = function(content) {
    app.innerHTML = `<div class="shell shell-v8"><aside><div class="brand"><div class="logo logo-v8"><img src="${logoHref()}" alt="EFC"></div><div><b>مركز EFC للتدريب</b><small>نظام إدارة الطلاب والمالية</small></div></div><nav>${navItems.map(([id,ic,n])=>`<a href="#${id}" class="${currentPage===id?'active':''}"><i>${ic}</i><span>${n}</span></a>`).join('')}</nav><div class="side-foot"><small class="production-side-note">البيانات محفوظة محليًا على هذا الجهاز</small></div></aside><main><section class="content">${content}</section></main></div>`;
  };

  const registerBaseProd = renderRegister;
  renderRegister = function() {
    if (!specialties.length) {
      shell(`${pageTitle('الواجهة الرئيسية','تسجيل طالب جديد','ابدأ بإضافة تخصص واحد على الأقل قبل تسجيل الطلاب.')}<div class="card production-empty-config"><h2>لا توجد تخصصات بعد</h2><p>النسخة الآن تبدأ بدون بيانات عرض. أضف التخصصات الفعلية للمركز وحدد المدة والسعر، وبعدها تصبح شاشة التسجيل جاهزة للاستخدام.</p><button class="button" id="goSpecialtiesProd">إضافة أول تخصص</button></div>`);
      document.getElementById('goSpecialtiesProd')?.addEventListener('click', () => { location.hash = '#specialties'; });
      return;
    }

    registerBaseProd();
    const start = document.getElementById('regStart');
    const form = document.getElementById('regForm');
    const today = typeof deviceTodayV3 === 'function' ? deviceTodayV3() : DEMO_TODAY;
    if (start) {
      start.value = today;
      start.dispatchEvent(new Event('change'));
    }
    form?.addEventListener('submit', () => setTimeout(() => {
      const input = document.getElementById('regStart');
      if (input) {
        input.value = today;
        input.dispatchEvent(new Event('change'));
      }
    }, 0));
  };

  const periodBaseProd = renderPeriod;
  renderPeriod = function() {
    periodBaseProd();
    const today = typeof deviceTodayV3 === 'function' ? deviceTodayV3() : DEMO_TODAY;
    const from = document.getElementById('periodFrom');
    const to = document.getElementById('periodTo');
    if (to) to.value = today;
    if (from && (!from.value || from.value > today)) from.value = `${today.slice(0,7)}-01`;
    to?.dispatchEvent(new Event('change'));
  };

  function createInAppReceiptWindow() {
    let html = '';
    let closed = false;
    const modal = document.createElement('div');
    modal.className = 'modal receipt-viewer-prod';
    modal.innerHTML = `<div class="receipt-viewer-card-prod"><div class="receipt-viewer-head-prod"><b>عرض الروسي</b><button class="receipt-viewer-close-prod" title="إغلاق">×</button></div><iframe class="receipt-viewer-frame-prod" title="الروسي"></iframe></div>`;
    document.body.appendChild(modal);
    const frame = modal.querySelector('.receipt-viewer-frame-prod');
    const closeButton = modal.querySelector('.receipt-viewer-close-prod');

    const close = () => {
      if (closed) return;
      closed = true;
      modal.remove();
      document.removeEventListener('keydown', onKey);
    };
    const onKey = event => { if (event.key === 'Escape') close(); };
    document.addEventListener('keydown', onKey);
    closeButton.onclick = close;
    modal.addEventListener('click', event => { if (event.target === modal) close(); });

    return {
      get closed() { return closed; },
      close,
      focus() { frame?.focus(); },
      document: {
        write(chunk) { html += String(chunk ?? ''); },
        close() {
          const patched = html
            .replaceAll('opener&&opener.downloadReceiptPdfV12(R12)', 'parent.downloadReceiptPdfV12&&parent.downloadReceiptPdfV12(R12)')
            .replaceAll('opener && opener.downloadReceiptPdfV12(R12)', 'parent.downloadReceiptPdfV12&&parent.downloadReceiptPdfV12(R12)');
          frame.srcdoc = patched;
        }
      }
    };
  }

  const nativeOpen = window.open.bind(window);
  window.open = function(url = '', target = '', features = '') {
    const blankReceipt = (url === '' || url === 'about:blank') && target === '_blank' && /width=|height=/.test(String(features));
    if (blankReceipt) return createInAppReceiptWindow();
    return nativeOpen(url, target, features);
  };

  try {
    if (typeof renderCurrentMerged === 'function') renderCurrentMerged();
    else if (typeof renderCurrent === 'function') renderCurrent();
  } catch (error) {
    console.error('EFC production render failed.', error);
  }
})();
