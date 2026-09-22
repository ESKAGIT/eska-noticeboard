(function () {
  const liveGalleries = new Set();
  function init(root) {
    liveGalleries.forEach((gallery) => {
      if (!document.contains(gallery)) {
        window.clearInterval(gallery._galleryTimer);
        liveGalleries.delete(gallery);
      }
    });
    (root || document).querySelectorAll("[data-gallery-carousel]").forEach((gallery) => {
      if (gallery.dataset.galleryReady === "true") return;
      const items = Array.from(gallery.querySelectorAll(".photo-carousel-item"));
      if (!items.length) return;
      gallery.dataset.galleryReady = "true";
      let index = items.findIndex((item) => item.classList.contains("is-active"));
      if (index < 0) index = 0;
      const interval = Math.max(2000, Number(gallery.dataset.galleryInterval || 4000));
      let advanceTimer = null;
      let advancing = false;
      const activeMedia = () => items[index] && items[index].querySelector("img, video");
      const number = (value, fallback = 0) => {
        const parsed = Number(value);
        return Number.isFinite(parsed) ? parsed : fallback;
      };
      const trimFor = (item, video) => {
        const duration = Math.max(0, number(video.duration));
        const start = Math.min(duration || Infinity, Math.max(0, number(item.dataset.videoStart)));
        const requestedEnd = number(item.dataset.videoEnd);
        const end = requestedEnd > start ? Math.min(duration || requestedEnd, requestedEnd) : duration;
        const rate = [0.75, 1, 1.25, 1.5].includes(number(item.dataset.videoRate, 1)) ? number(item.dataset.videoRate, 1) : 1;
        return { start, end, rate };
      };
      const stopInactiveVideo = (activeIndex) => {
        items.forEach((item, itemIndex) => {
          const video = item.querySelector("video");
          if (video && itemIndex !== activeIndex) video.pause();
        });
      };
      const startVideo = (video, item, restartVideo) => {
        const play = () => {
          const trim = trimFor(item, video);
          video.playbackRate = trim.rate;
          if (restartVideo) {
            try { video.currentTime = trim.start; } catch (_) {}
          }
          const playback = video.play && video.play();
          if (playback && playback.catch) playback.catch(() => {
            video.setAttribute("data-playback", "blocked");
            advance();
          });
        };
        if (video.readyState >= 1) play();
        else video.addEventListener("loadedmetadata", play, { once: true });
      };
      const show = (next, restartVideo = false) => {
        items.forEach((item, itemIndex) => item.classList.toggle("is-active", itemIndex === next));
        stopInactiveVideo(next);
        const item = items[next];
        const video = item && item.querySelector("video");
        if (!video) return;
        video.muted = true;
        video.playsInline = true;
        video.setAttribute("playsinline", "");
        video.setAttribute("webkit-playsinline", "");
        startVideo(video, item, restartVideo);
      };
      const waitForMedia = (item) => new Promise((resolve) => {
        const media = item.querySelector("img, video");
        if (!media) return resolve();
        if ((media.tagName === "IMG" && media.complete && media.naturalWidth > 0) || (media.tagName === "VIDEO" && media.readyState >= 2)) {
          if (media.tagName === "IMG" && media.decode) media.decode().catch(() => null).finally(resolve);
          else resolve();
          return;
        }
        let fallback = null;
        const finish = () => {
          if (fallback) window.clearTimeout(fallback);
          media.removeEventListener("load", finish);
          media.removeEventListener("loadeddata", finish);
          media.removeEventListener("error", finish);
          resolve();
        };
        media.addEventListener("load", finish, { once: true });
        media.addEventListener("loadeddata", finish, { once: true });
        media.addEventListener("error", finish, { once: true });
        fallback = window.setTimeout(finish, 5000);
      });
      const complete = () => {
        gallery.dispatchEvent(new CustomEvent("eska:carousel-complete", { bubbles: true }));
      };
      const scheduleAdvance = () => {
        if (!document.contains(gallery)) return;
        if (advanceTimer) window.clearTimeout(advanceTimer);
        const media = activeMedia();
        if (media && media.tagName === "VIDEO") return;
        const activeItem = items[index];
        const itemDuration = Math.max(2000, number(activeItem && activeItem.dataset.mediaDuration, interval));
        advanceTimer = window.setTimeout(advance, itemDuration);
        gallery._galleryTimer = advanceTimer;
      };
      const advance = async () => {
        if (!document.contains(gallery) || advancing) return;
        advancing = true;
        if (index >= items.length - 1) {
          complete();
          return;
        }
        const next = index + 1;
        await waitForMedia(items[next]);
        if (!document.contains(gallery)) return;
        index = next;
        show(index, true);
        scheduleAdvance();
        advancing = false;
      };
      items.forEach((item, itemIndex) => {
        const video = item.querySelector("video");
        if (!video) return;
        video.loop = false;
        video.addEventListener("ended", () => {
          if (itemIndex === index) advance();
        });
        video.addEventListener("timeupdate", () => {
          if (itemIndex !== index) return;
          const trim = trimFor(item, video);
          if (trim.end > trim.start && video.currentTime >= trim.end - 0.08) advance();
        });
        video.addEventListener("error", () => {
          if (itemIndex === index) advance();
        });
      });
      show(index, true);
      liveGalleries.add(gallery);
      if (window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
      if (gallery.dataset.galleryEditing === "true") return;
      scheduleAdvance();
    });
  }
  const observer = new MutationObserver(() => init(document));
  observer.observe(document.documentElement, { childList: true, subtree: true });
  window.addEventListener("load", () => init(document));
  window.initGalleryCarousels = init;
}());
