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
      const show = (next) => items.forEach((item, itemIndex) => item.classList.toggle("is-active", itemIndex === next));
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
      show(index);
      liveGalleries.add(gallery);
      if (window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
      if (gallery.dataset.galleryEditing === "true") return;
      const advance = async () => {
        if (index >= items.length - 1) return;
        const next = index + 1;
        await waitForMedia(items[next]);
        if (!document.contains(gallery)) return;
        index = next;
        show(index);
        if (index < items.length - 1) gallery._galleryTimer = window.setTimeout(advance, interval);
      };
      gallery._galleryTimer = window.setTimeout(advance, interval);
    });
  }
  const observer = new MutationObserver(() => init(document));
  observer.observe(document.documentElement, { childList: true, subtree: true });
  window.addEventListener("load", () => init(document));
  window.initGalleryCarousels = init;
}());
