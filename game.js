const C=document.querySelector("#canvas"),ctx=C.getContext("2d");
ctx.imageSmoothingEnabled=false;
const SPRITES={};
["theo","luna","caio","bia","noah","maya","davi","nina"].forEach(n=>{let im=new Image();im.src=`assets/sprites/${n}.png`;SPRITES[n]=im});
const map=new Image();
let mapReady=false,mapFailed=false;
map.onload=()=>{mapReady=true;mapFailed=false;console.log("[Casa em Jogo] cenário carregado:",map.naturalWidth,map.naturalHeight)};
map.onerror=()=>{mapReady=false;mapFailed=true;console.error("[Casa em Jogo] falha ao carregar o cenário")};
map.src="assets/cenario_casa.png";
const BOT_NAMES=["Luna","Caio","Bia","Noah","Maya","Davi","Nina"];
const COLORS=["#57c7ff","#ff6b8a","#ffd166","#8ee493","#c89bff","#ff9f68","#67e8d0","#f3f4f6"];
const moods=["Conversando","Desconfiado","Planejando","Relaxando","Observando","Fofocando"];
const sayings=["Tem uma aliança escondida rolando.","Eu não confio em todo mundo aqui.","Se eu ganhar a prova, vou mexer no jogo.","Ouvi uma coisa estranha perto da cozinha.","Tem gente prometendo voto para dois lados.","Acho que a próxima votação vai surpreender.","Não conta pra ninguém, mas estou com um alvo.","Essa casa está cheia de cobra."];
const rnd=(a,b)=>Math.random()*(b-a)+a, pick=a=>a[Math.floor(Math.random()*a.length)];
let trait="Social",playerColor=COLORS[0],people=[],me,round=1,time=70,phase="social",feed=[],leader="",immune="",eventName="";
let stats={energy:100,social:50,rep:50,coins:500},alliances=[],gossips=[],near=null,last=performance.now(),eventCd=18,actionCd=0,challenge=0;
let musicOn=true,audioCtx=null,musicTimer=null,doorNear=null;
let dialogueOpen=false,typingTimer=null,currentDialogue=null,relationship={},roomActionCd=0;
let powers=[],activeMission=null,missionCompleted=false,doubleVoteArmed=false,secretImmune=false,seasonSaved=false;
const PROFILE_KEY="casaEmJogo_profile_v1";let profile={seasons:0,wins:0,coins:0};
const MISSIONS=[{id:"talk3",text:"Converse com 3 participantes diferentes",goal:3,type:"talk",reward:120},{id:"kitchen",text:"Use a cozinha 2 vezes",goal:2,type:"room_COZINHA",reward:90},{id:"alliance",text:"Forme uma aliança",goal:1,type:"alliance",reward:150},{id:"gossip",text:"Espalhe 2 fofocas",goal:2,type:"gossip",reward:110},{id:"patio",text:"Relaxe no pátio 2 vezes",goal:2,type:"room_PÁTIO / PISCINA",reward:80}];let missionProgress={};

// V0.8 — colisão redesenhada a partir do cenário 1024×765 enviado pelo usuário.
// Em vez de um retângulo gigante por cômodo, cada piso é composto por várias áreas.
// Isso evita atravessar o fundo preto, paredes e móveis grandes.

const FLOOR_RECTS=[
 // DESPENSA / CAFÉ superior esquerdo
 {room:"DESPENSA",x:51,y:31,w:258,h:170},
 // COZINHA principal
 {room:"COZINHA",x:51,y:230,w:258,h:386},
 // SALA / HALL central
 {room:"SALA",x:352,y:125,w:270,h:347},
 {room:"HALL",x:351,y:472,w:272,h:145},
 // passagem central inferior
 {room:"HALL",x:313,y:583,w:348,h:55},
 // PÁTIO
 {room:"PÁTIO / PISCINA",x:27,y:619,w:575,h:146},
 // QUARTO superior direito
 {room:"QUARTO",x:646,y:25,w:332,h:298},
 // corredor abaixo do quarto
 {room:"CORREDOR",x:622,y:325,w:236,h:142},
 // LOUNGE
 {room:"LOUNGE",x:643,y:487,w:133,h:254},
 // CONFESSIONÁRIO
 {room:"CONFESSIONÁRIO",x:786,y:491,w:201,h:250}
];

// Obstáculos desenhados em cima dos elementos visíveis.
// playerRadius é aplicado de forma circular, então não precisa "engordar" os retângulos.
const SOLIDS=[
 // bordas / bancadas da despensa
 [53,31,255,22],[53,31,18,171],[290,31,18,171],
 [72,68,49,95],[123,62,109,63],[236,52,48,109],
 [75,164,190,31],

 // cozinha: bancadas e eletros nas paredes
 [53,232,255,28],[53,232,21,383],[286,232,22,383],
 [75,262,191,65],[249,264,38,96],
 [55,421,37,167],[263,405,26,183],
 // ilha + bancos/cadeiras
 [137,387,86,150],[116,404,18,132],[226,402,18,134],
 [154,537,25,40],[204,537,25,40],
 // itens inferiores / plantas
 [253,562,33,47],[47,590,70,25],

 // sala: paredes laterais e objetos
 [353,125,269,23],[353,125,22,342],[601,125,21,342],
  [445,312,126,128], // sofá
 [451,338,78,59], // mesa de centro
 [444,445,131,39], // estante/console
 [354,482,78,77],[540,482,70,77], // estantes do hall
  [453,551,91,64], // porta dupla/parede central inferior
 [320,588,47,49],[575,588,44,49], // paredes pequenas

 // pátio e piscina
 [27,619,87,22],[27,619,20,146],
 [75,633,73,104], // guarda-sol/cadeira
 [112,687,482,78], // água da piscina: não caminhável
 [367,630,70,66],[506,630,75,70], // espreguiçadeiras
 [590,619,13,146],

 // quarto: paredes e camas/malas/móveis
 [646,25,332,23],[646,25,19,298],[959,25,19,298],
 [667,47,76,115],[755,46,62,73],[828,47,75,113],[910,47,48,113],
 [676,198,88,91],[805,196,84,95],[899,197,59,94],
 [739,185,90,94], // malas no centro
 [664,291,132,31],[829,291,129,31],

 // corredor sob quarto: paredes verdes / vãos
 [622,326,80,42],[699,327,92,42],[835,327,24,140],
 [787,324,47,143],

 // lounge
 [643,488,132,21],[643,488,18,253],[758,488,18,253],
 [659,510,59,68],[658,610,55,101],[724,518,35,178],
 [658,718,117,23],

 // confessionário
 [786,491,201,22],[786,491,18,250],[969,491,18,250],
 [804,514,164,55],[804,568,40,154],[929,569,40,153],
 [863,600,43,117],[804,718,165,23]
];

// Portais só existem onde o próprio desenho tem cômodos fisicamente separados.
// Bots NÃO usam teleportes aleatórios.
const PORTALS=[
 {name:"Despensa",roomA:"DESPENSA",ax:264,ay:151,roomB:"COZINHA",bx:112,by:358},
 {name:"Saída da Cozinha",roomA:"COZINHA",ax:190,ay:598,roomB:"PÁTIO / PISCINA",bx:190,by:651},
 {name:"Quarto",roomA:"QUARTO",ax:808,ay:302,roomB:"CORREDOR",bx:735,by:390},
 {name:"Lounge",roomA:"LOUNGE",ax:676,ay:595,roomB:"HALL",bx:596,by:562},
 {name:"Confessionário",roomA:"CONFESSIONÁRIO",ax:916,ay:690,roomB:"LOUNGE",bx:735,by:690}
];

const PLAYER_RADIUS=10;
let collisionDebug=false;

