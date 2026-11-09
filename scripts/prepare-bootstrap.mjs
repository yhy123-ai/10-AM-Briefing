import fs from 'node:fs';
import path from 'node:path';
const root=path.resolve(import.meta.dirname,'..'),research=path.resolve(root,'../output/ten-am-research');
const articles=['politics','finance','ai'].flatMap(c=>{const final=path.join(research,c+'-final.json');const f=fs.existsSync(final)?final:path.join(research,c+'.json');return fs.existsSync(f)?JSON.parse(fs.readFileSync(f,'utf8').replace(/^\uFEFF/,'')):[];}).map(a=>({...a,sources:a.sources.map(s=>({...s,sourceId:s.sourceId.match(/^[APF]\d+/)?.[0]||s.sourceId}))}));
fs.mkdirSync(path.join(root,'data'),{recursive:true});fs.writeFileSync(path.join(root,'data/bootstrap.json'),JSON.stringify(articles,null,2));
console.log(JSON.stringify({articles:articles.length,dates:[...new Set(articles.map(a=>a.editionDate))].sort((a,b)=>a.localeCompare(b))}));
