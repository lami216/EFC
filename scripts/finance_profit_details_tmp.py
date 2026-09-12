from pathlib import Path
import re

finance_path=Path('assets/production-finance-ui-v13.js')
text=finance_path.read_text(encoding='utf-8')

# Keep the selected finance section when returning from dedicated detail pages.
text=text.replace("renderFinance=function(){\n  currentPage='finance';", "renderFinance=function(initialSection='income'){\n  currentPage='finance';", 1)
text=text.replace('<div class="finance-switch-v13"><button class="active" data-section="income">المداخيل</button><button data-section="expenses">المصاريف</button><button data-section="profit">الربحية</button></div>', '<div class="finance-switch-v13"><button class="${initialSection===\'income\'?\'active\':\'\'}" data-section="income">المداخيل</button><button class="${initialSection===\'expenses\'?\'active\':\'\'}" data-section="expenses">المصاريف</button><button class="${initialSection===\'profit\'?\'active\':\'\'}" data-section="profit">الربحية</button></div>', 1)
text=text.replace("  let section='income',mode='monthly',profitView='branch';", "  let section=['income','expenses','profit'].includes(initialSection)?initialSection:'income',mode='monthly',profitView='branch';", 1)

old_controls="""    if(section==='expenses')action.innerHTML=`${canEdit('finance')?'<button class=\"button\" id=\"addExpenseV13\">＋ تسجيل مصروف</button>':''}<button class=\"button secondary\" id=\"viewExpenseHistoryV13\">عرض سجل المصاريف</button>`;else action.innerHTML='';
    document.getElementById('addExpenseV13')?.addEventListener('click',()=>openExpenseEditor(null,draw));
    document.getElementById('viewExpenseHistoryV13')?.addEventListener('click',renderExpenseHistory);"""
new_controls="""    if(section==='expenses')action.innerHTML=`${canEdit('finance')?'<button class=\"button\" id=\"addExpenseV13\">＋ تسجيل مصروف</button>':''}<button class=\"button secondary\" id=\"viewExpenseHistoryV13\">عرض سجل المصاريف</button>`;
    else if(section==='profit')action.innerHTML='<button class=\"button secondary\" id=\"viewProfitabilityDetailsV13\">عرض تفاصيل الربحية</button>';
    else action.innerHTML='';
    document.getElementById('addExpenseV13')?.addEventListener('click',()=>openExpenseEditor(null,draw));
    document.getElementById('viewExpenseHistoryV13')?.addEventListener('click',renderExpenseHistory);
    document.getElementById('viewProfitabilityDetailsV13')?.addEventListener('click',()=>renderProfitabilityDetails({mode,year:document.getElementById('yearV13').value,month:document.getElementById('monthV13').value,branch:document.getElementById('branchV13').value,specialty:specEl.value}));"""
if old_controls not in text: raise SystemExit('controls block not found')
text=text.replace(old_controls,new_controls,1)

