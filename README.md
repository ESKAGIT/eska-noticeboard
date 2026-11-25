# ESKA Railway Noticeboard

This is the web version of the ESKA dojo TV noticeboard.

## Screens

- `/screen` - full-screen TV display for Apple TV signage apps, AirPlay, or a browser.
- `/admin` - edit the live slides.
- `/templates` - create new slides from reusable templates.

## Local use

```powershell
npm start
```

Then open:

```text
http://localhost:3000/admin
http://localhost:3000/screen
```

## Railway

Deploy this folder as a Node app. Railway will run:

```text
npm start
```

Recommended Railway variables:

```text
ADMIN_PIN=choose-a-private-pin
DATA_DIR=/data
```

For reliable uploaded images/videos, add a Railway Volume mounted at `/data`.

## Editing

Edit slides in `/admin`, press **Save Live Screen**, and the `/screen` player will refresh automatically.

## Adding Templates

Templates are defined at the top of `public/app.js` in the `templates` array. Add a new template object with:

- `id`
- `name`
- `category`
- `description`

Then add or reuse a matching layout in `renderSlide()`.

## Stock Carousel

Choose Stock Carousel from Templates. It starts hidden; enable Show on TV when ready.
The six numbered products each accept multiple images, with independent playback.
Use the arrow buttons under a thumbnail to reorder it, or the remove button to
remove it from this slide without deleting the library file.

Open Photo 1 text, Photo 2 text, etc. to override the name, price and description
for that particular image. Use Preview photo to check it in the slide. Unedited
fields inherit the box defaults; Use default restores inheritance. Photo-specific
text changes only when its corresponding image is ready, and follows the image
when reordered or removed. Existing slides need no data migration.

Product photo frames preserve 450 x 600 portrait proportions and scale uniformly
to fit the slide. Desktop uses three products across and two rows, with names,
optional descriptions and prices beside the photos. Empty photo slots remain
editable in admin but are not shown on the TV. Existing content is not migrated
or replaced when this template code changes.

One optional QR code is docked in a reserved footer area. Its bundled default
links to https://members.eska.co.uk/shop/. The QR controls can hide it or replace
the image and caption. The source PNG includes a four-module quiet border.
Stock QR size is adjustable from 160 to 320 pixels at full-HD, defaulting to 240.
It scales with display resolution and its reserved footer grows with the code.

The footer message and subheading are optional: clear either field to hide it.
No reception message is inserted automatically. Layout and sizes includes
heading, subheading and footer-message size sliders, alongside the product
name, price and description size controls. Existing saved wording is preserved.

All cards width and height sliders resize the stock cards within their grid slots
(60 to 100 percent). For individual adjustments, open Card 1 size, Card 2 size,
etc. in the relevant product row. Use shared card size clears only that card's
size override. Text and photo fitting adapt to the smaller card; image aspect
ratio stays 450:600. Cards remain centered in their slots and cannot cover the QR.

Images are decoded before transitions; unreadable images do not blank the
current product photo. The interval control adjusts the minimum slide duration
without shortening an existing longer duration. Reduced motion removes photo
transition effects while retaining the photo sequence.

### Browser regression test

`tests/stock-carousel.cjs` requires Playwright and an installed Chromium browser.
Run `node tests/stock-carousel.cjs` with Playwright available through Node module
resolution. It starts and closes its own loopback test server, uses in-memory
test data, and writes screenshots under `.qa/`; it does not call production.
Where the local working tree has unresolved legacy edits, the test deliberately
uses committed versions of those base files plus the current stock/QR changes.
It covers real editor uploads, reorder/removal, save/reload, QR visibility,
desktop/mobile frame measurements and independent decoded photo playback.

## TV playback ordering

The TV player has one active run and one advance decision for each slide visit.
Normal TV Screen clicks reuse the named player tab without reloading it.
Modifier-clicks can still deliberately open another tab.
Repeated initialization or returning to the tab does not restart the current
slide. Background requests queue updates without changing the playback index.
Saved changes become visible at the start of the next full loop, keeping the
current loop's order and content stable. USB recording keeps its loaded snapshot.

Gallery slides wait for both their configured slide duration and media completion.
Photo-specific durations and video trims are honored; a generous watchdog handles
stalled media. Detached galleries are stopped and their callbacks cannot advance
another slide. Reduced-motion preference removes effects, not timed photo cycling.
The previous arbitrary error-triggered and six-hour full-page reloads are removed
so they cannot restart the playlist halfway through a recording or TV session.

Run `node tests/screen-playback.cjs` with Playwright/Chromium installed to exercise
concurrent starts, delayed responses, ordered loops, pending live updates,
focus changes, duplicate completion events, gallery durations and mixed media.
These deterministic tests use an isolated browser fixture, not the live board.

## Calendar template

Choose Calendar in the admin template selector or template library. New calendar
instances start hidden and are not automatically inserted into the live board.
Set Start month, Months shown (1-3), Heading, Dates list and the two footer fields.
Put a middle dot before the month range in Heading to render that suffix in red.
The normal animation, duration and Show on TV fields remain available.

Dates list format, one event per line:

```text
2027-01-24 | competition | ESKA Kata & Kumite Competition | The Dojo
2027-02-13–2027-02-14 | course | TSKUK International Course |
2027-03-06 | grading | Tiny Tiger Grading | 11:30am
```

Ranges are inclusive; an en dash, em dash or plain hyphen between ISO dates is
accepted. Dates use UTC arithmetic and Monday-first weeks. Invalid lines are
flagged in the editor and excluded from the visual calendar, not silently changed
into different dates. Events spanning months appear in each affected month;
overlapping event types share the day cell with a split-colour fill.

The 1920 x 1080 calendar canvas scales uniformly in preview and TV views. Crowded
months keep all event-day highlights but show a count when their short event list
cannot fit. Empty months show No dates published yet. Footer wording is editable
and can be cleared. Entrance animation uses Anime.js when available, otherwise
Web Animations, finishing in about three seconds (shortened for short slides).
No animation and reduced-motion modes leave the full calendar static.

Implementation is isolated in public/calendar-model.js, calendar-slide.js and
calendar-slide.css; it does not migrate or modify existing slides. Calendar
fields are persisted by the existing /api/noticeboard save path.
Run node tests/calendar.cjs with Playwright available for model, API/editor and
visual regression checks. ANIME_TEST_SCRIPT can point to a local copy of the
existing Anime.js UMD bundle to exercise that engine explicitly.
