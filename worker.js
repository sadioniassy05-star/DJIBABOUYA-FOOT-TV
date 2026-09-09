
const ADMIN_PASSWORD_SHA256 = "a1a059e90a774c203f723b64342715ef322e528fd6379a3c6781beb320539124";
const SESSION_TTL = 12 * 60 * 60;

const DEFAULT_STATE = {
  teamA:"ÉQUIPE A", teamB:"ÉQUIPE B", scoreA:0, scoreB:0,
  clock:0, running:false, clockStartedAt:null, addedTime:0,
  colors:{score:"#ffffff", scoreBg:"#0b1220", clock:"#ffffff", added:"#ffd166", teamA:"#ffffff", teamB:"#ffffff"},
  display:{visible:true, scale:100, width:100, height:100, x:50, y:9, fixed:false},
  directUrl:"",
  directType:"video",
  twitch:{active:true,channel:"banialfaty"},
  ad:{active:false,type:"text",title:"",text:"",url:"",duration:10,color:"#ffffff",bg:"#111827"},
  replay:{active:false,url:"",speed:0.5,start:0,end:30},
  substitution:{active:false,outName:"",outNumber:"",outPhoto:"",inName:"",inNumber:"",inPhoto:"",duration:10},
  goals:[],
  lineup:{active:false,formation:"4-3-3",team:"A",players:[]},
  poster:{active:false,competition:"",team1:"ÉQUIPE A",team2:"ÉQUIPE B",date:"",time:"",stadium:"",logo1:"",logo2:"",photo:"",color:"#f59e0b",style:"modern"},
  message:"",
  updatedAt:0,
  backgroundVersion:0
};

