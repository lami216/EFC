import {readFileSync} from 'node:fs';

const finance=readFileSync('assets/production-finance-ui-v13.js','utf8');
const security=readFileSync('assets/production-security-ui-v13.js','utf8');
const auth=readFileSync('assets/production-auth-bootstrap-v13.js','utf8');
const certificates=readFileSync('assets/production-certificates-v13.js','utf8');
const requireFinance=(needle,label=needle)=>{if(!finance.includes(needle))throw new Error(`Finance feedback missing: ${label}`);};
const forbidFinance=(needle,label=needle)=>{if(finance.includes(needle))throw new Error(`Finance feedback regression: ${label}`);};
const requireSecurity=(needle,label=needle)=>{if(!security.includes(needle))throw new Error(`Security feedback missing: ${label}`);};
const requireAuth=(needle,label=needle)=>{if(!auth.includes(needle))throw new Error(`Login feedback missing: ${label}`);};
const forbidAuth=(needle,label=needle)=>{if(auth.includes(needle))throw new Error(`Login feedback regression: ${label}`);};
const requireCertificate=(needle,label=needle)=>{if(!certificates.includes(needle))throw new Error(`Certificate finance feedback missing: ${label}`);};

for(const [token,label] of [
  ['finance-topbar-v13','finance tabs and view actions share one row'],
  ['expenseActionAboveControls:true','expense action placement marker'],
  ['pct-v13','breakdown percentages'],
  ['breakdownPercentages:true','breakdown percentage marker'],
  ['finance-hover-tip-v13','chart hover tooltip'],
  ['data-chart-label','chart point labels'],
  ['data-chart-value','chart point values'],
  ['chartHoverValues:true','chart hover marker'],
  ['function visibleBuckets(mode,year,month)','future bucket cutoff'],
  ['bucket.date<=cutoff','future periods excluded from chart'],
  ['effectiveTo=range.to<current?range.to:current','future transactions excluded from finance totals'],
  ['noFutureChartPoints:true','future chart marker'],
  ['profitability-explorer-v13','single profitability explorer'],
  ['profitDimensionV13','profitability dimension switch'],
  ['data-profit-view="branch"','branch profitability option'],
  ['data-profit-view="specialty"','specialty profitability option'],
  ['data-profit-view="method"','payment-method profitability option'],
  ['profitabilitySingleExplorer:true','single profitability marker'],
  ['profitabilityByMethod:true','profitability by payment method'],
  ['profitabilityDedicatedPage:true','dedicated profitability details page'],
  ['viewProfitabilityDetailsV13','profitability details action'],
  ['compactFinanceKpis:true','compact finance KPI titles'],
  ['function dailyStatement(row)','daily statement classifier'],
  ['دفع شهري جزئي','monthly partial statement'],
  ['دفع شهري كامل','monthly full statement'],
  ['دفع جزئي من الدورة','course partial statement'],
  ['دفع كامل للدورة','course full statement'],
  ['<th>الاسم</th><th>البيان</th>','separate name and statement columns'],
  ['dailySeparateNameAndStatement:true','daily column marker'],
  ['periodScopedRegistrationCount:true','registration count follows selected period'],
  ['periodScopedExpenseCount:true','expense count follows selected period'],
  ['financePeriodContextHints:true','finance KPI period descriptions'],
  ['financeAverageKpisRemoved:true','average payment/expense KPIs removed'],
  ['incomeHistoryAction:true','income section exposes an income history action'],
  ['incomeHistoryPeriodFilters:true','income history has daily/week/month/year period filters'],
  ['incomeHistoryFilterMatchesFinance:true','income history uses finance branch/course filters'],
  ['incomeHistoryBlankFromUsesOldestAvailable:true','income history blank week start uses oldest income'],
  ['incomeHistorySourceActions:true','income history exposes source-safe receipt actions'],
  ['incomeHistoryFilterStatePreserved:true','income history keeps its selected filters across redraws'],
  ['id="viewIncomeHistoryV13"','income history action button'],
  ['id="incomeHistoryModeV13"','income history period switch'],
  ['id="incomeHistoryBranchV13"','income history branch filter'],
  ['id="incomeHistorySpecV13"','income history course filter'],
  ['id="incomeHistoryMessageV13"','income history dynamic filter/result message'],
  ['function incomeHistoryOldestDate()','income history resolves oldest income date'],
  ["const rawFrom=String(state.from||'').trim()",'income history supports a blank week start'],
  ['deleteStudentPaymentSource','income history deletion routes to the payment source'],
  ['open-income-receipt-v13','income history can open receipts'],
  ['edit-income-history-v13','income history can edit source receipts'],
  ['delete-income-history-v13','income history can delete source receipts'],
  ['expenseHistoryActionRed:true','expense history action is visually destructive'],
  ['expenseHistoryPeriodFilters:true','expense history has the same daily/week/month/year period filter'],
  ['expenseHistoryFilterMatchesFinance:true','expense history reuses finance branch/course filtering'],
  ['expenseHistoryBlankFromUsesOldestAvailable:true','expense history blank week start uses oldest expense'],
  ['expenseHistoryFilterMessage:true','expense history filter summary updates with results'],
  ['id="expenseHistoryModeV13"','expense history period switch'],
  ['id="expenseHistoryBranchV13"','expense history branch filter'],
  ['id="expenseHistorySpecV13"','expense history course filter'],
  ['id="expenseHistoryMessageV13"','expense history dynamic filter/result message'],
  ['function expenseHistoryOldestDate()','expense history resolves oldest expense date'],
  ["const rawFrom=String(state.from||'').trim()",'expense history supports blank week start'],
  ["expenseMatches(row,{from:r.from,to:effectiveTo,branch,specialty})",'expense history rows follow the selected filters'],
  ['currentUnpaidBalanceDebtCard:true','finance debt KPI counts every current unpaid balance'],
  ['debtCardIgnoresDateFilter:true','finance debt KPI is current and ignores the selected date period'],
  ['weeklyBlankFromUsesOldestAvailable:true','blank week start date uses the oldest finance record'],
  ['profitPeriodContextHints:true','profit cards describe the selected period'],
  ['<small>الدين</small>','finance debt KPI label'],
  ['remainingAmount,installmentPlan,expenseSpecialtyName','finance imports the balance helpers used by finance views'],
  ['debtStudents.reduce((sum,student)=>sum+Math.max(0,Number(remainingAmount(student)||0)),0)','debt KPI sums every current unpaid student balance'],
  ['إجمالي المبالغ غير المدفوعة حاليًا','debt KPI clearly describes the current unpaid balance'],
  ['function financeOldestAvailableDate()','finance can resolve the oldest available record for blank week starts'],
  ['function studentRegistrationDate(student)','registration date resolver'],
  ['registered=students.filter','period registration filter'],
  ['finance-kpis-three-v23','three-card income and expense KPI layout'],
  ['finance-expense-history-action-v23','red expense-history action'],
  ['expenseReceiptMatchesStudentHeader:true','expense receipt uses the same receipt header language'],
  ['expenseReceiptPdfWaitsForLogo:true','expense PDF waits for the center logo'],
  ['expenseReceiptUsesSharedEmbeddedLogo:true','expense receipt uses the shared embedded logo'],
  ['expenseWaitImages(paper)','expense PDF image readiness'],
  ['profitDetailsActionEmphasized:true','profit details action is visually emphasized'],
  ['profitabilitySpreadsheetTable:true','profit details use spreadsheet table styling'],
  ['profitabilityDetailsTotalProfit:true','profit details show total net profit above the explorer'],
  ['profitability-total-v13','profit details total card'],
  ['<small>مجموع الربح</small>','profit details total label'],
  ['finance-profit-details-action-v27','profit details button class'],
  ['expenseReceiptsNumericSequence:true','expense receipts use numeric sequence'],
  ['function expenseReceiptCode(row){const number=expenseReceiptNumberOf','expense receipt header is numeric'],
  ['financeResponsiveLikeLedger:true','finance dashboards adapt like the daily ledger on narrower screens'],
  ['financeResponsiveAt900LikeLedger:true','finance switches to ledger-like compact controls at 900px'],
  ['@media(max-width:900px){','finance 900px compact breakpoint'],
  ['.content:has(.finance-switch-v13) .finance-controls-v13{grid-template-columns:1fr!important}','finance controls collapse to one column on compact screens'],
  ['@media(max-width:1180px){','finance compact viewport breakpoint'],
  ['ledgerResponsiveLikeFinance:true','ledger adapts on narrower screens'],
  ['@media(max-width:1180px)','ledger responsive breakpoint'],
  ['min-width:760px!important','ledger table scrolls instead of clipping'],
  ['ledgerSummaryMoneyOnly:true','ledger summary cards show monetary totals only'],
  ['ledgerDailyProfit:true','daily profit marker'],
  ['<small>ربحية اليومية</small>','daily profit label']
])requireFinance(token,label);


