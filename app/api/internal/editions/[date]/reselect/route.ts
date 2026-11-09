import {authorized,denied,readJson} from '@/lib/internal-auth';
import {reselectArticle} from '@/lib/repository';
export async function POST(request:Request,{params}:{params:Promise<{date:string}>}){
 if(!await authorized(request))return denied();
 try{const {date}=await params;const body=await readJson(request);return Response.json(await reselectArticle(date,body.article,body.replacedId,body.reason));}
 catch(e){return Response.json({error:e instanceof Error?e.message:'补录失败'},{status:400});}
}
