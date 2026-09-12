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
      show(index);
      liveGalleries.add(gallery);
      if (window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
      if (gallery.dataset.galleryEditing === "true") return;
      gallery._galleryTimer = window.setInterval(() => {
        if (index >= items.length - 1) {
          window.clearInterval(gallery._galleryTimer);
          return;
        }
        index += 1;
        show(index);
      }, interval);
    });
  }
  const observer = new MutationObserver(() => init(document));
  observer.observe(document.documentElement, { childList: true, subtree: true });
  window.addEventListener("load", () => init(document));
  window.initGalleryCarousels = init;
}());
