import { validateEdition } from './domain.ts';
import type { Article } from './types.ts';

export function planReselection(items:Article[], incoming:Article, replacedId:string, reason:string, now:string){
 if(typeof reason!=='string'||!reason.trim()||reason.length>1000)throw new Error('请提供补录原因');
 const replaced=items.find(a=>a.id===replacedId);
 if(!replaced||replaced.selectionStatus)throw new Error('被替换新闻不在当前编排');
 if(incoming.editionDate!==replaced.editionDate||incoming.category!==replaced.category)throw new Error('补录必须属于同一期同一板块');
 if(items.some(a=>a.id===incoming.id||a.eventKey===incoming.eventKey))throw new Error('新闻或事件重复');
 if(incoming.selectionStatus)throw new Error('补录新闻不能标为旧选题');
 const selected=[{...incoming,rank:1,updatedAt:now,correction:reason},...items.filter(a=>a.category===incoming.category&&a.id!==replacedId).sort((a,b)=>a.rank-b.rank).map((a,i)=>({...a,rank:i+2}))];
 const all=[...items.filter(a=>a.category!==incoming.category),...selected];
 const errors=validateEdition(incoming.editionDate,all);if(errors.length)throw new Error(errors.join('\n'));
 const retired:Article={...replaced,selectionStatus:'replaced',replacementId:incoming.id,updatedAt:now,correction:reason+'；已退出本期精选，原文与永久链接继续保留。'};
 return {selected,retired};
}
