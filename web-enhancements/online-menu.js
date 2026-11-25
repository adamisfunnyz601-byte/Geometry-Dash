(() => {
  const API="/api", tokenKey="gd-session-token";
  const el=(tag,props={},text="")=>{const n=document.createElement(tag);Object.assign(n,props);if(text)n.textContent=text;return n;};
  const launcher=el("button",{id:"gd-online-launcher",type:"button"},"ONLINE");
  launcher.setAttribute("aria-expanded","false");
  const panel=el("section",{id:"gd-online-panel","aria-label":"Cadence online menu"});
  panel.innerHTML='<header><strong>CADENCE ONLINE</strong><button type="button" class="secondary" id="gd-online-close" aria-label="Close online menu">✕</button></header><nav class="gd-online-tabs" aria-label="Online sections"><button type="button" data-tab="levels" aria-selected="true">Levels</button><button type="button" data-tab="rankings" aria-selected="false">Rankings</button><button type="button" data-tab="account" aria-selected="false">Account</button><button type="button" data-tab="profile" aria-selected="false">Profiles</button></nav><div class="gd-online-content" id="gd-online-content"><p class="gd-online-status">Independent online service</p></div>';
  document.body.append(launcher,panel);
  const content=panel.querySelector("#gd-online-content");
  const status=(m,e=false)=>content.prepend(el("p",{className:"gd-online-status"+(e?" gd-online-error":"")},m));
  async function api(path,options={}){
    const headers=new Headers(options.headers||{});if(options.body&&!headers.has("Content-Type"))headers.set("Content-Type","application/json");
    const token=localStorage.getItem(tokenKey);if(token)headers.set("Authorization","Bearer "+token);
    let response;try{response=await fetch(API+path,{...options,headers});}catch(_){throw new Error("The API could not be reached. Check the API gateway and Enzonic service.");}
    const body=await response.json().catch(()=>({error:"HTTP "+response.status}));
    if(!response.ok){
      if(response.status===404)throw new Error("API route or requested record not found (404).");
      if(response.status===502)throw new Error("Enzonic backend is unreachable (502).");
      if(response.status===503)throw new Error("API gateway is not configured (503).");
      if(response.status===504)throw new Error("Enzonic backend timed out (504).");
      throw new Error(body.error||"HTTP "+response.status);
    }return body;
  }
  function clear(){content.replaceChildren();}
  function row(title,detail,action){
    const n=el("div",{className:"gd-online-row"}),t=el("div");
    t.append(el("strong",{},title),el("div",{className:"gd-online-status"},detail||""));n.append(t);
    if(action){const b=el("button",{type:"button"},"Open");b.addEventListener("click",action);n.append(b);}return n;
  }
  async function showLevels(search=""){
    clear();const form=el("form"),input=el("input",{type:"search",maxLength:80,placeholder:"Search community levels",value:search,"aria-label":"Search community levels"});
    form.append(input,el("button",{type:"submit"},"Search"));content.append(form);const list=el("div");content.append(list);
    const load=async()=>{
      list.replaceChildren(el("p",{className:"gd-online-status"},"Searching levels…"));
      try{
        const data=await api("/levels?search="+encodeURIComponent(input.value)+"&limit=30");list.replaceChildren();
        if(!data.levels?.length){list.append(el("p",{className:"gd-online-status"},"No community levels found."));return;}
        for(const level of data.levels){
          list.append(row(level.name||"Untitled",(level.creator||"Unknown")+" · "+(level.average_rating||"0.00")+"★ · ID "+level.id,async()=>{
            try{
              const detail=await api("/levels/"+encodeURIComponent(level.id));
              list.replaceChildren(row(detail.level.name,"Creator: "+(detail.level.creator||"Unknown")+" · "+(detail.level.description||"No description")+" · ID "+detail.level.id));
              list.append(el("p",{className:"gd-online-status"},"The current backend detail route returns metadata only. Playable level-payload download is not implemented yet."));
            }catch(e){list.replaceChildren(el("p",{className:"gd-online-status gd-online-error"},e.message));}
          }));
        }
      }catch(e){list.replaceChildren(el("p",{className:"gd-online-status gd-online-error"},e.message));}
    };
    form.addEventListener("submit",e=>{e.preventDefault();load();});await load();
  }
  async function showRankings(){
    clear();content.append(el("h3",{},"Top players"));
    try{
      const data=await api("/leaderboards?metric=stars&limit=25");
      if(!data.entries?.length){content.append(el("p",{className:"gd-online-status"},"No ranked players yet."));return;}
      for(const p of data.entries)content.append(row("#"+p.rank+" "+p.username,(p.stars||0)+" stars · "+(p.demons||0)+" demons · "+(p.diamonds||0)+" diamonds",()=>showProfile(p.username)));
    }catch(e){status(e.message,true);}
  }
  async function showProfile(username=""){
    clear();content.append(el("h3",{},"Player profile"));const form=el("form"),input=el("input",{value:username,placeholder:"Username",required:true,maxLength:32,"aria-label":"Player username"});
    form.append(input,el("button",{type:"submit"},"View profile"));content.append(form);const result=el("div");content.append(result);
    form.addEventListener("submit",async e=>{
      e.preventDefault();result.replaceChildren();
      try{const d=await api("/profiles/"+encodeURIComponent(input.value.trim())),p=d.profile||{},s=d.stats||{};
        result.append(row(d.user.username,p.bio||"No bio set"),row("Statistics",(s.stars||0)+" stars · "+(s.demons||0)+" demons · "+(s.diamonds||0)+" diamonds · "+(d.levelCount||0)+" published levels"));
      }catch(err){result.append(el("p",{className:"gd-online-status gd-online-error"},err.message));}
    });
    if(username)form.requestSubmit();
  }
  function showAccount(){
    clear();content.append(el("h3",{},"Account"));
    const reg=el("form");reg.append(el("strong",{},"Create account"));
    const ru=el("input",{required:true,minLength:3,maxLength:32,placeholder:"Username",autocomplete:"username"});
    const re=el("input",{type:"email",maxLength:254,placeholder:"Email (optional)",autocomplete:"email"});
    const rp=el("input",{type:"password",required:true,minLength:8,maxLength:128,placeholder:"Password",autocomplete:"new-password"});
    reg.append(ru,re,rp,el("button",{type:"submit"},"Register"));
    reg.addEventListener("submit",async e=>{e.preventDefault();try{const d=await api("/auth/register",{method:"POST",body:JSON.stringify({username:ru.value,email:re.value||undefined,password:rp.value})});localStorage.setItem(tokenKey,d.token);status("Account created and signed in as "+d.user.username);}catch(err){status(err.message,true);}});
    const login=el("form");login.append(el("strong",{},"Log in"));
    const lu=el("input",{required:true,placeholder:"Username",autocomplete:"username"}),lp=el("input",{type:"password",required:true,placeholder:"Password",autocomplete:"current-password"});
    login.append(lu,lp,el("button",{type:"submit"},"Log in"));
    login.addEventListener("submit",async e=>{e.preventDefault();try{const d=await api("/auth/login",{method:"POST",body:JSON.stringify({username:lu.value,password:lp.value})});localStorage.setItem(tokenKey,d.token);status("Signed in as "+d.user.username);}catch(err){status(err.message,true);}});
    const logout=el("button",{type:"button",className:"secondary"},"Log out");
    logout.addEventListener("click",()=>{localStorage.removeItem(tokenKey);status("Signed out.");});
    content.append(reg,login,logout);
    if(localStorage.getItem(tokenKey))api("/auth/me").then(d=>status("Signed in as "+d.user.username)).catch(()=>status("Saved session is invalid; please log in again.",true));
  }
  const views={levels:showLevels,rankings:showRankings,account:showAccount,profile:showProfile};
  function openTab(tab){panel.querySelectorAll("[data-tab]").forEach(b=>b.setAttribute("aria-selected",String(b.dataset.tab===tab)));(views[tab]||showLevels)();}
  launcher.addEventListener("click",()=>{const open=panel.classList.toggle("open");launcher.setAttribute("aria-expanded",String(open));if(open)openTab("levels");});
  panel.querySelector("#gd-online-close").addEventListener("click",()=>{panel.classList.remove("open");launcher.setAttribute("aria-expanded","false");});
  panel.querySelectorAll("[data-tab]").forEach(b=>b.addEventListener("click",()=>openTab(b.dataset.tab)));
  document.addEventListener("keydown",e=>{if(e.key==="Escape"&&panel.classList.contains("open")){panel.classList.remove("open");launcher.setAttribute("aria-expanded","false");}});
})();