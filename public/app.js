
const $=id=>document.getElementById(id);
let state=null, pollTimer=null, clockTimer=null, logged=false;
let tvPowerOff=false;
let tvPowerStarting=false;
const TWITCH_CHANNEL_DEFAULT="banialfaty";
let twitchPlayer=null, twitchChannelLoaded="", twitchIsLive=false, twitchReady=false;
let tvBackgroundUrl="/api/background";
async function api(path,opts={}){const r=await fetch(path,{...opts,headers:{'content-type':'application/json',...(opts.headers||{})}});return r.json()}
function fmt(sec){sec=Math.max(0,Math.floor(sec));return String(Math.floor(sec/60)).padStart(2,'0')+":"+String(sec%60).padStart(2,'0')}
function currentClock(){if(!state)return 0;if(!state.running||!state.clockStartedAt)return state.clock;return state.clock+Math.floor((Date.now()-state.clockStartedAt)/1000)}
function twitchParent(){ return window.location.hostname || "localhost"; }
function twitchParent(){
  return window.location.hostname || "localhost";
}

function setTwitchVisibility(live){
  twitchIsLive=!!live;

  const f=$("directFrame");
  if(!f) return;

  // Toujours afficher le lecteur Twitch.
  f.classList.remove("hidden");

  const badge=$("liveBadge");
  if(badge){
    badge.textContent=live
      ? "● DIRECT — BANIALFATY"
      : "● LECTEUR TWITCH — BANIALFATY";
  }
}

