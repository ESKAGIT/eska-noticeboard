(function () {
  const fields = [
    ["eyebrow", "Small label", "input"],
    ["heading", "Heading", "input"],
    ["subheading", "Subheading", "input"],
    ["cta", "Call to action", "input"],
    ["body", "Body text", "textarea"],
    ["dateList", "Dates / timetable list", "textarea"],
    ["menuItems", "Menu items", "textarea"],
    ["photoNotes", "Photo boxes", "textarea"],
    ["qrText", "QR text", "input"]
  ];

  const sizeFields = [
    ["eyebrowSize", "Small label size", 12, 48, 22, "--eyebrow-size"],
    ["headingSize", "Heading size", 36, 150, 92, "--heading-size"],
    ["subheadingSize", "Subheading size", 22, 78, 38, "--subheading-size"],
    ["bodySize", "Body size", 18, 72, 28, "--body-size"],
    ["ctaSize", "Call to action size", 16, 56, 24, "--cta-size"],
    ["dateListSize", "Dates list size", 16, 64, 28, "--date-list-size"],
    ["menuItemsSize", "Menu items size", 14, 56, 26, "--menu-items-size"],
    ["photoNotesSize", "Photo box text size", 14, 56, 24, "--photo-notes-size"],
    ["qrTextSize", "QR text size", 10, 42, 18, "--qr-text-size"]
  ];

  const fieldSizes = {
    eyebrow: "eyebrowSize",
    heading: "headingSize",
    subheading: "subheadingSize",
    cta: "ctaSize",
    body: "bodySize",
    dateList: "dateListSize",
    menuItems: "menuItemsSize",
    photoNotes: "photoNotesSize",
    qrText: "qrTextSize"
  };

  const imageFields = [
    ["image", "Picture 1", "--image"],
    ["imageLeft", "Picture 2", "--image-left"],
    ["imageRight", "Picture 3", "--image-right"],
    ["image4", "Picture 4", "--image-4"],
    ["image5", "Picture 5", "--image-5"],
    ["image6", "Picture 6", "--image-6"],
    ["logo", "Logo", "--logo"],
    ["qr", "QR code", "--qr"]
  ];

  const boxFields = [
    ["infoBoxWidth", "Box width", 180, 900, 360, "--info-box-w"],
    ["infoBoxHeight", "Box height", 60, 260, 138, "--info-box-h"],
    ["infoBoxGap", "Box spacing", 0, 60, 18, "--info-box-gap"],
    ["infoBoxX", "Move boxes left/right", -500, 500, 0, "--info-box-x"],
    ["infoBoxY", "Move boxes up/down", -300, 300, 0, "--info-box-y"],
    ["infoBoxTextSize", "Box text size", 14, 64, 28, "--info-box-text-size"]
  ];

  const imageFallbacks = {
    qr: { Width: 320, Height: 140 },
    logo: { Width: 120, Height: 120 },
    image: { Width: 520, Height: 360 },
    imageLeft: { Width: 520, Height: 360 },
    imageRight: { Width: 520, Height: 360 },
    image4: { Width: 320, Height: 220 },
    image5: { Width: 320, Height: 220 },
    image6: { Width: 320, Height: 220 }
  };

  const imageTargets = [
    [".hero-logo", "image"],
    [".notice-orb", "logo"],
    [".photo-panel", "image"],
    [".gallery-photo", "image"],
    [".pt-photo", "image"],
    [".menu-photo-card:nth-child(1) .menu-photo", "image"],
    [".menu-photo-card:nth-child(2) .menu-photo", "imageLeft"],
    [".menu-photo-card:nth-child(3) .menu-photo", "imageRight"],
    [".menu-photo-card:nth-child(4) .menu-photo", "image4"],
    [".menu-photo-card:nth-child(5) .menu-photo", "image5"],
    [".menu-photo-card:nth-child(6) .menu-photo", "image6"],
    [".qr-layer", "qr"],
    [".split-left", "imageLeft"],
    [".split-right", "imageRight"]
  ];

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
    [".qr-text", "qrText"],
    [".date-board", "dateList"],
    [".menu-items", "menuItems"]
  ];

  let panel = null;
  let saveTimer = null;
  let lastSlideId = "";
  let selectedField = "heading";
  let selectedImage = "image";
  let imageOverlay = null;
  let activePictureDrag = null;
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
      </div>
      <div class="quick-image-tools" aria-label="Picture tools">
        <div class="quick-size-head">
          <strong>Picture Tools</strong>
          <button type="button" data-image-reset>Reset picture</button>
        </div>
        <div class="quick-image-picks">
          ${imageFields.map(([name, label]) => `<button type="button" data-image-pick="${name}">${label}</button>`).join("")}
        </div>
        <label class="quick-size-row">
          <span data-selected-image-label>Selected picture</span>
          <small>Small</small>
          <input data-image-control="Width" type="range" min="80" max="1500" step="10">
          <small>Wide</small>
        </label>
        <label class="quick-size-row">
          <span>Height</span>
          <small>Short</small>
          <input data-image-control="Height" type="range" min="80" max="950" step="10">
          <small>Tall</small>
        </label>
        <label class="quick-size-row">
          <span>Move left/right</span>
          <small>Left</small>
          <input data-image-control="X" type="range" min="-500" max="500" step="5">
          <small>Right</small>
        </label>
        <label class="quick-size-row">
          <span>Move up/down</span>
          <small>Up</small>
          <input data-image-control="Y" type="range" min="-350" max="350" step="5">
          <small>Down</small>
        </label>
        <label class="quick-size-row">
          <span>Crop position X</span>
          <small>Left</small>
          <input data-image-control="PosX" type="range" min="0" max="100" step="1">
          <small>Right</small>
        </label>
        <label class="quick-size-row">
          <span>Crop position Y</span>
          <small>Top</small>
          <input data-image-control="PosY" type="range" min="0" max="100" step="1">
          <small>Bottom</small>
        </label>
        <div class="quick-fit-buttons">
          <button type="button" data-image-fit="cover">Fill crop</button>
          <button type="button" data-image-fit="contain">Fit whole</button>
        </div>
      </div>
      <div class="quick-box-tools" aria-label="Date and info box tools">
        <div class="quick-size-head">
          <strong>Date / Info Box Tools</strong>
          <button type="button" data-box-reset>Reset boxes</button>
        </div>
        ${boxFields.map(([name, label]) => `
          <label class="quick-size-row">
            <span>${label}</span>
            <small>Less</small>
            <input data-box-control="${name}" type="range" step="5">
            <small>More</small>
          </label>
        `).join("")}
      </div>
    `;
    document.body.appendChild(panel);

    panel.addEventListener("input", (event) => {
      const control = event.target.closest("[data-quick-field]");
      const selectedSizeControl = event.target.closest("[data-selected-size]");
      const imageControl = event.target.closest("[data-image-control]");
      const boxControl = event.target.closest("[data-box-control]");
      if (control) {
        selectedField = control.dataset.quickField;
        markSelectedField();
        updateField(control.dataset.quickField, control.value);
      }
      if (selectedSizeControl) updateSelectedSize(`${selectedSizeControl.value}px`);
      if (imageControl) updateSelectedImageValue(imageControl.dataset.imageControl, imageControl.value);
      if (boxControl) updateBoxValue(boxControl.dataset.boxControl, boxControl.value);
    });

    panel.addEventListener("click", (event) => {
      const imagePick = event.target.closest("[data-image-pick]");
      const imageFit = event.target.closest("[data-image-fit]");
      if (imagePick) selectImage(imagePick.dataset.imagePick);
      if (imageFit) updateSelectedImageValue("Fit", imageFit.dataset.imageFit);
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

    panel.querySelector("[data-image-reset]").addEventListener("click", () => {
      resetImage();
    });

    panel.querySelector("[data-box-reset]").addEventListener("click", () => {
      resetBoxes();
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

  function matchPreviewImage(target) {
    const preview = target && target.closest ? target.closest(".preview-wrap") : null;
    if (!preview) return null;
    for (const [selector, name] of imageTargets) {
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

  function imageInfo(name = selectedImage) {
    return imageFields.find(([key]) => key === name) || imageFields[0];
  }

  function imageFieldKey(control, imageName = selectedImage) {
    return `${imageName}${control}`;
  }

  function selectImage(name) {
    selectedImage = name;
    markSelectedImage();
    refreshImageControls();
    drawPictureSelection();
  }

  function markSelectedImage() {
    if (!panel) return;
    panel.querySelectorAll("[data-image-pick]").forEach((button) => {
      button.classList.toggle("active", button.dataset.imagePick === selectedImage);
    });
  }

  function refreshPreview(slide) {
    const preview = document.querySelector(".preview-wrap");
    if (preview && typeof renderSlide === "function") {
      preview.innerHTML = renderSlide(slide, true);
      window.setTimeout(drawPictureSelection, 0);
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

  function updateSelectedImageValue(control, rawValue) {
    const suffix = control;
    const isPercent = suffix === "PosX" || suffix === "PosY";
    const isFit = suffix === "Fit";
    const value = isFit ? rawValue : `${rawValue}${isPercent ? "%" : "px"}`;
    setImageField(suffix, value);
    refreshImageControls();
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

  function cssLengthValue(value = "") {
    const clean = String(value).replace(/[;"<>]/g, "").trim();
    if (!clean) return "";
    if (/^-?\d+(\.\d+)?$/.test(clean)) return `${clean}px`;
    if (/^-?\d+(\.\d+)?(px|rem|em|%|vw|vh)$/i.test(clean)) return clean;
    return "";
  }

  function cssPercentValue(value = "") {
    const clean = String(value).replace(/[;"<>]/g, "").trim();
    if (!clean) return "";
    if (/^-?\d+(\.\d+)?$/.test(clean)) return `${clean}%`;
    if (/^-?\d+(\.\d+)?%$/i.test(clean)) return clean;
    return "";
  }

  function cssKeywordValue(value = "", imageName = "") {
    const clean = String(value).replace(/[;"<>]/g, "").trim();
    if (/^fill$/i.test(clean)) return imageName === "qr" ? "contain" : "cover";
    return /^(cover|contain|scale-down|none)$/i.test(clean) ? clean : "";
  }

  function sizeVars(slide) {
    return sizeFields
      .map(([name, , , , , variable]) => {
        const value = cssLengthValue(fieldValue(slide, name));
        return value ? `${variable}: ${value}` : "";
      })
      .filter(Boolean);
  }

  function imageVars(slide) {
    const vars = [];
    imageFields.forEach(([name, , prefix]) => {
      const width = cssLengthValue(fieldValue(slide, imageFieldKey("Width", name)));
      const height = cssLengthValue(fieldValue(slide, imageFieldKey("Height", name)));
      const x = cssLengthValue(fieldValue(slide, imageFieldKey("X", name)));
      const y = cssLengthValue(fieldValue(slide, imageFieldKey("Y", name)));
      const fit = cssKeywordValue(fieldValue(slide, imageFieldKey("Fit", name)), name);
      const posX = cssPercentValue(fieldValue(slide, imageFieldKey("PosX", name)));
      const posY = cssPercentValue(fieldValue(slide, imageFieldKey("PosY", name)));
      if (width) vars.push(`${prefix}-w: ${width}`);
      if (height) vars.push(`${prefix}-h: ${height}`);
      if (x) vars.push(`${prefix}-x: ${x}`);
      if (y) vars.push(`${prefix}-y: ${y}`);
      if (fit) vars.push(`${prefix}-fit: ${fit}`);
      if (posX) vars.push(`${prefix}-pos-x: ${posX}`);
      if (posY) vars.push(`${prefix}-pos-y: ${posY}`);
    });
    return vars;
  }

  function boxVars(slide) {
    return boxFields
      .map(([name, , , , , variable]) => {
        const value = cssLengthValue(fieldValue(slide, name));
        return value ? `${variable}: ${value}` : "";
      })
      .filter(Boolean);
  }

  function applyImageToPreview(imageName = selectedImage) {
    const slide = currentSlide();
    const slideEl = document.querySelector(".preview-wrap .preview-slide");
    if (!slide || !slideEl) return;
    const [, , prefix] = imageInfo(imageName);
    const properties = {
      Width: "-w",
      Height: "-h",
      X: "-x",
      Y: "-y",
      Fit: "-fit",
      PosX: "-pos-x",
      PosY: "-pos-y"
    };
    Object.entries(properties).forEach(([suffix, property]) => {
      const rawValue = fieldValue(slide, imageFieldKey(suffix, imageName));
      const value = suffix === "Fit" ? cssKeywordValue(rawValue, imageName) : rawValue;
      const cssName = `${prefix}${property}`;
      if (value) slideEl.style.setProperty(cssName, value);
      else slideEl.style.removeProperty(cssName);
    });
    drawPictureSelection();
  }

  const baseSlideStyle = window.slideStyle || slideStyle;
  window.slideStyle = function slideStyleWithQuickEditorSizes(slide) {
    const original = baseSlideStyle(slide);
    const extra = [...sizeVars(slide), ...imageVars(slide), ...boxVars(slide)];
    if (!extra.length) return original;
    const extraText = extra.join("; ");
    if (!original) return ` style="${escapeHtml(extraText)}"`;
    return original.replace(/"$/, `; ${escapeHtml(extraText)}"`);
  };
  slideStyle = window.slideStyle;

  function refreshSizeControls() {
    if (!panel) return;
    const slide = currentSlide();
    if (!slide) return;

    const selectedControl = panel.querySelector("[data-selected-size]");
    const selectedLabel = panel.querySelector("[data-selected-size-label]");
    const selectedName = selectedSizeField();
    const [, label, min, max, fallback] = sizeInfo(selectedName);
    if (selectedLabel) selectedLabel.textContent = `Selected text size (${label.replace(" size", "")})`;
    if (selectedControl) {
      selectedControl.min = min;
      selectedControl.max = max;
    }
    if (selectedControl && document.activeElement !== selectedControl) {
      selectedControl.value = parseSize(slide, selectedName, fallback);
    }
  }

  function parseNumber(slide, key, fallback) {
    const match = String(fieldValue(slide, key)).match(/-?\d+(\.\d+)?/);
    return match ? Number(match[0]) : fallback;
  }

  function imageFallback(control) {
    const defaults = imageFallbacks[selectedImage] || imageFallbacks.image;
    return defaults[control] || (control === "PosX" || control === "PosY" ? 50 : 0);
  }

  function refreshImageControls() {
    if (!panel) return;
    const slide = currentSlide();
    if (!slide) return;
    const [, label] = imageInfo();
    const labelEl = panel.querySelector("[data-selected-image-label]");
    if (labelEl) labelEl.textContent = `${label} width`;

    const width = panel.querySelector('[data-image-control="Width"]');
    const height = panel.querySelector('[data-image-control="Height"]');
    const x = panel.querySelector('[data-image-control="X"]');
    const y = panel.querySelector('[data-image-control="Y"]');
    const posX = panel.querySelector('[data-image-control="PosX"]');
    const posY = panel.querySelector('[data-image-control="PosY"]');
    if (width && document.activeElement !== width) width.value = parseNumber(slide, imageFieldKey("Width"), imageFallback("Width"));
    if (height && document.activeElement !== height) height.value = parseNumber(slide, imageFieldKey("Height"), imageFallback("Height"));
    if (x && document.activeElement !== x) x.value = parseNumber(slide, imageFieldKey("X"), imageFallback("X"));
    if (y && document.activeElement !== y) y.value = parseNumber(slide, imageFieldKey("Y"), imageFallback("Y"));
    if (posX && document.activeElement !== posX) posX.value = parseNumber(slide, imageFieldKey("PosX"), imageFallback("PosX"));
    if (posY && document.activeElement !== posY) posY.value = parseNumber(slide, imageFieldKey("PosY"), imageFallback("PosY"));
    markSelectedImage();
  }

  function boxInfo(name) {
    return boxFields.find(([key]) => key === name) || boxFields[0];
  }

  function refreshBoxControls() {
    if (!panel) return;
    const slide = currentSlide();
    if (!slide) return;
    boxFields.forEach(([name, , min, max, fallback]) => {
      const control = panel.querySelector(`[data-box-control="${name}"]`);
      if (!control) return;
      control.min = min;
      control.max = max;
      if (document.activeElement !== control) control.value = parseNumber(slide, name, fallback);
    });
  }

  function applyBoxToPreview(name) {
    const slide = currentSlide();
    const slideEl = document.querySelector(".preview-wrap .preview-slide");
    if (!slide || !slideEl) return;
    const [, , , , , variable] = boxInfo(name);
    const value = cssLengthValue(fieldValue(slide, name));
    if (value) slideEl.style.setProperty(variable, value);
    else slideEl.style.removeProperty(variable);
  }

  function updateBoxValue(name, rawValue) {
    const slide = currentSlide();
    if (!slide) return;
    slide.fields = slide.fields || {};
    slide.fields[name] = `${rawValue}px`;
    applyBoxToPreview(name);
    saveSoon();
  }

  function resetBoxes() {
    const slide = currentSlide();
    if (!slide) return;
    slide.fields = slide.fields || {};
    boxFields.forEach(([name]) => {
      delete slide.fields[name];
      applyBoxToPreview(name);
    });
    refreshPreview(slide);
    refreshBoxControls();
    saveSoon();
  }

  function setImageField(suffix, value, shouldSave = true) {
    const slide = currentSlide();
    if (!slide) return;
    slide.fields = slide.fields || {};
    slide.fields[imageFieldKey(suffix)] = value;
    syncNormalFields(imageFieldKey(suffix), value);
    applyImageToPreview(selectedImage);
    if (shouldSave) saveSoon();
  }

  function setImageFields(values) {
    const slide = currentSlide();
    if (!slide) return;
    slide.fields = slide.fields || {};
    Object.entries(values).forEach(([suffix, value]) => {
      slide.fields[imageFieldKey(suffix)] = value;
      syncNormalFields(imageFieldKey(suffix), value);
    });
    applyImageToPreview(selectedImage);
    refreshImageControls();
  }

  function resetImage() {
    const slide = currentSlide();
    if (!slide) return;
    ["Width", "Height", "X", "Y", "Fit", "PosX", "PosY"].forEach((suffix) => {
      delete slide.fields[imageFieldKey(suffix)];
      syncNormalFields(imageFieldKey(suffix), "");
    });
    refreshPreview(slide);
    refreshImageControls();
    saveSoon();
  }

  function ensureImageOverlay() {
    if (imageOverlay) return imageOverlay;
    imageOverlay = document.createElement("div");
    imageOverlay.className = "quick-picture-box";
    imageOverlay.innerHTML = `
      <span class="quick-picture-label">Picture</span>
      ${["nw", "n", "ne", "e", "se", "s", "sw", "w"].map((handle) => `<button type="button" class="quick-picture-handle quick-picture-${handle}" data-picture-handle="${handle}" aria-label="Resize picture ${handle}"></button>`).join("")}
    `;
    imageOverlay.addEventListener("pointerdown", (event) => {
      const handle = event.target.closest("[data-picture-handle]");
      if (!handle) return;
      const element = selectedImageElement();
      if (!element) return;
      beginPictureDrag(event, element, selectedImage, handle.dataset.pictureHandle);
    });
    return imageOverlay;
  }

  function selectedImageElement() {
    const preview = document.querySelector(".preview-wrap");
    if (!preview) return null;
    for (const [selector, name] of imageTargets) {
      if (name !== selectedImage) continue;
      const element = preview.querySelector(selector);
      if (element) return element;
    }
    return null;
  }

  function drawPictureSelection() {
    if (!isAdmin()) return;
    const preview = document.querySelector(".preview-wrap");
    const element = selectedImageElement();
    if (!preview || !element) {
      if (imageOverlay) imageOverlay.remove();
      return;
    }
    const overlay = ensureImageOverlay();
    if (!overlay.parentElement) preview.appendChild(overlay);
    const previewRect = preview.getBoundingClientRect();
    const rect = element.getBoundingClientRect();
    overlay.style.left = `${rect.left - previewRect.left}px`;
    overlay.style.top = `${rect.top - previewRect.top}px`;
    overlay.style.width = `${rect.width}px`;
    overlay.style.height = `${rect.height}px`;
    const [, label] = imageInfo();
    const labelEl = overlay.querySelector(".quick-picture-label");
    if (labelEl) labelEl.textContent = label;
  }

  function clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
  }

  function beginPictureDrag(event, element, imageName, mode = "move") {
    const slide = currentSlide();
    if (!slide) return;
    event.preventDefault();
    event.stopPropagation();
    selectedImage = imageName;
    markSelectedImage();

    const rect = element.getBoundingClientRect();
    const lockedFrame = element.classList.contains("split-half");
    activePictureDrag = {
      mode: lockedFrame && mode !== "move" ? "move" : mode,
      lockedFrame,
      startX: event.clientX,
      startY: event.clientY,
      imageName,
      width: rect.width,
      height: rect.height,
      x: parseNumber(slide, imageFieldKey("X", imageName), 0),
      y: parseNumber(slide, imageFieldKey("Y", imageName), 0)
    };
    document.body.classList.add("quick-picture-dragging");
    window.addEventListener("pointermove", movePictureDrag, true);
    window.addEventListener("pointerup", endPictureDrag, true);
    window.addEventListener("pointercancel", endPictureDrag, true);
  }

  function movePictureDrag(event) {
    if (!activePictureDrag) return;
    event.preventDefault();
    const drag = activePictureDrag;
    const dx = event.clientX - drag.startX;
    const dy = event.clientY - drag.startY;
    let nextWidth = drag.width;
    let nextHeight = drag.height;
    let nextX = drag.x;
    let nextY = drag.y;

    if (drag.mode === "move") {
      nextX = drag.x + dx;
      nextY = drag.y + dy;
    } else {
      if (drag.mode.includes("e")) nextWidth = drag.width + dx;
      if (drag.mode.includes("s")) nextHeight = drag.height + dy;
      if (drag.mode.includes("w")) {
        nextWidth = drag.width - dx;
        nextX = drag.x + dx;
      }
      if (drag.mode.includes("n")) {
        nextHeight = drag.height - dy;
        nextY = drag.y + dy;
      }
      const minSize = 60;
      if (nextWidth < minSize) {
        if (drag.mode.includes("w")) nextX -= minSize - nextWidth;
        nextWidth = minSize;
      }
      if (nextHeight < minSize) {
        if (drag.mode.includes("n")) nextY -= minSize - nextHeight;
        nextHeight = minSize;
      }
    }

    const updates = {
      X: `${Math.round(clamp(nextX, -800, 800))}px`,
      Y: `${Math.round(clamp(nextY, -600, 600))}px`
    };
    if (drag.mode !== "move" && !drag.lockedFrame) {
      updates.Width = `${Math.round(clamp(nextWidth, 40, 1600))}px`;
      updates.Height = `${Math.round(clamp(nextHeight, 40, 1000))}px`;
    }
    setImageFields(updates);
  }

  function endPictureDrag() {
    if (!activePictureDrag) return;
    activePictureDrag = null;
    document.body.classList.remove("quick-picture-dragging");
    window.removeEventListener("pointermove", movePictureDrag, true);
    window.removeEventListener("pointerup", endPictureDrag, true);
    window.removeEventListener("pointercancel", endPictureDrag, true);
    saveSoon();
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
    refreshImageControls();
    refreshBoxControls();
    window.setTimeout(drawPictureSelection, 0);

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
      const imageMatch = matchPreviewImage(event.target);
      if (!match && !imageMatch) return;
      event.preventDefault();
      event.stopPropagation();
      if (imageMatch) {
        selectImage(imageMatch.name);
        beginPictureDrag(event, imageMatch.element, imageMatch.name, "move");
      }
      else focusField(match.name);
    }, true);

    window.addEventListener("resize", drawPictureSelection);

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
