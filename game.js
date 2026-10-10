
const socket=io();
const $=s=>document.querySelector(s);
const lobby=$("#lobby"),waiting=$("#waiting"),game=$("#game"),err=$("#error");
const canvas=$("#court"),ctx=canvas.getContext("2d");
let mySide=null,state=null,keys={left:false,right:false,jump:false,action:false,special:false};

$("#create").onclick=()=>socket.emit("createRoom");
$("#join").onclick=()=>socket.emit("joinRoom",$("#code").value);
$("#code").addEventListener("keydown",e=>{if(e.key==="Enter")$("#join").click()});
$("#restart").onclick=()=>socket.emit("restart");

socket.on("roomCreated",d=>{mySide=d.side;lobby.classList.add("hidden");waiting.classList.remove("hidden");$("#roomCode").textContent=d.code});
socket.on("roomJoined",d=>{mySide=d.side;lobby.classList.add("hidden");waiting.classList.add("hidden");game.classList.remove("hidden")});
socket.on("gameStarted",()=>{waiting.classList.add("hidden");lobby.classList.add("hidden");game.classList.remove("hidden")});
socket.on("errorMsg",m=>err.textContent=m);
socket.on("opponentLeft",()=>alert("Your opponent disconnected."));
socket.on("state",s=>{state=s;updateHUD();});

function send(){socket.emit("input",keys)}
const map={KeyA:"left",KeyD:"right",KeyW:"jump",KeyX:"action",KeyZ:"special"};
addEventListener("keydown",e=>{if(map[e.code] && !e.repeat){e.preventDefault();keys[map[e.code]]=true;send()}});
addEventListener("keyup",e=>{if(map[e.code]){e.preventDefault();keys[map[e.code]]=false;send()}});

