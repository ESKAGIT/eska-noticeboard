(function () {
  if (!templates.some((item) => item.id === "pt")) {
    templates.push({
      id: "pt",
      name: "PT Feature",
      category: "Private lessons",
      description: "Photo starts centre, then slides aside to reveal PT text."
    });
  }

  if (!animations.some(([id]) => id === "centre-side")) {
    animations.push(["centre-side", "Centre image to side"]);
  }

  function cssValue(value = "") {
    return String(value).replace(/[;"<>]/g, "").trim();
  }

  function imageCss(value = "") {
    return String(value).replace(/[\\'"<>]/g, "").trim();
  }

  window.brandHeader = function brandHeader(slide) {
    const logo = field(slide, "logo", board.brand.logo);
    return `<img class="corner-logo" src="${escapeHtml(logo)}" alt="ESKA logo">`;
  };

  window.slideStyle = function slideStyle(slide) {
    const styles = [];
    const background = field(slide, "background");
    const accent = field(slide, "accent");
    const textColor = field(slide, "textColor");
    const panelColor = field(slide, "panelColor");

    if (background) {
      const clean = cssValue(background);
      if (/^#|^rgb|^hsl|^linear-gradient|^radial-gradient/i.test(clean)) styles.push(`--slide-bg: ${clean}`);
      else styles.push(`--slide-bg-image: url('${imageCss(clean)}')`);
    }
    if (accent) styles.push(`--slide-accent: ${cssValue(accent)}`);
    if (textColor) styles.push(`--slide-text: ${cssValue(textColor)}`);
    if (panelColor) styles.push(`--panel-bg: ${cssValue(panelColor)}`);

    return styles.length ? ` style="${escapeHtml(styles.join("; "))}"` : "";
  };

  window.renderSlide = function renderSlide(slide, preview = false) {
    const animation = slide.animation || "fade-up";
    const shellClass = `slide slide-${slide.template} anim-${animation}${preview ? " preview-slide" : ""}`;
    const image = field(slide, "image", board.brand.logo);
    const imageLeft = field(slide, "imageLeft", image);
    const imageRight = field(slide, "imageRight", field(slide, "image2", image));
    const video = field(slide, "video", "");

    let content = "";
    if (slide.template === "hero") {
      content = `<div class="hero-logo">${mediaTag(image, "ESKA")}</div>${copyBlock(slide)}`;
    } else if (slide.template === "notice") {
      content = `<div class="notice-orb">${mediaTag(field(slide, "logo", board.brand.logo), "ESKA")}</div>${copyBlock(slide)}`;
    } else if (slide.template === "image-right") {
      content = `${copyBlock(slide)}<div class="photo-panel">${mediaTag(image, field(slide, "heading"))}</div>`;
    } else if (slide.template === "cards") {
      content = `
        ${copyBlock(slide)}
        <div class="info-cards">
          <article><strong>${escapeHtml(field(slide, "date", "Date"))}</strong><span>${escapeHtml(field(slide, "time", "Time"))}</span></article>
          <article><strong>Location</strong><span>${escapeHtml(field(slide, "location", "Add location"))}</span></article>
          <article><strong>Action</strong><span>${escapeHtml(field(slide, "cta", "Add action"))}</span></article>
        </div>
      `;
    } else if (slide.template === "dates") {
      const dateItems = [field(slide, "date"), field(slide, "time"), field(slide, "location")]
        .filter(Boolean)
        .map((item) => item.split("|").map((part) => part.trim()));
      content = `
        ${copyBlock(slide)}
        <div class="date-board">
          ${dateItems.map(([date, title = "Add title", detail = "Add details"]) => `
            <article>
              <strong>${escapeHtml(date)}</strong>
              <span>${escapeHtml(title)}</span>
              <small>${escapeHtml(detail)}</small>
            </article>
          `).join("")}
        </div>
      `;
    } else if (slide.template === "course") {
      content = `
        <div class="split-course" style="--course-left-image: url('${escapeHtml(imageLeft)}'); --course-right-image: url('${escapeHtml(imageRight)}')">
          <div class="split-copy">
            <img class="split-copy-logo" src="${escapeHtml(field(slide, "logo", board.brand.logo))}" alt="ESKA">
            ${copyBlock(slide)}
          </div>
          <div class="split-half split-left"></div>
          <div class="split-half split-right"></div>
        </div>
      `;
    } else if (slide.template === "pt") {
      content = `
        <div class="pt-reveal">
          <div class="pt-photo">${mediaTag(image, field(slide, "heading"))}</div>
          ${copyBlock(slide)}
        </div>
      `;
    } else if (slide.template === "media") {
      content = `
        ${copyBlock(slide)}
        <div class="media-layout">
          <div class="photo-panel">${mediaTag(image, field(slide, "heading"))}</div>
          <div class="video-panel">${video ? mediaTag(video, "Course video") : `<span>${escapeHtml(field(slide, "cta", "Add video"))}</span>`}</div>
        </div>
      `;
    } else if (slide.template === "gallery") {
      content = `<div class="gallery-photo">${mediaTag(image, field(slide, "heading"))}</div>${copyBlock(slide)}`;
    } else {
      content = copyBlock(slide);
    }

    return `<section class="${shellClass}" data-slide-id="${escapeHtml(slide.id)}"${slideStyle(slide)}>${brandHeader(slide)}${content}</section>`;
  };

  window.editorForm = function editorForm(slide) {
    const options = templates.map((item) => `<option value="${item.id}" ${slide.template === item.id ? "selected" : ""}>${item.name}</option>`).join("");
    const animOptions = animations.map(([id, label]) => `<option value="${id}" ${slide.animation === id ? "selected" : ""}>${label}</option>`).join("");
    const fields = ["eyebrow", "heading", "subheading", "body", "date", "time", "location", "cta", "image", "imageLeft", "imageRight", "video", "logo", "background", "accent", "textColor", "panelColor"];
    return `
      <form class="edit-form">
        <div class="form-grid">
          <label>Template<select data-key="template">${options}</select></label>
          <label>Animation<select data-key="animation">${animOptions}</select></label>
          <label>Duration ms<input data-key="duration" type="number" min="4000" step="500" value="${Number(slide.duration || 10000)}"></label>
          <label class="check-row"><input data-key="visible" type="checkbox" ${slide.visible !== false ? "checked" : ""}> Show on TV</label>
        </div>
        <div class="form-grid two">
          ${fields.map((key) => `
            <label class="${key === "body" ? "span-two" : ""}">${labelFor(key)}
              ${key === "body" ? `<textarea data-field="${key}" rows="4">${escapeHtml(field(slide, key))}</textarea>` : `<input data-field="${key}" value="${escapeHtml(field(slide, key))}">`}
            </label>
          `).join("")}
        </div>
        <div class="upload-row">
          <label>Upload image/video<input id="mediaUpload" type="file" accept="image/*,video/mp4,video/quicktime"></label>
          <button class="secondary" id="applyToImage" type="button">Use upload as image</button>
          <button class="secondary" id="applyToLeftImage" type="button">Use as left split image</button>
          <button class="secondary" id="applyToRightImage" type="button">Use as right split image</button>
          <button class="secondary" id="applyToLogo" type="button">Use as slide logo</button>
          <button class="secondary" id="applyToBackground" type="button">Use as background</button>
          <button class="secondary" id="applyToVideo" type="button">Use upload as video</button>
          <button class="danger" id="deleteSlide" type="button">Delete slide</button>
        </div>
      </form>
    `;
  };

  const originalLabelFor = window.labelFor || labelFor;
  window.labelFor = function labelFor(key) {
    return ({
      imageLeft: "Left split image",
      imageRight: "Right split image",
      logo: "Slide logo",
      background: "Background colour/image",
      accent: "Accent colour",
      textColor: "Text colour",
      panelColor: "Panel colour"
    })[key] || originalLabelFor(key);
  };

  window.bindEditor = function bindEditor(slide) {
    if (!slide) return;
    document.querySelectorAll("[data-field]").forEach((input) => {
      input.addEventListener("input", () => {
        slide.fields[input.dataset.field] = input.value;
        const preview = document.querySelector(".preview-wrap");
        if (preview) preview.innerHTML = renderSlide(slide, true);
      });
    });
    document.querySelectorAll("[data-key]").forEach((input) => {
      input.addEventListener("change", () => {
        if (input.dataset.key === "visible") slide.visible = input.checked;
        else if (input.dataset.key === "duration") slide.duration = Number(input.value);
        else slide[input.dataset.key] = input.value;
        renderAdmin();
      });
    });
    document.querySelector("#deleteSlide").addEventListener("click", () => {
      if (board.slides.length <= 1) return showStatus("Keep at least one slide.", true);
      board.slides = board.slides.filter((item) => item.id !== slide.id);
      draftSlideId = board.slides[0].id;
      renderAdmin();
    });
    document.querySelector("#applyToImage").addEventListener("click", () => uploadInto(slide, "image"));
    document.querySelector("#applyToLeftImage").addEventListener("click", () => uploadInto(slide, "imageLeft"));
    document.querySelector("#applyToRightImage").addEventListener("click", () => uploadInto(slide, "imageRight"));
    document.querySelector("#applyToLogo").addEventListener("click", () => uploadInto(slide, "logo"));
    document.querySelector("#applyToBackground").addEventListener("click", () => uploadInto(slide, "background"));
    document.querySelector("#applyToVideo").addEventListener("click", () => uploadInto(slide, "video"));
  };

  const originalCreateSlideFromTemplate = window.createSlideFromTemplate || createSlideFromTemplate;
  window.createSlideFromTemplate = function createSlideFromTemplate(templateId) {
    const slide = originalCreateSlideFromTemplate(templateId);
    if (templateId === "pt") {
      slide.animation = "centre-side";
      slide.duration = 17000;
      slide.fields.eyebrow = "Private tuition";
      slide.fields.heading = "Book a 1-to-1 PT session";
      slide.fields.subheading = "Focused coaching for faster progress";
      slide.fields.body = "Work on grading prep, confidence, fitness, kata, kumite, or specific techniques with dedicated instructor time.";
      slide.fields.cta = "Ask reception to book";
      slide.fields.image = "/assets/dojo-class.svg";
      slide.fields.accent = "#e61f2a";
      slide.fields.panelColor = "rgba(255, 255, 255, 0.96)";
    }
    slide.fields.imageLeft ||= "";
    slide.fields.imageRight ||= "";
    slide.fields.logo ||= "";
    slide.fields.background ||= "";
    slide.fields.accent ||= "";
    slide.fields.textColor ||= "";
    slide.fields.panelColor ||= "";
    return slide;
  };

  brandHeader = window.brandHeader;
  renderSlide = window.renderSlide;
  editorForm = window.editorForm;
  labelFor = window.labelFor;
  bindEditor = window.bindEditor;
  createSlideFromTemplate = window.createSlideFromTemplate;

  if (route() === "/admin" || route() === "/templates") {
    adminView().catch(() => null);
  } else if (route() === "/screen" || route() === "/") {
    clearTimeout(screenTimer);
    screenView().catch(() => null);
  }
})();
