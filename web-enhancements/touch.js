(() => {
  // Cadence's winit UI consumes left-mouse events in the browser build.
  // Bridge iPad/iPhone touch input into equivalent canvas mouse events.
  const install = () => {
    const canvas = document.querySelector("canvas");
    if (!canvas || canvas.dataset.cadenceTouchReady === "1") return !!canvas;
    canvas.dataset.cadenceTouchReady = "1";
    canvas.style.touchAction = "none";
    canvas.style.userSelect = "none";
    canvas.style.webkitUserSelect = "none";
    let lastTouchAt = 0;
    const point = (touch, type, buttons) => {
      const event = new MouseEvent(type, {
        bubbles: true, cancelable: true, view: window,
        clientX: touch.clientX, clientY: touch.clientY,
        screenX: touch.screenX, screenY: touch.screenY,
        button: 0, buttons
      });
      canvas.dispatchEvent(event);
    };
    canvas.addEventListener("touchstart", event => {
      if (!event.changedTouches.length) return;
      event.preventDefault();
      lastTouchAt = Date.now();
      for (const touch of event.changedTouches) point(touch, "mousedown", 1);
    }, {passive:false});
    canvas.addEventListener("touchmove", event => {
      if (!event.changedTouches.length) return;
      event.preventDefault();
      lastTouchAt = Date.now();
      for (const touch of event.changedTouches) point(touch, "mousemove", 1);
    }, {passive:false});
    const release = event => {
      if (!event.changedTouches.length) return;
      event.preventDefault();
      lastTouchAt = Date.now();
      for (const touch of event.changedTouches) {
        point(touch, "mouseup", 0);
        point(touch, "click", 0);
      }
    };
    canvas.addEventListener("touchend", release, {passive:false});
    canvas.addEventListener("touchcancel", release, {passive:false});
    // iOS may emit compatibility mouse events after touchend. Ignore those
    // trusted events briefly so one tap never activates a menu item twice.
    window.addEventListener("mousedown", event => {
      if (event.isTrusted && Date.now() - lastTouchAt < 800) event.stopImmediatePropagation();
    }, true);
    window.addEventListener("mouseup", event => {
      if (event.isTrusted && Date.now() - lastTouchAt < 800) event.stopImmediatePropagation();
    }, true);
    window.__cadenceTouchBridgeReady = true;
    return true;
  };
  if (!install()) {
    const observer = new MutationObserver(() => {
      if (install()) observer.disconnect();
    });
    observer.observe(document.documentElement, {childList:true,subtree:true});
  }
})();