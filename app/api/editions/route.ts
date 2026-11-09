import {getEdition,listDates} from '@/lib/repository';
export async function GET(request:Request){const url=new URL(request.url);if(url.searchParams.get('list')==='1')return Response.json({dates:await listDates()});const edition=await getEdition(url.searchParams.get('date')||undefined);return edition?Response.json(edition):Response.json({error:'晨报尚未发布'},{status:404});}
