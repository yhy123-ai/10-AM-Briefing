"""Publish reviewed editions and send matching QQ emails; no paid AI API needed."""
import argparse, datetime as dt, hashlib, html, json, smtplib, sqlite3, ssl, sys, time
import urllib.request, urllib.error
from email.message import EmailMessage
from email.utils import format_datetime
from pathlib import Path
from contextlib import contextmanager
from credentials import LOCAL, read_secret

ROOT=Path(__file__).resolve().parents[1]
SITE='https://ten-am-briefing.nimble-ibex-6140.chatgpt.site'
MAIL='your-mailbox@qq.com'
CATEGORIES=[('politics','时政'),('finance','金融'),('ai','AI 科技')]
TZ=dt.timezone(dt.timedelta(hours=8))

def now(): return dt.datetime.now(TZ)
@contextmanager
def state():
    LOCAL.mkdir(exist_ok=True)
    db=sqlite3.connect(LOCAL/'delivery.sqlite',timeout=30)
    db.execute('CREATE TABLE IF NOT EXISTS runs (key TEXT PRIMARY KEY, phase TEXT, status TEXT, attempts INTEGER DEFAULT 0, updated TEXT, detail TEXT)')
    try:
        with db: yield db
    finally:
        db.close()

def record(key,phase,status,detail=''):
    with state() as db:
        db.execute('INSERT INTO runs(key,phase,status,updated,detail) VALUES(?,?,?,?,?) ON CONFLICT(key) DO UPDATE SET status=excluded.status,updated=excluded.updated,detail=excluded.detail',(key,phase,status,now().isoformat(),detail[:500]))

def api(path,method='GET',payload=None,internal=False):
    headers={'Accept':'application/json','User-Agent':'TenAMBriefing/1.0'}
    if internal:
        secret=read_secret('ingest')
        if not secret: raise RuntimeError('本机缺少发布凭据')
        headers['Authorization']='Bearer '+secret
    data=None if payload is None else json.dumps(payload,ensure_ascii=False).encode()
    if data is not None: headers['Content-Type']='application/json'
    request=urllib.request.Request(SITE+path,data=data,headers=headers,method=method)
    for attempt in range(3):
        try:
            with urllib.request.urlopen(request,timeout=45) as response: return json.load(response)
        except urllib.error.HTTPError as e:
            if e.code<500 or attempt==2:
                try: message=json.loads(e.read()).get('error',str(e.code))
                except Exception: message=str(e.code)
                raise RuntimeError(f'网站请求失败 ({e.code}): {message}') from None
        except (urllib.error.URLError, TimeoutError):
            if attempt==2: raise RuntimeError('网站暂时无法连接，已保留状态，稍后可安全重试') from None
        time.sleep(2**attempt)

def upload(path,only_date=None):
    items=json.loads(Path(path).read_text(encoding='utf-8-sig'))
    if isinstance(items,dict): items=items['articles']
    dates=sorted({a['editionDate'] for a in items})
    for date in dates:
        if only_date and date!=only_date: continue
        articles=[a for a in items if a['editionDate']==date]
        note='历史回溯整理；当前仅展示已完成来源核查的条目，缺额不补旧闻。' if all(a['retrospective'] for a in articles) else '按重要性、独立来源关注度与时效性精选；仅发布已核实内容。'
        key='draft:'+date
        try:
            result=api('/api/internal/editions/'+date,'PUT',{'articles':articles,'note':note},True)
            record(key,'draft','ready',json.dumps(result));print(date,'稿件已保存',len(articles))
        except Exception:
            record(key,'draft','failed');raise

def publish(date):
    key='publish:'+date
    try:
        edition=api('/api/internal/editions/'+date+'/publish','POST',{},True)
        record(key,'publish','published');print(date,'网站已发布');return edition
    except Exception:
        record(key,'publish','delayed');raise

def compose(edition,test=False):
    date=edition['date']; items=edition['articles']; version=edition['version']
    subject=('【测试】' if test else '')+f'十点晨报｜{date}｜{len(items)} 条核心新闻'
    plain=[subject,edition.get('note',''),f'{SITE}/?date={date}']; blocks=[]
    esc=html.escape
    for category,label in CATEGORIES:
        selected=sorted([a for a in items if a['category']==category],key=lambda a:a['rank'])
        plain.append('\n'+label); cards=[]
        for a in selected:
            link=SITE+'/news/'+a['id']
            sources=' · '.join(f'<a href="{esc(s["url"],quote=True)}">{esc(s["name"])}</a>' for s in a['sources'])
            plain.append(f'{a["rank"]}. {a["title"]}\n{a["summary"]}\n详情：{link}\n原文：'+ ' / '.join(s['url'] for s in a['sources']))
            cards.append(f'<div style="padding:18px 0;border-bottom:1px solid #dce4ed"><a style="font-size:18px;color:#173c68;text-decoration:none" href="{link}">{a["rank"]:02d} · {esc(a["title"])}</a><p style="line-height:1.8;color:#42556b">{esc(a["summary"])}</p><p style="font-size:13px">{sources} · <a href="{link}">背景与科普 ↗</a></p></div>')
        if len(selected)<10:
            shortage=f'本期已核实 {len(selected)} 条，尚缺 {10-len(selected)} 条。'
            plain.append(shortage);cards.append('<p style="color:#68788b">'+shortage+'</p>')
        blocks.append(f'<h2 style="background:#0c2744;color:white;padding:16px 20px">{label}</h2>'+''.join(cards))
    body=f'<html lang="zh-CN"><body style="background:#f2f5f9;font-family:Microsoft YaHei,sans-serif"><main style="max-width:720px;margin:auto;padding:28px;background:white"><h1 style="color:#132d4b">10 · 十点晨报</h1><p>{date} · 北京时间 10:00 计划刊发</p><p>{esc(edition.get("note",""))}</p>{"".join(blocks)}<p><a href="{SITE}/archive">历史新闻与关键词检索 →</a></p><small>实际发布时间：{esc(edition.get("publishedAt") or "尚未发布")} · 版本 {version}</small></main></body></html>'
    msg=EmailMessage();msg['Subject']=subject;msg['From']=MAIL;msg['To']=MAIL;msg['Date']=format_datetime(now())
    digest=hashlib.sha256(f'{date}:{version}:{test}'.encode()).hexdigest()[:24]
    msg['Message-ID']=f'<ten-am-{digest}@qq.com>';msg.set_content('\n\n'.join(plain));msg.add_alternative(body,subtype='html')
    return msg,body

