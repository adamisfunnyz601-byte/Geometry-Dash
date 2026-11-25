import { chromium } from "playwright";
import { spawn } from "node:child_process";

const server = spawn("python3", ["-m", "http.server", "4173", "--directory", "site-artifact"], { stdio: "ignore" });
const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));
try {
  let ready = false;
  for (let i=0;i<40;i++) {
    try { const r=await fetch("http://127.0.0.1:4173/"); if(r.ok){ready=true;break;} } catch {}
    await sleep(250);
  }
  if(!ready) throw new Error("Static test server did not start");
  const browser = await chromium.launch({headless:true});
  try {
    for (const viewport of [{width:1280,height:800},{width:390,height:844}]) {
      const page = await browser.newPage({viewport});
      const pageErrors=[];
      page.on("pageerror",e=>pageErrors.push(e.message));
      await page.route("**/api/**", route => {
        const url=new URL(route.request().url);
        if(url.pathname==="/api/levels") return route.fulfill({status:200,contentType:"application/json",body:JSON.stringify({levels:[{id:7,name:"Browser smoke level",creator:"Test Player",average_rating:"4.50"}]})});
        if(url.pathname==="/api/leaderboards") return route.fulfill({status:200,contentType:"application/json",body:JSON.stringify({entries:[{rank:1,username:"Test Player",stars:123,demons:2,diamonds:50}]})});
        if(url.pathname==="/api/profiles/Test%20Player" || url.pathname==="/api/profiles/Test%20Player") return route.fulfill({status:200,contentType:"application/json",body:JSON.stringify({user:{username:"Test Player"},profile:{bio:"Smoke test"},stats:{stars:123,demons:2,diamonds:50},levelCount:1})});
        if(url.pathname==="/api/auth/me") return route.fulfill({status:401,contentType:"application/json",body:'{"error":"Not signed in"}'});
        return route.fulfill({status:200,contentType:"application/json",body:'{"ok":true}'});
      });
      await page.goto("http://127.0.0.1:4173/",{waitUntil:"domcontentloaded"});
      await page.locator("#gd-loading").waitFor({state:"visible",timeout:10000});
      await page.waitForSelector("body.playing",{timeout:60000});
      await page.locator("canvas").first().waitFor({state:"visible",timeout:15000});
      await page.locator("#gd-online-launcher").click();
      await page.locator("#gd-online-panel.open").waitFor({state:"visible"});
      await page.getByText("Browser smoke level").waitFor({state:"visible",timeout:10000});
      await page.locator('[data-tab="rankings"]').click();
      await page.getByText("Test Player").first().waitFor({state:"visible"});
      await page.locator('[data-tab="account"]').click();
      await page.getByText("Create account").waitFor({state:"visible"});
      const panelBox=await page.locator("#gd-online-panel").boundingBox();
      if(!panelBox || panelBox.width>viewport.width+1) throw new Error("Online menu overflows viewport "+JSON.stringify(viewport));
      if(pageErrors.length) throw new Error("Browser page errors: "+pageErrors.join(" | "));
      console.log("PASS viewport "+viewport.width+"x"+viewport.height+": loader, WASM game start, online menu, level search, leaderboard, account panel");
      await page.close();
    }
  } finally { await browser.close(); }
} finally { server.kill(); }
