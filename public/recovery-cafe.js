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
    const photos = [
      [image, (photoNotes[0] && photoNotes[0][0]) || "Fresh drinks", (photoNotes[0] && photoNotes[0][1]) || "Hot and cold options available from the cafe."],
      [imageLeft, (photoNotes[1] && photoNotes[1][0]) || "Quick snacks", (photoNotes[1] && photoNotes[1][1]) || "Easy grab-and-go choices before or after class."],
      [imageRight, (photoNotes[2] && photoNotes[2][0]) || "Family friendly", (photoNotes[2] && photoNotes[2][1]) || "Refreshments for students, parents, and visitors."]
    ];
    const content = `
      <div class="menu-gallery">
        ${photos.map(([src, title, detail], index) => `
          <article class="menu-photo-card">
            <div class="menu-photo">${mediaTag(src, title)}</div>
            <div class="menu-photo-copy">
              <strong>${escapeHtml(title)}</strong>
              <span>${escapeHtml(detail)}</span>
            </div>
          </article>
        `).join("")}
      </div>
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
    if (key === "photoNotes") return "Photo writing, one per line: heading | short description";
    return baseLabelFor(key);
  };
  labelFor = window.labelFor;

  const baseEditorForm = editorForm;
  window.editorForm = function editorFormWithCafe(slide) {
    if (!slide || slide.template !== "menu") return baseEditorForm(slide);
    const options = templates.map((item) => `<option value="${item.id}" ${slide.template === item.id ? "selected" : ""}>${item.name}</option>`).join("");
    const animOptions = animations.map(([id, label]) => `<option value="${id}" ${slide.animation === id ? "selected" : ""}>${label}</option>`).join("");
    const fields = ["eyebrow", "heading", "subheading", "body", "photoNotes", "menuItems", "cta", "image", "imageLeft", "imageRight", "logo", "background", "accent", "textColor", "panelColor"];
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
            <label class="${key === "body" || key === "menuItems" || key === "photoNotes" ? "span-two" : ""}">${labelFor(key)}
              ${key === "body" || key === "menuItems" || key === "photoNotes" ? `<textarea data-field="${key}" rows="${key === "menuItems" ? "7" : "4"}">${escapeHtml(field(slide, key))}</textarea>` : `<input data-field="${key}" value="${escapeHtml(field(slide, key))}">`}
            </label>
          `).join("")}
        </div>
        <div class="upload-row">
          <label>Upload image/video<input id="mediaUpload" type="file" accept="image/*,video/mp4,video/quicktime"><small>For Apple TV, use MP4 video where possible.</small></label>
          <button class="secondary" id="applyToImage" type="button">Use as photo 1</button>
          <button class="secondary" id="applyToLeftImage" type="button">Use as photo 2</button>
          <button class="secondary" id="applyToRightImage" type="button">Use as photo 3</button>
          <button class="secondary" id="applyToLogo" type="button">Use as slide logo</button>
          <button class="secondary" id="applyToBackground" type="button">Use as background</button>
          <button class="secondary" id="applyToVideo" type="button">Use upload as video</button>
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
        photoNotes: "Fresh drinks | Tea, coffee and hot chocolate for the training break\nQuick snacks | Simple choices for before or after class\nFamily friendly | Refreshments for parents, students and visitors",
        menuItems: "Tea | GBP 1.50 | Freshly brewed cup\nCoffee | GBP 2.00 | Americano or white coffee\nHot chocolate | GBP 2.20 | Warm and sweet\nWater | GBP 1.00 | Still bottled water\nSnack bar | GBP 1.20 | Quick pre-class snack",
        cta: "Ask at reception",
        image: "/assets/dojo-class.svg",
        imageLeft: "/assets/students-group.svg",
        imageRight: "/assets/training.svg",
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
