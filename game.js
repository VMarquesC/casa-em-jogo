// Estados globais que precisam existir antes de qualquer callback/evento.
var keys = Object.create(null);
var NAV_STEP = 5;
const C=document.querySelector("#canvas"),ctx=C.getContext("2d");
ctx.imageSmoothingEnabled=false;
const SPRITES={};
["theo","luna","caio","bia","noah","maya","davi","nina"].forEach(n=>{let im=new Image();im.src=`assets/sprites/${n}.png`;SPRITES[n]=im});
const map=new Image();
let mapReady=false,mapFailed=false;
map.onload=()=>{mapReady=true;mapFailed=false;console.log("[Casa em Jogo] cenário carregado:",map.naturalWidth,map.naturalHeight)};
map.onerror=()=>{mapReady=false;mapFailed=true;console.error("[Casa em Jogo] falha ao carregar o cenário")};
map.src="assets/cenario_casa.png";
const ARENA_IMAGES={};
["reflexo","memoria","resistencia","cores","caixas"].forEach(key=>{
 const im=new Image();im.src=`assets/arenas/${key}.png`;ARENA_IMAGES[key]=im
});

const BOT_NAMES=["Luna","Caio","Bia","Noah","Maya","Davi","Nina"];
const COLORS=["#57c7ff","#ff6b8a","#ffd166","#8ee493","#c89bff","#ff9f68","#67e8d0","#f3f4f6"];
const moods=["Conversando","Desconfiado","Planejando","Relaxando","Observando","Fofocando"];
const sayings=["Tem uma aliança escondida rolando.","Eu não confio em todo mundo aqui.","Se eu ganhar a prova, vou mexer no jogo.","Ouvi uma coisa estranha perto da cozinha.","Tem gente prometendo voto para dois lados.","Acho que a próxima votação vai surpreender.","Não conta pra ninguém, mas estou com um alvo.","Essa casa está cheia de cobra."];
const rnd=(a,b)=>Math.random()*(b-a)+a, pick=a=>(Array.isArray(a)&&a.length)?a[Math.floor(Math.random()*a.length)]:null;
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

 {room:"DESPENSA",x:40,y:25,w:270,h:178},
 {room:"COZINHA",x:38,y:220,w:275,h:397},
 {room:"PASSAGEM COZINHA/SALA",x:292,y:300,w:88,h:170},

 {room:"SALA",x:340,y:116,w:286,h:370},
 {room:"PASSAGEM SALA/HALL",x:340,y:438,w:286,h:66},

 {room:"HALL",x:338,y:466,w:290,h:160},
 {room:"HALL",x:300,y:570,w:370,h:72},
 {room:"PASSAGEM COZINHA/PÁTIO",x:150,y:590,w:105,h:58},
 {room:"PÁTIO / PISCINA",x:16,y:610,w:590,h:155},

 {room:"QUARTO",x:632,y:20,w:350,h:305},
 {room:"PASSAGEM QUARTO/CORREDOR",x:700,y:286,w:160,h:74},
 {room:"CORREDOR",x:610,y:310,w:270,h:170},

 {room:"PASSAGEM CORREDOR/LOUNGE",x:620,y:440,w:170,h:75},
 {room:"LOUNGE",x:625,y:475,w:165,h:272},
 {room:"PASSAGEM LOUNGE/CONFESSIONÁRIO",x:750,y:620,w:75,h:120},
 {room:"CONFESSIONÁRIO",x:775,y:480,w:215,h:270}

];

// Obstáculos desenhados em cima dos elementos visíveis.
// playerRadius é aplicado de forma circular, então não precisa "engordar" os retângulos.
const SOLIDS=[

 // despensa
 [55,55,48,108],[107,62,105,58],[218,48,66,115],[72,161,180,28],

 // cozinha - bancadas externas
 [45,250,52,145],[96,248,166,66],[251,248,45,120],
 [43,420,42,160],[265,420,30,160],
 // ilha: menor e precisa, permitindo andar nas duas laterais marcadas
 [125,385,112,151],
 [146,535,34,36],[196,535,34,36],

 // sala - sofá/mesa, sem bloquear faixa inferior e laterais
 [444,307,119,117],
 [453,344,72,50],
 // estante inferior da sala (objeto real)
 [446,446,126,30],

 // hall - estantes laterais, corredor central livre
 [350,486,70,68],[548,486,61,68],
 [315,588,48,42],[576,588,42,42],

 // pátio/piscina/espreguiçadeiras
 [70,630,80,105],[110,690,480,75],
 [365,635,72,58],[505,635,76,58],

 // quarto: camas/malas, corredor horizontal e vertical central livres
 [650,45,80,118],[837,45,73,118],[916,45,48,118],
 [665,200,82,84],[823,199,73,86],[907,199,51,86],
 [748,52,70,68],
 // malas centrais menores
 [700,207,56,69],[800,205,45,74],

 // corredor: bloco preto à direita é parede, mas deixa a passagem desenhada na base
 [838,326,22,115],

 // lounge: sofás encostados nas laterais, miolo vertical livre
 [646,510,45,66],[646,605,45,104],
 [724,515,31,77],[724,615,31,70],

 // confessionário: móveis laterais + câmera/cadeira centrais com circulação ao redor
 [792,505,178,50],
 [800,558,32,170],[940,558,30,170],
 [858,608,46,112]

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
const PASSAGE_FLOORS=[];
// Faixas estreitas de porta. Só dentro delas a parede é ignorada.
const DOOR_LANES=[];



const PLAYER_RADIUS=7;
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
 return r?r.room:"FORA DA CASA"
}