function rawFloorPoint(x,y){
 return FLOOR_RECTS.some(r=>x>=r.x&&x<=r.x+r.w&&y>=r.y&&y<=r.y+r.h)
}
function pointInFloors(x,y,r=PLAYER_RADIUS){
 // Testa o círculo contra a UNIÃO dos pisos. Isso mantém passagens entre
 // retângulos vizinhos sem permitir que o personagem pise no fundo preto.
 const samples=[[0,0],[r,0],[-r,0],[0,r],[0,-r],[r*.7,r*.7],[-r*.7,r*.7],[r*.7,-r*.7],[-r*.7,-r*.7]];
 return samples.every(([dx,dy])=>rawFloorPoint(x+dx,y+dy))
}
function floorRoom(x,y){
 const r=FLOOR_RECTS.find(r=>x>=r.x&&x<=r.x+r.w&&y>=r.y&&y<=r.y+r.h);
 return r?r.room:"FORA DA CASA";
}
function circleRect(cx,cy,r,bx,by,bw,bh){
 const nx=Math.max(bx,Math.min(cx,bx+bw)),ny=Math.max(by,Math.min(cy,by+bh));
 return (cx-nx)*(cx-nx)+(cy-ny)*(cy-ny)<r*r
}
function staticBlocked(x,y,r=PLAYER_RADIUS){
 return SOLIDS.some(([bx,by,bw,bh])=>circleRect(x,y,r,bx,by,bw,bh))
}
function actorBlocked(x,y,r,who){
 for(const p of people){
  if(!p.alive||p===who)continue;
  if(Math.hypot(x-p.x,y-p.y)<r+9)return true
 }
 return false
}
function canMove(x,y,who=null){
 return pointInFloors(x,y)&&!staticBlocked(x,y,PLAYER_RADIUS)&&!actorBlocked(x,y,PLAYER_RADIUS,who)
}
function roomAt(x,y){return floorRoom(x,y)}
function safePoint(roomName,ignoreActor=null){
 const candidates=FLOOR_RECTS.filter(r=>!roomName||r.room===roomName);
 if(!candidates.length)return [405,286];
 for(let n=0;n<400;n++){
  const r=pick(candidates);
  const x=rnd(r.x+18,r.x+r.w-18),y=rnd(r.y+18,r.y+r.h-18);
  if(pointInFloors(x,y)&&!staticBlocked(x,y,PLAYER_RADIUS)&&!actorBlocked(x,y,PLAYER_RADIUS,ignoreActor))return [x,y]
 }
 // deterministic fallbacks for every room, all chosen on visible floor.
 const fallback={
  "DESPENSA":[175,150],
  "COZINHA":[112,356],
  "SALA":[405,286],
  "HALL":[590,575],
  "PÁTIO / PISCINA":[270,665],
  "QUARTO":[809,176],
  "CORREDOR":[734,400],
  "LOUNGE":[734,590],
  "CONFESSIONÁRIO":[918,690]
 };
 return fallback[roomName]||[405,286]
}
function nearestPortal(p){
 let best=null,bd=36;
 for(const portal of PORTALS){
  for(const side of ["A","B"]){
   const px=portal[side.toLowerCase()+"x"],py=portal[side.toLowerCase()+"y"];
   const d=Math.hypot(p.x-px,p.y-py);
   if(d<bd){bd=d;best={portal,side}}
  }
 }
 return best
}
function useNearestPortal(p){
 const found=nearestPortal(p);if(!found)return false;
 const {portal,side}=found;
 const targetRoom=side==="A"?portal.roomB:portal.roomA;
 let tx=side==="A"?portal.bx:portal.ax,ty=side==="A"?portal.by:portal.ay;
 if(staticBlocked(tx,ty)||!pointInFloors(tx,ty)){
   const safe=safePoint(targetRoom);tx=safe[0];ty=safe[1];
 }
 p.x=tx;p.y=ty;p.tx=tx;p.ty=ty;p.zone=roomAt(tx,ty);
 toast("🚪 "+portal.name);return true
}

function loadProfile(){try{const s=JSON.parse(localStorage.getItem(PROFILE_KEY)||"null");if(s&&typeof s==="object")profile={...profile,...s}}catch(e){}document.querySelector("#profileWins").textContent=profile.wins;document.querySelector("#profileSeasons").textContent=profile.seasons;document.querySelector("#profileCoins").textContent=profile.coins}
function saveProfile(){try{localStorage.setItem(PROFILE_KEY,JSON.stringify(profile))}catch(e){}}
function updateStartPreview(){const n=document.querySelector("#name").value.trim()||"Jogador";document.querySelector("#previewName").textContent=n;document.querySelector("#previewTrait").textContent=({Social:"🤝 Social",Competitivo:"🏆 Competitivo",Provocador:"🔥 Provocador",Observador:"👁 Observador"})[trait]||trait}
loadProfile();
console.log("[Casa em Jogo] script inicializado");document.documentElement.dataset.gameScript="ready";
document.querySelectorAll(".trait").forEach(b=>b.onclick=()=>{document.querySelectorAll(".trait").forEach(x=>x.classList.remove("selected"));b.classList.add("selected");trait=b.dataset.trait;updateStartPreview()});document.querySelector("#name").addEventListener("input",updateStartPreview);
COLORS.slice(0,7).forEach((c,i)=>{let b=document.createElement("button");b.className="color"+(i===0?" selected":"");b.style.background=c;b.onclick=()=>{document.querySelectorAll(".color").forEach(x=>x.classList.remove("selected"));b.classList.add("selected");playerColor=c};document.querySelector("#colors").appendChild(b)});
let gameStarted=false,animationFrameId=null,loopErrorCount=0,lastFatalAt=0;
document.querySelector("#play").onclick=()=>{
 if(gameStarted)return;
 const btn=document.querySelector("#play");
 btn.disabled=true;btn.innerHTML="<span>ENTRANDO NA CASA...</span>";
 // O jogo NÃO depende mais de map.decode(). O mapa pode terminar de carregar depois.
 try{
   start();
   gameStarted=true;
 }catch(err){
   console.error("Falha ao iniciar a partida:",err);
   btn.disabled=false;btn.innerHTML="<span>TENTAR NOVAMENTE</span><b>▶</b>";
   showFatalError("Não foi possível iniciar a partida",err);
 }
};
document.querySelector("#musicBtn").onclick=toggleMusic;
document.querySelector("#gossipBtn").onclick=showGossip;
document.querySelector("#relBtn").onclick=showRelationships;
document.querySelector("#collisionBtn").onclick=toggleCollisionDebug;
document.querySelector("#npcDebugBtn").onclick=showNpcDebug;
document.querySelector("#powersBtn").onclick=showPowers;document.querySelector("#missionsBtn").onclick=showMission;document.querySelector("#profileBtn").onclick=showProfile;document.querySelector("#howBtn").onclick=showHowTo;document.querySelector("#modalClose").onclick=()=>{if(phase==="social")closeModal()};
addEventListener("keydown",e=>{
 const k=e.key.toLowerCase();
 if(k===" " && dialogueOpen){e.preventDefault();advanceDialogue();return}
 if(k==="h"){if(gameStarted)toggleCollisionDebug();return}
 if(uiBlocking()){e.preventDefault();return}
 keys[k]=true;
 if(k==="e"&&phase==="social")interact();
 if(k==="f"&&phase==="social")action()
});
addEventListener("keyup",e=>keys[e.key.toLowerCase()]=false);
addEventListener("blur",()=>{Object.keys(keys).forEach(k=>keys[k]=false)});


const NAV_STEP=12;

function navKey(x,y){return `${Math.round(x/NAV_STEP)},${Math.round(y/NAV_STEP)}`}
function snapNav(v){return Math.round(v/NAV_STEP)*NAV_STEP}

function navWalkable(x,y,who=null){
 return pointInFloors(x,y,8)&&!staticBlocked(x,y,8)&&!actorBlocked(x,y,7,who)
}

