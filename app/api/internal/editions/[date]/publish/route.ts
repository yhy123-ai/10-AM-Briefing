import {authorized,denied} from '@/lib/internal-auth';
import {publishEdition} from '@/lib/repository';
export async function POST(request:Request,{params}:{params:Promise<{date:string}>}){if(!await authorized(request))return denied();try{const{date}=await params;return Response.json(await publishEdition(date));}catch(e){return Response.json({error:e instanceof Error?e.message:'发布失败'},{status:409});}}
