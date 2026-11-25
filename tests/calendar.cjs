const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const http = require("node:http");
const { execFileSync } = require("node:child_process");
const { chromium } = require("playwright");
const model = require("../public/calendar-model.js");
const root = path.resolve(__dirname, "..");
const committed = (file) => execFileSync("git", ["show", `HEAD:${file}`], { cwd: root });
const sample = [
  "2027-01-22 | course | Judges & Referees Training | 6-7:30pm",
  "2027-01-24 | competition | ESKA Kata & Kumite Competition | The Dojo",
  "2027-02-13\u20132027-02-14 | course | TSKUK International Course |",
  "2027-03-06 | grading | Tiny Tiger Grading |",
  "2027-03-07 | grading | Kyu Gradings |",
  "2027-03-13\u20132027-03-14 | grading | Kyu Gradings |",
  "2027-03-14 | grading | SEN Grading | 5-6:15pm",
  "2027-03-20\u20132027-03-21 | competition | WUKF British Open (Squad) |"
].join("\n");
assert.equal(model.date("2027-02-29"), null);
assert.notEqual(model.date("2028-02-29"), null);
assert.equal(model.date("2027-13-01"), null);
assert.equal(model.parse("2027-01-04-2027-01-03 | course | Invalid").errors.length, 1);
assert.equal(model.parse("2027-01-03 | other | Invalid").errors.length, 1);
assert.equal(model.parse("2027-01-03 | course | Title | room | time").events[0].details, "room | time");
const parsed = model.parse(sample);
assert.equal(parsed.errors.length, 0);
const months = model.months("2027-01", 3, parsed.events);
assert.equal(months[0].cells[4].number, 1, "January starts Friday");
assert.equal(months[1].cells[0].number, 1, "February starts Monday");
assert.equal(months[1].cells.filter(Boolean).length, 28);
assert.equal(model.months("2028-02", 1)[0].cells.filter(Boolean).length, 29);
assert.equal(model.months("2027-12", 3)[1].year, 2028);
const crossing = model.parse("2027-01-30\u20132027-02-02 | course | Across months").events;
assert.equal(model.months("2027-01", 2, crossing)[1].cells.filter((cell) => cell?.events.length).length, 2);
const overlap = model.parse("2027-01-24 | competition | A\n2027-01-24 | course | B").events;
assert.deepEqual(model.months("2027-01", 1, overlap)[0].cells.find((cell) => cell?.number === 24).types, ["competition", "course"]);
console.log("PASS calendar model: Monday-first grids, strict dates, leap years, year/month crossing, ranges and overlapping types");