old_income="""      html=`<div class=\"kpis\"><div class=\"card\"><div class=\"finance-kpi-line-v13\"><small>إجمالي دخل الفترة</small><b>${cash(incomeTotal)}</b></div><span>${period}</span></div><div class=\"card\"><div class=\"finance-kpi-line-v13\"><small>عدد عمليات التحصيل</small><b>${income.length}</b></div></div><div class=\"card\"><div class=\"finance-kpi-line-v13\"><small>متوسط قيمة الدفعة</small><b>${cash(income.length?Math.round(incomeTotal/income.length):0)}</b></div></div><div class=\"card\"><div class=\"finance-kpi-line-v13\"><small>إجمالي مستحقات النشطين</small><b>${cash(due)}</b></div></div></div><div class=\"card chart-card\">${chart(series(income,mode,year,month),'income')}</div><div class=\"grid three breakdowns\"><div class=\"card\"><h3>حسب الفرع</h3>${breakdown(groupRows(income,row=>branchName(row.student.branch)),incomeTotal)}</div><div class=\"card\"><h3>حسب التخصص</h3>${breakdown(groupRows(income,row=>spec(row.student.specialty)?.name||row.student.specialty),incomeTotal)}</div><div class=\"card\"><h3>حسب وسيلة الدفع</h3>${breakdown(groupRows(income,row=>row.method),incomeTotal)}</div></div>`;"""
new_income="""      html=`<div class=\"kpis\"><div class=\"card\"><div class=\"finance-kpi-line-v13\"><small>الدخل</small><b>${cash(incomeTotal)}</b></div><span>${period}</span></div><div class=\"card\"><div class=\"finance-kpi-line-v13\"><small>عدد المسجلين</small><b>${active.length}</b></div></div><div class=\"card\"><div class=\"finance-kpi-line-v13\"><small>متوسط الدفعة</small><b>${cash(income.length?Math.round(incomeTotal/income.length):0)}</b></div></div><div class=\"card\"><div class=\"finance-kpi-line-v13\"><small>المستحقات</small><b>${cash(due)}</b></div></div></div><div class=\"card chart-card\">${chart(series(income,mode,year,month),'income')}</div><div class=\"grid three breakdowns\"><div class=\"card\"><h3>حسب الفرع</h3>${breakdown(groupRows(income,row=>branchName(row.student.branch)),incomeTotal)}</div><div class=\"card\"><h3>حسب التخصص</h3>${breakdown(groupRows(income,row=>spec(row.student.specialty)?.name||row.student.specialty),incomeTotal)}</div><div class=\"card\"><h3>حسب وسيلة الدفع</h3>${breakdown(groupRows(income,row=>row.method),incomeTotal)}</div></div>`;"""
if old_income not in text: raise SystemExit('income KPI block not found')
text=text.replace(old_income,new_income,1)

old_expense="""      html=`<div class=\"kpis\"><div class=\"card\"><div class=\"finance-kpi-line-v13\"><small>إجمالي مصاريف الفترة</small><b class=\"expense-total-v13\">${cash(expenseTotal)}</b></div><span>${period}</span></div><div class=\"card\"><div class=\"finance-kpi-line-v13\"><small>عدد عمليات الصرف</small><b>${costs.length}</b></div></div><div class=\"card\"><div class=\"finance-kpi-line-v13\"><small>متوسط قيمة المصروف</small><b>${cash(costs.length?Math.round(expenseTotal/costs.length):0)}</b></div></div><div class=\"card\"><div class=\"finance-kpi-line-v13\"><small>أعلى مصروف مسجل</small><b>${cash(Math.max(0,...costs.map(row=>row.amount)))}</b></div></div></div><div class=\"card chart-card\">${chart(series(costs,mode,year,month),'expense')}</div><div class=\"grid three breakdowns\"><div class=\"card\"><h3>حسب الفرع</h3>${breakdown(groupRows(costs,row=>branchName(row.branch)),expenseTotal,true)}</div><div class=\"card\"><h3>حسب التخصص</h3>${breakdown(groupRows(costs,row=>expenseSpecialtyName(row.specialty)),expenseTotal,true)}</div><div class=\"card\"><h3>حسب الوسيلة</h3>${breakdown(groupRows(costs,row=>row.method),expenseTotal,true)}</div></div>`;"""
new_expense="""      html=`<div class=\"kpis\"><div class=\"card\"><div class=\"finance-kpi-line-v13\"><small>المصاريف</small><b class=\"expense-total-v13\">${cash(expenseTotal)}</b></div><span>${period}</span></div><div class=\"card\"><div class=\"finance-kpi-line-v13\"><small>عدد المصاريف</small><b>${costs.length}</b></div></div><div class=\"card\"><div class=\"finance-kpi-line-v13\"><small>متوسط المصروف</small><b>${cash(costs.length?Math.round(expenseTotal/costs.length):0)}</b></div></div><div class=\"card\"><div class=\"finance-kpi-line-v13\"><small>أكبر مصروف</small><b>${cash(Math.max(0,...costs.map(row=>row.amount)))}</b></div></div></div><div class=\"card chart-card\">${chart(series(costs,mode,year,month),'expense')}</div><div class=\"grid three breakdowns\"><div class=\"card\"><h3>حسب الفرع</h3>${breakdown(groupRows(costs,row=>branchName(row.branch)),expenseTotal,true)}</div><div class=\"card\"><h3>حسب التخصص</h3>${breakdown(groupRows(costs,row=>expenseSpecialtyName(row.specialty)),expenseTotal,true)}</div><div class=\"card\"><h3>حسب الوسيلة</h3>${breakdown(groupRows(costs,row=>row.method),expenseTotal,true)}</div></div>`;"""
if old_expense not in text: raise SystemExit('expense KPI block not found')
text=text.replace(old_expense,new_expense,1)