function findNearestWalkable(x,y,who=null){
 const sx=snapNav(x),sy=snapNav(y);
 if(navWalkable(sx,sy,who))return [sx,sy];
 for(let radius=1;radius<=8;radius++){
  for(let dx=-radius;dx<=radius;dx++){
   for(let dy=-radius;dy<=radius;dy++){
    if(Math.abs(dx)!==radius&&Math.abs(dy)!==radius)continue;
    const nx=sx+dx*NAV_STEP,ny=sy+dy*NAV_STEP;
    if(navWalkable(nx,ny,who))return [nx,ny]
   }
  }
 }
 return null
}

function findPath(sx,sy,tx,ty,who=null,maxNodes=1800){
 const start=findNearestWalkable(sx,sy,who),goal=findNearestWalkable(tx,ty,who);
 if(!start||!goal)return [];
 const sk=navKey(start[0],start[1]),gk=navKey(goal[0],goal[1]);
 if(sk===gk)return [goal];

 const queue=[start],came=new Map([[sk,null]]),coords=new Map([[sk,start]]);
 let qi=0,visited=0;
 const dirs=[[1,0],[-1,0],[0,1],[0,-1]];

 while(qi<queue.length&&visited++<maxNodes){
  const cur=queue[qi++],ck=navKey(cur[0],cur[1]);
  for(const [dx,dy] of dirs){
   const nx=cur[0]+dx*NAV_STEP,ny=cur[1]+dy*NAV_STEP,nk=navKey(nx,ny);
   if(came.has(nk)||!navWalkable(nx,ny,who))continue;
   came.set(nk,ck);coords.set(nk,[nx,ny]);

   if(nk===gk){
    const path=[];let k=nk;
    while(k&&k!==sk){path.push(coords.get(k));k=came.get(k)}
    path.reverse();
    return path
   }
   queue.push([nx,ny])
  }
 }
 return []
}

function chooseNpcDestination(p){
 const room=roomAt(p.x,p.y);
 const sameRoom=people.filter(o=>o!==p&&o.alive&&roomAt(o.x,o.y)===room);
 let target;

 if(sameRoom.length&&Math.random()<.35){
  const other=pick(sameRoom),angle=Math.random()*Math.PI*2;
  target=[other.x+Math.cos(angle)*34,other.y+Math.sin(angle)*34];
  p.activity=Math.random()<.5?"conversando":"fofocando";
  p.socialTarget=other.name
 }else{
  target=safePoint(room,p);
  p.activity=pick(["passeando","observando","descansando"]);
  p.socialTarget=null
 }

 p.path=findPath(p.x,p.y,target[0],target[1],p);
 p.pathIndex=0;
 p.repathCd=rnd(3,6);

 if(!p.path.length){
  for(let i=0;i<28;i++){
   const a=Math.random()*Math.PI*2,d=rnd(28,88);
   const path=findPath(p.x,p.y,p.x+Math.cos(a)*d,p.y+Math.sin(a)*d,p,600);
   if(path.length){p.path=path;break}
  }
 }
}

function npcSocialTick(p,dt){
 p.behaviorCd=(p.behaviorCd??rnd(4,8))-dt;
 if(p.behaviorCd>0)return;
 p.behaviorCd=rnd(5,11);

 const sameRoom=people.filter(o=>o!==p&&o.alive&&roomAt(o.x,o.y)===roomAt(p.x,p.y));
 const close=sameRoom.filter(o=>Math.hypot(o.x-p.x,o.y-p.y)<58);

 if(close.length){
  const other=pick(close);
  p.mood=pick(["Conversando","Fofocando","Planejando"]);
  if(Math.hypot(p.x-me.x,p.y-me.y)<170){
   showNpcBubble(p,pick([
    "Você acha que a votação vai mudar?",
    "Não espalha o que eu te falei.",
    "Tem gente jogando dos dois lados.",
    "Quero ganhar a próxima prova.",
    "Ainda não sei em quem confiar."
   ]))
  }
  if(Math.random()<.25)addFeed(`💬 ${p.name} e ${other.name} conversaram pela casa.`)
 }else if(Math.hypot(p.x-me.x,p.y-me.y)<145&&Math.random()<.4){
  showNpcBubble(p,pick([
   "Hmm...",
   "Preciso pensar no meu voto.",
   "Essa casa está estranha.",
   "Quero falar com alguém."
  ]))
 }
}
function makePerson(name,x,y,c,human=false){
 const key=human?"theo":name.toLowerCase();
 return{name,x,y,c,human,alive:true,tx:x,ty:y,mood:pick(moods),wins:0,zone:roomAt(x,y),change:0,
 facing:"down",walkFrame:0,sprite:key,path:[],pathIndex:0,repathCd:0,
 behaviorCd:rnd(3,8),activity:"observando",socialTarget:null,stuck:0,lastX:x,lastY:y}
}
function start(){
 const name=document.querySelector("#name").value.trim()||"Jogador";
 // reset completo para impedir estado parcial caso o usuário tente iniciar novamente
 phase="social";round=1;time=70;feed=[];leader="";immune="";eventName="";near=null;doorNear=null;dialogueOpen=false;currentDialogue=null;if(typingTimer){clearInterval(typingTimer);typingTimer=null}document.querySelector("#dialogue").classList.add("hidden");closeModal();
 alliances=[];gossips=[];relationship={};eventCd=18;actionCd=0;roomActionCd=0;challenge=0;
 stats={energy:100,social:50,rep:50,coins:500};
 if(trait==="Social")stats.social=62;
 if(trait==="Competitivo")stats.energy=112;
 if(trait==="Provocador")stats.rep=44;
 if(trait==="Observador")stats.rep=57;

 people=[makePerson(name,405,286,playerColor,true)];
 BOT_NAMES.forEach((n,i)=>{
   const zones=["SALA","COZINHA","HALL","PÁTIO / PISCINA","QUARTO","LOUNGE"];
   const p=safePoint(zones[i%zones.length]);
   people.push(makePerson(n,p[0],p[1],COLORS[i+1]))
 });
 me=people[0];
 if(!me)throw new Error("Participante principal não foi criado.");

 people.filter(p=>p!==me).forEach(p=>relationship[p.name]={trust:50,affinity:50,suspicion:10});
 powers=[];doubleVoteArmed=false;secretImmune=false;seasonSaved=false;
 missionProgress={talk:new Set()};activeMission=pick(MISSIONS);missionCompleted=false;

 document.querySelector("#start").classList.remove("active");
 document.querySelector("#game").classList.add("active");

 addFeed(`🎬 ${name} entrou na casa como ${trait}.`);
 addFeed(mapReady?"🏠 Cenário carregado.":"🏠 Partida iniciada; o cenário está terminando de carregar.");
 addFeed("🚧 Colisões, NPCs e controles ativados.");
 try{
   const testIssues=runSelfTest();
   if(testIssues.length)addFeed("⚠️ Autoteste: "+testIssues.join(", "));
   else addFeed("✅ Autoteste de mapa e portais concluído.");
 }catch(err){console.warn("Autoteste não bloqueante:",err);addFeed("⚠️ Autoteste ignorado para não bloquear a partida.")}
 if(activeMission)addFeed(`🎯 MISSÃO SECRETA: ${activeMission.text}`);
 toast("CASA EM JOGO • V1.1.5");
 try{startMusic()}catch(err){console.warn("Áudio indisponível:",err)}
 last=performance.now();
 // desenha uma vez imediatamente: personagem aparece mesmo antes do primeiro frame agendado
 try{draw();ui()}catch(err){console.error("Primeiro desenho:",err);showFatalError("Erro ao desenhar a partida",err)}
 if(animationFrameId===null)animationFrameId=requestAnimationFrame(loop)
}

