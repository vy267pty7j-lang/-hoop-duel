
const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const path = require("path");

const app = express();
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: "*" } });
app.use(express.static(path.join(__dirname, "public")));

const rooms = new Map();
const FPS = 60, DT = 1/FPS;
const W = 1200, H = 650, FLOOR = 560;
const GRAVITY = 1900;

function code() {
  const chars="ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let s=""; for(let i=0;i<5;i++) s+=chars[Math.floor(Math.random()*chars.length)];
  return s;
}
function player(id, side) {
  return { id, side, x: side===0?250:950, y:FLOOR-92, vx:0, vy:0, w:48,h:92,
    facing:side===0?1:-1,onGround:true, hasBall:side===0, score:0,
    input:{left:false,right:false,jump:false,action:false,special:false},
    jumpLatch:false, actionLatch:false, specialLatch:false, stealCd:0, blockT:0, special:0 };
}
function newRoom(host) {
  let c; do c=code(); while(rooms.has(c));
  const r={code:c, players:[player(host,0)], ball:{x:282,y:470,vx:0,vy:0,r:13,owner:0,last:0},
    started:false, ended:false, time:60, lastTick:Date.now(), resetT:0};
  rooms.set(c,r); return r;
}
function emitState(r) {
  io.to(r.code).emit("state", {
    code:r.code, started:r.started, ended:r.ended, time:Math.max(0,r.time),
    players:r.players.map(p=>({id:p.id,side:p.side,x:p.x,y:p.y,vx:p.vx,vy:p.vy,
      facing:p.facing,onGround:p.onGround,hasBall:p.hasBall,score:p.score,
      blockT:p.blockT,special:p.special})),
    ball:r.ball
  });
}
function resetBall(r, scorerSide) {
  r.players.forEach(p=>{p.x=p.side===0?250:950;p.y=FLOOR-p.h;p.vx=p.vy=0;p.onGround=true;p.hasBall=false;});
  const receiver = scorerSide===0 ? 1 : 0;
  const p=r.players[receiver] || r.players[0];
  p.hasBall=true; r.ball.owner=p.side; r.ball.x=p.x+24*p.facing; r.ball.y=p.y+38; r.ball.vx=r.ball.vy=0;
}
function shoot(r,p,powerShot=false) {
  if(!p.hasBall) return;
  p.hasBall=false; r.ball.owner=null; r.ball.last=p.side;
  const hoopX=p.side===0?1060:140, hoopY=300;
  const sx=p.x + p.facing*34, sy=p.y+30;
  r.ball.x=sx; r.ball.y=sy;
  const dx=hoopX-sx, t=Math.max(.48,Math.min(.85,Math.abs(dx)/950));
  r.ball.vx=dx/t;
  r.ball.vy=(hoopY-sy-.5*GRAVITY*t*t)/t - (powerShot?90:0);
  if(powerShot){ p.special=0; }
}
function dunk(r,p) {
  if(!p.hasBall) return false;
  const hoopX=p.side===0?1060:140;
  if(Math.abs(p.x-hoopX)<125 && p.y < FLOOR-p.h-25) {
    p.hasBall=false; r.ball.owner=null; r.ball.last=p.side;
    r.ball.x=hoopX; r.ball.y=275; r.ball.vx=0; r.ball.vy=380;
    return true;
  }
  return false;
}
function tickRoom(r) {
  if(!r.started || r.ended) return;
  r.time -= DT;
  if(r.time<=0){ r.time=0;r.ended=true;emitState(r);return; }

  for(const p of r.players){
    p.stealCd=Math.max(0,p.stealCd-DT); p.blockT=Math.max(0,p.blockT-DT);
    const speed=330;
    p.vx=(p.input.right?speed:0)-(p.input.left?speed:0);
    if(p.vx) p.facing=Math.sign(p.vx);

    if(p.input.jump && !p.jumpLatch && p.onGround){p.vy=-720;p.onGround=false;}
    p.jumpLatch=p.input.jump;

    if(p.input.action && !p.actionLatch){
      if(p.hasBall) shoot(r,p,false);
      else {
        p.stealCd=.45;
        const other=r.players.find(q=>q.side!==p.side);
        if(other && other.hasBall && Math.abs(other.x-p.x)<82 && Math.abs(other.y-p.y)<70){
          other.hasBall=false;p.hasBall=true;r.ball.owner=p.side;p.special=Math.min(100,p.special+18);
        }
      }
    }
    p.actionLatch=p.input.action;

    if(p.input.special && !p.specialLatch){
      if(p.hasBall){
        if(!dunk(r,p) && p.special>=100) shoot(r,p,true);
      } else p.blockT=.32;
    }
    p.specialLatch=p.input.special;

    p.vy += GRAVITY*DT; p.x+=p.vx*DT;p.y+=p.vy*DT;
    p.x=Math.max(35,Math.min(W-35-p.w,p.x));
    if(p.y>=FLOOR-p.h){p.y=FLOOR-p.h;p.vy=0;p.onGround=true;}
  }

  const b=r.ball;
  if(b.owner!==null){
    const p=r.players.find(q=>q.side===b.owner);
    if(p){ b.x=p.x+p.w/2+p.facing*25;b.y=p.y+34;b.vx=b.vy=0; }
  } else {
    b.vy+=GRAVITY*DT;b.x+=b.vx*DT;b.y+=b.vy*DT;
    if(b.x<b.r){b.x=b.r;b.vx=Math.abs(b.vx)*.72}
    if(b.x>W-b.r){b.x=W-b.r;b.vx=-Math.abs(b.vx)*.72}
    if(b.y>FLOOR-b.r){b.y=FLOOR-b.r;b.vy=-Math.abs(b.vy)*.62;b.vx*=.92;if(Math.abs(b.vy)<80)b.vy=0;}

    // backboards
    for(const bx of [105,1095]){
      if(Math.abs(b.x-bx)<12 && b.y>215 && b.y<355){ b.vx*=-.72; b.x += Math.sign(b.vx)*10; }
    }
    // rim collision approximation
    for(const rx of [140,1060]){
      const dx=b.x-rx, dy=b.y-300, d=Math.hypot(dx,dy);
      if(d<22 && d>0){ const nx=dx/d,ny=dy/d,dot=b.vx*nx+b.vy*ny;b.vx-=1.55*dot*nx;b.vy-=1.55*dot*ny;b.x=rx+nx*22;b.y=300+ny*22; }
    }

    // blocks
    for(const p of r.players){
      if(p.blockT>0 && Math.abs(b.x-(p.x+p.w/2))<62 && Math.abs(b.y-(p.y+10))<72){
        b.vx=p.facing*500;b.vy=-300;p.special=Math.min(100,p.special+12);
      }
    }

    // score: downward crossing near hoop
    if(b.vy>0 && b.y>292 && b.y<326){
      const hoopSide = Math.abs(b.x-1060)<24 ? 0 : Math.abs(b.x-140)<24 ? 1 : null;
      if(hoopSide!==null && b.last===hoopSide){
        const scorer=r.players.find(p=>p.side===hoopSide);
        if(scorer){
          const dist=Math.abs((scorer._shotX ?? scorer.x)-(hoopSide===0?1060:140));
          scorer.score += dist>390?3:2; scorer.special=Math.min(100,scorer.special+22);
          b.y=340; b.vy=500;
          setTimeout(()=>{if(rooms.get(r.code)===r && !r.ended) resetBall(r,hoopSide)},650);
          b.last=null;
        }
      }
    }

    // loose ball pickup
    if(b.y>390){
      for(const p of r.players){
        if(!r.players.some(q=>q.hasBall) && Math.abs(b.x-(p.x+p.w/2))<42 && Math.abs(b.y-(p.y+45))<58){
          p.hasBall=true;b.owner=p.side;b.last=p.side;break;
        }
      }
    }
  }
}

