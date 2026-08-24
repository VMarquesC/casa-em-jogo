const C=document.querySelector("#canvas"),ctx=C.getContext("2d");
ctx.imageSmoothingEnabled=false;
const SPRITES={};
["theo","luna","caio","bia","noah","maya","davi","nina"].forEach(n=>{let im=new Image();im.src=`assets/sprites/${n}.png`;SPRITES[n]=im});
const map=new Image(); map.src="assets/cenario_casa.png";
const keys={}; const BOT_NAMES=["Luna","Caio","Bia","Noah","Maya","Davi","Nina"];
const COLORS=["#57c7ff","#ff6b8a","#ffd166","#8ee493","#c89bff","#ff9f68","#67e8d0","#f3f4f6"];
const moods=["Conversando","Desconfiado","Planejando","Relaxando","Observando","Fofocando"];
const sayings=["Tem uma aliança escondida rolando.","Eu não confio em todo mundo aqui.","Se eu ganhar a prova, vou mexer no jogo.","Ouvi uma coisa estranha perto da cozinha.","Tem gente prometendo voto para dois lados.","Acho que a próxima votação vai surpreender.","Não conta pra ninguém, mas estou com um alvo.","Essa casa está cheia de cobra."];
const rnd=(a,b)=>Math.random()*(b-a)+a, pick=a=>a[Math.floor(Math.random()*a.length)];
let trait="Social",playerColor=COLORS[0],people=[],me,round=1,time=70,phase="social",feed=[],leader="",immune="",eventName="";
let stats={energy:100,social:50,rep:50,coins:500},alliances=[],gossips=[],near=null,last=performance.now(),eventCd=18,actionCd=0,challenge=0;
let musicOn=true,audioCtx=null,musicTimer=null,doorNear=null;
let dialogueOpen=false,typingTimer=null,currentDialogue=null,relationship={};

// Áreas nas quais o centro do personagem pode existir.
// O cenário é a própria imagem enviada pelo usuário.
const WALK=[
 {name:"DESPENSA",x:54,y:49,w:246,h:142},
 {name:"COZINHA",x:55,y:244,w:245,h:356},
 {name:"SALA",x:365,y:145,w:244,h:415},
 {name:"HALL",x:342,y:468,w:278,h:112},
 {name:"PÁTIO / PISCINA",x:36,y:628,w:555,h:129},
 {name:"QUARTO",x:656,y:49,w:310,h:244},
 {name:"LOUNGE",x:653,y:488,w:120,h:252},
 {name:"CONFESSIONÁRIO",x:799,y:520,w:169,h:218}
];

// Colisões aproximadas sobre móveis/objetos da imagem.
const BLOCK=[
 // despensa
 [55,55,62,99],[122,58,111,62],[239,48,56,104],
 // cozinha paredes/móveis
 [55,245,238,76],[55,321,46,276],[245,321,54,278],
 [132,385,88,176],[105,410,27,135],[220,408,24,137],
 // sala
 [365,145,30,292],[573,145,33,287],[404,164,151,104],
 [447,306,123,131],[450,444,121,35],[365,485,80,70],[548,480,60,77],
 // hall / portas e estantes
 [356,485,83,72],[542,484,66,73],[444,534,108,30],
 // quarto beds/furniture
 [658,50,300,61],[658,113,40,167],[920,113,41,169],
 [705,117,66,82],[820,118,70,80],[710,213,66,62],[819,211,73,65],
 // lounge
 [655,493,58,77],[654,612,51,95],[741,490,31,151],
 // confessionário
 [799,521,167,58],[800,579,42,150],[923,580,43,148],[865,613,39,101],
 // piscina e mobília do pátio
 [118,704,470,55],[43,642,91,88],[368,635,63,58],[515,637,62,61]
];


// refinamentos V0.6: mesas, estantes, poltronas e bordas adicionais
BLOCK.push(
 [153,501,78,54], [128,367,98,24], [394,363,40,75], [571,359,29,75],
 [430,269,137,31], [412,439,166,18], [670,350,108,81],
 [630,323,156,33], [632,438,95,36], [780,332,167,126],
 [629,565,49,115], [708,560,58,145], [330,616,62,73],
 [446,614,78,60], [88,675,65,46], [530,681,48,45]
);

const DOORS=[
 {name:"Porta da Despensa",a:[278,181],b:[278,258],to:[270,342]},
 {name:"Porta da Cozinha",a:[280,333],b:[315,333],to:[379,357]},
 {name:"Porta do Quarto",a:[789,278],b:[789,316],to:[597,357]},
 {name:"Entrada do Lounge",a:[663,543],b:[643,543],to:[598,535]},
 {name:"Entrada do Confessionário",a:[805,645],b:[782,645],to:[742,646]}
];

