(()=>{
'use strict';
const $=id=>document.getElementById(id), canvas=$('game'),ctx=canvas.getContext('2d');
const ui={overlay:$('overlay'),start:$('startBtn'),restart:$('restartBtn'),pHealth:$('pHealth'),eHealth:$('eHealth'),pText:$('pHealthText'),eText:$('eHealthText'),status:$('status'),round:$('round')};
const W=1000,H=520,FLOOR=420,keys=new Set();
let running=false,over=false,round=1,level=1,last=0,shake=0,particles=[],tick=0;
const LEVELS=[
 {name:'BACKSTREET',subtitle:'THE FIRST CHALLENGE',bg1:'#222a37',bg2:'#141820',floor:'#303845',enemy:'THE ROOKIE',hp:85,speed:.82,damage:.82,accent:'#d7ff55'},
 {name:'NEON DOCKS',subtitle:'NO ROOM TO BREATHE',bg1:'#182b3a',bg2:'#111923',floor:'#263b4b',enemy:'DOCK BRAWLER',hp:110,speed:1,damage:1,accent:'#55d6ff'},
 {name:'ROOFTOP RIOT',subtitle:'HIGH STAKES',bg1:'#30233c',bg2:'#171521',floor:'#40304a',enemy:'ROOFTOP ACE',hp:125,speed:1.12,damage:1.05,accent:'#c28cff'},
 {name:'IRON YARD',subtitle:'HARD HITS ONLY',bg1:'#392a24',bg2:'#191615',floor:'#49372d',enemy:'IRON FIST',hp:145,speed:1.18,damage:1.18,accent:'#ffb15e'},
 {name:'CHAMPION PIT',subtitle:'FINAL SHOWDOWN',bg1:'#3a2028',bg2:'#171318',floor:'#48252d',enemy:'THE CHAMPION',hp:175,speed:1.28,damage:1.3,accent:'#ff5f6d'}
];
const levelInfo=()=>LEVELS[Math.min(level-1,LEVELS.length-1)];
const enemyCount=()=>Math.min(1+Math.floor((level-1)/1),5); // one extra rival unlocked per level
let enemies=[];
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v)), rand=(a,b)=>a+Math.random()*(b-a);
function fighter(x,color,side){return{x,y:FLOOR-4,vx:0,vy:0,hp:100,color,side,face:side==='p'?1:-1,ground:true,crouch:false,block:false,attack:0,attackType:'light',cool:0,stun:0,flash:0,step:0,ko:false}}
let p,e;
function reset(){const cfg=levelInfo();p=fighter(290,'#55d6ff','p');p.hp=160;p.maxHp=160;
 enemies=[];const count=enemyCount();for(let i=0;i<count;i++){const foe=fighter(670+i*58,'#ff5f6d','e');foe.hp=cfg.hp;foe.maxHp=cfg.hp;foe.enemyIndex=i;foe.color=['#ff5f6d','#ff9f43','#c28cff','#ff6f91','#f0d264'][i%5];enemies.push(foe)}
 e=enemies[0];running=false;over=false;particles=[];shake=0;tick=0;ui.pHealth.style.width='100%';ui.eHealth.style.width='100%';ui.pText.textContent='160 HP';ui.eText.textContent=Math.ceil(e.hp)+' HP';ui.round.textContent=String(level).padStart(2,'0');ui.status.textContent='Level '+level+' · '+cfg.name+' · '+count+' rivals';ui.overlay.classList.remove('hidden');ui.overlay.querySelector('.stamp').textContent='LEVEL '+String(level).padStart(2,'0');ui.overlay.querySelector('h2').textContent=cfg.name;ui.overlay.querySelector('p').textContent=cfg.subtitle+' — defeat '+count+' rival'+(count>1?'s':'')+' to unlock the next arena.';ui.start.innerHTML='START LEVEL <span>↗</span>';draw()}