old_profit="""      html=`<div class=\"kpis\"><div class=\"card\"><div class=\"finance-kpi-line-v13\"><small>إجمالي المداخيل</small><b>${cash(incomeTotal)}</b></div></div><div class=\"card\"><div class=\"finance-kpi-line-v13\"><small>إجمالي المصاريف</small><b class=\"expense-total-v13\">${cash(expenseTotal)}</b></div></div><div class=\"card\"><div class=\"finance-kpi-line-v13\"><small>صافي الربح</small><b class=\"${net<0?'negative-v13':''}\">${cash(net)}</b></div></div><div class=\"card\"><div class=\"finance-kpi-line-v13\"><small>هامش الربح</small><b>${(incomeTotal?net/incomeTotal*100:0).toFixed(1)}%</b></div></div></div><div class=\"card chart-card\"><h3>صافي الربح التراكمي</h3>${chart(profitSeries,'profit')}</div><div class=\"card profitability-explorer-v13\"><div class=\"segmented profitability-mode-v13\" id=\"profitDimensionV13\"><button class=\"${profitView==='branch'?'active':''}\" data-profit-view=\"branch\">الفرع</button><button class=\"${profitView==='specialty'?'active':''}\" data-profit-view=\"specialty\">التخصص</button><button class=\"${profitView==='method'?'active':''}\" data-profit-view=\"method\">وسيلة الدفع</button></div><div id=\"profitabilityListV13\">${profitabilityTable(profitView,income,costs)}</div></div>`;"""
new_profit="""      html=`<div class=\"kpis\"><div class=\"card\"><div class=\"finance-kpi-line-v13\"><small>الدخل</small><b>${cash(incomeTotal)}</b></div><span>${period}</span></div><div class=\"card\"><div class=\"finance-kpi-line-v13\"><small>المصاريف</small><b class=\"expense-total-v13\">${cash(expenseTotal)}</b></div></div><div class=\"card\"><div class=\"finance-kpi-line-v13\"><small>صافي الربح</small><b class=\"${net<0?'negative-v13':''}\">${cash(net)}</b></div></div><div class=\"card\"><div class=\"finance-kpi-line-v13\"><small>هامش الربح</small><b>${(incomeTotal?net/incomeTotal*100:0).toFixed(1)}%</b></div></div></div><div class=\"card chart-card\"><h3>صافي الربح التراكمي</h3>${chart(profitSeries,'profit')}</div>`;"""
if old_profit not in text: raise SystemExit('profit block not found')
text=text.replace(old_profit,new_profit,1)

# The main profit dashboard no longer owns the detail-table toggle handlers.
text=text.replace("document.querySelectorAll('.edit-expense-v13').forEach(button=>button.onclick=()=>openExpenseEditor(button.dataset.id,draw));document.querySelectorAll('#profitDimensionV13 [data-profit-view]').forEach(button=>button.onclick=()=>{profitView=button.dataset.profitView;draw();});controls();", "document.querySelectorAll('.edit-expense-v13').forEach(button=>button.onclick=()=>openExpenseEditor(button.dataset.id,draw));controls();", 1)

# Return from expense history to the expense tab rather than resetting to income.
text=text.replace("document.getElementById('backToFinanceV13')?.addEventListener('click',renderFinance);", "document.getElementById('backToFinanceV13')?.addEventListener('click',()=>renderFinance('expenses'));", 1)

