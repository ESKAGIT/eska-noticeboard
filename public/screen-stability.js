(function () {
  if (typeof route !== "function" || (route() !== "/screen" && route() !== "/")) return;

  window.__eskaScreenStop = window.__eskaScreenStop || function () {};
  let screenRunId = 0;

  window.screenView = async function stableScreenView() {
    window.__eskaScreenStop();
    clearTimeout(screenTimer);

    await loadBoard();
    const run = { active: true, id: ++screenRunId, timers: [], listeners: [] };
    window.__eskaScreenRun = run;
    window.__eskaScreenStop = function stopStableScreenView() {
      run.active = false;
      run.timers.forEach((timer) => {
        clearTimeout(timer);
        clearInterval(timer);
      });
      run.timers = [];
      run.listeners.forEach(([target, event, handler]) => target.removeEventListener(event, handler));
      run.listeners = [];
      clearTimeout(screenTimer);
    };

    const recordingMode = isUsbExport();
    app.innerHTML = `<main class="screen-shell${recordingMode ? " usb-recording-mode" : ""}"><div id="screenStage"></div></main>`;
    const stage = document.querySelector("#screenStage");
    let refreshBusy = false;
    let drawToken = 0;

    function addTimer(callback, delay, interval = false) {
      const timer = interval ? setInterval(callback, delay) : setTimeout(callback, delay);
      run.timers.push(timer);
      return timer;
    }

    function addListener(target, event, handler) {
      target.addEventListener(event, handler);
      run.listeners.push([target, event, handler]);
    }

    function startSlideMedia() {
      document.querySelectorAll("video").forEach((video) => {
        video.muted = true;
        video.playsInline = true;
        video.setAttribute("playsinline", "");
        video.setAttribute("webkit-playsinline", "");
        const play = video.play && video.play();
        if (play && play.catch) play.catch(() => video.setAttribute("data-playback", "blocked"));
      });
    }

    function isCurrentRun(token) {
      return run.active && run.id === screenRunId && token === drawToken;
    }

    function draw() {
      if (!run.active) return;
      const token = ++drawToken;
      const slides = visibleSlides();
      if (!slides.length) {
        stage.innerHTML = `<section class="slide"><h1>No visible slides</h1></section>`;
        return;
      }
      if (activeSlide >= slides.length) activeSlide = 0;
      const slide = slides[activeSlide];
      stage.innerHTML = renderSlide(slide);
      startSlideMedia();
      clearTimeout(screenTimer);
      screenTimer = addTimer(() => {
        if (!isCurrentRun(token)) return;
        const latestSlides = visibleSlides();
        activeSlide = latestSlides.length ? (activeSlide + 1) % latestSlides.length : 0;
        draw();
      }, Number(slide.duration || board.settings.defaultDuration || 10000));
    }

    draw();

    if (!recordingMode) {
      addTimer(async () => {
        if (!run.active || refreshBusy) return;
        refreshBusy = true;
        const currentSlides = visibleSlides();
        const previousId = currentSlides[activeSlide] && currentSlides[activeSlide].id;
        await loadBoard().catch(() => null);
        const updatedSlides = visibleSlides();
        const nextIndex = updatedSlides.findIndex((slide) => slide.id === previousId);
        if (nextIndex >= 0) activeSlide = nextIndex;
        else if (activeSlide >= updatedSlides.length) activeSlide = 0;
        refreshBusy = false;
      }, Number(board.settings.refreshSeconds || 12) * 1000, true);

      addListener(document, "visibilitychange", () => {
        if (!document.hidden) {
          loadBoard().then(draw).catch(() => draw());
        }
      });

      addListener(window, "error", () => {
        clearTimeout(screenTimer);
        screenTimer = addTimer(() => window.location.reload(), 5000);
      });

      addTimer(() => window.location.reload(), 6 * 60 * 60 * 1000);
    }
  };

  clearTimeout(screenTimer);
  window.screenView().catch((error) => {
    app.innerHTML = `<main class="error-page"><h1>Something needs attention</h1><p>${escapeHtml(error.message)}</p></main>`;
  });
})();
