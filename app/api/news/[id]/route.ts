import {getArticle} from '@/lib/repository';
export async function GET(_request:Request,{params}:{params:Promise<{id:string}>}){const{id}=await params;const article=await getArticle(id);return article?Response.json(article):Response.json({error:'新闻不存在'},{status:404});}