function loop(now){
 animationFrameId=null;
 try{
   let dt=Math.min(.05,Math.max(0,(now-last)/1000));last=now;
   if(phase==="social")update(dt);
   draw();ui();loopErrorCount=0;
 }catch(err){
   loopErrorCount++;console.error("Erro no loop do jogo:",err);
   const t=Date.now();if(t-lastFatalAt>2500){showFatalError("O jogo encontrou um erro durante a partida",err);lastFatalAt=t}
   if(loopErrorCount>=8){console.error("Loop pausado após erros repetidos.");return}
 }
 animationFrameId=requestAnimationFrame(loop)
}
function missionStep(type,value=1,key=null){if(!activeMission||missionCompleted)return;if(activeMission.type==="talk"&&type==="talk"){missionProgress.talk=missionProgress.talk||new Set();if(key)missionProgress.talk.add(key);missionProgress.talkCount=missionProgress.talk.size}else if(activeMission.type===type)missionProgress[type]=(missionProgress[type]||0)+value;const cur=activeMission.type==="talk"?(missionProgress.talkCount||0):(missionProgress[activeMission.type]||0);if(cur>=activeMission.goal){missionCompleted=true;stats.coins+=activeMission.reward;addFeed(`✅ Missão concluída: ${activeMission.text}. +${activeMission.reward} moedas`);toast("🎯 MISSÃO CONCLUÍDA!")}}
function missionCurrent(){if(!activeMission)return 0;return activeMission.type==="talk"?(missionProgress.talkCount||0):(missionProgress[activeMission.type]||0)}
function grantPower(name){if(!name)return;powers.push(name);addFeed(`⚡ Você recebeu o poder: ${name}.`);toast("⚡ NOVO PODER")}
function showPowers(){if(!powers.length)return modal("⚡ PODERES","Você ainda não possui poderes.",["FECHAR"],closeModal);const opts=powers.map(p=>`USAR • ${p}`);modal("⚡ SEUS PODERES","Escolha um poder para ativar.",opts,label=>{const idx=opts.indexOf(label);if(idx<0)return;const p=powers[idx];powers.splice(idx,1);activatePower(p);closeModal()})}
function activatePower(p){if(p==="Voto Duplo"){doubleVoteArmed=true;addFeed("🗳️ Seu próximo voto valerá 2.")}else if(p==="Escudo Secreto"){secretImmune=true;addFeed("🛡️ Você ativou um Escudo Secreto.")}else if(p==="Espião"){const a=alivePeople().filter(x=>x!==me),t=pick(a);if(t)addFeed(`👁️ Poder Espião: ${t.name} está agindo de forma suspeita.`)}else if(p==="Moedas"){stats.coins+=180;addFeed("🪙 Você resgatou 180 moedas.")}}
function showMission(){if(!activeMission)return modal("🎯 MISSÃO","Nenhuma missão ativa.",["FECHAR"],closeModal);const c=Math.min(activeMission.goal,missionCurrent());modal("🎯 MISSÃO SECRETA",`${activeMission.text}\n\nProgresso: ${c}/${activeMission.goal}\nRecompensa: ${activeMission.reward} moedas\nStatus: ${missionCompleted?"CONCLUÍDA ✅":"EM ANDAMENTO"}`,["FECHAR"],closeModal)}
function showProfile(){modal("🏅 PERFIL",`Temporadas concluídas: ${profile.seasons}\nVitórias: ${profile.wins}\nCarteira permanente: ${profile.coins} moedas\n\nTemporada atual\nPerfil: ${trait}\nProvas vencidas: ${me?.wins||0}\nAlianças: ${alliances.length}\nFofocas: ${gossips.length}`,["FECHAR"],closeModal)}
function showHowTo(){modal("🎮 COMO JOGAR","WASD/setas: andar\nSHIFT: correr\nE: conversar\nF: interagir com cômodo/porta\nESPAÇO: completar diálogo\nH: mostrar colisões\n\nGanhe provas, forme alianças, use poderes e sobreviva à Zona de Risco.",["ENTENDI"],closeModal)}
function showFatalError(title,err){
 let box=document.querySelector("#runtimeError");
 if(!box){
   box=document.createElement("div");box.id="runtimeError";box.className="runtime-error";
   document.body.appendChild(box)
 }
 const msg=(err&&err.message)?err.message:String(err||"erro desconhecido");
 box.innerHTML=`<b>⚠️ ${title}</b><span>${msg}</span><button onclick="this.parentElement.remove()">FECHAR</button>`;
 box.style.display="flex"
}
function modalOpen(){return !document.querySelector("#modal").classList.contains("hidden")}
function uiBlocking(){return dialogueOpen||modalOpen()}
function update(dt){
 actionCd=Math.max(0,actionCd-dt);roomActionCd=Math.max(0,roomActionCd-dt);stats.energy=Math.max(0,stats.energy-dt*.09);if(!uiBlocking())eventCd=Math.max(-1,eventCd-dt);
 if(me.alive && !uiBlocking()){
   let dx=(keys.d||keys.arrowright?1:0)-(keys.a||keys.arrowleft?1:0);
   let dy=(keys.s||keys.arrowdown?1:0)-(keys.w||keys.arrowup?1:0);
   const moving=dx||dy;
   const sprint=(keys.shift && stats.energy>8);
   const speed=sprint?190:(stats.energy>10?135:88);
   if(sprint&&moving)stats.energy=Math.max(0,stats.energy-dt*4.2);
   let l=Math.hypot(dx,dy)||1;dx/=l;dy/=l;
   if(Math.abs(dx)>Math.abs(dy))me.facing=dx>0?"right":"left";else if(dy!==0)me.facing=dy>0?"down":"up";
   if(moving)me.walkFrame=(me.walkFrame+dt*(sprint?9:6))%4;
   // eixo separado = personagem desliza pela parede em vez de travar inteiro
   const nx=me.x+dx*speed*dt;
   if(canMove(nx,me.y,me))me.x=nx;
   const ny=me.y+dy*speed*dt;
   if(canMove(me.x,ny,me))me.y=ny;
 }
 updateBots(dt);near=findNear();doorNear=nearestPortal(me);
 if(eventCd<=0 && !uiBlocking() && phase==="social"){randomEvent();eventCd=rnd(19,31)}
 if(!uiBlocking()){time-=dt;if(time<=0)startChallenge()}
}
function updateBots(dt){
 people.filter(p=>!p.human&&p.alive).forEach(p=>{
  p.repathCd=Math.max(0,(p.repathCd||0)-dt);

  if(!p.path||p.pathIndex>=p.path.length||p.repathCd<=0){
   chooseNpcDestination(p)
  }

  if(p.path&&p.pathIndex<p.path.length){
   const wp=p.path[p.pathIndex];
   const dx=wp[0]-p.x,dy=wp[1]-p.y,d=Math.hypot(dx,dy);

   if(d<5){
    p.pathIndex++
   }else{
    const vx=dx/d,vy=dy/d;
    if(Math.abs(vx)>Math.abs(vy))p.facing=vx>0?"right":"left";
    else p.facing=vy>0?"down":"up";

    const speed=p.activity==="descansando"?27:44;
    const step=Math.min(speed*dt,d);
    const ox=p.x,oy=p.y,nx=p.x+vx*step,ny=p.y+vy*step;

    if(canMove(nx,ny,p)){
     p.x=nx;p.y=ny
    }else{
     if(canMove(nx,p.y,p))p.x=nx;
     if(canMove(p.x,ny,p))p.y=ny
    }

    if(Math.hypot(p.x-ox,p.y-oy)>.04){
     p.walkFrame=(p.walkFrame+dt*5.5)%4
    }
   }
  }

  const displacement=Math.hypot(p.x-(p.lastX??p.x),p.y-(p.lastY??p.y));
  p.stuck=displacement<.06?(p.stuck||0)+dt:0;
  p.lastX=p.x;p.lastY=p.y;

  if(p.stuck>1.2){
   p.path=[];p.pathIndex=0;p.repathCd=0;p.stuck=0;
   for(const [dx,dy] of [[12,0],[-12,0],[0,12],[0,-12]]){
    if(canMove(p.x+dx,p.y+dy,p)){
     p.x+=dx;p.y+=dy;break
    }
   }
  }

  npcSocialTick(p,dt)
 })
}
function findNear(){let best=null,bd=55;people.filter(p=>p!==me&&p.alive).forEach(p=>{let d=dist(me.x,me.y,p.x,p.y);if(d<bd){bd=d;best=p}});return best}

