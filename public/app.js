const app = document.querySelector("#app");

const templates = [
  { id: "hero", name: "Logo Hero", category: "General notice", description: "Large logo, strong heading, and CTA." },
  { id: "notice", name: "Clean Notice", category: "Announcements", description: "Simple white/red announcement slide." },
  { id: "image-right", name: "Image Right", category: "Events", description: "Copy on the left, photo on the right." },
  { id: "cards", name: "Info Cards", category: "Timetable changes", description: "Three easy-to-read detail cards." },
  { id: "dates", name: "Important Dates", category: "Events", description: "Clear date list for gradings, courses, closures, and reminders." },
  { id: "course", name: "Karate Course Split", category: "Karate courses", description: "Premium split image reveal." },
  { id: "media", name: "Photo and Video", category: "Karate courses", description: "Picture plus video placeholder." },
  { id: "gallery", name: "Achievement Gallery", category: "Student achievements", description: "Photo-led congratulations slide." }
];

const animations = [
  ["fade-up", "Fade up"],
  ["slide-left", "Slide left"],
  ["slide-right", "Slide right"],
  ["zoom-in", "Zoom in"],
  ["stagger", "Staggered text"],
  ["split-reveal", "Split reveal"],
  ["pan-zoom", "Slow photo zoom"],
  ["ticker", "Ticker bar"]
];

let board = null;
let activeSlide = 0;
let screenTimer = null;
let draftSlideId = null;
let statusTimer = null;

