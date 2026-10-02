(function () {
  const TYPES = {
    bat: { label: "Bat", color: "#282626" },
    ghost: { label: "Ghost", color: "#f8f5ed" },
    pumpkin: { label: "Pumpkin", color: "#ed7b24" },
    web: { label: "Corner web", color: "#76716f" },
    cat: { label: "Black cat", color: "#292729" },
    moon: { label: "Crescent moon", color: "#e1ae4e" },
    candy: { label: "Wrapped sweet", color: "#d64b3c" },
    leaf: { label: "Autumn leaf", color: "#c96d32" }
  };
  const ANIMATIONS = { none: "Still", float: "Gentle float", sway: "Soft sway", twinkle: "Subtle glow" };
  const TRANSITIONS = { none: "None", bats: "Bat fly-by", ghost: "Ghost fade", glow: "Warm orange glow" };
  const SVG = {
    bat: '<path d="M50 45C43 35 31 28 17 28l5 14C13 37 7 35 2 35l8 14-7 17c16-3 27-11 35-20 3 8 7 12 12 12s9-4 12-12c8 9 19 17 35 20l-7-17 8-14c-5 0-11 2-20 7l5-14C69 28 57 35 50 45Z"/>',
    ghost: '<path d="M50 8c-20 0-34 15-34 35v43l15-9 12 10 13-10 13 10 15-10V43C84 23 70 8 50 8Z"/><ellipse cx="39" cy="43" rx="3.5" ry="5" fill="#393331" stroke="none"/><ellipse cx="61" cy="43" rx="3.5" ry="5" fill="#393331" stroke="none"/><path d="M44 57q6 7 12 0" fill="none" stroke="#393331" stroke-width="3" stroke-linecap="round"/>',
    pumpkin: '<path d="M50 29c-4-6-3-12 1-18 5 2 8 7 7 14"/><path d="M50 28c-19-13-39 1-39 25 0 20 13 34 39 34s39-14 39-34c0-24-20-38-39-25Z"/><path d="M50 30c-8 13-8 41 0 56M34 29c-9 15-9 39-2 53M66 29c9 15 9 39 2 53"/>',
    web: '<path d="M8 8 92 92M92 8 8 92M50 3v94M3 50h94M23 23l54 54M77 23 23 77M12 31c20 2 28 10 31 19-3 9-11 17-31 19M88 31c-20 2-28 10-31 19 3 9 11 17 31 19M31 12c2 20 10 28 19 31 9-3 17-11 19-31M31 88c2-20 10-28 19-31 9 3 17 11 19 31"/>',
    cat: '<path d="m21 43 2-29 24 18q3-1 6 0l24-18 2 29c5 7 8 15 8 23 0 19-16 29-37 29S13 85 13 66c0-8 3-16 8-23Z"/><path d="M37 61h1m24 0h1M47 70l3 3 3-3m-3 3c-5 0-9 3-12 7m12-7c5 0 9 3 12 7"/>',
    moon: '<path d="M70 9C41 12 23 32 23 56c0 21 17 37 38 37 13 0 25-7 32-18-8 4-18 5-27 2-19-6-29-27-23-46 5-12 15-20 27-22Z"/>',
    candy: '<path d="m22 39-16-13 4 24-4 24 16-13m56-22 16-13-4 24 4 24-16-13Z"/><circle cx="50" cy="49" r="28"/><path d="M39 31c15 11 15 25 0 37m22-37c-15 11-15 25 0 37"/>',
    leaf: '<path d="M83 13C45 12 17 26 15 55c-1 17 12 29 27 28 28-2 41-33 41-70Z"/><path d="M20 77 74 22M42 55l-2-19m-7 31-18-2m39-22 18 2"/>'
  };

  let selectedId = "";
  let boundSlide = null;
  let dragging = null;
  let saveTimer = null;

  function readDecorations(slide) {
    try {
      const value = slide && slide.fields && slide.fields.halloweenDecorations;
      const items = typeof value === "string" ? JSON.parse(value || "[]") : value;
      return Array.isArray(items) ? items.filter((item) => item && TYPES[item.type]) : [];
    } catch (_) {
      return [];
    }
  }

  function writeDecorations(slide, items) {
    slide.fields.halloweenDecorations = JSON.stringify(items);
  }

  function clamp(value, min, max) {
    return Math.min(max, Math.max(min, Number(value) || 0));
  }

  function decorationStyle(item) {
    const x = clamp(item.x, 0, 100);
    const y = clamp(item.y, 0, 100);
    const size = clamp(item.size, 18, 300);
    const rotation = clamp(item.rotation, -180, 180);
    const opacity = clamp(item.opacity, 10, 100) / 100;
    const color = /^#[0-9a-f]{6}$/i.test(item.color || "") ? item.color : TYPES[item.type].color;
    return `left:${x}%;top:${y}%;--halloween-size:${size}px;--halloween-rotation:${rotation}deg;--halloween-opacity:${opacity};--halloween-color:${color}`;
  }

  function svgFor(type, className = "") {
    return `<svg class="${className}" viewBox="0 0 100 100" aria-hidden="true">${SVG[type]}</svg>`;
  }

  function overlay(slide, preview) {
    const decorations = readDecorations(slide);
    const transition = TRANSITIONS[field(slide, "halloweenTransition", "none")] ? field(slide, "halloweenTransition", "none") : "none";
    if (!decorations.length && transition === "none") return "";
    const marks = decorations.map((item) => {
      const selected = preview && item.id === selectedId;
      const animation = ANIMATIONS[item.animation] ? item.animation : "none";
      return `<div class="halloween-deco${preview ? " halloween-editable" : ""}${selected ? " is-selected" : ""}" data-halloween-id="${escapeHtml(String(item.id || ""))}" data-halloween-type="${item.type}" style="${decorationStyle(item)}" aria-label="${TYPES[item.type].label}"${preview ? " role=\"button\" tabindex=\"0\"" : ""}>${svgFor(item.type, `halloween-mark halloween-${item.type} halloween-${animation}`)}</div>`;
    }).join("");
    const transitionMark = transition === "bats"
      ? `<div class="halloween-transition halloween-transition-bats" aria-hidden="true">${svgFor("bat", "halloween-transition-mark halloween-bat")}</div>`
      : transition === "ghost"
        ? `<div class="halloween-transition halloween-transition-ghost" aria-hidden="true">${svgFor("ghost", "halloween-transition-mark halloween-ghost")}</div>`
        : transition === "glow"
          ? '<div class="halloween-transition halloween-transition-glow" aria-hidden="true"></div>'
          : "";
    return `<div class="halloween-layer${preview ? " halloween-preview-layer" : ""}" aria-label="Halloween decorations">${marks}</div>${transitionMark}`;
  }

  function selectedDecoration(slide) {
    const list = readDecorations(slide);
    return list.find((item) => item.id === selectedId) || list[0] || null;
  }

  function controls(slide) {
    const items = readDecorations(slide);
    const selected = selectedDecoration(slide);
    if (selected && selected.id !== selectedId) selectedId = selected.id;
    const transition = TRANSITIONS[field(slide, "halloweenTransition", "none")] ? field(slide, "halloweenTransition", "none") : "none";
    const decorationOptions = Object.entries(TYPES).map(([id, type]) => `<option value="${id}">${type.label}</option>`).join("");
    const selectedOptions = items.map((item, index) => `<option value="${escapeHtml(String(item.id))}" ${selected && item.id === selected.id ? "selected" : ""}>${index + 1}. ${TYPES[item.type].label}</option>`).join("");
    return `
      <section class="halloween-editor" aria-label="Seasonal slide details">
        <div class="halloween-editor-head"><div><h3>Halloween accents</h3><p>Optional, subtle decorations for this slide. Drag an accent on the preview to place it.</p></div></div>
        <div class="halloween-editor-row">
          <label>Slide transition<select data-halloween-transition>${Object.entries(TRANSITIONS).map(([id, label]) => `<option value="${id}" ${transition === id ? "selected" : ""}>${label}</option>`).join("")}</select></label>
        </div>
        <div class="halloween-add-row">
          <label>Add decoration<select data-halloween-type>${decorationOptions}</select></label>
          <button class="secondary" type="button" data-halloween-add>Add accent</button>
        </div>
        ${items.length ? `
          <div class="halloween-edit-row">
            <label>Selected accent<select data-halloween-selected>${selectedOptions}</select></label>
            <button class="danger" type="button" data-halloween-remove>Remove accent</button>
          </div>
          ${selected ? `
            <div class="halloween-sliders">
              <label>Horizontal position <span>Left</span><input data-halloween-control="x" type="range" min="0" max="100" value="${clamp(selected.x, 0, 100)}"><span>Right</span></label>
              <label>Vertical position <span>Top</span><input data-halloween-control="y" type="range" min="0" max="100" value="${clamp(selected.y, 0, 100)}"><span>Bottom</span></label>
              <label>Size <span>Small</span><input data-halloween-control="size" type="range" min="18" max="300" value="${clamp(selected.size, 18, 300)}"><span>Large</span></label>
              <label>Rotation <span>-180°</span><input data-halloween-control="rotation" type="range" min="-180" max="180" value="${clamp(selected.rotation, -180, 180)}"><span>180°</span></label>
              <label>Opacity <span>Light</span><input data-halloween-control="opacity" type="range" min="10" max="100" value="${clamp(selected.opacity, 10, 100)}"><span>Full</span></label>
              <label>Colour<input data-halloween-control="color" type="color" value="${/^#[0-9a-f]{6}$/i.test(selected.color || "") ? selected.color : TYPES[selected.type].color}"></label>
              <label>Movement<select data-halloween-control="animation">${Object.entries(ANIMATIONS).map(([id, label]) => `<option value="${id}" ${(selected.animation || "none") === id ? "selected" : ""}>${label}</option>`).join("")}</select></label>
            </div>
          ` : ""}
        ` : '<p class="halloween-empty">No accents on this slide.</p>'}
        <small class="halloween-help">Changes save with this slide. Every accent can be positioned, resized, rotated, faded, animated, or removed independently.</small>
      </section>
    `;
  }

  function refreshPreview(slide) {
    const preview = document.querySelector(".preview-wrap");
    if (preview) preview.innerHTML = renderSlide(slide, true);
  }

  function saveSoon(delay = 500) {
    clearTimeout(saveTimer);
    saveTimer = setTimeout(() => {
      if (typeof saveBoard === "function") saveBoard().catch((error) => {
        if (typeof showStatus === "function") showStatus(error.message || "Could not save Halloween details.", true);
      });
    }, delay);
  }

  function updateSelectedControlValues(item) {
    document.querySelectorAll("[data-halloween-control]").forEach((input) => {
      const key = input.dataset.halloweenControl;
      input.value = key === "animation" ? (item.animation || "none") : item[key];
    });
  }

  function updateDecorElement(element, item) {
    if (!element || !item) return;
    element.style.cssText = decorationStyle(item);
    const mark = element.querySelector(".halloween-mark");
    if (mark) {
      mark.className = `halloween-mark halloween-${item.type} halloween-${ANIMATIONS[item.animation] ? item.animation : "none"}`;
      mark.innerHTML = SVG[item.type];
    }
  }

  function bindControls(slide) {
    boundSlide = slide;
    if (!slide || !slide.fields) return;
    const transition = document.querySelector("[data-halloween-transition]");
    if (transition) transition.addEventListener("change", () => {
      slide.fields.halloweenTransition = transition.value;
      refreshPreview(slide);
      saveSoon(0);
    });

    const add = document.querySelector("[data-halloween-add]");
    if (add) add.addEventListener("click", () => {
      const typeSelect = document.querySelector("[data-halloween-type]");
      const type = typeSelect && TYPES[typeSelect.value] ? typeSelect.value : "bat";
      const list = readDecorations(slide);
      const item = { id: `h-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`, type, x: 82, y: 20 + (list.length % 5) * 12, size: 100, rotation: 0, opacity: 100, color: TYPES[type].color, animation: "none" };
      list.push(item);
      writeDecorations(slide, list);
      selectedId = item.id;
      refreshPreview(slide);
      window.renderAdmin();
      saveSoon(0);
    });

    const selector = document.querySelector("[data-halloween-selected]");
    if (selector) selector.addEventListener("change", () => {
      selectedId = selector.value;
      refreshPreview(slide);
      const settings = document.querySelector(".halloween-editor");
      const replacement = document.createElement("div");
      replacement.innerHTML = controls(slide);
      const next = replacement.firstElementChild;
      if (settings && next) {
        settings.replaceWith(next);
        bindControls(slide);
      }
    });

    const remove = document.querySelector("[data-halloween-remove]");
    if (remove) remove.addEventListener("click", () => {
      const list = readDecorations(slide).filter((item) => item.id !== selectedId);
      writeDecorations(slide, list);
      selectedId = list.length ? list[0].id : "";
      refreshPreview(slide);
      window.renderAdmin();
      saveSoon(0);
    });

    document.querySelectorAll("[data-halloween-control]").forEach((input) => {
      const apply = () => {
        const selected = selectedDecoration(slide);
        if (!selected) return;
        const key = input.dataset.halloweenControl;
        const list = readDecorations(slide);
        const item = list.find((entry) => entry.id === selected.id);
        if (!item) return;
        item[key] = key === "animation" || key === "color" ? input.value : Number(input.value);
        writeDecorations(slide, list);
        const element = Array.from(document.querySelectorAll(".preview-wrap [data-halloween-id]")).find((node) => node.dataset.halloweenId === String(item.id));
        updateDecorElement(element, item);
        saveSoon();
      };
      input.addEventListener("input", apply);
      input.addEventListener("change", apply);
    });
  }

  function updateDragPosition(event) {
    if (!dragging || !boundSlide || !dragging.el.isConnected) return;
    const dx = (event.clientX - dragging.startX) / dragging.rect.width * 100;
    const dy = (event.clientY - dragging.startY) / dragging.rect.height * 100;
    const list = readDecorations(boundSlide);
    const item = list.find((entry) => entry.id === dragging.id);
    if (!item) return;
    item.x = Math.round(clamp(dragging.x + dx, 0, 100));
    item.y = Math.round(clamp(dragging.y + dy, 0, 100));
    writeDecorations(boundSlide, list);
    updateDecorElement(dragging.el, item);
    updateSelectedControlValues(item);
  }

  document.addEventListener("pointerdown", (event) => {
      const target = event.target.closest(".halloween-editable[data-halloween-id]");
      if (!target || !boundSlide) return;
      const item = readDecorations(boundSlide).find((entry) => entry.id === target.dataset.halloweenId);
      if (!item) return;
      event.preventDefault();
      selectedId = item.id;
      target.classList.add("is-selected");
      document.querySelectorAll(".halloween-editable.is-selected").forEach((node) => { if (node !== target) node.classList.remove("is-selected"); });
      updateSelectedControlValues(item);
      const selector = document.querySelector("[data-halloween-selected]");
      if (selector) selector.value = item.id;
      const previewWrap = target.closest(".preview-wrap");
      if (!previewWrap) return;
      const rect = previewWrap.getBoundingClientRect();
      dragging = { el: target, id: item.id, startX: event.clientX, startY: event.clientY, x: Number(item.x) || 0, y: Number(item.y) || 0, rect };
      target.setPointerCapture(event.pointerId);
    });
  document.addEventListener("pointermove", (event) => {
    if (dragging) updateDragPosition(event);
  });
  const endDrag = (event) => {
    if (!dragging) return;
    if (dragging.el.hasPointerCapture && dragging.el.hasPointerCapture(event.pointerId)) dragging.el.releasePointerCapture(event.pointerId);
    dragging = null;
    saveSoon(0);
  };
  document.addEventListener("pointerup", endDrag);
  document.addEventListener("pointercancel", endDrag);

  const baseRenderSlide = window.renderSlide || renderSlide;
  window.renderSlide = function renderSlideWithHalloween(slide, preview = false) {
    const html = baseRenderSlide(slide, preview);
    const effects = overlay(slide, preview);
    return effects ? html.replace(/<\/section>\s*$/, `${effects}</section>`) : html;
  };
  renderSlide = window.renderSlide;

  const baseEditorForm = window.editorForm || editorForm;
  window.editorForm = function editorFormWithHalloween(slide) {
    const html = baseEditorForm(slide);
    return html.replace('        <div class="form-grid">', `${controls(slide)}<div class="form-grid">`);
  };
  editorForm = window.editorForm;

  const baseBindEditor = window.bindEditor || bindEditor;
  window.bindEditor = function bindEditorWithHalloween(slide) {
    baseBindEditor(slide);
    bindControls(slide);
  };
  bindEditor = window.bindEditor;
})();