io.on("connection", socket=>{
  socket.on("createRoom", ()=>{
    const r=newRoom(socket.id); socket.join(r.code); socket.emit("roomCreated",{code:r.code,side:0});emitState(r);
  });
  socket.on("joinRoom", raw=>{
    const c=String(raw||"").toUpperCase().trim(), r=rooms.get(c);
    if(!r) return socket.emit("errorMsg","Room not found.");
    if(r.players.length>=2) return socket.emit("errorMsg","Room is full.");
    r.players.push(player(socket.id,1)); socket.join(c);r.started=true;r.time=60;
    socket.emit("roomJoined",{code:c,side:1});io.to(c).emit("gameStarted");emitState(r);
  });
  socket.on("input", data=>{
    for(const r of rooms.values()){
      const p=r.players.find(p=>p.id===socket.id);
      if(p){p.input={...p.input,...data}; if(p.hasBall && data.action && !p.actionLatch)p._shotX=p.x; break;}
    }
  });
  socket.on("restart", ()=>{
    for(const r of rooms.values()){
      if(r.players.some(p=>p.id===socket.id) && r.players.length===2){
        r.ended=false;r.time=60;r.players.forEach(p=>{p.score=0;p.special=0;});resetBall(r,1);r.started=true;emitState(r);break;
      }
    }
  });
  socket.on("disconnect", ()=>{
    for(const [c,r] of rooms){
      const i=r.players.findIndex(p=>p.id===socket.id);
      if(i>=0){r.players.splice(i,1);io.to(c).emit("opponentLeft");if(!r.players.length)rooms.delete(c);else r.started=false;break;}
    }
  });
});

setInterval(()=>{for(const r of rooms.values()){tickRoom(r);emitState(r)}},1000/FPS);
const PORT=process.env.PORT||3000;
server.listen(PORT,()=>console.log(`Hoop Duel running on port ${PORT}`));