for(const [token,label] of [
  ['chartsRemovedFromFinance:true','finance dashboards no longer render graphs'],
  ['dailyDateFilter:true','daily finance uses one full date'],
  ['customDateRangeFilter:true','finance supports a custom from/to period'],
  ['monthlySelectedMonth:true','monthly finance uses the selected month'],
  ['yearlySelectedYear:true','yearly finance uses the selected year'],
  ['id=\"dayV13\" type=\"date\"','daily finance date picker'],
  ['id=\"fromV13\" type=\"date\"','custom finance range start'],
  ['id=\"toV13\" type=\"date\"','custom finance range end'],
  ["from=document.getElementById('fromV13').value||''",'finance preserves an intentionally blank week start'],
  ['const oldest=financeOldestAvailableDate()','blank finance week starts from the oldest available date'],
  ['data-mode="weekly">أسبوع</button>','main finance uses the certificate finance week label'],
  ['controlsRoot.dataset.mode=mode','finance controls expose selected period geometry'],
  ['.finance-controls-v13[data-mode="weekly"]{grid-template-columns:148px 124px 124px 102px 140px!important','week filter geometry matches certificate finance'],
  ['#financeModeV13{width:100%!important;max-width:100%!important;min-width:0!important;height:34px!important','finance period switch matches certificate finance size'],
  ['button[data-mode="weekly"]{background:linear-gradient(180deg,#f7f4ff,#f0ecfb)!important','week filter uses certificate finance color'],
  ["dayWrap.hidden=mode!=='daily';fromWrap.hidden=mode!=='weekly';toWrap.hidden=mode!=='weekly';monthWrap.hidden=mode!=='monthly';yearWrap.hidden=!['monthly','yearly'].includes(mode)",'period-specific finance controls']
])requireFinance(token,label);
forbidFinance('<div class=\"card chart-card\">${chart(series(income','income chart must stay removed');
forbidFinance('<div class=\"card chart-card\">${chart(series(costs','expense chart must stay removed');
forbidFinance('صافي الربح التراكمي','profit chart must stay removed');
forbidFinance('<small>متوسط الدفعة</small>','average payment KPI must stay removed');
forbidFinance('<small>متوسط المصروف</small>','average expense KPI must stay removed');