function json(data,status=200){return new Response(JSON.stringify(data),{status,headers:{"content-type":"application/json","cache-control":"no-store"}})}
function htmlRedirect(){return new Response(null,{status:302,headers:{location:"/"}})}
function merge(a,b){return {...a,...b,twitch:{...a.twitch,...(b.twitch||{})},colors:{...a.colors,...(b.colors||{})},display:{...a.display,...(b.display||{})},ad:{...a.ad,...(b.ad||{})},replay:{...a.replay,...(b.replay||{})},substitution:{...a.substitution,...(b.substitution||{})},lineup:{...a.lineup,...(b.lineup||{})},poster:{...a.poster,...(b.poster||{})}}}
async function sha256(s){const buf=await crypto.subtle.digest("SHA-256",new TextEncoder().encode(s));return [...new Uint8Array(buf)].map(x=>x.toString(16).padStart(2,"0")).join("")}
async function makeToken(){const payload={exp:Math.floor(Date.now()/1000)+SESSION_TTL,n:crypto.randomUUID()};const raw=btoa(JSON.stringify(payload));const sig=await sha256(raw+ADMIN_PASSWORD_SHA256);return raw+"."+sig}
async function validSession(req){
  const c=req.headers.get("cookie")||""; const m=c.match(/DFTV_SESSION=([^;]+)/); if(!m)return false;
  const [raw,sig]=m[1].split("."); if(!raw||!sig)return false;
  try{const p=JSON.parse(atob(raw)); if(p.exp<Math.floor(Date.now()/1000))return false; return sig===await sha256(raw+ADMIN_PASSWORD_SHA256)}catch{return false}
}
async function readState(env){
  if(!env.DB)return {...DEFAULT_STATE};
  const row=await env.DB.prepare("SELECT value FROM app_state WHERE id=1").first();
  if(!row)return {...DEFAULT_STATE};
  try{
    const state=merge(DEFAULT_STATE,JSON.parse(row.value));

    // TWITCH BANIALFATY est automatique et ne dépend plus de l'Admin.
    state.twitch={
      active:true,
      channel:"banialfaty"
    };

    return state;
  }catch{
    return {...DEFAULT_STATE};
  }
}
async function saveState(env,state){
  state.updatedAt=Date.now();
  if(env.DB) await env.DB.prepare("INSERT INTO app_state(id,value) VALUES(1,?) ON CONFLICT(id) DO UPDATE SET value=excluded.value").bind(JSON.stringify(state)).run();
  return state;
}
async function api(req,env,url){
  if(url.pathname==="/api/login" && req.method==="POST"){
    const body=await req.json().catch(()=>({}));
    const ok=await sha256(String(body.password||""))===ADMIN_PASSWORD_SHA256;
    if(!ok)return json({ok:false,error:"Mot de passe incorrect"},401);
    const token=await makeToken();
    return new Response(JSON.stringify({ok:true}),{headers:{"content-type":"application/json","set-cookie":`DFTV_SESSION=${token}; Path=/; Max-Age=${SESSION_TTL}; HttpOnly; Secure; SameSite=Lax`}})
  }
  if(url.pathname==="/api/logout"){
    return new Response(JSON.stringify({ok:true}),{headers:{"content-type":"application/json","set-cookie":"DFTV_SESSION=; Path=/; Max-Age=0; HttpOnly; Secure; SameSite=Lax"}})
  }
  if(url.pathname==="/api/state" && req.method==="GET") return json({ok:true,state:await readState(env)});
  if(url.pathname==="/api/state" && req.method==="POST"){
    if(!(await validSession(req))) return json({ok:false,error:"Non autorisé"},401);
    const incoming=await req.json().catch(()=>({})); const state=merge(await readState(env),incoming);
    return json({ok:true,state:await saveState(env,state)});
  }
  if(url.pathname==="/api/background" && req.method==="GET"){
    if(!env.DB) return env.ASSETS.fetch(new Request(new URL("/djibabouya-tv.jpg",url)));
    const row=await env.DB.prepare("SELECT mime,data FROM tv_background WHERE id=1").first();
    if(!row) return env.ASSETS.fetch(new Request(new URL("/djibabouya-tv.jpg",url)));
    const bin=Uint8Array.from(atob(row.data),c=>c.charCodeAt(0));
    return new Response(bin,{headers:{"content-type":row.mime,"cache-control":"public, max-age=60"}});
  }
  if(url.pathname==="/api/background" && req.method==="POST"){
    if(!(await validSession(req))) return json({ok:false,error:"Non autorisé"},401);
    const body=await req.json().catch(()=>({})); const data=String(body.data||"");
    const m=data.match(/^data:(image\/(?:png|jpeg|webp));base64,(.+)$/i);
    if(!m) return json({ok:false,error:"Format image non pris en charge"},400);
    if(data.length>11_000_000) return json({ok:false,error:"Image trop volumineuse"},400);
    await env.DB.prepare("INSERT INTO tv_background(id,mime,data) VALUES(1,?,?) ON CONFLICT(id) DO UPDATE SET mime=excluded.mime,data=excluded.data").bind(m[1].toLowerCase(),m[2]).run();
    const version=Date.now();
    const state=await readState(env); state.backgroundVersion=version; await saveState(env,state);
    return json({ok:true,version});
  }
  if(url.pathname==="/api/background" && req.method==="DELETE"){
    if(!(await validSession(req))) return json({ok:false,error:"Non autorisé"},401);
    if(env.DB) await env.DB.prepare("DELETE FROM tv_background WHERE id=1").run();
    const version=Date.now(); const state=await readState(env); state.backgroundVersion=version; await saveState(env,state);
    return json({ok:true,version});
  }
  if(url.pathname==="/api/auth" && req.method==="GET") return json({ok:await validSession(req)});
  return json({ok:false,error:"Route API inconnue"},404);
}
export default {
  async fetch(req,env){
    const url=new URL(req.url);
    if(url.pathname.startsWith("/api/")) return api(req,env,url);
    if(env.ASSETS) return env.ASSETS.fetch(req);
    return htmlRedirect();
  }
};