function insideWalk(x,y){return WALK.some(r=>x>=r.x&&x<=r.x+r.w&&y>=r.y&&y<=r.y+r.h)}
function circleRect(cx,cy,r,bx,by,bw,bh){
 const nx=Math.max(bx,Math.min(cx,bx+bw)),ny=Math.max(by,Math.min(cy,by+bh));
 return (cx-nx)*(cx-nx)+(cy-ny)*(cy-ny)<r*r
}
function blocked(x,y,rad=10,who=null){
 if(BLOCK.some(([bx,by,bw,bh])=>circleRect(x,y,rad,bx,by,bw,bh)))return true;
 for(const p of people){
   if(!p.alive||p===who)continue;
   if(dist(x,y,p.x,p.y)<rad+11)return true;
 }
 return false
}
function canMove(x,y,who=null){return insideWalk(x,y)&&!blocked(x,y,11,who)}
function roomAt(x,y){let r=WALK.find(r=>x>=r.x&&x<=r.x+r.w&&y>=r.y&&y<=r.y+r.h);return r?r.name:"CORREDOR"}
function dist(a,b,c,d){return Math.hypot(a-c,b-d)}

document.querySelectorAll(".trait").forEach(b=>b.onclick=()=>{document.querySelectorAll(".trait").forEach(x=>x.classList.remove("selected"));b.classList.add("selected");trait=b.dataset.trait});
COLORS.slice(0,7).forEach((c,i)=>{let b=document.createElement("button");b.className="color"+(i===0?" selected":"");b.style.background=c;b.onclick=()=>{document.querySelectorAll(".color").forEach(x=>x.classList.remove("selected"));b.classList.add("selected");playerColor=c};document.querySelector("#colors").appendChild(b)});
document.querySelector("#play").onclick=start;
document.querySelector("#musicBtn").onclick=toggleMusic;
document.querySelector("#gossipBtn").onclick=showGossip;
document.querySelector("#relBtn").onclick=showRelationships;
addEventListener("keydown",e=>{
 const k=e.key.toLowerCase();
 if(k===" " && dialogueOpen){e.preventDefault();advanceDialogue();return}
 keys[k]=true;
 if(dialogueOpen)return;
 if(k==="e"&&phase==="social")interact();
 if(k==="f"&&phase==="social")action()
});
addEventListener("keyup",e=>keys[e.key.toLowerCase()]=false);

function safePoint(zoneName){
 const r=pick(WALK.filter(z=>!zoneName||z.name===zoneName));
 for(let i=0;i<80;i++){let x=rnd(r.x+18,r.x+r.w-18),y=rnd(r.y+18,r.y+r.h-18);if(canMove(x,y))return [x,y]}
 return [480,520]
}
function makePerson(name,x,y,c,human=false){
 const key=human?"theo":name.toLowerCase();
 return{name,x,y,c,human,alive:true,tx:x,ty:y,mood:pick(moods),wins:0,zone:roomAt(x,y),change:0,facing:"down",walkFrame:0,sprite:key}
}
function start(){
 const name=document.querySelector("#name").value.trim()||"Jogador";
 people=[makePerson(name,487,510,playerColor,true)];
 BOT_NAMES.forEach((n,i)=>{let p=safePoint(pick(["SALA","COZINHA","HALL","PÁTIO / PISCINA"]));people.push(makePerson(n,p[0],p[1],COLORS[i+1]))});
 me=people[0];
 people.filter(p=>p!==me).forEach(p=>relationship[p.name]={trust:50,affinity:50,suspicion:10});
 document.querySelector("#start").classList.remove("active");document.querySelector("#game").classList.add("active");
 addFeed(`🎬 ${name} entrou na casa como ${trait}.`);
 addFeed("🏠 O cenário da casa agora é a imagem enviada por você.");
 addFeed("🚧 Paredes, móveis, camas, piscina e outros objetos possuem colisão.");
 toast("CASA EM JOGO • V0.5");startMusic();requestAnimationFrame(loop)
}

