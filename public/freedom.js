(function () {
  let autoSaveTimer = null;
  let autoSaveBusy = false;
  let autoSaveQueued = false;

  function setAutosaveStatus(message, isError = false) {
    const box = document.querySelector("#status");
    if (!box) return;
    box.textContent = message;
    box.className = `status show${isError ? " error" : ""}`;
  }

  function backupToBrowser() {
    if (!board) return;
    try {
      localStorage.setItem("eskaNoticeboardBackup", JSON.stringify({
        savedAt: new Date().toISOString(),
        board
      }));
    } catch (_) {
      // Browser storage may be full or disabled; server save still continues.
    }
  }

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

  async function flushAutosave() {
    if (!board || route() === "/screen" || route() === "/") return;
    if (autoSaveBusy) {
      autoSaveQueued = true;
      return;
    }
    autoSaveBusy = true;
    autoSaveQueued = false;
    setAutosaveStatus("Saving changes...");
    try {
      await api("/api/noticeboard", { method: "PUT", body: JSON.stringify(board) });
      backupToBrowser();
      setAutosaveStatus("Saved automatically.");
      clearTimeout(statusTimer);
      statusTimer = setTimeout(() => {
        const box = document.querySelector("#status");
        if (box) box.className = "status";
      }, 2200);
    } catch (error) {
      setAutosaveStatus(error.message || "Autosave failed.", true);
    } finally {
      autoSaveBusy = false;
      if (autoSaveQueued) scheduleAutosave(200);
    }
  }

  function scheduleAutosave(delay = 700) {
    clearTimeout(autoSaveTimer);
    autoSaveTimer = setTimeout(flushAutosave, delay);
  }

  window.addEventListener("beforeunload", () => {
    if (autoSaveTimer) flushAutosave();
  });

  if (!templates.some((item) => item.id === "pt")) {
    templates.push({
      id: "pt",
      name: "PT Feature",
      category: "Private lessons",
      description: "Photo starts centre, then slides aside to reveal PT text."
    });
  }

  if (!templates.some((item) => item.id === "menu")) {
    templates.push({
      id: "menu",
      name: "Cafe Menu",
      category: "Cafe",
      description: "Menu board with picture, item prices, and descriptions."
    });
  }

  if (!animations.some(([id]) => id === "centre-side")) {
    animations.push(["centre-side", "Centre image to side"]);
  }

  function cssValue(value = "") {
    return String(value).replace(/[;"<>]/g, "").trim();
  }

  function imageCss(value = "") {
    return String(value).replace(/[\\'"<>]/g, "").trim();
  }

  function cssLength(value = "") {
    const clean = cssValue(value);
    if (!clean) return "";
    if (/^-?\d+(\.\d+)?$/.test(clean)) return `${clean}px`;
    if (/^-?\d+(\.\d+)?(px|rem|em|%|vw|vh)$/i.test(clean)) return clean;
    if (/^clamp\(/i.test(clean)) return clean;
    return "";
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

  window.brandHeader = function brandHeader(slide) {
    const logo = field(slide, "logo", board.brand.logo);
    return `<img class="corner-logo" src="${escapeHtml(logo)}" alt="ESKA logo">`;
  };

  window.slideStyle = function slideStyle(slide) {
    const styles = [];
    const background = field(slide, "background");
    const accent = field(slide, "accent");
    const textColor = field(slide, "textColor");
    const panelColor = field(slide, "panelColor");
    const textX = cssLength(field(slide, "textX"));
    const textY = cssLength(field(slide, "textY"));
    const textWidth = cssLength(field(slide, "textWidth"));
    const headingSize = cssLength(field(slide, "headingSize"));
    const subheadingSize = cssLength(field(slide, "subheadingSize"));
    const bodySize = cssLength(field(slide, "bodySize"));

    if (background) {
      const clean = cssValue(background);
      if (/^#|^rgb|^hsl|^linear-gradient|^radial-gradient/i.test(clean)) styles.push(`--slide-bg: ${clean}`);
      else styles.push(`--slide-bg-image: url('${imageCss(clean)}')`);
    }
    if (accent) styles.push(`--slide-accent: ${cssValue(accent)}`);
    if (textColor) styles.push(`--slide-text: ${cssValue(textColor)}`);
    if (panelColor) styles.push(`--panel-bg: ${cssValue(panelColor)}`);
    if (textX) styles.push(`--text-x: ${textX}`);
    if (textY) styles.push(`--text-y: ${textY}`);
    if (textWidth) styles.push(`--text-width: ${textWidth}`);
    if (headingSize) styles.push(`--heading-size: ${headingSize}`);
    if (subheadingSize) styles.push(`--subheading-size: ${subheadingSize}`);
    if (bodySize) styles.push(`--body-size: ${bodySize}`);

    return styles.length ? ` style="${escapeHtml(styles.join("; "))}"` : "";
  };

  window.renderSlide = function renderSlide(slide, preview = false) {
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
      content = `<div class="notice-orb">${mediaTag(field(slide, "logo", board.brand.logo), "ESKA")}</div>${copyBlock(slide)}`;
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
    } else if (slide.template === "pt") {
      content = `
        <div class="pt-reveal">
          <div class="pt-photo">${mediaTag(image, field(slide, "heading"))}</div>
          ${copyBlock(slide)}
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
    } else if (slide.template === "menu") {
      const items = field(slide, "menuItems", "")
        .split(/\r?\n/)
        .map((item) => item.trim())
        .filter(Boolean)
        .map((item) => item.split("|").map((part) => part.trim()));
      content = `
        <div class="menu-photo">${mediaTag(image, field(slide, "heading"))}</div>
        <div class="menu-board">
          ${copyBlock(slide)}
          <div class="menu-items">
            ${items.map(([name = "Menu item", price = "GBP 0.00", detail = "Description"]) => `
              <article>
                <div><strong>${escapeHtml(name)}</strong><small>${escapeHtml(detail)}</small></div>
                <span>${escapeHtml(price)}</span>
              </article>
            `).join("")}
          </div>
        </div>
      `;
    } else if (slide.template === "gallery") {
      content = `<div class="gallery-photo">${mediaTag(image, field(slide, "heading"))}</div>${copyBlock(slide)}`;
    } else {
      content = copyBlock(slide);
    }

    return `<section class="${shellClass}" data-slide-id="${escapeHtml(slide.id)}"${slideStyle(slide)}>${brandHeader(slide)}${content}</section>`;
  };

  window.editorForm = function editorForm(slide) {
    const options = templates.map((item) => `<option value="${item.id}" ${slide.template === item.id ? "selected" : ""}>${item.name}</option>`).join("");
    const animOptions = animations.map(([id, label]) => `<option value="${id}" ${slide.animation === id ? "selected" : ""}>${label}</option>`).join("");
    const fields = ["eyebrow", "heading", "subheading", "body", "dateList", "menuItems", "date", "time", "location", "cta", "image", "imageLeft", "imageRight", "image4", "image5", "image6", "video", "logo", "background", "accent", "textColor", "panelColor", "textX", "textY", "textWidth", "headingSize", "subheadingSize", "bodySize"];
    const splitUploadControls = slide.template === "course" ? `
        <section class="split-upload-panel" aria-label="Split reveal photo controls">
          <h3>Split reveal photos</h3>
          <p>Use these for the two photos that part to reveal the course text.</p>
          <div class="upload-row">
            <button class="secondary" data-upload-target="imageLeft" type="button">Use as split left photo</button>
            <button class="secondary" data-upload-target="imageRight" type="button">Use as split right photo</button>
          </div>
        </section>
    ` : "";
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
            <label class="span-two">Dates list / timetable<textarea data-field="dateList" rows="4">${escapeHtml(field(slide, "dateList"))}</textarea></label>
            <label class="span-two">Menu items<textarea data-field="menuItems" rows="4">${escapeHtml(field(slide, "menuItems"))}</textarea></label>
          </div>
        </section>
        <div class="form-grid">
          <label>Template<select data-key="template">${options}</select></label>
          <label>Animation<select data-key="animation">${animOptions}</select></label>
          <label>Duration ms<input data-key="duration" type="number" min="4000" step="500" value="${Number(slide.duration || 10000)}"></label>
          <label class="check-row"><input data-key="visible" type="checkbox" ${slide.visible !== false ? "checked" : ""}> Show on TV</label>
        </div>
        <div class="form-grid two">
          ${fields.map((key) => `
            <label class="${key === "body" ? "span-two" : ""}">${labelFor(key)}
              ${key === "body" || key === "dateList" || key === "menuItems" ? `<textarea data-field="${key}" rows="${key === "dateList" || key === "menuItems" ? "7" : "4"}">${escapeHtml(field(slide, key))}</textarea>` : `<input data-field="${key}" value="${escapeHtml(field(slide, key))}">`}
            </label>
          `).join("")}
        </div>
        ${splitUploadControls}
        <div class="upload-row">
          <label>Upload image/video<input id="mediaUpload" type="file" accept="image/*,video/mp4,video/quicktime"><small>For Apple TV, use MP4 video where possible.</small></label>
          <button class="secondary" id="applyToImage" data-upload-target="image" type="button">Use as picture 1</button>
          <button class="secondary" id="applyToLeftImage" data-upload-target="imageLeft" type="button">Use as picture 2</button>
          <button class="secondary" id="applyToRightImage" data-upload-target="imageRight" type="button">Use as picture 3</button>
          <button class="secondary" id="applyToImage4" data-upload-target="image4" type="button">Use as picture 4</button>
          <button class="secondary" id="applyToImage5" data-upload-target="image5" type="button">Use as picture 5</button>
          <button class="secondary" id="applyToImage6" data-upload-target="image6" type="button">Use as picture 6</button>
          <button class="secondary" id="applyToLogo" data-upload-target="logo" type="button">Use as slide logo</button>
          <button class="secondary" id="applyToBackground" data-upload-target="background" type="button">Use as background</button>
          <button class="secondary" id="applyToVideo" data-upload-target="video" type="button">Use upload as video</button>
          <button class="danger" id="deleteSlide" type="button">Delete slide</button>
        </div>
      </form>
    `;
  };

  const originalLabelFor = window.labelFor || labelFor;
  window.labelFor = function labelFor(key) {
    return ({
      imageLeft: "Left split image",
      imageRight: "Right split image",
      image4: "Picture 4",
      image5: "Picture 5",
      image6: "Picture 6",
      dateList: "Date list, one per line: date | title | details",
      menuItems: "Cafe menu, one per line: item | price | description",
      logo: "Slide logo",
      background: "Background colour/image",
      accent: "Accent colour",
      textColor: "Text colour",
      panelColor: "Panel colour",
      textX: "Text horizontal position, e.g. -40 or 5%",
      textY: "Text vertical position, e.g. 30 or -5%",
      textWidth: "Text box width, e.g. 720 or 45%",
      headingSize: "Heading size, e.g. 72",
      subheadingSize: "Subheading size, e.g. 34",
      bodySize: "Body text size, e.g. 24"
    })[key] || originalLabelFor(key);
  };

  window.bindEditor = function bindEditor(slide) {
    if (!slide) return;
    document.querySelectorAll("[data-field]").forEach((input) => {
      input.addEventListener("input", () => {
        slide.fields[input.dataset.field] = input.value;
        const preview = document.querySelector(".preview-wrap");
        if (preview) preview.innerHTML = renderSlide(slide, true);
        scheduleAutosave();
      });
    });
    document.querySelectorAll("[data-key]").forEach((input) => {
      input.addEventListener("change", () => {
        if (input.dataset.key === "visible") slide.visible = input.checked;
        else if (input.dataset.key === "duration") slide.duration = Number(input.value);
        else slide[input.dataset.key] = input.value;
        scheduleAutosave(250);
        renderAdmin();
      });
    });
    document.querySelector("#deleteSlide").addEventListener("click", () => {
      if (board.slides.length <= 1) return showStatus("Keep at least one slide.", true);
      board.slides = board.slides.filter((item) => item.id !== slide.id);
      draftSlideId = board.slides[0].id;
      scheduleAutosave(250);
      renderAdmin();
    });
    document.querySelectorAll("[data-upload-target]").forEach((button) => {
      if (button.dataset.pictureUploadBound === "1") return;
      button.dataset.pictureUploadBound = "1";
      button.addEventListener("click", () => uploadInto(slide, button.dataset.uploadTarget));
    });
  };

  async function uploadFileDirect(file) {
    const headers = {
      "content-type": file.type || "application/octet-stream",
      "x-file-name": file.name || "media"
    };
    if (adminPin()) headers["x-admin-pin"] = adminPin();

    let response = await fetch("/api/upload", {
      method: "POST",
      headers,
      body: file
    });

    if (response.status === 401) {
      const pin = window.prompt("Enter the ESKA admin PIN");
      if (pin) {
        localStorage.setItem("eskaAdminPin", pin);
        headers["x-admin-pin"] = pin;
        response = await fetch("/api/upload", {
          method: "POST",
          headers,
          body: file
        });
      }
    }

    if (!response.ok) {
      const detail = await response.json().catch(() => ({}));
      throw new Error(detail.error || `Upload failed: ${response.status}`);
    }

    return response.json();
  }

  window.uploadInto = async function uploadInto(slide, target) {
    const file = document.querySelector("#mediaUpload").files[0];
    if (!file) return showStatus("Choose a file first.", true);
    setAutosaveStatus(`Uploading ${file.name}...`);
    try {
      const saved = await uploadFileDirect(file);
      slide.fields[target] = saved.url;
      if (target === "imageRight") slide.fields.image2 = saved.url;
      const label = target === "imageLeft" ? "split left photo" : target === "imageRight" ? "split right photo" : target;
      showStatus(`Uploaded and set as ${label}.`);
      scheduleAutosave(100);
      renderAdmin();
    } catch (error) {
      showStatus(error.message || "Upload failed.", true);
    }
  };

  window.renderAdmin = function renderAdmin() {
    const current = board.slides.find((slide) => slide.id === draftSlideId) || board.slides[0];
    draftSlideId = current && current.id;
    app.innerHTML = `
      ${shell("ESKA Noticeboard Admin", `<a class="secondary" href="/api/backup" target="_blank">Download Backup</a><button class="secondary" id="restoreBrowserBackup" type="button">Restore Browser Backup</button><a class="secondary" href="/export">Export for USB</a><button class="primary" id="saveBoard">Save Live Screen</button>`)}
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

    document.querySelector("#saveBoard").addEventListener("click", () => {
      clearTimeout(autoSaveTimer);
      flushAutosave().catch((error) => showStatus(error.message, true));
    });
    document.querySelector("#restoreBrowserBackup").addEventListener("click", () => {
      restoreFromBrowserBackup().catch((error) => showStatus(error.message, true));
    });
    document.querySelector("#addSlide").addEventListener("click", () => {
      const slide = createSlideFromTemplate("notice");
      board.slides.push(slide);
      draftSlideId = slide.id;
      scheduleAutosave(250);
      renderAdmin();
    });
    document.querySelectorAll(".slide-list-item").forEach((button) => {
      button.addEventListener("click", () => {
        draftSlideId = button.dataset.id;
        renderAdmin();
      });
    });
    bindEditor(current);
  };

  const originalCreateSlideFromTemplate = window.createSlideFromTemplate || createSlideFromTemplate;
  window.createSlideFromTemplate = function createSlideFromTemplate(templateId) {
    const slide = originalCreateSlideFromTemplate(templateId);
    if (templateId === "pt") {
      slide.animation = "centre-side";
      slide.duration = 17000;
      slide.fields.eyebrow = "Private tuition";
      slide.fields.heading = "Book a 1-to-1 PT session";
      slide.fields.subheading = "Focused coaching for faster progress";
      slide.fields.body = "Work on grading prep, confidence, fitness, kata, kumite, or specific techniques with dedicated instructor time.";
      slide.fields.cta = "Ask reception to book";
      slide.fields.image = "/assets/dojo-class.svg";
      slide.fields.accent = "#e61f2a";
      slide.fields.panelColor = "rgba(255, 255, 255, 0.96)";
    }
    if (templateId === "menu") {
      slide.animation = "stagger";
      slide.duration = 16000;
      slide.fields.eyebrow = "Dojo cafe";
      slide.fields.heading = "Cafe Menu";
      slide.fields.subheading = "Refreshments for students and families";
      slide.fields.body = "Grab a drink or snack before class, after training, or while you wait.";
      slide.fields.cta = "Ask at reception";
      slide.fields.image = "/assets/dojo-class.svg";
      slide.fields.menuItems = "Tea | GBP 1.50 | Freshly brewed cup\nCoffee | GBP 2.00 | Americano or white coffee\nHot chocolate | GBP 2.20 | Warm and sweet\nWater | GBP 1.00 | Still bottled water\nSnack bar | GBP 1.20 | Quick pre-class snack";
      slide.fields.accent = "#e61f2a";
      slide.fields.panelColor = "rgba(255, 255, 255, 0.96)";
    }
    slide.fields.imageLeft = slide.fields.imageLeft || "";
    slide.fields.imageRight = slide.fields.imageRight || "";
    slide.fields.image4 = slide.fields.image4 || "";
    slide.fields.image5 = slide.fields.image5 || "";
    slide.fields.image6 = slide.fields.image6 || "";
    slide.fields.logo = slide.fields.logo || "";
    slide.fields.background = slide.fields.background || "";
    slide.fields.accent = slide.fields.accent || "";
    slide.fields.textColor = slide.fields.textColor || "";
    slide.fields.panelColor = slide.fields.panelColor || "";
    slide.fields.textX = slide.fields.textX || "";
    slide.fields.textY = slide.fields.textY || "";
    slide.fields.textWidth = slide.fields.textWidth || "";
    slide.fields.headingSize = slide.fields.headingSize || "";
    slide.fields.subheadingSize = slide.fields.subheadingSize || "";
    slide.fields.bodySize = slide.fields.bodySize || "";
    slide.fields.menuItems = slide.fields.menuItems || "";
    return slide;
  };

  brandHeader = window.brandHeader;
  renderSlide = window.renderSlide;
  renderAdmin = window.renderAdmin;
  editorForm = window.editorForm;
  labelFor = window.labelFor;
  bindEditor = window.bindEditor;
  uploadInto = window.uploadInto;
  createSlideFromTemplate = window.createSlideFromTemplate;

  if (route() === "/admin" || route() === "/templates") {
    adminView().catch(() => null);
  }
})();

