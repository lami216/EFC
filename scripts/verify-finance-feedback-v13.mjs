import {readFileSync} from 'node:fs';

const finance=readFileSync('assets/production-finance-ui-v13.js','utf8');
const security=readFileSync('assets/production-security-ui-v13.js','utf8');
const auth=readFileSync('assets/production-auth-bootstrap-v13.js','utf8');
const requireFinance=(needle,label=needle)=>{if(!finance.includes(needle))throw new Error(`Finance feedback missing: ${label}`);};
const forbidFinance=(needle,label=needle)=>{if(finance.includes(needle))throw new Error(`Finance feedback regression: ${label}`);};
const requireSecurity=(needle,label=needle)=>{if(!security.includes(needle))throw new Error(`Security feedback missing: ${label}`);};
const requireAuth=(needle,label=needle)=>{if(!auth.includes(needle))throw new Error(`Login feedback missing: ${label}`);};
const forbidAuth=(needle,label=needle)=>{if(auth.includes(needle))throw new Error(`Login feedback regression: ${label}`);};

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
  ['expenseHistoryActionRed:true','expense history action is visually destructive'],
  ['financeDebtKpiActual:true','finance debt KPI counts actual debt only'],
  ['profitPeriodContextHints:true','profit cards describe the selected period'],
  ['<small>الدين</small>','finance debt KPI label'],
  ['remainingAmount,installmentPlan,expenseSpecialtyName','finance imports installmentPlan used by debt KPI'],
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
  ['finance-profit-details-action-v27','profit details button class'],
  ['expenseReceiptsNumericSequence:true','expense receipts use numeric sequence'],
  ['function expenseReceiptCode(row){const number=expenseReceiptNumberOf','expense receipt header is numeric'],
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
  ['monthlySelectedMonth:true','monthly finance uses the selected month'],
  ['yearlySelectedYear:true','yearly finance uses the selected year'],
  ['id=\"dayV13\" type=\"date\"','daily finance date picker'],
  ["dayWrap.hidden=mode!=='daily';monthWrap.hidden=mode!=='monthly';yearWrap.hidden=mode==='daily'",'period-specific finance controls']
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
  ['name="pin" type="password"','masked login PIN input'],
  ["input.dataset.realPin=value",'canonical star-mask state'],
  ["input.value=isRevealed(input)?value:'*'.repeat(value.length)",'PIN digits remain masked by default'],
  ['.login-card-v13 .pin-v13{font-size:25px','final PIN field styling'],
  ['canonicalLoginRenderer:true','canonical login renderer marker'],
  ['noLegacyLoginRenderer:true','legacy login renderer removed']
])requireAuth(token,label);
forbidAuth('transform:scale(.5)','obsolete 50 percent login scaling');
requireSecurity('canonicalLoginOwnedByAuth:true','security delegates login rendering to canonical auth');

console.log('User feedback v13 verified: finance dashboards without graphs, selected daily/monthly/yearly periods, shared finance action row, single profitability explorer, daily statement column, and compact masked login.');
