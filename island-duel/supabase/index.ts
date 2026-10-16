// Standalone Hamsa Nomads Island Duel: Supabase Edge Function game host.
// Deployed function name: hamsa-island-duel-v1
// Keep separate from Catanlike's existing multiplayer server and engine.
// Requires SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY as server-side secrets.
// Database migration: island-duel/supabase/001_create_rooms.sql
// DO NOT put service-role keys into the static HTML client.
// Uses temporary room access tokens; an experimental prototype, not production-authenticated multiplayer.


const SUPA = Deno.env.get("SUPABASE_URL");
const KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
const TABLE = "hamsa_island_duel_rooms";
const colors = ["#1a94a0","#d46c4c"];
const terrains = ["forest","pasture","fields","hills","mountains","pasture","forest","fields","hills","fields","desert","mountains","pasture","forest","fields","mountains","hills","pasture","forest"];
const nums = [5,2,6,3,8,10,9,12,11,4,8,10,9,4,5,6,3,11];
const resNames = ["wood","brick","wool","grain","ore","paper","cloth","coin"];
const commodity = {forest:"paper",pasture:"cloth",mountains:"coin"};
const terrainRes = {forest:"wood",hills:"brick",pasture:"wool",fields:"grain",mountains:"ore"};
const costs={road:{wood:1,brick:1},settlement:{wood:1,brick:1,grain:1,wool:1},city:{ore:3,grain:2},knight:{wool:1,ore:1},activate:{grain:1},wall:{brick:2}};
function graph(){
 const vs=[],ed=[],hs=[],vmap=new Map(),emap=new Map();
 for(let r=-2;r<=2;r++) for(let q=-2;q<=2;q++) if(Math.abs(q+r)<=2){
  const cx=Math.sqrt(3)*(q+r/2),cy=1.5*r,cc=[],ee=[];
  for(let i=0;i<6;i++){const a=i*Math.PI/3+Math.PI/6,x=cx+Math.cos(a),y=cy+Math.sin(a),k=Math.round(x*10000)+":"+Math.round(y*10000);
   if(!vmap.has(k)){vmap.set(k,vs.length);vs.push({x,y})}cc.push(vmap.get(k))}
  for(let i=0;i<6;i++){const a=Math.min(cc[i],cc[(i+1)%6]),b=Math.max(cc[i],cc[(i+1)%6]),k=a+":"+b;
   if(!emap.has(k)){emap.set(k,ed.length);ed.push([a,b])} ee.push(emap.get(k))}
  hs.push({x:cx,y:cy,c:cc,e:ee});
 }return {vs,ed,hs};
}
const G=graph();
function around(v){return G.ed.reduce((acc,e,i)=>(e[0]===v||e[1]===v)?acc.concat([[i,e[0]===v?e[1]:e[0]]]):acc,[])}
function newGame(){
 let n=0;const tiles=terrains.map(t=>({t,num:t==="desert"?0:nums[n++]}));
 const p=[0,1].map((i)=>({name:i?"Mara":"Lulab",cards:Object.fromEntries(resNames.map(r=>[r,r==="grain"?6:4])),levels:{science:0,trade:0,politics:0}}));
 const g={tiles,p,buildings:{},roads:{},knights:{},walls:{},metros:{},turn:0,phase:"roll",event:"Waiting for the second player to join",dice:null,barb:7,history:["Quick-start house-rules demo: starting pieces and supplies are provided."],winner:null};
 const target=[[-4,-.8],[-1.8,3.6],[4,.8],[1.8,-3.6]];
 const used=[];
 target.forEach((t,i)=>{const v=G.vs.map((p,j)=>({j,d:Math.hypot(p.x-t[0],p.y-t[1])})).sort((a,b)=>a.d-b.d).find(({j})=>!used.includes(j)&&!around(j).some(e=>used.includes(e[1])))?.j;
 if(v===undefined)return;used.push(v);const owner=i<2?0:1;g.buildings[v]={owner,kind:i%2?"settlement":"city"};const e=around(v).find(e=>g.roads[e[0]]===undefined);if(e)g.roads[e[0]]=owner;});
 return g;
}
const hdr=()=>({"apikey":KEY||"","Authorization":"Bearer "+KEY,"Content-Type":"application/json","Accept":"application/json"});
async function db(path,method="GET",body,prefer){
 const h=hdr();if(prefer)h["Prefer"]=prefer;
 const r=await fetch(SUPA+"/rest/v1/"+TABLE+path,{method,headers:h,body:body?JSON.stringify(body):undefined});
 const data=await r.json().catch(()=>null);
 if(!r.ok)throw Error("Storage unavailable ("+r.status+").");
 return data;
}
const get=async code=>(await db("?room_code=eq."+encodeURIComponent(code)+"&select=*"))?.[0];
const update=async (code,rev,values)=>{
 const out=await db("?room_code=eq."+encodeURIComponent(code)+"&revision=eq."+rev,"PATCH",{...values,revision:rev+1,updated_at:new Date().toISOString()},"return=representation");
 if(!out?.length)throw Error("Another move was saved first. Please retry.");
 return out[0];
};
function check(cond,msg){if(!cond)throw Error(msg)}
const total=(p,c)=>p.cards[c]||0;
function pay(p,cost){for(const [k,v] of Object.entries(cost))check(total(p,k)>=v,"Not enough "+k+" (need "+v+")");for(const [k,v] of Object.entries(cost))p.cards[k]-=v}
function vp(g,id){return Object.values(g.buildings).reduce((s,b)=>s+(b.owner===id?(b.kind==="city"?2:1):0),0)+Object.values(g.metros).filter(a=>a===id).length*2}
function canConnect(g,v,id){return around(v).some(([e])=>g.roads[e]===id)}
function barbarian(g){
 const active=Object.values(g.knights).filter(k=>k.active).reduce((s,k)=>s+k.level,0);
 const ncity=Object.values(g.buildings).filter(b=>b.kind==="city").length;
 if(active<ncity){
  const powers=[0,1].map(id=>Object.values(g.knights).filter(k=>k.owner===id&&k.active).reduce((s,k)=>s+k.level,0));
  const loser=powers[0]<=powers[1]?0:1;
  const v=Object.keys(g.buildings).find(v=>g.buildings[v].owner===loser&&g.buildings[v].kind==="city"&&!g.walls[v]);
  if(v!==undefined){g.buildings[v].kind="settlement";g.event=g.p[loser].name+" lost a city to barbarians."}
  else g.event="Barbarians attacked. (City/wall protection simplified.)";
 }else g.event="The active knights defended the island.";
 for(const k of Object.values(g.knights))k.active=false;
 g.barb=7;
}
function applyMove(g,id,a){
 check(!g.winner,"The game is over.");
 check(id===g.turn,"Wait for your turn.");
 check(a&&typeof a.kind==="string","Choose an action.");
 const k=a.kind;
 if(k==="roll"){
  check(g.phase==="roll","Already rolled.");
  const red=1+Math.floor(Math.random()*6),yellow=1+Math.floor(Math.random()*6),evt=Math.floor(Math.random()*6),sum=red+yellow;
  const event=evt<3?"barbarian":evt===3?"science":evt===4?"trade":"politics";
  g.dice={red,yellow,event,total:sum};g.phase="actions";
  if(sum!==7)g.tiles.forEach((h,i)=>{if(h.num!==sum||!terrainRes[h.t])return;
   G.hs[i].c.forEach(v=>{const b=g.buildings[v];if(!b)return;const player=g.p[b.owner],c=terrainRes[h.t];
    player.cards[c]+=(b.kind==="city"&&!commodity[h.t]?2:1);
    if(b.kind==="city"&&commodity[h.t])player.cards[commodity[h.t]]++;
   });
  });
  if(sum===7)g.event="7 rolled. Robber/discard rules are not enabled in this demo.";
  else if(event==="barbarian"){g.barb--;g.event="Barbarians advance ("+g.barb+" away).";if(g.barb<=0)barbarian(g)}
  else {const lvl=g.p[id].levels[event]||0;g.event=event[0].toUpperCase()+event.slice(1)+" event. "+(lvl>0&&red<=lvl?"Progress-card eligible; deck not implemented.":"No progress card.") }
  g.history.push(g.p[id].name+" rolled "+red+" + "+yellow+" = "+sum+". "+g.event);
 }else{
  check(g.phase==="actions","Roll first.");
  const p=g.p[id],v=Number(a.index);
  if(k==="end"){g.turn=1-id;g.phase="roll";g.event="Waiting for "+g.p[g.turn].name+" to roll.";g.history.push(g.p[id].name+" ended the turn.")}
  else if(k==="road"){check(Number.isInteger(v)&&v>=0&&v<G.ed.length,"Choose an edge");check(g.roads[v]===undefined,"Road already built");
    const e=G.ed[v];check(e.some(x=>g.buildings[x]?.owner===id||canConnect(g,x,id)),"Road must connect to your network.");pay(p,costs.road);g.roads[v]=id;g.history.push(p.name+" built a road.")}
  else if(k==="settlement"){check(Number.isInteger(v)&&v>=0&&v<G.vs.length,"Choose a junction");check(!g.buildings[v]&&!g.knights[v],"Junction occupied");check(around(v).every(([e,other])=>!g.buildings[other]),"Settlement must be two roads apart.");check(canConnect(g,v,id),"Connect a road first.");pay(p,costs.settlement);g.buildings[v]={owner:id,kind:"settlement"};g.history.push(p.name+" built a settlement.")}
  else if(k==="city"){check(g.buildings[v]?.owner===id&&g.buildings[v]?.kind==="settlement","Tap one of your settlements.");pay(p,costs.city);g.buildings[v].kind="city";g.history.push(p.name+" built a city.")}
  else if(k==="wall"){check(g.buildings[v]?.owner===id&&g.buildings[v]?.kind==="city","Tap one of your cities.");check(!g.walls[v],"City has a wall already.");pay(p,costs.wall);g.walls[v]=true;g.history.push(p.name+" fortified a city.")}
  else if(k==="knight"){check(Number.isInteger(v)&&v>=0&&v<G.vs.length,"Choose a junction");check(!g.buildings[v]&&!g.knights[v],"Junction occupied");check(canConnect(g,v,id),"Knight must stand along one of your roads.");pay(p,costs.knight);g.knights[v]={owner:id,level:1,active:false};g.history.push(p.name+" recruited a knight.")}
  else if(k==="activate"){check(g.knights[v]?.owner===id&&!g.knights[v].active,"Tap one of your inactive knights.");pay(p,costs.activate);g.knights[v].active=true;g.history.push(p.name+" activated a knight.")}
  else if(k==="improve"){const d=String(a.discipline||"");check(["science","trade","politics"].includes(d),"Choose an improvement");check(Object.values(g.buildings).some(b=>b.owner===id&&b.kind==="city"),"You need a city first.");const lvl=p.levels[d];check(lvl<5,"Already at maximum.");const supply={science:"paper",trade:"cloth",politics:"coin"}[d];pay(p,{[supply]:lvl+1});p.levels[d]=lvl+1;if(lvl+1===4)g.metros[d]=id;g.history.push(p.name+" upgraded "+d+" to "+(lvl+1)+".")}
  else if(k==="trade"){const give=a.give,receive=a.receive;check(["wood","brick","wool","grain","ore"].includes(give)&&["wood","brick","wool","grain","ore"].includes(receive)&&give!==receive,"Choose two different basic resources.");pay(p,{[give]:4});p.cards[receive]++;g.history.push(p.name+" traded four "+give+" for one "+receive+".")}
  else throw Error("Unknown move.");
 }
 if(vp(g,id)>=13){g.winner=id;g.phase="finished";g.event=g.p[id].name+" wins!";g.history.push(g.event)}
 if(g.history.length>32)g.history=g.history.slice(-32);
}
function cleaned(row,id){
 const g=structuredClone(row.game);g.p[1-id].cards=null;
 return {room:row.room_code,joined:!!row.player_two_token,role:id,revision:row.revision,game:g};
}
function json(x,status=200){return new Response(JSON.stringify(x),{status,headers:{"content-type":"application/json; charset=utf-8","cache-control":"no-store","access-control-allow-origin":"*"}})}
function randomString(n){const abc="ABCDEFGHJKLMNPQRSTUVWXYZ23456789";return [...crypto.getRandomValues(new Uint8Array(n))].map(b=>abc[b%abc.length]).join("")}
async function api(req,u){
 try {
  const method=u.pathname.split("/").pop();
  const b=req.method==="POST"?await req.json().catch(()=>({})):{};
  if(method==="create"){
    check(req.method==="POST","Use POST.");const code=randomString(8),token=crypto.randomUUID();
    await db("","POST",{room_code:code,player_one_token:token,player_two_token:null,game:newGame(),revision:0},"return=minimal");
    return json({room:code,token,role:0});
  }
  const code=String(b.room||u.searchParams.get("room")||"").toUpperCase();
  check(/^[A-HJ-NP-Z2-9]{8}$/.test(code),"Enter the 8-character room code.");
  const row=await get(code);check(row,"Room not found.");
  if(method==="join"){
    check(req.method==="POST","Use POST.");check(!row.player_two_token,"Room is already full.");const token=crypto.randomUUID();await update(code,row.revision,{player_two_token:token});return json({room:code,token,role:1});
  }
  const token=String(b.token||u.searchParams.get("token")||"");
  const id=token&&token===row.player_one_token?0:token&&token===row.player_two_token?1:-1;
  check(id>=0,"Room access denied.");
  if(method==="state")return json(cleaned(row,id));
  if(method==="action"){
    check(req.method==="POST","Use POST.");check(row.player_two_token,"Wait for the second phone to join.");
    const game=structuredClone(row.game);applyMove(game,id,b.action);
    const updated=await update(code,row.revision,{game});
    return json(cleaned(updated,id));
  }
  return json({error:"Unknown API endpoint."},404);
 }catch(e){return json({error:String(e.message||e)},400)}
}
const HTML=String.raw`
<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
<meta name="theme-color" content="#143746"><title>Hamsa Nomads · Island Duel</title>
<style>
:root{color-scheme:light;--ink:#193b45;--teal:#168c98;--red:#c96551;--gold:#dcb460;--paper:#fffaf0;--cream:#f2e8d5}
*{box-sizing:border-box}body{margin:0;background:linear-gradient(155deg,#eff0df,#e6f2ec);color:var(--ink);font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;min-height:100vh}button,input,select{font:inherit}button{border:0;border-radius:14px;padding:12px 15px;cursor:pointer;background:var(--ink);color:white;font-weight:700;touch-action:manipulation}button:disabled{opacity:.36;cursor:default}.outline{background:white;color:var(--ink);border:1px solid #c7d6cf}.alt{background:var(--teal)}.danger{background:var(--red)}.gold{background:#b8863d}input,select{border:1px solid #c8d7d2;border-radius:12px;background:#fffef8;padding:12px;color:var(--ink);width:100%;font-size:16px}
header{position:sticky;top:0;z-index:9;background:#143746;color:#fff;display:flex;align-items:center;justify-content:space-between;padding:12px 16px;box-shadow:0 2px 12px #0002}header .logo{font-size:19px;font-weight:900;letter-spacing:-.3px}header small{display:block;letter-spacing:1.5px;font-size:9px;color:#e2cf95;margin-top:3px}header .room{font-size:11px;border:1px solid #a6c3bd70;padding:7px 9px;border-radius:20px}.app{max-width:720px;margin:0 auto;padding:12px 12px 95px}.panel{background:#fffdf7;box-shadow:0 4px 16px #1a3a3020;border:1px solid #cbd5c7;border-radius:18px;padding:14px;margin-bottom:12px}.intro{max-width:430px;margin:28px auto}.intro h1{font-size:31px;line-height:1.1;margin:10px 0}.intro p{line-height:1.55;color:#57706d}.intro .line{display:flex;gap:8px;margin-top:10px}.intro .line>*{flex:1;min-width:0}.separate{text-align:center;font-size:12px;opacity:.65;margin:18px}
.gap{height:10px}.hint{font-size:12px;color:#617a75;line-height:1.5}.note{font-size:12px;color:#756442;background:#fff3d5;border-radius:10px;padding:9px;margin-top:10px}.players{display:grid;grid-template-columns:1fr 1fr;gap:9px}.player{border-radius:14px;background:#f7f6ed;border:2px solid transparent;padding:10px;display:flex;gap:8px;align-items:center}.player.active{border-color:#d8a85c;background:#fff3d9}.avatar{width:40px;height:40px;border-radius:50%;display:grid;place-items:center;font-weight:900;background:var(--teal);color:white;font-size:20px}.player:nth-child(2) .avatar{background:var(--red)}.player strong{font-size:14px}.score{font-size:11px;color:#627972}.status{font-size:13px;font-weight:700;margin-top:8px}
.board{border-radius:18px;overflow:hidden;background:radial-gradient(circle at 50% 45%,#438da3 0%,#21758b 65%,#144e65 100%);box-shadow:inset 0 1px 20px #0c364c8c;padding:6px}.board svg{display:block;width:100%;height:auto;max-height:min(63vh,530px);margin:auto;touch-action:manipulation}.board svg .cell{stroke:#e8cf97;stroke-width:.065;stroke-linejoin:round}.board svg .number{font-size:.31px;font-weight:800;text-anchor:middle;dominant-baseline:central;fill:#263d43}.board svg .pict{font-size:.49px;text-anchor:middle;dominant-baseline:central}.board svg .edge{stroke-linecap:round;stroke-width:.17}.board svg .clickEdge{stroke:transparent;stroke-width:.33;cursor:pointer}.board svg .vertex{stroke:white;stroke-width:.035}.board svg .tap{cursor:pointer;fill:#fffbd3d8;stroke:#805e24;stroke-width:.04}.board svg .water{fill:#ffffff18;stroke:#9ed2d966;stroke-width:.025}
.controls{display:grid;grid-template-columns:repeat(3,1fr);gap:7px;margin-top:10px}.controls button{font-size:12px;padding:11px 4px}.controls button.sel{outline:3px solid var(--gold);outline-offset:1px}.sub{font-size:11px;font-weight:800;color:#7f7770;text-transform:uppercase;letter-spacing:1px;margin:12px 0 7px}.cards{display:grid;grid-template-columns:repeat(4,1fr);gap:7px}.card{background:#f7f3e7;border:1px solid #e4dccc;border-radius:12px;text-align:center;padding:8px 2px;font-size:11px}.card .pic{font-size:22px}.card strong{font-size:15px}.track{display:grid;grid-template-columns:repeat(3,1fr);gap:7px}.track button{font-size:11px;padding:10px 4px}.dice{display:flex;align-items:center;justify-content:space-between;gap:10px}.dice .box{display:flex;align-items:center;gap:5px}.die{width:37px;height:37px;border-radius:9px;background:#fcda75;color:#213743;display:grid;place-items:center;font-size:19px;font-weight:900;box-shadow:0 2px 1px #aaa4}.die.red{background:#e99177}.die.event{background:#fdf8e9;font-size:13px;width:58px}.message{font-size:12px;color:#55736c;line-height:1.45}.inline{display:flex;gap:7px;align-items:center}.inline>*{min-width:0}.inline select{flex:1}.inline button{flex:0 0 auto;padding:12px}.history{font-size:12px;color:#617470;line-height:1.6;padding-left:18px;margin-bottom:0}.toast{position:fixed;left:12px;right:12px;bottom:18px;max-width:530px;margin:auto;padding:13px;border-radius:13px;background:#223e42;color:white;box-shadow:0 5px 25px #0004;z-index:99;display:none;font-size:13px;text-align:center}.toast.on{display:block} .link{color:#257b8d;text-decoration:underline;cursor:pointer;border:0;background:none;padding:0}.hidden{display:none!important}
</style></head><body>
<header><div><div class="logo">✋ HAMSA NOMADS</div><small>ISLAND DUEL · TWO PHONES</small></div><div class="room" id="roomLabel">BROWSER PROTOTYPE</div></header>
<div class="app"><section id="lobby" class="panel intro"><div style="font-size:40px">🏝️</div><h1>Your island. Two explorers.</h1><p>Play side by side, each on your own iPhone. One person creates a room and shares the eight-character code. No account or installation.</p><button id="host" class="alt" style="width:100%">Create a game · play as Lulab</button><div class="separate">— OR JOIN A FRIEND —</div><input id="code" maxlength="8" placeholder="Enter room code" autocapitalize="characters"><div class="gap"></div><button id="join" style="width:100%">Join game · play as Mara</button><div class="note">Quick-start house rules. Not the complete CATAN: Cities & Knights rules. Three correct dice, resource production, building, city improvements, knights and barbarian events are included.</div></section>
<section id="game" class="hidden">
<div class="panel"><div class="players" id="players"></div><div class="status" id="status"></div><div class="hint" style="margin-top:5px">Room code <b id="roomCode"></b> · <button id="copy" class="link">Copy invitation</button> · <button id="reset" class="link" style="margin-left:8px">Leave</button></div></div>
<div class="panel dice"><div><div class="sub" style="margin-top:0">The dice</div><div class="box" id="diceBox"><div class="die red">–</div><div class="die">–</div><div class="die event">EVENT</div></div></div><button id="roll" class="alt">Roll dice</button></div>
<div class="panel"><div id="event" class="message"></div><div class="sub">Explore the board</div><div class="board"><svg id="board" viewBox="-5.7 -4.7 11.4 9.4" aria-label="Nineteen hexagonal terrain tiles and building locations"></svg></div><div class="hint" id="boardHint" style="margin-top:8px"></div><div class="controls" id="actions">
<button data-mode="road">🛤️ Road</button><button data-mode="settlement">🏠 Settle</button><button data-mode="city">🏰 City</button><button data-mode="wall">🧱 Wall</button><button data-mode="knight">🛡️ Knight</button><button data-mode="activate">⚡ Activate</button></div></div>
<div class="panel"><div class="sub" style="margin-top:0">Your supplies</div><div class="cards" id="cards"></div><div class="sub">City improvements · tap to upgrade</div><div class="track" id="tracks"></div><div class="sub">Bank trade · 4 for 1</div><div class="inline"><select id="give"></select><span>→</span><select id="receive"></select><button id="trade" class="gold">Trade</button></div><div class="gap"></div><button id="end" style="width:100%">End turn →</button></div>
<div class="panel"><div class="sub" style="margin-top:0">Recent moves</div><ol class="history" id="history"></ol></div>
<div class="note">Prototype limits: fixed opening setup, simplified 2-player balance, robber and progress-card decks not implemented, and simplified barbarian combat. This is not a complete Cities & Knights rules implementation.</div></section></div>
<div id="toast" class="toast"></div>
<script>
(function(){
"use strict";
var API=location.pathname.replace(/\/$/,"")+"/api/";
var session=JSON.parse(localStorage.getItem("hamsaIslandV1")||"null"),state=null,mode="",loading=false,poll=null,lastRev=-1;
var titles={wood:"Wood",brick:"Brick",wool:"Wool",grain:"Grain",ore:"Ore",paper:"Paper",cloth:"Cloth",coin:"Coin"};
var pictures={wood:"🪵",brick:"🧱",wool:"🐑",grain:"🌾",ore:"🪨",paper:"📜",cloth:"🧶",coin:"🪙"};
var tc={forest:"#2c785b",hills:"#c76c47",pasture:"#8dbc65",fields:"#deb45b",mountains:"#85949a",desert:"#d9c18b"};
var ti={forest:"🌲",hills:"🧱",pasture:"🐑",fields:"🌾",mountains:"⛰️",desert:"🏜️"};
var graph=function(){var V=[],E=[],H=[],vm={},em={};for(var r=-2;r<=2;r++)for(var q=-2;q<=2;q++)if(Math.abs(q+r)<=2){var cx=Math.sqrt(3)*(q+r/2),cy=1.5*r,cc=[],ee=[];for(var i=0;i<6;i++){var a=i*Math.PI/3+Math.PI/6,x=cx+Math.cos(a),y=cy+Math.sin(a),k=Math.round(x*10000)+":"+Math.round(y*10000);if(vm[k]===undefined){vm[k]=V.length;V.push({x:x,y:y})}cc.push(vm[k])}for(var j=0;j<6;j++){var a1=Math.min(cc[j],cc[(j+1)%6]),b1=Math.max(cc[j],cc[(j+1)%6]),ek=a1+":"+b1;if(em[ek]===undefined){em[ek]=E.length;E.push([a1,b1])}ee.push(em[ek])}H.push({x:cx,y:cy,c:cc})}return {V:V,E:E,H:H}}();
var el=id=>document.getElementById(id),esc=s=>String(s).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
function notice(t){var n=el("toast");n.textContent=t;n.classList.add("on");setTimeout(()=>n.classList.remove("on"),3300)}
async function api(method,data){var path=method==="state"?"state?room="+encodeURIComponent(session.room)+"&token="+encodeURIComponent(session.token):method;var opt=method==="state"?{}:{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(data)};var res=await fetch(API+path,opt);var j=await res.json();if(!res.ok)throw Error(j.error||"Network error");return j}
function valid(){return state&&state.joined&&state.game.turn===session.role&&state.game.phase!=="finished"}
function canAct(){return valid()&&state.game.phase==="actions"}
function update(s){state=s;var lobby=el("lobby"),game=el("game");lobby.classList.add("hidden");game.classList.remove("hidden");el("roomLabel").textContent="ROOM "+s.room;el("roomCode").textContent=s.room;render()}
function render(){
if(!state)return;var g=state.game,me=session.role,ready=valid(),can=canAct(),name=g.p[me].name;
el("players").innerHTML=g.p.map((p,i)=>'<div class="player '+(g.turn===i?"active":"")+'"><div class="avatar">'+(i?"M":"L")+'</div><div><strong>'+p.name+(i===me?" · YOU":"")+'</strong><div class="score">'+points(g,i)+' victory points</div></div></div>').join("");
el("status").textContent=!state.joined?"Waiting for Mara to join · share the room code":g.winner!==null?"🏆 "+g.p[g.winner].name+" wins!":ready?(g.phase==="roll"?"Your turn · roll the dice":"Your turn · build, trade or end turn"):"Waiting for "+g.p[g.turn].name+" to play";
el("roll").disabled=!(ready&&g.phase==="roll");el("end").disabled=!can;el("trade").disabled=!can;
el("event").textContent=g.event+" · Barbarian ship: "+g.barb+" steps away";
el("diceBox").innerHTML='<div class="die red">'+(g.dice?g.dice.red:"–")+'</div><div class="die">'+(g.dice?g.dice.yellow:"–")+'</div><div class="die event">'+(g.dice?g.dice.event:"EVENT")+'</div>';
el("cards").innerHTML=Object.keys(titles).map(k=>'<div class="card"><div class="pic">'+pictures[k]+'</div><strong>'+(g.p[me].cards[k]||0)+'</strong><div>'+titles[k]+'</div></div>').join("");
el("tracks").innerHTML=["science","trade","politics"].map(d=>'<button data-disc="'+d+'" '+(can?"":"disabled")+' class="'+(d==="science"?"alt":d==="trade"?"gold":"danger")+'">'+(d==="science"?"📜":d==="trade"?"🧶":"🪙")+' '+d+' '+g.p[me].levels[d]+'/5</button>').join("");
document.querySelectorAll("[data-mode]").forEach(b=>{b.disabled=!can;b.classList.toggle("sel",mode===b.dataset.mode)});
el("boardHint").textContent=!can?"Watch the board while your opponent plays.":mode?"Tap a glowing "+(mode==="road"?"road edge":"junction")+" to "+mode+".":"Choose a building action below the board, then tap its location.";
el("history").innerHTML=g.history.slice(-6).reverse().map(t=>"<li>"+esc(t)+"</li>").join("");
draw(g);
}
function points(g,id){return Object.values(g.buildings).reduce((s,b)=>s+(b.owner===id?(b.kind==="city"?2:1):0),0)+Object.values(g.metros).filter(x=>x===id).length*2}
function draw(g){
var out='<g>';for(var i=0;i<graph.H.length;i++){var h=graph.H[i],t=g.tiles[i];var pts=h.c.map(j=>graph.V[j].x.toFixed(4)+","+graph.V[j].y.toFixed(4)).join(" ");
out+='<polygon class="cell" points="'+pts+'" fill="'+tc[t.t]+'"/>';
out+='<text class="pict" x="'+h.x+'" y="'+(h.y-.23)+'">'+ti[t.t]+'</text>';
if(t.num)out+='<circle cx="'+h.x+'" cy="'+(h.y+.29)+'" r=".25" fill="#fff4d7" stroke="#87613b" stroke-width=".035"/><text class="number" x="'+h.x+'" y="'+(h.y+.30)+'">'+t.num+'</text>';
}out+='</g><g>';graph.E.forEach((pair,i)=>{var a=graph.V[pair[0]],b=graph.V[pair[1]],owner=g.roads[i];if(owner!==undefined)out+='<line class="edge" x1="'+a.x+'" y1="'+a.y+'" x2="'+b.x+'" y2="'+b.y+'" stroke="'+(owner?"#d97150":"#10b8c0")+'"/>';
if(mode==="road"&&canAct()&&owner===undefined)out+='<line data-e="'+i+'" class="clickEdge" x1="'+a.x+'" y1="'+a.y+'" x2="'+b.x+'" y2="'+b.y+'" />';
});out+='</g><g>';
graph.V.forEach((p,i)=>{var b=g.buildings[i],k=g.knights[i];if(b){out+='<circle class="vertex" cx="'+p.x+'" cy="'+p.y+'" r="'+(b.kind==="city"?".27":".20")+'" fill="'+(b.owner?"#d97150":"#0da4b3")+'"/><text x="'+p.x+'" y="'+(p.y+.09)+'" font-size="'+(b.kind==="city"?".34":".25")+'" text-anchor="middle">'+(b.kind==="city"?"♜":"⌂")+'</text>';if(g.walls[i])out+='<circle cx="'+p.x+'" cy="'+p.y+'" r=".31" fill="none" stroke="#f3d677" stroke-width=".07"/>'}
if(k){out+='<circle cx="'+p.x+'" cy="'+p.y+'" r=".20" fill="'+(k.owner?"#e3a38f":"#8de7d9")+'" stroke="#233f46" stroke-width=".03"/><text x="'+p.x+'" y="'+(p.y+.08)+'" font-size=".25" text-anchor="middle">'+(k.active?"⚔":"♟")+'</text>'}
if(mode&&mode!=="road"&&canAct())out+='<circle data-v="'+i+'" class="tap" cx="'+p.x+'" cy="'+p.y+'" r=".14" opacity=".88"/>';
});out+='</g>';el("board").innerHTML=out;
}
async function send(action){if(loading)return;loading=true;try{var s=await api("action",{room:session.room,token:session.token,action:action});mode="";update(s)}catch(e){notice(e.message)}finally{loading=false}}
async function sync(){if(!session||loading)return;try{var s=await api("state");if(!state||s.revision!==lastRev){lastRev=s.revision;update(s)}}catch(e){if(!state)notice(e.message)}}
function entered(s){session=s;localStorage.setItem("hamsaIslandV1",JSON.stringify(s));sync();if(poll)clearInterval(poll);poll=setInterval(sync,1700)}
el("host").onclick=async()=>{el("host").disabled=true;try{entered(await api("create",{}))}catch(e){notice(e.message);el("host").disabled=false}};
el("join").onclick=async()=>{el("join").disabled=true;try{entered(await api("join",{room:el("code").value.trim().toUpperCase()}))}catch(e){notice(e.message);el("join").disabled=false}};
el("roll").onclick=()=>send({kind:"roll"});el("end").onclick=()=>send({kind:"end"});
document.querySelectorAll("[data-mode]").forEach(b=>b.onclick=()=>{mode=mode===b.dataset.mode?"":b.dataset.mode;render()});
el("board").addEventListener("click",e=>{if(!canAct()||!mode)return;var a=e.target.closest("[data-e],[data-v]");if(!a)return;var id=a.dataset.e!==undefined?Number(a.dataset.e):Number(a.dataset.v);send({kind:mode,index:id})});
el("tracks").onclick=e=>{var b=e.target.closest("[data-disc]");if(b&&canAct())send({kind:"improve",discipline:b.dataset.disc})};
var basic=["wood","brick","wool","grain","ore"];for(var id of ["give","receive"])el(id).innerHTML=basic.map(s=>'<option value="'+s+'">'+pictures[s]+" "+titles[s]+'</option>').join("");el("receive").value="ore";
el("trade").onclick=()=>send({kind:"trade",give:el("give").value,receive:el("receive").value});
el("copy").onclick=()=>{var txt="Play Hamsa Nomads Island Duel with me! Open "+location.origin+location.pathname+" and enter room "+session.room;navigator.clipboard.writeText(txt).then(()=>notice("Invitation copied")).catch(()=>notice("Room code: "+session.room))};
el("reset").onclick=()=>{if(confirm("Leave this game on this phone?")){localStorage.removeItem("hamsaIslandV1");location.reload()}};
if(session?.token&&session?.room)entered(session);else{el("lobby").classList.remove("hidden");el("game").classList.add("hidden")}
})();
</script></body></html>
`;
Deno.serve(async(req)=>{
 const u=new URL(req.url);
 if(req.method==="OPTIONS")return new Response(null,{headers:{"access-control-allow-origin":"*","access-control-allow-methods":"POST, GET, OPTIONS","access-control-allow-headers":"content-type"}});
 if(u.pathname.includes("/api/"))return api(req,u);
 if(req.method!=="GET")return new Response("Method not allowed",{status:405});
 return new Response(HTML,{headers:{"content-type":"text/html; charset=utf-8","cache-control":"no-store","x-content-type-options":"nosniff"}});
});
