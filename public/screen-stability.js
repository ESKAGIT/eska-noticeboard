(function () {
  if (typeof route === "function" && !["/screen", "/"].includes(route()) && !window.__eskaTVLinkInstalled) {
    window.__eskaTVLinkInstalled = true;
    document.addEventListener("click", (event) => {
      if (event.defaultPrevented || event.button !== 0 || event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) return;
      const link = event.target.closest?.("a[href]");
      if (!link) return;
      const url = new URL(link.href, location.href);
      if (url.origin !== location.origin || url.pathname !== "/screen" || url.search) return;
      const player = window.open("", "eska-tv-screen");
      if (!player) return;
      event.preventDefault();
      try {
        if (player.location.origin !== url.origin || player.location.pathname !== url.pathname) player.location.href = url.href;
      } catch (_) { player.location.href = url.href; }
      player.focus();
    });
  }
  if (typeof route !== "function" || !["/screen", "/"].includes(route())) return;
  if (window.__eskaStablePlayerInstalled) return;
  window.__eskaStablePlayerInstalled = true;
  const milliseconds = (value, fallback, minimum = 250) => {
    const parsed = Number(value);
    return Number.isFinite(parsed) && parsed > 0 ? Math.max(minimum, parsed) : fallback;
  };
  const validBoard = (value) => value && Array.isArray(value.slides) && value.brand && value.settings;
  let currentRun;
  window.screenView = function stableScreenView() {
    // Re-entry is idempotent, even while the initial request is pending.
    if (currentRun?.active && (!currentRun.stage || currentRun.stage.isConnected)) return currentRun.ready;
    window.__eskaScreenStop?.();
    clearTimeout(screenTimer);
    const run = { active: true, stage: null, playlist: [], index: 0, visit: 0, advanceTimer: null, watchdog: null, pollTimer: null, request: null, controller: null, pending: null, leaveSlide: () => {} };
    currentRun = run;
    window.__eskaScreenRun = run;
    const isCurrent = () => currentRun === run && run.active && (!run.stage || run.stage.isConnected);
    const stopMedia = () => {
      run.stage?.querySelectorAll("[data-gallery-carousel]").forEach((gallery) => gallery._galleryStop?.());
      run.stage?.querySelectorAll("video").forEach((video) => video.pause());
    };
    window.__eskaScreenStop = () => {
      run.active = false;
      clearTimeout(run.advanceTimer);
      clearTimeout(run.watchdog);
      clearTimeout(run.pollTimer);
      clearTimeout(screenTimer);
      run.controller?.abort();
      run.leaveSlide();
      stopMedia();
      document.removeEventListener("visibilitychange", onVisibility);
    };
    function beginCycle(snapshot) {
      run.snapshot = snapshot;
      board = snapshot;
      // Polling cannot change the index, content or ordering of a running loop.
      run.playlist = snapshot.slides.filter((slide) => slide.visible !== false);
      run.index = 0;
      run.pending = null;
    }
    function draw() {
      if (!isCurrent()) return;
      clearTimeout(run.advanceTimer);
      clearTimeout(run.watchdog);
      run.leaveSlide();
      stopMedia();
      const token = ++run.visit;
      activeSlide = run.index;
      if (!run.playlist.length) {
        run.stage.innerHTML = '<section class="slide"><h1>No visible slides</h1></section>';
        return;
      }
      const slide = run.playlist[run.index];
      try { run.stage.innerHTML = renderSlide(slide); }
      catch (error) {
        console.error("Could not render slide", slide.id, error);
        run.stage.innerHTML = `<section class="slide" data-slide-id="${escapeHtml(slide.id)}"><h1>This slide could not be displayed</h1></section>`;
      }
      run.stage.classList.remove("dojo-stage-enter");
      void run.stage.offsetWidth;
      run.stage.classList.add("dojo-stage-enter");
      const gallery = run.stage.querySelector("[data-gallery-carousel]");
      const minimum = milliseconds(slide.duration || run.snapshot.settings.defaultDuration, 10000);
      let elapsed = false, mediaComplete = !gallery, advanced = false;
      const next = () => {
        if (!isCurrent() || token !== run.visit || advanced || !elapsed || !mediaComplete) return;
        advanced = true;
        run.index++;
        if (run.index >= run.playlist.length) beginCycle(run.pending || run.snapshot);
        draw();
      };
      if (gallery) {
        const onComplete = (event) => {
          if (event.target !== gallery) return;
          mediaComplete = true;
          next();
        };
        gallery.addEventListener("eska:carousel-complete", onComplete);
        run.leaveSlide = () => gallery.removeEventListener("eska:carousel-complete", onComplete);
        // Only a stalled-media fallback: normal progression waits for completion
        // and the configured slide duration, including per-item dwell/trim times.
        const budget = Array.from(gallery.querySelectorAll(".photo-carousel-item")).reduce((total, item) => {
          const video = item.querySelector("video");
          const start = Number(item.dataset.videoStart) || 0;
          const end = Number(item.dataset.videoEnd) || video?.duration || 0;
          const rate = Number(item.dataset.videoRate) || 1;
          const dwell = video ? (end > start ? (end - start) * 1000 / rate : 600000) : milliseconds(item.dataset.mediaDuration || gallery.dataset.galleryInterval, 4000, 2000);
          return total + dwell + 8000;
        }, 5000);
        run.watchdog = setTimeout(() => { mediaComplete = true; elapsed = true; next(); }, Math.max(minimum, budget));
      } else run.leaveSlide = () => {};
      run.advanceTimer = setTimeout(() => { elapsed = true; next(); }, minimum);
      screenTimer = run.advanceTimer;
      // Gallery videos have their own seek/end lifecycle; do not start them twice.
      run.stage.querySelectorAll("video").forEach((video) => {
        if (video.closest("[data-gallery-carousel]")) return;
        video.muted = true;
        video.playsInline = true;
        video.play()?.catch(() => video.setAttribute("data-playback", "blocked"));
      });
    }
    function refresh() {
      if (!isCurrent()) return Promise.resolve();
      if (run.request) return run.request;
      run.controller = new AbortController();
      const timeout = setTimeout(() => run.controller?.abort(), 20000);
      run.request = api("/api/noticeboard", { signal: run.controller.signal }).then((candidate) => {
        if (!isCurrent() || !validBoard(candidate)) return;
        run.pending = candidate;
        if (run.stage && !run.playlist.length) { beginCycle(candidate); draw(); }
        return candidate;
      }).finally(() => { clearTimeout(timeout); run.request = null; });
      return run.request;
    }
    function poll() {
      if (!isCurrent()) return;
      run.pollTimer = setTimeout(async () => {
        await refresh().catch(() => null);
        poll();
      }, milliseconds((run.pending || run.snapshot).settings.refreshSeconds * 1000, 12000, 1000));
    }
    function onVisibility() {
      // Focus must not restart the current slide or entrance animations.
      if (!document.hidden) refresh().catch(() => null);
    }
    run.ready = (async () => {
      const initial = await refresh();
      if (!isCurrent()) return;
      if (!validBoard(initial)) throw new Error("The noticeboard could not be loaded.");
      beginCycle(initial);
      const recordingMode = isUsbExport();
      app.innerHTML = `<main class="screen-shell${recordingMode ? " usb-recording-mode" : ""}"><div id="screenStage"></div></main>`;
      run.stage = document.querySelector("#screenStage");
      draw();
      if (!recordingMode) {
        poll();
        document.addEventListener("visibilitychange", onVisibility);
      }
    })().catch((error) => {
      if (!isCurrent()) return;
      window.__eskaScreenStop();
      app.innerHTML = `<main class="error-page"><h1>Something needs attention</h1><p>${escapeHtml(error.message)}</p></main>`;
    });
    return run.ready;
  };
  screenView = window.screenView;
  window.screenView();
})();
