import assert from 'node:assert/strict';
const base=process.env.TEST_BASE_URL||'http://127.0.0.1:5173';
const ids=['local_seedy',...Array.from({length:7},(_,i)=>'test-player-'+(i+1))];
async function call(user,action,data={}){for(let i=0;i<8;i++){const r=await fetch(base+'/api/room',{method:'POST',headers:{'Content-Type':'application/json','oai-authenticated-user-id':user,'oai-authenticated-user-email':user+'@sites.test',Origin:base},body:JSON.stringify({action,...data})});const d=await r.json();if(r.status===409)continue;assert(!d.error,d.error);return d;}throw Error('Unresolved write conflict');}
const initial=await call(ids[0],'create',{name:'Omar'}),code=initial.code;
await Promise.all(ids.slice(1).map((id,i)=>call(id,'join',{code,name:['Giulia','Luca','Sara','Marco','Anna','Leo','Mia'][i]})));
let state;
await Promise.all(ids.map(id=>call(id,'ready',{code})));
state=await call(ids[0],'start',{code});assert.equal(state.players.length,8);
const secrets=await Promise.all(ids.map(async id=>{const r=await fetch(base+'/api/room?code='+code,{headers:{'oai-authenticated-user-id':id}});return await r.json();}));
assert.equal(new Set(secrets.map(v=>v.me.role)).size,8);
for(const v of secrets){assert(v.players.every(p=>p.role===null));assert(!('votes' in v));assert(!('questVotes' in v));}
const merlin=secrets.find(v=>v.me.role==='merlin'),mordred=secrets.find(v=>v.me.role==='mordred');assert(!merlin.me.knowledge.some(k=>k.id===mordred.me.id));
const good=secrets.filter(v=>!v.me.evil).map(v=>v.me.id);
state=await call(ids[0],'propose',{code,team:good.slice(0,3)});
await Promise.all(ids.map(id=>call(id,'vote',{code,approve:true})));
for(const id of good.slice(0,3)){const idx=secrets.findIndex(v=>v.me.id===id);state=await call(ids[idx],'quest',{code,sabotage:false});}
assert.equal(state.quests[0].success,true);assert.equal(state.phase,'result');
const denied=await fetch(base+'/api/room?code='+code,{headers:{'oai-authenticated-user-id':'outsider'}});assert.equal(denied.status,400);
const csrf=await fetch(base+'/api/room',{method:'POST',headers:{'Content-Type':'application/json','oai-authenticated-user-id':ids[0],Origin:'https://other.example'},body:JSON.stringify({action:'advance',code})});assert.equal(csrf.status,403);
const anonymous=await fetch(base+'/api/room?code='+code);assert.equal(anonymous.status,400);
console.log(JSON.stringify({ok:true,code,checks:['8 concurrent joins','8 concurrent ready actions','8 unique private roles','Mordred hidden','8 simultaneous votes persisted','mission completed across clients','outsider rejected','cross-origin rejected','anonymous rejected']}));