function initTwitchPlayer(channel){
  const ch=String(channel||TWITCH_CHANNEL_DEFAULT)
    .trim()
    .replace(/^#/,"");

  if(!window.Twitch || !window.Twitch.Player){
    return false;
  }

  const host=$("twitchPlayer");
  if(!host){
    return false;
  }

  // Le lecteur existe déjà.
  if(twitchPlayer){
    if(twitchChannelLoaded!==ch){
      twitchChannelLoaded=ch;

      try{
        twitchPlayer.setChannel(ch);
      }catch(e){}
    }

    setTwitchVisibility(true);
    return true;
  }

  twitchChannelLoaded=ch;
  twitchReady=false;

  host.innerHTML="";

  try{
    twitchPlayer=new Twitch.Player("twitchPlayer",{
      width:"100%",
      height:"100%",
      channel:ch,
      parent:[twitchParent()],
      autoplay:false,
      muted:true
    });

    twitchPlayer.addEventListener(
      Twitch.Player.READY,
      ()=>{
        twitchReady=true;
        setTwitchVisibility(true);
      }
    );

    twitchPlayer.addEventListener(
      Twitch.Player.ONLINE,
      ()=>{
        twitchIsLive=true;
        setTwitchVisibility(true);
      }
    );

    twitchPlayer.addEventListener(
      Twitch.Player.OFFLINE,
      ()=>{
        twitchIsLive=false;
        setTwitchVisibility(false);
      }
    );

    twitchPlayer.addEventListener(
      Twitch.Player.PLAY,
      ()=>{
        twitchIsLive=true;
        setTwitchVisibility(true);
      }
    );

    twitchPlayer.addEventListener(
      Twitch.Player.PLAYING,
      ()=>{
        twitchIsLive=true;
        setTwitchVisibility(true);
      }
    );

    twitchPlayer.addEventListener(
      Twitch.Player.PLAYBACK_BLOCKED,
      ()=>{
        // Sur iPhone, l'utilisateur peut devoir
        // lancer la lecture manuellement.
        setTwitchVisibility(twitchIsLive);
      }
    );

    return true;

  }catch(e){
    console.error("Twitch Player error:",e);

    twitchPlayer=null;
    twitchReady=false;
    twitchChannelLoaded="";
    twitchIsLive=false;

    setTwitchVisibility(false);

    return false;
  }
}

function ensureTwitchPlayer(){
  const ch=state?.twitch?.channel||TWITCH_CHANNEL_DEFAULT;

  if(initTwitchPlayer(ch)){
    return;
  }

  // Le SDK Twitch peut encore être en chargement.
  setTimeout(ensureTwitchPlayer,500);
}
function render(){
 if(!state)return;
 const photo=$("tv").querySelector(".tv-photo"); if(photo) photo.style.backgroundImage=`url("${tvBackgroundUrl}?v=${state.backgroundVersion||0}")`;
 $("teamA").textContent=state.teamA;$("teamB").textContent=state.teamB;$("scoreA").textContent=state.scoreA;$("scoreB").textContent=state.scoreB;
$("clock").textContent=fmt(currentClock());
  const addedClock=$("addedClock");

if(state.addedTimeActive && state.addedTimeStartedAt){
  const elapsed=Math.min(
    Number(state.addedTimeElapsed||0)+
    Math.max(0,Math.floor((Date.now()-state.addedTimeStartedAt)/1000)),
    Number(state.addedTime||0)*60
  );

  if(Date.now()>=state.addedTimeStartedAt){
    addedClock.textContent=`+${state.addedTime||0} ${fmt(elapsed)}`;
    addedClock.classList.remove("hidden");
  }else{
    addedClock.classList.add("hidden");
  }
}else if(state.addedTimeElapsed>0){
  addedClock.textContent=`+${state.addedTime||0} ${fmt(state.addedTimeElapsed)}`;
  addedClock.classList.remove("hidden");
}else{
  addedClock.classList.add("hidden");
}
  const messageBox=$("message");

if(messageBox){
  const messageStart=Number(state.addedTimeMessageStartedAt||0);
  const messageDuration=Number(state.addedTimeMessageDuration||5)*1000;

  const isAddedTimeMessage=
    String(state.message||"").startsWith("TEMPS ADDITIONNEL — ");

  if(
    state.message &&
    (
      !isAddedTimeMessage ||
      !messageStart ||
      Date.now() < messageStart+messageDuration
    )
  ){
    messageBox.textContent=state.message;
    messageBox.classList.remove("hidden");
  }else{
    messageBox.textContent="";
    messageBox.classList.add("hidden");
  }
}
 $("scoreboard").style.display=state.display.visible?"grid":"none";
$("scoreboard").style.left=`${state.display.x??50}%`;
$("scoreboard").style.top=`${state.display.y??9}%`;
$("scoreboard").style.transform=`translateX(-50%) scale(${state.display.scale/100})`;
 $("scoreA").style.color=state.colors.score;
$("scoreB").style.color=state.colors.score;
$("clock").style.color=state.colors.clock;

$("teamA").style.color=state.colors.teamA;
$("teamB").style.color=state.colors.teamB;
$("teamA").style.background=state.colors.teamABg;
$("teamB").style.background=state.colors.teamBBg;

$("scoreboard").style.background="transparent";
 const v=$("directVideo"); const f=$("directFrame");
 if(state.twitch?.active){
  v.classList.add("hidden");
  ensureTwitchPlayer();

 f.classList.remove("hidden");
  }
   
 }else if(state.directUrl){
   twitchPlayer=null;twitchReady=false;twitchChannelLoaded="";twitchIsLive=false;
   if(state.directType==="iframe"){v.classList.add("hidden");f.classList.remove("hidden");f.dataset.twitchSrc="";f.innerHTML=`<iframe src="${esc(state.directUrl)}" style="width:100%;height:100%;border:0" allow="autoplay;fullscreen" allowfullscreen></iframe>`}
   else{f.classList.add("hidden");f.dataset.twitchSrc="";f.innerHTML="";v.classList.remove("hidden");if(v.src!==state.directUrl){v.src=state.directUrl;v.play().catch(()=>{})}}
 }else{twitchPlayer=null;twitchReady=false;twitchChannelLoaded="";twitchIsLive=false;v.classList.add("hidden");f.classList.add("hidden");f.dataset.twitchSrc="";f.innerHTML=""}
  renderAd();renderPoster();renderGoalAnimation();renderSub();renderLineup();renderReplay();renderEntertainment();
  renderPower();
}
function esc(s){return String(s||"").replace(/"/g,"&quot;")}
let adAnimationTimer=null;
let renderedAdKey="";
function renderEntertainment(){
  const box=$("entertainment");
  const video=$("entertainmentVideo");
  const image=$("entertainmentImage");
  const sound=$("entertainmentSound");

  if(!box || !video || !image)return;

  const media=state?.entertainment;

  if(!media?.active || !media.url || (state?.twitch?.active && twitchIsLive)){
    box.classList.add("hidden");
    video.pause();
    video.removeAttribute("src");
    image.removeAttribute("src");
    sound?.classList.add("hidden");
    return;
  }

  box.classList.remove("hidden");

  if(media.type==="image"){
    video.pause();
    video.removeAttribute("src");
    video.classList.add("hidden");

    image.classList.remove("hidden");

    if(image.src!==media.url){
      image.src=media.url;
    }

    sound?.classList.add("hidden");
    return;
  }

  image.classList.add("hidden");
  video.classList.remove("hidden");

  video.autoplay=true;
  video.playsInline=true;
  video.controls=false;

  video.loop=media.loop==="on";

  video.muted=false;
  video.volume=1;

  if(video.src!==media.url){
    video.src=media.url;
    video.load();

    try{
      video.currentTime=0;
    }catch(e){}
  }

  video.play().catch(()=>{
    video.muted=true;

    video.play().catch(()=>{});
  });

  sound?.classList.add("hidden");
}
$("entertainmentSound")?.addEventListener("click",()=>{
  const video=$("entertainmentVideo");
  if(!video)return;

  video.muted=false;
  video.volume=1;

  video.play().then(()=>{
    $("entertainmentSound")?.classList.add("hidden");
  }).catch(()=>{});
});
function renderPower(){
  const overlay=$("tvPowerOverlay");
  const button=$("tvPowerToggle");

  if(!overlay)return;

  const serverPowerOff=!!(state&&state.tvPower);
  tvPowerOff=serverPowerOff;

  if(tvPowerOff){
    overlay.classList.remove("hidden");
    overlay.classList.remove("power-starting");

    if(button){
      button.textContent="⏻ RALLUMER LA TV";
    }

  }else if(tvPowerStarting){
    overlay.classList.remove("hidden");
    overlay.classList.add("power-starting");

    if(button){
      button.textContent="⏻ RALLUMER LA TV";
    }

  }else{
    overlay.classList.add("hidden");
    overlay.classList.remove("power-starting");

    if(button){
      button.textContent="⏻ ÉTEINDRE LA TV";
    }
  }
}
function renderAd(){
  const a=state?.ad;
  const e=$("ad");

  if(!e || !a){
    return;
  }

  /* PUBLICITÉ RETIRÉE */
  if(!a.active){

    e.classList.add("hidden");
    e.innerHTML="";

    if(adAnimationTimer){
      clearTimeout(adAnimationTimer);
      adAnimationTimer=null;
    }

    renderedAdKey="";

    return;
  }

  /*
   * Identifie la publicité actuelle.
   * Cela évite que le refresh() toutes les 1,5 secondes
   * redémarre l'animation.
   */
  const adKey=JSON.stringify({
    title:a.title||"",
    text:a.text||"",
    url:a.url||"",
    duration:a.duration||10,
    color:a.color||"#ffffff",
    bg:a.bg||"#111827"
  });

  /* Si c'est exactement la même publicité,
     on laisse l'animation continuer. */
  if(renderedAdKey===adKey){
    return;
  }

  renderedAdKey=adKey;

  if(adAnimationTimer){
    clearTimeout(adAnimationTimer);
    adAnimationTimer=null;
  }

  e.classList.remove("hidden");

  const duration=Math.max(
    1,
    Number(a.duration||10)
  );

  e.innerHTML=`
    <div class="ad-moving-banner">

      <div
        class="ad-moving-content"
        style="
          color:${esc(a.color||"#ffffff")};
          background:${esc(a.bg||"#111827")};
        "
      >

        ${
          a.url
          ? `
            <img
              class="ad-moving-logo"
              src="${esc(a.url)}"
              alt=""
            >
          `
          : ""
        }

        <div class="ad-moving-text">

          <strong>
            ${esc(a.title||"PUBLICITÉ")}
          </strong>

          ${
            a.text
            ? `
              <span>
                ${esc(a.text)}
              </span>
            `
            : ""
          }

        </div>

      </div>

    </div>
  `;

  const banner=e.querySelector(".ad-moving-banner");

  if(!banner){
    return;
  }

  /* Durée choisie dans ADMIN */
  banner.style.setProperty(
    "--ad-duration",
    `${duration}s`
  );

  /*
   * Force le navigateur à repartir
   * du début de l'animation.
   */
  banner.classList.remove("ad-running");

  requestAnimationFrame(()=>{
    requestAnimationFrame(()=>{
      banner.classList.add("ad-running");
    });
  });

  /*
   * Une fois la traversée terminée,
   * on retire la publicité.
   */
  adAnimationTimer=setTimeout(()=>{

    if(state?.ad?.active){

      e.classList.add("hidden");

    }

  },duration*1000);
}
function renderPoster(){const p=state.poster,e=$("poster");if(!p.active){e.classList.add("hidden");return}e.classList.remove("hidden");e.innerHTML=`<div class="poster-inner" style="--pc:${p.color};${p.photo?`background-image:linear-gradient(#0f172acc,#0f172acc),url('${esc(p.photo)}');background-size:cover;background-position:center`:''}"><div class="comp">${esc(p.competition)}</div><div class="teams">${esc(p.team1)}<br>VS<br>${esc(p.team2)}</div><div>${esc(p.date)} ${esc(p.time)}</div><div>${esc(p.stadium)}</div></div>`}
let renderedGoalAnimationId=0;
let goalAnimationFrame=null;
let goalVoiceSpokenId=0;
let goalVoiceUnlocked=false;
let goalLocalStartId=0;
let goalLocalStartAt=0;

function unlockGoalVoice(){
  if(goalVoiceUnlocked)return;
  if(!("speechSynthesis" in window))return;

  goalVoiceUnlocked=true;

  const test=new SpeechSynthesisUtterance("");
  test.volume=0;

  window.speechSynthesis.speak(test);
  window.speechSynthesis.cancel();
}

document.addEventListener("click",unlockGoalVoice,{once:true});


function speakGoalAnnouncement(ga){
  if(!ga || !ga.active || !ga.voice || !goalVoiceUnlocked)return;
  if(!("speechSynthesis" in window))return;
  if(!ga.id)return;
  if(goalVoiceSpokenId===ga.id)return;

  goalVoiceSpokenId=ga.id;

  const teamName=ga.teamName ||
    (ga.team==="A" ? state?.teamA : state?.teamB) ||
    "l'équipe";

  const player=ga.player || "un joueur";
  const number=ga.number ? `, numéro ${ga.number}` : "";
  const minute=ga.minute!=="" ? `, à la ${ga.minute}e minute` : "";

  const message=
    `But pour ${teamName} ! But marqué par ${player}${number}${minute} !`;

  window.speechSynthesis.cancel();

  const utterance=new SpeechSynthesisUtterance(message);

  utterance.lang="fr-FR";
  utterance.rate=0.9;
  utterance.pitch=1;
  utterance.volume=1;

  window.speechSynthesis.speak(utterance);
}
function renderGoal(){
  const e=$("goal");
  if(!e)return;

  const ga=state?.goalAnimation;

  if(!ga?.active || !ga.startedAt){
    e.classList.add("hidden");
    return;
  }

  const duration=Math.max(2,Number(ga.duration||4));
const elapsed=(Date.now()-Number(ga.startedAt))/1000;

  if(elapsed>=duration){
    e.classList.add("hidden");
    return;
  }

  e.classList.remove("hidden");
}

function updateGoalScoreDisplay(showNew){
  if(!state)return;

  const ga=state.goalAnimation;

  let a=state.scoreA;
  let b=state.scoreB;

  if(ga?.active){
    a=showNew ? Number(ga.newScoreA||0) : Number(ga.oldScoreA||0);
    b=showNew ? Number(ga.newScoreB||0) : Number(ga.oldScoreB||0);
  }

  $("scoreA").textContent=a;
  $("scoreB").textContent=b;
}
function goalAnimationTick(){
  goalAnimationFrame=null;

  const e=$("goal");
  if(!e)return;

  const ga=state?.goalAnimation;
  speakGoalAnnouncement(ga);
  if(!ga?.active || !ga.id){
  e.classList.add("hidden");

  goalLocalStartId=0;
  goalLocalStartAt=0;

  updateGoalScoreDisplay(true);
  return;
}
   const duration=Math.max(2,Number(ga.duration||4));
   if(goalLocalStartId!==ga.id){
  goalLocalStartId=ga.id;
  goalLocalStartAt=Date.now();
}
const elapsed=(Date.now()-goalLocalStartAt)/1000;
  
  

  const progress=elapsed/duration;

  /*
    La durée choisie contrôle toute l'animation :
    0% → 25% : transition bandes
    25% → 70% : GOAL
    70% → 100% : nouveau score
  */

  let stage="transition";

  if(progress>=0.70){
    stage="score";
  }else if(progress>=0.25){
    stage="goal";
  }

  const animation=e.querySelector(".goal-animation");

  if(animation){
    animation.dataset.stage=stage;

    const clock=animation.querySelector(".goal-clock");

    if(clock){
      clock.textContent=fmt(currentClock());
    }
  }

  updateGoalScoreDisplay(stage==="score");

  goalAnimationFrame=requestAnimationFrame(goalAnimationTick);
}

function renderGoalAnimation(){
  const e=$("goal");
  if(!e)return;

  const ga=state?.goalAnimation;

  if(!ga?.active || !ga.id){
    e.classList.add("hidden");

    if(goalAnimationFrame){
      cancelAnimationFrame(goalAnimationFrame);
      goalAnimationFrame=null;
    }
    goalLocalStartId=0;
    goalLocalStartAt=0;
    renderedGoalAnimationId=0;
    updateGoalScoreDisplay(true);
    return;
  }

  const duration=Math.max(2,Number(ga.duration||4));

if(goalLocalStartId!==ga.id){
  goalLocalStartId=ga.id;
  goalLocalStartAt=Number(ga.startedAt||0);
}

const elapsed=(Date.now()-goalLocalStartAt)/1000;

  if(elapsed>=duration){
    e.classList.add("hidden");

    if(goalAnimationFrame){
      cancelAnimationFrame(goalAnimationFrame);
      goalAnimationFrame=null;
    }
    updateGoalScoreDisplay(true);

    return;
}

  if(renderedGoalAnimationId!==ga.id){
    renderedGoalAnimationId=ga.id;

    const c=ga.colors||{};

    e.innerHTML=`
      <div class="goal-animation"
        style="
          --goal-bar:${esc(c.bar||"#1236d6")};
          --goal-stripe:${esc(c.stripe||"#ffffff")};
          --goal-text:${esc(c.text||"#ffffff")};
          --goal-bg:${esc(c.background||"#1236d6")};
          --goal-clock:${esc(c.clock||"#ffffff")};
          --goal-score:${esc(c.score||"#ffffff")};
          --goal-team:${esc(c.team||"#ffffff")};
          --goal-icon:${esc(c.icon||"#ffffff")};
        ">
        <div class="goal-stripes"></div>

        <div class="goal-content">
          <div class="goal-icon">⚽</div>
          <div class="goal-word">GOAL</div>

          <div class="goal-scorer">
            ${esc(ga.player||"BUT")}
            ${ga.number ? `<span class="goal-number">N° ${esc(ga.number)}</span>` : ""}
            ${ga.minute!=="" ? `<span class="goal-minute">${esc(ga.minute)}'</span>` : ""}
          </div>
        </div>

        <div class="goal-final-score">
          <div class="goal-team goal-team-a">${esc(state.teamA)}</div>

          <div class="goal-score-number">
            <span class="goal-score-a">${Number(ga.newScoreA||0)}</span>
            <b>–</b>
            <span class="goal-score-b">${Number(ga.newScoreB||0)}</span>
          </div>

          <div class="goal-team goal-team-b">${esc(state.teamB)}</div>

          <div class="goal-clock">${fmt(currentClock())}</div>
        </div>
      </div>
    `;

    e.classList.remove("hidden");
  }

  if(goalAnimationFrame===null){
    goalAnimationFrame=requestAnimationFrame(goalAnimationTick);
  }
}

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

$("teamAInput").value=state.teamA;$("teamBInput").value=state.teamB;
$("teamAColor").value=state.colors.teamA||"#ffffff";
$("teamBColor").value=state.colors.teamB||"#ffffff";
$("teamABg").value=state.colors.teamABg||"#0b1220";
$("teamBBg").value=state.colors.teamBBg||"#0b1220";
$("positionX").value=state.display.x??50;
$("positionY").value=state.display.y??9;
$("scoreColor").value=state.colors.score||"#ffffff";
$("scoreBg").value=state.colors.scoreBg||"#0b1220";
$("clockColor").value=state.colors.clock||"#ffffff";
  $("goalBarColor").value=state.goalAnimation?.colors?.bar||"#1236d6";
$("goalStripeColor").value=state.goalAnimation?.colors?.stripe||"#ffffff";
$("goalTextColor").value=state.goalAnimation?.colors?.text||"#ffffff";
$("goalBackgroundColor").value=state.goalAnimation?.colors?.background||"#1236d6";
$("goalClockColor").value=state.goalAnimation?.colors?.clock||"#ffffff";
$("goalScoreColor").value=state.goalAnimation?.colors?.score||"#ffffff";
$("goalTeamColor").value=state.goalAnimation?.colors?.team||"#ffffff";
$("goalIconColor").value=state.goalAnimation?.colors?.icon||"#ffffff";
$("goalDuration").value=state.goalAnimation?.duration||4;
$("directUrl").value=state.directUrl;$("directType").value=state.directType;
 $("adTitle").value=state.ad.title;$("adText").value=state.ad.text;$("adUrl").value=state.ad.url;$("adDuration").value=state.ad.duration;
 $("replayUrl").value=state.replay.url;$("replayStart").value=state.replay.start;$("replayEnd").value=state.replay.end;$("replaySpeed").value=state.replay.speed;
  $("addedTimeMessageDuration").value=state.addedTimeMessageDuration??5;
}
$("adminBtn").onclick=()=>{$("adminPanel").classList.remove("hidden");$("loginBox").classList.remove("hidden");$("controls").classList.add("hidden");$("password").focus()};
$("closeAdmin").onclick=()=>$("adminPanel").classList.add("hidden");
$("loginBtn").onclick=async()=>{const x=await api("/api/login",{method:"POST",body:JSON.stringify({password:$("password").value})});if(x.ok){logged=true;$("loginBox").classList.add("hidden");$("controls").classList.remove("hidden");setupInputs()}else $("loginError").textContent=x.error||"Échec"};
$("password").onkeydown=e=>{if(e.key==="Enter")$("loginBtn").click()};
$("logoutBtn").onclick=async()=>{await fetch("/api/logout");logged=false;$("controls").classList.add("hidden");$("loginBox").classList.remove("hidden")};
document.querySelectorAll("[data-score]").forEach(b=>b.onclick=async()=>{
  const k=b.dataset.score;

  let scoreA=Number(state.scoreA||0);
  let scoreB=Number(state.scoreB||0);

  if(k==="a+") scoreA++;
  if(k==="a-") scoreA=Math.max(0,scoreA-1);
  if(k==="b+") scoreB++;
  if(k==="b-") scoreB=Math.max(0,scoreB-1);

  await save({
    scoreA,
    scoreB,
    goalAnimation:{
      active:false,
      startedAt:0
    }
  });
});
$("updateMatch").onclick=()=>save({
  teamA:$("teamAInput").value||"ÉQUIPE A",
  teamB:$("teamBInput").value||"ÉQUIPE B",
  colors:{
    score:$("scoreColor").value,
    scoreBg:$("scoreBg").value,
    clock:$("clockColor").value,
    teamA:$("teamAColor").value,
    teamB:$("teamBColor").value,
    teamABg:$("teamABg").value,
    teamBBg:$("teamBBg").value
  }
}); 
$("startClock").onclick=()=>save({running:true,clock:currentClock(),clockStartedAt:Date.now()});
$("stopClock").onclick=()=>save({running:false,clock:currentClock(),clockStartedAt:null});
$("resetClock").onclick=()=>save({running:false,clock:0,clockStartedAt:null});
$("publishAdded").onclick=async()=>{
  const m=Number($("addedTime").value||0);
  const h=Number($("addedTimeHalf").value||1);
  const normalClock=currentClock();

  const messageDuration=Number(
    $("addedTimeMessageDuration").value||5
  );

  const messageStartedAt=Date.now();

  await save({
    addedTime:m,
    addedTimeHalf:h,
    addedTimeNormalClock:normalClock,

    addedTimeActive:true,
    addedTimeStartedAt:messageStartedAt+(messageDuration*1000),
    addedTimePausedAt:null,
    addedTimeElapsed:0,
    addedTimeOverLimit:false,
    addedTimeFinished:false,

    addedTimeMessageStartedAt:messageStartedAt,
    addedTimeMessageDuration:messageDuration,

    message:m>0
      ?`TEMPS ADDITIONNEL — ${h===1?"PREMIÈRE MI-TEMPS":"DEUXIÈME MI-TEMPS"} +${m}`
      :""
  });
};
$("publishEntertainment").onclick=async()=>{
  const type=$("entertainmentType").value;
  const url=$("entertainmentUrl").value.trim();
  const duration=Number($("entertainmentDuration").value||0);
  const loop=$("entertainmentLoop").value;

  if(!url){
    alert("Veuillez entrer l'URL de la vidéo ou de la photo.");
    return;
  }

  await save({
    entertainment:{
      active:true,
      type,
      url,
      duration,
      loop,
      startedAt:Date.now()
    }
  });
};
$("removeEntertainment").onclick=async()=>{
  await save({
    entertainment:{
      active:false
    }
  });
};
$("startAddedTime").onclick=()=>{
  if(!state?.addedTime)return;

  const limit=Number(state.addedTime)*60;
const wait=Number(state.addedTimeMessageDuration||5)*1000;
const startAt=Date.now()+wait;

save({
  addedTimeActive:true,
  addedTimeStartedAt:startAt,
  addedTimePausedAt:null,
  addedTimeElapsed:0,
  addedTimeOverLimit:false,
  addedTimeFinished:false
});
  
};
$("pauseAddedTime").onclick=()=>{
  if(!state?.addedTimeActive||!state?.addedTimeStartedAt)return;

  const elapsed=
    Number(state.addedTimeElapsed||0)+
    Math.floor((Date.now()-state.addedTimeStartedAt)/1000);

  const limit=Number(state.addedTime||0)*60;

  save({
    addedTimeActive:false,
    addedTimeStartedAt:null,
    addedTimePausedAt:Date.now(),
    addedTimeElapsed:Math.min(elapsed,limit),
    addedTimeOverLimit:elapsed>=limit,
    addedTimeFinished:elapsed>=limit
  });
};

$("resumeAddedTime").onclick=()=>{
  if(!state?.addedTime)return;
  if(state.addedTimeFinished)return;

  const elapsed=Number(state.addedTimeElapsed||0);
  const limit=Number(state.addedTime||0)*60;

  if(elapsed>=limit){
    save({
      addedTimeActive:false,
      addedTimeStartedAt:null,
      addedTimeOverLimit:true,
      addedTimeFinished:true,
      addedTimeElapsed:limit
    });
    return;
  }

  save({
    addedTimeActive:true,
    addedTimeStartedAt:Date.now(),
    addedTimePausedAt:null,
    addedTimeFinished:false
  });
};

$("finishAddedTime").onclick=()=>{
  let elapsed=Number(state?.addedTimeElapsed||0);

  if(state?.addedTimeActive&&state?.addedTimeStartedAt){
    elapsed+=Math.floor(
      (Date.now()-state.addedTimeStartedAt)/1000
    );
  }

  const limit=Number(state?.addedTime||0)*60;

  save({
    addedTimeActive:false,
    addedTimeStartedAt:null,
    addedTimePausedAt:null,
    addedTimeElapsed:Math.min(elapsed,limit),
    addedTimeOverLimit:true,
    addedTimeFinished:true
  });
};

$("returnNormalClock").onclick=()=>{
  save({
    addedTimeActive:false,
    addedTimeStartedAt:null,
    addedTimePausedAt:null,
    addedTimeElapsed:0,
    addedTimeOverLimit:false,
    addedTimeFinished:false,
    message:""
  });
};
$("showDisplay").onclick=()=>save({display:{visible:true}});$("hideDisplay").onclick=()=>save({display:{visible:false}});$("fitDisplay").onclick=()=>save({display:{visible:true,scale:100,width:100,height:100}});
$("fixDisplay").onclick=()=>save({
  display:{
    x:Number($("positionX").value),
    y:Number($("positionY").value),
    fixed:true
  }
});
$("scale").oninput=e=>save({display:{scale:Number(e.target.value)}});
$("positionX").oninput=e=>{
  state.display.x=Number(e.target.value);
  render();
};

$("positionY").oninput=e=>{
  state.display.y=Number(e.target.value);
  render();
};

$("publishDirect").onclick=()=>save({directUrl:$("directUrl").value.trim(),directType:$("directType").value});
$("publishAd").onclick=()=>save({ad:{active:true,type:"text",title:$("adTitle").value,text:$("adText").value,url:$("adUrl").value,duration:Number($("adDuration").value||10),color:$("adColor").value,bg:$("adBg").value}});
$("removeAd").onclick=()=>save({ad:{active:false}});
$("publishReplay").onclick=()=>save({replay:{active:true,url:$("replayUrl").value,start:Number($("replayStart").value||0),end:Number($("replayEnd").value||30),speed:Number($("replaySpeed").value)}});
$("slowReplay").onclick=()=>save({replay:{active:true,url:$("replayUrl").value,speed:Number($("replaySpeed").value)}});
$("removeReplay").onclick=()=>save({replay:{active:false}});
$("tvPowerToggle").onclick=()=>{
  if(tvPowerOff){
    tvPowerStarting=true;
    tvPowerOff=false;

    save({tvPower:false});
    renderPower();

    setTimeout(()=>{
      tvPowerStarting=false;
      renderPower();
    },1400);

  }else{
    tvPowerOff=true;

    save({tvPower:true});
    renderPower();
  }
};
$("publishSub").onclick=()=>save({substitution:{active:true,outName:$("outName").value,outNumber:$("outNumber").value,inName:$("inName").value,inNumber:$("inNumber").value,duration:Number($("subDuration").value||10)}});
$("removeSub").onclick=()=>save({substitution:{active:false}});
$("publishGoal").onclick=async()=>{
  const team=$("goalTeam").value;
  const player=$("goalPlayer").value.trim();
  const number=String($("goalNumber").value||"").trim();
  const minute=$("goalMinute").value.trim();
  const voice=$("goalVoice").value==="on";

  const oldA=Number(state.scoreA||0);
  const oldB=Number(state.scoreB||0);

  const newA=team==="A" ? oldA+1 : oldA;
  const newB=team==="B" ? oldB+1 : oldB;

  const colors={
    bar:$("goalBarColor").value,
    stripe:$("goalStripeColor").value,
    text:$("goalTextColor").value,
    background:$("goalBackgroundColor").value,
    clock:$("goalClockColor").value,
    score:$("goalScoreColor").value,
    team:$("goalTeamColor").value,
    icon:$("goalIconColor").value
  };
  const goalId=Date.now();
  await save({
    scoreA:newA,
    scoreB:newB,

    goals:[
      ...(state.goals||[]),
      {
        player,
        number,
        minute,
        team
      }
    ],

    goalAnimation:{
      id:goalId,
      active:true,
      team,
      teamName:team==="A" ? state.teamA : state.teamB,
      player,
      number,
      minute,
      voice,
      oldScoreA:oldA,
      oldScoreB:oldB,
      newScoreA:newA,
      newScoreB:newB,
      startedAt:goalId,
      duration:Number($("goalDuration").value||4),
      colors
    }
  });
};
$("cancelGoal").onclick=async()=>{
  const ga=state?.goalAnimation;

  if(!ga?.id){
    alert("Aucun but à annuler.");
    return;
  }

  await save({
    scoreA:Number(ga.oldScoreA||0),
    scoreB:Number(ga.oldScoreB||0),
    goalAnimation:{
  active:false,
  id:0,
  startedAt:0
}
  });
};
$("clearGoals").onclick=()=>save({goals:[]});
$("resetGoalColors").onclick=async()=>{
  const colors={
    bar:"#1236d6",
    stripe:"#ffffff",
    text:"#ffffff",
    background:"#1236d6",
    clock:"#ffffff",
    score:"#ffffff",
    team:"#ffffff",
    icon:"#ffffff"
  };

  await save({
    goalAnimation:{
      colors
    }
  });

  $("goalBarColor").value=colors.bar;
  $("goalStripeColor").value=colors.stripe;
  $("goalTextColor").value=colors.text;
  $("goalBackgroundColor").value=colors.background;
  $("goalClockColor").value=colors.clock;
  $("goalScoreColor").value=colors.score;
  $("goalTeamColor").value=colors.team;
  $("goalIconColor").value=colors.icon;
};
$("publishLineup").onclick=()=>save({lineup:{active:true,formation:$("formation").value,team:$("lineupTeam").value,players:$("players").value.split(/\n/).map(x=>x.trim()).filter(Boolean).slice(0,11)}});
$("removeLineup").onclick=()=>save({lineup:{active:false}});
$("publishPoster").onclick=()=>save({poster:{active:true,competition:$("competition").value,team1:$("posterTeam1").value||state.teamA,team2:$("posterTeam2").value||state.teamB,date:$("posterDate").value,time:$("posterTime").value,stadium:$("stadium").value,photo:$("posterPhoto").value,color:$("posterColor").value,style:$("posterStyle").value}});
$("removePoster").onclick=()=>save({poster:{active:false}});
$("publishMessage").onclick=()=>save({message:$("messageInput").value});
setInterval(()=>{
  if(!state)return;

  $("clock").textContent=fmt(currentClock());

  const e=$("addedClock");
  if(!e)return;

  if(state.addedTimeActive && state.addedTimeStartedAt){
    const elapsed=Math.min(
  Number(state.addedTimeElapsed||0)+
  Math.max(0,Math.floor((Date.now()-state.addedTimeStartedAt)/1000)),
  Number(state.addedTime||0)*60
);
  
    e.textContent=`+${state.addedTime||0} ${fmt(elapsed)}`;
    e.classList.remove("hidden");
  }
},1000);
setInterval(refresh,1500);
setInterval(()=>{if(state?.twitch?.active && (!twitchPlayer || !twitchReady)) ensureTwitchPlayer()},2000);
setInterval(()=>{
  if(!state || !state.addedTime || !state.addedTimeActive || !state.addedTimeStartedAt)return;

  const elapsed =
    Number(state.addedTimeElapsed||0) +
    Math.floor((Date.now()-state.addedTimeStartedAt)/1000);

  const limit=Number(state.addedTime||0)*60;

  if(elapsed>=limit && !state.addedTimeOverLimit){
    save({
      addedTimeActive:false,
      addedTimeStartedAt:null,
      addedTimePausedAt:null,
      addedTimeElapsed:limit,
      addedTimeOverLimit:true,
      addedTimeFinished:false
    });
  }
},250);
refresh();
