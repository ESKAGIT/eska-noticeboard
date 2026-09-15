(function () {
  let saveTimer = null;

  function enabled(slide, key) {
    return field(slide, key, "") === "true";
  }

  function effectsMarkup(slide) {
    const effects = [];
    if (enabled(slide, "effectBeltKnot")) {
      effects.push(`
        <div class="karate-belt-knot" aria-hidden="true">
          <span class="karate-belt-end karate-belt-end-left"></span>
          <span class="karate-belt-knot-centre"></span>
          <span class="karate-belt-end karate-belt-end-right"></span>
        </div>
      `);
    }
    if (enabled(slide, "effectBeltProgress")) {
      effects.push(`
        <ol class="karate-belt-progress" aria-label="Karate belt progress animation">
          <li class="belt-white"></li><li class="belt-yellow"></li><li class="belt-orange"></li><li class="belt-green"></li>
          <li class="belt-blue"></li><li class="belt-purple"></li><li class="belt-brown"></li><li class="belt-black"></li>
        </ol>
      `);
    }
    if (enabled(slide, "effectPhotoShutter")) {
      effects.push('<div class="karate-photo-shutter" aria-hidden="true"></div>');
    }
    return effects.join("");
  }

  function refreshPreview(slide) {
    const preview = document.querySelector(".preview-wrap");
    if (preview) preview.innerHTML = renderSlide(slide, true);
  }

  function saveSoon() {
    clearTimeout(saveTimer);
    saveTimer = setTimeout(() => {
      saveBoard().catch((error) => showStatus(error.message || "Could not save animation settings.", true));
    }, 450);
  }

  function controls(slide) {
    return `
      <section class="karate-effects-panel" aria-label="Karate screen effects">
        <div class="karate-effects-head">
          <div>
            <h3>Karate screen effects</h3>
            <p>Optional short animations for this slide. They also appear in the TV and USB recording output.</p>
          </div>
          <button class="secondary" id="replayKarateEffects" type="button">Replay effects</button>
        </div>
        <div class="karate-effects-options">
          <label class="check-row"><input data-karate-effect="effectBeltKnot" type="checkbox" ${enabled(slide, "effectBeltKnot") ? "checked" : ""}> Belt tie reveal</label>
          <label class="check-row"><input data-karate-effect="effectBeltProgress" type="checkbox" ${enabled(slide, "effectBeltProgress") ? "checked" : ""}> Belt colour progress</label>
          <label class="check-row"><input data-karate-effect="effectPhotoShutter" type="checkbox" ${enabled(slide, "effectPhotoShutter") ? "checked" : ""}> Photo shutter</label>
        </div>
      </section>
    `;
  }

  const baseRenderSlide = window.renderSlide || renderSlide;
  window.renderSlide = function renderSlideWithKarateEffects(slide, preview = false) {
    const html = baseRenderSlide(slide, preview);
    const effects = effectsMarkup(slide);
    return effects ? html.replace(/<\/section>\s*$/, `${effects}</section>`) : html;
  };
  renderSlide = window.renderSlide;

  const baseEditorForm = window.editorForm || editorForm;
  window.editorForm = function editorFormWithKarateEffects(slide) {
    const html = baseEditorForm(slide);
    return html.replace('<div class="upload-row">', `${controls(slide)}<div class="upload-row">`);
  };
  editorForm = window.editorForm;

  const baseBindEditor = window.bindEditor || bindEditor;
  window.bindEditor = function bindEditorWithKarateEffects(slide) {
    baseBindEditor(slide);
    if (!slide) return;
    slide.fields = slide.fields || {};

    document.querySelectorAll("[data-karate-effect]").forEach((input) => {
      input.addEventListener("change", () => {
        slide.fields[input.dataset.karateEffect] = input.checked ? "true" : "";
        refreshPreview(slide);
        saveSoon();
      });
    });

    const replay = document.querySelector("#replayKarateEffects");
    if (replay) replay.addEventListener("click", () => refreshPreview(slide));
  };
  bindEditor = window.bindEditor;

  window.setTimeout(() => {
    if ((route() === "/admin" || route() === "/templates") && board && typeof renderAdmin === "function") renderAdmin();
  }, 0);
})();