# Dedicated profitability detail page, preserving the filters/period selected on the dashboard.
marker='function renderExpenseHistory(){'
if marker not in text: raise SystemExit('expense history marker missing')
profit_details=r'''function renderProfitabilityDetails(context={}){
  currentPage='finance';expenses=D.getExpenses();
  const current=today(),currentYear=Number(current.slice(0,4)),currentMonth=Number(current.slice(5,7)),mode=['daily','monthly','yearly'].includes(context.mode)?context.mode:'monthly',year=Number(context.year||currentYear),month=Number(context.month||currentMonth),branch=String(context.branch||''),specialty=String(context.specialty||''),range=mode==='daily'?monthBounds(year,month):mode==='monthly'?yearBounds(year):tenYears(),effectiveTo=range.to<current?range.to:current,period=mode==='daily'?`${monthNames[month-1]} ${year}`:mode==='monthly'?`سنة ${year}`:`${range.start} — ${range.end}`,income=allPayments().filter(row=>row.date>=range.from&&row.date<=effectiveTo&&(!branch||row.student.branch===branch)&&(!specialty||(specialty!==GENERAL_EXPENSE&&row.student.specialty===specialty))),costs=expenses.filter(row=>expenseMatches(row,{from:range.from,to:effectiveTo,branch,specialty}));
  let view='branch';
  shell(`<section class="finance-hero-v13"><svg viewBox="0 0 24 24" aria-hidden="true"><g fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><path d="M4 19V9M10 19V5M16 19v-7M22 19H2M3.5 7.5 9 3l5 5 6-5"/></g></svg><h1>تفاصيل الربحية</h1></section><div class="profitability-details-toolbar-v13"><button class="button secondary" id="backToProfitV13">العودة للربحية</button><span>${esc(period)}</span></div><div class="card profitability-explorer-v13 profitability-details-v13"><div class="segmented profitability-mode-v13" id="profitDimensionV13"><button class="active" data-profit-view="branch">الفرع</button><button data-profit-view="specialty">التخصص</button><button data-profit-view="method">وسيلة الدفع</button></div><div id="profitabilityListV13">${profitabilityTable(view,income,costs)}</div></div>`);
  document.getElementById('backToProfitV13')?.addEventListener('click',()=>renderFinance('profit'));
  const list=document.getElementById('profitabilityListV13');
  document.querySelectorAll('#profitDimensionV13 [data-profit-view]').forEach(button=>button.onclick=()=>{view=button.dataset.profitView;document.querySelectorAll('#profitDimensionV13 [data-profit-view]').forEach(item=>item.classList.toggle('active',item===button));list.innerHTML=profitabilityTable(view,income,costs);});
}

'''
text=text.replace(marker,profit_details+marker,1)