function loop(now){let dt=Math.min(.05,(now-last)/1000);last=now;if(phase==="social")update(dt);draw();ui();requestAnimationFrame(loop)}
function update(dt){
 actionCd=Math.max(0,actionCd-dt);stats.energy=Math.max(0,stats.energy-dt*.09);eventCd-=dt;
 if(me.alive && !dialogueOpen){
   let dx=(keys.d||keys.arrowright?1:0)-(keys.a||keys.arrowleft?1:0),dy=(keys.s||keys.arrowdown?1:0)-(keys.w||keys.arrowup?1:0),l=Math.hypot(dx,dy)||1,speed=stats.energy>10?145:95;
   if(Math.abs(dx)>Math.abs(dy))me.facing=dx>0?"right":"left";else if(dy!==0)me.facing=dy>0?"down":"up";
   if(dx||dy)me.walkFrame=(me.walkFrame+dt*7)%4;
   let nx=me.x+dx/l*speed*dt,ny=me.y+dy/l*speed*dt;
   if(canMove(nx,me.y,me))me.x=nx;if(canMove(me.x,ny,me))me.y=ny;
 }
 updateBots(dt);near=findNear();doorNear=findDoor();
 if(eventCd<=0){randomEvent();eventCd=rnd(19,31)}
 time-=dt;if(time<=0)startChallenge()
}
function updateBots(dt){
 people.filter(p=>!p.human&&p.alive).forEach(p=>{
   p.change-=dt;
   if(p.change<=0||dist(p.x,p.y,p.tx,p.ty)<8){
     let point=safePoint(p.zone);p.tx=point[0];p.ty=point[1];p.change=rnd(3,7);
     if(Math.random()<.08){let z=pick(["SALA","COZINHA","HALL","PÁTIO / PISCINA"]);let sp=safePoint(z);p.x=sp[0];p.y=sp[1];p.zone=z}
     p.mood=pick(moods)
   }
   let d=dist(p.x,p.y,p.tx,p.ty)||1;
   let vx=(p.tx-p.x)/d,vy=(p.ty-p.y)/d;
   if(Math.abs(vx)>Math.abs(vy))p.facing=vx>0?"right":"left";else p.facing=vy>0?"down":"up";
   p.walkFrame=(p.walkFrame+dt*5)%4;
   let nx=p.x+vx*43*dt,ny=p.y+vy*43*dt;
   if(canMove(nx,p.y,p))p.x=nx;else p.tx=p.x;
   if(canMove(p.x,ny,p))p.y=ny;else p.ty=p.y;
 })
}
function findNear(){let best=null,bd=55;people.filter(p=>p!==me&&p.alive).forEach(p=>{let d=dist(me.x,me.y,p.x,p.y);if(d<bd){bd=d;best=p}});return best}
function findDoor(){let best=null,bd=38;DOORS.forEach(d=>{let dd=dist(me.x,me.y,d.a[0],d.a[1]);if(dd<bd){bd=dd;best=d}});return best}

function interact(){if(dialogueOpen)return;if(actionCd>0)return;actionCd=.5;if(near)return openChat(near);if(roomAt(me.x,me.y)==="CONFESSIONÁRIO")return confession();bubble("Ninguém perto. Chegue perto de um participante.")}
function action(){
 if(dialogueOpen)return;
 if(actionCd>0)return;actionCd=.5;
 if(doorNear){me.x=doorNear.to[0];me.y=doorNear.to[1];toast("🚪 "+doorNear.name);return}
 const r=roomAt(me.x,me.y);
 if(r==="COZINHA"){stats.energy=Math.min(100,stats.energy+20);stats.coins+=15;addFeed("🍳 Você preparou comida. +20 energia • +15 moedas");bubble("+20 energia")}
 else if(r==="DESPENSA"){stats.coins+=30;addFeed("📦 Você ajudou a organizar a despensa. +30 moedas");bubble("+30 moedas")}
 else if(r==="SALA"){stats.social=Math.min(100,stats.social+6);addFeed("🛋️ Você socializou na sala. +6 Social");bubble("+6 Social")}
 else if(r==="QUARTO"){stats.energy=Math.min(100,stats.energy+28);addFeed("🛏️ Você descansou no quarto. +28 energia");bubble("+28 energia")}
 else if(r==="LOUNGE"){stats.rep=Math.min(100,stats.rep+5);addFeed("🎲 Você participou de uma dinâmica no lounge. +5 reputação");bubble("+5 reputação")}
 else if(r==="CONFESSIONÁRIO")confession();
 else if(r==="PÁTIO / PISCINA"){stats.social=Math.min(100,stats.social+4);stats.energy=Math.min(100,stats.energy+7);addFeed("🏖️ Você relaxou no pátio. +4 Social • +7 energia");bubble("Relaxando...")}
 else bubble("Nada para fazer aqui agora.")
}

