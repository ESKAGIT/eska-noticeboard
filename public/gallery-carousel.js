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
      if (items.length < 2) return;
      gallery.dataset.galleryReady = "true";
      let index = items.findIndex((item) => item.classList.contains("is-active"));
      if (index < 0) index = 0;
      const interval = Math.max(2000, Number(gallery.dataset.galleryInterval || 4000));
      let advanceTimer = null;
      const activeMedia = () => items[index] && items[index].querySelector("img, video");
      const stopInactiveVideo = (activeIndex) => {
        items.forEach((item, itemIndex) => {
          const video = item.querySelector("video");
          if (video && itemIndex !== activeIndex) video.pause();
        });
      };
      const show = (next, restartVideo = false) => {
        items.forEach((item, itemIndex) => item.classList.toggle("is-active", itemIndex === next));
        stopInactiveVideo(next);
        const video = items[next] && items[next].querySelector("video");
        if (!video) return;
        video.muted = true;
        video.playsInline = true;
        video.setAttribute("playsinline", "");
        video.setAttribute("webkit-playsinline", "");
        if (restartVideo) {
          try { video.currentTime = 0; } catch (_) {}
        }
        const play = video.play && video.play();
        if (play && play.catch) play.catch(() => video.setAttribute("data-playback", "blocked"));
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
        advanceTimer = window.setTimeout(advance, interval);
        gallery._galleryTimer = advanceTimer;
      };
      const advance = async () => {
        if (!document.contains(gallery)) return;
        if (index >= items.length - 1) return complete();
        const next = index + 1;
        await waitForMedia(items[next]);
        if (!document.contains(gallery)) return;
        index = next;
        show(index, true);
        scheduleAdvance();
      };
      items.forEach((item, itemIndex) => {
        const video = item.querySelector("video");
        if (!video) return;
        video.loop = false;
        video.addEventListener("ended", () => {
          if (itemIndex === index) advance();
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
