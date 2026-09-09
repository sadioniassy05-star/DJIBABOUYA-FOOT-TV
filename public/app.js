
const $=id=>document.getElementById(id);
let state=null, pollTimer=null, clockTimer=null, logged=false;
const TWITCH_CHANNEL_DEFAULT="banialfaty";
let twitchPlayer=null, twitchChannelLoaded="", twitchIsLive=false, twitchReady=false;
let tvBackgroundUrl="/api/background";
async function api(path,opts={}){const r=await fetch(path,{...opts,headers:{'content-type':'application/json',...(opts.headers||{})}});return r.json()}
function fmt(sec){sec=Math.max(0,Math.floor(sec));return String(Math.floor(sec/60)).padStart(2,'0')+":"+String(sec%60).padStart(2,'0')}
function currentClock(){if(!state)return 0;if(!state.running||!state.clockStartedAt)return state.clock;return state.clock+Math.floor((Date.now()-state.clockStartedAt)/1000)}
function twitchParent(){ return window.location.hostname || "localhost"; }
function setTwitchVisibility(live){
  twitchIsLive=!!live;

  const f=$("directFrame");

  // Le lecteur Twitch reste toujours visible.
  // Twitch affiche lui-même son état hors ligne/en ligne.
  f.classList.remove("hidden");

  if(live){
    $("liveBadge").textContent="● DIRECT — BANIALFATY";
  }else{
    $("liveBadge").textContent="● EN ATTENTE DU DIRECT";
  }
}
function initTwitchPlayer(channel){
  const ch=String(channel||TWITCH_CHANNEL_DEFAULT).trim().replace(/^#/,"");

  if(!window.Twitch || !window.Twitch.Player) return false;

  // Si le lecteur existe déjà, on ne le recrée jamais.
  if(twitchPlayer){
    if(twitchChannelLoaded!==ch){
      twitchChannelLoaded=ch;
      try{
        twitchPlayer.setChannel(ch);
      }catch(e){}
    }
    return true;
  }

  twitchChannelLoaded=ch;
  twitchReady=false;

  const host=$("twitchPlayer");
  if(!host) return false;

  host.innerHTML="";

  try{
    twitchPlayer=new Twitch.Player("twitchPlayer",{
      width:"100%",
      height:"100%",
      channel:ch,
      parent:[twitchParent()],
      autoplay:true,
      muted:true
    });

    twitchPlayer.addEventListener(Twitch.Player.READY,()=>{
      twitchReady=true;
    });

    twitchPlayer.addEventListener(Twitch.Player.ONLINE,()=>{
      setTwitchVisibility(true);
      try{twitchPlayer.play();}catch(e){}
    });

    twitchPlayer.addEventListener(Twitch.Player.OFFLINE,()=>{
      setTwitchVisibility(false);
    });

    twitchPlayer.addEventListener(Twitch.Player.PLAYBACK_BLOCKED,()=>{});

    return true;

  }catch(e){
    twitchPlayer=null;
    twitchReady=false;
    twitchChannelLoaded="";
    setTwitchVisibility(false);
    return false;
  }
}
function ensureTwitchPlayer(){
  const ch=state?.twitch?.channel||TWITCH_CHANNEL_DEFAULT;
  if(!initTwitchPlayer(ch)){
    // The Twitch SDK may still be loading; retry shortly without any Admin action.
    setTimeout(ensureTwitchPlayer,500);
  }
}

function render(){
 if(!state)return;
 const photo=$("tv").querySelector(".tv-photo"); if(photo) photo.style.backgroundImage=`url("${tvBackgroundUrl}?v=${state.backgroundVersion||0}")`;
 $("teamA").textContent=state.teamA;$("teamB").textContent=state.teamB;$("scoreA").textContent=state.scoreA;$("scoreB").textContent=state.scoreB;
 $("clock").textContent=fmt(currentClock())+(state.addedTime?` +${state.addedTime}`:"");
 $("scoreboard").style.display=state.display.visible?"grid":"none";$("scoreboard").style.transform=`translateX(-50%) scale(${state.display.scale/100})`;
 $("scoreA").style.color=state.colors.score;$("scoreB").style.color=state.colors.score;$("clock").style.color=state.colors.clock;
 $("scoreboard").style.background=state.colors.scoreBg;
 const v=$("directVideo"); const f=$("directFrame");
 if(state.twitch?.active){
   v.classList.add("hidden");
   ensureTwitchPlayer();
   
 }else if(state.directUrl){
   twitchPlayer=null;twitchReady=false;twitchChannelLoaded="";twitchIsLive=false;
   if(state.directType==="iframe"){v.classList.add("hidden");f.classList.remove("hidden");f.dataset.twitchSrc="";f.innerHTML=`<iframe src="${esc(state.directUrl)}" style="width:100%;height:100%;border:0" allow="autoplay;fullscreen" allowfullscreen></iframe>`}
   else{f.classList.add("hidden");f.dataset.twitchSrc="";f.innerHTML="";v.classList.remove("hidden");if(v.src!==state.directUrl){v.src=state.directUrl;v.play().catch(()=>{})}}
 }else{twitchPlayer=null;twitchReady=false;twitchChannelLoaded="";twitchIsLive=false;v.classList.add("hidden");f.classList.add("hidden");f.dataset.twitchSrc="";f.innerHTML=""}
 renderAd();renderPoster();renderGoal();renderSub();renderLineup();renderReplay();$("message").textContent=state.message||"";$("message").classList.toggle("hidden",!state.message);
}
function esc(s){return String(s||"").replace(/"/g,"&quot;")}
function renderAd(){const a=state.ad;const e=$("ad");if(!a.active){e.classList.add("hidden");return}e.classList.remove("hidden");e.style.color=a.color;e.style.background=a.bg;e.innerHTML=(a.url?`<img src="${esc(a.url)}">`:"")+`<h2>${esc(a.title)}</h2><p>${esc(a.text)}</p>`}
function renderPoster(){const p=state.poster,e=$("poster");if(!p.active){e.classList.add("hidden");return}e.classList.remove("hidden");e.innerHTML=`<div class="poster-inner" style="--pc:${p.color};${p.photo?`background-image:linear-gradient(#0f172acc,#0f172acc),url('${esc(p.photo)}');background-size:cover;background-position:center`:''}"><div class="comp">${esc(p.competition)}</div><div class="teams">${esc(p.team1)}<br>VS<br>${esc(p.team2)}</div><div>${esc(p.date)} ${esc(p.time)}</div><div>${esc(p.stadium)}</div></div>`}
function renderGoal(){const g=state.goals?.at(-1),e=$("goal");if(!g){e.classList.add("hidden");return}e.classList.remove("hidden");e.innerHTML=`⚽ BUT — ${esc(g.player)} <span>${esc(g.minute)}'</span>`}
function renderSub(){const s=state.substitution,e=$("substitution");if(!s.active){e.classList.add("hidden");return}e.classList.remove("hidden");e.innerHTML=`⬅ ${esc(s.outName)} (#${esc(s.outNumber)})<br>➡ ${esc(s.inName)} (#${esc(s.inNumber)})`}
function renderLineup(){const l=state.lineup,e=$("lineup");if(!l.active){e.classList.add("hidden");return}e.classList.remove("hidden");e.innerHTML=`<h2>COMPOSITION ${esc(l.formation)} — ${esc(l.team==="A"?state.teamA:state.teamB)}</h2><div class="players-grid">${(l.players||[]).map((x,i)=>`<div class="player">${i+1}. ${esc(x)}</div>`).join("")}</div>`}
function renderReplay(){const r=state.replay,e=$("replay"),v=$("replayVideo");if(!r.active||!r.url){e.classList.add("hidden");return}e.classList.remove("hidden");if(v.src!==r.url)v.src=r.url;v.playbackRate=r.speed||1}
async function refresh(){const x=await api("/api/state");if(x.ok){state=x.state;render()}}
async function save(patch){const x=await api("/api/state",{method:"POST",body:JSON.stringify(patch)});if(x.ok){state=x.state;render()}else alert(x.error||"Erreur")}
async function uploadBackground(){
 const file=$("tvBackgroundFile").files?.[0];
 if(!file){$("backgroundStatus").textContent="Choisis d’abord une image.";return;}
 if(file.size>8*1024*1024){$("backgroundStatus").textContent="Image trop volumineuse (8 Mo maximum).";return;}
 const reader=new FileReader();
 reader.onload=async()=>{
   $("backgroundStatus").textContent="Publication en cours…";
   const x=await api("/api/background",{method:"POST",body:JSON.stringify({data:reader.result})});
   $("backgroundStatus").textContent=x.ok?"Fond TV appliqué à tous les écrans.":(x.error||"Erreur");
   if(x.ok){state.backgroundVersion=x.version||Date.now();render();}
 };
 reader.readAsDataURL(file);
}
$("publishBackground").onclick=uploadBackground;
$("resetBackground").onclick=async()=>{
 const x=await api("/api/background",{method:"DELETE"});
 $("backgroundStatus").textContent=x.ok?"Fond par défaut restauré.":(x.error||"Erreur");
 if(x.ok){state.backgroundVersion=x.version||Date.now();render();}
};

function setupInputs(){
 $("twitchChannel").value=state.twitch?.channel||TWITCH_CHANNEL_DEFAULT;
 $("teamAInput").value=state.teamA;$("teamBInput").value=state.teamB;$("directUrl").value=state.directUrl;$("directType").value=state.directType;
 $("adTitle").value=state.ad.title;$("adText").value=state.ad.text;$("adUrl").value=state.ad.url;$("adDuration").value=state.ad.duration;
 $("replayUrl").value=state.replay.url;$("replayStart").value=state.replay.start;$("replayEnd").value=state.replay.end;$("replaySpeed").value=state.replay.speed;
}
$("adminBtn").onclick=()=>{$("adminPanel").classList.remove("hidden");$("loginBox").classList.remove("hidden");$("controls").classList.add("hidden");$("password").focus()};
$("closeAdmin").onclick=()=>$("adminPanel").classList.add("hidden");
$("loginBtn").onclick=async()=>{const x=await api("/api/login",{method:"POST",body:JSON.stringify({password:$("password").value})});if(x.ok){logged=true;$("loginBox").classList.add("hidden");$("controls").classList.remove("hidden");setupInputs()}else $("loginError").textContent=x.error||"Échec"};
$("password").onkeydown=e=>{if(e.key==="Enter")$("loginBtn").click()};
$("logoutBtn").onclick=async()=>{await fetch("/api/logout");logged=false;$("controls").classList.add("hidden");$("loginBox").classList.remove("hidden")};
document.querySelectorAll("[data-score]").forEach(b=>b.onclick=async()=>{let k=b.dataset.score;let patch={};if(k==="a+")patch.scoreA=state.scoreA+1;if(k==="a-")patch.scoreA=Math.max(0,state.scoreA-1);if(k==="b+")patch.scoreB=state.scoreB+1;if(k==="b-")patch.scoreB=Math.max(0,state.scoreB-1);await save(patch)});
$("updateMatch").onclick=()=>save({teamA:$("teamAInput").value||"ÉQUIPE A",teamB:$("teamBInput").value||"ÉQUIPE B",colors:{score:$("scoreColor").value,scoreBg:$("scoreBg").value,clock:$("clockColor").value}});
$("startClock").onclick=()=>save({running:true,clock:currentClock(),clockStartedAt:Date.now()});
$("stopClock").onclick=()=>save({running:false,clock:currentClock(),clockStartedAt:null});
$("resetClock").onclick=()=>save({running:false,clock:0,clockStartedAt:null,addedTime:0});
$("publishAdded").onclick=()=>save({addedTime:Number($("addedTime").value||0)});
$("showDisplay").onclick=()=>save({display:{visible:true}});$("hideDisplay").onclick=()=>save({display:{visible:false}});$("fitDisplay").onclick=()=>save({display:{visible:true,scale:100,width:100,height:100}});
$("scale").oninput=e=>save({display:{scale:Number(e.target.value)}});


$("publishDirect").onclick=()=>save({directUrl:$("directUrl").value.trim(),directType:$("directType").value});
$("publishAd").onclick=()=>save({ad:{active:true,type:"text",title:$("adTitle").value,text:$("adText").value,url:$("adUrl").value,duration:Number($("adDuration").value||10),color:$("adColor").value,bg:$("adBg").value}});
$("removeAd").onclick=()=>save({ad:{active:false}});
$("publishReplay").onclick=()=>save({replay:{active:true,url:$("replayUrl").value,start:Number($("replayStart").value||0),end:Number($("replayEnd").value||30),speed:Number($("replaySpeed").value)}});
$("slowReplay").onclick=()=>save({replay:{active:true,url:$("replayUrl").value,speed:Number($("replaySpeed").value)}});
$("removeReplay").onclick=()=>save({replay:{active:false}});
$("publishSub").onclick=()=>save({substitution:{active:true,outName:$("outName").value,outNumber:$("outNumber").value,inName:$("inName").value,inNumber:$("inNumber").value,duration:Number($("subDuration").value||10)}});
$("removeSub").onclick=()=>save({substitution:{active:false}});
$("publishGoal").onclick=()=>save({goals:[...(state.goals||[]),{player:$("goalPlayer").value,minute:$("goalMinute").value}]});
$("clearGoals").onclick=()=>save({goals:[]});
$("publishLineup").onclick=()=>save({lineup:{active:true,formation:$("formation").value,team:$("lineupTeam").value,players:$("players").value.split(/\n/).map(x=>x.trim()).filter(Boolean).slice(0,11)}});
$("removeLineup").onclick=()=>save({lineup:{active:false}});
$("publishPoster").onclick=()=>save({poster:{active:true,competition:$("competition").value,team1:$("posterTeam1").value||state.teamA,team2:$("posterTeam2").value||state.teamB,date:$("posterDate").value,time:$("posterTime").value,stadium:$("stadium").value,photo:$("posterPhoto").value,color:$("posterColor").value,style:$("posterStyle").value}});
$("removePoster").onclick=()=>save({poster:{active:false}});
$("publishMessage").onclick=()=>save({message:$("messageInput").value});
setInterval(()=>{if(state){$("clock").textContent=fmt(currentClock())+(state.addedTime?` +${state.addedTime}`:"")}},1000);
setInterval(refresh,1500);
setInterval(()=>{if(state?.twitch?.active && (!twitchPlayer || !twitchReady)) ensureTwitchPlayer()},2000);
refresh();
