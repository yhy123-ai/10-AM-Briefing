import fs from 'node:fs';
import {validateEdition} from '../lib/domain.ts';
import type {Article} from '../lib/types.ts';
const file=process.argv[2];if(!file)throw new Error('请提供稿件JSON路径');
const raw=JSON.parse(fs.readFileSync(file,'utf8').replace(/^\uFEFF/,''));
const items:Article[]=Array.isArray(raw)?raw:raw.articles;
if(!Array.isArray(items))throw new Error('稿件必须为新闻数组');
const errors=[...new Set(items.map(a=>a.editionDate))].flatMap(date=>validateEdition(date,items.filter(a=>a.editionDate===date)));
if(errors.length){console.error(errors.join('\n'));process.exitCode=1;}else console.log(`通过：${items.length}条新闻，来源与时间格式有效；发布前仍需人工核实事实、作者身份和去重。`);