function interact(){if(dialogueOpen)return;if(actionCd>0)return;actionCd=.5;if(near)return openChat(near);if(roomAt(me.x,me.y)==="CONFESSIONÁRIO")return confession();bubble("Ninguém perto. Chegue perto de um participante.")}
function action(){
 if(dialogueOpen||modalOpen())return;
 if(actionCd>0)return;actionCd=.35;
 if(doorNear){if(useNearestPortal(me))return}
 const r=roomAt(me.x,me.y);
 if(r==="CONFESSIONÁRIO"){confession();return}
 const actions={
   "COZINHA":()=>{missionStep("room_COZINHA");stats.energy=Math.min(115,stats.energy+20);stats.coins+=15;addFeed("🍳 Você preparou comida. +20 energia • +15 moedas");bubble("+20 energia")},
   "DESPENSA":()=>{stats.coins+=30;addFeed("📦 Você ajudou a organizar a despensa. +30 moedas");bubble("+30 moedas")},
   "SALA":()=>{stats.social=Math.min(100,stats.social+6);addFeed("🛋️ Você socializou na sala. +6 Social");bubble("+6 Social")},
   "QUARTO":()=>{stats.energy=Math.min(115,stats.energy+28);addFeed("🛏️ Você descansou no quarto. +28 energia");bubble("+28 energia")},
   "LOUNGE":()=>{stats.rep=Math.min(100,stats.rep+5);addFeed("🎲 Você participou de uma dinâmica no lounge. +5 reputação");bubble("+5 reputação")},
   "PÁTIO / PISCINA":()=>{missionStep("room_PÁTIO / PISCINA");stats.social=Math.min(100,stats.social+4);stats.energy=Math.min(115,stats.energy+7);addFeed("🏖️ Você relaxou no pátio. +4 Social • +7 energia");bubble("Relaxando...")}
 };
 if(!actions[r]){bubble("Nada para fazer aqui agora.");return}
 if(roomActionCd>0){bubble("Espere um pouco para usar outra ação do cômodo.");return}
 roomActionCd=6;actions[r]()
}

function openChat(p){
 missionStep("talk",1,p.name);
 const rel=relationship[p.name]||{trust:50,affinity:50,suspicion:10};
 const intro = pick([
   `Ei, ${me.name}. ${pick(sayings)}`,
   `Você veio falar comigo? ${pick(sayings)}`,
   `Shhh... chega mais. ${pick(sayings)}`
 ]);
 showDialogue(p.name,p.c,intro,[
   ["Perguntar voto",()=>npcVoteTalk(p)],
   ["Propor aliança",()=>npcAlliance(p)],
   ["Contar fofoca",()=>npcGossip(p)],
   ["Prometer proteção",()=>npcPromise(p)],
   ["Provocar",()=>npcProvoke(p)]
 ]);
}
function npcVoteTalk(p){
 const target=pick(people.filter(q=>q.alive&&q!==p));
 changeRel(p.name,2,1,0);
 showDialogue(p.name,p.c,`Ainda não fechei meu voto... mas ${target.name} está me incomodando. Não espalha isso.`,[
   ["Guardar segredo",()=>{changeRel(p.name,4,2,-1);closeDialogue()}],
   ["Dizer que também votaria",()=>{changeRel(p.name,3,1,0);addFeed(`🗳️ ${me.name} e ${p.name} conversaram sobre ${target.name}.`);closeDialogue()}]
 ]);
}
function npcAlliance(p){
 if(!alliances.includes(p.name)){
   alliances.push(p.name);changeRel(p.name,12,10,-2);missionStep("alliance");
   addFeed(`🤝 ${me.name} e ${p.name} firmaram uma aliança secreta.`);
   showDialogue(p.name,p.c,"Fechado. A gente se protege por enquanto. Mas se você me trair, eu vou descobrir.",[
     ["Combinado",closeDialogue]
   ]);
 }else{
   showDialogue(p.name,p.c,"A gente já está junto nesse jogo. Só não me deixa descobrir que você está jogando dos dois lados.",[["Pode confiar",closeDialogue]]);
 }
}
function npcGossip(p){
 const target=pick(people.filter(q=>q.alive&&q!==p&&q!==me));
 const gossip=`Ouvi dizer que ${target.name} está tentando montar votos contra alguém do seu grupo.`;
 gossips.unshift(gossip);missionStep("gossip");changeRel(p.name,1,0,2);stats.social=Math.min(100,stats.social+2);
 addFeed(`🗣️ ${me.name} contou uma fofoca para ${p.name}.`);
 showDialogue(p.name,p.c,"Sério? Isso muda algumas coisas... vou observar antes de acreditar.",[
   ["É verdade",()=>{changeRel(p.name,0,0,1);closeDialogue()}],
   ["Talvez seja só rumor",()=>{changeRel(p.name,1,0,-1);closeDialogue()}]
 ]);
}
function npcPromise(p){
 gossips.unshift(`${me.name} prometeu proteger ${p.name}.`);
 changeRel(p.name,8,5,-2);stats.rep=Math.min(100,stats.rep+2);
 addFeed(`🛡️ ${me.name} prometeu proteção a ${p.name}.`);
 showDialogue(p.name,p.c,"Eu vou cobrar essa promessa quando chegar a votação.",[["Eu sei",closeDialogue]]);
}
function npcProvoke(p){
 changeRel(p.name,-8,-6,12);stats.rep=Math.max(0,stats.rep-4);
 addFeed(`🔥 ${me.name} e ${p.name} discutiram na casa.`);
 showDialogue(p.name,p.c,"Qual é a sua? Se quer guerra, vai ter.",[
   ["Responder",()=>{changeRel(p.name,-5,-3,6);closeDialogue()}],
   ["Encerrar discussão",()=>{changeRel(p.name,1,0,-2);closeDialogue()}]
 ]);
}
function changeRel(name,trust=0,aff=0,susp=0){
 if(!relationship[name])relationship[name]={trust:50,affinity:50,suspicion:10};
 relationship[name].trust=Math.max(0,Math.min(100,relationship[name].trust+trust));
 relationship[name].affinity=Math.max(0,Math.min(100,relationship[name].affinity+aff));
 relationship[name].suspicion=Math.max(0,Math.min(100,relationship[name].suspicion+susp));
}
function showDialogue(name,color,text,choices=[]){
 dialogueOpen=true;currentDialogue={name,color,text,choices,typed:false};
 const box=document.querySelector("#dialogue");
 box.classList.remove("hidden");
 document.querySelector("#speaker").textContent=name;
 document.querySelector("#portrait").style.setProperty("--pc",color||"#57c7ff");const key=(name===me?.name?"theo":name.toLowerCase());document.querySelector("#portraitImg").src=`assets/portraits/${SPRITES[key]?key:"theo"}.png`;
 document.querySelector("#dialogueChoices").innerHTML="";
 document.querySelector("#dialogueHint").style.display=choices.length?"none":"block";
 typeDialogue(text,()=>finishDialogueTyping());
}
function finishDialogueTyping(){
 if(!currentDialogue)return;
 currentDialogue.typed=true;
 const q=document.querySelector("#dialogueChoices");
 q.innerHTML="";
 if(currentDialogue.choices.length){
  currentDialogue.choices.forEach(([label,fn])=>{
   const b=document.createElement("button");b.textContent=label;b.onclick=fn;q.appendChild(b)
  })
 }
}
function typeDialogue(text,done){
 if(typingTimer)clearInterval(typingTimer);
 const el=document.querySelector("#dialogueText");el.textContent="";
 let i=0;typingTimer=setInterval(()=>{
   el.textContent+=text[i++]||"";
   if(i>=text.length){clearInterval(typingTimer);typingTimer=null;if(done)done()}
 },16)
}
function advanceDialogue(){
 if(typingTimer){
   clearInterval(typingTimer);typingTimer=null;
   document.querySelector("#dialogueText").textContent=currentDialogue?.text||"";
   finishDialogueTyping();
   return;
 }
 if(document.querySelector("#dialogueChoices").children.length===0)closeDialogue()
}
function closeDialogue(){
 dialogueOpen=false;currentDialogue=null;
 if(typingTimer){clearInterval(typingTimer);typingTimer=null}
 document.querySelector("#dialogue").classList.add("hidden");
 document.querySelector("#dialogueChoices").innerHTML="";
}
function showRelationships(){
 const lines=Object.entries(relationship).map(([n,r])=>`${n}: confiança ${r.trust} • afinidade ${r.affinity} • suspeita ${r.suspicion}`);
 modal("🤝 RELAÇÕES",lines.join("\n\n")||"Sem relações registradas.",["FECHAR"],closeModal)
}


