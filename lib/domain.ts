import type { Article } from './types.ts';
import { approvedSource } from './sources.ts';
export function validDate(value: string): boolean {return /^\d{4}-\d{2}-\d{2}$/.test(value)&&!Number.isNaN(Date.parse(value))&&new Date(value).toISOString().slice(0,10)===value;}
export function beijingDate(now = new Date()): string {return new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Shanghai',year:'numeric',month:'2-digit',day:'2-digit'}).format(now);}
const nonempty=(s: unknown,max=20000): s is string=>typeof s==='string'&&s.trim().length>0&&s.length<=max;
export function validateEdition(date: string, articles: Article[]): string[] {
 const errors: string[]=[];
 if(!validDate(date))return ['归档日期无效'];
 if(!Array.isArray(articles)||articles.length===0||articles.length>30)return ['每期需有1至30条已核实新闻'];
 const ids=new Set<string>(), events=new Set<string>(), ranks=new Set<string>();
 const cutoff=Date.parse(date+'T09:30:00+08:00');
 const counts: Record<string,number>={politics:0,finance:0,ai:0};
 for(const a of articles){
  if(!a||typeof a!=='object'){errors.push('新闻格式错误');continue;}
  const label=String(a.id||'未知新闻');
  if(!/^[a-z0-9][a-z0-9-]{1,99}$/.test(a.id))errors.push(label+': ID无效');
  if(a.editionDate!==date)errors.push(label+': 归档日期不一致');
  if(!Object.hasOwn(counts,a.category))errors.push(label+': 板块无效');else if(++counts[a.category]>10)errors.push(label+': 每板块最多10条');
  if(!Number.isInteger(a.rank)||a.rank<1||a.rank>10)errors.push(label+': 排名无效');
  const rk=a.category+':'+a.rank;
  if(ids.has(a.id)||events.has(a.eventKey)||ranks.has(rk))errors.push(label+': 新闻、事件或排名重复');
  ids.add(a.id);events.add(a.eventKey);ranks.add(rk);
  if(!nonempty(a.title,160)||!nonempty(a.summary,1500)||!nonempty(a.eventKey,200))errors.push(label+': 标题、摘要和事件标识不能为空');
  if(!Array.isArray(a.body)||!a.body.length||a.body.length>30||!a.body.every(p=>nonempty(p)))errors.push(label+': 转述正文不能为空');
  if(!Array.isArray(a.background)||!a.background.every(p=>nonempty(p)))errors.push(label+': 背景格式错误');
  if(!Array.isArray(a.tags)||!a.tags.every(p=>nonempty(p,100)))errors.push(label+': 标签格式错误');
  if(!Array.isArray(a.glossary)||!a.glossary.every(g=>g&&nonempty(g.term,100)&&nonempty(g.explanation,2000)))errors.push(label+': 科普格式错误');
  if(!Array.isArray(a.sources)||!a.sources.length||a.sources.length>20){errors.push(label+': 缺少来源');continue;}
  let recentSource=false;
  for(const s of a.sources){
   if(!s||!nonempty(s.name,100)||!approvedSource(s.sourceId,s.url)){errors.push(label+': 来源不在白名单或链接无效');continue;}
   const dayOnly=/^\d{4}-\d{2}-\d{2}$/.test(s.publishedAt);
   const timestamp=dayOnly?Date.parse(s.publishedAt+'T23:59:59+08:00'):Date.parse(s.publishedAt);
   if(!Number.isFinite(timestamp)||timestamp>cutoff)errors.push(label+': 来源晚于截稿时间或无法确认截稿前发布');
   if(timestamp<=cutoff&&timestamp>cutoff-86400000)recentSource=true;
   if(!dayOnly&&!/(Z|[+-]\d{2}:\d{2})$/.test(s.publishedAt))errors.push(label+': 来源时间缺少时区');
  }
  if(!recentSource)errors.push(label+': 缺少截稿前24小时内的新闻来源');
  const urls=new Set(a.sources.map(s=>s.url));
  if(!Array.isArray(a.timeline)||!a.timeline.every(t=>t&&nonempty(t.date,100)&&nonempty(t.event,3000)&&urls.has(t.sourceUrl)))errors.push(label+': 时间线缺少已列明出处');
  if(typeof a.retrospective!=='boolean'||!Number.isFinite(Date.parse(a.checkedAt)))errors.push(label+': 核查记录不完整');
 }
 return [...new Set(errors)];
}
export function searchFilter(input: Record<string,string|undefined>): {where:string;params:unknown[];page:number;limit:number} {
 const conditions=["e.status = 'published'"],params:unknown[]=[];
 for(const key of ['from','to'])if(input[key]&&!validDate(input[key]!))throw new Error('请输入有效日期');
 if(input.from&&input.to&&input.from>input.to)throw new Error('开始日期不能晚于结束日期');
 if(input.from){conditions.push('a.edition_date >= ?');params.push(input.from);}
 if(input.to){conditions.push('a.edition_date <= ?');params.push(input.to);}
 if(input.category){if(!['politics','finance','ai'].includes(input.category))throw new Error('板块无效');conditions.push('a.category = ?');params.push(input.category);}
 const q=(input.q||'').trim().slice(0,120);
 for(const word of q.split(/\s+/).filter(Boolean).slice(0,8)){
  conditions.push("a.search_text LIKE ? ESCAPE '\\'");params.push('%'+word.replace(/[\\%_]/g,'\\$&')+'%');
 }
 const page=Math.min(100000,Math.max(1,Number.parseInt(input.page||'1',10)||1));
 return {where:conditions.join(' AND '),params,page,limit:30};
}
