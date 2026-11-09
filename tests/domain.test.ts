import test from 'node:test';
import assert from 'node:assert/strict';
import { validateEdition, searchFilter } from '../lib/domain.ts';
import type { Article } from '../lib/types.ts';
const article: Article = { id:'ai-20260909-01',editionDate:'2026-09-09',category:'ai',rank:1,eventKey:'test-event',title:'模型发布',summary:'已核实的模型发布摘要。',body:['根据原始材料对发布进行转述。'],background:[],timeline:[],glossary:[],sources:[{sourceId:'A1',name:'OpenAI',url:'https://openai.com/news/example',publishedAt:'2026-09-08T20:00:00+08:00',readAt:'2026-09-09T11:00:00Z'}],tags:['模型'],retrospective:true,checkedAt:'2026-09-09T11:00:00Z'};
void test('拒绝截稿后消息及无法判断时点的同日日期',()=>{
 for(const time of ['2026-09-09T09:31:00+08:00','2026-09-09']) assert.ok(validateEdition('2026-09-09',[{...article,sources:[{...article.sources[0],publishedAt:time}]}]).some(e=>e.includes('截稿')));
});
void test('拒绝伪装域名、跨板块重复事件及脚本来源链接',()=>{
 for(const url of ['https://openai.com.evil.test/a','javascript:alert(1)']) assert.ok(validateEdition('2026-09-09',[{...article,sources:[{...article.sources[0],url}]}]).some(e=>e.includes('来源')));
 assert.ok(validateEdition('2026-09-09',[article,{...article,id:'politics-20260909-01',category:'politics'}]).some(e=>e.includes('重复')));
});
void test('不足十条可发布，但每板块不能超过十条',()=>{
 assert.deepEqual(validateEdition('2026-09-09',[article]),[]);
 assert.ok(validateEdition('2026-09-09',Array.from({length:11},(_,i)=>({...article,id:`ai-20260909-${i+1}`,rank:i+1,eventKey:`e${i}`}))).length>0);
});
void test('中文关键词与日期组合参数化且转义通配符',()=>{
 const f=searchFilter({q:"模型%_' OR 1=1 --",from:'2026-09-03',to:'2026-09-09',category:'ai',page:'2'});
 assert.ok(!f.where.includes('OR 1=1'));
 assert.ok(f.params.some(p=>String(p).includes('模型\\%\\_')));
 assert.ok(f.params.includes('2026-09-03')); assert.ok(f.params.includes('ai')); assert.equal(f.page,2);
});
void test('拒绝无效日期及反向日期，分页有界',()=>{
 assert.throws(()=>searchFilter({from:'2026-02-30'})); assert.throws(()=>searchFilter({from:'2026-09-09',to:'2026-09-01'}));
 assert.equal(searchFilter({page:'-1'}).page,1);
});
