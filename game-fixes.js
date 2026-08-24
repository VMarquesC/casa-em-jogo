// Ajustes de colisão das provas.
// Mantido separado do game.js para facilitar testar e remover correções sem mexer no arquivo principal.

(function(){
  const oldMazeWalkable = typeof mazeWalkableCanvas === "function" ? mazeWalkableCanvas : null;

  function mazePointSafe(x,y,r=5){
    if(!oldMazeWalkable)return false;
    if(!oldMazeWalkable(x,y,r))return false;

    // Segunda borda de segurança. O teste antigo usava poucos pontos e um raio bem pequeno,
    // então em quinas estreitas o personagem conseguia cortar parte da parede.
    const ring = 16;
    for(let i=0;i<ring;i++){
      const a=(Math.PI*2*i)/ring;
      const px=x+Math.cos(a)*r;
      const py=y+Math.sin(a)*r;
      if(!oldMazeWalkable(px,py,1.25))return false;
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
    mazeWalkableCanvas=function(x,y,r=5){
      return mazePointSafe(x,y,Math.max(4.5,r));
    };
  }

  if(typeof mazePlayerMove === "function"){
    mazePlayerMove=function(dx,dy,dt){
      if(!MAZE.active||!MAZE.started||!me||!me.alive||MAZE.finished)return;
      if(!Number.isFinite(dt)||dt<=0)return;

      const speed=108*(keys.shift?1.24:1);
      const len=Math.hypot(dx,dy)||1;
      const mx=dx/len*speed*dt;
      const my=dy/len*speed*dt;
      const steps=Math.max(1,Math.ceil(Math.max(Math.abs(mx),Math.abs(my))/.8));
      const sx=mx/steps,sy=my/steps;

      for(let i=0;i<steps;i++){
        const ox=me.x,oy=me.y;
        const nx=ox+sx,ny=oy+sy;

        // Primeiro tenta o movimento completo. Isso evita cortar diagonal por quina.
        if(mazeSegmentSafe(ox,oy,nx,ny,5.2)){
          me.x=nx;me.y=ny;
          continue;
        }

        // Se a diagonal não cabe, desliza por um eixo de cada vez.
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
    mazeNpcRace=function(p,dt){
      if(!p||p.mazeFinished||!MAZE.started||MAZE.finished)return;
      if(!Number.isFinite(dt)||dt<=0)return;

      if(p.mazeReaction>0){p.mazeReaction=Math.max(0,p.mazeReaction-dt);return}
      if(p.mazePause>0){p.mazePause=Math.max(0,p.mazePause-dt);return}

      if(!Array.isArray(p.mazeDynamicRoute)||p.mazeDynamicRoute.length<2){
        if(!mazeNpcRepath(p,true)){p.mazePause=.12;return}
      }

      let route=p.mazeDynamicRoute;
      let idx=Number.isFinite(p.mazeDynamicIndex)?Math.floor(p.mazeDynamicIndex):0;
      idx=Math.max(0,Math.min(route.length-1,idx));
      p.mazeDynamicIndex=idx;

      const target=route[idx];
      if(!target){mazeNpcRepath(p,true);return}

      let dx=target[0]-p.x,dy=target[1]-p.y;
      let d=Math.hypot(dx,dy);
      if(d<8){
        p.mazeDynamicIndex=Math.min(route.length-1,idx+1);
        if(p.mazeDynamicIndex>=route.length-1){
          if(mazeNearExit(p)){mazeFinishParticipant(p);return}
          mazeNpcRepath(p,true);
        }
        return;
      }
      if(!Number.isFinite(d)||d<.001){mazeNpcRepath(p,true);return}

      dx/=d;dy/=d;
      const skill=Number.isFinite(p.mazeSkill)?p.mazeSkill:.9;
      const speed=58+22*Math.max(.72,Math.min(1.18,skill));
      const mx=dx*speed*dt,my=dy*speed*dt;
      const steps=Math.max(1,Math.ceil(Math.max(Math.abs(mx),Math.abs(my))/.8));
      const sx=mx/steps,sy=my/steps;
      let moved=false;

      for(let i=0;i<steps;i++){
        const ox=p.x,oy=p.y,nx=ox+sx,ny=oy+sy;
        if(mazeSegmentSafe(ox,oy,nx,ny,4.8)){
          p.x=nx;p.y=ny;moved=true;
        }else{
          let slid=false;
          if(mazeSegmentSafe(ox,oy,ox+sx,oy,4.8)){p.x=ox+sx;slid=true}
          if(mazeSegmentSafe(p.x,p.y,p.x,p.y+sy,4.8)){p.y+=sy;slid=true}
          if(slid)moved=true;
          else break;
        }
      }

      const lx=Number.isFinite(p.mazeLastX)?p.mazeLastX:p.x;
      const ly=Number.isFinite(p.mazeLastY)?p.mazeLastY:p.y;
      const delta=Math.hypot(p.x-lx,p.y-ly);
      if(delta<1){p.mazeStuckTime=(p.mazeStuckTime||0)+dt}
      else{p.mazeStuckTime=0;p.mazeLastX=p.x;p.mazeLastY=p.y}

      if(!moved||p.mazeStuckTime>.65){
        p.mazePause=.05;
        mazeNpcRepath(p,true);
      }

      mazeProgressOf(p);
      if(mazeNearExit(p))mazeFinishParticipant(p);
    };
  }

  console.log("[Casa em Jogo] ajustes extras de colisão carregados");
})();
