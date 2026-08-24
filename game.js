const C=document.querySelector('#canvas'),ctx=C.getContext('2d');
const keys={}, BOT_NAMES=["Luna","Caio","Bia","Noah","Maya","Davi","Nina"];
const COLORS=["#57c7ff","#ff6b8a","#ffd166","#8ee493","#c89bff","#ff9f68","#67e8d0","#eeeeee"];
const moods=["Conversando","Desconfiado","Planejando","Relaxando","Observando"];
const phrases=[
 "Acho que tem uma aliança escondida rolando.",
 "Hoje eu não confio em ninguém.",
 "Se eu ganhar a prova, vou causar.",
 "Você viu com quem a Luna estava falando?",
 "Tem gente jogando dos dois lados.",
 "Eu prometi meu voto, mas posso mudar.",
 "A casa está muito estranha hoje.",
 "Acho que alguém está mentindo sobre o voto."
];
let people=[],me,round=1,time=55,phase="social",feed=[],leader="",immune="",eventName="",trait="Social",playerColor=COLORS[0];
let last=performance.now(),interactionCooldown=0,eventCooldown=16,proximityTarget=null;
let stats={social:50,rep:50,energy:100}, alliances=[], roomActionCooldown=0;
let musicOn=true,audioCtx=null,musicTimer=null,challengeIndex=0;
const gossipHistory=[];
const house={x:20,y:20,w:960,h:680};
const rooms=[
 {x:35,y:35,w:355,h:245,c:"#d9b99b",name:"SALA"},
 {x:400,y:35,w:565,h:245,c:"#c6d8aa",name:"COZINHA"},
 {x:35,y:290,w:290,h:375,c:"#c6b7de",name:"QUARTO"},
 {x:335,y:290,w:305,h:375,c:"#9fc5d6",name:"LOUNGE"},
 {x:650,y:290,w:315,h:375,c:"#e4c6c6",name:"CONFESSIONÁRIO"}
];
const furniture=[
 ["#8b5e83",90,110,190,70],["#6f4569",105,180,160,18],
 ["#6e8050",470,105,260,38],["#b08862",500,185,180,70],
 ["#7c6d9a",85,390,175,100],["#5c8aa0",390,415,160,80],
 ["#8f6d75",705,390,150,180],["#18202c",735,430,90,95]
];
const rnd=(a,b)=>Math.random()*(b-a)+a;
const pick=a=>a[Math.floor(Math.random()*a.length)];

function initCreator(){
 const box=document.querySelector('#colors');
 COLORS.slice(0,7).forEach((c,i)=>{let d=document.createElement('button');d.className='color-dot'+(i===0?' selected':'');d.style.background=c;d.onclick=()=>{document.querySelectorAll('.color-dot').forEach(x=>x.classList.remove('selected'));d.classList.add('selected');playerColor=c};box.appendChild(d)});
 document.querySelectorAll('.trait').forEach(b=>b.onclick=()=>{document.querySelectorAll('.trait').forEach(x=>x.classList.remove('selected'));b.classList.add('selected');trait=b.dataset.trait});
}
initCreator();

document.querySelector('#play').onclick=start;
document.querySelector('#musicBtn').onclick=toggleMusic;
document.querySelector('#newsBtn').onclick=showGossip;
document.querySelector('#chatClose').onclick=()=>document.querySelector('#chatBox').classList.add('hidden');
addEventListener('keydown',e=>{
 keys[e.key.toLowerCase()]=true;
 if(e.key.toLowerCase()==='e' && phase==='social') interact();
 if(e.key.toLowerCase()==='f' && phase==='social') roomAction();
});
addEventListener('keyup',e=>keys[e.key.toLowerCase()]=false);

function start(){
 let n=document.querySelector('#name').value.trim()||"Jogador";
 people=[makePerson(n,485,420,playerColor,true)];
 BOT_NAMES.forEach((n,i)=>people.push(makePerson(n,rnd(85,915),rnd(90,635),COLORS[i+1],false)));
 me=people[0];
 document.querySelector('#start').classList.remove('active');document.querySelector('#game').classList.add('active');
 addFeed(`🎬 ${n} entrou na Casa como perfil ${trait}.`);
 addFeed("💬 Circule pelos cômodos. Chegue perto de alguém e pressione E.");
 toast("TEMPORADA 1 • DIA 1");
 startMusic();
 requestAnimationFrame(loop);
}
function makePerson(name,x,y,c,human){return{name,x,y,c,human,alive:true,tx:rnd(70,925),ty:rnd(70,640),mood:pick(moods),trust:{},wins:0}}

