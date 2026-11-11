// Deterministic browser tests of the real player/gallery scripts. No live API.
const assert = require("node:assert/strict");
const path = require("node:path");
const { chromium } = require("playwright");
const root = path.resolve(__dirname, "..");
const fixture = (slides) => ({ brand: {}, settings: { defaultDuration: 300, refreshSeconds: 1 }, slides });
const slide = (id, extra = {}) => ({ id, duration: 300, visible: true, ...extra });

(async () => {
  const browser = await chromium.launch({ headless: true });
  const errors = [];
  async function create(snapshot, usb = false) {
    const page = await browser.newPage();
    page.on("pageerror", (error) => errors.push(error.message));
    await page.clock.install({ time: new Date("2026-11-11T12:00:00Z") });
    await page.clock.pauseAt(new Date("2026-11-11T12:00:01Z"));
    await page.setContent('<div id="app"></div>');
    await page.evaluate(({ snapshot, usb }) => {
      window.board = null;
      window.activeSlide = 0;
      window.screenTimer = null;
      window.app = document.querySelector("#app");
      window.route = () => "/screen";
      window.isUsbExport = () => usb;
      window.escapeHtml = (value) => String(value);
      window.fixture = snapshot;
      window.requests = [];
      window.visits = [];
      window.api = (_, options) => new Promise((resolve, reject) => {
        const request = { resolve, reject, snapshot: structuredClone(window.fixture) };
        window.requests.push(request);
        options.signal.addEventListener("abort", () => reject(new DOMException("Aborted", "AbortError")), { once: true });
      });
      const photo = 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20"><rect width="20" height="20" fill="red"/></svg>';
      window.renderSlide = (slide) => `<section class="slide" data-slide-id="${slide.id}">${slide.gallery ? `<div data-gallery-carousel data-gallery-interval="2000"><figure class="photo-carousel-item is-active" data-media-duration="${slide.firstDuration || 2000}" data-video-start="1" data-video-end="3">${slide.video ? '<video></video>' : `<img src='${photo}'>`}</figure><figure class="photo-carousel-item" data-media-duration="2000"><img src='${photo}'></figure></div>` : slide.id}</section>`;
      const seen = new WeakSet();
      new MutationObserver((records) => records.forEach((record) => record.addedNodes.forEach((node) => {
        if (!(node instanceof HTMLElement)) return;
        const slides = [...(node.matches(".slide") ? [node] : []), ...node.querySelectorAll(".slide")];
        slides.forEach((el) => { if (!seen.has(el)) { seen.add(el); window.visits.push({ id: el.dataset.slideId, time: Date.now() }); } });
      }))).observe(document.body, { childList: true, subtree: true });
    }, { snapshot, usb });
    await page.addScriptTag({ path: path.join(root, "public/screen-stability.js") });
    await page.addScriptTag({ path: path.join(root, "public/gallery-carousel.js") });
    return page;
  }
  const resolve = (page) => page.evaluate(() => { const request = window.requests.shift(); request.resolve(request.snapshot); });
  const ids = (page) => page.evaluate(() => window.visits.map((visit) => visit.id));
  const ready = (page) => page.evaluate(() => window.__eskaScreenRun.ready);
  try {
    const page = await create(fixture([slide("A"), slide("B"), slide("C")]));
    await page.evaluate(() => { for (let i = 0; i < 10; i++) window.screenView(); });
    assert.equal(await page.evaluate(() => window.requests.length), 1, "concurrent startup uses one request/run");
    await resolve(page); await ready(page);
    await page.clock.runFor(18000);
    const sequence = await ids(page);
    assert(sequence.length > 50);
    sequence.forEach((id, index) => assert.equal(id, ["A", "B", "C"][index % 3]));
    // Poll request captured old data, then arrives long after several transitions.
    await resolve(page);
    await page.clock.runFor(1800);
    (await ids(page)).forEach((id, index) => assert.equal(id, ["A", "B", "C"][index % 3]));
    const count = (await ids(page)).length;
    await page.evaluate(async () => {
      for (let i = 0; i < 8; i++) { document.dispatchEvent(new Event("visibilitychange")); await window.screenView(); }
    });
    assert.equal((await ids(page)).length, count, "focus and TV re-entry never redraw an active slide");
    await page.addScriptTag({ path: path.join(root, "public/screen-stability.js") });
    assert.equal((await ids(page)).length, count, "duplicate script loading must not start a second player");
    await page.evaluate(() => window.requests.shift()?.reject(new Error("Temporary network failure")));
    await page.clock.runFor(1800);
    (await ids(page)).forEach((id, index) => assert.equal(id, ["A", "B", "C"][index % 3]));
    await page.close();
    console.log("PASS: 60+ ordered slide visits, delayed polling, concurrent starts, repeated TV re-entry and focus");

    const updates = await create(fixture([slide("A"), slide("B"), slide("C")]));
    await resolve(updates); await ready(updates);
    await updates.clock.runFor(1000); // A at the beginning of the second loop.
    await updates.evaluate(() => { window.requests[0].snapshot = { ...window.fixture, slides: [{ id: "B", duration: 300 }, { id: "C", duration: 300 }, { id: "D", duration: 300 }] }; });
    await resolve(updates);
    await updates.clock.runFor(1400);
    assert.deepEqual((await ids(updates)).slice(0, 9), ["A", "B", "C", "A", "B", "C", "B", "C", "D"]);
    await updates.close();
    console.log("PASS: live addition/removal/reordering applies only at a loop boundary");

    const stale = await create(fixture([slide("A"), slide("B")]));
    await stale.evaluate(() => { window.__eskaScreenStop(); window.fixture.slides = [{ id: "NEW", duration: 300 }]; window.screenView(); });
    await resolve(stale); // Aborted startup response must not commit.
    await resolve(stale); await ready(stale);
    assert.deepEqual(await ids(stale), ["NEW"]);
    await stale.close();
    console.log("PASS: stopped startup responses cannot overwrite a newer run");

    const gallery = await create(fixture([slide("G", { gallery: true, duration: 6000 }), slide("B", { duration: 3000 })]), true);
    await resolve(gallery); await ready(gallery);
    await gallery.waitForFunction(() => [...document.images].every((img) => img.complete));
    await gallery.evaluate(() => { window.oldGallery = document.querySelector('[data-gallery-carousel]'); });
    await gallery.clock.runFor(4500);
    assert.deepEqual(await ids(gallery), ["G"], "gallery completion does not shorten configured slide time");
    await gallery.evaluate(() => { for (let i = 0; i < 10; i++) window.oldGallery.dispatchEvent(new CustomEvent("eska:carousel-complete", { bubbles: true })); });
    await gallery.clock.runFor(1500);
    assert.deepEqual(await ids(gallery), ["G", "B"]);
    await gallery.evaluate(() => { for (let i = 0; i < 10; i++) window.oldGallery.dispatchEvent(new CustomEvent("eska:carousel-complete", { bubbles: true })); });
    await gallery.clock.runFor(1000);
    assert.deepEqual(await ids(gallery), ["G", "B"], "stale completions do not skip the next slide");
    assert.equal(await gallery.evaluate(() => window.requests.length), 0, "USB playback does not poll");
    await gallery.close();
    console.log("PASS: gallery/timer races, duplicate completion, stale events, minimum duration and USB playback");

    const reduced = await create(fixture([slide("G", { gallery: true, firstDuration: 4000 }), slide("B")]), true);
    await reduced.emulateMedia({ reducedMotion: "reduce" });
    await resolve(reduced); await ready(reduced);
    await reduced.waitForFunction(() => [...document.images].every((img) => img.complete));
    await reduced.clock.runFor(5000);
    assert.deepEqual(await ids(reduced), ["G"], "long per-photo duration must finish before next slide");
    await reduced.clock.runFor(1100);
    assert.deepEqual(await ids(reduced), ["G", "B"]);
    await reduced.close();
    console.log("PASS: per-photo timing and reduced-motion carousel completion");
    const mixed = await create(fixture([slide("M", { gallery: true, video: true }), slide("B", { duration: 3000 })]), true);
    await mixed.evaluate(() => {
      window.plays = 0;
      Object.defineProperty(HTMLMediaElement.prototype, "readyState", { get: () => 1 });
      Object.defineProperty(HTMLMediaElement.prototype, "duration", { get: () => 5 });
      HTMLMediaElement.prototype.play = () => { window.plays++; return Promise.resolve(); };
    });
    await resolve(mixed); await ready(mixed);
    await mixed.waitForFunction(() => [...document.images].every((img) => img.complete));
    assert.equal(await mixed.evaluate(() => window.plays), 1, "video has a single playback owner");
    await mixed.evaluate(() => {
      window.oldVideo = document.querySelector("video");
      Object.defineProperty(window.oldVideo, "currentTime", { value: 3, configurable: true });
      window.oldVideo.dispatchEvent(new Event("timeupdate"));
      window.oldVideo.dispatchEvent(new Event("ended"));
      window.oldVideo.dispatchEvent(new Event("ended"));
    });
    await mixed.waitForFunction(() => document.querySelectorAll(".photo-carousel-item")[1].classList.contains("is-active"));
    await mixed.clock.runFor(2100);
    assert.deepEqual(await ids(mixed), ["M", "B"]);
    await mixed.evaluate(() => window.oldVideo.dispatchEvent(new Event("ended")));
    await mixed.clock.runFor(1000);
    assert.deepEqual(await ids(mixed), ["M", "B"]);
    await mixed.close();
    console.log("PASS: mixed video/photo sequence, trim/end races, one video start and detached video events");
    const stopped = await create(fixture([slide("WAIT", { gallery: true, video: true }), slide("B")]), true);
    await stopped.evaluate(() => {
      window.plays = 0;
      HTMLMediaElement.prototype.play = () => { window.plays++; return Promise.resolve(); };
    });
    await resolve(stopped); await ready(stopped);
    await stopped.evaluate(() => {
      window.__eskaScreenStop();
      const video = document.querySelector("video");
      video.dispatchEvent(new Event("loadedmetadata"));
      video.dispatchEvent(new Event("ended"));
    });
    await stopped.clock.runFor(10000);
    assert.equal(await stopped.evaluate(() => window.plays), 0);
    assert.deepEqual(await ids(stopped), ["WAIT"]);
    await stopped.close();
    console.log("PASS: stopped video metadata callbacks and timers are inert");
    assert.deepEqual(errors, []);
  } finally { await browser.close(); }
})().catch((error) => { console.error(error); process.exitCode = 1; });
