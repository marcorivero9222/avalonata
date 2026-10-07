import http from 'node:http';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { readdir, readFile, mkdir, writeFile } from 'node:fs/promises';
import { randomBytes, createHmac, timingSafeEqual } from 'node:crypto';
import { Miniflare } from 'miniflare';

const project=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const root=path.join(project,'dist/server');
const client=path.join(project,'dist/client');
const state=path.resolve(process.env.AVALON_DATA_DIR||path.join(project,'.sites-runtime/temporary-host'));
await mkdir(state,{recursive:true});
const keyPath=path.join(state,'session.key');
let secret;
try{secret=await readFile(keyPath);}catch(error){if(error.code!=='ENOENT')throw error;secret=randomBytes(32);await writeFile(keyPath,secret,{flag:'wx',mode:0o600});}
const files=await readdir(root,{recursive:true});
const js=['index.js',...files.filter(p=>p.endsWith('.js')&&p!=='index.js')];
const mf=new Miniflare({host:'127.0.0.1',port:0,modules:js.map(p=>({type:'ESModule',path:path.join(root,p)})),modulesRoot:root,compatibilityDate:'2026-05-15',compatibilityFlags:['nodejs_compat'],bindings:{AVALON_GUEST_MODE:'enabled'},d1Databases:{DB:'avalon-temporary'},d1Persist:path.join(state,'db')});
await mf.ready;
const db=await mf.getD1Database('DB');
const table=await db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='rooms'").first();
if(!table)await db.exec((await readFile(path.join(project,'drizzle/0000_yummy_retro_girl.sql'),'utf8')).replace(/\s+/g,' '));

