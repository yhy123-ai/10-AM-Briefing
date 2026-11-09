export const sourceRegistry: Record<string, { name: string; hosts: string[]; path?: string }> = {
 P1:{name:'新华网',hosts:['news.cn','xinhuanet.com']},P2:{name:'央视新闻',hosts:['cctv.com']},P3:{name:'中国政府网',hosts:['gov.cn']},P4:{name:'外交部',hosts:['mfa.gov.cn','fmprc.gov.cn']},P5:{name:'美联社',hosts:['apnews.com']},P6:{name:'路透社',hosts:['reuters.com']},P7:{name:'BBC',hosts:['bbc.com','bbc.co.uk']},P8:{name:'联合国新闻',hosts:['news.un.org']},
 F1:{name:'中国人民银行',hosts:['pbc.gov.cn']},F2:{name:'国家统计局',hosts:['stats.gov.cn']},F3:{name:'证监会',hosts:['csrc.gov.cn']},F4:{name:'上海证券交易所',hosts:['sse.com.cn']},F5:{name:'深圳证券交易所',hosts:['szse.cn']},F6:{name:'披露易',hosts:['hkexnews.hk']},F7:{name:'财联社',hosts:['cls.cn']},F8:{name:'第一财经',hosts:['yicai.com']},F9:{name:'美联储',hosts:['federalreserve.gov']},F10:{name:'欧洲央行',hosts:['ecb.europa.eu']},F11:{name:'IMF',hosts:['imf.org']},F12:{name:'SEC',hosts:['sec.gov']},
 A1:{name:'OpenAI',hosts:['openai.com']},A2:{name:'Anthropic',hosts:['anthropic.com']},A3:{name:'Google DeepMind',hosts:['deepmind.google']},A4:{name:'DeepSeek',hosts:['api-docs.deepseek.com','deepseek.com']},A5:{name:'Qwen',hosts:['qwen.ai','qwenlm.github.io','github.com'],path:'QwenLM'},A6:{name:'英伟达',hosts:['nvidianews.nvidia.com','blogs.nvidia.com','developer.nvidia.com']},A7:{name:'机器之心',hosts:['jiqizhixin.com']},A8:{name:'量子位',hosts:['qbitai.com']},A9:{name:'arXiv',hosts:['arxiv.org']},A10:{name:'Hugging Face',hosts:['huggingface.co']},A11:{name:'APPSO',hosts:['ifanr.com']},A12:{name:'数字生命卡兹克',hosts:['weibo.com','m.okjike.com']},A13:{name:'AGI Hunt',hosts:['agihunt.info']},
};
export function approvedSource(sourceId: string, url: string): boolean {
 const source=sourceRegistry[sourceId]; if(!source) return false;
 try {const u=new URL(url); if(u.protocol!=='https:' || u.username || u.password || u.port) return false;
 if(!source.hosts.some(h=>u.hostname===h || u.hostname.endsWith('.'+h)))return false;
 if(sourceId==='P3'&&!['gov.cn','www.gov.cn','english.www.gov.cn'].includes(u.hostname))return false;
 if(sourceId==='A5'&&u.hostname==='github.com'&&!/^\/QwenLM(?:\/|$)/i.test(u.pathname))return false;
 if(sourceId==='A12'&&u.hostname.endsWith('weibo.com')&&!/^\/(?:u\/)?5700099573(?:\/|$)/.test(u.pathname))return false;
 if(sourceId==='A12'&&u.hostname==='m.okjike.com'&&!u.pathname.startsWith('/users/82C7EBCB-0B1D-49EF-ADE1-F9F006933828'))return false;
 return true;
 }catch{return false;}
}