function loop(now){
 let dt=Math.min((now-last)/1000,.05);last=now;
 if(phase==="social")update(dt);
 draw();renderUI();requestAnimationFrame(loop);
}

function update(dt){
 interactionCooldown=Math.max(0,interactionCooldown-dt);
 roomActionCooldown=Math.max(0,roomActionCooldown-dt);
 stats.energy=Math.max(0,stats.energy-dt*.12);
 eventCooldown-=dt;
 if(me.alive){
  let dx=(keys.d||keys.arrowright?1:0)-(keys.a||keys.arrowleft?1:0);
  let dy=(keys.s||keys.arrowdown?1:0)-(keys.w||keys.arrowup?1:0);
  let l=Math.hypot(dx,dy)||1;
  me.x=Math.max(48,Math.min(952,me.x+dx/l*220*dt));
  me.y=Math.max(55,Math.min(648,me.y+dy/l*220*dt));
 }
 people.slice(1).filter(p=>p.alive).forEach(p=>{
  let d=Math.hypot(p.tx-p.x,p.ty-p.y);
  if(d<10){p.tx=rnd(60,940);p.ty=rnd(60,645);p.mood=pick(moods)}
  else{p.x+=(p.tx-p.x)/d*58*dt;p.y+=(p.ty-p.y)/d*58*dt}
 });
 proximityTarget=findNearby();
 if(eventCooldown<=0){randomEvent();eventCooldown=rnd(18,28)}
 time-=dt;if(time<=0)startChallenge();
}

function findNearby(){
 let best=null,bd=999;
 people.filter(p=>p.alive&&p!==me).forEach(p=>{let d=Math.hypot(p.x-me.x,p.y-me.y);if(d<70&&d<bd){best=p;bd=d}});
 return best;
}
function interact(){
 if(interactionCooldown>0)return;
 interactionCooldown=2;
 if(proximityTarget){
   openChat(proximityTarget);
 } else if(me.x>650 && me.y>290){
   confessionary();
 } else bubble("Chegue mais perto de alguém para conversar.");
}
function confessionary(){
 modal("CONFESSIONÁRIO","Você pode registrar uma fofoca anônima que talvez apareça para a casa.",[
  "Acho que existe uma aliança secreta.",
  "Alguém está mentindo sobre os votos.",
  "Tem participante jogando dos dois lados."
 ],choice=>{
   closeModal();addFeed("🎥 Uma mensagem anônima foi registrada no confessionário.");
   setTimeout(()=>addFeed(`📺 FOFOCA DA CASA: "${choice}"`),1200);
 });
}

function currentRoom(){
 for(const r of rooms) if(me.x>=r.x&&me.x<=r.x+r.w&&me.y>=r.y&&me.y<=r.y+r.h) return r.name;
 return "";
}
function roomAction(){
 if(roomActionCooldown>0)return;
 roomActionCooldown=5;
 const r=currentRoom();
 if(r==="COZINHA"){
   stats.energy=Math.min(100,stats.energy+18);addFeed("🍕 Você preparou um lanche e recuperou energia.");bubble("+18 energia");
 }else if(r==="SALA"){
   stats.social=Math.min(100,stats.social+5);addFeed("🛋️ Você passou um tempo socializando na sala.");bubble("+5 social");
 }else if(r==="QUARTO"){
   stats.energy=Math.min(100,stats.energy+25);addFeed("🛏️ Você descansou um pouco no quarto.");bubble("+25 energia");
 }else if(r==="LOUNGE"){
   stats.rep=Math.min(100,stats.rep+4);addFeed("🎲 Você participou de uma atividade no lounge.");bubble("+4 reputação");
 }else if(r==="CONFESSIONÁRIO"){
   confessionary();
 }else bubble("Não há nenhuma ação aqui.");
}


