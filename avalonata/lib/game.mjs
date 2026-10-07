export const ROLE_IDS=['merlin','morgana','percival','mordred','assassin','oak','rays','prism'];
export const EVIL=['morgana','mordred','assassin'];
export const TEAM_SIZES=[3,4,4,5,5];
const fail=(message)=>{throw new Error(message);};
export const cleanName=(s)=>typeof s==='string' ? s.trim().replace(/\s+/g,' ').slice(0,22) : '';
export function newPlayer(userId,name){name=cleanName(name);if(!name)fail('Scegli un nome.');return {id:crypto.randomUUID(),userId,name,ready:false,role:null};}
export function createRoom(userId,name){const p=newPlayer(userId,name);return {players:[p],host:p.id,phase:'lobby',leader:0,mission:0,rejections:0,team:[],votes:{},questVotes:{},quests:[],history:[],chat:[],result:null,winner:null,reason:null};}
export function shuffled(items){const a=[...items];for(let i=a.length-1;i>0;i--){const b=new Uint32Array(1);let n;const limit=Math.floor(4294967296/(i+1))*(i+1);do{crypto.getRandomValues(b);n=b[0];}while(n>=limit);const j=n%(i+1);[a[i],a[j]]=[a[j],a[i]];}return a;}
export function mutate(original,userId,action,data={}){
 const s=structuredClone(original); let p=s.players.find(p=>p.userId===userId);
 if(action==='join'){if(p)return s;if(s.phase!=='lobby')fail('La partita è già iniziata.');if(s.players.length>=8)fail('Il tavolo è completo.');const incoming=newPlayer(userId,data.name);if(s.players.some(p=>p.name.toLowerCase()===incoming.name.toLowerCase()))fail('Questo nome è già al tavolo.');s.players.push(incoming);return s;}
 if(!p)fail('Non fai parte di questa stanza.');
 const host=()=>{if(p.id!==s.host)fail('Questa azione spetta a chi ha creato la stanza.');};
 if(action==='chat'){const message=typeof data.message==='string'?data.message.trim().slice(0,300):'';if(!message)fail('Scrivi un messaggio.');const last=s.chat.findLast(m=>m.player===p.id);if(last&&Date.now()-last.at<1000)fail('Aspetta un istante prima di inviare.');s.chat.push({id:crypto.randomUUID(),player:p.id,name:p.name,message,at:Date.now()});s.chat=s.chat.slice(-50);return s;}
 if(action==='ready'){if(s.phase!=='lobby')fail('La partita è già iniziata.');p.ready=!p.ready;return s;}
 if(action==='leave'){if(s.phase!=='lobby')fail('Puoi lasciare il tavolo solo prima dell’inizio.');s.players=s.players.filter(q=>q.id!==p.id);if(s.host===p.id)s.host=s.players[0]?.id??null;return s;}
 if(action==='start'){host();if(s.phase!=='lobby'||s.players.length!==8||s.players.some(p=>!p.ready))fail('Servono 8 giocatori, tutti pronti.');const assigned=shuffled(ROLE_IDS);s.players.forEach((p,i)=>p.role=assigned[i]);s.phase='proposal';s.leader=0;return s;}
 if(action==='propose'){if(s.phase!=='proposal'||s.players[s.leader].id!==p.id)fail('Solo il leader può proporre la squadra.');const team=data.team;if(!Array.isArray(team)||team.length!==TEAM_SIZES[s.mission]||new Set(team).size!==team.length||team.some(id=>!s.players.some(p=>p.id===id)))fail('Scegli il numero esatto di partecipanti.');s.team=team;s.votes={};s.phase='vote';return s;}
 if(action==='vote'){if(s.phase!=='vote'||typeof data.approve!=='boolean')fail('Non è il momento di votare.');if(p.id in s.votes)fail('Hai già votato.');s.votes[p.id]=data.approve;if(Object.keys(s.votes).length===8){const approved=Object.values(s.votes).filter(Boolean).length>4;s.history.push({mission:s.mission,team:[...s.team],leader:s.players[s.leader].id,votes:{...s.votes},approved});if(approved){s.phase='quest';s.questVotes={};s.rejections=0;}else{s.rejections++;s.result={kind:'rejected',approved:false};s.phase=s.rejections===5?'finished':'result';if(s.rejections===5){s.winner='evil';s.reason='Cinque squadre rifiutate nella stessa missione.';}}}return s;}
 if(action==='quest'){if(s.phase!=='quest'||!s.team.includes(p.id)||typeof data.sabotage!=='boolean')fail('Non puoi partecipare a questa missione.');if(p.id in s.questVotes)fail('Hai già consegnato la carta.');if(data.sabotage&&!EVIL.includes(p.role))fail('I leali possono giocare soltanto Successo.');s.questVotes[p.id]=data.sabotage;if(Object.keys(s.questVotes).length===s.team.length){const fails=Object.values(s.questVotes).filter(Boolean).length;const success=fails<(s.mission===3?2:1);const quest={mission:s.mission,team:[...s.team],fails,success};s.quests.push(quest);s.questVotes={};s.result={kind:'quest',...quest};const wins=s.quests.filter(q=>q.success).length,losses=s.quests.length-wins;if(losses===3){s.phase='finished';s.winner='evil';s.reason='Tre missioni fallite.';}else if(wins===3){s.phase='assassination';}else{s.phase='result';}}return s;}
 if(action==='advance'){host();if(s.phase!=='result')fail('Non c’è una fase da avanzare.');if(s.result.kind==='quest')s.mission++;s.leader=(s.leader+1)%8;s.phase='proposal';s.team=[];s.votes={};s.result=null;return s;}
 if(action==='assassinate'){if(s.phase!=='assassination'||p.role!=='assassin')fail('Questa scelta spetta all’Assassino.');const target=s.players.find(q=>q.id===data.target);if(!target||EVIL.includes(target.role))fail('Scegli un giocatore della fazione buona.');s.winner=target.role==='merlin'?'evil':'good';s.reason=target.role==='merlin'?'L’Assassino ha trovato Merlino.':'Merlino è salvo. Tre missioni sono riuscite.';s.target=target.id;s.phase='finished';return s;}
 if(action==='rematch'){host();if(s.phase!=='finished')fail('La partita non è conclusa.');const fresh=createRoom(userId,p.name);fresh.players=s.players.map(q=>({...q,ready:false,role:null}));fresh.host=s.host;return fresh;}
 fail('Azione non riconosciuta.');
}
export function portraitFor(s,viewer,player){
 if(s.phase==='lobby'||!viewer.role||!player.role)return 'unknown';
 if(s.phase==='finished'||viewer.id===player.id)return player.role;
 if(viewer.role==='percival'&&['merlin','morgana'].includes(player.role))return 'merlin-morgana';
 if(viewer.role==='merlin'&&EVIL.includes(player.role)&&player.role!=='mordred')return player.role;
 if(EVIL.includes(viewer.role)&&EVIL.includes(player.role))return player.role;
 return 'unknown';
}
export function view(s,userId){
 const me=s.players.find(p=>p.userId===userId);if(!me)fail('Non fai parte di questa stanza.');
 let knowledge=[];
 if(me.role==='merlin')knowledge=s.players.filter(p=>EVIL.includes(p.role)&&p.role!=='mordred').map(p=>({id:p.id,label:'Cattivo'}));
 if(me.role==='percival')knowledge=s.players.filter(p=>['merlin','morgana'].includes(p.role)).map(p=>({id:p.id,label:'Merlino oppure Morgana'}));
 if(EVIL.includes(me.role))knowledge=s.players.filter(p=>p.id!==me.id&&EVIL.includes(p.role)).map(p=>({id:p.id,label:'Tuo complice'}));
 return {phase:s.phase,host:s.host,leader:s.players[s.leader]?.id,mission:s.mission,rejections:s.rejections,team:s.team,quests:s.quests,history:s.history,chat:s.chat,result:s.result,winner:s.winner,reason:s.reason,target:s.target??null,teamSize:TEAM_SIZES[s.mission],me:{id:me.id,role:me.role,evil:EVIL.includes(me.role),knowledge},players:s.players.map(p=>({id:p.id,name:p.name,ready:p.ready,portrait:portraitFor(s,me,p),role:s.phase==='finished'?p.role:null})),submitted:Object.keys(s.votes),questSubmitted:Object.keys(s.questVotes),myVote:s.votes[me.id]??null,myQuestSubmitted:me.id in s.questVotes};
}
