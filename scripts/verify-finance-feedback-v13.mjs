import {readFileSync} from 'node:fs';

const finance=readFileSync('assets/production-finance-ui-v13.js','utf8');
const security=readFileSync('assets/production-security-ui-v13.js','utf8');
const requireFinance=(needle,label=needle)=>{if(!finance.includes(needle))throw new Error(`Finance feedback missing: ${label}`);};
const forbidFinance=(needle,label=needle)=>{if(finance.includes(needle))throw new Error(`Finance feedback regression: ${label}`);};
const requireSecurity=(needle,label=needle)=>{if(!security.includes(needle))throw new Error(`Login feedback missing: ${label}`);};

for(const [token,label] of [
  ['finance-primary-action-row-v13','expense action row above controls'],
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
  ['dailySeparateNameAndStatement:true','daily column marker']
])requireFinance(token,label);

const switchPos=finance.indexOf('finance-switch-v13');
const actionPos=finance.indexOf('finance-primary-action-row-v13');
const controlsPos=finance.indexOf('card finance-controls finance-controls-v13');
if(!(switchPos>=0&&actionPos>switchPos&&controlsPos>actionPos))throw new Error('Expense action must sit between finance tabs and the white controls card.');
forbidFinance("pageTitle('الإدارة المالية','المالية','المداخيل والمصاريف والربحية حسب الفترة والفلاتر.','<div id=\"financePrimaryActionV13\"></div>')",'expense action returned to page header');
forbidFinance('profitability-tables-v13','old three profitability cards returned');

for(const [token,label] of [
  ['name="pin" type="password"','masked login PIN input'],
  ['transform:scale(.5)','50 percent compact login card'],
  ['.pin-v13{font-size:34px','larger PIN bullets'],
  ['pinMasked:true','PIN mask marker'],
  ['compactLogin:true','compact login marker']
])requireSecurity(token,label);

console.log('User feedback v13 verified: current-only finance charts, single profitability explorer, daily statement column, and compact masked login.');