function openChat(p){
 const box=document.querySelector('#chatBox'),log=document.querySelector('#chatLog'),opts=document.querySelector('#chatOpts');
 box.classList.remove('hidden');document.querySelector('#chatName').textContent=`💬 ${p.name}`;
 log.innerHTML=`<div><b>${p.name}:</b> ${pick(phrases)}</div>`;
 opts.innerHTML="";
 const options=[
  ["Perguntar em quem vai votar",()=>chatReply(p,`Ainda não decidi... mas estou de olho em ${pick(alivePeople().filter(q=>q!==p)).name}.`,2)],
  ["Propor aliança",()=>{if(!alliances.includes(p.name))alliances.push(p.name);chatReply(p,"Fechado. Mas isso fica entre a gente.",5);addFeed(`🤝 Você e ${p.name} formaram uma aliança.`)}],
  ["Contar uma fofoca",()=>{let g=`${pick(alivePeople()).name} está articulando votos.`;gossipHistory.unshift(g);chatReply(p,"Sério? Vou ficar de olho nisso.",3);addFeed(`🗣️ Você espalhou uma fofoca para ${p.name}.`)}],
  ["Provocar",()=>{stats.rep=Math.max(0,stats.rep-3);chatReply(p,"Qual é o seu problema?!",-1);addFeed(`🔥 Você provocou ${p.name}.`)}]
 ];
 options.forEach(([t,fn])=>{let b=document.createElement('button');b.textContent=t;b.onclick=fn;opts.appendChild(b)})
}
function chatReply(p,text,social){
 document.querySelector('#chatLog').innerHTML+=`<div style="margin-top:9px"><b>${p.name}:</b> ${text}</div>`;
 stats.social=Math.max(0,Math.min(100,stats.social+social));
}
function showGossip(){
 const base=gossipHistory.length?gossipHistory.slice(0,5):["Ainda não existem fofocas registradas nesta temporada."];
 modal("📺 CENTRAL DE FOFOCAS",base.join("\\n\\n"),["FECHAR"],closeModal)
}
function toggleMusic(){musicOn=!musicOn;document.querySelector('#musicBtn').textContent=`♫ Música: ${musicOn?"ON":"OFF"}`;if(musicOn)startMusic();else stopMusic()}
function startMusic(){
 if(!musicOn||musicTimer)return;
 try{audioCtx=audioCtx||new (window.AudioContext||window.webkitAudioContext)()}catch(e){return}
 const notes=[261.63,329.63,392,523.25,392,329.63,293.66,349.23,440,349.23,293.66,246.94];let i=0;
 musicTimer=setInterval(()=>{if(!musicOn)return;let o=audioCtx.createOscillator(),g=audioCtx.createGain();o.type="triangle";o.frequency.value=notes[i++%notes.length];g.gain.setValueAtTime(.025,audioCtx.currentTime);g.gain.exponentialRampToValueAtTime(.001,audioCtx.currentTime+.18);o.connect(g);g.connect(audioCtx.destination);o.start();o.stop(audioCtx.currentTime+.2)},280)
}
function stopMusic(){if(musicTimer){clearInterval(musicTimer);musicTimer=null}}

function randomEvent(){
 if(phase!=="social")return;
 const events=[
  ["📞 TELEFONE DA CASA","Um telefone tocou. Um jogador recebeu uma vantagem secreta."],
  ["🎉 FESTA","A festa aumentou a movimentação e as conversas pela casa."],
  ["👀 VOTOS REVELADOS","A produção avisou: os votos desta rodada poderão ser exibidos."],
  ["⚡ PODER SECRETO","Existe um poder escondido em algum lugar da casa."],
  ["🍿 CINEMA DA CASA","A produção exibiu momentos da temporada e aumentou a paranoia."],
  ["🧨 VOTO DUPLO","Um participante receberá voto com peso dois nesta rodada."],
  ["💌 CORREIO ANÔNIMO","Uma mensagem anônima apareceu na sala."],
  ["🎭 FESTA À FANTASIA","A casa entrou em modo festa e as conversas valem mais Social."]
 ];
 const e=pick(events);eventName=e[0];addFeed(`${e[0]} ${e[1]}`);toast(e[0]);setTimeout(()=>{eventName=""},5500)
}

