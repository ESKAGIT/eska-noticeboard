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
