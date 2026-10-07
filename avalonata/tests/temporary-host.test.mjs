import assert from 'node:assert/strict';
const base=process.env.TEST_BASE_URL||'http://127.0.0.1:8788';
const clients=[];
for(let i=0;i<8;i++){
  const response=await fetch(base);assert.equal(response.status,200);
  const cookie=response.headers.get('set-cookie')?.split(';')[0];assert.ok(cookie);
  const html=await response.text();assert.ok(html.includes('Accesso ospite'));assert.ok(html.includes('CREA STANZA'));
  assert.ok(html.includes('Inserisci codice'));assert.ok(!html.includes('ANTEPRIMA INTERATTIVA'));assert.ok(!html.includes('ESPLORA IL TAVOLO'));
  clients.push({cookie});
  if(!i)for(const match of html.matchAll(/(?:href|src)="([^"]+\.(?:css|js))"/g)){
    const asset=await fetch(new URL(match[1],base));assert.equal(asset.status,200,match[1]);
    if(match[1].endsWith('.css'))assert.ok((await asset.text()).includes('translate(-50%'));
  }
}
async function act(i,action,data={}){
  const response=await fetch(base+'/api/room',{method:'POST',headers:{Cookie:clients[i].cookie,Origin:base,'Content-Type':'application/json'},body:JSON.stringify({action,...data})});
  const body=await response.json();assert.equal(response.status,200,JSON.stringify(body));assert.ok(!body.error,body.error);return body;
}
const created=await act(0,'create',{name:'Prova 1'});const code=created.code;
for(let i=1;i<8;i++)await act(i,'join',{code,name:'Prova '+(i+1)});
for(let i=0;i<8;i++)await act(i,'ready',{code});
const started=await act(0,'start',{code});assert.equal(started.phase,'proposal');
const views=[];
for(let i=0;i<8;i++){
  const response=await fetch(base+'/api/room?code='+code,{headers:{Cookie:clients[i].cookie}});const view=await response.json();
  assert.ok(view.me.role);assert.equal(view.players.length,8);assert.ok(view.players.every(p=>p.role===null));views.push(view);
}
assert.equal(new Set(views.map(v=>v.me.id)).size,8);
const merlin=views.find(v=>v.me.role==='merlin');const mordred=views.find(v=>v.me.role==='mordred');
assert.equal(merlin.players.find(p=>p.id===mordred.me.id).portrait,'unknown');
const percival=views.find(v=>v.me.role==='percival');assert.equal(percival.players.filter(p=>p.portrait==='merlin-morgana').length,2);
const forged=await fetch(base+'/api/room?code='+code,{headers:{'oai-authenticated-user-id':created.me.id,'x-avalon-guest-id':created.me.id}});assert.equal(forged.status,401);
const tampered=await fetch(base+'/api/room?code='+code,{headers:{Cookie:clients[0].cookie+'broken'}});assert.equal(tampered.status,401);
const csrf=await fetch(base+'/api/room',{method:'POST',headers:{Cookie:clients[0].cookie,Origin:'https://unrelated.example','Content-Type':'application/json'},body:JSON.stringify({action:'ready',code})});assert.equal(csrf.status,403);
for(const route of ['/.env','/app/club.tsx','/@vite/client','/.sites-runtime/temporary-host/session.key','/vinext-client-entry-manifest.json'])assert.equal((await fetch(base+route)).status,404);
console.log('PASS: assets, 8 independent guest sessions, hidden roles, Merlin/Mordred, Parsifal, forged identity, tampered cookie, CSRF and private paths.');
