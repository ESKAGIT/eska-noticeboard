(function () {
  let qrSaveTimer = null;

  function truthy(value) {
    return value === true || /^(true|1|yes|on)$/i.test(String(value || "").trim());
  }

  function saveQrSoon() {
    clearTimeout(qrSaveTimer);
    qrSaveTimer = setTimeout(async () => {
      try {
        if (typeof saveBoard === "function") await saveBoard();
      } catch (error) {
        if (typeof showStatus === "function") showStatus(error.message || "Could not save QR changes.", true);
      }
    }, 700);
  }

  function qrMarkup(slide) {
    const visible = truthy(field(slide, "qrVisible"));
    const src = field(slide, "qr", "");
    if (!visible || !src) return "";
    const text = field(slide, "qrText", "");
    return `
      <aside class="qr-layer${text ? "" : " no-text"}" aria-label="QR code">
        <div class="qr-code-frame"><img src="${escapeHtml(src)}" alt="QR code"></div>
        ${text ? `<p class="qr-text">${escapeHtml(text)}</p>` : ""}
      </aside>
    `;
  }

  const baseRenderSlide = window.renderSlide || renderSlide;
  window.renderSlide = function renderSlideWithQr(slide, preview = false) {
    const html = baseRenderSlide(slide, preview);
    const qr = qrMarkup(slide);
    return qr ? html.replace(/<\/section>\s*$/, `${qr}</section>`) : html;
  };
  renderSlide = window.renderSlide;

  function qrControls(slide) {
    return `
      <section class="qr-admin-panel" aria-label="QR code controls">
        <h3>QR code</h3>
        <div class="form-grid two">
          <label class="check-row"><input data-qr-visible type="checkbox" ${truthy(field(slide, "qrVisible")) ? "checked" : ""}> Show QR code</label>
          <label>Text beside QR<input data-field="qrText" value="${escapeHtml(field(slide, "qrText"))}"></label>
          <label class="span-two">QR image URL/path<input data-field="qr" value="${escapeHtml(field(slide, "qr"))}"></label>
        </div>
        <div class="upload-row">
          <button class="secondary" id="applyToQr" data-upload-target="qr" type="button">Use upload as QR code</button>
        </div>
      </section>
    `;
  }

  const baseEditorForm = window.editorForm || editorForm;
  window.editorForm = function editorFormWithQr(slide) {
    const html = baseEditorForm(slide);
    return html.replace('<div class="upload-row">', `${qrControls(slide)}<div class="upload-row">`);
  };
  editorForm = window.editorForm;

  function syncQrPreview(slide) {
    const preview = document.querySelector(".preview-wrap");
    if (preview) preview.innerHTML = renderSlide(slide, true);
  }

  const baseBindEditor = window.bindEditor || bindEditor;
  window.bindEditor = function bindEditorWithQr(slide) {
    baseBindEditor(slide);
    if (!slide) return;
    slide.fields = slide.fields || {};

    const visible = document.querySelector("[data-qr-visible]");
    if (visible) {
      visible.addEventListener("change", () => {
        slide.fields.qrVisible = visible.checked ? "true" : "";
        syncQrPreview(slide);
        saveQrSoon();
      });
    }

    const qrButton = document.querySelector("#applyToQr");
    if (qrButton && qrButton.dataset.qrVisibleBound !== "1") {
      qrButton.dataset.qrVisibleBound = "1";
      qrButton.addEventListener("click", () => {
        slide.fields.qrVisible = "true";
      });
    }
  };
  bindEditor = window.bindEditor;

  const baseLabelFor = window.labelFor || labelFor;
  window.labelFor = function labelForWithQr(key) {
    return ({
      qr: "QR code image",
      qrText: "Text beside QR code",
      qrVisible: "Show QR code"
    })[key] || baseLabelFor(key);
  };
  labelFor = window.labelFor;

  window.setTimeout(() => {
    if (typeof route === "function" && (route() === "/admin" || route() === "/templates") && typeof board !== "undefined" && board && typeof renderAdmin === "function") {
      renderAdmin();
    }
  }, 0);
})();
