(function () {
  function ensureCafeTemplate() {
    if (!templates.some((item) => item.id === "menu")) {
      templates.push({
        id: "menu",
        name: "Cafe Menu",
        category: "Cafe",
        description: "Menu board with picture, item prices, and descriptions."
      });
    }
  }

  function backupToBrowser() {
    if (!board) return;
    try {
      localStorage.setItem("eskaNoticeboardBackup", JSON.stringify({
        savedAt: new Date().toISOString(),
        board
      }));
    } catch (_) {}
  }

  const nativeFetch = window.fetch.bind(window);
  window.fetch = async function fetchWithNoticeboardBackup(input, options = {}) {
    const response = await nativeFetch(input, options);
    try {
      const url = typeof input === "string" ? input : input && input.url;
      const method = String(options.method || (input && input.method) || "GET").toUpperCase();
      if (response.ok && method === "PUT" && String(url || "").includes("/api/noticeboard")) {
        setTimeout(backupToBrowser, 0);
      }
    } catch (_) {}
    return response;
  };

  async function restoreFromBrowserBackup() {
    const raw = localStorage.getItem("eskaNoticeboardBackup");
    if (!raw) return showStatus("No browser backup found on this computer.", true);
    const backup = JSON.parse(raw);
    if (!backup || !backup.board || !Array.isArray(backup.board.slides)) {
      return showStatus("Browser backup is not valid.", true);
    }
    if (!window.confirm(`Restore browser backup from ${backup.savedAt || "unknown time"}?`)) return;
    board = backup.board;
    await api("/api/noticeboard", { method: "PUT", body: JSON.stringify(board) });
    draftSlideId = board.slides[0] && board.slides[0].id;
    showStatus("Restored browser backup.");
    renderAdmin();
  }

  ensureCafeTemplate();

  const baseRenderSlide = renderSlide;
  window.renderSlide = function renderSlideWithCafe(slide, preview = false) {
    if (!slide || slide.template !== "menu") return baseRenderSlide(slide, preview);
    const animation = slide.animation || "stagger";
    const shellClass = `slide slide-menu anim-${animation}${preview ? " preview-slide" : ""}`;
    const image = field(slide, "image", board.brand.logo);
    const imageLeft = field(slide, "imageLeft", image);
    const imageRight = field(slide, "imageRight", image);
    const items = field(slide, "menuItems", "")
      .split(/\r?\n/)
      .map((item) => item.trim())
      .filter(Boolean)
      .map((item) => item.split("|").map((part) => part.trim()));
    const photoNotes = field(slide, "photoNotes", "")
      .split(/\r?\n/)
      .map((item) => item.trim())
      .filter(Boolean)
      .map((item) => item.split("|").map((part) => part.trim()));
    const image4 = field(slide, "image4", "/assets/dojo-class.svg");
    const image5 = field(slide, "image5", "/assets/students-group.svg");
    const image6 = field(slide, "image6", "/assets/training.svg");
    const photoInfo = (index, fallbackTitle, fallbackDetail, fallbackPrice = "") => {
      const parts = photoNotes[index] || [];
      const title = parts[0] || fallbackTitle;
      const hasPrice = parts.length >= 3;
      const secondLooksLikePrice = /(^| )(£|gbp|from|\d+([.,]\d{2})?)( |$)/i.test(parts[1] || "");
      const price = hasPrice || secondLooksLikePrice ? parts[1] : fallbackPrice;
      const detail = hasPrice ? parts[2] : (secondLooksLikePrice ? fallbackDetail : (parts[1] || fallbackDetail));
      return [title, price, detail];
    };
    const photos = [
      [image, ...photoInfo(0, "Fresh drinks", "Tea, coffee and hot chocolate for the training break.", "From GBP 1.50")],
      [imageLeft, ...photoInfo(1, "Quick snacks", "Simple choices before or after class.", "From GBP 1.20")],
      [imageRight, ...photoInfo(2, "Family friendly", "Refreshments for parents, students and visitors.", "Ask at reception")],
      [image4, ...photoInfo(3, "Cold drinks", "Easy refreshments while you wait.", "From GBP 1.00")],
      [image5, ...photoInfo(4, "After class", "Grab something before heading home.", "From GBP 2.00")],
      [image6, ...photoInfo(5, "Cafe favourites", "Ask at reception for today's options.", "Today's price")]
    ];
    const cafeMedia = (src, title, index) => {
      const value = String(src || "");
      const isDefaultArt = !value || /\/assets\/(dojo-class|students-group|training|instructors)\.svg$/i.test(value);
      if (!isDefaultArt) return mediaTag(value, title);
      return `
        <div class="cafe-photo-placeholder">
          <span>Photo ${index + 1}</span>
          <strong>Add cafe image</strong>
        </div>
      `;
    };
    const content = `
      <div class="cafe-layout">
        <div class="menu-gallery">
          ${photos.map(([src, title, price, detail], index) => `
            <article class="menu-photo-card">
              <div class="menu-photo">${cafeMedia(src, title, index)}</div>
              <div class="menu-photo-copy">
                <strong>${escapeHtml(title)}</strong>
                ${price ? `<em>${escapeHtml(price)}</em>` : ""}
                <span>${escapeHtml(detail)}</span>
              </div>
            </article>
          `).join("")}
        </div>
        <div class="menu-board">
          <div class="cafe-intro">
            <p class="eyebrow">${escapeHtml(field(slide, "eyebrow", "Dojo cafe"))}</p>
            <h1>${escapeHtml(field(slide, "heading", "Cafe Menu"))}</h1>
            <h2>${escapeHtml(field(slide, "subheading", "Refreshments for students and families"))}</h2>
            <p class="body-copy">${escapeHtml(field(slide, "body", ""))}</p>
            ${field(slide, "cta") ? `<div class="cta">${escapeHtml(field(slide, "cta"))}</div>` : ""}
          </div>
          <div class="menu-items">
            ${items.map(([name = "Menu item", price = "GBP 0.00", detail = "Description"]) => `
              <article>
                <div><strong>${escapeHtml(name)}</strong><small>${escapeHtml(detail)}</small></div>
                <span>${escapeHtml(price)}</span>
              </article>
            `).join("")}
          </div>
        </div>
      </div>
    `;
    return `<section class="${shellClass}" data-slide-id="${escapeHtml(slide.id)}"${slideStyle(slide)}>${brandHeader(slide)}${content}</section>`;
  };
  renderSlide = window.renderSlide;

  const baseScreenView = screenView;
  window.screenView = async function screenViewWithCafeDefaults() {
    await loadBoard();
    const cafe = (board.slides || []).find((slide) => slide.template === "menu");
    if (cafe && cafe.fields) {
      cafe.fields.photoNotes = cafe.fields.photoNotes || "Fresh drinks | From GBP 1.50 | Tea, coffee and hot chocolate for the training break\nQuick snacks | From GBP 1.20 | Simple choices before or after class\nFamily friendly | Ask at reception | Refreshments for parents, students and visitors\nCold drinks | From GBP 1.00 | Easy refreshments while you wait\nAfter class | From GBP 2.00 | Grab something before heading home\nCafe favourites | Today's price | Ask at reception for today's options";
      cafe.fields.imageLeft = cafe.fields.imageLeft || "/assets/students-group.svg";
      cafe.fields.imageRight = cafe.fields.imageRight || "/assets/training.svg";
      cafe.fields.image4 = cafe.fields.image4 || "/assets/dojo-class.svg";
      cafe.fields.image5 = cafe.fields.image5 || "/assets/students-group.svg";
      cafe.fields.image6 = cafe.fields.image6 || "/assets/training.svg";
    }
    activeSlide = 0;
    const recordingMode = isUsbExport();
    app.innerHTML = `<main class="screen-shell${recordingMode ? " usb-recording-mode" : ""}"><div id="screenStage"></div></main>`;
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
  };
  screenView = window.screenView;

  const baseAdminView = adminView;
  window.adminView = async function adminViewWithCafeDefaults() {
    await loadBoard();
    const cafe = (board.slides || []).find((slide) => slide.template === "menu");
    if (cafe && cafe.fields) {
      cafe.fields.photoNotes = cafe.fields.photoNotes || "Fresh drinks | From GBP 1.50 | Tea, coffee and hot chocolate for the training break\nQuick snacks | From GBP 1.20 | Simple choices before or after class\nFamily friendly | Ask at reception | Refreshments for parents, students and visitors\nCold drinks | From GBP 1.00 | Easy refreshments while you wait\nAfter class | From GBP 2.00 | Grab something before heading home\nCafe favourites | Today's price | Ask at reception for today's options";
      cafe.fields.imageLeft = cafe.fields.imageLeft || "/assets/students-group.svg";
      cafe.fields.imageRight = cafe.fields.imageRight || "/assets/training.svg";
      cafe.fields.image4 = cafe.fields.image4 || "/assets/dojo-class.svg";
      cafe.fields.image5 = cafe.fields.image5 || "/assets/students-group.svg";
      cafe.fields.image6 = cafe.fields.image6 || "/assets/training.svg";
    }
    draftSlideId = board.slides[0] && board.slides[0].id;
    renderAdmin();
  };
  adminView = window.adminView;

  const baseBoot = boot;
  window.boot = async function bootWithCafeOverrides() {
    try {
      if (route() === "/screen" || route() === "/") await screenView();
      else if (route() === "/templates") await templatesView();
      else if (route() === "/export") await exportView();
      else await adminView();
    } catch (error) {
      app.innerHTML = `<main class="error-page"><h1>Something needs attention</h1><p>${escapeHtml(error.message)}</p></main>`;
    }
  };

  const baseLabelFor = labelFor;
  window.labelFor = function labelForWithCafe(key) {
    if (key === "menuItems") return "Cafe menu, one per line: item | price | description";
    if (key === "photoNotes") return "Photo boxes, one per line: heading | price | description";
    if (key === "image") return "Cafe photo 1";
    if (key === "imageLeft") return "Cafe photo 2";
    if (key === "imageRight") return "Cafe photo 3";
    if (key === "image4") return "Cafe photo 4";
    if (key === "image5") return "Cafe photo 5";
    if (key === "image6") return "Cafe photo 6";
    if (key === "textX") return "Text horizontal position, e.g. -40 or 5%";
    if (key === "textY") return "Text vertical position, e.g. 30 or -5%";
    if (key === "textWidth") return "Text box width, e.g. 720 or 45%";
    if (key === "headingSize") return "Heading size, e.g. 72";
    if (key === "subheadingSize") return "Subheading size, e.g. 34";
    if (key === "bodySize") return "Body text size, e.g. 24";
    return baseLabelFor(key);
  };
  labelFor = window.labelFor;

  const baseEditorForm = editorForm;
  window.editorForm = function editorFormWithCafe(slide) {
    if (!slide || slide.template !== "menu") return baseEditorForm(slide);
    const options = templates.map((item) => `<option value="${item.id}" ${slide.template === item.id ? "selected" : ""}>${item.name}</option>`).join("");
    const animOptions = animations.map(([id, label]) => `<option value="${id}" ${slide.animation === id ? "selected" : ""}>${label}</option>`).join("");
    const fields = ["eyebrow", "heading", "subheading", "body", "photoNotes", "menuItems", "cta", "image", "imageLeft", "imageRight", "image4", "image5", "image6", "logo", "background", "accent", "textColor", "panelColor", "textX", "textY", "textWidth", "headingSize", "subheadingSize", "bodySize"];
    return `
      <form class="edit-form">
        <section class="quick-text-editor" aria-label="Quick text editor">
          <div class="quick-text-editor-head">
            <strong>Quick Text Editor</strong>
            <span>Type here. The slide updates and saves automatically.</span>
          </div>
          <div class="quick-text-grid">
            <label>Small label<input data-field="eyebrow" value="${escapeHtml(field(slide, "eyebrow"))}"></label>
            <label>Heading<input data-field="heading" value="${escapeHtml(field(slide, "heading"))}"></label>
            <label>Subheading<input data-field="subheading" value="${escapeHtml(field(slide, "subheading"))}"></label>
            <label>Call to action<input data-field="cta" value="${escapeHtml(field(slide, "cta"))}"></label>
            <label class="span-two">Body text<textarea data-field="body" rows="3">${escapeHtml(field(slide, "body"))}</textarea></label>
            <label class="span-two">Photo boxes<textarea data-field="photoNotes" rows="4">${escapeHtml(field(slide, "photoNotes"))}</textarea></label>
            <label class="span-two">Menu items<textarea data-field="menuItems" rows="4">${escapeHtml(field(slide, "menuItems"))}</textarea></label>
          </div>
        </section>
        <div class="form-grid">
          <label>Template<select data-key="template">${options}</select></label>
          <label>Animation<select data-key="animation">${animOptions}</select></label>
          <label>Duration ms<input data-key="duration" type="number" min="4000" step="500" value="${Number(slide.duration || 17000)}"></label>
          <label class="check-row"><input data-key="visible" type="checkbox" ${slide.visible !== false ? "checked" : ""}> Show on TV</label>
        </div>
        <div class="form-grid two">
          ${fields.map((key) => `
            <label class="${key === "body" || key === "menuItems" || key === "photoNotes" ? "span-two" : ""}">${labelFor(key)}
              ${key === "body" || key === "menuItems" || key === "photoNotes" ? `<textarea data-field="${key}" rows="${key === "menuItems" ? "7" : "4"}">${escapeHtml(field(slide, key))}</textarea>` : `<input data-field="${key}" value="${escapeHtml(field(slide, key))}">`}
            </label>
          `).join("")}
        </div>
        <div class="upload-row">
          <label>Upload image/video<input id="mediaUpload" type="file" accept="image/*,video/mp4,video/quicktime"><small>For Apple TV, use MP4 video where possible.</small></label>
          <button class="secondary" id="applyToImage" data-upload-target="image" type="button">Use as photo 1</button>
          <button class="secondary" id="applyToLeftImage" data-upload-target="imageLeft" type="button">Use as photo 2</button>
          <button class="secondary" id="applyToRightImage" data-upload-target="imageRight" type="button">Use as photo 3</button>
          <button class="secondary" id="applyToImage4" data-upload-target="image4" type="button">Use as photo 4</button>
          <button class="secondary" id="applyToImage5" data-upload-target="image5" type="button">Use as photo 5</button>
          <button class="secondary" id="applyToImage6" data-upload-target="image6" type="button">Use as photo 6</button>
          <button class="secondary" id="applyToLogo" data-upload-target="logo" type="button">Use as slide logo</button>
          <button class="secondary" id="applyToBackground" data-upload-target="background" type="button">Use as background</button>
          <button class="secondary" id="applyToVideo" data-upload-target="video" type="button">Use upload as video</button>
          <button class="danger" id="deleteSlide" type="button">Delete slide</button>
        </div>
      </form>
    `;
  };
  editorForm = window.editorForm;

  const baseCreateSlideFromTemplate = createSlideFromTemplate;
  window.createSlideFromTemplate = function createSlideFromTemplateWithCafe(templateId) {
    if (templateId !== "menu") return baseCreateSlideFromTemplate(templateId);
    return {
      id: uid(),
      template: "menu",
      animation: "stagger",
      duration: 17000,
      visible: false,
      fields: {
        eyebrow: "Dojo cafe",
        heading: "Cafe Menu",
        subheading: "Refreshments for students and families",
        body: "Grab a drink or snack before class, after training, or while you wait.",
        photoNotes: "Fresh drinks | From GBP 1.50 | Tea, coffee and hot chocolate for the training break\nQuick snacks | From GBP 1.20 | Simple choices before or after class\nFamily friendly | Ask at reception | Refreshments for parents, students and visitors\nCold drinks | From GBP 1.00 | Easy refreshments while you wait\nAfter class | From GBP 2.00 | Grab something before heading home\nCafe favourites | Today's price | Ask at reception for today's options",
        menuItems: "Tea | GBP 1.50 | Freshly brewed cup\nCoffee | GBP 2.00 | Americano or white coffee\nHot chocolate | GBP 2.20 | Warm and sweet\nWater | GBP 1.00 | Still bottled water\nSnack bar | GBP 1.20 | Quick pre-class snack",
        cta: "Ask at reception",
        image: "/assets/dojo-class.svg",
        imageLeft: "/assets/students-group.svg",
        imageRight: "/assets/training.svg",
        image4: "/assets/dojo-class.svg",
        image5: "/assets/students-group.svg",
        image6: "/assets/training.svg",
        logo: "/assets/eska-logo-exact.svg",
        background: "linear-gradient(135deg, #ffffff 0%, #fff7f3 100%)",
        accent: "#e61f2a",
        panelColor: "rgba(255, 255, 255, 0.96)"
      }
    };
  };
  createSlideFromTemplate = window.createSlideFromTemplate;

  const baseBindEditor = bindEditor;
  window.bindEditor = function bindEditorWithCafePhotos(slide) {
    baseBindEditor(slide);
    if (!slide || slide.template !== "menu") return;
    const bindPhotoButton = (id, target) => {
      const button = document.querySelector(id);
      if (!button || button.dataset.pictureUploadBound === "1") return;
      button.dataset.pictureUploadBound = "1";
      button.addEventListener("click", () => uploadInto(slide, target));
    };
    bindPhotoButton("#applyToImage4", "image4");
    bindPhotoButton("#applyToImage5", "image5");
    bindPhotoButton("#applyToImage6", "image6");
  };
  bindEditor = window.bindEditor;

  const baseSaveBoard = saveBoard;
  window.saveBoard = async function saveBoardWithBackup() {
    await baseSaveBoard();
    backupToBrowser();
  };
  saveBoard = window.saveBoard;

  const baseRenderAdmin = renderAdmin;
  window.renderAdmin = function renderAdminWithBackup() {
    baseRenderAdmin();
    const header = document.querySelector(".app-header");
    if (!header || document.querySelector("#restoreBrowserBackup")) return;
    const actions = document.createElement("div");
    actions.className = "backup-actions";
    actions.innerHTML = `<a class="secondary" href="/api/backup" target="_blank">Download Backup</a><button class="secondary" id="restoreBrowserBackup" type="button">Restore Browser Backup</button>`;
    header.appendChild(actions);
    document.querySelector("#restoreBrowserBackup").addEventListener("click", () => {
      restoreFromBrowserBackup().catch((error) => showStatus(error.message, true));
    });
  };
  renderAdmin = window.renderAdmin;

  /*
    The original app has already booted before this extension loads. Re-run the active
    view so the cafe renderer and defaults are used immediately after cache refresh.
  */
  if (route() === "/admin") {
    window.boot().catch(() => null);
  }
})();
