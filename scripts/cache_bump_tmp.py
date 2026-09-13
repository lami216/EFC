from pathlib import Path
old='20260912-finance-scroll-6'
new='20260913-list-scroll-1'
for name in ['index.html','assets/production-license-gate-v8.js']:
    p=Path(name)
    s=p.read_text(encoding='utf-8')
    if old not in s:
        raise SystemExit(f'cache token missing in {name}')
    p.write_text(s.replace(old,new),encoding='utf-8')
