from pathlib import Path


def replace_once(path, old, new, label):
    p=Path(path)
    text=p.read_text(encoding='utf-8')
    if old not in text:
        raise SystemExit(f'{label}: target not found in {path}')
    p.write_text(text.replace(old,new,1),encoding='utf-8')

# Finance KPIs: keep all value rows aligned to the top; the period remains a second line only where it exists.
replace_once(
    'assets/production-finance-ui-v13.js',
    '#financeBodyV13>.kpis>.card{min-height:54px!important;margin:0!important;padding:8px 12px!important;border:1px solid #d8e5e0!important;border-radius:12px!important;box-shadow:0 7px 18px rgba(22,75,61,.04)!important;display:flex!important;flex-direction:column!important;justify-content:center!important}',
    '#financeBodyV13>.kpis>.card{min-height:54px!important;margin:0!important;padding:8px 12px!important;border:1px solid #d8e5e0!important;border-radius:12px!important;box-shadow:0 7px 18px rgba(22,75,61,.04)!important;display:flex!important;flex-direction:column!important;justify-content:flex-start!important}',
    'finance KPI alignment'
)
replace_once(
    'assets/production-finance-ui-v13.js',
    '.content:has(.finance-switch-v13) .finance-kpi-line-v13{display:flex!important;align-items:center!important;justify-content:space-between!important;gap:8px!important;width:100%!important;min-width:0!important}',
    '.content:has(.finance-switch-v13) .finance-kpi-line-v13{display:flex!important;align-items:center!important;justify-content:space-between!important;gap:8px!important;width:100%!important;min-width:0!important;min-height:18px!important}',
    'finance KPI row height'
)

# Period search: the result list owns its scrolling so the whole page remains fixed.
replace_once(
    'assets/production-period-search-redesign-v28.js',
    'body.efc-period-redesign-v28 .efc-period-result-v28 .table-wrap{width:900px!important;max-width:900px!important;min-width:900px!important;overflow:auto!important;border:1px solid rgba(0,0,0,.62)!important;border-radius:10px!important;background:#fff!important;box-shadow:none!important}',
    'body.efc-period-redesign-v28 .efc-period-result-v28 .table-wrap{width:900px!important;max-width:900px!important;min-width:900px!important;max-height:calc(100vh - 405px)!important;min-height:220px!important;overflow:auto!important;overscroll-behavior:contain!important;scrollbar-gutter:stable!important;border:1px solid rgba(0,0,0,.62)!important;border-radius:10px!important;background:#fff!important;box-shadow:none!important}',
    'period result internal scroll'
)
replace_once(
    'assets/production-period-search-redesign-v28.js',
    'body.efc-period-redesign-v28 .efc-period-result-v28 th{height:43px!important;padding:8px 9px!important;background:linear-gradient(180deg,#0a715b,#075846)!important;color:#fff!important;border:1px solid rgba(0,0,0,.65)!important;font-size:10.5px!important;font-weight:800!important;text-align:center!important;vertical-align:middle!important}',
    'body.efc-period-redesign-v28 .efc-period-result-v28 th{position:sticky!important;top:0!important;z-index:3!important;height:43px!important;padding:8px 9px!important;background:linear-gradient(180deg,#0a715b,#075846)!important;color:#fff!important;border:1px solid rgba(0,0,0,.65)!important;font-size:10.5px!important;font-weight:800!important;text-align:center!important;vertical-align:middle!important}',
    'period sticky header'
)

# Student search gets the same list policy before it grows large.
replace_once(
    'assets/production-student-search-redesign-v31.js',
    '  overflow:auto!important;border:1px solid rgba(0,0,0,.62)!important;border-radius:10px!important;\n  background:#fff!important;box-shadow:none!important;',
    '  max-height:calc(100vh - 260px)!important;min-height:220px!important;overflow:auto!important;overscroll-behavior:contain!important;scrollbar-gutter:stable!important;border:1px solid rgba(0,0,0,.62)!important;border-radius:10px!important;\n  background:#fff!important;box-shadow:none!important;',
    'student results internal scroll'
)
replace_once(
    'assets/production-student-search-redesign-v31.js',
    'html body.efc-student-search-redesign-v31 #studentsTableV13 th{\n  height:43px!important;',
    'html body.efc-student-search-redesign-v31 #studentsTableV13 th{\n  position:sticky!important;top:0!important;z-index:3!important;\n  height:43px!important;',
    'student sticky header'
)

# General safety net: any long app table gets an internal scroll region by default.
ui=Path('assets/production-ui-v13.css')
text=ui.read_text(encoding='utf-8')
old='.table-wrap{overflow:auto;background:#fff;border:1px solid var(--border);border-radius:11px}'
new='.table-wrap{overflow:auto;background:#fff;border:1px solid var(--border);border-radius:11px}.content .table-wrap{max-height:min(520px,calc(100vh - 250px));overscroll-behavior:contain;scrollbar-gutter:stable}.content .table-wrap thead th{position:sticky;top:0;z-index:2}'
if old not in text:
    raise SystemExit('global table-wrap rule not found')
ui.write_text(text.replace(old,new,1),encoding='utf-8')

# Verification: protect both the finance alignment and internal-scroll policy.
verify=Path('scripts/verify-critical-runtime.mjs')
v=verify.read_text(encoding='utf-8')
needle="requireText(financeUi,'finance-kpi-line-v13','finance KPI labels and values share one compact row');"
insert="""requireText(financeUi,'finance-kpi-line-v13','finance KPI labels and values share one compact row');
requireText(financeUi,'justify-content:flex-start!important','finance KPI cards align their primary rows consistently at the top');
const periodUi=read('assets/production-period-search-redesign-v28.js');
const studentSearchUi=read('assets/production-student-search-redesign-v31.js');
const baseUi=read('assets/production-ui-v13.css');
requireText(periodUi,'max-height:calc(100vh - 405px)!important','period search results scroll internally');
requireText(periodUi,'position:sticky!important;top:0!important;z-index:3!important','period search keeps its table header visible');
requireText(studentSearchUi,'max-height:calc(100vh - 260px)!important','student search results scroll internally');
requireText(baseUi,'.content .table-wrap{max-height:min(520px,calc(100vh - 250px))','long app tables have a global internal-scroll safety cap');"""
if needle not in v:
    raise SystemExit('critical verifier insertion point not found')
verify.write_text(v.replace(needle,insert,1),encoding='utf-8')

# Cache bust so Pages cannot keep the prior CSS/JS.
for path in ['index.html','assets/production-license-gate-v8.js']:
    p=Path(path)
    s=p.read_text(encoding='utf-8')
    if '20260912-finance-redesign-5' not in s:
        raise SystemExit(f'old cache token missing in {path}')
    p.write_text(s.replace('20260912-finance-redesign-5','20260912-finance-scroll-6'),encoding='utf-8')
