// Estados globais que precisam existir antes de qualquer callback/evento.
var keys = Object.create(null);
var NAV_STEP = 4;
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

// V1.4 — sistema espacial reconstruído do zero para o novo mapa 1024×572.

const FLOOR_RECTS=[

 {room:"SALA",x:168,y:22,w:276,h:165},
 {room:"SALA",x:244,y:78,w:184,h:103},
 {room:"PASSAGEM SALA/CORREDOR",x:330,y:168,w:150,h:84},

 {room:"COZINHA",x:465,y:22,w:244,h:278},
 {room:"COZINHA",x:490,y:215,w:162,h:55},
 {room:"PASSAGEM COZINHA/QUARTO",x:642,y:118,w:82,h:102},
 {room:"PASSAGEM SALA/COZINHA",x:438,y:95,w:72,h:148},
 {room:"PASSAGEM COZINHA/CORREDOR",x:438,y:205,w:75,h:105},

 {room:"QUARTO",x:731,y:22,w:267,h:226},
 {room:"QUARTO",x:780,y:145,w:176,h:98},
 {room:"PASSAGEM QUARTO/CORREDOR",x:696,y:106,w:76,h:144},

 {room:"CORREDOR",x:332,y:177,w:150,h:139},
 {room:"CORREDOR",x:424,y:246,w:232,h:72},
 {room:"CORREDOR",x:620,y:238,w:235,h:82},

 {room:"PÁTIO / PISCINA",x:37,y:190,w:299,h:69},
 {room:"PÁTIO / PISCINA",x:37,y:249,w:38,h:126},
 {room:"PÁTIO / PISCINA",x:269,y:249,w:67,h:126},
 {room:"PÁTIO / PISCINA",x:37,y:367,w:299,h:16},
 {room:"PASSAGEM PÁTIO/CORREDOR",x:305,y:223,w:76,h:151},

 {room:"SALA VERDE",x:641,y:276,w:205,h:132},
 {room:"PASSAGEM CORREDOR/SALA VERDE",x:615,y:288,w:72,h:115},

 {room:"FESTA",x:190,y:389,w:666,h:183},
 {room:"FESTA",x:337,y:311,w:296,h:126},
 {room:"PASSAGEM CORREDOR/FESTA",x:338,y:292,w:96,h:119},
 {room:"PASSAGEM SALA VERDE/FESTA",x:617,y:389,w:239,h:87},

 {room:"CONFESSIONÁRIO",x:849,y:389,w:149,h:183},
 {room:"PASSAGEM FESTA/CONFESSIONÁRIO",x:828,y:418,w:72,h:96},
 {room:"CONFESSIONÁRIO",x:892,y:437,w:70,h:82}

];

// Obstáculos desenhados em cima dos elementos visíveis.
// playerRadius é aplicado de forma circular, então não precisa "engordar" os retângulos.
const SOLIDS=[

 // SALA
 [181,31,238,49],
 [181,64,36,89],
 [406,63,28,91],
 
 [173,145,31,30],

 // COZINHA
 [474,62,164,46],
 [638,48,34,79],
 [548,137,80,75],
 
 [690,195,31,72],
 [414,193,40,61],
 [462,219,30,74],

 // QUARTO
 // camas superiores
 [740,53,52,68],
 [802,53,55,68],
 [866,53,57,68],
 [933,54,56,68],
 // camas inferiores só nos cantos; corredor azul inferior totalmente livre
 [740,178,38,55],
 [950,178,38,55],

 // PISCINA / DECK
 [75,260,194,108],
 [42,207,95,54],
 [274,204,48,47],
 [42,282,28,77],

 // SALA VERDE
 // móveis mais compactos, deixando o quadrado azul caminhável
 [700,284,64,32],
 [708,329,58,34],
 [663,357,28,28],

 // FESTA
 [198,428,145,25],
 [204,445,42,111],
 [245,435,82,33],
 [260,475,57,42],
 [214,526,110,38],
 [437,337,33,55],
 [561,337,31,55],
 [471,361,90,34],
 [190,389,151,35],
 [619,421,128,34],
 // divisor direito encurtado para deixar o quadrado azul da entrada livre
 [809,421,18,34],

 // CONFESSIONÁRIO
 // câmera/cadeira com hitbox pequena
 [920,480,24,60]

];

const WALLS=[

];

const WALL_OPENINGS=[

];



// Portais só existem onde o próprio desenho tem cômodos fisicamente separados.
// Bots NÃO usam teleportes aleatórios.
const PORTALS=[

];
const PASSAGE_FLOORS=[];
// Faixas estreitas de porta. Só dentro delas a parede é ignorada.
const DOOR_LANES=[];



const PLAYER_RADIUS=5;
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
 const inOpening=WALL_OPENINGS.some(([ox,oy,ow,oh])=>
   x>=ox-r && x<=ox+ow+r && y>=oy-r && y<=oy+oh+r
 );
 if(!inOpening && WALLS.some(([bx,by,bw,bh])=>circleRect(x,y,r,bx,by,bw,bh)))return true;
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
 if(!me)return false;
 if(canMove(nx,ny,me)){me.x=nx;me.y=ny;return true}

 const dx=nx-me.x,dy=ny-me.y;
 let moved=false;
 if(Math.abs(dx)>.001&&canMove(me.x+dx,me.y,me)){me.x+=dx;moved=true}
 if(Math.abs(dy)>.001&&canMove(me.x,me.y+dy,me)){me.y+=dy;moved=true}
 if(moved)return true;

 if(canMoveStatic(nx,ny,PLAYER_RADIUS)){
  const blocker=blockingActor(nx,ny,PLAYER_RADIUS,me);
  if(blocker&&!blocker.human){
   let bx=blocker.x-me.x,by=blocker.y-me.y,d=Math.hypot(bx,by)||1;
   bx/=d;by/=d;
   if(canMove(blocker.x+bx*2.5,blocker.y+by*2.5,blocker)){
    blocker.x+=bx*2.5;blocker.y+=by*2.5;
    blocker.path=[];blocker.pathIndex=0;blocker.repathCd=0
   }
  }
 }
 return false
}

function roomAt(x,y){
 const r=floorRoom(x,y);
 if(!r.startsWith("PASSAGEM"))return r;
 if(r.includes("SALA/CORREDOR"))return x<405?"SALA":"CORREDOR";
 if(r.includes("COZINHA/CORREDOR"))return x>462?"COZINHA":"CORREDOR";
 if(r.includes("QUARTO/CORREDOR"))return x>728?"QUARTO":"CORREDOR";
 if(r.includes("PÁTIO/CORREDOR"))return x<333?"PÁTIO / PISCINA":"CORREDOR";
 if(r.includes("CORREDOR/SALA VERDE"))return x>640?"SALA VERDE":"CORREDOR";
 if(r.includes("CORREDOR/FESTA"))return y>325?"FESTA":"CORREDOR";
 if(r.includes("SALA VERDE/FESTA"))return y<410?"SALA VERDE":"FESTA";
 if(r.includes("FESTA/CONFESSIONÁRIO"))return x>848?"CONFESSIONÁRIO":"FESTA";
 return r
}