# More compact KPI typography and a dedicated profitability-details surface matching the redesign language.
css_marker='@media(max-width:1250px){.finance-controls-v13{grid-template-columns:repeat(2,1fr)!important}}'
if css_marker not in text: raise SystemExit('finance CSS marker missing')
extra_css=r'''
.content:has(.finance-switch-v13) #financeBodyV13>.kpis>.card{min-height:58px!important;padding:7px 12px!important}
.content:has(.finance-switch-v13) .finance-kpi-line-v13{display:flex!important;align-items:center!important;justify-content:space-between!important;gap:8px!important;width:100%!important;min-width:0!important}
.content:has(.finance-switch-v13) .finance-kpi-line-v13 small{margin:0!important;font-size:9.5px!important;line-height:1.15!important;white-space:nowrap!important;color:#44665d!important;font-weight:760!important}
.content:has(.finance-switch-v13) .finance-kpi-line-v13 b{font-size:16px!important;line-height:1!important;white-space:nowrap!important;flex:0 0 auto!important}
.content:has(.finance-switch-v13) #financeBodyV13>.kpis span{margin-top:4px!important;font-size:8.4px!important}
.profitability-details-toolbar-v13{width:900px;margin:0 0 9px;display:flex;align-items:center;justify-content:space-between;gap:10px;direction:ltr}
.profitability-details-toolbar-v13 .button{height:38px;border-radius:9px;padding:0 16px}.profitability-details-toolbar-v13 span{direction:rtl;font-size:10px;font-weight:760;color:#4d6c63;background:#eef8f4;border:1px solid #cce3db;border-radius:999px;padding:7px 12px}
.profitability-details-v13{width:900px!important;margin:0!important;padding:14px!important;border:1.4px solid #4aa68c!important;border-radius:13px!important;background:linear-gradient(145deg,#fbfffd,#f4fbf8)!important;box-shadow:0 9px 25px rgba(22,83,64,.04)!important}
.profitability-details-v13 .profitability-mode-v13{display:grid!important;grid-template-columns:repeat(3,1fr)!important;gap:6px!important;width:360px!important;margin:0 0 12px auto!important;padding:4px!important;border:1px solid #c9ddd6!important;border-radius:11px!important;background:#e9f4f0!important}
.profitability-details-v13 .profitability-mode-v13 button{height:34px!important;border:1px solid transparent!important;border-radius:8px!important;background:transparent!important;color:#567269!important;font-family:inherit!important;font-size:10.5px!important;font-weight:780!important;cursor:pointer!important}
.profitability-details-v13 .profitability-mode-v13 button:hover{color:#0b6853!important;background:#f7fcfa!important}.profitability-details-v13 .profitability-mode-v13 button.active{background:linear-gradient(180deg,#0b7b62,#08624f)!important;border-color:#08624f!important;color:#fff!important;box-shadow:0 5px 12px rgba(8,98,79,.14)!important}
.profitability-details-v13 .table-wrap{max-height:420px!important;overflow:auto!important;border:1px solid #aaccc1!important;border-radius:10px!important;background:#fff!important}.profitability-details-v13 table{font-size:10px!important}.profitability-details-v13 th{position:sticky!important;top:0!important;z-index:2!important;height:38px!important;background:linear-gradient(180deg,#0a715b,#075846)!important;color:#fff!important}.profitability-details-v13 td{height:35px!important;padding:6px 9px!important}
'''
text=text.replace(css_marker,extra_css+'\n'+css_marker,1)

# Update feature markers to document the consolidated behavior.
text=text.replace('profitabilityByMethod:true,', 'profitabilityByMethod:true,profitabilityDedicatedPage:true,compactFinanceKpis:true,', 1)
finance_path.write_text(text,encoding='utf-8')

# Extend runtime verification for the new dedicated profitability page.
ver=Path('scripts/verify-critical-runtime.mjs')
v=ver.read_text(encoding='utf-8')
needle="requireText(financeUi,'function axisStep','finance charts use stable human-friendly Y-axis steps');"
insert=needle+"\nrequireText(financeUi,'viewProfitabilityDetailsV13','profitability dashboard exposes a dedicated details action');\nrequireText(financeUi,'function renderProfitabilityDetails','profitability detail table lives on its own page');\nrequireText(financeUi,'compactFinanceKpis:true','finance KPI titles stay compact');"
if needle not in v: raise SystemExit('critical verifier anchor missing')
v=v.replace(needle,insert,1)
ver.write_text(v,encoding='utf-8')

feedback=Path('scripts/verify-finance-feedback-v13.mjs')
f=feedback.read_text(encoding='utf-8')
needle="  ['profitabilityByMethod:true','profitability by payment method'],"
insert=needle+"\n  ['profitabilityDedicatedPage:true','dedicated profitability details page'],\n  ['viewProfitabilityDetailsV13','profitability details action'],\n  ['compactFinanceKpis:true','compact finance KPI titles'],"
if needle not in f: raise SystemExit('finance feedback verifier anchor missing')
f=f.replace(needle,insert,1)
feedback.write_text(f,encoding='utf-8')

# Bust browser cache in both the HTML and runtime loader.
for p in [Path('index.html'),Path('assets/production-license-gate-v8.js')]:
    s=p.read_text(encoding='utf-8')
    s=s.replace('20260912-finance-redesign-4','20260912-finance-redesign-5')
    p.write_text(s,encoding='utf-8')
