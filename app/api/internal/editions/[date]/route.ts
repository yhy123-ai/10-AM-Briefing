import {authorized,denied,readJson} from '@/lib/internal-auth';
import {saveEdition,getEdition} from '@/lib/repository';
export async function PUT(request:Request,{params}:{params:Promise<{date:string}>}){if(!await authorized(request))return denied();try{const{date}=await params;const body=await readJson(request);return Response.json(await saveEdition(date,body.articles,body.note||''));}catch(e){return Response.json({error:e instanceof Error?e.message:'保存失败'},{status:400});}}
export async function GET(request:Request,{params}:{params:Promise<{date:string}>}){if(!await authorized(request))return denied();const{date}=await params;const e=await getEdition(date,true);return e?Response.json(e):Response.json({error:'稿件不存在'},{status:404});}
