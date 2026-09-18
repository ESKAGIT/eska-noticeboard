(function () {
  let saveTimer = null;

  function enabled(slide, key) {
    return field(slide, key, "") === "true";
  }

  function sliderValue(slide, key, fallback, min, max) {
    const value = Number(field(slide, key, fallback));
    return Number.isFinite(value) ? Math.min(max, Math.max(min, value)) : fallback;
  }

  function effectsMarkup(slide) {
    const effects = [];
    if (enabled(slide, "effectBeltKnot")) {
      effects.push(`
        <div class="karate-belt-knot" aria-hidden="true">
          <img src="/assets/karate-tied-belt.png" alt="">
        </div>
      `);
    }
    if (enabled(slide, "effectBeltProgress")) {
      const belts = [
        "belt-red", "belt-orange", "belt-yellow", "belt-green", "belt-purple",
        "belt-purple-white", "belt-brown", "belt-brown-white", "belt-brown-double-white", "belt-black"
      ];
      effects.push(`
        <ol class="karate-belt-progress" aria-label="Karate belt progress animation">
          ${belts.map((belt) => `<li class="${belt}"><img src="/assets/karate-tied-belt.png" alt=""><span class="belt-rank-stripes"></span></li>`).join("")}
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
    const beltSize = sliderValue(slide, "beltProgressSize", 100, 45, 160);
    const beltX = sliderValue(slide, "beltProgressX", 0, -800, 800);
    const beltY = sliderValue(slide, "beltProgressY", 0, -500, 500);
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
        <div class="belt-group-controls">
          <strong>Whole belt group</strong>
          <label>Size <span>Small</span><input data-belt-control="beltProgressSize" type="range" min="45" max="160" value="${beltSize}"><span>Large</span></label>
          <label>Move left/right <span>Left</span><input data-belt-control="beltProgressX" type="range" min="-800" max="800" value="${beltX}"><span>Right</span></label>
          <label>Move up/down <span>Up</span><input data-belt-control="beltProgressY" type="range" min="-500" max="500" value="${beltY}"><span>Down</span></label>
        </div>
      </section>
    `;
  }

  const baseSlideStyle = window.slideStyle || slideStyle;
  window.slideStyle = function slideStyleWithBeltControls(slide) {
    const original = baseSlideStyle(slide);
    const beltSize = sliderValue(slide, "beltProgressSize", 100, 45, 160);
    const beltX = sliderValue(slide, "beltProgressX", 0, -800, 800);
    const beltY = sliderValue(slide, "beltProgressY", 0, -500, 500);
    const variables = `--belt-progress-scale: ${beltSize / 100}; --belt-progress-x: ${beltX}px; --belt-progress-y: ${beltY}px`;
    if (!original) return ` style="${variables}"`;
    return original.replace(/"$/, `; ${variables}"`);
  };
  slideStyle = window.slideStyle;

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

    document.querySelectorAll("[data-belt-control]").forEach((input) => {
      input.addEventListener("input", () => {
        slide.fields[input.dataset.beltControl] = input.value;
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

