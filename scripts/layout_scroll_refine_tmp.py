from pathlib import Path

# Finance: keep all KPI title/value rows aligned to the top of their cards.
p=Path('assets/production-finance-ui-v13.js')
s=p.read_text(encoding='utf-8')
marker='window.EFC_FINANCE_UI_V13=Object.freeze('
if marker not in s:
    raise SystemExit('finance marker missing')
css="""
const financeKpiAlignStyle=document.createElement('style');financeKpiAlignStyle.id='finance-kpi-align-v13';financeKpiAlignStyle.textContent=`
body.efc-finance-redesign-v13 .kpis .card{justify-content:flex-start!important;align-items:stretch!important}
body.efc-finance-redesign-v13 .finance-kpi-line-v13{min-height:28px!important;align-items:center!important;margin:0!important}
body.efc-finance-redesign-v13 .kpis .card>span{margin-top:2px!important;min-height:12px!important}
`;document.head.appendChild(financeKpiAlignStyle);
"""
if "finance-kpi-align-v13" not in s:
    s=s.replace(marker,css+'\n'+marker,1)
p.write_text(s,encoding='utf-8')

# Period search: viewport stays fixed; only the result table scrolls.
p=Path('assets/production-period-search-redesign-v28.js')
s=p.read_text(encoding='utf-8')
s=s.replace('body.efc-period-redesign-v28{font-family:"Segoe UI Variable","Segoe UI",Tahoma,Arial,sans-serif!important;background:#f5fbf9!important;overflow-x:hidden!important}',
'''body.efc-period-redesign-v28{font-family:"Segoe UI Variable","Segoe UI",Tahoma,Arial,sans-serif!important;background:#f5fbf9!important;overflow:hidden!important}''',1)
s=s.replace('body.efc-period-redesign-v28 .shell main{margin-right:clamp(230px,18vw,268px)!important;width:calc(100% - clamp(230px,18vw,268px))!important;min-width:0!important;overflow-x:hidden!important}',
'''body.efc-period-redesign-v28 .shell main{margin-right:clamp(230px,18vw,268px)!important;width:calc(100% - clamp(230px,18vw,268px))!important;min-width:0!important;height:100vh!important;overflow:hidden!important}''',1)
s=s.replace('padding:18px 0 34px!important;box-sizing:border-box!important;overflow:visible!important}',
'''padding:18px 0 12px!important;box-sizing:border-box!important;height:100vh!important;overflow:hidden!important}''',1)
s=s.replace('max-height:calc(100vh - 405px)!important;min-height:220px!important;overflow:auto!important;',
'''height:calc(100vh - 392px)!important;max-height:calc(100vh - 392px)!important;min-height:160px!important;overflow:auto!important;''',1)
p.write_text(s,encoding='utf-8')

# Student search gets the same bounded-results behavior for consistency/future large lists.
p=Path('assets/production-student-search-redesign-v31.js')
s=p.read_text(encoding='utf-8')
s=s.replace('html body.efc-student-search-redesign-v31{font-family:"Segoe UI Variable","Segoe UI",Tahoma,Arial,sans-serif!important;background:#f5fbf9!important;overflow-x:hidden!important}',
'''html body.efc-student-search-redesign-v31{font-family:"Segoe UI Variable","Segoe UI",Tahoma,Arial,sans-serif!important;background:#f5fbf9!important;overflow:hidden!important}''',1)
s=s.replace('padding:18px 0 34px!important;box-sizing:border-box!important;overflow:visible!important;',
'''padding:18px 0 12px!important;box-sizing:border-box!important;height:100vh!important;overflow:hidden!important;''',1)
s=s.replace('max-height:calc(100vh - 260px)!important;min-height:220px!important;overflow:auto!important;',
'''height:calc(100vh - 205px)!important;max-height:calc(100vh - 205px)!important;min-height:180px!important;overflow:auto!important;''',1)
p.write_text(s,encoding='utf-8')

# Base behavior for current/future table-style lists: bounded internal scrolling by default.
p=Path('assets/production-ui-v13.css')
s=p.read_text(encoding='utf-8')
s=s.replace('.content .table-wrap{max-height:min(520px,calc(100vh - 250px));overscroll-behavior:contain;scrollbar-gutter:stable}',
'''.content .table-wrap{max-height:min(520px,calc(100dvh - 250px));overflow:auto;overscroll-behavior:contain;overscroll-behavior-block:contain;scrollbar-gutter:stable}''',1)
p.write_text(s,encoding='utf-8')

# Verification: refresh the existing invariants rather than adding duplicate declarations.
p=Path('scripts/verify-critical-runtime.mjs')
s=p.read_text(encoding='utf-8')
s=s.replace("requireText(periodUi,'max-height:calc(100vh - 405px)!important','period search results scroll internally');",
            "requireText(periodUi,'height:calc(100vh - 392px)!important','period search results scroll internally');",1)
s=s.replace("requireText(studentSearchUi,'max-height:calc(100vh - 260px)!important','student search results scroll internally');",
            "requireText(studentSearchUi,'height:calc(100vh - 205px)!important','student search results scroll internally');",1)
s=s.replace("requireText(baseUi,'.content .table-wrap{max-height:min(520px,calc(100vh - 250px))','long app tables have a global internal-scroll safety cap');",
            "requireText(baseUi,'.content .table-wrap{max-height:min(520px,calc(100dvh - 250px))','long app tables have a global internal-scroll safety cap');",1)
if "finance-kpi-align-v13" not in s:
    anchor="requireText(financeUi,'finance-kpi-line-v13','finance KPI labels and values share one compact row');"
    s=s.replace(anchor,anchor+"\nrequireText(financeUi,'finance-kpi-align-v13','finance KPI rows stay top-aligned even when one card has a period subtitle');",1)
p.write_text(s,encoding='utf-8')

# Cache bust.
for path in ['index.html','assets/production-license-gate-v8.js']:
    p=Path(path); s=p.read_text(encoding='utf-8'); s=s.replace('20260912-finance-redesign-5','20260913-list-scroll-1'); p.write_text(s,encoding='utf-8')