let board = JSON.parse(committed("data/noticeboard.json"));
const untouched = { id: "old-notice", template: "notice", visible: false, duration: 10000, fields: { heading: "Existing content stays intact" } };
const original = JSON.stringify(untouched);
board.slides = [{ id: "calendar-test", template: "calendar", animation: "calendar-stagger", visible: true, duration: 18000, fields: { heading: "2027 at a glance \u00b7 Jan \u2013 Mar", calendarStartMonth: "2027-01", calendarMonthCount: "3", dateList: sample } }, untouched];
let writes = 0;
const conflicted = new Set(["app.js", "freedom.js", "quick-editor.js", "quick-editor.css", "styles.css", "dojo-motion.css"]);
const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, "http://localhost");
  const json = (value) => { res.setHeader("content-type", "application/json"); res.end(JSON.stringify(value)); };
  if (url.pathname === "/api/noticeboard") {
    if (req.method === "PUT") { let body = ""; for await (const chunk of req) body += chunk; board = JSON.parse(body); writes++; return json({ ok: true }); }
    return json(board);
  }
  if (url.pathname === "/api/media-library") return json({ media: [] });
  if (url.pathname === "/api/backups") return json({ backups: [] });
  if (url.pathname === "/api/storage-status") return json({ persistent: true, noticeboard: { slideCount: 2 } });
  const name = ["/screen", "/admin", "/templates"].includes(url.pathname) ? "index.html" : url.pathname.slice(1);
  try {
    let body = conflicted.has(name) ? committed(`public/${name}`) : fs.readFileSync(path.join(root, "public", name));
    if (name === "index.html") body = Buffer.from(body.toString().replace(/<script async[^>]+><\/script>/, "").replace(/<link[^>]*https:[^>]*>/g, ""));
    res.setHeader("content-type", ({ ".js": "text/javascript", ".css": "text/css", ".html": "text/html", ".svg": "image/svg+xml" })[path.extname(name)] || "application/octet-stream");
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
    await page.locator('.calendar-edit-form').waitFor();
    assert.equal(await page.locator('.calendar-edit-form [data-key="template"] option[value="calendar"]').count(), 1);
    await page.locator('.calendar-edit-form [data-field="calendarFooterRight"]').fill("Booking opens soon");
    await page.waitForTimeout(1200);
    assert(writes > 0);
    assert.equal(board.slides[0].fields.calendarFooterRight, "Booking opens soon");
    assert.equal(JSON.stringify(board.slides[1]), original);
    await page.locator('.calendar-edit-form [data-field="dateList"]').fill(sample + "\n2027-02-30 | course | Bad date");
    await page.waitForTimeout(200);
    assert((await page.locator('.calendar-validation').textContent()).includes("Line 9"));
    await page.locator('.calendar-edit-form [data-field="dateList"]').fill(sample);
    await page.waitForTimeout(1000);
    await page.reload();
    await page.locator('.calendar-edit-form').waitFor();
    assert.equal(await page.locator('[data-field="calendarFooterRight"]').first().inputValue(), "Booking opens soon");
    const created = await page.evaluate(() => createSlideFromTemplate("calendar"));
    assert.equal(created.visible, false);
    assert.equal(board.slides.length, 2, "creating a template instance must not insert it automatically");
    console.log("PASS calendar editor: template selection, API saving, validation, reload, hidden new instances and existing-slide preservation");
    await page.goto(`${origin}/screen?usb-export=1`);
    await page.locator('.slide-calendar .calendar-month').first().waitFor();
    await page.waitForTimeout(3300);
    assert.equal(await page.locator('.calendar-month').count(), 3);
    assert.equal(await page.locator('.calendar-course[data-date="2027-02-14"]').count(), 1);
    assert.equal(await page.locator('.calendar-grading[data-date="2027-03-14"]').count(), 1);
    assert.equal(await page.locator('.calendar-header h1 span').textContent(), "Jan \u2013 Mar");
    fs.mkdirSync(path.join(root, ".qa"), { recursive: true });
    await page.screenshot({ path: path.join(root, ".qa/calendar-desktop.png") });
    async function fits() {
      return page.evaluate(() => {
        const canvas = document.querySelector('.calendar-canvas').getBoundingClientRect();
        const cards = [...document.querySelectorAll('.calendar-month')];
        const title = document.querySelector('.calendar-header h1').getBoundingClientRect();
        return canvas.left >= -1 && canvas.top >= -1 && canvas.right <= innerWidth + 1 && canvas.bottom <= innerHeight + 1 && title.bottom <= cards[0].getBoundingClientRect().top && cards.every((card) => {
          const list = card.querySelector('.calendar-event-list');
          return list.scrollHeight <= list.clientHeight + 1;
        });
      });
    }
    assert(await fits());
    for (const count of [1, 2, 3]) {
      await page.evaluate((count) => { board.slides[0].fields.calendarMonthCount = String(count); document.querySelector('#screenStage').innerHTML = renderSlide(board.slides[0]); }, count);
      await page.waitForTimeout(350);
      assert.equal(await page.locator('.calendar-month').count(), count);
      assert(await fits());
    }
    for (const viewport of [{ width: 1280, height: 720 }, { width: 390, height: 844 }]) {
      await page.setViewportSize(viewport); await page.waitForTimeout(200); assert(await fits());
    }
    await page.screenshot({ path: path.join(root, ".qa/calendar-mobile.png") });
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.evaluate(() => { document.querySelector('#screenStage').innerHTML = renderSlide(board.slides[0]); });
    await page.waitForTimeout(200);
    const reducedAnimations = await page.locator('.slide-calendar').evaluate((slide) => slide.getAnimations({ subtree: true }).map((animation) => ({ target: animation.effect?.target?.className, name: animation.animationName || 'WAAPI' })));
    assert.deepEqual(reducedAnimations, []);
    await page.setViewportSize({ width: 1920, height: 1080 });
    await page.evaluate(() => {
      board.slides[0].fields.dateList = Array.from({ length: 20 }, (_, index) => `2027-01-${String(index + 1).padStart(2, '0')} | course | A longer event title ${index + 1} | Some details and a venue`).join('\n');
      document.querySelector('#screenStage').innerHTML = renderSlide(board.slides[0]);
    });
    await page.waitForTimeout(200);
    assert(await fits());
    assert.equal(await page.locator('.calendar-more:not([hidden])').count(), 1);
    if (process.env.ANIME_TEST_SCRIPT) {
      await page.addScriptTag({ path: process.env.ANIME_TEST_SCRIPT });
      assert.equal(await page.evaluate(() => typeof window.anime?.animate), "function");
      await page.emulateMedia({ reducedMotion: "no-preference" });
      await page.evaluate((sample) => { board.slides[0].fields.dateList = sample; board.slides[0].fields.calendarFooterRight = "Times to be confirmed unless shown"; document.querySelector('#screenStage').innerHTML = renderSlide(board.slides[0]); }, sample);
      await page.waitForTimeout(3300);
      const settled = await page.locator('.calendar-month, .calendar-day, .calendar-event-list li').evaluateAll((elements) => elements.every((el) => Number(getComputedStyle(el).opacity) === 1));
      assert(settled, "Anime.js entrance must finish and hold visibly");
      await page.screenshot({ path: path.join(root, ".qa/calendar-anime.png") });
      console.log("PASS actual Anime.js entrance completes and holds after three seconds");
    }
    assert.deepEqual(errors, []);
    console.log("PASS calendar display: 1-3 months, coloured inclusive dates, range heading, dense lists, responsive canvas and reduced motion");
  } finally { await browser?.close(); await new Promise((resolve) => server.close(resolve)); }
})().catch((error) => { console.error(error); process.exitCode = 1; });
