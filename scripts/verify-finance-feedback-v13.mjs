import {readFileSync} from 'node:fs';

const finance=readFileSync('assets/production-finance-ui-v13.js','utf8');
const requireText=(needle,label=needle)=>{if(!finance.includes(needle))throw new Error(`Finance feedback missing: ${label}`);};
const forbidText=(needle,label=needle)=>{if(finance.includes(needle))throw new Error(`Finance feedback regression: ${label}`);};

for(const [token,label] of [
  ['finance-primary-action-row-v13','expense action row above controls'],
  ['expenseActionAboveControls:true','expense action placement marker'],
  ['pct-v13','breakdown percentages'],
  ['breakdownPercentages:true','breakdown percentage marker'],
  ['finance-hover-tip-v13','chart hover tooltip'],
  ['data-chart-label','chart point labels'],
  ['data-chart-value','chart point values'],
  ['chartHoverValues:true','chart hover marker'],
  ['profitabilityByMethod:true','profitability by payment method'],
  ["table(['الفرع','الدخل','المصاريف','الصافي','الهامش']",'branch profitability margin'],
  ["table(['التخصص','الدخل','المصاريف المباشرة','الصافي','الهامش']",'specialty profitability margin'],
  ["table(['الوسيلة','الدخل','المصاريف','الصافي','الهامش']",'payment-method profitability margin'],
  ['function dailyStatement(row)','daily statement classifier'],
  ['دفع شهري جزئي','monthly partial statement'],
  ['دفع شهري كامل','monthly full statement'],
  ['دفع جزئي من الدورة','course partial statement'],
  ['دفع كامل للدورة','course full statement'],
  ["<th>الاسم</th><th>البيان</th>",'separate name and statement columns'],
  ['dailySeparateNameAndStatement:true','daily column marker']
])requireText(token,label);

const switchPos=finance.indexOf('finance-switch-v13');
const actionPos=finance.indexOf('finance-primary-action-row-v13');
const controlsPos=finance.indexOf('card finance-controls finance-controls-v13');
if(!(switchPos>=0&&actionPos>switchPos&&controlsPos>actionPos))throw new Error('Expense action must sit between finance tabs and the white controls card.');
forbidText("pageTitle('الإدارة المالية','المالية','المداخيل والمصاريف والربحية حسب الفترة والفلاتر.','<div id=\"financePrimaryActionV13\"></div>')",'expense action returned to page header');

console.log('Finance feedback v13 verified: expense action placement, percentage breakdowns, hover values, profitability margins and separate daily statement column.');