function start(){running=true;over=false;ui.overlay.classList.add('hidden');ui.status.textContent='Level '+level+' · '+levelInfo().name;last=performance.now()}
function attack(f,type){if(f.cool>0||f.stun>0||f.ko||!running)return;const timing={light:.24,heavy:.38,kick:.31,heavyKick:.46};f.attack=timing[type]||.24;f.attackType=type;f.hitDone=false;f.cool=({light:.38,heavy:.72,kick:.52,heavyKick:.88})[type]||.38;f.vx+=f.face*(({heavy:65,heavyKick:78})[type]||35)}
function hit(att,def){if(att.attack<=0||att.hitDone||att.attack>=(att.attackType==='heavy'?.22:.14)||att.stun>0)return;const legAttack=att.attackType==='kick'||att.attackType==='heavyKick';
 const reach=att.attackType==='heavy'?88:att.attackType==='kick'?82:att.attackType==='heavyKick'?105:66,dx=def.x-att.x;
 const verticalOk=legAttack?Math.abs(def.y-att.y)<48:Math.abs((def.y-48)-(att.y-48))<58;
 if(Math.abs(dx)<reach&&Math.sign(dx)===att.face&&verticalOk){att.hitDone=true;const blocked=def.block&&def.face===-att.face&&!def.crouch;const baseDamage=({light:5,heavy:9,kick:6,heavyKick:12})[att.attackType]||5;const damage=blocked?1:Math.round(baseDamage*(att.side==='e'?levelInfo().damage:1));def.hp=Math.max(0,def.hp-damage);def.stun=blocked?.06:(att.attackType==='heavy'||att.attackType==='heavyKick'?.24:.12);def.vx+=att.face*(blocked?55:(att.attackType==='heavy'||att.attackType==='heavyKick'?190:120));if(!blocked)def.vy=-Math.min(75,att.attackType==='heavyKick'?65:att.attackType==='heavy'?48:legAttack?32:22);def.flash=.12;shake=blocked?2:7;burst(def.x,def.y-55,blocked?'#d7ff55':att.color,blocked?4:10);if(def.hp<=0){def.ko=true;if(def===p){running=false;over=true;ui.overlay.classList.remove('hidden');ui.status.textContent='Try level '+level+' again';ui.overlay.querySelector('.stamp').textContent='KNOCKOUT';ui.overlay.querySelector('h2').textContent='YOU GOT KNOCKED OUT';ui.overlay.querySelector('p').textContent='Block, move and use leg attacks to create space. Try again!';ui.start.innerHTML='RETRY LEVEL <span>↗</span>';ui.start.onclick=()=>{reset();start();ui.start.onclick=null}}else{burst(def.x,def.y-50,'#d7ff55',14);ui.status.textContent='Rival down · '+enemies.filter(q=>q.hp>0&&!q.ko).length+' remaining'}}}}
