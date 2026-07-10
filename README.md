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
