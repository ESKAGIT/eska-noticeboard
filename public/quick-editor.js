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
    ["headingSize", "Heading size", 36, 150, 92, "--heading-size"],
    ["subheadingSize", "Subheading size", 22, 78, 38, "--subheading-size"],
    ["bodySize", "Body size", 18, 72, 28, "--body-size"]
  ];

  const fieldSizes = {
    eyebrow: "bodySize",
    heading: "headingSize",
    subheading: "subheadingSize",
    cta: "bodySize",
    body: "bodySize",
    dateList: "bodySize",
    menuItems: "bodySize",
    photoNotes: "bodySize"
  };

  const clickTargets = [
    [".copy-block .eyebrow", "eyebrow"],
    [".copy-block h1", "heading"],
    [".copy-block h2", "subheading"],
    [".copy-block .body-copy", "body"],
    [".copy-block .cta", "cta"],
    [".cafe-intro .eyebrow", "eyebrow"],
    [".cafe-intro h1", "heading"],
    [".cafe-intro h2", "subheading"],
    [".cafe-intro .body-copy", "body"],
    [".cafe-intro .cta", "cta"],
    [".date-board", "dateList"],
    [".menu-items", "menuItems"]
  ];

  let panel = null;
  let saveTimer = null;
  let lastSlideId = "";
  let selectedField = "heading";
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
          <label class="${type === "textarea" ? "wide" : ""}" data-quick-label="${name}">
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
        <label class="quick-size-row selected-size">
          <span data-selected-size-label>Selected text size</span>
          <small>Small</small>
          <input data-selected-size type="range" min="14" max="150" step="2">
          <small>Large</small>
        </label>
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
      const selectedSizeControl = event.target.closest("[data-selected-size]");
      if (control) {
        selectedField = control.dataset.quickField;
        markSelectedField();
        updateField(control.dataset.quickField, control.value);
      }
      if (sizeControl) updateSize(sizeControl.dataset.quickSize, `${sizeControl.value}px`);
      if (selectedSizeControl) updateSelectedSize(`${selectedSizeControl.value}px`);
    });

    panel.addEventListener("focusin", (event) => {
      const control = event.target.closest("[data-quick-field]");
      if (!control) return;
      selectedField = control.dataset.quickField;
      markSelectedField();
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

  function matchPreviewText(target) {
    const preview = target && target.closest ? target.closest(".preview-wrap") : null;
    if (!preview) return null;
    for (const [selector, name] of clickTargets) {
      const element = target.closest(selector);
      if (element && preview.contains(element)) return { element, name };
    }
    return null;
  }

  function markSelectedField() {
    if (!panel) return;
    panel.querySelectorAll("[data-quick-label]").forEach((label) => {
      label.classList.toggle("selected", label.dataset.quickLabel === selectedField);
    });
  }

  function focusField(name) {
    selectedField = name;
    const activePanel = ensurePanel();
    activePanel.classList.remove("collapsed");
    activePanel.querySelector("[data-quick-toggle]").textContent = "Hide";
    refreshPanel();
    markSelectedField();
    const control = activePanel.querySelector(`[data-quick-field="${name}"]`);
    if (!control) return;
    control.scrollIntoView({ block: "nearest", behavior: "smooth" });
    window.setTimeout(() => {
      control.focus({ preventScroll: true });
      if (control.select) control.select();
    }, 0);
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

  function sizeInfo(name) {
    return sizeFields.find(([key]) => key === name) || sizeFields[2];
  }

  function selectedSizeField() {
    return fieldSizes[selectedField] || "bodySize";
  }

  function applySizeToPreview(name, value) {
    const [, , , , , variable] = sizeInfo(name);
    const slideEl = document.querySelector(".preview-wrap .preview-slide");
    if (!slideEl || !variable) return;
    if (value) slideEl.style.setProperty(variable, value);
    else slideEl.style.removeProperty(variable);
  }

  function updateSize(name, value) {
    updateField(name, value);
    applySizeToPreview(name, value);
    refreshSizeControls();
  }

  function updateSelectedSize(value) {
    updateSize(selectedSizeField(), value);
  }

  function resetSizes() {
    const slide = currentSlide();
    if (!slide) return;
    slide.fields = slide.fields || {};
    sizeFields.forEach(([name]) => {
      delete slide.fields[name];
      syncNormalFields(name, "");
      applySizeToPreview(name, "");
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

  function refreshSizeControls() {
    if (!panel) return;
    const slide = currentSlide();
    if (!slide) return;

    sizeFields.forEach(([name, , , , fallback]) => {
      const control = panel.querySelector(`[data-quick-size="${name}"]`);
      if (!control || document.activeElement === control) return;
      control.value = parseSize(slide, name, fallback);
    });

    const selectedControl = panel.querySelector("[data-selected-size]");
    const selectedLabel = panel.querySelector("[data-selected-size-label]");
    const selectedName = selectedSizeField();
    const [, label, , , fallback] = sizeInfo(selectedName);
    if (selectedLabel) selectedLabel.textContent = `Selected text size (${label.replace(" size", "")})`;
    if (selectedControl && document.activeElement !== selectedControl) {
      selectedControl.value = parseSize(slide, selectedName, fallback);
    }
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

    markSelectedField();

    refreshSizeControls();

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

    document.addEventListener("pointerdown", (event) => {
      if (event.target.closest("#quickTextEditor")) return;
      const match = matchPreviewText(event.target);
      if (!match) return;
      event.preventDefault();
      event.stopPropagation();
      focusField(match.name);
    }, true);

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