def send(edition,test=False):
    if edition['status']!='published': raise RuntimeError('稿件尚未发布，禁止投递')
    if not test and edition['date']!=now().date().isoformat(): raise RuntimeError('历史补录只更新网站，不批量发送邮件')
    password=read_secret('qq')
    if not password: raise RuntimeError('请先在本机运行邮箱配置，填写 QQ SMTP 授权码')
    key=f'mail:{edition["date"]}:v{edition["version"]}'+(':test' if test else '')
    msg,_=compose(edition,test)
    with state() as db:
        db.execute('BEGIN IMMEDIATE');row=db.execute('SELECT status,attempts FROM runs WHERE key=?',(key,)).fetchone()
        if row and row[0] in ('sent','sending','unknown'):
            print('邮件已发送或结果待核查；未重复投递。');return
        if row and row[1]>=3: raise RuntimeError('邮件已达3次明确失败重试上限，请检查邮箱设置')
        db.execute('INSERT INTO runs(key,phase,status,attempts,updated,detail) VALUES(?,\'mail\',\'sending\',1,?,\'\') ON CONFLICT(key) DO UPDATE SET status=\'sending\',attempts=attempts+1,updated=excluded.updated',(key,now().isoformat()))
    transmission_started=False
    try:
        with smtplib.SMTP_SSL('smtp.qq.com',465,timeout=40,context=ssl.create_default_context()) as smtp:
            smtp.login(MAIL,password)
            transmission_started=True
            smtp.send_message(msg)
            record(key,'mail','sent')
        print('测试晨报已投递至 QQ 邮箱。' if test else '当日晨报已投递。')
    except Exception as e:
        # After DATA might have begun, acknowledgement loss is ambiguous: never auto resend.
        with state() as db: done=db.execute('SELECT status FROM runs WHERE key=?',(key,)).fetchone()
        if done and done[0]=='sent': print('邮件已被服务器接受；连接关闭异常。');return
        record(key,'mail','unknown' if transmission_started else 'failed',type(e).__name__)
        raise RuntimeError('邮件发送结果不明确，请核查邮箱，系统不会自动重发。' if transmission_started else '邮件连接或认证失败，请检查本机配置；凭据不会输出。') from None

def missing():
    payload=api('/api/editions?list=1');published=set(payload if isinstance(payload,list) else payload.get('dates',[]))
    end=now().date()-(dt.timedelta(days=1) if now().hour<10 else dt.timedelta())
    print(json.dumps({'missingDates':[(end-dt.timedelta(days=n)).isoformat() for n in range(6,-1,-1) if (end-dt.timedelta(days=n)).isoformat() not in published]},ensure_ascii=False))

def main():
    parser=argparse.ArgumentParser();parser.add_argument('action',choices=['upload','publish','send','deliver','preview','missing','status']);parser.add_argument('--file');parser.add_argument('--date',default=now().date().isoformat());parser.add_argument('--test',action='store_true');args=parser.parse_args()
    if args.action=='upload':
        if not args.file: parser.error('upload requires --file')
        upload(args.file)
    elif args.action=='publish': publish(args.date)
    elif args.action in ('send','deliver','preview'):
        edition=publish(args.date) if args.action=='deliver' else api('/api/editions?date='+args.date)
        if args.action=='preview':
            _,body=compose(edition,True);LOCAL.mkdir(exist_ok=True);(LOCAL/'mail-preview.html').write_text(body,encoding='utf8');print('邮件预览已写入 .local/mail-preview.html')
        else: send(edition,args.test)
    elif args.action=='missing': missing()
    else:
        with state() as db: print(json.dumps(db.execute('SELECT key,phase,status,attempts,updated,detail FROM runs ORDER BY updated DESC LIMIT 30').fetchall(),ensure_ascii=False,indent=2))
if __name__=='__main__':
    try: main()
    except Exception as e: print(str(e),file=sys.stderr);sys.exit(1)
