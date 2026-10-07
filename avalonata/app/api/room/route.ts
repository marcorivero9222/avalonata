import { env } from 'cloudflare:workers';
import { createRoom, mutate, view } from '../../../lib/game.mjs';
import { sessionIdentity } from '../../../lib/session';
export const dynamic='force-dynamic';
const json=(body:unknown,status=200)=>Response.json(body,{status,headers:{'Cache-Control':'no-store, private'}});
const codeFrom=(s:unknown)=>typeof s==='string'?s.trim().toUpperCase():'';
function identity(req:Request){const user=sessionIdentity(req.headers);if(!user)throw new Error('Accedi per sederti al tavolo.');return user;}
function database(){if(!env.DB)throw new Error('Il servizio delle stanze non è ancora disponibile.');return env.DB;}
async function load(code:string){if(!/^[A-Z2-9]{6}$/.test(code))throw new Error('Il codice della stanza deve avere 6 caratteri.');const row=await database().prepare('SELECT state, revision, updated_at FROM rooms WHERE code = ?').bind(code).first<{state:string;revision:number;updated_at:number}>();if(!row||Date.now()-row.updated_at>48*60*60*1000)throw new Error('Stanza non trovata o scaduta.');return row;}
export async function GET(req:Request){try{const user=identity(req);const code=codeFrom(new URL(req.url).searchParams.get('code'));const row=await load(code);return json({code,revision:row.revision,...view(JSON.parse(row.state),user)});}catch(e){return json({error:(e as Error).message},400);}}
export async function POST(req:Request){try{
 const user=identity(req);const origin=req.headers.get('origin');if(origin&&origin!==new URL(req.url).origin)return json({error:'Origine non consentita.'},403);
 if(Number(req.headers.get('content-length')||0)>8192)return json({error:'Richiesta troppo grande.'},413);
 const body=await req.text();if(body.length>8192)return json({error:'Richiesta troppo grande.'},413);const input=JSON.parse(body);const {action,...data}=input;
 if(action==='create'){
  const state=createRoom(user,data.name);const alphabet='ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  for(let attempt=0;attempt<5;attempt++){const random=crypto.getRandomValues(new Uint8Array(6));const code=Array.from(random,n=>alphabet[n%32]).join('');const inserted=await database().prepare('INSERT OR IGNORE INTO rooms (code,state,revision,updated_at) VALUES (?,?,0,?)').bind(code,JSON.stringify(state),Date.now()).run();if(inserted.meta.changes)return json({code,revision:0,...view(state,user)});}
  throw new Error('Non riesco a creare una stanza. Riprova.');
 }
 const code=codeFrom(data.code);
 for(let attempt=0;attempt<5;attempt++){
  const row=await load(code);const state=mutate(JSON.parse(row.state),user,action,data);const changed=await database().prepare('UPDATE rooms SET state = ?, revision = revision + 1, updated_at = ? WHERE code = ? AND revision = ?').bind(JSON.stringify(state),Date.now(),code,row.revision).run();
  if(changed.meta.changes)return action==='leave'?json({left:true}):json({code,revision:row.revision+1,...view(state,user)});
 }
 return json({error:'Il tavolo si sta aggiornando. Riprova tra un istante.'},409);
 }catch(e){return json({error:(e as Error).message},400);}}
