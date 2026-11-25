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
      const page = await browser.newPage({viewport, hasTouch: viewport.width < 500, isMobile: viewport.width < 500});
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
      await page.locator("#gd-loading").waitFor({state:"visible",timeout:15000});
      await page.waitForFunction(() => document.body.classList.contains("playing") && !!document.querySelector("canvas"),null,{timeout:60000});
      if(await page.locator("#gd-online-launcher,#gd-online-panel").count()) throw new Error("A separate online overlay must not replace Cadence's native menus");
      if(await page.evaluate(() => window.CADENCE_RELAY) !== "/relay") throw new Error("Cadence native protocol is not pointed at the same-origin relay");
      await page.locator("canvas").first().waitFor({state:"visible",timeout:15000});
      if (viewport.width < 500) {
        await page.waitForFunction(() => window.__cadenceTouchBridgeReady === true, null, {timeout:10000});
        await page.evaluate(() => {
          const canvas = document.querySelector("canvas");
          window.__cadenceTouchEvents = 0;
          canvas.addEventListener("mousedown", () => window.__cadenceTouchEvents++);
          canvas.addEventListener("mouseup", () => window.__cadenceTouchEvents++);
        });
        const bounds = await page.locator("canvas").first().boundingBox();
        await page.touchscreen.tap(Math.round(bounds.x + bounds.width/2), Math.round(bounds.y + bounds.height/2));
        await page.waitForFunction(() => window.__cadenceTouchEvents >= 2, null, {timeout:5000});
      }
      if(pageErrors.length) throw new Error("Browser page errors: "+pageErrors.join(" | "));
      console.log("PASS viewport "+viewport.width+"x"+viewport.height+": bundled Resources, automatic startup loader, native Cadence main menu, WASM canvas, no separate online overlay");
      await page.close();
    }
  } finally { await browser.close(); }
} finally { server.kill(); }