function confession(){
 showDialogue("CONFESSIONÁRIO","#7c3aed","A câmera está ligada. O que você quer registrar anonimamente?",[
   ["Existe uma aliança secreta",()=>saveConfession("Existe uma aliança secreta.")],
   ["Alguém está mentindo nos votos",()=>saveConfession("Alguém está mentindo sobre os votos.")],
   ["O Chefe protege aliados",()=>saveConfession("O Chefe está protegendo aliados.")],
   ["Tem gente jogando dos dois lados",()=>saveConfession("Tem gente jogando dos dois lados.")]
 ]);
}
function saveConfession(text){
 gossips.unshift(text);closeDialogue();addFeed("🎥 Um depoimento anônimo foi gravado no confessionário.");
 setTimeout(()=>addFeed(`📺 FOFOCA DA CASA: "${text}"`),900)
}
function showGossip(){modal("📺 CENTRAL DE FOFOCAS",gossips.length?gossips.slice(0,6).map((g,i)=>`${i+1}. ${g}`).join("\n\n"):"Ainda não há fofocas registradas.",["FECHAR"],closeModal)}

function randomEvent(){
 const events=[
 ["📞 TELEFONE DA CASA","O telefone tocou e um participante ganhou uma consequência."],
 ["🎉 FESTA","A produção liberou festa. Interações sociais valem mais."],
 ["💌 CORREIO ANÔNIMO","Uma mensagem misteriosa apareceu na sala."],
 ["👀 VOTOS REVELADOS","Alguns votos poderão ser expostos depois da cerimônia."],
 ["💎 PODER SECRETO","Existe uma vantagem escondida na casa."],
 ["🍿 CINEMA DA CASA","Momentos comprometores da temporada foram exibidos."],
 ["🔥 TRETA","Dois participantes começaram uma discussão no lounge."],
 ["🚨 SINCERÃO","Alguns participantes precisarão apontar aliados e rivais."],
 ["🎯 MIRA","O Chefe deverá revelar publicamente três possíveis alvos."],
 ["🧊 CASTIGO","Um participante recebeu uma tarefa incômoda pela casa."]
 ];
 let e=pick(events);eventName=e[0];addFeed(`${e[0]} ${e[1]}`);toast(e[0]);if(e[0].includes("TELEFONE"))grantPower(pick(["Voto Duplo","Escudo Secreto","Espião","Moedas"]));if(e[0].includes("PODER SECRETO"))grantPower(pick(["Voto Duplo","Espião","Moedas"]));if(Math.random()<.45)gossips.unshift(e[1]);setTimeout(()=>eventName="",5500)
}

