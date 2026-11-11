// Run with Playwright installed and available through NODE_PATH.
// Tests use an in-memory board; they never contact or mutate production data.
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const http = require("node:http");
const { execFileSync } = require("node:child_process");
const { chromium } = require("playwright");
const root = path.resolve(__dirname, "..");
const committed = (file) => execFileSync("git", ["show", `HEAD:${file}`], { cwd: root });
const conflicted = new Set(["app.js", "freedom.js", "quick-editor.js", "quick-editor.css", "styles.css", "dojo-motion.css"]);
const photo = (color) => `<svg xmlns="http://www.w3.org/2000/svg" width="450" height="600"><rect width="450" height="600" fill="${color}"/><text x="225" y="300" text-anchor="middle" font-size="40">450 x 600</text></svg>`;
let board = JSON.parse(committed("data/noticeboard.json"));
const names = ["Beginner Gi", "Premium Gi", "Karate Belts", "Sparring Mitts", "Karate Trousers", "Training Bag"];
const fields = { heading: "ESKA Club Shop", eyebrow: "Training essentials", subheading: "Available at reception", stockInterval: 2000, stockPhotoFit: "contain", qr: "/assets/eska-shop-qr.png", qrVisible: "true", qrText: "Scan to shop", shopNameSize: 30, shopPriceSize: 30 };
names.forEach((name, index) => Object.assign(fields, { [`product${index + 1}Name`]: name, [`product${index + 1}Price`]: "Ask for price", [`product${index + 1}Images`]: ["/qa-a.svg", "/qa-b.svg"] }));
board.slides = [{ id: "stock-test", template: "stock-carousel", animation: "fade-up", visible: true, duration: 60000, fields }];
board.settings.refreshSeconds = 60;
let uploaded = 0;
let writes = 0;
const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, "http://localhost");
  res.setHeader("cache-control", "no-store");
  const json = (value) => { res.setHeader("content-type", "application/json"); res.end(JSON.stringify(value)); };
  if (url.pathname === "/api/noticeboard") {
    if (req.method === "PUT") {
      let body = "";
      for await (const chunk of req) body += chunk;
      board = JSON.parse(body); writes++;
      return json({ ok: true });
    }
    return json(board);
  }
  if (url.pathname === "/api/upload") { for await (const chunk of req) {} return json({ url: `/qa-upload-${++uploaded}.svg` }); }
  if (url.pathname === "/api/media-library") return json({ media: [] });
  if (url.pathname === "/api/backups") return json({ backups: [] });
  if (url.pathname === "/api/storage-status") return json({ persistent: true, noticeboard: { slideCount: 1 } });
  if (url.pathname.endsWith(".svg") && url.pathname.startsWith("/qa-")) { res.setHeader("content-type", "image/svg+xml"); return res.end(photo(url.pathname.includes("-b") ? "#dce9e2" : "#e6e9ef")); }
  const name = ["/", "/admin", "/screen"].includes(url.pathname) ? "index.html" : url.pathname.slice(1);
  const file = path.join(root, "public", name);
  try {
    let body = conflicted.has(name) ? committed(`public/${name}`) : fs.readFileSync(file);
    if (name === "index.html") body = Buffer.from(body.toString().replace(/<script async[^>]+><\/script>/, "").replace(/<link[^>]*https:[^>]*>/g, ""));
    res.setHeader("content-type", ({ ".html": "text/html", ".js": "text/javascript", ".css": "text/css", ".svg": "image/svg+xml", ".png": "image/png" })[path.extname(file)] || "application/octet-stream");
    res.end(body);
  } catch { res.statusCode = 404; res.end("Not found"); }
});

