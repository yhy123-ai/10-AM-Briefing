import {env} from 'cloudflare:workers';
import type {Article,Edition} from './types';
import {searchFilter,validateEdition,validDate} from './domain';
import {planReselection} from './reselection';
import bootstrap from '@/data/bootstrap.json';
const development=()=>process.env.NODE_ENV==='development';
const seed=bootstrap as Article[];
type EditionRow={date:string;status:'draft'|'published';version:number;note:string;hash:string;published_at:string|null};
function db(){if(!env.DB)throw new Error('新闻库暂时不可用');return env.DB;}
function parse(row:{payload:string}):Article{return JSON.parse(row.payload);}
export async function listDates():Promise<string[]>{
 try{const r=await db().prepare("SELECT date FROM editions WHERE status='published' ORDER BY date DESC").all<{date:string}>();return r.results.map(r=>r.date);}catch(e){if(development())return [...new Set(seed.map(a=>a.editionDate))].sort().reverse();throw e;}
}
export async function getEdition(date?:string,internal=false):Promise<Edition|null>{
 if(date&&!validDate(date))return null;
 try{const row=await db().prepare(`SELECT * FROM editions WHERE ${date?'date=?':"status='published'"}${!internal&&date?" AND status='published'":''} ORDER BY date DESC LIMIT 1`).bind(...(date?[date]:[])).first<EditionRow>();
 if(!row)return null;const items=await db().prepare('SELECT payload FROM articles WHERE edition_date=? ORDER BY category,rank').bind(row.date).all<{payload:string}>();
 return {date:row.date,status:row.status,version:row.version,note:row.note,publishedAt:row.published_at,articles:items.results.map(parse).filter(a=>a.selectionStatus!=='replaced')};
 }catch(e){if(!development())throw e;const chosen=date||[...new Set(seed.map(a=>a.editionDate))].sort().at(-1);const items=seed.filter(a=>a.editionDate===chosen);return chosen&&items.length?{date:chosen,status:'published',version:1,note:'历史回溯整理；仅收录经核实的白名单来源。',publishedAt:null,articles:items}:null;}
}
export async function getArticle(id:string):Promise<Article|null>{
 try{const r=await db().prepare("SELECT a.payload FROM articles a JOIN editions e ON e.date=a.edition_date WHERE a.id=? AND e.status='published'").bind(id).first<{payload:string}>();return r?parse(r):null;}catch(e){if(development())return seed.find(a=>a.id===id)||null;throw e;}
}
export async function searchArticles(input:Record<string,string|undefined>){
 const f=searchFilter(input);
 try{const [rows,count]=await Promise.all([db().prepare(`SELECT a.payload FROM articles a JOIN editions e ON e.date=a.edition_date WHERE ${f.where} ORDER BY a.edition_date DESC,a.category,CASE WHEN a.rank<0 THEN 1 ELSE 0 END,a.rank LIMIT ? OFFSET ?`).bind(...f.params,f.limit,(f.page-1)*f.limit).all<{payload:string}>(),db().prepare(`SELECT COUNT(*) AS total FROM articles a JOIN editions e ON e.date=a.edition_date WHERE ${f.where}`).bind(...f.params).first<{total:number}>()]);return {articles:rows.results.map(parse),total:count?.total||0,page:f.page,limit:f.limit};
 }catch(e){if(!development())throw e;const q=(input.q||'').trim().toLowerCase().split(/\s+/).filter(Boolean);const items=seed.filter(a=>(!input.from||a.editionDate>=input.from)&&(!input.to||a.editionDate<=input.to)&&(!input.category||a.category===input.category)&&q.every(w=>JSON.stringify(a).toLowerCase().includes(w))).sort((a,b)=>b.editionDate.localeCompare(a.editionDate)||a.category.localeCompare(b.category)||a.rank-b.rank);return{articles:items.slice((f.page-1)*f.limit,f.page*f.limit),total:items.length,page:f.page,limit:f.limit};}
}
async function digest(value:unknown){const bytes=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(JSON.stringify(value)));return Array.from(new Uint8Array(bytes),b=>b.toString(16).padStart(2,'0')).join('');}
function searchable(a:Article){return [a.title,a.summary,...a.body,...a.background,...a.tags,...a.glossary.map(g=>g.term+' '+g.explanation)].join('\n');}
export async function saveEdition(date:string,items:Article[],note=''){
 const errors=validateEdition(date,items);if(errors.length)throw new Error(errors.join('\n'));
 if(typeof note!=='string'||note.length>2000)throw new Error('编者说明过长');
 const sorted=[...items].sort((a,b)=>a.category.localeCompare(b.category)||a.rank-b.rank);
 const hash=await digest({items:sorted,note});const previous=await db().prepare('SELECT status,hash,version FROM editions WHERE date=?').bind(date).first<{status:string;hash:string;version:number}>();
 if(previous?.hash===hash)return{unchanged:true,date,version:previous.version};
 if(previous?.status==='published')throw new Error('已发布的晨报不能整体覆盖；请使用单条更正接口');
 const now=new Date().toISOString(),version=(previous?.version||0)+1;
 // D1 batches are transactional; no partially visible edition.
 const statements=[db().prepare("INSERT INTO editions(date,status,version,hash,note,created_at,updated_at) VALUES(?,'draft',?,?,?,?,?) ON CONFLICT(date) DO UPDATE SET version=excluded.version,hash=excluded.hash,note=excluded.note,updated_at=excluded.updated_at WHERE editions.status='draft'").bind(date,version,hash,note,now,now),db().prepare("DELETE FROM articles WHERE edition_date=? AND EXISTS(SELECT 1 FROM editions WHERE date=? AND status='draft')").bind(date,date)];
 for(const a of sorted)statements.push(db().prepare("INSERT INTO articles(id,edition_date,category,rank,event_key,title,summary,search_text,payload,updated_at) SELECT ?,?,?,?,?,?,?,?,?,? WHERE EXISTS(SELECT 1 FROM editions WHERE date=? AND status='draft')").bind(a.id,date,a.category,a.rank,a.eventKey,a.title,a.summary,searchable(a),JSON.stringify(a),now,date));
 await db().batch(statements);
 const saved=await db().prepare('SELECT hash,version FROM editions WHERE date=?').bind(date).first<{hash:string;version:number}>();
 if(saved?.hash!==hash)throw new Error('稿件在保存期间已被发布或更新，请重新读取状态');
 return{unchanged:false,date,version:saved.version};
}
export async function publishEdition(date:string){
 if(!validDate(date))throw new Error('日期无效');
 if(Date.now()<Date.parse(date+'T10:00:00+08:00'))throw new Error('尚未到北京时间10:00发布时间');
 const edition=await getEdition(date,true);if(!edition)throw new Error('当日稿件尚未准备好');
 const errors=validateEdition(date,edition.articles);if(errors.length)throw new Error(errors.join('\n'));
 const now=new Date().toISOString();
 const result=await db().prepare("UPDATE editions SET status='published',published_at=COALESCE(published_at,?),updated_at=? WHERE date=? AND status='draft' AND version=?").bind(now,now,date,edition.version).run();
 if(!result.meta.changes&&edition.status!=='published')throw new Error('稿件在检查期间已更新，请重新核查后发布');
 return await getEdition(date);
}
export async function correctArticle(id:string,replacement:Article,reason:string){
 const current=await getArticle(id);if(!current)throw new Error('新闻不存在');
 if(!reason.trim()||reason.length>1000)throw new Error('更正说明不能为空或超过1000字');
 if(replacement.id!==id||replacement.editionDate!==current.editionDate||replacement.category!==current.category||replacement.rank!==current.rank||replacement.eventKey!==current.eventKey||replacement.selectionStatus!==current.selectionStatus||replacement.replacementId!==current.replacementId)throw new Error('更正不能改变新闻的永久身份或编排');
 const errors=validateEdition(current.editionDate,[replacement]);if(errors.length)throw new Error(errors.join('\n'));
 const now=new Date().toISOString(),next={...replacement,updatedAt:now,correction:reason};
 await db().batch([db().prepare('INSERT INTO article_revisions(article_id,payload,reason,created_at) VALUES(?,?,?,?)').bind(id,JSON.stringify(current),reason,now),db().prepare('UPDATE articles SET title=?,summary=?,search_text=?,payload=?,updated_at=? WHERE id=?').bind(next.title,next.summary,searchable(next),JSON.stringify(next),now,id)]);return next;
}

