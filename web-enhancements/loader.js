(() => {
  const overlay = document.getElementById("gd-loading");
  if (!overlay) return;
  const fill = overlay.querySelector(".gd-loading-fill");
  const percent = overlay.querySelector(".gd-loading-percent");
  const message = overlay.querySelector(".gd-loading-message");
  let loaded = 0, total = 0, shown = 0;
  let wasmReady = false, resourcesReady = false, finished = false;
  function paint(value) {
    shown = Math.max(shown, Math.min(95, Math.floor(value)));
    fill.style.width = shown + "%"; percent.textContent = shown + "%";
  }
  function progress() { if (total > 0) paint(loaded / total * 95); }
  const nativeFetch = window.fetch.bind(window);
  window.fetch = async (...args) => {
    const response = await nativeFetch(...args);
    const url = String(args[0] instanceof Request ? args[0].url : args[0]);
    const isResourceProbe = /\/Resources\/levels\/1\.txt(?:[?#]|$)/i.test(url);
    if (!response.body || !response.ok) return response;
    const length = Number(response.headers.get("content-length"));
    if (Number.isFinite(length) && length > 0) total += length;
    const reader = response.clone().body.getReader();
    (async () => {
      try {
        while (true) {
          const item = await reader.read();
          if (item.done) break;
          loaded += item.value.byteLength; progress();
        }
        if (isResourceProbe) { resourcesReady = true; finishIfReady(); }
      } catch (_) {}
    })();
    return response;
  };
  window.addEventListener("cadence:resources-ready", () => { resourcesReady = true; finishIfReady(); });
  window.addEventListener("cadence:wasm-ready", () => { wasmReady = true; finishIfReady(); });
  function finishIfReady() {
    if (finished || !wasmReady || !resourcesReady) return;
    finished = true; shown = 100; fill.style.width = "100%";
    percent.textContent = "100%"; message.textContent = "Ready";
    overlay.classList.add("gd-loading-done");
    window.dispatchEvent(new Event("cadence:ready"));
    setTimeout(() => {
      const play = document.getElementById("play");
      if (play && !play.disabled) play.click();
      setTimeout(() => overlay.remove(), 450);
    }, 80);
  }
  window.addEventListener("error", event => {
    if (!finished && event.message) message.textContent = "Loading failed — " + event.message;
  });
  window.addEventListener("unhandledrejection", event => {
    if (!finished) message.textContent = "Loading failed — " + String(event.reason?.message || event.reason || "initialization error");
  });
  paint(0);
})();