function startChallenge(){
 phase="challenge";challengeIndex=(challengeIndex+1)%3;
 if(challengeIndex===0)return reactionChallenge();
 if(challengeIndex===1)return memoryChallenge();
 return luckChallenge();
}
function reactionChallenge(){
 const alive=alivePeople(),target=Math.floor(rnd(500,950));
 modal("⚡ PROVA DO REFLEXO",`Clique o mais perto possível de ${target} ms depois do sinal.`,["COMEÇAR"],()=>{
  const q=document.querySelector('#choices');q.innerHTML='';document.querySelector('#modalText').textContent="Prepare-se...";
  setTimeout(()=>{let b=document.createElement('button');b.className='choice';b.textContent='AGORA!';q.appendChild(b);let s=performance.now();b.onclick=()=>resolveChallenge(Math.abs((performance.now()-s)-target),"Reflexo")},rnd(700,1600))
 })
}
function memoryChallenge(){
 const seq=Array.from({length:4},()=>pick(["🔴","🔵","🟢","🟡"]));
 modal("🧠 PROVA DA MEMÓRIA",`Memorize: ${seq.join("  ")}`,["MEMORIZEI"],()=>{
  setTimeout(()=>{let correct=seq.join("");let opts=[correct,[...seq].reverse().join(""),[...seq].sort(()=>Math.random()-.5).join("")];opts=[...new Set(opts)].sort(()=>Math.random()-.5);modal("🧠 QUAL ERA A SEQUÊNCIA?","Escolha a sequência correta.",opts,c=>resolveChallenge(c===correct?rnd(20,90):rnd(350,650),"Memória"))},350)
 })
}
function luckChallenge(){
 const boxes=["📦 Caixa 1","📦 Caixa 2","📦 Caixa 3","📦 Caixa 4"];
 modal("🎁 PROVA DAS CAIXAS","Uma das caixas contém a vitória. Escolha.",boxes,c=>resolveChallenge(rnd(0,500),"Caixas"))
}
function resolveChallenge(playerScore,type){
 closeModal();let a=alivePeople(),scores=a.filter(p=>p!==me).map(p=>({p,score:rnd(45,470)}));scores.push({p:me,score:playerScore});scores.sort((a,b)=>a.score-b.score);leader=scores[0].p.name;scores[0].p.wins++;addFeed(`🏆 ${leader} venceu a Prova de ${type}.`);toast(`👑 ${leader.toUpperCase()} É O CHEFE`);selectImmunity()
}
function selectImmunity(){
 const pool=alivePeople().filter(p=>p.name!==leader);
 immune=pick(pool).name;
 addFeed(`🛡️ ${immune} recebeu proteção nesta rodada.`);
 phase="vote";
 const opts=alivePeople().filter(p=>p!==me&&p.name!==leader&&p.name!==immune);
 if(opts.length===0){finishRound();return}
 modal("VOTAÇÃO SECRETA","Quem você quer colocar em risco?",opts.map(p=>p.name),finishVote);
}

function finishVote(target){
 const tally={};alivePeople().forEach(p=>tally[p.name]=0);
 tally[target]++;
 alivePeople().filter(p=>p!==me).forEach(v=>{
   let options=alivePeople().filter(p=>p!==v&&p.name!==leader&&p.name!==immune);
   if(options.length)tally[pick(options).name]++;
 });
 let entries=Object.entries(tally).filter(([n])=>n!==leader&&n!==immune);
 let max=Math.max(...entries.map(e=>e[1]));
 let top=entries.filter(e=>e[1]===max).map(e=>e[0]);
 let outName=pick(top);
 let out=people.find(p=>p.name===outName);out.alive=false;
 addFeed("🗳️ "+Object.entries(tally).filter(e=>e[1]>0).map(e=>`${e[0]} ${e[1]}`).join(" • "));
 addFeed(`🚪 ${outName} foi eliminado da Casa.`);
 toast(`${outName.toUpperCase()} FOI ELIMINADO`);
 closeModal();
 if(!me.alive){phase="dead";return modal("VOCÊ FOI ELIMINADO",`Sua jornada terminou na rodada ${round}.\nVocê pode iniciar uma nova temporada.`,["NOVA TEMPORADA"],()=>location.reload())}
 if(alivePeople().length<=3)return final();
 finishRound();
}
function finishRound(){round++;time=55;phase="social";leader="";immune="";addFeed(`🌅 Começou a rodada ${round}.`)}
function final(){
 phase="final";let a=alivePeople(),winner=pick(a);
 if(a.includes(me)){
   const chance=Math.min(.82,.35+(stats.social+stats.rep)/400);
   if(Math.random()<chance)winner=me;
 }
 addFeed(`🏆 ${winner.name} venceu a temporada!`);
 modal("FINAL DA TEMPORADA",`🏆 Vencedor: ${winner.name}\n\nFinalistas: ${a.map(p=>p.name).join(", ")}\n\nSeu perfil: ${trait}\nAlianças: ${alliances.length?alliances.join(", "):"nenhuma"}\nSocial: ${Math.round(stats.social)} • Reputação: ${Math.round(stats.rep)}`,["NOVA TEMPORADA"],()=>location.reload());
}

