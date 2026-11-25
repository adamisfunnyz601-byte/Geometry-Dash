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
        const url=new URL(route.request().url());
        if(url.pathname==="/api/levels") return route.fulfill({status:200,contentType:"application/json",body:JSON.stringify({levels:[{id:7,name:"Browser smoke level",creator:"Test Player",average_rating:"4.50"}]})});
        if(url.pathname==="/api/leaderboards") return route.fulfill({status:200,contentType:"application/json",body:JSON.stringify({entries:[{rank:1,username:"Test Player",stars:123,demons:2,diamonds:50}]})});
        if(url.pathname==="/api/profiles/Test%20Player" || url.pathname==="/api/profiles/Test%20Player") return route.fulfill({status:200,contentType:"application/json",body:JSON.stringify({user:{username:"Test Player"},profile:{bio:"Smoke test"},stats:{stars:123,demons:2,diamonds:50},levelCount:1})});
        if(url.pathname==="/api/auth/me") return route.fulfill({status:401,contentType:"application/json",body:'{"error":"Not signed in"}'});
        return route.fulfill({status:200,contentType:"application/json",body:'{"ok":true}'});
      });
      await page.goto("http://127.0.0.1:4173/",{waitUntil:"domcontentloaded"});
      await page.locator("#play").waitFor({state:"visible",timeout:15000});
      await page.waitForFunction(() => {
        const button=document.querySelector("#play");
        return button && !button.disabled;
      },null,{timeout:60000});
      if(await page.locator("#gd-online-launcher,#gd-online-panel").count()) throw new Error("A separate online overlay must not replace Cadence's native menus");
      if(await page.evaluate(() => window.CADENCE_RELAY) !== "/relay") throw new Error("Cadence native protocol is not pointed at the same-origin relay");
      await page.locator("#play").click();
      await page.waitForSelector("body.playing",{timeout:60000});
      await page.locator("canvas").first().waitFor({state:"visible",timeout:15000});
      if(pageErrors.length) throw new Error("Browser page errors: "+pageErrors.join(" | "));
      console.log("PASS viewport "+viewport.width+"x"+viewport.height+": bundled Resources, native Cadence start flow, WASM canvas, no separate online overlay");
      await page.close();
    }
  } finally { await browser.close(); }
} finally { server.kill(); }