function safePoint(roomName,ignoreActor=null){
 const candidates=FLOOR_RECTS.filter(r=>!roomName||r.room===roomName);
 if(!candidates.length)return [395,270];
 for(let n=0;n<400;n++){
  const r=pick(candidates);
  if(!r)break;
  const x=rnd(r.x+18,r.x+r.w-18),y=rnd(r.y+18,r.y+r.h-18);
  if(pointInFloors(x,y)&&!staticBlocked(x,y,PLAYER_RADIUS)&&!actorBlocked(x,y,PLAYER_RADIUS,ignoreActor))return [x,y]
 }
 // deterministic fallbacks for every room, all chosen on visible floor.
 const fallback={
  "SALA":[360,176],
  "COZINHA":[490,125],
  "QUARTO":[850,190],
  "CORREDOR":[395,270],
  "PÁTIO / PISCINA":[300,340],
  "SALA VERDE":[805,330],
  "FESTA":[600,520],
  "CONFESSIONÁRIO":[906,458]
 };
 return fallback[roomName]||[395,270]
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
 const target=[906,458],route=findPath(me.x,me.y,target[0],target[1],me,9000);
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
 const slots=[[105,500],[220,500],[335,500],[450,500],[565,500],[680,500],[795,500],[910,500]];
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
 const roamRooms=["SALA","COZINHA","PÁTIO / PISCINA","QUARTO","CORREDOR","SALA VERDE","FESTA"];
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
 phase="social";round=1;time=70;roomVisitHistory=new Set();roomStayTime=0;confessionCallCd=38;autoConfession=null;homePositions=null;challengeArenaKey="";feed=[];leader="";immune="";eventName="";near=null;doorNear=null;dialogueOpen=false;currentDialogue=null;if(typingTimer){clearInterval(typingTimer);typingTimer=null}document.querySelector("#dialogue").classList.add("hidden");closeModal();
 alliances=[];gossips=[];relationship={};eventCd=18;actionCd=0;roomActionCd=0;challenge=0;
 stats={energy:100,social:50,rep:50,coins:500};
 if(trait==="Social")stats.social=62;
 if(trait==="Competitivo")stats.energy=112;
 if(trait==="Provocador")stats.rep=44;
 if(trait==="Observador")stats.rep=57;

 people=[makePerson(name,395,270,playerColor,true)];
 BOT_NAMES.forEach((n,i)=>{
   const zones=["SALA","COZINHA","PÁTIO / PISCINA","QUARTO","SALA VERDE","FESTA","CORREDOR"];
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
 toast("CASA EM JOGO • V1.7.1");
 try{startMusic()}catch(err){console.warn("Áudio indisponível:",err)}
 last=performance.now();
 // desenha uma vez imediatamente: personagem aparece mesmo antes do primeiro frame agendado
 try{draw();ui()}catch(err){console.error("Primeiro desenho:",err);showFatalError("Erro ao desenhar a partida",err)}
 if(animationFrameId===null)animationFrameId=requestAnimationFrame(loop)

 setTimeout(()=>startWeekFlow(),900);
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
 updateWeekFlow(dt);
 if(typeof LIVING!=="undefined")livingTick(dt);
 if(typeof REALITY!=="undefined")realityTick(dt);

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

   "SALA":()=>{stats.social=Math.min(100,stats.social+6);addFeed("🛋️ Você socializou na sala. +6 Social");bubble("+6 Social")},
   "QUARTO":()=>{stats.energy=Math.min(115,stats.energy+28);addFeed("🛏️ Você descansou no quarto. +28 energia");bubble("+28 energia")},
   "SALA VERDE":()=>{stats.rep=Math.min(100,stats.rep+5);stats.social=Math.min(100,stats.social+4);addFeed("🗣️ Você participou de uma roda de conversa. +5 reputação • +4 Social");bubble("Roda de conversa")},
   "FESTA":()=>{stats.social=Math.min(100,stats.social+8);stats.energy=Math.max(0,stats.energy-3);addFeed("🎉 Você curtiu a pista. +8 Social • -3 energia");bubble("Dançando! 🎵")},
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
 const alive=alivePeople();
 if(!alive.length)return;

 const a=pick(alive), b=pick(alive.filter(p=>p!==a));
 const events=[
  ()=>a&&addFeed(`📞 TELEFONE: ${a.name} atendeu e ganhou informação privilegiada.`),
  ()=>a&&b&&addFeed(`👀 CLIMÃO: ${a.name} evitou ${b.name} depois de uma conversa estranha.`),
  ()=>a&&addFeed(`💌 CORREIO ANÔNIMO: uma mensagem citando ${a.name} apareceu na sala.`),
  ()=>a&&b&&addFeed(`🔥 TRETA: ${a.name} e ${b.name} trocaram farpas pela casa.`),
  ()=>a&&addFeed(`🎯 MIRA: ${a.name} virou assunto como possível alvo da semana.`),
  ()=>a&&b&&addFeed(`🤝 APROXIMAÇÃO: ${a.name} e ${b.name} passaram bastante tempo juntos.`)
 ];
 const event=pick(events);
 if(event)event();
 eventName="📺 MOVIMENTO NA CASA";
 setTimeout(()=>eventName="",8000)
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
   if(arena&&arena.naturalWidth>0)ctx.drawImage(arena,0,0,C.width,C.height);
   else{ctx.fillStyle="#111827";ctx.fillRect(0,0,C.width,C.height)}
 }else if(mapReady && map.naturalWidth>0){
   ctx.drawImage(map,0,0,C.width,C.height)
 }else{
   ctx.fillStyle="#101827";ctx.fillRect(0,0,C.width,C.height);
   ctx.fillStyle="#fff";ctx.font="bold 28px system-ui";ctx.textAlign="center";
   ctx.fillText("CARREGANDO CENÁRIO...",C.width/2,C.height/2-10);
   ctx.font="14px system-ui";ctx.fillStyle="#9fb3c9";
   ctx.fillText(mapFailed?"Falha ao carregar o mapa.":"Aguarde alguns instantes.",C.width/2,C.height/2+23);
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

 if(typeof LIVING!=="undefined"){
   const mood=livingMood(p);
   const thought=livingRecentThought(p);

   // Humor pequeno, acima da cabeça, sem fundo.
   ctx.save();
   ctx.textAlign="center";
   ctx.textBaseline="middle";
   ctx.font="14px 'Segoe UI Emoji','Apple Color Emoji',system-ui";
   ctx.globalAlpha=.94;
   ctx.fillText(mood,p.x,p.y-58);

   // Pensamento fica acima do emoji, com cápsula clara e discreta.
   if(thought && !p.human){
     const short=thought.length>28?thought.slice(0,27)+"…":thought;
     ctx.font="9px system-ui";
     const tw=Math.min(146,ctx.measureText(short).width+14);
     const tx=p.x-tw/2,ty=p.y-84;

     ctx.globalAlpha=.88;
     ctx.fillStyle="rgba(255,255,255,.94)";
     if(ctx.roundRect){
       ctx.beginPath();ctx.roundRect(tx,ty,tw,18,7);ctx.fill()
     }else ctx.fillRect(tx,ty,tw,18);

     ctx.globalAlpha=1;
     ctx.fillStyle="#172033";
     ctx.fillText(short,p.x,ty+9);
   }

   // Atividade curtinha abaixo do nome/sprite, só quando relevante.
   const action=livingActionFor(p);
   if(action && !p.human && action!=="observando" && action!=="passeando"){
     const label=action.length>20?action.slice(0,19)+"…":action;
     ctx.font="8px system-ui";
     ctx.globalAlpha=.78;
     ctx.fillStyle="rgba(8,12,22,.72)";
     const aw=Math.min(112,ctx.measureText(label).width+12);
     const ax=p.x-aw/2,ay=p.y+28;
     if(ctx.roundRect){
       ctx.beginPath();ctx.roundRect(ax,ay,aw,15,6);ctx.fill()
     }else ctx.fillRect(ax,ay,aw,15);
     ctx.globalAlpha=1;ctx.fillStyle="#eef4ff";
     ctx.fillText(label,p.x,ay+7.5);
   }
   ctx.restore()
 }
}
function toggleCollisionDebug(){
 collisionDebug=!collisionDebug;
 const b=document.querySelector("#collisionBtn");
 b.classList.toggle("active",collisionDebug);
 toast(collisionDebug?"🧱 COLISÕES VISÍVEIS":"🧱 COLISÕES OCULTAS")
}
function drawCollisionDebug(){
 ctx.save();
 ctx.globalAlpha=.18;ctx.fillStyle="#22c55e";
 FLOOR_RECTS.forEach(r=>ctx.fillRect(r.x,r.y,r.w,r.h));
 ctx.globalAlpha=.42;ctx.fillStyle="#facc15";
 SOLIDS.forEach(([x,y,w,h])=>ctx.fillRect(x,y,w,h));
 ctx.globalAlpha=.95;ctx.strokeStyle="#fff";ctx.lineWidth=1;
 if(me){ctx.beginPath();ctx.arc(me.x,me.y,PLAYER_RADIUS,0,Math.PI*2);ctx.stroke()}
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

 console.log("[Casa em Jogo V1.7.1] autoteste:",issues.length?issues:"OK");
 return issues
}

function normalizeStats(){if(!stats||typeof stats!=="object")stats={energy:100,social:50,rep:50,coins:0};stats.energy=Math.max(0,Math.min(115,Number.isFinite(stats.energy)?stats.energy:0));stats.social=Math.max(0,Math.min(100,Number.isFinite(stats.social)?stats.social:0));stats.rep=Math.max(0,Math.min(100,Number.isFinite(stats.rep)?stats.rep:0));stats.coins=Math.max(0,Number.isFinite(stats.coins)?stats.coins:0)}

function roomContextHint(){
 if(!me||phase!=="social"||roomStayTime<11)return "";
 const hints={
  "COZINHA":"🍳 Cozinha: bom lugar para conversar.",
  "SALA":"🛋️ Sala: observe alianças e movimentações.",
  "QUARTO":"🛏️ Quarto: grupos costumam se reunir aqui.",
  "SALA VERDE":"💬 Sala verde: ótimo lugar para alianças.",
  "FESTA":"🎉 Festa: dance, socialize e observe o jogo.",
  "PÁTIO / PISCINA":"🏊 Pátio: festas e eventos acontecem aqui.",
  "CONFESSIONÁRIO":"📺 Confessionário: aguarde a Produção chamar."
 };
 return hints[roomAt(me.x,me.y)]||""
}
function ui(){if(!me)return;normalizeStats();document.querySelector("#energy").textContent=Math.round(stats.energy);document.querySelector("#social").textContent=Math.round(stats.social);document.querySelector("#rep").textContent=Math.round(stats.rep);document.querySelector("#coins").textContent=Math.round(stats.coins);document.querySelector("#roomBadge").textContent=phase==="challenge"?"🏟️ ARENA DA PROVA":roomAt(me.x,me.y)+(collisionDebug?" • DEBUG":"");const mc=activeMission?Math.min(activeMission.goal,missionCurrent()):0;document.querySelector("#missionShort").textContent=activeMission?`${activeMission.text} ${mc}/${activeMission.goal}`:"Sem missão";document.querySelector("#round").textContent=`RODADA ${round} • ${phase==="social"?"CONVIVÊNCIA":phase==="challenge"?"PROVA":"CERIMÔNIA"}`;document.querySelector("#timer").textContent=phase==="social"?`${String(Math.floor(Math.max(0,time)/60)).padStart(2,"0")}:${String(Math.ceil(Math.max(0,time)%60)).padStart(2,"0")}`:"EVENTO";document.querySelector("#event").textContent=eventName||(phase==="social"?"Convivência livre":"Evento em andamento");const night=round%3===0;document.querySelector("#dayLabel").textContent=`DIA ${round} ${night?"🌙":"☀️"}`;document.querySelector("#dayOverlay").style.opacity=night?".23":"0";document.querySelector("#players").innerHTML=people.map(p=>{const rel=relationship&&relationship[p.name],key=p.human?"theo":String(p.name||"npc").toLowerCase(),r=p===me?"Você":(rel?`🤝${rel.trust} 👁${rel.suspicion}`:"");return `<div class="person ${p.alive?"":"dead"}"><img src="assets/portraits/${key}.png"><div><span class="pname">${p.name}</span><span class="pmeta">${p.alive?(p.human?p.mood:`${p.mood} • ${p.activity||"pela casa"}`):"eliminado"}</span></div><span class="relation-mini">${r}</span></div>`}).join("");document.querySelector("#feed").innerHTML=feed.map(f=>`<div class="eventline">${f}</div>`).join("")
 const board=document.querySelector("#eventBoardCurrent");
 const phaseEl=document.querySelector("#eventBoardPhase");
 if(board){
   const latest=(REALITY.history&&REALITY.history[0])||WEEKFLOW.lastEventText||"A casa está em convivência.";
   board.textContent=latest;
 }
 if(phaseEl)phaseEl.textContent=weekFlowStatusText();

 const bTitle=document.querySelector("#broadcastTitle");
 const bClock=document.querySelector("#broadcastClock");
 if(bTitle)bTitle.textContent=(REALITY.phase||"CONVIVÊNCIA").toUpperCase();
 if(bClock)bClock.textContent=weekFlowStatusText();

 const dock=document.querySelector("#interactionDock");
 const iName=document.querySelector("#interactionName");
 const iMeta=document.querySelector("#interactionMeta");
 if(dock){
   if(near&&near.alive){
     dock.classList.remove("hidden");
     if(iName)iName.textContent=near.name;
     if(iMeta){
       const rel=relationship?.[near.name];
       const mood=typeof livingMood==="function"?livingMood(near):"";
       iMeta.textContent=`${mood} ${near.activity||"pela casa"}${rel?` • confiança ${rel.trust}`:""}`;
     }
   }else{
     dock.classList.add("hidden")
   }
 }
}
function alivePeople(){return people.filter(p=>p.alive)}
function addFeed(t){
 if(!Array.isArray(feed))feed=[];
 feed.unshift(String(t??""));
 feed=feed.slice(0,24)
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

// ============================================================
// CASA EM JOGO V1.5 — REALITY UPDATE
// ============================================================


// ============================================================
// V1.7 — SHOWTIME CYCLE
// ============================================================
const SHOWTIME={
 strategyTime:0,
 ceremonyNominee:null,
 houseNominee:null,
 publicNominees:[],
 lastEviction:null
};

function showtimeAlive(){
 return typeof alivePeople==="function"?alivePeople():people.filter(p=>p.alive)
}

function showtimeThreatScore(p){
 if(!p)return 0;
 let score=(p.wins||0)*14;
 if(REALITY.leader===p)score+=16;
 if(REALITY.lastWinner===p)score+=8;
 score+=Math.max(0,Number(p.rep||0)-50)*.2;
 score+=Math.random()*18;
 return score
}

function showtimeLeaderTarget(){
 const alive=showtimeAlive();
 const leaderP=REALITY.leader;
 const options=alive.filter(p=>p!==leaderP&&!REALITY.immune.has(realityPersonKey(p)));
 if(!options.length)return null;

 if(leaderP?.human)return null;

 return options.map(p=>{
   const dislike=leaderP?-realityRel(leaderP,p):0;
   return [p,dislike+showtimeThreatScore(p)]
 }).sort((a,b)=>b[1]-a[1])[0][0]
}

function showtimeChooseLeaderNominee(done){
 const alive=showtimeAlive();
 const leaderP=REALITY.leader;
 const options=alive.filter(p=>p!==leaderP&&!REALITY.immune.has(realityPersonKey(p)));

 if(!options.length)return done(null);

 if(leaderP?.human){
   modal("👑 INDICAÇÃO DO LÍDER",
     "Você é o Líder. Escolha uma pessoa para indicar diretamente ao Paredão.",
     options.map(p=>p.name),
     name=>{
       const p=options.find(x=>x.name===name);
       closeModal();
       done(p||options[0])
     })
 }else{
   const target=showtimeLeaderTarget()||pick(options);
   eventLog(`👑 ${leaderP?.name||"O Líder"} indicou ${target.name} ao Paredão.`,10);
   done(target)
 }
}

function showtimeHouseVote(playerVoteName=null){
 const alive=showtimeAlive();
 const tally=new Map();
 const leaderNom=SHOWTIME.ceremonyNominee;

 alive.forEach(voter=>{
   let target=null;

   if(voter===me && playerVoteName){
     target=alive.find(p=>p.name===playerVoteName)
   }else{
     const options=alive.filter(p=>
       p!==voter &&
       p!==leaderNom &&
       p!==REALITY.leader &&
       !REALITY.immune.has(realityPersonKey(p))
     );
     if(options.length){
       target=options.map(p=>{
         const dislike=-realityRel(voter,p);
         const threat=showtimeThreatScore(p);
         return [p,dislike+threat+Math.random()*24]
       }).sort((a,b)=>b[1]-a[1])[0][0]
     }
   }

   if(target){
     tally.set(target,(tally.get(target)||0)+1);
     realityRemember(voter,`Votei em ${target.name} na formação do Paredão.`)
   }
 });

 const ranked=[...tally.entries()].sort((a,b)=>b[1]-a[1]);
 SHOWTIME.houseNominee=ranked[0]?.[0]||null;

 if(ranked.length){
   const line=ranked.slice(0,4).map(([p,n])=>`${p.name}: ${n}`).join(" • ");
   eventLog(`🗳️ VOTAÇÃO DA CASA — ${line}`,11)
 }

 return SHOWTIME.houseNominee
}

function showtimePublicVote(nominees){
 const unique=[...new Set(nominees.filter(Boolean))];
 if(unique.length<2){
   const extra=showtimeAlive().find(p=>!unique.includes(p)&&p!==REALITY.leader);
   if(extra)unique.push(extra)
 }
 if(unique.length<2)return;

 const scored=unique.map(p=>{
   // público pune ameaça, baixa reputação e conflito; inclui ruído.
   const threat=showtimeThreatScore(p);
   const playerRep=p===me?stats.rep:50+realityRel(p,me)*.15;
   const dislike=Math.max(0,55-playerRep);
   return {p,raw:35+threat+dislike+Math.random()*35}
 });
 const total=scored.reduce((a,x)=>a+x.raw,0)||1;
 const percentages=scored.map(x=>({p:x.p,pct:x.raw/total*100})).sort((a,b)=>b.pct-a.pct);

 const out=percentages[0];
 SHOWTIME.publicNominees=percentages;
 SHOWTIME.lastEviction=out.p;

 const lines=percentages.map(x=>`${x.p.name} — ${x.pct.toFixed(1)}%`).join("\n");

 modal("🚪 RESULTADO DO PAREDÃO",
   `${lines}\n\n${out.p.name} recebeu a maior rejeição e está eliminado.`,
   ["CONTINUAR"],()=>{
     closeModal();
     showtimeEliminate(out.p,percentages)
   })
}

function showtimeEliminate(p,percentages){
 if(!p||!p.alive)return showtimeStartNextDay();

 p.alive=false;
 livingSetMood?.(p,"😢");
 realityHistory(`🚪 ${p.name} foi eliminado com ${percentages[0].pct.toFixed(1)}%.`);
 eventLog(`🚪 ${p.name} deixou a Casa em Jogo.`,12);

 showtimeAlive().forEach(other=>{
   if(other===p)return;
   const rel=realityRel(other,p);
   if(rel>35){
     livingSetMood?.(other,"😢",`${p.name} foi eliminado.`);
     livingThought?.(other,`Perdi ${p.name} no jogo...`)
   }else if(rel<-25){
     livingSetMood?.(other,"😌");
     livingThought?.(other,`${p.name} sair muda meu jogo.`)
   }
 });

 if(p===me){
   WEEKFLOW.phase="eliminated";
   return modal("VOCÊ FOI ELIMINADO",
     `Sua temporada terminou no Dia ${REALITY.day}.\n\nVocê ainda pode iniciar uma nova temporada.`,
     ["NOVA TEMPORADA"],()=>location.reload())
 }

 if(showtimeAlive().length<=3){
   return typeof final==="function"?final():null
 }

 setTimeout(showtimeStartNextDay,8000)
}

function showtimeStartNextDay(){
 REALITY.day++;
 round++;
 phase="social";
 leader="";
 immune="";
 REALITY.leader=null;
 REALITY.angel=null;
 REALITY.immune.clear();
 REALITY.partyActive=false;
 REALITY.partyPending=false;

 WEEKFLOW.phase="convivencia";
 WEEKFLOW.socialTime=70;
 WEEKFLOW.announceTime=8;
 WEEKFLOW.challengeType="lider";
 SHOWTIME.strategyTime=0;
 SHOWTIME.ceremonyNominee=null;
 SHOWTIME.houseNominee=null;

 REALITY.phase="Convivência";
 realityMiniObjective();
 realityHistory(`🌅 Começou o Dia ${REALITY.day}.`);
 eventLog(`🌅 DIA ${REALITY.day}: nova convivência. A próxima Prova do Líder será em 70 segundos.`,10)
}

function showtimeBeginStrategy(){
 WEEKFLOW.phase="strategy";
 SHOWTIME.strategyTime=42;
 REALITY.phase="Estratégia";
 eventLog("🧠 ESTRATÉGIA: 42 segundos para conversar antes da formação do Paredão.",10);
 realityShowGossip()
}

function showtimeBeginCeremony(){
 if(WEEKFLOW.phase==="ceremony")return;
 WEEKFLOW.phase="ceremony";
 REALITY.phase="Formação do Paredão";
 eventLog("🚨 FORMAÇÃO DO PAREDÃO começou.",12);

 showtimeChooseLeaderNominee(nominee=>{
   SHOWTIME.ceremonyNominee=nominee;
   if(nominee)realityHistory(`👑 ${nominee.name} foi indicado pelo Líder.`);

   const options=showtimeAlive().filter(p=>
     p!==me &&
     p!==nominee &&
     p!==REALITY.leader &&
     !REALITY.immune.has(realityPersonKey(p))
   );

   if(!me?.alive){
     const house=showtimeHouseVote();
     return showtimePublicVote([nominee,house])
   }

   if(!options.length){
     const house=showtimeHouseVote();
     return showtimePublicVote([nominee,house])
   }

   modal("🗳️ SEU VOTO",
     `O Líder indicou ${nominee?.name||"um participante"}.\n\nAgora escolha seu voto da casa.`,
     options.map(p=>p.name),
     name=>{
       closeModal();
       const house=showtimeHouseVote(name);
       if(house)realityHistory(`🗳️ ${house.name} recebeu mais votos da casa.`);
       setTimeout(()=>showtimePublicVote([nominee,house]),1800)
     })
 })
}

const WEEKFLOW={
 started:false,
 phase:"convivencia",
 socialTime:55,
 announceTime:8,
 challengeType:"lider",
 awaitingPlayer:false,
 playerResult:null,
 npcResults:null,
 eventHold:0,
 lastEventText:""
};

function eventLog(text,hold=7){
 WEEKFLOW.lastEventText=text;
 WEEKFLOW.eventHold=Math.max(WEEKFLOW.eventHold,hold);
 addFeed(text);
 if(typeof toast==="function")toast(text);
}

function startWeekFlow(){
 if(WEEKFLOW.started)return;
 WEEKFLOW.started=true;
 WEEKFLOW.phase="convivencia";
 WEEKFLOW.socialTime=55;
 WEEKFLOW.announceTime=8;
 REALITY.phase="Convivência";
 realityHistory("A temporada começou. A casa terá um período de convivência antes da primeira prova.");
 realityMiniObjective();
 eventLog("🏠 CONVIVÊNCIA: explore a casa, converse e observe os participantes.",10);
}

function beginChallengeAnnouncement(type="lider"){
 WEEKFLOW.phase="announcement";
 WEEKFLOW.challengeType=type;
 WEEKFLOW.announceTime=8;
 REALITY.phase=type==="lider"?"Anúncio da Prova do Líder":"Anúncio da Prova do Anjo";
 eventLog(`📢 PRODUÇÃO: em 8 segundos começa a Prova do ${type==="lider"?"Líder":"Anjo"}.`,10);
}

function beginInteractiveChallenge(type="lider"){
 WEEKFLOW.phase="challenge";
 WEEKFLOW.awaitingPlayer=true;
 WEEKFLOW.playerResult=null;
 WEEKFLOW.npcResults=null;
 REALITY.phase=type==="lider"?"Prova do Líder":"Prova do Anjo";

 const pool=realityAlive();
 const npcScores=pool.filter(p=>!p.human).map(p=>({
   p,
   score:realityChallengeScore(p,type)
 })).sort((a,b)=>b.score-a.score);
 WEEKFLOW.npcResults=npcScores;

 const title=type==="lider"?"👑 PROVA DO LÍDER":"😇 PROVA DO ANJO";
 const intro=type==="lider"
   ?"Você também participa. Clique quando achar que o medidor está o mais próximo possível de 100."
   :"Você também participa. Clique no melhor momento para tentar superar os outros.";

 modal(title,
   `${intro}\n\nOs outros participantes também estão competindo agora — o vencedor só será definido depois da sua tentativa.`,
   ["COMEÇAR MINHA TENTATIVA"],()=>{
      closeModal();
      launchPlayerChallenge(type)
   })
}

function launchPlayerChallenge(type){
 const startedAt=performance.now();
 const ideal=1000+rnd(900,2200);
 let finished=false;

 const finish=()=>{
   if(finished)return;
   finished=true;
   const elapsed=performance.now()-startedAt;
   const error=Math.abs(elapsed-ideal);
   const playerScore=Math.max(0,118-(error/18)+rnd(-4,4));
   resolveInteractiveChallenge(type,playerScore,error)
 };

 modal(type==="lider"?"⏱️ TESTE DE TEMPO":"✨ TESTE DE PRECISÃO",
   `Clique em PARAR no momento certo.\n\nQuanto mais perto do tempo secreto, maior sua pontuação.\n\nSua tentativa está valendo...`,
   ["PARAR"],finish);

 // não resolve sozinho rápido: dá até 8s para o player agir
 setTimeout(()=>{
   if(!finished){
     const elapsed=performance.now()-startedAt;
     const error=Math.abs(elapsed-ideal)+450;
     const playerScore=Math.max(0,90-(error/22));
     finished=true;
     closeModal();
     resolveInteractiveChallenge(type,playerScore,error)
   }
 },8000)
}

function resolveInteractiveChallenge(type,playerScore,error){
 closeModal();
 WEEKFLOW.awaitingPlayer=false;

 const player=me;
 const results=[...(WEEKFLOW.npcResults||[])];
 if(player&&player.alive)results.push({p:player,score:playerScore});
 results.sort((a,b)=>b.score-a.score);

 REALITY.lastChallengeRanking=results.map(x=>({name:x.p.name,score:Math.round(x.score)}));
 const winner=results[0]?.p;
 if(!winner)return;

 if(type==="lider")realitySetLeader(winner);
 else realitySetAngel(winner);

 const yourIndex=results.findIndex(x=>x.p===player);
 const yourPos=yourIndex>=0?yourIndex+1:results.length;
 eventLog(`🏁 Você ficou em ${yourPos}º na Prova do ${type==="lider"?"Líder":"Anjo"} com ${Math.round(playerScore)} pontos.`,10);

 WEEKFLOW.phase="postChallenge";
 setTimeout(()=>{
   if(type==="lider"){
     // pausa real antes do Anjo
     WEEKFLOW.phase="convivenciaAnjo";
     REALITY.phase="Intervalo";
     eventLog("☕ Intervalo de 12 segundos antes da Prova do Anjo.",9);
     setTimeout(()=>beginChallengeAnnouncement("anjo"),12000)
   }else{
     if(REALITY.partyPending){
       WEEKFLOW.phase="party";
       realityStartParty()
     }else{
       showtimeBeginStrategy()
     }
   }
 },8500)
}

function updateWeekFlow(dt){
 if(!WEEKFLOW.started||!gameStarted)return;

 if(WEEKFLOW.eventHold>0){
   WEEKFLOW.eventHold=Math.max(0,WEEKFLOW.eventHold-dt)
 }

 if(WEEKFLOW.phase==="convivencia"){
   WEEKFLOW.socialTime=Math.max(0,WEEKFLOW.socialTime-dt);
   if(WEEKFLOW.socialTime<=0)beginChallengeAnnouncement("lider")
   return
 }

 if(WEEKFLOW.phase==="announcement"){
   WEEKFLOW.announceTime=Math.max(0,WEEKFLOW.announceTime-dt);
   if(WEEKFLOW.announceTime<=0)beginInteractiveChallenge(WEEKFLOW.challengeType)
   return
 }

 if(WEEKFLOW.phase==="party"){
   // realityStartParty encerra a flag automaticamente.
   if(!REALITY.partyActive && !REALITY.partyPending){
     showtimeBeginStrategy()
   }
   return
 }

 if(WEEKFLOW.phase==="strategy"){
   SHOWTIME.strategyTime=Math.max(0,SHOWTIME.strategyTime-dt);
   if(SHOWTIME.strategyTime<=0)showtimeBeginCeremony()
 }
}

function weekFlowStatusText(){
 if(!WEEKFLOW.started)return "";
 if(WEEKFLOW.phase==="convivencia")return `🏠 Convivência • Líder em ${Math.ceil(WEEKFLOW.socialTime)}s`;
 if(WEEKFLOW.phase==="announcement")return `📢 ${WEEKFLOW.challengeType==="lider"?"Líder":"Anjo"} em ${Math.ceil(WEEKFLOW.announceTime)}s`;
 if(WEEKFLOW.phase==="challenge")return `🏆 Prova do ${WEEKFLOW.challengeType==="lider"?"Líder":"Anjo"} em andamento`;
 if(WEEKFLOW.phase==="convivenciaAnjo")return "☕ Intervalo antes do Anjo";
 if(WEEKFLOW.phase==="party")return "🎉 Festa em andamento";
 if(WEEKFLOW.phase==="strategy")return `🧠 Estratégia • Paredão em ${Math.ceil(SHOWTIME.strategyTime)}s`;
 if(WEEKFLOW.phase==="ceremony")return "🚨 Formação do Paredão";
 if(WEEKFLOW.phase==="eliminated")return "🚪 Eliminado";
 return REALITY.phase||""
}


const REALITY={
 day:1,
 phase:"Convivência",
 leader:null,
 angel:null,
 immune:new Set(),
 partyPending:false,
 partyActive:false,
 confessionQueue:[],
 confessionBusy:false,
 history:[],
 lastWinner:null,
 relationships:new Map(),
 alliances:[],
 memories:new Map(),
 gossipLog:[]
};

function realityPersonKey(p){return p?.name||"Participante"}
function realityAlive(){return people.filter(p=>p.alive!==false&&!p.eliminated)}
function realityNPCs(){return realityAlive().filter(p=>!p.human)}

function realityRel(a,b){
 const k=[realityPersonKey(a),realityPersonKey(b)].sort().join("::");
 if(!REALITY.relationships.has(k))REALITY.relationships.set(k,Math.floor(Math.random()*31)-5);
 return REALITY.relationships.get(k)
}
function realityChangeRel(a,b,n){
 const k=[realityPersonKey(a),realityPersonKey(b)].sort().join("::");
 REALITY.relationships.set(k,Math.max(-100,Math.min(100,realityRel(a,b)+n)))
}
function realityRemember(p,text){
 const k=realityPersonKey(p);
 if(!REALITY.memories.has(k))REALITY.memories.set(k,[]);
 const m=REALITY.memories.get(k);m.unshift(text);if(m.length>8)m.pop()
}
function realityHistory(text){
 REALITY.history.unshift(`Dia ${REALITY.day} — ${text}`);
 if(REALITY.history.length>40)REALITY.history.pop();
 addFeed("📺 "+text)
}

function realityTrait(p){
 const s=((p.personality||p.trait||"").toLowerCase());
 if(s.includes("compet"))return "competitivo";
 if(s.includes("estrat"))return "estrategista";
 if(s.includes("social")||s.includes("carism"))return "social";
 return ["social","estrategista","competitivo","imprevisível"][Math.abs(realityPersonKey(p).split("").reduce((a,c)=>a+c.charCodeAt(0),0))%4]
}
function realityChallengeScore(p,type="lider"){
 let score=Math.random()*100;
 const t=realityTrait(p);

 if(t==="competitivo")score+=type==="lider"?20:12;
 if(t==="estrategista")score+=type==="anjo"?17:7;
 if(t==="social")score+=5;

 // O player não recebe nenhum bônus por ser controlado.
 // NPCs recebem leve variabilidade de forma para a temporada parecer viva.
 if(!p.human)score+=Math.random()*8;

 // Fadiga de sequência: quem venceu recentemente tem menos chance de repetir.
 if(REALITY.lastWinner===p)score-=24;

 return score
}

function realityPickChallengeWinner(type="lider"){
 const pool=realityAlive();
 if(!pool.length)return null;

 let ranked=pool
   .map(p=>({p,score:realityChallengeScore(p,type)}))
   .sort((a,b)=>b.score-a.score);

 // Segurança de balanceamento:
 // em uma temporada longa, evita o player monopolizar as provas por acaso.
 if(ranked[0]?.p?.human && REALITY._playerWinsInLast3>=2){
   const npc=ranked.find(x=>!x.p.human);
   if(npc){
     const old=ranked[0];
     ranked[0]=npc;
     const idx=ranked.indexOf(npc,1);
     if(idx>=0)ranked[idx]=old
   }
 }

 REALITY.lastChallengeRanking=ranked.map(x=>({name:x.p.name,score:Math.round(x.score)}));
 return ranked[0].p
}


function realityShowChallengeResult(type,winner){
 const ranking=(REALITY.lastChallengeRanking||[]).slice(0,5);
 const podium=ranking.map((x,i)=>`${i+1}º ${x.name} — ${x.score} pts`).join("\n");

 addFeed(`🏁 RESULTADO: ${winner.name} venceu a Prova do ${type}.`);
 if(typeof toast==="function")toast(`🏆 ${winner.name} venceu o ${type}!`);

 realityAlive().forEach(p=>{
   if(p===winner)return;
   if(typeof livingThought==="function"){
     const rel=realityRel(p,winner);
     livingThought(p,rel>30?`${winner.name} ganhar me ajuda.`:`${winner.name} ficou mais forte.`)
   }
 });

 if(typeof modal==="function"){
   modal(`🏆 ${winner.name.toUpperCase()} VENCEU!`,
     `PROVA DO ${type.toUpperCase()}\n\n${podium}\n\n${winner.name} conquistou a vitória.`,
     ["CONTINUAR"],closeModal)
 }
}

function realitySetLeader(p){
 REALITY.leader=p;
 REALITY._recentWinners=REALITY._recentWinners||[];
 REALITY._recentWinners.unshift({name:p.name,human:!!p.human});
 REALITY._recentWinners=REALITY._recentWinners.slice(0,3);
 REALITY._playerWinsInLast3=REALITY._recentWinners.filter(x=>x.human).length;REALITY.immune.add(realityPersonKey(p));REALITY.lastWinner=p;
 realityRemember(p,"Venceu a Prova do Líder e ganhou imunidade.");
 realityHistory(`🏆 ${p.name} venceu a Prova do Líder e está imune.`);
 realityShowChallengeResult("Líder",p);
 if(typeof livingReactToWinner==='function')livingReactToWinner(p,'a Prova do Líder');
 REALITY.partyPending=true
}
function realitySetAngel(p){
 REALITY.angel=p;REALITY.lastWinner=p;
 realityShowChallengeResult("Anjo",p);
 const options=realityAlive().filter(x=>x!==p && !REALITY.immune.has(realityPersonKey(x)))
   .sort((a,b)=>realityRel(p,b)-realityRel(p,a));
 const target=options[0];
 if(target){
   REALITY.immune.add(realityPersonKey(target));
   realityRemember(target,`${p.name} deu o Anjo e me imunizou.`);
   realityRemember(p,`Imunizei ${target.name} com o Anjo.`);
   realityHistory(`${p.name} venceu o Anjo e imunizou ${target.name}.`)
 }else realityHistory(`${p.name} venceu a Prova do Anjo.`)

 if(typeof livingReactToWinner==='function')livingReactToWinner(p,'a Prova do Anjo');
}

function realityVoteChoice(voter){
 const candidates=realityAlive().filter(p=>p!==voter&&!REALITY.immune.has(realityPersonKey(p)));
 if(!candidates.length)return null;
 return candidates.map(p=>{
   let threat=0;
   if(REALITY.leader===p)threat+=20;
   if(REALITY.lastWinner===p)threat+=12;
   const dislike=-realityRel(voter,p);
   const noise=Math.random()*28;
   return [p,dislike+threat+noise]
 }).sort((a,b)=>b[1]-a[1])[0][0]
}
function realitySimulateHouseVote(){
 const tally=new Map(), voters=realityAlive();
 voters.forEach(v=>{
   const target=realityVoteChoice(v); if(!target)return;
   tally.set(target,(tally.get(target)||0)+1);
   realityRemember(v,`Votei em ${target.name}.`);
   realityRemember(target,`${v.name} pode ter votado em mim.`)
 });
 const ranked=[...tally.entries()].sort((a,b)=>b[1]-a[1]);
 if(!ranked.length)return null;
 const [target,count]=ranked[0];
 realityHistory(`A casa deu ${count} voto${count===1?"":"s"} para ${target.name}.`);
 return target
}

function realityGossip(){
 const pool=realityAlive(); if(pool.length<2)return "A casa está quieta por enquanto.";
 const speaker=pool[Math.floor(Math.random()*pool.length)];
 const others=pool.filter(p=>p!==speaker);
 const subject=others[Math.floor(Math.random()*others.length)];
 const rel=realityRel(speaker,subject);
 const memories=REALITY.memories.get(realityPersonKey(speaker))||[];
 const templates=rel>35?[
   `${speaker.name} disse que confia bastante em ${subject.name}.`,
   `${speaker.name} acha que ${subject.name} pode ser importante para uma aliança.`,
   `${speaker.name} contou que protegeria ${subject.name} em uma votação.`
 ]:rel<-20?[
   `${speaker.name} acha que ${subject.name} está jogando dos dois lados.`,
   `${speaker.name} comentou que não pretende confiar em ${subject.name}.`,
   `${speaker.name} acredita que ${subject.name} virou uma ameaça no jogo.`
 ]:[
   `${speaker.name} está tentando descobrir em quem ${subject.name} votaria.`,
   `${speaker.name} comentou que ${subject.name} anda muito próximo de outros participantes.`,
   `${speaker.name} ainda não sabe se pode confiar em ${subject.name}.`
 ];
 let text=templates[Math.floor(Math.random()*templates.length)];
 if(memories.length && Math.random()<.35)text+=` Também lembrou: "${memories[0]}"`;
 REALITY.gossipLog.unshift(text);if(REALITY.gossipLog.length>20)REALITY.gossipLog.pop();
 return text
}
function realityShowGossip(){
 const text=realityGossip();
 addFeed("🗣️ FOFOCA: "+text);bubble("Tem fofoca nova 👀");
 if(typeof toast==="function")toast(text)
}

function realityQueueConfession(p,reason){
 if(!p||REALITY.confessionQueue.some(x=>x.p===p)||REALITY.confessionBusy)return;
 REALITY.confessionQueue.push({p,reason})
}
function realityConfessionText(p){
 const others=realityAlive().filter(x=>x!==p);
 const rival=[...others].sort((a,b)=>realityRel(p,a)-realityRel(p,b))[0];
 const ally=[...others].sort((a,b)=>realityRel(p,b)-realityRel(p,a))[0];
 const opts=[
   rival?`${p.name}: "Estou de olho em ${rival.name}. Não sei se dá para confiar."`:`${p.name}: "Preciso entender melhor esse jogo."`,
   ally?`${p.name}: "${ally.name} é uma pessoa que eu quero por perto."`:`${p.name}: "Ainda estou procurando meu grupo."`,
   `${p.name}: "Meu objetivo agora é sobreviver à próxima votação."`,
   `${p.name}: "A casa está mudando e eu preciso prestar atenção nas alianças."`
 ];
 return opts[Math.floor(Math.random()*opts.length)]
}
function realityProcessConfession(){
 if(REALITY.confessionBusy||!REALITY.confessionQueue.length)return;
 const job=REALITY.confessionQueue.shift(),p=job.p;
 if(!p||p.eliminated)return;
 REALITY.confessionBusy=true;
 const old=[p.x,p.y];
 const target=typeof safePoint==="function"?safePoint("CONFESSIONÁRIO"):[906,458];
 // NPCs recebem destino físico; player recebe chamada, não teleporte.
 if(p.human){
   addFeed("🔴 Confessionário chamou você. Vá até lá quando puder.");
   bubble("Confessionário me chamou!")
 }else{
   p.targetRoom="CONFESSIONÁRIO";p.path=[];p.pathIndex=0;p.repathCd=0;
   p.realityConfessionTarget=target;p.realityConfessionReturn=old;
   addFeed(`🔴 ${p.name} foi chamado ao confessionário.`);
 }
 setTimeout(()=>{
   const text=realityConfessionText(p);
   realityHistory(`Confessionário de ${p.name}: ${text.replace(p.name+": ","")}`);
   if(!p.human&&p.realityConfessionReturn){
     p.targetRoom=roomAt(p.realityConfessionReturn[0],p.realityConfessionReturn[1]);
     p.path=[];p.pathIndex=0;p.repathCd=0
   }
   REALITY.confessionBusy=false
 },6500)
}

function realityCreateAlliance(){
 const pool=realityAlive().filter(p=>!REALITY.alliances.some(a=>a.members.includes(p.name)));
 if(pool.length<3)return;
 const seed=pool[Math.floor(Math.random()*pool.length)];
 const mates=pool.filter(p=>p!==seed).sort((a,b)=>realityRel(seed,b)-realityRel(seed,a)).slice(0,2);
 if(mates.length<2)return;
 const members=[seed,...mates];
 members.forEach((a,i)=>members.forEach((b,j)=>{if(i<j)realityChangeRel(a,b,18)}));
 const name=["Quarto","Comadres","Radar","Subsolo","Fechamento"][REALITY.alliances.length%5];
 REALITY.alliances.push({name,members:members.map(x=>x.name)});
 realityHistory(`Uma aliança começou a se formar entre ${members.map(x=>x.name).join(", ")}.`)
}

function realityStartParty(){
 REALITY.partyPending=false;REALITY.partyActive=true;REALITY.phase="Festa";
 REALITY.day++;
 realityHistory("A festa começou! A casa inteira foi para a pista.");
 realityAlive().forEach(p=>{
   if(!p.human){p.targetRoom="FESTA";p.path=[];p.pathIndex=0;p.repathCd=0}
 });
 // Festa mexe nas relações e gera assunto.
 const pool=realityAlive();
 for(let i=0;i<Math.min(5,pool.length);i++){
   const a=pool[Math.floor(Math.random()*pool.length)],b=pool[Math.floor(Math.random()*pool.length)];
   if(a&&b&&a!==b)realityChangeRel(a,b,Math.random()<.7?8:-10)
 }
 setTimeout(()=>{
   REALITY.partyActive=false;REALITY.phase="Pós-festa";
   realityHistory("A festa terminou. O que aconteceu na pista virou assunto na casa.");
   realityShowGossip();realityShowGossip()
 },22000)
}

function realityWeekStatus(){
 const leader=REALITY.leader?.name||"—";
 const angel=REALITY.angel?.name||"—";
 const immune=[...REALITY.immune].join(", ")||"—";
 return {
  dia:REALITY.day,
  fase:REALITY.phase||"Convivência",
  lider:leader,
  anjo:angel,
  imunes:immune,
  festa:REALITY.partyActive?"Acontecendo":REALITY.partyPending?"Em breve":"Não"
 }
}
function realityShowWeekStatus(){
 const s=realityWeekStatus();
 modal("📅 SEMANA DA CASA",
   `Dia ${s.dia}\nFase: ${s.fase}\n\n👑 Líder: ${s.lider}\n😇 Anjo: ${s.anjo}\n🛡️ Imunes: ${s.imunes}\n🎉 Festa: ${s.festa}`,
   ["FECHAR"],closeModal)
}


function realityMiniObjective(){
 const targets=[
  "Converse com 2 participantes diferentes.",
  "Descubra uma fofoca nova.",
  "Visite a Sala Verde.",
  "Passe um tempo na Festa.",
  "Observe quem está mais próximo do Líder.",
  "Abra o perfil de um participante.",
  "Tente melhorar sua relação com alguém."
 ];
 const text=pick(targets)||"Observe a casa.";
 addFeed(`🎯 Objetivo do dia: ${text}`);
 return text
}

function realityNewCycle(){
 REALITY.day++;REALITY.phase="Prova do Líder";
 realityMiniObjective();REALITY.immune.clear();
 const leader=realityPickChallengeWinner("lider");if(leader)realitySetLeader(leader);
 setTimeout(()=>{
   REALITY.phase="Prova do Anjo";
   const angel=realityPickChallengeWinner("anjo");if(angel)realitySetAngel(angel)
 },2500);
 setTimeout(()=>{if(REALITY.partyPending)realityStartParty()},5000)
}

function realityTick(dt){
 REALITY._clock=(REALITY._clock||0)+dt;
 if(REALITY._clock>32){
   REALITY._clock=0;
   const npcs=realityNPCs();
   if(npcs.length)realityQueueConfession(npcs[Math.floor(Math.random()*npcs.length)],"rotina");
   if(Math.random()<.35)realityShowGossip();
   if(Math.random()<.14)realityCreateAlliance()
 }
 realityProcessConfession()
}


setTimeout(()=>{
 const gb=document.querySelector("#gossipBtn");
 if(gb)gb.onclick=()=>realityShowGossip();
},0);

// ============================================================
// V1.6 — LIVING HOUSE
// ============================================================
const LIVING={
 moods:new Map(),
 thoughts:new Map(),
 chats:[],
 actions:new Map(),
 lastDramaAt:0
};

function livingMood(p){
 const k=realityPersonKey(p);
 if(!LIVING.moods.has(k))LIVING.moods.set(k,"🙂");
 return LIVING.moods.get(k)
}
function livingSetMood(p,mood,reason=""){
 LIVING.moods.set(realityPersonKey(p),mood);
 if(reason)realityRemember(p,reason)
}
function livingThought(p,text){
 LIVING.thoughts.set(realityPersonKey(p),{text,until:performance.now()+6500})
}
function livingRecentThought(p){
 const x=LIVING.thoughts.get(realityPersonKey(p));
 if(!x||performance.now()>x.until)return "";
 return x.text
}
function livingActionFor(p){
 return LIVING.actions.get(realityPersonKey(p))||p.activity||"observando"
}
function livingSetAction(p,action,seconds=8){
 LIVING.actions.set(realityPersonKey(p),action);
 setTimeout(()=>{
   if(LIVING.actions.get(realityPersonKey(p))===action)LIVING.actions.delete(realityPersonKey(p))
 },seconds*1000)
}

function livingDialogueBetween(a,b){
 const rel=realityRel(a,b);
 const memA=REALITY.memories.get(realityPersonKey(a))||[];
 let lines;

 if(rel>45){
  lines=[
   `${a.name}: "Se eu ganhar o Anjo, penso em você."`,
   `${a.name}: "Acho que a gente precisa continuar junto."`,
   `${a.name}: "Você é uma das poucas pessoas em quem eu confio."`
  ]
 }else if(rel<-25){
  lines=[
   `${a.name}: "Tem coisa no seu jogo que não está batendo."`,
   `${a.name}: "Eu sei que você está falando meu nome."`,
   `${a.name}: "Não tenta me fazer de bobo, ${b.name}."`
  ]
 }else{
  lines=[
   `${a.name}: "Em quem você acha que a casa está votando?"`,
   `${a.name}: "Você ouviu alguma coisa sobre o próximo paredão?"`,
   `${a.name}: "Quero entender melhor seu jogo."`
  ]
 }
 if(memA.length&&Math.random()<.35)lines.push(`${a.name}: "E ainda estou pensando nisso: ${memA[0]}"`);
 return pick(lines)||`${a.name}: "Precisamos conversar."`
}

function livingStartChat(a,b){
 if(!a||!b||a===b||a.eliminated||b.eliminated)return;
 livingSetAction(a,`conversando com ${b.name}`,7);
 livingSetAction(b,`conversando com ${a.name}`,7);

 const text=livingDialogueBetween(a,b);
 showNpcBubble(a,text.replace(`${a.name}: `,""));
 setTimeout(()=>showNpcBubble(b,realityRel(a,b)>20?"Também acho.":"Vou pensar nisso."),1700);

 if(realityRel(a,b)>20)realityChangeRel(a,b,2);
 else if(realityRel(a,b)<-20)realityChangeRel(a,b,-3);

 LIVING.chats.unshift({a:a.name,b:b.name,text});
 if(LIVING.chats.length>30)LIVING.chats.pop()
}

function livingRandomAction(p){
 if(!p||p.human||p.eliminated)return;
 const room=roomAt(p.x,p.y);
 const choices={
  "COZINHA":["fazendo um lanche","lavando um copo","mexendo na geladeira","conversando na cozinha"],
  "SALA":["assistindo os outros","descansando no sofá","observando alianças"],
  "QUARTO":["arrumando a cama","conversando no quarto","pensando no jogo"],
  "PÁTIO / PISCINA":["descansando perto da piscina","tomando um ar","conversando no deck"],
  "SALA VERDE":["falando de estratégia","procurando aliados","fofocando"],
  "FESTA":["dançando","curtindo a música","conversando na pista"],
  "CONFESSIONÁRIO":["dando depoimento"]
 };
 const action=pick(choices[room]||["passeando pela casa","observando os outros"]);
 livingSetAction(p,action,randInt(5,11));

 const thoughts=[
  `Preciso falar com ${pick(realityAlive().filter(x=>x!==p))?.name||"alguém"}.`,
  "Não posso virar alvo.",
  "Quero muito ganhar uma prova.",
  "Será que estou em perigo?",
  "Preciso descobrir os votos.",
  "Essa casa está estranha hoje."
 ];
 if(Math.random()<.55)livingThought(p,pick(thoughts)||"Estou pensando no jogo.")
}

function randInt(a,b){return Math.floor(Math.random()*(b-a+1))+a}

function livingDrama(){
 const pool=realityNPCs();
 if(pool.length<2)return;
 const a=pick(pool), b=pick(pool.filter(x=>x!==a));
 if(!a||!b)return;

 const rel=realityRel(a,b);
 if(rel<-18 || Math.random()<.22){
   realityChangeRel(a,b,-8);
   livingSetMood(a,"😡",`Discutiu com ${b.name}.`);
   livingSetMood(b,"😠",`Teve uma discussão com ${a.name}.`);
   livingSetAction(a,`discutindo com ${b.name}`,9);
   livingSetAction(b,`discutindo com ${a.name}`,9);
   addFeed(`🔥 TRETA: ${a.name} e ${b.name} começaram a discutir.`);
   showNpcBubble(a,`Eu não gostei do que você fez, ${b.name}.`);
   livingReactToDrama(a,b);
   setTimeout(()=>showNpcBubble(b,"Então fala na minha cara!"),1500);
 }else{
   livingStartChat(a,b)
 }
}

function livingReactToWinner(winner,type){
 realityAlive().forEach(p=>{
   if(p===winner)return;
   const rel=realityRel(p,winner);
   if(rel>35){
     livingSetMood(p,"🥳",`${winner.name} venceu ${type}.`);
     livingThought(p,`${winner.name} ganhar foi bom para mim.`)
   }else if(rel<-20){
     livingSetMood(p,"😒",`${winner.name} venceu ${type}.`);
     livingThought(p,`${winner.name} ficou ainda mais forte.`)
   }else{
     livingSetMood(p,"😐");
     livingThought(p,`${winner.name} pode virar ameaça.`)
   }
 })
 livingSetMood(winner,"👑",`Venceu ${type}.`)
}

function livingProfile(p){
 if(!p)return;
 const others=realityAlive().filter(x=>x!==p);
 const ranked=[...others].sort((a,b)=>realityRel(p,b)-realityRel(p,a));
 const ally=ranked[0], rival=ranked[ranked.length-1];
 const memories=(REALITY.memories.get(realityPersonKey(p))||[]).slice(0,4);

 const alliance=REALITY.alliances.find(a=>a.members.includes(p.name));
 const immune=REALITY.immune.has(realityPersonKey(p));
 const leader=REALITY.leader===p;
 const angel=REALITY.angel===p;

 const badges=[
   leader?"👑 Líder":null,
   angel?"😇 Anjo":null,
   immune?"🛡️ Imune":null
 ].filter(Boolean).join(" • ");

 const text=[
  `${livingMood(p)} Humor atual`,
  `🎭 Personalidade: ${realityTrait(p)}`,
  `🎬 Agora: ${livingActionFor(p)}`,
  badges?`🏅 Status: ${badges}`:"",
  `🏆 Vitórias em provas: ${p.wins||0}`,
  ally?`🤝 Mais próximo: ${ally.name} (${livingRelationshipLabel(p,ally)})`:"",
  rival?`⚡ Maior tensão: ${rival.name} (${livingRelationshipLabel(p,rival)})`:"",
  alliance?`👥 Grupo conhecido: ${alliance.name}`:"",
  memories.length?`\n📓 Memórias recentes:\n• ${memories.join("\n• ")}`:""
 ].filter(Boolean).join("\n");

 modal(`👤 ${p.name}`,text,["FECHAR"],closeModal)
}

function livingNearby(p,radius=95){
 return realityAlive().filter(o=>o!==p&&Math.hypot(o.x-p.x,o.y-p.y)<=radius)
}

function livingGroupChat(){
 const npcs=realityNPCs();
 if(npcs.length<3)return;
 const host=pick(npcs);
 if(!host)return;

 const near=livingNearby(host,130).filter(p=>!p.human);
 let members=[host,...near.slice(0,3)];
 if(members.length<3){
   members=[host,...npcs.filter(p=>p!==host).slice(0,2)]
 }
 if(members.length<3)return;

 const topic=pick([
   "próxima votação","quem está forte","alianças da casa",
   "quem está jogando dos dois lados","quem pode ganhar a próxima prova"
 ])||"o jogo";

 members.forEach((p,i)=>{
   livingSetAction(p,`conversa em grupo`,9);
   if(i===0)showNpcBubble(p,`Vamos falar sobre ${topic}.`);
   else setTimeout(()=>showNpcBubble(p,
     i===1?"Tenho uma teoria sobre isso.":"Eu ouvi uma coisa hoje..."
   ),700*i)
 });

 // Pequenos efeitos reais nas relações.
 for(let i=0;i<members.length;i++){
   for(let j=i+1;j<members.length;j++){
     realityChangeRel(members[i],members[j],Math.random()<.8?2:-2)
   }
 }
 addFeed(`👥 ${members.map(p=>p.name).join(", ")} começaram uma conversa em grupo.`)
}

function livingReactToDrama(a,b){
 const audience=realityAlive()
   .filter(p=>p!==a&&p!==b&&Math.hypot(p.x-a.x,p.y-a.y)<145)
   .slice(0,4);

 audience.forEach((p,i)=>{
   livingSetAction(p,"assistindo a treta",7);
   livingThought(p,pick([
     "Isso vai dar problema...",
     "Eu sabia que isso ia acontecer.",
     "Melhor eu não me meter.",
     "Preciso lembrar disso para o jogo."
   ])||"Eita...");
   if(i===0)setTimeout(()=>showNpcBubble(p,"Eita..."),900)
 })
}

function livingRelationshipLabel(a,b){
 const r=realityRel(a,b);
 if(r>=55)return "💚 aliado";
 if(r>=25)return "🙂 próximo";
 if(r<=-45)return "🔥 rival";
 if(r<=-18)return "😒 tensão";
 return "• neutro"
}


function livingSocialEvent(){
 const npcs=realityNPCs();
 if(npcs.length<2)return;

 const type=Math.random();
 if(type<.25){
   const p=pick(npcs);
   const target=pick(npcs.filter(x=>x!==p));
   if(!p||!target)return;
   realityChangeRel(p,target,8);
   livingSetMood(p,"😊",`Teve uma boa conversa com ${target.name}.`);
   livingSetMood(target,"🙂",`Se aproximou de ${p.name}.`);
   addFeed(`💚 ${p.name} e ${target.name} ficaram mais próximos.`);
 }else if(type<.5){
   const p=pick(npcs);
   livingSetMood(p,"😟","Está preocupado com a próxima votação.");
   livingThought(p,"Acho que posso receber votos...");
   addFeed(`😟 ${p.name} parece preocupado com o próximo paredão.`);
 }else if(type<.7){
   const p=pick(npcs);
   livingSetMood(p,"😎","Está confiante no próprio jogo.");
   livingThought(p,"Estou numa posição boa.");
 }else{
   realityShowGossip()
 }
}


function livingRoutineEvent(){
 const npcs=realityNPCs();
 if(!npcs.length)return;
 const p=pick(npcs);
 if(!p)return;
 const room=roomAt(p.x,p.y);
 const actions={
  "COZINHA":["fazendo café","pegando comida","lavando louça"],
  "SALA":["descansando","observando a casa","assistindo os outros"],
  "QUARTO":["arrumando a cama","conversando baixo","pensando no jogo"],
  "PÁTIO / PISCINA":["tomando um ar","sentado perto da piscina","relaxando"],
  "SALA VERDE":["falando de estratégia","tentando descobrir votos","fofocando"],
  "FESTA":["dançando","curtindo a pista","conversando com o grupo"],
  "CORREDOR":["indo atrás de alguém","circulando pela casa"]
 };
 const action=pick(actions[room]||["circulando pela casa"]);
 livingSetAction(p,action,randInt(6,12));
 if(Math.random()<.28){
  livingThought(p,pick([
   "Preciso melhorar minha posição.",
   "Quero conversar com meu grupo.",
   "Será que estão falando de mim?",
   "A próxima prova é importante.",
   "Não posso virar alvo agora."
  ])||"Preciso pensar.")
 }
}
function livingHouseAnnouncement(){
 const lines=[
  "📢 Produção: atenção, participantes. A casa está em modo convivência.",
  "📢 Produção: em breve haverá uma nova dinâmica.",
  "📢 Produção: cuidem das alianças... a votação se aproxima.",
  "📢 Produção: a casa está sendo observada."
 ];
 addFeed(pick(lines)||"📢 Produção chamou a atenção da casa.")
}

function livingTick(dt){
 LIVING._clock=(LIVING._clock||0)+dt;
 LIVING._actionClock=(LIVING._actionClock||0)+dt;
 LIVING._eventClock=(LIVING._eventClock||0)+dt;
 LIVING._routineClock=(LIVING._routineClock||0)+dt;
 LIVING._announceClock=(LIVING._announceClock||0)+dt;

 if(LIVING._actionClock>11){
   LIVING._actionClock=0;
   const npcs=realityNPCs();
   if(npcs.length){
     livingRandomAction(pick(npcs));
     if(Math.random()<.45){
       const a=pick(npcs),b=pick(npcs.filter(x=>x!==a));
       if(a&&b&&Math.hypot(a.x-b.x,a.y-b.y)<180)livingStartChat(a,b)
     }
   }
 }

 if(LIVING._clock>24){
   LIVING._clock=0;
   if(Math.random()<.34)livingDrama(); else if(Math.random()<.42)livingGroupChat()
 }

 if(LIVING._eventClock>30){
   LIVING._eventClock=0;
   if(Math.random()<.65)livingSocialEvent()
 }

 if(LIVING._routineClock>14){
   LIVING._routineClock=0;
   livingRoutineEvent()
 }
 if(LIVING._announceClock>50){
   LIVING._announceClock=0;
   if(Math.random()<.55)livingHouseAnnouncement()
 }
}


function livingFindPersonAt(x,y){
 let best=null,d=28;
 for(const p of people.filter(p=>!p.eliminated)){
  const q=Math.hypot(p.x-x,p.y-y);
  if(q<d){d=q;best=p}
 }
 return best
}
setTimeout(()=>{
 const cv=document.querySelector("#canvas");
 if(cv)cv.addEventListener("dblclick",ev=>{
   if(!gameStarted)return;
   const r=cv.getBoundingClientRect();
   const x=(ev.clientX-r.left)*(cv.width/r.width),y=(ev.clientY-r.top)*(cv.height/r.height);
   const p=livingFindPersonAt(x,y);
   if(p)livingProfile(p)
 })
},0);

setTimeout(()=>{
 const wb=document.querySelector("#weekBtn");
 if(wb)wb.onclick=()=>realityShowWeekStatus()
},0);


function showSeasonHistory(){
 const lines=(REALITY.history||[]).slice(0,18);
 modal("📺 HISTÓRICO DA TEMPORADA",
   lines.length?lines.join("\n\n"):"Nenhum acontecimento importante ainda.",
   ["FECHAR"],closeModal)
}
setTimeout(()=>{
 const hb=document.querySelector("#historyBtn");
 if(hb)hb.onclick=()=>showSeasonHistory()
},0);


setTimeout(()=>{
 const sh=document.querySelector("#sideHistoryBtn");
 if(sh)sh.onclick=()=>showSeasonHistory()
},0);