function circleRect(cx,cy,r,bx,by,bw,bh){
 const nx=Math.max(bx,Math.min(cx,bx+bw)),ny=Math.max(by,Math.min(cy,by+bh));
 return (cx-nx)*(cx-nx)+(cy-ny)*(cy-ny)<r*r
}
function staticBlocked(x,y,r=PLAYER_RADIUS){
 return SOLIDS.some(([bx,by,bw,bh])=>circleRect(x,y,r,bx,by,bw,bh))
}

function blockingActor(x,y,r,who){
 for(const p of people){
  if(!p.alive||p===who)continue;
  const minDist=r+(p.human?8:7);
  if(Math.hypot(x-p.x,y-p.y)<minDist)return p
 }
 return null
}
function actorBlocked(x,y,r,who){
 return !!blockingActor(x,y,r,who)
}
function canMove(x,y,who=null){
 return pointInFloors(x,y)&&!staticBlocked(x,y,PLAYER_RADIUS)&&!actorBlocked(x,y,PLAYER_RADIUS,who)
}
function canMoveStatic(x,y,r=PLAYER_RADIUS){
 return pointInFloors(x,y,r)&&!staticBlocked(x,y,r)
}
function tryMovePlayer(nx,ny){
 if(canMove(nx,ny,me)){me.x=nx;me.y=ny;return true}

 if(canMoveStatic(nx,ny,PLAYER_RADIUS)){
  const blocker=blockingActor(nx,ny,PLAYER_RADIUS,me);
  if(blocker&&!blocker.human){
   let dx=blocker.x-me.x,dy=blocker.y-me.y,d=Math.hypot(dx,dy)||1;
   dx/=d;dy/=d;
   const push=4;
   if(canMove(blocker.x+dx*push,blocker.y+dy*push,blocker)){
    blocker.x+=dx*push;blocker.y+=dy*push;
    blocker.path=[];blocker.pathIndex=0;blocker.repathCd=0;
    if(canMove(nx,ny,me)){me.x=nx;me.y=ny;return true}
   }
  }
 }
 return false
}

function roomAt(x,y){
 const r=floorRoom(x,y);
 if(!r.startsWith("PASSAGEM"))return r;
 if(r.includes("COZINHA/SALA"))return x<332?"COZINHA":"SALA";
 if(r.includes("SALA/HALL"))return y<471?"SALA":"HALL";
 if(r.includes("COZINHA/PÁTIO"))return y<620?"COZINHA":"PÁTIO / PISCINA";
 if(r.includes("QUARTO/CORREDOR"))return y<323?"QUARTO":"CORREDOR";
 if(r.includes("CORREDOR/LOUNGE"))return y<487?"CORREDOR":"LOUNGE";
 if(r.includes("LOUNGE/CONFESSIONÁRIO"))return x<786?"LOUNGE":"CONFESSIONÁRIO";
 return r
}

