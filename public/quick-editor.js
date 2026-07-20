(function () {
  const fields = [
    ["eyebrow", "Small label", "input"],
    ["heading", "Heading", "input"],
    ["subheading", "Subheading", "input"],
    ["cta", "Call to action", "input"],
    ["body", "Body text", "textarea"],
    ["dateList", "Dates / timetable list", "textarea"],
    ["menuItems", "Menu items", "textarea"],
    ["photoNotes", "Photo notes", "textarea"]
  ];

  const sizeFields = [
    ["headingSize", "Heading size", 36, 150, 92],
    ["subheadingSize", "Subheading size", 22, 78, 38],
    ["bodySize", "Body size", 18, 56, 28]
  ];

  let panel = null;
  let saveTimer = null;
  let lastSlideId = "";
  let installed = false;

  function isAdmin() {
    return window.location.pathname === "/admin";
  }

  function currentSlide() {
    if (!board || !Array.isArray(board.slides)) return null;
    return board.slides.find((slide) => slide.id === draftSlideId) || board.slides[0] || null;
  }

  function fieldValue(slide, name) {
    return slide && slide.fields && slide.fields[name] ? slide.fields[name] : "";
  }

  function ensurePanel() {
    if (panel) return panel;
    panel = document.createElement("section");
    panel.id = "quickTextEditor";
    panel.className = "quick-editor";
    panel.innerHTML = `
      <div class="quick-editor-title">
        <div>
          <strong>Quick Text Editor</strong>
          <span data-quick-slide>Choose a slide to edit</span>
        </div>
        <button type="button" data-quick-toggle aria-label="Collapse quick text editor">Hide</button>
      </div>
      <div class="quick-editor-body">
        ${fields.map(([name, label, type]) => `
          <label class="${type === "textarea" ? "wide" : ""}">
            ${label}
            ${type === "textarea"
              ? `<textarea data-quick-field="${name}" rows="${name === "dateList" || name === "menuItems" ? "5" : "3"}"></textarea>`
              : `<input data-quick-field="${name}">`}
          </label>
        `).join("")}
      </div>
      <div class="quick-size-tools" aria-label="Text size tools">
        <div class="quick-size-head">
          <strong>Text Size</strong>
          <button type="button" data-size-reset>Reset sizes</button>
        </div>
        ${sizeFields.map(([name, label, min, max]) => `
          <label class="quick-size-row">
            <span>${label}</span>
            <small>Small</small>
            <input data-quick-size="${name}" type="range" min="${min}" max="${max}" step="2">
            <small>Large</small>
          </label>
        `).join("")}
      </div>
    `;
    document.body.appendChild(panel);

    panel.addEventListener("input", (event) => {
      const control = event.target.closest("[data-quick-field]");
      const sizeControl = event.target.closest("[data-quick-size]");
      if (control) updateField(control.dataset.quickField, control.value);
      if (sizeControl) updateField(sizeControl.dataset.quickSize, `${sizeControl.value}px`);
    });

    panel.querySelector("[data-quick-toggle]").addEventListener("click", () => {
      panel.classList.toggle("collapsed");
      panel.querySelector("[data-quick-toggle]").textContent = panel.classList.contains("collapsed") ? "Show" : "Hide";
    });

    panel.querySelector("[data-size-reset]").addEventListener("click", () => {
      resetSizes();
    });

    return panel;
  }

  function saveSoon() {
    clearTimeout(saveTimer);
    saveTimer = setTimeout(async () => {
      try {
        if (typeof saveBoard === "function") await saveBoard();
      } catch (error) {
        if (typeof showStatus === "function") showStatus(error.message || "Could not save text edit.", true);
      }
    }, 800);
  }

  function syncNormalFields(name, value) {
    document.querySelectorAll(`[data-field="${name}"]`).forEach((input) => {
      if (input.value !== value) input.value = value;
    });
  }

  function refreshPreview(slide) {
    const preview = document.querySelector(".preview-wrap");
    if (preview && typeof renderSlide === "function") {
      preview.innerHTML = renderSlide(slide, true);
    }
  }

  function updateField(name, value) {
    const slide = currentSlide();
    if (!slide) return;
    slide.fields = slide.fields || {};
    slide.fields[name] = value;
    syncNormalFields(name, value);
    refreshPreview(slide);
    saveSoon();
  }

  function resetSizes() {
    const slide = currentSlide();
    if (!slide) return;
    slide.fields = slide.fields || {};
    sizeFields.forEach(([name]) => {
      delete slide.fields[name];
      syncNormalFields(name, "");
    });
    refreshPreview(slide);
    refreshPanel();
    saveSoon();
  }

  function parseSize(slide, name, fallback) {
    const raw = fieldValue(slide, name);
    const match = String(raw).match(/(\d+(\.\d+)?)/);
    return match ? Number(match[1]) : fallback;
  }

  function refreshPanel() {
    if (!isAdmin()) {
      if (panel) panel.hidden = true;
      return;
    }
    const slide = currentSlide();
    const activePanel = ensurePanel();
    activePanel.hidden = !slide;
    if (!slide) return;

    const title = activePanel.querySelector("[data-quick-slide]");
    if (title) title.textContent = fieldValue(slide, "heading") || slide.template || "Current slide";

    fields.forEach(([name]) => {
      const control = activePanel.querySelector(`[data-quick-field="${name}"]`);
      if (!control || document.activeElement === control) return;
      control.value = fieldValue(slide, name);
    });

    sizeFields.forEach(([name, , , , fallback]) => {
      const control = activePanel.querySelector(`[data-quick-size="${name}"]`);
      if (!control || document.activeElement === control) return;
      control.value = parseSize(slide, name, fallback);
    });

    lastSlideId = slide.id;
  }

  function watchAdmin() {
    if (installed) return;
    installed = true;

    const observer = new MutationObserver(() => {
      const slide = currentSlide();
      if (!slide || slide.id !== lastSlideId) refreshPanel();
    });
    observer.observe(document.body, { childList: true, subtree: true });

    document.addEventListener("click", () => {
      window.setTimeout(refreshPanel, 0);
    }, true);
  }

  function boot() {
    if (!isAdmin()) return;
    refreshPanel();
    watchAdmin();
  }

  window.addEventListener("load", boot);
  window.addEventListener("popstate", boot);
  window.setTimeout(boot, 0);
})();