function startChallenge(){if(phase!=="social")return;phase="challenge";challenge=(challenge+1)%5;if(challenge===0)return reaction();if(challenge===1)return memory();if(challenge===2)return resistance();if(challenge===3)return colors();return boxes()}
function reaction(){let target=Math.floor(rnd(450,900));modal("⚡ PROVA DO REFLEXO",`Clique aproximadamente ${target} ms depois do sinal.`,["COMEÇAR"],()=>{let q=document.querySelector("#choices");q.innerHTML="";document.querySelector("#modalText").textContent="Prepare-se...";setTimeout(()=>{let b=document.createElement("button");b.className="choice";b.textContent="🟢 AGORA!";q.appendChild(b);let s=performance.now();b.onclick=()=>resolve(Math.abs(performance.now()-s-target),"Reflexo")},rnd(700,1600))})}
function memory(){let seq=Array.from({length:5},()=>pick(["⭐","❤️","🌙","💎","🍀"]));modal("🧠 PROVA DA MEMÓRIA","Memorize:\n\n"+seq.join("  "),["MEMORIZEI"],()=>{let correct=seq.join("");let opts=[correct,[...seq].reverse().join(""),[...seq].sort(()=>Math.random()-.5).join("")];opts=[...new Set(opts)].sort(()=>Math.random()-.5);modal("🧠 QUAL ERA?", "Escolha a sequência correta.",opts,c=>resolve(c===correct?rnd(20,80):rnd(380,650),"Memória"))})}
function resistance(){let clicks=0,start=performance.now();modal("💪 PROVA DE RESISTÊNCIA","Clique 20 vezes o mais rápido possível.",["COMEÇAR"],()=>{let q=document.querySelector("#choices");q.innerHTML="";let b=document.createElement("button");b.className="choice";b.textContent="CLIQUE! 0/20";q.appendChild(b);start=performance.now();b.onclick=()=>{clicks++;b.textContent=`CLIQUE! ${clicks}/20`;if(clicks>=20)resolve((performance.now()-start)/10,"Resistência")}})}
function colors(){let answer=pick(["VERMELHO","AZUL","VERDE","AMARELO"]);let display=pick(["VERMELHO","AZUL","VERDE","AMARELO"]);modal("🎨 PROVA DAS CORES",`A palavra sorteada é: ${answer}\nEscolha a resposta correta.`,["VERMELHO","AZUL","VERDE","AMARELO"],c=>resolve(c===answer?rnd(20,80):rnd(350,600),"Cores"))}
function boxes(){modal("🎁 PROVA DAS CAIXAS","Escolha uma caixa. Sorte também faz parte do jogo.",["📦 1","📦 2","📦 3","📦 4"],()=>resolve(rnd(0,480),"Caixas"))}
function resolve(score,type){
 closeModal();let alive=alivePeople();let scores=alive.filter(p=>p!==me).map(p=>({p,score:rnd(45,450)}));scores.push({p:me,score});scores.sort((a,b)=>a.score-b.score);leader=scores[0].p.name;scores[0].p.wins++;stats.coins+=leader===me.name?150:25;
 addFeed(`🏆 ${leader} venceu a Prova de ${type}.`);toast(`👑 ${leader.toUpperCase()} É O CHEFE`);selectImmunity()
}
function selectImmunity(){
 const alive=alivePeople();
 if(alive.length<=3)return final();
 const pool=alive.filter(p=>p.name!==leader);
 const protectedPlayer=pick(pool);
 immune=protectedPlayer?protectedPlayer.name:"";
 if(immune)addFeed(`🛡️ ${immune} recebeu imunidade.`);
 phase="vote";
 const opts=alive.filter(p=>p!==me&&p.name!==leader&&p.name!==immune);
 if(!opts.length){
   addFeed("⚠️ Não há alvos válidos para votação nesta rodada.");
   return finishRoundSafely()
 }
 modal("⚠️ FORMAÇÃO DA ZONA DE RISCO","Vote em quem você quer colocar em risco.",opts.map(p=>p.name),vote)
}
function vote(target){
 const alive=alivePeople();
 if(!alive.some(p=>p.name===target)){addFeed("⚠️ Voto inválido ignorado.");return finishRoundSafely()}
 const tally={};alive.forEach(p=>tally[p.name]=0);
 tally[target]=(tally[target]||0)+(doubleVoteArmed?2:1);if(doubleVoteArmed){addFeed("⚡ Seu Voto Duplo foi usado.");doubleVoteArmed=false}
 alive.filter(p=>p!==me).forEach(v=>{const o=alive.filter(p=>p!==v&&p.name!==leader&&p.name!==immune&&!(secretImmune&&p===me));if(o.length){let chosen=null;const rel=relationship[v.name];if(o.includes(me)&&rel&&Math.random()<Math.max(.06,rel.suspicion/130))chosen=me;if(!chosen)chosen=pick(o);if(chosen)tally[chosen.name]=(tally[chosen.name]||0)+1}});if(secretImmune&&me.name!==leader&&me.name!==immune){addFeed("🛡️ Seu Escudo Secreto protegeu você nesta rodada.");secretImmune=false}
 // Apenas pessoas que REALMENTE receberam voto entram pelo voto da casa.
 const valid=Object.entries(tally)
   .filter(([n,v])=>n!==leader&&n!==immune&&v>0)
   .sort((a,b)=>b[1]-a[1]);
 if(!valid.length){addFeed("⚠️ A votação terminou sem alvo válido.");closeModal();return finishRoundSafely()}
 const risk=valid.slice(0,Math.min(3,valid.length)).map(e=>e[0]);
 addFeed("⚠️ Zona de Risco: "+risk.join(", "));closeModal();
 if(risk.length>=3)return bateVolta(risk,tally);
 return eliminate(risk[0],tally)
}
function finishRoundSafely(){
 closeModal();
 if(alivePeople().length<=3)return final();
 round++;time=70;phase="social";leader="";immune="";eventName="";
 addFeed(`🌅 Começou a rodada ${round}.`)
}
function bateVolta(risk,tally){
 const saved=pick(risk);
 if(!saved)return finishRoundSafely();
 modal("🔁 BATE-VOLTA",`${risk.join(" • ")} disputaram a última chance.\n\n🟢 ${saved} escapou da Zona de Risco!`,["CONTINUAR"],()=>{
   closeModal();
   const remaining=risk.filter(n=>n!==saved);
   const out=pick(remaining);
   if(!out)return finishRoundSafely();
   eliminate(out,tally)
 })
}
function eliminate(outName,tally={}){
 const p=people.find(p=>p.name===outName&&p.alive);
 if(!p){addFeed("⚠️ Tentativa de eliminação inválida foi ignorada.");return finishRoundSafely()}
 p.alive=false;
 addFeed("🗳️ "+Object.entries(tally).filter(e=>e[1]>0).map(e=>`${e[0]} ${e[1]}`).join(" • "));
 addFeed(`🚪 ${outName} foi eliminado.`);
 toast(`${outName.toUpperCase()} FOI ELIMINADO`);
 if(!me.alive){phase="dead";return modal("VOCÊ FOI ELIMINADO",`Sua jornada terminou na rodada ${round}.`,["NOVA TEMPORADA"],()=>location.reload())}
 if(alivePeople().length<=3)return final();
 round++;time=70;phase="social";leader="";immune="";eventName="";
 addFeed(`🌅 Começou a rodada ${round}.`)
}
function final(){
 if(phase==="final"&&document.querySelector("#modalTitle").textContent==="🏆 FINAL DA TEMPORADA")return;
 phase="final";closeDialogue();
 const a=alivePeople();
 if(!a.length)return modal("🏆 FINAL DA TEMPORADA","A temporada terminou sem participantes ativos.",["NOVA TEMPORADA"],()=>location.reload());
 let winner=pick(a);
 if(a.includes(me)){
   const chance=Math.min(.88,.32+(stats.social+stats.rep)/360+me.wins*.03);
   if(Math.random()<chance)winner=me
 }
 if(!seasonSaved){profile.seasons+=1;profile.coins+=Math.round(stats.coins);if(winner===me)profile.wins+=1;saveProfile();seasonSaved=true}modal("🏆 FINAL DA TEMPORADA",`Vencedor: ${winner.name}\n\nFinalistas: ${a.map(p=>p.name).join(", ")}\nSeu perfil: ${trait}\nProvas: ${me.wins}\nAlianças: ${alliances.length?alliances.join(", "):"nenhuma"}\nMoedas: ${Math.round(stats.coins)}`,["NOVA TEMPORADA"],()=>location.reload())
}
function draw(){
 ctx.clearRect(0,0,C.width,C.height);
 if(mapReady && map.naturalWidth>0){
   ctx.drawImage(map,0,0,1024,765)
 }else{
   ctx.fillStyle="#101827";ctx.fillRect(0,0,1024,765);
   ctx.fillStyle="#fff";ctx.font="bold 28px system-ui";ctx.textAlign="center";
   ctx.fillText("CARREGANDO CENÁRIO...",512,365);
   ctx.font="14px system-ui";ctx.fillStyle="#9fb3c9";
   ctx.fillText(mapFailed?"Falha ao carregar o mapa.":"Aguarde alguns instantes.",512,398);
   ctx.textAlign="left"
 }
 // leve sombra atrás dos personagens para integrá-los ao cenário
 people.filter(p=>p.alive).forEach(drawPerson);
 if(near){ctx.save();ctx.strokeStyle="#fff";ctx.lineWidth=2;ctx.setLineDash([4,4]);ctx.beginPath();ctx.arc(near.x,near.y,25,0,Math.PI*2);ctx.stroke();ctx.setLineDash([]);ctx.fillStyle="#fff";ctx.font="bold 11px system-ui";ctx.textAlign="center";ctx.fillText("E • conversar",near.x,near.y-34);ctx.restore()}
 if(doorNear&&!near){ctx.save();ctx.fillStyle="#07101ddd";ctx.strokeStyle="#52d5ff";ctx.lineWidth=1;ctx.fillRect(me.x-63,me.y-47,126,22);ctx.strokeRect(me.x-63,me.y-47,126,22);ctx.fillStyle="#fff";ctx.font="bold 10px system-ui";ctx.textAlign="center";ctx.fillText("F • usar porta",me.x,me.y-32);ctx.restore()}
 if(collisionDebug)drawCollisionDebug();
}
function drawPerson(p){
 ctx.save();
 ctx.fillStyle="#0008";ctx.beginPath();ctx.ellipse(p.x,p.y+11,10,4,0,0,Math.PI*2);ctx.fill();
 const im=SPRITES[p.sprite];
 const dirs={down:0,left:1,right:2,up:3};
 const row=dirs[p.facing||"down"],frame=Math.floor(p.walkFrame||0)%4;
 if(im&&im.complete&&im.naturalWidth){
   // original source frame 24x32 rendered 1.25x for clearer pixel art
   ctx.drawImage(im,frame*32,row*48,32,48,Math.round(p.x-16),Math.round(p.y-35),32,48);
 }else{
   ctx.fillStyle=p.c;ctx.fillRect(p.x-8,p.y-5,16,20);ctx.beginPath();ctx.arc(p.x,p.y-12,8,0,Math.PI*2);ctx.fill()
 }
 ctx.font="bold 10px system-ui";ctx.textAlign="center";ctx.lineWidth=3;ctx.strokeStyle="#07101d";ctx.strokeText(p.name,p.x,p.y-38);ctx.fillStyle="#fff";ctx.fillText(p.name,p.x,p.y-38);
 if(p.name===leader){ctx.fillStyle="#ffd25f";ctx.font="bold 13px system-ui";ctx.fillText("♛",p.x,p.y-50)}if(p.name===immune){ctx.strokeStyle="#74e39a";ctx.lineWidth=2;ctx.beginPath();ctx.arc(p.x,p.y+1,15,0,Math.PI*2);ctx.stroke()}if(p===me){ctx.strokeStyle="#57d9ff";ctx.lineWidth=2;ctx.beginPath();ctx.arc(p.x,p.y,18,0,Math.PI*2);ctx.stroke()}
 ctx.restore()
}
function toggleCollisionDebug(){
 collisionDebug=!collisionDebug;
 const b=document.querySelector("#collisionBtn");
 b.classList.toggle("active",collisionDebug);
 toast(collisionDebug?"🧱 COLISÕES VISÍVEIS":"🧱 COLISÕES OCULTAS")
}
function drawCollisionDebug(){
 ctx.save();
 ctx.globalAlpha=.25;ctx.fillStyle="#22c55e";
 FLOOR_RECTS.forEach(r=>ctx.fillRect(r.x,r.y,r.w,r.h));
 ctx.globalAlpha=.38;ctx.fillStyle="#ef4444";
 SOLIDS.forEach(([x,y,w,h])=>ctx.fillRect(x,y,w,h));
 ctx.globalAlpha=.9;ctx.fillStyle="#facc15";
 PORTALS.forEach(p=>{ctx.beginPath();ctx.arc(p.ax,p.ay,5,0,Math.PI*2);ctx.fill();ctx.beginPath();ctx.arc(p.bx,p.by,5,0,Math.PI*2);ctx.fill()});
 ctx.restore()
}
function showNpcBubble(p,text){
 const el=document.querySelector("#npcBubble");
 // converte coordenada do canvas em posição aproximada da tela
 const rect=C.getBoundingClientRect();
 const sx=rect.left+(p.x/C.width)*rect.width;
 const sy=rect.top+(p.y/C.height)*rect.height;
 el.textContent=text;el.style.left=Math.min(window.innerWidth-250,sx+15)+"px";el.style.top=Math.max(20,sy-65)+"px";
 el.classList.remove("hidden");
 clearTimeout(el._hide);el._hide=setTimeout(()=>el.classList.add("hidden"),2200)
}

