'use strict';
const stage = document.getElementById('stage');
const stageViewport = document.getElementById('stageViewport');
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const screens = {start:document.getElementById('startScreen'),game:document.getElementById('gameScreen'),end:document.getElementById('endScreen')};
const scoreValue=document.getElementById('scoreValue'),timeValue=document.getElementById('timeValue'),finalScore=document.getElementById('finalScore'),progressBar=document.getElementById('progressBar'),comboMessage=document.getElementById('comboMessage');
let state='start',score=0,timeLeft=30,lastTime=0,spawnTimer=0,items=[],particles=[],combo=0,comboUntil=0,raf=0;
const player={x:540,y:1560,w:232,h:350,targetX:540};
const DPR=1;

// Imagens oficiais aplicadas na versão granado-v8.
const gameAssets={
  background:new Image(),
  banana:new Image(),
  leaf:new Image(),
  flower:new Image(),
  spark:new Image(),
  perfume:new Image()
};
const assetSources={
  background:'assets/game/fundo-game.png',
  banana:'assets/game/icon-banana.png',
  leaf:'assets/game/icon-folha.png',
  flower:'assets/game/icon-flor.png',
  spark:'assets/game/icon-particula.png',
  perfume:'assets/game/perfume.png'
};
const assetCrops={
  banana:{x:20,y:33,w:364,h:351},
  leaf:{x:1,y:4,w:377,h:362},
  flower:{x:3,y:58,w:378,h:312},
  spark:{x:7,y:130,w:291,h:224}
};
const assetsPromise=Promise.all(Object.entries(gameAssets).map(([key,img])=>new Promise((resolve,reject)=>{
  img.onload=resolve;
  img.onerror=()=>reject(new Error(`Falha ao carregar ${assetSources[key]}`));
  img.src=assetSources[key];
}))).catch(error=>{console.error(error);});
function fitStage(){
  const viewportWidth=Math.max(1,document.documentElement.clientWidth);
  const viewportHeight=Math.max(1,document.documentElement.clientHeight);
  const scale=Math.min(viewportWidth/1080,viewportHeight/1920);
  const scaledWidth=1080*scale;
  const scaledHeight=1920*scale;
  stageViewport.style.width=`${scaledWidth}px`;
  stageViewport.style.height=`${scaledHeight}px`;
  stage.style.transform=`scale(${scale})`;
}
window.addEventListener('resize',fitStage,{passive:true});
window.addEventListener('orientationchange',fitStage,{passive:true});
fitStage();

