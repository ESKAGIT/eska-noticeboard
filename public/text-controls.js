(function () {
  if (typeof route !== "function" || route() !== "/admin") return;

  const editableFields = [
    ["eyebrow", "Small label", "bodySize"],
    ["heading", "Heading", "headingSize"],
    ["subheading", "Subheading", "subheadingSize"],
    ["body", "Body text", "bodySize"],
    ["cta", "Call to action", "bodySize"],
    ["date", "Date", "bodySize"],
    ["time", "Time", "bodySize"],
    ["location", "Location", "bodySize"],
    ["dateList", "Dates list", "bodySize"],
    ["menuItems", "Menu items", "bodySize"]
  ];

  const clickTargets = [
    [".copy-block .eyebrow", "eyebrow"],
    [".copy-block h1", "heading"],
    [".copy-block h2", "subheading"],
    [".copy-block .body-copy", "body"],
    [".copy-block .cta", "cta"],
    [".meta-row span:nth-child(1)", "date"],
    [".meta-row span:nth-child(2)", "time"],
    [".meta-row span:nth-child(3)", "location"],
    [".info-cards article:nth-child(1) strong", "date"],
    [".info-cards article:nth-child(1) span", "time"],
    [".info-cards article:nth-child(2) span", "location"],
    [".info-cards article:nth-child(3) span", "cta"],
    [".date-board", "dateList"],
    [".menu-items", "menuItems"],
    [".cafe-intro .eyebrow", "eyebrow"],
    [".cafe-intro h1", "heading"],
    [".cafe-intro h2", "subheading"],
    [".cafe-intro .body-copy", "body"],
    [".cafe-intro .cta", "cta"]
  ];

  let selectedField = "heading";
  let saveTimer = null;
  let enhanceTimer = null;
  let globalEventsBound = false;

  function cleanCss(value = "") {
    return String(value).replace(/[;"<>]/g, "").trim();
  }

  function cssLength(value = "") {
    const clean = cleanCss(value);
    if (!clean) return "";
    if (/^-?\d+(\.\d+)?$/.test(clean)) return `${clean}px`;
    if (/^-?\d+(\.\d+)?(px|rem|em|%|vw|vh)$/i.test(clean)) return clean;
    if (/^clamp\(/i.test(clean)) return clean;
    return "";
  }

  function px(value, fallback = 0) {
    const number = parseFloat(cssLength(value));
    return Number.isFinite(number) ? number : fallback;
  }

  function currentSlide() {
    return board && board.slides && (board.slides.find((slide) => slide.id === draftSlideId) || board.slides[0]);
  }

  function fieldConfig(name = selectedField) {
    return editableFields.find(([key]) => key === name) || editableFields[1];
  }

  function sizeFieldFor(name = selectedField) {
    return fieldConfig(name)[2];
  }

  function styleVars(slide) {
    const values = {
      "--text-x": cssLength(field(slide, "textX")),
      "--text-y": cssLength(field(slide, "textY")),
      "--text-width": cssLength(field(slide, "textWidth")),
      "--heading-size": cssLength(field(slide, "headingSize")),
      "--subheading-size": cssLength(field(slide, "subheadingSize")),
      "--body-size": cssLength(field(slide, "bodySize"))
    };
    return Object.entries(values)
      .filter(([, value]) => value)
      .map(([key, value]) => `${key}: ${value}`);
  }

  function setMessage(message) {
    const box = document.querySelector("#directTextSelection");
    if (box) box.textContent = message;
  }

  function syncInputs(name, value) {
    const main = document.querySelector("#directTextInput");
    if (name === selectedField && main && main.value !== value) main.value = value;
    document.querySelectorAll(`[data-field="${name}"]`).forEach((input) => {
      if (input.value !== value) input.value = value;
    });
  }

  function saveSoon() {
    clearTimeout(saveTimer);
    saveTimer = setTimeout(async () => {
      try {
        await api("/api/noticeboard", { method: "PUT", body: JSON.stringify(board) });
        setMessage("Saved");
      } catch (error) {
        if (typeof showStatus === "function") showStatus(error.message || "Could not save text edit.", true);
      }
    }, 650);
  }

  function setSlideField(name, value) {
    const slide = currentSlide();
    if (!slide) return;
    slide.fields[name] = value;
    syncInputs(name, value);
    saveSoon();
  }

  function applyVar(name, value) {
    const slideEl = document.querySelector(".preview-wrap .preview-slide");
    if (!slideEl) return;
    if (value) slideEl.style.setProperty(name, value);
    else slideEl.style.removeProperty(name);
  }

  function previewElementFor(name) {
    const preview = document.querySelector(".preview-wrap");
    if (!preview) return null;
    const target = clickTargets.find(([, fieldName]) => fieldName === name);
    return target ? preview.querySelector(target[0]) : null;
  }

  function refreshSelectedPreviewText(value) {
    const element = previewElementFor(selectedField);
    if (element) element.innerText = value;
  }

  function editableFromTarget(target) {
    const preview = target && target.closest ? target.closest(".preview-wrap") : null;
    if (!preview) return null;
    for (const [selector, name] of clickTargets) {
      const element = target.closest(selector);
      if (element && preview.contains(element)) return { element, field: name };
    }
    return null;
  }

  function prepareEditableElement(element, name) {
    element.classList.add("direct-editable");
    element.dataset.directField = name;
    element.contentEditable = "true";
    element.spellcheck = false;
    element.setAttribute("tabindex", "0");
  }

  function focusEditableElement(element) {
    if (!element) return;
    window.setTimeout(() => {
      element.focus({ preventScroll: true });
      const selection = window.getSelection && window.getSelection();
      if (!selection || !document.createRange) return;
      const range = document.createRange();
      range.selectNodeContents(element);
      range.collapse(false);
      selection.removeAllRanges();
      selection.addRange(range);
    }, 0);
  }

  const oldSlideStyle = window.slideStyle || slideStyle;
  window.slideStyle = function slideStyleWithTextControls(slide) {
    const original = oldSlideStyle(slide);
    const extra = styleVars(slide);
    if (!extra.length) return original;
    const extraText = extra.join("; ");
    if (!original) return ` style="${escapeHtml(extraText)}"`;
    return original.replace(/"$/, `; ${escapeHtml(extraText)}"`);
  };
  slideStyle = window.slideStyle;

  const oldEditorForm = window.editorForm || editorForm;
  window.editorForm = function editorFormWithReliableTextControls(slide) {
    const html = oldEditorForm(slide);
    if (!slide || html.includes("directTextToolbar")) return html;
    const toolbar = `
      <section class="direct-text-toolbar" id="directTextToolbar">
        <div class="direct-text-head">
          <strong>Text editor</strong>
          <span id="directTextSelection">Edit text on preview: ON. Choose a text part below, or click text on the preview.</span>
        </div>
        <div class="direct-text-parts">
          ${editableFields.map(([key, label]) => `<button type="button" data-direct-field="${key}">${label}</button>`).join("")}
        </div>
        <label class="direct-text-editor">
          Edit selected text
          <textarea id="directTextInput" rows="3"></textarea>
        </label>
        <div class="direct-text-buttons">
          <button type="button" data-direct-action="smaller">A-</button>
          <button type="button" data-direct-action="bigger">A+</button>
          <button type="button" data-direct-action="up">Up</button>
          <button type="button" data-direct-action="down">Down</button>
          <button type="button" data-direct-action="left">Left</button>
          <button type="button" data-direct-action="right">Right</button>
          <button type="button" data-direct-action="narrower">Narrower</button>
          <button type="button" data-direct-action="wider">Wider</button>
          <button type="button" data-direct-action="reset">Reset</button>
        </div>
      </section>
    `;
    return html.replace('<div class="upload-row">', `${toolbar}<div class="upload-row">`);
  };
  editorForm = window.editorForm;

  function markPreviewText() {
    const preview = document.querySelector(".preview-wrap");
    if (!preview) return;
    preview.classList.add("direct-editing-enabled");
    clickTargets.forEach(([selector, name]) => {
      preview.querySelectorAll(selector).forEach((element) => {
        if (!element.textContent.trim()) return;
        prepareEditableElement(element, name);
      });
    });
  }

  function selectField(name, preferredElement = null, shouldFocus = false) {
    const slide = currentSlide();
    if (!slide) return;
    selectedField = name;
    const [, label] = fieldConfig(name);
    document.querySelectorAll("[data-direct-field]").forEach((button) => {
      button.classList.toggle("active", button.dataset.directField === name);
    });
    document.querySelectorAll(".direct-editable.selected").forEach((item) => item.classList.remove("selected"));
    const element = preferredElement || previewElementFor(name);
    if (element) element.classList.add("selected");
    if (shouldFocus) focusEditableElement(element);
    const input = document.querySelector("#directTextInput");
    if (input) input.value = preferredElement ? preferredElement.innerText.trim() : field(slide, name);
    setMessage(`Editing ${label}`);
  }

  function updateSelectedText(value) {
    if (!selectedField) selectField("heading");
    setSlideField(selectedField, value);
    refreshSelectedPreviewText(value);
  }

  function slideValue(name, fallback = "") {
    const slide = currentSlide();
    return slide ? field(slide, name, fallback) : fallback;
  }

  function runAction(action) {
    if (!selectedField) selectField("heading");
    const sizeField = sizeFieldFor(selectedField);
    const element = previewElementFor(selectedField);

    if (action === "bigger" || action === "smaller") {
      const computed = element ? parseFloat(getComputedStyle(element).fontSize) : 32;
      const value = `${Math.max(10, Math.min(150, Math.round(px(slideValue(sizeField), computed) + (action === "bigger" ? 4 : -4))))}px`;
      setSlideField(sizeField, value);
      applyVar(sizeField === "headingSize" ? "--heading-size" : sizeField === "subheadingSize" ? "--subheading-size" : "--body-size", value);
      return;
    }

    if (action === "left" || action === "right") {
      const value = `${Math.round(px(slideValue("textX"), 0) + (action === "right" ? 12 : -12))}px`;
      setSlideField("textX", value);
      applyVar("--text-x", value);
    } else if (action === "up" || action === "down") {
      const value = `${Math.round(px(slideValue("textY"), 0) + (action === "down" ? 12 : -12))}px`;
      setSlideField("textY", value);
      applyVar("--text-y", value);
    } else if (action === "wider" || action === "narrower") {
      const value = `${Math.max(220, Math.min(1300, Math.round(px(slideValue("textWidth"), 780) + (action === "wider" ? 56 : -56))))}px`;
      setSlideField("textWidth", value);
      applyVar("--text-width", value);
    } else if (action === "reset") {
      ["textX", "textY", "textWidth", "headingSize", "subheadingSize", "bodySize"].forEach((key) => setSlideField(key, ""));
      ["--text-x", "--text-y", "--text-width", "--heading-size", "--subheading-size", "--body-size"].forEach((key) => applyVar(key, ""));
    }
  }

  function bindDirectEditor() {
    const toolbar = document.querySelector("#directTextToolbar");
    const input = document.querySelector("#directTextInput");
    const preview = document.querySelector(".preview-wrap");
    if (!toolbar || !input) return;

    if (toolbar.dataset.directBound !== "true") {
      toolbar.dataset.directBound = "true";
      toolbar.addEventListener("click", (event) => {
        const fieldButton = event.target.closest("[data-direct-field]");
        const actionButton = event.target.closest("[data-direct-action]");
        if (fieldButton) selectField(fieldButton.dataset.directField);
        if (actionButton) runAction(actionButton.dataset.directAction);
      });
    }

    if (input.dataset.directBound !== "true") {
      input.dataset.directBound = "true";
      input.addEventListener("input", () => updateSelectedText(input.value));
    }

    if (preview && preview.dataset.directBound !== "true") {
      preview.dataset.directBound = "true";
      preview.addEventListener("pointerdown", (event) => {
        const element = event.target.closest(".direct-editable");
        if (!element || !preview.contains(element)) return;
        selectField(element.dataset.directField || "heading", element, true);
      }, true);

      preview.addEventListener("input", (event) => {
        const element = event.target.closest(".direct-editable");
        if (!element || !preview.contains(element)) return;
        const name = element.dataset.directField || "heading";
        selectedField = name;
        selectField(name, element, false);
        setSlideField(name, element.innerText.trim());
      }, true);

      preview.addEventListener("focusin", (event) => {
        const element = event.target.closest(".direct-editable");
        if (!element || !preview.contains(element)) return;
        selectField(element.dataset.directField || "heading", element, false);
      }, true);
    }

    selectField(selectedField || "heading");
  }

  function bindGlobalEditorEvents() {
    if (globalEventsBound) return;
    globalEventsBound = true;

    document.addEventListener("pointerdown", (event) => {
      const match = editableFromTarget(event.target);
      if (!match) return;
      prepareEditableElement(match.element, match.field);
      selectField(match.field, match.element, true);
    }, true);

    document.addEventListener("focusin", (event) => {
      const match = editableFromTarget(event.target);
      if (!match) return;
      prepareEditableElement(match.element, match.field);
      selectField(match.field, match.element, false);
    }, true);

    document.addEventListener("input", (event) => {
      const match = editableFromTarget(event.target);
      if (!match) return;
      prepareEditableElement(match.element, match.field);
      selectedField = match.field;
      selectField(match.field, match.element, false);
      setSlideField(match.field, match.element.innerText.trim());
    }, true);
  }

  function enhanceAdmin() {
    markPreviewText();
    bindDirectEditor();
  }

  function enhanceAdminSoon() {
    clearTimeout(enhanceTimer);
    enhanceTimer = setTimeout(enhanceAdmin, 0);
  }

  function watchAdminPreview() {
    const appRoot = document.querySelector("#app") || document.body;
    if (!appRoot || appRoot.dataset.directObserver === "true") return;
    appRoot.dataset.directObserver = "true";
    const observer = new MutationObserver(() => enhanceAdminSoon());
    observer.observe(appRoot, { childList: true, subtree: true });
    document.addEventListener("click", (event) => {
      if (event.target.closest(".slide-list-item, [data-id], [data-key], [data-field], #addSlide")) {
        enhanceAdminSoon();
      }
    }, true);
  }

  const oldRenderAdmin = window.renderAdmin || renderAdmin;
  window.renderAdmin = function renderAdminWithReliableTextControls() {
    oldRenderAdmin();
    enhanceAdmin();
  };
  renderAdmin = window.renderAdmin;

  renderAdmin();
  bindGlobalEditorEvents();
  watchAdminPreview();
  enhanceAdminSoon();
})();
