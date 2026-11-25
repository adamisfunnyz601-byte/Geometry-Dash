(() => {
  const overlay = document.getElementById("gd-loading");
  if (!overlay) return;
  const percent = overlay.querySelector(".gd-loading-percent");
  const message = overlay.querySelector(".gd-loading-message");
  const fill = overlay.querySelector(".gd-loading-fill");
  let shown = 3;
  let started = false;
  let done = false;
  const paint = (value, label) => {
    shown = Math.max(shown, Math.min(100, value));
    percent.textContent = Math.round(shown) + "%";
    fill.style.setProperty("--progress", shown + "%");
    fill.style.width = shown + "%";
    if (label) message.textContent = label;
  };
  paint(5, "Loading GD.");
  const boot = () => {
    if (done || started) return;
    const play = document.getElementById("play");
    if (!play || play.disabled) return;
    started = true;
    paint(82, "Loaded levels/1.txt.");
    requestAnimationFrame(() => {
      paint(91, "Starting Geometry Dash.");
      play.click();
      const startedAt = Date.now();
      const check = () => {
        if (document.body.classList.contains("playing") && document.querySelector("canvas")) {
          done = true;
          paint(100, "Ready.");
          overlay.classList.add("gd-loading-done");
          setTimeout(() => overlay.remove(), 450);
          return;
        }
        if (Date.now() - startedAt > 60000) {
          started = false;
          paint(95, "Still starting — please wait.");
          return;
        }
        requestAnimationFrame(check);
      };
      requestAnimationFrame(check);
    });
  };
  const play = document.getElementById("play");
  if (play) {
    new MutationObserver(boot).observe(play, { attributes: true, attributeFilter: ["disabled"] });
    if (!play.disabled) boot();
  }
  window.addEventListener("load", () => paint(24, "Loading game engine."));
  let ticks = 0;
  const wait = () => {
    if (done || started) return;
    ticks++;
    if (ticks < 120) paint(Math.min(76, 24 + ticks * 0.42), "Loading game assets.");
    boot();
    if (!done && !started) setTimeout(wait, 500);
  };
  setTimeout(wait, 250);
  setTimeout(() => {
    if (!done && !started) message.textContent = "Loading is taking longer than expected.";
  }, 30000);
})();