function runSelfTest(){
 const issues=[];
 const spawn=[405,286];

 if(!pointInFloors(spawn[0],spawn[1])||staticBlocked(spawn[0],spawn[1])){
  issues.push("Spawn principal inválido")
 }

 for(const portal of PORTALS){
  for(const side of ["A","B"]){
   const x=portal[side.toLowerCase()+"x"],y=portal[side.toLowerCase()+"y"];
   if(!rawFloorPoint(x,y))issues.push(`Portal ${portal.name} ${side} fora do piso`)
  }
 }

 people.filter(p=>!p.human).forEach(p=>{
  const room=roomAt(p.x,p.y);
  const dest=safePoint(room,p);
  const path=findPath(p.x,p.y,dest[0],dest[1],p,1200);
  if(!path.length)issues.push(`${p.name} sem rota em ${room}`)
 });

 console.log("[Casa em Jogo V1.1.5] autoteste:",issues.length?issues:"OK");
 return issues
}

function normalizeStats(){stats.energy=Math.max(0,Math.min(115,Number.isFinite(stats.energy)?stats.energy:0));stats.social=Math.max(0,Math.min(100,Number.isFinite(stats.social)?stats.social:0));stats.rep=Math.max(0,Math.min(100,Number.isFinite(stats.rep)?stats.rep:0));stats.coins=Math.max(0,Number.isFinite(stats.coins)?stats.coins:0)}
function ui(){if(!me)return;normalizeStats();document.querySelector("#energy").textContent=Math.round(stats.energy);document.querySelector("#social").textContent=Math.round(stats.social);document.querySelector("#rep").textContent=Math.round(stats.rep);document.querySelector("#coins").textContent=Math.round(stats.coins);document.querySelector("#roomBadge").textContent=roomAt(me.x,me.y)+(collisionDebug?" • DEBUG":"");const mc=activeMission?Math.min(activeMission.goal,missionCurrent()):0;document.querySelector("#missionShort").textContent=activeMission?`${activeMission.text} ${mc}/${activeMission.goal}`:"Sem missão";document.querySelector("#round").textContent=`RODADA ${round} • ${phase==="social"?"CONVIVÊNCIA":phase==="challenge"?"PROVA":"CERIMÔNIA"}`;document.querySelector("#timer").textContent=phase==="social"?`${String(Math.floor(Math.max(0,time)/60)).padStart(2,"0")}:${String(Math.ceil(Math.max(0,time)%60)).padStart(2,"0")}`:"EVENTO";document.querySelector("#event").textContent=eventName||(phase==="social"?"Convivência livre":"Evento em andamento");const night=round%3===0;document.querySelector("#dayLabel").textContent=`DIA ${round} ${night?"🌙":"☀️"}`;document.querySelector("#dayOverlay").style.opacity=night?".23":"0";document.querySelector("#players").innerHTML=people.map(p=>{const rel=relationship[p.name],key=p.human?"theo":p.name.toLowerCase(),r=p===me?"Você":(rel?`🤝${rel.trust} 👁${rel.suspicion}`:"");return `<div class="person ${p.alive?"":"dead"}"><img src="assets/portraits/${key}.png"><div><span class="pname">${p.name}</span><span class="pmeta">${p.alive?(p.human?p.mood:`${p.mood} • ${p.activity||"pela casa"}`):"eliminado"}</span></div><span class="relation-mini">${r}</span></div>`}).join("");document.querySelector("#feed").innerHTML=feed.map(f=>`<div class="eventline">${f}</div>`).join("")}
function alivePeople(){return people.filter(p=>p.alive)}
function addFeed(t){feed.unshift(t);feed=feed.slice(0,11)}
function modal(title,text,choices,cb){document.querySelector("#modal").classList.remove("hidden");document.querySelector("#modalClose").style.display=(phase==="social"?"block":"none");document.querySelector("#modalTitle").textContent=title;document.querySelector("#modalText").textContent=text;let q=document.querySelector("#choices");q.innerHTML="";choices.forEach(c=>{let b=document.createElement("button");b.className="choice";b.textContent=c;b.onclick=()=>cb(c);q.appendChild(b)})}
function closeModal(){document.querySelector("#modal").classList.add("hidden")}
function bubble(t){toast(t)}
function toast(t){let el=document.querySelector("#toast");el.textContent=t;el.classList.remove("hidden");setTimeout(()=>el.classList.add("hidden"),2200)}
function toggleMusic(){musicOn=!musicOn;document.querySelector("#musicBtn").textContent=`♫ Música ${musicOn?"ON":"OFF"}`;musicOn?startMusic():stopMusic()}
function startMusic(){if(!musicOn||musicTimer)return;try{audioCtx=audioCtx||new (window.AudioContext||window.webkitAudioContext)()}catch(e){return}let notes=[261.6,329.6,392,523.2,440,349.2,293.7,392],i=0;musicTimer=setInterval(()=>{let o=audioCtx.createOscillator(),g=audioCtx.createGain();o.type="triangle";o.frequency.value=notes[i++%notes.length];g.gain.setValueAtTime(.018,audioCtx.currentTime);g.gain.exponentialRampToValueAtTime(.001,audioCtx.currentTime+.2);o.connect(g);g.connect(audioCtx.destination);o.start();o.stop(audioCtx.currentTime+.21)},300)}
function stopMusic(){if(musicTimer){clearInterval(musicTimer);musicTimer=null}}