const uid = () => `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
const route = () => window.location.pathname;
const adminPin = () => localStorage.getItem("eskaAdminPin") || "";

function escapeHtml(value = "") {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

async function api(path, options = {}) {
  const headers = { ...(options.headers || {}) };
  if (options.body && !headers["content-type"]) headers["content-type"] = "application/json";
  if (adminPin()) headers["x-admin-pin"] = adminPin();
  let response = await fetch(path, { ...options, headers });
  if (response.status === 401) {
    const pin = window.prompt("Enter the ESKA admin PIN");
    if (pin) {
      localStorage.setItem("eskaAdminPin", pin);
      headers["x-admin-pin"] = pin;
      response = await fetch(path, { ...options, headers });
    }
  }
  if (!response.ok) {
    const detail = await response.json().catch(() => ({}));
    throw new Error(detail.error || `Request failed: ${response.status}`);
  }
  return response.json();
}

async function loadBoard() {
  board = await api("/api/noticeboard");
  return board;
}

async function saveBoard() {
  await api("/api/noticeboard", { method: "PUT", body: JSON.stringify(board) });
  showStatus("Saved. The TV screen will pick this up automatically.");
}

function field(slide, name, fallback = "") {
  return slide && slide.fields && slide.fields[name] ? slide.fields[name] : fallback;
}

function brandHeader(slide) {
  const logo = field(slide, "logo", board.brand.logo);
  return `<img class="corner-logo" src="${escapeHtml(logo)}" alt="ESKA logo">`;
}

function cssValue(value = "") {
  return String(value).replace(/[;"<>]/g, "").trim();
}

function imageCss(value = "") {
  return String(value).replace(/[\\'"<>]/g, "").trim();
}

function slideStyle(slide) {
  const styles = [];
  const background = field(slide, "background");
  const accent = field(slide, "accent");
  const textColor = field(slide, "textColor");
  const panelColor = field(slide, "panelColor");

  if (background) {
    const clean = cssValue(background);
    if (/^#|^rgb|^hsl|^linear-gradient|^radial-gradient/i.test(clean)) styles.push(`--slide-bg: ${clean}`);
    else styles.push(`--slide-bg-image: url('${imageCss(clean)}')`);
  }
  if (accent) styles.push(`--slide-accent: ${cssValue(accent)}`);
  if (textColor) styles.push(`--slide-text: ${cssValue(textColor)}`);
  if (panelColor) styles.push(`--panel-bg: ${cssValue(panelColor)}`);

  return styles.length ? ` style="${escapeHtml(styles.join("; "))}"` : "";
}

function meta(slide) {
  const bits = ["date", "time", "location"].map((key) => field(slide, key)).filter(Boolean);
  return bits.length ? `<div class="meta-row">${bits.map((bit) => `<span>${escapeHtml(bit)}</span>`).join("")}</div>` : "";
}

function copyBlock(slide) {
  return `
    <div class="copy-block">
      <p class="eyebrow">${escapeHtml(field(slide, "eyebrow", slide.template))}</p>
      <h1>${escapeHtml(field(slide, "heading", "Heading"))}</h1>
      <h2>${escapeHtml(field(slide, "subheading"))}</h2>
      <p class="body-copy">${escapeHtml(field(slide, "body"))}</p>
      ${meta(slide)}
      ${field(slide, "cta") ? `<div class="cta">${escapeHtml(field(slide, "cta"))}</div>` : ""}
    </div>
  `;
}

function mediaTag(src, alt = "") {
  if (!src) return `<div class="media-placeholder">Add image</div>`;
  const isVideo = /\.(mp4|mov)$/i.test(src);
  if (isVideo) return `<video src="${escapeHtml(src)}" autoplay muted loop playsinline webkit-playsinline preload="metadata"></video>`;
  return `<img src="${escapeHtml(src)}" alt="${escapeHtml(alt)}" loading="eager" decoding="async">`;
}

function dateItems(slide) {
  const list = field(slide, "dateList", "");
  if (list) {
    return list
      .split(/\r?\n/)
      .map((item) => item.trim())
      .filter(Boolean)
      .map((item) => item.split("|").map((part) => part.trim()));
  }
  return [field(slide, "date"), field(slide, "time"), field(slide, "location")]
    .filter(Boolean)
    .map((item) => item.split("|").map((part) => part.trim()));
}

function renderSlide(slide, preview = false) {
  const animation = slide.animation || "fade-up";
  const shellClass = `slide slide-${slide.template} anim-${animation}${preview ? " preview-slide" : ""}`;
  const image = field(slide, "image", board.brand.logo);
  const imageLeft = field(slide, "imageLeft", image);
  const imageRight = field(slide, "imageRight", field(slide, "image2", image));
  const video = field(slide, "video", "");

  let content = "";
  if (slide.template === "hero") {
    content = `<div class="hero-logo">${mediaTag(image, "ESKA")}</div>${copyBlock(slide)}`;
  } else if (slide.template === "notice") {
    content = `<div class="notice-orb">${mediaTag(board.brand.logo, "ESKA")}</div>${copyBlock(slide)}`;
  } else if (slide.template === "image-right") {
    content = `${copyBlock(slide)}<div class="photo-panel">${mediaTag(image, field(slide, "heading"))}</div>`;
  } else if (slide.template === "cards") {
    content = `
      ${copyBlock(slide)}
      <div class="info-cards">
        <article><strong>${escapeHtml(field(slide, "date", "Date"))}</strong><span>${escapeHtml(field(slide, "time", "Time"))}</span></article>
        <article><strong>Location</strong><span>${escapeHtml(field(slide, "location", "Add location"))}</span></article>
        <article><strong>Action</strong><span>${escapeHtml(field(slide, "cta", "Add action"))}</span></article>
      </div>
    `;
  } else if (slide.template === "dates") {
    const items = dateItems(slide);
    content = `
      ${copyBlock(slide)}
      <div class="date-board">
        ${items.map(([date, title = "Add title", detail = "Add details"]) => `
          <article>
            <strong>${escapeHtml(date)}</strong>
            <span>${escapeHtml(title)}</span>
            <small>${escapeHtml(detail)}</small>
          </article>
        `).join("")}
      </div>
    `;
  } else if (slide.template === "course") {
    content = `
      <div class="split-course" style="--course-left-image: url('${escapeHtml(imageLeft)}'); --course-right-image: url('${escapeHtml(imageRight)}')">
        <div class="split-copy">
          <img class="split-copy-logo" src="${escapeHtml(field(slide, "logo", board.brand.logo))}" alt="ESKA">
          ${copyBlock(slide)}
        </div>
        <div class="split-half split-left"></div>
        <div class="split-half split-right"></div>
      </div>
    `;
  } else if (slide.template === "media") {
    content = `
      ${copyBlock(slide)}
      <div class="media-layout">
        <div class="photo-panel">${mediaTag(image, field(slide, "heading"))}</div>
        <div class="video-panel">${video ? mediaTag(video, "Course video") : `<span>${escapeHtml(field(slide, "cta", "Add video"))}</span>`}</div>
      </div>
    `;
  } else if (slide.template === "gallery") {
    content = `
      <div class="gallery-photo">${mediaTag(image, field(slide, "heading"))}</div>
      ${copyBlock(slide)}
    `;
  } else {
    content = copyBlock(slide);
  }

  return `<section class="${shellClass}" data-slide-id="${escapeHtml(slide.id)}"${slideStyle(slide)}>${brandHeader(slide)}${content}</section>`;
}

function visibleSlides() {
  return ((board && board.slides) || []).filter((slide) => slide.visible !== false);
}

async function screenView() {
  await loadBoard();
  app.innerHTML = `<main class="screen-shell"><div id="screenStage"></div></main>`;
  const stage = document.querySelector("#screenStage");
  let refreshBusy = false;

  function startSlideMedia() {
    document.querySelectorAll("video").forEach((video) => {
      video.muted = true;
      video.playsInline = true;
      video.setAttribute("playsinline", "");
      video.setAttribute("webkit-playsinline", "");
      const play = video.play && video.play();
      if (play && play.catch) play.catch(() => video.setAttribute("data-playback", "blocked"));
    });
  }

  const draw = () => {
    const slides = visibleSlides();
    if (!slides.length) {
      stage.innerHTML = `<section class="slide"><h1>No visible slides</h1></section>`;
      return;
    }
    if (activeSlide >= slides.length) activeSlide = 0;
    const slide = slides[activeSlide];
    stage.innerHTML = renderSlide(slide);
    startSlideMedia();
    clearTimeout(screenTimer);
    screenTimer = setTimeout(() => {
      activeSlide = (activeSlide + 1) % slides.length;
      draw();
    }, Number(slide.duration || board.settings.defaultDuration || 10000));
  };

  draw();
  setInterval(async () => {
    if (refreshBusy) return;
    refreshBusy = true;
    const currentSlides = visibleSlides();
    const previousId = currentSlides[activeSlide] && currentSlides[activeSlide].id;
    await loadBoard().catch(() => null);
    const nextIndex = visibleSlides().findIndex((slide) => slide.id === previousId);
    activeSlide = Math.max(0, nextIndex);
    refreshBusy = false;
  }, Number(board.settings.refreshSeconds || 12) * 1000);

  document.addEventListener("visibilitychange", () => {
    if (!document.hidden) {
      loadBoard().then(draw).catch(() => draw());
    }
  });

  window.addEventListener("error", () => {
    clearTimeout(screenTimer);
    screenTimer = setTimeout(() => window.location.reload(), 5000);
  });

  setTimeout(() => window.location.reload(), 6 * 60 * 60 * 1000);
}

function shell(title, action = "") {
  return `
    <header class="app-header">
      <a class="brand" href="/admin"><img src="${escapeHtml(board.brand.logo)}" alt="ESKA"><span>${escapeHtml(title)}</span></a>
      <nav>
        <a href="/admin">Admin</a>
        <a href="/templates">Templates</a>
        <a href="/export">Export USB</a>
        <a href="/screen" target="_blank">TV Screen</a>
      </nav>
      ${action}
    </header>
  `;
}

function renderAdmin() {
  const current = board.slides.find((slide) => slide.id === draftSlideId) || board.slides[0];
  draftSlideId = current && current.id;
  app.innerHTML = `
    ${shell("ESKA Noticeboard Admin", `<a class="secondary" href="/export">Export for USB</a><button class="primary" id="saveBoard">Save Live Screen</button>`)}
    <main class="admin-layout">
      <aside class="slide-list">
        <button class="primary wide" id="addSlide">Add Slide</button>
        ${board.slides.map((slide, index) => `
          <button class="slide-list-item ${slide.id === draftSlideId ? "active" : ""}" data-id="${escapeHtml(slide.id)}">
            <span>${index + 1}. ${escapeHtml(field(slide, "heading", slide.template))}</span>
            <small>${escapeHtml(slide.template)} / ${escapeHtml(slide.animation || "fade-up")}</small>
          </button>
        `).join("")}
      </aside>
      <section class="editor">
        <div class="preview-wrap">${current ? renderSlide(current, true) : ""}</div>
        ${current ? editorForm(current) : ""}
      </section>
    </main>
    <div class="status" id="status"></div>
  `;

  document.querySelector("#saveBoard").addEventListener("click", () => saveBoard().catch((error) => showStatus(error.message, true)));
  document.querySelector("#addSlide").addEventListener("click", () => {
    const slide = createSlideFromTemplate("notice");
    board.slides.push(slide);
    draftSlideId = slide.id;
    renderAdmin();
  });
  document.querySelectorAll(".slide-list-item").forEach((button) => {
    button.addEventListener("click", () => {
      draftSlideId = button.dataset.id;
      renderAdmin();
    });
  });
  bindEditor(current);
}

function editorForm(slide) {
  const options = templates.map((item) => `<option value="${item.id}" ${slide.template === item.id ? "selected" : ""}>${item.name}</option>`).join("");
  const animOptions = animations.map(([id, label]) => `<option value="${id}" ${slide.animation === id ? "selected" : ""}>${label}</option>`).join("");
  const fields = ["eyebrow", "heading", "subheading", "body", "date", "time", "location", "cta", "image", "imageLeft", "imageRight", "video", "logo", "background", "accent", "textColor", "panelColor"];
  return `
    <form class="edit-form">
      <div class="form-grid">
        <label>Template<select data-key="template">${options}</select></label>
        <label>Animation<select data-key="animation">${animOptions}</select></label>
        <label>Duration ms<input data-key="duration" type="number" min="4000" step="500" value="${Number(slide.duration || 10000)}"></label>
        <label class="check-row"><input data-key="visible" type="checkbox" ${slide.visible !== false ? "checked" : ""}> Show on TV</label>
      </div>
      <div class="form-grid two">
        ${fields.map((key) => `
          <label class="${key === "body" ? "span-two" : ""}">${labelFor(key)}
            ${key === "body" ? `<textarea data-field="${key}" rows="4">${escapeHtml(field(slide, key))}</textarea>` : `<input data-field="${key}" value="${escapeHtml(field(slide, key))}">`}
          </label>
        `).join("")}
      </div>
      <div class="upload-row">
        <label>Upload image/video<input id="mediaUpload" type="file" accept="image/*,video/mp4,video/quicktime"><small>For Apple TV, use MP4 video where possible.</small></label>
        <button class="secondary" id="applyToImage" type="button">Use upload as image</button>
        <button class="secondary" id="applyToLeftImage" type="button">Use as left split image</button>
        <button class="secondary" id="applyToRightImage" type="button">Use as right split image</button>
        <button class="secondary" id="applyToLogo" type="button">Use as slide logo</button>
        <button class="secondary" id="applyToBackground" type="button">Use as background</button>
        <button class="secondary" id="applyToVideo" type="button">Use upload as video</button>
        <button class="danger" id="deleteSlide" type="button">Delete slide</button>
      </div>
    </form>
  `;
}

function labelFor(key) {
  return ({
    eyebrow: "Small label",
    heading: "Heading",
    subheading: "Subheading",
    body: "Body text",
    date: "Date",
    time: "Time",
    location: "Location",
    cta: "Call to action",
    image: "Image URL/path",
    imageLeft: "Left split image",
    imageRight: "Right split image",
    video: "Video URL/path",
    logo: "Slide logo",
    background: "Background colour/image",
    accent: "Accent colour",
    textColor: "Text colour",
    panelColor: "Panel colour"
  })[key] || key;
}

function bindEditor(slide) {
  if (!slide) return;
  document.querySelectorAll("[data-field]").forEach((input) => {
    input.addEventListener("input", () => {
      slide.fields[input.dataset.field] = input.value;
      const preview = document.querySelector(".preview-wrap");
      if (preview) preview.innerHTML = renderSlide(slide, true);
    });
  });
  document.querySelectorAll("[data-key]").forEach((input) => {
    input.addEventListener("change", () => {
      if (input.dataset.key === "visible") slide.visible = input.checked;
      else if (input.dataset.key === "duration") slide.duration = Number(input.value);
      else slide[input.dataset.key] = input.value;
      renderAdmin();
    });
  });
  document.querySelector("#deleteSlide").addEventListener("click", () => {
    if (board.slides.length <= 1) return showStatus("Keep at least one slide.", true);
    board.slides = board.slides.filter((item) => item.id !== slide.id);
    draftSlideId = board.slides[0].id;
    renderAdmin();
  });
  document.querySelector("#applyToImage").addEventListener("click", () => uploadInto(slide, "image"));
  document.querySelector("#applyToLeftImage").addEventListener("click", () => uploadInto(slide, "imageLeft"));
  document.querySelector("#applyToRightImage").addEventListener("click", () => uploadInto(slide, "imageRight"));
  document.querySelector("#applyToLogo").addEventListener("click", () => uploadInto(slide, "logo"));
  document.querySelector("#applyToBackground").addEventListener("click", () => uploadInto(slide, "background"));
  document.querySelector("#applyToVideo").addEventListener("click", () => uploadInto(slide, "video"));
}

async function uploadInto(slide, target) {
  const file = document.querySelector("#mediaUpload").files[0];
  if (!file) return showStatus("Choose a file first.", true);
  const dataUrl = await fileToDataUrl(file);
  const saved = await api("/api/media", {
    method: "POST",
    body: JSON.stringify({ filename: file.name, dataUrl })
  });
  slide.fields[target] = saved.url;
  showStatus(`Uploaded and set as ${target}.`);
  renderAdmin();
}

function fileToDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

function createSlideFromTemplate(templateId) {
  const template = templates.find((item) => item.id === templateId) || templates[0];
  return {
    id: uid(),
    template: template.id,
    animation: template.id === "course" ? "split-reveal" : "fade-up",
    duration: 15000,
    visible: false,
    fields: {
      eyebrow: template.category,
      heading: template.name,
      subheading: "Edit this subtitle",
      body: template.description,
      date: template.id === "dates" ? "Sat 18 Jul | Summer Seminar | Main Dojo" : "",
      time: template.id === "dates" ? "Mon 27 Jul | Grading Week | During normal classes" : "",
      location: template.id === "dates" ? "Sun 2 Aug | Open Training | Ask reception" : "",
      cta: "Add action",
      image: "/assets/eska-logo-exact.svg",
      imageLeft: "",
      imageRight: "",
      video: ""
    }
  };
}

async function templatesView() {
  await loadBoard();
  app.innerHTML = `
    ${shell("ESKA Template Library")}
    <main class="template-page">
      <section class="template-grid">
        ${templates.map((template) => `
          <article class="template-card">
            <span>${escapeHtml(template.category)}</span>
            <h2>${escapeHtml(template.name)}</h2>
            <p>${escapeHtml(template.description)}</p>
            <button class="primary" data-template="${escapeHtml(template.id)}">Create slide from template</button>
          </article>
        `).join("")}
      </section>
    </main>
    <div class="status" id="status"></div>
  `;
  document.querySelectorAll("[data-template]").forEach((button) => {
    button.addEventListener("click", async () => {
      const slide = createSlideFromTemplate(button.dataset.template);
      board.slides.push(slide);
      draftSlideId = slide.id;
      await saveBoard().catch((error) => showStatus(error.message, true));
      history.pushState(null, "", "/admin");
      renderAdmin();
    });
  });
}

function formatDuration(ms) {
  const totalSeconds = Math.max(1, Math.ceil(ms / 1000));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${String(seconds).padStart(2, "0")}`;
}

