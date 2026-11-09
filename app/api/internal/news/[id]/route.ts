import {authorized,denied,readJson} from '@/lib/internal-auth';
import {correctArticle} from '@/lib/repository';
export async function PATCH(request:Request,{params}:{params:Promise<{id:string}>}){if(!await authorized(request))return denied();try{const{id}=await params;const body=await readJson(request);return Response.json(await correctArticle(id,body.article,body.reason||''));}catch(e){return Response.json({error:e instanceof Error?e.message:'更正失败'},{status:400});}}
