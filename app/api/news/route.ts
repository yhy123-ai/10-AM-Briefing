import {searchArticles} from '@/lib/repository';
export async function GET(request:Request){try{return Response.json(await searchArticles(Object.fromEntries(new URL(request.url).searchParams)));}catch{return Response.json({error:'查询失败，请检查日期和筛选条件后重试。'},{status:400});}}