function draw(){
 ctx.fillStyle="#172033";ctx.fillRect(0,0,1000,720);
 ctx.fillStyle="#1e293b";ctx.fillRect(10,10,980,700);
 rooms.forEach(r=>{ctx.fillStyle=r.c;ctx.fillRect(r.x,r.y,r.w,r.h);ctx.strokeStyle="#5c5148";ctx.lineWidth=7;ctx.strokeRect(r.x,r.y,r.w,r.h);ctx.fillStyle="#3b4653";ctx.font="bold 14px sans-serif";ctx.fillText(r.name,r.x+16,r.y+25)});
 furniture.forEach(f=>{ctx.fillStyle=f[0];ctx.fillRect(f[1],f[2],f[3],f[4])});
 // decorative plants / details
 [[320,90],[905,95],[285,610],[595,610]].forEach(p=>{ctx.fillStyle="#315b42";ctx.fillRect(p[0]-7,p[1],14,25);ctx.fillStyle="#67a86f";ctx.beginPath();ctx.arc(p[0],p[1],13,0,7);ctx.fill()});
 people.filter(p=>p.alive).forEach(drawPerson);
 if(proximityTarget&&phase==="social"){ctx.strokeStyle="#f8fafc";ctx.lineWidth=2;ctx.setLineDash([5,5]);ctx.beginPath();ctx.arc(proximityTarget.x,proximityTarget.y,30,0,7);ctx.stroke();ctx.setLineDash([]);ctx.fillStyle="#fff";ctx.font="12px sans-serif";ctx.textAlign="center";ctx.fillText("E • conversar",proximityTarget.x,proximityTarget.y-42);ctx.textAlign="left"}
}
function drawPerson(p){
 ctx.fillStyle="#0004";ctx.beginPath();ctx.ellipse(p.x,p.y+16,16,7,0,0,7);ctx.fill();
 ctx.fillStyle=p.c;ctx.fillRect(p.x-12,p.y-2,24,26);ctx.beginPath();ctx.arc(p.x,p.y-13,12,0,7);ctx.fill();
 // hair
 ctx.fillStyle="#263247";ctx.fillRect(p.x-10,p.y-22,20,7);
 // face
 ctx.fillStyle="#18202c";ctx.fillRect(p.x-5,p.y-15,2,2);ctx.fillRect(p.x+4,p.y-15,2,2);
 ctx.fillStyle="#172033";ctx.font="12px sans-serif";ctx.textAlign="center";ctx.fillText(p.name,p.x,p.y-34);ctx.textAlign="left";
 if(p===me){ctx.strokeStyle="white";ctx.lineWidth=2;ctx.beginPath();ctx.arc(p.x,p.y,23,0,7);ctx.stroke()}
}

function alivePeople(){return people.filter(p=>p.alive)}
function addFeed(t){feed.unshift(t);feed=feed.slice(0,10)}
function renderUI(){
 document.querySelector('#round').textContent=`RODADA ${round} • ${phase==="social"?"CONVIVÊNCIA":phase==="challenge"?"PROVA":"CERIMÔNIA"}`;
 document.querySelector('#timer').textContent=phase==="social"?`Cerimônia em 00:${String(Math.max(0,Math.ceil(time))).padStart(2,"0")}`:"Rodada especial em andamento";
 document.querySelector('#eventBadge').textContent=eventName;
 document.querySelector('#players').innerHTML=people.map(p=>`<div class="person ${p.alive?"":"dead"}"><span class="dot" style="background:${p.c}"></span><span>${p.name}</span><span class="meta">${p.alive?p.mood:"eliminado"}</span></div>`).join("");
 document.querySelector('#feed').innerHTML=feed.map(f=>`<div class="event">${f}</div>`).join("");
 document.querySelector('#socialStat').textContent=Math.round(stats.social);
 document.querySelector('#repStat').textContent=Math.round(stats.rep);
 document.querySelector('#energyStat').textContent=Math.round(stats.energy);
}
function modal(title,text,choices,cb){
 const m=document.querySelector('#modal');m.classList.remove('hidden');
 document.querySelector('#modalTitle').textContent=title;document.querySelector('#modalText').textContent=text;
 const q=document.querySelector('#choices');q.innerHTML="";
 choices.forEach(c=>{const b=document.createElement('button');b.className="choice";b.textContent=c;b.onclick=()=>cb(c);q.appendChild(b)})
}
function closeModal(){document.querySelector('#modal').classList.add('hidden')}
function bubble(text){
 const b=document.querySelector('#chatBubble');b.textContent=text;b.classList.remove('hidden');setTimeout(()=>b.classList.add('hidden'),2600)
}
function toast(text){
 const t=document.querySelector('#toast');t.textContent=text;t.classList.remove('hidden');setTimeout(()=>t.classList.add('hidden'),2200)
}
