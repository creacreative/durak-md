(()=>{
const ui=id=>document.getElementById(id);let peer=null,isHost=false,room="",myPlayerId=null,nextPlayerNumber=0,connections=[],onlineState=null,onlineActive=false,publicHosting=false,reactionTimer=null,reactionViewTimer=null,onlineAttackBatchTimer=null,joinRejected=false;
const ONLINE_ATTACK_BATCH_MS=900;
const ranks=["6","7","8","9","10","J","Q","K","A"],suits=["♠","♥","♦","♣"];
const rank=c=>ranks.indexOf(c.rank)+(c.suit===onlineState?.trump?20:0),beatsOnline=(d,a)=>(d.suit===a.suit&&rank(d)>rank(a))||(d.suit===onlineState.trump&&a.suit!==onlineState.trump);
const status=(t,bad=false)=>{ui("networkStatus").textContent=t;ui("networkStatus").className=`network-status ${bad?"error":"ok"}`};
const cleanOnlineName=value=>(String(value||"").trim().replace(/\s+/g," ").slice(0,16)||"Jucător"),onlineNameKey=value=>cleanOnlineName(value).normalize("NFKC").toLocaleLowerCase("ro"),escapeOnlineHtml=value=>String(value).replace(/[&<>"']/g,char=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"})[char]);
function cleanPeer(){clearTimeout(reactionTimer);clearTimeout(reactionViewTimer);clearTimeout(onlineAttackBatchTimer);document.body.classList.remove("online-active");ui("playerReaction").textContent="";if(publicHosting&&room)window.DurakAuth?.closeRoom(room);publicHosting=false;if(peer)peer.destroy();peer=null;connections=[];onlineActive=false;joinRejected=false}
function reactOnline(playerId,kind){let reaction=window.DurakMultiplayerReactions.createMultiplayerReaction(playerId,kind);if(!reaction)return;onlineState.reaction=reaction;clearTimeout(reactionTimer);reactionTimer=setTimeout(()=>{if(isHost&&onlineState?.reaction?.id===reaction.id){delete onlineState.reaction;sync()}},Math.max(0,reaction.expiresAt-Date.now()))}
function openLobby(){ui("mainMenu").hidden=true;ui("setup").hidden=true;ui("onlineLobby").hidden=false;ui("lobbyChoices").hidden=false;ui("joinArea").hidden=true;ui("publicArea").hidden=true;ui("roomArea").hidden=true;status("")}
ui("singleMode").onclick=()=>{cleanPeer();ui("mainMenu").hidden=true;ui("setup").hidden=false};ui("multiMode").onclick=openLobby;
ui("singleBack").onclick=()=>{ui("setup").hidden=true;ui("mainMenu").hidden=false};
ui("lobbyBack").onclick=()=>{cleanPeer();ui("onlineLobby").hidden=true;ui("mainMenu").hidden=false};ui("showJoin").onclick=()=>{ui("lobbyChoices").hidden=true;ui("joinArea").hidden=false};
function code(){return Math.random().toString(36).slice(2,8).toUpperCase()}
function ensurePeer(id){if(typeof Peer==="undefined"){status("PeerJS nu s-a încărcat. Verifică internetul.",true);return null}return new Peer(id,{debug:1})}
ui("hostRoom").onclick=()=>{isHost=true;room=code();peer=ensurePeer(`durak-${room.toLowerCase()}`);if(!peer)return;ui("lobbyChoices").hidden=true;ui("publicArea").hidden=true;ui("roomArea").hidden=false;ui("copyCode").textContent=room;peer.on("open",async()=>{connections=[];nextPlayerNumber=1;myPlayerId="player-0";onlineState={lobby:[{id:myPlayerId,name:cleanOnlineName(ui("onlineName").value||"Gazdă"),host:true}]};drawLobby();status("Camera este gata. Trimite codul unui prieten.");if(publicHosting){try{await window.DurakAuth.createRoom(room,`Masa lui ${onlineState.lobby[0].name}`);status("Masa publică este vizibilă. Așteaptă jucători.")}catch(e){publicHosting=false;status(e.message,true)}}});peer.on("connection",acceptConnection);peer.on("error",e=>status(`Eroare: ${e.type}`,true))};
ui("joinRoom").onclick=()=>{isHost=false;joinRejected=false;room=ui("roomCode").value.trim().toUpperCase();if(!room)return status("Introdu codul camerei.",true);peer=ensurePeer();if(!peer)return;ui("joinArea").hidden=true;ui("roomArea").hidden=false;ui("copyCode").textContent=room;peer.on("open",()=>{let c=peer.connect(`durak-${room.toLowerCase()}`,{reliable:true});connections=[c];c.on("open",()=>{c.send({type:"join",name:cleanOnlineName(ui("onlineName").value)});status("Conectat. Așteaptă gazda.")});c.on("data",receive);c.on("close",()=>{if(!joinRejected)status("Gazda a închis camera.",true)});c.on("error",()=>status("Conexiunea a eșuat.",true))});peer.on("error",e=>status(e.type==="peer-unavailable"?"Camera nu există.":`Eroare: ${e.type}`,true))};
function acceptConnection(c){if(onlineActive||connections.length>=5){c.on("open",()=>c.send({type:"error",message:"Camera este plină sau partida a început."}));return}connections.push(c);c.on("data",d=>{if(d.type==="join"&&!c.playerId){let name=cleanOnlineName(d.name);if(onlineState.lobby.some(player=>onlineNameKey(player.name)===onlineNameKey(name))){send(c,{type:"error",message:"Acest nickname este deja folosit în lobby. Alege altul."});connections=connections.filter(connection=>connection!==c);setTimeout(()=>c.close(),120);return}c.playerId=`player-${nextPlayerNumber++}`;onlineState.lobby.push({id:c.playerId,name});send(c,{type:"welcome",playerId:c.playerId});broadcastLobby()}else if(d.type==="action"&&c.playerId)processAction(c.playerId,d.action)});c.on("close",()=>{if(!onlineActive){onlineState.lobby=onlineState.lobby.filter(player=>player.id!==c.playerId);connections=connections.filter(x=>x!==c);broadcastLobby()}})}
function send(c,d){if(c?.open)c.send(d)}function broadcast(d){connections.forEach(c=>send(c,d))}function broadcastLobby(){drawLobby();broadcast({type:"lobby",lobby:onlineState.lobby})}
function receive(d){if(d.type==="welcome")myPlayerId=d.playerId;if(d.type==="lobby"){onlineState={lobby:d.lobby};drawLobby()}if(d.type==="state"){myPlayerId=d.playerId||myPlayerId;onlineState=d.state;onlineActive=true;document.body.classList.add("online-active");ui("onlineLobby").hidden=true;renderOnline()}if(d.type==="error"||d.type==="kicked"){joinRejected=true;status(d.message,true)}}
function kickLobbyPlayer(playerId){if(!isHost||onlineActive||playerId===myPlayerId)return;let connection=connections.find(item=>item.playerId===playerId),player=onlineState?.lobby.find(item=>item.id===playerId);if(!connection||!player)return;send(connection,{type:"kicked",message:"Gazda te-a scos din lobby."});onlineState.lobby=onlineState.lobby.filter(item=>item.id!==playerId);connections=connections.filter(item=>item!==connection);broadcastLobby();setTimeout(()=>connection.close(),120)}
function drawLobby(){let list=onlineState?.lobby||[],view=window.DurakMultiplayerSession.lobbyStatusFor(list.length,isHost),box=ui("onlinePlayers");box.innerHTML=list.map((p,i)=>`<div class="online-player"><b>${escapeOnlineHtml(p.name)}</b><span>${i===0?"Gazdă":"Conectat"}</span>${isHost&&!p.host?`<button class="lobby-kick" data-kick="${p.id}" aria-label="Dă afară ${escapeOnlineHtml(p.name)}">Dă afară</button>`:""}</div>`).join("");box.querySelectorAll("button[data-kick]").forEach(button=>button.onclick=()=>kickLobbyPlayer(button.dataset.kick));ui("startOnline").hidden=!view.canStart;status(view.message)}
ui("copyCode").onclick=async()=>{try{await navigator.clipboard.writeText(room);status("Cod copiat!")}catch{status(`Cod: ${room}`)}};
async function showPublicRooms(){if(!await window.DurakAuth?.requireAccount())return;ui("lobbyChoices").hidden=true;ui("joinArea").hidden=true;ui("publicArea").hidden=false;let box=ui("publicRooms");box.innerHTML="Se caută mese…";try{let rooms=await window.DurakAuth.listRooms();box.innerHTML=rooms.length?rooms.map(r=>`<div class="public-room"><div><b>${r.name}</b><br><span>${r.players}/${r.max_players} jucători</span></div><code>${r.code}</code><button data-room="${r.id}">Intră</button></div>`).join(""):`<p>Nu există mese. Creează tu prima masă!</p>`;box.querySelectorAll("button[data-room]").forEach(b=>b.onclick=async()=>{try{let c=await window.DurakAuth.joinRoom(b.dataset.room);ui("roomCode").value=c;ui("joinRoom").click()}catch(e){ui("publicStatus").textContent=e.message}})}catch(e){box.innerHTML="";ui("publicStatus").textContent=e.message}}
if(ui("publicRoomsBtn"))ui("publicRoomsBtn").onclick=showPublicRooms;if(ui("refreshRooms"))ui("refreshRooms").onclick=showPublicRooms;if(ui("createPublicBtn"))ui("createPublicBtn").onclick=async()=>{if(!await window.DurakAuth?.requireAccount())return;publicHosting=true;ui("hostRoom").click()};
ui("startOnline").onclick=()=>{if(!isHost||onlineState.lobby.length<2)return;if(publicHosting)window.DurakAuth?.closeRoom(room,"playing");onlineState=window.DurakMultiplayerSession.startGame(onlineState.lobby);onlineActive=true;document.body.classList.add("online-active");ui("onlineLobby").hidden=true;sync()};
function sync(){renderOnline();connections.forEach(c=>send(c,{type:"state",playerId:c.playerId,state:window.DurakMultiplayerSession.viewForPlayer(onlineState,c.playerId)}))}
function playerById(id){return onlineState.players.find(player=>player.id===id)}
function next(id){let players=onlineState.players,start=players.findIndex(player=>player.id===id);for(let n=1;n<=players.length;n++){let player=players[(start+n)%players.length];if(!player.out)return player.id}return id}
function refillOnline(){let s=onlineState,attacker=playerById(s.attacker),defender=playerById(s.defender),order=[attacker,...s.players.filter(p=>p.id!==s.attacker&&p.id!==s.defender),defender];order.forEach(p=>{while(p.hand.length<6&&s.deck.length)p.hand.push(s.deck.pop())});s.players.forEach(p=>{if(!s.deck.length&&!p.hand.length&&!p.out){p.out=true;s.winner.push(p.id)}})}
function newOnlineRound(att){clearTimeout(onlineAttackBatchTimer);let s=onlineState;s.battle=[];s.attacker=att;s.defender=next(att);s.limit=Math.min(6,playerById(s.defender).hand.length);s.phase="attack";let alive=s.players.filter(p=>!p.out);if(alive.length<=1){s.over=true;if(alive[0])s.winner.push(alive[0].id)}}
function closeOnlineAttackBatch(){clearTimeout(onlineAttackBatchTimer);onlineAttackBatchTimer=null;if(isHost&&onlineState?.phase==="attackBatch"){onlineState.phase="defend";sync()}}
function scheduleOnlineAttackBatch(){clearTimeout(onlineAttackBatchTimer);onlineAttackBatchTimer=setTimeout(closeOnlineAttackBatch,ONLINE_ATTACK_BATCH_MS)}
function processAction(playerId,a){
  if(!isHost||onlineState.over)return;
  let s=onlineState,p=playerById(playerId),reactionKind=null;if(!p)return;
  if(a.type==="card"){
    let k=p.hand.findIndex(c=>c.id===a.id);if(k<0)return;let c=p.hand[k];
    if((s.phase==="attack"||s.phase==="add"||s.phase==="attackBatch")&&playerId===s.attacker){
      if(s.battle.length>=s.limit)return;
      let ranksOnTable=new Set(s.battle.flatMap(x=>[x.attack.rank,x.defense?.rank].filter(Boolean))),hasDefense=s.battle.some(x=>x.defense);
      if(s.phase==="add"&&!ranksOnTable.has(c.rank))return;
      if(s.phase==="attackBatch"&&s.battle.length&&!hasDefense&&c.rank!==s.battle[0].attack.rank)return;
      if(s.phase==="attackBatch"&&hasDefense&&!ranksOnTable.has(c.rank))return;
      let firstCard=!s.battle.length;
      p.hand.splice(k,1);s.battle.push({attack:c});s.phase="attackBatch";scheduleOnlineAttackBatch();if(firstCard)reactionKind="attack";
    }else if(s.phase==="defend"&&playerId===s.defender){
      let o=s.battle.find(x=>!x.defense);if(!o||!beatsOnline(c,o.attack))return;p.hand.splice(k,1);o.defense=c;s.phase="add";reactionKind="defend";
    }
  }else if(a.type==="sendBatch"&&playerId===s.attacker&&s.phase==="attackBatch"){
    clearTimeout(onlineAttackBatchTimer);onlineAttackBatchTimer=null;s.phase="defend";
  }else if(a.type==="take"&&playerId===s.defender){
    p.hand.push(...s.battle.flatMap(x=>[x.attack,x.defense].filter(Boolean)));let n=next(s.defender);refillOnline();newOnlineRound(n);reactionKind="take";
  }else if(a.type==="finish"&&playerId===s.attacker&&s.phase==="add"){
    let d=s.defender;refillOnline();newOnlineRound(d);reactionKind="finish";
  }
  if(reactionKind)reactOnline(playerId,reactionKind);
  sync();
}
function act(a){if(isHost)processAction(myPlayerId,a);else send(connections[0],{type:"action",action:a})}
function reactionPlayer(p,reaction){return reaction?.playerId===p.id?{...p,openingEmotion:reaction.emotion,openingLine:reaction.phrase,forceDialogue:true}:p}
function renderOnline(){
  let s=isHost&&onlineState?.players?window.DurakMultiplayerSession.viewForPlayer(onlineState,myPlayerId):onlineState;
  if(!s?.players)return;
  let reaction=s.reaction&&s.reaction.expiresAt>Date.now()?s.reaction:null;
  clearTimeout(reactionViewTimer);
  if(reaction)reactionViewTimer=setTimeout(renderOnline,Math.max(0,reaction.expiresAt-Date.now()+30));
  let me=s.players.find(p=>p.id===myPlayerId);
  if(!me?.hand)return;
  let others=s.players.filter(p=>p.id!==me.id),seats=window.DurakRoundTable.createTableLayout(s.players.map(p=>p.id),me.id),seatById=new Map(seats.map(x=>[x.playerId,x])),selfReaction=reaction?.playerId===me.id?reaction:null,badge=ui("playerReaction");
  badge.textContent=selfReaction?.phrase||"";
  badge.className=`player-reaction ${selfReaction?.emotion||""}`;
  ui("opponents").innerHTML=others.map(p=>{let count=p.handCount??p.hand?.length??0;return `<article data-player-id="${p.id}" style="${window.DurakRoundTable.seatStyle(seatById.get(p.id))}" class="bot-seat arrival-ready ${p.out?"out":""} ${p.id===s.attacker?"attacker":""} ${s.battle.length&&p.id===s.defender?"defender":""}">${window.DurakAvatarArrival.chairHTML()}${avatarHTML(reactionPlayer(p,reaction))}<div class="bot-info"><strong>${p.name}</strong><span>${p.out?"a terminat":count+" cărți"}</span></div><div class="hand bot-hand">${Array.from({length:count},()=>botCardHTML()).join("")}</div></article>`}).join("");
  document.querySelector(".you").style.cssText=window.DurakRoundTable.seatStyle(seatById.get(me.id));
  ui("playerHand").innerHTML=[...me.hand].sort((a,b)=>rank(a)-rank(b)).map(c=>cardHTML(c,"player-card")).join("");
  ui("playerCount").textContent=`${me.hand.length} cărți`;
  let deckCount=s.deckCount??s.deck?.length??0,trumpCard=s.trumpCard??s.deck?.[0];
  ui("deckCount").textContent=deckCount;
  ui("deck").style.display=deckCount?"block":"none";
  ui("trump").innerHTML=deckCount&&trumpCard?cardHTML(trumpCard):`<b style="font-size:35px">${s.trump}</b>`;
  ui("battlefield").innerHTML=s.battle.length?s.battle.map(x=>`<div class="pair">${cardHTML(x.attack)}${x.defense?cardHTML(x.defense,"defense"):""}</div>`).join(""):`<div class="empty-table">Masa este liberă</div>`;
  document.querySelectorAll(".player-card").forEach(e=>e.onclick=()=>act({type:"card",id:e.dataset.id}));
  let action="",fn=null,msg="",defender=s.players.find(p=>p.id===s.defender),actor=s.players.find(p=>p.id===(s.phase==="defend"?s.defender:s.attacker));
  if(s.over){let order=s.winner.map(id=>s.players.find(p=>p.id===id)).filter(Boolean);ui("resultTitle").textContent="Clasament multiplayer";ui("resultText").textContent="Partida s-a terminat.";ui("standings").innerHTML=order.map((p,i)=>`<div class="standing-row"><span class="medal">${i<3?["🥇","🥈","🥉"][i]:"•"}</span><b>${p.name}</b><span>${i===order.length-1?"DURAK":`LOCUL ${i+1}`}</span></div>`).join("");ui("modal").hidden=false;msg="Partida s-a terminat."}
  else if(s.phase==="defend"&&myPlayerId===s.defender){msg="Ești atacat. Apără cartea sau ia masa.";action="Ia cărțile";fn=()=>act({type:"take"})}
  else if(s.phase==="attackBatch"&&myPlayerId===s.attacker){msg="Mai poți pune rapid cărți permise din aceeași valoare.";action="Trimite atacul";fn=()=>act({type:"sendBatch"})}
  else if((s.phase==="attack"||s.phase==="add")&&myPlayerId===s.attacker){msg=s.phase==="attack"?`Atacă-l pe ${defender.name}.`:"Poți adăuga o valoare de pe masă.";if(s.phase==="add"){action="Gata";fn=()=>act({type:"finish"})}}
  else msg=`Așteaptă mutarea lui ${actor.name}.`;
  setStatus(msg,action,fn)
}
ui("newGame").onclick=()=>{cleanPeer();over=true;ui("skipBtn").hidden=true;ui("mainMenu").hidden=false;ui("setup").hidden=true;ui("onlineLobby").hidden=true};
const singlePlayAgain=ui("playAgain").onclick;
ui("playAgain").onclick=()=>{if(!onlineActive)return singlePlayAgain?.();cleanPeer();ui("modal").hidden=true;ui("mainMenu").hidden=false;ui("setup").hidden=true;ui("onlineLobby").hidden=true};
})();
