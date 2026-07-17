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
    const items = field(slide, "menuItems", "")
      .split(/\r?\n/)
      .map((item) => item.trim())
      .filter(Boolean)
      .map((item) => item.split("|").map((part) => part.trim()));
    const content = `
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
    return `<section class="${shellClass}" data-slide-id="${escapeHtml(slide.id)}"${slideStyle(slide)}>${brandHeader(slide)}${content}</section>`;
  };
  renderSlide = window.renderSlide;

  const baseLabelFor = labelFor;
  window.labelFor = function labelForWithCafe(key) {
    if (key === "menuItems") return "Cafe menu, one per line: item | price | description";
    return baseLabelFor(key);
  };
  labelFor = window.labelFor;

  const baseEditorForm = editorForm;
  window.editorForm = function editorFormWithCafe(slide) {
    if (!slide || slide.template !== "menu") return baseEditorForm(slide);
    const options = templates.map((item) => `<option value="${item.id}" ${slide.template === item.id ? "selected" : ""}>${item.name}</option>`).join("");
    const animOptions = animations.map(([id, label]) => `<option value="${id}" ${slide.animation === id ? "selected" : ""}>${label}</option>`).join("");
    const fields = ["eyebrow", "heading", "subheading", "body", "menuItems", "cta", "image", "logo", "background", "accent", "textColor", "panelColor"];
    return `
      <form class="edit-form">
        <div class="form-grid">
          <label>Template<select data-key="template">${options}</select></label>
          <label>Animation<select data-key="animation">${animOptions}</select></label>
          <label>Duration ms<input data-key="duration" type="number" min="4000" step="500" value="${Number(slide.duration || 17000)}"></label>
          <label class="check-row"><input data-key="visible" type="checkbox" ${slide.visible !== false ? "checked" : ""}> Show on TV</label>
        </div>
        <div class="form-grid two">
          ${fields.map((key) => `
            <label class="${key === "body" || key === "menuItems" ? "span-two" : ""}">${labelFor(key)}
              ${key === "body" || key === "menuItems" ? `<textarea data-field="${key}" rows="${key === "menuItems" ? "7" : "4"}">${escapeHtml(field(slide, key))}</textarea>` : `<input data-field="${key}" value="${escapeHtml(field(slide, key))}">`}
            </label>
          `).join("")}
        </div>
        <div class="upload-row">
          <label>Upload image/video<input id="mediaUpload" type="file" accept="image/*,video/mp4,video/quicktime"><small>For Apple TV, use MP4 video where possible.</small></label>
          <button class="secondary" id="applyToImage" type="button">Use upload as image</button>
          <button class="secondary" id="applyToLogo" type="button">Use as slide logo</button>
          <button class="secondary" id="applyToBackground" type="button">Use as background</button>
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
        menuItems: "Tea | GBP 1.50 | Freshly brewed cup\nCoffee | GBP 2.00 | Americano or white coffee\nHot chocolate | GBP 2.20 | Warm and sweet\nWater | GBP 1.00 | Still bottled water\nSnack bar | GBP 1.20 | Quick pre-class snack",
        cta: "Ask at reception",
        image: "/assets/dojo-class.svg",
        logo: "/assets/eska-logo-exact.svg",
        background: "linear-gradient(135deg, #ffffff 0%, #fff7f3 100%)",
        accent: "#e61f2a",
        panelColor: "rgba(255, 255, 255, 0.96)"
      }
    };
  };
  createSlideFromTemplate = window.createSlideFromTemplate;

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
})();