function burst(x,y,color,n){for(let i=0;i<n;i++)particles.push({x,y,vx:rand(-220,220),vy:rand(-240,30),life:rand(.18,.5),r:rand(2,5),color})}
function updateFighter(f,dt,isPlayer){
 f.cool=Math.max(0,f.cool-dt);f.attack=Math.max(0,f.attack-dt);f.stun=Math.max(0,f.stun-dt);f.flash=Math.max(0,f.flash-dt);
 const dir=isPlayer?((keys.has('KeyD')?1:0)-(keys.has('KeyA')?1:0)):0;
 if(isPlayer){f.crouch=keys.has('KeyS')&&f.ground;f.block=keys.has('KeyL')&&f.ground&&!f.crouch;if(keys.has('KeyJ')){attack(f,'light');keys.delete('KeyJ')}if(keys.has('KeyK')){attack(f,'heavy');keys.delete('KeyK')}if(keys.has('KeyU')){attack(f,'kick');keys.delete('KeyU')}if(keys.has('KeyI')){attack(f,'heavyKick');keys.delete('KeyI')}if(keys.has('KeyW')&&f.ground&&!f.crouch){f.vy=-470;f.ground=false;keys.delete('KeyW')}}
 if(f.stun<=0&&!f.ko){if(isPlayer){if(!f.block)f.vx+=dir*(f.ground?1050:500)*dt;if(f.block)f.vx*=Math.pow(.03,dt); }else{
   const dx=p.x-f.x,ad=Math.abs(dx);f.face=dx<0?-1:1;p.face=f.x<p.x?-1:1;
   if(ad>87)f.vx+=Math.sign(dx)*760*levelInfo().speed*dt;else f.vx*=Math.pow(.025,dt);
   if(ad<112&&f.cool<=0&&Math.random()<dt*(1.1+level*.12))attack(f,Math.random()<.18?'heavyKick':Math.random()<.4?'kick':Math.random()<.35?'heavy':'light');
   if(ad<115&&p.attack>0&&Math.random()<dt*1.8)f.block=true;else f.block=false;
   if(ad<130&&Math.random()<dt*.45&&f.ground){f.vy=-390;f.ground=false}
 }}
 f.vx*=Math.pow(f.ground?.82:.985,dt*60);f.vx=clamp(f.vx,-340,340);f.vy+=1050*dt;f.x+=f.vx*dt;f.y+=f.vy*dt;
 if(f.y>=FLOOR-4){f.y=FLOOR-4;f.vy=0;f.ground=true}else f.ground=false;
 f.x=clamp(f.x,45,955);f.step+=Math.abs(f.vx)*dt*.025;
 if(f.attack>0){if(isPlayer){for(const foe of enemies){if(foe.hp>0&&!foe.ko)hit(f,foe)}}else hit(f,p);}
}
function update(dt){tick+=dt;updateFighter(p,dt,true);
 for(const foe of enemies){if(foe.hp>0&&!foe.ko){updateFighter(foe,dt,false);foe.face=p.x<foe.x?-1:1;p.face=foe.x<p.x?-1:1;
  if(Math.abs(p.x-foe.x)<42){const dir=p.x<foe.x?-1:1;p.x+=dir*35;foe.x-=dir*18}
 }}
 // select next living opponent as the HUD target
 const alive=enemies.filter(q=>q.hp>0&&!q.ko);e=alive[0]||enemies[enemies.length-1];
 const totalAlive=alive.length;ui.pHealth.style.width=(p.hp/160*100)+'%';ui.eHealth.style.width=(e.hp/e.maxHp*100)+'%';ui.pText.textContent=Math.ceil(p.hp)+' HP';ui.eText.textContent=totalAlive?Math.ceil(e.hp)+' HP · '+totalAlive+' LEFT':'CLEAR!';
 if(totalAlive===0&&running){running=false;over=true;ui.overlay.classList.remove('hidden');if(level<LEVELS.length){ui.status.textContent='Level '+level+' cleared!';ui.overlay.querySelector('.stamp').textContent='LEVEL CLEARED';ui.overlay.querySelector('h2').textContent=levelInfo().name+' DEFEATED';ui.overlay.querySelector('p').textContent='All rivals defeated! Next arena unlocked: '+LEVELS[level].name+'.';ui.start.innerHTML='NEXT LEVEL <span>↗</span>';ui.start.onclick=()=>{level++;round=level;reset();start();ui.start.onclick=null}}else{ui.status.textContent='Champion defeated!';ui.overlay.querySelector('.stamp').textContent='CHAMPION';ui.overlay.querySelector('h2').textContent='YOU RULE THE ARENA';ui.overlay.querySelector('p').textContent='All five levels cleared. Fight again to sharpen your skills.';ui.start.innerHTML='PLAY AGAIN <span>↗</span>';ui.start.onclick=()=>{level=1;round=1;reset();start();ui.start.onclick=null}}}
 particles.forEach(q=>{q.x+=q.vx*dt;q.y+=q.vy*dt;q.vy+=500*dt;q.life-=dt});particles=particles.filter(q=>q.life>0);shake=Math.max(0,shake-dt*20);
}
function rr(x,y,w,h,r){ctx.beginPath();ctx.roundRect(x,y,w,h,r)}
function drawBackdrop(){const cfg=levelInfo();let g=ctx.createLinearGradient(0,0,0,H);g.addColorStop(0,cfg.bg1);g.addColorStop(1,cfg.bg2);ctx.fillStyle=g;ctx.fillRect(0,0,W,H);
 // distant city silhouettes
 for(let i=0;i<16;i++){let x=i*72-15,h=70+(i*37%110);ctx.fillStyle=i%2?cfg.bg2:cfg.bg1;ctx.fillRect(x,FLOOR-95-h,54,h+95);for(let j=0;j<3;j++){ctx.fillStyle='#d7ff5520';ctx.fillRect(x+10+j*13,FLOOR-h+10,4,6)}}
 ctx.strokeStyle='#4b5666';ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(0,FLOOR);ctx.lineTo(W,FLOOR);ctx.stroke();let g2=ctx.createLinearGradient(0,FLOOR,0,H);g2.addColorStop(0,cfg.floor);g2.addColorStop(1,cfg.bg2);ctx.fillStyle=g2;ctx.fillRect(0,FLOOR,W,H-FLOOR);
 for(let x=0;x<W;x+=50){ctx.strokeStyle='#ffffff0c';ctx.beginPath();ctx.moveTo(x,FLOOR);ctx.lineTo(x-45,H);ctx.stroke()}
 ctx.fillStyle=cfg.accent+'33';ctx.fillRect(0,FLOOR-3,W,3);
}
function drawFighter(f){const x=f.x,y=f.y,face=f.face;ctx.save();ctx.translate(x,y);ctx.scale(face,1);if(f.flash>0)ctx.globalAlpha=.55;
 // shadow
 ctx.globalAlpha*=.5;ctx.fillStyle='#000';ctx.beginPath();ctx.ellipse(0,0,31,7,0,0,Math.PI*2);ctx.fill();ctx.globalAlpha=f.flash>0?.5:1;
 const crouch=f.crouch?15:0,lean=f.attack>0?(f.attackType==='heavy'?8:4):0;
 // legs
 ctx.strokeStyle=f.color;ctx.lineWidth=11;ctx.lineCap='round';ctx.beginPath();ctx.moveTo(-8,-25+crouch);ctx.lineTo(-13+Math.sin(f.step)*5,-4);const isKick=f.attackType==='kick'||f.attackType==='heavyKick';const kickAnim=isKick&&f.attack>0?Math.min(1,1-f.attack/(f.attackType==='heavyKick'?.46:.31)):0;ctx.moveTo(8,-25+crouch);ctx.lineTo(isKick?20+kickAnim*34:13-Math.sin(f.step)*5,isKick?-18+kickAnim*5:-4);ctx.stroke();
 // torso
 ctx.fillStyle=f.color;rr(-17,-67+crouch,34,43,9);ctx.fill();
 // belt stripe
 ctx.fillStyle='#141820';ctx.fillRect(-16,-35+crouch,32,5);
 // head
 ctx.fillStyle='#f1c7a1';ctx.beginPath();ctx.arc(0,-81+crouch,15,0,Math.PI*2);ctx.fill();ctx.fillStyle='#242a35';ctx.fillRect(-13,-87+crouch,26,8);
 // arms, one punching
 ctx.strokeStyle=f.color;ctx.lineWidth=10;ctx.beginPath();ctx.moveTo(-13,-57+crouch);ctx.lineTo(-23,-38+crouch);ctx.stroke();
 const punch=f.attack>0?Math.min(1,1-f.attack/(f.attackType==='heavy'?.38:.24)):0;
 const armX=f.block?16: (f.attack>0?22+punch*(f.attackType==='heavy'?42:34):14);
 const armY=f.block?-53+crouch:-47+crouch;
 ctx.beginPath();ctx.moveTo(12,-57+crouch);ctx.lineTo(armX+lean,-52+crouch);ctx.lineTo(armX+lean,armY+8);ctx.stroke();
 ctx.fillStyle=f.block?'#d7ff55':'#f1c7a1';ctx.beginPath();ctx.arc(armX+lean,armY+8,7,0,Math.PI*2);ctx.fill();
 if(f.block){ctx.strokeStyle='#d7ff5588';ctx.lineWidth=3;ctx.beginPath();ctx.arc(26,-54+crouch,25,-1.2,1.2);ctx.stroke()}
 ctx.restore();
}
function draw(){ctx.save();if(shake)ctx.translate(rand(-shake,shake),rand(-shake,shake));drawBackdrop();ctx.fillStyle=levelInfo().accent+'bb';ctx.font='bold 12px monospace';ctx.fillText(levelInfo().name+'  /  '+String(level).padStart(2,'0'),24,34);ctx.fillStyle='#55d6ff';ctx.fillRect(25,47,95,3);ctx.fillStyle='#ff5f6d';ctx.fillRect(W-120,47,95,3);drawFighter(p);for(const foe of enemies){if(foe.hp>0||foe.stun>0)drawFighter(foe);}
 for(const q of particles){ctx.globalAlpha=clamp(q.life/.5,0,1);ctx.fillStyle=q.color;ctx.beginPath();ctx.arc(q.x,q.y,q.r,0,Math.PI*2);ctx.fill()}ctx.globalAlpha=1;
 if(running){ctx.fillStyle='#ffffff20';ctx.font='900 64px sans-serif';ctx.textAlign='center';ctx.fillText('FIGHT',W/2,130);ctx.textAlign='left'}
 ctx.restore()}
function frame(now){requestAnimationFrame(frame);let dt=Math.min(.033,(now-last)/1000||0);last=now;if(running&&!over)update(dt);draw()}
ui.start.addEventListener('click',start);ui.restart.addEventListener('click',()=>{level=1;round=1;ui.start.onclick=null;reset()});
window.addEventListener('keydown',ev=>{if(['KeyA','KeyD','KeyW','KeyS','KeyJ','KeyK','KeyU','KeyI','KeyL','Space'].includes(ev.code)){ev.preventDefault();keys.add(ev.code)}if(ev.code==='Enter'&&!running)start()});
window.addEventListener('keyup',ev=>keys.delete(ev.code));canvas.addEventListener('pointerdown',()=>{if(!running&&!over)start()});
reset();requestAnimationFrame(frame);
})();