(async () => {
  let browser;
  try {
    await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
    const origin = `http://127.0.0.1:${server.address().port}`;
    browser = await chromium.launch({ headless: true });
    const page = await browser.newPage({ viewport: { width: 1920, height: 1080 } });
    const errors = [];
    page.on("pageerror", (error) => errors.push(error.message));
    await page.goto(`${origin}/admin`);
    await page.locator('.shop-edit-form [data-field="stockInterval"]').waitFor({ state: "attached" });
    const originalCard = await page.locator('.preview-wrap .shop-product-card').first().boundingBox();
    for (const [key, value] of [["shopCardWidth", "80"], ["shopCardHeight", "75"]]) {
      await page.locator(`.shop-edit-form [data-field="${key}"]`).evaluate((input, size) => { input.value = size; input.dispatchEvent(new Event("input", { bubbles: true })); }, value);
    }
    await page.waitForTimeout(1300);
    const resizedCard = await page.locator('.preview-wrap .shop-product-card').first().boundingBox();
    assert(Math.abs(resizedCard.width / originalCard.width - .8) < .02, "shared card width changes preview");
    assert(Math.abs(resizedCard.height / originalCard.height - .75) < .02, "shared card height changes preview");
    assert.equal(board.slides[0].fields.shopCardWidth, "80");
    for (const [key, value] of [["product1CardWidth", "95"], ["product1CardHeight", "90"]]) {
      await page.locator(`.shop-edit-form [data-field="${key}"]`).evaluate((input, size) => { input.value = size; input.dispatchEvent(new Event("input", { bubbles: true })); }, value);
    }
    await page.waitForTimeout(1300);
    const individualCard = await page.locator('.preview-wrap .shop-product-card').first().boundingBox();
    assert(Math.abs(individualCard.width / originalCard.width - .95) < .02);
    assert(Math.abs(individualCard.height / originalCard.height - .9) < .02);
    await page.locator('[data-reset-shop-card="1"]').evaluate((button) => button.click());
    await page.waitForTimeout(600);
    assert.equal(board.slides[0].fields.product1CardWidth, undefined);
    assert.equal(board.slides[0].fields.shopCardWidth, "80");
    await page.reload();
    await page.locator('.shop-edit-form [data-field="shopCardWidth"]').waitFor({ state: "attached" });
    assert.equal(await page.locator('.shop-edit-form [data-field="shopCardWidth"]').inputValue(), "80");
    for (const key of ["shopCardWidth", "shopCardHeight"]) {
      await page.locator(`.shop-edit-form [data-field="${key}"]`).evaluate((input) => { input.value = "100"; input.dispatchEvent(new Event("input", { bubbles: true })); });
    }
    await page.waitForTimeout(1000);
    console.log("PASS card sizing: independent width/height, per-card overrides, shared-size reset, save/reload");
    assert.equal(await page.locator('.preview-wrap .shop-footer p').count(), 0, "blank footer has no reception fallback");
    await page.locator('.shop-edit-form [data-field="body"]').fill("Shop online");
    await page.locator('.shop-edit-form [data-field="subheading"]').fill("");
    for (const [key, value] of [["shopFooterSize", "36"], ["headingSize", "50"]]) {
      await page.locator(`.shop-edit-form [data-field="${key}"]`).evaluate((input, size) => { input.value = size; input.dispatchEvent(new Event("input", { bubbles: true })); }, value);
    }
    await page.waitForTimeout(1300);
    assert.equal(board.slides[0].fields.body, "Shop online");
    assert.equal(board.slides[0].fields.shopFooterSize, "36");
    assert.equal(await page.locator('.preview-wrap .shop-footer p').evaluate((el) => getComputedStyle(el).fontSize), "36px");
    assert.equal(await page.locator('.preview-wrap .shop-heading h2').count(), 0, "cleared subheading stays hidden");
    await page.locator('[data-field="stockInterval"]').evaluate((input) => { input.value = "3000"; input.dispatchEvent(new Event("input", { bubbles: true })); });
    await page.waitForTimeout(1500);
    assert.equal(board.slides[0].fields.stockInterval, "3000");
    assert(writes > 0, "interval change must save");
    assert.equal(board.slides[0].duration, 60000, "do not shorten an existing slide");
    await page.locator('[data-shop-image="image"]').setInputFiles([{ name: "first.svg", mimeType: "image/svg+xml", buffer: Buffer.from(photo("#eee")) }, { name: "second.svg", mimeType: "image/svg+xml", buffer: Buffer.from(photo("#ddd")) }]);
    await page.waitForTimeout(1800);
    assert.equal(board.slides[0].fields.product1Images.length, 4, "multi-upload appends instead of replacing");
    assert.equal(board.slides[0].fields.product2Images.length, 2, "uploads stay in selected slot");
    for (const [index, value] of [[0, "Lightweight gi"], [1, "Heavyweight gi"]]) {
      await page.locator(`[data-shop-photo-field="description"][data-product-number="1"][data-photo-index="${index}"]`).evaluate((input, text) => { input.value = text; input.dispatchEvent(new Event("input", { bubbles: true })); }, value);
      for (const [key, text] of [["name", index === 0 ? "Training Gi" : "Competition Gi"], ["price", index === 0 ? "GBP 25" : "GBP 45"]]) {
        await page.locator(`[data-shop-photo-field="${key}"][data-product-number="1"][data-photo-index="${index}"]`).evaluate((input, value) => { input.value = value; input.dispatchEvent(new Event("input", { bubbles: true })); }, text);
      }
    }
    await page.waitForTimeout(1200);
    assert.equal(board.slides[0].fields.product1PhotoDetails[1].description, "Heavyweight gi");
    await page.locator('[data-move-shop-photo="image"][data-photo-index="0"][data-direction="1"]').click();
    await page.waitForTimeout(500);
    assert.equal(board.slides[0].fields.product1Images[0], "/qa-b.svg");
    assert.equal(board.slides[0].fields.product1PhotoDetails[0].description, "Heavyweight gi", "caption follows reordered photo");
    await page.locator('[data-remove-shop-photo="image"][data-photo-index="3"]').click();
    await page.waitForTimeout(500);
    assert.equal(board.slides[0].fields.product1Images.length, 3);
    await page.reload();
    await page.locator('.shop-edit-form [data-field="stockInterval"]').waitFor({ state: "attached" });
    assert.equal(await page.locator('[data-field="stockInterval"]').inputValue(), "3000");
    assert.equal(await page.locator('.shop-edit-form [data-field="body"]').inputValue(), "Shop online");
    assert.equal(await page.locator('.shop-edit-form [data-field="shopFooterSize"]').inputValue(), "36");
    await page.locator('.shop-edit-form [data-field="body"]').fill("");
    await page.waitForTimeout(1000);
    assert.equal(await page.locator('.preview-wrap .shop-footer p').count(), 0);
    await page.locator('.shop-edit-form [data-field="body"]').fill("Shop online");
    await page.waitForTimeout(1000);
    await page.locator('[data-qr-visible]').uncheck();
    await page.waitForTimeout(1200);
    assert.equal(board.slides[0].fields.qrVisible, "");
    await page.reload();
    await page.locator('[data-qr-visible]').waitFor({ state: "attached" });
    assert.equal(await page.locator('[data-qr-visible]').isChecked(), false);
    await page.locator('[data-qr-visible]').check();
    await page.waitForTimeout(1200);
    await page.locator('[data-field="stockQrSize"]').evaluate((input) => { input.value = "320"; input.dispatchEvent(new Event("input", { bubbles: true })); });
    await page.waitForTimeout(1200);
    assert.equal(board.slides[0].fields.stockQrSize, "320");
    console.log("PASS editor: interval, non-destructive duration, multi-upload, independent slots, reorder, remove, reload persistence");
    await page.goto(`${origin}/screen?usb-export=1`);
    await page.locator('.slide-stock-carousel [data-shop-photo-carousel]').first().waitFor();
    await page.waitForTimeout(1200);
    const geometry = await page.evaluate(() => {
      const rect = (el) => { const r = el.getBoundingClientRect(); return { x: r.x, y: r.y, w: r.width, h: r.height }; };
      return { frames: [...document.querySelectorAll('[data-shop-photo-carousel]')].map(rect), cards: [...document.querySelectorAll('.shop-product-card')].map(rect), qr: rect(document.querySelector('.qr-layer')), images: [...document.querySelectorAll('[data-shop-photo-carousel] img')].map((img) => [img.width, img.height, img.naturalWidth]) };
    });
    assert.equal(geometry.frames.length, 6);
    assert.equal(await page.locator('.shop-footer p').textContent(), "Shop online");
    assert.equal(await page.locator('.shop-footer p').evaluate((el) => getComputedStyle(el).fontSize), "36px");
    geometry.frames.forEach((r) => { assert(Math.abs(r.w / r.h - .75) < .01); assert(r.y >= 0 && r.y + r.h <= 1080); });
    assert(Math.abs(geometry.cards[0].y - geometry.cards[2].y) < 2);
    assert(geometry.cards[3].y > geometry.cards[0].y);
    assert(geometry.cards.every((card) => card.y + card.h <= geometry.qr.y), "QR must not cover a product");
    assert(geometry.images.every((values) => values[2] === 450));
    assert.equal(Math.round(await page.locator('.qr-code-frame').evaluate((el) => el.getBoundingClientRect().width)), 320);
    assert.equal(await page.locator('.shop-product-description').first().textContent(), "Heavyweight gi");
    assert.equal(await page.locator('.shop-product-copy strong').first().textContent(), "Competition Gi");
    assert.equal(await page.locator('.shop-product-price').first().textContent(), "GBP 45");
    fs.mkdirSync(path.join(root, ".qa"), { recursive: true });
    await page.screenshot({ path: path.join(root, ".qa", "stock-desktop.png") });
    await page.locator('.qr-code-frame').screenshot({ path: path.join(root, ".qa", "shop-qr-preview.png") });
    const original = await page.locator('[data-shop-photo-carousel]').first().locator('img').first().getAttribute("src");
    await page.waitForTimeout(4000);
    assert.notEqual(await page.locator('[data-shop-photo-carousel]').first().locator('img').first().getAttribute("src"), original);
    assert.equal(await page.locator('.shop-product-description').first().textContent(), "Lightweight gi", "description changes with decoded photo");
    assert.equal(await page.locator('.shop-product-copy strong').first().textContent(), "Training Gi");
    assert.equal(await page.locator('.shop-product-price').first().textContent(), "GBP 25");
    assert.equal(await page.locator('.qr-layer').count(), 1);
    const defaults = await page.evaluate(() => {
      const slide = createSlideFromTemplate("stock-carousel");
      return { visible: slide.visible, qr: slide.fields.qr, markup: renderSlide(slide, true) };
    });
    assert.equal(defaults.visible, false, "templates must not auto-publish");
    assert.equal(defaults.qr, "/assets/eska-shop-qr.png");
    assert(defaults.markup.includes("shop-has-qr"));
    console.log("PASS desktop: six 3x2 slots, exact 450:600 aspect ratio, one unobstructed QR, decoded photo cycling");
    for (const [width, height] of [[1280, 720], [2560, 1440]]) {
      await page.setViewportSize({ width, height });
      await page.waitForTimeout(350);
      const fits = await page.locator('.shop-product-card').evaluateAll((cards) => cards.every((card) => {
        const r = card.getBoundingClientRect(), copy = card.querySelector('.shop-product-copy').getBoundingClientRect();
        return copy.top >= r.top && copy.bottom <= r.bottom && r.bottom <= document.querySelector('.qr-layer').getBoundingClientRect().top;
      }));
      assert(fits, `product text and QR fit at ${width}x${height}`);
    }
    board.slides[0].fields.shopCardWidth = "60";
    board.slides[0].fields.shopCardHeight = "60";
    await page.setViewportSize({ width: 1280, height: 720 });
    await page.reload();
    await page.locator('.shop-product-card').first().waitFor();
    await page.waitForTimeout(500);
    const smallFits = await page.locator('.shop-product-card').evaluateAll((cards) => cards.every((card) => {
      const r = card.getBoundingClientRect(), copy = card.querySelector('.shop-product-copy').getBoundingClientRect(), frame = card.querySelector('[data-shop-photo-carousel]').getBoundingClientRect();
      return copy.top >= r.top && copy.bottom <= r.bottom && Math.abs(frame.width / frame.height - .75) < .01;
    }));
    assert(smallFits, "small cards preserve photo proportions and text bounds");
    await page.setViewportSize({ width: 390, height: 844 });
    await page.waitForTimeout(500);
    const smallMobileFits = await page.locator('.shop-product-card').evaluateAll((cards) => cards.every((card) => {
      const r = card.getBoundingClientRect(), copy = card.querySelector('.shop-product-copy').getBoundingClientRect(), frame = card.querySelector('[data-shop-photo-carousel]').getBoundingClientRect();
      return copy.top >= r.top && copy.bottom <= r.bottom && frame.height > 0 && Math.abs(frame.width / frame.height - .75) < .01;
    }));
    assert(smallMobileFits, "small mobile cards retain visible photos and bounded text");
    board.slides[0].fields.shopCardWidth = "100";
    board.slides[0].fields.shopCardHeight = "100";
    await page.reload();
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.setViewportSize({ width: 390, height: 844 });
    await page.waitForTimeout(800);
    const mobile = await page.locator('[data-shop-photo-carousel]').evaluateAll((frames) => frames.map((frame) => { const r = frame.getBoundingClientRect(); return r.width / r.height; }));
    assert(mobile.every((ratio) => Math.abs(ratio - .75) < .01));
    await page.screenshot({ path: path.join(root, ".qa", "stock-mobile.png") });
    board.slides[0].fields.product6Images = [];
    await page.reload();
    await page.locator('.slide-stock-carousel').waitFor();
    assert.equal(await page.locator('.shop-product-card').count(), 5, "empty slots are hidden only on the TV");
    assert.deepEqual(errors, [], "no uncaught page errors");
    console.log("PASS mobile portrait frames and reduced-motion render; no uncaught page errors");
  } finally {
    await browser?.close();
    await new Promise((resolve) => server.close(resolve));
  }
})().catch((error) => { console.error(error); process.exitCode = 1; });
