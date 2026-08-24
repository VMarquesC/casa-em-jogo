// Ajustes das provas e pequenas correções sem mexer no game.js principal.

(function(){
  const oldMazeWalkable = typeof mazeWalkableCanvas === "function" ? mazeWalkableCanvas : null;

  function mazePointSafe(x,y,r=5){
    if(!oldMazeWalkable || !oldMazeWalkable(x,y,r))return false;
    for(let i=0;i<16;i++){
      const a=(Math.PI*2*i)/16;
      if(!oldMazeWalkable(x+Math.cos(a)*r,y+Math.sin(a)*r,1.25))return false;
    }
    return true;
  }

  function mazeSegmentSafe(x1,y1,x2,y2,r=5){
    const dist=Math.hypot(x2-x1,y2-y1);
    const steps=Math.max(1,Math.ceil(dist/.7));
    for(let i=1;i<=steps;i++){
      const t=i/steps;
      if(!mazePointSafe(x1+(x2-x1)*t,y1+(y2-y1)*t,r))return false;
    }
    return true;
  }

  if(oldMazeWalkable){
    mazeWalkableCanvas=function(x,y,r=5){return mazePointSafe(x,y,Math.max(4.5,r))};
  }

  if(typeof mazePlayerMove === "function"){
    mazePlayerMove=function(dx,dy,dt){
      if(!MAZE.active||!MAZE.started||!me||!me.alive||MAZE.finished)return;
      if(!Number.isFinite(dt)||dt<=0)return;
      const speed=108*(keys.shift?1.24:1),len=Math.hypot(dx,dy)||1;
      const mx=dx/len*speed*dt,my=dy/len*speed*dt;
      const steps=Math.max(1,Math.ceil(Math.max(Math.abs(mx),Math.abs(my))/.8));
      const sx=mx/steps,sy=my/steps;

      for(let i=0;i<steps;i++){
        const ox=me.x,oy=me.y,nx=ox+sx,ny=oy+sy;
        if(mazeSegmentSafe(ox,oy,nx,ny,5.2)){me.x=nx;me.y=ny;continue}
        let moved=false;
        if(Math.abs(sx)>=Math.abs(sy)){
          if(mazeSegmentSafe(ox,oy,ox+sx,oy,5.2)){me.x=ox+sx;moved=true}
          if(mazeSegmentSafe(me.x,me.y,me.x,me.y+sy,5.2)){me.y+=sy;moved=true}
        }else{
          if(mazeSegmentSafe(ox,oy,ox,oy+sy,5.2)){me.y=oy+sy;moved=true}
          if(mazeSegmentSafe(me.x,me.y,me.x+sx,me.y,5.2)){me.x+=sx;moved=true}
        }
        if(!moved)break;
      }
      mazeProgressOf(me);
      if(mazeNearExit(me))mazeFinishParticipant(me);
    };
  }

  if(typeof mazeNpcRace === "function"){
    const originalNpcRace=mazeNpcRace;
    mazeNpcRace=function(p,dt){
      const bx=p&&p.x,by=p&&p.y;
      originalNpcRace(p,dt);
      if(!p||!Number.isFinite(bx)||!Number.isFinite(by))return;
      if(!mazeSegmentSafe(bx,by,p.x,p.y,4.8)){
        p.x=bx;p.y=by;
        p.mazeStuckTime=(p.mazeStuckTime||0)+dt;
        if(typeof mazeNpcRepath==="function")mazeNpcRepath(p,true);
      }
    };
  }

  // Evita teclas ficarem presas depois de trocar de aba ou perder o foco.
  function clearHeldKeys(){
    if(typeof keys!=="object"||!keys)return;
    for(const k of Object.keys(keys))keys[k]=false;
  }
  window.addEventListener("blur",clearHeldKeys);
  document.addEventListener("visibilitychange",()=>{if(document.hidden)clearHeldKeys()});

  // Testes simples que podem ser rodados no console com testChallenges().
  window.testChallenges=function(){
    const result=[];
    const check=(name,fn)=>{
      try{const ok=fn();result.push({teste:name,status:ok?"OK":"FALHOU"})}
      catch(err){result.push({teste:name,status:"ERRO",erro:err.message})}
    };

    check("funções das provas",()=>[reaction,memory,resistance,colors,boxes,resolve].every(f=>typeof f==="function"));
    check("labirinto",()=>typeof MAZE==="object"&&typeof mazePlayerMove==="function"&&typeof mazeUpdate==="function");
    check("colisão do labirinto",()=>typeof mazeWalkableCanvas==="function"&&typeof mazeSegmentSafe==="function");
    check("estado do jogador",()=>!me||(Number.isFinite(me.x)&&Number.isFinite(me.y)));
    check("participantes",()=>Array.isArray(people));
    console.table(result);
    return result;
  };

  // Atalho de desenvolvimento: T roda os testes sem interferir na partida.
  window.addEventListener("keydown",e=>{
    if((e.key==="t"||e.key==="T")&&!e.ctrlKey&&!e.altKey&&!e.metaKey){
      const tag=(e.target&&e.target.tagName)||"";
      if(tag!=="INPUT"&&tag!=="TEXTAREA")window.testChallenges();
    }
  });

  console.log("[Casa em Jogo] correções extras carregadas. T = testes das provas");
})();
