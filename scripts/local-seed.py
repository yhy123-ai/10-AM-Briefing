"""Seed only the project's local emulator for integration checks; never a cloud migration."""
import json, sqlite3
from pathlib import Path
root=Path(__file__).resolve().parents[1]
paths=list((root/'.wrangler/state/v3/d1/miniflare-D1DatabaseObject').glob('*.sqlite'))
paths=[p for p in paths if p.name!='metadata.sqlite']
if len(paths)!=1: raise SystemExit('Expected exactly one project-local emulator database')
items=json.loads((root/'data/bootstrap.json').read_text(encoding='utf8'))
with sqlite3.connect(paths[0]) as db:
    exists=db.execute("SELECT name FROM sqlite_master WHERE name='editions'").fetchone()
    if not exists:db.executescript((root/'drizzle/0000_peaceful_satana.sql').read_text())
    for date in sorted({a['editionDate'] for a in items}):
        db.execute("INSERT OR IGNORE INTO editions(date,status,version,hash,note,published_at,created_at,updated_at) VALUES(?,'published',1,'local-test','历史回溯整理',?,?,?)",(date,'2026-09-10T08:00:00Z','2026-09-10T08:00:00Z','2026-09-10T08:00:00Z'))
    for a in items:
        searchable='\n'.join([a['title'],a['summary'],*a['body'],*a['background'],*a['tags'],*[g['term']+' '+g['explanation'] for g in a['glossary']]])
        db.execute('INSERT OR REPLACE INTO articles(id,edition_date,category,rank,event_key,title,summary,search_text,payload,updated_at) VALUES(?,?,?,?,?,?,?,?,?,?)',(a['id'],a['editionDate'],a['category'],a['rank'],a['eventKey'],a['title'],a['summary'],searchable,json.dumps(a,ensure_ascii=False),a['checkedAt']))
    print('Local D1 rows:',db.execute('SELECT COUNT(*) FROM articles').fetchone()[0])
