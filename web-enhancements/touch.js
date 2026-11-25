(() => {
  // The Cadence browser build uses winit's Pointer Events input path.
  // Forward iOS touch contacts as PointerEvents (not MouseEvents).
  const install = () => {
    const canvas = document.querySelector("canvas");
    if (!canvas || canvas.dataset.cadenceTouchReady === "1") return !!canvas;
    canvas.dataset.cadenceTouchReady = "1";
    canvas.style.touchAction = "none";
    canvas.style.userSelect = "none";
    canvas.style.webkitUserSelect = "none";
    let active = false;
    const pointer = (touch, type, buttons) => {
      const event = new PointerEvent(type, {
        bubbles: true,
        cancelable: true,
        pointerId: 1,
        pointerType: "touch",
        isPrimary: true,
        width: 1,
        height: 1,
        pressure: buttons ? 0.5 : 0,
        tangentialPressure: 0,
        tiltX: 0,
        tiltY: 0,
        twist: 0,
        clientX: touch.clientX,
        clientY: touch.clientY,
        screenX: touch.screenX,
        screenY: touch.screenY,
        button: buttons ? 0 : -1,
        buttons
      });
      canvas.dispatchEvent(event);
    };
    canvas.addEventListener("touchstart", event => {
      if (!event.changedTouches.length) return;
      event.preventDefault();
      active = true;
      for (const touch of event.changedTouches) pointer(touch, "pointerdown", 1);
    }, {passive:false});
    canvas.addEventListener("touchmove", event => {
      if (!event.changedTouches.length || !active) return;
      event.preventDefault();
      for (const touch of event.changedTouches) pointer(touch, "pointermove", 1);
    }, {passive:false});
    const finish = (event, cancelled) => {
      if (!event.changedTouches.length || !active) return;
      event.preventDefault();
      for (const touch of event.changedTouches) {
        pointer(touch, cancelled ? "pointercancel" : "pointerup", 0);
      }
      active = false;
    };
    canvas.addEventListener("touchend", event => finish(event, false), {passive:false});
    canvas.addEventListener("touchcancel", event => finish(event, true), {passive:false});
    // Do not synthesize click/mouse events: winit consumes PointerEvents and
    // browsers may also emit compatibility mouse events after a touch.
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