const mime={'.css':'text/css','.js':'text/javascript','.png':'image/png','.webp':'image/webp','.jpg':'image/jpeg','.svg':'image/svg+xml','.woff2':'font/woff2','.ico':'image/x-icon'};
const assets=new Map();
for(const file of await readdir(client,{recursive:true})){
  const relative=file.replaceAll('\\','/');
  if(!relative.split('/').some(p=>p.startsWith('.'))&&mime[path.extname(file)])assets.set('/'+relative,path.join(client,file));
}
const port=Number(process.env.PORT||process.env.AVALON_PORT||8788);
if(!Number.isInteger(port)||port<1||port>65535)throw new Error('Invalid server port.');
const bindHost=process.env.AVALON_BIND_HOST||(process.env.PORT?'0.0.0.0':'127.0.0.1');
const publicOrigins=new Map();
const configuredOrigins=(process.env.AVALON_PUBLIC_ORIGINS||'').split(',');
if(process.env.RAILWAY_PUBLIC_DOMAIN)configuredOrigins.push('https://'+process.env.RAILWAY_PUBLIC_DOMAIN);
for(const value of configuredOrigins.map(v=>v.trim()).filter(Boolean)){
  const origin=new URL(value);
  if(!['http:','https:'].includes(origin.protocol)||origin.username||origin.password||origin.pathname!=='/'||origin.search||origin.hash)throw new Error('AVALON_PUBLIC_ORIGINS must contain HTTP(S) origins without paths or credentials.');
  publicOrigins.set(origin.host,origin.origin);
}
const cookieName='avalon_guest';
const sign=value=>createHmac('sha256',secret).update(value).digest('base64url');
function readSession(cookie=''){
  const token=cookie.split(';').map(p=>p.trim()).find(p=>p.startsWith(cookieName+'='))?.slice(cookieName.length+1);
  if(!token)return null;
  const [id,expires,sig,...rest]=token.split('.');
  if(rest.length||!id||!expires||!sig||!/^[a-f0-9]{48}$/.test(id)||!/^\d{13}$/.test(expires)||Number(expires)<Date.now())return null;
  const expected=Buffer.from(sign(id+'.'+expires));const actual=Buffer.from(sig);
  return actual.length===expected.length&&timingSafeEqual(actual,expected)?id:null;
}
function originFor(host){
  if(publicOrigins.has(host))return publicOrigins.get(host);
  if(host===`127.0.0.1:${port}`||host===`localhost:${port}`)return 'http://'+host;
  if(/^[a-z0-9]+(?:-[a-z0-9]+)*\.trycloudflare\.com$/.test(host||''))return 'https://'+host;
  return null;
}
const windows=new Map();
const clean=setInterval(()=>{const now=Date.now();for(const [key,value] of windows)if(now>value.reset)windows.delete(key);},60000);clean.unref();
const server=http.createServer(async(req,res)=>{
  res.setHeader('X-Content-Type-Options','nosniff');
  res.setHeader('Referrer-Policy','same-origin');
  res.setHeader('X-Frame-Options','DENY');
  res.setHeader('Cache-Control','no-store');
  const fail=(status,message)=>{res.writeHead(status,{'Content-Type':'application/json; charset=utf-8'});res.end(JSON.stringify({error:message}));};
  try{
    if(req.url==='/health'&&['GET','HEAD'].includes(req.method)){
      await db.prepare('SELECT 1').first();
      res.writeHead(200,{'Content-Type':'application/json'});
      return res.end(req.method==='HEAD'?undefined:JSON.stringify({status:'ok',application:'avalon-multiplayer'}));
    }
    const origin=originFor(req.headers.host);if(!origin)return fail(421,'Indirizzo non consentito.');
    if(!req.url?.startsWith('/')||req.url.startsWith('//'))return fail(400,'Indirizzo non valido.');
    const url=new URL(req.url,origin);
    // Old links to the standalone preview must land on the real multiplayer home.
    if(['/avalon.html','/index.html'].includes(url.pathname)&&['GET','HEAD'].includes(req.method)){
      res.writeHead(302,{Location:'/'+url.search});return res.end();
    }
    const asset=assets.get(url.pathname);
    if(asset){
      if(!['GET','HEAD'].includes(req.method))return fail(405,'Metodo non consentito.');
      const bytes=await readFile(asset);res.writeHead(200,{'Content-Type':mime[path.extname(asset)],'Content-Length':bytes.length,'Cache-Control':'public, max-age=3600'});return res.end(req.method==='HEAD'?undefined:bytes);
    }
    if(url.pathname!=='/'&&url.pathname!=='/api/room')return fail(404,'Pagina non trovata.');
    if(!['GET','HEAD','POST'].includes(req.method)||(req.method==='POST'&&url.pathname!=='/api/room'))return fail(405,'Metodo non consentito.');
    if(req.method==='POST'&&(req.headers.origin!==origin||!req.headers['content-type']?.startsWith('application/json')))return fail(403,'Origine non consentita.');
    let id=readSession(req.headers.cookie);
    if(!id){
      if(url.pathname==='/api/room')return fail(401,'Riapri la pagina per prendere posto.');
      id=randomBytes(24).toString('hex');const value=id+'.'+(Date.now()+48*3600000);
      res.setHeader('Set-Cookie',`${cookieName}=${value}.${sign(value)}; Path=/; HttpOnly; SameSite=Lax; Max-Age=172800${origin.startsWith('https:')?'; Secure':''}`);
    }
    if(req.method==='POST'){
      let limit=windows.get(id);if(!limit||Date.now()>limit.reset){limit={count:0,reset:Date.now()+60000};windows.set(id,limit);}
      if(++limit.count>90)return fail(429,'Troppe richieste. Attendi un minuto.');
    }
    let body;
    if(req.method==='POST'){
      const chunks=[];let size=0;
      for await(const chunk of req){size+=chunk.length;if(size>8192)return fail(413,'Richiesta troppo grande.');chunks.push(chunk);}
      body=Buffer.concat(chunks);
    }
    // Allowlist only rendering headers; never forward caller-supplied identity headers.
    const headers=new Headers();
    for(const name of ['accept','accept-language','content-type','origin','rsc','next-router-state-tree','next-url'])if(req.headers[name])headers.set(name,req.headers[name]);
    headers.set('x-avalon-guest-id','guest_'+id);
    const response=await mf.dispatchFetch(url.href,{method:req.method,headers,body});
    for(const [name,value] of response.headers)if(!['set-cookie','content-length','content-encoding','transfer-encoding','connection','cache-control'].includes(name.toLowerCase()))res.setHeader(name,value);
    res.statusCode=response.status;
    if(req.method==='HEAD')return res.end();
    res.end(Buffer.from(await response.arrayBuffer()));
  }catch(error){console.error('Request failed:',error.message);if(!res.headersSent)fail(500,'Il tavolo non risponde. Riprova.');else res.end();}
});
server.requestTimeout=15000;server.headersTimeout=10000;
await new Promise(resolve=>server.listen(port,bindHost,resolve));
console.log(`Avalon guest host: http://${bindHost}:${port}`);
for(const signal of ['SIGINT','SIGTERM'])process.on(signal,async()=>{clearInterval(clean);server.close();await mf.dispose();process.exit(0);});