const topbarPos=finance.indexOf('finance-topbar-v13');
const switchPos=finance.indexOf('finance-switch-v13');
const actionPos=finance.indexOf('financePrimaryActionV13');
const controlsPos=finance.indexOf('card finance-controls finance-controls-v13');
if(!(topbarPos>=0&&switchPos>topbarPos&&actionPos>switchPos&&controlsPos>actionPos))throw new Error('Finance view action must share the tab row above the controls card.');
forbidFinance("pageTitle('الإدارة المالية','المالية','المداخيل والمصاريف والربحية حسب الفترة والفلاتر.','<div id=\"financePrimaryActionV13\"></div>')",'expense action returned to page header');
forbidFinance('profitability-tables-v13','old three profitability cards returned');
forbidFinance('return`EXP-','opaque expense receipt codes must not return');
forbidFinance('${income.length} · ${cash(incomeTotal)}','income summary must not mix count with money');
forbidFinance('${costs.length} · ${cash(expenseTotal)}','expense summary must not mix count with money');
forbidFinance('<small>صافي اليوم</small>','obsolete daily net label');

for(const [token,label] of [
  ['certificateFinanceResponsiveLikeLedger:true','certificate finance adapts like the daily ledger'],
  ['certificateFinanceSpecialtyTerminology:true','certificate finance uses specialty terminology'],
  ['حسب تخصص الشهادة','certificate finance specialty breakdown label'],
  ['تخصص الشهادة<select id="certFinanceSpecialtyV13"','certificate finance specialty filter label'],
  ['@media(max-height:650px) and (max-width:1100px)','certificate finance compacts vertically on short narrow displays'],
  ['cert-finance-controls-v13[data-mode]{grid-template-columns:repeat(2,minmax(0,1fr))!important','certificate finance filters wrap safely on compact screens']
])requireCertificate(token,label);
for(const [token,label] of [
  ['name="pin" type="password"','masked login PIN input'],
  ["input.dataset.realPin=value",'canonical star-mask state'],
  ["input.value=isRevealed(input)?value:'*'.repeat(value.length)",'PIN digits remain masked by default'],
  ['.login-card-v13 .pin-v13{font-size:25px','final PIN field styling'],
  ['canonicalLoginRenderer:true','canonical login renderer marker'],
  ['noLegacyLoginRenderer:true','legacy login renderer removed']
])requireAuth(token,label);
forbidAuth('transform:scale(.5)','obsolete 50 percent login scaling');
requireSecurity('canonicalLoginOwnedByAuth:true','security delegates login rendering to canonical auth');

console.log('User feedback v13 verified: finance dashboards without graphs, selected daily/custom/monthly/yearly periods, shared finance action row, single profitability explorer, daily statement column, and compact masked login.');