function exportStats() {
  const slides = visibleSlides();
  const total = slides.reduce((sum, slide) => sum + Number(slide.duration || board.settings.defaultDuration || 10000), 0);
  return { slides, total };
}

async function exportView() {
  await loadBoard();
  const { slides, total } = exportStats();
  const recordFor = total + 3000;
  app.innerHTML = `
    ${shell("Export TV Video for USB", `<a class="primary" href="/screen" target="_blank">Open TV Screen</a>`)}
    <main class="export-page">
      <section class="export-hero">
        <p class="eyebrow">USB memory stick workflow</p>
        <h1>Make the MP4 for the TV</h1>
        <p>This page helps you turn the animated web noticeboard into one video file for the memory stick. The TV plays the video, not the website.</p>
      </section>

      <section class="export-grid">
        <article class="export-card">
          <span>1</span>
          <h2>Check the loop length</h2>
          <p>${slides.length} visible slides. One full loop is about <strong>${formatDuration(total)}</strong>.</p>
          <p>Record for at least <strong>${formatDuration(recordFor)}</strong> so the final slide is not cut short.</p>
        </article>
        <article class="export-card">
          <span>2</span>
          <h2>Open the TV screen</h2>
          <p>Open the screen view, then press <strong>F11</strong> so it fills your computer screen.</p>
          <a class="primary" href="/screen?usb-export=1" target="_blank">Open TV Screen</a>
        </article>
        <article class="export-card">
          <span>3</span>
          <h2>Record as MP4</h2>
          <p>On Windows press <strong>Windows + Alt + R</strong> to start recording. Press it again after one full loop.</p>
          <p>The file usually saves in <strong>Videos &gt; Captures</strong>.</p>
        </article>
        <article class="export-card">
          <span>4</span>
          <h2>Put it on the stick</h2>
          <p>Rename the recording to <strong>ESKA_NOTICEBOARD.mp4</strong>, copy it to the USB stick, then set the TV to loop/repeat it.</p>
          <button class="secondary" id="copyFilename" type="button">Copy filename</button>
        </article>
      </section>

      <section class="export-warning">
        <h2>Why this does not save straight to USB</h2>
        <p>Browsers cannot safely write a finished video directly to a memory stick without asking you where to save it. Also, browser recording normally creates WebM, while most TVs are happiest with MP4. Windows Game Bar gives you the MP4 you need.</p>
      </section>
    </main>
    <div class="status" id="status"></div>
  `;

  document.querySelector("#copyFilename").addEventListener("click", async () => {
    await navigator.clipboard.writeText("ESKA_NOTICEBOARD.mp4").catch(() => null);
    showStatus("Copied filename: ESKA_NOTICEBOARD.mp4");
  });
}

function showStatus(message, isError = false) {
  const box = document.querySelector("#status");
  if (!box) return;
  box.textContent = message;
  box.className = `status show${isError ? " error" : ""}`;
  clearTimeout(statusTimer);
  statusTimer = setTimeout(() => box.className = "status", 3500);
}

async function adminView() {
  await loadBoard();
  draftSlideId = board.slides[0] && board.slides[0].id;
  renderAdmin();
}

async function boot() {
  try {
    if (route() === "/screen" || route() === "/") await screenView();
    else if (route() === "/templates") await templatesView();
    else if (route() === "/export") await exportView();
    else await adminView();
  } catch (error) {
    app.innerHTML = `<main class="error-page"><h1>Something needs attention</h1><p>${escapeHtml(error.message)}</p></main>`;
  }
}

boot();
