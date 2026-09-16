import {readFileSync} from 'node:fs';

const read=path=>readFileSync(path,'utf8');
const requireText=(text,needle,label=needle)=>{if(!text.includes(needle))throw new Error(`Accounting integrity v21 missing: ${label}`);};

const runtime=read('assets/production-accounting-integrity-v21.js');
const index=read('index.html');
const build=read('scripts/build-production.mjs');
const pkg=read('package.json');

for(const [token,label] of [
  ["const SNAPSHOT_INDEX=12",'immutable accounting scope snapshot slot'],
  ['student-delete-with-finance','manual student deletion records finance removal'],
  ['سيُحذف ملف الطالب وجميع دفعاته من المالية الحالية','manual student deletion warns that finance is removed'],
  ['الفترة محفوظة في الأرشيف المالي','closed periods are archive-only in live finance views'],
  ['هذه الدفعة أصلها داخل سنة مالية مقفلة','original closed payment cannot be moved into an open year'],
  ['restoreMergesExpenses:true','backup restore merges current expenses'],
  ['restoreMergesBranches:true','backup restore merges current branches'],
  ['dedupeLegacyIncomingPayments','legacy backup payment deduplication'],
  ['expenseTombstones','deleted expense restore protection'],
  ['certificateTombstones','deleted certificate restore protection'],
  ['studentTombstones','manual deleted student restore protection'],
  ['historicalPaymentScopeSnapshots:true','payments retain historical branch/course classification'],
  ['window.allPayments=function()','finance and fiscal readers receive historical payment scope'],
  ["target.closest('.delete-expense-v13')",'expense deletion is centrally guarded'],
  ['EFC_DELETE_CERTIFICATE_RECEIPT_V13=async','certificate deletion receives tombstone protection'],
  ['window.EFC_APPLY_RESTORED_STATE=async','restore is preprocessed before existing merge chain'],
  ["guardBody(document.getElementById('financeBodyV13')",'main finance blocks closed/mixed periods'],
  ["guardBody(document.getElementById('certFinanceBodyV13')",'certificate finance blocks closed/mixed periods'],
  ["document.getElementById('ledgerBodyV13')",'daily ledger blocks closed dates']
])requireText(runtime,token,label);

requireText(index,'./assets/production-accounting-integrity-v21.js?v=20260916-student-lifecycle-v20-1','index loads accounting integrity with synchronized cache version');
requireText(build,"'assets/production-accounting-integrity-v21.js'",'production build copies accounting integrity runtime');
requireText(pkg,'node scripts/verify-accounting-integrity-v21.mjs','npm check runs accounting integrity verification');

console.log('Accounting integrity v21 source and production integration verified.');