function updateHUD(){
 if(!state)return;
 const a=state.players.find(p=>p.side===0),b=state.players.find(p=>p.side===1);
 $("#p1").textContent=a?.score??0;$("#p2").textContent=b?.score??0;
 const t=Math.ceil(state.time);$("#clock").textContent=`${Math.floor(t/60)}:${String(t%60).padStart(2,"0")}`;
 const me=state.players.find(p=>p.side===mySide);$("#power").style.width=(me?.special??0)+"%";
 if(state.ended && a && b){$("#end").classList.remove("hidden");$("#final").textContent=`${a.score} — ${b.score}`;$("#result").textContent=a.score===b.score?"TIE GAME":((mySide===0?a.score>b.score:b.score>a.score)?"YOU WIN!":"YOU LOSE");}
 else $("#end").classList.add("hidden");
}
function roundRect(x,y,w,h,r,fill){ctx.beginPath();ctx.roundRect(x,y,w,h,r);ctx.fillStyle=fill;ctx.fill()}
function drawCourt(){
 const g=ctx.createLinearGradient(0,0,0,650);g.addColorStop(0,"#82c9e8");g.addColorStop(.58,"#dff4ff");g.addColorStop(.581,"#d59b55");g.addColorStop(1,"#b86f32");ctx.fillStyle=g;ctx.fillRect(0,0,1200,650);
 // crowd
 ctx.fillStyle="#263248";ctx.fillRect(0,110,1200,120);
 for(let y=128;y<220;y+=28)for(let x=15;x<1200;x+=30){ctx.fillStyle=((x+y)/10)%3<1?"#e45b4c":((x+y)/10)%3<2?"#f2c14e":"#4e86c5";ctx.beginPath();ctx.arc(x,y,6,0,Math.PI*2);ctx.fill()}
 // floor
 ctx.strokeStyle="#f8e6c7";ctx.lineWidth=5;ctx.beginPath();ctx.moveTo(0,560);ctx.lineTo(1200,560);ctx.stroke();
 ctx.strokeStyle="#f0d2aa";ctx.lineWidth=3;ctx.beginPath();ctx.arc(600,560,105,Math.PI,0);ctx.stroke();
 // paint/key areas
 ctx.strokeStyle="#f6dfc0";ctx.strokeRect(0,385,235,175);ctx.strokeRect(965,385,235,175);
 ctx.beginPath();ctx.arc(235,472,85,-Math.PI/2,Math.PI/2);ctx.stroke();ctx.beginPath();ctx.arc(965,472,85,Math.PI/2,Math.PI*1.5);ctx.stroke();
 // supports/backboards
 ctx.fillStyle="#39475b";ctx.fillRect(64,205,10,355);ctx.fillRect(1126,205,10,355);
 ctx.fillStyle="#e8f4fa";ctx.fillRect(92,215,12,140);ctx.fillRect(1096,215,12,140);
 ctx.strokeStyle="#e44";ctx.lineWidth=7;ctx.beginPath();ctx.moveTo(104,300);ctx.lineTo(140,300);ctx.stroke();ctx.beginPath();ctx.moveTo(1096,300);ctx.lineTo(1060,300);ctx.stroke();
 // nets
 ctx.strokeStyle="#eee";ctx.lineWidth=2;for(const x of [140,1060]){ctx.beginPath();ctx.moveTo(x-18,305);ctx.lineTo(x-10,350);ctx.lineTo(x+10,350);ctx.lineTo(x+18,305);ctx.stroke()}
}
function drawPlayer(p){
 const x=p.x,y=p.y,team=p.side===0?"#2878df":"#e94f4f",skin="#c9895a";
 // shadow
 ctx.fillStyle="#0003";ctx.beginPath();ctx.ellipse(x+24,563,30,8,0,0,Math.PI*2);ctx.fill();
 // legs/shoes
 ctx.strokeStyle=skin;ctx.lineWidth=12;ctx.lineCap="round";ctx.beginPath();ctx.moveTo(x+17,y+65);ctx.lineTo(x+14,y+87);ctx.moveTo(x+31,y+65);ctx.lineTo(x+34,y+87);ctx.stroke();
 ctx.strokeStyle="#f4f4f4";ctx.lineWidth=9;ctx.beginPath();ctx.moveTo(x+8,y+89);ctx.lineTo(x+19,y+89);ctx.moveTo(x+29,y+89);ctx.lineTo(x+42,y+89);ctx.stroke();
 // body
 roundRect(x+7,y+26,34,48,9,team);ctx.fillStyle="#fff";ctx.font="bold 18px Arial";ctx.textAlign="center";ctx.fillText(p.side===0?"1":"2",x+24,y+57);
 // head
 ctx.fillStyle=skin;ctx.beginPath();ctx.arc(x+24,y+16,18,0,Math.PI*2);ctx.fill();ctx.fillStyle="#28231f";ctx.beginPath();ctx.arc(x+24,y+8,17,Math.PI,Math.PI*2);ctx.fill();
 // arm / block
 ctx.strokeStyle=skin;ctx.lineWidth=9;ctx.beginPath();if(p.blockT>0){ctx.moveTo(x+15,y+36);ctx.lineTo(x+6,y-10);ctx.moveTo(x+34,y+36);ctx.lineTo(x+43,y-12)}else{ctx.moveTo(x+10,y+38);ctx.lineTo(x-1,y+53);ctx.moveTo(x+38,y+38);ctx.lineTo(x+49,y+52)}ctx.stroke();
}
function drawBall(b){
 ctx.save();ctx.translate(b.x,b.y);ctx.fillStyle="#e98322";ctx.strokeStyle="#3a2112";ctx.lineWidth=2;ctx.beginPath();ctx.arc(0,0,13,0,Math.PI*2);ctx.fill();ctx.stroke();
 ctx.beginPath();ctx.moveTo(-13,0);ctx.lineTo(13,0);ctx.moveTo(0,-13);ctx.quadraticCurveTo(8,0,0,13);ctx.moveTo(0,-13);ctx.quadraticCurveTo(-8,0,0,13);ctx.stroke();ctx.restore();
}
function loop(){
 requestAnimationFrame(loop);drawCourt();if(!state)return;
 [...state.players].sort((a,b)=>a.y-b.y).forEach(drawPlayer);drawBall(state.ball);
}
loop();