export async function reselectArticle(date:string,incoming:Article,replacedId:string,reason:string){
 const edition=await getEdition(date);if(!edition)throw new Error('晨报尚未发布');
 const existing=await getArticle(incoming.id);
 if(existing){if(existing.editionDate===date&&existing.eventKey===incoming.eventKey)return{unchanged:true,id:existing.id};throw new Error('永久ID已被使用');}
 if(incoming.editionDate!==date)throw new Error('日期不一致');
 const now=new Date().toISOString(),plan=planReselection(edition.articles,incoming,replacedId,reason,now);
 const original=edition.articles.filter(a=>a.category===incoming.category);
 const guard="EXISTS(SELECT 1 FROM editions WHERE date=? AND version=? AND status='published')";
 const statements=[];
 for(const a of original)statements.push(db().prepare(`INSERT INTO article_revisions(article_id,payload,reason,created_at) SELECT ?,?,?,? WHERE ${guard}`).bind(a.id,JSON.stringify(a),reason,now,date,edition.version));
 // Move occupied positive ranks aside before assigning the new order. Old selections retain negative DB slots and their original payloads.
 statements.push(db().prepare(`UPDATE articles SET rank=-rank-(SELECT COALESCE(MAX(ABS(rank)),0)+1 FROM articles WHERE edition_date=? AND category=?) WHERE edition_date=? AND category=? AND rank>0 AND ${guard}`).bind(date,incoming.category,date,incoming.category,date,edition.version));
 statements.push(db().prepare(`UPDATE articles SET payload=?,updated_at=? WHERE id=? AND ${guard}`).bind(JSON.stringify(plan.retired),now,replacedId,date,edition.version));
 for(const a of plan.selected){
  if(a.id===incoming.id)statements.push(db().prepare(`INSERT INTO articles(id,edition_date,category,rank,event_key,title,summary,search_text,payload,updated_at) SELECT ?,?,?,?,?,?,?,?,?,? WHERE ${guard}`).bind(a.id,date,a.category,a.rank,a.eventKey,a.title,a.summary,searchable(a),JSON.stringify(a),now,date,edition.version));
  else statements.push(db().prepare(`UPDATE articles SET rank=?,payload=?,updated_at=? WHERE id=? AND ${guard}`).bind(a.rank,JSON.stringify(a),now,a.id,date,edition.version));
 }
 statements.push(db().prepare("UPDATE editions SET version=version+1,hash=?,note=note||?,updated_at=? WHERE date=? AND version=? AND status='published'").bind('amended:'+incoming.id,'\n选题补录：'+reason,now,date,edition.version));
 const results=await db().batch(statements);if(!results.at(-1)?.meta.changes)throw new Error('编排已被其他操作更改，请重新核查');
 return{unchanged:false,id:incoming.id,replacedId,version:edition.version+1};
}