function openChat(p){
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
   alliances.push(p.name);changeRel(p.name,12,10,-2);
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
 gossips.unshift(gossip);changeRel(p.name,1,0,2);stats.social=Math.min(100,stats.social+2);
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
 dialogueOpen=true;currentDialogue={name,color,text,choices};
 const box=document.querySelector("#dialogue");
 box.classList.remove("hidden");
 document.querySelector("#speaker").textContent=name;
 document.querySelector("#portrait").style.setProperty("--pc",color||"#57c7ff");
 document.querySelector("#dialogueChoices").innerHTML="";
 document.querySelector("#dialogueHint").style.display=choices.length?"none":"block";
 typeDialogue(text,()=>{
   if(choices.length){
     const q=document.querySelector("#dialogueChoices");
     choices.forEach(([label,fn])=>{
       const b=document.createElement("button");b.textContent=label;b.onclick=fn;q.appendChild(b)
     })
   }
 });
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
 modal("🤝 RELAÇÕES",lines.join("\\n\\n")||"Sem relações registradas.",["FECHAR"],closeModal)
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
 ["🔥 TRETA","Dois participantes começaram uma discussão no lounge."]
 ];
 let e=pick(events);eventName=e[0];addFeed(`${e[0]} ${e[1]}`);toast(e[0]);if(Math.random()<.45)gossips.unshift(e[1]);setTimeout(()=>eventName="",5500)
}

