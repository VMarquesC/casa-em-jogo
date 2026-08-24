const C=document.querySelector('#canvas'),x=C.getContext('2d'), keys={};
const names=["Luna","Caio","Bia","Noah","Maya","Davi","Nina"], colors=["#57c7ff","#ff6b8a","#ffd166","#8ee493","#c89bff","#ff9f68","#67e8d0","#eee"];
let people=[], me, round=1, time=40, phase="social", feed=[], leader="", immune="";
const rooms=[
 [25,25,350,250,"#d9b99b","SALA"],[385,25,550,250,"#c6d8aa","COZINHA"],
 [25,285,280,400,"#c6b7de","QUARTO"],[315,285,300,400,"#9fc5d6","LOUNGE"],[625,285,310,400,"#e4c6c6","CONFESSIONÁRIO"]
];
const rnd=(a,b)=>Math.random()*(b-a)+a;
function addFeed(t){feed.unshift(t);feed=feed.slice(0,8);renderUI()}
function start(){
 let n=document.querySelector('#name').value.trim()||"Jogador";
 people=[{name:n,x:470,y:400,c:colors[0],alive:true,human:true}];
 names.forEach((n,i)=>people.push({name:n,x:rnd(80,880),y:rnd(90,650),tx:rnd(80,880),ty:rnd(90,650),c:colors[i+1],alive:true}));
 me=people[0]; document.querySelector('#start').classList.remove('active');document.querySelector('#game').classList.add('active');
 addFeed("🎬 A temporada começou com 8 participantes."); addFeed("💬 Circule pela casa antes da votação."); requestAnimationFrame(loop)
}
document.querySelector('#play').onclick=start;
addEventListener('keydown',e=>keys[e.key.toLowerCase()]=true);addEventListener('keyup',e=>keys[e.key.toLowerCase()]=false);
let last=performance.now();
function loop(now){let dt=Math.min((now-last)/1000,.05);last=now;if(phase==="social")update(dt);draw();requestAnimationFrame(loop)}
function update(dt){
 if(me.alive){let dx=(keys.d||keys.arrowright?1:0)-(keys.a||keys.arrowleft?1:0),dy=(keys.s||keys.arrowdown?1:0)-(keys.w||keys.arrowup?1:0);let l=Math.hypot(dx,dy)||1;me.x=Math.max(45,Math.min(915,me.x+dx/l*210*dt));me.y=Math.max(50,Math.min(665,me.y+dy/l*210*dt))}
 people.slice(1).filter(p=>p.alive).forEach(p=>{let d=Math.hypot(p.tx-p.x,p.ty-p.y);if(d<8){p.tx=rnd(60,900);p.ty=rnd(60,650)}else{p.x+=(p.tx-p.x)/d*55*dt;p.y+=(p.ty-p.y)/d*55*dt}});
 time-=dt;if(time<=0)vote();renderUI()
}
function draw(){
 x.fillStyle="#172033";x.fillRect(0,0,960,720);
 rooms.forEach(r=>{x.fillStyle=r[4];x.fillRect(...r.slice(0,4));x.fillStyle="#3c4552";x.font="bold 15px sans-serif";x.fillText(r[5],r[0]+15,r[1]+25)});
 x.fillStyle="#8b5e83";x.fillRect(75,100,190,70);x.fillStyle="#b08862";x.fillRect(470,160,180,70);x.fillStyle="#7c6d9a";x.fillRect(65,390,160,100);x.fillStyle="#5c8aa0";x.fillRect(365,420,150,70);x.fillStyle="#18202c";x.fillRect(700,390,100,120);
 people.filter(p=>p.alive).forEach(p=>person(p))
}
function person(p){x.fillStyle="#0004";x.beginPath();x.ellipse(p.x,p.y+15,16,7,0,0,7);x.fill();x.fillStyle=p.c;x.fillRect(p.x-11,p.y-3,22,25);x.beginPath();x.arc(p.x,p.y-12,12,0,7);x.fill();x.fillStyle="#172033";x.font="12px sans-serif";x.textAlign="center";x.fillText(p.name,p.x,p.y-31);x.textAlign="left";if(p===me){x.strokeStyle="white";x.lineWidth=2;x.beginPath();x.arc(p.x,p.y,22,0,7);x.stroke()}}
function alive(){return people.filter(p=>p.alive)}
function vote(){
 phase="vote";let a=alive();leader=a[Math.floor(Math.random()*a.length)].name;let pool=a.filter(p=>p.name!==leader);immune=pool[Math.floor(Math.random()*pool.length)].name;
 addFeed(`👑 ${leader} virou Chefe da Casa.`);addFeed(`🛡️ ${immune} recebeu proteção.`);
 let opts=a.filter(p=>p!==me&&p.name!==leader&&p.name!==immune);
 modal("VOTAÇÃO SECRETA","Quem você quer colocar em risco?",opts.map(p=>p.name),finishVote)
}
function finishVote(target){
 let tally={};alive().forEach(p=>tally[p.name]=0);tally[target]++;
 alive().filter(p=>p!==me).forEach(v=>{let o=alive().filter(p=>p!==v&&p.name!==leader&&p.name!==immune);if(o.length)tally[o[Math.floor(Math.random()*o.length)].name]++});
 let max=-1,top=[];Object.entries(tally).forEach(([n,v])=>{if(n===leader||n===immune)return;if(v>max){max=v;top=[n]}else if(v===max)top.push(n)});
 let out=top[Math.floor(Math.random()*top.length)], p=people.find(p=>p.name===out);p.alive=false;
 addFeed("🗳️ "+Object.entries(tally).filter(e=>e[1]).map(e=>`${e[0]} ${e[1]}`).join(" • "));addFeed(`🚪 ${out} foi eliminado.`);
 closeModal(); if(!me.alive){phase="dead";return modal("VOCÊ FOI ELIMINADO",`Sua jornada terminou na rodada ${round}.`,["NOVA TEMPORADA"],()=>location.reload())}
 if(alive().length<=3)return final();round++;time=40;phase="social";leader="";immune=""
}
function final(){phase="final";let a=alive(),winner=a[Math.floor(Math.random()*a.length)];if(a.includes(me)&&Math.random()<.55)winner=me;addFeed(`🏆 ${winner.name} venceu a temporada!`);modal("FINAL DA TEMPORADA",`🏆 Vencedor: ${winner.name}\nFinalistas: ${a.map(p=>p.name).join(", ")}`,["NOVA TEMPORADA"],()=>location.reload())}
function modal(title,text,choices,cb){let m=document.querySelector('#modal');m.classList.remove('hidden');document.querySelector('#modalTitle').textContent=title;document.querySelector('#modalText').textContent=text;let q=document.querySelector('#choices');q.innerHTML="";choices.forEach(c=>{let b=document.createElement('button');b.className="choice";b.textContent=c;b.onclick=()=>cb(c);q.appendChild(b)})}
function closeModal(){document.querySelector('#modal').classList.add('hidden')}
function renderUI(){document.querySelector('#round').textContent=`RODADA ${round} • ${phase==="social"?"CONVIVÊNCIA":"CERIMÔNIA"}`;document.querySelector('#timer').textContent=phase==="social"?`Cerimônia em 00:${String(Math.max(0,Math.ceil(time))).padStart(2,"0")}`:"Votação em andamento";document.querySelector('#players').innerHTML=people.map(p=>`<div class="person ${p.alive?"":"dead"}">${p.alive?"●":"×"} ${p.name}</div>`).join("");document.querySelector('#feed').innerHTML=feed.map(f=>`<div class="event">${f}</div>`).join("")}
