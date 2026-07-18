(function () {
  const textTargets = [
    [".copy-block .eyebrow", "eyebrow", "bodySize", "Small label"],
    [".copy-block h1", "heading", "headingSize", "Heading"],
    [".copy-block h2", "subheading", "subheadingSize", "Subheading"],
    [".copy-block .body-copy", "body", "bodySize", "Body text"],
    [".copy-block .cta", "cta", "bodySize", "Call to action"],
    [".cafe-intro .eyebrow", "eyebrow", "bodySize", "Small label"],
    [".cafe-intro h1", "heading", "headingSize", "Heading"],
    [".cafe-intro h2", "subheading", "subheadingSize", "Subheading"],
    [".cafe-intro .body-copy", "body", "bodySize", "Body text"],
    [".cafe-intro .cta", "cta", "bodySize", "Call to action"]
  ];

  let selectedElement = null;
  let selectedField = "";
  let selectedSizeField = "";
  let saveTimer = null;

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

  function pxValue(value, fallback = 0) {
    const clean = cssLength(value);
    const number = parseFloat(clean || "");
    return Number.isFinite(number) ? number : fallback;
  }

  function getCurrentSlide() {
    return board && board.slides && (board.slides.find((slide) => slide.id === draftSlideId) || board.slides[0]);
  }

  function textStyleVars(slide) {
    const styles = [];
    const values = {
      "--text-x": cssLength(field(slide, "textX")),
      "--text-y": cssLength(field(slide, "textY")),
      "--text-width": cssLength(field(slide, "textWidth")),
      "--heading-size": cssLength(field(slide, "headingSize")),
      "--subheading-size": cssLength(field(slide, "subheadingSize")),
      "--body-size": cssLength(field(slide, "bodySize"))
    };
    Object.entries(values).forEach(([name, value]) => {
      if (value) styles.push(`${name}: ${value}`);
    });
    return styles;
  }

  function setToolbarMessage(message) {
    const label = document.querySelector("#directTextSelection");
    if (label) label.textContent = message;
  }

  function syncFieldInput(name, value) {
    const input = document.querySelector(`[data-field="${name}"]`);
    if (input && input.value !== value) input.value = value;
  }

  function saveLater() {
    clearTimeout(saveTimer);
    saveTimer = setTimeout(async () => {
      if (!board || route() !== "/admin") return;
      try {
        if (typeof api === "function") await api("/api/noticeboard", { method: "PUT", body: JSON.stringify(board) });
        else if (typeof saveBoard === "function") await saveBoard();
        setToolbarMessage("Saved text edit");
      } catch (error) {
        if (typeof showStatus === "function") showStatus(error.message || "Could not save text edit.", true);
      }
    }, 700);
  }

  function applyStyleVar(name, value) {
    const slideEl = selectedElement && selectedElement.closest(".preview-slide");
    if (slideEl) slideEl.style.setProperty(name, value);
  }

  const previousSlideStyle = window.slideStyle || slideStyle;
  window.slideStyle = function slideStyleWithTextControls(slide) {
    const original = previousSlideStyle(slide);
    const extra = textStyleVars(slide);
    if (!extra.length) return original;
    const extraText = extra.join("; ");
    if (!original) return ` style="${escapeHtml(extraText)}"`;
    return original.replace(/"$/, `; ${escapeHtml(extraText)}"`);
  };
  slideStyle = window.slideStyle;

  const previousEditorForm = window.editorForm || editorForm;
  window.editorForm = function editorFormWithDirectTextToolbar(slide) {
    let html = previousEditorForm(slide);
    if (!slide || html.includes("directTextToolbar")) return html;
    const toolbar = `
      <div class="direct-text-toolbar" id="directTextToolbar">
        <div><strong>Text editing</strong><span id="directTextSelection">Click text on the preview to edit it</span></div>
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
    `;
    return html.replace('<div class="upload-row">', `${toolbar}<div class="upload-row">`);
  };
  editorForm = window.editorForm;

  function selectEditable(element) {
    selectedElement = element;
    selectedField = element.dataset.textField || "";
    selectedSizeField = element.dataset.sizeField || "";
    document.querySelectorAll(".direct-editable.selected").forEach((item) => item.classList.remove("selected"));
    document.querySelectorAll(".direct-edit-block.selected").forEach((item) => item.classList.remove("selected"));
    element.classList.add("selected");
    const block = element.closest(".copy-block, .cafe-intro");
    if (block) block.classList.add("selected");
    setToolbarMessage(`Editing ${element.dataset.textLabel || selectedField}`);
  }

  function updateTextField(element) {
    const slide = getCurrentSlide();
    if (!slide || !element.dataset.textField) return;
    const value = element.innerText.replace(/\u00a0/g, " ").trim();
    slide.fields[element.dataset.textField] = value;
    syncFieldInput(element.dataset.textField, value);
    saveLater();
  }

  function setupEditableText() {
    const preview = document.querySelector(".preview-wrap");
    const slide = getCurrentSlide();
    if (!preview || !slide) return;

    textTargets.forEach(([selector, fieldName, sizeField, label]) => {
      preview.querySelectorAll(selector).forEach((element) => {
        if (!element.textContent.trim()) return;
        element.contentEditable = "true";
        element.spellcheck = false;
        element.dataset.textField = fieldName;
        element.dataset.sizeField = sizeField;
        element.dataset.textLabel = label;
        element.classList.add("direct-editable");
        const block = element.closest(".copy-block, .cafe-intro");
        if (block) block.classList.add("direct-edit-block");
        element.addEventListener("focus", () => selectEditable(element));
        element.addEventListener("click", () => selectEditable(element));
        element.addEventListener("input", () => updateTextField(element));
        element.addEventListener("keydown", (event) => {
          if (event.key === "Enter" && fieldName !== "body") {
            event.preventDefault();
            element.blur();
          }
        });
      });
    });

    document.querySelectorAll("[data-direct-action]").forEach((button) => {
      button.addEventListener("click", () => runToolbarAction(button.dataset.directAction));
    });
  }

  function setSlideField(name, value) {
    const slide = getCurrentSlide();
    if (!slide) return;
    slide.fields[name] = value;
    syncFieldInput(name, value);
    saveLater();
  }

  function runToolbarAction(action) {
    const slide = getCurrentSlide();
    if (!slide || !selectedElement) {
      setToolbarMessage("Click some text on the preview first");
      return;
    }

    if (action === "bigger" || action === "smaller") {
      if (!selectedSizeField) return;
      const computed = parseFloat(getComputedStyle(selectedElement).fontSize) || 32;
      const current = pxValue(field(slide, selectedSizeField), computed);
      const next = Math.max(10, Math.min(140, current + (action === "bigger" ? 4 : -4)));
      const value = `${Math.round(next)}px`;
      setSlideField(selectedSizeField, value);
      applyStyleVar(selectedSizeField === "headingSize" ? "--heading-size" : selectedSizeField === "subheadingSize" ? "--subheading-size" : "--body-size", value);
      setToolbarMessage(`${selectedElement.dataset.textLabel}: ${action === "bigger" ? "bigger" : "smaller"}`);
      return;
    }

    const currentX = pxValue(field(slide, "textX"), 0);
    const currentY = pxValue(field(slide, "textY"), 0);
    const currentWidth = pxValue(field(slide, "textWidth"), 780);

    if (action === "left" || action === "right") {
      const value = `${Math.round(currentX + (action === "right" ? 12 : -12))}px`;
      setSlideField("textX", value);
      applyStyleVar("--text-x", value);
    } else if (action === "up" || action === "down") {
      const value = `${Math.round(currentY + (action === "down" ? 12 : -12))}px`;
      setSlideField("textY", value);
      applyStyleVar("--text-y", value);
    } else if (action === "wider" || action === "narrower") {
      const value = `${Math.max(240, Math.min(1200, Math.round(currentWidth + (action === "wider" ? 48 : -48))))}px`;
      setSlideField("textWidth", value);
      applyStyleVar("--text-width", value);
    } else if (action === "reset") {
      ["textX", "textY", "textWidth", selectedSizeField].filter(Boolean).forEach((key) => setSlideField(key, ""));
      const slideEl = selectedElement.closest(".preview-slide");
      if (slideEl) ["--text-x", "--text-y", "--text-width", "--heading-size", "--subheading-size", "--body-size"].forEach((key) => slideEl.style.removeProperty(key));
    }
  }

  const previousRenderAdmin = window.renderAdmin || renderAdmin;
  window.renderAdmin = function renderAdminWithDirectTextEditing() {
    previousRenderAdmin();
    selectedElement = null;
    selectedField = "";
    selectedSizeField = "";
    setupEditableText();
  };
  renderAdmin = window.renderAdmin;

  if (route() === "/admin") renderAdmin();
})();