function startChallenge(){phase="challenge";challenge=(challenge+1)%5;if(challenge===0)return reaction();if(challenge===1)return memory();if(challenge===2)return resistance();if(challenge===3)return colors();return boxes()}
function reaction(){let target=Math.floor(rnd(450,900));modal("⚡ PROVA DO REFLEXO",`Clique aproximadamente ${target} ms depois do sinal.`,["COMEÇAR"],()=>{let q=document.querySelector("#choices");q.innerHTML="";document.querySelector("#modalText").textContent="Prepare-se...";setTimeout(()=>{let b=document.createElement("button");b.className="choice";b.textContent="🟢 AGORA!";q.appendChild(b);let s=performance.now();b.onclick=()=>resolve(Math.abs(performance.now()-s-target),"Reflexo")},rnd(700,1600))})}
function memory(){let seq=Array.from({length:5},()=>pick(["⭐","❤️","🌙","💎","🍀"]));modal("🧠 PROVA DA MEMÓRIA","Memorize:\n\n"+seq.join("  "),["MEMORIZEI"],()=>{let correct=seq.join("");let opts=[correct,[...seq].reverse().join(""),[...seq].sort(()=>Math.random()-.5).join("")];opts=[...new Set(opts)].sort(()=>Math.random()-.5);modal("🧠 QUAL ERA?", "Escolha a sequência correta.",opts,c=>resolve(c===correct?rnd(20,80):rnd(380,650),"Memória"))})}
function resistance(){let clicks=0,start=performance.now();modal("💪 PROVA DE RESISTÊNCIA","Clique 20 vezes o mais rápido possível.",["COMEÇAR"],()=>{let q=document.querySelector("#choices");q.innerHTML="";let b=document.createElement("button");b.className="choice";b.textContent="CLIQUE! 0/20";q.appendChild(b);start=performance.now();b.onclick=()=>{clicks++;b.textContent=`CLIQUE! ${clicks}/20`;if(clicks>=20)resolve((performance.now()-start)/10,"Resistência")}})}
function colors(){let answer=pick(["VERMELHO","AZUL","VERDE","AMARELO"]);let display=pick(["VERMELHO","AZUL","VERDE","AMARELO"]);modal("🎨 PROVA DAS CORES",`A palavra sorteada é: ${answer}\nEscolha a resposta correta.`,["VERMELHO","AZUL","VERDE","AMARELO"],c=>resolve(c===answer?rnd(20,80):rnd(350,600),"Cores"))}
function boxes(){modal("🎁 PROVA DAS CAIXAS","Escolha uma caixa. Sorte também faz parte do jogo.",["📦 1","📦 2","📦 3","📦 4"],()=>resolve(rnd(0,480),"Caixas"))}
function resolve(score,type){
 closeModal();let alive=alivePeople();let scores=alive.filter(p=>p!==me).map(p=>({p,score:rnd(45,450)}));scores.push({p:me,score});scores.sort((a,b)=>a.score-b.score);leader=scores[0].p.name;scores[0].p.wins++;stats.coins+=leader===me.name?150:25;
 addFeed(`🏆 ${leader} venceu a Prova de ${type}.`);toast(`👑 ${leader.toUpperCase()} É O CHEFE`);selectImmunity()
}
function selectImmunity(){let pool=alivePeople().filter(p=>p.name!==leader);immune=pick(pool).name;addFeed(`🛡️ ${immune} recebeu imunidade.`);phase="vote";let opts=alivePeople().filter(p=>p!==me&&p.name!==leader&&p.name!==immune);modal("⚠️ FORMAÇÃO DA ZONA DE RISCO","Vote em quem você quer colocar em risco.",opts.map(p=>p.name),vote)}
function vote(target){
 const tally={};alivePeople().forEach(p=>tally[p.name]=0);tally[target]++;
 alivePeople().filter(p=>p!==me).forEach(v=>{let o=alivePeople().filter(p=>p!==v&&p.name!==leader&&p.name!==immune);if(o.length)tally[pick(o).name]++});
 let valid=Object.entries(tally).filter(([n])=>n!==leader&&n!==immune).sort((a,b)=>b[1]-a[1]);let risk=valid.slice(0,3).map(e=>e[0]);
 addFeed("⚠️ Zona de Risco: "+risk.join(", "));closeModal();
 if(risk.length>=3)return bateVolta(risk,tally);eliminate(risk[0],tally)
}
function bateVolta(risk,tally){
 let saved=pick(risk);modal("🔁 BATE-VOLTA",`${risk.join(" • ")} disputaram a última chance.\n\n🟢 ${saved} escapou da Zona de Risco!`,["CONTINUAR"],()=>{closeModal();let remaining=risk.filter(n=>n!==saved);let out=pick(remaining);eliminate(out,tally)})
}
function eliminate(outName,tally){
 let p=people.find(p=>p.name===outName);p.alive=false;addFeed("🗳️ "+Object.entries(tally).filter(e=>e[1]>0).map(e=>`${e[0]} ${e[1]}`).join(" • "));addFeed(`🚪 ${outName} foi eliminado.`);toast(`${outName.toUpperCase()} FOI ELIMINADO`);
 if(!me.alive){phase="dead";return modal("VOCÊ FOI ELIMINADO",`Sua jornada terminou na rodada ${round}.`,["NOVA TEMPORADA"],()=>location.reload())}
 if(alivePeople().length<=3)return final();round++;time=70;phase="social";leader="";immune="";addFeed(`🌅 Começou a rodada ${round}.`)
}
function final(){phase="final";let a=alivePeople(),winner=pick(a);if(a.includes(me)){let chance=Math.min(.88,.32+(stats.social+stats.rep)/360+me.wins*.03);if(Math.random()<chance)winner=me}modal("🏆 FINAL DA TEMPORADA",`Vencedor: ${winner.name}\n\nFinalistas: ${a.map(p=>p.name).join(", ")}\nSeu perfil: ${trait}\nProvas: ${me.wins}\nAlianças: ${alliances.length?alliances.join(", "):"nenhuma"}\nMoedas: ${Math.round(stats.coins)}`,["NOVA TEMPORADA"],()=>location.reload())}