function show(name){Object.values(screens).forEach(s=>s.classList.remove('active'));screens[name].classList.add('active');stage.classList.toggle('is-start',name==='start');state=name;}
function seedGarden(){
  // Somente folhas decorativas na abertura; nenhuma bolinha/flor branca é criada.
  [['gardenBack',11],['gardenMid',8],['gardenFront',6]].forEach(([id,n])=>{
    const el=document.getElementById(id);
    el.innerHTML='';
    for(let i=0;i<n;i++){
      const leaf=document.createElement('i');
      leaf.className='leaf';
      leaf.style.left=`${-8+Math.random()*100}%`;
      leaf.style.top=`${8+Math.random()*82}%`;
      leaf.style.setProperty('--leaf-rotation',`${(-70+Math.random()*140).toFixed(2)}deg`);
      leaf.style.setProperty('--leaf-scale',`${(.7+Math.random()*.8).toFixed(3)}`);
      leaf.style.animationDelay=`${Math.random()*-5}s`;
      el.appendChild(leaf);
    }
  });
}
seedGarden();
async function startGame(){await assetsPromise;score=0;timeLeft=30;lastTime=performance.now();spawnTimer=0;items=[];particles=[];combo=0;comboUntil=0;player.x=player.targetX=540;scoreValue.textContent='0';timeValue.textContent='30';progressBar.style.width='0%';show('game');cancelAnimationFrame(raf);raf=requestAnimationFrame(loop)}
function endGame(){cancelAnimationFrame(raf);finalScore.textContent=score.toLocaleString('pt-BR');document.getElementById('endMessage').innerHTML='Acesse nosso QR Code e confira<br>a surpresa que temos para você!';show('end')}
function spawnItem(){const roll=Math.random();let type=roll<.57?'banana':roll<.77?'flower':roll<.93?'spark':'leaf';const size=type==='banana'?100:type==='leaf'?105:type==='flower'?84:58;items.push({type,x:80+Math.random()*920,y:-130,size,speed:340+Math.random()*160,rot:Math.random()*6.28,spin:(Math.random()-.5)*1.5})}
function pointsFor(type){return type==='banana'?100:type==='flower'?250:type==='leaf'?150:50}
function collect(item){
  let pts=pointsFor(item.type);
  const now=performance.now();
  if(now<comboUntil){pts*=2;combo++}else combo=1;
  comboUntil=now+1700;
  if(item.type==='leaf'){
    comboUntil=now+5000;
    comboMessage.classList.add('show');
    setTimeout(()=>comboMessage.classList.remove('show'),900);
  }
  score+=pts;
  scoreValue.textContent=score.toLocaleString('pt-BR');
  progressBar.style.width=`${Math.min(100,score/50)}%`;

  // Explosão exclusivamente dourada no ponto em que o item toca o perfume.
  particles.push({x:item.x,y:item.y,vx:0,vy:0,life:1,size:54,flash:true});
  for(let i=0;i<30;i++){
    const angle=Math.random()*Math.PI*2;
    const speed=90+Math.random()*310;
    particles.push({
      x:item.x,
      y:item.y,
      vx:Math.cos(angle)*speed,
      vy:Math.sin(angle)*speed-70,
      life:.75+Math.random()*.45,
      size:3+Math.random()*9,
      flash:false
    });
  }
}
function update(dt){player.x+=(player.targetX-player.x)*Math.min(1,dt*12);spawnTimer-=dt;if(spawnTimer<=0){spawnItem();spawnTimer=.42+Math.random()*.32}for(let i=items.length-1;i>=0;i--){const o=items[i];o.y+=o.speed*dt;o.rot+=o.spin*dt;const px=player.x-player.w/2,py=player.y-player.h/2;if(o.x+o.size*.4>px&&o.x-o.size*.4<px+player.w&&o.y+o.size*.4>py&&o.y-o.size*.4<py+player.h){collect(o);items.splice(i,1);continue}if(o.y>2040)items.splice(i,1)}for(let i=particles.length-1;i>=0;i--){const p=particles[i];p.x+=p.vx*dt;p.y+=p.vy*dt;p.vy+=190*dt;p.life-=dt*1.6;if(p.life<=0)particles.splice(i,1)}}
function drawBottle(x,y,w,h){
  const img=gameAssets.perfume;
  if(!img||!img.complete)return;
  ctx.save();
  ctx.shadowColor='rgba(0,0,0,.42)';
  ctx.shadowBlur=24;
  ctx.shadowOffsetY=14;
  ctx.drawImage(img,x-w/2,y-h/2,w,h);
  ctx.restore();
}
function roundRect(x,y,w,h,r){ctx.beginPath();ctx.roundRect(x,y,w,h,r)}
function drawItem(o){
  const img=gameAssets[o.type];
  const crop=assetCrops[o.type];
  if(!img||!img.complete||!crop)return;
  ctx.save();
  ctx.translate(o.x,o.y);
  if(o.type!=='spark')ctx.rotate(o.rot);
  const maxSide=o.size;
  const ratio=crop.w/crop.h;
  let dw=maxSide,dh=maxSide;
  if(ratio>=1)dh=dw/ratio;else dw=dh*ratio;
  ctx.drawImage(img,crop.x,crop.y,crop.w,crop.h,-dw/2,-dh/2,dw,dh);
  ctx.restore();
}
function draw(){
  ctx.clearRect(0,0,1080,1920);
  if(gameAssets.background.complete)ctx.drawImage(gameAssets.background,0,0,1080,1920);
  for(const o of items)drawItem(o);
  for(const p of particles){
    ctx.save();
    const alpha=Math.max(0,Math.min(1,p.life));
    ctx.globalAlpha=alpha;
    ctx.shadowColor='rgba(255,196,43,.95)';
    ctx.shadowBlur=p.flash?42:18;
    if(p.flash){
      const radius=p.size*(1.45-p.life*.45);
      const glow=ctx.createRadialGradient(p.x,p.y,0,p.x,p.y,radius);
      glow.addColorStop(0,'rgba(255,255,220,.98)');
      glow.addColorStop(.22,'rgba(255,225,120,.88)');
      glow.addColorStop(.58,'rgba(255,177,25,.42)');
      glow.addColorStop(1,'rgba(255,160,0,0)');
      ctx.fillStyle=glow;
      ctx.beginPath();
      ctx.arc(p.x,p.y,radius,0,Math.PI*2);
      ctx.fill();
    }else{
      ctx.fillStyle='rgb(255,199,54)';
      ctx.beginPath();
      ctx.arc(p.x,p.y,p.size,0,Math.PI*2);
      ctx.fill();
      ctx.globalAlpha=alpha*.85;
      ctx.fillStyle='rgb(255,248,196)';
      ctx.beginPath();
      ctx.arc(p.x-p.size*.22,p.y-p.size*.22,p.size*.32,0,Math.PI*2);
      ctx.fill();
    }
    ctx.restore();
  }
  ctx.fillStyle='rgba(0,15,8,.35)';
  ctx.beginPath();
  ctx.ellipse(player.x,1745,150,34,0,0,Math.PI*2);
  ctx.fill();
  drawBottle(player.x,player.y,player.w,player.h);
}
function loop(now){if(state!=='game')return;const dt=Math.min(.034,(now-lastTime)/1000);lastTime=now;timeLeft-=dt;if(timeLeft<=0){timeLeft=0;timeValue.textContent='0';draw();endGame();return}timeValue.textContent=Math.ceil(timeLeft);update(dt);draw();raf=requestAnimationFrame(loop)}
function setTarget(clientX){const r=stage.getBoundingClientRect();const x=(clientX-r.left)/r.width*1080;player.targetX=Math.max(player.w/2+45,Math.min(1080-player.w/2-45,x))}
stage.addEventListener('pointerdown',e=>{if(state==='game'){stage.setPointerCapture?.(e.pointerId);setTarget(e.clientX)}});stage.addEventListener('pointermove',e=>{if(state==='game'&&e.buttons)setTarget(e.clientX)});stage.addEventListener('touchmove',e=>e.preventDefault(),{passive:false});
function resetToStart(){
  // Interrompe completamente a partida antes de reexibir a abertura.
  state='resetting';
  cancelAnimationFrame(raf);
  raf=0;
  items.length=0;
  particles.length=0;
  score=0;
  timeLeft=30;
  lastTime=0;
  spawnTimer=0;
  combo=0;
  comboUntil=0;
  player.x=player.targetX=540;
  scoreValue.textContent='0';
  timeValue.textContent='30';
  progressBar.style.width='0%';
  comboMessage.classList.remove('show');
  ctx.clearRect(0,0,canvas.width,canvas.height);
  show('start');
}

document.getElementById('startButton').addEventListener('click',startGame);
document.getElementById('restartButton').addEventListener('click',resetToStart);
show('start');
