(function () {
  if (typeof route !== "function" || route() !== "/admin") return;

  const targets = [
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

  let selected = null;
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

  function px(value, fallback = 0) {
    const number = parseFloat(cssLength(value));
    return Number.isFinite(number) ? number : fallback;
  }

  function currentSlide() {
    return board && board.slides && (board.slides.find((slide) => slide.id === draftSlideId) || board.slides[0]);
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

  function syncFormField(name, value) {
    const input = document.querySelector(`[data-field="${name}"]`);
    if (input && input.value !== value) input.value = value;
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
    }, 600);
  }

  function setField(name, value) {
    const slide = currentSlide();
    if (!slide) return;
    slide.fields[name] = value;
    syncFormField(name, value);
    saveSoon();
  }

  function applyVar(name, value) {
    const slideElement = document.querySelector(".preview-wrap .preview-slide");
    if (slideElement) {
      if (value) slideElement.style.setProperty(name, value);
      else slideElement.style.removeProperty(name);
    }
  }

  const oldSlideStyle = window.slideStyle || slideStyle;
  window.slideStyle = function slideStyleWithDirectText(slide) {
    const original = oldSlideStyle(slide);
    const extra = styleVars(slide);
    if (!extra.length) return original;
    const extraText = extra.join("; ");
    if (!original) return ` style="${escapeHtml(extraText)}"`;
    return original.replace(/"$/, `; ${escapeHtml(extraText)}"`);
  };
  slideStyle = window.slideStyle;

  const oldEditorForm = window.editorForm || editorForm;
  window.editorForm = function editorFormWithDirectText(slide) {
    const html = oldEditorForm(slide);
    if (!slide || html.includes("directTextToolbar")) return html;
    const toolbar = `
      <section class="direct-text-toolbar" id="directTextToolbar">
        <div class="direct-text-head">
          <strong>PowerPoint-style text editing</strong>
          <span id="directTextSelection">Click a text box on the slide preview</span>
        </div>
        <label class="direct-text-editor">
          Edit selected text
          <textarea id="directTextInput" rows="3" placeholder="Click text on the preview first"></textarea>
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

  function markText() {
    const preview = document.querySelector(".preview-wrap");
    if (!preview) return;

    targets.forEach(([selector, fieldName, sizeField, label]) => {
      preview.querySelectorAll(selector).forEach((element) => {
        if (!element.textContent.trim()) return;
        element.classList.add("direct-editable");
        element.dataset.directField = fieldName;
        element.dataset.directSizeField = sizeField;
        element.dataset.directLabel = label;
        element.setAttribute("tabindex", "0");
      });
    });

    preview.addEventListener("click", (event) => {
      const item = event.target.closest(".direct-editable");
      if (!item || !preview.contains(item)) return;
      event.preventDefault();
      event.stopPropagation();
      selectText(item);
    });
  }

  function selectText(element) {
    selected = element;
    selectedField = element.dataset.directField || "";
    selectedSizeField = element.dataset.directSizeField || "";
    document.querySelectorAll(".direct-editable.selected").forEach((item) => item.classList.remove("selected"));
    selected.classList.add("selected");
    selected.contentEditable = "true";
    selected.focus();
    const input = document.querySelector("#directTextInput");
    if (input) input.value = selected.innerText.trim();
    setMessage(`Editing ${selected.dataset.directLabel || selectedField}`);
  }

  function selectedSlideFieldValue(name, fallback = "") {
    const slide = currentSlide();
    return slide ? field(slide, name, fallback) : fallback;
  }

  function handleTextInput(value) {
    if (!selected || !selectedField) {
      setMessage("Click text on the slide preview first");
      return;
    }
    selected.innerText = value;
    setField(selectedField, value);
  }

  function action(name) {
    if (!selected) {
      setMessage("Click text on the slide preview first");
      return;
    }

    if (name === "bigger" || name === "smaller") {
      const computed = parseFloat(getComputedStyle(selected).fontSize) || 32;
      const value = `${Math.max(10, Math.min(150, Math.round(px(selectedSlideFieldValue(selectedSizeField), computed) + (name === "bigger" ? 4 : -4))))}px`;
      setField(selectedSizeField, value);
      applyVar(selectedSizeField === "headingSize" ? "--heading-size" : selectedSizeField === "subheadingSize" ? "--subheading-size" : "--body-size", value);
      return;
    }

    if (name === "left" || name === "right") {
      const value = `${Math.round(px(selectedSlideFieldValue("textX"), 0) + (name === "right" ? 12 : -12))}px`;
      setField("textX", value);
      applyVar("--text-x", value);
    } else if (name === "up" || name === "down") {
      const value = `${Math.round(px(selectedSlideFieldValue("textY"), 0) + (name === "down" ? 12 : -12))}px`;
      setField("textY", value);
      applyVar("--text-y", value);
    } else if (name === "wider" || name === "narrower") {
      const value = `${Math.max(220, Math.min(1300, Math.round(px(selectedSlideFieldValue("textWidth"), 780) + (name === "wider" ? 56 : -56))))}px`;
      setField("textWidth", value);
      applyVar("--text-width", value);
    } else if (name === "reset") {
      ["textX", "textY", "textWidth", "headingSize", "subheadingSize", "bodySize"].forEach((key) => setField(key, ""));
      ["--text-x", "--text-y", "--text-width", "--heading-size", "--subheading-size", "--body-size"].forEach((key) => applyVar(key, ""));
    }
  }

  function bindToolbar() {
    const input = document.querySelector("#directTextInput");
    if (input) {
      input.addEventListener("input", () => handleTextInput(input.value));
    }
    document.querySelectorAll("[data-direct-action]").forEach((button) => {
      button.addEventListener("click", () => action(button.dataset.directAction));
    });
  }

  const oldRenderAdmin = window.renderAdmin || renderAdmin;
  window.renderAdmin = function renderAdminWithDirectText() {
    oldRenderAdmin();
    selected = null;
    selectedField = "";
    selectedSizeField = "";
    markText();
    bindToolbar();
  };
  renderAdmin = window.renderAdmin;

  renderAdmin();
})();