function draw(){
 ctx.clearRect(0,0,C.width,C.height);
 if(map.complete)ctx.drawImage(map,0,0,1024,765);else{ctx.fillStyle="#050812";ctx.fillRect(0,0,1024,765)}
 // leve sombra atrás dos personagens para integrá-los ao cenário
 people.filter(p=>p.alive).forEach(drawPerson);
 if(near){ctx.save();ctx.strokeStyle="#fff";ctx.lineWidth=2;ctx.setLineDash([4,4]);ctx.beginPath();ctx.arc(near.x,near.y,25,0,Math.PI*2);ctx.stroke();ctx.setLineDash([]);ctx.fillStyle="#fff";ctx.font="bold 11px system-ui";ctx.textAlign="center";ctx.fillText("E • conversar",near.x,near.y-34);ctx.restore()}
 if(doorNear&&!near){ctx.save();ctx.fillStyle="#07101ddd";ctx.strokeStyle="#52d5ff";ctx.lineWidth=1;ctx.fillRect(me.x-63,me.y-47,126,22);ctx.strokeRect(me.x-63,me.y-47,126,22);ctx.fillStyle="#fff";ctx.font="bold 10px system-ui";ctx.textAlign="center";ctx.fillText("F • usar porta",me.x,me.y-32);ctx.restore()}
}
function drawPerson(p){
 ctx.save();
 ctx.fillStyle="#0008";ctx.beginPath();ctx.ellipse(p.x,p.y+11,10,4,0,0,Math.PI*2);ctx.fill();
 const im=SPRITES[p.sprite];
 const dirs={down:0,left:1,right:2,up:3};
 const row=dirs[p.facing||"down"],frame=Math.floor(p.walkFrame||0)%4;
 if(im&&im.complete&&im.naturalWidth){
   // original source frame 24x32 rendered 1.25x for clearer pixel art
   ctx.drawImage(im,frame*24,row*32,24,32,Math.round(p.x-15),Math.round(p.y-23),30,40);
 }else{
   ctx.fillStyle=p.c;ctx.fillRect(p.x-8,p.y-5,16,20);ctx.beginPath();ctx.arc(p.x,p.y-12,8,0,Math.PI*2);ctx.fill()
 }
 ctx.font="bold 10px system-ui";ctx.textAlign="center";ctx.lineWidth=3;ctx.strokeStyle="#07101d";ctx.strokeText(p.name,p.x,p.y-29);ctx.fillStyle="#fff";ctx.fillText(p.name,p.x,p.y-29);
 if(p===me){ctx.strokeStyle="#57d9ff";ctx.lineWidth=2;ctx.beginPath();ctx.arc(p.x,p.y,18,0,Math.PI*2);ctx.stroke()}
 ctx.restore()
}
function ui(){
 document.querySelector("#energy").textContent=Math.round(stats.energy);document.querySelector("#social").textContent=Math.round(stats.social);document.querySelector("#rep").textContent=Math.round(stats.rep);document.querySelector("#coins").textContent=Math.round(stats.coins);
 document.querySelector("#roomBadge").textContent=roomAt(me?.x||480,me?.y||500);
 document.querySelector("#round").textContent=`RODADA ${round} • ${phase==="social"?"CONVIVÊNCIA":phase==="challenge"?"PROVA":"CERIMÔNIA"}`;
 document.querySelector("#timer").textContent=phase==="social"?`${String(Math.floor(Math.max(0,time)/60)).padStart(2,"0")}:${String(Math.ceil(Math.max(0,time)%60)).padStart(2,"0")}`:"EVENTO EM ANDAMENTO";
 document.querySelector("#event").textContent=eventName;
 document.querySelector("#players").innerHTML=people.map(p=>`<div class="person ${p.alive?"":"dead"}"><span class="dot" style="background:${p.c}"></span>${p.name}<span class="meta">${p.alive?p.mood:"eliminado"}</span></div>`).join("");
 document.querySelector("#feed").innerHTML=feed.map(f=>`<div class="eventline">${f}</div>`).join("")
}
function alivePeople(){return people.filter(p=>p.alive)}
function addFeed(t){feed.unshift(t);feed=feed.slice(0,11)}
function modal(title,text,choices,cb){document.querySelector("#modal").classList.remove("hidden");document.querySelector("#modalTitle").textContent=title;document.querySelector("#modalText").textContent=text;let q=document.querySelector("#choices");q.innerHTML="";choices.forEach(c=>{let b=document.createElement("button");b.className="choice";b.textContent=c;b.onclick=()=>cb(c);q.appendChild(b)})}
function closeModal(){document.querySelector("#modal").classList.add("hidden")}
function bubble(t){toast(t)}
function toast(t){let el=document.querySelector("#toast");el.textContent=t;el.classList.remove("hidden");setTimeout(()=>el.classList.add("hidden"),2200)}
function toggleMusic(){musicOn=!musicOn;document.querySelector("#musicBtn").textContent=`♫ Música ${musicOn?"ON":"OFF"}`;musicOn?startMusic():stopMusic()}
function startMusic(){if(!musicOn||musicTimer)return;try{audioCtx=audioCtx||new (window.AudioContext||window.webkitAudioContext)()}catch(e){return}let notes=[261.6,329.6,392,523.2,440,349.2,293.7,392],i=0;musicTimer=setInterval(()=>{let o=audioCtx.createOscillator(),g=audioCtx.createGain();o.type="triangle";o.frequency.value=notes[i++%notes.length];g.gain.setValueAtTime(.018,audioCtx.currentTime);g.gain.exponentialRampToValueAtTime(.001,audioCtx.currentTime+.2);o.connect(g);g.connect(audioCtx.destination);o.start();o.stop(audioCtx.currentTime+.21)},300)}
function stopMusic(){if(musicTimer){clearInterval(musicTimer);musicTimer=null}}