function safePoint(roomName,ignoreActor=null){
 const candidates=FLOOR_RECTS.filter(r=>!roomName||r.room===roomName);
 if(!candidates.length)return [405,286];
 for(let n=0;n<400;n++){
  const r=pick(candidates);
  if(!r)break;
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


function callToConfessional(){
 if(!gameStarted||phase!=="social"||!me||!me.alive||uiBlocking())return;
 confessionCallCd=rnd(65,95);
 addFeed(`📢 Produção chamou ${me.name} ao Confessionário.`);
 modal("📢 CHAMADA DA PRODUÇÃO",`${me.name}, vá ao Confessionário. A câmera está esperando você.`,["IR AGORA"],()=>{
  closeModal();startConfessionalTravel()
 })
}

function startConfessionalTravel(){
 if(!me||!me.alive)return;
 const target=[855,590],route=findPath(me.x,me.y,target[0],target[1],me,9000);
 if(!route.length){toast("CAMINHO BLOQUEADO");autoConfession=null;return}
 autoConfession={target,path:route,index:0};eventName="📢 Indo ao Confessionário";
 toast("📺 INDO AO CONFESSIONÁRIO")
}

function updateConfessionalTravel(dt){
 if(!autoConfession||!me)return false;
 const path=autoConfession.path;
 if(!path||autoConfession.index>=path.length){autoConfession=null;eventName="";setTimeout(()=>confession(),220);return true}
 const wp=path[autoConfession.index],dx=wp[0]-me.x,dy=wp[1]-me.y,d=Math.hypot(dx,dy);
 if(d<5){autoConfession.index++;return true}
 const vx=dx/(d||1),vy=dy/(d||1),step=Math.min(96*dt,d);
 me.facing=Math.abs(vx)>Math.abs(vy)?(vx>0?"right":"left"):(vy>0?"down":"up");me.walkFrame=(me.walkFrame+dt*6)%4;
 const nx=me.x+vx*step,ny=me.y+vy*step;
 if(canMoveStatic(nx,ny,PLAYER_RADIUS)){me.x=nx;me.y=ny}
 else{if(canMoveStatic(nx,me.y,PLAYER_RADIUS))me.x=nx;if(canMoveStatic(me.x,ny,PLAYER_RADIUS))me.y=ny}
 return true
}

function snapshotHomePositions(){
 homePositions=new Map();
 people.filter(p=>p.alive).forEach(p=>homePositions.set(p.name,{x:p.x,y:p.y,facing:p.facing}))
}

function enterChallengeArena(key){
 snapshotHomePositions();challengeArenaKey=key||"reflexo";
 const slots=[[131,520],[247,520],[363,520],[479,520],[595,520],[711,520],[827,520],[943,520]];
 alivePeople().forEach((p,i)=>{
  const s=slots[i%slots.length];p.x=s[0];p.y=s[1];p.tx=p.x;p.ty=p.y;p.facing="up";p.path=[];p.pathIndex=0
 });
 eventName="🏟️ Arena da Prova"
}

function returnHomeFromChallenge(){
 if(homePositions){
  people.filter(p=>p.alive).forEach(p=>{
   const h=homePositions.get(p.name);
   if(h){p.x=h.x;p.y=h.y;p.tx=h.x;p.ty=h.y;p.facing=h.facing||"down";p.path=[];p.pathIndex=0}
  })
 }
 homePositions=null;challengeArenaKey="";eventName="";
 toast("🏠 TODOS DE VOLTA À CASA")
}
function nearestPortal(p){return null}

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
let passageCd=0,confessionCallCd=40,autoConfession=null;
let homePositions=null,challengeArenaKey="";

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

function showNpcDebug(){
 if(!gameStarted||!Array.isArray(people)){
  return modal("🤖 ESTADO DOS NPCs","Entre na casa para inspecionar os NPCs.",["FECHAR"],closeModal)
 }
 const bots=people.filter(p=>p&&!p.human);
 const text=bots.map(p=>{
  const len=Array.isArray(p.path)?p.path.length:0;
  const idx=Number.isInteger(p.pathIndex)?p.pathIndex:0;
  return `${p.name||"NPC"}: ${roomAt(p.x,p.y)} • ${p.activity||"sem atividade"} • rota ${Math.max(0,len-idx)} • x${Math.round(p.x)} y${Math.round(p.y)}`
 }).join("\n");
 modal("🤖 ESTADO DOS NPCs",text||"Nenhum NPC ativo.",["FECHAR"],closeModal)
}
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
document.addEventListener("visibilitychange",()=>{if(document.hidden)for(var k in keys)keys[k]=false});
addEventListener("blur",()=>{for(var k in keys)keys[k]=false});
function navKey(x,y){var step=(Number.isFinite(NAV_STEP)&&NAV_STEP>0)?NAV_STEP:12;return `${Math.round(x/step)},${Math.round(y/step)}`}
function snapNav(v){var step=(Number.isFinite(NAV_STEP)&&NAV_STEP>0)?NAV_STEP:12;return Math.round(v/step)*step}

function navWalkable(x,y){
 // Rotas consideram apenas paredes/móveis. Outros personagens são dinâmicos.
 return pointInFloors(x,y,8)&&!staticBlocked(x,y,8)
}

function findNearestWalkable(x,y){
 const sx=snapNav(x),sy=snapNav(y);
 if(navWalkable(sx,sy))return [sx,sy];
 for(let radius=1;radius<=8;radius++){
  for(let dx=-radius;dx<=radius;dx++){
   for(let dy=-radius;dy<=radius;dy++){
    if(Math.abs(dx)!==radius&&Math.abs(dy)!==radius)continue;
    const nx=sx+dx*NAV_STEP,ny=sy+dy*NAV_STEP;
    if(navWalkable(nx,ny))return [nx,ny]
   }
  }
 }
 return null
}

function findPath(sx,sy,tx,ty,who=null,maxNodes=20000){
 const step=(Number.isFinite(NAV_STEP)&&NAV_STEP>0)?NAV_STEP:6;
 if(![sx,sy,tx,ty].every(Number.isFinite))return [];
 const start=findNearestWalkable(sx,sy),goal=findNearestWalkable(tx,ty);
 if(!start||!goal)return [];
 const sk=navKey(start[0],start[1]),gk=navKey(goal[0],goal[1]);
 if(sk===gk)return [goal];

 const dirs=[[1,0],[-1,0],[0,1],[0,-1],[1,1],[-1,1],[1,-1],[-1,-1]];
 const open=[],index=new Map(),came=new Map(),gScore=new Map([[sk,0]]),coords=new Map([[sk,start]]);
 const heuristic=(x,y)=>Math.hypot(goal[0]-x,goal[1]-y);
 const swap=(a,b)=>{const t=open[a];open[a]=open[b];open[b]=t;index.set(open[a].k,a);index.set(open[b].k,b)};
 const up=i=>{while(i>0){const p=(i-1)>>1;if(open[p].f<=open[i].f)break;swap(i,p);i=p}};
 const down=i=>{for(;;){let l=i*2+1,r=l+1,b=i;if(l<open.length&&open[l].f<open[b].f)b=l;if(r<open.length&&open[r].f<open[b].f)b=r;if(b===i)break;swap(i,b);i=b}};
 const push=node=>{index.set(node.k,open.length);open.push(node);up(open.length-1)};
 const pop=()=>{const root=open[0],last=open.pop();index.delete(root.k);if(open.length){open[0]=last;index.set(last.k,0);down(0)}return root};

 push({k:sk,x:start[0],y:start[1],f:heuristic(start[0],start[1])});
 let visited=0;
 while(open.length&&visited++<Math.max(20000,maxNodes||0)){
   const cur=pop(),ck=cur.k;
   if(ck===gk){
     const path=[];let k=ck;
     while(k&&k!==sk){path.push(coords.get(k));k=came.get(k)}
     path.reverse();return path
   }
   const cg=gScore.get(ck)??Infinity;
   for(const [dx,dy] of dirs){
     const nx=cur.x+dx*step,ny=cur.y+dy*step,nk=navKey(nx,ny);
     if(!navWalkable(nx,ny))continue;
     // Diagonal cannot cut through furniture corners.
     if(dx&&dy&&(!navWalkable(cur.x+dx*step,cur.y)||!navWalkable(cur.x,cur.y+dy*step)))continue;
     const ng=cg+(dx&&dy?1.414:1)*step;
     if(ng>=(gScore.get(nk)??Infinity))continue;
     came.set(nk,ck);coords.set(nk,[nx,ny]);gScore.set(nk,ng);
     const f=ng+heuristic(nx,ny);
     if(index.has(nk)){const i=index.get(nk);open[i].f=f;open[i].x=nx;open[i].y=ny;up(i)}
     else push({k:nk,x:nx,y:ny,f})
   }
 }
 return []
}

function chooseNpcDestination(p){
 const room=roomAt(p.x,p.y);
 const roamRooms=["SALA","COZINHA","HALL","PÁTIO / PISCINA","QUARTO","CORREDOR","LOUNGE"];
 const sameRoom=people.filter(o=>o!==p&&o.alive&&roomAt(o.x,o.y)===room);
 let target;

 if(sameRoom.length&&Math.random()<.35){
  const other=pick(sameRoom),angle=Math.random()*Math.PI*2;
  target=[other.x+Math.cos(angle)*34,other.y+Math.sin(angle)*34];
  p.activity=Math.random()<.5?"conversando":"fofocando";
  p.socialTarget=other.name
 }else{
  target=safePoint(room,p);
  p.activity=pick(["passeando","observando","descansando"])||"observando";
  p.socialTarget=null
 }

 if(Math.random()<.30){
  const rr=pick(roamRooms),rp=safePoint(rr,p);
  if(rp)target=rp
 }
 p.path=findPath(p.x,p.y,target[0],target[1],p,9000);
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
  if(!other)return;
  p.mood=pick(["Conversando","Fofocando","Planejando"])||"Conversando";
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
 behaviorCd:rnd(3,8),activity:"observando",socialTarget:null,stuck:0,lastX:x,lastY:y,avoidCd:0,waitCd:0}
}
function start(){
 if(gameStarted)return;
 gameStarted=true;
 const name=document.querySelector("#name").value.trim()||"Jogador";
 // reset completo para impedir estado parcial caso o usuário tente iniciar novamente
 phase="social";round=1;time=70;confessionCallCd=38;autoConfession=null;homePositions=null;challengeArenaKey="";feed=[];leader="";immune="";eventName="";near=null;doorNear=null;dialogueOpen=false;currentDialogue=null;if(typingTimer){clearInterval(typingTimer);typingTimer=null}document.querySelector("#dialogue").classList.add("hidden");closeModal();
 alliances=[];gossips=[];relationship={};eventCd=18;actionCd=0;roomActionCd=0;challenge=0;
 stats={energy:100,social:50,rep:50,coins:500};
 if(trait==="Social")stats.social=62;
 if(trait==="Competitivo")stats.energy=112;
 if(trait==="Provocador")stats.rep=44;
 if(trait==="Observador")stats.rep=57;

 people=[makePerson(name,405,286,playerColor,true)];
 BOT_NAMES.forEach((n,i)=>{
   const zones=["SALA","COZINHA","HALL","PÁTIO / PISCINA","QUARTO","LOUNGE"];
   const zone=zones[i%zones.length];
   let pos=null;
   for(let tries=0;tries<80;tries++){
    const candidate=safePoint(zone);
    if(people.every(o=>Math.hypot(candidate[0]-o.x,candidate[1]-o.y)>34)){pos=candidate;break}
   }
   pos=pos||safePoint(zone);
   people.push(makePerson(n,pos[0],pos[1],COLORS[i+1]))
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
   const testIssues=[...runSelfTest(),...runRuntimeAudit()];
   if(testIssues.length)addFeed("⚠️ Autoteste: "+testIssues.join(", "));
   else addFeed("✅ Autoteste de mapa, NPCs e runtime concluído.");
 }catch(err){console.warn("Autoteste não bloqueante:",err);addFeed("⚠️ Autoteste ignorado para não bloquear a partida.")}
 if(activeMission)addFeed(`🎯 MISSÃO SECRETA: ${activeMission.text}`);
 toast("CASA EM JOGO • V1.3.4");
 try{startMusic()}catch(err){console.warn("Áudio indisponível:",err)}
 last=performance.now();
 // desenha uma vez imediatamente: personagem aparece mesmo antes do primeiro frame agendado
 try{draw();ui()}catch(err){console.error("Primeiro desenho:",err);showFatalError("Erro ao desenhar a partida",err)}
 if(animationFrameId===null)animationFrameId=requestAnimationFrame(loop)
}

function loop(now){
 animationFrameId=null;
 try{
   let dt=(Number.isFinite(now)&&Number.isFinite(last))?(now-last)/1000:0;
   dt=Math.min(.05,Math.max(0,dt));
   last=Number.isFinite(now)?now:performance.now();
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
function showPowers(){if(!gameStarted)return modal("⚡ PODERES","Entre na casa para usar poderes.",["FECHAR"],closeModal);if(!powers.length)return modal("⚡ PODERES","Você ainda não possui poderes.",["FECHAR"],closeModal);const opts=powers.map(p=>`USAR • ${p}`);modal("⚡ SEUS PODERES","Escolha um poder para ativar.",opts,label=>{const idx=opts.indexOf(label);if(idx<0)return;const p=powers[idx];powers.splice(idx,1);activatePower(p);closeModal()})}
function activatePower(p){if(p==="Voto Duplo"){doubleVoteArmed=true;addFeed("🗳️ Seu próximo voto valerá 2.")}else if(p==="Escudo Secreto"){secretImmune=true;addFeed("🛡️ Você ativou um Escudo Secreto.")}else if(p==="Espião"){const a=alivePeople().filter(x=>x!==me),t=pick(a);if(t)addFeed(`👁️ Poder Espião: ${t.name} está agindo de forma suspeita.`)}else if(p==="Moedas"){stats.coins+=180;addFeed("🪙 Você resgatou 180 moedas.")}}
function showMission(){if(!gameStarted)return modal("🎯 MISSÃO","Entre na casa para receber uma missão.",["FECHAR"],closeModal);if(!activeMission)return modal("🎯 MISSÃO","Nenhuma missão ativa.",["FECHAR"],closeModal);const c=Math.min(activeMission.goal,missionCurrent());modal("🎯 MISSÃO SECRETA",`${activeMission.text}\n\nProgresso: ${c}/${activeMission.goal}\nRecompensa: ${activeMission.reward} moedas\nStatus: ${missionCompleted?"CONCLUÍDA ✅":"EM ANDAMENTO"}`,["FECHAR"],closeModal)}
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
 if(me.alive && autoConfession){updateConfessionalTravel(dt)}else if(me.alive && !uiBlocking()){
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
   tryMovePlayer(nx,me.y);
   const ny=me.y+dy*speed*dt;
   tryMovePlayer(me.x,ny);
 }
 if(!uiBlocking())updateBots(dt);
 near=me?findNear():null;doorNear=me?nearestPortal(me):null;
 if(eventCd<=0 && !uiBlocking() && phase==="social"){randomEvent();eventCd=rnd(19,31)}
 if(phase==="social"&&!uiBlocking()&&!autoConfession){
  confessionCallCd=Math.max(-1,confessionCallCd-dt);
  if(confessionCallCd<=0)callToConfessional()
 }
 if(!uiBlocking()){time-=dt;if(time<=0)startChallenge()}
}
function updateBots(dt){
 people.filter(p=>!p.human&&p.alive).forEach(p=>{
  p.repathCd=Math.max(0,(p.repathCd||0)-dt);
  p.avoidCd=Math.max(0,(p.avoidCd||0)-dt);
  p.waitCd=Math.max(0,(p.waitCd||0)-dt);

  if(p.waitCd>0){
   npcSocialTick(p,dt);
   return
  }

  if(!Array.isArray(p.path))p.path=[];
  if(!Number.isInteger(p.pathIndex)||p.pathIndex<0)p.pathIndex=0;
  if(!p.path||p.pathIndex>=p.path.length||p.repathCd<=0){
   chooseNpcDestination(p)
  }

  let moved=false;

  if(p.path&&p.pathIndex<p.path.length){
   const wp=p.path[p.pathIndex];
   const dx=wp[0]-p.x,dy=wp[1]-p.y,d=Math.hypot(dx,dy);

   if(d<5){
    p.pathIndex++;
    if(p.pathIndex>=p.path.length)p.waitCd=rnd(.4,1.4)
   }else{
    const vx=dx/d,vy=dy/d;
    if(Math.abs(vx)>Math.abs(vy))p.facing=vx>0?"right":"left";
    else p.facing=vy>0?"down":"up";

    const speed=p.activity==="descansando"?27:44;
    const step=Math.min(speed*dt,d);
    const ox=p.x,oy=p.y;
    const nx=p.x+vx*step,ny=p.y+vy*step;

    if(canMove(nx,ny,p)){
     p.x=nx;p.y=ny;moved=true
    }else{
     if(canMove(nx,p.y,p)){p.x=nx;moved=true}
     if(canMove(p.x,ny,p)){p.y=ny;moved=true}

     if(!moved&&p.avoidCd<=0){
      const sideX=-vy,sideY=vx;
      for(const [sx,sy] of [
       [p.x+sideX*9,p.y+sideY*9],
       [p.x-sideX*9,p.y-sideY*9]
      ]){
       if(canMove(sx,sy,p)){p.x=sx;p.y=sy;moved=true;p.avoidCd=.3;break}
      }
     }
    }

    if(moved&&Math.hypot(p.x-ox,p.y-oy)>.04){
     p.walkFrame=(p.walkFrame+dt*5.5)%4
    }
   }
  }

  const displacement=Math.hypot(p.x-(p.lastX??p.x),p.y-(p.lastY??p.y));
  p.stuck=displacement<.05?(p.stuck||0)+dt:0;
  p.lastX=p.x;p.lastY=p.y;

  if(p.stuck>.55&&p.stuck<=1.15){
   p.path=[];p.pathIndex=0;p.repathCd=0
  }

  if(p.stuck>1.15){
   let escaped=false;
   for(const [sx,sy] of [[10,0],[-10,0],[0,10],[0,-10],[8,8],[-8,8],[8,-8],[-8,-8]]){
    if(canMove(p.x+sx,p.y+sy,p)){
     p.x+=sx;p.y+=sy;escaped=true;break
    }
   }
   p.path=[];p.pathIndex=0;p.repathCd=0;p.stuck=0;
   if(!escaped)p.waitCd=.45
  }

  npcSocialTick(p,dt)
 })
}
function findNear(){
 let best=null,bd=55;
 if(!me)return null;
 people.filter(p=>p!==me&&p.alive).forEach(p=>{
   const distance=Math.hypot(me.x-p.x,me.y-p.y);
   if(distance<bd){bd=distance;best=p}
 });
 return best
}

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
 if(!target)return showDialogue(p.name,p.c,"Ainda não tenho um alvo definido.",[["Entendi",closeDialogue]]);
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
 if(!target)return showDialogue(p.name,p.c,"Não tenho uma fofoca boa agora. Depois a gente conversa.",[["Beleza",closeDialogue]]);
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
 choices=Array.isArray(choices)?choices:[];
 text=String(text??"");
 name=String(name??"Participante");
 dialogueOpen=true;
 currentDialogue={name,color,text,choices,typed:false};
 const box=document.querySelector("#dialogue");
 if(!box){dialogueOpen=false;return}
 box.classList.remove("hidden");
 const speaker=document.querySelector("#speaker");if(speaker)speaker.textContent=name;
 const portrait=document.querySelector("#portrait");if(portrait)portrait.style.setProperty("--pc",color||"#57c7ff");
 const key=(name===me?.name?"theo":name.toLowerCase());
 const portraitImg=document.querySelector("#portraitImg");if(portraitImg)portraitImg.src=`assets/portraits/${SPRITES[key]?key:"theo"}.png`;
 const q=document.querySelector("#dialogueChoices");if(q)q.innerHTML="";
 const hint=document.querySelector("#dialogueHint");if(hint)hint.style.display=choices.length?"none":"block";
 typeDialogue(text,()=>finishDialogueTyping())
}

function finishDialogueTyping(){
 if(!currentDialogue)return;
 currentDialogue.typed=true;
 const q=document.querySelector("#dialogueChoices");
 if(!q)return;
 q.innerHTML="";
 if(currentDialogue.choices.length){
  currentDialogue.choices.forEach(([label,fn])=>{
   const b=document.createElement("button");b.textContent=label;b.onclick=fn;q.appendChild(b)
  })
 }
}
function typeDialogue(text,done){
 if(typingTimer)clearInterval(typingTimer);
 text=String(text??"");
 const el=document.querySelector("#dialogueText");
 if(!el){if(done)done();return}
 el.textContent="";
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
 const q=document.querySelector("#dialogueChoices");
 if(!q||q.children.length===0)closeDialogue()
}
function closeDialogue(){
 dialogueOpen=false;currentDialogue=null;
 if(typingTimer){clearInterval(typingTimer);typingTimer=null}
 const d=document.querySelector("#dialogue"),q=document.querySelector("#dialogueChoices");
 if(d)d.classList.add("hidden");
 if(q)q.innerHTML=""
}
function showRelationships(){
 if(!gameStarted||!me)return modal("🤝 RELAÇÕES","Entre na casa para ver suas relações.",["FECHAR"],closeModal);
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
 let e=pick(events);if(!e)return;if(!Array.isArray(gossips))gossips=[];eventName=e[0];addFeed(`${e[0]} ${e[1]}`);toast(e[0]);if(e[0].includes("TELEFONE"))grantPower(pick(["Voto Duplo","Escudo Secreto","Espião","Moedas"]));if(e[0].includes("PODER SECRETO"))grantPower(pick(["Voto Duplo","Espião","Moedas"]));if(Math.random()<.45)gossips.unshift(e[1]);setTimeout(()=>eventName="",5500)
}

function startChallenge(){
 if(phase!=="social")return;
 phase="challenge";challenge=(challenge+1)%5;
 const arenaKeys=["reflexo","memoria","resistencia","cores","caixas"];
 enterChallengeArena(arenaKeys[challenge]||"reflexo");
 if(challenge===0)return reaction();
 if(challenge===1)return memory();
 if(challenge===2)return resistance();
 if(challenge===3)return colors();
 return boxes()
}

function reaction(){let target=Math.floor(rnd(450,900));if(!Number.isFinite(target))target=650;modal("⚡ PROVA DO REFLEXO",`Clique aproximadamente ${target} ms depois do sinal.`,["COMEÇAR"],()=>{let q=document.querySelector("#choices");q.innerHTML="";document.querySelector("#modalText").textContent="Prepare-se...";setTimeout(()=>{let b=document.createElement("button");b.className="choice";b.textContent="🟢 AGORA!";q.appendChild(b);let s=performance.now();b.onclick=()=>resolve(Math.abs(performance.now()-s-target),"Reflexo")},rnd(700,1600))})}
function memory(){let seq=Array.from({length:5},()=>pick(["⭐","❤️","🌙","💎","🍀"]));modal("🧠 PROVA DA MEMÓRIA","Memorize:\n\n"+seq.join("  "),["MEMORIZEI"],()=>{let correct=seq.join("");let opts=[correct,[...seq].reverse().join(""),[...seq].sort(()=>Math.random()-.5).join("")];opts=[...new Set(opts)].sort(()=>Math.random()-.5);modal("🧠 QUAL ERA?", "Escolha a sequência correta.",opts,c=>resolve(c===correct?rnd(20,80):rnd(380,650),"Memória"))})}
function resistance(){let clicks=0,start=performance.now();modal("💪 PROVA DE RESISTÊNCIA","Clique 20 vezes o mais rápido possível.",["COMEÇAR"],()=>{let q=document.querySelector("#choices");q.innerHTML="";let b=document.createElement("button");b.className="choice";b.textContent="CLIQUE! 0/20";q.appendChild(b);start=performance.now();b.onclick=()=>{clicks++;b.textContent=`CLIQUE! ${clicks}/20`;if(clicks>=20)resolve((performance.now()-start)/10,"Resistência")}})}
function colors(){let answer=pick(["VERMELHO","AZUL","VERDE","AMARELO"]);let display=pick(["VERMELHO","AZUL","VERDE","AMARELO"]);modal("🎨 PROVA DAS CORES",`A palavra sorteada é: ${answer}\nEscolha a resposta correta.`,["VERMELHO","AZUL","VERDE","AMARELO"],c=>resolve(c===answer?rnd(20,80):rnd(350,600),"Cores"))}
function boxes(){modal("🎁 PROVA DAS CAIXAS","Escolha uma caixa. Sorte também faz parte do jogo.",["📦 1","📦 2","📦 3","📦 4"],()=>resolve(rnd(0,480),"Caixas"))}
function resolve(score,type){
 closeModal();
 const alive=alivePeople(),safeScore=Number.isFinite(score)?score:9999;
 const scores=alive.filter(p=>p!==me).map(p=>({p,score:rnd(45,450)}));
 if(me&&me.alive)scores.push({p:me,score:safeScore});
 if(!scores.length){returnHomeFromChallenge();return finishRoundSafely()}
 scores.sort((a,b)=>a.score-b.score);
 const winner=scores[0]?.p;
 if(!winner){returnHomeFromChallenge();return finishRoundSafely()}
 leader=winner.name;winner.wins=(winner.wins||0)+1;
 stats.coins+=leader===me?.name?150:25;
 addFeed(`🏆 ${leader} venceu a Prova de ${type}.`);
 toast(`👑 ${leader.toUpperCase()} É O CHEFE`);
 returnHomeFromChallenge();
 setTimeout(()=>selectImmunity(),450)
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
 if(homePositions)returnHomeFromChallenge();
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
 if(!winner)return modal("🏆 FINAL DA TEMPORADA","Não foi possível determinar o vencedor.",["NOVA TEMPORADA"],()=>location.reload());
 if(a.includes(me)){
   const chance=Math.min(.88,.32+(stats.social+stats.rep)/360+me.wins*.03);
   if(Math.random()<chance)winner=me
 }
 if(!seasonSaved){profile.seasons+=1;profile.coins+=Math.round(stats.coins);if(winner===me)profile.wins+=1;saveProfile();seasonSaved=true}modal("🏆 FINAL DA TEMPORADA",`Vencedor: ${winner.name}\n\nFinalistas: ${a.map(p=>p.name).join(", ")}\nSeu perfil: ${trait}\nProvas: ${me.wins}\nAlianças: ${alliances.length?alliances.join(", "):"nenhuma"}\nMoedas: ${Math.round(stats.coins)}`,["NOVA TEMPORADA"],()=>location.reload())
}
function draw(){
 ctx.clearRect(0,0,C.width,C.height);
 if(phase==="challenge"&&challengeArenaKey){
   const arena=ARENA_IMAGES[challengeArenaKey];
   if(arena&&arena.naturalWidth>0)ctx.drawImage(arena,0,0,1024,765);
   else{ctx.fillStyle="#111827";ctx.fillRect(0,0,1024,765)}
 }else if(mapReady && map.naturalWidth>0){
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
 if(phase==="social"&&near){ctx.save();ctx.strokeStyle="#fff";ctx.lineWidth=2;ctx.setLineDash([4,4]);ctx.beginPath();ctx.arc(near.x,near.y,25,0,Math.PI*2);ctx.stroke();ctx.setLineDash([]);ctx.fillStyle="#fff";ctx.font="bold 11px system-ui";ctx.textAlign="center";ctx.fillText("E • conversar",near.x,near.y-34);ctx.restore()}
 if(phase==="social"&&me&&doorNear&&!near){ctx.save();ctx.fillStyle="#07101ddd";ctx.strokeStyle="#52d5ff";ctx.lineWidth=1;ctx.fillRect(me.x-63,me.y-47,126,22);ctx.strokeRect(me.x-63,me.y-47,126,22);ctx.fillStyle="#fff";ctx.font="bold 10px system-ui";ctx.textAlign="center";ctx.fillText("F • usar porta",me.x,me.y-32);ctx.restore()}
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
 PASSAGE_FLOORS.forEach(r=>ctx.fillRect(r.x,r.y,r.w,r.h));
 ctx.globalAlpha=.38;ctx.fillStyle="#ef4444";
 SOLIDS.forEach(([x,y,w,h])=>ctx.fillRect(x,y,w,h));
 ctx.globalAlpha=.9;ctx.fillStyle="#facc15";
 PORTALS.forEach(p=>{ctx.beginPath();ctx.arc(p.ax,p.ay,5,0,Math.PI*2);ctx.fill();ctx.beginPath();ctx.arc(p.bx,p.by,5,0,Math.PI*2);ctx.fill()});
 ctx.restore()
}
function showNpcBubble(p,text){
 if(!p||!C)return;
 const el=document.querySelector("#npcBubble");
 if(!el)return;
 // converte coordenada do canvas em posição aproximada da tela
 const rect=C.getBoundingClientRect();
 const sx=rect.left+(p.x/C.width)*rect.width;
 const sy=rect.top+(p.y/C.height)*rect.height;
 el.textContent=text;el.style.left=Math.min(window.innerWidth-250,sx+15)+"px";el.style.top=Math.max(20,sy-65)+"px";
 el.classList.remove("hidden");
 clearTimeout(el._hide);el._hide=setTimeout(()=>el.classList.add("hidden"),2200)
}

function runRuntimeAudit(){
 const issues=[];
 try{
   if(typeof keys!=="object"||!keys)issues.push("keys inválido");
   if(!Number.isFinite(NAV_STEP)||NAV_STEP<=0)issues.push("NAV_STEP inválido");
   if(!Array.isArray(people))issues.push("people inválido");
   if(typeof findNear!=="function")issues.push("findNear ausente");
   if(typeof findPath!=="function")issues.push("findPath ausente");
   if(typeof updateBots!=="function")issues.push("updateBots ausente");
   if(typeof safePoint!=="function")issues.push("safePoint ausente");
   if(me){
     const result=findNear();
     if(result!==null&&typeof result!=="object")issues.push("findNear retornou valor inválido");
     if(!Number.isFinite(me.x)||!Number.isFinite(me.y))issues.push("posição do jogador inválida")
   }
   people.filter(p=>p&&p.alive).forEach(p=>{
     if(!Number.isFinite(p.x)||!Number.isFinite(p.y))issues.push(`posição inválida: ${p.name||"NPC"}`)
   })
 }catch(err){
   issues.push(`runtime audit: ${err.message||err}`)
 }
 console.log("[Casa em Jogo] runtime audit:",issues.length?issues:"OK");
 return issues
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

 console.log("[Casa em Jogo V1.3.4] autoteste:",issues.length?issues:"OK");
 return issues
}

function normalizeStats(){if(!stats||typeof stats!=="object")stats={energy:100,social:50,rep:50,coins:0};stats.energy=Math.max(0,Math.min(115,Number.isFinite(stats.energy)?stats.energy:0));stats.social=Math.max(0,Math.min(100,Number.isFinite(stats.social)?stats.social:0));stats.rep=Math.max(0,Math.min(100,Number.isFinite(stats.rep)?stats.rep:0));stats.coins=Math.max(0,Number.isFinite(stats.coins)?stats.coins:0)}
function ui(){if(!me)return;normalizeStats();document.querySelector("#energy").textContent=Math.round(stats.energy);document.querySelector("#social").textContent=Math.round(stats.social);document.querySelector("#rep").textContent=Math.round(stats.rep);document.querySelector("#coins").textContent=Math.round(stats.coins);document.querySelector("#roomBadge").textContent=phase==="challenge"?"🏟️ ARENA DA PROVA":roomAt(me.x,me.y)+(collisionDebug?" • DEBUG":"");const mc=activeMission?Math.min(activeMission.goal,missionCurrent()):0;document.querySelector("#missionShort").textContent=activeMission?`${activeMission.text} ${mc}/${activeMission.goal}`:"Sem missão";document.querySelector("#round").textContent=`RODADA ${round} • ${phase==="social"?"CONVIVÊNCIA":phase==="challenge"?"PROVA":"CERIMÔNIA"}`;document.querySelector("#timer").textContent=phase==="social"?`${String(Math.floor(Math.max(0,time)/60)).padStart(2,"0")}:${String(Math.ceil(Math.max(0,time)%60)).padStart(2,"0")}`:"EVENTO";document.querySelector("#event").textContent=eventName||(phase==="social"?"Convivência livre":"Evento em andamento");const night=round%3===0;document.querySelector("#dayLabel").textContent=`DIA ${round} ${night?"🌙":"☀️"}`;document.querySelector("#dayOverlay").style.opacity=night?".23":"0";document.querySelector("#players").innerHTML=people.map(p=>{const rel=relationship&&relationship[p.name],key=p.human?"theo":String(p.name||"npc").toLowerCase(),r=p===me?"Você":(rel?`🤝${rel.trust} 👁${rel.suspicion}`:"");return `<div class="person ${p.alive?"":"dead"}"><img src="assets/portraits/${key}.png"><div><span class="pname">${p.name}</span><span class="pmeta">${p.alive?(p.human?p.mood:`${p.mood} • ${p.activity||"pela casa"}`):"eliminado"}</span></div><span class="relation-mini">${r}</span></div>`}).join("");document.querySelector("#feed").innerHTML=feed.map(f=>`<div class="eventline">${f}</div>`).join("")}
function alivePeople(){return people.filter(p=>p.alive)}
function addFeed(t){
 if(!Array.isArray(feed))feed=[];
 feed.unshift(String(t??""));
 feed=feed.slice(0,11)
}
function modal(title,text,choices=[],cb=null){
 const modalEl=document.querySelector("#modal");
 if(!modalEl)return;
 modalEl.classList.remove("hidden");
 const titleEl=document.querySelector("#modalTitle"),textEl=document.querySelector("#modalText"),q=document.querySelector("#choices");
 if(titleEl)titleEl.textContent=title||"";
 if(textEl)textEl.textContent=text||"";
 if(!q)return;
 q.innerHTML="";
 const list=Array.isArray(choices)?choices:[];
 list.forEach(c=>{
   let b=document.createElement("button");
   b.className="choice";
   b.textContent=String(c);
   b.onclick=()=>{if(typeof cb==="function")cb(c)};
   q.appendChild(b)
 })
}
function closeModal(){
 const modalEl=document.querySelector("#modal");
 if(modalEl)modalEl.classList.add("hidden");
 const choicesEl=document.querySelector("#choices");
 if(choicesEl)choicesEl.innerHTML="";
}

function bubble(t){toast(t)}
function toast(t){
 let el=document.querySelector("#toast");
 if(!el)return;
 el.textContent=String(t??"");
 el.classList.remove("hidden");
 clearTimeout(el._hideTimer);
 el._hideTimer=setTimeout(()=>el.classList.add("hidden"),2200)
}
function toggleMusic(){musicOn=!musicOn;document.querySelector("#musicBtn").textContent=`♫ Música ${musicOn?"ON":"OFF"}`;musicOn?startMusic():stopMusic()}
function startMusic(){if(!musicOn||musicTimer)return;try{audioCtx=audioCtx||new (window.AudioContext||window.webkitAudioContext)()}catch(e){return}let notes=[261.6,329.6,392,523.2,440,349.2,293.7,392],i=0;musicTimer=setInterval(()=>{let o=audioCtx.createOscillator(),g=audioCtx.createGain();o.type="triangle";o.frequency.value=notes[i++%notes.length];g.gain.setValueAtTime(.018,audioCtx.currentTime);g.gain.exponentialRampToValueAtTime(.001,audioCtx.currentTime+.2);o.connect(g);g.connect(audioCtx.destination);o.start();o.stop(audioCtx.currentTime+.21)},300)}
function stopMusic(){if(musicTimer){clearInterval(musicTimer);musicTimer=null}}