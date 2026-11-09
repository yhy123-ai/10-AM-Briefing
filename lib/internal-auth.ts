import {env} from 'cloudflare:workers';
export async function authorized(request:Request){const configured=env.INGEST_SECRET;if(!configured||configured.length<32)return false;const actual=request.headers.get('authorization')||'';const expected='Bearer '+configured;const encode=new TextEncoder();const[a,b]=await Promise.all([crypto.subtle.digest('SHA-256',encode.encode(actual)),crypto.subtle.digest('SHA-256',encode.encode(expected))]);let diff=0;const aa=new Uint8Array(a),bb=new Uint8Array(b);for(let i=0;i<aa.length;i++)diff|=aa[i]^bb[i];return diff===0;}
export const denied=()=>Response.json({error:'未授权'},{status:401});
export async function readJson(request:Request){const body=await request.text();if(body.length>2_000_000)throw new Error('稿件过大');return JSON.parse(body);}
