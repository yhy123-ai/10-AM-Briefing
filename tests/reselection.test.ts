import test from 'node:test';
import assert from 'node:assert/strict';
import { planReselection } from '../lib/reselection.ts';
import type { Article } from '../lib/types.ts';
const base: Article={id:'ai-old-1',editionDate:'2026-09-09',category:'ai',rank:1,eventKey:'old-1',title:'已核实新闻',summary:'摘要',body:['正文'],background:[],timeline:[],glossary:[],sources:[{sourceId:'A1',name:'OpenAI',url:'https://openai.com/news/',publishedAt:'2026-09-08',readAt:'2026-09-10T15:00:00Z'}],tags:[],retrospective:true,checkedAt:'2026-09-10T15:00:00Z'};
const old=Array.from({length:10},(_,i)=>({...base,id:`ai-old-${i+1}`,eventKey:`old-${i+1}`,rank:i+1}));
const incoming={...base,id:'ai-navier-stokes',eventKey:'navier-stokes',title:'OpenAI公布N-S方程证明'};
void test('补入重点新闻为首条，保留被替换文章永久身份，栏目仍为十条',()=>{
 const p=planReselection(old,incoming,'ai-old-10','补录重大漏选','2026-09-10T16:00:00Z');
 assert.equal(p.selected.length,10);assert.equal(p.selected[0].id,incoming.id);
 assert.deepEqual(p.selected.map(a=>a.rank),[1,2,3,4,5,6,7,8,9,10]);
 assert.equal(p.retired.id,'ai-old-10');assert.equal(p.retired.selectionStatus,'replaced');
 assert.equal(p.retired.replacementId,incoming.id);assert.equal(old[0].rank,1);
});
void test('拒绝空说明、跨期、重复事件与截稿后补录',()=>{
 assert.throws(()=>planReselection(old,incoming,'ai-old-10','',base.checkedAt));
 assert.throws(()=>planReselection(old,{...incoming,editionDate:'2026-09-10'},'ai-old-10','补录',base.checkedAt));
 assert.throws(()=>planReselection(old,{...incoming,eventKey:'old-1'},'ai-old-10','补录',base.checkedAt));
 assert.throws(()=>planReselection(old,{...incoming,sources:[{...base.sources[0],publishedAt:'2026-09-09T10:00:00+08:00'}]},'ai-old-10','补录',base.checkedAt));
});
